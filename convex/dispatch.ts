import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOrg, requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";

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

    await ctx.db.insert("visitAssignments", {
      organizationId: args.organizationId,
      visitId: args.visitId,
      crewId: args.crewId,
      role: "Primary crew",
      status: "assigned",
      createdAt: now,
      updatedAt: now,
    });

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
