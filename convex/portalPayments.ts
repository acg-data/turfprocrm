"use node";

import Stripe from "stripe";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ConvexError({ code: "PAYMENTS_NOT_CONFIGURED", message: "Online payments are not configured yet." });
  return new Stripe(key);
}

function baseUrl() {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

export const createInvoiceCheckoutSession = action({
  args: { invoiceId: v.id("customerInvoices") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in to pay this invoice." });
    const context = await ctx.runQuery(internal.portal.getInvoicePaymentContext, {
      clerkUserId: identity.subject,
      invoiceId: args.invoiceId,
    });
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: context.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: context.balanceCents,
            product_data: {
              name: `${context.organizationName} invoice ${context.invoiceNumber}`,
              description: `Service invoice for ${context.customerName}`,
            },
          },
        },
      ],
      metadata: {
        purpose: "customer_invoice",
        organizationId: context.organizationId,
        customerId: context.customerId,
        invoiceId: args.invoiceId,
      },
      payment_intent_data: {
        metadata: {
          purpose: "customer_invoice",
          organizationId: context.organizationId,
          customerId: context.customerId,
          invoiceId: args.invoiceId,
        },
      },
      success_url: `${baseUrl()}/portal?section=invoices&payment=success`,
      cancel_url: `${baseUrl()}/portal?section=invoices&payment=canceled`,
    });
    return { url: session.url };
  },
});
