import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOrg, requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const billingPlan = v.union(v.literal("free"), v.literal("starter"), v.literal("pro"), v.literal("growth"), v.literal("enterprise"));
const subscriptionStatus = v.union(
  v.literal("trialing"),
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("unpaid"),
  v.literal("incomplete"),
  v.literal("incomplete_expired"),
  v.literal("paused"),
  v.literal("manual"),
);
const invoiceStatus = v.union(v.literal("draft"), v.literal("open"), v.literal("paid"), v.literal("void"), v.literal("uncollectible"));

type Ctx = QueryCtx | MutationCtx;

async function organizationForStripeSync(ctx: Ctx, input: { organizationId?: Id<"organizations">; stripeCustomerId?: string }) {
  if (input.organizationId) {
    const organization = await ctx.db.get(input.organizationId);
    if (!organization) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found." });
    return organization;
  }

  if (input.stripeCustomerId) {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", input.stripeCustomerId))
      .first();
    if (subscription) {
      const organization = await ctx.db.get(subscription.organizationId);
      if (organization) return organization;
    }
  }

  throw new ConvexError({ code: "NOT_FOUND", message: "Could not resolve Stripe event to an organization." });
}

async function organizationForPaddleSync(ctx: Ctx, input: { organizationId?: Id<"organizations">; paddleCustomerId?: string }) {
  if (input.organizationId) {
    const organization = await ctx.db.get(input.organizationId);
    if (!organization) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found." });
    return organization;
  }

  if (input.paddleCustomerId) {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_paddle_customer", (q) => q.eq("paddleCustomerId", input.paddleCustomerId))
      .first();
    if (subscription) {
      const organization = await ctx.db.get(subscription.organizationId);
      if (organization) return organization;
    }
  }

  throw new ConvexError({ code: "NOT_FOUND", message: "Could not resolve Paddle event to an organization." });
}

function requireStripeWebhookSecret(secret: string) {
  const expected = process.env.STRIPE_WEBHOOK_SECRET;
  if (!expected) {
    throw new ConvexError({ code: "BILLING_SECRET_NOT_CONFIGURED", message: "Stripe webhook secret is not configured in Convex." });
  }
  if (secret !== expected) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Invalid billing sync secret." });
  }
}

function requirePaddleWebhookSecret(secret: string) {
  const expected = process.env.PADDLE_WEBHOOK_SECRET_KEY ?? process.env.PADDLE_WEBHOOK_SECRET;
  if (!expected) {
    throw new ConvexError({ code: "BILLING_SECRET_NOT_CONFIGURED", message: "Paddle webhook secret is not configured in Convex." });
  }
  if (secret !== expected) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Invalid Paddle billing sync secret." });
  }
}

export const getBillingContext = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { user, membership } = await requireMembership(ctx, args.organizationId);
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found." });
    const subscription = await ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).first();
    return {
      organization,
      subscription,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      membership,
    };
  },
});

export const attachStripeCustomer = mutation({
  args: {
    organizationId: v.id("organizations"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageOrganization");
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found." });
    const now = Date.now();
    const existingSubscription = await ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).first();

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, {
        stripeCustomerId: args.stripeCustomerId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        organizationId: args.organizationId,
        stripeCustomerId: args.stripeCustomerId,
        plan: organization.billingPlan ?? "free",
        status: organization.subscriptionStatus ?? "active",
        seats: 1,
        trialEndsAt: organization.trialEndsAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "billing.stripe_customer.attach",
      entityType: "organization",
      entityId: args.organizationId,
      summary: "Attached Stripe customer to organization",
      after: { stripeCustomerId: args.stripeCustomerId },
    });

    return args.stripeCustomerId;
  },
});

