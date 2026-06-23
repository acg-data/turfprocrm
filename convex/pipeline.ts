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
