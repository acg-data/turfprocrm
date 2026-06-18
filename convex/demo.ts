import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const DEMO_SLUG = "greenline-demo";

const serviceCategory = v.union(
  v.literal("lawn_care"),
  v.literal("landscaping"),
  v.literal("pest_control"),
  v.literal("tree_shrub"),
  v.literal("irrigation"),
  v.literal("snow"),
  v.literal("maintenance"),
);

const opportunityStage = v.union(
  v.literal("new"),
  v.literal("qualified"),
  v.literal("estimating"),
  v.literal("proposal_sent"),
  v.literal("won"),
  v.literal("lost"),
);
const leadType = v.union(v.literal("phone_call"), v.literal("form"), v.literal("direct_email"), v.literal("referral"), v.literal("other"));
const accountType = v.union(v.literal("residential"), v.literal("commercial"));
const urgency = v.union(v.literal("low"), v.literal("normal"), v.literal("high"));

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = partsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function dayStart() {
  const timeZone = "America/New_York";
  const today = partsInTimeZone(new Date(), timeZone);
  const utcMidnightGuess = Date.UTC(today.year, today.month - 1, today.day, 0, 0, 0);
  return utcMidnightGuess - timeZoneOffsetMs(new Date(utcMidnightGuess), timeZone);
}

function at(hour: number, minute = 0, offset = 0) {
  return dayStart() + offset * 24 * 60 * 60 * 1000 + hour * 60 * 60 * 1000 + minute * 60 * 1000;
}

async function getDemoOrg(ctx: QueryCtx | MutationCtx) {
  return await ctx.db.query("organizations").withIndex("by_slug", (q) => q.eq("slug", DEMO_SLUG)).unique();
}

async function requireDemoOrg(ctx: MutationCtx) {
  const org = await ctx.db.query("organizations").withIndex("by_slug", (q) => q.eq("slug", DEMO_SLUG)).unique();
  if (!org) {
    throw new Error("Demo workspace has not been bootstrapped yet.");
  }
  return org;
}

async function refreshDemoDates(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const [leads, opportunities, estimates, jobs, visits, tasks, activities] = await Promise.all([
    ctx.db.query("leads").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("opportunities").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("estimates").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("jobs").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("jobVisits").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("tasks").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("activities").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
  ]);

  for (const lead of leads) {
    if (lead.title.includes("Mosquito")) await ctx.db.patch(lead._id, { createdAt: at(9, 15, -1), receivedAt: at(9, 15, -1), updatedAt: at(14, 15) });
    if (lead.title.includes("Spring grub")) await ctx.db.patch(lead._id, { createdAt: at(13, 30, -4), receivedAt: at(13, 30, -4), convertedAt: at(10, 20, -1), updatedAt: at(10, 20, -1) });
  }
  for (const opportunity of opportunities) {
    if (opportunity.title.includes("Seasonal mosquito")) await ctx.db.patch(opportunity._id, { expectedCloseDate: at(17, 0, 3), updatedAt: at(14, 15) });
    if (opportunity.title.includes("Grub prevention")) await ctx.db.patch(opportunity._id, { expectedCloseDate: at(11, 0, -2), updatedAt: at(10, 20, -1) });
    if (opportunity.title.includes("Weekly grounds")) await ctx.db.patch(opportunity._id, { expectedCloseDate: at(16, 0, 9), updatedAt: at(12, 5) });
  }
  for (const estimate of estimates) {
    if (estimate.estimateNumber === "EST-1024") await ctx.db.patch(estimate._id, { sentAt: at(14, 15), createdAt: at(14, 0), updatedAt: at(14, 15) });
    if (estimate.estimateNumber === "EST-1019") await ctx.db.patch(estimate._id, { acceptedAt: at(10, 20, -1), createdAt: at(9, 0, -1), updatedAt: at(10, 20, -1) });
  }
  for (const job of jobs) {
    if (job.title.includes("Brookside")) await ctx.db.patch(job._id, { startDate: at(8, 30), updatedAt: Date.now() });
    if (job.title.includes("Northgate")) await ctx.db.patch(job._id, { startDate: at(7, 30), updatedAt: Date.now() });
  }
  for (const visit of visits) {
    if (visit.routeOrder === 1) await ctx.db.patch(visit._id, { scheduledStart: at(8, 30), scheduledEnd: at(10, 30), updatedAt: Date.now() });
    if (visit.routeOrder === 2) await ctx.db.patch(visit._id, { scheduledStart: at(11, 0), scheduledEnd: at(14, 0), updatedAt: Date.now() });
  }
  for (const task of tasks) {
    if (task.title.includes("Follow up")) await ctx.db.patch(task._id, { dueAt: at(16, 0), updatedAt: Date.now() });
    if (task.title.includes("irrigation")) await ctx.db.patch(task._id, { dueAt: at(12, 0, 1), updatedAt: Date.now() });
  }
  for (const activity of activities) {
    if (activity.summary.includes("EST-1024")) await ctx.db.patch(activity._id, { occurredAt: at(14, 15) });
    if (activity.summary.includes("Crew Charlie")) await ctx.db.patch(activity._id, { occurredAt: at(11, 8) });
    if (activity.summary.includes("Brookside opportunity")) await ctx.db.patch(activity._id, { occurredAt: at(10, 20, -1) });
  }
}

