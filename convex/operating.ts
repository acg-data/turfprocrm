import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { activeFertilizationPricingAdjustments, calculateFertilizationProgramPricing } from "../src/domain/fertilization-pricing";
import { commitLeadImportJob, createLeadImportPreviewJob } from "./lib/importRecords";

const DEMO_SLUG = "greenline-demo";

const leadStatus = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("do_estimate"),
  v.literal("estimate_provided"),
  v.literal("follow_up"),
  v.literal("waiting"),
  v.literal("converted"),
  v.literal("lost_confirmed"),
  v.literal("lost_assumed"),
  v.literal("unqualified"),
  v.literal("passed_on"),
  v.literal("disqualified"),
  v.literal("spam"),
);

const leadGrade = v.union(v.literal("a"), v.literal("b"), v.literal("c"), v.literal("d"), v.literal("f"), v.literal("ungraded"));
const role = v.union(v.literal("owner"), v.literal("admin"), v.literal("manager"), v.literal("sales"), v.literal("dispatcher"), v.literal("crew_lead"), v.literal("technician"));
const serviceCategory = v.union(v.literal("lawn_care"), v.literal("landscaping"), v.literal("pest_control"), v.literal("tree_shrub"), v.literal("irrigation"), v.literal("snow"), v.literal("maintenance"));

type Ctx = QueryCtx | MutationCtx;

async function requireDemoOrg(ctx: Ctx) {
  const org = await ctx.db.query("organizations").withIndex("by_slug", (q) => q.eq("slug", DEMO_SLUG)).unique();
  if (!org) throw new Error("Demo workspace has not been bootstrapped yet.");
  return org;
}

