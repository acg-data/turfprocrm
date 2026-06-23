import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOrg, requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";
import { assertEntityInOrganization } from "./lib/entities";

const entityType = v.union(
  v.literal("customer"),
  v.literal("lead"),
  v.literal("opportunity"),
  v.literal("estimate"),
  v.literal("job"),
  v.literal("visit"),
  v.literal("property"),
);

function changeOrderMath(revenueDeltaCents: number, estimatedCostDeltaCents: number) {
  const grossProfitDeltaCents = revenueDeltaCents - estimatedCostDeltaCents;
  const grossMarginPercent = revenueDeltaCents > 0 ? Math.round((grossProfitDeltaCents / revenueDeltaCents) * 1000) / 10 : 0;
  return { grossProfitDeltaCents, grossMarginPercent };
}

export const getJobWorkspace = query({
  args: {
    organizationId: v.id("organizations"),
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found." });
    assertOrg(job, args.organizationId);

    const [customer, property, visits, changeOrders, tasks, notes, activities] = await Promise.all([
      ctx.db.get(job.customerId),
      job.propertyId ? ctx.db.get(job.propertyId) : null,
      ctx.db.query("jobVisits").withIndex("by_job", (q) => q.eq("jobId", args.jobId)).collect(),
      ctx.db.query("changeOrders").withIndex("by_job", (q) => q.eq("jobId", args.jobId)).collect(),
      ctx.db.query("tasks").withIndex("by_entity", (q) => q.eq("entityType", "job").eq("entityId", args.jobId)).collect(),
      ctx.db.query("notes").withIndex("by_entity", (q) => q.eq("entityType", "job").eq("entityId", args.jobId)).order("desc").take(20),
      ctx.db.query("activities").withIndex("by_entity", (q) => q.eq("entityType", "job").eq("entityId", args.jobId)).order("desc").take(20),
    ]);

    return { job, customer, property, visits, changeOrders, tasks, notes, activities };
  },
});

export const createChangeOrder = mutation({
  args: {
    organizationId: v.id("organizations"),
    jobId: v.id("jobs"),
    title: v.string(),
    description: v.string(),
    requestedByName: v.optional(v.string()),
    revenueDeltaCents: v.number(),
    estimatedCostDeltaCents: v.number(),
    scheduleImpactDays: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "createEstimate");
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found." });
    assertOrg(job, args.organizationId);

    const title = args.title.trim();
    const description = args.description.trim();
    if (!title || !description) throw new ConvexError({ code: "VALIDATION_ERROR", message: "Change order title and description are required." });
    const revenueDeltaCents = Math.max(0, Math.round(args.revenueDeltaCents));
    const estimatedCostDeltaCents = Math.max(0, Math.round(args.estimatedCostDeltaCents));
    const scheduleImpactDays = Math.max(0, Math.min(90, Math.round(args.scheduleImpactDays)));
    const { grossProfitDeltaCents, grossMarginPercent } = changeOrderMath(revenueDeltaCents, estimatedCostDeltaCents);
    const now = Date.now();

    const changeOrderId = await ctx.db.insert("changeOrders", {
      organizationId: args.organizationId,
      jobId: job._id,
      customerId: job.customerId,
      propertyId: job.propertyId,
      estimateId: job.estimateId,
      title,
      description,
      status: "pending_approval",
      requestedByName: args.requestedByName?.trim() || undefined,
      revenueDeltaCents,
      estimatedCostDeltaCents,
      grossProfitDeltaCents,
      grossMarginPercent,
      scheduleImpactDays,
      requestedAt: now,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "change_order.create",
      entityType: "job",
      entityId: job._id,
      summary: `Created change order ${title}`,
      after: { changeOrderId, revenueDeltaCents, estimatedCostDeltaCents, grossMarginPercent, scheduleImpactDays },
    });

    return changeOrderId;
  },
});

