import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { approvalDueAt, evaluateEstimateApproval } from "../src/domain/estimate-approval";
import { assertOrg, requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";
import { estimateNumber } from "./lib/workflow";

async function estimateCostFromLineItems(ctx: MutationCtx, organizationId: Id<"organizations">, estimateId: Id<"estimates">) {
  const lineItems = await ctx.db.query("estimateLineItems").withIndex("by_estimate", (q) => q.eq("estimateId", estimateId)).collect();
  let packageCostCents = 0;
  let pricedPackageItems = 0;
  for (const lineItem of lineItems) {
    if (!lineItem.servicePackageId) continue;
    const servicePackage = await ctx.db.get(lineItem.servicePackageId);
    if (!servicePackage || servicePackage.organizationId !== organizationId) continue;
    const laborCostCents = Math.round((servicePackage.laborHours ?? 0) * (servicePackage.laborRateCents ?? 0));
    const directCostCents = laborCostCents + (servicePackage.materialCostCents ?? 0) + (servicePackage.equipmentCostCents ?? 0);
    const overheadCostCents = Math.round(directCostCents * ((servicePackage.overheadPercent ?? 0) / 100));
    packageCostCents += Math.round((directCostCents + overheadCostCents) * lineItem.quantity);
    pricedPackageItems += 1;
  }
  if (pricedPackageItems > 0) return packageCostCents;
  return 0;
}

async function approvedRequestForEstimate(ctx: MutationCtx, organizationId: Id<"organizations">, estimateId: Id<"estimates">) {
  const requests = await ctx.db.query("approvalRequests").withIndex("by_estimate", (q) => q.eq("estimateId", estimateId)).collect();
  return requests.find((request) => request.organizationId === organizationId && request.status === "approved");
}

export const createEstimate = mutation({
  args: {
    organizationId: v.id("organizations"),
    opportunityId: v.id("opportunities"),
    terms: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("sent"))),
    lineItems: v.array(
      v.object({
        servicePackageId: v.optional(v.id("servicePackages")),
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

    for (const item of args.lineItems) {
      const [servicePackage, serviceCatalogItem] = await Promise.all([
        item.servicePackageId ? ctx.db.get(item.servicePackageId) : undefined,
        item.serviceCatalogItemId ? ctx.db.get(item.serviceCatalogItemId) : undefined,
      ]);
      if (item.servicePackageId && (!servicePackage || servicePackage.organizationId !== args.organizationId)) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Service package not found." });
      }
      if (item.serviceCatalogItemId && (!serviceCatalogItem || serviceCatalogItem.organizationId !== args.organizationId)) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Service catalog item not found." });
      }
    }

    const now = Date.now();
    const subtotalCents = args.lineItems.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCents), 0);
    const estimateId = await ctx.db.insert("estimates", {
      organizationId: args.organizationId,
      opportunityId: args.opportunityId,
      customerId: opportunity.customerId,
      propertyId: opportunity.propertyId,
      estimateNumber: estimateNumber(now),
      status: args.status ?? "draft",
      approvalStatus: "not_required",
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
        servicePackageId: item.servicePackageId,
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

export const requestApproval = mutation({
  args: {
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    assignedApproverUserId: v.optional(v.id("users")),
    estimatedCostCents: v.optional(v.number()),
    grossMarginPercent: v.optional(v.number()),
    discountCents: v.optional(v.number()),
    unusualScope: v.optional(v.boolean()),
    materialConstraint: v.optional(v.boolean()),
    manualOverride: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "createEstimate");
    const estimate = await ctx.db.get(args.estimateId);
    if (!estimate) throw new ConvexError({ code: "NOT_FOUND", message: "Estimate not found." });
    assertOrg(estimate, args.organizationId);

    if (args.assignedApproverUserId) {
      const membership = await ctx.db.query("memberships").withIndex("by_org_user", (q) => q.eq("organizationId", args.organizationId).eq("userId", args.assignedApproverUserId!)).unique();
      if (!membership || membership.status !== "active" || !["owner", "admin", "manager"].includes(membership.role)) {
        throw new ConvexError({ code: "INVALID_APPROVER", message: "Approval must be assigned to an active owner, admin, or manager." });
      }
    }

    const inferredCostCents = await estimateCostFromLineItems(ctx, args.organizationId, args.estimateId);
    const discountCents = args.discountCents ?? estimate.discountCents ?? Math.max(0, estimate.subtotalCents - estimate.totalCents);
    const evaluation = evaluateEstimateApproval({
      subtotalCents: estimate.subtotalCents,
      totalCents: estimate.totalCents,
      discountCents,
      estimatedCostCents: args.estimatedCostCents ?? inferredCostCents,
      grossMarginPercent: args.grossMarginPercent,
      unusualScope: args.unusualScope,
      materialConstraint: args.materialConstraint,
      manualOverride: args.manualOverride,
    });
    if (!evaluation.requiresApproval) {
      await ctx.db.patch(estimate._id, { approvalStatus: "not_required", updatedAt: Date.now() });
      throw new ConvexError({ code: "APPROVAL_NOT_REQUIRED", message: "This estimate does not currently require approval." });
    }

    const now = Date.now();
    const existingPending = (await ctx.db.query("approvalRequests").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect())
      .find((request) => request.organizationId === args.organizationId && request.status === "pending");
    const requestFields = {
      organizationId: args.organizationId,
      estimateId: estimate._id,
      opportunityId: estimate.opportunityId,
      customerId: estimate.customerId,
      requestedByUserId: user._id,
      assignedApproverUserId: args.assignedApproverUserId,
      status: "pending" as const,
      reasonDetails: evaluation.reasons,
      riskScore: evaluation.riskScore,
      grossMarginPercent: evaluation.grossMarginPercent,
      discountCents,
      discountPercent: evaluation.discountPercent,
      estimatedCostCents: evaluation.estimatedCostCents,
      totalCents: estimate.totalCents,
      dueAt: approvalDueAt(now),
      requestedAt: now,
      updatedAt: now,
    };
    const approvalRequestId = existingPending
      ? existingPending._id
      : await ctx.db.insert("approvalRequests", {
          ...requestFields,
          createdAt: now,
        });
    if (existingPending) {
      await ctx.db.patch(existingPending._id, requestFields);
    }
    await ctx.db.patch(estimate._id, { approvalStatus: "pending", approvalRequestId, updatedAt: now });
    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "estimate.approval.request",
      entityType: "estimate",
      entityId: estimate._id,
      summary: `Requested internal approval for ${estimate.estimateNumber}`,
      after: { approvalRequestId, reasons: evaluation.reasons.map((reason) => reason.code), riskScore: evaluation.riskScore },
    });

    return { approvalRequestId, evaluation };
  },
});

