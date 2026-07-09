import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../server/db/client";
import { identityFromHeaders } from "../../../../server/auth";
import { registry } from "../../../../server/registry";
import { ApiError } from "../../../../server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ fn: string }> }) {
  const { fn } = await context.params;
  const handler = registry[fn];
  if (!handler) {
    return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: `Unknown function: ${fn}` } }, { status: 404 });
  }

  let args: unknown = {};
  try {
    const body = (await request.json()) as { args?: unknown };
    args = body?.args ?? {};
  } catch {
    // Empty or non-JSON body → empty args.
  }

  try {
    const ctx = { db: await getDb(), identity: identityFromHeaders(request.headers) };
    const result = await handler(ctx, args);
    return NextResponse.json({ ok: true, result: result ?? null });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status: error.status });
    }
    console.error(`[rpc:${fn}]`, error);
    return NextResponse.json({ ok: false, error: { code: "INTERNAL", message: "Internal server error." } }, { status: 500 });
  }
}