export const approveChangeOrder = mutation({
  args: {
    organizationId: v.id("organizations"),
    changeOrderId: v.id("changeOrders"),
    approvedByName: v.string(),
    approvedByEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "approveEstimates");
    const changeOrder = await ctx.db.get(args.changeOrderId);
    if (!changeOrder) throw new ConvexError({ code: "NOT_FOUND", message: "Change order not found." });
    assertOrg(changeOrder, args.organizationId);
    if (changeOrder.status !== "pending_approval" && changeOrder.status !== "draft") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Only draft or pending change orders can be approved." });
    }
    const job = await ctx.db.get(changeOrder.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found." });
    assertOrg(job, args.organizationId);

    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      organizationId: args.organizationId,
      entityType: "job",
      entityId: job._id,
      title: `Schedule approved change order: ${changeOrder.title}`,
      status: "open",
      priority: changeOrder.scheduleImpactDays > 0 ? "high" : "normal",
      dueAt: now + Math.max(1, changeOrder.scheduleImpactDays || 1) * 24 * 60 * 60 * 1000,
      assignedUserId: job.managerUserId,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.changeOrderId, {
      status: "approved",
      approvedByName: args.approvedByName.trim() || "Customer",
      approvedByEmail: args.approvedByEmail?.trim() || undefined,
      approvedAt: now,
      taskId,
      updatedAt: now,
    });

    if (changeOrder.scheduleImpactDays > 0) {
      const scheduleBase = job.endDate ?? job.startDate ?? now;
      await ctx.db.patch(job._id, {
        endDate: scheduleBase + changeOrder.scheduleImpactDays * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });
    }

    const existingSummary = await ctx.db.query("jobCostSummaries").withIndex("by_job", (q) => q.eq("jobId", job._id)).first();
    if (existingSummary) {
      const estimatedRevenueCents = existingSummary.estimatedRevenueCents + changeOrder.revenueDeltaCents;
      const estimatedMaterialCostCents = existingSummary.estimatedMaterialCostCents + changeOrder.estimatedCostDeltaCents;
      const grossProfitCents = existingSummary.grossProfitCents + changeOrder.grossProfitDeltaCents;
      await ctx.db.patch(existingSummary._id, {
        estimatedRevenueCents,
        estimatedMaterialCostCents,
        grossProfitCents,
        grossMarginPercent: estimatedRevenueCents > 0 ? Math.round((grossProfitCents / estimatedRevenueCents) * 1000) / 10 : 0,
        varianceCents: existingSummary.varianceCents + changeOrder.grossProfitDeltaCents,
        calculatedAt: now,
        updatedAt: now,
      });
    }

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "change_order.approve",
      entityType: "job",
      entityId: job._id,
      summary: `Approved change order ${changeOrder.title}`,
      before: { status: changeOrder.status },
      after: {
        changeOrderId: args.changeOrderId,
        status: "approved",
        taskId,
        revenueDeltaCents: changeOrder.revenueDeltaCents,
        estimatedCostDeltaCents: changeOrder.estimatedCostDeltaCents,
        scheduleImpactDays: changeOrder.scheduleImpactDays,
      },
    });

    return { changeOrderId: args.changeOrderId, taskId };
  },
});

export const addTask = mutation({
  args: {
    organizationId: v.id("organizations"),
    entityType,
    entityId: v.string(),
    title: v.string(),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
    dueAt: v.optional(v.number()),
    assignedUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "addInternalNotes");
    await assertEntityInOrganization(ctx, args.organizationId, args.entityType, args.entityId);
    if (args.assignedUserId) {
      const assignedUserId = args.assignedUserId;
      const assignedMembership = await ctx.db
        .query("memberships")
        .withIndex("by_org_user", (q) => q.eq("organizationId", args.organizationId).eq("userId", assignedUserId))
        .first();
      if (!assignedMembership || assignedMembership.status !== "active") {
        throw new ConvexError({ code: "INVALID_ASSIGNEE", message: "Assigned user must be an active member of this organization." });
      }
    }
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      organizationId: args.organizationId,
      entityType: args.entityType,
      entityId: args.entityId,
      title: args.title,
      status: "open",
      priority: args.priority ?? "normal",
      dueAt: args.dueAt,
      assignedUserId: args.assignedUserId,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "task.create",
      entityType: args.entityType,
      entityId: args.entityId,
      summary: `Created task ${args.title}`,
      after: { taskId, priority: args.priority ?? "normal", dueAt: args.dueAt, assignedUserId: args.assignedUserId },
    });

    return taskId;
  },
});
