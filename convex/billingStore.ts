import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";
import { planLimits } from "./setup";
import { paymentFailedEmail, trialEndingEmail } from "./lib/emails";

const planArg = v.union(v.literal("free"), v.literal("starter"), v.literal("pro"), v.literal("growth"), v.literal("enterprise"));
const statusArg = v.union(v.literal("trialing"), v.literal("active"), v.literal("past_due"), v.literal("canceled"), v.literal("manual"));

/** Auth-checked context for checkout/portal actions. */
export const getBillingContext = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageOrganization");
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found." });
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();
    return {
      organizationName: org.name,
      stripeCustomerId: subscription?.stripeCustomerId ?? null,
      hasHadTrial: Boolean(subscription?.trialEndsAt),
      requesterEmail: user.email,
    };
  },
});

/** Billing pane data: plan, status, usage vs limits. Any active member can view. */
export const getBillingOverview = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found." });
    const [subscription, contacts, members] = await Promise.all([
      ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).first(),
      ctx.db.query("contacts").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
    ]);
    const plan = subscription?.plan ?? org.billingPlan ?? "free";
    return {
      plan,
      status: subscription?.status ?? org.subscriptionStatus ?? "active",
      seats: subscription?.seats ?? 1,
      trialEndsAt: subscription?.trialEndsAt ?? org.trialEndsAt ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      stripeCustomerId: subscription?.stripeCustomerId ?? null,
      usage: {
        contacts: contacts.length,
        activeMembers: members.filter((m) => m.status === "active").length,
        ...planLimits(plan),
      },
    };
  },
});

/** Applies Stripe webhook state onto the subscriptions table (+ org mirror fields). */
export const upsertFromStripe = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    plan: v.optional(planArg),
    status: statusArg,
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    const patch = {
      plan: args.plan ?? existing?.plan ?? "free",
      status: args.status,
      stripeCustomerId: args.stripeCustomerId ?? existing?.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId ?? existing?.stripeSubscriptionId,
      currentPeriodStart: args.currentPeriodStart ?? existing?.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd ?? existing?.currentPeriodEnd,
      trialEndsAt: args.trialEndsAt ?? existing?.trialEndsAt,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("subscriptions", { organizationId: args.organizationId, seats: 1, createdAt: now, ...patch });
    }

    await ctx.db.patch(args.organizationId, {
      billingPlan: patch.plan,
      subscriptionStatus: args.status === "manual" ? "active" : args.status,
      updatedAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      action: "billing.subscription_updated",
      entityType: "customer",
      entityId: args.organizationId,
      summary: `Subscription ${patch.plan} → ${args.status}`,
      after: { plan: patch.plan, status: args.status },
    });
  },
});

/** invoice.payment_failed → mark past_due and email the owner. */
export const recordPaymentFailure = internalMutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .first();
    if (!subscription) return;
    const now = Date.now();
    await ctx.db.patch(subscription._id, { status: "past_due", updatedAt: now });

    const org = await ctx.db.get(subscription.organizationId);
    const ownerEmail = await findOwnerEmail(ctx, subscription.organizationId);
    if (ownerEmail && org) {
      const email = paymentFailedEmail({ organizationName: org.name });
      await ctx.scheduler.runAfter(0, internal.email.send, { to: ownerEmail, ...email });
    }
  },
});

/** Daily cron: remind owners 3 days and 1 day before trial end. */
export const scheduledTrialReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const trialing = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "trialing"))
      .collect();
    let sent = 0;
    for (const subscription of trialing) {
      if (!subscription.trialEndsAt || subscription.trialEndsAt < now) continue;
      const daysLeft = Math.ceil((subscription.trialEndsAt - now) / dayMs);
      if (daysLeft !== 3 && daysLeft !== 1) continue;
      const org = await ctx.db.get(subscription.organizationId);
      const ownerEmail = await findOwnerEmail(ctx, subscription.organizationId);
      if (!org || !ownerEmail) continue;
      const email = trialEndingEmail({ organizationName: org.name, daysLeft });
      await ctx.scheduler.runAfter(0, internal.email.send, { to: ownerEmail, ...email });
      sent += 1;
    }
    return { sent };
  },
});

async function findOwnerEmail(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const rows = await ctx.db
    .query("memberships")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .collect();
  const owner = rows.find((membership) => membership.role === "owner" && membership.status === "active");
  if (!owner) return null;
  const user = await ctx.db.get(owner.userId);
  return user?.email ?? null;
}
