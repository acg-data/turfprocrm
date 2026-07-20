import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOrg, requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";
import { canMoveOpportunity } from "./lib/workflow";

const opportunityStage = v.union(
  v.literal("new"),
  v.literal("qualified"),
  v.literal("estimating"),
  v.literal("proposal_sent"),
  v.literal("won"),
  v.literal("lost"),
);
const serviceCategory = v.union(v.literal("lawn_care"), v.literal("landscaping"), v.literal("pest_control"), v.literal("tree_shrub"), v.literal("irrigation"), v.literal("snow"), v.literal("maintenance"));
const leadConversionAction = v.union(v.literal("opportunity"), v.literal("estimate"), v.literal("disqualify"));

const serviceCategoryLabels: Record<string, string> = {
  lawn_care: "Lawn care",
  landscaping: "Landscaping",
  pest_control: "Pest control",
  tree_shrub: "Tree and shrub",
  irrigation: "Irrigation",
  snow: "Snow",
  maintenance: "Property maintenance",
};

export const listOpportunities = query({
  args: {
    organizationId: v.id("organizations"),
    stage: v.optional(opportunityStage),
    ownerUserId: v.optional(v.id("users")),
    source: v.optional(v.string()),
    serviceLine: v.optional(serviceCategory),
    minProbability: v.optional(v.number()),
    maxProbability: v.optional(v.number()),
    minValueCents: v.optional(v.number()),
    staleDays: v.optional(v.number()),
    nextStep: v.optional(v.union(v.literal("proposal"), v.literal("follow_up"))),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    const opportunities = args.ownerUserId
      ? await ctx.db
          .query("opportunities")
          .withIndex("by_org_owner", (q) => q.eq("organizationId", args.organizationId).eq("ownerUserId", args.ownerUserId))
          .order("desc")
          .collect()
      : args.stage
      ? await ctx.db
          .query("opportunities")
          .withIndex("by_org_stage", (q) => q.eq("organizationId", args.organizationId).eq("stage", args.stage!))
          .order("desc")
          .collect()
      : await ctx.db
          .query("opportunities")
          .withIndex("by_org_updated", (q) => q.eq("organizationId", args.organizationId))
          .order("desc")
          .take(100);

    const rows = await Promise.all(
      opportunities.map(async (opportunity) => {
        const [customer, property, estimate, lead] = await Promise.all([
          ctx.db.get(opportunity.customerId),
          opportunity.propertyId ? ctx.db.get(opportunity.propertyId) : null,
          ctx.db.query("estimates").withIndex("by_opportunity", (q) => q.eq("opportunityId", opportunity._id)).order("desc").first(),
          opportunity.leadId ? ctx.db.get(opportunity.leadId) : null,
        ]);
        return { opportunity, customer, property, estimate, lead };
      }),
    );

    const now = Date.now();
    const search = args.search?.trim().toLowerCase();
    return rows.filter((row) => {
      if (args.stage && row.opportunity.stage !== args.stage) return false;
      if (args.source && row.lead?.source !== args.source) return false;
      if (args.serviceLine && !row.opportunity.serviceLines.includes(args.serviceLine)) return false;
      if (typeof args.minProbability === "number" && row.opportunity.closeProbability < args.minProbability) return false;
      if (typeof args.maxProbability === "number" && row.opportunity.closeProbability > args.maxProbability) return false;
      if (typeof args.minValueCents === "number" && row.opportunity.valueCents < args.minValueCents) return false;
      if (typeof args.staleDays === "number" && now - row.opportunity.updatedAt < args.staleDays * 24 * 60 * 60 * 1000) return false;
      if (args.nextStep === "proposal" && !["estimating", "proposal_sent"].includes(row.opportunity.stage)) return false;
      if (args.nextStep === "follow_up" && !["new", "qualified"].includes(row.opportunity.stage)) return false;
      if (search && ![row.opportunity.title, row.customer?.name, row.lead?.source, row.opportunity.serviceLines.join(" ")].some((value) => (value ?? "").toLowerCase().includes(search))) return false;
      return true;
    });
  },
});

