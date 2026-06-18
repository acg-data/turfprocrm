import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { assertOrg, requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";
import { estimateNumber } from "./lib/workflow";

export const createEstimate = mutation({
  args: {
    organizationId: v.id("organizations"),
    opportunityId: v.id("opportunities"),
    terms: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("sent"))),
    lineItems: v.array(
      v.object({
        serviceCatalogItemId: v.optional(v.id("serviceCatalogItems")),
        name: v.string(),
        description: v.optional(v.string()),
        quantity: v.number(),
        unit: v.string(),
        unitPriceCents: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "createEstimate");
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) throw new ConvexError({ code: "NOT_FOUND", message: "Opportunity not found." });
    assertOrg(opportunity, args.organizationId);

    const now = Date.now();
    const subtotalCents = args.lineItems.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCents), 0);
    const estimateId = await ctx.db.insert("estimates", {
      organizationId: args.organizationId,
      opportunityId: args.opportunityId,
      customerId: opportunity.customerId,
      propertyId: opportunity.propertyId,
      estimateNumber: estimateNumber(now),
      status: args.status ?? "draft",
      subtotalCents,
      taxCents: 0,
      totalCents: subtotalCents,
      sentAt: args.status === "sent" ? now : undefined,
      terms: args.terms,
      createdAt: now,
      updatedAt: now,
    });

    for (const [index, item] of args.lineItems.entries()) {
      await ctx.db.insert("estimateLineItems", {
        organizationId: args.organizationId,
        estimateId,
        serviceCatalogItemId: item.serviceCatalogItemId,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceCents: item.unitPriceCents,
        totalCents: Math.round(item.quantity * item.unitPriceCents),
        order: index + 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.opportunityId, {
      stage: args.status === "sent" ? "proposal_sent" : "estimating",
      valueCents: subtotalCents,
      updatedAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "estimate.create",
      entityType: "estimate",
      entityId: estimateId,
      summary: `Created estimate for ${opportunity.title}`,
      after: { estimateId, totalCents: subtotalCents },
    });

    return estimateId;
  },
});

export const convertToJob = mutation({
  args: {
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    title: v.optional(v.string()),
    scheduledStart: v.number(),
    scheduledEnd: v.number(),
    crewId: v.optional(v.id("crews")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "convertEstimate");
    const estimate = await ctx.db.get(args.estimateId);
    if (!estimate) throw new ConvexError({ code: "NOT_FOUND", message: "Estimate not found." });
    assertOrg(estimate, args.organizationId);

    const now = Date.now();
    const opportunity = estimate.opportunityId ? await ctx.db.get(estimate.opportunityId) : null;
    const title = args.title ?? opportunity?.title ?? `Job from ${estimate.estimateNumber}`;

    await ctx.db.patch(args.estimateId, {
      status: "accepted",
      acceptedAt: now,
      updatedAt: now,
    });

    if (opportunity) {
      await ctx.db.patch(opportunity._id, {
        stage: "won",
        closeProbability: 100,
        updatedAt: now,
      });
    }

    const jobId = await ctx.db.insert("jobs", {
      organizationId: args.organizationId,
      customerId: estimate.customerId,
      propertyId: estimate.propertyId,
      opportunityId: estimate.opportunityId,
      estimateId: estimate._id,
      title,
      status: "scheduled",
      priority: "normal",
      startDate: args.scheduledStart,
      managerUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    const visitId = await ctx.db.insert("jobVisits", {
      organizationId: args.organizationId,
      jobId,
      customerId: estimate.customerId,
      propertyId: estimate.propertyId,
      scheduledStart: args.scheduledStart,
      scheduledEnd: args.scheduledEnd,
      status: "scheduled",
      routeOrder: 1,
      assignedCrewId: args.crewId,
      checklist: [
        { id: "arrival", label: "Confirm site conditions", isDone: false },
        { id: "work", label: "Complete approved service scope", isDone: false },
        { id: "photos", label: "Capture completion photos", isDone: false },
      ],
      createdAt: now,
      updatedAt: now,
    });

    if (args.crewId) {
      await ctx.db.insert("visitAssignments", {
        organizationId: args.organizationId,
        visitId,
        crewId: args.crewId,
        role: "Primary crew",
        status: "assigned",
        createdAt: now,
        updatedAt: now,
      });
    }

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "estimate.convert",
      entityType: "job",
      entityId: jobId,
      summary: `Converted ${estimate.estimateNumber} to job ${title}`,
      after: { jobId, visitId },
    });

    return { jobId, visitId };
  },
});