async function listOperatingOrganizations(ctx: Ctx) {
  return await ctx.db.query("organizations").collect();
}

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function monthLabel(value: number) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const date = new Date(value);
  return `${months[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function moneyPerHour(hours: number, hourlyCostCents: number) {
  return Math.round(hours * hourlyCostCents);
}

function allocateCents(value: number, divisor: number) {
  return Math.round(value / Math.max(1, divisor));
}

function inferPriceBookRateCentsPerSqFt(priceBookItem?: Doc<"priceBookItems"> | null) {
  const formulaRate = priceBookItem?.formula?.match(/lawnSizeSqFt\s*\*\s*([0-9.]+)/)?.[1];
  if (formulaRate) return Math.round(Number(formulaRate) * 1000) / 10;
  return priceBookItem?.pricingModel === "per_sq_ft" ? 1.8 : 1.8;
}

function normalizeRuleCondition(condition: unknown) {
  if (!condition || typeof condition !== "object") return undefined;
  const value = condition as Record<string, unknown>;
  return {
    minAreaSqFt: typeof value.minAreaSqFt === "number" ? value.minAreaSqFt : undefined,
    maxAreaSqFt: typeof value.maxAreaSqFt === "number" ? value.maxAreaSqFt : undefined,
    minApplications: typeof value.minApplications === "number" ? value.minApplications : undefined,
    maxApplications: typeof value.maxApplications === "number" ? value.maxApplications : undefined,
  };
}

const terminalLeadStatuses = new Set(["converted", "lost_confirmed", "lost_assumed", "spam", "disqualified", "unqualified", "passed_on"]);
const serviceTerritoryCities = new Set(["foxborough", "mansfield", "sharon", "wrentham", "plainville", "attleboro", "north attleborough"]);
const categoryLabels: Record<string, string> = {
  lawn_care: "Lawn care",
  landscaping: "Landscaping",
  pest_control: "Pest control",
  tree_shrub: "Tree & shrub",
  irrigation: "Irrigation",
  snow: "Snow",
  maintenance: "Maintenance",
};

function minutesBetween(start: number, end: number) {
  return Math.max(0, Math.round((end - start) / 60000));
}

function leadSla(source: string, status: string, receivedAt: number) {
  const normalized = source.toLowerCase();
  const minutes = normalized.includes("website") || normalized.includes("form") ? 15 : normalized.includes("phone") ? 60 : normalized.includes("referral") ? 240 : normalized.includes("import") || normalized.includes("csv") || normalized.includes("legacy") ? 2880 : 1440;
  const slaDueAt = receivedAt + minutes * 60 * 1000;
  if (terminalLeadStatuses.has(status)) return { slaDueAt, slaStatus: "closed" as const };
  const remainingMinutes = Math.round((slaDueAt - Date.now()) / 60000);
  if (remainingMinutes < 0) return { slaDueAt, slaStatus: "overdue" as const };
  if (remainingMinutes <= 30) return { slaDueAt, slaStatus: "due_soon" as const };
  return { slaDueAt, slaStatus: "on_track" as const };
}

function territoryStatus(city?: string) {
  if (!city?.trim()) return "Missing city";
  return serviceTerritoryCities.has(city.trim().toLowerCase()) ? "In territory" : "Needs territory review";
}

function serviceFit(programs: string[]) {
  if (programs.length === 0) return "Needs service mapping";
  return `Catalog fit: ${programs.map((program) => categoryLabels[program] ?? program).join(" + ")}`;
}

function auditModule(action: string) {
  const [prefix] = action.split(".");
  const moduleLabels: Record<string, string> = {
    catalog: "Admin",
    demo: "Demo/Admin",
    lead: "Lead Ops",
    labor_rate: "Cost Intel/Admin",
    member: "Admin",
    organization: "Admin",
    payment: "Revenue",
    revenue: "Revenue",
    route: "Dispatch",
    schedule: "Dispatch",
    task: "Jobs",
    vendor_catalog: "Cost Intel/Admin",
    visit: "Field",
    workflow_status: "Admin",
  };
  return moduleLabels[prefix] ?? formatStatus(prefix || "system");
}

function auditExportState(action: string, after: unknown) {
  if (action.toLowerCase().includes("export")) return "export_event";
  if (after && typeof after === "object" && "reportingMirror" in after) return "reporting_boundary";
  return "not_exported";
}

function auditChangedFields(before: unknown, after: unknown) {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const beforeRecord = before as Record<string, unknown>;
  const afterRecord = after as Record<string, unknown>;
  return Object.keys(afterRecord)
    .filter((key) => JSON.stringify(beforeRecord[key]) !== JSON.stringify(afterRecord[key]))
    .slice(0, 12);
}

function duplicateWarningsForLead(row: { id: string; title: string; customerName: string; city: string; source: string }, peers: Array<{ id: string; title: string; customerName: string; city: string; source: string }>) {
  const normalizedName = row.customerName.trim().toLowerCase();
  const normalizedCity = row.city.trim().toLowerCase();
  const warnings = peers
    .filter((peer) => peer.id !== row.id)
    .filter((peer) => peer.customerName.trim().toLowerCase() === normalizedName || (normalizedCity && peer.city.trim().toLowerCase() === normalizedCity && peer.source === row.source))
    .slice(0, 3)
    .map((peer) => `Possible duplicate: ${peer.customerName} / ${peer.title}`);
  return [...new Set(warnings)];
}

function jobAddress(property?: Doc<"properties"> | null) {
  if (!property) return "Unknown address";
  return `${property.street}, ${property.city}, ${property.state} ${property.postalCode}`;
}

async function getOperatingCollections(ctx: Ctx, organizationId: Id<"organizations">) {
  const [
    memberships,
    users,
    customers,
    contacts,
    properties,
    leads,
    opportunities,
    jobs,
    visits,
    crews,
    tasks,
    estimates,
    estimateLineItems,
    serviceCatalogItems,
    materials,
    materialApplications,
    laborRates,
    equipmentRates,
    equipment,
    vendorCatalogs,
    costSnapshots,
    weatherSnapshots,
    routeDriveTimes,
    timesheets,
    purchaseOrders,
    customerInvoices,
    customerPayments,
    jobCostSummaries,
    profitSnapshots,
    tagDefinitions,
    entityTags,
    lifecycleSnapshots,
    pnlSnapshots,
    leadViews,
    leadIssues,
    leadStatuses,
    featureFlags,
    audits,
    importJobs,
    importRows,
  ] = await Promise.all([
    ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("users").collect(),
    ctx.db.query("customers").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("contacts").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("properties").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("leads").withIndex("by_org_created", (q) => q.eq("organizationId", organizationId)).order("desc").collect(),
    ctx.db.query("opportunities").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("jobs").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("jobVisits").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("crews").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("tasks").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("estimates").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("estimateLineItems").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("serviceCatalogItems").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("materials").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("materialApplications").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("laborRateCards").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("equipmentRateCards").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("equipment").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("vendorCatalogs").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("costSnapshots").withIndex("by_org_time", (q) => q.eq("organizationId", organizationId)).order("desc").take(20),
    ctx.db.query("weatherSnapshots").withIndex("by_org_time", (q) => q.eq("organizationId", organizationId)).order("desc").take(20),
    ctx.db.query("routeDriveTimeEstimates").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("timesheetEntries").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("purchaseOrders").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("customerInvoices").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("customerPayments").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("jobCostSummaries").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("profitabilitySnapshots").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("tagDefinitions").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("entityTags").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("customerLifecycleSnapshots").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("pnlSnapshots").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("leadSavedViews").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("dataQualityIssues").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("leadStatusSettings").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("featureFlags").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("auditEvents").withIndex("by_org_time", (q) => q.eq("organizationId", organizationId)).order("desc").take(50),
    ctx.db.query("importJobs").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
    ctx.db.query("importRows").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
  ]);

  return {
    memberships,
    users,
    customers,
    contacts,
    properties,
    leads,
    opportunities,
    jobs,
    visits,
    crews,
    tasks,
    estimates,
    estimateLineItems,
    serviceCatalogItems,
    materials,
    materialApplications,
    laborRates,
    equipmentRates,
    equipment,
    vendorCatalogs,
    costSnapshots,
    weatherSnapshots,
    routeDriveTimes,
    timesheets,
    purchaseOrders,
    customerInvoices,
    customerPayments,
    jobCostSummaries,
    profitSnapshots,
    tagDefinitions,
    entityTags,
    lifecycleSnapshots,
    pnlSnapshots,
    leadViews,
    leadIssues,
    leadStatuses,
    featureFlags,
    audits,
    importJobs,
    importRows,
  };
}

function computeJobSummary(
  job: Doc<"jobs">,
  collections: Awaited<ReturnType<typeof getOperatingCollections>>,
) {
  const jobInvoices = collections.customerInvoices.filter((invoice) => invoice.jobId === job._id);
  const jobTimesheets = collections.timesheets.filter((entry) => entry.jobId === job._id);
  const jobVisits = collections.visits.filter((visit) => visit.jobId === job._id);
  const visitIds = new Set(jobVisits.map((visit) => visit._id));
  const jobMaterialApplications = collections.materialApplications.filter((application) => visitIds.has(application.visitId));
  const materialById = new Map(collections.materials.map((material) => [material._id, material]));
  const jobPurchaseOrders = collections.purchaseOrders.filter((po) => po.jobId === job._id && po.status !== "canceled");
  const matchingEstimate = job.estimateId ? collections.estimates.find((estimate) => estimate._id === job.estimateId) : collections.estimates.find((estimate) => estimate.customerId === job.customerId && estimate.status === "accepted");
  const matchingOpportunity = job.opportunityId ? collections.opportunities.find((opportunity) => opportunity._id === job.opportunityId) : undefined;

  const estimatedRevenueCents = matchingEstimate?.totalCents ?? matchingOpportunity?.valueCents ?? 0;
  const actualRevenueCents = jobInvoices.reduce((sum, invoice) => sum + invoice.totalCents, 0) || estimatedRevenueCents;
  const invoicedCents = jobInvoices.reduce((sum, invoice) => sum + invoice.totalCents, 0);
  const collectedCents = jobInvoices.reduce((sum, invoice) => sum + invoice.paidCents, 0);
  const actualLaborCostCents = jobTimesheets.reduce((sum, entry) => sum + entry.totalCostCents, 0);
  const actualMaterialCostCents =
    jobMaterialApplications.reduce((sum, application) => {
      const material = materialById.get(application.materialId);
      return sum + Math.round(application.quantity * (material?.costCents ?? 0));
    }, 0) + jobPurchaseOrders.reduce((sum, po) => sum + po.totalCents, 0);
  const actualEquipmentCostCents = Math.round(jobVisits.length * 6500 + actualLaborCostCents * 0.12);
  const estimatedLaborCostCents = Math.round(estimatedRevenueCents * 0.34);
  const estimatedMaterialCostCents = Math.round(estimatedRevenueCents * 0.18);
  const estimatedEquipmentCostCents = Math.round(estimatedRevenueCents * 0.08);
  const overheadCostCents = Math.round((actualLaborCostCents + actualMaterialCostCents + actualEquipmentCostCents) * 0.18);
  const grossProfitCents = actualRevenueCents - actualLaborCostCents - actualMaterialCostCents - actualEquipmentCostCents - overheadCostCents;
  const grossMarginPercent = pct(grossProfitCents, actualRevenueCents);
  const varianceCents =
    actualLaborCostCents +
    actualMaterialCostCents +
    actualEquipmentCostCents +
    overheadCostCents -
    (estimatedLaborCostCents + estimatedMaterialCostCents + estimatedEquipmentCostCents);

  return {
    estimatedRevenueCents,
    actualRevenueCents,
    invoicedCents,
    collectedCents,
    estimatedLaborCostCents,
    actualLaborCostCents,
    estimatedMaterialCostCents,
    actualMaterialCostCents,
    estimatedEquipmentCostCents,
    actualEquipmentCostCents,
    overheadCostCents,
    grossProfitCents,
    grossMarginPercent,
    varianceCents,
  };
}

type OperatingServiceCategory = Doc<"serviceCatalogItems">["category"];

function serviceCategoriesForJob(job: Doc<"jobs">, collections: Awaited<ReturnType<typeof getOperatingCollections>>): OperatingServiceCategory[] {
  const serviceCatalogById = new Map(collections.serviceCatalogItems.map((item) => [item._id, item]));
  const estimateLineItems = job.estimateId ? collections.estimateLineItems.filter((lineItem) => lineItem.estimateId === job.estimateId) : [];
  const categoriesFromEstimate = estimateLineItems
    .map((lineItem) => lineItem.serviceCatalogItemId ? serviceCatalogById.get(lineItem.serviceCatalogItemId)?.category : undefined)
    .filter((category): category is OperatingServiceCategory => Boolean(category));
  if (categoriesFromEstimate.length > 0) return [...new Set(categoriesFromEstimate)];

  const opportunity = job.opportunityId ? collections.opportunities.find((candidate) => candidate._id === job.opportunityId) : undefined;
  if (opportunity?.serviceLines.length) return [...new Set(opportunity.serviceLines)];
  return ["maintenance"];
}

type ServiceLineRollupInput = Array<{
  jobId: Id<"jobs">;
  actualRevenueCents: number;
  invoicedCents: number;
  collectedCents: number;
  actualLaborCostCents: number;
  actualMaterialCostCents: number;
  actualEquipmentCostCents: number;
  overheadCostCents: number;
  grossProfitCents: number;
}>;

function buildServiceLineRollups(rows: ServiceLineRollupInput, collections: Awaited<ReturnType<typeof getOperatingCollections>>) {
  const jobById = new Map(collections.jobs.map((job) => [job._id, job]));
  const rollups = new Map<string, {
    serviceCategory: string;
    label: string;
    revenueCents: number;
    invoicedCents: number;
    collectedCents: number;
    laborCostCents: number;
    materialCostCents: number;
    equipmentCostCents: number;
    overheadCostCents: number;
    grossProfitCents: number;
    jobCount: number;
  }>();

  for (const row of rows) {
    const job = jobById.get(row.jobId);
    if (!job) continue;
    const categories = serviceCategoriesForJob(job, collections);
    for (const category of categories) {
      const current = rollups.get(category) ?? {
        serviceCategory: category,
        label: categoryLabels[category] ?? formatStatus(category),
        revenueCents: 0,
        invoicedCents: 0,
        collectedCents: 0,
        laborCostCents: 0,
        materialCostCents: 0,
        equipmentCostCents: 0,
        overheadCostCents: 0,
        grossProfitCents: 0,
        jobCount: 0,
      };
      const divisor = categories.length;
      current.revenueCents += allocateCents(row.actualRevenueCents, divisor);
      current.invoicedCents += allocateCents(row.invoicedCents, divisor);
      current.collectedCents += allocateCents(row.collectedCents, divisor);
      current.laborCostCents += allocateCents(row.actualLaborCostCents, divisor);
      current.materialCostCents += allocateCents(row.actualMaterialCostCents, divisor);
      current.equipmentCostCents += allocateCents(row.actualEquipmentCostCents, divisor);
      current.overheadCostCents += allocateCents(row.overheadCostCents, divisor);
      current.grossProfitCents += allocateCents(row.grossProfitCents, divisor);
      current.jobCount += 1;
      rollups.set(category, current);
    }
  }

  return [...rollups.values()]
    .map((rollup) => ({ ...rollup, grossMarginPercent: pct(rollup.grossProfitCents, rollup.revenueCents) }))
    .sort((left, right) => right.grossMarginPercent - left.grossMarginPercent || right.grossProfitCents - left.grossProfitCents);
}

async function recalculateJobCostSummaries(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const collections = await getOperatingCollections(ctx, organizationId);
  const now = Date.now();
  const existingByJobId = new Map(collections.jobCostSummaries.map((summary) => [summary.jobId, summary]));

  const rows = [];
  for (const job of collections.jobs) {
    const rollup = computeJobSummary(job, collections);
    const existing = existingByJobId.get(job._id);
    const doc = {
      organizationId,
      jobId: job._id,
      customerId: job.customerId,
      ...rollup,
      calculatedAt: now,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
      rows.push({ ...existing, ...doc });
    } else {
      const id = await ctx.db.insert("jobCostSummaries", { ...doc, createdAt: now });
      rows.push({ _id: id, ...doc, createdAt: now });
    }
  }

  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const totals = rows.reduce(
    (sum, row) => ({
      revenueCents: sum.revenueCents + row.actualRevenueCents,
      invoicedCents: sum.invoicedCents + row.invoicedCents,
      collectedCents: sum.collectedCents + row.collectedCents,
      laborCostCents: sum.laborCostCents + row.actualLaborCostCents,
      materialCostCents: sum.materialCostCents + row.actualMaterialCostCents,
      equipmentCostCents: sum.equipmentCostCents + row.actualEquipmentCostCents,
      overheadCostCents: sum.overheadCostCents + row.overheadCostCents,
      grossProfitCents: sum.grossProfitCents + row.grossProfitCents,
    }),
    {
      revenueCents: 0,
      invoicedCents: 0,
      collectedCents: 0,
      laborCostCents: 0,
      materialCostCents: 0,
      equipmentCostCents: 0,
      overheadCostCents: 0,
      grossProfitCents: 0,
    },
  );
  await ctx.db.insert("profitabilitySnapshots", {
    organizationId,
    periodStart: periodStart.getTime(),
    periodEnd: periodEnd.getTime(),
    dimensionType: "organization",
    revenueCents: totals.revenueCents,
    invoicedCents: totals.invoicedCents,
    collectedCents: totals.collectedCents,
    laborCostCents: totals.laborCostCents,
    materialCostCents: totals.materialCostCents,
    equipmentCostCents: totals.equipmentCostCents,
    overheadCostCents: totals.overheadCostCents,
    grossProfitCents: totals.grossProfitCents,
    grossMarginPercent: pct(totals.grossProfitCents, totals.revenueCents),
    metadata: { source: "jobCostSummaries", rowCount: rows.length },
    calculatedAt: now,
    createdAt: now,
  });

  for (const serviceLine of buildServiceLineRollups(rows, collections)) {
    await ctx.db.insert("profitabilitySnapshots", {
      organizationId,
      periodStart: periodStart.getTime(),
      periodEnd: periodEnd.getTime(),
      dimensionType: "service_category",
      dimensionId: serviceLine.serviceCategory,
      revenueCents: serviceLine.revenueCents,
      invoicedCents: serviceLine.invoicedCents,
      collectedCents: serviceLine.collectedCents,
      laborCostCents: serviceLine.laborCostCents,
      materialCostCents: serviceLine.materialCostCents,
      equipmentCostCents: serviceLine.equipmentCostCents,
      overheadCostCents: serviceLine.overheadCostCents,
      grossProfitCents: serviceLine.grossProfitCents,
      grossMarginPercent: serviceLine.grossMarginPercent,
      metadata: { source: "jobCostSummaries", label: serviceLine.label, jobCount: serviceLine.jobCount },
      calculatedAt: now,
      createdAt: now,
    });
  }

  return rows.length;
}

async function refreshCostSnapshots(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const now = Date.now();
  await ctx.db.insert("costSnapshots", {
    organizationId,
    source: "fred",
    kind: "fertilizer_index",
    label: "FRED fertilizer market refresh",
    value: 439.037,
    unit: "index_1982_100",
    region: "US",
    metadata: { note: "Live API wiring target; demo stores latest known benchmark plus timestamp." },
    capturedAt: now,
    createdAt: now,
  });
  await ctx.db.insert("costSnapshots", {
    organizationId,
    source: "bls",
    kind: "labor",
    label: "BLS local labor refresh",
    value: 28.1,
    unit: "loaded_hourly_usd",
    region: "MA/Boston",
    metadata: { note: "Admin override remains authoritative for estimates." },
    capturedAt: now,
    createdAt: now,
  });
  return { refreshedAt: now, inserted: 2 };
}

async function refreshWeatherSnapshots(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const now = Date.now();
  const collections = await getOperatingCollections(ctx, organizationId);
  let inserted = 0;
  for (const visit of collections.visits) {
    await ctx.db.insert("weatherSnapshots", {
      organizationId,
      propertyId: visit.propertyId,
      visitId: visit._id,
      source: "nws",
      observedAt: now,
      temperatureF: visit.routeOrder === 1 ? 71 : 77,
      windMph: visit.routeOrder === 1 ? 8 : 14,
      precipitationProbability: visit.routeOrder === 1 ? 15 : 31,
      conditions: visit.routeOrder === 1 ? "NWS refresh: favorable application window" : "NWS refresh: watch wind and humidity",
      applicationRisk: visit.routeOrder === 1 ? "low" : "medium",
      raw: { sourcePlan: "NWS points/forecast/alerts adapter boundary" },
      createdAt: now,
    });
    inserted += 1;
  }
  return inserted;
}

async function flagStaleLeads(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const now = Date.now();
  const staleBefore = now - 3 * 24 * 60 * 60 * 1000;
  const terminalStatuses = new Set(["converted", "lost_confirmed", "lost_assumed", "spam", "disqualified"]);
  const leads = await ctx.db.query("leads").withIndex("by_org_created", (q) => q.eq("organizationId", organizationId)).collect();
  let inserted = 0;
  for (const lead of leads) {
    if (terminalStatuses.has(lead.status) || (lead.receivedAt ?? lead.createdAt) > staleBefore) continue;
    const existingIssues = await ctx.db.query("dataQualityIssues").withIndex("by_lead", (q) => q.eq("leadId", lead._id)).collect();
    if (existingIssues.some((issue) => issue.kind === "stale_follow_up" && issue.status === "open")) continue;
    await ctx.db.insert("dataQualityIssues", {
      organizationId,
      kind: "stale_follow_up",
      severity: "warning",
      status: "open",
      leadId: lead._id,
      summary: `Lead ${lead.title} has not moved recently.`,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("tasks", {
      organizationId,
      entityType: "lead",
      entityId: lead._id,
      title: `Follow up stale lead: ${lead.title}`,
      description: "Automatic stale-lead check flagged this lead for sales review, reassignment, or closure.",
      status: "open",
      priority: "normal",
      dueAt: now + 24 * 60 * 60 * 1000,
      assignedUserId: lead.ownerUserId,
      createdAt: now,
      updatedAt: now,
    });
    inserted += 1;
  }
  return inserted;
}

export const bootstrapOperatingDepth = mutation({
  args: {},
  handler: async (ctx) => {
    const org = await requireDemoOrg(ctx);
    const now = Date.now();
    const collections = await getOperatingCollections(ctx, org._id);
    const jobsByTitle = new Map(collections.jobs.map((job) => [job.title, job]));
    const visitsByOrder = new Map(collections.visits.map((visit) => [visit.routeOrder ?? 0, visit]));
    const materialsByName = new Map(collections.materials.map((material) => [material.name, material]));

    if (collections.laborRates.length === 0) {
      for (const rate of [
        { name: "Massachusetts crew lead loaded wage", roleName: "Crew Lead", hourlyCostCents: 3600, billableRateCents: 7800, source: "bls" as const },
        { name: "Technician loaded wage", roleName: "Technician", hourlyCostCents: 2750, billableRateCents: 6200, source: "bls" as const },
        { name: "Estimator / sales loaded wage", roleName: "Estimator", hourlyCostCents: 4200, billableRateCents: 9500, source: "admin_override" as const },
      ]) {
        await ctx.db.insert("laborRateCards", {
          organizationId: org._id,
          ...rate,
          burdenPercent: 18,
          metroArea: "Boston-Cambridge-Nashua",
          state: "MA",
          active: true,
          metadata: { externalSource: rate.source === "bls" ? "BLS OEWS default, admin-adjustable" : "Owner override" },
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (collections.equipmentRates.length === 0) {
      for (const rate of [
        { name: "Ride-on spreader/sprayer", category: "application", hourlyCostCents: 1800, billableRateCents: 4200 },
        { name: "Truck and trailer", category: "transport", hourlyCostCents: 2400, billableRateCents: 5200 },
        { name: "Commercial mower kit", category: "mowing", hourlyCostCents: 2100, billableRateCents: 4800 },
      ]) {
        await ctx.db.insert("equipmentRateCards", {
          organizationId: org._id,
          ...rate,
          fuelCostPerHourCents: 650,
          maintenanceReservePerHourCents: 500,
          source: "admin_override",
          active: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (collections.vendorCatalogs.length === 0) {
      for (const item of [
        { vendorName: "SiteOne Landscape Supply", itemName: "Merit grub control", materialName: "Merit grub control", category: "pest_control" as const, unit: "bag", unitCostCents: 7300 },
        { vendorName: "SiteOne Landscape Supply", itemName: "Premium overseed blend", materialName: "Premium overseed blend", category: "lawn_care" as const, unit: "bag", unitCostCents: 6400 },
        { vendorName: "NE Turf Supply", itemName: "Mosquito barrier concentrate", materialName: "Mosquito barrier mix", category: "pest_control" as const, unit: "gallon", unitCostCents: 2800 },
        { vendorName: "NE Turf Supply", itemName: "19-0-6 fertilizer with dimension", category: "lawn_care" as const, unit: "bag", unitCostCents: 4100 },
      ]) {
        await ctx.db.insert("vendorCatalogs", {
          organizationId: org._id,
          vendorName: item.vendorName,
          itemName: item.itemName,
          category: item.category,
          materialId: item.materialName ? materialsByName.get(item.materialName)?._id : undefined,
          unit: item.unit,
          unitCostCents: item.unitCostCents,
          source: "vendor_import",
          lastImportedAt: now,
          active: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (collections.costSnapshots.length === 0) {
      for (const snapshot of [
        { source: "fred" as const, kind: "fertilizer_index" as const, label: "FRED fertilizer materials PPI", value: 439.037, unit: "index_1982_100", region: "US" },
        { source: "world_bank" as const, kind: "fertilizer_index" as const, label: "World Bank fertilizer trend", value: -4.3, unit: "monthly_percent_change", region: "Global" },
        { source: "bls" as const, kind: "labor" as const, label: "Landscaping labor wage baseline", value: 27.5, unit: "loaded_hourly_usd", region: "MA/Boston" },
        { source: "manual" as const, kind: "overhead" as const, label: "Default overhead burden", value: 18, unit: "percent_of_direct_cost", region: "Organization" },
      ]) {
        await ctx.db.insert("costSnapshots", {
          organizationId: org._id,
          ...snapshot,
          periodStart: now - 30 * 24 * 60 * 60 * 1000,
          periodEnd: now,
          metadata: { refreshMode: "external_data_first_with_admin_override" },
          capturedAt: now,
          createdAt: now,
        });
      }
    }

    if (collections.weatherSnapshots.length === 0) {
      for (const visit of collections.visits) {
        await ctx.db.insert("weatherSnapshots", {
          organizationId: org._id,
          propertyId: visit.propertyId,
          visitId: visit._id,
          source: "nws",
          observedAt: visit.scheduledStart,
          temperatureF: visit.routeOrder === 1 ? 72 : 78,
          windMph: visit.routeOrder === 1 ? 7 : 13,
          precipitationProbability: visit.routeOrder === 1 ? 12 : 28,
          conditions: visit.routeOrder === 1 ? "Partly sunny" : "Warm with afternoon humidity",
          applicationRisk: visit.routeOrder === 1 ? "low" : "medium",
          raw: { sourcePlan: "NWS points/forecast endpoint" },
          createdAt: now,
        });
      }
    }

    const brooksideJob = jobsByTitle.get("Brookside six-step season");
    const northgateJob = jobsByTitle.get("Northgate weekly maintenance");
    if (collections.customerInvoices.length === 0) {
      if (brooksideJob) {
        const invoiceId = await ctx.db.insert("customerInvoices", {
          organizationId: org._id,
          customerId: brooksideJob.customerId,
          jobId: brooksideJob._id,
          estimateId: brooksideJob.estimateId,
          invoiceNumber: "INV-2026-1042",
          status: "partially_paid",
          subtotalCents: 920000,
          taxCents: 0,
          totalCents: 920000,
          paidCents: 650000,
          dueAt: now + 10 * 24 * 60 * 60 * 1000,
          sentAt: now - 4 * 24 * 60 * 60 * 1000,
          createdAt: now,
          updatedAt: now,
        });
        const paymentId = await ctx.db.insert("customerPayments", {
          organizationId: org._id,
          customerId: brooksideJob.customerId,
          invoiceId,
          status: "posted",
          method: "ach",
          amountCents: 650000,
          receivedAt: now - 2 * 24 * 60 * 60 * 1000,
          reference: "ACH-6500",
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert("paymentAllocations", { organizationId: org._id, paymentId, invoiceId, amountCents: 650000, createdAt: now });
      }
      if (northgateJob) {
        await ctx.db.insert("customerInvoices", {
          organizationId: org._id,
          customerId: northgateJob.customerId,
          jobId: northgateJob._id,
          invoiceNumber: "INV-2026-1043",
          status: "sent",
          subtotalCents: 385000,
          taxCents: 0,
          totalCents: 385000,
          paidCents: 0,
          dueAt: now + 20 * 24 * 60 * 60 * 1000,
          sentAt: now - 1 * 24 * 60 * 60 * 1000,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (collections.timesheets.length === 0) {
      for (const entry of [
        { job: brooksideJob, visit: visitsByOrder.get(1), roleName: "Crew Lead", hours: 2.4, hourlyCostCents: 3600 },
        { job: brooksideJob, visit: visitsByOrder.get(1), roleName: "Technician", hours: 2.4, hourlyCostCents: 2750 },
        { job: northgateJob, visit: visitsByOrder.get(2), roleName: "Crew Lead", hours: 3.1, hourlyCostCents: 3600 },
        { job: northgateJob, visit: visitsByOrder.get(2), roleName: "Technician", hours: 5.8, hourlyCostCents: 2750 },
      ]) {
        if (!entry.job) continue;
        await ctx.db.insert("timesheetEntries", {
          organizationId: org._id,
          crewId: entry.visit?.assignedCrewId,
          jobId: entry.job._id,
          visitId: entry.visit?._id,
          status: "approved",
          roleName: entry.roleName,
          startedAt: entry.visit?.scheduledStart ?? now,
          endedAt: (entry.visit?.scheduledStart ?? now) + entry.hours * 60 * 60 * 1000,
          hours: entry.hours,
          hourlyCostCents: entry.hourlyCostCents,
          totalCostCents: moneyPerHour(entry.hours, entry.hourlyCostCents),
          notes: "Seeded cost baseline",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (collections.materialApplications.length === 0) {
      const brooksideVisit = visitsByOrder.get(1);
      const northgateVisit = visitsByOrder.get(2);
      const grub = materialsByName.get("Merit grub control");
      const barrier = materialsByName.get("Mosquito barrier mix");
      const seed = materialsByName.get("Premium overseed blend");
      if (brooksideVisit && grub) {
        await ctx.db.insert("materialApplications", {
          organizationId: org._id,
          visitId: brooksideVisit._id,
          materialId: grub._id,
          quantity: 8,
          unit: "bag",
          notes: "Common turf treatment",
          createdAt: now,
          updatedAt: now,
        });
      }
      if (northgateVisit && seed) {
        await ctx.db.insert("materialApplications", {
          organizationId: org._id,
          visitId: northgateVisit._id,
          materialId: seed._id,
          quantity: 4,
          unit: "bag",
          notes: "Repair thin turf near dock",
          createdAt: now,
          updatedAt: now,
        });
      }
      if (northgateVisit && barrier) {
        await ctx.db.insert("materialApplications", {
          organizationId: org._id,
          visitId: northgateVisit._id,
          materialId: barrier._id,
          quantity: 2.5,
          unit: "gallon",
          notes: "Perimeter callback area",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (collections.routeDriveTimes.length === 0) {
      const properties = new Map(collections.properties.map((property) => [property._id, property]));
      for (const visit of collections.visits) {
        const property = visit.propertyId ? properties.get(visit.propertyId) : undefined;
        await ctx.db.insert("routeDriveTimeEstimates", {
          organizationId: org._id,
          visitId: visit._id,
          fromAddress: "12 Depot St, Foxborough, MA 02035",
          toAddress: jobAddress(property),
          driveMinutes: visit.routeOrder === 1 ? 18 : 31,
          distanceMiles: visit.routeOrder === 1 ? 7.8 : 17.4,
          source: "estimated",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (collections.leadStatuses.length === 0) {
      const statuses = [
        ["new", "New", "#64748b", 1, false],
        ["contacted", "Contacted", "#d97706", 2, false],
        ["do_estimate", "Do Estimate", "#2563eb", 3, false],
        ["estimate_provided", "Estimate Provided", "#7c3aed", 4, false],
        ["follow_up", "Follow Up", "#b45309", 5, false],
        ["converted", "Converted", "#047857", 6, true],
        ["lost_confirmed", "Lost", "#be123c", 7, true],
        ["spam", "Spam", "#475569", 8, true],
      ] as const;
      for (const [status, label, color, sortOrder, terminal] of statuses) {
        await ctx.db.insert("leadStatusSettings", { organizationId: org._id, status, label, color, sortOrder, terminal, active: true, createdAt: now, updatedAt: now });
      }
    }

    if (collections.featureFlags.length === 0) {
      for (const flag of [
        { key: "lead_ops_table", enabled: true },
        { key: "job_costing_v1", enabled: true },
        { key: "cost_intelligence_external_data", enabled: true },
        { key: "profit_dashboard", enabled: true },
      ]) {
        await ctx.db.insert("featureFlags", { organizationId: org._id, ...flag, config: { stage: "demo-live" }, createdAt: now, updatedAt: now });
      }
    }

    const recalculated = await recalculateJobCostSummaries(ctx, org._id);
    const analyticsCollections = await getOperatingCollections(ctx, org._id);

    if (analyticsCollections.tagDefinitions.length === 0) {
      const tagSeed = [
        ["hoa", "HOA", "customer_segment", "#315a4d", "Association or managed community account"],
        ["commercial", "Commercial", "customer_segment", "#42526b", "Commercial property or facilities account"],
        ["residential", "Residential", "customer_segment", "#6b7f3a", "Residential homeowner account"],
        ["recurring", "Recurring", "customer_segment", "#047857", "Recurring plan or contract relationship"],
        ["one_time", "One-time", "customer_segment", "#78716c", "One-off or project-only relationship"],
        ["fertilization", "Fertilization", "service_line", "#4ea84e", "Lawn fertilization and turf health program"],
        ["mosquito", "Mosquito/Tick", "service_line", "#b45309", "Mosquito, tick, or exterior pest program"],
        ["weekly", "Weekly", "operations", "#2563eb", "Weekly route cadence"],
        ["website_form", "Website Form", "lead_source", "#7c3aed", "Inbound website lead source"],
        ["phone", "Phone", "lead_source", "#d97706", "Phone lead source"],
        ["high_ltv", "High LTV", "profitability", "#059669", "Customer has above-average estimated lifetime value"],
        ["low_margin", "Low Margin", "profitability", "#be123c", "Customer or job needs margin review"],
        ["at_risk", "At Risk", "risk", "#e11d48", "Elevated churn or service risk"],
        ["high_ar", "High AR", "risk", "#f59e0b", "Open AR balance requires attention"],
      ] as const;
      const tagIds = new Map<string, Id<"tagDefinitions">>();
      for (const [key, label, category, color, description] of tagSeed) {
        const tagId = await ctx.db.insert("tagDefinitions", {
          organizationId: org._id,
          key,
          label,
          category,
          color,
          description,
          system: true,
          active: true,
          createdAt: now,
          updatedAt: now,
        });
        tagIds.set(key, tagId);
      }

      for (const customer of analyticsCollections.customers) {
        const normalizedTags = new Set([customer.type, customer.status === "active" ? "recurring" : "one_time", ...customer.tags.map((tag) => tag.toLowerCase().replace(/[^a-z0-9]+/g, "_"))]);
        for (const key of normalizedTags) {
          const tagId = tagIds.get(key);
          if (!tagId) continue;
          await ctx.db.insert("entityTags", {
            organizationId: org._id,
            tagId,
            entityType: "customer",
            entityId: customer._id,
            source: "system",
            confidence: 100,
            createdAt: now,
          });
        }
      }
    }

    if (analyticsCollections.lifecycleSnapshots.length === 0) {
      const summaryByCustomer = new Map<Id<"customers">, Array<(typeof analyticsCollections.jobCostSummaries)[number]>>();
      for (const summary of analyticsCollections.jobCostSummaries) {
        const rows = summaryByCustomer.get(summary.customerId) ?? [];
        rows.push(summary);
        summaryByCustomer.set(summary.customerId, rows);
      }
      for (const customer of analyticsCollections.customers) {
        const rows = summaryByCustomer.get(customer._id) ?? [];
        const invoices = analyticsCollections.customerInvoices.filter((invoice) => invoice.customerId === customer._id);
        const lifetimeRevenueCents = customer.lifetimeValueCents ?? Math.max(invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0), rows.reduce((sum, row) => sum + row.actualRevenueCents, 0));
        const lifetimeCostCents = rows.reduce((sum, row) => sum + row.actualLaborCostCents + row.actualMaterialCostCents + row.actualEquipmentCostCents + row.overheadCostCents, 0);
        const grossProfitCents = Math.max(0, lifetimeRevenueCents - lifetimeCostCents);
        const balanceCents = invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.totalCents - invoice.paidCents), 0);
        const isRecurring = customer.tags.includes("recurring") || customer.tags.includes("weekly") || customer.type === "hoa" || customer.type === "commercial";
        const annualRecurringRevenueCents = isRecurring ? Math.max(Math.round(lifetimeRevenueCents * 0.44), rows.reduce((sum, row) => sum + row.estimatedRevenueCents, 0)) : 0;
        const churnRiskScore = Math.min(96, Math.max(4, (customer.status === "inactive" ? 70 : customer.status === "prospect" ? 38 : 14) + (balanceCents > 250000 ? 22 : 0) + (isRecurring ? -6 : 7)));
        const churnRiskLevel = churnRiskScore >= 75 ? "critical" : churnRiskScore >= 55 ? "high" : churnRiskScore >= 30 ? "medium" : "low";
        const churnDrivers = [
          ...(customer.status === "prospect" ? ["Not yet converted"] : []),
          ...(balanceCents > 0 ? [`${Math.round(balanceCents / 100)} AR open`] : []),
          ...(!isRecurring ? ["No recurring plan"] : []),
          ...(rows.some((row) => row.grossMarginPercent < 25) ? ["Low job margin"] : []),
        ];
        await ctx.db.insert("customerLifecycleSnapshots", {
          organizationId: org._id,
          customerId: customer._id,
          snapshotDate: now,
          segmentKeys: [customer.type, customer.status, ...customer.tags],
          firstWonAt: analyticsCollections.opportunities.find((opportunity) => opportunity.customerId === customer._id && opportunity.stage === "won")?.updatedAt,
          lastServiceAt: analyticsCollections.visits.filter((visit) => visit.customerId === customer._id).sort((a, b) => b.scheduledStart - a.scheduledStart)[0]?.scheduledStart,
          lastInvoiceAt: invoices.sort((a, b) => (b.sentAt ?? b.createdAt) - (a.sentAt ?? a.createdAt))[0]?.sentAt,
          annualRecurringRevenueCents,
          lifetimeRevenueCents,
          lifetimeCostCents,
          grossProfitCents,
          grossMarginPercent: pct(grossProfitCents, lifetimeRevenueCents),
          estimatedLtvCents: Math.max(grossProfitCents, Math.round(annualRecurringRevenueCents * (churnRiskScore < 30 ? 3.2 : churnRiskScore < 55 ? 2.1 : 1.2))),
          churnRiskScore,
          churnRiskLevel,
          churnDrivers: churnDrivers.length > 0 ? churnDrivers : ["Healthy recurring relationship"],
          nextBestAction: churnRiskScore >= 55 ? "Owner follow-up and service recovery review" : balanceCents > 0 ? "Collect open AR before renewal" : "Ask for renewal/referral",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (analyticsCollections.pnlSnapshots.length === 0) {
      const rows = analyticsCollections.jobCostSummaries;
      const baseRevenue = rows.reduce((sum, row) => sum + row.actualRevenueCents, 0) || analyticsCollections.estimates.reduce((sum, estimate) => sum + estimate.totalCents, 0);
      const baseLabor = rows.reduce((sum, row) => sum + row.actualLaborCostCents, 0) || Math.round(baseRevenue * 0.3);
      const baseMaterial = rows.reduce((sum, row) => sum + row.actualMaterialCostCents, 0) || Math.round(baseRevenue * 0.18);
      const baseEquipment = rows.reduce((sum, row) => sum + row.actualEquipmentCostCents, 0) || Math.round(baseRevenue * 0.08);
      const baseOverhead = rows.reduce((sum, row) => sum + row.overheadCostCents, 0) || Math.round((baseLabor + baseMaterial + baseEquipment) * 0.18);
      for (let offset = 5; offset >= 0; offset -= 1) {
        const periodStart = new Date(now);
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
        periodStart.setMonth(periodStart.getMonth() - offset);
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        const scale = 0.82 + (5 - offset) * 0.055;
        const serviceRevenueCents = Math.round(baseRevenue * scale);
        const laborCostCents = Math.round(baseLabor * (0.92 + (5 - offset) * 0.025));
        const materialCostCents = Math.round(baseMaterial * (0.9 + (5 - offset) * 0.03));
        const equipmentCostCents = Math.round(baseEquipment * (0.95 + (5 - offset) * 0.018));
        const overheadCostCents = Math.round(baseOverhead * (0.94 + (5 - offset) * 0.02));
        const subcontractorCostCents = Math.round(serviceRevenueCents * 0.035);
        const grossProfitCents = serviceRevenueCents - laborCostCents - materialCostCents - equipmentCostCents - subcontractorCostCents - overheadCostCents;
        const adminPayrollCents = Math.round(serviceRevenueCents * 0.08);
        const salesMarketingCents = Math.round(serviceRevenueCents * 0.045);
        const softwareCents = 62000;
        const insuranceCents = Math.round(serviceRevenueCents * 0.022);
        const fuelCents = Math.round(serviceRevenueCents * 0.03);
        const rentUtilitiesCents = Math.round(serviceRevenueCents * 0.025);
        const operatingProfitCents = grossProfitCents - adminPayrollCents - salesMarketingCents - softwareCents - insuranceCents - fuelCents - rentUtilitiesCents;
        await ctx.db.insert("pnlSnapshots", {
          organizationId: org._id,
          periodStart: periodStart.getTime(),
          periodEnd: periodEnd.getTime(),
          serviceRevenueCents,
          recurringRevenueCents: Math.round(serviceRevenueCents * 0.68),
          oneTimeRevenueCents: Math.round(serviceRevenueCents * 0.32),
          laborCostCents,
          materialCostCents,
          equipmentCostCents,
          subcontractorCostCents,
          overheadCostCents,
          adminPayrollCents,
          salesMarketingCents,
          softwareCents,
          insuranceCents,
          fuelCents,
          rentUtilitiesCents,
          grossProfitCents,
          operatingProfitCents,
          grossMarginPercent: pct(grossProfitCents, serviceRevenueCents),
          operatingMarginPercent: pct(operatingProfitCents, serviceRevenueCents),
          metadata: { source: "demo_owner_finance_model", confidence: "pnl_proxy_not_accounting_ledger" },
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { organizationId: org._id, recalculated };
  },
});

export const getDemoOperatingDepth = query({
  args: {},
  handler: async (ctx) => {
    const org = await ctx.db.query("organizations").withIndex("by_slug", (q) => q.eq("slug", DEMO_SLUG)).unique();
    if (!org) return null;
    const collections = await getOperatingCollections(ctx, org._id);
    const userById = new Map(collections.users.map((user) => [user._id, user]));
    const customerById = new Map(collections.customers.map((customer) => [customer._id, customer]));
    const propertyById = new Map(collections.properties.map((property) => [property._id, property]));
    const opportunityByLeadId = new Map(collections.opportunities.filter((opportunity) => opportunity.leadId).map((opportunity) => [opportunity.leadId, opportunity]));
    const jobById = new Map(collections.jobs.map((job) => [job._id, job]));
    const crewById = new Map(collections.visits.filter((visit) => visit.assignedCrewId).map((visit) => [visit.jobId, visit.assignedCrewId]));
    const customerInvoices = collections.customerInvoices;
    const computedSummaries = collections.jobs.map((job) => {
      const persisted = collections.jobCostSummaries.find((summary) => summary.jobId === job._id);
      const rollup = persisted ?? computeJobSummary(job, collections);
      const customer = customerById.get(job.customerId);
      const crewId = crewById.get(job._id);
      return {
        id: persisted?._id ?? job._id,
        jobId: job._id,
        jobTitle: job.title,
        customerName: customer?.name ?? "Unknown customer",
        crewName: crewId ? collections.crews.find((crew) => crew._id === crewId)?.name ?? "Unassigned" : "Unassigned",
        status: job.status,
        estimatedRevenueCents: rollup.estimatedRevenueCents,
        actualRevenueCents: rollup.actualRevenueCents,
        invoicedCents: rollup.invoicedCents,
        collectedCents: rollup.collectedCents,
        actualLaborCostCents: rollup.actualLaborCostCents,
        actualMaterialCostCents: rollup.actualMaterialCostCents,
        actualEquipmentCostCents: rollup.actualEquipmentCostCents,
        overheadCostCents: rollup.overheadCostCents,
        grossProfitCents: rollup.grossProfitCents,
        grossMarginPercent: rollup.grossMarginPercent,
        varianceCents: rollup.varianceCents,
      };
    });

    const totals = computedSummaries.reduce(
      (sum, row) => ({
        pipelineCents: sum.pipelineCents,
        bookedRevenueCents: sum.bookedRevenueCents + row.estimatedRevenueCents,
        completedRevenueCents: sum.completedRevenueCents + (row.status === "completed" ? row.actualRevenueCents : 0),
        invoicedCents: sum.invoicedCents + row.invoicedCents,
        collectedCents: sum.collectedCents + row.collectedCents,
        laborCostCents: sum.laborCostCents + row.actualLaborCostCents,
        materialCostCents: sum.materialCostCents + row.actualMaterialCostCents,
        equipmentCostCents: sum.equipmentCostCents + row.actualEquipmentCostCents,
        overheadCostCents: sum.overheadCostCents + row.overheadCostCents,
        grossProfitCents: sum.grossProfitCents + row.grossProfitCents,
      }),
      {
        pipelineCents: collections.opportunities.filter((opportunity) => !["won", "lost"].includes(opportunity.stage)).reduce((sum, opportunity) => sum + opportunity.valueCents, 0),
        bookedRevenueCents: 0,
        completedRevenueCents: 0,
        invoicedCents: 0,
        collectedCents: 0,
        laborCostCents: 0,
        materialCostCents: 0,
        equipmentCostCents: 0,
        overheadCostCents: 0,
        grossProfitCents: 0,
      },
    );

    const arCents = customerInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.totalCents - invoice.paidCents), 0);
    const contactByCustomerId = new Map(collections.contacts.filter((contact) => contact.isPrimary).map((contact) => [contact.customerId, contact]));
    const leadPeerRows = collections.leads.map((lead) => {
      const customer = lead.customerId ? customerById.get(lead.customerId) : undefined;
      const property = lead.propertyId ? propertyById.get(lead.propertyId) : undefined;
      return {
        id: lead._id,
        title: lead.title,
        customerName: (customer?.name ?? `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim()) || "Unmatched lead",
        city: property?.city ?? "",
        source: lead.source,
      };
    });
    const sourceStats = new Map<string, { total: number; won: number; valueCents: number; valueCount: number }>();
    for (const lead of collections.leads) {
      const stats = sourceStats.get(lead.source) ?? { total: 0, won: 0, valueCents: 0, valueCount: 0 };
      const opportunity = opportunityByLeadId.get(lead._id);
      stats.total += 1;
      if (opportunity?.stage === "won") stats.won += 1;
      if (opportunity) {
        stats.valueCents += opportunity.valueCents;
        stats.valueCount += 1;
      }
      sourceStats.set(lead.source, stats);
    }
    const leadRows = collections.leads.map((lead) => {
      const customer = lead.customerId ? customerById.get(lead.customerId) : undefined;
      const property = lead.propertyId ? propertyById.get(lead.propertyId) : undefined;
      const opportunity = opportunityByLeadId.get(lead._id);
      const owner = lead.ownerUserId ? userById.get(lead.ownerUserId) : undefined;
      const primaryContact = lead.contactId ? collections.contacts.find((contact) => contact._id === lead.contactId) : lead.customerId ? contactByCustomerId.get(lead.customerId) : undefined;
      const programs = lead.programRequests ?? opportunity?.serviceLines ?? [];
      const qualityScore = lead.qualityScore ?? 0;
      const spamScore = lead.spamScore ?? 0;
      const duplicateWarnings = duplicateWarningsForLead(
        { id: lead._id, title: lead.title, customerName: (customer?.name ?? `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim()) || "Unmatched lead", city: property?.city ?? "", source: lead.source },
        leadPeerRows,
      );
      const estimateReadiness = [
        {
          label: "Contact",
          status: lead.email || lead.homePhone || lead.mobilePhone || primaryContact?.email || primaryContact?.phone || primaryContact?.mobilePhone ? "ready" : "blocked",
          detail: lead.email || primaryContact?.email || lead.mobilePhone || lead.homePhone || primaryContact?.phone || primaryContact?.mobilePhone ? "Phone or email on file" : "Missing phone and email",
        },
        {
          label: "Address",
          status: property?.street && property.city && property.postalCode ? "ready" : "blocked",
          detail: property?.street && property.city && property.postalCode ? `${property.city}, ${property.state}` : "Needs service address",
        },
        {
          label: "Service",
          status: programs.length > 0 ? "ready" : "warning",
          detail: programs.length > 0 ? programs.map((program) => categoryLabels[program]).join(", ") : "No service line selected",
        },
        {
          label: "Property size",
          status: lead.lawnSizeSqFt || property?.lawnSizeSqFt ? "ready" : "warning",
          detail: lead.lawnSizeSqFt || property?.lawnSizeSqFt ? `${(lead.lawnSizeSqFt ?? property?.lawnSizeSqFt ?? 0).toLocaleString()} sq ft` : "Use minimum pricing until measured",
        },
        {
          label: "Quality",
          status: qualityScore >= 70 && spamScore < 35 ? "ready" : spamScore >= 35 ? "blocked" : "warning",
          detail: spamScore >= 35 ? "Spam review required" : `${qualityScore} quality / ${spamScore} spam`,
        },
      ] as Array<{ label: string; status: "ready" | "warning" | "blocked"; detail: string }>;
      const openIssueCount = collections.leadIssues.filter((issue) => issue.leadId === lead._id && issue.status === "open").length;
      const stats = sourceStats.get(lead.source) ?? { total: 0, won: 0, valueCents: 0, valueCount: 0 };
      const sla = leadSla(lead.source, lead.status, lead.receivedAt ?? lead.createdAt);
      return {
        id: lead._id,
        title: lead.title,
        customerName: (customer?.name ?? `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim()) || "Unmatched lead",
        city: property?.city ?? "",
        source: lead.source,
        status: lead.status,
        grade: lead.grade ?? "ungraded",
        ownerName: owner?.name ?? "Unassigned",
        programRequests: programs,
        qualityScore,
        spamScore,
        valueCents: opportunity?.valueCents ?? 0,
        receivedAt: lead.receivedAt ?? lead.createdAt,
        issueCount: openIssueCount + duplicateWarnings.length,
        hidden: Boolean(lead.hiddenAt),
        ...sla,
        sourceCloseRate: stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0,
        sourceAverageTicketCents: stats.valueCount > 0 ? Math.round(stats.valueCents / stats.valueCount) : 0,
        duplicateWarnings,
        estimateReady: estimateReadiness.every((check) => check.status !== "blocked") && programs.length > 0,
        estimateReadiness,
        propertySummary: property ? jobAddress(property) : "No property address",
        serviceFit: serviceFit(programs),
        territoryStatus: territoryStatus(property?.city),
        suggestedNextStep: spamScore >= 35 ? "Review spam score before assignment" : estimateReadiness.some((check) => check.status === "blocked") ? "Fix blocked estimate fields" : "Convert to estimate",
        conversionOptions: [
          { label: "Opportunity", targetStatus: "contacted" },
          { label: "Estimate", targetStatus: "do_estimate", primary: true },
          { label: "Recurring plan", targetStatus: "converted" },
          { label: "One-off job", targetStatus: "converted" },
          { label: "Disqualify", targetStatus: "disqualified" },
        ],
        reasonCodes: ["Wrong service area", "Too small for minimum", "Duplicate", "No response", "Competitor vendor", "Spam solicitation"],
      };
    });
    const crewDocById = new Map(collections.crews.map((crew) => [crew._id, crew]));
    const materialById = new Map(collections.materials.map((material) => [material._id, material]));
    const crewSkills = (crewName: string) => {
      const normalized = crewName.toLowerCase();
      if (normalized.includes("pest")) return ["Pest control", "Barrier applications", "EPA label checks"];
      if (normalized.includes("maintenance")) return ["Maintenance", "Mowing", "Irrigation observation"];
      return ["Lawn care", "Fertilization", "Turf diagnostics"];
    };
    const requiredSkillsForJob = (jobTitle: string) => {
      const normalized = jobTitle.toLowerCase();
      if (normalized.includes("pest") || normalized.includes("mosquito") || normalized.includes("tick")) return ["Pest control", "EPA label checks"];
      if (normalized.includes("maintenance") || normalized.includes("mow")) return ["Maintenance", "Mowing"];
      return ["Lawn care", "Fertilization"];
    };
    const routeConfidence = collections.visits.map((visit, index) => {
      const job = jobById.get(visit.jobId);
      const crew = visit.assignedCrewId ? crewDocById.get(visit.assignedCrewId) : undefined;
      const weather = collections.weatherSnapshots.find((snapshot) => snapshot.visitId === visit._id || snapshot.propertyId === visit.propertyId);
      const requiredSkills = requiredSkillsForJob(job?.title ?? "");
      const actualSkills = crewSkills(crew?.name ?? "");
      const warnings = [
        ...(weather?.applicationRisk && weather.applicationRisk !== "low" ? [`${weather.applicationRisk} weather application risk`] : []),
        ...(minutesBetween(visit.scheduledStart, visit.scheduledEnd) < 90 ? ["Tight service window"] : []),
        ...(requiredSkills.some((skill) => !actualSkills.includes(skill)) ? ["Crew skill mismatch"] : []),
      ];
      const equipmentConflicts = collections.equipment.filter((item) => item.assignedCrewId && visit.assignedCrewId && item.assignedCrewId !== visit.assignedCrewId && item.status === "assigned").slice(0, 1).map((item) => `${item.name} is assigned to another crew`);
      return {
        visitId: visit._id,
        score: Math.max(52, 96 - warnings.length * 13 - equipmentConflicts.length * 11 - index * 2),
        warnings,
        requiredSkills,
        crewSkills: actualSkills,
        weatherRisk: weather?.applicationRisk ?? "unknown",
        equipmentConflicts,
      };
    });
    const materialLots = collections.materialApplications.length > 0
      ? collections.materialApplications.map((application, index) => {
          const material = materialById.get(application.materialId);
          const visit = collections.visits.find((candidate) => candidate._id === application.visitId);
          const crew = visit?.assignedCrewId ? crewDocById.get(visit.assignedCrewId) : undefined;
          const weather = collections.weatherSnapshots.find((snapshot) => snapshot.visitId === application.visitId);
          return {
            visitId: application.visitId,
            materialName: material?.name ?? "Unknown material",
            epaNumber: material?.epaRegistrationNumber,
            lotNumber: `APP-${String(index + 1).padStart(4, "0")}`,
            quantity: `${application.quantity} ${application.unit}`,
            applicator: crew?.name ?? "Unassigned",
            weatherRisk: weather?.applicationRisk ?? "unknown",
          };
        })
      : collections.visits.slice(0, 4).map((visit, index) => {
          const material = collections.materials[index % Math.max(1, collections.materials.length)];
          const crew = visit.assignedCrewId ? crewDocById.get(visit.assignedCrewId) : undefined;
          const weather = collections.weatherSnapshots.find((snapshot) => snapshot.visitId === visit._id || snapshot.propertyId === visit.propertyId);
          return {
            visitId: visit._id,
            materialName: material?.name ?? "General material",
            epaNumber: material?.epaRegistrationNumber,
            lotNumber: `LOT-${new Date(visit.scheduledStart).getFullYear()}-${String(index + 17).padStart(3, "0")}`,
            quantity: `${index + 1}.${index + 5} ${material?.unit ?? "unit"}`,
            applicator: crew?.name ?? "Unassigned",
            weatherRisk: weather?.applicationRisk ?? "unknown",
          };
        });
    const timeBreakdowns = computedSummaries.map((summary, index) => {
      const visits = collections.visits.filter((visit) => visit.jobId === summary.jobId);
      const visitIds = new Set(visits.map((visit) => visit._id));
      const scheduledMinutes = visits.reduce((sum, visit) => sum + minutesBetween(visit.scheduledStart, visit.scheduledEnd), 0);
      const actualMinutes = Math.round(collections.timesheets.filter((entry) => entry.jobId === summary.jobId).reduce((sum, entry) => sum + entry.hours * 60, 0)) || scheduledMinutes + index * 24;
      const driveMinutes = collections.routeDriveTimes.filter((row) => row.visitId && visitIds.has(row.visitId)).reduce((sum, row) => sum + row.driveMinutes, 0) || visits.length * 18 + index * 7;
      const nonBillableMinutes = 15 + index * 12;
      const estimatedMinutes = Math.max(90, Math.round(summary.estimatedRevenueCents / 1800));
      return {
        jobId: summary.jobId,
        jobTitle: summary.jobTitle,
        estimatedMinutes,
        scheduledMinutes,
        actualMinutes,
        driveMinutes,
        nonBillableMinutes,
        varianceMinutes: actualMinutes + driveMinutes + nonBillableMinutes - estimatedMinutes,
      };
    });
    const callbacks = collections.tasks
      .filter((task) => task.entityType === "job" || task.title.toLowerCase().includes("repair") || task.title.toLowerCase().includes("follow"))
      .slice(0, 8)
      .map((task) => {
        const job = collections.jobs.find((candidate) => candidate._id === task.entityId) ?? collections.jobs[0];
        return {
          id: `callback-${task._id}`,
          jobTitle: job?.title ?? "Unassigned job",
          customerName: job ? customerById.get(job.customerId)?.name ?? "Unknown customer" : "Unknown customer",
          reason: task.title.toLowerCase().includes("repair") ? "Field issue / repair follow-up" : "Customer follow-up",
          severity: task.priority,
          status: task.status,
        };
      });
    const equipmentCheckouts = collections.visits.flatMap((visit, index) => {
      const crew = visit.assignedCrewId ? crewDocById.get(visit.assignedCrewId) : undefined;
      const assignedEquipment = collections.equipment.filter((item) => item.assignedCrewId === visit.assignedCrewId).slice(0, 2);
      const fallbackEquipment = collections.equipmentRates.slice(0, 2).map((rate) => ({ name: rate.name, status: "reserved", maintenanceDueAt: undefined as number | undefined }));
      const items = assignedEquipment.length > 0 ? assignedEquipment : fallbackEquipment;
      return items.map((item, itemIndex) => ({
        visitId: visit._id,
        equipmentName: item.name,
        status: "status" in item ? item.status : itemIndex === 0 ? "checked_out" : index === 1 ? "conflict" : "reserved",
        maintenanceDue: "maintenanceDueAt" in item ? Boolean(item.maintenanceDueAt && item.maintenanceDueAt < visit.scheduledEnd) : itemIndex === 1 && index === 1,
        assignedCrew: crew?.name ?? "Unassigned",
      }));
    });
    const importJobById = new Map(collections.importJobs.map((job) => [job._id, job]));
    const importQaRows = collections.importRows.length > 0
      ? collections.importRows.slice(0, 8).map((row) => {
          const importJob = importJobById.get(row.importJobId);
          return {
            id: row._id,
            source: importJob?.fileName ?? importJob?.source ?? "Import",
            rowLabel: `Row ${row.rowNumber}`,
            status: row.status === "imported" ? "ready" : row.status === "failed" ? "blocked" : "needs_review",
            issues: row.error ? [row.error] : row.status === "skipped" ? ["Skipped by import rule"] : [],
            mappedEntity: row.targetEntityType ?? "unmapped",
          };
        })
      : [
          { id: "import-1", source: "CSV lead/customer import", rowLabel: "Row 14 - Megan Walsh", status: "needs_review", issues: ["Potential duplicate", "Missing lawn size"], mappedEntity: "lead + customer + property" },
          { id: "import-2", source: "Legacy CRM export", rowLabel: "Row 22 - Northgate Building 4", status: "ready", issues: [], mappedEntity: "customer + property" },
          { id: "import-3", source: "Google Sheets import", rowLabel: "Row 31 - Out of Area Office", status: "blocked", issues: ["Outside service territory", "Unknown service line"], mappedEntity: "lead" },
        ];
    const tagUsage = new Map<string, number>();
    for (const entityTag of collections.entityTags) tagUsage.set(entityTag.tagId, (tagUsage.get(entityTag.tagId) ?? 0) + 1);
    const tagByKey = new Map(collections.tagDefinitions.map((tag) => [tag.key, tag]));
    const latestLifecycleByCustomer = new Map<string, (typeof collections.lifecycleSnapshots)[number]>();
    for (const snapshot of [...collections.lifecycleSnapshots].sort((a, b) => b.snapshotDate - a.snapshotDate)) {
      if (!latestLifecycleByCustomer.has(snapshot.customerId)) latestLifecycleByCustomer.set(snapshot.customerId, snapshot);
    }
    const lifecycleRows = [...latestLifecycleByCustomer.values()];
    const pnlRows = [...collections.pnlSnapshots].sort((a, b) => a.periodStart - b.periodStart);
    const latestPnl = pnlRows[pnlRows.length - 1];
    const priorPnl = pnlRows[pnlRows.length - 2];
    const pnlServiceRevenue = latestPnl?.serviceRevenueCents ?? (totals.invoicedCents || totals.bookedRevenueCents);
    const pnlDirectCosts =
      (latestPnl?.laborCostCents ?? totals.laborCostCents) +
      (latestPnl?.materialCostCents ?? totals.materialCostCents) +
      (latestPnl?.equipmentCostCents ?? totals.equipmentCostCents) +
      (latestPnl?.subcontractorCostCents ?? 0) +
      (latestPnl?.overheadCostCents ?? totals.overheadCostCents);
    const pnlGrossProfit = latestPnl?.grossProfitCents ?? (pnlServiceRevenue - pnlDirectCosts);
    const pnlOperatingExpenses =
      (latestPnl?.adminPayrollCents ?? Math.round(pnlServiceRevenue * 0.08)) +
      (latestPnl?.salesMarketingCents ?? Math.round(pnlServiceRevenue * 0.045)) +
      (latestPnl?.softwareCents ?? 62000) +
      (latestPnl?.insuranceCents ?? Math.round(pnlServiceRevenue * 0.022)) +
      (latestPnl?.fuelCents ?? Math.round(pnlServiceRevenue * 0.03)) +
      (latestPnl?.rentUtilitiesCents ?? Math.round(pnlServiceRevenue * 0.025));
    const pnlOperatingProfit = latestPnl?.operatingProfitCents ?? (pnlGrossProfit - pnlOperatingExpenses);
    const lifecycleBySegment = new Map<string, Array<(typeof lifecycleRows)[number]>>();
    for (const snapshot of lifecycleRows) {
      const preferredSegment =
        snapshot.segmentKeys.find((key) => ["hoa", "commercial", "residential", "municipal"].includes(key)) ??
        snapshot.segmentKeys.find((key) => ["recurring", "weekly", "fertilization", "mosquito"].includes(key)) ??
        "unsegmented";
      const rows = lifecycleBySegment.get(preferredSegment) ?? [];
      rows.push(snapshot);
      lifecycleBySegment.set(preferredSegment, rows);
    }
    const churnCohorts = [...lifecycleBySegment.entries()].map(([segmentKey, rows]) => {
      const atRiskRows = rows.filter((row) => ["high", "critical"].includes(row.churnRiskLevel));
      return {
        segment: tagByKey.get(segmentKey)?.label ?? formatStatus(segmentKey),
        customers: rows.length,
        atRisk: atRiskRows.length,
        churnRatePercent: pct(atRiskRows.length, rows.length),
        ltvAtRiskCents: atRiskRows.reduce((sum, row) => sum + row.estimatedLtvCents, 0),
        drivers: [...new Set(rows.flatMap((row) => row.churnDrivers))].slice(0, 4),
      };
    });
    const ltvCohorts = [...lifecycleBySegment.entries()].map(([segmentKey, rows]) => {
      const averageGrossProfitCents = avg(rows.map((row) => row.grossProfitCents));
      return {
        segment: tagByKey.get(segmentKey)?.label ?? formatStatus(segmentKey),
        averageLtvCents: avg(rows.map((row) => row.estimatedLtvCents)),
        averageGrossProfitCents,
        paybackMonths: Math.max(1, Math.round((avg(rows.map((row) => row.estimatedLtvCents)) / Math.max(1, averageGrossProfitCents)) * 12) / 10),
      };
    });
    const atRiskCustomers = lifecycleRows.filter((row) => ["high", "critical"].includes(row.churnRiskLevel)).length;
    const churnRatePercent = pct(atRiskCustomers, lifecycleRows.length);
    const avgLtvCents = avg(lifecycleRows.map((row) => row.estimatedLtvCents));
    const cacCents = Math.round((latestPnl?.salesMarketingCents ?? Math.round(pnlServiceRevenue * 0.045)) / Math.max(1, collections.leads.length || collections.customers.length));
    const priorRecurringRevenue = priorPnl?.recurringRevenueCents ?? Math.max(1, Math.round((latestPnl?.recurringRevenueCents ?? pnlServiceRevenue) * 0.94));
    const netRevenueRetentionPercent = pct(latestPnl?.recurringRevenueCents ?? Math.round(pnlServiceRevenue * 0.68), priorRecurringRevenue);
    const grossMarginRatio = Math.max(0.05, (latestPnl?.grossMarginPercent ?? pct(pnlGrossProfit, pnlServiceRevenue)) / 100);
    const ownerAnalytics = {
      kpis: {
        retentionRatePercent: Math.max(0, Math.round((100 - churnRatePercent) * 10) / 10),
        churnRatePercent,
        averageLtvCents: avgLtvCents,
        cacCents,
        ltvToCac: Math.round((avgLtvCents / Math.max(1, cacCents)) * 10) / 10,
        netRevenueRetentionPercent,
        avgGrossMarginPercent: avg(lifecycleRows.map((row) => Math.round(row.grossMarginPercent * 10))) / 10 || pct(pnlGrossProfit, pnlServiceRevenue),
        breakEvenRevenueCents: Math.round(pnlOperatingExpenses / grossMarginRatio),
      },
      churn: churnCohorts,
      ltv: ltvCohorts,
      pnl: [
        { label: "Service revenue", valueCents: pnlServiceRevenue, kind: "revenue" },
        { label: "Recurring revenue", valueCents: latestPnl?.recurringRevenueCents ?? Math.round(pnlServiceRevenue * 0.68), kind: "revenue" },
        { label: "Direct costs", valueCents: -pnlDirectCosts, kind: "cost" },
        { label: "Gross profit", valueCents: pnlGrossProfit, kind: "profit" },
        { label: "Operating expenses", valueCents: -pnlOperatingExpenses, kind: "cost" },
        { label: "Operating profit", valueCents: pnlOperatingProfit, kind: "profit" },
      ],
      costBreakdown: [
        { label: "Labor", valueCents: latestPnl?.laborCostCents ?? totals.laborCostCents, percent: pct(latestPnl?.laborCostCents ?? totals.laborCostCents, pnlServiceRevenue) },
        { label: "Materials", valueCents: latestPnl?.materialCostCents ?? totals.materialCostCents, percent: pct(latestPnl?.materialCostCents ?? totals.materialCostCents, pnlServiceRevenue) },
        { label: "Equipment", valueCents: latestPnl?.equipmentCostCents ?? totals.equipmentCostCents, percent: pct(latestPnl?.equipmentCostCents ?? totals.equipmentCostCents, pnlServiceRevenue) },
        { label: "Subcontractors", valueCents: latestPnl?.subcontractorCostCents ?? 0, percent: pct(latestPnl?.subcontractorCostCents ?? 0, pnlServiceRevenue) },
        { label: "Overhead", valueCents: latestPnl?.overheadCostCents ?? totals.overheadCostCents, percent: pct(latestPnl?.overheadCostCents ?? totals.overheadCostCents, pnlServiceRevenue) },
        { label: "Admin payroll", valueCents: latestPnl?.adminPayrollCents ?? Math.round(pnlServiceRevenue * 0.08), percent: pct(latestPnl?.adminPayrollCents ?? Math.round(pnlServiceRevenue * 0.08), pnlServiceRevenue) },
        { label: "Sales/marketing", valueCents: latestPnl?.salesMarketingCents ?? Math.round(pnlServiceRevenue * 0.045), percent: pct(latestPnl?.salesMarketingCents ?? Math.round(pnlServiceRevenue * 0.045), pnlServiceRevenue) },
        { label: "Software", valueCents: latestPnl?.softwareCents ?? 62000, percent: pct(latestPnl?.softwareCents ?? 62000, pnlServiceRevenue) },
        { label: "Insurance", valueCents: latestPnl?.insuranceCents ?? Math.round(pnlServiceRevenue * 0.022), percent: pct(latestPnl?.insuranceCents ?? Math.round(pnlServiceRevenue * 0.022), pnlServiceRevenue) },
        { label: "Fuel", valueCents: latestPnl?.fuelCents ?? Math.round(pnlServiceRevenue * 0.03), percent: pct(latestPnl?.fuelCents ?? Math.round(pnlServiceRevenue * 0.03), pnlServiceRevenue) },
        { label: "Rent/utilities", valueCents: latestPnl?.rentUtilitiesCents ?? Math.round(pnlServiceRevenue * 0.025), percent: pct(latestPnl?.rentUtilitiesCents ?? Math.round(pnlServiceRevenue * 0.025), pnlServiceRevenue) },
      ],
      trend: (pnlRows.length > 0 ? pnlRows : [{ periodStart: Date.now(), serviceRevenueCents: pnlServiceRevenue, grossProfitCents: pnlGrossProfit, laborCostCents: totals.laborCostCents, materialCostCents: totals.materialCostCents, equipmentCostCents: totals.equipmentCostCents, overheadCostCents: totals.overheadCostCents }]).map((row) => ({
        month: monthLabel(row.periodStart),
        revenueCents: row.serviceRevenueCents,
        grossProfitCents: row.grossProfitCents,
        costCents: row.laborCostCents + row.materialCostCents + row.equipmentCostCents + row.overheadCostCents + ("subcontractorCostCents" in row ? row.subcontractorCostCents : 0),
        churnRatePercent,
      })),
    };
    const segmentCards = churnCohorts.map((cohort) => {
      const ltv = ltvCohorts.find((row) => row.segment === cohort.segment);
      return {
        label: cohort.segment,
        customerCount: cohort.customers,
        revenueCents: lifecycleRows.filter((row) => (tagByKey.get(row.segmentKeys[0])?.label ?? formatStatus(row.segmentKeys[0] ?? "unsegmented")) === cohort.segment).reduce((sum, row) => sum + row.lifetimeRevenueCents, 0),
        grossProfitCents: ltv?.averageGrossProfitCents ?? 0,
        churnRiskPercent: cohort.churnRatePercent,
      };
    });
    const latestServiceSnapshots = new Map<string, (typeof collections.profitSnapshots)[number]>();
    for (const snapshot of [...collections.profitSnapshots].filter((candidate) => candidate.dimensionType === "service_category" && candidate.dimensionId).sort((a, b) => b.calculatedAt - a.calculatedAt)) {
      if (snapshot.dimensionId && !latestServiceSnapshots.has(snapshot.dimensionId)) latestServiceSnapshots.set(snapshot.dimensionId, snapshot);
    }
    const serviceLineProfitability = latestServiceSnapshots.size > 0
      ? [...latestServiceSnapshots.values()]
          .map((snapshot) => ({
            serviceCategory: snapshot.dimensionId ?? "maintenance",
            label: snapshot.metadata?.label ?? categoryLabels[snapshot.dimensionId ?? ""] ?? formatStatus(snapshot.dimensionId ?? "maintenance"),
            revenueCents: snapshot.revenueCents,
            invoicedCents: snapshot.invoicedCents,
            collectedCents: snapshot.collectedCents,
            laborCostCents: snapshot.laborCostCents,
            materialCostCents: snapshot.materialCostCents,
            equipmentCostCents: snapshot.equipmentCostCents,
            overheadCostCents: snapshot.overheadCostCents,
            grossProfitCents: snapshot.grossProfitCents,
            grossMarginPercent: snapshot.grossMarginPercent,
            jobCount: snapshot.metadata?.jobCount ?? 0,
            calculatedAt: snapshot.calculatedAt,
          }))
          .sort((left, right) => right.grossMarginPercent - left.grossMarginPercent || right.grossProfitCents - left.grossProfitCents)
      : buildServiceLineRollups(collections.jobCostSummaries, collections).map((rollup) => ({ ...rollup, calculatedAt: Math.max(0, ...collections.jobCostSummaries.map((summary) => summary.calculatedAt)) }));

    return {
      seeded: collections.laborRates.length > 0 && collections.jobCostSummaries.length > 0,
      leadOps: {
        rows: leadRows,
        savedViews: collections.leadViews.map((view) => ({ id: view._id, name: view.name, scope: view.scope, filters: view.filters, columns: view.columns })),
        statusSettings: [...collections.leadStatuses].sort((left, right) => left.sortOrder - right.sortOrder).map((status) => ({ id: status._id, status: status.status, label: status.label, color: status.color, sortOrder: status.sortOrder, terminal: status.terminal, active: status.active })),
        qualityIssues: collections.leadIssues.map((issue) => ({ id: issue._id, kind: issue.kind, severity: issue.severity, status: issue.status, summary: issue.summary, leadId: issue.leadId })),
        metrics: {
          openLeads: leadRows.filter((lead) => !terminalLeadStatuses.has(lead.status)).length,
          highQuality: leadRows.filter((lead) => lead.qualityScore >= 85).length,
          spamReview: leadRows.filter((lead) => lead.spamScore >= 35).length,
          unassigned: leadRows.filter((lead) => lead.ownerName === "Unassigned").length,
          slaOverdue: leadRows.filter((lead) => lead.slaStatus === "overdue").length,
          duplicates: leadRows.filter((lead) => lead.duplicateWarnings.length > 0).length,
          estimateReady: leadRows.filter((lead) => lead.estimateReady).length,
        },
      },
      fieldOps: {
        routeConfidence,
        materialLots,
        timeBreakdowns,
        callbacks,
        equipmentCheckouts,
        importQaRows,
      },
      admin: {
        members: collections.memberships.map((membership) => ({ id: membership._id, userId: membership.userId, name: userById.get(membership.userId)?.name ?? "Unknown", email: userById.get(membership.userId)?.email ?? "", role: membership.role, status: membership.status })),
        permissionMatrix: [
          { permission: "Manage organization", roles: ["owner", "admin"] },
          { permission: "Manage members", roles: ["owner", "admin"] },
          { permission: "Manage catalog and rates", roles: ["owner", "admin", "manager"] },
          { permission: "Manage pipeline", roles: ["owner", "admin", "manager", "sales"] },
          { permission: "Dispatch visits", roles: ["owner", "admin", "manager", "dispatcher"] },
          { permission: "Complete field work", roles: ["owner", "admin", "manager", "crew_lead", "technician"] },
          { permission: "View profit dashboards", roles: ["owner", "admin", "manager"] },
        ],
        featureFlags: collections.featureFlags.map((flag) => ({ id: flag._id, key: flag.key, enabled: flag.enabled })),
        auditEvents: collections.audits.map((audit) => {
          const actor = audit.actorUserId ? userById.get(audit.actorUserId) : undefined;
          return {
            id: audit._id,
            action: audit.action,
            summary: audit.summary,
            entityType: audit.entityType,
            entityId: audit.entityId,
            actorUserId: audit.actorUserId,
            actorName: actor?.name ?? actor?.email ?? "System / automation",
            module: auditModule(audit.action),
            exportState: auditExportState(audit.action, audit.after),
            requestId: audit.requestId,
            changedFields: auditChangedFields(audit.before, audit.after),
            createdAt: audit.createdAt,
          };
        }),
        tagTaxonomy: collections.tagDefinitions.map((tag) => ({ id: tag._id, key: tag.key, label: tag.label, category: tag.category, color: tag.color, active: tag.active, usageCount: tagUsage.get(tag._id) ?? 0 })),
        segmentCards,
        ownerAnalytics,
      },
      costIntelligence: {
        laborRates: [...collections.laborRates].sort((left, right) => right.updatedAt - left.updatedAt).map((rate) => ({ id: rate._id, name: rate.name, roleName: rate.roleName, source: rate.source, hourlyCostCents: rate.hourlyCostCents, billableRateCents: rate.billableRateCents, active: rate.active })),
        equipmentRates: collections.equipmentRates.map((rate) => ({ id: rate._id, name: rate.name, category: rate.category, hourlyCostCents: rate.hourlyCostCents, billableRateCents: rate.billableRateCents, active: rate.active })),
        vendorCatalogs: [...collections.vendorCatalogs].sort((left, right) => right.updatedAt - left.updatedAt).map((item) => ({ id: item._id, vendorName: item.vendorName, itemName: item.itemName, category: item.category, unit: item.unit, unitCostCents: item.unitCostCents, source: item.source, active: item.active })),
        costSnapshots: collections.costSnapshots.map((snapshot) => ({ id: snapshot._id, source: snapshot.source, kind: snapshot.kind, label: snapshot.label, value: snapshot.value, unit: snapshot.unit, region: snapshot.region, capturedAt: snapshot.capturedAt })),
        weatherSnapshots: collections.weatherSnapshots.map((snapshot) => ({
          id: snapshot._id,
          propertyName: snapshot.propertyId ? propertyById.get(snapshot.propertyId)?.label ?? "Unknown property" : "Unassigned",
          conditions: snapshot.conditions ?? "Unknown",
          temperatureF: snapshot.temperatureF,
          windMph: snapshot.windMph,
          precipitationProbability: snapshot.precipitationProbability,
          applicationRisk: snapshot.applicationRisk,
          observedAt: snapshot.observedAt,
        })),
      },
      jobCosting: {
        summaries: computedSummaries,
        timesheets: collections.timesheets.map((entry) => ({ id: entry._id, jobTitle: entry.jobId ? jobById.get(entry.jobId)?.title ?? "Unknown job" : "Unassigned", roleName: entry.roleName, hours: entry.hours, totalCostCents: entry.totalCostCents, status: entry.status })),
        purchaseOrders: collections.purchaseOrders.map((po) => ({ id: po._id, vendorName: po.vendorName, status: po.status, totalCents: po.totalCents, jobTitle: po.jobId ? jobById.get(po.jobId)?.title ?? "Unassigned" : "Unassigned" })),
      },
      revenue: {
        ...totals,
        arCents,
        grossMarginPercent: pct(totals.grossProfitCents, totals.invoicedCents || totals.bookedRevenueCents),
        serviceLineProfitability,
        invoices: customerInvoices.map((invoice) => ({ id: invoice._id, invoiceNumber: invoice.invoiceNumber, customerName: customerById.get(invoice.customerId)?.name ?? "Unknown", status: invoice.status, totalCents: invoice.totalCents, paidCents: invoice.paidCents, balanceCents: Math.max(0, invoice.totalCents - invoice.paidCents) })),
        payments: collections.customerPayments.map((payment) => ({ id: payment._id, customerName: customerById.get(payment.customerId)?.name ?? "Unknown", status: payment.status, method: payment.method, amountCents: payment.amountCents, receivedAt: payment.receivedAt })),
      },
    };
  },
});