export const convertLead = mutation({
  args: {
    organizationId: v.id("organizations"),
    leadId: v.id("leads"),
    action: leadConversionAction,
    valueCents: v.optional(v.number()),
    serviceLines: v.optional(v.array(serviceCategory)),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "managePipeline");
    if (args.action === "estimate") {
      await requireMembership(ctx, args.organizationId, "createEstimate");
    }

    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found." });
    assertOrg(lead, args.organizationId);

    const now = Date.now();
    if (args.action === "disqualify") {
      await ctx.db.patch(args.leadId, { status: "disqualified", updatedAt: now });
      await audit(ctx, {
        organizationId: args.organizationId,
        actorUserId: user._id,
        action: "lead.disqualify",
        entityType: "lead",
        entityId: args.leadId,
        summary: `Disqualified ${lead.title}`,
        before: { status: lead.status },
        after: { status: "disqualified" },
      });
      return { action: args.action, leadId: args.leadId, created: false };
    }

    if (!lead.customerId) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Add a customer to this lead before converting it." });
    }
    const customer = await ctx.db.get(lead.customerId);
    if (!customer) throw new ConvexError({ code: "NOT_FOUND", message: "Lead customer not found." });
    assertOrg(customer, args.organizationId);
    if (lead.propertyId) {
      const property = await ctx.db.get(lead.propertyId);
      if (!property) throw new ConvexError({ code: "NOT_FOUND", message: "Lead property not found." });
      assertOrg(property, args.organizationId);
    }

    const serviceLines = args.serviceLines?.length
      ? args.serviceLines
      : lead.programRequests?.length
        ? lead.programRequests
        : ["maintenance" as const];
    const valueCents = Math.max(0, Math.round(args.valueCents ?? 0));
    const customerOpportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_customer", (q) => q.eq("customerId", lead.customerId!))
      .collect();
    let opportunity = customerOpportunities.find((candidate) => candidate.organizationId === args.organizationId && candidate.leadId === args.leadId);
    let opportunityCreated = false;

    if (!opportunity) {
      const opportunityId = await ctx.db.insert("opportunities", {
        organizationId: args.organizationId,
        leadId: args.leadId,
        customerId: lead.customerId,
        propertyId: lead.propertyId,
        title: lead.title,
        stage: args.action === "estimate" ? "estimating" : "qualified",
        valueCents,
        closeProbability: args.action === "estimate" ? 45 : 30,
        expectedCloseDate: now + 14 * 24 * 60 * 60 * 1000,
        ownerUserId: lead.ownerUserId,
        serviceLines,
        createdAt: now,
        updatedAt: now,
      });
      opportunity = (await ctx.db.get(opportunityId)) ?? undefined;
      opportunityCreated = true;
    } else {
      await ctx.db.patch(opportunity._id, {
        stage: args.action === "estimate" && ["new", "qualified"].includes(opportunity.stage) ? "estimating" : opportunity.stage,
        valueCents: Math.max(opportunity.valueCents, valueCents),
        serviceLines: opportunity.serviceLines.length ? opportunity.serviceLines : serviceLines,
        updatedAt: now,
      });
    }

    if (!opportunity) throw new ConvexError({ code: "INTERNAL", message: "Opportunity could not be created." });

    await ctx.db.patch(args.leadId, {
      status: args.action === "estimate" ? "do_estimate" : "contacted",
      updatedAt: now,
    });

    if (args.action === "opportunity") {
      await audit(ctx, {
        organizationId: args.organizationId,
        actorUserId: user._id,
        action: "lead.convert_opportunity",
        entityType: "opportunity",
        entityId: opportunity._id,
        summary: `${opportunityCreated ? "Created" : "Opened"} opportunity for ${lead.title}`,
        after: { leadId: args.leadId, stage: opportunity.stage, valueCents },
      });
      return { action: args.action, leadId: args.leadId, opportunityId: opportunity._id, created: opportunityCreated };
    }

    let estimate = await ctx.db
      .query("estimates")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", opportunity!._id))
      .order("desc")
      .first();
    let estimateCreated = false;
    if (!estimate) {
      const totalCents = valueCents || opportunity.valueCents || 10000;
      const estimateNumber = `EST-${new Date(now).getUTCFullYear()}-${String(now).slice(-6)}`;
      const estimateId = await ctx.db.insert("estimates", {
        organizationId: args.organizationId,
        opportunityId: opportunity._id,
        customerId: lead.customerId,
        propertyId: lead.propertyId,
        estimateNumber,
        status: "draft",
        approvalStatus: "not_required",
        subtotalCents: totalCents,
        discountCents: 0,
        taxCents: 0,
        totalCents,
        expiresAt: now + 30 * 24 * 60 * 60 * 1000,
        terms: "Pricing is valid for 30 days and subject to final site verification.",
        createdAt: now,
        updatedAt: now,
      });
      const primaryService = serviceLines[0] ?? "maintenance";
      await ctx.db.insert("estimateLineItems", {
        organizationId: args.organizationId,
        estimateId,
        name: `${serviceCategoryLabels[primaryService] ?? "Service"} proposal`,
        description: lead.estimateNotes ?? lead.message,
        quantity: 1,
        unit: "service",
        unitPriceCents: totalCents,
        totalCents,
        order: 0,
        createdAt: now,
        updatedAt: now,
      });
      estimate = await ctx.db.get(estimateId);
      estimateCreated = true;
    }

    if (!estimate) throw new ConvexError({ code: "INTERNAL", message: "Estimate could not be created." });
    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "lead.convert_estimate",
      entityType: "estimate",
      entityId: estimate._id,
      summary: `${estimateCreated ? "Created" : "Opened"} ${estimate.estimateNumber} from ${lead.title}`,
      after: { leadId: args.leadId, opportunityId: opportunity._id, estimateNumber: estimate.estimateNumber },
    });
    return {
      action: args.action,
      leadId: args.leadId,
      opportunityId: opportunity._id,
      estimateId: estimate._id,
      estimateNumber: estimate.estimateNumber,
      created: opportunityCreated || estimateCreated,
    };
  },
});

export const advanceOpportunity = mutation({
  args: {
    organizationId: v.id("organizations"),
    opportunityId: v.id("opportunities"),
    stage: opportunityStage,
    lossReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "managePipeline");
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found." });
    assertOrg(opportunity, args.organizationId);

    if (!canMoveOpportunity(opportunity.stage, args.stage)) {
      throw new ConvexError({ code: "INVALID_TRANSITION", message: "Opportunity stage transition is not allowed." });
    }

    const now = Date.now();
    await ctx.db.patch(args.opportunityId, {
      stage: args.stage,
      closeProbability: args.stage === "won" ? 100 : args.stage === "lost" ? 0 : opportunity.closeProbability,
      lossReason: args.stage === "lost" ? args.lossReason : undefined,
      updatedAt: now,
    });

    if (opportunity.leadId && args.stage !== opportunity.stage) {
      await ctx.db.patch(opportunity.leadId, {
        status: args.stage === "lost" ? "disqualified" : args.stage === "won" ? "converted" : "contacted",
        updatedAt: now,
      });
    }

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "opportunity.stage",
      entityType: "opportunity",
      entityId: args.opportunityId,
      summary: `Moved ${opportunity.title} from ${opportunity.stage} to ${args.stage}`,
      before: { stage: opportunity.stage },
      after: { stage: args.stage },
    });

    return args.opportunityId;
  },
});
