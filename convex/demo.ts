import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { approvalDueAt } from "../src/domain/estimate-approval";
import { estimateNumber } from "./lib/workflow";

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

const fieldIssueCategory = v.union(
  v.literal("damage"),
  v.literal("pest_activity"),
  v.literal("customer_concern"),
  v.literal("access_issue"),
  v.literal("upsell_opportunity"),
  v.literal("safety_hazard"),
  v.literal("other"),
);
const fieldIssueSeverity = v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent"));

type FieldIssueCategory =
  | "damage"
  | "pest_activity"
  | "customer_concern"
  | "access_issue"
  | "upsell_opportunity"
  | "safety_hazard"
  | "other";
type FieldIssueSeverity = "low" | "normal" | "high" | "urgent";
type DemoFieldIssueInput = {
  category: FieldIssueCategory;
  severity?: FieldIssueSeverity;
  summary: string;
  details?: string;
  customerVisible?: boolean;
  createOpportunity?: boolean;
  serviceCategory?: "lawn_care" | "landscaping" | "pest_control" | "tree_shrub" | "irrigation" | "snow" | "maintenance";
  estimatedValueCents?: number;
};

function fieldIssueCategoryLabel(category: FieldIssueCategory) {
  const labels: Record<FieldIssueCategory, string> = {
    damage: "Damage",
    pest_activity: "Pest activity",
    customer_concern: "Customer concern",
    access_issue: "Access issue",
    upsell_opportunity: "Upsell opportunity",
    safety_hazard: "Safety hazard",
    other: "Field issue",
  };
  return labels[category];
}

function priorityForFieldIssue(severity: FieldIssueSeverity) {
  if (severity === "urgent" || severity === "high") return "high" as const;
  if (severity === "low") return "low" as const;
  return "normal" as const;
}

function normalizeDemoFieldIssue(issueFlag?: string, issue?: DemoFieldIssueInput) {
  const summary = (issue?.summary ?? issueFlag ?? "").trim();
  if (!summary) return undefined;
  return {
    category: issue?.category ?? ("other" as const),
    severity: issue?.severity ?? ("high" as const),
    summary,
    details: issue?.details?.trim() || undefined,
    customerVisible: issue?.customerVisible ?? false,
    createOpportunity: issue?.createOpportunity ?? issue?.category === "upsell_opportunity",
    serviceCategory: issue?.serviceCategory ?? ("maintenance" as const),
    estimatedValueCents: Math.max(0, Math.round(issue?.estimatedValueCents ?? 0)),
    structured: Boolean(issue),
  };
}

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
const callOutcome = v.union(v.literal("estimate_requested"), v.literal("needs_callback"), v.literal("price_shopping"), v.literal("not_a_fit"), v.literal("emergency"));
const activityEntityType = v.union(v.literal("customer"), v.literal("job"));
const activityComposerKind = v.union(v.literal("call"), v.literal("email"), v.literal("note"));
const activityCallOutcome = v.union(v.literal("estimate_requested"), v.literal("left_voicemail"), v.literal("no_answer"), v.literal("not_interested"), v.literal("needs_manager"));
const opportunityImpact = v.union(v.literal("none"), v.literal("increase_probability"), v.literal("decrease_probability"), v.literal("advance_stage"));

const callOutcomeLabels: Record<string, string> = {
  estimate_requested: "Estimate requested",
  needs_callback: "Needs callback",
  price_shopping: "Price shopping",
  not_a_fit: "Not a fit",
  emergency: "Emergency service",
};

function callOutcomeLabel(value?: string) {
  return value ? (callOutcomeLabels[value] ?? value) : "Call logged";
}