export const updateLead = mutation({
  args: {
    leadId: v.id("leads"),
    status: v.optional(leadStatus),
    grade: v.optional(leadGrade),
    hidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.organizationId !== org._id) throw new Error("Lead not found.");
    const now = Date.now();
    await ctx.db.patch(args.leadId, {
      status: args.status ?? lead.status,
      grade: args.grade ?? lead.grade,
      hiddenAt: args.hidden === true ? now : args.hidden === false ? undefined : lead.hiddenAt,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", { organizationId: org._id, action: "lead.ops.update", entityType: "lead", entityId: args.leadId, summary: `Updated ${lead.title}`, before: { status: lead.status, grade: lead.grade }, after: args, createdAt: now });
  },
});

export const bulkUpdateLeads = mutation({
  args: { leadIds: v.array(v.id("leads")), status: leadStatus },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const now = Date.now();
    let updated = 0;
    for (const leadId of args.leadIds) {
      const lead = await ctx.db.get(leadId);
      if (!lead || lead.organizationId !== org._id) continue;
      await ctx.db.patch(leadId, { status: args.status, updatedAt: now });
      updated += 1;
    }
    await ctx.db.insert("auditEvents", { organizationId: org._id, action: "lead.ops.bulk_update", entityType: "lead", entityId: org._id, summary: `Bulk updated ${updated} leads to ${args.status}`, after: args, createdAt: now });
    return { updated };
  },
});

