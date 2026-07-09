import { NextRequest, NextResponse } from "next/server";
import { identityFromHeaders } from "../../../../server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = identityFromHeaders(request.headers);
  return NextResponse.json({
    authenticated: Boolean(identity),
    name: identity?.name ?? null,
    subject: identity?.subject ?? null,
  });
}
