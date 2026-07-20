import { NextResponse, type NextRequest } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { appBaseUrl, bearerTokenFromRequest, requireConvexClient, requireStripe, requireStripeProPriceId } from "@/lib/billing-server";

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

    const stripe = requireStripe();
    const priceId = requireStripeProPriceId();
    const convex = requireConvexClient(token);
    const context = await convex.query(api.billing.getBillingContext, { organizationId });

    let stripeCustomerId = context.subscription?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: context.user.email,
        name: context.organization.name,
        metadata: {
          organizationId,
          convexUserId: context.user.id,
        },
      });
      stripeCustomerId = customer.id;
      await convex.mutation(api.billing.attachStripeCustomer, { organizationId, stripeCustomerId });
    }

    const baseUrl = appBaseUrl(request);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/signin?billing=success&organizationId=${encodeURIComponent(organizationId)}`,
      cancel_url: `${baseUrl}/signin?billing=cancelled&organizationId=${encodeURIComponent(organizationId)}`,
      client_reference_id: organizationId,
      metadata: {
        organizationId,
        plan: "pro",
      },
      subscription_data: {
        metadata: {
          organizationId,
          plan: "pro",
        },
      },
    });

    if (!session.url) return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create checkout session.";
    const status = message.includes("configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
