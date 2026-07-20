import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { assertOrg, requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";

const editableVisitStatus = v.union(
  v.literal("scheduled"),
  v.literal("en_route"),
  v.literal("on_site"),
  v.literal("complete"),
  v.literal("missed"),
  v.literal("canceled"),
);

function addCalendarMonths(value: number, months: number) {
  const source = new Date(value);
  const day = source.getDate();
  const result = new Date(value);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result.getTime();
}

function recurringStart(firstStart: number, index: number, frequency: "weekly" | "biweekly" | "monthly" | "seasonal" | "custom", intervalDays: number) {
  if (frequency === "monthly") return addCalendarMonths(firstStart, index);
  if (frequency === "seasonal") return addCalendarMonths(firstStart, index * 3);
  const result = new Date(firstStart);
  result.setDate(result.getDate() + index * intervalDays);
  return result.getTime();
}

export const getSchedule = query({
  args: {
    organizationId: v.id("organizations"),
    start: v.number(),
    end: v.number(),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    const visits = await ctx.db
      .query("jobVisits")
      .withIndex("by_org_date", (q) => q.eq("organizationId", args.organizationId).gte("scheduledStart", args.start).lt("scheduledStart", args.end))
      .collect();

    return await Promise.all(
      visits.map(async (visit) => {
        const [job, customer, property, crew] = await Promise.all([
          ctx.db.get(visit.jobId),
          ctx.db.get(visit.customerId),
          visit.propertyId ? ctx.db.get(visit.propertyId) : null,
          visit.assignedCrewId ? ctx.db.get(visit.assignedCrewId) : null,
        ]);
        return { visit, job, customer, property, crew };
      }),
    );
  },
});

export const assignVisit = mutation({
  args: {
    organizationId: v.id("organizations"),
    visitId: v.id("jobVisits"),
    crewId: v.id("crews"),
    routeOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "dispatchVisits");
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new ConvexError({ code: "NOT_FOUND", message: "Visit not found." });
    assertOrg(visit, args.organizationId);

    const crew = await ctx.db.get(args.crewId);
    if (!crew) throw new ConvexError({ code: "NOT_FOUND", message: "Crew not found." });
    assertOrg(crew, args.organizationId);

    const now = Date.now();
    await ctx.db.patch(args.visitId, {
      assignedCrewId: args.crewId,
      routeOrder: args.routeOrder ?? visit.routeOrder,
      updatedAt: now,
    });

    const existingAssignments = await ctx.db.query("visitAssignments").withIndex("by_visit", (q) => q.eq("visitId", args.visitId)).collect();
    const primaryAssignment = existingAssignments.find((assignment) => assignment.organizationId === args.organizationId && assignment.role === "Primary crew");
    if (primaryAssignment) {
      await ctx.db.patch(primaryAssignment._id, {
        crewId: args.crewId,
        status: "assigned",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("visitAssignments", {
        organizationId: args.organizationId,
        visitId: args.visitId,
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
      action: "visit.assign",
      entityType: "visit",
      entityId: args.visitId,
      summary: `Assigned visit to ${crew.name}`,
      before: { assignedCrewId: visit.assignedCrewId },
      after: { assignedCrewId: args.crewId },
    });

    return args.visitId;
  },
});

export const reorderVisit = mutation({
  args: {
    organizationId: v.id("organizations"),
    visitId: v.id("jobVisits"),
    routeOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "dispatchVisits");
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new ConvexError({ code: "NOT_FOUND", message: "Visit not found." });
    assertOrg(visit, args.organizationId);

    const routeOrder = Math.max(1, Math.round(args.routeOrder));
    const now = Date.now();
    await ctx.db.patch(args.visitId, {
      routeOrder,
      updatedAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "visit.reorder",
      entityType: "visit",
      entityId: args.visitId,
      summary: `Moved visit from stop ${visit.routeOrder} to stop ${routeOrder}`,
      before: { routeOrder: visit.routeOrder },
      after: { routeOrder },
    });

    return { visitId: args.visitId, routeOrder };
  },
});

export const updateVisit = mutation({
  args: {
    organizationId: v.id("organizations"),
    visitId: v.id("jobVisits"),
    scheduledStart: v.number(),
    scheduledEnd: v.number(),
    crewId: v.union(v.id("crews"), v.null()),
    status: editableVisitStatus,
    routeOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "dispatchVisits");
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new ConvexError({ code: "NOT_FOUND", message: "Visit not found." });
    assertOrg(visit, args.organizationId);
    if (!Number.isFinite(args.scheduledStart) || !Number.isFinite(args.scheduledEnd) || args.scheduledEnd <= args.scheduledStart) {
      throw new ConvexError({ code: "INVALID_SCHEDULE", message: "Visit end time must be after its start time." });
    }
    if (args.scheduledEnd - args.scheduledStart > 24 * 60 * 60 * 1000) {
      throw new ConvexError({ code: "INVALID_SCHEDULE", message: "A visit cannot exceed 24 hours." });
    }

    const crew = args.crewId ? await ctx.db.get(args.crewId) : null;
    if (args.crewId && !crew) throw new ConvexError({ code: "NOT_FOUND", message: "Crew not found." });
    if (crew) assertOrg(crew, args.organizationId);

    const routeOrder = Math.max(1, Math.round(args.routeOrder));
    const now = Date.now();
    await ctx.db.patch(args.visitId, {
      scheduledStart: args.scheduledStart,
      scheduledEnd: args.scheduledEnd,
      assignedCrewId: args.crewId ?? undefined,
      status: args.status,
      routeOrder,
      completedAt: args.status === "complete" ? visit.completedAt ?? now : undefined,
      updatedAt: now,
    });

    const assignments = await ctx.db.query("visitAssignments").withIndex("by_visit", (q) => q.eq("visitId", args.visitId)).collect();
    const primaryAssignment = assignments.find((assignment) => assignment.organizationId === args.organizationId && assignment.role === "Primary crew");
    if (args.crewId) {
      if (primaryAssignment) {
        await ctx.db.patch(primaryAssignment._id, { crewId: args.crewId, status: "assigned", updatedAt: now });
      } else {
        await ctx.db.insert("visitAssignments", {
          organizationId: args.organizationId,
          visitId: args.visitId,
          crewId: args.crewId,
          role: "Primary crew",
          status: "assigned",
          createdAt: now,
          updatedAt: now,
        });
      }
    } else if (primaryAssignment) {
      await ctx.db.delete(primaryAssignment._id);
    }

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "visit.update_schedule",
      entityType: "visit",
      entityId: args.visitId,
      summary: `Updated visit schedule${crew ? ` for ${crew.name}` : " and left it unassigned"}`,
      before: {
        scheduledStart: visit.scheduledStart,
        scheduledEnd: visit.scheduledEnd,
        assignedCrewId: visit.assignedCrewId,
        status: visit.status,
        routeOrder: visit.routeOrder,
      },
      after: {
        scheduledStart: args.scheduledStart,
        scheduledEnd: args.scheduledEnd,
        assignedCrewId: args.crewId,
        status: args.status,
        routeOrder,
      },
    });

    return { visitId: args.visitId, scheduledStart: args.scheduledStart, scheduledEnd: args.scheduledEnd, crewId: args.crewId, status: args.status, routeOrder };
  },
});

