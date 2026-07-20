import { NextResponse, type NextRequest } from "next/server";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { cents, requireConvexClient, requirePaddleWebhookSecret } from "@/lib/billing-server";

type JsonObject = Record<string, unknown>;
type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired" | "paused";
type InvoiceStatus = "draft" | "open" | "paid" | "void" | "uncollectible";

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
}

function stringField(object: JsonObject, key: string) {
  const value = object[key];
  return typeof value === "string" ? value : undefined;
}

function numberLikeField(object: JsonObject, key: string) {
  const value = object[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function unixOrDateToMillis(value: string | undefined) {
  if (!value) return undefined;
  const date = Date.parse(value);
  return Number.isFinite(date) ? date : undefined;
}

function normalizeSubscriptionStatus(value: string | undefined, eventType: string): SubscriptionStatus {
  if (value === "trialing" || value === "active" || value === "past_due" || value === "canceled" || value === "unpaid" || value === "incomplete" || value === "incomplete_expired" || value === "paused") {
    return value;
  }
  if (eventType.includes("canceled")) return "canceled";
  if (eventType.includes("past_due")) return "past_due";
  if (eventType.includes("paused")) return "paused";
  return "active";
}

function normalizeInvoiceStatus(value: string | undefined, eventType: string): InvoiceStatus {
  if (value === "draft" || value === "open" || value === "paid" || value === "void" || value === "uncollectible") return value;
  if (eventType.includes("completed") || eventType.includes("paid")) return "paid";
  if (eventType.includes("billed") || eventType.includes("ready")) return "open";
  if (eventType.includes("canceled")) return "void";
  return "open";
}

function parsePaddleSignature(header: string) {
  const parts = Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((part): part is [string, string] => part.length === 2 && Boolean(part[0]) && Boolean(part[1])),
  );
  return { timestamp: parts.ts, signature: parts.h1 };
}

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string) {
  const { timestamp, signature } = parsePaddleSignature(signatureHeader);
  if (!timestamp || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}:${rawBody}`));
  return constantTimeEqual(bytesToHex(digest), signature);
}

function paddleInvoicePayload(data: JsonObject, eventType: string) {
  const transactionId = stringField(data, "id")?.startsWith("txn_") ? stringField(data, "id") : stringField(data, "transaction_id");
  if (!transactionId) return undefined;
  const details = asObject(data.details);
  const totals = asObject(details.totals);
  const status = normalizeInvoiceStatus(stringField(data, "status"), eventType);
  const totalCents = cents(numberLikeField(totals, "total") ?? numberLikeField(totals, "grand_total"));
  const paidCents = status === "paid" ? totalCents : cents(numberLikeField(totals, "paid"));
  return {
    paddleTransactionId: transactionId,
    status,
    amountDueCents: Math.max(0, totalCents - paidCents),
    amountPaidCents: paidCents,
    dueAt: unixOrDateToMillis(stringField(data, "billed_at")),
    paidAt: status === "paid" ? unixOrDateToMillis(stringField(data, "updated_at") ?? stringField(data, "created_at")) : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("paddle-signature");
    if (!signature) return NextResponse.json({ error: "Missing Paddle signature." }, { status: 400 });

    const secret = requirePaddleWebhookSecret();
    const rawBody = await request.text();
    const verified = await verifyPaddleSignature(rawBody, signature, secret);
    if (!verified) return NextResponse.json({ error: "Invalid Paddle signature." }, { status: 401 });

    const event = JSON.parse(rawBody) as JsonObject;
    const data = asObject(event.data);
    const customData = asObject(data.custom_data);
    const eventType = stringField(event, "event_type") ?? stringField(event, "type") ?? "paddle.event";
    const eventId = stringField(event, "event_id") ?? stringField(event, "id");
    const billingPeriod = asObject(data.current_billing_period);
    const item = asObject(Array.isArray(data.items) ? data.items[0] : undefined);

    const organizationId = (stringField(customData, "organizationId") ?? stringField(customData, "organization_id")) as Id<"organizations"> | undefined;
    const paddleCustomerId = stringField(data, "customer_id");
    const dataId = stringField(data, "id");
    const paddleSubscriptionId = dataId?.startsWith("sub_") ? dataId : stringField(data, "subscription_id");
    const paddleTransactionId = dataId?.startsWith("txn_") ? dataId : stringField(data, "transaction_id");

    await requireConvexClient().mutation(api.billing.syncPaddleSubscriptionFromWebhook, {
      webhookSecret: secret,
      eventId,
      eventType,
      organizationId,
      paddleCustomerId,
      paddleSubscriptionId,
      paddleTransactionId,
      plan: "pro",
      status: normalizeSubscriptionStatus(stringField(data, "status"), eventType),
      seats: cents(numberLikeField(item, "quantity") ?? 1),
      currentPeriodStart: unixOrDateToMillis(stringField(billingPeriod, "starts_at")),
      currentPeriodEnd: unixOrDateToMillis(stringField(billingPeriod, "ends_at")),
      trialEndsAt: unixOrDateToMillis(stringField(data, "trial_ends_at")),
      invoice: eventType.startsWith("transaction.") ? paddleInvoicePayload(data, eventType) : undefined,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process Paddle webhook.";
    const status = message.includes("configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