export const decideApproval = mutation({
  args: {
    organizationId: v.id("organizations"),
    approvalRequestId: v.id("approvalRequests"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "approveEstimates");
    const request = await ctx.db.get(args.approvalRequestId);
    if (!request) throw new ConvexError({ code: "NOT_FOUND", message: "Approval request not found." });
    assertOrg(request, args.organizationId);
    if (request.status !== "pending") {
      throw new ConvexError({ code: "ALREADY_DECIDED", message: "This approval request has already been decided." });
    }
    const estimate = await ctx.db.get(request.estimateId);
    if (!estimate || estimate.organizationId !== args.organizationId) throw new ConvexError({ code: "NOT_FOUND", message: "Estimate not found." });

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: args.decision,
      decidedByUserId: user._id,
      decidedAt: now,
      decisionComment: args.comment,
      updatedAt: now,
    });
    await ctx.db.patch(estimate._id, {
      approvalStatus: args.decision,
      approvalRequestId: request._id,
      updatedAt: now,
    });
    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: `estimate.approval.${args.decision}`,
      entityType: "estimate",
      entityId: estimate._id,
      summary: `${args.decision === "approved" ? "Approved" : "Rejected"} ${estimate.estimateNumber}`,
      after: { approvalRequestId: request._id, decision: args.decision, comment: args.comment },
    });
    return { approvalRequestId: request._id, status: args.decision };
  },
});