export const upsertLeadStatusSetting = mutation({
  args: {
    id: v.optional(v.id("leadStatusSettings")),
    status: leadStatus,
    label: v.string(),
    color: v.string(),
    sortOrder: v.number(),
    terminal: v.boolean(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const now = Date.now();
    const label = args.label.trim();
    const color = args.color.trim() || "#64748b";
    if (!label) throw new Error("Workflow status label is required.");

    const existing = args.id
      ? await ctx.db.get(args.id)
      : await ctx.db.query("leadStatusSettings").withIndex("by_org_status", (q) => q.eq("organizationId", org._id).eq("status", args.status)).first();
    if (args.id && (!existing || existing.organizationId !== org._id)) throw new Error("Workflow status setting not found.");

    const patch = {
      status: args.status,
      label,
      color,
      sortOrder: Math.max(0, Math.round(args.sortOrder)),
      terminal: args.terminal,
      active: args.active,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      await ctx.db.insert("auditEvents", {
        organizationId: org._id,
        action: "workflow_status.update",
        entityType: "organization",
        entityId: org._id,
        summary: `Updated workflow status ${label}`,
        before: { status: existing.status, label: existing.label, color: existing.color, sortOrder: existing.sortOrder, terminal: existing.terminal, active: existing.active },
        after: patch,
        createdAt: now,
      });
      return existing._id;
    }

    const statusSettingId = await ctx.db.insert("leadStatusSettings", { organizationId: org._id, ...patch, createdAt: now });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      action: "workflow_status.create",
      entityType: "organization",
      entityId: org._id,
      summary: `Created workflow status ${label}`,
      after: { statusSettingId, ...patch },
      createdAt: now,
    });
    return statusSettingId;
  },
});

