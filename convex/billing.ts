"use node";

import Stripe from "stripe";
import { ConvexError, v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const PRICE_ENV: Record<"starter" | "pro", string> = {
  starter: "STRIPE_PRICE_STARTER",
  pro: "STRIPE_PRICE_PRO",
};

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new ConvexError({ code: "BILLING_NOT_CONFIGURED", message: "Stripe is not configured yet." });
  }
  return new Stripe(key);
}

function baseUrl() {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

/** Starts a Stripe Checkout session for a paid plan. Returns the redirect URL. */
export const createCheckoutSession = action({
  args: {
    organizationId: v.id("organizations"),
    plan: v.union(v.literal("starter"), v.literal("pro")),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.billingStore.getBillingContext, {
      organizationId: args.organizationId,
    });
    const stripe = stripeClient();
    const priceId = process.env[PRICE_ENV[args.plan]];
    if (!priceId) {
      throw new ConvexError({ code: "BILLING_NOT_CONFIGURED", message: `Missing ${PRICE_ENV[args.plan]} env var.` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: context.stripeCustomerId ?? undefined,
      customer_email: context.stripeCustomerId ? undefined : context.requesterEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: context.hasHadTrial ? undefined : 14,
        metadata: { organizationId: args.organizationId, plan: args.plan },
      },
      metadata: { organizationId: args.organizationId, plan: args.plan },
      allow_promotion_codes: true,
      success_url: `${baseUrl()}/app?billing=success`,
      cancel_url: `${baseUrl()}/app?billing=canceled`,
    });
    return { url: session.url };
  },
});

/** Opens the Stripe customer portal for self-serve card/plan management. */
export const createBillingPortalSession = action({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.billingStore.getBillingContext, {
      organizationId: args.organizationId,
    });
    if (!context.stripeCustomerId) {
      throw new ConvexError({ code: "NO_STRIPE_CUSTOMER", message: "No billing profile yet — start a plan first." });
    }
    const stripe = stripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: context.stripeCustomerId,
      return_url: `${baseUrl()}/app`,
    });
    return { url: session.url };
  },
});

function mapStripeStatus(status: Stripe.Subscription.Status): "trialing" | "active" | "past_due" | "canceled" {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due") return "past_due";
  return "canceled";
}

/** Verifies and applies a Stripe webhook (called from convex/http.ts). */
export const fulfillStripeWebhook = internalAction({
  args: { payload: v.string(), signature: v.string() },
  handler: async (ctx, args) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[stripe] STRIPE_WEBHOOK_SECRET unset; rejecting webhook");
      return { ok: false };
    }
    const stripe = stripeClient();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(args.payload, args.signature, secret);
    } catch (error) {
      console.error("[stripe] signature verification failed", error);
      return { ok: false };
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const organizationId = session.metadata?.organizationId as Id<"organizations"> | undefined;
        const plan = session.metadata?.plan as "starter" | "pro" | undefined;
        if (!organizationId || !session.subscription) break;
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await ctx.runMutation(internal.billingStore.upsertFromStripe, {
          organizationId,
          plan,
          status: mapStripeStatus(subscription.status),
          stripeCustomerId: (session.customer as string) ?? undefined,
          stripeSubscriptionId: subscription.id,
          currentPeriodStart: subscription.items.data[0]?.current_period_start ? subscription.items.data[0].current_period_start * 1000 : undefined,
          currentPeriodEnd: subscription.items.data[0]?.current_period_end ? subscription.items.data[0].current_period_end * 1000 : undefined,
          trialEndsAt: subscription.trial_end ? subscription.trial_end * 1000 : undefined,
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const organizationId = subscription.metadata?.organizationId as Id<"organizations"> | undefined;
        if (!organizationId) break;
        await ctx.runMutation(internal.billingStore.upsertFromStripe, {
          organizationId,
          plan: subscription.metadata?.plan as "starter" | "pro" | undefined,
          status: event.type === "customer.subscription.deleted" ? "canceled" : mapStripeStatus(subscription.status),
          stripeCustomerId: (subscription.customer as string) ?? undefined,
          stripeSubscriptionId: subscription.id,
          currentPeriodStart: subscription.items.data[0]?.current_period_start ? subscription.items.data[0].current_period_start * 1000 : undefined,
          currentPeriodEnd: subscription.items.data[0]?.current_period_end ? subscription.items.data[0].current_period_end * 1000 : undefined,
          trialEndsAt: subscription.trial_end ? subscription.trial_end * 1000 : undefined,
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string | null;
        if (customerId) {
          await ctx.runMutation(internal.billingStore.recordPaymentFailure, { stripeCustomerId: customerId });
        }
        break;
      }
      default:
        break;
    }
    return { ok: true };
  },
});
