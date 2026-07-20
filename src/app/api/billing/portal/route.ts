import { NextResponse, type NextRequest } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { appBaseUrl, bearerTokenFromRequest, requireConvexClient, requireStripe } from "@/lib/billing-server";

function organizationIdFromBody(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const value = (body as { organizationId?: unknown }).organizationId;
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest) {
  try {
    const token = bearerTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const organizationId = organizationIdFromBody(body) as Id<"organizations">;
    if (!organizationId) return NextResponse.json({ error: "organizationId is required." }, { status: 400 });

    const convex = requireConvexClient(token);
    const context = await convex.query(api.billing.getBillingContext, { organizationId });
    const stripeCustomerId = context.subscription?.stripeCustomerId;
    if (!stripeCustomerId) {
      return NextResponse.json({ error: "This workspace does not have a Stripe customer yet." }, { status: 409 });
    }

    const stripe = requireStripe();
    const baseUrl = appBaseUrl(request);
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/signin?organizationId=${encodeURIComponent(organizationId)}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create billing portal session.";
    const status = message.includes("configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
