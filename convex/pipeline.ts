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

export const listOpportunities = query({
  args: {
    organizationId: v.id("organizations"),
    stage: v.optional(opportunityStage),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    const opportunities = args.stage
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

    return await Promise.all(
      opportunities.map(async (opportunity) => {
        const [customer, property, estimate] = await Promise.all([
          ctx.db.get(opportunity.customerId),
          opportunity.propertyId ? ctx.db.get(opportunity.propertyId) : null,
          ctx.db.query("estimates").withIndex("by_opportunity", (q) => q.eq("opportunityId", opportunity._id)).order("desc").first(),
        ]);
        return { opportunity, customer, property, estimate };
      }),
    );
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