export const sendEstimate = mutation({
  args: {
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "createEstimate");
    const estimate = await ctx.db.get(args.estimateId);
    if (!estimate) throw new ConvexError({ code: "NOT_FOUND", message: "Estimate not found." });
    assertOrg(estimate, args.organizationId);

    const inferredCostCents = await estimateCostFromLineItems(ctx, args.organizationId, estimate._id);
    const evaluation = evaluateEstimateApproval({
      subtotalCents: estimate.subtotalCents,
      totalCents: estimate.totalCents,
      discountCents: estimate.discountCents,
      estimatedCostCents: inferredCostCents,
    });
    if (evaluation.requiresApproval && !(await approvedRequestForEstimate(ctx, args.organizationId, estimate._id))) {
      throw new ConvexError({
        code: "APPROVAL_REQUIRED",
        message: "This estimate requires internal approval before it can be sent.",
        reasons: evaluation.reasons.map((reason) => reason.code),
      });
    }

    const now = Date.now();
    const expiresAt = estimate.expiresAt ?? now + 14 * 24 * 60 * 60 * 1000;
    await ctx.db.patch(estimate._id, {
      status: "sent",
      sentAt: now,
      expiresAt,
      approvalStatus: evaluation.requiresApproval ? "approved" : "not_required",
      updatedAt: now,
    });
    if (estimate.opportunityId) {
      await ctx.db.patch(estimate.opportunityId, { stage: "proposal_sent", updatedAt: now });
    }
    await ctx.db.insert("activities", {
      organizationId: args.organizationId,
      entityType: "estimate",
      entityId: estimate._id,
      kind: "estimate",
      summary: `Sent ${estimate.estimateNumber} to customer`,
      metadata: { estimateId: estimate._id, customerId: estimate.customerId, opportunityId: estimate.opportunityId, expiresAt },
      actorUserId: user._id,
      occurredAt: now,
    });
    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "estimate.send",
      entityType: "estimate",
      entityId: estimate._id,
      summary: `Sent estimate ${estimate.estimateNumber}`,
      after: { estimateId: estimate._id, approvalStatus: evaluation.requiresApproval ? "approved" : "not_required", expiresAt },
    });
    return { estimateId: estimate._id, status: "sent" as const, sentAt: now, expiresAt };
  },
});