export const createVisit = mutation({
  args: {
    organizationId: v.id("organizations"),
    jobId: v.id("jobs"),
    scheduledStart: v.number(),
    durationMinutes: v.number(),
    crewId: v.union(v.id("crews"), v.null()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "dispatchVisits");
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found." });
    assertOrg(job, args.organizationId);
    const crew = args.crewId ? await ctx.db.get(args.crewId) : null;
    if (args.crewId && !crew) throw new ConvexError({ code: "NOT_FOUND", message: "Crew not found." });
    if (crew) assertOrg(crew, args.organizationId);
    const durationMinutes = Math.max(15, Math.min(24 * 60, Math.round(args.durationMinutes)));
    const scheduledEnd = args.scheduledStart + durationMinutes * 60 * 1000;
    const existingVisits = await ctx.db.query("jobVisits").withIndex("by_org_date", (q) => q.eq("organizationId", args.organizationId).gte("scheduledStart", args.scheduledStart - 24 * 60 * 60 * 1000).lt("scheduledStart", args.scheduledStart + 24 * 60 * 60 * 1000)).collect();
    const routeOrder = existingVisits.filter((visit) => visit.assignedCrewId === args.crewId).reduce((max, visit) => Math.max(max, visit.routeOrder ?? 0), 0) + 1;
    const now = Date.now();
    const visitId = await ctx.db.insert("jobVisits", {
      organizationId: args.organizationId,
      jobId: job._id,
      customerId: job.customerId,
      propertyId: job.propertyId,
      scheduledStart: args.scheduledStart,
      scheduledEnd,
      status: "scheduled",
      routeOrder,
      assignedCrewId: args.crewId ?? undefined,
      checklist: [
        { id: "scheduled-1", label: "Confirm property access and approved scope", isDone: false },
        { id: "scheduled-2", label: "Complete scheduled service", isDone: false },
        { id: "scheduled-3", label: "Log materials, photos, and customer notes", isDone: false },
      ],
      notes: "Scheduled from the service calendar.",
      createdAt: now,
      updatedAt: now,
    });
    if (args.crewId) await ctx.db.insert("visitAssignments", { organizationId: args.organizationId, visitId, crewId: args.crewId, role: "Primary crew", status: "assigned", createdAt: now, updatedAt: now });
    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "visit.create",
      entityType: "visit",
      entityId: visitId,
      summary: `Scheduled ${job.title}${crew ? ` for ${crew.name}` : " without a crew"}`,
      after: { jobId: job._id, scheduledStart: args.scheduledStart, scheduledEnd, assignedCrewId: args.crewId, routeOrder },
    });
    return { visitId, routeOrder, scheduledEnd };
  },
});

