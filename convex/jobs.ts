import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOrg, requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";

const entityType = v.union(
  v.literal("customer"),
  v.literal("lead"),
  v.literal("opportunity"),
  v.literal("estimate"),
  v.literal("job"),
  v.literal("visit"),
  v.literal("property"),
);

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

    const [customer, property, visits, tasks, notes, activities] = await Promise.all([
      ctx.db.get(job.customerId),
      job.propertyId ? ctx.db.get(job.propertyId) : null,
      ctx.db.query("jobVisits").withIndex("by_job", (q) => q.eq("jobId", args.jobId)).collect(),
      ctx.db.query("tasks").withIndex("by_entity", (q) => q.eq("entityType", "job").eq("entityId", args.jobId)).collect(),
      ctx.db.query("notes").withIndex("by_entity", (q) => q.eq("entityType", "job").eq("entityId", args.jobId)).order("desc").take(20),
      ctx.db.query("activities").withIndex("by_entity", (q) => q.eq("entityType", "job").eq("entityId", args.jobId)).order("desc").take(20),
    ]);

    return { job, customer, property, visits, tasks, notes, activities };
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
      after: { taskId },
    });

    return taskId;
  },
});