function followUpDays(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(30, Math.round(value)));
}

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
    if (estimate.estimateNumber === "EST-1024") await ctx.db.patch(estimate._id, { sentAt: at(14, 15), expiresAt: at(17, 0, 14), createdAt: at(14, 0), updatedAt: at(14, 15) });
    if (estimate.estimateNumber === "EST-1019") await ctx.db.patch(estimate._id, { sentAt: at(9, 0, -1), acceptedAt: at(10, 20, -1), acceptedByName: "Brookside Board", acceptedByEmail: "board@brookside.example", acceptanceSource: "email", acceptanceNote: "Board approved the seasonal renewal by email.", expiresAt: at(17, 0, 13), createdAt: at(9, 0, -1), updatedAt: at(10, 20, -1) });
  }
  const brooksideEstimate = estimates.find((estimate) => estimate.estimateNumber === "EST-1019");
  for (const job of jobs) {
    if (job.title.includes("Brookside")) await ctx.db.patch(job._id, { startDate: at(8, 30), estimateId: brooksideEstimate?._id, opportunityId: brooksideEstimate?.opportunityId, updatedAt: Date.now() });
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

async function ensureDemoAccountArtifacts(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const now = Date.now();
  const [customers, properties, estimates, notes, files, users] = await Promise.all([
    ctx.db.query("customers").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("properties").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("estimates").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("notes").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("files").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("users").collect(),
  ]);
  const customerByName = new Map(customers.map((customer) => [customer.name, customer]));
  const propertyByCustomer = new Map(properties.map((property) => [property.customerId, property]));
  const estimateByNumber = new Map(estimates.map((estimate) => [estimate.estimateNumber, estimate]));
  const userByEmail = new Map(users.map((user) => [user.email, user]));
  const noteKeys = new Set(notes.map((note) => `${note.entityType}:${note.entityId}:${note.body}`));
  const fileKeys = new Set(files.map((file) => `${file.entityType}:${file.entityId}:${file.fileName}`));

  const brookside = customerByName.get("Brookside HOA");
  const walsh = customerByName.get("Megan Walsh");
  const northgate = customerByName.get("Northgate Industrial Park");
  const amy = userByEmail.get("amy@example.com")?._id;
  const justin = userByEmail.get("justin@example.com")?._id;
  const nina = userByEmail.get("nina@example.com")?._id;

  const accountNotes = [
    {
      customer: brookside,
      body: "Board prefers treatment notices 24 hours before applications and photos after playground service.",
      visibility: "internal" as const,
      userId: amy,
      createdAt: at(15, 20, -2),
    },
    {
      customer: walsh,
      body: "Wetland buffer in backyard. Keep mosquito application notes customer-ready.",
      visibility: "internal" as const,
      userId: amy,
      createdAt: at(9, 40, -1),
    },
    {
      customer: northgate,
      body: "Billing contact wants invoices grouped by building and paid by ACH.",
      visibility: "internal" as const,
      userId: justin,
      createdAt: at(11, 25, -3),
    },
  ];

  for (const note of accountNotes) {
    if (!note.customer) continue;
    const key = `customer:${note.customer._id}:${note.body}`;
    if (noteKeys.has(key)) continue;
    await ctx.db.insert("notes", {
      organizationId,
      entityType: "customer",
      entityId: note.customer._id,
      body: note.body,
      visibility: note.visibility,
      createdByUserId: note.userId,
      createdAt: note.createdAt,
      updatedAt: now,
    });
  }

  const brooksideProperty = brookside ? propertyByCustomer.get(brookside._id) : undefined;
  const walshEstimate = estimateByNumber.get("EST-1024");
  const accountFiles = [
    {
      entityType: "customer" as const,
      entityId: brookside?._id,
      fileName: "Brookside HOA service agreement.pdf",
      contentType: "application/pdf",
      size: 248000,
      userId: justin,
      createdAt: at(10, 0, -5),
    },
    {
      entityType: "property" as const,
      entityId: brooksideProperty?._id,
      fileName: "Brookside common-area treatment map.png",
      contentType: "image/png",
      size: 913000,
      userId: nina,
      createdAt: at(12, 20, -1),
    },
    {
      entityType: "estimate" as const,
      entityId: walshEstimate?._id,
      fileName: "Walsh mosquito estimate package.pdf",
      contentType: "application/pdf",
      size: 175000,
      userId: amy,
      createdAt: at(14, 20),
    },
  ];

  for (const file of accountFiles) {
    if (!file.entityId) continue;
    const key = `${file.entityType}:${file.entityId}:${file.fileName}`;
    if (fileKeys.has(key)) continue;
    await ctx.db.insert("files", {
      organizationId,
      entityType: file.entityType,
      entityId: file.entityId,
      fileName: file.fileName,
      contentType: file.contentType,
      size: file.size,
      createdByUserId: file.userId,
      createdAt: file.createdAt,
    });
  }
}

async function ensureDemoServicePackages(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const existingPackages = await ctx.db.query("servicePackages").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect();
  if (existingPackages.length > 0) return;

  const now = Date.now();
  const serviceCatalog = await ctx.db.query("serviceCatalogItems").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect();
  const catalogByName = new Map(serviceCatalog.map((item) => [item.name, item._id]));
  const packageRows = [
    {
      name: "Lawn health season package",
      category: "lawn_care" as const,
      description: "Six-step fertility, grub prevention, aeration, and overseeding assumptions for a full lawn-care season.",
      catalogNames: ["Six-step fertilization program", "Core aeration and overseeding"],
      defaultPriceCents: 185000,
      billingCadence: "seasonal" as const,
      laborHours: 5.5,
      laborRateCents: 3200,
      materialCostCents: 38500,
      equipmentCostCents: 14500,
      overheadPercent: 18,
      targetMarginPercent: 42,
      checklistDefaults: ["Measure turf zones", "Confirm fertilizer rate", "Flag treated areas", "Capture before/after photos"],
    },
    {
      name: "Mosquito and tick protection package",
      category: "pest_control" as const,
      description: "Seasonal barrier program with chemical, route, applicator, and compliance defaults.",
      catalogNames: ["Mosquito and tick barrier"],
      defaultPriceCents: 78000,
      billingCadence: "seasonal" as const,
      laborHours: 3.5,
      laborRateCents: 3400,
      materialCostCents: 12600,
      equipmentCostCents: 5800,
      overheadPercent: 16,
      targetMarginPercent: 45,
      checklistDefaults: ["Confirm wetland buffer", "Record product and EPA label", "Capture weather snapshot", "Notify customer after service"],
    },
    {
      name: "Spring cleanup production package",
      category: "landscaping" as const,
      description: "Crew-hour cleanup package with disposal, equipment, and margin assumptions.",
      catalogNames: ["Spring cleanup"],
      defaultPriceCents: 152000,
      billingCadence: "one_time" as const,
      laborHours: 12,
      laborRateCents: 3000,
      materialCostCents: 9000,
      equipmentCostCents: 22000,
      overheadPercent: 18,
      targetMarginPercent: 38,
      checklistDefaults: ["Walk property with customer notes", "Stage debris removal", "Inspect beds and edges", "Log disposal or dump fees"],
    },
  ];

  for (const row of packageRows) {
    const includedServiceCatalogItemIds = row.catalogNames.map((name) => catalogByName.get(name)).filter((id): id is Id<"serviceCatalogItems"> => Boolean(id));
    if (includedServiceCatalogItemIds.length === 0) continue;
    await ctx.db.insert("servicePackages", {
      organizationId,
      name: row.name,
      category: row.category,
      description: row.description,
      includedServiceCatalogItemIds,
      defaultPriceCents: row.defaultPriceCents,
      billingCadence: row.billingCadence,
      laborHours: row.laborHours,
      laborRateCents: row.laborRateCents,
      materialCostCents: row.materialCostCents,
      equipmentCostCents: row.equipmentCostCents,
      overheadPercent: row.overheadPercent,
      targetMarginPercent: row.targetMarginPercent,
      checklistDefaults: row.checklistDefaults,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function ensureDemoPropertyAreas(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const existingAreas = await ctx.db.query("propertyAreas").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect();
  if (existingAreas.length > 0) return;

  const now = Date.now();
  const properties = await ctx.db.query("properties").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect();
  const propertyByLabel = new Map(properties.map((property) => [property.label, property]));
  const rows = [
    { property: propertyByLabel.get("Brookside Common Areas"), name: "Common turf zones", kind: "front_lawn" as const, size: 55000, notes: "Primary HOA turf zone for six-step fertilization." },
    { property: propertyByLabel.get("Brookside Common Areas"), name: "North entrance turf", kind: "front_lawn" as const, size: 12000, notes: "High-visibility entry area near playground." },
    { property: propertyByLabel.get("Walsh Residence"), name: "Front lawn", kind: "front_lawn" as const, size: 6500, notes: "Visible front turf near driveway." },
    { property: propertyByLabel.get("Walsh Residence"), name: "Back lawn", kind: "back_lawn" as const, size: 8000, notes: "Wetland buffer at rear edge." },
    { property: propertyByLabel.get("Northgate Building 4"), name: "Office lawn", kind: "front_lawn" as const, size: 62000, notes: "Main public-facing lawn near office entrance." },
  ];

  for (const row of rows) {
    if (!row.property) continue;
    await ctx.db.insert("propertyAreas", {
      organizationId,
      propertyId: row.property._id,
      name: row.name,
      kind: row.kind,
      size: row.size,
      unit: "sq_ft",
      notes: row.notes,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function ensureDemoFertilizationPricing(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const now = Date.now();
  const [priceBooks, priceBookItems, serviceCatalog] = await Promise.all([
    ctx.db.query("priceBooks").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("priceBookItems").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("serviceCatalogItems").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
  ]);
  const fertilizationService = serviceCatalog.find((item) => item.name === "Six-step fertilization program");
  if (!fertilizationService) return;

  let priceBookId = priceBooks[0]?._id;
  if (!priceBookId) {
    priceBookId = await ctx.db.insert("priceBooks", {
      organizationId,
      name: "2026 Residential + Commercial",
      description: "Default production price book for lawn, landscape, and pest services.",
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  let fertilizationPriceBookItem = priceBookItems.find((item) => item.serviceCatalogItemId === fertilizationService._id || item.name === "Six-step program by lawn size");
  if (!fertilizationPriceBookItem) {
    const itemId = await ctx.db.insert("priceBookItems", {
      organizationId,
      priceBookId,
      serviceCatalogItemId: fertilizationService._id,
      name: "Six-step program by lawn size",
      unit: "season",
      basePriceCents: 165000,
      minPriceCents: 62000,
      pricingModel: "per_sq_ft",
      formula: "max(minPrice, lawnSizeSqFt * 0.018)",
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    fertilizationPriceBookItem = await ctx.db.get(itemId) ?? undefined;
  }
  if (!fertilizationPriceBookItem) return;

  const existingRules = await ctx.db.query("pricingRules").withIndex("by_price_book_item", (q) => q.eq("priceBookItemId", fertilizationPriceBookItem._id)).collect();
  if (existingRules.length > 0) return;
  for (const rule of [
    { name: "Large turf production complexity", condition: { minAreaSqFt: 50000 }, adjustmentType: "percent" as const, adjustmentValue: 8, order: 1 },
    { name: "Small property minimum handling", condition: { maxAreaSqFt: 10000 }, adjustmentType: "fixed" as const, adjustmentValue: 15000, order: 2 },
  ]) {
    await ctx.db.insert("pricingRules", {
      organizationId,
      priceBookItemId: fertilizationPriceBookItem._id,
      ...rule,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function ensureDemoApprovalRequests(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const existingRequests = await ctx.db.query("approvalRequests").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect();
  if (existingRequests.some((request) => request.status === "pending")) return;

  const now = Date.now();
  const [estimates, memberships] = await Promise.all([
    ctx.db.query("estimates").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
  ]);
  const walshEstimate = estimates.find((estimate) => estimate.estimateNumber === "EST-1024") ?? estimates.find((estimate) => estimate.totalCents <= 100000);
  if (!walshEstimate) return;
  const requester = memberships.find((membership) => membership.role === "sales") ?? memberships[0];
  const approver = memberships.find((membership) => ["owner", "admin", "manager"].includes(membership.role)) ?? memberships[0];
  const approvalRequestId = await ctx.db.insert("approvalRequests", {
    organizationId,
    estimateId: walshEstimate._id,
    opportunityId: walshEstimate.opportunityId,
    customerId: walshEstimate.customerId,
    requestedByUserId: requester?.userId,
    assignedApproverUserId: approver?.userId,
    status: "pending",
    reasonDetails: [
      {
        code: "low_margin",
        label: "Low margin",
        severity: "critical",
        detail: "Gross margin 18.5% is below 30% target.",
        impactCents: 18500,
      },
      {
        code: "material_constraint",
        label: "Material constraint",
        severity: "critical",
        detail: "Wetland buffer requires product and application review before sending.",
      },
    ],
    riskScore: 70,
    grossMarginPercent: 18.5,
    discountCents: 12000,
    discountPercent: 13.3,
    estimatedCostCents: 63570,
    totalCents: walshEstimate.totalCents,
    dueAt: approvalDueAt(now),
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(walshEstimate._id, { approvalStatus: "pending", approvalRequestId, updatedAt: now });
}

async function ensureDemoRecurringPlans(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const [plans, customers, properties, jobs, crews] = await Promise.all([
    ctx.db.query("recurringServicePlans").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("customers").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("properties").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("jobs").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("crews").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
  ]);
  if (plans.some((plan) => plan.name === "Northgate weekly maintenance route")) return;

  const northgate = customers.find((customer) => customer.name === "Northgate Industrial Park");
  const northgateJob = jobs.find((job) => job.title === "Northgate weekly maintenance");
  const northgateProperty = properties.find((property) => property.customerId === northgate?._id);
  const crew = crews.find((candidate) => candidate.name === "Charlie Maintenance") ?? crews.find((candidate) => candidate.active);
  if (!northgate || !northgateJob) return;

  const now = Date.now();
  await ctx.db.insert("recurringServicePlans", {
    organizationId,
    customerId: northgate._id,
    propertyId: northgateProperty?._id,
    jobId: northgateJob._id,
    crewId: crew?._id,
    name: "Northgate weekly maintenance route",
    frequency: "weekly",
    intervalDays: 7,
    visitDurationMinutes: 180,
    nextRunAt: at(9, 0, 7),
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

async function ensureDemoChangeOrders(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const [changeOrders, customers, properties, jobs] = await Promise.all([
    ctx.db.query("changeOrders").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("customers").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("properties").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("jobs").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
  ]);
  if (changeOrders.some((changeOrder) => changeOrder.title === "Add playground perimeter edging")) return;

  const brookside = customers.find((customer) => customer.name === "Brookside HOA");
  const brooksideJob = jobs.find((job) => job.title === "Brookside six-step season");
  const brooksideProperty = properties.find((property) => property.customerId === brookside?._id);
  if (!brookside || !brooksideJob) return;

  const now = Date.now();
  await ctx.db.insert("changeOrders", {
    organizationId,
    jobId: brooksideJob._id,
    customerId: brookside._id,
    propertyId: brooksideProperty?._id,
    estimateId: brooksideJob.estimateId,
    title: "Add playground perimeter edging",
    description: "Board requested additional edging and debris removal around playground border.",
    status: "pending_approval",
    requestedByName: "Brookside Board",
    revenueDeltaCents: 185000,
    estimatedCostDeltaCents: 72000,
    grossProfitDeltaCents: 113000,
    grossMarginPercent: 61,
    scheduleImpactDays: 2,
    requestedAt: at(13, 15, -1),
    createdAt: now,
    updatedAt: now,
  });
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

const scaleFirstNames = ["Avery", "Blake", "Casey", "Dakota", "Emerson", "Finley", "Gray", "Harper", "Jordan", "Kai", "Logan", "Morgan", "Noel", "Parker", "Quinn", "Reese", "Sawyer", "Taylor", "Val", "Wren"];
const scaleLastNames = ["Adams", "Bennett", "Carter", "Diaz", "Ellis", "Foster", "Garcia", "Hayes", "Iverson", "Johnson", "Kim", "Lopez", "Miller", "Nolan", "Owens", "Patel", "Rivera", "Stone", "Turner", "Young"];
const scaleCities = ["Foxborough", "Mansfield", "Sharon", "Wrentham", "Plainville"];
const scaleSources = ["Website form", "Google Local Services", "Referral", "Phone", "Yard sign", "Facebook"];
const scalePrograms = ["lawn_care", "landscaping", "pest_control", "tree_shrub", "irrigation", "maintenance"] as const;
const scaleRoles = ["sales", "dispatcher", "crew_lead", "technician", "manager"] as const;
const scaleStatuses = ["new", "contacted", "do_estimate", "estimate_provided", "follow_up", "waiting", "converted"] as const;
const scaleStages = ["new", "qualified", "estimating", "proposal_sent", "won"] as const;

async function ensureDemoScaleData(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const now = Date.now();
  const existingLeads = await ctx.db.query("leads").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect();
  const existingScaleLeadKeys = new Set(existingLeads.map((lead) => lead.externalSourceId).filter(Boolean));
  const scaleUserIds: Array<Id<"users">> = [];

  for (let index = 0; index < 100; index += 1) {
    const number = index + 1;
    const padded = String(number).padStart(3, "0");
    const clerkUserId = `demo-scale-user-${padded}`;
    const firstName = scaleFirstNames[index % scaleFirstNames.length];
    const lastName = scaleLastNames[Math.floor(index / scaleFirstNames.length) % scaleLastNames.length];
    const role = scaleRoles[index % scaleRoles.length];
    const email = `demo.user${padded}@turfpro.test`;

    let user = await ctx.db.query("users").withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId)).unique();
    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkUserId,
        name: `${firstName} ${lastName}`,
        email,
        createdAt: now,
        updatedAt: now,
      });
      user = await ctx.db.get(userId);
    }
    if (!user) continue;
    scaleUserIds.push(user._id);

    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_org_user", (q) => q.eq("organizationId", organizationId).eq("userId", user._id))
      .unique();
    if (!existingMembership) {
      await ctx.db.insert("memberships", {
        organizationId,
        userId: user._id,
        role,
        status: "active",
        joinedAt: now,
        updatedAt: now,
      });
    }
  }

  const crews = await ctx.db.query("crews").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect();
  let insertedRecords = 0;

  for (let index = 0; index < 100; index += 1) {
    const number = index + 1;
    const padded = String(number).padStart(3, "0");
    const externalSourceId = `demo-scale-lead-${padded}`;
    if (existingScaleLeadKeys.has(externalSourceId)) continue;

    const firstName = scaleFirstNames[index % scaleFirstNames.length];
    const lastName = scaleLastNames[(index * 3) % scaleLastNames.length];
    const program = scalePrograms[index % scalePrograms.length];
    const ownerUserId = scaleUserIds[index % Math.max(1, scaleUserIds.length)];
    const city = scaleCities[index % scaleCities.length];
    const status = scaleStatuses[index % scaleStatuses.length];
    const stage = scaleStages[index % scaleStages.length];
    const accountType = index % 5 === 0 ? "commercial" : "residential";
    const customerType = index % 10 === 0 ? "hoa" : accountType;
    const lawnSizeSqFt = 6500 + (index % 30) * 1750 + (accountType === "commercial" ? 72000 : 0);
    const valueCents = 18000 + (index % 18) * 12500 + (accountType === "commercial" ? 185000 : 0);
    const leadCreatedAt = at(8 + (index % 9), (index * 7) % 60, -1 * (index % 21));
    const customerName = accountType === "commercial" ? `${lastName} Facilities ${padded}` : `${firstName} ${lastName}`;

    const customerId = await ctx.db.insert("customers", {
      organizationId,
      name: customerName,
      type: customerType,
      status: status === "converted" ? "active" : "prospect",
      source: scaleSources[index % scaleSources.length],
      ownerUserId,
      tags: ["scale-test", program, accountType],
      lifetimeValueCents: stage === "won" ? valueCents * 3 : 0,
      createdAt: leadCreatedAt,
      updatedAt: leadCreatedAt,
    });
    const contactId = await ctx.db.insert("contacts", {
      organizationId,
      customerId,
      name: customerName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${padded}@example.test`,
      phone: `(508) 555-${String(1000 + number).slice(-4)}`,
      preferredChannel: index % 2 === 0 ? "phone" : "email",
      isPrimary: true,
      createdAt: leadCreatedAt,
      updatedAt: leadCreatedAt,
    });
    const propertyId = await ctx.db.insert("properties", {
      organizationId,
      customerId,
      label: accountType === "commercial" ? `${lastName} Facility` : "Primary residence",
      street: `${100 + number} ${["Maple", "Cedar", "Oak", "Pine", "Elm"][index % 5]} ${accountType === "commercial" ? "Parkway" : "Lane"}`,
      city,
      state: "MA",
      postalCode: `02${String(30 + (index % 60)).padStart(3, "0")}`,
      notes: index % 7 === 0 ? "Gate code required. Confirm access before dispatch." : "Synthetic scale-test property.",
      lawnSizeSqFt,
      createdAt: leadCreatedAt,
      updatedAt: leadCreatedAt,
    });
    const leadId = await ctx.db.insert("leads", {
      organizationId,
      customerId,
      contactId,
      propertyId,
      title: `${program.replaceAll("_", " ")} request ${padded}`,
      source: scaleSources[index % scaleSources.length],
      leadType: index % 4 === 0 ? "phone_call" : "form",
      companyAssignment: index % 2 === 0 ? "Turf Pro" : "GreenAce",
      accountType,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${padded}@example.test`,
      mobilePhone: `(508) 555-${String(1000 + number).slice(-4)}`,
      normalizedPhone: `508555${String(1000 + number).slice(-4)}`,
      message: "Generated scale-test lead for pricing, routing, follow-up, and quality scoring.",
      estimateNotes: "Use this record to test list performance, filters, owners, and conversion views.",
      programRequests: [program],
      lawnSizeSqFt,
      grade: index % 6 === 0 ? "a" : index % 4 === 0 ? "b" : index % 3 === 0 ? "c" : "ungraded",
      status,
      urgency: index % 9 === 0 ? "high" : index % 4 === 0 ? "low" : "normal",
      ownerUserId,
      spamScore: index % 17 === 0 ? 35 : 0,
      spamReasons: index % 17 === 0 ? ["scale_test_solicitation_phrase"] : [],
      qualityScore: 52 + (index % 45),
      receivedAt: leadCreatedAt,
      externalSourceId,
      rawPayload: { source: "demo_scale_seed", rowNumber: number },
      createdAt: leadCreatedAt,
      updatedAt: leadCreatedAt,
    });
    const opportunityId = await ctx.db.insert("opportunities", {
      organizationId,
      leadId,
      customerId,
      propertyId,
      title: `${program.replaceAll("_", " ")} estimate ${padded}`,
      stage,
      valueCents,
      closeProbability: stage === "won" ? 100 : 20 + (index % 6) * 12,
      expectedCloseDate: at(16, 0, index % 18),
      ownerUserId,
      serviceLines: [program],
      createdAt: leadCreatedAt,
      updatedAt: at(9 + (index % 7), (index * 11) % 60, -1 * (index % 10)),
    });

    if (index < 36 && crews.length) {
      const jobId = await ctx.db.insert("jobs", {
        organizationId,
        customerId,
        propertyId,
        opportunityId,
        title: `${program.replaceAll("_", " ")} production ${padded}`,
        status: index % 6 === 0 ? "completed" : index % 3 === 0 ? "in_progress" : "scheduled",
        priority: index % 8 === 0 ? "high" : "normal",
        startDate: at(7 + (index % 8), 30, index % 12),
        managerUserId: ownerUserId,
        createdAt: leadCreatedAt,
        updatedAt: leadCreatedAt,
      });
      const visitId = await ctx.db.insert("jobVisits", {
        organizationId,
        jobId,
        customerId,
        propertyId,
        scheduledStart: at(7 + (index % 8), 30, index % 12),
        scheduledEnd: at(9 + (index % 8), 0, index % 12),
        status: index % 6 === 0 ? "complete" : index % 3 === 0 ? "on_site" : "scheduled",
        routeOrder: (index % 12) + 1,
        assignedCrewId: crews[index % crews.length]._id,
        checklist: [
          { id: `scale-${padded}-c1`, label: "Confirm property access", isDone: index % 3 === 0 },
          { id: `scale-${padded}-c2`, label: "Complete service scope", isDone: index % 6 === 0 },
          { id: `scale-${padded}-c3`, label: "Log materials and photos", isDone: false },
        ],
        notes: "Synthetic route stop for dispatch and mobile field testing.",
        createdAt: leadCreatedAt,
        updatedAt: leadCreatedAt,
      });
      await ctx.db.insert("tasks", {
        organizationId,
        entityType: "job",
        entityId: jobId,
        title: `Review scale-test job ${padded}`,
        status: index % 5 === 0 ? "in_progress" : "open",
        priority: index % 8 === 0 ? "high" : "normal",
        dueAt: at(15, 0, index % 9),
        assignedUserId: ownerUserId,
        createdAt: leadCreatedAt,
        updatedAt: leadCreatedAt,
      });
      await ctx.db.insert("activities", {
        organizationId,
        entityType: "visit",
        entityId: visitId,
        kind: "visit",
        summary: `Scale-test visit created for ${customerName}`,
        actorUserId: ownerUserId,
        occurredAt: leadCreatedAt,
      });
    }

    if (index < 50) {
      await ctx.db.insert("activities", {
        organizationId,
        entityType: "lead",
        entityId: leadId,
        kind: index % 2 === 0 ? "call" : "email",
        summary: `Scale-test activity logged for ${customerName}`,
        actorUserId: ownerUserId,
        occurredAt: at(10 + (index % 6), (index * 5) % 60, -1 * (index % 14)),
      });
    }

    insertedRecords += 1;
  }

  if (insertedRecords > 0) {
    await ctx.db.insert("auditEvents", {
      organizationId,
      action: "demo.scale_seed",
      entityType: "organization",
      entityId: organizationId,
      summary: `Seeded ${insertedRecords} synthetic accounts and 100 synthetic team users for scale testing`,
      after: { insertedAccounts: insertedRecords, syntheticUsers: 100 },
      createdAt: now,
    });
  }

  return { insertedAccounts: insertedRecords, syntheticUsers: 100 };
}

export const bootstrapWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await getDemoOrg(ctx);
    if (existing) {
      await refreshDemoDates(ctx, existing._id);
      await ensureDemoAccountArtifacts(ctx, existing._id);
      await ensureDemoPropertyAreas(ctx, existing._id);
      await ensureDemoServicePackages(ctx, existing._id);
      await ensureDemoFertilizationPricing(ctx, existing._id);
      await ensureDemoApprovalRequests(ctx, existing._id);
      await ensureDemoRecurringPlans(ctx, existing._id);
      await ensureDemoChangeOrders(ctx, existing._id);
      const scale = await ensureDemoScaleData(ctx, existing._id);
      return { organizationId: existing._id, created: false, refreshed: true, scale };
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
      approvalStatus: "pending",
      subtotalCents: 78000,
      discountCents: 12000,
      taxCents: 0,
      totalCents: 78000,
      sentAt: at(14, 15),
      expiresAt: at(17, 0, 14),
      terms: "Customer may approve the seasonal mosquito package within 14 days. Wetland buffer treatment notes must remain attached to the quote.",
      createdAt: at(14, 0),
      updatedAt: at(14, 15),
    });
    const brooksideEstimateId = await ctx.db.insert("estimates", {
      organizationId,
      opportunityId: brooksideOppId,
      customerId: brooksideId,
      propertyId: brooksidePropertyId,
      estimateNumber: "EST-1019",
      status: "accepted",
      approvalStatus: "not_required",
      subtotalCents: 920000,
      taxCents: 0,
      totalCents: 920000,
      sentAt: at(9, 0, -1),
      acceptedAt: at(10, 20, -1),
      acceptedByName: "Brookside Board",
      acceptedByEmail: "board@brookside.example",
      acceptanceSource: "email",
      acceptanceNote: "Board approved the seasonal renewal by email.",
      expiresAt: at(17, 0, 13),
      terms: "Seasonal lawn-health renewal includes the six-step program, grub prevention, route notes, and board communication before each application.",
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
    await ensureDemoPropertyAreas(ctx, organizationId);
    await ensureDemoServicePackages(ctx, organizationId);
    await ensureDemoFertilizationPricing(ctx, organizationId);
    await ensureDemoApprovalRequests(ctx, organizationId);

    const alphaCrewId = await ctx.db.insert("crews", { organizationId, name: "Alpha Lawn", color: "#2f6b4f", active: true, capacityMinutesPerDay: 420, createdAt: now, updatedAt: now });
    const bravoCrewId = await ctx.db.insert("crews", { organizationId, name: "Bravo Pest", color: "#7c6a2b", active: true, capacityMinutesPerDay: 390, createdAt: now, updatedAt: now });
    const charlieCrewId = await ctx.db.insert("crews", { organizationId, name: "Charlie Maintenance", color: "#42526b", active: true, capacityMinutesPerDay: 480, createdAt: now, updatedAt: now });
    await ctx.db.insert("crewMembers", { organizationId, crewId: bravoCrewId, userId: ninaId, role: "crew lead", active: true, createdAt: now, updatedAt: now });

    const brooksideJobId = await ctx.db.insert("jobs", {
      organizationId,
      customerId: brooksideId,
      propertyId: brooksidePropertyId,
      opportunityId: brooksideOppId,
      estimateId: brooksideEstimateId,
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

    await ensureDemoAccountArtifacts(ctx, organizationId);
    await ensureDemoPropertyAreas(ctx, organizationId);
    await ensureDemoServicePackages(ctx, organizationId);
    await ensureDemoFertilizationPricing(ctx, organizationId);
    await ensureDemoApprovalRequests(ctx, organizationId);
    await ensureDemoRecurringPlans(ctx, organizationId);
    await ensureDemoChangeOrders(ctx, organizationId);
    const scale = await ensureDemoScaleData(ctx, organizationId);

    return { organizationId, created: true, scale };
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
      propertyAreas,
      leads,
      opportunities,
      estimates,
      approvalRequests,
      invoices,
      payments,
      serviceCatalog,
      servicePackages,
      priceBookItems,
      pricingRules,
      crews,
      jobs,
      visits,
      recurringServicePlans,
      changeOrders,
      tasks,
      activities,
      notes,
      files,
      materials,
    ] = await Promise.all([
      ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("customers").withIndex("by_org_updated", (q) => q.eq("organizationId", org._id)).order("desc").collect(),
      ctx.db.query("contacts").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("properties").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("propertyAreas").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("leads").withIndex("by_org_created", (q) => q.eq("organizationId", org._id)).order("desc").collect(),
      ctx.db.query("opportunities").withIndex("by_org_updated", (q) => q.eq("organizationId", org._id)).order("desc").collect(),
      ctx.db.query("estimates").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("approvalRequests").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("customerInvoices").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("customerPayments").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("serviceCatalogItems").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("servicePackages").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("priceBookItems").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("pricingRules").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("crews").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("jobs").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("jobVisits").withIndex("by_org_date", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("recurringServicePlans").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("changeOrders").withIndex("by_org_updated", (q) => q.eq("organizationId", org._id)).order("desc").collect(),
      ctx.db.query("tasks").withIndex("by_org_due", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("activities").withIndex("by_org_time", (q) => q.eq("organizationId", org._id)).order("desc").take(50),
      ctx.db.query("notes").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
      ctx.db.query("files").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
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
      contacts: contacts.map((contact) => ({
        id: contact._id,
        customerId: contact.customerId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone ?? contact.mobilePhone,
        roleTitle: contact.roleTitle,
        isPrimary: contact.isPrimary ?? false,
      })),
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
      propertyAreas: propertyAreas.map((area) => ({
        id: area._id,
        propertyId: area.propertyId,
        name: area.name,
        kind: area.kind,
        size: area.size,
        unit: area.unit,
        notes: area.notes,
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
        approvalStatus: estimate.approvalStatus,
        subtotalCents: estimate.subtotalCents,
        discountCents: estimate.discountCents,
        taxCents: estimate.taxCents,
        totalCents: estimate.totalCents,
        sentAt: estimate.sentAt,
        acceptedAt: estimate.acceptedAt,
        acceptedByName: estimate.acceptedByName,
        acceptedByEmail: estimate.acceptedByEmail,
        acceptanceSource: estimate.acceptanceSource,
        acceptanceNote: estimate.acceptanceNote,
        expiresAt: estimate.expiresAt,
        terms: estimate.terms,
      })),
      approvalRequests: approvalRequests.map((request) => {
        const estimate = estimates.find((candidate) => candidate._id === request.estimateId);
        const customer = customers.find((candidate) => candidate._id === request.customerId);
        return {
          id: request._id,
          estimateId: request.estimateId,
          estimateNumber: estimate?.estimateNumber ?? "Estimate",
          opportunityId: request.opportunityId,
          customerId: request.customerId,
          customerName: customer?.name ?? "Customer",
          requestedByUserId: request.requestedByUserId,
          assignedApproverUserId: request.assignedApproverUserId,
          status: request.status,
          reasonDetails: request.reasonDetails,
          riskScore: request.riskScore,
          grossMarginPercent: request.grossMarginPercent,
          discountCents: request.discountCents,
          discountPercent: request.discountPercent,
          estimatedCostCents: request.estimatedCostCents,
          totalCents: request.totalCents,
          dueAt: request.dueAt,
          requestedAt: request.requestedAt,
          decidedByUserId: request.decidedByUserId,
          decidedAt: request.decidedAt,
          decisionComment: request.decisionComment,
        };
      }),
      invoices: invoices.map((invoice) => ({
        id: invoice._id,
        customerId: invoice.customerId,
        jobId: invoice.jobId,
        estimateId: invoice.estimateId,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        subtotalCents: invoice.subtotalCents,
        taxCents: invoice.taxCents,
        totalCents: invoice.totalCents,
        paidCents: invoice.paidCents,
        dueAt: invoice.dueAt,
        sentAt: invoice.sentAt,
        paidAt: invoice.paidAt,
      })),
      payments: payments.map((payment) => ({
        id: payment._id,
        customerId: payment.customerId,
        invoiceId: payment.invoiceId,
        status: payment.status,
        method: payment.method,
        amountCents: payment.amountCents,
        receivedAt: payment.receivedAt,
        reference: payment.reference,
      })),
      serviceCatalog: serviceCatalog.map((item) => ({
        id: item._id,
        name: item.name,
        category: item.category,
        description: item.description,
        defaultUnit: item.defaultUnit,
        defaultPriceCents: item.defaultPriceCents,
        durationMinutes: item.durationMinutes,
        active: item.active,
      })),
      servicePackages: servicePackages.map((item) => ({
        id: item._id,
        name: item.name,
        category: item.category,
        description: item.description,
        includedServiceCatalogItemIds: item.includedServiceCatalogItemIds,
        defaultPriceCents: item.defaultPriceCents,
        billingCadence: item.billingCadence,
        laborHours: item.laborHours,
        laborRateCents: item.laborRateCents,
        materialCostCents: item.materialCostCents,
        equipmentCostCents: item.equipmentCostCents,
        overheadPercent: item.overheadPercent,
        targetMarginPercent: item.targetMarginPercent,
        checklistDefaults: item.checklistDefaults,
        active: item.active,
      })),
      priceBookItems: priceBookItems.map((item) => ({
        id: item._id,
        serviceCatalogItemId: item.serviceCatalogItemId,
        name: item.name,
        unit: item.unit,
        basePriceCents: item.basePriceCents,
        minPriceCents: item.minPriceCents,
        pricingModel: item.pricingModel,
        formula: item.formula,
        active: item.active,
      })),
      pricingRules: pricingRules.map((rule) => ({
        id: rule._id,
        priceBookItemId: rule.priceBookItemId,
        name: rule.name,
        condition: rule.condition,
        adjustmentType: rule.adjustmentType,
        adjustmentValue: rule.adjustmentValue,
        order: rule.order,
        active: rule.active,
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
        opportunityId: job.opportunityId,
        estimateId: job.estimateId,
        title: job.title,
        status: job.status,
        priority: job.priority,
        managerId: job.managerUserId ?? "",
        startDate: job.startDate ?? job.createdAt,
        recurrence: job.recurrence,
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
      recurringServicePlans: recurringServicePlans.map((plan) => ({
        id: plan._id,
        customerId: plan.customerId,
        propertyId: plan.propertyId,
        jobId: plan.jobId,
        crewId: plan.crewId,
        name: plan.name,
        frequency: plan.frequency,
        intervalDays: plan.intervalDays,
        visitDurationMinutes: plan.visitDurationMinutes,
        nextRunAt: plan.nextRunAt,
        lastGeneratedAt: plan.lastGeneratedAt,
        generatedVisitIds: plan.generatedVisitIds,
        status: plan.status,
      })),
      changeOrders: changeOrders.map((changeOrder) => ({
        id: changeOrder._id,
        jobId: changeOrder.jobId,
        customerId: changeOrder.customerId,
        propertyId: changeOrder.propertyId,
        estimateId: changeOrder.estimateId,
        title: changeOrder.title,
        description: changeOrder.description,
        status: changeOrder.status,
        requestedByName: changeOrder.requestedByName,
        approvedByName: changeOrder.approvedByName,
        approvedByEmail: changeOrder.approvedByEmail,
        revenueDeltaCents: changeOrder.revenueDeltaCents,
        estimatedCostDeltaCents: changeOrder.estimatedCostDeltaCents,
        grossProfitDeltaCents: changeOrder.grossProfitDeltaCents,
        grossMarginPercent: changeOrder.grossMarginPercent,
        scheduleImpactDays: changeOrder.scheduleImpactDays,
        requestedAt: changeOrder.requestedAt,
        approvedAt: changeOrder.approvedAt,
        taskId: changeOrder.taskId,
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
      notes: notes.map((note) => ({
        id: note._id,
        entityType: note.entityType,
        entityId: note.entityId,
        body: note.body,
        visibility: note.visibility,
        createdByUserId: note.createdByUserId,
        createdAt: note.createdAt,
      })),
      files: files.map((file) => ({
        id: file._id,
        entityType: file.entityType,
        entityId: file.entityId,
        fileName: file.fileName,
        contentType: file.contentType,
        size: file.size,
        createdByUserId: file.createdByUserId,
        createdAt: file.createdAt,
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
    callOutcome: v.optional(callOutcome),
    createCallFollowUp: v.optional(v.boolean()),
    followUpDueInDays: v.optional(v.number()),
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

    const shouldLogCall = args.leadType === "phone_call" || Boolean(args.callOutcome);
    if (shouldLogCall) {
      await ctx.db.insert("activities", {
        organizationId: org._id,
        entityType: "customer",
        entityId: customerId,
        kind: "call",
        summary: `Phone intake: ${callOutcomeLabel(args.callOutcome)}${args.message ? ` - ${args.message}` : ""}`,
        metadata: {
          leadId,
          opportunityId,
          phone: args.phone,
          source,
          urgency: args.urgency ?? "normal",
          callOutcome: args.callOutcome,
        },
        actorUserId: owner?.userId,
        occurredAt: now,
      });
    }

    if (args.createCallFollowUp) {
      const days = followUpDays(args.followUpDueInDays);
      await ctx.db.insert("tasks", {
        organizationId: org._id,
        entityType: "customer",
        entityId: customerId,
        title: `Call follow-up: ${args.title}`,
        description: args.message,
        status: "open",
        priority: (args.urgency ?? "normal") === "high" ? "high" : "normal",
        dueAt: now + days * 24 * 60 * 60 * 1000,
        assignedUserId: owner?.userId,
        createdByUserId: owner?.userId,
        createdAt: now,
        updatedAt: now,
      });
    }

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

export const createLeadForCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    propertyId: v.optional(v.id("properties")),
    title: v.string(),
    source: v.string(),
    valueCents: v.number(),
    serviceLine: serviceCategory,
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== org._id) throw new Error("Customer not found.");
    const property = args.propertyId
      ? await ctx.db.get(args.propertyId)
      : await ctx.db.query("properties").withIndex("by_org_customer", (q) => q.eq("organizationId", org._id).eq("customerId", args.customerId)).first();
    if (!property || property.organizationId !== org._id || property.customerId !== args.customerId) throw new Error("Property not found for this customer.");
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_org_customer", (q) => q.eq("organizationId", org._id).eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();
    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    const now = Date.now();
    const accountType = customer.type === "commercial" ? "commercial" : "residential";

    const leadId = await ctx.db.insert("leads", {
      organizationId: org._id,
      customerId: args.customerId,
      contactId: contact?._id,
      propertyId: property._id,
      title: args.title,
      source: args.source,
      leadType: "other",
      accountType,
      email: contact?.email,
      mobilePhone: contact?.phone ?? contact?.mobilePhone,
      normalizedPhone: (contact?.phone ?? contact?.mobilePhone)?.replace(/\D/g, ""),
      message: args.message,
      programRequests: [args.serviceLine],
      status: "new",
      urgency: "normal",
      ownerUserId: owner?.userId,
      spamScore: 0,
      spamReasons: [],
      qualityScore: 86,
      receivedAt: now,
      rawPayload: args,
      createdAt: now,
      updatedAt: now,
    });
    const opportunityId = await ctx.db.insert("opportunities", {
      organizationId: org._id,
      leadId,
      customerId: args.customerId,
      propertyId: property._id,
      title: args.title,
      stage: "qualified",
      valueCents: args.valueCents,
      closeProbability: 45,
      expectedCloseDate: now + 10 * 24 * 60 * 60 * 1000,
      ownerUserId: owner?.userId,
      serviceLines: [args.serviceLine],
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("activities", {
      organizationId: org._id,
      entityType: "customer",
      entityId: args.customerId,
      kind: "system",
      summary: `Repeat service request created: ${args.title}`,
      metadata: { leadId, opportunityId, source: args.source, serviceLine: args.serviceLine },
      actorUserId: owner?.userId,
      occurredAt: now,
    });
    await ctx.db.insert("auditEvents", { organizationId: org._id, actorUserId: owner?.userId, action: "demo.lead.create_repeat_customer", entityType: "lead", entityId: leadId, summary: `Created repeat-customer lead ${args.title}`, after: { customerId: args.customerId, propertyId: property._id, opportunityId }, createdAt: now });
    return { leadId, opportunityId };
  },
});

export const createEstimateFromOpportunity = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    status: v.optional(v.union(v.literal("draft"), v.literal("sent"))),
    lineItemName: v.string(),
    quantity: v.number(),
    unit: v.string(),
    unitPriceCents: v.number(),
    terms: v.optional(v.string()),
    servicePackageId: v.optional(v.id("servicePackages")),
    serviceCatalogItemId: v.optional(v.id("serviceCatalogItems")),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity || opportunity.organizationId !== org._id) throw new Error("Opportunity not found.");
    const [servicePackage, serviceCatalogItem] = await Promise.all([
      args.servicePackageId ? ctx.db.get(args.servicePackageId) : undefined,
      args.serviceCatalogItemId ? ctx.db.get(args.serviceCatalogItemId) : undefined,
    ]);
    if (args.servicePackageId && (!servicePackage || servicePackage.organizationId !== org._id)) throw new Error("Service package not found.");
    if (args.serviceCatalogItemId && (!serviceCatalogItem || serviceCatalogItem.organizationId !== org._id)) throw new Error("Service catalog item not found.");
    const now = Date.now();
    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    const subtotalCents = Math.max(0, Math.round(args.quantity * args.unitPriceCents));
    const number = estimateNumber(now);
    const estimateId = await ctx.db.insert("estimates", {
      organizationId: org._id,
      opportunityId: opportunity._id,
      customerId: opportunity.customerId,
      propertyId: opportunity.propertyId,
      estimateNumber: number,
      status: args.status ?? "draft",
      approvalStatus: "not_required",
      subtotalCents,
      taxCents: 0,
      totalCents: subtotalCents,
      sentAt: args.status === "sent" ? now : undefined,
      expiresAt: args.status === "sent" ? now + 14 * 24 * 60 * 60 * 1000 : undefined,
      terms: args.terms,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("estimateLineItems", {
      organizationId: org._id,
      estimateId,
      servicePackageId: args.servicePackageId,
      serviceCatalogItemId: args.serviceCatalogItemId,
      name: args.lineItemName,
      quantity: args.quantity,
      unit: args.unit,
      unitPriceCents: args.unitPriceCents,
      totalCents: subtotalCents,
      order: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(opportunity._id, {
      stage: args.status === "sent" ? "proposal_sent" : "estimating",
      valueCents: subtotalCents,
      updatedAt: now,
    });
    await ctx.db.insert("activities", {
      organizationId: org._id,
      entityType: "opportunity",
      entityId: opportunity._id,
      kind: "estimate",
      summary: `Created ${number} from lead context`,
      metadata: { estimateId, totalCents: subtotalCents },
      actorUserId: owner?.userId,
      occurredAt: now,
    });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: owner?.userId,
      action: "demo.estimate.create_from_opportunity",
      entityType: "estimate",
      entityId: estimateId,
      summary: `Created estimate ${number} for ${opportunity.title}`,
      after: { estimateId, opportunityId: opportunity._id, servicePackageId: args.servicePackageId, serviceCatalogItemId: args.serviceCatalogItemId, totalCents: subtotalCents },
      createdAt: now,
    });
    return { estimateId, estimateNumber: number };
  },
});

export const sendEstimateToCustomer = mutation({
  args: {
    estimateId: v.id("estimates"),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const estimate = await ctx.db.get(args.estimateId);
    if (!estimate || estimate.organizationId !== org._id) throw new Error("Estimate not found.");
    if (estimate.status === "accepted" || estimate.status === "declined" || estimate.status === "expired") {
      throw new Error("Only draft or previously sent estimates can be sent to the customer.");
    }
    const approvalRequests = await ctx.db.query("approvalRequests").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect();
    const blockingApproval = approvalRequests.find((request) => request.organizationId === org._id && (request.status === "pending" || request.status === "rejected"));
    if (blockingApproval) throw new Error("Internal approval is required before this quote can be sent.");

    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    const now = Date.now();
    const expiresAt = estimate.expiresAt ?? now + 14 * 24 * 60 * 60 * 1000;
    await ctx.db.patch(estimate._id, {
      status: "sent",
      sentAt: now,
      expiresAt,
      approvalStatus: estimate.approvalStatus ?? "not_required",
      updatedAt: now,
    });
    if (estimate.opportunityId) {
      await ctx.db.patch(estimate.opportunityId, { stage: "proposal_sent", updatedAt: now });
    }
    await ctx.db.insert("activities", {
      organizationId: org._id,
      entityType: "estimate",
      entityId: estimate._id,
      kind: "estimate",
      summary: `Sent ${estimate.estimateNumber} to customer`,
      metadata: { estimateId: estimate._id, customerId: estimate.customerId, opportunityId: estimate.opportunityId, expiresAt },
      actorUserId: owner?.userId,
      occurredAt: now,
    });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: owner?.userId,
      action: "demo.estimate.send_to_customer",
      entityType: "estimate",
      entityId: estimate._id,
      summary: `Sent estimate ${estimate.estimateNumber} to customer`,
      after: { estimateId: estimate._id, customerId: estimate.customerId, opportunityId: estimate.opportunityId, expiresAt },
      createdAt: now,
    });
    return { estimateId: estimate._id, estimateNumber: estimate.estimateNumber, sentAt: now, expiresAt };
  },
});

export const acceptEstimateFromCustomer = mutation({
  args: {
    estimateId: v.id("estimates"),
    acceptedByName: v.optional(v.string()),
    acceptedByEmail: v.optional(v.string()),
    acceptanceSource: v.optional(v.union(v.literal("customer_portal"), v.literal("email"), v.literal("verbal"), v.literal("office"))),
    acceptanceNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const estimate = await ctx.db.get(args.estimateId);
    if (!estimate || estimate.organizationId !== org._id) throw new Error("Estimate not found.");
    if (estimate.status === "accepted") return { estimateId: estimate._id, estimateNumber: estimate.estimateNumber, acceptedAt: estimate.acceptedAt ?? Date.now() };
    if (estimate.status !== "sent") throw new Error("Only sent estimates can be accepted by the customer.");
    if (estimate.approvalStatus === "pending" || estimate.approvalStatus === "rejected") throw new Error("Internal approval is required before customer approval can be captured.");

    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    const now = Date.now();
    await ctx.db.patch(estimate._id, {
      status: "accepted",
      acceptedAt: now,
      acceptedByName: args.acceptedByName,
      acceptedByEmail: args.acceptedByEmail,
      acceptanceSource: args.acceptanceSource ?? "office",
      acceptanceNote: args.acceptanceNote,
      updatedAt: now,
    });
    if (estimate.opportunityId) {
      await ctx.db.patch(estimate.opportunityId, { stage: "won", closeProbability: 100, updatedAt: now });
    }
    await ctx.db.insert("activities", {
      organizationId: org._id,
      entityType: "estimate",
      entityId: estimate._id,
      kind: "estimate",
      summary: `Customer accepted ${estimate.estimateNumber}`,
      metadata: {
        estimateId: estimate._id,
        customerId: estimate.customerId,
        opportunityId: estimate.opportunityId,
        acceptedByName: args.acceptedByName,
        acceptedByEmail: args.acceptedByEmail,
        acceptanceSource: args.acceptanceSource ?? "office",
      },
      actorUserId: owner?.userId,
      occurredAt: now,
    });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: owner?.userId,
      action: "demo.estimate.accept_from_customer",
      entityType: "estimate",
      entityId: estimate._id,
      summary: `Captured customer approval for ${estimate.estimateNumber}`,
      after: {
        estimateId: estimate._id,
        acceptedAt: now,
        acceptedByName: args.acceptedByName,
        acceptedByEmail: args.acceptedByEmail,
        acceptanceSource: args.acceptanceSource ?? "office",
      },
      createdAt: now,
    });
    return { estimateId: estimate._id, estimateNumber: estimate.estimateNumber, acceptedAt: now };
  },
});

export const convertEstimateToJob = mutation({
  args: {
    estimateId: v.id("estimates"),
    scheduledStart: v.optional(v.number()),
    scheduledEnd: v.optional(v.number()),
    crewId: v.optional(v.id("crews")),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const estimate = await ctx.db.get(args.estimateId);
    if (!estimate || estimate.organizationId !== org._id) throw new Error("Estimate not found.");
    if (estimate.status !== "accepted") throw new Error("Customer approval is required before an estimate can become a job.");

    const existingJobs = await ctx.db.query("jobs").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect();
    const existingJob = existingJobs.find((job) => job.estimateId === estimate._id);
    if (existingJob) {
      const existingVisit = await ctx.db.query("jobVisits").withIndex("by_job", (q) => q.eq("jobId", existingJob._id)).first();
      return {
        estimateId: estimate._id,
        estimateNumber: estimate.estimateNumber,
        jobId: existingJob._id,
        visitId: existingVisit?._id,
        jobTitle: existingJob.title,
        alreadyConverted: true,
      };
    }

    const [opportunity, lineItems, owner, crews] = await Promise.all([
      estimate.opportunityId ? ctx.db.get(estimate.opportunityId) : null,
      ctx.db.query("estimateLineItems").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect(),
      ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first(),
      ctx.db.query("crews").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
    ]);
    if (opportunity && opportunity.organizationId !== org._id) throw new Error("Opportunity not found.");

    const packages = await Promise.all(
      lineItems
        .filter((item) => item.organizationId === org._id && item.servicePackageId)
        .map((item) => ctx.db.get(item.servicePackageId as Id<"servicePackages">)),
    );
    const servicePackage = packages.find((item) => item && item.organizationId === org._id);
    const selectedCrew = args.crewId
      ? crews.find((crew) => crew._id === args.crewId && crew.organizationId === org._id)
      : crews.find((crew) => crew.active) ?? crews[0];
    if (args.crewId && !selectedCrew) throw new Error("Crew not found.");

    const now = Date.now();
    const defaultStart = (() => {
      const value = new Date(now + 24 * 60 * 60 * 1000);
      value.setHours(8, 30, 0, 0);
      return value.getTime();
    })();
    const scheduledStart = args.scheduledStart ?? defaultStart;
    const scheduledEnd = args.scheduledEnd ?? scheduledStart + Math.max(90, Math.round((servicePackage?.laborHours ?? 2) * 60)) * 60 * 1000;
    const title = opportunity?.title ?? `Job from ${estimate.estimateNumber}`;

    const jobId = await ctx.db.insert("jobs", {
      organizationId: org._id,
      customerId: estimate.customerId,
      propertyId: estimate.propertyId,
      opportunityId: estimate.opportunityId,
      estimateId: estimate._id,
      title,
      status: "scheduled",
      priority: "normal",
      startDate: scheduledStart,
      managerUserId: owner?.userId,
      createdAt: now,
      updatedAt: now,
    });

    const phaseNames = ["Sales handoff", "Production visit", "Completion review"];
    for (const [index, name] of phaseNames.entries()) {
      await ctx.db.insert("jobPhases", {
        organizationId: org._id,
        jobId,
        name,
        status: "scheduled",
        sortOrder: index + 1,
        startDate: index === 0 ? now : scheduledStart,
        dueDate: index === 0 ? scheduledStart : scheduledEnd + index * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
    }

    const checklistLabels = [
      "Confirm approved estimate scope",
      ...(servicePackage?.checklistDefaults ?? []),
      "Complete approved service scope",
      "Capture completion photos",
    ];
    const visitId = await ctx.db.insert("jobVisits", {
      organizationId: org._id,
      jobId,
      customerId: estimate.customerId,
      propertyId: estimate.propertyId,
      scheduledStart,
      scheduledEnd,
      status: "scheduled",
      routeOrder: 1,
      assignedCrewId: selectedCrew?._id,
      checklist: checklistLabels.slice(0, 8).map((label, index) => ({
        id: `handoff-${index + 1}`,
        label,
        isDone: false,
      })),
      notes: `Created from approved estimate ${estimate.estimateNumber}.`,
      createdAt: now,
      updatedAt: now,
    });

    if (selectedCrew) {
      await ctx.db.insert("visitAssignments", {
        organizationId: org._id,
        visitId,
        crewId: selectedCrew._id,
        role: "Primary crew",
        status: "assigned",
        createdAt: now,
        updatedAt: now,
      });
    }

    const taskId = await ctx.db.insert("tasks", {
      organizationId: org._id,
      entityType: "job",
      entityId: jobId,
      title: "Confirm schedule and crew handoff",
      status: "open",
      priority: "high",
      dueAt: Math.max(now, scheduledStart - 4 * 60 * 60 * 1000),
      assignedUserId: owner?.userId,
      createdByUserId: owner?.userId,
      createdAt: now,
      updatedAt: now,
    });

    const estimatedLaborCostCents = Math.round((servicePackage?.laborHours ?? 2) * (servicePackage?.laborRateCents ?? 3500));
    const estimatedMaterialCostCents = servicePackage?.materialCostCents ?? 0;
    const estimatedEquipmentCostCents = servicePackage?.equipmentCostCents ?? 0;
    const overheadCostCents = Math.round((estimatedLaborCostCents + estimatedMaterialCostCents + estimatedEquipmentCostCents) * ((servicePackage?.overheadPercent ?? 15) / 100));
    const estimatedCostCents = estimatedLaborCostCents + estimatedMaterialCostCents + estimatedEquipmentCostCents + overheadCostCents;
    const grossProfitCents = estimate.totalCents - estimatedCostCents;
    await ctx.db.insert("jobCostSummaries", {
      organizationId: org._id,
      jobId,
      customerId: estimate.customerId,
      estimatedRevenueCents: estimate.totalCents,
      actualRevenueCents: estimate.totalCents,
      invoicedCents: 0,
      collectedCents: 0,
      estimatedLaborCostCents,
      actualLaborCostCents: 0,
      estimatedMaterialCostCents,
      actualMaterialCostCents: 0,
      estimatedEquipmentCostCents,
      actualEquipmentCostCents: 0,
      overheadCostCents,
      grossProfitCents,
      grossMarginPercent: estimate.totalCents > 0 ? Math.round((grossProfitCents / estimate.totalCents) * 1000) / 10 : 0,
      varianceCents: 0,
      calculatedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("activities", {
      organizationId: org._id,
      entityType: "job",
      entityId: jobId,
      kind: "system",
      summary: `Converted ${estimate.estimateNumber} to job ${title}`,
      metadata: { estimateId: estimate._id, opportunityId: estimate.opportunityId, visitId, taskId },
      actorUserId: owner?.userId,
      occurredAt: now,
    });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: owner?.userId,
      action: "demo.estimate.convert_to_job",
      entityType: "job",
      entityId: jobId,
      summary: `Converted estimate ${estimate.estimateNumber} to job`,
      after: { estimateId: estimate._id, opportunityId: estimate.opportunityId, jobId, visitId, taskId, crewId: selectedCrew?._id },
      createdAt: now,
    });

    return { estimateId: estimate._id, estimateNumber: estimate.estimateNumber, jobId, visitId, jobTitle: title, alreadyConverted: false };
  },
});

export const decideApprovalRequest = mutation({
  args: {
    approvalRequestId: v.id("approvalRequests"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const request = await ctx.db.get(args.approvalRequestId);
    if (!request || request.organizationId !== org._id) throw new Error("Approval request not found.");
    if (request.status !== "pending") throw new Error("Approval request has already been decided.");
    const estimate = await ctx.db.get(request.estimateId);
    if (!estimate || estimate.organizationId !== org._id) throw new Error("Estimate not found.");
    const approver = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).filter((q) => q.or(q.eq(q.field("role"), "owner"), q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "manager"))).first();
    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: args.decision,
      decidedByUserId: approver?.userId,
      decidedAt: now,
      decisionComment: args.comment,
      updatedAt: now,
    });
    await ctx.db.patch(estimate._id, {
      approvalStatus: args.decision,
      approvalRequestId: request._id,
      updatedAt: now,
    });
    await ctx.db.insert("activities", {
      organizationId: org._id,
      entityType: "estimate",
      entityId: estimate._id,
      kind: "system",
      summary: `${args.decision === "approved" ? "Approved" : "Rejected"} internal approval for ${estimate.estimateNumber}`,
      metadata: { approvalRequestId: request._id, decision: args.decision, comment: args.comment },
      actorUserId: approver?.userId,
      occurredAt: now,
    });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: approver?.userId,
      action: `demo.estimate.approval.${args.decision}`,
      entityType: "estimate",
      entityId: estimate._id,
      summary: `${args.decision === "approved" ? "Approved" : "Rejected"} ${estimate.estimateNumber}`,
      after: { approvalRequestId: request._id, decision: args.decision, comment: args.comment },
      createdAt: now,
    });
    return { approvalRequestId: request._id, status: args.decision };
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
    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    const now = Date.now();
    await ctx.db.patch(args.visitId, { assignedCrewId: args.crewId, updatedAt: now });
    const existingAssignments = await ctx.db.query("visitAssignments").withIndex("by_visit", (q) => q.eq("visitId", args.visitId)).collect();
    const primaryAssignment = existingAssignments.find((assignment) => assignment.organizationId === org._id && assignment.role === "Primary crew");
    if (primaryAssignment) {
      await ctx.db.patch(primaryAssignment._id, { crewId: args.crewId, status: "assigned", updatedAt: now });
    } else {
      await ctx.db.insert("visitAssignments", {
        organizationId: org._id,
        visitId: args.visitId,
        crewId: args.crewId,
        role: "Primary crew",
        status: "assigned",
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: owner?.userId,
      action: "demo.visit.assign",
      entityType: "visit",
      entityId: args.visitId,
      summary: `Assigned visit to ${crew.name}`,
      before: { assignedCrewId: visit.assignedCrewId },
      after: { assignedCrewId: args.crewId },
      createdAt: now,
    });
  },
});

export const reorderVisit = mutation({
  args: { visitId: v.id("jobVisits"), routeOrder: v.number() },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.organizationId !== org._id) throw new Error("Visit not found.");
    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    const routeOrder = Math.max(1, Math.round(args.routeOrder));
    const now = Date.now();
    await ctx.db.patch(args.visitId, { routeOrder, updatedAt: now });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: owner?.userId,
      action: "demo.visit.reorder",
      entityType: "visit",
      entityId: args.visitId,
      summary: `Moved visit from stop ${visit.routeOrder} to stop ${routeOrder}`,
      before: { routeOrder: visit.routeOrder },
      after: { routeOrder },
      createdAt: now,
    });
    return { visitId: args.visitId, routeOrder };
  },
});

export const generateRecurringRoute = mutation({
  args: {
    jobId: v.id("jobs"),
    frequency: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly"), v.literal("seasonal"), v.literal("custom")),
    count: v.number(),
    firstStart: v.number(),
    durationMinutes: v.number(),
    crewId: v.optional(v.id("crews")),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.organizationId !== org._id) throw new Error("Job not found.");
    const crew = args.crewId ? await ctx.db.get(args.crewId) : null;
    if (args.crewId && (!crew || crew.organizationId !== org._id)) throw new Error("Crew not found.");

    const intervalDaysByFrequency = { weekly: 7, biweekly: 14, monthly: 28, seasonal: 90, custom: 7 } as const;
    const count = Math.max(1, Math.min(26, Math.round(args.count)));
    const durationMinutes = Math.max(30, Math.min(12 * 60, Math.round(args.durationMinutes)));
    const intervalDays = intervalDaysByFrequency[args.frequency];
    const now = Date.now();
    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    const existingVisits = await ctx.db.query("jobVisits").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect();
    const routeOrderStart = existingVisits.reduce((max, visit) => Math.max(max, visit.routeOrder ?? 0), 0);

    const planId = await ctx.db.insert("recurringServicePlans", {
      organizationId: org._id,
      customerId: job.customerId,
      propertyId: job.propertyId,
      jobId: job._id,
      crewId: args.crewId,
      name: `${job.title} ${args.frequency} route`,
      frequency: args.frequency,
      intervalDays,
      visitDurationMinutes: durationMinutes,
      nextRunAt: args.firstStart,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const visitIds: Array<Id<"jobVisits">> = [];
    for (let index = 0; index < count; index += 1) {
      const scheduledStart = args.firstStart + index * intervalDays * 24 * 60 * 60 * 1000;
      const visitId = await ctx.db.insert("jobVisits", {
        organizationId: org._id,
        jobId: job._id,
        customerId: job.customerId,
        propertyId: job.propertyId,
        scheduledStart,
        scheduledEnd: scheduledStart + durationMinutes * 60 * 1000,
        status: "scheduled",
        routeOrder: routeOrderStart + index + 1,
        assignedCrewId: args.crewId,
        checklist: [
          { id: "recurring-1", label: "Confirm recurring scope and property access", isDone: false },
          { id: "recurring-2", label: "Complete scheduled recurring service", isDone: false },
          { id: "recurring-3", label: "Log materials, issues, and customer notes", isDone: false },
        ],
        notes: `Generated from recurring plan ${planId}.`,
        createdAt: now,
        updatedAt: now,
      });
      visitIds.push(visitId);
      if (args.crewId) {
        await ctx.db.insert("visitAssignments", {
          organizationId: org._id,
          visitId,
          crewId: args.crewId,
          role: "Primary crew",
          status: "assigned",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await ctx.db.patch(planId, {
      lastGeneratedAt: now,
      generatedVisitIds: visitIds,
      nextRunAt: args.firstStart + count * intervalDays * 24 * 60 * 60 * 1000,
      updatedAt: now,
    });
    await ctx.db.patch(job._id, { recurrence: args.frequency, updatedAt: now });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: owner?.userId,
      action: "demo.recurring_route.generate",
      entityType: "job",
      entityId: job._id,
      summary: `Generated ${visitIds.length} ${args.frequency} visits for ${job.title}`,
      after: { planId, visitIds, frequency: args.frequency, intervalDays, count },
      createdAt: now,
    });

    return { planId, visitIds, generatedCount: visitIds.length, nextRunAt: args.firstStart + count * intervalDays * 24 * 60 * 60 * 1000 };
  },
});

export const startVisit = mutation({
  args: {
    visitId: v.id("jobVisits"),
    startSource: v.optional(v.union(v.literal("manual"), v.literal("gps"))),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.organizationId !== org._id) throw new Error("Visit not found.");
    if (visit.status === "complete" || visit.status === "canceled") throw new Error("Completed or canceled visits cannot be started.");
    const now = Date.now();
    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    await ctx.db.patch(args.visitId, { status: "on_site", updatedAt: now });
    const existingEntries = await ctx.db.query("timesheetEntries").withIndex("by_visit", (q) => q.eq("visitId", args.visitId)).collect();
    const existingEntry = existingEntries.find((entry) => entry.status === "draft");
    const timesheetPatch = {
      userId: owner?.userId,
      crewId: visit.assignedCrewId,
      jobId: visit.jobId,
      visitId: args.visitId,
      status: "draft" as const,
      roleName: "field tech",
      startSource: args.startSource ?? "manual",
      startedLatitude: args.latitude,
      startedLongitude: args.longitude,
      startedAt: existingEntry?.startedAt ?? now,
      endedAt: existingEntry?.endedAt ?? now,
      breakMinutes: existingEntry?.breakMinutes ?? 0,
      hours: existingEntry?.hours ?? 0,
      hourlyCostCents: existingEntry?.hourlyCostCents ?? 0,
      totalCostCents: existingEntry?.totalCostCents ?? 0,
      notes: "Visit started from field workflow.",
      updatedAt: now,
    };
    const timesheetEntryId = existingEntry
      ? (await ctx.db.patch(existingEntry._id, timesheetPatch), existingEntry._id)
      : await ctx.db.insert("timesheetEntries", {
          organizationId: org._id,
          ...timesheetPatch,
          createdAt: now,
        });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: owner?.userId,
      action: "demo.visit.start",
      entityType: "visit",
      entityId: args.visitId,
      summary: "Started field visit",
      after: { status: "on_site", timesheetEntryId, startSource: args.startSource ?? "manual" },
      createdAt: now,
    });
    await ctx.db.insert("activities", {
      organizationId: org._id,
      entityType: "visit",
      entityId: args.visitId,
      kind: "visit",
      summary: "Started field visit",
      metadata: { action: "demo.visit.start", timesheetEntryId },
      actorUserId: owner?.userId,
      occurredAt: now,
    });
    return { visitId: args.visitId, timesheetEntryId, startedAt: timesheetPatch.startedAt };
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
  args: {
    visitId: v.id("jobVisits"),
    issueFlag: v.optional(v.string()),
    issue: v.optional(
      v.object({
        category: fieldIssueCategory,
        severity: v.optional(fieldIssueSeverity),
        summary: v.string(),
        details: v.optional(v.string()),
        customerVisible: v.optional(v.boolean()),
        createOpportunity: v.optional(v.boolean()),
        serviceCategory: v.optional(serviceCategory),
        estimatedValueCents: v.optional(v.number()),
      }),
    ),
    notes: v.optional(v.string()),
    materialApplications: v.optional(
      v.array(
        v.object({
          materialId: v.id("materials"),
          quantity: v.number(),
          unit: v.string(),
          targetAreaId: v.optional(v.id("propertyAreas")),
          notes: v.optional(v.string()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.organizationId !== org._id) throw new Error("Visit not found.");
    const now = Date.now();
    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    const fieldIssue = normalizeDemoFieldIssue(args.issueFlag, args.issue);
    await ctx.db.patch(args.visitId, {
      status: "complete",
      completedAt: now,
      notes: args.notes ?? visit.notes,
      issueFlags: fieldIssue ? [...(visit.issueFlags ?? []), fieldIssue.summary] : visit.issueFlags,
      updatedAt: now,
    });

    const existingTimesheets = await ctx.db.query("timesheetEntries").withIndex("by_visit", (q) => q.eq("visitId", args.visitId)).collect();
    const draftTimesheet = existingTimesheets.find((entry) => entry.status === "draft");
    const startedAt = draftTimesheet?.startedAt ?? Math.min(visit.scheduledStart, now);
    const hours = Math.max(0.25, Math.round(((now - startedAt) / (60 * 60 * 1000)) * 100) / 100);
    const hourlyCostCents = draftTimesheet?.hourlyCostCents ?? 0;
    const timesheetEntryId = draftTimesheet
      ? (await ctx.db.patch(draftTimesheet._id, {
          status: "submitted",
          endedAt: now,
          hours,
          totalCostCents: Math.round(hours * hourlyCostCents),
          notes: args.notes ?? draftTimesheet.notes ?? "Visit submitted from field workflow.",
          updatedAt: now,
        }), draftTimesheet._id)
      : await ctx.db.insert("timesheetEntries", {
          organizationId: org._id,
          userId: owner?.userId,
          crewId: visit.assignedCrewId,
          jobId: visit.jobId,
          visitId: args.visitId,
          status: "submitted",
          roleName: "field tech",
          startSource: "manual",
          startedAt,
          endedAt: now,
          breakMinutes: 0,
          hours,
          hourlyCostCents,
          totalCostCents: Math.round(hours * hourlyCostCents),
          notes: args.notes ?? "Visit submitted from field workflow.",
          createdAt: now,
          updatedAt: now,
        });

    const weather = await ctx.db.query("weatherSnapshots").withIndex("by_visit", (q) => q.eq("visitId", args.visitId)).first();
    for (const application of args.materialApplications ?? []) {
      const material = await ctx.db.get(application.materialId);
      if (!material || material.organizationId !== org._id) throw new Error("Material not found.");
      if (application.targetAreaId) {
        const targetArea = await ctx.db.get(application.targetAreaId);
        if (!targetArea || targetArea.organizationId !== org._id) throw new Error("Target area not found.");
      }
      await ctx.db.insert("materialApplications", {
        organizationId: org._id,
        visitId: args.visitId,
        materialId: application.materialId,
        quantity: application.quantity,
        unit: application.unit,
        targetAreaId: application.targetAreaId,
        weatherSnapshot: weather
          ? {
              observedAt: weather.observedAt,
              temperatureF: weather.temperatureF,
              windMph: weather.windMph,
              precipitationProbability: weather.precipitationProbability,
              conditions: weather.conditions,
              applicationRisk: weather.applicationRisk,
            }
          : undefined,
        notes: application.notes,
        createdAt: now,
        updatedAt: now,
      });
    }
    let issueTaskId: Id<"tasks"> | undefined;
    let issueOpportunityId: Id<"opportunities"> | undefined;
    let fieldIssueId: Id<"fieldIssues"> | undefined;
    if (fieldIssue) {
      const categoryLabel = fieldIssueCategoryLabel(fieldIssue.category);
      issueTaskId = await ctx.db.insert("tasks", {
        organizationId: org._id,
        entityType: "visit",
        entityId: args.visitId,
        title: fieldIssue.structured ? `${categoryLabel}: ${fieldIssue.summary}` : fieldIssue.summary,
        description: [
          `Severity: ${fieldIssue.severity}.`,
          fieldIssue.details ? `Details: ${fieldIssue.details}` : undefined,
          fieldIssue.customerVisible ? "Customer-visible follow-up." : "Internal follow-up.",
        ].filter(Boolean).join(" "),
        status: "open",
        priority: priorityForFieldIssue(fieldIssue.severity),
        dueAt: now + (fieldIssue.severity === "urgent" ? 4 : 24) * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
      if (fieldIssue.createOpportunity) {
        issueOpportunityId = await ctx.db.insert("opportunities", {
          organizationId: org._id,
          customerId: visit.customerId,
          propertyId: visit.propertyId,
          title: `Field upsell: ${fieldIssue.summary}`,
          stage: "qualified",
          valueCents: fieldIssue.estimatedValueCents,
          closeProbability: 35,
          expectedCloseDate: now + 7 * 24 * 60 * 60 * 1000,
          ownerUserId: owner?.userId,
          serviceLines: [fieldIssue.serviceCategory],
          createdAt: now,
          updatedAt: now,
        });
      }
      fieldIssueId = await ctx.db.insert("fieldIssues", {
        organizationId: org._id,
        visitId: args.visitId,
        jobId: visit.jobId,
        customerId: visit.customerId,
        propertyId: visit.propertyId,
        taskId: issueTaskId,
        opportunityId: issueOpportunityId,
        category: fieldIssue.category,
        severity: fieldIssue.severity,
        status: "open",
        summary: fieldIssue.summary,
        details: fieldIssue.details,
        customerVisible: fieldIssue.customerVisible,
        createdByUserId: owner?.userId,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.insert("activities", {
      organizationId: org._id,
      entityType: "visit",
      entityId: args.visitId,
      kind: "visit",
      summary: fieldIssue ? `Submitted visit completion with field issue: ${fieldIssue.summary}` : "Submitted visit completion from field PWA",
      metadata: {
        materialApplicationCount: args.materialApplications?.length ?? 0,
        timesheetEntryId,
        issueCategory: fieldIssue?.category,
        issueSeverity: fieldIssue?.severity,
        fieldIssueId,
        issueTaskId,
        issueOpportunityId,
      },
      occurredAt: now,
    });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: owner?.userId,
      action: "demo.visit.submit",
      entityType: "visit",
      entityId: args.visitId,
      summary: "Submitted field visit completion",
      after: {
        status: "complete",
        issueFlag: args.issueFlag,
        issueCategory: fieldIssue?.category,
        issueSeverity: fieldIssue?.severity,
        fieldIssueId,
        issueTaskId,
        issueOpportunityId,
        materialApplicationCount: args.materialApplications?.length ?? 0,
        timesheetEntryId,
      },
      createdAt: now,
    });
    return { visitId: args.visitId, timesheetEntryId, fieldIssueId, issueTaskId, issueOpportunityId };
  },
});

export const addTask = mutation({
  args: {
    jobId: v.id("jobs"),
    title: v.string(),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
    dueAt: v.optional(v.number()),
    assignedUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.organizationId !== org._id) throw new Error("Job not found.");
    if (args.assignedUserId) {
      const assignedUserId = args.assignedUserId;
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_org_user", (q) => q.eq("organizationId", org._id).eq("userId", assignedUserId))
        .first();
      if (!membership || membership.status !== "active") throw new Error("Assigned user is not an active member.");
    }
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      organizationId: org._id,
      entityType: "job",
      entityId: args.jobId,
      title: args.title,
      status: "open",
      priority: args.priority ?? "normal",
      dueAt: args.dueAt ?? now + 48 * 60 * 60 * 1000,
      assignedUserId: args.assignedUserId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      action: "demo.task.create",
      entityType: "job",
      entityId: args.jobId,
      summary: `Created task ${args.title}`,
      after: { taskId, priority: args.priority ?? "normal", dueAt: args.dueAt, assignedUserId: args.assignedUserId },
      createdAt: now,
    });
    return taskId;
  },
});

export const createChangeOrder = mutation({
  args: {
    jobId: v.id("jobs"),
    title: v.string(),
    description: v.string(),
    requestedByName: v.optional(v.string()),
    revenueDeltaCents: v.number(),
    estimatedCostDeltaCents: v.number(),
    scheduleImpactDays: v.number(),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.organizationId !== org._id) throw new Error("Job not found.");
    const title = args.title.trim();
    const description = args.description.trim();
    if (!title || !description) throw new Error("Change order title and description are required.");
    const revenueDeltaCents = Math.max(0, Math.round(args.revenueDeltaCents));
    const estimatedCostDeltaCents = Math.max(0, Math.round(args.estimatedCostDeltaCents));
    const grossProfitDeltaCents = revenueDeltaCents - estimatedCostDeltaCents;
    const grossMarginPercent = revenueDeltaCents > 0 ? Math.round((grossProfitDeltaCents / revenueDeltaCents) * 1000) / 10 : 0;
    const scheduleImpactDays = Math.max(0, Math.min(90, Math.round(args.scheduleImpactDays)));
    const now = Date.now();
    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    const changeOrderId = await ctx.db.insert("changeOrders", {
      organizationId: org._id,
      jobId: job._id,
      customerId: job.customerId,
      propertyId: job.propertyId,
      estimateId: job.estimateId,
      title,
      description,
      status: "pending_approval",
      requestedByName: args.requestedByName?.trim() || undefined,
      revenueDeltaCents,
      estimatedCostDeltaCents,
      grossProfitDeltaCents,
      grossMarginPercent,
      scheduleImpactDays,
      requestedAt: now,
      createdByUserId: owner?.userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: owner?.userId,
      action: "demo.change_order.create",
      entityType: "job",
      entityId: job._id,
      summary: `Created change order ${title}`,
      after: { changeOrderId, revenueDeltaCents, estimatedCostDeltaCents, grossMarginPercent, scheduleImpactDays },
      createdAt: now,
    });
    await ctx.db.insert("activities", {
      organizationId: org._id,
      entityType: "job",
      entityId: job._id,
      kind: "system",
      summary: `Created change order ${title}`,
      metadata: { action: "demo.change_order.create", changeOrderId },
      actorUserId: owner?.userId,
      occurredAt: now,
    });
    return changeOrderId;
  },
});

export const approveChangeOrder = mutation({
  args: {
    changeOrderId: v.id("changeOrders"),
    approvedByName: v.string(),
    approvedByEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const changeOrder = await ctx.db.get(args.changeOrderId);
    if (!changeOrder || changeOrder.organizationId !== org._id) throw new Error("Change order not found.");
    if (changeOrder.status !== "pending_approval" && changeOrder.status !== "draft") throw new Error("Change order is not approvable.");
    const job = await ctx.db.get(changeOrder.jobId);
    if (!job || job.organizationId !== org._id) throw new Error("Job not found.");
    const now = Date.now();
    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    const taskId = await ctx.db.insert("tasks", {
      organizationId: org._id,
      entityType: "job",
      entityId: job._id,
      title: `Schedule approved change order: ${changeOrder.title}`,
      status: "open",
      priority: changeOrder.scheduleImpactDays > 0 ? "high" : "normal",
      dueAt: now + Math.max(1, changeOrder.scheduleImpactDays || 1) * 24 * 60 * 60 * 1000,
      assignedUserId: job.managerUserId,
      createdByUserId: owner?.userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(args.changeOrderId, {
      status: "approved",
      approvedByName: args.approvedByName.trim() || "Customer",
      approvedByEmail: args.approvedByEmail?.trim() || undefined,
      approvedAt: now,
      taskId,
      updatedAt: now,
    });
    if (changeOrder.scheduleImpactDays > 0) {
      const scheduleBase = job.endDate ?? job.startDate ?? now;
      await ctx.db.patch(job._id, { endDate: scheduleBase + changeOrder.scheduleImpactDays * 24 * 60 * 60 * 1000, updatedAt: now });
    }
    const summary = await ctx.db.query("jobCostSummaries").withIndex("by_job", (q) => q.eq("jobId", job._id)).first();
    if (summary) {
      const estimatedRevenueCents = summary.estimatedRevenueCents + changeOrder.revenueDeltaCents;
      const estimatedMaterialCostCents = summary.estimatedMaterialCostCents + changeOrder.estimatedCostDeltaCents;
      const grossProfitCents = summary.grossProfitCents + changeOrder.grossProfitDeltaCents;
      await ctx.db.patch(summary._id, {
        estimatedRevenueCents,
        estimatedMaterialCostCents,
        grossProfitCents,
        grossMarginPercent: estimatedRevenueCents > 0 ? Math.round((grossProfitCents / estimatedRevenueCents) * 1000) / 10 : 0,
        varianceCents: summary.varianceCents + changeOrder.grossProfitDeltaCents,
        calculatedAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: owner?.userId,
      action: "demo.change_order.approve",
      entityType: "job",
      entityId: job._id,
      summary: `Approved change order ${changeOrder.title}`,
      before: { status: changeOrder.status },
      after: { changeOrderId: args.changeOrderId, status: "approved", taskId, revenueDeltaCents: changeOrder.revenueDeltaCents, estimatedCostDeltaCents: changeOrder.estimatedCostDeltaCents, scheduleImpactDays: changeOrder.scheduleImpactDays },
      createdAt: now,
    });
    await ctx.db.insert("activities", {
      organizationId: org._id,
      entityType: "job",
      entityId: job._id,
      kind: "system",
      summary: `Approved change order ${changeOrder.title}`,
      metadata: { action: "demo.change_order.approve", changeOrderId: args.changeOrderId },
      actorUserId: owner?.userId,
      occurredAt: now,
    });
    return { changeOrderId: args.changeOrderId, taskId };
  },
});

export const addActivity = mutation({
  args: {
    entityType: activityEntityType,
    entityId: v.string(),
    kind: activityComposerKind,
    summary: v.string(),
    createFollowUp: v.optional(v.boolean()),
    dueInDays: v.optional(v.number()),
    callOutcome: v.optional(activityCallOutcome),
    opportunityImpact: v.optional(opportunityImpact),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const summary = args.summary.trim();
    if (!summary) throw new Error("Activity summary is required.");

    const target =
      args.entityType === "customer"
        ? await ctx.db.get(args.entityId as Id<"customers">)
        : await ctx.db.get(args.entityId as Id<"jobs">);
    if (!target || target.organizationId !== org._id) throw new Error("Activity target not found.");

    const now = Date.now();
    const activityId = await ctx.db.insert("activities", {
      organizationId: org._id,
      entityType: args.entityType,
      entityId: args.entityId,
      kind: args.kind,
      summary,
      metadata: { callOutcome: args.callOutcome, opportunityImpact: args.opportunityImpact ?? "none" },
      occurredAt: now,
    });

    if (args.entityType === "customer" && args.opportunityImpact && args.opportunityImpact !== "none") {
      const opportunities = await ctx.db.query("opportunities").withIndex("by_customer", (q) => q.eq("customerId", args.entityId as Id<"customers">)).collect();
      const activeOpportunity = opportunities
        .filter((opportunity) => opportunity.stage !== "won" && opportunity.stage !== "lost")
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (activeOpportunity) {
        if (args.opportunityImpact === "advance_stage") {
          const nextStage = activeOpportunity.stage === "new" ? "qualified" : activeOpportunity.stage === "qualified" ? "estimating" : activeOpportunity.stage === "estimating" ? "proposal_sent" : activeOpportunity.stage === "proposal_sent" ? "won" : activeOpportunity.stage;
          await ctx.db.patch(activeOpportunity._id, { stage: nextStage, closeProbability: Math.max(activeOpportunity.closeProbability, nextStage === "won" ? 100 : activeOpportunity.closeProbability + 10), updatedAt: now });
        } else if (args.opportunityImpact === "increase_probability") {
          await ctx.db.patch(activeOpportunity._id, { closeProbability: Math.min(95, activeOpportunity.closeProbability + 10), updatedAt: now });
        } else {
          await ctx.db.patch(activeOpportunity._id, { closeProbability: Math.max(5, activeOpportunity.closeProbability - 15), updatedAt: now });
        }
      }
    }

    if (args.createFollowUp) {
      const dueInDays = Math.max(1, Math.min(30, Math.round(args.dueInDays ?? 2)));
      await ctx.db.insert("tasks", {
        organizationId: org._id,
        entityType: args.entityType,
        entityId: args.entityId,
        title: `Follow up: ${summary.slice(0, 80)}`,
        status: "open",
        priority: "normal",
        dueAt: now + dueInDays * 24 * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
    }

    return activityId;
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

export const upsertServiceCatalogItem = mutation({
  args: {
    itemId: v.optional(v.id("serviceCatalogItems")),
    name: v.string(),
    category: serviceCategory,
    defaultUnit: v.string(),
    defaultPriceCents: v.number(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const now = Date.now();
    const name = args.name.trim();
    const defaultUnit = args.defaultUnit.trim();
    if (!name || !defaultUnit) throw new Error("Service name and default unit are required.");
    if (args.itemId) {
      const item = await ctx.db.get(args.itemId);
      if (!item || item.organizationId !== org._id) throw new Error("Catalog item not found.");
      await ctx.db.patch(args.itemId, {
        name,
        category: args.category,
        defaultUnit,
        defaultPriceCents: Math.max(0, Math.round(args.defaultPriceCents)),
        active: args.active,
        updatedAt: now,
      });
      await ctx.db.insert("auditEvents", {
        organizationId: org._id,
        action: "demo.catalog.update",
        entityType: "service_catalog_item",
        entityId: args.itemId,
        summary: `Updated service ${name}`,
        before: { name: item.name, category: item.category, defaultUnit: item.defaultUnit, defaultPriceCents: item.defaultPriceCents, active: item.active },
        after: { name, category: args.category, defaultUnit, defaultPriceCents: Math.max(0, Math.round(args.defaultPriceCents)), active: args.active },
        createdAt: now,
      });
      return args.itemId;
    }

    const itemId = await ctx.db.insert("serviceCatalogItems", {
      organizationId: org._id,
      name,
      category: args.category,
      defaultUnit,
      defaultPriceCents: Math.max(0, Math.round(args.defaultPriceCents)),
      active: args.active,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      action: "demo.catalog.create",
      entityType: "service_catalog_item",
      entityId: itemId,
      summary: `Created service ${name}`,
      after: { itemId, name, category: args.category, defaultUnit, defaultPriceCents: Math.max(0, Math.round(args.defaultPriceCents)), active: args.active },
      createdAt: now,
    });
    return itemId;
  },
});
