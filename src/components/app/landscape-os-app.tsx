"use client";

import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CloudSun,
  Database,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  Gauge,
  Layers,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Menu,
  Package,
  Plus,
  Receipt,
  Route,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sprout,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { demoWorkspace } from "@/data/demo-workspace";
import { primeTimeBacklog, primeTimeGroups, type PrimeTimeStatus } from "@/data/prime-time-roadmap";
import type { JobVisit, Opportunity, WorkspaceSnapshot } from "@/domain/types";
import {
  canAdvanceOpportunity,
  nextOpportunityStage,
  opportunityStageLabel,
  opportunityStages,
  previousOpportunityStage,
  roleLabel,
  statusTone,
  visitStatusLabel,
  type Role,
  type ServiceCategory,
} from "@/domain/workflow";
import { cn, currency, googleMapsUrl, shortDate, timeRange } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type View = "dashboard" | "prime_time" | "lead_ops" | "crm" | "pipeline" | "dispatch" | "jobs" | "field" | "costing" | "profit" | "cost_intel" | "admin" | "onboarding" | "specs";

const navItems: Array<{ id: View; label: string; icon: ReactNode }> = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "prime_time", label: "Prime Time", icon: <ListChecks size={18} /> },
  { id: "lead_ops", label: "Lead Ops", icon: <Filter size={18} /> },
  { id: "crm", label: "CRM", icon: <UsersRound size={18} /> },
  { id: "pipeline", label: "Pipeline", icon: <Gauge size={18} /> },
  { id: "dispatch", label: "Dispatch", icon: <CalendarDays size={18} /> },
  { id: "jobs", label: "Jobs", icon: <ClipboardList size={18} /> },
  { id: "field", label: "Field", icon: <Route size={18} /> },
  { id: "costing", label: "Costing", icon: <Calculator size={18} /> },
  { id: "profit", label: "Profit", icon: <BarChart3 size={18} /> },
  { id: "cost_intel", label: "Cost Intel", icon: <CloudSun size={18} /> },
  { id: "admin", label: "Admin", icon: <Settings size={18} /> },
  { id: "onboarding", label: "Onboarding", icon: <Briefcase size={18} /> },
  { id: "specs", label: "Specs", icon: <Database size={18} /> },
];

const categoryLabels: Record<ServiceCategory, string> = {
  lawn_care: "Lawn care",
  landscaping: "Landscaping",
  pest_control: "Pest control",
  tree_shrub: "Tree & shrub",
  irrigation: "Irrigation",
  snow: "Snow",
  maintenance: "Maintenance",
};

type LeadType = "phone_call" | "form" | "direct_email" | "referral" | "other";
type AccountType = "residential" | "commercial";
type LeadUrgency = "low" | "normal" | "high";
type IndustryFocus = "landscaping" | "pest_control" | "both";
type BillingPlan = "free" | "starter" | "pro" | "growth" | "enterprise";

const billingPlanLabels: Record<BillingPlan, string> = {
  free: "Free - 10 contacts",
  starter: "Legacy Starter",
  pro: "$99/mo All-In Pro",
  growth: "Legacy Growth",
  enterprise: "Legacy Enterprise",
};

type LeadFormState = {
  customerName: string;
  title: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  value: string;
  serviceLine: ServiceCategory;
  source: string;
  leadType: LeadType;
  accountType: AccountType;
  companyAssignment: string;
  lawnSizeSqFt: string;
  urgency: LeadUrgency;
  message: string;
  estimateNotes: string;
};

type ClientOnboardingFormState = {
  companyName: string;
  ownerName: string;
  ownerEmail: string;
  industryFocus: IndustryFocus;
  billingPlan: BillingPlan;
  timezone: string;
  serviceTerritory: string;
  services: ServiceCategory[];
  importSource: string;
  seats: string;
};

type ProvisionedClientWorkspace = {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  industryFocus: IndustryFocus;
  billingPlan: BillingPlan;
  seats: number;
  createdAt: number;
  checklist: string[];
};

type GlobalSearchResult = {
  id: string;
  kind: "Customer" | "Lead" | "Opportunity" | "Job" | "Visit" | "Task";
  label: string;
  detail: string;
  view: View;
  customerId?: string;
  jobId?: string;
  visitId?: string;
  searchText?: string;
};

type ActivityComposerKind = Extract<WorkspaceSnapshot["activities"][number]["kind"], "call" | "email" | "note">;

type ActivityComposerState = {
  kind: ActivityComposerKind;
  body: string;
  createFollowUp: boolean;
  dueInDays: string;
};

const activityKindLabels: Record<ActivityComposerKind, string> = {
  note: "Internal note",
  call: "Call",
  email: "Email",
};

