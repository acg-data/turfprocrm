import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireMembership } from "./lib/auth";

export const getOverview = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);

    const [customers, opportunities, estimates, visits, tasks, activities, crews] = await Promise.all([
      ctx.db.query("customers").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("opportunities").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("estimates").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("jobVisits").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("tasks").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("activities").withIndex("by_org_time", (q) => q.eq("organizationId", args.organizationId)).order("desc").take(8),
      ctx.db.query("crews").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
    ]);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = start.getTime() + 24 * 60 * 60 * 1000;
    const now = Date.now();

    return {
      counts: {
        customers: customers.length,
        openOpportunities: opportunities.filter((item) => !["won", "lost"].includes(item.stage)).length,
        openEstimates: estimates.filter((item) => ["draft", "sent"].includes(item.status)).length,
        todayVisits: visits.filter((item) => item.scheduledStart >= start.getTime() && item.scheduledStart < end).length,
        overdueTasks: tasks.filter((item) => item.status !== "done" && item.dueAt !== undefined && item.dueAt < now).length,
      },
      pipelineValueCents: opportunities
        .filter((item) => !["won", "lost"].includes(item.stage))
        .reduce((sum, item) => sum + item.valueCents, 0),
      wonValueCents: opportunities.filter((item) => item.stage === "won").reduce((sum, item) => sum + item.valueCents, 0),
      crewWorkload: crews.map((crew) => ({
        crew,
        visits: visits.filter((visit) => visit.assignedCrewId === crew._id && visit.scheduledStart >= start.getTime() && visit.scheduledStart < end).length,
      })),
      recentActivities: activities,
    };
  },
});