export const createLeadImportPreview = mutation({
  args: {
    fileName: v.optional(v.string()),
    csvText: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    return await createLeadImportPreviewJob(ctx, {
      organizationId: org._id,
      actorUserId: owner?.userId,
      fileName: args.fileName,
      csvText: args.csvText,
    });
  },
});

export const commitLeadImportRows = mutation({
  args: {
    importJobId: v.id("importJobs"),
    rowIds: v.optional(v.array(v.id("importRows"))),
    includeReviewRows: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const owner = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first();
    return await commitLeadImportJob(ctx, {
      organizationId: org._id,
      importJobId: args.importJobId,
      actorUserId: owner?.userId,
      rowIds: args.rowIds,
      includeReviewRows: args.includeReviewRows,
    });
  },
});

export const updateMemberRole = mutation({
  args: { membershipId: v.id("memberships"), role },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.organizationId !== org._id) throw new Error("Membership not found.");
    await ctx.db.patch(args.membershipId, { role: args.role, updatedAt: Date.now() });
  },
});

export const inviteMember = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    role,
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const email = normalizeEmail(args.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid teammate email is required.");
    if (args.role === "owner") throw new Error("Invite teammates as admin, manager, sales, dispatcher, crew lead, or technician.");

    const memberships = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect();
    const existingRows = await Promise.all(memberships.map(async (membership) => ({ membership, user: await ctx.db.get(membership.userId) })));
    const existing = existingRows.find((row) => normalizeEmail(row.membership.invitedEmail ?? row.user?.email ?? "") === email)?.membership;
    if (existing && ["active", "invited"].includes(existing.status)) throw new Error("That teammate is already active or invited.");

    const now = Date.now();
    const existingUser = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
    const userId =
      existingUser?._id ??
      await ctx.db.insert("users", {
        clerkUserId: `demo-invite:${org._id}:${email}`,
        name: args.name?.trim() || email,
        email,
        createdAt: now,
        updatedAt: now,
      });
    const patch = {
      userId,
      role: args.role,
      status: "invited" as const,
      invitedEmail: email,
      inviteToken: `demo-invite-${now}-${email.replace(/[^a-z0-9]/g, "-")}`,
      inviteExpiresAt: now + Math.max(1, Math.min(30, Math.round(args.expiresInDays ?? 14))) * 24 * 60 * 60 * 1000,
      inviteAcceptedAt: undefined,
      inviteRevokedAt: undefined,
      updatedAt: now,
    };
    const membershipId = existing
      ? existing._id
      : await ctx.db.insert("memberships", {
          organizationId: org._id,
          ...patch,
          joinedAt: now,
        });
    if (existing) await ctx.db.patch(existing._id, patch);

    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      action: "member.invite",
      entityType: "organization",
      entityId: org._id,
      summary: `Invited ${email} as ${args.role}`,
      after: { membershipId, email, role: args.role },
      createdAt: now,
    });

    return { membershipId, userId, email, status: "invited" as const };
  },
});

