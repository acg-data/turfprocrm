import { ConvexHttpClient } from "convex/browser";
import Stripe from "stripe";

export function appBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

export function requireConvexClient(token?: string | null) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("Convex is not configured.");
  const client = new ConvexHttpClient(convexUrl);
  if (token) client.setAuth(token);
  return client;
}

export function bearerTokenFromRequest(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export function requireStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured.");
  return new Stripe(secretKey);
}

export function requireStripeProPriceId() {
  const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  if (!priceId) throw new Error("Stripe Pro monthly price is not configured.");
  return priceId;
}

export function requireStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Stripe webhook secret is not configured.");
  return secret;
}

export function paddleApiBaseUrl() {
  return (process.env.PADDLE_ENVIRONMENT ?? "sandbox") === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
}

export function requirePaddleApiKey() {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("Paddle is not configured.");
  return key;
}

export function requirePaddleProPriceId() {
  const priceId = process.env.PADDLE_PRO_MONTHLY_PRICE_ID;
  if (!priceId) throw new Error("Paddle Pro monthly price is not configured.");
  return priceId;
}

export function requirePaddleWebhookSecret() {
  const secret = process.env.PADDLE_WEBHOOK_SECRET_KEY ?? process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Paddle webhook secret is not configured.");
  return secret;
}

export async function paddleRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${paddleApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requirePaddleApiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: { detail?: string; message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.detail ?? payload.error?.message ?? `Paddle request failed with ${response.status}.`);
  }
  return payload;
}

export function cents(value: number | null | undefined) {
  return Math.max(0, Math.round(value ?? 0));
}