function spamSignals(input: { email?: string; message?: string; customerName?: string; phone?: string }) {
  const email = input.email?.toLowerCase() ?? "";
  const message = input.message?.toLowerCase() ?? "";
  const reasons: string[] = [];

  if (!input.customerName && !input.phone && !input.email) reasons.push("missing_name_and_contact");
  if (/^(sales|info|marketing|noreply|no-reply|partner|recruit|newsletter)@/.test(email)) reasons.push("bulk_sender_email_prefix");
  if (/(lead generation|business opportunity|schedule a 15|unsubscribe|we generate leads)/.test(message)) reasons.push("solicitation_phrase");

  return { score: Math.min(100, reasons.length * 35), reasons };
}

function leadQualityIssues(input: { email?: string; phone?: string; street?: string; city?: string; postalCode?: string; lawnSizeSqFt?: number; serviceTerritory?: string[] }) {
  const issues: Array<{ kind: "bad_phone" | "invalid_email" | "missing_address" | "out_of_territory" | "price_missing"; severity: "info" | "warning" | "critical"; summary: string; fieldName?: string; currentValue?: string }> = [];
  const digits = input.phone?.replace(/\D/g, "") ?? "";
  if (input.phone && digits.length < 10) issues.push({ kind: "bad_phone", severity: "warning", fieldName: "phone", currentValue: input.phone, summary: "Phone number looks too short for reliable follow-up." });
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) issues.push({ kind: "invalid_email", severity: "warning", fieldName: "email", currentValue: input.email, summary: "Email address does not look valid." });
  if (!input.street?.trim() || !input.city?.trim() || !input.postalCode?.trim()) issues.push({ kind: "missing_address", severity: "warning", fieldName: "property", summary: "Full property address is incomplete." });
  if (input.serviceTerritory?.length && input.city && !input.serviceTerritory.map((city) => city.toLowerCase()).includes(input.city.toLowerCase())) {
    issues.push({ kind: "out_of_territory", severity: "critical", fieldName: "city", currentValue: input.city, summary: "Lead city is outside the configured service territory." });
  }
  if (!input.lawnSizeSqFt) issues.push({ kind: "price_missing", severity: "info", fieldName: "lawnSizeSqFt", summary: "Lawn size is missing, so size-based pricing will need manual review." });
  return issues;
}