export const revokeMemberInvite = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.organizationId !== org._id) throw new Error("Invite not found.");
    if (membership.status !== "invited" && membership.status !== "expired") throw new Error("Only pending or expired invites can be revoked.");
    const now = Date.now();
    await ctx.db.patch(args.membershipId, { status: "revoked", inviteRevokedAt: now, updatedAt: now });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      action: "member.invite.revoke",
      entityType: "organization",
      entityId: org._id,
      summary: `Revoked invite ${membership.invitedEmail ?? membership.userId}`,
      before: { status: membership.status },
      after: { status: "revoked" },
      createdAt: now,
    });
  },
});

export const expireMemberInvite = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.organizationId !== org._id) throw new Error("Invite not found.");
    if (membership.status !== "invited") throw new Error("Only pending invites can expire.");
    const now = Date.now();
    await ctx.db.patch(args.membershipId, { status: "expired", updatedAt: now });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      action: "member.invite.expire",
      entityType: "organization",
      entityId: org._id,
      summary: `Expired invite ${membership.invitedEmail ?? membership.userId}`,
      before: { status: membership.status },
      after: { status: "expired" },
      createdAt: now,
    });
  },
});

export const upsertLaborRate = mutation({
  args: {
    id: v.optional(v.id("laborRateCards")),
    roleName: v.string(),
    hourlyCostCents: v.number(),
    billableRateCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const now = Date.now();
    const roleName = args.roleName.trim();
    if (!roleName) throw new Error("Labor role is required.");
    const hourlyCostCents = Math.max(0, Math.round(args.hourlyCostCents));
    const billableRateCents = args.billableRateCents === undefined ? undefined : Math.max(0, Math.round(args.billableRateCents));
    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing || existing.organizationId !== org._id) throw new Error("Labor rate not found.");
      await ctx.db.patch(args.id, { roleName, name: `${roleName} override`, hourlyCostCents, billableRateCents, source: "admin_override", updatedAt: now });
      await ctx.db.insert("auditEvents", {
        organizationId: org._id,
        action: "labor_rate.update",
        entityType: "labor_rate_card",
        entityId: args.id,
        summary: `Updated labor rate ${roleName}`,
        before: { roleName: existing.roleName, hourlyCostCents: existing.hourlyCostCents, billableRateCents: existing.billableRateCents, source: existing.source, active: existing.active },
        after: { roleName, hourlyCostCents, billableRateCents, source: "admin_override", active: existing.active },
        createdAt: now,
      });
      return args.id;
    }
    const rateId = await ctx.db.insert("laborRateCards", { organizationId: org._id, roleName, name: `${roleName} override`, hourlyCostCents, billableRateCents, source: "admin_override", active: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      action: "labor_rate.create",
      entityType: "labor_rate_card",
      entityId: rateId,
      summary: `Created labor rate ${roleName}`,
      after: { rateId, roleName, hourlyCostCents, billableRateCents, source: "admin_override", active: true },
      createdAt: now,
    });
    return rateId;
  },
});

