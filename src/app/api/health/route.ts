import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Uptime-monitor target: checks the frontend and (when configured) Convex reachability. */
export async function GET() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  let convex: "ok" | "unreachable" | "unconfigured" = "unconfigured";
  if (convexUrl) {
    try {
      // Convex deployments expose /version on the site URL; any 2xx means reachable.
      const response = await fetch(`${convexUrl.replace(".convex.cloud", ".convex.site")}/version`, {
        signal: AbortSignal.timeout(5000),
      });
      convex = response.ok ? "ok" : "unreachable";
    } catch {
      convex = "unreachable";
    }
  }
  const healthy = convex !== "unreachable";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", convex, timestamp: Date.now() },
    { status: healthy ? 200 : 503 },
  );
}