export const bootstrapWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await getDemoOrg(ctx);
    if (existing) {
      await refreshDemoDates(ctx, existing._id);
      return { organizationId: existing._id, created: false, refreshed: true };
    }

    const now = Date.now();
    const organizationId = await ctx.db.insert("organizations", {
      name: "Greenline Turf & Pest",
      slug: DEMO_SLUG,
      industryFocus: "both",
      timezone: "America/New_York",
      defaultCurrency: "USD",
      billingPlan: "pro",
      subscriptionStatus: "trialing",
      trialEndsAt: now + 14 * 24 * 60 * 60 * 1000,
      serviceTerritory: ["Foxborough", "Mansfield", "Sharon", "Wrentham", "Plainville"],
      settings: {
        companyAssignments: ["GreenAce", "Turf Pro"],
        defaultCapacityEstimatesPerWeek: 32,
        mapProvider: "google_maps_links",
        reportingMirror: "auditEvents_export_boundary",
      },
      createdByClerkUserId: "demo-owner",
      createdAt: now,
      updatedAt: now,
    });

    const justinId = await ctx.db.insert("users", { clerkUserId: "demo-owner", name: "Justin Abrams", email: "justin@example.com", createdAt: now, updatedAt: now });
    const amyId = await ctx.db.insert("users", { clerkUserId: "demo-sales", name: "Amy Reed", email: "amy@example.com", createdAt: now, updatedAt: now });
    const marcoId = await ctx.db.insert("users", { clerkUserId: "demo-dispatch", name: "Marco Silva", email: "marco@example.com", createdAt: now, updatedAt: now });
    const ninaId = await ctx.db.insert("users", { clerkUserId: "demo-field", name: "Nina Hart", email: "nina@example.com", createdAt: now, updatedAt: now });

    for (const [userId, role] of [
      [justinId, "owner"],
      [amyId, "sales"],
      [marcoId, "dispatcher"],
      [ninaId, "crew_lead"],
    ] as Array<[Id<"users">, "owner" | "sales" | "dispatcher" | "crew_lead"]>) {
      await ctx.db.insert("memberships", { organizationId, userId, role, status: "active", joinedAt: now, updatedAt: now });
    }

    const brooksideId = await ctx.db.insert("customers", {
      organizationId,
      name: "Brookside HOA",
      type: "hoa",
      status: "active",
      source: "Renewal",
      ownerUserId: amyId,
      tags: ["hoa", "recurring", "fertilization"],
      lifetimeValueCents: 1840000,
      createdAt: now,
      updatedAt: now,
    });
    const walshId = await ctx.db.insert("customers", {
      organizationId,
      name: "Megan Walsh",
      type: "residential",
      status: "prospect",
      source: "Website form",
      ownerUserId: amyId,
      tags: ["mosquito", "quote"],
      lifetimeValueCents: 0,
      createdAt: now,
      updatedAt: now,
    });
    const northgateId = await ctx.db.insert("customers", {
      organizationId,
      name: "Northgate Industrial Park",
      type: "commercial",
      status: "active",
      source: "Referral",
      ownerUserId: justinId,
      tags: ["commercial", "weekly"],
      lifetimeValueCents: 6120000,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("contacts", { organizationId, customerId: brooksideId, name: "Brookside Board", email: "board@brookside.example", phone: "(508) 555-0148", isPrimary: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("contacts", { organizationId, customerId: walshId, name: "Megan Walsh", email: "megan@example.com", phone: "(508) 555-0188", isPrimary: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("contacts", { organizationId, customerId: northgateId, name: "Facilities Office", email: "facilities@northgate.example", phone: "(781) 555-0199", isPrimary: true, createdAt: now, updatedAt: now });

    const brooksidePropertyId = await ctx.db.insert("properties", {
      organizationId,
      customerId: brooksideId,
      label: "Brookside Common Areas",
      street: "18 Brookside Way",
      city: "Foxborough",
      state: "MA",
      postalCode: "02035",
      notes: "Gate code changes monthly. Notify board before treatment.",
      lawnSizeSqFt: 92000,
      createdAt: now,
      updatedAt: now,
    });
    const walshPropertyId = await ctx.db.insert("properties", {
      organizationId,
      customerId: walshId,
      label: "Walsh Residence",
      street: "42 Oak Terrace",
      city: "Mansfield",
      state: "MA",
      postalCode: "02048",
      notes: "Backyard has a wetland buffer. Avoid spraying within marked area.",
      lawnSizeSqFt: 14500,
      createdAt: now,
      updatedAt: now,
    });
    const northgatePropertyId = await ctx.db.insert("properties", {
      organizationId,
      customerId: northgateId,
      label: "Northgate Building 4",
      street: "225 Commerce Dr",
      city: "Sharon",
      state: "MA",
      postalCode: "02067",
      notes: "Service loading dock before office lawn.",
      lawnSizeSqFt: 188000,
      createdAt: now,
      updatedAt: now,
    });

    const walshLeadId = await ctx.db.insert("leads", {
      organizationId,
      customerId: walshId,
      propertyId: walshPropertyId,
      title: "Mosquito and tick package request",
      source: "Website form",
      leadType: "form",
      companyAssignment: "Turf Pro",
      accountType: "residential",
      firstName: "Megan",
      lastName: "Walsh",
      email: "megan@example.com",
      mobilePhone: "(508) 555-0188",
      normalizedPhone: "5085550188",
      programRequests: ["pest_control"],
      lawnSizeSqFt: 14500,
      grade: "a",
      status: "contacted",
      urgency: "high",
      ownerUserId: amyId,
      spamScore: 0,
      spamReasons: [],
      qualityScore: 92,
      receivedAt: at(9, 15, -1),
      createdAt: at(9, 15, -1),
      updatedAt: at(14, 15),
    });
    const brooksideLeadId = await ctx.db.insert("leads", {
      organizationId,
      customerId: brooksideId,
      propertyId: brooksidePropertyId,
      title: "Spring grub prevention renewal",
      source: "Phone",
      leadType: "phone_call",
      companyAssignment: "GreenAce",
      accountType: "commercial",
      firstName: "Brookside",
      lastName: "Board",
      mobilePhone: "(508) 555-0148",
      normalizedPhone: "5085550148",
      programRequests: ["lawn_care", "pest_control"],
      lawnSizeSqFt: 92000,
      grade: "a",
      status: "converted",
      urgency: "normal",
      ownerUserId: amyId,
      spamScore: 0,
      spamReasons: [],
      qualityScore: 96,
      receivedAt: at(13, 30, -4),
      convertedAt: at(10, 20, -1),
      createdAt: at(13, 30, -4),
      updatedAt: at(10, 20, -1),
    });

    const walshOppId = await ctx.db.insert("opportunities", {
      organizationId,
      leadId: walshLeadId,
      customerId: walshId,
      propertyId: walshPropertyId,
      title: "Seasonal mosquito and tick control",
      stage: "proposal_sent",
      valueCents: 78000,
      closeProbability: 72,
      expectedCloseDate: at(17, 0, 3),
      ownerUserId: amyId,
      serviceLines: ["pest_control"],
      createdAt: at(9, 15, -1),
      updatedAt: at(14, 15),
    });
    const brooksideOppId = await ctx.db.insert("opportunities", {
      organizationId,
      leadId: brooksideLeadId,
      customerId: brooksideId,
      propertyId: brooksidePropertyId,
      title: "Grub prevention plus six-step lawn program",
      stage: "won",
      valueCents: 920000,
      closeProbability: 100,
      expectedCloseDate: at(11, 0, -2),
      ownerUserId: justinId,
      serviceLines: ["lawn_care", "pest_control"],
      createdAt: at(13, 30, -4),
      updatedAt: at(10, 20, -1),
    });
    await ctx.db.insert("opportunities", {
      organizationId,
      customerId: northgateId,
      propertyId: northgatePropertyId,
      title: "Weekly grounds maintenance expansion",
      stage: "estimating",
      valueCents: 1540000,
      closeProbability: 44,
      expectedCloseDate: at(16, 0, 9),
      ownerUserId: justinId,
      serviceLines: ["maintenance", "landscaping"],
      createdAt: at(12, 5, -2),
      updatedAt: at(12, 5),
    });

    const walshEstimateId = await ctx.db.insert("estimates", {
      organizationId,
      opportunityId: walshOppId,
      customerId: walshId,
      propertyId: walshPropertyId,
      estimateNumber: "EST-1024",
      status: "sent",
      subtotalCents: 78000,
      taxCents: 0,
      totalCents: 78000,
      sentAt: at(14, 15),
      createdAt: at(14, 0),
      updatedAt: at(14, 15),
    });
    await ctx.db.insert("estimates", {
      organizationId,
      opportunityId: brooksideOppId,
      customerId: brooksideId,
      propertyId: brooksidePropertyId,
      estimateNumber: "EST-1019",
      status: "accepted",
      subtotalCents: 920000,
      taxCents: 0,
      totalCents: 920000,
      acceptedAt: at(10, 20, -1),
      createdAt: at(9, 0, -1),
      updatedAt: at(10, 20, -1),
    });

    const fertId = await ctx.db.insert("serviceCatalogItems", { organizationId, name: "Six-step fertilization program", category: "lawn_care", defaultUnit: "season", defaultPriceCents: 165000, durationMinutes: 120, active: true, createdAt: now, updatedAt: now });
    const mosquitoId = await ctx.db.insert("serviceCatalogItems", { organizationId, name: "Mosquito and tick barrier", category: "pest_control", defaultUnit: "visit", defaultPriceCents: 13000, durationMinutes: 35, active: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("serviceCatalogItems", { organizationId, name: "Core aeration and overseeding", category: "lawn_care", defaultUnit: "acre", defaultPriceCents: 42000, durationMinutes: 90, active: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("serviceCatalogItems", { organizationId, name: "Spring cleanup", category: "landscaping", defaultUnit: "crew hour", defaultPriceCents: 9500, durationMinutes: 60, active: true, createdAt: now, updatedAt: now });

    const priceBookId = await ctx.db.insert("priceBooks", { organizationId, name: "2026 Residential + Commercial", description: "Default production price book for lawn, landscape, and pest services.", active: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("priceBookItems", { organizationId, priceBookId, serviceCatalogItemId: fertId, name: "Six-step program by lawn size", unit: "season", basePriceCents: 165000, minPriceCents: 62000, pricingModel: "per_sq_ft", formula: "max(minPrice, lawnSizeSqFt * 0.018)", active: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("priceBookItems", { organizationId, priceBookId, serviceCatalogItemId: mosquitoId, name: "Mosquito barrier visit", unit: "visit", basePriceCents: 13000, minPriceCents: 9500, pricingModel: "per_visit", active: true, createdAt: now, updatedAt: now });

    const alphaCrewId = await ctx.db.insert("crews", { organizationId, name: "Alpha Lawn", color: "#2f6b4f", active: true, capacityMinutesPerDay: 420, createdAt: now, updatedAt: now });
    const bravoCrewId = await ctx.db.insert("crews", { organizationId, name: "Bravo Pest", color: "#7c6a2b", active: true, capacityMinutesPerDay: 390, createdAt: now, updatedAt: now });
    const charlieCrewId = await ctx.db.insert("crews", { organizationId, name: "Charlie Maintenance", color: "#42526b", active: true, capacityMinutesPerDay: 480, createdAt: now, updatedAt: now });
    await ctx.db.insert("crewMembers", { organizationId, crewId: bravoCrewId, userId: ninaId, role: "crew lead", active: true, createdAt: now, updatedAt: now });

    const brooksideJobId = await ctx.db.insert("jobs", {
      organizationId,
      customerId: brooksideId,
      propertyId: brooksidePropertyId,
      opportunityId: brooksideOppId,
      title: "Brookside six-step season",
      status: "scheduled",
      priority: "normal",
      recurrence: "seasonal",
      startDate: at(8, 30),
      managerUserId: justinId,
      createdAt: now,
      updatedAt: now,
    });
    const northgateJobId = await ctx.db.insert("jobs", {
      organizationId,
      customerId: northgateId,
      propertyId: northgatePropertyId,
      title: "Northgate weekly maintenance",
      status: "in_progress",
      priority: "high",
      recurrence: "weekly",
      startDate: at(7, 30),
      managerUserId: justinId,
      createdAt: now,
      updatedAt: now,
    });

    const lawnChecklistId = await ctx.db.insert("checklistTemplates", {
      organizationId,
      name: "Lawn treatment visit",
      category: "lawn_care",
      items: [
        { id: "flags", label: "Post treatment flags", required: true },
        { id: "apply", label: "Apply product to mapped turf zones", required: true },
        { id: "photos", label: "Capture after photos", required: false },
      ],
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("jobVisits", {
      organizationId,
      jobId: brooksideJobId,
      customerId: brooksideId,
      propertyId: brooksidePropertyId,
      scheduledStart: at(8, 30),
      scheduledEnd: at(10, 30),
      status: "scheduled",
      routeOrder: 1,
      assignedCrewId: alphaCrewId,
      checklistTemplateId: lawnChecklistId,
      checklist: [
        { id: "c1", label: "Post treatment flags", isDone: false },
        { id: "c2", label: "Apply grub prevention to common turf", isDone: false },
        { id: "c3", label: "Capture after photos", isDone: false },
      ],
      notes: "Board requested photos at north entrance and playground.",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("jobVisits", {
      organizationId,
      jobId: northgateJobId,
      customerId: northgateId,
      propertyId: northgatePropertyId,
      scheduledStart: at(11, 0),
      scheduledEnd: at(14, 0),
      status: "on_site",
      routeOrder: 2,
      assignedCrewId: charlieCrewId,
      checklist: [
        { id: "c4", label: "Mow front lawn and loading dock side", isDone: true },
        { id: "c5", label: "Edge sidewalks", isDone: false },
        { id: "c6", label: "Log irrigation leak near dock", isDone: false },
      ],
      notes: "Facilities asked for a quote on mulch refresh.",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("tasks", { organizationId, entityType: "opportunity", entityId: walshOppId, title: "Follow up on mosquito proposal", status: "open", priority: "high", dueAt: at(16, 0), assignedUserId: amyId, createdByUserId: justinId, createdAt: now, updatedAt: now });
    await ctx.db.insert("tasks", { organizationId, entityType: "job", entityId: northgateJobId, title: "Prepare irrigation repair estimate", status: "in_progress", priority: "normal", dueAt: at(12, 0, 1), assignedUserId: justinId, createdByUserId: justinId, createdAt: now, updatedAt: now });

    await ctx.db.insert("activities", { organizationId, entityType: "opportunity", entityId: walshOppId, kind: "email", summary: "Estimate EST-1024 sent to Megan Walsh", actorUserId: amyId, occurredAt: at(14, 15) });
    await ctx.db.insert("activities", { organizationId, entityType: "visit", entityId: northgateJobId, kind: "visit", summary: "Crew Charlie marked Northgate visit on site", actorUserId: ninaId, occurredAt: at(11, 8) });
    await ctx.db.insert("activities", { organizationId, entityType: "opportunity", entityId: brooksideOppId, kind: "status_change", summary: "Brookside opportunity won and converted to job", actorUserId: justinId, occurredAt: at(10, 20, -1) });

    await ctx.db.insert("materials", { organizationId, name: "Merit grub control", unit: "bag", costCents: 7300, active: true, epaRegistrationNumber: "432-1312", restrictedUse: false, createdAt: now, updatedAt: now });
    await ctx.db.insert("materials", { organizationId, name: "Mosquito barrier mix", unit: "gallon", costCents: 2800, active: true, restrictedUse: false, createdAt: now, updatedAt: now });
    await ctx.db.insert("materials", { organizationId, name: "Premium overseed blend", unit: "bag", costCents: 6400, active: true, createdAt: now, updatedAt: now });

    for (const [pattern, kind] of [
      ["sales", "email_prefix"],
      ["info", "email_prefix"],
      ["marketing", "email_prefix"],
      ["lead generation", "message_phrase"],
      ["business opportunity", "message_phrase"],
      ["schedule a 15", "message_phrase"],
    ] as const) {
      await ctx.db.insert("spamRules", { organizationId, name: `Flag ${pattern}`, kind, pattern, score: 35, active: true, createdAt: now, updatedAt: now });
    }

    await ctx.db.insert("cityNormalizationRules", { organizationId, rawCity: "Foxboro", normalizedCity: "Foxborough", state: "MA", active: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("dataQualityIssues", { organizationId, kind: "city_spelling", severity: "warning", status: "open", leadId: walshLeadId, fieldName: "city", currentValue: "Foxboro", suggestedValue: "Foxborough", summary: "Normalize common Foxboro spelling before estimating.", createdAt: now, updatedAt: now });
    await ctx.db.insert("externalIntegrations", { organizationId, provider: "google_maps", name: "Google Maps deep links", status: "enabled", config: { mode: "link_generation_only" }, createdAt: now, updatedAt: now });
    await ctx.db.insert("externalIntegrations", { organizationId, provider: "google_sheets", name: "Legacy lead sheet import", status: "planned", config: { source: "Netlify dashboard parity import" }, createdAt: now, updatedAt: now });
    await ctx.db.insert("dashboardWidgets", { organizationId, key: "pipeline_value", title: "Pipeline value", description: "Open opportunity value weighted by current sales stage.", config: { source: "opportunities" }, sortOrder: 1, active: true, createdAt: now, updatedAt: now });

    await ctx.db.insert("auditEvents", {
      organizationId,
      actorUserId: justinId,
      action: "demo.bootstrap",
      entityType: "organization",
      entityId: organizationId,
      summary: "Bootstrapped Greenline Turf & Pest demo workspace",
      after: { estimateId: walshEstimateId },
      createdAt: now,
    });

    return { organizationId, created: true };
  },
});

export const getWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const org = await getDemoOrg(ctx);
    if (!org) return null;

    const [
      memberships,
      customers,
      contacts,
      properties,
      leads,
      opportunities,
      estimates,
      serviceCatalog,
      crews,
      jobs,
      visits,
      tasks,
      activities,
      materials,
    ] = await Promise.all([
      ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("customers").withIndex("by_org_updated", (q) => q.eq("organizationId", org._id)).order("desc").collect(),
      ctx.db.query("contacts").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("properties").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("leads").withIndex("by_org_created", (q) => q.eq("organizationId", org._id)).order("desc").collect(),
      ctx.db.query("opportunities").withIndex("by_org_updated", (q) => q.eq("organizationId", org._id)).order("desc").collect(),
      ctx.db.query("estimates").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("serviceCatalogItems").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("crews").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("jobs").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("jobVisits").withIndex("by_org_date", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("tasks").withIndex("by_org_due", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("activities").withIndex("by_org_time", (q) => q.eq("organizationId", org._id)).order("desc").take(50),
      ctx.db.query("materials").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
    ]);

    const users = await Promise.all(memberships.map((membership) => ctx.db.get(membership.userId)));
    const primaryContactByCustomer = new Map(
      contacts.filter((contact) => contact.isPrimary).map((contact) => [contact.customerId, contact]),
    );

    return {
      organization: {
        id: org._id,
        name: org.name,
        timezone: org.timezone,
      },
      members: memberships.map((membership, index) => {
        const user = users[index];
        return {
          id: user?._id ?? membership.userId,
          name: user?.name ?? "Unknown member",
          email: user?.email ?? "",
          role: membership.role,
        };
      }),
      customers: customers.map((customer) => {
        const contact = primaryContactByCustomer.get(customer._id);
        return {
          id: customer._id,
          name: customer.name,
          type: customer.type,
          status: customer.status === "do_not_service" ? "inactive" : customer.status,
          phone: contact?.phone ?? contact?.mobilePhone ?? "",
          email: contact?.email ?? "",
          tags: customer.tags,
          ownerId: customer.ownerUserId ?? "",
        };
      }),
      properties: properties.map((property) => ({
        id: property._id,
        customerId: property.customerId,
        label: property.label,
        street: property.street,
        city: property.city,
        state: property.state,
        postalCode: property.postalCode,
        notes: property.notes ?? "",
        lawnSizeSqFt: property.lawnSizeSqFt,
      })),
      leads: leads.map((lead) => ({
        id: lead._id,
        title: lead.title,
        customerId: lead.customerId ?? "",
        propertyId: lead.propertyId ?? "",
        source: lead.source,
        status: lead.status === "do_estimate" || lead.status === "estimate_provided" || lead.status === "follow_up" || lead.status === "waiting" ? "contacted" : lead.status === "spam" ? "disqualified" : lead.status === "lost_confirmed" || lead.status === "lost_assumed" || lead.status === "passed_on" || lead.status === "unqualified" ? "disqualified" : lead.status,
        urgency: lead.urgency,
        ownerId: lead.ownerUserId ?? "",
        leadType: lead.leadType,
        accountType: lead.accountType,
        companyAssignment: lead.companyAssignment,
        programRequests: lead.programRequests,
        lawnSizeSqFt: lead.lawnSizeSqFt,
        message: lead.message,
        estimateNotes: lead.estimateNotes,
        qualityScore: lead.qualityScore,
        spamScore: lead.spamScore,
        receivedAt: lead.receivedAt,
        createdAt: lead.createdAt,
      })),
      opportunities: opportunities.map((opportunity) => ({
        id: opportunity._id,
        leadId: opportunity.leadId,
        customerId: opportunity.customerId,
        propertyId: opportunity.propertyId ?? "",
        title: opportunity.title,
        stage: opportunity.stage,
        valueCents: opportunity.valueCents,
        closeProbability: opportunity.closeProbability,
        expectedCloseDate: opportunity.expectedCloseDate ?? opportunity.updatedAt,
        ownerId: opportunity.ownerUserId ?? "",
        serviceLines: opportunity.serviceLines,
        updatedAt: opportunity.updatedAt,
      })),
      estimates: estimates.map((estimate) => ({
        id: estimate._id,
        opportunityId: estimate.opportunityId ?? "",
        customerId: estimate.customerId,
        propertyId: estimate.propertyId ?? "",
        estimateNumber: estimate.estimateNumber,
        status: estimate.status,
        subtotalCents: estimate.subtotalCents,
        taxCents: estimate.taxCents,
        totalCents: estimate.totalCents,
      })),
      serviceCatalog: serviceCatalog.map((item) => ({
        id: item._id,
        name: item.name,
        category: item.category,
        defaultUnit: item.defaultUnit,
        defaultPriceCents: item.defaultPriceCents,
        active: item.active,
      })),
      crews: crews.map((crew) => ({
        id: crew._id,
        name: crew.name,
        color: crew.color,
        active: crew.active,
      })),
      jobs: jobs.map((job) => ({
        id: job._id,
        customerId: job.customerId,
        propertyId: job.propertyId ?? "",
        title: job.title,
        status: job.status,
        priority: job.priority,
        managerId: job.managerUserId ?? "",
        startDate: job.startDate ?? job.createdAt,
      })),
      visits: visits.map((visit) => ({
        id: visit._id,
        jobId: visit.jobId,
        customerId: visit.customerId,
        propertyId: visit.propertyId ?? "",
        scheduledStart: visit.scheduledStart,
        scheduledEnd: visit.scheduledEnd,
        status: visit.status,
        routeOrder: visit.routeOrder ?? 0,
        crewId: visit.assignedCrewId ?? "",
        checklist: visit.checklist,
        notes: visit.notes ?? "",
      })),
      tasks: tasks.map((task) => ({
        id: task._id,
        entityType: task.entityType,
        entityId: task.entityId,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueAt: task.dueAt ?? task.createdAt,
        assignedUserId: task.assignedUserId ?? "",
      })),
      activities: activities.map((activity) => ({
        id: activity._id,
        entityType: activity.entityType,
        entityId: activity.entityId,
        kind: activity.kind,
        summary: activity.summary,
        actorId: activity.actorUserId ?? "",
        occurredAt: activity.occurredAt,
      })),
      materials: materials.map((material) => ({
        id: material._id,
        name: material.name,
        unit: material.unit,
        costCents: material.costCents ?? 0,
        active: material.active,
      })),
    };
  },
});

export const createLead = mutation({
  args: {
    customerName: v.string(),
    title: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    street: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    valueCents: v.number(),
    serviceLine: serviceCategory,
    source: v.optional(v.string()),
    leadType: v.optional(leadType),
    accountType: v.optional(accountType),
    companyAssignment: v.optional(v.string()),
    lawnSizeSqFt: v.optional(v.number()),
    urgency: v.optional(urgency),
    message: v.optional(v.string()),
    estimateNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const now = Date.now();
    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    const source = args.source?.trim() || "Manual entry";
    const signals = spamSignals({ customerName: args.customerName, phone: args.phone, email: args.email, message: `${args.title} ${args.message ?? ""}` });
    const qualityIssues = leadQualityIssues({ email: args.email, phone: args.phone, street: args.street, city: args.city, postalCode: args.postalCode, lawnSizeSqFt: args.lawnSizeSqFt, serviceTerritory: org.serviceTerritory });
    const qualityScore = Math.max(20, 100 - qualityIssues.length * 12 - Math.round(signals.score / 3));

    const customerId = await ctx.db.insert("customers", {
      organizationId: org._id,
      name: args.customerName || "New customer",
      type: args.accountType ?? "residential",
      status: "prospect",
      source,
      ownerUserId: owner?.userId,
      tags: [args.serviceLine, source],
      lifetimeValueCents: 0,
      createdAt: now,
      updatedAt: now,
    });
    const contactId = await ctx.db.insert("contacts", {
      organizationId: org._id,
      customerId,
      name: args.customerName || "New customer",
      email: args.email,
      phone: args.phone,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    });
    const propertyId = await ctx.db.insert("properties", {
      organizationId: org._id,
      customerId,
      label: "Primary property",
      street: args.street,
      city: args.city,
      state: args.state,
      postalCode: args.postalCode,
      notes: args.estimateNotes,
      lawnSizeSqFt: args.lawnSizeSqFt,
      createdAt: now,
      updatedAt: now,
    });
    const leadId = await ctx.db.insert("leads", {
      organizationId: org._id,
      customerId,
      contactId,
      propertyId,
      title: args.title,
      source,
      leadType: args.leadType ?? "other",
      companyAssignment: args.companyAssignment,
      accountType: args.accountType ?? "residential",
      email: args.email,
      mobilePhone: args.phone,
      normalizedPhone: args.phone?.replace(/\D/g, ""),
      message: args.message,
      estimateNotes: args.estimateNotes,
      programRequests: [args.serviceLine],
      lawnSizeSqFt: args.lawnSizeSqFt,
      status: signals.score >= 70 ? "spam" : "contacted",
      urgency: args.urgency ?? "normal",
      ownerUserId: owner?.userId,
      spamScore: signals.score,
      spamReasons: signals.reasons,
      qualityScore,
      receivedAt: now,
      rawPayload: args,
      createdAt: now,
      updatedAt: now,
    });
    const opportunityId = await ctx.db.insert("opportunities", {
      organizationId: org._id,
      leadId,
      customerId,
      propertyId,
      title: args.title,
      stage: "qualified",
      valueCents: args.valueCents,
      closeProbability: 35,
      expectedCloseDate: now + 14 * 24 * 60 * 60 * 1000,
      ownerUserId: owner?.userId,
      serviceLines: [args.serviceLine],
      createdAt: now,
      updatedAt: now,
    });

    if (signals.score > 0) {
      await ctx.db.insert("dataQualityIssues", {
        organizationId: org._id,
        kind: "potential_spam",
        severity: signals.score >= 70 ? "critical" : "warning",
        status: "open",
        leadId,
        customerId,
        summary: `Potential spam signal: ${signals.reasons.join(", ")}`,
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const issue of qualityIssues) {
      await ctx.db.insert("dataQualityIssues", {
        organizationId: org._id,
        kind: issue.kind,
        severity: issue.severity,
        status: "open",
        leadId,
        customerId,
        fieldName: issue.fieldName,
        currentValue: issue.currentValue,
        summary: issue.summary,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.insert("auditEvents", { organizationId: org._id, actorUserId: owner?.userId, action: "demo.lead.create", entityType: "lead", entityId: leadId, summary: `Created lead ${args.title}`, after: { customerId, propertyId, opportunityId }, createdAt: now });
    return { customerId, leadId, opportunityId };
  },
});

export const advanceOpportunity = mutation({
  args: { opportunityId: v.id("opportunities"), stage: opportunityStage },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity || opportunity.organizationId !== org._id) throw new Error("Opportunity not found.");
    const now = Date.now();
    await ctx.db.patch(args.opportunityId, {
      stage: args.stage,
      closeProbability: args.stage === "won" ? 100 : args.stage === "lost" ? 0 : opportunity.closeProbability,
      updatedAt: now,
    });
    await ctx.db.insert("activities", { organizationId: org._id, entityType: "opportunity", entityId: args.opportunityId, kind: "status_change", summary: `Moved ${opportunity.title} to ${args.stage}`, actorUserId: opportunity.ownerUserId, occurredAt: now });
  },
});

export const assignVisit = mutation({
  args: { visitId: v.id("jobVisits"), crewId: v.id("crews") },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const visit = await ctx.db.get(args.visitId);
    const crew = await ctx.db.get(args.crewId);
    if (!visit || !crew || visit.organizationId !== org._id || crew.organizationId !== org._id) throw new Error("Visit or crew not found.");
    await ctx.db.patch(args.visitId, { assignedCrewId: args.crewId, updatedAt: Date.now() });
  },
});

export const completeChecklistItem = mutation({
  args: { visitId: v.id("jobVisits"), itemId: v.string() },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.organizationId !== org._id) throw new Error("Visit not found.");
    const now = Date.now();
    await ctx.db.patch(args.visitId, {
      status: visit.status === "scheduled" ? "on_site" : visit.status,
      checklist: visit.checklist.map((item) =>
        item.id === args.itemId ? { ...item, isDone: !item.isDone, completedAt: item.isDone ? undefined : now } : item,
      ),
      updatedAt: now,
    });
  },
});

export const submitVisit = mutation({
  args: { visitId: v.id("jobVisits"), issueFlag: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.organizationId !== org._id) throw new Error("Visit not found.");
    const now = Date.now();
    await ctx.db.patch(args.visitId, { status: "complete", completedAt: now, updatedAt: now });
    if (args.issueFlag?.trim()) {
      await ctx.db.insert("tasks", {
        organizationId: org._id,
        entityType: "visit",
        entityId: args.visitId,
        title: args.issueFlag.trim(),
        status: "open",
        priority: "high",
        dueAt: now + 24 * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.insert("activities", { organizationId: org._id, entityType: "visit", entityId: args.visitId, kind: "visit", summary: "Submitted visit completion from field PWA", occurredAt: now });
  },
});

export const addTask = mutation({
  args: { jobId: v.id("jobs"), title: v.string() },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.organizationId !== org._id) throw new Error("Job not found.");
    const now = Date.now();
    return await ctx.db.insert("tasks", {
      organizationId: org._id,
      entityType: "job",
      entityId: args.jobId,
      title: args.title,
      status: "open",
      priority: "normal",
      dueAt: now + 48 * 60 * 60 * 1000,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createCrew = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const colors = ["#2f6b4f", "#7c6a2b", "#42526b", "#8a4f36", "#315a72"];
    const crews = await ctx.db.query("crews").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect();
    return await ctx.db.insert("crews", {
      organizationId: org._id,
      name: args.name,
      color: colors[crews.length % colors.length],
      active: true,
      capacityMinutesPerDay: 420,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const toggleServiceCatalogItem = mutation({
  args: { itemId: v.id("serviceCatalogItems") },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item || item.organizationId !== org._id) throw new Error("Catalog item not found.");
    await ctx.db.patch(args.itemId, { active: !item.active, updatedAt: Date.now() });
  },
});
