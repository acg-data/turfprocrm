import { NextResponse, type NextRequest } from "next/server";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { bearerTokenFromRequest, paddleRequest, requireConvexClient, requirePaddleProPriceId } from "@/lib/billing-server";

type PaddleTransactionResponse = {
  data?: {
    id?: string;
    customer_id?: string | null;
    checkout?: {
      url?: string | null;
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
    const priceId = requirePaddleProPriceId();

    const transaction = await paddleRequest<PaddleTransactionResponse>("/transactions", {
      method: "POST",
      body: JSON.stringify({
        collection_mode: "automatic",
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: {
          organizationId,
          convexUserId: context.user.id,
          plan: "pro",
        },
      }),
    });

    const transactionId = transaction.data?.id;
    const customerId = transaction.data?.customer_id ?? undefined;
    if (customerId) {
      await convex.mutation(api.billing.attachPaddleCustomer, {
        organizationId,
        paddleCustomerId: customerId,
        paddleTransactionId: transactionId,
      });
    }

    const url = transaction.data?.checkout?.url;
    if (!url) return NextResponse.json({ error: "Paddle did not return a checkout URL." }, { status: 502 });
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create Paddle checkout.";
    const status = message.includes("configured") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