export const acceptEstimate = mutation({
  args: {
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    acceptedByName: v.optional(v.string()),
    acceptedByEmail: v.optional(v.string()),
    acceptanceSource: v.optional(v.union(v.literal("customer_portal"), v.literal("email"), v.literal("verbal"), v.literal("office"))),
    acceptanceNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "createEstimate");
    const estimate = await ctx.db.get(args.estimateId);
    if (!estimate) throw new ConvexError({ code: "NOT_FOUND", message: "Estimate not found." });
    assertOrg(estimate, args.organizationId);
    if (estimate.status === "accepted") {
      return { estimateId: estimate._id, status: "accepted" as const, acceptedAt: estimate.acceptedAt ?? Date.now() };
    }
    if (estimate.status !== "sent") {
      throw new ConvexError({ code: "INVALID_STATUS", message: "Only sent estimates can be accepted by the customer." });
    }
    if (estimate.approvalStatus === "pending" || estimate.approvalStatus === "rejected") {
      throw new ConvexError({ code: "APPROVAL_REQUIRED", message: "Internal approval must be complete before the customer approval is captured." });
    }

    const now = Date.now();
    await ctx.db.patch(estimate._id, {
      status: "accepted",
      acceptedAt: now,
      acceptedByName: args.acceptedByName,
      acceptedByEmail: args.acceptedByEmail,
      acceptanceSource: args.acceptanceSource ?? "office",
      acceptanceNote: args.acceptanceNote,
      updatedAt: now,
    });
    if (estimate.opportunityId) {
      await ctx.db.patch(estimate.opportunityId, {
        stage: "won",
        closeProbability: 100,
        updatedAt: now,
      });
    }
    await ctx.db.insert("activities", {
      organizationId: args.organizationId,
      entityType: "estimate",
      entityId: estimate._id,
      kind: "estimate",
      summary: `Customer accepted ${estimate.estimateNumber}`,
      metadata: {
        estimateId: estimate._id,
        customerId: estimate.customerId,
        opportunityId: estimate.opportunityId,
        acceptedByName: args.acceptedByName,
        acceptedByEmail: args.acceptedByEmail,
        acceptanceSource: args.acceptanceSource ?? "office",
      },
      actorUserId: user._id,
      occurredAt: now,
    });
    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "estimate.accept",
      entityType: "estimate",
      entityId: estimate._id,
      summary: `Captured customer approval for ${estimate.estimateNumber}`,
      after: {
        estimateId: estimate._id,
        acceptedAt: now,
        acceptedByName: args.acceptedByName,
        acceptedByEmail: args.acceptedByEmail,
        acceptanceSource: args.acceptanceSource ?? "office",
      },
    });

    return { estimateId: estimate._id, status: "accepted" as const, acceptedAt: now };
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
    if (estimate.status !== "accepted") {
      throw new ConvexError({ code: "INVALID_STATUS", message: "Customer approval is required before converting an estimate to a job." });
    }

    const now = Date.now();
    const opportunity = estimate.opportunityId ? await ctx.db.get(estimate.opportunityId) : null;
    const title = args.title ?? opportunity?.title ?? `Job from ${estimate.estimateNumber}`;
    const lineItems = await ctx.db.query("estimateLineItems").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect();
    const packages = await Promise.all(
      lineItems
        .filter((item) => item.organizationId === args.organizationId && item.servicePackageId)
        .map((item) => ctx.db.get(item.servicePackageId as Id<"servicePackages">)),
    );
    const servicePackage = packages.find((item) => item && item.organizationId === args.organizationId);

    await ctx.db.patch(args.estimateId, {
      acceptedAt: estimate.acceptedAt ?? now,
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

    const phaseNames = ["Sales handoff", "Production visit", "Completion review"];
    for (const [index, name] of phaseNames.entries()) {
      await ctx.db.insert("jobPhases", {
        organizationId: args.organizationId,
        jobId,
        name,
        status: "scheduled",
        sortOrder: index + 1,
        startDate: index === 0 ? now : args.scheduledStart,
        dueDate: index === 0 ? args.scheduledStart : args.scheduledEnd + index * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
    }

    const checklistLabels = [
      "Confirm approved estimate scope",
      ...(servicePackage?.checklistDefaults ?? []),
      "Complete approved service scope",
      "Capture completion photos",
    ];
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
      checklist: checklistLabels.slice(0, 8).map((label, index) => ({
        id: `handoff-${index + 1}`,
        label,
        isDone: false,
      })),
      notes: `Created from approved estimate ${estimate.estimateNumber}.`,
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

    const taskId = await ctx.db.insert("tasks", {
      organizationId: args.organizationId,
      entityType: "job",
      entityId: jobId,
      title: "Confirm schedule and crew handoff",
      status: "open",
      priority: "high",
      dueAt: Math.max(now, args.scheduledStart - 4 * 60 * 60 * 1000),
      assignedUserId: user._id,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    const estimatedLaborCostCents = Math.round((servicePackage?.laborHours ?? 0) * (servicePackage?.laborRateCents ?? 0));
    const estimatedMaterialCostCents = servicePackage?.materialCostCents ?? 0;
    const estimatedEquipmentCostCents = servicePackage?.equipmentCostCents ?? 0;
    const overheadCostCents = Math.round((estimatedLaborCostCents + estimatedMaterialCostCents + estimatedEquipmentCostCents) * ((servicePackage?.overheadPercent ?? 0) / 100));
    const estimatedCostCents = estimatedLaborCostCents + estimatedMaterialCostCents + estimatedEquipmentCostCents + overheadCostCents;
    const grossProfitCents = estimate.totalCents - estimatedCostCents;
    await ctx.db.insert("jobCostSummaries", {
      organizationId: args.organizationId,
      jobId,
      customerId: estimate.customerId,
      estimatedRevenueCents: estimate.totalCents,
      actualRevenueCents: estimate.totalCents,
      invoicedCents: 0,
      collectedCents: 0,
      estimatedLaborCostCents,
      actualLaborCostCents: 0,
      estimatedMaterialCostCents,
      actualMaterialCostCents: 0,
      estimatedEquipmentCostCents,
      actualEquipmentCostCents: 0,
      overheadCostCents,
      grossProfitCents,
      grossMarginPercent: estimate.totalCents > 0 ? Math.round((grossProfitCents / estimate.totalCents) * 1000) / 10 : 0,
      varianceCents: 0,
      calculatedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("activities", {
      organizationId: args.organizationId,
      entityType: "job",
      entityId: jobId,
      kind: "system",
      summary: `Converted ${estimate.estimateNumber} to job ${title}`,
      metadata: { estimateId: estimate._id, opportunityId: estimate.opportunityId, visitId, taskId },
      actorUserId: user._id,
      occurredAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "estimate.convert",
      entityType: "job",
      entityId: jobId,
      summary: `Converted ${estimate.estimateNumber} to job ${title}`,
      after: { estimateId: estimate._id, jobId, visitId, taskId, crewId: args.crewId },
    });

    return { jobId, visitId };
  },
});
