import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOrg, requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";

export const getMyVisits = query({
  args: {
    organizationId: v.id("organizations"),
    start: v.number(),
    end: v.number(),
  },
  handler: async (ctx, args) => {
    const { user, membership } = await requireMembership(ctx, args.organizationId);
    const visits = await ctx.db
      .query("jobVisits")
      .withIndex("by_org_date", (q) => q.eq("organizationId", args.organizationId).gte("scheduledStart", args.start).lt("scheduledStart", args.end))
      .collect();

    const crewMemberships = await ctx.db
      .query("crewMembers")
      .withIndex("by_org_user", (q) => q.eq("organizationId", args.organizationId).eq("userId", user._id))
      .collect();
    const crewIds = new Set(crewMemberships.filter((item) => item.active).map((item) => item.crewId));
    const canSeeAll = ["owner", "admin", "manager", "dispatcher"].includes(membership.role);
    const visibleVisits = canSeeAll ? visits : visits.filter((visit) => visit.assignedCrewId && crewIds.has(visit.assignedCrewId));

    return await Promise.all(
      visibleVisits.map(async (visit) => {
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

export const completeChecklistItem = mutation({
  args: {
    organizationId: v.id("organizations"),
    visitId: v.id("jobVisits"),
    itemId: v.string(),
    isDone: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "completeFieldWork");
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new ConvexError({ code: "NOT_FOUND", message: "Visit not found." });
    assertOrg(visit, args.organizationId);

    const now = Date.now();
    const checklist = visit.checklist.map((item) =>
      item.id === args.itemId
        ? {
            ...item,
            isDone: args.isDone,
            completedAt: args.isDone ? now : undefined,
          }
        : item,
    );

    await ctx.db.patch(args.visitId, {
      checklist,
      status: visit.status === "scheduled" ? "on_site" : visit.status,
      updatedAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "visit.checklist",
      entityType: "visit",
      entityId: args.visitId,
      summary: `Updated checklist item ${args.itemId}`,
      after: { itemId: args.itemId, isDone: args.isDone },
    });

    return args.visitId;
  },
});

export const submitVisit = mutation({
  args: {
    organizationId: v.id("organizations"),
    visitId: v.id("jobVisits"),
    notes: v.optional(v.string()),
    issueFlag: v.optional(v.string()),
    materialApplications: v.optional(
      v.array(
        v.object({
          materialId: v.id("materials"),
          quantity: v.number(),
          unit: v.string(),
          notes: v.optional(v.string()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "completeFieldWork");
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new ConvexError({ code: "NOT_FOUND", message: "Visit not found." });
    assertOrg(visit, args.organizationId);

    const now = Date.now();
    await ctx.db.patch(args.visitId, {
      status: "complete",
      completedAt: now,
      notes: args.notes ?? visit.notes,
      updatedAt: now,
    });

    for (const application of args.materialApplications ?? []) {
      const material = await ctx.db.get(application.materialId);
      if (!material) throw new ConvexError({ code: "NOT_FOUND", message: "Material not found." });
      assertOrg(material, args.organizationId);
      await ctx.db.insert("materialApplications", {
        organizationId: args.organizationId,
        visitId: args.visitId,
        materialId: application.materialId,
        quantity: application.quantity,
        unit: application.unit,
        notes: application.notes,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (args.issueFlag) {
      await ctx.db.insert("tasks", {
        organizationId: args.organizationId,
        entityType: "visit",
        entityId: args.visitId,
        title: args.issueFlag,
        status: "open",
        priority: "high",
        createdByUserId: user._id,
        dueAt: now + 24 * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
    }

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "visit.submit",
      entityType: "visit",
      entityId: args.visitId,
      summary: "Submitted field visit completion",
      after: { status: "complete", issueFlag: args.issueFlag },
    });

    return args.visitId;
  },
});
