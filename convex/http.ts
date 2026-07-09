import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) return new Response("Clerk webhook is not configured.", { status: 503 });

    const payload = await request.text();
    const svixHeaders = {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    };

    let event: { type: string; data: Record<string, unknown> };
    try {
      event = new Webhook(secret).verify(payload, svixHeaders) as { type: string; data: Record<string, unknown> };
    } catch {
      return new Response("Invalid signature.", { status: 400 });
    }

    await ctx.runMutation(internal.clerkSync.handleClerkEvent, { type: event.type, data: event.data });
    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return new Response("Missing signature.", { status: 400 });
    const payload = await request.text();
    const result = await ctx.runAction(internal.billing.fulfillStripeWebhook, { payload, signature });
    return new Response(null, { status: result.ok ? 200 : 400 });
  }),
});

export default http;