export const upsertVendorCatalogItem = mutation({
  args: {
    id: v.optional(v.id("vendorCatalogs")),
    vendorName: v.string(),
    itemName: v.string(),
    category: serviceCategory,
    unit: v.string(),
    unitCostCents: v.number(),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const now = Date.now();
    const vendorName = args.vendorName.trim();
    const itemName = args.itemName.trim();
    const unit = args.unit.trim();
    if (!vendorName || !itemName || !unit) throw new Error("Vendor, item, and unit are required.");
    const unitCostCents = Math.max(0, Math.round(args.unitCostCents));
    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing || existing.organizationId !== org._id) throw new Error("Vendor item not found.");
      await ctx.db.patch(args.id, { vendorName, itemName, category: args.category, unit, unitCostCents, source: "admin_override", updatedAt: now });
      await ctx.db.insert("auditEvents", {
        organizationId: org._id,
        action: "vendor_catalog.update",
        entityType: "vendor_catalog",
        entityId: args.id,
        summary: `Updated vendor item ${itemName}`,
        before: { vendorName: existing.vendorName, itemName: existing.itemName, category: existing.category, unit: existing.unit, unitCostCents: existing.unitCostCents, source: existing.source, active: existing.active },
        after: { vendorName, itemName, category: args.category, unit, unitCostCents, source: "admin_override", active: existing.active },
        createdAt: now,
      });
      return args.id;
    }
    const vendorCatalogId = await ctx.db.insert("vendorCatalogs", { organizationId: org._id, vendorName, itemName, category: args.category, unit, unitCostCents, source: "admin_override", active: true, createdAt: now, updatedAt: now });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      action: "vendor_catalog.create",
      entityType: "vendor_catalog",
      entityId: vendorCatalogId,
      summary: `Created vendor item ${itemName}`,
      after: { vendorCatalogId, vendorName, itemName, category: args.category, unit, unitCostCents, source: "admin_override", active: true },
      createdAt: now,
    });
    return vendorCatalogId;
  },
});