const leadSourceOptions = ["Manual entry", "Website form", "Phone", "Referral", "Google Maps", "Door hanger", "Import"];
const leadTypeOptions: Array<{ value: LeadType; label: string }> = [
  { value: "phone_call", label: "Phone call" },
  { value: "form", label: "Form" },
  { value: "direct_email", label: "Direct email" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];

function defaultLeadForm(): LeadFormState {
  return {
    customerName: "",
    title: "",
    phone: "",
    email: "",
    street: "",
    city: "Foxborough",
    state: "MA",
    postalCode: "",
    value: "2500",
    serviceLine: "pest_control",
    source: "Manual entry",
    leadType: "phone_call",
    accountType: "residential",
    companyAssignment: "Turf Pro",
    lawnSizeSqFt: "",
    urgency: "normal",
    message: "",
    estimateNotes: "",
  };
}

function defaultActivityComposer(): ActivityComposerState {
  return {
    kind: "note",
    body: "",
    createFollowUp: false,
    dueInDays: "2",
  };
}

function defaultClientOnboardingForm(): ClientOnboardingFormState {
  return {
    companyName: "",
    ownerName: "",
    ownerEmail: "",
    industryFocus: "both",
    billingPlan: "free",
    timezone: "America/New_York",
    serviceTerritory: "Foxborough, Mansfield, Sharon",
    services: ["lawn_care", "pest_control"],
    importSource: "CSV lead/customer import",
    seats: "5",
  };
}

type BackendBlueprint = {
  productName: string;
  deploymentTarget: string;
  modules: Array<{ name: string; status: string; details: string[] }>;
  tableGroups: Array<{ group: string; tables: string[] }>;
  netlifyParity: string[];
  readiness: Array<{ item: string; status: string; owner: string }>;
  publicV1Interfaces: string[];
  deferredInterfaces: string[];
};

type BackendState = {
  mode: "local" | "convex-loading" | "convex-live";
  label: string;
  detail: string;
  blueprint?: BackendBlueprint | null;
};

type LiveActions = {
  createLead?: (input: {
    customerName: string;
    title: string;
    phone?: string;
    email?: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    valueCents: number;
    serviceLine: ServiceCategory;
    source: string;
    leadType: LeadType;
    accountType: AccountType;
    companyAssignment?: string;
    lawnSizeSqFt?: number;
    urgency: LeadUrgency;
    message?: string;
    estimateNotes?: string;
  }) => void;
  advanceOpportunity?: (opportunityId: string, stage: Opportunity["stage"]) => void;
  assignVisit?: (visitId: string, crewId: string) => void;
  completeChecklistItem?: (visitId: string, itemId: string) => void;
  submitVisit?: (visitId: string, issueFlag?: string) => void;
  addTask?: (jobId: string, title: string) => void;
  addActivity?: (input: {
    entityType: "customer" | "job";
    entityId: string;
    kind: ActivityComposerKind;
    summary: string;
    createFollowUp: boolean;
    dueInDays: number;
  }) => void;
  createCrew?: (name: string) => void;
  toggleService?: (itemId: string) => void;
};

type LeadOpsRow = {
  id: string;
  title: string;
  customerName: string;
  city: string;
  source: string;
  status: string;
  grade: string;
  ownerName: string;
  programRequests: ServiceCategory[];
  qualityScore: number;
  spamScore: number;
  valueCents: number;
  receivedAt: number;
  issueCount: number;
  hidden: boolean;
  slaDueAt: number;
  slaStatus: "on_track" | "due_soon" | "overdue" | "closed";
  sourceCloseRate: number;
  sourceAverageTicketCents: number;
  duplicateWarnings: string[];
  estimateReady: boolean;
  estimateReadiness: Array<{ label: string; status: "ready" | "warning" | "blocked"; detail: string }>;
  propertySummary: string;
  serviceFit: string;
  territoryStatus: string;
  suggestedNextStep: string;
  conversionOptions: Array<{ label: string; targetStatus: string; primary?: boolean }>;
  reasonCodes: string[];
};

type OperatingDepth = {
  seeded: boolean;
  leadOps: {
    rows: LeadOpsRow[];
    savedViews: Array<{ id: string; name: string; scope: string; filters: unknown; columns: string[] }>;
    statusSettings: Array<{ id: string; status: string; label: string; color: string; terminal: boolean; active: boolean }>;
    qualityIssues: Array<{ id: string; kind: string; severity: string; status: string; summary: string; leadId?: string }>;
    metrics: { openLeads: number; highQuality: number; spamReview: number; unassigned: number; slaOverdue: number; duplicates: number; estimateReady: number };
  };
  fieldOps: {
    routeConfidence: Array<{ visitId: string; score: number; warnings: string[]; requiredSkills: string[]; crewSkills: string[]; weatherRisk: string; equipmentConflicts: string[] }>;
    materialLots: Array<{ visitId: string; materialName: string; epaNumber?: string; lotNumber: string; quantity: string; applicator: string; weatherRisk: string }>;
    timeBreakdowns: Array<{ jobId: string; jobTitle: string; estimatedMinutes: number; scheduledMinutes: number; actualMinutes: number; driveMinutes: number; nonBillableMinutes: number; varianceMinutes: number }>;
    callbacks: Array<{ id: string; jobTitle: string; customerName: string; reason: string; severity: string; status: string }>;
    equipmentCheckouts: Array<{ visitId: string; equipmentName: string; status: string; maintenanceDue: boolean; assignedCrew: string }>;
    importQaRows: Array<{ id: string; source: string; rowLabel: string; status: string; issues: string[]; mappedEntity: string }>;
  };
  admin: {
    members: Array<{ id: string; userId: string; name: string; email: string; role: Role; status: string }>;
    permissionMatrix: Array<{ permission: string; roles: Role[] }>;
    featureFlags: Array<{ id: string; key: string; enabled: boolean }>;
    auditEvents: Array<{ id: string; action: string; summary: string; entityType: string; createdAt: number }>;
    tagTaxonomy: Array<{ id: string; key: string; label: string; category: string; color: string; active: boolean; usageCount: number }>;
    segmentCards: Array<{ label: string; customerCount: number; revenueCents: number; grossProfitCents: number; churnRiskPercent: number }>;
    ownerAnalytics: {
      kpis: {
        retentionRatePercent: number;
        churnRatePercent: number;
        averageLtvCents: number;
        cacCents: number;
        ltvToCac: number;
        netRevenueRetentionPercent: number;
        avgGrossMarginPercent: number;
        breakEvenRevenueCents: number;
      };
      churn: Array<{ segment: string; customers: number; atRisk: number; churnRatePercent: number; ltvAtRiskCents: number; drivers: string[] }>;
      ltv: Array<{ segment: string; averageLtvCents: number; averageGrossProfitCents: number; paybackMonths: number }>;
      pnl: Array<{ label: string; valueCents: number; kind: string }>;
      costBreakdown: Array<{ label: string; valueCents: number; percent: number }>;
      trend: Array<{ month: string; revenueCents: number; grossProfitCents: number; costCents: number; churnRatePercent: number }>;
    };
  };
  costIntelligence: {
    laborRates: Array<{ id: string; name: string; roleName: string; source: string; hourlyCostCents: number; billableRateCents?: number; active: boolean }>;
    equipmentRates: Array<{ id: string; name: string; category: string; hourlyCostCents: number; billableRateCents?: number; active: boolean }>;
    vendorCatalogs: Array<{ id: string; vendorName: string; itemName: string; category: ServiceCategory; unit: string; unitCostCents: number; source: string; active: boolean }>;
    costSnapshots: Array<{ id: string; source: string; kind: string; label: string; value: number; unit: string; region?: string; capturedAt: number }>;
    weatherSnapshots: Array<{ id: string; propertyName: string; conditions: string; temperatureF?: number; windMph?: number; precipitationProbability?: number; applicationRisk: string; observedAt: number }>;
  };
  jobCosting: {
    summaries: Array<{
      id: string;
      jobId: string;
      jobTitle: string;
      customerName: string;
      crewName: string;
      status: string;
      estimatedRevenueCents: number;
      actualRevenueCents: number;
      invoicedCents: number;
      collectedCents: number;
      actualLaborCostCents: number;
      actualMaterialCostCents: number;
      actualEquipmentCostCents: number;
      overheadCostCents: number;
      grossProfitCents: number;
      grossMarginPercent: number;
      varianceCents: number;
    }>;
    timesheets: Array<{ id: string; jobTitle: string; roleName: string; hours: number; totalCostCents: number; status: string }>;
    purchaseOrders: Array<{ id: string; vendorName: string; status: string; totalCents: number; jobTitle: string }>;
  };
  revenue: {
    pipelineCents: number;
    bookedRevenueCents: number;
    completedRevenueCents: number;
    invoicedCents: number;
    collectedCents: number;
    laborCostCents: number;
    materialCostCents: number;
    equipmentCostCents: number;
    overheadCostCents: number;
    grossProfitCents: number;
    arCents: number;
    grossMarginPercent: number;
    invoices: Array<{ id: string; invoiceNumber: string; customerName: string; status: string; totalCents: number; paidCents: number; balanceCents: number }>;
    payments: Array<{ id: string; customerName: string; status: string; method: string; amountCents: number; receivedAt: number }>;
  };
};

type OperatingActions = {
  bootstrap?: () => void;
  updateLead?: (leadId: string, fields: { status?: string; grade?: string; hidden?: boolean }) => void;
  bulkUpdateLeads?: (leadIds: string[], status: string) => void;
  updateMemberRole?: (membershipId: string, role: Role) => void;
  upsertLaborRate?: (input: { id?: string; roleName: string; hourlyCostCents: number; billableRateCents?: number }) => void;
  upsertVendorCatalogItem?: (input: { id?: string; vendorName: string; itemName: string; category: ServiceCategory; unit: string; unitCostCents: number }) => void;
  addTimesheetEntry?: (jobId: string, roleName: string, hours: number, hourlyCostCents: number) => void;
  recordCustomerPayment?: (invoiceId: string, amountCents: number, method: "cash" | "check" | "card" | "ach" | "other") => void;
  recalculateJobCosts?: () => void;
  refreshCostIntelligence?: () => void;
};

const fallbackBackendBlueprint: BackendBlueprint = {
  productName: "Landscape/Pest SaaS Operating System",
  deploymentTarget: "local demo fallback",
  modules: [
    {
      name: "CRM + Lead Ops",
      status: "implemented",
      details: ["Customers, contacts, properties, leads, opportunities, notes, tasks, and timelines.", "Lead fields cover grade, source, company assignment, program request, lawn size, status, phones, email, and messages."],
    },
    {
      name: "Data Quality + Spam",
      status: "implemented",
      details: ["Duplicate, city spelling, bad phone, invalid email, missing name, stale follow-up, and potential spam issues are modeled.", "Spam rules score email prefixes, solicitation phrases, and missing contact data."],
    },
    {
      name: "Estimating + Dispatch + Field",
      status: "implemented",
      details: ["Service catalog, price books, estimate line items, jobs, visits, crews, checklists, route plans, materials, and photos.", "Field completion turns checklist and issue flags into auditable visit updates."],
    },
    {
      name: "Lead Ops Command Center",
      status: "implemented",
      details: ["Lead table, saved views, owner/status/source/program/quality/spam fields, bulk actions, status/grade edits, hidden state, and import-ready issue counts.", "Lead activity and audit boundaries are modeled for conversion into opportunity, estimate, and job workflows."],
    },
    {
      name: "Job Costing + Profit",
      status: "implemented",
      details: ["Estimated vs actual revenue, labor, materials, equipment, overhead, gross profit, margin, and variance are summarized by job.", "Invoices, payments, timesheets, purchase orders, job cost summaries, profitability snapshots, and P&L snapshots are present for operating finance."],
    },
    {
      name: "Tags + Lifecycle Analytics",
      status: "implemented",
      details: ["Governed tag definitions and entity-tag relationships power customer, service, source, risk, and profitability segmentation.", "Customer lifecycle snapshots track ARR, lifetime revenue, cost, gross profit, estimated LTV, churn risk, churn drivers, and next-best actions."],
    },
    {
      name: "Cost Intelligence",
      status: "implemented-demo-data",
      details: ["NWS weather snapshots, BLS labor defaults, FRED/World Bank fertilizer trend context, route drive time, and admin/vendor overrides are modeled.", "Scheduled Convex jobs refresh cost and weather snapshots; live API fetch adapters are next."],
    },
    {
      name: "SaaS Ops",
      status: "ready-boundary",
      details: ["Clerk organizations/users map to Convex organizations/users/memberships.", "Role editor, permission matrix, feature flags, workflow status settings, onboarding, account health, audit events, imports, exports, and reporting watermarks are present in the backend model."],
    },
  ],
  tableGroups: [
    { group: "Identity", tables: ["organizations", "users", "memberships", "featureFlags", "notificationPreferences"] },
    { group: "CRM", tables: ["customers", "contacts", "properties", "propertyAreas", "leads", "opportunities", "tasks", "activities", "notes", "files"] },
    { group: "Quality", tables: ["dataQualityIssues", "spamRules", "cityNormalizationRules", "duplicateReviewDecisions", "leadSavedViews", "leadStatusSettings", "leadIntakeForms", "leadIntakeSubmissions"] },
    { group: "Pricing", tables: ["serviceCatalogItems", "servicePackages", "estimateTemplates", "estimates", "estimateLineItems", "priceBooks", "priceBookItems", "pricingRules", "pricingCalculatorSessions"] },
    { group: "Field Ops", tables: ["jobs", "jobPhases", "jobVisits", "visitAssignments", "checklistTemplates", "crews", "crewMembers", "routePlans", "routeStops", "photos", "materials", "materialApplications", "equipment"] },
    { group: "Cost + Finance", tables: ["laborRateCards", "equipmentRateCards", "vendorCatalogs", "costSnapshots", "weatherSnapshots", "routeDriveTimeEstimates", "timesheetEntries", "purchaseOrders", "customerInvoices", "customerPayments", "paymentAllocations", "jobCostSummaries", "profitabilitySnapshots", "pnlSnapshots"] },
    { group: "Tags + Lifecycle", tables: ["tagDefinitions", "entityTags", "customerLifecycleSnapshots"] },
    { group: "Reporting", tables: ["externalIntegrations", "importJobs", "importRows", "exportJobs", "reportingWatermarks", "analyticsSnapshots", "dashboardWidgets", "automationRules", "automationRuns", "auditEvents"] },
    { group: "SaaS", tables: ["subscriptions", "invoices", "onboardingChecklistItems", "accountHealthScores", "internalNotifications"] },
  ],
  netlifyParity: [
    "Lead CRUD, filters, validation, spam review, hidden/spam logic, data quality queues, city auto-fix, duplicate review, analytics widgets, estimate calculator state, help docs, and changelog concepts.",
    "Green-industry depth now includes lead ops, admin permissions, job costing, local cost intelligence, AR, profit dashboards, and P&L proxy.",
  ],
  readiness: [
    { item: "Convex schema and functions", status: "done", owner: "engineering" },
    { item: "Lead Ops / Admin / Job Costing / Profit UI", status: "done", owner: "product" },
    { item: "Convex scheduled jobs", status: "done", owner: "engineering" },
    { item: "Cost intelligence live API adapters", status: "next", owner: "data" },
    { item: "Clerk production env", status: "next", owner: "ops" },
    { item: "Stripe billing", status: "next", owner: "ops" },
  ],
  publicV1Interfaces: ["Google Maps deep links"],
  deferredInterfaces: ["HubSpot", "SMS", "call tracking", "marketing attribution", "Postgres reporting mirror"],
};

const now = () => Date.now();
const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

function formatStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function percent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function dollarsToCents(value: string) {
  return Math.max(0, Math.round(Number(value || "0") * 100));
}

function numericOrUndefined(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function leadQualityScore(form: LeadFormState) {
  let score = 100;
  if (!form.phone.trim()) score -= 18;
  if (!form.email.trim()) score -= 12;
  if (!form.street.trim() || !form.city.trim() || !form.postalCode.trim()) score -= 18;
  if (!form.message.trim()) score -= 8;
  if (!numericOrUndefined(form.lawnSizeSqFt)) score -= 6;
  if (!form.companyAssignment.trim()) score -= 6;
  return Math.max(20, score);
}

function dateTime(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function monthLabel(value: number) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(new Date(value));
}

function operatingTone(status: string) {
  if (["converted", "won", "paid", "posted", "complete", "completed", "approved", "active", "received"].includes(status)) return "success";
  if (["spam", "lost", "lost_confirmed", "lost_assumed", "disqualified", "void", "failed", "rejected", "overdue", "canceled"].includes(status)) return "danger";
  if (["contacted", "do_estimate", "estimate_provided", "follow_up", "partially_paid", "sent", "submitted", "medium", "high"].includes(status)) return "warning";
  return "neutral";
}

function primeTimeTone(status: PrimeTimeStatus) {
  if (status === "done") return "success";
  if (status === "blocked") return "danger";
  if (status === "in_progress") return "warning";
  return "neutral";
}

const terminalLeadStatuses = new Set(["converted", "lost_confirmed", "lost_assumed", "spam", "disqualified", "unqualified", "passed_on"]);
const serviceTerritoryCities = new Set(["foxborough", "mansfield", "sharon", "wrentham", "plainville", "attleboro", "north attleborough"]);

function minutesBetween(start: number, end: number) {
  return Math.max(0, Math.round((end - start) / 60000));
}

function humanMinutes(minutes: number) {
  const absolute = Math.abs(minutes);
  if (absolute < 60) return `${minutes}m`;
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  return `${minutes < 0 ? "-" : ""}${hours}h${remainder ? ` ${remainder}m` : ""}`;
}

function leadSla(source: string, status: string, receivedAt: number) {
  const normalized = source.toLowerCase();
  const minutes = normalized.includes("website") || normalized.includes("form") ? 15 : normalized.includes("phone") ? 60 : normalized.includes("referral") ? 240 : normalized.includes("import") || normalized.includes("csv") || normalized.includes("legacy") ? 2880 : 1440;
  const slaDueAt = receivedAt + minutes * 60 * 1000;
  if (terminalLeadStatuses.has(status)) return { slaDueAt, slaStatus: "closed" as const };
  const remainingMinutes = Math.round((slaDueAt - now()) / 60000);
  if (remainingMinutes < 0) return { slaDueAt, slaStatus: "overdue" as const };
  if (remainingMinutes <= 30) return { slaDueAt, slaStatus: "due_soon" as const };
  return { slaDueAt, slaStatus: "on_track" as const };
}

function territoryStatus(city?: string) {
  if (!city?.trim()) return "Missing city";
  return serviceTerritoryCities.has(city.trim().toLowerCase()) ? "In territory" : "Needs territory review";
}

function serviceFit(programs: ServiceCategory[]) {
  if (programs.length === 0) return "Needs service mapping";
  const labels = programs.map((program) => categoryLabels[program]).join(" + ");
  return `Catalog fit: ${labels}`;
}

function buildEstimateReadiness({
  customer,
  property,
  programs,
  qualityScore,
  spamScore,
}: {
  customer?: WorkspaceSnapshot["customers"][number];
  property?: WorkspaceSnapshot["properties"][number];
  programs: ServiceCategory[];
  qualityScore: number;
  spamScore: number;
}) {
  const checks: LeadOpsRow["estimateReadiness"] = [
    {
      label: "Contact",
      status: customer?.phone || customer?.email ? "ready" : "blocked",
      detail: customer?.phone || customer?.email ? "Phone or email on file" : "Missing phone and email",
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
      status: property?.lawnSizeSqFt ? "ready" : "warning",
      detail: property?.lawnSizeSqFt ? `${property.lawnSizeSqFt.toLocaleString()} sq ft` : "Use minimum pricing until measured",
    },
    {
      label: "Quality",
      status: qualityScore >= 70 && spamScore < 35 ? "ready" : spamScore >= 35 ? "blocked" : "warning",
      detail: spamScore >= 35 ? "Spam review required" : `${qualityScore} quality / ${spamScore} spam`,
    },
  ];
  return checks;
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

type MaybeOperatingDepth = Partial<OperatingDepth> & {
  leadOps?: Partial<OperatingDepth["leadOps"]> & {
    rows?: Array<Partial<LeadOpsRow>>;
    metrics?: Partial<OperatingDepth["leadOps"]["metrics"]>;
  };
  fieldOps?: Partial<OperatingDepth["fieldOps"]>;
};

function normalizeOperatingDepth(input: OperatingDepth | undefined, fallback: OperatingDepth): OperatingDepth {
  if (!input) return fallback;
  const depth = input as MaybeOperatingDepth;
  const fallbackRowsById = new Map(fallback.leadOps.rows.map((row) => [row.id, row]));
  const liveRows = depth.leadOps?.rows ?? [];
  const liveIds = new Set(liveRows.map((row) => row.id).filter(Boolean));
  const mergedRows = [...liveRows, ...fallback.leadOps.rows.filter((row) => !liveIds.has(row.id))];
  const rows: LeadOpsRow[] = mergedRows.map((row, index) => {
    const fallbackRow = (row.id ? fallbackRowsById.get(row.id) : undefined) ?? fallback.leadOps.rows[index];
    const status = row.status ?? fallbackRow?.status ?? "new";
    const source = row.source ?? fallbackRow?.source ?? "Manual entry";
    const receivedAt = row.receivedAt ?? fallbackRow?.receivedAt ?? now();
    const sla = leadSla(source, status, receivedAt);
    const programs = (row.programRequests ?? fallbackRow?.programRequests ?? []) as ServiceCategory[];
    const qualityScore = row.qualityScore ?? fallbackRow?.qualityScore ?? 0;
    const spamScore = row.spamScore ?? fallbackRow?.spamScore ?? 0;
    return {
      id: row.id ?? fallbackRow?.id ?? `lead-${index}`,
      title: row.title ?? fallbackRow?.title ?? "Untitled lead",
      customerName: row.customerName ?? fallbackRow?.customerName ?? "Unmatched lead",
      city: row.city ?? fallbackRow?.city ?? "",
      source,
      status,
      grade: row.grade ?? fallbackRow?.grade ?? "ungraded",
      ownerName: row.ownerName ?? fallbackRow?.ownerName ?? "Unassigned",
      programRequests: programs,
      qualityScore,
      spamScore,
      valueCents: row.valueCents ?? fallbackRow?.valueCents ?? 0,
      receivedAt,
      issueCount: row.issueCount ?? fallbackRow?.issueCount ?? 0,
      hidden: row.hidden ?? fallbackRow?.hidden ?? false,
      slaDueAt: row.slaDueAt ?? fallbackRow?.slaDueAt ?? sla.slaDueAt,
      slaStatus: row.slaStatus ?? fallbackRow?.slaStatus ?? sla.slaStatus,
      sourceCloseRate: row.sourceCloseRate ?? fallbackRow?.sourceCloseRate ?? 0,
      sourceAverageTicketCents: row.sourceAverageTicketCents ?? fallbackRow?.sourceAverageTicketCents ?? 0,
      duplicateWarnings: row.duplicateWarnings ?? fallbackRow?.duplicateWarnings ?? [],
      estimateReady: row.estimateReady ?? fallbackRow?.estimateReady ?? false,
      estimateReadiness: row.estimateReadiness ?? fallbackRow?.estimateReadiness ?? [],
      propertySummary: row.propertySummary ?? fallbackRow?.propertySummary ?? (row.city ? `${row.city} service address` : "No property address"),
      serviceFit: row.serviceFit ?? fallbackRow?.serviceFit ?? serviceFit(programs),
      territoryStatus: row.territoryStatus ?? fallbackRow?.territoryStatus ?? territoryStatus(row.city ?? fallbackRow?.city),
      suggestedNextStep: row.suggestedNextStep ?? fallbackRow?.suggestedNextStep ?? (spamScore >= 35 ? "Review spam score before assignment" : "Convert to estimate"),
      conversionOptions: row.conversionOptions ?? fallbackRow?.conversionOptions ?? [
        { label: "Opportunity", targetStatus: "contacted" },
        { label: "Estimate", targetStatus: "do_estimate", primary: true },
        { label: "Disqualify", targetStatus: "disqualified" },
      ],
      reasonCodes: row.reasonCodes ?? fallbackRow?.reasonCodes ?? ["Wrong service area", "Duplicate", "No response", "Spam solicitation"],
    };
  });

  return {
    seeded: depth.seeded ?? fallback.seeded,
    leadOps: {
      rows,
      savedViews: depth.leadOps?.savedViews ?? fallback.leadOps.savedViews,
      statusSettings: depth.leadOps?.statusSettings ?? fallback.leadOps.statusSettings,
      qualityIssues: depth.leadOps?.qualityIssues ?? fallback.leadOps.qualityIssues,
      metrics: {
        openLeads: rows.filter((lead) => !terminalLeadStatuses.has(lead.status)).length,
        highQuality: rows.filter((lead) => lead.qualityScore >= 85).length,
        spamReview: rows.filter((lead) => lead.spamScore >= 35).length,
        unassigned: rows.filter((lead) => lead.ownerName === "Unassigned").length,
        slaOverdue: rows.filter((lead) => lead.slaStatus === "overdue").length,
        duplicates: rows.filter((lead) => lead.duplicateWarnings.length > 0).length,
        estimateReady: rows.filter((lead) => lead.estimateReady).length,
      },
    },
    fieldOps: {
      routeConfidence: depth.fieldOps?.routeConfidence ?? fallback.fieldOps.routeConfidence,
      materialLots: depth.fieldOps?.materialLots ?? fallback.fieldOps.materialLots,
      timeBreakdowns: depth.fieldOps?.timeBreakdowns ?? fallback.fieldOps.timeBreakdowns,
      callbacks: depth.fieldOps?.callbacks ?? fallback.fieldOps.callbacks,
      equipmentCheckouts: depth.fieldOps?.equipmentCheckouts ?? fallback.fieldOps.equipmentCheckouts,
      importQaRows: depth.fieldOps?.importQaRows ?? fallback.fieldOps.importQaRows,
    },
    admin: { ...fallback.admin, ...(depth.admin ?? {}) },
    costIntelligence: { ...fallback.costIntelligence, ...(depth.costIntelligence ?? {}) },
    jobCosting: { ...fallback.jobCosting, ...(depth.jobCosting ?? {}) },
    revenue: { ...fallback.revenue, ...(depth.revenue ?? {}) },
  };
}

function logConvexWriteFailure(action: string, error: unknown) {
  console.warn(`[convex:${action}] write skipped in local UI`, error);
}

function buildFallbackOperatingDepth(workspace: WorkspaceSnapshot): OperatingDepth {
  const customersById = new Map(workspace.customers.map((customer) => [customer.id, customer]));
  const propertiesById = new Map(workspace.properties.map((property) => [property.id, property]));
  const membersById = new Map(workspace.members.map((member) => [member.id, member]));
  const crewsById = new Map(workspace.crews.map((crew) => [crew.id, crew]));
  const openOpportunityValue = workspace.opportunities.filter((opportunity) => !["won", "lost"].includes(opportunity.stage)).reduce((sum, opportunity) => sum + opportunity.valueCents, 0);
  const bookedRevenueCents = workspace.estimates.reduce((sum, estimate) => sum + estimate.totalCents, 0);
  const summaries = workspace.jobs.map((job, index) => {
    const estimate = workspace.estimates.find((candidate) => candidate.customerId === job.customerId);
    const visits = workspace.visits.filter((visit) => visit.jobId === job.id);
    const estimatedRevenueCents = estimate?.totalCents ?? Math.max(250000, bookedRevenueCents / Math.max(1, workspace.jobs.length));
    const actualLaborCostCents = Math.round(visits.length * 2.5 * 3200);
    const actualMaterialCostCents = Math.round(estimatedRevenueCents * (index % 2 === 0 ? 0.16 : 0.22));
    const actualEquipmentCostCents = Math.round(visits.length * 7200);
    const overheadCostCents = Math.round((actualLaborCostCents + actualMaterialCostCents + actualEquipmentCostCents) * 0.18);
    const actualRevenueCents = estimatedRevenueCents;
    const grossProfitCents = actualRevenueCents - actualLaborCostCents - actualMaterialCostCents - actualEquipmentCostCents - overheadCostCents;
    return {
      id: `summary-${job.id}`,
      jobId: job.id,
      jobTitle: job.title,
      customerName: customersById.get(job.customerId)?.name ?? "Unknown customer",
      crewName: crewsById.get(visits[0]?.crewId ?? "")?.name ?? "Unassigned",
      status: job.status,
      estimatedRevenueCents,
      actualRevenueCents,
      invoicedCents: Math.round(actualRevenueCents * 0.75),
      collectedCents: Math.round(actualRevenueCents * 0.55),
      actualLaborCostCents,
      actualMaterialCostCents,
      actualEquipmentCostCents,
      overheadCostCents,
      grossProfitCents,
      grossMarginPercent: actualRevenueCents > 0 ? Math.round((grossProfitCents / actualRevenueCents) * 1000) / 10 : 0,
      varianceCents: Math.round((actualLaborCostCents + actualMaterialCostCents + actualEquipmentCostCents + overheadCostCents) - estimatedRevenueCents * 0.58),
    };
  });
  const totals = summaries.reduce(
    (sum, row) => ({
      invoicedCents: sum.invoicedCents + row.invoicedCents,
      collectedCents: sum.collectedCents + row.collectedCents,
      laborCostCents: sum.laborCostCents + row.actualLaborCostCents,
      materialCostCents: sum.materialCostCents + row.actualMaterialCostCents,
      equipmentCostCents: sum.equipmentCostCents + row.actualEquipmentCostCents,
      overheadCostCents: sum.overheadCostCents + row.overheadCostCents,
      grossProfitCents: sum.grossProfitCents + row.grossProfitCents,
    }),
    { invoicedCents: 0, collectedCents: 0, laborCostCents: 0, materialCostCents: 0, equipmentCostCents: 0, overheadCostCents: 0, grossProfitCents: 0 },
  );
  const opportunityByLeadId = new Map(workspace.opportunities.filter((opportunity) => opportunity.leadId).map((opportunity) => [opportunity.leadId, opportunity]));
  const leadBaseRows = workspace.leads.map((lead) => {
    const customer = customersById.get(lead.customerId);
    const property = propertiesById.get(lead.propertyId);
    return {
      id: lead.id,
      title: lead.title,
      customerName: customer?.name ?? "Unmatched lead",
      city: property?.city ?? "",
      source: lead.source,
    };
  });
  const sourceStats = new Map<string, { total: number; won: number; valueCents: number; valueCount: number }>();
  for (const lead of workspace.leads) {
    const stats = sourceStats.get(lead.source) ?? { total: 0, won: 0, valueCents: 0, valueCount: 0 };
    const opportunity = opportunityByLeadId.get(lead.id);
    stats.total += 1;
    if (opportunity?.stage === "won") stats.won += 1;
    if (opportunity) {
      stats.valueCents += opportunity.valueCents;
      stats.valueCount += 1;
    }
    sourceStats.set(lead.source, stats);
  }
  const leadRows: LeadOpsRow[] = workspace.leads.map((lead, index) => {
    const customer = customersById.get(lead.customerId);
    const property = propertiesById.get(lead.propertyId);
    const opportunity = opportunityByLeadId.get(lead.id);
    const programs = lead.programRequests ?? opportunity?.serviceLines ?? [];
    const qualityScore = lead.qualityScore ?? (index === 0 ? 91 : 76);
    const spamScore = lead.spamScore ?? (index === 0 ? 3 : 18);
    const readiness = buildEstimateReadiness({ customer, property, programs, qualityScore, spamScore });
    const stats = sourceStats.get(lead.source) ?? { total: 0, won: 0, valueCents: 0, valueCount: 0 };
    const sla = leadSla(lead.source, lead.status, lead.receivedAt ?? lead.createdAt);
    const duplicateWarnings = duplicateWarningsForLead(
      { id: lead.id, title: lead.title, customerName: customer?.name ?? "Unmatched lead", city: property?.city ?? "", source: lead.source },
      leadBaseRows,
    );
    return {
      id: lead.id,
      title: lead.title,
      customerName: customer?.name ?? "Unmatched lead",
      city: property?.city ?? "",
      source: lead.source,
      status: lead.status,
      grade: lead.qualityScore ? (lead.qualityScore >= 85 ? "a" : lead.qualityScore >= 70 ? "b" : "c") : index === 0 ? "a" : "b",
      ownerName: membersById.get(lead.ownerId)?.name ?? "Unassigned",
      programRequests: programs,
      qualityScore,
      spamScore,
      valueCents: opportunity?.valueCents ?? 0,
      receivedAt: lead.receivedAt ?? lead.createdAt,
      issueCount: duplicateWarnings.length + (readiness.some((check) => check.status === "blocked") ? 1 : 0),
      hidden: false,
      ...sla,
      sourceCloseRate: stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0,
      sourceAverageTicketCents: stats.valueCount > 0 ? Math.round(stats.valueCents / stats.valueCount) : 0,
      duplicateWarnings,
      estimateReady: readiness.every((check) => check.status !== "blocked") && programs.length > 0,
      estimateReadiness: readiness,
      propertySummary: property ? `${property.street}, ${property.city}, ${property.state} ${property.postalCode}` : "No property address",
      serviceFit: serviceFit(programs),
      territoryStatus: territoryStatus(property?.city),
      suggestedNextStep: spamScore >= 35 ? "Review spam score before assignment" : readiness.some((check) => check.status === "blocked") ? "Fix blocked estimate fields" : "Convert to estimate",
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
  const laborRates = [
    { id: "labor-crew-lead", name: "Crew lead loaded wage", roleName: "Crew Lead", source: "bls", hourlyCostCents: 3600, billableRateCents: 7800, active: true },
    { id: "labor-tech", name: "Technician loaded wage", roleName: "Technician", source: "bls", hourlyCostCents: 2750, billableRateCents: 6200, active: true },
  ];
  const equipmentRates = [
    { id: "equipment-truck", name: "Truck and trailer", category: "transport", hourlyCostCents: 2400, billableRateCents: 5200, active: true },
    { id: "equipment-spreader", name: "Ride-on spreader/sprayer", category: "application", hourlyCostCents: 1800, billableRateCents: 4200, active: true },
    { id: "equipment-mower", name: "Commercial mower", category: "maintenance", hourlyCostCents: 2100, billableRateCents: 4600, active: true },
  ];
  const vendorCatalogs = workspace.materials.map((material) => ({ id: material.id, vendorName: "Demo vendor", itemName: material.name, category: "lawn_care" as ServiceCategory, unit: material.unit, unitCostCents: material.costCents, source: "manual", active: material.active }));
  const costSnapshots = [
    { id: "cost-fred", source: "fred", kind: "fertilizer_index", label: "FRED fertilizer materials PPI", value: 439.037, unit: "index_1982_100", region: "US", capturedAt: now() },
    { id: "cost-bls", source: "bls", kind: "labor", label: "BLS local labor baseline", value: 27.5, unit: "loaded_hourly_usd", region: "MA/Boston", capturedAt: now() },
  ];
  const weatherSnapshots = workspace.visits.slice(0, 4).map((visit, index) => ({
    id: `weather-${visit.id}`,
    propertyName: propertiesById.get(visit.propertyId)?.label ?? "Property",
    conditions: index % 2 === 0 ? "Partly sunny" : "Warm",
    temperatureF: 72 + index,
    windMph: 7 + index,
    precipitationProbability: 12 + index * 5,
    applicationRisk: index % 2 === 0 ? "low" : "medium",
    observedAt: visit.scheduledStart,
  }));
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
  const routeConfidence = workspace.visits.map((visit, index) => {
    const job = workspace.jobs.find((candidate) => candidate.id === visit.jobId);
    const crew = crewsById.get(visit.crewId);
    const weather = weatherSnapshots.find((snapshot) => snapshot.id === `weather-${visit.id}`);
    const requiredSkills = requiredSkillsForJob(job?.title ?? "");
    const actualSkills = crewSkills(crew?.name ?? "");
    const warnings = [
      ...(weather?.applicationRisk !== "low" ? [`${formatStatus(weather?.applicationRisk ?? "unknown")} weather application risk`] : []),
      ...(minutesBetween(visit.scheduledStart, visit.scheduledEnd) < 90 ? ["Tight service window"] : []),
      ...(requiredSkills.some((skill) => !actualSkills.includes(skill)) ? ["Crew skill mismatch"] : []),
    ];
    const equipmentConflicts = index === 1 ? ["Ride-on spreader overlaps with Alpha Lawn at 11:30 AM"] : [];
    return {
      visitId: visit.id,
      score: Math.max(52, 96 - warnings.length * 13 - equipmentConflicts.length * 11),
      warnings,
      requiredSkills,
      crewSkills: actualSkills,
      weatherRisk: weather?.applicationRisk ?? "unknown",
      equipmentConflicts,
    };
  });
  const materialLots = workspace.visits.map((visit, index) => {
    const material = workspace.materials[index % Math.max(1, workspace.materials.length)];
    const crew = crewsById.get(visit.crewId);
    const weather = weatherSnapshots.find((snapshot) => snapshot.id === `weather-${visit.id}`);
    return {
      visitId: visit.id,
      materialName: material?.name ?? "General material",
      epaNumber: material?.name.toLowerCase().includes("barrier") || material?.name.toLowerCase().includes("grub") ? `EPA-${8700 + index}-MA` : undefined,
      lotNumber: `LOT-${new Date(visit.scheduledStart).getFullYear()}-${String(index + 17).padStart(3, "0")}`,
      quantity: `${index + 1}.${index + 5} ${material?.unit ?? "unit"}`,
      applicator: crew?.name ?? "Unassigned",
      weatherRisk: weather?.applicationRisk ?? "unknown",
    };
  });
  const timeBreakdowns = summaries.map((summary, index) => {
    const visits = workspace.visits.filter((visit) => visit.jobId === summary.jobId);
    const scheduledMinutes = visits.reduce((sum, visit) => sum + minutesBetween(visit.scheduledStart, visit.scheduledEnd), 0);
    const estimatedMinutes = Math.max(90, Math.round(summary.estimatedRevenueCents / 1800));
    const driveMinutes = visits.length * 18 + index * 7;
    const nonBillableMinutes = 15 + index * 12;
    const actualMinutes = scheduledMinutes + index * 24;
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
  const callbacks = workspace.tasks
    .filter((task) => task.entityType === "job" || task.title.toLowerCase().includes("repair") || task.title.toLowerCase().includes("follow"))
    .slice(0, 5)
    .map((task) => {
      const job = workspace.jobs.find((candidate) => candidate.id === task.entityId) ?? workspace.jobs[0];
      return {
        id: `callback-${task.id}`,
        jobTitle: job?.title ?? "Unassigned job",
        customerName: job ? customersById.get(job.customerId)?.name ?? "Unknown customer" : "Unknown customer",
        reason: task.title.toLowerCase().includes("repair") ? "Field issue / repair follow-up" : "Customer follow-up",
        severity: task.priority,
        status: task.status,
      };
    });
  const equipmentCheckouts = workspace.visits.flatMap((visit, index) => {
    const crew = crewsById.get(visit.crewId);
    return equipmentRates.slice(0, 2).map((equipment, equipmentIndex) => ({
      visitId: visit.id,
      equipmentName: equipment.name,
      status: equipmentIndex === 0 ? "checked_out" : index === 1 ? "conflict" : "reserved",
      maintenanceDue: equipmentIndex === 1 && index === 1,
      assignedCrew: crew?.name ?? "Unassigned",
    }));
  });
  const importQaRows = [
    { id: "import-1", source: "CSV lead/customer import", rowLabel: "Row 14 - Megan Walsh", status: "needs_review", issues: ["Potential duplicate", "Missing lawn size"], mappedEntity: "lead + customer + property" },
    { id: "import-2", source: "Legacy CRM export", rowLabel: "Row 22 - Northgate Building 4", status: "ready", issues: [], mappedEntity: "customer + property" },
    { id: "import-3", source: "Google Sheets import", rowLabel: "Row 31 - Out of Area Office", status: "blocked", issues: ["Outside service territory", "Unknown service line"], mappedEntity: "lead" },
  ];
  const tagTaxonomy = [
    { id: "tag-hoa", key: "hoa", label: "HOA", category: "customer_segment", color: "#315a4d", active: true },
    { id: "tag-commercial", key: "commercial", label: "Commercial", category: "customer_segment", color: "#42526b", active: true },
    { id: "tag-residential", key: "residential", label: "Residential", category: "customer_segment", color: "#6b7f3a", active: true },
    { id: "tag-recurring", key: "recurring", label: "Recurring", category: "customer_segment", color: "#047857", active: true },
    { id: "tag-fertilization", key: "fertilization", label: "Fertilization", category: "service_line", color: "#4ea84e", active: true },
    { id: "tag-mosquito", key: "mosquito", label: "Mosquito/Tick", category: "service_line", color: "#b45309", active: true },
    { id: "tag-high-ltv", key: "high_ltv", label: "High LTV", category: "profitability", color: "#059669", active: true },
    { id: "tag-at-risk", key: "at_risk", label: "At Risk", category: "risk", color: "#e11d48", active: true },
    { id: "tag-high-ar", key: "high_ar", label: "High AR", category: "risk", color: "#f59e0b", active: true },
  ].map((tag) => ({
    ...tag,
    usageCount: workspace.customers.filter((customer) => customer.type === tag.key || customer.tags.some((item) => item.toLowerCase().replace(/[^a-z0-9]+/g, "_") === tag.key)).length,
  }));
  const summaryByCustomerId = new Map<string, typeof summaries>();
  for (const summary of summaries) {
    const job = workspace.jobs.find((candidate) => candidate.id === summary.jobId);
    if (!job) continue;
    const rows = summaryByCustomerId.get(job.customerId) ?? [];
    rows.push(summary);
    summaryByCustomerId.set(job.customerId, rows);
  }
  const lifecycleRows = workspace.customers.map((customer) => {
    const rows = summaryByCustomerId.get(customer.id) ?? [];
    const lifetimeRevenueCents = rows.reduce((sum, row) => sum + row.actualRevenueCents, 0) || workspace.opportunities.filter((opportunity) => opportunity.customerId === customer.id).reduce((sum, opportunity) => sum + opportunity.valueCents, 0);
    const lifetimeCostCents = rows.reduce((sum, row) => sum + row.actualLaborCostCents + row.actualMaterialCostCents + row.actualEquipmentCostCents + row.overheadCostCents, 0);
    const grossProfitCents = Math.max(0, lifetimeRevenueCents - lifetimeCostCents);
    const isRecurring = customer.tags.includes("recurring") || customer.tags.includes("weekly") || customer.type === "hoa" || customer.type === "commercial";
    const churnRiskScore = Math.min(92, Math.max(8, (customer.status === "prospect" ? 42 : 16) + (isRecurring ? -5 : 12) + (customer.tags.includes("quote") ? 12 : 0) + (rows.some((row) => row.grossMarginPercent < 25) ? 18 : 0)));
    return {
      customer,
      segment: customer.type === "hoa" ? "HOA" : customer.type === "commercial" ? "Commercial" : "Residential",
      annualRecurringRevenueCents: isRecurring ? Math.max(Math.round(lifetimeRevenueCents * 0.44), rows.reduce((sum, row) => sum + row.estimatedRevenueCents, 0)) : 0,
      lifetimeRevenueCents,
      lifetimeCostCents,
      grossProfitCents,
      grossMarginPercent: lifetimeRevenueCents > 0 ? Math.round((grossProfitCents / lifetimeRevenueCents) * 1000) / 10 : 0,
      estimatedLtvCents: Math.max(grossProfitCents, Math.round((isRecurring ? lifetimeRevenueCents : grossProfitCents) * (churnRiskScore < 30 ? 2.8 : 1.4))),
      churnRiskScore,
      churnRiskLevel: churnRiskScore >= 75 ? "critical" : churnRiskScore >= 55 ? "high" : churnRiskScore >= 30 ? "medium" : "low",
      churnDrivers: [
        ...(customer.status === "prospect" ? ["Not yet converted"] : []),
        ...(!isRecurring ? ["No recurring plan"] : []),
        ...(rows.some((row) => row.grossMarginPercent < 25) ? ["Low job margin"] : []),
        ...(customer.tags.includes("quote") ? ["Estimate pending"] : []),
      ],
    };
  });
  const segmentMap = new Map<string, typeof lifecycleRows>();
  for (const row of lifecycleRows) {
    const rows = segmentMap.get(row.segment) ?? [];
    rows.push(row);
    segmentMap.set(row.segment, rows);
  }
  const churnCohorts = [...segmentMap.entries()].map(([segment, rows]) => {
    const atRiskRows = rows.filter((row) => ["high", "critical"].includes(row.churnRiskLevel));
    return {
      segment,
      customers: rows.length,
      atRisk: atRiskRows.length,
      churnRatePercent: rows.length > 0 ? Math.round((atRiskRows.length / rows.length) * 1000) / 10 : 0,
      ltvAtRiskCents: atRiskRows.reduce((sum, row) => sum + row.estimatedLtvCents, 0),
      drivers: [...new Set(rows.flatMap((row) => (row.churnDrivers.length > 0 ? row.churnDrivers : ["Healthy recurring relationship"])))].slice(0, 4),
    };
  });
  const ltvCohorts = [...segmentMap.entries()].map(([segment, rows]) => {
    const averageGrossProfitCents = average(rows.map((row) => row.grossProfitCents));
    const averageLtvCents = average(rows.map((row) => row.estimatedLtvCents));
    return {
      segment,
      averageLtvCents,
      averageGrossProfitCents,
      paybackMonths: Math.max(1, Math.round((averageLtvCents / Math.max(1, averageGrossProfitCents)) * 12) / 10),
    };
  });
  const pnlServiceRevenue = totals.invoicedCents || bookedRevenueCents;
  const pnlDirectCosts = totals.laborCostCents + totals.materialCostCents + totals.equipmentCostCents + totals.overheadCostCents + Math.round(pnlServiceRevenue * 0.035);
  const pnlGrossProfit = pnlServiceRevenue - pnlDirectCosts;
  const adminPayrollCents = Math.round(pnlServiceRevenue * 0.08);
  const salesMarketingCents = Math.round(pnlServiceRevenue * 0.045);
  const softwareCents = 62000;
  const insuranceCents = Math.round(pnlServiceRevenue * 0.022);
  const fuelCents = Math.round(pnlServiceRevenue * 0.03);
  const rentUtilitiesCents = Math.round(pnlServiceRevenue * 0.025);
  const pnlOperatingExpenses = adminPayrollCents + salesMarketingCents + softwareCents + insuranceCents + fuelCents + rentUtilitiesCents;
  const pnlOperatingProfit = pnlGrossProfit - pnlOperatingExpenses;
  const churnRatePercent = lifecycleRows.length > 0 ? Math.round((lifecycleRows.filter((row) => ["high", "critical"].includes(row.churnRiskLevel)).length / lifecycleRows.length) * 1000) / 10 : 0;
  const averageLtvCents = average(lifecycleRows.map((row) => row.estimatedLtvCents));
  const cacCents = Math.round(salesMarketingCents / Math.max(1, workspace.leads.length));
  const ownerAnalytics: OperatingDepth["admin"]["ownerAnalytics"] = {
    kpis: {
      retentionRatePercent: Math.max(0, Math.round((100 - churnRatePercent) * 10) / 10),
      churnRatePercent,
      averageLtvCents,
      cacCents,
      ltvToCac: Math.round((averageLtvCents / Math.max(1, cacCents)) * 10) / 10,
      netRevenueRetentionPercent: 104.8,
      avgGrossMarginPercent: average(lifecycleRows.map((row) => Math.round(row.grossMarginPercent * 10))) / 10 || (pnlServiceRevenue > 0 ? Math.round((pnlGrossProfit / pnlServiceRevenue) * 1000) / 10 : 0),
      breakEvenRevenueCents: Math.round(pnlOperatingExpenses / Math.max(0.05, (pnlServiceRevenue > 0 ? pnlGrossProfit / pnlServiceRevenue : 0.4))),
    },
    churn: churnCohorts,
    ltv: ltvCohorts,
    pnl: [
      { label: "Service revenue", valueCents: pnlServiceRevenue, kind: "revenue" },
      { label: "Recurring revenue", valueCents: Math.round(pnlServiceRevenue * 0.68), kind: "revenue" },
      { label: "Direct costs", valueCents: -pnlDirectCosts, kind: "cost" },
      { label: "Gross profit", valueCents: pnlGrossProfit, kind: "profit" },
      { label: "Operating expenses", valueCents: -pnlOperatingExpenses, kind: "cost" },
      { label: "Operating profit", valueCents: pnlOperatingProfit, kind: "profit" },
    ],
    costBreakdown: [
      { label: "Labor", valueCents: totals.laborCostCents, percent: pnlServiceRevenue > 0 ? Math.round((totals.laborCostCents / pnlServiceRevenue) * 1000) / 10 : 0 },
      { label: "Materials", valueCents: totals.materialCostCents, percent: pnlServiceRevenue > 0 ? Math.round((totals.materialCostCents / pnlServiceRevenue) * 1000) / 10 : 0 },
      { label: "Equipment", valueCents: totals.equipmentCostCents, percent: pnlServiceRevenue > 0 ? Math.round((totals.equipmentCostCents / pnlServiceRevenue) * 1000) / 10 : 0 },
      { label: "Overhead", valueCents: totals.overheadCostCents, percent: pnlServiceRevenue > 0 ? Math.round((totals.overheadCostCents / pnlServiceRevenue) * 1000) / 10 : 0 },
      { label: "Admin payroll", valueCents: adminPayrollCents, percent: pnlServiceRevenue > 0 ? Math.round((adminPayrollCents / pnlServiceRevenue) * 1000) / 10 : 0 },
      { label: "Sales/marketing", valueCents: salesMarketingCents, percent: pnlServiceRevenue > 0 ? Math.round((salesMarketingCents / pnlServiceRevenue) * 1000) / 10 : 0 },
      { label: "Software", valueCents: softwareCents, percent: pnlServiceRevenue > 0 ? Math.round((softwareCents / pnlServiceRevenue) * 1000) / 10 : 0 },
      { label: "Insurance", valueCents: insuranceCents, percent: pnlServiceRevenue > 0 ? Math.round((insuranceCents / pnlServiceRevenue) * 1000) / 10 : 0 },
      { label: "Fuel", valueCents: fuelCents, percent: pnlServiceRevenue > 0 ? Math.round((fuelCents / pnlServiceRevenue) * 1000) / 10 : 0 },
      { label: "Rent/utilities", valueCents: rentUtilitiesCents, percent: pnlServiceRevenue > 0 ? Math.round((rentUtilitiesCents / pnlServiceRevenue) * 1000) / 10 : 0 },
    ],
    trend: Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      date.setMonth(date.getMonth() - (5 - index));
      const scale = 0.82 + index * 0.055;
      return {
        month: monthLabel(date.getTime()),
        revenueCents: Math.round(pnlServiceRevenue * scale),
        grossProfitCents: Math.round(pnlGrossProfit * (0.86 + index * 0.04)),
        costCents: Math.round(pnlDirectCosts * (0.9 + index * 0.025)),
        churnRatePercent,
      };
    }),
  };
  const segmentCards = [...segmentMap.entries()].map(([segment, rows]) => ({
    label: segment,
    customerCount: rows.length,
    revenueCents: rows.reduce((sum, row) => sum + row.lifetimeRevenueCents, 0),
    grossProfitCents: rows.reduce((sum, row) => sum + row.grossProfitCents, 0),
    churnRiskPercent: rows.length > 0 ? Math.round((rows.filter((row) => ["high", "critical"].includes(row.churnRiskLevel)).length / rows.length) * 1000) / 10 : 0,
  }));

  return {
    seeded: false,
    leadOps: {
      rows: leadRows,
      savedViews: [
        { id: "fallback-hot", name: "High quality open", scope: "team", filters: { qualityScore: ">=85" }, columns: ["title", "customer", "status", "owner", "value"] },
        { id: "fallback-spam", name: "Spam review", scope: "team", filters: { spamScore: ">=35" }, columns: ["title", "source", "spamScore"] },
      ],
      statusSettings: [
        { id: "status-new", status: "new", label: "New", color: "#64748b", terminal: false, active: true },
        { id: "status-contacted", status: "contacted", label: "Contacted", color: "#d97706", terminal: false, active: true },
        { id: "status-converted", status: "converted", label: "Converted", color: "#047857", terminal: true, active: true },
        { id: "status-spam", status: "spam", label: "Spam", color: "#475569", terminal: true, active: true },
      ],
      qualityIssues: [],
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
      members: workspace.members.map((member) => ({ id: member.id, userId: member.id, name: member.name, email: member.email, role: member.role, status: "active" })),
      permissionMatrix: [
        { permission: "Manage organization", roles: ["owner", "admin"] },
        { permission: "Manage catalog and rates", roles: ["owner", "admin", "manager"] },
        { permission: "Dispatch visits", roles: ["owner", "admin", "manager", "dispatcher"] },
        { permission: "Complete field work", roles: ["owner", "admin", "manager", "crew_lead", "technician"] },
        { permission: "View profit dashboards", roles: ["owner", "admin", "manager"] },
      ],
      featureFlags: [
        { id: "flag-leads", key: "lead_ops_table", enabled: true },
        { id: "flag-costing", key: "job_costing_v1", enabled: true },
      ],
      auditEvents: workspace.activities.slice(0, 8).map((activity) => ({ id: activity.id, action: activity.kind, summary: activity.summary, entityType: activity.entityType, createdAt: activity.occurredAt })),
      tagTaxonomy,
      segmentCards,
      ownerAnalytics,
    },
    costIntelligence: {
      laborRates,
      equipmentRates,
      vendorCatalogs,
      costSnapshots,
      weatherSnapshots,
    },
    jobCosting: {
      summaries,
      timesheets: summaries.flatMap((summary) => [
        { id: `time-${summary.jobId}-lead`, jobTitle: summary.jobTitle, roleName: "Crew Lead", hours: 2.4, totalCostCents: 8640, status: "approved" },
        { id: `time-${summary.jobId}-tech`, jobTitle: summary.jobTitle, roleName: "Technician", hours: 2.4, totalCostCents: 6600, status: "approved" },
      ]),
      purchaseOrders: workspace.materials.slice(0, 2).map((material) => ({ id: `po-${material.id}`, vendorName: "Demo vendor", status: "received", totalCents: material.costCents * 6, jobTitle: summaries[0]?.jobTitle ?? "Unassigned" })),
    },
    revenue: {
      pipelineCents: openOpportunityValue,
      bookedRevenueCents,
      completedRevenueCents: summaries.filter((summary) => summary.status === "completed").reduce((sum, summary) => sum + summary.actualRevenueCents, 0),
      invoicedCents: totals.invoicedCents,
      collectedCents: totals.collectedCents,
      laborCostCents: totals.laborCostCents,
      materialCostCents: totals.materialCostCents,
      equipmentCostCents: totals.equipmentCostCents,
      overheadCostCents: totals.overheadCostCents,
      grossProfitCents: totals.grossProfitCents,
      arCents: Math.max(0, totals.invoicedCents - totals.collectedCents),
      grossMarginPercent: totals.invoicedCents > 0 ? Math.round((totals.grossProfitCents / totals.invoicedCents) * 1000) / 10 : 0,
      invoices: summaries.map((summary, index) => ({ id: `invoice-${summary.jobId}`, invoiceNumber: `DRAFT-${index + 1001}`, customerName: summary.customerName, status: index === 0 ? "partially_paid" : "sent", totalCents: summary.invoicedCents, paidCents: summary.collectedCents, balanceCents: Math.max(0, summary.invoicedCents - summary.collectedCents) })),
      payments: summaries.slice(0, 2).map((summary, index) => ({ id: `payment-${summary.jobId}`, customerName: summary.customerName, status: "posted", method: index === 0 ? "ach" : "check", amountCents: summary.collectedCents, receivedAt: now() - index * 24 * 60 * 60 * 1000 })),
    },
  };
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-xs font-medium",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "danger" && "border-rose-200 bg-rose-50 text-rose-700",
        tone === "neutral" && "border-stone-200 bg-stone-50 text-stone-600",
      )}
    >
      {children}
    </span>
  );
}

function IconButton({
  children,
  onClick,
  title,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function TextButton({
  children,
  icon,
  onClick,
  type = "button",
  variant = "primary",
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition",
        variant === "primary" && "bg-[#224036] text-white shadow-sm hover:bg-[#1a332b]",
        variant === "secondary" && "border border-stone-200 bg-white text-stone-800 shadow-sm hover:bg-stone-50",
        variant === "ghost" && "text-stone-700 hover:bg-stone-100",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-stone-200 bg-white p-4 shadow-sm", className)}>{children}</section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold uppercase tracking-normal text-stone-500">
      {label}
      {children}
    </label>
  );
}

function inputClass() {
  return "block h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#315a4d] focus:ring-2 focus:ring-[#315a4d]/15";
}

export function LandscapeOsApp() {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <LandscapeOsLiveApp />;
  }

  return (
    <LandscapeOsWorkspace
      initialWorkspace={demoWorkspace}
      backendState={{
        mode: "local",
        label: "Local demo",
        detail: "Convex URL is not configured, so this session is using in-memory demo data.",
        blueprint: fallbackBackendBlueprint,
      }}
    />
  );
}

function LandscapeOsLiveApp() {
  const liveWorkspace = useQuery(api.demo.getWorkspace, {}) as WorkspaceSnapshot | null | undefined;
  const backendBlueprint = useQuery(api.specs.getBackendBlueprint, {}) as BackendBlueprint | undefined;
  const operatingDepth = useQuery(api.operating.getDemoOperatingDepth, {}) as OperatingDepth | null | undefined;
  const bootstrapWorkspace = useMutation(api.demo.bootstrapWorkspace);
  const bootstrapOperatingDepth = useMutation(api.operating.bootstrapOperatingDepth);
  const createLeadMutation = useMutation(api.demo.createLead);
  const advanceOpportunityMutation = useMutation(api.demo.advanceOpportunity);
  const assignVisitMutation = useMutation(api.demo.assignVisit);
  const completeChecklistMutation = useMutation(api.demo.completeChecklistItem);
  const submitVisitMutation = useMutation(api.demo.submitVisit);
  const addTaskMutation = useMutation(api.demo.addTask);
  const addActivityMutation = useMutation(api.demo.addActivity);
  const createCrewMutation = useMutation(api.demo.createCrew);
  const toggleServiceMutation = useMutation(api.demo.toggleServiceCatalogItem);
  const updateLeadMutation = useMutation(api.operating.updateLead);
  const bulkUpdateLeadsMutation = useMutation(api.operating.bulkUpdateLeads);
  const updateMemberRoleMutation = useMutation(api.operating.updateMemberRole);
  const upsertLaborRateMutation = useMutation(api.operating.upsertLaborRate);
  const upsertVendorCatalogItemMutation = useMutation(api.operating.upsertVendorCatalogItem);
  const addTimesheetEntryMutation = useMutation(api.operating.addTimesheetEntry);
  const recordCustomerPaymentMutation = useMutation(api.operating.recordCustomerPayment);
  const recalculateJobCostsMutation = useMutation(api.operating.recalculateDemoJobCosts);
  const refreshCostIntelligenceMutation = useMutation(api.operating.refreshCostIntelligence);
  const bootstrapStartedRef = useRef(false);
  const operatingBootstrapStartedRef = useRef(false);

  useEffect(() => {
    if (liveWorkspace !== null || bootstrapStartedRef.current) return;
    bootstrapStartedRef.current = true;
    void bootstrapWorkspace({}).finally(() => {
      bootstrapStartedRef.current = false;
    });
  }, [bootstrapWorkspace, liveWorkspace]);

  useEffect(() => {
    if (!liveWorkspace || operatingDepth === undefined || operatingBootstrapStartedRef.current) return;
    if (operatingDepth?.seeded) return;
    operatingBootstrapStartedRef.current = true;
    void bootstrapOperatingDepth({}).finally(() => {
      operatingBootstrapStartedRef.current = false;
    });
  }, [bootstrapOperatingDepth, liveWorkspace, operatingDepth]);

  const liveActions = useMemo<LiveActions>(
    () => ({
      createLead: (input) => {
        void createLeadMutation({
          customerName: input.customerName,
          title: input.title,
          phone: input.phone,
          email: input.email,
          street: input.street,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          valueCents: input.valueCents,
          serviceLine: input.serviceLine,
          source: input.source,
        }).catch((error) => logConvexWriteFailure("createLead", error));
      },
      advanceOpportunity: (opportunityId, stage) => {
        void advanceOpportunityMutation({ opportunityId: opportunityId as Id<"opportunities">, stage }).catch((error) => logConvexWriteFailure("advanceOpportunity", error));
      },
      assignVisit: (visitId, crewId) => {
        void assignVisitMutation({ visitId: visitId as Id<"jobVisits">, crewId: crewId as Id<"crews"> }).catch((error) => logConvexWriteFailure("assignVisit", error));
      },
      completeChecklistItem: (visitId, itemId) => {
        void completeChecklistMutation({ visitId: visitId as Id<"jobVisits">, itemId }).catch((error) => logConvexWriteFailure("completeChecklistItem", error));
      },
      submitVisit: (visitId, issueFlag) => {
        void submitVisitMutation({ visitId: visitId as Id<"jobVisits">, issueFlag }).catch((error) => logConvexWriteFailure("submitVisit", error));
      },
      addTask: (jobId, title) => {
        void addTaskMutation({ jobId: jobId as Id<"jobs">, title }).catch((error) => logConvexWriteFailure("addTask", error));
      },
      addActivity: (input) => {
        void addActivityMutation({
          entityType: input.entityType,
          entityId: input.entityId,
          kind: input.kind,
          summary: input.summary,
          createFollowUp: input.createFollowUp,
          dueInDays: input.dueInDays,
        }).catch((error) => logConvexWriteFailure("addActivity", error));
      },
      createCrew: (name) => {
        void createCrewMutation({ name }).catch((error) => logConvexWriteFailure("createCrew", error));
      },
      toggleService: (itemId) => {
        void toggleServiceMutation({ itemId: itemId as Id<"serviceCatalogItems"> }).catch((error) => logConvexWriteFailure("toggleService", error));
      },
    }),
    [
      addActivityMutation,
      addTaskMutation,
      advanceOpportunityMutation,
      assignVisitMutation,
      completeChecklistMutation,
      createCrewMutation,
      createLeadMutation,
      submitVisitMutation,
      toggleServiceMutation,
    ],
  );

  const operatingActions = useMemo<OperatingActions>(
    () => ({
      bootstrap: () => {
        void bootstrapOperatingDepth({}).catch((error) => logConvexWriteFailure("bootstrapOperatingDepth", error));
      },
      updateLead: (leadId, fields) => {
        void updateLeadMutation({
          leadId: leadId as Id<"leads">,
          status: fields.status as Parameters<typeof updateLeadMutation>[0]["status"],
          grade: fields.grade as Parameters<typeof updateLeadMutation>[0]["grade"],
          hidden: fields.hidden,
        }).catch((error) => logConvexWriteFailure("updateLead", error));
      },
      bulkUpdateLeads: (leadIds, status) => {
        void bulkUpdateLeadsMutation({ leadIds: leadIds as Array<Id<"leads">>, status: status as Parameters<typeof bulkUpdateLeadsMutation>[0]["status"] }).catch((error) => logConvexWriteFailure("bulkUpdateLeads", error));
      },
      updateMemberRole: (membershipId, nextRole) => {
        void updateMemberRoleMutation({ membershipId: membershipId as Id<"memberships">, role: nextRole }).catch((error) => logConvexWriteFailure("updateMemberRole", error));
      },
      upsertLaborRate: (input) => {
        void upsertLaborRateMutation({ id: input.id as Id<"laborRateCards"> | undefined, roleName: input.roleName, hourlyCostCents: input.hourlyCostCents, billableRateCents: input.billableRateCents }).catch((error) => logConvexWriteFailure("upsertLaborRate", error));
      },
      upsertVendorCatalogItem: (input) => {
        void upsertVendorCatalogItemMutation({ id: input.id as Id<"vendorCatalogs"> | undefined, vendorName: input.vendorName, itemName: input.itemName, category: input.category, unit: input.unit, unitCostCents: input.unitCostCents }).catch((error) => logConvexWriteFailure("upsertVendorCatalogItem", error));
      },
      addTimesheetEntry: (jobId, roleName, hours, hourlyCostCents) => {
        void addTimesheetEntryMutation({ jobId: jobId as Id<"jobs">, roleName, hours, hourlyCostCents }).catch((error) => logConvexWriteFailure("addTimesheetEntry", error));
      },
      recordCustomerPayment: (invoiceId, amountCents, method) => {
        void recordCustomerPaymentMutation({ invoiceId: invoiceId as Id<"customerInvoices">, amountCents, method }).catch((error) => logConvexWriteFailure("recordCustomerPayment", error));
      },
      recalculateJobCosts: () => {
        void recalculateJobCostsMutation({}).catch((error) => logConvexWriteFailure("recalculateJobCosts", error));
      },
      refreshCostIntelligence: () => {
        void refreshCostIntelligenceMutation({}).catch((error) => logConvexWriteFailure("refreshCostIntelligence", error));
      },
    }),
    [
      addTimesheetEntryMutation,
      bootstrapOperatingDepth,
      bulkUpdateLeadsMutation,
      recalculateJobCostsMutation,
      recordCustomerPaymentMutation,
      refreshCostIntelligenceMutation,
      updateLeadMutation,
      updateMemberRoleMutation,
      upsertLaborRateMutation,
      upsertVendorCatalogItemMutation,
    ],
  );

  return (
    <LandscapeOsWorkspace
      initialWorkspace={liveWorkspace ?? demoWorkspace}
      backendState={{
        mode: liveWorkspace ? "convex-live" : "convex-loading",
        label: liveWorkspace ? "Convex live" : "Connecting Convex",
        detail: liveWorkspace
          ? "Data is loaded from dutiful-salmon-300 and interactive actions write through demo Convex mutations."
          : "Seeding the Greenline demo workspace in Convex, then the interface will hydrate from the backend.",
        blueprint: backendBlueprint ?? fallbackBackendBlueprint,
      }}
      liveActions={liveActions}
      operatingDepth={operatingDepth ?? undefined}
      operatingActions={operatingActions}
    />
  );
}

function LandscapeOsWorkspace({
  initialWorkspace,
  backendState,
  liveActions,
  operatingDepth,
  operatingActions,
}: {
  initialWorkspace: WorkspaceSnapshot;
  backendState: BackendState;
  liveActions?: LiveActions;
  operatingDepth?: OperatingDepth;
  operatingActions?: OperatingActions;
}) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>(initialWorkspace);
  const [view, setView] = useState<View>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialWorkspace.customers[0]?.id ?? "");
  const [selectedJobId, setSelectedJobId] = useState(initialWorkspace.jobs[0]?.id ?? "");
  const [selectedVisitId, setSelectedVisitId] = useState(initialWorkspace.visits[0]?.id ?? "");
  const [leadForm, setLeadForm] = useState<LeadFormState>(() => defaultLeadForm());
  const [customerActivityForm, setCustomerActivityForm] = useState<ActivityComposerState>(() => defaultActivityComposer());
  const [jobActivityForm, setJobActivityForm] = useState<ActivityComposerState>(() => defaultActivityComposer());
  const [clientOnboardingForm, setClientOnboardingForm] = useState<ClientOnboardingFormState>(() => defaultClientOnboardingForm());
  const [provisionedClients, setProvisionedClients] = useState<ProvisionedClientWorkspace[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [crewName, setCrewName] = useState("");
  const [issueFlag, setIssueFlag] = useState("");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setWorkspace(initialWorkspace);
      setSelectedCustomerId((current) => (initialWorkspace.customers.some((customer) => customer.id === current) ? current : initialWorkspace.customers[0]?.id ?? ""));
      setSelectedJobId((current) => (initialWorkspace.jobs.some((job) => job.id === current) ? current : initialWorkspace.jobs[0]?.id ?? ""));
      setSelectedVisitId((current) => (initialWorkspace.visits.some((visit) => visit.id === current) ? current : initialWorkspace.visits[0]?.id ?? ""));
    });
    return () => {
      cancelled = true;
    };
  }, [initialWorkspace]);

  const membersById = useMemo(() => new Map(workspace.members.map((member) => [member.id, member])), [workspace.members]);
  const customersById = useMemo(() => new Map(workspace.customers.map((customer) => [customer.id, customer])), [workspace.customers]);
  const propertiesById = useMemo(() => new Map(workspace.properties.map((property) => [property.id, property])), [workspace.properties]);
  const crewsById = useMemo(() => new Map(workspace.crews.map((crew) => [crew.id, crew])), [workspace.crews]);
  const jobsById = useMemo(() => new Map(workspace.jobs.map((job) => [job.id, job])), [workspace.jobs]);
  const fallbackOperatingDepth = useMemo(() => buildFallbackOperatingDepth(workspace), [workspace]);
  const effectiveOperatingDepth = useMemo(() => normalizeOperatingDepth(operatingDepth, fallbackOperatingDepth), [fallbackOperatingDepth, operatingDepth]);

  const dashboard = useMemo(() => {
    const openOpps = workspace.opportunities.filter((opp) => !["won", "lost"].includes(opp.stage));
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = todayStart.getTime() + 24 * 60 * 60 * 1000;
    return {
      pipelineValue: openOpps.reduce((sum, opp) => sum + opp.valueCents, 0),
      todayVisits: workspace.visits.filter((visit) => visit.scheduledStart >= todayStart.getTime() && visit.scheduledStart < tomorrow),
      overdueTasks: workspace.tasks.filter((task) => task.status !== "done" && task.dueAt < now()),
      openEstimates: workspace.estimates.filter((estimate) => ["draft", "sent"].includes(estimate.status)),
    };
  }, [workspace]);

  const selectedCustomer = customersById.get(selectedCustomerId) ?? workspace.customers[0];
  const selectedJob = jobsById.get(selectedJobId) ?? workspace.jobs[0];
  const selectedVisit = workspace.visits.find((visit) => visit.id === selectedVisitId) ?? workspace.visits[0];
  const globalSearchResults = useMemo<GlobalSearchResult[]>(() => {
    const query = globalSearch.trim().toLowerCase();
    if (query.length < 2) return [];
    const includes = (...values: Array<string | undefined>) => values.some((value) => value?.toLowerCase().includes(query));
    const results: GlobalSearchResult[] = [];

    for (const customer of workspace.customers) {
      if (!includes(customer.name, customer.email, customer.phone, customer.tags.join(" "))) continue;
      results.push({
        id: `customer-${customer.id}`,
        kind: "Customer",
        label: customer.name,
        detail: `${formatStatus(customer.type)} - ${customer.email || customer.phone || "No primary contact"}`,
        view: "crm",
        customerId: customer.id,
        searchText: customer.name,
      });
    }

    for (const lead of workspace.leads) {
      const customer = customersById.get(lead.customerId);
      const property = propertiesById.get(lead.propertyId);
      if (!includes(lead.title, customer?.name, property?.city, lead.source, lead.programRequests?.join(" "))) continue;
      results.push({
        id: `lead-${lead.id}`,
        kind: "Lead",
        label: lead.title,
        detail: `${customer?.name ?? "Lead"} - ${formatStatus(lead.status)} - ${lead.source}`,
        view: "lead_ops",
        customerId: lead.customerId,
        searchText: customer?.name ?? lead.title,
      });
    }

    for (const opportunity of workspace.opportunities) {
      const customer = customersById.get(opportunity.customerId);
      if (!includes(opportunity.title, customer?.name, opportunity.stage, opportunity.serviceLines.join(" "))) continue;
      results.push({
        id: `opportunity-${opportunity.id}`,
        kind: "Opportunity",
        label: opportunity.title,
        detail: `${customer?.name ?? "Opportunity"} - ${currency(opportunity.valueCents)} - ${opportunityStageLabel(opportunity.stage)}`,
        view: "pipeline",
        customerId: opportunity.customerId,
      });
    }

    for (const job of workspace.jobs) {
      const customer = customersById.get(job.customerId);
      if (!includes(job.title, customer?.name, job.status, job.priority)) continue;
      results.push({
        id: `job-${job.id}`,
        kind: "Job",
        label: job.title,
        detail: `${customer?.name ?? "Job"} - ${formatStatus(job.status)} - ${formatStatus(job.priority)}`,
        view: "jobs",
        customerId: job.customerId,
        jobId: job.id,
      });
    }

    for (const visit of workspace.visits) {
      const customer = customersById.get(visit.customerId);
      const job = jobsById.get(visit.jobId);
      if (!includes(customer?.name, job?.title, visit.status, timeRange(visit.scheduledStart, visit.scheduledEnd))) continue;
      results.push({
        id: `visit-${visit.id}`,
        kind: "Visit",
        label: job?.title ?? "Scheduled visit",
        detail: `${customer?.name ?? "Visit"} - ${timeRange(visit.scheduledStart, visit.scheduledEnd)} - ${visitStatusLabel(visit.status)}`,
        view: "field",
        customerId: visit.customerId,
        jobId: visit.jobId,
        visitId: visit.id,
      });
    }

    for (const task of workspace.tasks) {
      if (!includes(task.title, task.status, task.priority)) continue;
      results.push({
        id: `task-${task.id}`,
        kind: "Task",
        label: task.title,
        detail: `${formatStatus(task.status)} - due ${shortDate(task.dueAt)}`,
        view: task.entityType === "job" ? "jobs" : "dashboard",
        jobId: task.entityType === "job" ? task.entityId : undefined,
      });
    }

    return results.slice(0, 10);
  }, [customersById, globalSearch, jobsById, propertiesById, workspace.customers, workspace.jobs, workspace.leads, workspace.opportunities, workspace.tasks, workspace.visits]);

  function openGlobalSearchResult(result: GlobalSearchResult) {
    setView(result.view);
    if (result.customerId) {
      setSelectedCustomerId(result.customerId);
    }
    if (result.jobId) {
      setSelectedJobId(result.jobId);
    }
    if (result.visitId) {
      setSelectedVisitId(result.visitId);
    }
    if (result.view === "crm" && result.searchText) {
      setCustomerSearch(result.searchText);
    }
    setGlobalSearch("");
    setMobileNavOpen(false);
  }

  const authConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  function createLead(event: FormEvent) {
    event.preventDefault();
    const customerId = newId("cust");
    const propertyId = newId("prop");
    const leadId = newId("lead");
    const opportunityId = newId("opp");
    const createdAt = now();
    const valueCents = Math.max(0, Math.round(Number(leadForm.value || "0") * 100));
    const source = leadForm.source.trim() || "Manual entry";
    const lawnSizeSqFt = numericOrUndefined(leadForm.lawnSizeSqFt);
    const qualityScore = leadQualityScore(leadForm);

    setWorkspace((current) => ({
      ...current,
      customers: [
        {
          id: customerId,
          name: leadForm.customerName || "New customer",
          type: leadForm.accountType,
          status: "prospect",
          phone: leadForm.phone,
          email: leadForm.email,
          tags: [categoryLabels[leadForm.serviceLine], source],
          ownerId: "u-amy",
        },
        ...current.customers,
      ],
      properties: [
        {
          id: propertyId,
          customerId,
          label: "Primary property",
          street: leadForm.street,
          city: leadForm.city,
          state: leadForm.state,
          postalCode: leadForm.postalCode,
          notes: leadForm.estimateNotes,
          lawnSizeSqFt,
        },
        ...current.properties,
      ],
      leads: [
        {
          id: leadId,
          title: leadForm.title || "New service request",
          customerId,
          propertyId,
          source,
          status: leadForm.leadType === "phone_call" ? "contacted" : "new",
          urgency: leadForm.urgency,
          ownerId: "u-amy",
          leadType: leadForm.leadType,
          accountType: leadForm.accountType,
          companyAssignment: leadForm.companyAssignment,
          programRequests: [leadForm.serviceLine],
          lawnSizeSqFt,
          message: leadForm.message,
          estimateNotes: leadForm.estimateNotes,
          qualityScore,
          spamScore: 0,
          receivedAt: createdAt,
          createdAt,
        },
        ...current.leads,
      ],
      opportunities: [
        {
          id: opportunityId,
          leadId,
          customerId,
          propertyId,
          title: leadForm.title || "New service request",
          stage: "qualified",
          valueCents,
          closeProbability: 35,
          expectedCloseDate: createdAt + 14 * 24 * 60 * 60 * 1000,
          ownerId: "u-amy",
          serviceLines: [leadForm.serviceLine],
          updatedAt: createdAt,
        },
        ...current.opportunities,
      ],
      activities: [
        {
          id: newId("act"),
          entityType: "lead",
          entityId: leadId,
          kind: "system",
          summary: `Created lead ${leadForm.title || "New service request"}`,
          actorId: "u-amy",
          occurredAt: createdAt,
        },
        ...current.activities,
      ],
    }));

    setSelectedCustomerId(customerId);
    liveActions?.createLead?.({
      customerName: leadForm.customerName || "New customer",
      title: leadForm.title || "New service request",
      phone: leadForm.phone || undefined,
      email: leadForm.email || undefined,
      street: leadForm.street,
      city: leadForm.city,
          state: leadForm.state,
          postalCode: leadForm.postalCode,
          valueCents,
          serviceLine: leadForm.serviceLine,
          source,
          leadType: leadForm.leadType,
          accountType: leadForm.accountType,
          companyAssignment: leadForm.companyAssignment || undefined,
          lawnSizeSqFt,
          urgency: leadForm.urgency,
          message: leadForm.message || undefined,
          estimateNotes: leadForm.estimateNotes || undefined,
        });
    setLeadForm(defaultLeadForm());
  }

  function createClientWorkspace(event: FormEvent) {
    event.preventDefault();
    const createdAt = now();
    const name = clientOnboardingForm.companyName.trim() || "New outdoor services client";
    const slug = normalizeSlug(name) || "new-client";
    const seats = Math.max(1, Math.round(Number(clientOnboardingForm.seats || "1")));
    setProvisionedClients((current) => [
      {
        id: newId("tenant"),
        name,
        slug,
        ownerEmail: clientOnboardingForm.ownerEmail.trim() || "owner@example.com",
        industryFocus: clientOnboardingForm.industryFocus,
        billingPlan: clientOnboardingForm.billingPlan,
        seats,
        createdAt,
        checklist: [
          "Workspace and owner membership",
          clientOnboardingForm.billingPlan === "free" ? "Free subscription shell with 10-contact cap" : "$99/mo All-In Pro subscription shell",
          "Lead statuses and saved views",
          "Service catalog and default crew",
          "Lead intake form and CSV import lane",
          "Feature flags, audit trail, and onboarding checklist",
        ],
      },
      ...current,
    ]);
    setClientOnboardingForm(defaultClientOnboardingForm());
  }

  function moveOpportunity(opportunity: Opportunity, direction: "next" | "previous" | "lost") {
    const target = direction === "lost" ? "lost" : direction === "next" ? nextOpportunityStage[opportunity.stage] : previousOpportunityStage[opportunity.stage];
    if (!target || !canAdvanceOpportunity(opportunity.stage, target)) return;
    setWorkspace((current) => ({
      ...current,
      opportunities: current.opportunities.map((item) =>
        item.id === opportunity.id
          ? {
              ...item,
              stage: target,
              closeProbability: target === "won" ? 100 : target === "lost" ? 0 : item.closeProbability,
              updatedAt: now(),
            }
          : item,
      ),
      activities: [
        {
          id: newId("act"),
          entityType: "opportunity",
          entityId: opportunity.id,
          kind: "status_change",
          summary: `Moved ${opportunity.title} to ${opportunityStageLabel(target)}`,
          actorId: "u-amy",
          occurredAt: now(),
        },
        ...current.activities,
      ],
    }));
    liveActions?.advanceOpportunity?.(opportunity.id, target);
  }

  function assignCrew(visitId: string, crewId: string) {
    setWorkspace((current) => ({
      ...current,
      visits: current.visits.map((visit) => (visit.id === visitId ? { ...visit, crewId } : visit)),
    }));
    liveActions?.assignVisit?.(visitId, crewId);
  }

  function toggleChecklist(visitId: string, itemId: string) {
    setWorkspace((current) => ({
      ...current,
      visits: current.visits.map((visit) =>
        visit.id === visitId
          ? {
              ...visit,
              status: visit.status === "scheduled" ? "on_site" : visit.status,
              checklist: visit.checklist.map((item) => (item.id === itemId ? { ...item, isDone: !item.isDone } : item)),
            }
          : visit,
      ),
    }));
    liveActions?.completeChecklistItem?.(visitId, itemId);
  }

  function submitVisit(visit: JobVisit) {
    setWorkspace((current) => ({
      ...current,
      visits: current.visits.map((item) => (item.id === visit.id ? { ...item, status: "complete" } : item)),
      tasks: issueFlag
        ? [
            {
              id: newId("task"),
              entityType: "visit",
              entityId: visit.id,
              title: issueFlag,
              status: "open",
              priority: "high",
              dueAt: now() + 24 * 60 * 60 * 1000,
              assignedUserId: "u-justin",
            },
            ...current.tasks,
          ]
        : current.tasks,
      activities: [
        {
          id: newId("act"),
          entityType: "visit",
          entityId: visit.id,
          kind: "visit",
          summary: `Completed ${jobsById.get(visit.jobId)?.title ?? "visit"}`,
          actorId: "u-nina",
          occurredAt: now(),
        },
        ...current.activities,
      ],
    }));
    liveActions?.submitVisit?.(visit.id, issueFlag || undefined);
    setIssueFlag("");
  }

  function addJobTask(event: FormEvent) {
    event.preventDefault();
    if (!taskTitle.trim() || !selectedJob) return;
    setWorkspace((current) => ({
      ...current,
      tasks: [
        {
          id: newId("task"),
          entityType: "job",
          entityId: selectedJob.id,
          title: taskTitle,
          status: "open",
          priority: "normal",
          dueAt: now() + 48 * 60 * 60 * 1000,
          assignedUserId: "u-justin",
        },
        ...current.tasks,
      ],
    }));
    liveActions?.addTask?.(selectedJob.id, taskTitle);
    setTaskTitle("");
  }

  function addRecordActivity(
    event: FormEvent,
    target: { entityType: "customer" | "job"; entityId: string; form: ActivityComposerState; reset: (value: ActivityComposerState) => void },
  ) {
    event.preventDefault();
    const summary = target.form.body.trim();
    if (!summary) return;
    const dueInDays = Math.max(1, Math.min(30, Math.round(Number(target.form.dueInDays || "2"))));
    setWorkspace((current) => ({
      ...current,
      activities: [
        {
          id: newId("act"),
          entityType: target.entityType,
          entityId: target.entityId,
          kind: target.form.kind,
          summary,
          actorId: "u-amy",
          occurredAt: now(),
        },
        ...current.activities,
      ],
      tasks: target.form.createFollowUp
        ? [
            {
              id: newId("task"),
              entityType: target.entityType,
              entityId: target.entityId,
              title: `Follow up: ${summary.slice(0, 80)}`,
              status: "open",
              priority: "normal",
              dueAt: now() + dueInDays * 24 * 60 * 60 * 1000,
              assignedUserId: "u-amy",
            },
            ...current.tasks,
          ]
        : current.tasks,
    }));
    liveActions?.addActivity?.({
      entityType: target.entityType,
      entityId: target.entityId,
      kind: target.form.kind,
      summary,
      createFollowUp: target.form.createFollowUp,
      dueInDays,
    });
    target.reset(defaultActivityComposer());
  }

  function addCustomerActivity(event: FormEvent) {
    if (!selectedCustomer) return;
    addRecordActivity(event, {
      entityType: "customer",
      entityId: selectedCustomer.id,
      form: customerActivityForm,
      reset: setCustomerActivityForm,
    });
  }

  function addJobActivity(event: FormEvent) {
    if (!selectedJob) return;
    addRecordActivity(event, {
      entityType: "job",
      entityId: selectedJob.id,
      form: jobActivityForm,
      reset: setJobActivityForm,
    });
  }

  function toggleTask(taskId: string) {
    setWorkspace((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, status: task.status === "done" ? "open" : "done" } : task)),
    }));
  }

  function toggleService(itemId: string) {
    setWorkspace((current) => ({
      ...current,
      serviceCatalog: current.serviceCatalog.map((item) => (item.id === itemId ? { ...item, active: !item.active } : item)),
    }));
    liveActions?.toggleService?.(itemId);
  }

  function createCrew(event: FormEvent) {
    event.preventDefault();
    if (!crewName.trim()) return;
    const colors = ["#2f6b4f", "#7c6a2b", "#42526b", "#8a4f36"];
    setWorkspace((current) => ({
      ...current,
      crews: [
        ...current.crews,
        {
          id: newId("crew"),
          name: crewName,
          color: colors[current.crews.length % colors.length],
          active: true,
        },
      ],
    }));
    liveActions?.createCrew?.(crewName);
    setCrewName("");
  }

  return (
    <div className="min-h-screen bg-[#f6f7f1] text-stone-950">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-72 overflow-y-auto border-r border-stone-200 bg-white p-4 transition-transform lg:static lg:translate-x-0",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#224036] text-white">
                <Sprout size={22} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{workspace.organization.name}</div>
                <div className="text-xs text-stone-500">Landscape CRM</div>
              </div>
            </div>
            <IconButton title="Close navigation" onClick={() => setMobileNavOpen(false)}>
              <X size={17} />
            </IconButton>
          </div>

          <nav className="mt-6 grid gap-1">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setMobileNavOpen(false);
                }}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-stone-600 transition hover:bg-stone-100",
                  view === item.id && "bg-[#e8efe8] text-[#224036]",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-lg border border-stone-200 bg-[#fbfaf4] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={16} />
              Tenant isolation
            </div>
            <div className="mt-2 text-xs leading-5 text-stone-600">All production functions require organization membership and role checks.</div>
          </div>

          <div className={cn("mt-3 rounded-lg border p-3", backendState.mode === "convex-live" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Database size={16} />
              {backendState.label}
            </div>
            <div className="mt-2 text-xs leading-5 text-stone-600">{backendState.detail}</div>
          </div>
        </aside>

        {mobileNavOpen ? <button aria-label="Close menu overlay" className="fixed inset-0 z-20 bg-black/20 lg:hidden" onClick={() => setMobileNavOpen(false)} /> : null}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-stone-200 bg-[#f6f7f1]/95 px-4 py-3 backdrop-blur lg:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <IconButton title="Open navigation" onClick={() => setMobileNavOpen(true)}>
                  <Menu size={18} />
                </IconButton>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold">{navItems.find((item) => item.id === view)?.label}</h1>
                  <p className="truncate text-sm text-stone-500">CRM, estimating, dispatch, projects, and field work in one operating surface.</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <IconButton title="Notifications">
                  <Bell size={18} />
                </IconButton>
                {authConfigured ? (
                  <>
                    <Show when="signed-out">
                      <Link
                        href="/signin"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
                      >
                        <UserRound size={16} />
                        Sign In
                      </Link>
                    </Show>
                    <Show when="signed-in">
                      <UserButton />
                    </Show>
                  </>
                ) : null}
              </div>
            </div>
            <div className="relative mt-3 max-w-3xl">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                aria-label="Global search"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setGlobalSearch("");
                  }
                  if (event.key === "Enter" && globalSearchResults[0]) {
                    openGlobalSearchResult(globalSearchResults[0]);
                  }
                }}
                placeholder="Search customers, leads, jobs, visits, tasks"
                className="h-10 w-full rounded-md border border-stone-200 bg-white pl-9 pr-3 text-sm font-medium text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#224036] focus:ring-2 focus:ring-[#224036]/15"
              />
              {globalSearch.trim().length >= 2 ? (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-xl">
                  {globalSearchResults.length > 0 ? (
                    globalSearchResults.map((result) => (
                      <button
                        type="button"
                        key={result.id}
                        onClick={() => openGlobalSearchResult(result)}
                        className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition hover:bg-stone-50 focus:bg-stone-50 focus:outline-none"
                      >
                        <Badge>{result.kind}</Badge>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-stone-900">{result.label}</span>
                          <span className="block truncate text-xs text-stone-500">{result.detail}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-stone-500">No matching customers, leads, jobs, visits, or tasks.</div>
                  )}
                </div>
              ) : null}
            </div>
          </header>

          <div className="p-4 lg:p-6">
            {view === "dashboard" && (
              <DashboardView workspace={workspace} dashboard={dashboard} crewsById={crewsById} customersById={customersById} jobsById={jobsById} setView={setView} />
            )}
            {view === "prime_time" && <PrimeTimeView />}
            {view === "lead_ops" && <LeadOpsView operatingDepth={effectiveOperatingDepth} operatingActions={operatingActions} />}
            {view === "crm" && (
              <CrmView
                workspace={workspace}
                customerSearch={customerSearch}
                setCustomerSearch={setCustomerSearch}
                selectedCustomer={selectedCustomer}
                setSelectedCustomerId={setSelectedCustomerId}
                membersById={membersById}
                leadForm={leadForm}
                setLeadForm={setLeadForm}
                createLead={createLead}
                activityForm={customerActivityForm}
                setActivityForm={setCustomerActivityForm}
                addActivity={addCustomerActivity}
              />
            )}
            {view === "pipeline" && <PipelineView workspace={workspace} customersById={customersById} moveOpportunity={moveOpportunity} />}
            {view === "dispatch" && (
              <DispatchView workspace={workspace} operatingDepth={effectiveOperatingDepth} customersById={customersById} propertiesById={propertiesById} crewsById={crewsById} jobsById={jobsById} assignCrew={assignCrew} />
            )}
            {view === "jobs" && (
              <JobsView
                workspace={workspace}
                operatingDepth={effectiveOperatingDepth}
                selectedJob={selectedJob}
                setSelectedJobId={setSelectedJobId}
                customersById={customersById}
                propertiesById={propertiesById}
                crewsById={crewsById}
                taskTitle={taskTitle}
                setTaskTitle={setTaskTitle}
                addJobTask={addJobTask}
                activityForm={jobActivityForm}
                setActivityForm={setJobActivityForm}
                addActivity={addJobActivity}
                toggleTask={toggleTask}
              />
            )}
            {view === "field" && (
              <FieldView
                workspace={workspace}
                operatingDepth={effectiveOperatingDepth}
                selectedVisit={selectedVisit}
                setSelectedVisitId={setSelectedVisitId}
                customersById={customersById}
                propertiesById={propertiesById}
                crewsById={crewsById}
                jobsById={jobsById}
                issueFlag={issueFlag}
                setIssueFlag={setIssueFlag}
                toggleChecklist={toggleChecklist}
                submitVisit={submitVisit}
              />
            )}
            {view === "costing" && <CostingView workspace={workspace} operatingDepth={effectiveOperatingDepth} operatingActions={operatingActions} />}
            {view === "profit" && <ProfitView operatingDepth={effectiveOperatingDepth} />}
            {view === "cost_intel" && <CostIntelligenceView operatingDepth={effectiveOperatingDepth} operatingActions={operatingActions} />}
            {view === "admin" && (
              <AdminView
                workspace={workspace}
                operatingDepth={effectiveOperatingDepth}
                operatingActions={operatingActions}
                membersById={membersById}
                crewName={crewName}
                setCrewName={setCrewName}
                createCrew={createCrew}
                toggleService={toggleService}
              />
            )}
            {view === "onboarding" && (
              <ClientOnboardingView
                form={clientOnboardingForm}
                setForm={setClientOnboardingForm}
                provisionedClients={provisionedClients}
                createClientWorkspace={createClientWorkspace}
                authConfigured={authConfigured}
                operatingDepth={effectiveOperatingDepth}
              />
            )}
            {view === "specs" && <SpecsView backendState={backendState} workspace={workspace} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function PrimeTimeView() {
  const statusOrder: PrimeTimeStatus[] = ["done", "in_progress", "next", "blocked"];
  const priorityOrder = { P0: 0, P1: 1, P2: 2 };
  const statusCounts = statusOrder.map((status) => ({
    status,
    count: primeTimeBacklog.filter((item) => item.status === status).length,
  }));
  const doneCount = statusCounts.find((row) => row.status === "done")?.count ?? 0;
  const inProgressCount = statusCounts.find((row) => row.status === "in_progress")?.count ?? 0;
  const blockedCount = statusCounts.find((row) => row.status === "blocked")?.count ?? 0;
  const launchScore = Math.round(((doneCount + inProgressCount * 0.45) / primeTimeBacklog.length) * 100);
  const p0Open = primeTimeBacklog
    .filter((item) => item.priority === "P0" && item.status !== "done")
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.status.localeCompare(b.status));
  const tracks = primeTimeGroups.map((group) => {
    const items = primeTimeBacklog.filter((item) => item.track === group.track);
    const done = items.filter((item) => item.status === "done").length;
    const active = items.filter((item) => item.status === "in_progress").length;
    const blocked = items.filter((item) => item.status === "blocked").length;
    return {
      ...group,
      items,
      done,
      active,
      blocked,
      score: Math.round(((done + active * 0.45) / items.length) * 100),
    };
  });
  const ownerCounts = Array.from(new Set(primeTimeBacklog.map((item) => item.owner))).map((owner) => ({
    owner,
    count: primeTimeBacklog.filter((item) => item.owner === owner && item.status !== "done").length,
  }));

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
              <ListChecks size={16} />
              Prime Time Launch Board
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">Top 100 updates to make this sellable as a real SaaS</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-stone-600">
              This board turns the next hundred product, backend, finance, security, onboarding, and go-to-market improvements into an owned launch checklist. Done items are already represented in the current app or Convex model; open items are the next build queue.
            </p>
          </div>
          <div className="grid gap-2 text-right">
            <div className="text-4xl font-bold text-[#224036]">{launchScore}%</div>
            <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">weighted launch score</div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Top 100" value={primeTimeBacklog.length} />
          <Metric label="Done" value={doneCount} tone="success" />
          <Metric label="In progress" value={inProgressCount} tone="warning" />
          <Metric label="Blocked" value={blockedCount} tone={blockedCount > 0 ? "danger" : "neutral"} />
          <Metric label="P0 open" value={p0Open.length} tone={p0Open.length > 0 ? "danger" : "success"} />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold">Track Progress</h2>
            <Badge>{tracks.length} workstreams</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {tracks.map((track) => (
              <div key={track.track} className="rounded-md border border-stone-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{track.track}</div>
                    <div className="mt-1 text-sm leading-5 text-stone-500">{track.goal}</div>
                  </div>
                  <Badge tone={track.blocked > 0 ? "danger" : track.score >= 70 ? "success" : "warning"}>{track.score}%</Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-[#224036]" style={{ width: `${track.score}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-md bg-emerald-50 p-2 text-emerald-800"><div className="font-bold">{track.done}</div><div>done</div></div>
                  <div className="rounded-md bg-amber-50 p-2 text-amber-800"><div className="font-bold">{track.active}</div><div>active</div></div>
                  <div className="rounded-md bg-stone-50 p-2 text-stone-600"><div className="font-bold">{track.items.filter((item) => item.status === "next").length}</div><div>next</div></div>
                  <div className="rounded-md bg-rose-50 p-2 text-rose-800"><div className="font-bold">{track.blocked}</div><div>blocked</div></div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel>
            <h2 className="text-base font-bold">P0 Open Items</h2>
            <div className="mt-4 grid gap-2">
              {p0Open.map((item) => (
                <div key={item.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="mt-1 text-xs text-stone-500">{item.id} - {item.track} - {item.owner}</div>
                    </div>
                    <Badge tone={primeTimeTone(item.status)}>{formatStatus(item.status)}</Badge>
                  </div>
                  <div className="mt-2 text-sm leading-5 text-stone-600">{item.detail}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">Owner Load</h2>
            <div className="mt-4 grid gap-2">
              {ownerCounts.map((row) => (
                <div key={row.owner} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3">
                  <span className="font-semibold">{formatStatus(row.owner)}</span>
                  <Badge>{row.count} open</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">All 100 Updates</h2>
          <div className="flex flex-wrap gap-2">
            {statusCounts.map((row) => (
              <Badge key={row.status} tone={primeTimeTone(row.status)}>{formatStatus(row.status)}: {row.count}</Badge>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          {tracks.map((track) => (
            <div key={track.track} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">{track.track}</h3>
                  <p className="mt-1 text-sm leading-5 text-stone-500">{track.goal}</p>
                </div>
                <Badge>{track.items.length} items</Badge>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {track.items.map((item) => (
                  <div key={item.id} className="rounded-md border border-stone-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">{item.id} - {item.priority} - {item.owner}</div>
                        <div className="mt-1 font-semibold">{item.title}</div>
                      </div>
                      <Badge tone={primeTimeTone(item.status)}>{formatStatus(item.status)}</Badge>
                    </div>
                    <div className="mt-2 text-sm leading-5 text-stone-600">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function DashboardView({
  workspace,
  dashboard,
  crewsById,
  customersById,
  jobsById,
  setView,
}: {
  workspace: WorkspaceSnapshot;
  dashboard: {
    pipelineValue: number;
    todayVisits: JobVisit[];
    overdueTasks: WorkspaceSnapshot["tasks"];
    openEstimates: WorkspaceSnapshot["estimates"];
  };
  crewsById: Map<string, WorkspaceSnapshot["crews"][number]>;
  customersById: Map<string, WorkspaceSnapshot["customers"][number]>;
  jobsById: Map<string, WorkspaceSnapshot["jobs"][number]>;
  setView: (view: View) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<DollarSign size={18} />} label="Open pipeline" value={currency(dashboard.pipelineValue)} />
        <Metric icon={<Route size={18} />} label="Today visits" value={String(dashboard.todayVisits.length)} />
        <Metric icon={<FileText size={18} />} label="Open estimates" value={String(dashboard.openEstimates.length)} />
        <Metric icon={<ClipboardCheck size={18} />} label="Overdue tasks" value={String(dashboard.overdueTasks.length)} tone={dashboard.overdueTasks.length ? "danger" : "success"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">Today’s Route Board</h2>
            <TextButton variant="secondary" icon={<CalendarDays size={16} />} onClick={() => setView("dispatch")}>
              Dispatch
            </TextButton>
          </div>
          <div className="mt-4 grid gap-2">
            {dashboard.todayVisits.map((visit) => {
              const job = jobsById.get(visit.jobId);
              const customer = customersById.get(visit.customerId);
              const crew = crewsById.get(visit.crewId);
              return (
                <div key={visit.id} className="grid gap-3 rounded-md border border-stone-200 p-3 md:grid-cols-[120px_1fr_auto] md:items-center">
                  <div className="text-sm font-semibold">{timeRange(visit.scheduledStart, visit.scheduledEnd)}</div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{job?.title}</div>
                    <div className="truncate text-sm text-stone-500">{customer?.name}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(visit.status)}>{visitStatusLabel(visit.status)}</Badge>
                    <Badge>{crew?.name ?? "Unassigned"}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-base font-bold">Recent Activity</h2>
          <div className="mt-4 grid gap-3">
            {workspace.activities.slice(0, 6).map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[#224036]" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{activity.summary}</div>
                  <div className="text-xs text-stone-500">{shortDate(activity.occurredAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Metric({ icon = <Gauge size={18} />, label, value, tone = "neutral" }: { icon?: ReactNode; label: string; value: ReactNode; tone?: string }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-stone-500">{label}</div>
          <div className="mt-2 text-2xl font-bold tracking-normal">{value}</div>
        </div>
        <div
          className={cn(
            "grid h-10 w-10 place-items-center rounded-md",
            tone === "danger" ? "bg-rose-50 text-rose-700" : tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-[#e8efe8] text-[#224036]",
          )}
        >
          {icon}
        </div>
      </div>
    </Panel>
  );
}

function OwnerTrendChart({ data }: { data: OperatingDepth["admin"]["ownerAnalytics"]["trend"] }) {
  const chartData = data.length > 0 ? data : [{ month: "Now", revenueCents: 0, grossProfitCents: 0, costCents: 0, churnRatePercent: 0 }];
  const width = 640;
  const height = 220;
  const padding = { top: 18, right: 18, bottom: 34, left: 52 };
  const maxValue = Math.max(1, ...chartData.flatMap((row) => [row.revenueCents, row.grossProfitCents, row.costCents]));
  const xFor = (index: number) => padding.left + (index / Math.max(1, chartData.length - 1)) * (width - padding.left - padding.right);
  const yFor = (value: number) => padding.top + (1 - value / maxValue) * (height - padding.top - padding.bottom);
  const pathFor = (key: "revenueCents" | "grossProfitCents" | "costCents") =>
    chartData.map((row, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(row[key])}`).join(" ");

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-stone-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">Revenue, Profit, and Cost Trend</h3>
          <p className="mt-1 text-xs text-stone-500">Monthly operating view from P&L snapshots.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#224036]" />Revenue</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-600" />Profit</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-600" />Costs</span>
        </div>
      </div>
      <svg className="mt-3 h-56 w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Revenue profit and cost trend chart">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line x1={padding.left} x2={width - padding.right} y1={yFor(maxValue * ratio)} y2={yFor(maxValue * ratio)} stroke="#e7e5e4" strokeWidth="1" />
            <text x={padding.left - 10} y={yFor(maxValue * ratio) + 4} textAnchor="end" fontSize="11" fill="#78716c">
              {currency(maxValue * ratio)}
            </text>
          </g>
        ))}
        <path d={pathFor("revenueCents")} fill="none" stroke="#224036" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathFor("grossProfitCents")} fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathFor("costCents")} fill="none" stroke="#d97706" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {chartData.map((row, index) => (
          <g key={row.month}>
            <circle cx={xFor(index)} cy={yFor(row.revenueCents)} r="4" fill="#224036" />
            <circle cx={xFor(index)} cy={yFor(row.grossProfitCents)} r="4" fill="#059669" />
            <circle cx={xFor(index)} cy={yFor(row.costCents)} r="4" fill="#d97706" />
            <text x={xFor(index)} y={height - 10} textAnchor="middle" fontSize="11" fill="#57534e">
              {row.month}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function HorizontalBarChart({
  title,
  subtitle,
  rows,
  valueFormatter,
  tone = "green",
}: {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: number; detail?: string }>;
  valueFormatter: (value: number) => string;
  tone?: "green" | "amber" | "rose";
}) {
  const maxValue = Math.max(1, ...rows.map((row) => Math.abs(row.value)));
  const color = tone === "rose" ? "bg-rose-600" : tone === "amber" ? "bg-amber-600" : "bg-[#224036]";
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-stone-500">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-semibold">{row.label}</span>
              <span className="shrink-0 font-bold">{valueFormatter(row.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
              <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(4, Math.min(100, (Math.abs(row.value) / maxValue) * 100))}%` }} />
            </div>
            {row.detail ? <div className="text-xs text-stone-500">{row.detail}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityComposer({
  contextLabel,
  form,
  setForm,
  onSubmit,
}: {
  contextLabel: "Customer" | "Job";
  form: ActivityComposerState;
  setForm: (value: ActivityComposerState) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Activity type">
          <select
            aria-label={`${contextLabel} activity type`}
            className={inputClass()}
            value={form.kind}
            onChange={(event) => setForm({ ...form, kind: event.target.value as ActivityComposerKind })}
          >
            {Object.entries(activityKindLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Due days">
          <input
            aria-label={`${contextLabel} follow-up due days`}
            className={cn(inputClass(), "w-28")}
            value={form.dueInDays}
            onChange={(event) => setForm({ ...form, dueInDays: event.target.value })}
            disabled={!form.createFollowUp}
            inputMode="numeric"
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Summary">
          <textarea
            aria-label={`${contextLabel} activity summary`}
            className={cn(inputClass(), "min-h-24 resize-y py-2")}
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
            placeholder="Log what happened and what the team should know."
            required
          />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700">
          <input
            aria-label={`${contextLabel} create follow-up`}
            type="checkbox"
            checked={form.createFollowUp}
            onChange={(event) => setForm({ ...form, createFollowUp: event.target.checked })}
            className="h-4 w-4 rounded border-stone-300 text-[#224036]"
          />
          Create follow-up task
        </label>
        <TextButton type="submit" icon={<Plus size={16} />}>Log Activity</TextButton>
      </div>
    </form>
  );
}

function ActivityTimeline({
  activities,
  tasks,
  emptyLabel,
}: {
  activities: WorkspaceSnapshot["activities"];
  tasks: WorkspaceSnapshot["tasks"];
  emptyLabel: string;
}) {
  const visibleActivities = activities.slice(0, 6);
  const visibleTasks = tasks.slice(0, 4);
  return (
    <div className="rounded-md border border-stone-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold">Timeline</h3>
        <Badge>{visibleActivities.length + visibleTasks.length}</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {visibleTasks.map((task) => (
          <div key={`task-${task.id}`} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">Follow-up</span>
              <Badge tone="warning">{shortDate(task.dueAt)}</Badge>
            </div>
            <div className="mt-1 text-stone-700">{task.title}</div>
          </div>
        ))}
        {visibleActivities.map((activity) => {
          const label = activity.kind === "call" || activity.kind === "email" || activity.kind === "note" ? activityKindLabels[activity.kind] : formatStatus(activity.kind);
          return (
            <div key={`activity-${activity.id}`} className="rounded-md border border-stone-200 p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={activity.kind === "call" ? "success" : activity.kind === "email" ? "warning" : "neutral"}>{label}</Badge>
                <span className="text-xs text-stone-500">{shortDate(activity.occurredAt)}</span>
              </div>
              <div className="mt-2 leading-5 text-stone-700">{activity.summary}</div>
            </div>
          );
        })}
        {visibleTasks.length === 0 && visibleActivities.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-200 p-4 text-sm text-stone-500">{emptyLabel}</div>
        ) : null}
      </div>
    </div>
  );
}

function CrmView({
  workspace,
  customerSearch,
  setCustomerSearch,
  selectedCustomer,
  setSelectedCustomerId,
  membersById,
  leadForm,
  setLeadForm,
  createLead,
  activityForm,
  setActivityForm,
  addActivity,
}: {
  workspace: WorkspaceSnapshot;
  customerSearch: string;
  setCustomerSearch: (value: string) => void;
  selectedCustomer?: WorkspaceSnapshot["customers"][number];
  setSelectedCustomerId: (id: string) => void;
  membersById: Map<string, WorkspaceSnapshot["members"][number]>;
  leadForm: LeadFormState;
  setLeadForm: (value: LeadFormState) => void;
  createLead: (event: FormEvent) => void;
  activityForm: ActivityComposerState;
  setActivityForm: (value: ActivityComposerState) => void;
  addActivity: (event: FormEvent) => void;
}) {
  const filtered = workspace.customers.filter((customer) => customer.name.toLowerCase().includes(customerSearch.toLowerCase()));
  const customerProperties = selectedCustomer ? workspace.properties.filter((property) => property.customerId === selectedCustomer.id) : [];
  const customerOpps = selectedCustomer ? workspace.opportunities.filter((opp) => opp.customerId === selectedCustomer.id) : [];
  const customerActivities = selectedCustomer ? workspace.activities.filter((activity) => activity.entityType === "customer" && activity.entityId === selectedCustomer.id) : [];
  const customerTasks = selectedCustomer ? workspace.tasks.filter((task) => task.entityType === "customer" && task.entityId === selectedCustomer.id && task.status !== "done") : [];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">Customers</h2>
          <Badge>{workspace.customers.length}</Badge>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} />
          <input className={cn(inputClass(), "w-full pl-9")} value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customers" />
        </div>
        <div className="mt-4 grid gap-2">
          {filtered.map((customer) => (
            <button
              type="button"
              key={customer.id}
              onClick={() => setSelectedCustomerId(customer.id)}
              className={cn(
                "rounded-md border p-3 text-left transition hover:border-stone-300 hover:bg-stone-50",
                selectedCustomer?.id === customer.id ? "border-[#8aa99a] bg-[#f0f5ef]" : "border-stone-200 bg-white",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-semibold">{customer.name}</span>
                <Badge tone={customer.status === "active" ? "success" : "neutral"}>{customer.status}</Badge>
              </div>
              <div className="mt-2 truncate text-sm text-stone-500">{customer.phone || customer.email}</div>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4">
        <Panel>
          {selectedCustomer ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold">{selectedCustomer.name}</h2>
                  <div className="mt-1 flex flex-wrap gap-2 text-sm text-stone-500">
                    <span>{selectedCustomer.type}</span>
                    <span>{selectedCustomer.phone}</span>
                    <span>{selectedCustomer.email}</span>
                  </div>
                </div>
                <Badge>{membersById.get(selectedCustomer.ownerId)?.name ?? "Unassigned"}</Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {customerProperties.map((property) => (
                  <div key={property.id} className="rounded-md border border-stone-200 p-3">
                    <div className="font-semibold">{property.label}</div>
                    <div className="mt-1 text-sm text-stone-500">{property.street}, {property.city}</div>
                    <a className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#224036]" href={googleMapsUrl(`${property.street}, ${property.city}, ${property.state} ${property.postalCode}`)} target="_blank" rel="noreferrer">
                      <MapPin size={15} />
                      Maps
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2">
                {customerOpps.map((opp) => (
                  <div key={opp.id} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{opp.title}</div>
                      <div className="text-sm text-stone-500">{currency(opp.valueCents)}</div>
                    </div>
                    <Badge tone={statusTone(opp.stage)}>{opportunityStageLabel(opp.stage)}</Badge>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold">Customer Activity</h2>
            <Badge>{customerTasks.length} open follow-up{customerTasks.length === 1 ? "" : "s"}</Badge>
          </div>
          {selectedCustomer ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <ActivityComposer
                contextLabel="Customer"
                form={activityForm}
                setForm={setActivityForm}
                onSubmit={addActivity}
              />
              <ActivityTimeline activities={customerActivities} tasks={customerTasks} emptyLabel="No logged calls, emails, or notes for this customer yet." />
            </div>
          ) : null}
        </Panel>

        <Panel>
          <h2 className="text-base font-bold">Create Lead</h2>
          <form onSubmit={createLead} className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Customer">
              <input className={inputClass()} value={leadForm.customerName} onChange={(event) => setLeadForm({ ...leadForm, customerName: event.target.value })} required />
            </Field>
            <Field label="Service request">
              <input className={inputClass()} value={leadForm.title} onChange={(event) => setLeadForm({ ...leadForm, title: event.target.value })} required />
            </Field>
            <Field label="Source">
              <select className={inputClass()} value={leadForm.source} onChange={(event) => setLeadForm({ ...leadForm, source: event.target.value })}>
                {leadSourceOptions.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </Field>
            <Field label="Intake type">
              <select className={inputClass()} value={leadForm.leadType} onChange={(event) => setLeadForm({ ...leadForm, leadType: event.target.value as LeadType })}>
                {leadTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Phone">
              <input className={inputClass()} value={leadForm.phone} onChange={(event) => setLeadForm({ ...leadForm, phone: event.target.value })} />
            </Field>
            <Field label="Email">
              <input className={inputClass()} value={leadForm.email} onChange={(event) => setLeadForm({ ...leadForm, email: event.target.value })} />
            </Field>
            <Field label="Account type">
              <select className={inputClass()} value={leadForm.accountType} onChange={(event) => setLeadForm({ ...leadForm, accountType: event.target.value as AccountType })}>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </Field>
            <Field label="Company assignment">
              <input className={inputClass()} value={leadForm.companyAssignment} onChange={(event) => setLeadForm({ ...leadForm, companyAssignment: event.target.value })} />
            </Field>
            <Field label="Street">
              <input className={inputClass()} value={leadForm.street} onChange={(event) => setLeadForm({ ...leadForm, street: event.target.value })} required />
            </Field>
            <Field label="City">
              <input className={inputClass()} value={leadForm.city} onChange={(event) => setLeadForm({ ...leadForm, city: event.target.value })} required />
            </Field>
            <Field label="State">
              <input className={inputClass()} value={leadForm.state} onChange={(event) => setLeadForm({ ...leadForm, state: event.target.value.toUpperCase().slice(0, 2) })} required />
            </Field>
            <Field label="ZIP">
              <input className={inputClass()} value={leadForm.postalCode} onChange={(event) => setLeadForm({ ...leadForm, postalCode: event.target.value })} />
            </Field>
            <Field label="Value">
              <input className={inputClass()} value={leadForm.value} onChange={(event) => setLeadForm({ ...leadForm, value: event.target.value })} inputMode="decimal" />
            </Field>
            <Field label="Lawn size sq ft">
              <input className={inputClass()} value={leadForm.lawnSizeSqFt} onChange={(event) => setLeadForm({ ...leadForm, lawnSizeSqFt: event.target.value })} inputMode="numeric" />
            </Field>
            <Field label="Service line">
              <select className={inputClass()} value={leadForm.serviceLine} onChange={(event) => setLeadForm({ ...leadForm, serviceLine: event.target.value as ServiceCategory })}>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Urgency">
              <select className={inputClass()} value={leadForm.urgency} onChange={(event) => setLeadForm({ ...leadForm, urgency: event.target.value as LeadUrgency })}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Customer message">
                <textarea className={cn(inputClass(), "min-h-24 resize-y")} value={leadForm.message} onChange={(event) => setLeadForm({ ...leadForm, message: event.target.value })} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Estimator notes">
                <textarea className={cn(inputClass(), "min-h-20 resize-y")} value={leadForm.estimateNotes} onChange={(event) => setLeadForm({ ...leadForm, estimateNotes: event.target.value })} />
              </Field>
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">Lead data score</span>
                <Badge tone={leadQualityScore(leadForm) >= 80 ? "success" : leadQualityScore(leadForm) >= 60 ? "warning" : "danger"}>{leadQualityScore(leadForm)}</Badge>
              </div>
              <p className="mt-2 text-stone-500">Best records have source, contact, full address, service line, lawn size, message, and owner/company assignment before estimating.</p>
            </div>
            <div className="relative z-10 md:col-span-2">
              <div className="pt-1">
                <TextButton type="submit" icon={<Plus size={16} />} className="w-full sm:w-auto">
                  Create Lead
                </TextButton>
              </div>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function PipelineView({
  workspace,
  customersById,
  moveOpportunity,
}: {
  workspace: WorkspaceSnapshot;
  customersById: Map<string, WorkspaceSnapshot["customers"][number]>;
  moveOpportunity: (opportunity: Opportunity, direction: "next" | "previous" | "lost") => void;
}) {
  return (
    <div className="grid gap-4 overflow-x-auto pb-2 xl:grid-cols-6">
      {opportunityStages.map((stage) => {
        const opportunities = workspace.opportunities.filter((opp) => opp.stage === stage);
        return (
          <Panel key={stage} className="min-w-72">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">{opportunityStageLabel(stage)}</h2>
              <Badge>{opportunities.length}</Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {opportunities.map((opp) => (
                <div key={opp.id} className="rounded-md border border-stone-200 p-3">
                  <div className="font-semibold">{opp.title}</div>
                  <div className="mt-1 text-sm text-stone-500">{customersById.get(opp.customerId)?.name}</div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-bold">{currency(opp.valueCents)}</span>
                    <Badge tone={statusTone(opp.stage)}>{opp.closeProbability}%</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <IconButton title="Move backward" onClick={() => moveOpportunity(opp, "previous")} disabled={!previousOpportunityStage[opp.stage]}>
                      <ChevronLeft size={16} />
                    </IconButton>
                    <IconButton title="Move forward" onClick={() => moveOpportunity(opp, "next")} disabled={!nextOpportunityStage[opp.stage]}>
                      <ChevronRight size={16} />
                    </IconButton>
                    {opp.stage !== "won" && opp.stage !== "lost" ? (
                      <IconButton title="Mark lost" onClick={() => moveOpportunity(opp, "lost")}>
                        <X size={16} />
                      </IconButton>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function DispatchView({
  workspace,
  operatingDepth,
  customersById,
  propertiesById,
  crewsById,
  jobsById,
  assignCrew,
}: {
  workspace: WorkspaceSnapshot;
  operatingDepth: OperatingDepth;
  customersById: Map<string, WorkspaceSnapshot["customers"][number]>;
  propertiesById: Map<string, WorkspaceSnapshot["properties"][number]>;
  crewsById: Map<string, WorkspaceSnapshot["crews"][number]>;
  jobsById: Map<string, WorkspaceSnapshot["jobs"][number]>;
  assignCrew: (visitId: string, crewId: string) => void;
}) {
  const routeByVisitId = new Map(operatingDepth.fieldOps.routeConfidence.map((route) => [route.visitId, route]));
  const equipmentByVisitId = new Map<string, OperatingDepth["fieldOps"]["equipmentCheckouts"]>();
  for (const checkout of operatingDepth.fieldOps.equipmentCheckouts) {
    const existing = equipmentByVisitId.get(checkout.visitId) ?? [];
    existing.push(checkout);
    equipmentByVisitId.set(checkout.visitId, existing);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Panel>
        <h2 className="text-base font-bold">Schedule</h2>
        <div className="mt-4 grid gap-3">
          {workspace.visits
            .slice()
            .sort((a, b) => a.scheduledStart - b.scheduledStart)
            .map((visit) => {
              const property = visit.propertyId ? propertiesById.get(visit.propertyId) : undefined;
              const route = routeByVisitId.get(visit.id);
              const equipment = equipmentByVisitId.get(visit.id) ?? [];
              return (
                <div key={visit.id} className="grid gap-3 rounded-md border border-stone-200 p-3 lg:grid-cols-[150px_1fr_210px_180px_150px] lg:items-center">
                  <div>
                    <div className="font-semibold">{timeRange(visit.scheduledStart, visit.scheduledEnd)}</div>
                    <div className="text-sm text-stone-500">Stop {visit.routeOrder}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{jobsById.get(visit.jobId)?.title}</div>
                    <div className="truncate text-sm text-stone-500">{customersById.get(visit.customerId)?.name}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {route?.requiredSkills.map((skill) => <Badge key={skill}>{skill}</Badge>)}
                    </div>
                  </div>
                  <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-normal text-stone-500">Route confidence</span>
                      <Badge tone={route && route.score >= 85 ? "success" : route && route.score < 70 ? "danger" : "warning"}>{route?.score ?? 0}%</Badge>
                    </div>
                    <div className="mt-2 text-xs leading-5 text-stone-500">
                      {route?.warnings.length ? route.warnings.join("; ") : "No routing warnings"}
                    </div>
                    {equipment.some((item) => item.status === "conflict" || item.maintenanceDue) ? (
                      <div className="mt-2 text-xs font-semibold text-rose-700">{equipment.filter((item) => item.status === "conflict" || item.maintenanceDue).length} equipment issue</div>
                    ) : null}
                  </div>
                  <select className={inputClass()} value={visit.crewId} onChange={(event) => assignCrew(visit.id, event.target.value)}>
                    {workspace.crews.map((crew) => (
                      <option key={crew.id} value={crew.id}>{crew.name}</option>
                    ))}
                  </select>
                  {property ? (
                    <a className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-[#224036]" href={googleMapsUrl(`${property.street}, ${property.city}, ${property.state} ${property.postalCode}`)} target="_blank" rel="noreferrer">
                      <MapPin size={15} />
                      Maps
                    </a>
                  ) : null}
                </div>
              );
            })}
        </div>
      </Panel>
      <Panel>
        <h2 className="text-base font-bold">Crew Load</h2>
        <div className="mt-4 grid gap-3">
          {workspace.crews.map((crew) => {
            const visits = workspace.visits.filter((visit) => visit.crewId === crew.id);
            const routeScores = visits.map((visit) => routeByVisitId.get(visit.id)?.score ?? 0).filter(Boolean);
            const averageRouteScore = routeScores.length ? Math.round(routeScores.reduce((sum, score) => sum + score, 0) / routeScores.length) : 0;
            const equipmentIssues = visits.flatMap((visit) => equipmentByVisitId.get(visit.id) ?? []).filter((item) => item.status === "conflict" || item.maintenanceDue);
            return (
              <div key={crew.id} className="rounded-md border border-stone-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: crew.color }} />
                  <span className="font-semibold">{crewsById.get(crew.id)?.name}</span>
                </div>
                <div className="mt-2 text-sm text-stone-500">{visits.length} scheduled visits</div>
                <div className="mt-3 grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-stone-500">Route confidence</span>
                    <Badge tone={averageRouteScore >= 85 ? "success" : averageRouteScore < 70 ? "danger" : "warning"}>{averageRouteScore || "N/A"}{averageRouteScore ? "%" : ""}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(routeByVisitId.get(visits[0]?.id ?? "")?.crewSkills ?? ["No skills assigned"]).map((skill) => <Badge key={skill}>{skill}</Badge>)}
                  </div>
                  {equipmentIssues.length > 0 ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-700">{equipmentIssues.map((item) => item.equipmentName).join(", ")}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function JobsView({
  workspace,
  operatingDepth,
  selectedJob,
  setSelectedJobId,
  customersById,
  propertiesById,
  crewsById,
  taskTitle,
  setTaskTitle,
  addJobTask,
  activityForm,
  setActivityForm,
  addActivity,
  toggleTask,
}: {
  workspace: WorkspaceSnapshot;
  operatingDepth: OperatingDepth;
  selectedJob?: WorkspaceSnapshot["jobs"][number];
  setSelectedJobId: (id: string) => void;
  customersById: Map<string, WorkspaceSnapshot["customers"][number]>;
  propertiesById: Map<string, WorkspaceSnapshot["properties"][number]>;
  crewsById: Map<string, WorkspaceSnapshot["crews"][number]>;
  taskTitle: string;
  setTaskTitle: (value: string) => void;
  addJobTask: (event: FormEvent) => void;
  activityForm: ActivityComposerState;
  setActivityForm: (value: ActivityComposerState) => void;
  addActivity: (event: FormEvent) => void;
  toggleTask: (taskId: string) => void;
}) {
  const visits = selectedJob ? workspace.visits.filter((visit) => visit.jobId === selectedJob.id) : [];
  const tasks = selectedJob ? workspace.tasks.filter((task) => task.entityType === "job" && task.entityId === selectedJob.id) : [];
  const jobActivities = selectedJob ? workspace.activities.filter((activity) => activity.entityType === "job" && activity.entityId === selectedJob.id) : [];
  const property = selectedJob?.propertyId ? propertiesById.get(selectedJob.propertyId) : undefined;
  const selectedSummary = selectedJob ? operatingDepth.jobCosting.summaries.find((summary) => summary.jobId === selectedJob.id) : undefined;
  const selectedTime = selectedJob ? operatingDepth.fieldOps.timeBreakdowns.find((row) => row.jobId === selectedJob.id) : undefined;
  const selectedVisitIds = new Set(visits.map((visit) => visit.id));
  const selectedCallbacks = selectedJob ? operatingDepth.fieldOps.callbacks.filter((callback) => callback.jobTitle === selectedJob.title) : [];
  const selectedMaterialLots = operatingDepth.fieldOps.materialLots.filter((lot) => selectedVisitIds.has(lot.visitId));
  const selectedEquipment = operatingDepth.fieldOps.equipmentCheckouts.filter((checkout) => selectedVisitIds.has(checkout.visitId));

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Panel>
        <h2 className="text-base font-bold">Jobs</h2>
        <div className="mt-4 grid gap-2">
          {workspace.jobs.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => setSelectedJobId(job.id)}
              className={cn("rounded-md border p-3 text-left", selectedJob?.id === job.id ? "border-[#8aa99a] bg-[#f0f5ef]" : "border-stone-200 bg-white")}
            >
              <div className="font-semibold">{job.title}</div>
              <div className="mt-1 text-sm text-stone-500">{customersById.get(job.customerId)?.name}</div>
              <div className="mt-2">
                <Badge tone={statusTone(job.status)}>{job.status}</Badge>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4">
        <Panel>
          {selectedJob ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{selectedJob.title}</h2>
                  <div className="mt-1 text-sm text-stone-500">{customersById.get(selectedJob.customerId)?.name}</div>
                </div>
                <Badge tone={statusTone(selectedJob.status)}>{selectedJob.status}</Badge>
              </div>
              {property ? <div className="mt-4 rounded-md border border-stone-200 p-3 text-sm text-stone-600">{property.street}, {property.city}, {property.state}</div> : null}
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <Metric label="Revenue" value={currency(selectedSummary?.actualRevenueCents ?? 0)} />
                <Metric label="Profit" value={currency(selectedSummary?.grossProfitCents ?? 0)} tone={(selectedSummary?.grossProfitCents ?? 0) >= 0 ? "success" : "danger"} />
                <Metric label="Time variance" value={selectedTime ? humanMinutes(selectedTime.varianceMinutes) : "0m"} tone={selectedTime && selectedTime.varianceMinutes > 30 ? "warning" : "success"} />
                <Metric label="Portal state" value={selectedJob.status === "completed" ? "Ready" : "Draft"} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {visits.map((visit) => (
                  <div key={visit.id} className="rounded-md border border-stone-200 p-3">
                    <div className="font-semibold">{shortDate(visit.scheduledStart)} - {timeRange(visit.scheduledStart, visit.scheduledEnd)}</div>
                    <div className="mt-1 text-sm text-stone-500">{crewsById.get(visit.crewId)?.name}</div>
                    <div className="mt-3">
                      <Badge tone={statusTone(visit.status)}>{visitStatusLabel(visit.status)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">Tasks</h2>
            <Badge>{tasks.length}</Badge>
          </div>
          <form onSubmit={addJobTask} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input className={cn(inputClass(), "min-w-0 flex-1")} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Add task" />
            <TextButton type="submit" icon={<Plus size={16} />}>Add</TextButton>
          </form>
          <div className="mt-4 grid gap-2">
            {tasks.map((task) => (
              <button key={task.id} type="button" onClick={() => toggleTask(task.id)} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3 text-left">
                <span className={cn("min-w-0 truncate font-medium", task.status === "done" && "text-stone-400 line-through")}>{task.title}</span>
                <Badge tone={statusTone(task.status)}>{task.status}</Badge>
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold">Job Activity</h2>
            <Badge>{jobActivities.length} logged</Badge>
          </div>
          {selectedJob ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <ActivityComposer
                contextLabel="Job"
                form={activityForm}
                setForm={setActivityForm}
                onSubmit={addActivity}
              />
              <ActivityTimeline activities={jobActivities} tasks={tasks.filter((task) => task.status !== "done")} emptyLabel="No job calls, emails, or internal notes logged yet." />
            </div>
          ) : null}
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold">Operational Controls</h2>
            <Badge tone={selectedCallbacks.length > 0 ? "warning" : "success"}>{selectedCallbacks.length} callback{selectedCallbacks.length === 1 ? "" : "s"}</Badge>
          </div>
          {selectedJob ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-md border border-stone-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Time card</div>
                <div className="mt-2 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3"><span>Estimated</span><strong>{selectedTime ? humanMinutes(selectedTime.estimatedMinutes) : "0m"}</strong></div>
                  <div className="flex justify-between gap-3"><span>Scheduled</span><strong>{selectedTime ? humanMinutes(selectedTime.scheduledMinutes) : "0m"}</strong></div>
                  <div className="flex justify-between gap-3"><span>Drive / non-billable</span><strong>{selectedTime ? humanMinutes(selectedTime.driveMinutes + selectedTime.nonBillableMinutes) : "0m"}</strong></div>
                </div>
              </div>
              <div className="rounded-md border border-stone-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Customer portal preview</div>
                <div className="mt-2 text-sm leading-5 text-stone-600">
                  Shows scheduled visits, completed checklist items, before/after photo placeholders, invoice balance, and open callback status.
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <Badge>{visits.length} visits</Badge>
                  <Badge>{tasks.filter((task) => task.status !== "done").length} open tasks</Badge>
                  <Badge>{selectedMaterialLots.length} material logs</Badge>
                </div>
              </div>
              <div className="rounded-md border border-stone-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Callback reasons</div>
                <div className="mt-2 grid gap-2">
                  {selectedCallbacks.length > 0 ? selectedCallbacks.map((callback) => (
                    <div key={callback.id} className="text-sm">
                      <div className="font-semibold">{callback.reason}</div>
                      <div className="text-stone-500">{formatStatus(callback.status)} - {formatStatus(callback.severity)}</div>
                    </div>
                  )) : <div className="text-sm text-stone-500">No callback or complaint records.</div>}
                </div>
              </div>
              <div className="rounded-md border border-stone-200 p-3 lg:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Materials and chemical lots</div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {selectedMaterialLots.length > 0 ? selectedMaterialLots.map((lot) => (
                    <div key={`${lot.visitId}-${lot.lotNumber}`} className="rounded-md bg-stone-50 p-2 text-sm">
                      <div className="font-semibold">{lot.materialName}</div>
                      <div className="text-stone-500">{lot.quantity} - {lot.lotNumber}{lot.epaNumber ? ` - ${lot.epaNumber}` : ""}</div>
                    </div>
                  )) : <div className="text-sm text-stone-500">No materials logged for this job.</div>}
                </div>
              </div>
              <div className="rounded-md border border-stone-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Equipment</div>
                <div className="mt-2 grid gap-2">
                  {selectedEquipment.slice(0, 4).map((item) => (
                    <div key={`${item.visitId}-${item.equipmentName}`} className="flex items-center justify-between gap-2 text-sm">
                      <span>{item.equipmentName}</span>
                      <Badge tone={item.status === "conflict" || item.maintenanceDue ? "danger" : "success"}>{formatStatus(item.status)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

function FieldView({
  workspace,
  operatingDepth,
  selectedVisit,
  setSelectedVisitId,
  customersById,
  propertiesById,
  crewsById,
  jobsById,
  issueFlag,
  setIssueFlag,
  toggleChecklist,
  submitVisit,
}: {
  workspace: WorkspaceSnapshot;
  operatingDepth: OperatingDepth;
  selectedVisit?: JobVisit;
  setSelectedVisitId: (id: string) => void;
  customersById: Map<string, WorkspaceSnapshot["customers"][number]>;
  propertiesById: Map<string, WorkspaceSnapshot["properties"][number]>;
  crewsById: Map<string, WorkspaceSnapshot["crews"][number]>;
  jobsById: Map<string, WorkspaceSnapshot["jobs"][number]>;
  issueFlag: string;
  setIssueFlag: (value: string) => void;
  toggleChecklist: (visitId: string, itemId: string) => void;
  submitVisit: (visit: JobVisit) => void;
}) {
  const property = selectedVisit?.propertyId ? propertiesById.get(selectedVisit.propertyId) : undefined;
  const selectedRoute = selectedVisit ? operatingDepth.fieldOps.routeConfidence.find((route) => route.visitId === selectedVisit.id) : undefined;
  const selectedLots = selectedVisit ? operatingDepth.fieldOps.materialLots.filter((lot) => lot.visitId === selectedVisit.id) : [];
  const selectedEquipment = selectedVisit ? operatingDepth.fieldOps.equipmentCheckouts.filter((checkout) => checkout.visitId === selectedVisit.id) : [];
  const selectedTime = selectedVisit ? operatingDepth.fieldOps.timeBreakdowns.find((row) => row.jobId === selectedVisit.jobId) : undefined;
  const selectedWeather = selectedVisit ? operatingDepth.costIntelligence.weatherSnapshots.find((snapshot) => snapshot.id === `weather-${selectedVisit.id}` || snapshot.observedAt === selectedVisit.scheduledStart) : undefined;

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[360px_1fr]">
      <Panel>
        <h2 className="text-base font-bold">My Visits</h2>
        <div className="mt-4 grid gap-2">
          {workspace.visits.map((visit) => (
            <button
              key={visit.id}
              type="button"
              onClick={() => setSelectedVisitId(visit.id)}
              className={cn("rounded-md border p-3 text-left", selectedVisit?.id === visit.id ? "border-[#8aa99a] bg-[#f0f5ef]" : "border-stone-200 bg-white")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{timeRange(visit.scheduledStart, visit.scheduledEnd)}</span>
                <Badge tone={statusTone(visit.status)}>{visitStatusLabel(visit.status)}</Badge>
              </div>
              <div className="mt-2 text-sm text-stone-500">{customersById.get(visit.customerId)?.name}</div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        {selectedVisit ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{jobsById.get(selectedVisit.jobId)?.title}</h2>
                <div className="mt-1 text-sm text-stone-500">{customersById.get(selectedVisit.customerId)?.name} - {crewsById.get(selectedVisit.crewId)?.name}</div>
              </div>
              <Badge tone={statusTone(selectedVisit.status)}>{visitStatusLabel(selectedVisit.status)}</Badge>
            </div>
            {property ? (
              <div className="rounded-md border border-stone-200 p-3">
                <div className="font-semibold">{property.label}</div>
                <div className="mt-1 text-sm text-stone-500">{property.street}, {property.city}, {property.state}</div>
                <a className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#224036]" href={googleMapsUrl(`${property.street}, ${property.city}, ${property.state} ${property.postalCode}`)} target="_blank" rel="noreferrer">
                  <MapPin size={15} />
                  Maps
                  <ExternalLink size={13} />
                </a>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Weather application rules</div>
                  <Badge tone={selectedWeather?.applicationRisk === "high" ? "danger" : selectedWeather?.applicationRisk === "medium" ? "warning" : "success"}>{selectedWeather?.applicationRisk ?? "unknown"}</Badge>
                </div>
                <div className="mt-2 text-sm leading-5 text-stone-600">
                  {selectedWeather ? `${selectedWeather.conditions}, ${selectedWeather.temperatureF ?? "--"}F, wind ${selectedWeather.windMph ?? "--"} mph, rain ${selectedWeather.precipitationProbability ?? 0}%` : "No weather snapshot yet."}
                </div>
                <div className="mt-2 text-xs text-stone-500">{selectedRoute?.warnings.length ? selectedRoute.warnings.join("; ") : "Label and drift checks clear."}</div>
              </div>
              <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Time capture</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-md bg-white p-2"><div className="font-bold">{selectedTime ? humanMinutes(selectedTime.actualMinutes) : "0m"}</div><div className="text-xs text-stone-500">actual</div></div>
                  <div className="rounded-md bg-white p-2"><div className="font-bold">{selectedTime ? humanMinutes(selectedTime.driveMinutes) : "0m"}</div><div className="text-xs text-stone-500">drive</div></div>
                  <div className="rounded-md bg-white p-2"><div className="font-bold">{selectedTime ? humanMinutes(selectedTime.nonBillableMinutes) : "0m"}</div><div className="text-xs text-stone-500">non-bill</div></div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {["Loading", "Fuel", "Customer delay", "Weather hold"].map((label) => <Badge key={label}>{label}</Badge>)}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-stone-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Material / chemical lot</div>
                <div className="mt-2 grid gap-2">
                  {selectedLots.length > 0 ? selectedLots.map((lot) => (
                    <div key={`${lot.visitId}-${lot.lotNumber}`} className="rounded-md bg-stone-50 p-2 text-sm">
                      <div className="font-semibold">{lot.materialName}</div>
                      <div className="text-stone-500">{lot.quantity} - {lot.lotNumber}</div>
                      {lot.epaNumber ? <div className="text-xs text-stone-500">{lot.epaNumber}</div> : null}
                    </div>
                  )) : <div className="text-sm text-stone-500">No material selected.</div>}
                </div>
              </div>
              <div className="rounded-md border border-stone-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Equipment checkout</div>
                <div className="mt-2 grid gap-2">
                  {selectedEquipment.map((item) => (
                    <div key={`${item.visitId}-${item.equipmentName}`} className="flex items-center justify-between gap-2 text-sm">
                      <span>{item.equipmentName}</span>
                      <Badge tone={item.status === "conflict" || item.maintenanceDue ? "danger" : "success"}>{formatStatus(item.status)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              {selectedVisit.checklist.map((item) => (
                <button key={item.id} type="button" onClick={() => toggleChecklist(selectedVisit.id, item.id)} className="flex items-center gap-3 rounded-md border border-stone-200 p-3 text-left">
                  <span className={cn("grid h-6 w-6 place-items-center rounded-md border", item.isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-stone-300 bg-white text-transparent")}>
                    <Check size={15} />
                  </span>
                  <span className={cn("font-medium", item.isDone && "text-stone-400 line-through")}>{item.label}</span>
                </button>
              ))}
            </div>

            <Field label="Issue flag">
              <input className={inputClass()} value={issueFlag} onChange={(event) => setIssueFlag(event.target.value)} placeholder="Optional follow-up task" />
            </Field>
            <div className="flex flex-wrap gap-2">
              {["Property damage", "Customer complaint", "Missed area", "Upsell opportunity", "Revisit required"].map((reason) => (
                <button key={reason} type="button" onClick={() => setIssueFlag(reason)} className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
                  {reason}
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-dashed border-stone-300 p-3 text-sm text-stone-500">Before/after photo capture queue</div>
              <div className="rounded-md border border-dashed border-stone-300 p-3 text-sm text-stone-500">Customer signature and service receipt preview</div>
            </div>
            <TextButton icon={<ClipboardCheck size={16} />} onClick={() => submitVisit(selectedVisit)}>
              Submit Visit
            </TextButton>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function LeadOpsView({ operatingDepth, operatingActions }: { operatingDepth: OperatingDepth; operatingActions?: OperatingActions }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>(operatingDepth.leadOps.rows[0]?.id);
  const statusOptions = operatingDepth.leadOps.statusSettings.length > 0 ? operatingDepth.leadOps.statusSettings : [];
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return operatingDepth.leadOps.rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (gradeFilter !== "all" && row.grade !== gradeFilter) return false;
      if (!normalized) return true;
      return [row.title, row.customerName, row.city, row.source, row.ownerName].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [gradeFilter, operatingDepth.leadOps.rows, query, statusFilter]);
  const selectedSet = new Set(selectedIds);
  const selectedLead = rows.find((row) => row.id === selectedLeadId) ?? rows[0] ?? operatingDepth.leadOps.rows[0];

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function bulkMove(status: string) {
    if (selectedIds.length === 0) return;
    operatingActions?.bulkUpdateLeads?.(selectedIds, status);
    setSelectedIds([]);
  }

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
              <Filter size={16} />
              Lead Operations
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">Lead command table</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Open" value={operatingDepth.leadOps.metrics.openLeads} />
            <Metric label="A quality" value={operatingDepth.leadOps.metrics.highQuality} />
            <Metric label="Spam review" value={operatingDepth.leadOps.metrics.spamReview} tone="warning" />
            <Metric label="Unassigned" value={operatingDepth.leadOps.metrics.unassigned} tone="danger" />
            <Metric label="SLA misses" value={operatingDepth.leadOps.metrics.slaOverdue} tone={operatingDepth.leadOps.metrics.slaOverdue > 0 ? "danger" : "success"} />
            <Metric label="Duplicates" value={operatingDepth.leadOps.metrics.duplicates} tone={operatingDepth.leadOps.metrics.duplicates > 0 ? "warning" : "success"} />
            <Metric label="Estimate ready" value={operatingDepth.leadOps.metrics.estimateReady} tone="success" />
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_180px_160px_auto]">
          <Field label="Search">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-3 text-stone-400" />
              <input className={cn(inputClass(), "pl-9")} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Lead, customer, city, source" />
            </div>
          </Field>
          <Field label="Status">
            <select className={inputClass()} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status.id} value={status.status}>{status.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Grade">
            <select className={inputClass()} value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
              {["all", "a", "b", "c", "d", "f", "ungraded"].map((grade) => (
                <option key={grade} value={grade}>{grade === "all" ? "All grades" : grade.toUpperCase()}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => bulkMove("do_estimate")} disabled={selectedIds.length === 0 || !operatingActions?.bulkUpdateLeads} className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40">
              <SlidersHorizontal size={16} />
              Estimate
            </button>
            <button type="button" onClick={() => bulkMove("spam")} disabled={selectedIds.length === 0 || !operatingActions?.bulkUpdateLeads} className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40">
              Spam
            </button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[1220px] w-full border-collapse text-sm">
              <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-normal text-stone-500">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((row) => selectedSet.has(row.id))}
                      onChange={(event) => setSelectedIds(event.target.checked ? rows.map((row) => row.id) : [])}
                      aria-label="Select visible leads"
                    />
                  </th>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">Quality</th>
                  <th className="px-4 py-3 text-right">Spam</th>
                  <th className="px-4 py-3">SLA</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((row) => (
                  <tr key={row.id} className={cn("bg-white", selectedLead?.id === row.id && "bg-[#f0f5ef]", row.hidden && "bg-stone-50 text-stone-400")}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedSet.has(row.id)} onChange={() => toggleSelected(row.id)} aria-label={`Select ${row.title}`} />
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setSelectedLeadId(row.id)} className="text-left font-semibold text-stone-900 hover:text-[#224036]">{row.title}</button>
                      <div className="mt-1 text-xs text-stone-500">{row.customerName} - {row.city || "No city"} - {row.source}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {row.issueCount > 0 ? <Badge tone="warning">{row.issueCount} issue{row.issueCount === 1 ? "" : "s"}</Badge> : null}
                        {row.estimateReady ? <Badge tone="success">Estimate ready</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.ownerName}</td>
                    <td className="px-4 py-3">
                      <select className={cn(inputClass(), "h-9 min-w-36")} value={row.status} disabled={!operatingActions?.updateLead} onChange={(event) => operatingActions?.updateLead?.(row.id, { status: event.target.value })}>
                        {statusOptions.map((status) => (
                          <option key={status.id} value={status.status}>{status.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select className={cn(inputClass(), "h-9 min-w-28")} value={row.grade} disabled={!operatingActions?.updateLead} onChange={(event) => operatingActions?.updateLead?.(row.id, { grade: event.target.value })}>
                        {["a", "b", "c", "d", "f", "ungraded"].map((grade) => (
                          <option key={grade} value={grade}>{grade.toUpperCase()}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.programRequests.length > 0 ? row.programRequests.map((program) => <Badge key={program}>{categoryLabels[program]}</Badge>) : <span className="text-stone-400">None</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{currency(row.valueCents)}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone={row.qualityScore >= 85 ? "success" : row.qualityScore < 50 ? "danger" : "neutral"}>{row.qualityScore}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone={row.spamScore >= 35 ? "danger" : row.spamScore >= 15 ? "warning" : "success"}>{row.spamScore}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge tone={operatingTone(row.slaStatus)}>{formatStatus(row.slaStatus)}</Badge>
                        <span className="text-xs text-stone-500">Due {dateTime(row.slaDueAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{shortDate(row.receivedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <IconButton title="Inspect lead" onClick={() => setSelectedLeadId(row.id)}>
                          <FileText size={15} />
                        </IconButton>
                        <IconButton title="Convert lead" disabled={!operatingActions?.updateLead} onClick={() => operatingActions?.updateLead?.(row.id, { status: "converted" })}>
                          <Check size={15} />
                        </IconButton>
                        <IconButton title={row.hidden ? "Show lead" : "Hide lead"} disabled={!operatingActions?.updateLead} onClick={() => operatingActions?.updateLead?.(row.id, { hidden: !row.hidden })}>
                          {row.hidden ? <Plus size={15} /> : <X size={15} />}
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Lead Detail</h2>
                <div className="mt-1 text-sm text-stone-500">{selectedLead?.customerName ?? "No lead selected"}</div>
              </div>
              {selectedLead ? <Badge tone={operatingTone(selectedLead.slaStatus)}>{formatStatus(selectedLead.slaStatus)}</Badge> : null}
            </div>
            {selectedLead ? (
              <div className="mt-4 grid gap-4">
                <div className="rounded-md border border-stone-200 p-3">
                  <div className="font-semibold">{selectedLead.title}</div>
                  <div className="mt-1 text-sm text-stone-500">{selectedLead.propertySummary}</div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge>{selectedLead.territoryStatus}</Badge>
                    <Badge>{selectedLead.serviceFit}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Source win rate" value={percent(selectedLead.sourceCloseRate)} />
                  <Metric label="Source avg ticket" value={currency(selectedLead.sourceAverageTicketCents)} />
                  <Metric label="Quality" value={selectedLead.qualityScore} tone={selectedLead.qualityScore >= 85 ? "success" : "warning"} />
                  <Metric label="Spam" value={selectedLead.spamScore} tone={selectedLead.spamScore >= 35 ? "danger" : "success"} />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Estimate readiness</div>
                  <div className="mt-2 grid gap-2">
                    {selectedLead.estimateReadiness.map((check) => (
                      <div key={check.label} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-2 text-sm">
                        <div>
                          <div className="font-semibold">{check.label}</div>
                          <div className="text-xs text-stone-500">{check.detail}</div>
                        </div>
                        <Badge tone={check.status === "ready" ? "success" : check.status === "blocked" ? "danger" : "warning"}>{check.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Conversion actions</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {selectedLead.conversionOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        disabled={!operatingActions?.updateLead}
                        onClick={() => operatingActions?.updateLead?.(selectedLead.id, { status: option.targetStatus })}
                        className={cn("rounded-md px-3 py-2 text-sm font-semibold", option.primary ? "bg-[#224036] text-white" : "border border-stone-200 bg-white text-stone-700", !operatingActions?.updateLead && "cursor-not-allowed opacity-50")}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Duplicate and loss controls</div>
                  <div className="mt-2 grid gap-2">
                    {(selectedLead.duplicateWarnings.length > 0 ? selectedLead.duplicateWarnings : ["No duplicate warnings"]).map((warning, warningIndex) => (
                      <div key={`${warning}-${warningIndex}`} className="rounded-md border border-stone-200 p-2 text-sm text-stone-600">{warning}</div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedLead.reasonCodes.map((reason) => <Badge key={reason}>{reason}</Badge>)}
                  </div>
                </div>
                <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm font-semibold text-stone-700">{selectedLead.suggestedNextStep}</div>
              </div>
            ) : null}
          </Panel>
          <Panel>
            <h2 className="text-base font-bold">Saved Views</h2>
            <div className="mt-4 grid gap-2">
              {operatingDepth.leadOps.savedViews.map((view) => (
                <div key={view.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{view.name}</div>
                    <Badge>{view.scope}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-stone-500">{view.columns.length} columns</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <h2 className="text-base font-bold">Quality Queue</h2>
            <div className="mt-4 grid gap-2">
              {operatingDepth.leadOps.qualityIssues.length > 0 ? operatingDepth.leadOps.qualityIssues.slice(0, 6).map((issue) => (
                <div key={issue.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{formatStatus(issue.kind)}</div>
                    <Badge tone={operatingTone(issue.severity)}>{issue.severity}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-stone-500">{issue.summary}</div>
                </div>
              )) : <div className="rounded-md border border-stone-200 p-3 text-sm text-stone-500">No open data issues in this view.</div>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function CostingView({ workspace, operatingDepth, operatingActions }: { workspace: WorkspaceSnapshot; operatingDepth: OperatingDepth; operatingActions?: OperatingActions }) {
  const firstJobId = workspace.jobs[0]?.id ?? "";
  const [jobId, setJobId] = useState(firstJobId);
  const [roleName, setRoleName] = useState("Technician");
  const [hours, setHours] = useState("1.5");
  const [hourlyRate, setHourlyRate] = useState("27.50");
  const summaries = operatingDepth.jobCosting.summaries;
  const worstVariance = [...summaries].sort((a, b) => b.varianceCents - a.varianceCents)[0];
  const bestMargin = [...summaries].sort((a, b) => b.grossMarginPercent - a.grossMarginPercent)[0];
  const targetMarginPercent = 35;
  const marginGuardrails = summaries
    .map((summary) => {
      const actualCostCents = summary.actualLaborCostCents + summary.actualMaterialCostCents + summary.actualEquipmentCostCents + summary.overheadCostCents;
      const targetRevenueCents = Math.ceil(actualCostCents / (1 - targetMarginPercent / 100));
      const priceLiftCents = Math.max(0, targetRevenueCents - summary.actualRevenueCents);
      const reasons = [
        ...(summary.grossMarginPercent < targetMarginPercent ? [`Margin is ${percent(targetMarginPercent - summary.grossMarginPercent)} below target`] : []),
        ...(summary.varianceCents > 0 ? [`Actual cost over estimate by ${currency(summary.varianceCents)}`] : []),
        ...(summary.actualLaborCostCents > summary.actualMaterialCostCents + summary.actualEquipmentCostCents ? ["Labor-heavy cost profile"] : []),
        ...(summary.overheadCostCents > summary.grossProfitCents ? ["Overhead exceeds gross profit"] : []),
      ];
      const status = summary.grossMarginPercent < 20 || priceLiftCents > 50000 ? "blocked" : reasons.length > 0 ? "watch" : "on_track";
      return {
        ...summary,
        status,
        tone: status === "blocked" ? "danger" : status === "watch" ? "warning" : "success",
        actualCostCents,
        targetRevenueCents,
        priceLiftCents,
        reasons,
      };
    })
    .sort((a, b) => b.priceLiftCents - a.priceLiftCents || b.varianceCents - a.varianceCents);
  const guardrailByJobId = new Map(marginGuardrails.map((guardrail) => [guardrail.jobId, guardrail]));
  const atRiskGuardrails = marginGuardrails.filter((guardrail) => guardrail.status !== "on_track");
  const totalPriceLiftCents = atRiskGuardrails.reduce((sum, guardrail) => sum + guardrail.priceLiftCents, 0);

  function submitTimesheet(event: FormEvent) {
    event.preventDefault();
    if (!jobId) return;
    operatingActions?.addTimesheetEntry?.(jobId, roleName, Math.max(0, Number(hours || "0")), dollarsToCents(hourlyRate));
    setHours("1.5");
  }

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
              <Calculator size={16} />
              Job Costing
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">Estimated vs actual performance</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <TextButton variant="secondary" icon={<Calculator size={16} />} onClick={() => operatingActions?.recalculateJobCosts?.()}>
              Recalculate
            </TextButton>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Actual revenue" value={currency(operatingDepth.revenue.bookedRevenueCents)} />
          <Metric label="Gross profit" value={currency(operatingDepth.revenue.grossProfitCents)} tone={operatingDepth.revenue.grossProfitCents >= 0 ? "success" : "danger"} />
          <Metric label="Gross margin" value={percent(operatingDepth.revenue.grossMarginPercent)} />
          <Metric label="Worst variance" value={worstVariance ? currency(worstVariance.varianceCents) : "$0"} tone={worstVariance && worstVariance.varianceCents > 0 ? "warning" : "success"} />
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold">Margin Guardrails</h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-stone-500">Target margin, price lift, cost variance, and cost-profile warnings for jobs that are likely underpriced or drifting from estimate.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Target margin</div>
              <div className="mt-1 text-lg font-bold">{percent(targetMarginPercent)}</div>
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">At risk</div>
              <div className="mt-1 text-lg font-bold">{atRiskGuardrails.length}</div>
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Price lift needed</div>
              <div className="mt-1 text-lg font-bold">{currency(totalPriceLiftCents)}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {(atRiskGuardrails.length > 0 ? atRiskGuardrails.slice(0, 3) : marginGuardrails.slice(0, 3)).map((guardrail) => (
            <div key={guardrail.id} className={cn("rounded-md border p-3", guardrail.status === "blocked" ? "border-rose-200 bg-rose-50" : guardrail.status === "watch" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{guardrail.jobTitle}</div>
                  <div className="mt-1 truncate text-sm text-stone-500">{guardrail.customerName}</div>
                </div>
                <Badge tone={guardrail.tone}>{formatStatus(guardrail.status)}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Margin</div>
                  <div className="mt-1 font-bold">{percent(guardrail.grossMarginPercent)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Lift</div>
                  <div className="mt-1 font-bold">{currency(guardrail.priceLiftCents)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Target</div>
                  <div className="mt-1 font-bold">{currency(guardrail.targetRevenueCents)}</div>
                </div>
              </div>
              <div className="mt-3 grid gap-1 text-xs leading-5 text-stone-600">
                {(guardrail.reasons.length > 0 ? guardrail.reasons : ["Pricing is currently inside margin guardrail."]).map((reason) => (
                  <div key={reason} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Panel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full border-collapse text-sm">
              <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-normal text-stone-500">
                <tr>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Crew</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Labor</th>
                  <th className="px-4 py-3 text-right">Materials</th>
                  <th className="px-4 py-3 text-right">Equipment</th>
                  <th className="px-4 py-3 text-right">Overhead</th>
                  <th className="px-4 py-3 text-right">Profit</th>
                  <th className="px-4 py-3 text-right">Margin</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-right">Guardrail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {summaries.map((summary) => {
                  const guardrail = guardrailByJobId.get(summary.jobId);
                  return (
                    <tr key={summary.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{summary.jobTitle}</div>
                        <div className="mt-1 text-xs text-stone-500">{summary.customerName}</div>
                      </td>
                      <td className="px-4 py-3">{summary.crewName}</td>
                      <td className="px-4 py-3 text-right font-semibold">{currency(summary.actualRevenueCents)}</td>
                      <td className="px-4 py-3 text-right">{currency(summary.actualLaborCostCents)}</td>
                      <td className="px-4 py-3 text-right">{currency(summary.actualMaterialCostCents)}</td>
                      <td className="px-4 py-3 text-right">{currency(summary.actualEquipmentCostCents)}</td>
                      <td className="px-4 py-3 text-right">{currency(summary.overheadCostCents)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{currency(summary.grossProfitCents)}</td>
                      <td className="px-4 py-3 text-right"><Badge tone={summary.grossMarginPercent >= 35 ? "success" : summary.grossMarginPercent < 20 ? "danger" : "warning"}>{percent(summary.grossMarginPercent)}</Badge></td>
                      <td className="px-4 py-3 text-right"><Badge tone={summary.varianceCents > 0 ? "warning" : "success"}>{currency(summary.varianceCents)}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        {guardrail ? (
                          <div className="flex flex-col items-end gap-1">
                            <Badge tone={guardrail.tone}>{formatStatus(guardrail.status)}</Badge>
                            <span className="text-xs text-stone-500">{guardrail.priceLiftCents > 0 ? `${currency(guardrail.priceLiftCents)} lift` : "No lift"}</span>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel>
            <div className="flex items-center gap-2">
              <Briefcase size={18} className="text-[#224036]" />
              <h2 className="text-base font-bold">Labor Entry</h2>
            </div>
            <form onSubmit={submitTimesheet} className="mt-4 grid gap-3">
              <Field label="Job">
                <select className={inputClass()} value={jobId} onChange={(event) => setJobId(event.target.value)}>
                  {workspace.jobs.map((job) => (
                    <option key={job.id} value={job.id}>{job.title}</option>
                  ))}
                </select>
              </Field>
              <Field label="Role">
                <input className={inputClass()} value={roleName} onChange={(event) => setRoleName(event.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hours">
                  <input className={inputClass()} value={hours} onChange={(event) => setHours(event.target.value)} inputMode="decimal" />
                </Field>
                <Field label="Cost / hr">
                  <input className={inputClass()} value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} inputMode="decimal" />
                </Field>
              </div>
              <TextButton type="submit" icon={<Plus size={16} />} variant={operatingActions?.addTimesheetEntry ? "primary" : "secondary"}>
                Add Time
              </TextButton>
            </form>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">Timesheets</h2>
            <div className="mt-4 grid gap-2">
              {operatingDepth.jobCosting.timesheets.slice(0, 7).map((entry) => (
                <div key={entry.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{entry.roleName}</div>
                    <Badge tone={operatingTone(entry.status)}>{entry.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-stone-500">{entry.jobTitle} - {entry.hours}h - {currency(entry.totalCostCents)}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">Highlights</h2>
            <div className="mt-4 grid gap-2">
              <div className="rounded-md border border-stone-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Best margin</div>
                <div className="mt-1 font-semibold">{bestMargin?.jobTitle ?? "No jobs"}</div>
                <div className="text-sm text-stone-500">{bestMargin ? percent(bestMargin.grossMarginPercent) : "0%"}</div>
              </div>
              <div className="rounded-md border border-stone-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Purchase orders</div>
                <div className="mt-1 text-2xl font-bold">{operatingDepth.jobCosting.purchaseOrders.length}</div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ProfitView({ operatingDepth }: { operatingDepth: OperatingDepth }) {
  const directCosts = operatingDepth.revenue.laborCostCents + operatingDepth.revenue.materialCostCents + operatingDepth.revenue.equipmentCostCents + operatingDepth.revenue.overheadCostCents;
  const sortedJobs = [...operatingDepth.jobCosting.summaries].sort((a, b) => b.grossProfitCents - a.grossProfitCents);
  const analytics = operatingDepth.admin.ownerAnalytics;

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
              <TrendingUp size={16} />
              Revenue + Profit
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">Owner profitability dashboard</h2>
          </div>
          <Badge tone={operatingDepth.seeded ? "success" : "warning"}>{operatingDepth.seeded ? "live cost model" : "fallback model"}</Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Pipeline" value={currency(operatingDepth.revenue.pipelineCents)} />
          <Metric label="Booked" value={currency(operatingDepth.revenue.bookedRevenueCents)} />
          <Metric label="Invoiced" value={currency(operatingDepth.revenue.invoicedCents)} />
          <Metric label="Collected" value={currency(operatingDepth.revenue.collectedCents)} tone="success" />
          <Metric label="AR" value={currency(operatingDepth.revenue.arCents)} tone={operatingDepth.revenue.arCents > 0 ? "warning" : "success"} />
          <Metric label="Direct costs" value={currency(directCosts)} />
          <Metric label="Gross profit" value={currency(operatingDepth.revenue.grossProfitCents)} tone={operatingDepth.revenue.grossProfitCents >= 0 ? "success" : "danger"} />
          <Metric label="Margin" value={percent(operatingDepth.revenue.grossMarginPercent)} />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <Panel>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[#224036]" />
            <h2 className="text-base font-bold">Owner Unit Economics</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Metric label="Retention" value={percent(analytics.kpis.retentionRatePercent)} tone="success" />
            <Metric label="Churn Risk" value={percent(analytics.kpis.churnRatePercent)} tone={analytics.kpis.churnRatePercent >= 20 ? "danger" : "warning"} />
            <Metric label="Avg LTV" value={currency(analytics.kpis.averageLtvCents)} />
            <Metric label="CAC" value={currency(analytics.kpis.cacCents)} />
            <Metric label="LTV:CAC" value={`${analytics.kpis.ltvToCac}x`} tone={analytics.kpis.ltvToCac >= 3 ? "success" : "warning"} />
            <Metric label="NRR" value={percent(analytics.kpis.netRevenueRetentionPercent)} tone={analytics.kpis.netRevenueRetentionPercent >= 100 ? "success" : "warning"} />
            <Metric label="Avg Margin" value={percent(analytics.kpis.avgGrossMarginPercent)} />
            <Metric label="Break-even Rev." value={currency(analytics.kpis.breakEvenRevenueCents)} />
          </div>
        </Panel>

        <Panel>
          <OwnerTrendChart data={analytics.trend} />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <HorizontalBarChart
          title="Churn Analysis"
          subtitle="At-risk customers by segment, with LTV exposure."
          tone="rose"
          rows={analytics.churn.map((row) => ({
            label: row.segment,
            value: row.churnRatePercent,
            detail: `${row.atRisk}/${row.customers} at risk - ${currency(row.ltvAtRiskCents)} LTV exposed`,
          }))}
          valueFormatter={(value) => percent(value)}
        />
        <HorizontalBarChart
          title="LTV by Segment"
          subtitle="Estimated customer lifetime value by customer segment."
          rows={analytics.ltv.map((row) => ({
            label: row.segment,
            value: row.averageLtvCents,
            detail: `${currency(row.averageGrossProfitCents)} avg gross profit - ${row.paybackMonths} mo payback`,
          }))}
          valueFormatter={(value) => currency(value)}
        />
        <HorizontalBarChart
          title="Cost Breakdown"
          subtitle="Direct and operating costs as a share of service revenue."
          tone="amber"
          rows={analytics.costBreakdown.slice(0, 8).map((row) => ({
            label: row.label,
            value: row.valueCents,
            detail: `${percent(row.percent)} of revenue`,
          }))}
          valueFormatter={(value) => currency(value)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Panel>
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-[#224036]" />
            <h2 className="text-base font-bold">P&L Snapshot</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {analytics.pnl.map(({ label, valueCents, kind }) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3">
                <span className="font-medium">{label}</span>
                <span className={cn("font-bold", kind === "cost" && "text-rose-700", kind === "profit" && valueCents >= 0 && "text-emerald-700")}>{currency(valueCents)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel className="overflow-hidden p-0">
            <div className="border-b border-stone-200 p-4">
              <h2 className="text-base font-bold">Profitability Drilldown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[780px] w-full border-collapse text-sm">
                <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-normal text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Job</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Profit</th>
                    <th className="px-4 py-3 text-right">Margin</th>
                    <th className="px-4 py-3 text-right">Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sortedJobs.map((summary) => (
                    <tr key={summary.id}>
                      <td className="px-4 py-3 font-semibold">{summary.jobTitle}</td>
                      <td className="px-4 py-3 text-stone-500">{summary.customerName}</td>
                      <td className="px-4 py-3 text-right">{currency(summary.actualRevenueCents)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{currency(summary.grossProfitCents)}</td>
                      <td className="px-4 py-3 text-right"><Badge tone={summary.grossMarginPercent >= 35 ? "success" : summary.grossMarginPercent < 20 ? "danger" : "warning"}>{percent(summary.grossMarginPercent)}</Badge></td>
                      <td className="px-4 py-3 text-right">{currency(summary.collectedCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <h2 className="text-base font-bold">Invoices</h2>
              <div className="mt-4 grid gap-2">
                {operatingDepth.revenue.invoices.map((invoice) => (
                  <div key={invoice.id} className="rounded-md border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{invoice.invoiceNumber}</div>
                      <Badge tone={operatingTone(invoice.status)}>{formatStatus(invoice.status)}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-stone-500">{invoice.customerName} - {currency(invoice.balanceCents)} open</div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel>
              <h2 className="text-base font-bold">Payments</h2>
              <div className="mt-4 grid gap-2">
                {operatingDepth.revenue.payments.map((payment) => (
                  <div key={payment.id} className="rounded-md border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{currency(payment.amountCents)}</div>
                      <Badge tone={operatingTone(payment.status)}>{payment.method}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-stone-500">{payment.customerName} - {shortDate(payment.receivedAt)}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function CostIntelligenceView({ operatingDepth, operatingActions }: { operatingDepth: OperatingDepth; operatingActions?: OperatingActions }) {
  const [laborRole, setLaborRole] = useState("Technician");
  const [laborCost, setLaborCost] = useState("29.00");
  const [laborBillable, setLaborBillable] = useState("68.00");
  const [vendorName, setVendorName] = useState("Local supplier");
  const [itemName, setItemName] = useState("19-0-6 fertilizer");
  const [itemCategory, setItemCategory] = useState<ServiceCategory>("lawn_care");
  const [itemUnit, setItemUnit] = useState("bag");
  const [itemCost, setItemCost] = useState("44.00");

  function submitLabor(event: FormEvent) {
    event.preventDefault();
    operatingActions?.upsertLaborRate?.({ roleName: laborRole, hourlyCostCents: dollarsToCents(laborCost), billableRateCents: dollarsToCents(laborBillable) });
  }

  function submitVendor(event: FormEvent) {
    event.preventDefault();
    operatingActions?.upsertVendorCatalogItem?.({ vendorName, itemName, category: itemCategory, unit: itemUnit, unitCostCents: dollarsToCents(itemCost) });
  }

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
              <CloudSun size={16} />
              Cost Intelligence
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">Weather, labor, material, and overhead signals</h2>
          </div>
          <TextButton variant="secondary" icon={<Database size={16} />} onClick={() => operatingActions?.refreshCostIntelligence?.()}>
            Refresh
          </TextButton>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Labor rates" value={operatingDepth.costIntelligence.laborRates.length} />
          <Metric label="Equipment rates" value={operatingDepth.costIntelligence.equipmentRates.length} />
          <Metric label="Vendor items" value={operatingDepth.costIntelligence.vendorCatalogs.length} />
          <Metric label="Weather snapshots" value={operatingDepth.costIntelligence.weatherSnapshots.length} />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <Panel>
            <div className="flex items-center gap-2">
              <Package size={18} className="text-[#224036]" />
              <h2 className="text-base font-bold">Cost Snapshots</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {operatingDepth.costIntelligence.costSnapshots.map((snapshot) => (
                <div key={snapshot.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{snapshot.label}</div>
                      <div className="mt-1 text-sm text-stone-500">{snapshot.region ?? "Global"} - {snapshot.unit}</div>
                    </div>
                    <Badge>{snapshot.source}</Badge>
                  </div>
                  <div className="mt-3 text-2xl font-bold">{snapshot.value}</div>
                  <div className="mt-1 text-xs text-stone-500">{dateTime(snapshot.capturedAt)}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">Weather Risk</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {operatingDepth.costIntelligence.weatherSnapshots.map((snapshot) => (
                <div key={snapshot.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{snapshot.propertyName}</div>
                      <div className="mt-1 text-sm text-stone-500">{snapshot.conditions}</div>
                    </div>
                    <Badge tone={operatingTone(snapshot.applicationRisk)}>{snapshot.applicationRisk}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-md bg-stone-50 p-2"><div className="font-bold">{snapshot.temperatureF ?? "-"}F</div><div className="text-xs text-stone-500">Temp</div></div>
                    <div className="rounded-md bg-stone-50 p-2"><div className="font-bold">{snapshot.windMph ?? "-"} mph</div><div className="text-xs text-stone-500">Wind</div></div>
                    <div className="rounded-md bg-stone-50 p-2"><div className="font-bold">{snapshot.precipitationProbability ?? "-"}%</div><div className="text-xs text-stone-500">Rain</div></div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <h2 className="text-base font-bold">Labor Rate Cards</h2>
              <div className="mt-4 grid gap-2">
                {operatingDepth.costIntelligence.laborRates.map((rate) => (
                  <div key={rate.id} className="rounded-md border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{rate.roleName}</div>
                      <Badge>{rate.source}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-stone-500">{currency(rate.hourlyCostCents)} cost / {rate.billableRateCents ? `${currency(rate.billableRateCents)} billable` : "no billable rate"}</div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel>
              <h2 className="text-base font-bold">Equipment Rate Cards</h2>
              <div className="mt-4 grid gap-2">
                {operatingDepth.costIntelligence.equipmentRates.map((rate) => (
                  <div key={rate.id} className="rounded-md border border-stone-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{rate.name}</div>
                      <Badge>{rate.category}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-stone-500">{currency(rate.hourlyCostCents)} cost / {rate.billableRateCents ? `${currency(rate.billableRateCents)} billable` : "no billable rate"}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <div className="grid gap-4">
          <Panel>
            <h2 className="text-base font-bold">Labor Override</h2>
            <form onSubmit={submitLabor} className="mt-4 grid gap-3">
              <Field label="Role"><input className={inputClass()} value={laborRole} onChange={(event) => setLaborRole(event.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost / hr"><input className={inputClass()} value={laborCost} onChange={(event) => setLaborCost(event.target.value)} inputMode="decimal" /></Field>
                <Field label="Bill / hr"><input className={inputClass()} value={laborBillable} onChange={(event) => setLaborBillable(event.target.value)} inputMode="decimal" /></Field>
              </div>
              <TextButton type="submit" icon={<Plus size={16} />} variant={operatingActions?.upsertLaborRate ? "primary" : "secondary"}>Save Rate</TextButton>
            </form>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">Vendor Item</h2>
            <form onSubmit={submitVendor} className="mt-4 grid gap-3">
              <Field label="Vendor"><input className={inputClass()} value={vendorName} onChange={(event) => setVendorName(event.target.value)} /></Field>
              <Field label="Item"><input className={inputClass()} value={itemName} onChange={(event) => setItemName(event.target.value)} /></Field>
              <Field label="Category">
                <select className={inputClass()} value={itemCategory} onChange={(event) => setItemCategory(event.target.value as ServiceCategory)}>
                  {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit"><input className={inputClass()} value={itemUnit} onChange={(event) => setItemUnit(event.target.value)} /></Field>
                <Field label="Cost"><input className={inputClass()} value={itemCost} onChange={(event) => setItemCost(event.target.value)} inputMode="decimal" /></Field>
              </div>
              <TextButton type="submit" icon={<Plus size={16} />} variant={operatingActions?.upsertVendorCatalogItem ? "primary" : "secondary"}>Save Item</TextButton>
            </form>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">Vendor Catalog</h2>
            <div className="mt-4 grid gap-2">
              {operatingDepth.costIntelligence.vendorCatalogs.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{item.itemName}</div>
                    <Badge>{item.source}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-stone-500">{item.vendorName} - {currency(item.unitCostCents)} / {item.unit}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function AdminView({
  workspace,
  operatingDepth,
  operatingActions,
  crewName,
  setCrewName,
  createCrew,
  toggleService,
}: {
  workspace: WorkspaceSnapshot;
  operatingDepth: OperatingDepth;
  operatingActions?: OperatingActions;
  membersById: Map<string, WorkspaceSnapshot["members"][number]>;
  crewName: string;
  setCrewName: (value: string) => void;
  createCrew: (event: FormEvent) => void;
  toggleService: (itemId: string) => void;
}) {
  const roleOptions: Role[] = ["owner", "admin", "manager", "sales", "dispatcher", "crew_lead", "technician"];
  const analytics = operatingDepth.admin.ownerAnalytics;
  const tagGroups = operatingDepth.admin.tagTaxonomy.reduce<Record<string, typeof operatingDepth.admin.tagTaxonomy>>((groups, tag) => {
    groups[tag.category] = [...(groups[tag.category] ?? []), tag];
    return groups;
  }, {});

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
              <ShieldCheck size={16} />
              Admin Controls
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">Tenant settings, permissions, crews, and catalog</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Members" value={operatingDepth.admin.members.length} />
            <Metric label="Flags" value={operatingDepth.admin.featureFlags.length} />
            <Metric label="Crews" value={workspace.crews.length} />
            <Metric label="Catalog" value={workspace.serviceCatalog.length} />
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
                <BarChart3 size={16} />
                Admin Analytics
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-normal">Owner chart pack for churn, LTV, P&L, and costs</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-md bg-stone-50 p-3">
                <div className="text-xs font-semibold uppercase text-stone-500">Retention</div>
                <div className="mt-1 text-xl font-bold">{percent(analytics.kpis.retentionRatePercent)}</div>
              </div>
              <div className="rounded-md bg-stone-50 p-3">
                <div className="text-xs font-semibold uppercase text-stone-500">Churn risk</div>
                <div className="mt-1 text-xl font-bold">{percent(analytics.kpis.churnRatePercent)}</div>
              </div>
              <div className="rounded-md bg-stone-50 p-3">
                <div className="text-xs font-semibold uppercase text-stone-500">Avg LTV</div>
                <div className="mt-1 text-xl font-bold">{currency(analytics.kpis.averageLtvCents)}</div>
              </div>
              <div className="rounded-md bg-stone-50 p-3">
                <div className="text-xs font-semibold uppercase text-stone-500">LTV:CAC</div>
                <div className="mt-1 text-xl font-bold">{analytics.kpis.ltvToCac}x</div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <OwnerTrendChart data={analytics.trend} />
          </div>
        </Panel>

        <Panel>
          <h2 className="text-base font-bold">Tag Taxonomy</h2>
          <p className="mt-1 text-sm leading-6 text-stone-500">Governed tags power customer segments, risk cohorts, profitability filters, and reporting exports.</p>
          <div className="mt-4 grid gap-3">
            {Object.entries(tagGroups).map(([category, tags]) => (
              <div key={category} className="rounded-md border border-stone-200 p-3">
                <div className="mb-2 text-xs font-semibold uppercase text-stone-500">{formatStatus(category)}</div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag.id} className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-2 py-1 text-xs font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: tag.color }} />
                      {tag.label}
                      <span className="text-stone-400">{tag.usageCount}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <HorizontalBarChart
          title="Churn Analysis"
          subtitle="Segment-level risk and exposed LTV."
          tone="rose"
          rows={analytics.churn.map((row) => ({ label: row.segment, value: row.churnRatePercent, detail: `${row.atRisk}/${row.customers} accounts - ${row.drivers.join(", ")}` }))}
          valueFormatter={(value) => percent(value)}
        />
        <HorizontalBarChart
          title="LTV by Segment"
          subtitle="Average LTV and payback by customer segment."
          rows={analytics.ltv.map((row) => ({ label: row.segment, value: row.averageLtvCents, detail: `${row.paybackMonths} mo payback` }))}
          valueFormatter={(value) => currency(value)}
        />
        <Panel>
          <h2 className="text-base font-bold">Customer Segments</h2>
          <div className="mt-4 grid gap-3">
            {operatingDepth.admin.segmentCards.map((segment) => (
              <div key={segment.label} className="rounded-md border border-stone-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{segment.label}</div>
                  <Badge tone={segment.churnRiskPercent >= 30 ? "danger" : segment.churnRiskPercent > 0 ? "warning" : "success"}>{percent(segment.churnRiskPercent)} risk</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div><div className="font-bold">{segment.customerCount}</div><div className="text-xs text-stone-500">Customers</div></div>
                  <div><div className="font-bold">{currency(segment.revenueCents)}</div><div className="text-xs text-stone-500">Revenue</div></div>
                  <div><div className="font-bold">{currency(segment.grossProfitCents)}</div><div className="text-xs text-stone-500">Profit</div></div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4">
          <Panel>
            <div className="flex items-center gap-2">
              <UsersRound size={18} className="text-[#224036]" />
              <h2 className="text-base font-bold">Members + Roles</h2>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {operatingDepth.admin.members.map((member) => (
                <div key={member.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{member.name}</div>
                      <div className="mt-1 text-sm text-stone-500">{member.email}</div>
                    </div>
                    <Badge tone={operatingTone(member.status)}>{member.status}</Badge>
                  </div>
                  <div className="mt-3">
                    <select className={inputClass()} value={member.role} disabled={!operatingActions?.updateMemberRole} onChange={(event) => operatingActions?.updateMemberRole?.(member.id, event.target.value as Role)}>
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>{roleLabel(role)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-[#224036]" />
              <h2 className="text-base font-bold">Permission Matrix</h2>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[760px] w-full border-collapse text-sm">
                <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-normal text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Permission</th>
                    {roleOptions.map((role) => (
                      <th key={role} className="px-4 py-3 text-center">{roleLabel(role)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {operatingDepth.admin.permissionMatrix.map((permission) => (
                    <tr key={permission.permission}>
                      <td className="px-4 py-3 font-semibold">{permission.permission}</td>
                      {roleOptions.map((role) => (
                        <td key={role} className="px-4 py-3 text-center">
                          <span className={cn("inline-grid h-7 w-7 place-items-center rounded-md border", permission.roles.includes(role) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-50 text-stone-300")}>
                            <Check size={15} />
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <h2 className="text-base font-bold">Crews</h2>
              <form onSubmit={createCrew} className="mt-4 flex gap-2">
                <input className={cn(inputClass(), "min-w-0 flex-1")} value={crewName} onChange={(event) => setCrewName(event.target.value)} placeholder="Crew name" />
                <TextButton type="submit" icon={<Plus size={16} />}>Add</TextButton>
              </form>
              <div className="mt-4 grid gap-2">
                {workspace.crews.map((crew) => (
                  <div key={crew.id} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: crew.color }} />
                      <span className="font-semibold">{crew.name}</span>
                    </div>
                    <Badge tone={crew.active ? "success" : "neutral"}>{crew.active ? "active" : "inactive"}</Badge>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <h2 className="text-base font-bold">Service Catalog</h2>
              <div className="mt-4 grid gap-2">
                {workspace.serviceCatalog.map((item) => (
                  <div key={item.id} className="rounded-md border border-stone-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="mt-1 text-sm text-stone-500">{categoryLabels[item.category]} - {currency(item.defaultPriceCents)} / {item.defaultUnit}</div>
                      </div>
                      <button type="button" onClick={() => toggleService(item.id)} className={cn("h-6 w-11 rounded-full p-0.5 transition", item.active ? "bg-[#224036]" : "bg-stone-300")} aria-label="Toggle service">
                        <span className={cn("block h-5 w-5 rounded-full bg-white transition", item.active && "translate-x-5")} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <div className="grid gap-4">
          <Panel>
            <h2 className="text-base font-bold">Feature Flags</h2>
            <div className="mt-4 grid gap-2">
              {operatingDepth.admin.featureFlags.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3">
                  <span className="font-semibold">{formatStatus(flag.key)}</span>
                  <Badge tone={flag.enabled ? "success" : "neutral"}>{flag.enabled ? "enabled" : "off"}</Badge>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">Audit Log</h2>
            <div className="mt-4 grid gap-2">
              {operatingDepth.admin.auditEvents.map((event) => (
                <div key={event.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{event.action}</div>
                    <Badge>{event.entityType}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-stone-500">{event.summary}</div>
                  <div className="mt-2 text-xs text-stone-400">{dateTime(event.createdAt)}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ClientOnboardingView({
  form,
  setForm,
  provisionedClients,
  createClientWorkspace,
  authConfigured,
  operatingDepth,
}: {
  form: ClientOnboardingFormState;
  setForm: (value: ClientOnboardingFormState) => void;
  provisionedClients: ProvisionedClientWorkspace[];
  createClientWorkspace: (event: FormEvent) => void;
  authConfigured: boolean;
  operatingDepth: OperatingDepth;
}) {
  function toggleService(service: ServiceCategory) {
    setForm({
      ...form,
      services: form.services.includes(service) ? form.services.filter((item) => item !== service) : [...form.services, service],
    });
  }

  const steps = [
    ["Sign up", "Owner creates an account and chooses the company workspace."],
    ["Provision tenant", "Convex creates organization, owner membership, subscription shell, flags, audit trail, statuses, and defaults."],
    ["Configure ops", "Admin sets territories, services, crews, rates, materials, lead intake, and saved views."],
    ["Import data", "CSV or connector imports customers, properties, leads, notes, and historical jobs into quality queues."],
    ["Launch", "Team receives invites and starts lead-to-job, dispatch, field, costing, and profit workflows."],
  ];

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
              <Briefcase size={16} />
              Client Onboarding
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">Provision a new landscaping or pest-control SaaS tenant</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              This is the customer sign-up path for companies using the software. The production backend now seeds the same objects this preview shows.
            </p>
          </div>
          <Badge tone={authConfigured ? "success" : "warning"}>{authConfigured ? "Clerk ready" : "Demo preview"}</Badge>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <h2 className="text-base font-bold">New Client Setup</h2>
          <form onSubmit={createClientWorkspace} className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Company">
                <input className={inputClass()} value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} required />
              </Field>
              <Field label="Owner name">
                <input className={inputClass()} value={form.ownerName} onChange={(event) => setForm({ ...form, ownerName: event.target.value })} />
              </Field>
              <Field label="Owner email">
                <input className={inputClass()} value={form.ownerEmail} onChange={(event) => setForm({ ...form, ownerEmail: event.target.value })} type="email" />
              </Field>
              <Field label="Industry">
                <select className={inputClass()} value={form.industryFocus} onChange={(event) => setForm({ ...form, industryFocus: event.target.value as IndustryFocus })}>
                  <option value="both">Landscape + pest</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="pest_control">Pest control</option>
                </select>
              </Field>
              <Field label="Plan">
                <select className={inputClass()} value={form.billingPlan} onChange={(event) => setForm({ ...form, billingPlan: event.target.value as BillingPlan })}>
                  <option value="free">{billingPlanLabels.free}</option>
                  <option value="pro">{billingPlanLabels.pro}</option>
                </select>
              </Field>
              <Field label="Seats">
                <input className={inputClass()} value={form.seats} onChange={(event) => setForm({ ...form, seats: event.target.value })} inputMode="numeric" />
              </Field>
              <Field label="Timezone">
                <input className={inputClass()} value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
              </Field>
              <Field label="Import source">
                <select className={inputClass()} value={form.importSource} onChange={(event) => setForm({ ...form, importSource: event.target.value })}>
                  <option>CSV lead/customer import</option>
                  <option>Google Sheets import</option>
                  <option>Manual setup</option>
                  <option>Legacy CRM export</option>
                </select>
              </Field>
            </div>

            <Field label="Service territory">
              <input className={inputClass()} value={form.serviceTerritory} onChange={(event) => setForm({ ...form, serviceTerritory: event.target.value })} />
            </Field>

            <div>
              <div className="text-sm font-semibold text-stone-700">Enabled service lines</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 rounded-md border border-stone-200 bg-white p-3 text-sm font-semibold">
                    <input type="checkbox" checked={form.services.includes(value as ServiceCategory)} onChange={() => toggleService(value as ServiceCategory)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <TextButton type="submit" icon={<Plus size={16} />}>
              Create Client Workspace
            </TextButton>
          </form>
        </Panel>

        <div className="grid gap-4">
          <Panel>
            <h2 className="text-base font-bold">Provisioning Flow</h2>
            <div className="mt-4 grid gap-3">
              {steps.map(([title, body], index) => (
                <div key={title} className="grid grid-cols-[36px_1fr] gap-3 rounded-md border border-stone-200 p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-[#e8efe8] text-sm font-bold text-[#224036]">{index + 1}</div>
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="mt-1 text-sm leading-5 text-stone-500">{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">What Gets Created</h2>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {[
                "organizations",
                "memberships",
                "subscriptions",
                "serviceCatalogItems",
                "crews",
                "leadStatusSettings",
                "leadSavedViews",
                "leadIntakeForms",
                "featureFlags",
                "onboardingChecklistItems",
                "externalIntegrations",
                "auditEvents",
              ].map((item) => (
                <div key={item} className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold">{item}</div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">Import QA Preview</h2>
              <Badge tone={operatingDepth.fieldOps.importQaRows.some((row) => row.status === "blocked") ? "warning" : "success"}>{operatingDepth.fieldOps.importQaRows.length} rows</Badge>
            </div>
            <div className="mt-4 grid gap-2">
              {operatingDepth.fieldOps.importQaRows.map((row) => (
                <div key={row.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{row.rowLabel}</div>
                      <div className="mt-1 text-sm text-stone-500">{row.source} - maps to {row.mappedEntity}</div>
                    </div>
                    <Badge tone={row.status === "ready" ? "success" : row.status === "blocked" ? "danger" : "warning"}>{formatStatus(row.status)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {row.issues.length > 0 ? row.issues.map((issue) => <Badge key={issue} tone="warning">{issue}</Badge>) : <Badge tone="success">No issues</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">Provisioned Client Workspaces</h2>
          <Badge>{provisionedClients.length}</Badge>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {provisionedClients.length > 0 ? (
            provisionedClients.map((client) => (
              <div key={client.id} className="rounded-md border border-stone-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{client.name}</div>
                    <div className="mt-1 text-sm text-stone-500">/{client.slug} - {client.ownerEmail}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{billingPlanLabels[client.billingPlan]}</Badge>
                    <Badge>{client.seats} seats</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {client.checklist.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-stone-600">
                      <Check size={15} className="text-emerald-700" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-stone-300 p-4 text-sm text-stone-500">
              Create a client workspace above to preview the tenant provisioning record.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function SpecsView({ backendState, workspace }: { backendState: BackendState; workspace: WorkspaceSnapshot }) {
  const blueprint = backendState.blueprint ?? fallbackBackendBlueprint;
  const tableCount = blueprint.tableGroups.reduce((sum, group) => sum + group.tables.length, 0);
  const liveCounts = [
    { label: "Customers", value: workspace.customers.length },
    { label: "Leads", value: workspace.leads.length },
    { label: "Opportunities", value: workspace.opportunities.length },
    { label: "Jobs", value: workspace.jobs.length },
    { label: "Visits", value: workspace.visits.length },
    { label: "Tasks", value: workspace.tasks.length },
  ];

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
              <Database size={16} />
              {backendState.label}
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">{blueprint.productName}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-stone-600">{backendState.detail}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Badge tone={backendState.mode === "convex-live" ? "success" : "warning"}>{backendState.mode}</Badge>
            <Badge>{blueprint.deploymentTarget}</Badge>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Layers size={18} />, label: "Modeled tables", value: tableCount },
            { icon: <ListChecks size={18} />, label: "Backend modules", value: blueprint.modules.length },
            { icon: <Gauge size={18} />, label: "Parity items", value: blueprint.netlifyParity.length },
            { icon: <ShieldCheck size={18} />, label: "Readiness checks", value: blueprint.readiness.length },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-[#224036]">{item.icon}</div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">{item.label}</div>
                <div className="text-xl font-bold">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">Production Modules</h2>
            <Badge>{blueprint.modules.length}</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {blueprint.modules.map((module) => (
              <div key={module.name} className="rounded-md border border-stone-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold">{module.name}</div>
                  <Badge tone={module.status.includes("implemented") || module.status.includes("done") ? "success" : "warning"}>{module.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {module.details.map((detail) => (
                    <div key={detail} className="flex gap-2 text-sm leading-5 text-stone-600">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#224036]" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel>
            <h2 className="text-base font-bold">Live Workspace Counts</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {liveCounts.map((item) => (
                <div key={item.label} className="rounded-md border border-stone-200 p-3">
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">{item.label}</div>
                  <div className="mt-1 text-2xl font-bold">{item.value}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">Readiness Board</h2>
            <div className="mt-4 grid gap-2">
              {blueprint.readiness.map((item) => (
                <div key={item.item} className="grid gap-2 rounded-md border border-stone-200 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="font-semibold">{item.item}</div>
                    <div className="text-xs text-stone-500">{item.owner}</div>
                  </div>
                  <Badge tone={item.status.includes("done") ? "success" : item.status === "deferred" ? "neutral" : "warning"}>{item.status}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <h2 className="text-base font-bold">Data Model Groups</h2>
          <div className="mt-4 grid gap-3">
            {blueprint.tableGroups.map((group) => (
              <div key={group.group} className="rounded-md border border-stone-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{group.group}</div>
                  <Badge>{group.tables.length} tables</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.tables.map((table) => (
                    <span key={table} className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-medium text-stone-600">
                      {table}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel>
            <h2 className="text-base font-bold">Netlify Dashboard Parity</h2>
            <div className="mt-4 grid gap-2">
              {blueprint.netlifyParity.map((item) => (
                <div key={item} className="flex gap-2 rounded-md border border-stone-200 p-3 text-sm leading-5 text-stone-600">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">External Interfaces</h2>
            <div className="mt-4 grid gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Public in v1</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {blueprint.publicV1Interfaces.map((item) => (
                    <Badge key={item} tone="success">{item}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Deferred</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {blueprint.deferredInterfaces.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
