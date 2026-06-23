import { ConvexHttpClient } from "convex/browser";
import { NextResponse, type NextRequest } from "next/server";
import { api } from "../../../../convex/_generated/api";

const serviceCategories = ["lawn_care", "landscaping", "pest_control", "tree_shrub", "irrigation", "snow", "maintenance"] as const;
type ServiceCategory = (typeof serviceCategories)[number];

function textField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : undefined;
}

function centsField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string" && value.trim()) return Math.max(0, Math.round(Number(value) * 100));
  return undefined;
}

function serviceField(body: Record<string, unknown>): ServiceCategory | null {
  const value = textField(body, "serviceLine");
  if (value && (serviceCategories as readonly string[]).includes(value)) return value as ServiceCategory;
  return null;
}

export async function POST(request: NextRequest) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ ok: false, error: "Lead intake is not configured." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON." }, { status: 400 });
  }

  const organizationSlug = textField(body, "organizationSlug");
  const customerName = textField(body, "customerName");
  const city = textField(body, "city");
  const state = textField(body, "state") ?? "MA";
  const serviceLine = serviceField(body);

  if (!organizationSlug || !customerName || !city || !serviceLine) {
    return NextResponse.json({ ok: false, error: "organizationSlug, customerName, city, and serviceLine are required." }, { status: 400 });
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const result = await client.mutation(api.leadIntake.submitWebLead, {
      organizationSlug,
      customerName,
      email: textField(body, "email"),
      phone: textField(body, "phone"),
      street: textField(body, "street"),
      city,
      state,
      postalCode: textField(body, "postalCode"),
      serviceLine,
      campaign: textField(body, "campaign"),
      sourceDetail: textField(body, "sourceDetail"),
      message: textField(body, "message"),
      estimatedValueCents: centsField(body, "estimatedValue"),
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit lead intake.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
