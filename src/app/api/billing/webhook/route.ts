import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { cents, requireConvexClient, requireStripe, requireStripeWebhookSecret } from "@/lib/billing-server";

type StripeLikeObject = Record<string, unknown>;
type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired" | "paused";
type InvoiceStatus = "draft" | "open" | "paid" | "void" | "uncollectible";

function asObject(value: unknown): StripeLikeObject {
  return value && typeof value === "object" ? (value as StripeLikeObject) : {};
}

function stringField(object: StripeLikeObject, key: string) {
  const value = object[key];
  return typeof value === "string" ? value : undefined;
}

function numberField(object: StripeLikeObject, key: string) {
  const value = object[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function metadata(object: StripeLikeObject) {
  return asObject(object.metadata);
}

function expandableId(object: StripeLikeObject, key: string) {
  const value = object[key];
  if (typeof value === "string") return value;
  return stringField(asObject(value), "id");
}

function normalizeSubscriptionStatus(value: string | undefined): SubscriptionStatus {
  if (value === "trialing" || value === "active" || value === "past_due" || value === "canceled" || value === "unpaid" || value === "incomplete" || value === "incomplete_expired" || value === "paused") {
    return value;
  }
  return "past_due";
}

function normalizeInvoiceStatus(value: string | undefined): InvoiceStatus {
  if (value === "draft" || value === "open" || value === "paid" || value === "void" || value === "uncollectible") return value;
  return "open";
}

function unixSecondsToMillis(value?: number) {
  return typeof value === "number" ? value * 1000 : undefined;
}

function invoicePayload(invoiceObject: StripeLikeObject | undefined) {
  if (!invoiceObject) return undefined;
  const id = stringField(invoiceObject, "id");
  if (!id) return undefined;
  const statusTransitions = asObject(invoiceObject.status_transitions);
  return {
    stripeInvoiceId: id,
    status: normalizeInvoiceStatus(stringField(invoiceObject, "status")),
    amountDueCents: cents(numberField(invoiceObject, "amount_due")),
    amountPaidCents: cents(numberField(invoiceObject, "amount_paid")),
    dueAt: unixSecondsToMillis(numberField(invoiceObject, "due_date")),
    paidAt: unixSecondsToMillis(numberField(statusTransitions, "paid_at")),
  };
}

async function retrieveSubscription(stripe: Stripe, subscriptionId: string | undefined) {
  if (!subscriptionId) return undefined;
  return asObject(await stripe.subscriptions.retrieve(subscriptionId));
}

async function syncSubscription(input: {
  event: Stripe.Event;
  subscription: StripeLikeObject;
  invoice?: StripeLikeObject;
  checkoutOrganizationId?: string;
}) {
  const webhookSecret = requireStripeWebhookSecret();
  const convex = requireConvexClient();
  const subscriptionMetadata = metadata(input.subscription);
  const organizationId = input.checkoutOrganizationId ?? stringField(subscriptionMetadata, "organizationId");
  const stripeCustomerId = expandableId(input.subscription, "customer");
  const stripeSubscriptionId = stringField(input.subscription, "id");

  await convex.mutation(api.billing.syncStripeSubscriptionFromWebhook, {
    webhookSecret,
    eventId: input.event.id,
    eventType: input.event.type,
    organizationId: organizationId ? (organizationId as Id<"organizations">) : undefined,
    stripeCustomerId,
    stripeSubscriptionId,
    plan: "pro",
    status: normalizeSubscriptionStatus(stringField(input.subscription, "status")),
    seats: 1,
    currentPeriodStart: unixSecondsToMillis(numberField(input.subscription, "current_period_start")),
    currentPeriodEnd: unixSecondsToMillis(numberField(input.subscription, "current_period_end")),
    trialEndsAt: unixSecondsToMillis(numberField(input.subscription, "trial_end")),
    invoice: invoicePayload(input.invoice),
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = requireStripe();
    const webhookSecret = requireStripeWebhookSecret();
    const signature = request.headers.get("stripe-signature");
    if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

    const body = await request.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    const eventObject = asObject(event.data.object);

    if (event.type === "checkout.session.completed") {
      const subscription = await retrieveSubscription(stripe, expandableId(eventObject, "subscription"));
      if (subscription) {
        await syncSubscription({
          event,
          subscription,
          checkoutOrganizationId: stringField(metadata(eventObject), "organizationId") ?? stringField(eventObject, "client_reference_id"),
        });
      }
      return NextResponse.json({ received: true });
    }

    if (event.type.startsWith("customer.subscription.")) {
      await syncSubscription({ event, subscription: eventObject });
      return NextResponse.json({ received: true });
    }

    if (event.type.startsWith("invoice.")) {
      const subscription = await retrieveSubscription(stripe, expandableId(eventObject, "subscription"));
      if (subscription) await syncSubscription({ event, subscription, invoice: eventObject });
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process Stripe webhook.";
    const status = message.includes("configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
