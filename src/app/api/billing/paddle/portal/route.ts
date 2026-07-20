import { NextResponse, type NextRequest } from "next/server";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { bearerTokenFromRequest, paddleRequest, requireConvexClient } from "@/lib/billing-server";

type PaddlePortalResponse = {
  data?: {
    urls?: {
      general?: {
        overview?: string | null;
      } | null;
      subscriptions?: Array<{
        id?: string;
        overview?: string | null;
        update_payment_method?: string | null;
        cancel?: string | null;
      }>;
    } | null;
  };
};

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
    const paddleCustomerId = context.subscription?.paddleCustomerId;
    if (!paddleCustomerId) {
      return NextResponse.json({ error: "This workspace does not have a Paddle customer yet." }, { status: 409 });
    }

    const bodyPayload = context.subscription?.paddleSubscriptionId
      ? { subscription_ids: [context.subscription.paddleSubscriptionId] }
      : {};
    const session = await paddleRequest<PaddlePortalResponse>(`/customers/${encodeURIComponent(paddleCustomerId)}/portal-sessions`, {
      method: "POST",
      body: JSON.stringify(bodyPayload),
    });

    const url = session.data?.urls?.general?.overview ?? session.data?.urls?.subscriptions?.[0]?.overview ?? session.data?.urls?.subscriptions?.[0]?.update_payment_method;
    if (!url) return NextResponse.json({ error: "Paddle did not return a portal URL." }, { status: 502 });
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create Paddle portal session.";
    const status = message.includes("configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