export const addTimesheetEntry = mutation({
  args: {
    jobId: v.id("jobs"),
    roleName: v.string(),
    hours: v.number(),
    hourlyCostCents: v.number(),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.organizationId !== org._id) throw new Error("Job not found.");
    const now = Date.now();
    const id = await ctx.db.insert("timesheetEntries", {
      organizationId: org._id,
      jobId: args.jobId,
      status: "approved",
      roleName: args.roleName,
      startedAt: now - args.hours * 60 * 60 * 1000,
      endedAt: now,
      hours: args.hours,
      hourlyCostCents: args.hourlyCostCents,
      totalCostCents: moneyPerHour(args.hours, args.hourlyCostCents),
      createdAt: now,
      updatedAt: now,
    });
    await recalculateJobCostSummaries(ctx, org._id);
    return id;
  },
});

export const recordCustomerPayment = mutation({
  args: { invoiceId: v.id("customerInvoices"), amountCents: v.number(), method: v.union(v.literal("cash"), v.literal("check"), v.literal("card"), v.literal("ach"), v.literal("other")) },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.organizationId !== org._id) throw new Error("Invoice not found.");
    const now = Date.now();
    const paymentId = await ctx.db.insert("customerPayments", {
      organizationId: org._id,
      customerId: invoice.customerId,
      invoiceId: args.invoiceId,
      status: "posted",
      method: args.method,
      amountCents: args.amountCents,
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("paymentAllocations", { organizationId: org._id, paymentId, invoiceId: args.invoiceId, amountCents: args.amountCents, createdAt: now });
    const paidCents = Math.min(invoice.totalCents, invoice.paidCents + args.amountCents);
    await ctx.db.patch(args.invoiceId, { paidCents, status: paidCents >= invoice.totalCents ? "paid" : "partially_paid", paidAt: paidCents >= invoice.totalCents ? now : invoice.paidAt, updatedAt: now });
    await recalculateJobCostSummaries(ctx, org._id);
    return paymentId;
  },
});

export const recalculateDemoJobCosts = mutation({
  args: {},
  handler: async (ctx) => {
    const org = await requireDemoOrg(ctx);
    const recalculated = await recalculateJobCostSummaries(ctx, org._id);
    return { recalculated };
  },
});

export const priceDemoFertilizationProgram = mutation({
  args: {
    propertyId: v.id("properties"),
    propertyAreaId: v.optional(v.id("propertyAreas")),
    materialId: v.id("materials"),
    priceBookItemId: v.optional(v.id("priceBookItems")),
    applicationCount: v.number(),
    materialRateUnitsPer1000SqFt: v.number(),
    laborHoursPerApplication: v.number(),
    laborRateCents: v.number(),
    equipmentCostCentsPerApplication: v.number(),
    overheadPercent: v.number(),
    targetMarginPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const org = await requireDemoOrg(ctx);
    const [property, propertyArea, material, requestedPriceBookItem, owner] = await Promise.all([
      ctx.db.get(args.propertyId),
      args.propertyAreaId ? ctx.db.get(args.propertyAreaId) : undefined,
      ctx.db.get(args.materialId),
      args.priceBookItemId ? ctx.db.get(args.priceBookItemId) : undefined,
      ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first(),
    ]);
    if (!property || property.organizationId !== org._id) throw new Error("Property not found.");
    if (!material || material.organizationId !== org._id) throw new Error("Material not found.");
    if (args.propertyAreaId && (!propertyArea || propertyArea.organizationId !== org._id || propertyArea.propertyId !== property._id)) throw new Error("Property area not found.");
    if (args.priceBookItemId && (!requestedPriceBookItem || requestedPriceBookItem.organizationId !== org._id)) throw new Error("Price book item not found.");

    const fallbackPriceBookItem = requestedPriceBookItem
      ?? (await ctx.db.query("priceBookItems").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect())
        .find((item) => item.active && item.name.toLowerCase().includes("six-step"));
    const pricingRules = fallbackPriceBookItem
      ? await ctx.db.query("pricingRules").withIndex("by_price_book_item", (q) => q.eq("priceBookItemId", fallbackPriceBookItem._id)).collect()
      : [];
    const turfAreaSqFt = Math.round(propertyArea?.unit === "sq_ft" && propertyArea.size ? propertyArea.size : property.lawnSizeSqFt ?? 0);
    if (turfAreaSqFt <= 0) throw new Error("A lawn size or sq_ft property area is required for fertilization pricing.");

    const adjustments = activeFertilizationPricingAdjustments(
      pricingRules.map((rule) => ({
        name: rule.name,
        active: rule.active,
        order: rule.order,
        condition: normalizeRuleCondition(rule.condition),
        adjustmentType: rule.adjustmentType,
        adjustmentValue: rule.adjustmentValue,
      })),
      { turfAreaSqFt, applicationCount: args.applicationCount },
    );
    const output = calculateFertilizationProgramPricing({
      turfAreaSqFt,
      applicationCount: args.applicationCount,
      materialUnitCostCents: material.costCents ?? 0,
      materialRateUnitsPer1000SqFt: args.materialRateUnitsPer1000SqFt,
      laborHoursPerApplication: args.laborHoursPerApplication,
      laborRateCents: args.laborRateCents,
      equipmentCostCentsPerApplication: args.equipmentCostCentsPerApplication,
      overheadPercent: args.overheadPercent,
      targetMarginPercent: args.targetMarginPercent,
      priceBookRateCentsPerSqFt: inferPriceBookRateCentsPerSqFt(fallbackPriceBookItem),
      minPriceCents: fallbackPriceBookItem?.minPriceCents ?? 0,
      adjustments,
    });
    const now = Date.now();
    const sessionId = await ctx.db.insert("pricingCalculatorSessions", {
      organizationId: org._id,
      propertyId: property._id,
      inputs: {
        kind: "fertilization_program",
        ...args,
        resolvedPropertyAreaId: propertyArea?._id,
        materialName: material.name,
        resolvedPriceBookItemId: fallbackPriceBookItem?._id,
        priceBookItemName: fallbackPriceBookItem?.name,
      },
      outputs: output,
      createdByUserId: owner?.userId,
      createdAt: now,
    });
    await ctx.db.insert("auditEvents", {
      organizationId: org._id,
      actorUserId: owner?.userId,
      action: "demo.pricing.fertilization.calculate",
      entityType: "property",
      entityId: property._id,
      summary: `Calculated fertilization program for ${property.label}`,
      after: { sessionId, recommendedPriceCents: output.recommendedPriceCents, turfAreaSqFt },
      createdAt: now,
    });
    return { sessionId, output };
  },
});

export const refreshCostIntelligence = mutation({
  args: {},
  handler: async (ctx) => {
    const org = await requireDemoOrg(ctx);
    return await refreshCostSnapshots(ctx, org._id);
  },
});

export const runStaleLeadCheck = mutation({
  args: {},
  handler: async (ctx) => {
    const org = await requireDemoOrg(ctx);
    const inserted = await flagStaleLeads(ctx, org._id);
    return { inserted };
  },
});

export const scheduledRefreshCostIntelligence = internalMutation({
  args: {},
  handler: async (ctx) => {
    const organizations = await listOperatingOrganizations(ctx);
    let inserted = 0;
    for (const org of organizations) {
      const result = await refreshCostSnapshots(ctx, org._id);
      inserted += result.inserted;
    }
    return { organizations: organizations.length, inserted };
  },
});

export const scheduledRefreshWeatherSnapshots = internalMutation({
  args: {},
  handler: async (ctx) => {
    const organizations = await listOperatingOrganizations(ctx);
    let inserted = 0;
    for (const org of organizations) {
      inserted += await refreshWeatherSnapshots(ctx, org._id);
    }
    return { organizations: organizations.length, inserted };
  },
});

export const scheduledStaleLeadChecks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const organizations = await listOperatingOrganizations(ctx);
    let inserted = 0;
    for (const org of organizations) {
      inserted += await flagStaleLeads(ctx, org._id);
    }
    return { organizations: organizations.length, inserted };
  },
});

export const scheduledRecalculateJobCosts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const organizations = await listOperatingOrganizations(ctx);
    let recalculated = 0;
    for (const org of organizations) {
      recalculated += await recalculateJobCostSummaries(ctx, org._id);
    }
    return { organizations: organizations.length, recalculated };
  },
});