export const attachPaddleCustomer = mutation({
  args: {
    organizationId: v.id("organizations"),
    paddleCustomerId: v.string(),
    paddleTransactionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageOrganization");
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found." });
    const now = Date.now();
    const existingSubscription = await ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).first();

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, {
        paddleCustomerId: args.paddleCustomerId,
        paddleTransactionId: args.paddleTransactionId ?? existingSubscription.paddleTransactionId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        organizationId: args.organizationId,
        paddleCustomerId: args.paddleCustomerId,
        paddleTransactionId: args.paddleTransactionId,
        plan: organization.billingPlan ?? "free",
        status: organization.subscriptionStatus ?? "active",
        seats: 1,
        trialEndsAt: organization.trialEndsAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "billing.paddle_customer.attach",
      entityType: "organization",
      entityId: args.organizationId,
      summary: "Attached Paddle customer to organization",
      after: { paddleCustomerId: args.paddleCustomerId, paddleTransactionId: args.paddleTransactionId },
    });

    return args.paddleCustomerId;
  },
});

export const syncStripeSubscriptionFromWebhook = mutation({
  args: {
    webhookSecret: v.string(),
    eventId: v.optional(v.string()),
    eventType: v.string(),
    organizationId: v.optional(v.id("organizations")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    plan: billingPlan,
    status: subscriptionStatus,
    seats: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    invoice: v.optional(
      v.object({
        stripeInvoiceId: v.string(),
        status: invoiceStatus,
        amountDueCents: v.number(),
        amountPaidCents: v.number(),
        dueAt: v.optional(v.number()),
        paidAt: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    requireStripeWebhookSecret(args.webhookSecret);
    const organization = await organizationForStripeSync(ctx, {
      organizationId: args.organizationId,
      stripeCustomerId: args.stripeCustomerId,
    });
    const now = Date.now();

    const bySubscription = args.stripeSubscriptionId
      ? await ctx.db
          .query("subscriptions")
          .withIndex("by_stripe_subscription", (q) => q.eq("stripeSubscriptionId", args.stripeSubscriptionId))
          .first()
      : null;
    const existingSubscription =
      bySubscription ?? (await ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", organization._id)).first());

    const subscriptionPatch = {
      stripeCustomerId: args.stripeCustomerId ?? existingSubscription?.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId ?? existingSubscription?.stripeSubscriptionId,
      plan: args.plan,
      status: args.status,
      seats: Math.max(1, Math.round(args.seats ?? existingSubscription?.seats ?? 1)),
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      trialEndsAt: args.trialEndsAt,
      updatedAt: now,
    };

    const subscriptionId = existingSubscription
      ? (await ctx.db.patch(existingSubscription._id, subscriptionPatch), existingSubscription._id)
      : await ctx.db.insert("subscriptions", {
          organizationId: organization._id,
          ...subscriptionPatch,
          createdAt: now,
        });

    await ctx.db.patch(organization._id, {
      billingPlan: args.plan,
      subscriptionStatus: args.status,
      trialEndsAt: args.trialEndsAt,
      updatedAt: now,
    });

    if (args.invoice) {
      const existingInvoice = await ctx.db
        .query("invoices")
        .withIndex("by_stripe_invoice", (q) => q.eq("stripeInvoiceId", args.invoice!.stripeInvoiceId))
        .first();
      const invoicePatch = {
        organizationId: organization._id,
        subscriptionId,
        stripeInvoiceId: args.invoice.stripeInvoiceId,
        status: args.invoice.status,
        amountDueCents: args.invoice.amountDueCents,
        amountPaidCents: args.invoice.amountPaidCents,
        dueAt: args.invoice.dueAt,
        paidAt: args.invoice.paidAt,
        updatedAt: now,
      };
      if (existingInvoice) {
        assertOrg(existingInvoice, organization._id);
        await ctx.db.patch(existingInvoice._id, invoicePatch);
      } else {
        await ctx.db.insert("invoices", {
          ...invoicePatch,
          createdAt: now,
        });
      }
    }

    await audit(ctx, {
      organizationId: organization._id,
      action: "billing.stripe_webhook.sync",
      entityType: "organization",
      entityId: organization._id,
      summary: `Synced Stripe billing event ${args.eventType}`,
      after: {
        eventId: args.eventId,
        eventType: args.eventType,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        plan: args.plan,
        status: args.status,
      },
    });

    return { organizationId: organization._id, subscriptionId };
  },
});

export const syncPaddleSubscriptionFromWebhook = mutation({
  args: {
    webhookSecret: v.string(),
    eventId: v.optional(v.string()),
    eventType: v.string(),
    organizationId: v.optional(v.id("organizations")),
    paddleCustomerId: v.optional(v.string()),
    paddleSubscriptionId: v.optional(v.string()),
    paddleTransactionId: v.optional(v.string()),
    plan: billingPlan,
    status: subscriptionStatus,
    seats: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    invoice: v.optional(
      v.object({
        paddleTransactionId: v.string(),
        status: invoiceStatus,
        amountDueCents: v.number(),
        amountPaidCents: v.number(),
        dueAt: v.optional(v.number()),
        paidAt: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    requirePaddleWebhookSecret(args.webhookSecret);
    const organization = await organizationForPaddleSync(ctx, {
      organizationId: args.organizationId,
      paddleCustomerId: args.paddleCustomerId,
    });
    const now = Date.now();

    const bySubscription = args.paddleSubscriptionId
      ? await ctx.db
          .query("subscriptions")
          .withIndex("by_paddle_subscription", (q) => q.eq("paddleSubscriptionId", args.paddleSubscriptionId))
          .first()
      : null;
    const byTransaction =
      !bySubscription && args.paddleTransactionId
        ? await ctx.db
            .query("subscriptions")
            .withIndex("by_paddle_transaction", (q) => q.eq("paddleTransactionId", args.paddleTransactionId))
            .first()
        : null;
    const existingSubscription =
      bySubscription ?? byTransaction ?? (await ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", organization._id)).first());

    const subscriptionPatch = {
      paddleCustomerId: args.paddleCustomerId ?? existingSubscription?.paddleCustomerId,
      paddleSubscriptionId: args.paddleSubscriptionId ?? existingSubscription?.paddleSubscriptionId,
      paddleTransactionId: args.paddleTransactionId ?? existingSubscription?.paddleTransactionId,
      plan: args.plan,
      status: args.status,
      seats: Math.max(1, Math.round(args.seats ?? existingSubscription?.seats ?? 1)),
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      trialEndsAt: args.trialEndsAt,
      updatedAt: now,
    };

    const subscriptionId = existingSubscription
      ? (await ctx.db.patch(existingSubscription._id, subscriptionPatch), existingSubscription._id)
      : await ctx.db.insert("subscriptions", {
          organizationId: organization._id,
          ...subscriptionPatch,
          createdAt: now,
        });

    await ctx.db.patch(organization._id, {
      billingPlan: args.plan,
      subscriptionStatus: args.status,
      trialEndsAt: args.trialEndsAt,
      updatedAt: now,
    });

    if (args.invoice) {
      const existingInvoice = await ctx.db
        .query("invoices")
        .withIndex("by_paddle_transaction", (q) => q.eq("paddleTransactionId", args.invoice!.paddleTransactionId))
        .first();
      const invoicePatch = {
        organizationId: organization._id,
        subscriptionId,
        paddleTransactionId: args.invoice.paddleTransactionId,
        status: args.invoice.status,
        amountDueCents: args.invoice.amountDueCents,
        amountPaidCents: args.invoice.amountPaidCents,
        dueAt: args.invoice.dueAt,
        paidAt: args.invoice.paidAt,
        updatedAt: now,
      };
      if (existingInvoice) {
        assertOrg(existingInvoice, organization._id);
        await ctx.db.patch(existingInvoice._id, invoicePatch);
      } else {
        await ctx.db.insert("invoices", {
          ...invoicePatch,
          createdAt: now,
        });
      }
    }

    await audit(ctx, {
      organizationId: organization._id,
      action: "billing.paddle_webhook.sync",
      entityType: "organization",
      entityId: organization._id,
      summary: `Synced Paddle billing event ${args.eventType}`,
      after: {
        eventId: args.eventId,
        eventType: args.eventType,
        paddleCustomerId: args.paddleCustomerId,
        paddleSubscriptionId: args.paddleSubscriptionId,
        paddleTransactionId: args.paddleTransactionId,
        plan: args.plan,
        status: args.status,
      },
    });

    return { organizationId: organization._id, subscriptionId };
  },
});