export const generateRecurringRoute = mutation({
  args: {
    organizationId: v.id("organizations"),
    jobId: v.id("jobs"),
    frequency: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly"), v.literal("seasonal"), v.literal("custom")),
    count: v.number(),
    firstStart: v.number(),
    durationMinutes: v.number(),
    crewId: v.optional(v.id("crews")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "dispatchVisits");
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError({ code: "NOT_FOUND", message: "Job not found." });
    assertOrg(job, args.organizationId);

    const crew = args.crewId ? await ctx.db.get(args.crewId) : null;
    if (args.crewId && !crew) throw new ConvexError({ code: "NOT_FOUND", message: "Crew not found." });
    if (crew) assertOrg(crew, args.organizationId);

    const intervalDaysByFrequency = {
      weekly: 7,
      biweekly: 14,
      monthly: 30,
      seasonal: 90,
      custom: 7,
    } as const;
    const count = Math.max(1, Math.min(26, Math.round(args.count)));
    const durationMinutes = Math.max(30, Math.min(12 * 60, Math.round(args.durationMinutes)));
    const intervalDays = intervalDaysByFrequency[args.frequency];
    const now = Date.now();
    const existingVisits = await ctx.db.query("jobVisits").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect();
    const routeOrderStart = existingVisits.reduce((max, visit) => Math.max(max, visit.routeOrder ?? 0), 0);

    const planId = await ctx.db.insert("recurringServicePlans", {
      organizationId: args.organizationId,
      customerId: job.customerId,
      propertyId: job.propertyId,
      jobId: job._id,
      crewId: args.crewId,
      name: `${job.title} ${args.frequency} route`,
      frequency: args.frequency,
      intervalDays,
      visitDurationMinutes: durationMinutes,
      nextRunAt: args.firstStart,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const visitIds: Array<Id<"jobVisits">> = [];
    for (let index = 0; index < count; index += 1) {
      const scheduledStart = recurringStart(args.firstStart, index, args.frequency, intervalDays);
      const scheduledEnd = scheduledStart + durationMinutes * 60 * 1000;
      const visitId = await ctx.db.insert("jobVisits", {
        organizationId: args.organizationId,
        jobId: job._id,
        customerId: job.customerId,
        propertyId: job.propertyId,
        scheduledStart,
        scheduledEnd,
        status: "scheduled",
        routeOrder: routeOrderStart + index + 1,
        assignedCrewId: args.crewId,
        checklist: [
          { id: "recurring-1", label: "Confirm recurring scope and property access", isDone: false },
          { id: "recurring-2", label: "Complete scheduled recurring service", isDone: false },
          { id: "recurring-3", label: "Log materials, issues, and customer notes", isDone: false },
        ],
        notes: `Generated from recurring plan ${planId}.`,
        createdAt: now,
        updatedAt: now,
      });
      visitIds.push(visitId);
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
    }

    await ctx.db.patch(planId, {
      lastGeneratedAt: now,
      generatedVisitIds: visitIds,
      nextRunAt: recurringStart(args.firstStart, count, args.frequency, intervalDays),
      updatedAt: now,
    });
    await ctx.db.patch(job._id, { recurrence: args.frequency, updatedAt: now });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "recurring_route.generate",
      entityType: "job",
      entityId: job._id,
      summary: `Generated ${count} ${args.frequency} visits for ${job.title}`,
      after: { planId, visitIds, frequency: args.frequency, intervalDays, count },
    });

    return { planId, visitIds, generatedCount: visitIds.length };
  },
});
