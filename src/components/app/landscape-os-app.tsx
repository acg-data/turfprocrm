"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  AlertTriangle,
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  Send,
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
import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  customerJourneyCategories,
  customerJourneyCoverageLabels,
  customerJourneyCoverageTone,
  customerJourneys,
  journeyCoverageSummary,
} from "@/data/customer-journeys";
import { demoWorkspace, getDemoWorkspaceForPersona } from "@/data/demo-workspace";
import { demoPersonaOptions, getDemoPersonaOption, type DemoPersona } from "@/data/demo-personas";
import {
  specsJourneyWorkflows,
  type JourneyWorkflowItem,
} from "@/data/journey-workflows";
import { primeTimeBacklog, primeTimeGroups, type PrimeTimeStatus } from "@/data/prime-time-roadmap";
import { parseLeadImportCsv } from "@/domain/imports";
import { activeFertilizationPricingAdjustments, buildFertilizationMarginScenarios, calculateFertilizationProgramPricing, type FertilizationMarginScenarioKey } from "@/domain/fertilization-pricing";
import { leadQualityThresholds, scoreLeadQuality } from "@/domain/lead-scoring";
import type { JobVisit, Opportunity, WorkspaceSnapshot } from "@/domain/types";
import {
  canAdvanceOpportunity,
  fieldIssueCategories,
  fieldIssueCategoryLabel,
  fieldIssueSeverities,
  nextOpportunityStage,
  opportunityStageLabel,
  opportunityStages,
  previousOpportunityStage,
  roleLabel,
  statusTone,
  visitStatusLabel,
  type FieldIssueCategory,
  type FieldIssueSeverity,
  type Role,
  type ServiceCategory,
} from "@/domain/workflow";
import { cn, currency, googleMapsUrl, shortDate, timeRange } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type View = "dashboard" | "prime_time" | "journeys" | "lead_ops" | "crm" | "pipeline" | "calendar" | "dispatch" | "routing" | "jobs" | "job_analysis" | "job_pricer" | "chemicals" | "field" | "costing" | "profit" | "churn_ltv" | "cost_intel" | "admin" | "onboarding" | "specs";

type NavigationItem = { id: View; label: string; icon: ReactNode };

const navGroups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> }],
  },
  {
    label: "Sales",
    items: [
      { id: "lead_ops", label: "Leads", icon: <Filter size={18} /> },
      { id: "crm", label: "Customers", icon: <UsersRound size={18} /> },
      { id: "pipeline", label: "Pipeline", icon: <Gauge size={18} /> },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "calendar", label: "Calendar", icon: <CalendarDays size={18} /> },
      { id: "dispatch", label: "Dispatch", icon: <CalendarDays size={18} /> },
      { id: "routing", label: "Routes", icon: <Route size={18} /> },
      { id: "jobs", label: "Jobs", icon: <ClipboardList size={18} /> },
      { id: "field", label: "Field", icon: <Route size={18} /> },
      { id: "chemicals", label: "Chemical tracking", icon: <Package size={18} /> },
    ],
  },
  {
    label: "Insights",
    items: [
      { id: "job_analysis", label: "Job performance", icon: <BarChart3 size={18} /> },
      { id: "job_pricer", label: "Pricing", icon: <Calculator size={18} /> },
      { id: "costing", label: "Job costing", icon: <Calculator size={18} /> },
      { id: "profit", label: "Financials", icon: <BarChart3 size={18} /> },
      { id: "churn_ltv", label: "Retention", icon: <TrendingUp size={18} /> },
      { id: "cost_intel", label: "Market costs", icon: <CloudSun size={18} /> },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "admin", label: "Settings", icon: <Settings size={18} /> },
      { id: "onboarding", label: "Company setup", icon: <Briefcase size={18} /> },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);

const viewDescriptions: Partial<Record<View, string>> = {
  dashboard: "The work, money, and follow-ups that need attention today.",
  lead_ops: "Qualify, assign, and follow up with every incoming lead.",
  crm: "Customers, contacts, properties, notes, and service history.",
  pipeline: "Move opportunities from first conversation to approved work.",
  calendar: "See the day clearly and open any scheduled visit.",
  dispatch: "Balance crews, timing, route order, and workload conflicts.",
  routing: "Plan efficient service routes and open stops in the field view.",
  jobs: "Run active work from approved scope through completion.",
  field: "Complete visits, checklists, notes, photos, and issue flags.",
  chemicals: "Record products, rates, applications, weather, and compliance.",
  job_analysis: "Compare estimated and actual performance across jobs.",
  job_pricer: "Build profitable prices from labor, materials, equipment, and overhead.",
  costing: "Track estimated versus actual cost and margin.",
  profit: "Monitor revenue, collections, margin, and operating performance.",
  churn_ltv: "Understand retention, churn, tenure, and customer lifetime value.",
  cost_intel: "Keep labor, materials, weather, and market assumptions current.",
  admin: "Manage people, permissions, services, rates, and company controls.",
  onboarding: "Configure a workspace and prepare data for launch.",
};

const categoryLabels: Record<ServiceCategory, string> = {
  lawn_care: "Lawn care",
  landscaping: "Landscaping",
  pest_control: "Pest control",
  tree_shrub: "Tree & shrub",
  irrigation: "Irrigation",
  snow: "Snow",
  maintenance: "Maintenance",
};

const fieldIssuePresets: Array<{ label: string; category: FieldIssueCategory; severity: FieldIssueSeverity; details: string; customerVisible?: boolean; serviceCategory?: ServiceCategory; estimatedValueCents?: number }> = [
  { label: "Property damage", category: "damage", severity: "urgent", details: "Document damage, photos, affected area, and customer impact.", customerVisible: true },
  { label: "Pest activity", category: "pest_activity", severity: "high", details: "Record pest type, location, pressure level, and treatment recommendation.", serviceCategory: "pest_control" },
  { label: "Customer concern", category: "customer_concern", severity: "high", details: "Capture customer concern and required manager callback.", customerVisible: true },
  { label: "Access issue", category: "access_issue", severity: "normal", details: "Gate, lock, pet, vehicle, or site access blocked production." },
  { label: "Upsell opportunity", category: "upsell_opportunity", severity: "normal", details: "Customer or technician identified additional billable work.", serviceCategory: "maintenance", estimatedValueCents: 45000 },
  { label: "Safety hazard", category: "safety_hazard", severity: "urgent", details: "Stop-work or crew safety concern requiring supervisor review." },
];

type LeadType = "phone_call" | "form" | "direct_email" | "referral" | "other";
type AccountType = "residential" | "commercial";
type LeadUrgency = "low" | "normal" | "high";
type CallOutcome = "estimate_requested" | "needs_callback" | "price_shopping" | "not_a_fit" | "emergency";
type IndustryFocus = "landscaping" | "pest_control" | "both";
type BillingPlan = "free" | "starter" | "pro" | "growth" | "enterprise";
type FieldIssueSubmitInput = {
  category: FieldIssueCategory;
  severity: FieldIssueSeverity;
  summary: string;
  details?: string;
  customerVisible: boolean;
  createOpportunity?: boolean;
  serviceCategory?: ServiceCategory;
  estimatedValueCents?: number;
};
type FieldIssueDraft = {
  category: FieldIssueCategory;
  severity: FieldIssueSeverity;
  details: string;
  customerVisible: boolean;
  serviceCategory: ServiceCategory;
  estimatedValue: string;
};

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
  callOutcome: CallOutcome;
  createCallFollowUp: boolean;
  followUpDueInDays: string;
};

type WebLeadFormState = {
  customerName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  serviceLine: ServiceCategory;
  campaign: string;
  sourceDetail: string;
  message: string;
  estimatedValue: string;
};

type RepeatLeadFormState = {
  title: string;
  value: string;
  serviceLine: ServiceCategory;
  source: string;
  message: string;
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

type JobTaskFormState = {
  title: string;
  priority: "low" | "normal" | "high";
  dueInDays: string;
  assignedUserId: string;
};

type LeadStatusSettingCode =
  | "new"
  | "contacted"
  | "do_estimate"
  | "estimate_provided"
  | "follow_up"
  | "waiting"
  | "converted"
  | "lost_confirmed"
  | "lost_assumed"
  | "unqualified"
  | "passed_on"
  | "disqualified"
  | "spam";

type LeadStatusSettingFormState = {
  settingId: string;
  status: LeadStatusSettingCode;
  label: string;
  color: string;
  sortOrder: string;
  terminal: boolean;
  active: boolean;
};

type ServiceCatalogFormState = {
  itemId: string;
  name: string;
  category: ServiceCategory;
  defaultUnit: string;
  defaultPrice: string;
  active: boolean;
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
type ActivityCallOutcome = "estimate_requested" | "left_voicemail" | "no_answer" | "not_interested" | "needs_manager";
type OpportunityImpact = "none" | "increase_probability" | "decrease_probability" | "advance_stage";

type ActivityComposerState = {
  kind: ActivityComposerKind;
  body: string;
  createFollowUp: boolean;
  dueInDays: string;
  callOutcome: ActivityCallOutcome;
  opportunityImpact: OpportunityImpact;
};

const activityKindLabels: Record<ActivityComposerKind, string> = {
  note: "Internal note",
  call: "Call",
  email: "Email",
};
const activityCallOutcomeLabels: Record<ActivityCallOutcome, string> = {
  estimate_requested: "Estimate requested",
  left_voicemail: "Left voicemail",
  no_answer: "No answer",
  not_interested: "Not interested",
  needs_manager: "Needs manager review",
};
const opportunityImpactLabels: Record<OpportunityImpact, string> = {
  none: "No opportunity impact",
  increase_probability: "Increase probability",
  decrease_probability: "Decrease probability",
  advance_stage: "Advance stage",
};

const leadSourceOptions = ["Manual entry", "Website form", "Phone", "Referral", "Google Maps", "Door hanger", "Import"];
const leadTypeOptions: Array<{ value: LeadType; label: string }> = [
  { value: "phone_call", label: "Phone call" },
  { value: "form", label: "Form" },
  { value: "direct_email", label: "Direct email" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];
const callOutcomeOptions: Array<{ value: CallOutcome; label: string }> = [
  { value: "estimate_requested", label: "Estimate requested" },
  { value: "needs_callback", label: "Needs callback" },
  { value: "price_shopping", label: "Price shopping" },
  { value: "not_a_fit", label: "Not a fit" },
  { value: "emergency", label: "Emergency service" },
];
const callOutcomeLabels = Object.fromEntries(callOutcomeOptions.map((option) => [option.value, option.label])) as Record<CallOutcome, string>;

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
    callOutcome: "estimate_requested",
    createCallFollowUp: true,
    followUpDueInDays: "1",
  };
}

function defaultActivityComposer(): ActivityComposerState {
  return {
    kind: "note",
    body: "",
    createFollowUp: false,
    dueInDays: "2",
    callOutcome: "estimate_requested",
    opportunityImpact: "none",
  };
}

function defaultJobTaskForm(): JobTaskFormState {
  return {
    title: "",
    priority: "normal",
    dueInDays: "2",
    assignedUserId: "",
  };
}

function defaultServiceCatalogForm(): ServiceCatalogFormState {
  return {
    itemId: "",
    name: "Quarterly pest perimeter service",
    category: "pest_control",
    defaultUnit: "visit",
    defaultPrice: "199",
    active: true,
  };
}

function defaultLeadStatusSettingForm(): LeadStatusSettingFormState {
  return {
    settingId: "",
    status: "follow_up",
    label: "Follow Up",
    color: "#b45309",
    sortOrder: "5",
    terminal: false,
    active: true,
  };
}

function defaultWebLeadForm(): WebLeadFormState {
  return {
    customerName: "",
    email: "",
    phone: "",
    street: "",
    city: "Foxborough",
    state: "MA",
    postalCode: "",
    serviceLine: "lawn_care",
    campaign: "Spring cleanup landing page",
    sourceDetail: "Google Ads",
    message: "",
    estimatedValue: "1800",
  };
}

function defaultRepeatLeadForm(): RepeatLeadFormState {
  return {
    title: "",
    value: "1200",
    serviceLine: "maintenance",
    source: "Repeat customer",
    message: "",
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
  activeOrganizationId?: string;
  activeMembershipRole?: Role;
  plan?: string;
  subscriptionStatus?: string;
  isDemoMode?: boolean;
  demoPersona?: DemoPersona;
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
    callOutcome?: CallOutcome;
    createCallFollowUp?: boolean;
    followUpDueInDays?: number;
  }) => Promise<{ customerId?: string; leadId?: string; opportunityId?: string } | void>;
  createLeadForCustomer?: (input: {
    customerId: string;
    propertyId?: string;
    title: string;
    source: string;
    valueCents: number;
    serviceLine: ServiceCategory;
    message?: string;
  }) => Promise<{ leadId?: string; opportunityId?: string } | void>;
  createEstimateFromOpportunity?: (input: {
    opportunityId: string;
    status: "draft" | "sent";
    lineItemName: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    terms?: string;
    servicePackageId?: string;
    serviceCatalogItemId?: string;
  }) => Promise<{ estimateId?: string; estimateNumber?: string } | void>;
  sendEstimateToCustomer?: (estimateId: string) => Promise<{ estimateId?: string; estimateNumber?: string; sentAt?: number; expiresAt?: number } | void>;
  acceptEstimateFromCustomer?: (input: {
    estimateId: string;
    acceptedByName?: string;
    acceptedByEmail?: string;
    acceptanceSource?: "customer_portal" | "email" | "verbal" | "office";
    acceptanceNote?: string;
  }) => Promise<{ estimateId?: string; estimateNumber?: string; acceptedAt?: number } | void>;
  convertEstimateToJob?: (input: {
    estimateId: string;
    scheduledStart?: number;
    scheduledEnd?: number;
    crewId?: string;
  }) => Promise<{ estimateId?: string; estimateNumber?: string; jobId?: string; visitId?: string; jobTitle?: string; alreadyConverted?: boolean } | void>;
  advanceOpportunity?: (opportunityId: string, stage: Opportunity["stage"]) => void;
  assignVisit?: (visitId: string, crewId: string) => void;
  reorderVisit?: (visitId: string, routeOrder: number) => void;
  generateRecurringRoute?: (input: {
    jobId: string;
    frequency: "weekly" | "biweekly" | "monthly" | "seasonal" | "custom";
    count: number;
    firstStart: number;
    durationMinutes: number;
    crewId?: string;
  }) => Promise<{ planId?: string; visitIds?: string[]; generatedCount?: number; nextRunAt?: number } | void>;
  createChangeOrder?: (input: {
    jobId: string;
    title: string;
    description: string;
    requestedByName?: string;
    revenueDeltaCents: number;
    estimatedCostDeltaCents: number;
    scheduleImpactDays: number;
  }) => Promise<{ changeOrderId?: string } | string | void>;
  approveChangeOrder?: (input: {
    changeOrderId: string;
    approvedByName: string;
    approvedByEmail?: string;
  }) => Promise<{ changeOrderId?: string; taskId?: string } | void>;
  startVisit?: (visitId: string, startSource?: "manual" | "gps") => Promise<{ visitId?: string; timesheetEntryId?: string; startedAt?: number } | void>;
  completeChecklistItem?: (visitId: string, itemId: string) => void;
  submitVisit?: (
    visitId: string,
    input?: {
      issueFlag?: string;
      issue?: FieldIssueSubmitInput;
      notes?: string;
      materialApplications?: Array<{ materialId: string; quantity: number; unit: string; targetAreaId?: string; notes?: string }>;
    },
  ) => Promise<{ visitId?: string; timesheetEntryId?: string; fieldIssueId?: string; issueTaskId?: string; issueOpportunityId?: string } | void>;
  addTask?: (
    jobId: string,
    input: {
      title: string;
      priority?: "low" | "normal" | "high";
      dueAt?: number;
      assignedUserId?: string;
    },
  ) => Promise<string | void> | void;
  addActivity?: (input: {
    entityType: "customer" | "job";
    entityId: string;
    kind: ActivityComposerKind;
    summary: string;
    createFollowUp: boolean;
    dueInDays: number;
    callOutcome?: ActivityCallOutcome;
    opportunityImpact?: OpportunityImpact;
  }) => void;
  createCrew?: (name: string) => void;
  toggleService?: (itemId: string) => void;
  upsertServiceCatalogItem?: (input: {
    itemId?: string;
    name: string;
    category: ServiceCategory;
    defaultUnit: string;
    defaultPriceCents: number;
    active: boolean;
  }) => Promise<string | void> | void;
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
    statusSettings: Array<{ id: string; status: LeadStatusSettingCode; label: string; color: string; sortOrder: number; terminal: boolean; active: boolean }>;
    qualityIssues: Array<{ id: string; kind: string; severity: string; status: string; summary: string; leadId?: string }>;
    metrics: { openLeads: number; highQuality: number; spamReview: number; unassigned: number; slaOverdue: number; duplicates: number; estimateReady: number };
  };
  fieldOps: {
    routeConfidence: Array<{ visitId: string; score: number; warnings: string[]; requiredSkills: string[]; crewSkills: string[]; weatherRisk: string; equipmentConflicts: string[] }>;
    materialLots: Array<{ visitId: string; materialName: string; epaNumber?: string; lotNumber: string; quantity: string; applicator: string; weatherRisk: string }>;
    complianceRecords: Array<{
      id: string;
      reportNumber: string;
      visitId: string;
      jobTitle: string;
      customerName: string;
      propertyName: string;
      siteAddress: string;
      materialName: string;
      epaRegistrationNumber?: string;
      restrictedUse: boolean;
      quantity: number;
      unit: string;
      targetArea: string;
      applicator: string;
      weatherSummary: string;
      applicationRisk: string;
      notes?: string;
      generatedAt: number;
      ready: boolean;
      missing: string[];
    }>;
    timeBreakdowns: Array<{ jobId: string; jobTitle: string; estimatedMinutes: number; scheduledMinutes: number; actualMinutes: number; driveMinutes: number; nonBillableMinutes: number; varianceMinutes: number }>;
    callbacks: Array<{ id: string; jobTitle: string; customerName: string; reason: string; severity: string; status: string }>;
    equipmentCheckouts: Array<{ visitId: string; equipmentName: string; status: string; maintenanceDue: boolean; assignedCrew: string }>;
    importQaRows: Array<{ id: string; source: string; rowLabel: string; status: string; issues: string[]; mappedEntity: string }>;
  };
  admin: {
    members: Array<{ id: string; userId: string; name: string; email: string; role: Role; status: string }>;
    permissionMatrix: Array<{ permission: string; roles: Role[] }>;
    featureFlags: Array<{ id: string; key: string; enabled: boolean }>;
    auditEvents: Array<{
      id: string;
      action: string;
      summary: string;
      entityType: string;
      entityId: string;
      actorUserId?: string;
      actorName: string;
      module: string;
      exportState: string;
      requestId?: string;
      changedFields: string[];
      createdAt: number;
    }>;
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
    serviceLineProfitability: Array<{
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
      grossMarginPercent: number;
      jobCount: number;
      calculatedAt: number;
    }>;
    customerProfitability: Array<{
      customerId: string;
      customerName: string;
      customerType: string;
      lifetimeRevenueCents: number;
      lifetimeCostCents: number;
      grossProfitCents: number;
      grossMarginPercent: number;
      estimatedLtvCents: number;
      openBalanceCents: number;
      invoiceCount: number;
      paymentCount: number;
      callbackCount: number;
      churnRiskLevel: string;
      churnRiskScore: number;
      churnDrivers: string[];
      nextBestAction: string;
      paymentBehavior: string;
      serviceMix: string[];
    }>;
    arAging: Array<{ invoiceId: string; invoiceNumber: string; customerName: string; jobTitle: string; status: string; totalCents: number; paidCents: number; balanceCents: number; dueAt?: number; daysPastDue: number; bucket: string; nextAction: string; risk: string }>;
    invoiceableJobs: Array<{ jobId: string; jobTitle: string; customerName: string; status: string; billableCents: number; marginPercent: number }>;
    invoices: Array<{ id: string; customerId: string; jobId?: string; invoiceNumber: string; customerName: string; jobTitle: string; status: string; totalCents: number; paidCents: number; balanceCents: number; dueAt?: number }>;
    payments: Array<{ id: string; invoiceId?: string; customerName: string; status: string; method: string; amountCents: number; receivedAt: number; reference?: string }>;
  };
};

type ImportPreviewUiRow = {
  id?: string;
  rowNumber: number;
  customerName: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  serviceLine?: string;
  source?: string;
  mappedEntity: "lead + customer + property" | "customer + property" | "lead";
  status: "ready" | "needs_review" | "blocked";
  issues: Array<{ message: string }>;
};

type OperatingActions = {
  bootstrap?: () => void;
  updateLead?: (leadId: string, fields: { status?: string; grade?: string; hidden?: boolean }) => void;
  bulkUpdateLeads?: (leadIds: string[], status: string) => void;
  createLeadImportPreview?: (input: { fileName?: string; csvText: string }) => Promise<{ importJobId: string; rows: Array<ImportPreviewUiRow & { id: string }> }>;
  commitLeadImportRows?: (importJobId: string) => Promise<{ imported: number; skipped: number; failed: number }>;
  submitWebLead?: (input: WebLeadFormState) => Promise<{ leadId: string; submissionId: string; spamScore: number; spamReasons: string[]; status: string }>;
  runStaleLeadCheck?: () => Promise<{ inserted: number }>;
  updateMemberRole?: (membershipId: string, role: Role) => void;
  inviteMember?: (input: { email: string; name?: string; role: Role; expiresInDays?: number }) => void | Promise<unknown>;
  revokeMemberInvite?: (membershipId: string) => void;
  expireMemberInvite?: (membershipId: string) => void;
  upsertLeadStatusSetting?: (input: { id?: string; status: LeadStatusSettingCode; label: string; color: string; sortOrder: number; terminal: boolean; active: boolean }) => void;
  upsertLaborRate?: (input: { id?: string; roleName: string; hourlyCostCents: number; billableRateCents?: number }) => void;
  upsertVendorCatalogItem?: (input: { id?: string; vendorName: string; itemName: string; category: ServiceCategory; unit: string; unitCostCents: number }) => void;
  addTimesheetEntry?: (jobId: string, roleName: string, hours: number, hourlyCostCents: number) => void;
  recordCustomerPayment?: (invoiceId: string, amountCents: number, method: "cash" | "check" | "card" | "ach" | "other", reference?: string) => void;
  generateInvoiceFromJob?: (jobId: string, status?: "draft" | "sent", dueInDays?: number) => Promise<{ invoiceId?: string; invoiceNumber?: string; created?: boolean; totalCents?: number; balanceCents?: number } | void>;
  closeJob?: (jobId: string, forceWithExceptions?: boolean, generateInvoice?: boolean) => Promise<{ jobId?: string; status?: "completed"; blockers?: string[]; invoice?: { invoiceId?: string; invoiceNumber?: string; created?: boolean } } | void>;
  generateComplianceRecord?: (visitId: string) => Promise<{ visitId?: string; recordCount?: number; ready?: boolean; missing?: string[] } | void>;
  recalculateJobCosts?: () => void;
  refreshCostIntelligence?: () => void;
  priceFertilizationProgram?: (input: {
    propertyId: string;
    propertyAreaId?: string;
    materialId: string;
    priceBookItemId?: string;
    applicationCount: number;
    materialRateUnitsPer1000SqFt: number;
    laborHoursPerApplication: number;
    laborRateCents: number;
    equipmentCostCentsPerApplication: number;
    overheadPercent: number;
    targetMarginPercent: number;
    selectedScenarioKey?: FertilizationMarginScenarioKey;
    selectedScenarioLabel?: string;
    selectedScenarioTargetMarginPercent?: number;
    estimateLineItemName?: string;
    estimateLineItemUnit?: string;
    estimateLineItemUnitPriceCents?: number;
  }) => Promise<{
    sessionId: string;
    output: ReturnType<typeof calculateFertilizationProgramPricing>;
    estimateLineItemPreview?: { name: string; quantity: number; unit: string; unitPriceCents: number };
  }>;
  decideEstimateApproval?: (approvalRequestId: string, decision: "approved" | "rejected", comment?: string) => Promise<{ approvalRequestId: string; status: "approved" | "rejected" } | void>;
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
    { item: "Paddle billing", status: "next", owner: "ops" },
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
  return scoreLeadQuality({
    source: form.source,
    phone: form.phone,
    email: form.email,
    street: form.street,
    city: form.city,
    postalCode: form.postalCode,
    serviceLine: form.serviceLine,
    lawnSizeSqFt: numericOrUndefined(form.lawnSizeSqFt),
    message: form.message,
    ownerOrCompany: form.companyAssignment,
  }).score;
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
      complianceRecords: depth.fieldOps?.complianceRecords ?? fallback.fieldOps.complianceRecords,
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

function userFacingWriteError(error: unknown) {
  if (error instanceof Error) {
    return error.message.replace(/^.*Uncaught ConvexError:\s*/, "").replace(/^.*ConvexError:\s*/, "");
  }
  return "We couldn't save this change. Check your plan limits, permissions, and required fields, then try again.";
}

function sameIdentityText(left?: string, right?: string) {
  return (left ?? "").trim().toLowerCase() === (right ?? "").trim().toLowerCase();
}

function preserveCustomerSelection(previous: WorkspaceSnapshot, next: WorkspaceSnapshot, currentId: string) {
  if (next.customers.some((customer) => customer.id === currentId)) return currentId;
  const previousCustomer = previous.customers.find((customer) => customer.id === currentId);
  if (!previousCustomer) return next.customers[0]?.id ?? "";

  const contactMatch = next.customers.find(
    (customer) =>
      sameIdentityText(customer.name, previousCustomer.name) &&
      (sameIdentityText(customer.email, previousCustomer.email) || sameIdentityText(customer.phone, previousCustomer.phone)),
  );
  if (contactMatch) return contactMatch.id;

  return next.customers.find((customer) => sameIdentityText(customer.name, previousCustomer.name))?.id ?? next.customers[0]?.id ?? "";
}

function preserveJobSelection(previous: WorkspaceSnapshot, next: WorkspaceSnapshot, currentId: string) {
  if (next.jobs.some((job) => job.id === currentId)) return currentId;
  const previousJob = previous.jobs.find((job) => job.id === currentId);
  if (!previousJob) return next.jobs[0]?.id ?? "";
  const previousCustomer = previous.customers.find((customer) => customer.id === previousJob.customerId);

  const jobMatch = next.jobs.find((job) => {
    if (!sameIdentityText(job.title, previousJob.title)) return false;
    if (!previousCustomer) return true;
    const nextCustomer = next.customers.find((customer) => customer.id === job.customerId);
    return sameIdentityText(nextCustomer?.name, previousCustomer.name);
  });

  return jobMatch?.id ?? next.jobs.find((job) => sameIdentityText(job.title, previousJob.title))?.id ?? next.jobs[0]?.id ?? "";
}

function preserveVisitSelection(previous: WorkspaceSnapshot, next: WorkspaceSnapshot, currentId: string) {
  if (next.visits.some((visit) => visit.id === currentId)) return currentId;
  const previousVisit = previous.visits.find((visit) => visit.id === currentId);
  if (!previousVisit) return next.visits[0]?.id ?? "";
  const previousJob = previous.jobs.find((job) => job.id === previousVisit.jobId);

  const visitMatch = next.visits.find((visit) => {
    if (visit.scheduledStart !== previousVisit.scheduledStart || visit.scheduledEnd !== previousVisit.scheduledEnd) return false;
    if (!previousJob) return true;
    const nextJob = next.jobs.find((job) => job.id === visit.jobId);
    return sameIdentityText(nextJob?.title, previousJob.title);
  });

  return visitMatch?.id ?? next.visits[0]?.id ?? "";
}

function mergeWorkspaceSnapshots(previous: WorkspaceSnapshot, next: WorkspaceSnapshot): WorkspaceSnapshot {
  if (previous.organization.id !== next.organization.id) return next;

  const mergeByIdentity = <T extends { id: string }>(remote: T[], local: T[], identity: (item: T) => string = (item) => item.id) => {
    const remoteIdentities = new Set(remote.map(identity));
    return [...remote, ...local.filter((item) => !remoteIdentities.has(identity(item)))];
  };

  return {
    ...next,
    members: mergeByIdentity(next.members, previous.members),
    customers: mergeByIdentity(next.customers, previous.customers),
    contacts: mergeByIdentity(next.contacts, previous.contacts, (item) => `${item.customerId}|${item.email ?? ""}|${item.phone ?? ""}|${item.name}`),
    properties: mergeByIdentity(next.properties, previous.properties, (item) => `${item.customerId}|${item.street}|${item.city}|${item.postalCode}`),
    propertyAreas: mergeByIdentity(next.propertyAreas, previous.propertyAreas, (item) => `${item.propertyId}|${item.name}|${item.size ?? ""}`),
    leads: mergeByIdentity(next.leads, previous.leads, (item) => `${item.customerId}|${item.title}`),
    opportunities: mergeByIdentity(next.opportunities, previous.opportunities, (item) => `${item.leadId}|${item.title}`),
    estimates: mergeByIdentity(next.estimates, previous.estimates),
    approvalRequests: mergeByIdentity(next.approvalRequests, previous.approvalRequests),
    invoices: mergeByIdentity(next.invoices, previous.invoices),
    payments: mergeByIdentity(next.payments, previous.payments, (item) => `${item.invoiceId}|${item.amountCents}|${item.reference ?? ""}`),
    serviceCatalog: mergeByIdentity(next.serviceCatalog, previous.serviceCatalog),
    servicePackages: mergeByIdentity(next.servicePackages, previous.servicePackages),
    priceBookItems: mergeByIdentity(next.priceBookItems, previous.priceBookItems),
    pricingRules: mergeByIdentity(next.pricingRules, previous.pricingRules),
    crews: mergeByIdentity(next.crews, previous.crews),
    jobs: mergeByIdentity(next.jobs, previous.jobs, (item) => `${item.customerId}|${item.title}`),
    jobPhases: mergeByIdentity(next.jobPhases, previous.jobPhases, (item) => `${item.jobId}|${item.name}`),
    visits: mergeByIdentity(next.visits, previous.visits, (item) => `${item.jobId}|${item.scheduledStart}|${item.scheduledEnd}`),
    recurringServicePlans: mergeByIdentity(next.recurringServicePlans, previous.recurringServicePlans, (item) => `${item.customerId}|${item.name}`),
    changeOrders: mergeByIdentity(next.changeOrders, previous.changeOrders, (item) => `${item.jobId}|${item.title}`),
    tasks: mergeByIdentity(next.tasks, previous.tasks, (item) => `${item.entityType}|${item.entityId}|${item.title}`),
    activities: mergeByIdentity(next.activities, previous.activities, (item) => `${item.entityType}|${item.entityId}|${item.kind}|${item.summary}`),
    notes: mergeByIdentity(next.notes, previous.notes, (item) => `${item.entityType}|${item.entityId}|${item.body}`),
    files: mergeByIdentity(next.files, previous.files, (item) => `${item.entityType}|${item.entityId}|${item.fileName}`),
    materials: mergeByIdentity(next.materials, previous.materials, (item) => `${item.name}|${item.unit}`),
  };
}

function normalizeWorkspaceSnapshot(workspace: WorkspaceSnapshot): WorkspaceSnapshot {
  const maybe = workspace as WorkspaceSnapshot & {
    contacts?: WorkspaceSnapshot["contacts"];
    propertyAreas?: WorkspaceSnapshot["propertyAreas"];
    invoices?: WorkspaceSnapshot["invoices"];
    approvalRequests?: WorkspaceSnapshot["approvalRequests"];
    payments?: WorkspaceSnapshot["payments"];
    servicePackages?: WorkspaceSnapshot["servicePackages"];
    priceBookItems?: WorkspaceSnapshot["priceBookItems"];
    pricingRules?: WorkspaceSnapshot["pricingRules"];
    recurringServicePlans?: WorkspaceSnapshot["recurringServicePlans"];
    changeOrders?: WorkspaceSnapshot["changeOrders"];
    jobPhases?: WorkspaceSnapshot["jobPhases"];
    notes?: WorkspaceSnapshot["notes"];
    files?: WorkspaceSnapshot["files"];
  };

  return {
    ...workspace,
    contacts: maybe.contacts ?? [],
    propertyAreas: maybe.propertyAreas ?? [],
    invoices: maybe.invoices ?? [],
    approvalRequests: maybe.approvalRequests ?? [],
    payments: maybe.payments ?? [],
    servicePackages: maybe.servicePackages ?? [],
    priceBookItems: maybe.priceBookItems ?? [],
    pricingRules: maybe.pricingRules ?? [],
    recurringServicePlans: maybe.recurringServicePlans ?? [],
    changeOrders: maybe.changeOrders ?? [],
    jobPhases: maybe.jobPhases ?? [],
    notes: maybe.notes ?? [],
    files: maybe.files ?? [],
  };
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
  const serviceLineGroups = summaries.reduce<Record<string, {
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
  }>>((groups, summary) => {
    const title = summary.jobTitle.toLowerCase();
    const serviceCategory = title.includes("mosquito") || title.includes("pest") ? "pest_control" : title.includes("irrigation") ? "irrigation" : "lawn_care";
    const current = groups[serviceCategory] ?? {
      serviceCategory,
      label: categoryLabels[serviceCategory as ServiceCategory] ?? formatStatus(serviceCategory),
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
    current.revenueCents += summary.actualRevenueCents;
    current.invoicedCents += summary.invoicedCents;
    current.collectedCents += summary.collectedCents;
    current.laborCostCents += summary.actualLaborCostCents;
    current.materialCostCents += summary.actualMaterialCostCents;
    current.equipmentCostCents += summary.actualEquipmentCostCents;
    current.overheadCostCents += summary.overheadCostCents;
    current.grossProfitCents += summary.grossProfitCents;
    current.jobCount += 1;
    groups[serviceCategory] = current;
    return groups;
  }, {});
  const serviceLineProfitability = Object.values(serviceLineGroups)
    .map((row) => ({ ...row, grossMarginPercent: row.revenueCents > 0 ? Math.round((row.grossProfitCents / row.revenueCents) * 1000) / 10 : 0, calculatedAt: now() }))
    .sort((left, right) => right.grossMarginPercent - left.grossMarginPercent || right.grossProfitCents - left.grossProfitCents);
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
  const vendorCatalogs = workspace.materials.map((material) => ({ id: material.id, vendorName: "Demo vendor", itemName: material.name, category: "lawn_care" as ServiceCategory, unit: material.unit, unitCostCents: material.costCents ?? 0, source: "manual", active: material.active }));
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
  const complianceRecords = workspace.visits.map((visit, index) => {
    const material = workspace.materials[index % Math.max(1, workspace.materials.length)];
    const property = propertiesById.get(visit.propertyId);
    const job = workspace.jobs.find((candidate) => candidate.id === visit.jobId);
    const customer = job ? customersById.get(job.customerId) : undefined;
    const crew = crewsById.get(visit.crewId);
    const weather = weatherSnapshots.find((snapshot) => snapshot.id === `weather-${visit.id}`);
    const epaRegistrationNumber = material?.name.toLowerCase().includes("barrier") || material?.name.toLowerCase().includes("grub") ? `EPA-${8700 + index}-MA` : undefined;
    const missing = [
      ...(epaRegistrationNumber ? [] : ["EPA registration"]),
      ...(property ? [] : ["property"]),
      ...(weather ? [] : ["weather snapshot"]),
      ...(crew ? [] : ["applicator/crew"]),
    ];
    return {
      id: `compliance-${visit.id}`,
      reportNumber: `CMP-${new Date(visit.scheduledStart).getFullYear()}-${String(index + 1).padStart(4, "0")}`,
      visitId: visit.id,
      jobTitle: job?.title ?? "Unassigned job",
      customerName: customer?.name ?? "Unknown customer",
      propertyName: property?.label ?? "Unknown property",
      siteAddress: property ? `${property.street}, ${property.city}, ${property.state} ${property.postalCode}` : "Unknown address",
      materialName: material?.name ?? "General material",
      epaRegistrationNumber,
      restrictedUse: false,
      quantity: index + 1.5,
      unit: material?.unit ?? "unit",
      targetArea: "Whole property",
      applicator: crew?.name ?? "Unassigned",
      weatherSummary: weather ? `${weather.conditions}, ${weather.temperatureF ?? "--"}F, wind ${weather.windMph ?? "--"} mph, ${weather.applicationRisk} risk` : "Missing weather",
      applicationRisk: weather?.applicationRisk ?? "high",
      notes: "Fallback compliance projection",
      generatedAt: visit.scheduledStart,
      ready: missing.length === 0,
      missing,
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
  const fallbackInvoices = summaries.map((summary, index) => {
    const dueAt = now() + (index === 0 ? -8 : 12 + index) * 24 * 60 * 60 * 1000;
    return {
      id: `invoice-${summary.jobId}`,
      customerId: workspace.jobs.find((job) => job.id === summary.jobId)?.customerId ?? "",
      jobId: summary.jobId,
      invoiceNumber: `DRAFT-${index + 1001}`,
      customerName: summary.customerName,
      jobTitle: summary.jobTitle,
      status: index === 0 ? "partially_paid" : "sent",
      totalCents: summary.invoicedCents,
      paidCents: summary.collectedCents,
      balanceCents: Math.max(0, summary.invoicedCents - summary.collectedCents),
      dueAt,
    };
  });
  const fallbackPayments = summaries.slice(0, 2).map((summary, index) => ({
    id: `payment-${summary.jobId}`,
    invoiceId: `invoice-${summary.jobId}`,
    customerName: summary.customerName,
    status: "posted",
    method: index === 0 ? "ach" : "check",
    amountCents: summary.collectedCents,
    receivedAt: now() - index * 24 * 60 * 60 * 1000,
    reference: `FALLBACK-${index + 1}`,
  }));
  const fallbackArAging = fallbackInvoices
    .filter((invoice) => invoice.balanceCents > 0)
    .map((invoice) => {
      const daysPastDue = invoice.dueAt ? Math.max(0, Math.floor((now() - invoice.dueAt) / (24 * 60 * 60 * 1000))) : 0;
      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        jobTitle: invoice.jobTitle,
        status: invoice.status,
        totalCents: invoice.totalCents,
        paidCents: invoice.paidCents,
        balanceCents: invoice.balanceCents,
        dueAt: invoice.dueAt,
        daysPastDue,
        bucket: daysPastDue === 0 ? "current" : daysPastDue <= 30 ? "1-30" : daysPastDue <= 60 ? "31-60" : "61-90",
        nextAction: daysPastDue > 0 ? "Create collections touch" : "Monitor due date",
        risk: daysPastDue > 30 ? "high" : daysPastDue > 0 ? "medium" : "low",
      };
    });
  const fallbackCustomerProfitability = lifecycleRows.map((row) => {
    const openBalanceCents = fallbackInvoices.filter((invoice) => invoice.customerId === row.customer.id).reduce((sum, invoice) => sum + invoice.balanceCents, 0);
    return {
      customerId: row.customer.id,
      customerName: row.customer.name,
      customerType: row.customer.type,
      lifetimeRevenueCents: row.lifetimeRevenueCents,
      lifetimeCostCents: row.lifetimeCostCents,
      grossProfitCents: row.grossProfitCents,
      grossMarginPercent: row.grossMarginPercent,
      estimatedLtvCents: row.estimatedLtvCents,
      openBalanceCents,
      invoiceCount: fallbackInvoices.filter((invoice) => invoice.customerId === row.customer.id).length,
      paymentCount: fallbackPayments.filter((payment) => payment.customerName === row.customer.name).length,
      callbackCount: callbacks.filter((callback) => callback.customerName === row.customer.name).length,
      churnRiskLevel: row.churnRiskLevel,
      churnRiskScore: row.churnRiskScore,
      churnDrivers: row.churnDrivers.length > 0 ? row.churnDrivers : ["Healthy account"],
      nextBestAction: openBalanceCents > 0 ? "Resolve AR before renewal" : "Offer renewal or upsell review",
      paymentBehavior: openBalanceCents > 0 ? "Open AR" : "Current",
      serviceMix: row.customer.tags.slice(0, 3),
    };
  });
  const fallbackInvoiceableJobs = summaries
    .filter((summary) => !fallbackInvoices.some((invoice) => invoice.jobId === summary.jobId && invoice.status !== "void"))
    .map((summary) => ({ jobId: summary.jobId, jobTitle: summary.jobTitle, customerName: summary.customerName, status: summary.status, billableCents: summary.actualRevenueCents, marginPercent: summary.grossMarginPercent }));

  return {
    seeded: false,
    leadOps: {
      rows: leadRows,
      savedViews: [
        { id: "fallback-hot", name: "High quality open", scope: "team", filters: { qualityScore: ">=85" }, columns: ["title", "customer", "status", "owner", "value"] },
        { id: "fallback-spam", name: "Spam review", scope: "team", filters: { spamScore: ">=35" }, columns: ["title", "source", "spamScore"] },
      ],
      statusSettings: [
        { id: "status-new", status: "new", label: "New", color: "#64748b", sortOrder: 1, terminal: false, active: true },
        { id: "status-contacted", status: "contacted", label: "Contacted", color: "#d97706", sortOrder: 2, terminal: false, active: true },
        { id: "status-do-estimate", status: "do_estimate", label: "Do Estimate", color: "#2563eb", sortOrder: 3, terminal: false, active: true },
        { id: "status-estimate-provided", status: "estimate_provided", label: "Estimate Provided", color: "#7c3aed", sortOrder: 4, terminal: false, active: true },
        { id: "status-follow-up", status: "follow_up", label: "Follow Up", color: "#b45309", sortOrder: 5, terminal: false, active: true },
        { id: "status-converted", status: "converted", label: "Converted", color: "#047857", sortOrder: 6, terminal: true, active: true },
        { id: "status-lost-confirmed", status: "lost_confirmed", label: "Lost", color: "#be123c", sortOrder: 7, terminal: true, active: true },
        { id: "status-spam", status: "spam", label: "Spam", color: "#475569", sortOrder: 8, terminal: true, active: true },
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
      complianceRecords,
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
      auditEvents: workspace.activities.slice(0, 8).map((activity) => ({
        id: activity.id,
        action: activity.kind,
        summary: activity.summary,
        entityType: activity.entityType,
        entityId: activity.entityId,
        actorName: "Local demo",
        module: formatStatus(activity.kind.split(".")[0] || "system"),
        exportState: "not_exported",
        changedFields: [],
        createdAt: activity.occurredAt,
      })),
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
      purchaseOrders: workspace.materials.slice(0, 2).map((material) => ({ id: `po-${material.id}`, vendorName: "Demo vendor", status: "received", totalCents: (material.costCents ?? 0) * 6, jobTitle: summaries[0]?.jobTitle ?? "Unassigned" })),
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
      serviceLineProfitability,
      customerProfitability: fallbackCustomerProfitability,
      arAging: fallbackArAging,
      invoiceableJobs: fallbackInvoiceableJobs,
      invoices: fallbackInvoices,
      payments: fallbackPayments,
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
  disabled,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
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

function JourneyWorkflowPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: JourneyWorkflowItem[];
}) {
  const [completed, setCompleted] = useState<Record<number, boolean>>({});

  if (items.length === 0) return null;

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-stone-500">{description}</p>
        </div>
        <Badge tone="success">{items.length} journeys</Badge>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {items.map((item) => {
          const isComplete = Boolean(completed[item.id]);
          return (
            <div key={item.id} className="rounded-md border border-stone-200 p-3" role="group" aria-label={`Journey workflow ${item.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Journey {item.id} - {item.owner}</div>
                  <div className="mt-1 font-semibold">{item.title}</div>
                </div>
                <Badge tone={isComplete ? "success" : "warning"}>{isComplete ? "ready" : "queued"}</Badge>
              </div>
              <p className="mt-2 text-sm leading-5 text-stone-600">{item.outcome}</p>
              <div className="mt-3 grid gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Fields</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.fields.map((field) => <Badge key={field}>{field}</Badge>)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Data objects</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.dataObjects.map((object) => <Badge key={object} tone="neutral">{object}</Badge>)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
                onClick={() => setCompleted((current) => ({ ...current, [item.id]: true }))}
              >
                <Check size={15} />
                {isComplete ? `${item.nextAction} ready` : item.nextAction}
              </button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function inputClass() {
  return "block h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#315a4d] focus:ring-2 focus:ring-[#315a4d]/15";
}

export function LandscapeOsApp({ initialDemoPersona = null }: { initialDemoPersona?: DemoPersona | null }) {
  const [localDemoPersona, setLocalDemoPersona] = useState<DemoPersona>(initialDemoPersona ?? "established");
  if (process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <LandscapeOsLiveApp initialDemoPersona={initialDemoPersona} />;
  }

  return (
    <div className="min-h-screen bg-[#f6f7f1]">
      <DemoPersonaSwitcher persona={localDemoPersona} onSelect={setLocalDemoPersona} />
      <LandscapeOsWorkspace
        key={localDemoPersona}
        initialWorkspace={getDemoWorkspaceForPersona(localDemoPersona)}
        backendState={{
          mode: "local",
          label: `${getDemoPersonaOption(localDemoPersona).label} demo`,
          detail: initialDemoPersona
            ? "This guided demo uses isolated synthetic data in the browser. No sign-in or billing is required."
            : "Convex URL is not configured, so this session is using in-memory demo data.",
          blueprint: fallbackBackendBlueprint,
          isDemoMode: true,
          demoPersona: localDemoPersona,
          plan: getDemoPersonaOption(localDemoPersona).plan,
          subscriptionStatus: "demo",
        }}
      />
    </div>
  );
}

function LandscapeOsLiveApp({ initialDemoPersona }: { initialDemoPersona?: DemoPersona | null }) {
  type OrganizationRow = {
    organization: {
      _id: Id<"organizations">;
      name: string;
      slug: string;
      billingPlan?: string;
      subscriptionStatus?: string;
    };
    membership: {
      role: Role;
      status: string;
    };
    subscription?: {
      plan: string;
      status: string;
    } | null;
    usage: {
      contacts: number;
      contactLimit?: number | null;
      memberLimit?: number | null;
    };
  };
  const organizationRows = useQuery(api.setup.listMyOrganizations) as OrganizationRow[] | undefined;
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [demoPersona, setDemoPersona] = useState<DemoPersona>(initialDemoPersona ?? "established");
  const [isDemoMode, setIsDemoMode] = useState(Boolean(initialDemoPersona));
  // Public sample workspaces are session-isolated. Only authenticated organizations use
  // Convex writes, so visitors can never mutate a permanent shared demo tenant.
  const isLocalDemoPersona = isDemoMode;
  const selectedOrganization = organizationRows?.find((row) => row.organization._id === selectedOrganizationId) ?? organizationRows?.[0];
  const activeOrganizationId = !isDemoMode ? selectedOrganization?.organization._id : undefined;
  const productionWorkspace = useQuery(
    api.workspace.getWorkspace,
    activeOrganizationId ? { organizationId: activeOrganizationId as Id<"organizations"> } : "skip",
  ) as WorkspaceSnapshot | null | undefined;
  const liveWorkspace = useQuery(api.demo.getWorkspace, isDemoMode && !isLocalDemoPersona ? {} : "skip") as WorkspaceSnapshot | null | undefined;
  const backendBlueprint = useQuery(api.specs.getBackendBlueprint, {}) as BackendBlueprint | undefined;
  const operatingDepth = useQuery(
    api.operating.getDemoOperatingDepth,
    activeOrganizationId ? { organizationId: activeOrganizationId as Id<"organizations"> } : isDemoMode && !isLocalDemoPersona ? {} : "skip",
  ) as OperatingDepth | null | undefined;
  const bootstrapWorkspace = useMutation(api.demo.bootstrapWorkspace);
  const bootstrapOperatingDepth = useMutation(api.operating.bootstrapOperatingDepth);
  const createLeadMutation = useMutation(api.demo.createLead);
  const createProductionLeadMutation = useMutation(api.crm.createLead);
  const createLeadForCustomerMutation = useMutation(api.demo.createLeadForCustomer);
  const createProductionLeadForCustomerMutation = useMutation(api.crm.createLeadForCustomer);
  const createEstimateFromOpportunityMutation = useMutation(api.demo.createEstimateFromOpportunity);
  const createProductionEstimateMutation = useMutation(api.estimates.createEstimate);
  const sendEstimateToCustomerMutation = useMutation(api.demo.sendEstimateToCustomer);
  const sendProductionEstimateMutation = useMutation(api.estimates.sendEstimate);
  const acceptEstimateFromCustomerMutation = useMutation(api.demo.acceptEstimateFromCustomer);
  const acceptProductionEstimateMutation = useMutation(api.estimates.acceptEstimate);
  const convertEstimateToJobMutation = useMutation(api.demo.convertEstimateToJob);
  const convertProductionEstimateToJobMutation = useMutation(api.estimates.convertToJob);
  const advanceOpportunityMutation = useMutation(api.demo.advanceOpportunity);
  const advanceProductionOpportunityMutation = useMutation(api.pipeline.advanceOpportunity);
  const assignVisitMutation = useMutation(api.demo.assignVisit);
  const assignProductionVisitMutation = useMutation(api.dispatch.assignVisit);
  const reorderVisitMutation = useMutation(api.demo.reorderVisit);
  const reorderProductionVisitMutation = useMutation(api.dispatch.reorderVisit);
  const generateRecurringRouteMutation = useMutation(api.demo.generateRecurringRoute);
  const generateProductionRecurringRouteMutation = useMutation(api.dispatch.generateRecurringRoute);
  const createChangeOrderMutation = useMutation(api.demo.createChangeOrder);
  const createProductionChangeOrderMutation = useMutation(api.jobs.createChangeOrder);
  const approveChangeOrderMutation = useMutation(api.demo.approveChangeOrder);
  const approveProductionChangeOrderMutation = useMutation(api.jobs.approveChangeOrder);
  const startVisitMutation = useMutation(api.demo.startVisit);
  const startProductionVisitMutation = useMutation(api.field.startVisit);
  const completeChecklistMutation = useMutation(api.demo.completeChecklistItem);
  const completeProductionChecklistMutation = useMutation(api.field.completeChecklistItem);
  const submitVisitMutation = useMutation(api.demo.submitVisit);
  const submitProductionVisitMutation = useMutation(api.field.submitVisit);
  const addTaskMutation = useMutation(api.demo.addTask);
  const addProductionTaskMutation = useMutation(api.jobs.addTask);
  const addActivityMutation = useMutation(api.demo.addActivity);
  const addProductionNoteMutation = useMutation(api.activities.addNote);
  const decideApprovalRequestMutation = useMutation(api.demo.decideApprovalRequest);
  const decideProductionApprovalMutation = useMutation(api.estimates.decideApproval);
  const createCrewMutation = useMutation(api.demo.createCrew);
  const createProductionCrewMutation = useMutation(api.admin.createCrew);
  const toggleServiceMutation = useMutation(api.demo.toggleServiceCatalogItem);
  const toggleProductionServiceMutation = useMutation(api.admin.toggleServiceCatalogItem);
  const upsertServiceCatalogItemMutation = useMutation(api.demo.upsertServiceCatalogItem);
  const upsertProductionServiceCatalogItemMutation = useMutation(api.admin.upsertServiceCatalogItem);
  const updateLeadMutation = useMutation(api.operating.updateLead);
  const bulkUpdateLeadsMutation = useMutation(api.operating.bulkUpdateLeads);
  const createLeadImportPreviewMutation = useMutation(api.operating.createLeadImportPreview);
  const commitLeadImportRowsMutation = useMutation(api.operating.commitLeadImportRows);
  const submitWebLeadMutation = useMutation(api.leadIntake.submitWebLead);
  const runStaleLeadCheckMutation = useMutation(api.operating.runStaleLeadCheck);
  const updateMemberRoleMutation = useMutation(api.operating.updateMemberRole);
  const inviteMemberMutation = useMutation(api.operating.inviteMember);
  const revokeMemberInviteMutation = useMutation(api.operating.revokeMemberInvite);
  const expireMemberInviteMutation = useMutation(api.operating.expireMemberInvite);
  const upsertLeadStatusSettingMutation = useMutation(api.operating.upsertLeadStatusSetting);
  const upsertLaborRateMutation = useMutation(api.operating.upsertLaborRate);
  const upsertVendorCatalogItemMutation = useMutation(api.operating.upsertVendorCatalogItem);
  const addTimesheetEntryMutation = useMutation(api.operating.addTimesheetEntry);
  const recordCustomerPaymentMutation = useMutation(api.operating.recordCustomerPayment);
  const generateInvoiceFromJobMutation = useMutation(api.operating.generateInvoiceFromJob);
  const closeJobMutation = useMutation(api.operating.closeJob);
  const generateComplianceRecordMutation = useMutation(api.operating.generateComplianceRecord);
  const recalculateJobCostsMutation = useMutation(api.operating.recalculateDemoJobCosts);
  const refreshCostIntelligenceMutation = useMutation(api.operating.refreshCostIntelligence);
  const priceFertilizationProgramMutation = useMutation(api.operating.priceDemoFertilizationProgram);
  const bootstrapStartedRef = useRef(false);
  const bootstrapRequestedRef = useRef(false);
  const operatingBootstrapStartedRef = useRef(false);

  useEffect(() => {
    if (!isDemoMode || isLocalDemoPersona || liveWorkspace === undefined || bootstrapStartedRef.current || bootstrapRequestedRef.current) return;
    bootstrapStartedRef.current = true;
    bootstrapRequestedRef.current = true;
    void bootstrapWorkspace({}).finally(() => {
      bootstrapStartedRef.current = false;
    });
  }, [bootstrapWorkspace, isDemoMode, isLocalDemoPersona, liveWorkspace]);

  useEffect(() => {
    if (!isDemoMode || isLocalDemoPersona || !liveWorkspace || operatingDepth === undefined || operatingBootstrapStartedRef.current) return;
    if (operatingDepth?.seeded) return;
    operatingBootstrapStartedRef.current = true;
    void bootstrapOperatingDepth({}).finally(() => {
      operatingBootstrapStartedRef.current = false;
    });
  }, [bootstrapOperatingDepth, isDemoMode, isLocalDemoPersona, liveWorkspace, operatingDepth]);

  const liveActions = useMemo<LiveActions>(
    () => ({
      createLead: async (input) => {
        try {
          if (!isDemoMode && activeOrganizationId) {
            return await createProductionLeadMutation({
              organizationId: activeOrganizationId as Id<"organizations">,
              customerName: input.customerName,
              contactName: input.customerName,
              phone: input.phone,
              email: input.email,
              property: {
                label: "Primary property",
                street: input.street,
                city: input.city,
                state: input.state,
                postalCode: input.postalCode,
                notes: input.estimateNotes,
              },
              title: input.title,
              source: input.source,
              leadType: input.leadType,
              accountType: input.accountType,
              companyAssignment: input.companyAssignment,
              lawnSizeSqFt: input.lawnSizeSqFt,
              urgency: input.urgency,
              message: input.message,
              estimateNotes: input.estimateNotes,
              callOutcome: input.callOutcome,
              createCallFollowUp: input.createCallFollowUp,
              followUpDueInDays: input.followUpDueInDays,
              valueCents: input.valueCents,
              serviceLines: [input.serviceLine],
            });
          }
          return await createLeadMutation({
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
            leadType: input.leadType,
            accountType: input.accountType,
            companyAssignment: input.companyAssignment,
            lawnSizeSqFt: input.lawnSizeSqFt,
            urgency: input.urgency,
            message: input.message,
            estimateNotes: input.estimateNotes,
            callOutcome: input.callOutcome,
            createCallFollowUp: input.createCallFollowUp,
            followUpDueInDays: input.followUpDueInDays,
          });
        } catch (error) {
          logConvexWriteFailure("createLead", error);
          throw error;
        }
      },
      createLeadForCustomer: async (input) => {
        try {
          if (!isDemoMode && activeOrganizationId) {
            return await createProductionLeadForCustomerMutation({
              organizationId: activeOrganizationId as Id<"organizations">,
              customerId: input.customerId as Id<"customers">,
              propertyId: input.propertyId as Id<"properties"> | undefined,
              title: input.title,
              source: input.source,
              valueCents: input.valueCents,
              serviceLines: [input.serviceLine],
              message: input.message,
            });
          }
          return await createLeadForCustomerMutation({
            customerId: input.customerId as Id<"customers">,
            propertyId: input.propertyId as Id<"properties"> | undefined,
            title: input.title,
            source: input.source,
            valueCents: input.valueCents,
            serviceLine: input.serviceLine,
            message: input.message,
          });
        } catch (error) {
          logConvexWriteFailure("createLeadForCustomer", error);
          throw error;
        }
      },
      createEstimateFromOpportunity: async (input) => {
        try {
          if (!isDemoMode && activeOrganizationId) {
            const estimateId = await createProductionEstimateMutation({
              organizationId: activeOrganizationId as Id<"organizations">,
              opportunityId: input.opportunityId as Id<"opportunities">,
              status: input.status,
              terms: input.terms,
              lineItems: [
                {
                  servicePackageId: input.servicePackageId as Id<"servicePackages"> | undefined,
                  serviceCatalogItemId: input.serviceCatalogItemId as Id<"serviceCatalogItems"> | undefined,
                  name: input.lineItemName,
                  quantity: input.quantity,
                  unit: input.unit,
                  unitPriceCents: input.unitPriceCents,
                },
              ],
            });
            return { estimateId };
          }
          return await createEstimateFromOpportunityMutation({
            opportunityId: input.opportunityId as Id<"opportunities">,
            status: input.status,
            lineItemName: input.lineItemName,
            quantity: input.quantity,
            unit: input.unit,
            unitPriceCents: input.unitPriceCents,
            terms: input.terms,
            servicePackageId: input.servicePackageId as Id<"servicePackages"> | undefined,
            serviceCatalogItemId: input.serviceCatalogItemId as Id<"serviceCatalogItems"> | undefined,
          });
        } catch (error) {
          logConvexWriteFailure("createEstimateFromOpportunity", error);
          throw error;
        }
      },
      sendEstimateToCustomer: async (estimateId) => {
        try {
          if (!isDemoMode && activeOrganizationId) {
            return await sendProductionEstimateMutation({
              organizationId: activeOrganizationId as Id<"organizations">,
              estimateId: estimateId as Id<"estimates">,
            });
          }
          return await sendEstimateToCustomerMutation({ estimateId: estimateId as Id<"estimates"> });
        } catch (error) {
          logConvexWriteFailure("sendEstimateToCustomer", error);
          throw error;
        }
      },
      acceptEstimateFromCustomer: async (input) => {
        try {
          if (!isDemoMode && activeOrganizationId) {
            return await acceptProductionEstimateMutation({
              organizationId: activeOrganizationId as Id<"organizations">,
              estimateId: input.estimateId as Id<"estimates">,
              acceptedByName: input.acceptedByName,
              acceptedByEmail: input.acceptedByEmail,
              acceptanceSource: input.acceptanceSource,
              acceptanceNote: input.acceptanceNote,
            });
          }
          return await acceptEstimateFromCustomerMutation({
            estimateId: input.estimateId as Id<"estimates">,
            acceptedByName: input.acceptedByName,
            acceptedByEmail: input.acceptedByEmail,
            acceptanceSource: input.acceptanceSource,
            acceptanceNote: input.acceptanceNote,
          });
        } catch (error) {
          logConvexWriteFailure("acceptEstimateFromCustomer", error);
          throw error;
        }
      },
      convertEstimateToJob: async (input) => {
        try {
          if (!isDemoMode && activeOrganizationId) {
            const scheduledStart = input.scheduledStart ?? Date.now() + 24 * 60 * 60 * 1000;
            const scheduledEnd = input.scheduledEnd ?? scheduledStart + 2 * 60 * 60 * 1000;
            return await convertProductionEstimateToJobMutation({
              organizationId: activeOrganizationId as Id<"organizations">,
              estimateId: input.estimateId as Id<"estimates">,
              scheduledStart,
              scheduledEnd,
              crewId: input.crewId as Id<"crews"> | undefined,
            });
          }
          return await convertEstimateToJobMutation({
            estimateId: input.estimateId as Id<"estimates">,
            scheduledStart: input.scheduledStart,
            scheduledEnd: input.scheduledEnd,
            crewId: input.crewId as Id<"crews"> | undefined,
          });
        } catch (error) {
          logConvexWriteFailure("convertEstimateToJob", error);
          throw error;
        }
      },
      advanceOpportunity: (opportunityId, stage) => {
        if (!isDemoMode && activeOrganizationId) {
          void advanceProductionOpportunityMutation({ organizationId: activeOrganizationId as Id<"organizations">, opportunityId: opportunityId as Id<"opportunities">, stage }).catch((error) => logConvexWriteFailure("advanceOpportunity", error));
          return;
        }
        void advanceOpportunityMutation({ opportunityId: opportunityId as Id<"opportunities">, stage }).catch((error) => logConvexWriteFailure("advanceOpportunity", error));
      },
      assignVisit: (visitId, crewId) => {
        if (!isDemoMode && activeOrganizationId) {
          void assignProductionVisitMutation({ organizationId: activeOrganizationId as Id<"organizations">, visitId: visitId as Id<"jobVisits">, crewId: crewId as Id<"crews"> }).catch((error) => logConvexWriteFailure("assignVisit", error));
          return;
        }
        void assignVisitMutation({ visitId: visitId as Id<"jobVisits">, crewId: crewId as Id<"crews"> }).catch((error) => logConvexWriteFailure("assignVisit", error));
      },
      reorderVisit: (visitId, routeOrder) => {
        if (!isDemoMode && activeOrganizationId) {
          void reorderProductionVisitMutation({ organizationId: activeOrganizationId as Id<"organizations">, visitId: visitId as Id<"jobVisits">, routeOrder }).catch((error) => logConvexWriteFailure("reorderVisit", error));
          return;
        }
        void reorderVisitMutation({ visitId: visitId as Id<"jobVisits">, routeOrder }).catch((error) => logConvexWriteFailure("reorderVisit", error));
      },
      generateRecurringRoute: async (input) => {
        try {
          if (!isDemoMode && activeOrganizationId) {
            return await generateProductionRecurringRouteMutation({
              organizationId: activeOrganizationId as Id<"organizations">,
              jobId: input.jobId as Id<"jobs">,
              frequency: input.frequency,
              count: input.count,
              firstStart: input.firstStart,
              durationMinutes: input.durationMinutes,
              crewId: input.crewId as Id<"crews"> | undefined,
            });
          }
          return await generateRecurringRouteMutation({
            jobId: input.jobId as Id<"jobs">,
            frequency: input.frequency,
            count: input.count,
            firstStart: input.firstStart,
            durationMinutes: input.durationMinutes,
            crewId: input.crewId as Id<"crews"> | undefined,
          });
        } catch (error) {
          logConvexWriteFailure("generateRecurringRoute", error);
          throw error;
        }
      },
      createChangeOrder: async (input) => {
        try {
          if (!isDemoMode && activeOrganizationId) {
            return await createProductionChangeOrderMutation({
              organizationId: activeOrganizationId as Id<"organizations">,
              jobId: input.jobId as Id<"jobs">,
              title: input.title,
              description: input.description,
              requestedByName: input.requestedByName,
              revenueDeltaCents: input.revenueDeltaCents,
              estimatedCostDeltaCents: input.estimatedCostDeltaCents,
              scheduleImpactDays: input.scheduleImpactDays,
            });
          }
          return await createChangeOrderMutation({
            jobId: input.jobId as Id<"jobs">,
            title: input.title,
            description: input.description,
            requestedByName: input.requestedByName,
            revenueDeltaCents: input.revenueDeltaCents,
            estimatedCostDeltaCents: input.estimatedCostDeltaCents,
            scheduleImpactDays: input.scheduleImpactDays,
          });
        } catch (error) {
          logConvexWriteFailure("createChangeOrder", error);
          throw error;
        }
      },
      approveChangeOrder: async (input) => {
        try {
          if (!isDemoMode && activeOrganizationId) {
            return await approveProductionChangeOrderMutation({
              organizationId: activeOrganizationId as Id<"organizations">,
              changeOrderId: input.changeOrderId as Id<"changeOrders">,
              approvedByName: input.approvedByName,
              approvedByEmail: input.approvedByEmail,
            });
          }
          return await approveChangeOrderMutation({
            changeOrderId: input.changeOrderId as Id<"changeOrders">,
            approvedByName: input.approvedByName,
            approvedByEmail: input.approvedByEmail,
          });
        } catch (error) {
          logConvexWriteFailure("approveChangeOrder", error);
          throw error;
        }
      },
      startVisit: async (visitId, startSource = "manual") => {
        try {
          if (!isDemoMode && activeOrganizationId) {
            return await startProductionVisitMutation({
              organizationId: activeOrganizationId as Id<"organizations">,
              visitId: visitId as Id<"jobVisits">,
              startSource,
            });
          }
          return await startVisitMutation({ visitId: visitId as Id<"jobVisits">, startSource });
        } catch (error) {
          logConvexWriteFailure("startVisit", error);
          throw error;
        }
      },
      completeChecklistItem: (visitId, itemId) => {
        if (!isDemoMode && activeOrganizationId) {
          void completeProductionChecklistMutation({ organizationId: activeOrganizationId as Id<"organizations">, visitId: visitId as Id<"jobVisits">, itemId, isDone: true }).catch((error) => logConvexWriteFailure("completeChecklistItem", error));
          return;
        }
        void completeChecklistMutation({ visitId: visitId as Id<"jobVisits">, itemId }).catch((error) => logConvexWriteFailure("completeChecklistItem", error));
      },
      submitVisit: async (visitId, input) => {
        try {
          if (!isDemoMode && activeOrganizationId) {
            return await submitProductionVisitMutation({
              organizationId: activeOrganizationId as Id<"organizations">,
              visitId: visitId as Id<"jobVisits">,
              issueFlag: input?.issueFlag,
              issue: input?.issue,
              notes: input?.notes,
              materialApplications: input?.materialApplications?.map((application) => ({
                materialId: application.materialId as Id<"materials">,
                quantity: application.quantity,
                unit: application.unit,
                targetAreaId: application.targetAreaId as Id<"propertyAreas"> | undefined,
                notes: application.notes,
              })),
            });
          }
          return await submitVisitMutation({
            visitId: visitId as Id<"jobVisits">,
            issueFlag: input?.issueFlag,
            issue: input?.issue,
            notes: input?.notes,
            materialApplications: input?.materialApplications?.map((application) => ({
              materialId: application.materialId as Id<"materials">,
              quantity: application.quantity,
              unit: application.unit,
              targetAreaId: application.targetAreaId as Id<"propertyAreas"> | undefined,
              notes: application.notes,
            })),
          });
        } catch (error) {
          logConvexWriteFailure("submitVisit", error);
          throw error;
        }
      },
      addTask: (jobId, input) => {
        if (!isDemoMode && activeOrganizationId) {
          return addProductionTaskMutation({
            organizationId: activeOrganizationId as Id<"organizations">,
            entityType: "job",
            entityId: jobId,
            title: input.title,
            priority: input.priority,
            dueAt: input.dueAt,
            assignedUserId: input.assignedUserId as Id<"users"> | undefined,
          }).catch((error) => {
            logConvexWriteFailure("addTask", error);
            throw error;
          });
        }
        return addTaskMutation({
          jobId: jobId as Id<"jobs">,
          title: input.title,
          priority: input.priority,
          dueAt: input.dueAt,
          assignedUserId: input.assignedUserId as Id<"users"> | undefined,
        }).catch((error) => {
          logConvexWriteFailure("addTask", error);
          throw error;
        });
      },
      addActivity: (input) => {
        if (!isDemoMode && activeOrganizationId) {
          void addProductionNoteMutation({
            organizationId: activeOrganizationId as Id<"organizations">,
            entityType: input.entityType,
            entityId: input.entityId as Id<"customers"> | Id<"leads"> | Id<"opportunities"> | Id<"estimates"> | Id<"jobs"> | Id<"jobVisits"> | Id<"properties">,
            body: input.summary,
            visibility: "internal",
          }).catch((error) => logConvexWriteFailure("addActivity", error));
          return;
        }
        void addActivityMutation({
          entityType: input.entityType,
          entityId: input.entityId,
          kind: input.kind,
          summary: input.summary,
          createFollowUp: input.createFollowUp,
          dueInDays: input.dueInDays,
          callOutcome: input.callOutcome,
          opportunityImpact: input.opportunityImpact,
        }).catch((error) => logConvexWriteFailure("addActivity", error));
      },
      createCrew: (name) => {
        if (!isDemoMode && activeOrganizationId) {
          void createProductionCrewMutation({ organizationId: activeOrganizationId as Id<"organizations">, name, color: "#2f6b4f" }).catch((error) => logConvexWriteFailure("createCrew", error));
          return;
        }
        void createCrewMutation({ name }).catch((error) => logConvexWriteFailure("createCrew", error));
      },
      toggleService: (itemId) => {
        if (!isDemoMode && activeOrganizationId) {
          void toggleProductionServiceMutation({ organizationId: activeOrganizationId as Id<"organizations">, itemId: itemId as Id<"serviceCatalogItems"> }).catch((error) => logConvexWriteFailure("toggleService", error));
          return;
        }
        void toggleServiceMutation({ itemId: itemId as Id<"serviceCatalogItems"> }).catch((error) => logConvexWriteFailure("toggleService", error));
      },
      upsertServiceCatalogItem: (input) => {
        if (!isDemoMode && activeOrganizationId) {
          return upsertProductionServiceCatalogItemMutation({
            organizationId: activeOrganizationId as Id<"organizations">,
            itemId: input.itemId as Id<"serviceCatalogItems"> | undefined,
            name: input.name,
            category: input.category,
            defaultUnit: input.defaultUnit,
            defaultPriceCents: input.defaultPriceCents,
            active: input.active,
          }).catch((error) => {
            logConvexWriteFailure("upsertServiceCatalogItem", error);
            throw error;
          });
        }
        return upsertServiceCatalogItemMutation({
          itemId: input.itemId as Id<"serviceCatalogItems"> | undefined,
          name: input.name,
          category: input.category,
          defaultUnit: input.defaultUnit,
          defaultPriceCents: input.defaultPriceCents,
          active: input.active,
        }).catch((error) => {
          logConvexWriteFailure("upsertServiceCatalogItem", error);
          throw error;
        });
      },
    }),
    [
      acceptProductionEstimateMutation,
      acceptEstimateFromCustomerMutation,
      activeOrganizationId,
      addActivityMutation,
      addProductionNoteMutation,
      addProductionTaskMutation,
      addTaskMutation,
      approveProductionChangeOrderMutation,
      approveChangeOrderMutation,
      advanceProductionOpportunityMutation,
      advanceOpportunityMutation,
      assignProductionVisitMutation,
      assignVisitMutation,
      completeProductionChecklistMutation,
      completeChecklistMutation,
      convertProductionEstimateToJobMutation,
      convertEstimateToJobMutation,
      createProductionChangeOrderMutation,
      createChangeOrderMutation,
      createProductionCrewMutation,
      createCrewMutation,
      createProductionEstimateMutation,
      createEstimateFromOpportunityMutation,
      createProductionLeadForCustomerMutation,
      createLeadForCustomerMutation,
      createProductionLeadMutation,
      createLeadMutation,
      generateProductionRecurringRouteMutation,
      generateRecurringRouteMutation,
      isDemoMode,
      reorderProductionVisitMutation,
      reorderVisitMutation,
      sendProductionEstimateMutation,
      sendEstimateToCustomerMutation,
      startProductionVisitMutation,
      startVisitMutation,
      submitProductionVisitMutation,
      submitVisitMutation,
      toggleServiceMutation,
      toggleProductionServiceMutation,
      upsertProductionServiceCatalogItemMutation,
      upsertServiceCatalogItemMutation,
    ],
  );

  const operatingActions = useMemo<OperatingActions>(
    () => ({
      bootstrap: () => {
        if (isDemoMode) void bootstrapOperatingDepth({}).catch((error) => logConvexWriteFailure("bootstrapOperatingDepth", error));
      },
      updateLead: (leadId, fields) => {
        void updateLeadMutation({
          organizationId: activeOrganizationId as Id<"organizations"> | undefined,
          leadId: leadId as Id<"leads">,
          status: fields.status as Parameters<typeof updateLeadMutation>[0]["status"],
          grade: fields.grade as Parameters<typeof updateLeadMutation>[0]["grade"],
          hidden: fields.hidden,
        }).catch((error) => logConvexWriteFailure("updateLead", error));
      },
      bulkUpdateLeads: (leadIds, status) => {
        void bulkUpdateLeadsMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, leadIds: leadIds as Array<Id<"leads">>, status: status as Parameters<typeof bulkUpdateLeadsMutation>[0]["status"] }).catch((error) => logConvexWriteFailure("bulkUpdateLeads", error));
      },
      createLeadImportPreview: async (input) => {
        try {
          return await createLeadImportPreviewMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, fileName: input.fileName, csvText: input.csvText });
        } catch (error) {
          logConvexWriteFailure("createLeadImportPreview", error);
          throw error;
        }
      },
      commitLeadImportRows: async (importJobId) => {
        try {
          return await commitLeadImportRowsMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, importJobId: importJobId as Id<"importJobs"> });
        } catch (error) {
          logConvexWriteFailure("commitLeadImportRows", error);
          throw error;
        }
      },
      submitWebLead: async (input) => {
        try {
          return await submitWebLeadMutation({
            organizationSlug: selectedOrganization?.organization.slug ?? "greenline-demo",
            customerName: input.customerName,
            email: input.email || undefined,
            phone: input.phone || undefined,
            street: input.street || undefined,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode || undefined,
            serviceLine: input.serviceLine,
            campaign: input.campaign || undefined,
            sourceDetail: input.sourceDetail || undefined,
            message: input.message || undefined,
            estimatedValueCents: dollarsToCents(input.estimatedValue),
          });
        } catch (error) {
          logConvexWriteFailure("submitWebLead", error);
          throw error;
        }
      },
      runStaleLeadCheck: async () => {
        try {
          return await runStaleLeadCheckMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined });
        } catch (error) {
          logConvexWriteFailure("runStaleLeadCheck", error);
          throw error;
        }
      },
      updateMemberRole: (membershipId, nextRole) => {
        void updateMemberRoleMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, membershipId: membershipId as Id<"memberships">, role: nextRole }).catch((error) => logConvexWriteFailure("updateMemberRole", error));
      },
      inviteMember: (input) => {
        return inviteMemberMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, email: input.email, name: input.name, role: input.role, expiresInDays: input.expiresInDays }).catch((error) => {
          logConvexWriteFailure("inviteMember", error);
          throw error;
        });
      },
      revokeMemberInvite: (membershipId) => {
        void revokeMemberInviteMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, membershipId: membershipId as Id<"memberships"> }).catch((error) => logConvexWriteFailure("revokeMemberInvite", error));
      },
      expireMemberInvite: (membershipId) => {
        void expireMemberInviteMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, membershipId: membershipId as Id<"memberships"> }).catch((error) => logConvexWriteFailure("expireMemberInvite", error));
      },
      upsertLeadStatusSetting: (input) => {
        void upsertLeadStatusSettingMutation({
          organizationId: activeOrganizationId as Id<"organizations"> | undefined,
          id: input.id as Id<"leadStatusSettings"> | undefined,
          status: input.status,
          label: input.label,
          color: input.color,
          sortOrder: input.sortOrder,
          terminal: input.terminal,
          active: input.active,
        }).catch((error) => logConvexWriteFailure("upsertLeadStatusSetting", error));
      },
      upsertLaborRate: (input) => {
        void upsertLaborRateMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, id: input.id as Id<"laborRateCards"> | undefined, roleName: input.roleName, hourlyCostCents: input.hourlyCostCents, billableRateCents: input.billableRateCents }).catch((error) => logConvexWriteFailure("upsertLaborRate", error));
      },
      upsertVendorCatalogItem: (input) => {
        void upsertVendorCatalogItemMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, id: input.id as Id<"vendorCatalogs"> | undefined, vendorName: input.vendorName, itemName: input.itemName, category: input.category, unit: input.unit, unitCostCents: input.unitCostCents }).catch((error) => logConvexWriteFailure("upsertVendorCatalogItem", error));
      },
      addTimesheetEntry: (jobId, roleName, hours, hourlyCostCents) => {
        void addTimesheetEntryMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, jobId: jobId as Id<"jobs">, roleName, hours, hourlyCostCents }).catch((error) => logConvexWriteFailure("addTimesheetEntry", error));
      },
      recordCustomerPayment: (invoiceId, amountCents, method, reference) => {
        void recordCustomerPaymentMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, invoiceId: invoiceId as Id<"customerInvoices">, amountCents, method, reference }).catch((error) => logConvexWriteFailure("recordCustomerPayment", error));
      },
      generateInvoiceFromJob: async (jobId, status = "sent", dueInDays = 14) => {
        try {
          return await generateInvoiceFromJobMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, jobId: jobId as Id<"jobs">, status, dueInDays });
        } catch (error) {
          logConvexWriteFailure("generateInvoiceFromJob", error);
          throw error;
        }
      },
      closeJob: async (jobId, forceWithExceptions = false, generateInvoice = true) => {
        try {
          return await closeJobMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, jobId: jobId as Id<"jobs">, forceWithExceptions, generateInvoice });
        } catch (error) {
          logConvexWriteFailure("closeJob", error);
          throw error;
        }
      },
      generateComplianceRecord: async (visitId) => {
        try {
          return await generateComplianceRecordMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined, visitId: visitId as Id<"jobVisits"> });
        } catch (error) {
          logConvexWriteFailure("generateComplianceRecord", error);
          return { recordCount: 1, missing: [] };
        }
      },
      recalculateJobCosts: () => {
        void recalculateJobCostsMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined }).catch((error) => logConvexWriteFailure("recalculateJobCosts", error));
      },
      refreshCostIntelligence: () => {
        void refreshCostIntelligenceMutation({ organizationId: activeOrganizationId as Id<"organizations"> | undefined }).catch((error) => logConvexWriteFailure("refreshCostIntelligence", error));
      },
      priceFertilizationProgram: async (input) => {
        try {
          const result = await priceFertilizationProgramMutation({
            organizationId: activeOrganizationId as Id<"organizations"> | undefined,
            propertyId: input.propertyId as Id<"properties">,
            propertyAreaId: input.propertyAreaId as Id<"propertyAreas"> | undefined,
            materialId: input.materialId as Id<"materials">,
            priceBookItemId: input.priceBookItemId as Id<"priceBookItems"> | undefined,
            applicationCount: input.applicationCount,
            materialRateUnitsPer1000SqFt: input.materialRateUnitsPer1000SqFt,
            laborHoursPerApplication: input.laborHoursPerApplication,
            laborRateCents: input.laborRateCents,
            equipmentCostCentsPerApplication: input.equipmentCostCentsPerApplication,
            overheadPercent: input.overheadPercent,
            targetMarginPercent: input.targetMarginPercent,
            selectedScenarioKey: input.selectedScenarioKey,
            selectedScenarioLabel: input.selectedScenarioLabel,
            selectedScenarioTargetMarginPercent: input.selectedScenarioTargetMarginPercent,
            estimateLineItemName: input.estimateLineItemName,
            estimateLineItemUnit: input.estimateLineItemUnit,
            estimateLineItemUnitPriceCents: input.estimateLineItemUnitPriceCents,
          });
          return result;
        } catch (error) {
          logConvexWriteFailure("priceFertilizationProgram", error);
          throw error;
        }
      },
      decideEstimateApproval: async (approvalRequestId, decision, comment) => {
        try {
          if (!isDemoMode && activeOrganizationId) {
            return await decideProductionApprovalMutation({ organizationId: activeOrganizationId as Id<"organizations">, approvalRequestId: approvalRequestId as Id<"approvalRequests">, decision, comment });
          }
          return await decideApprovalRequestMutation({
            approvalRequestId: approvalRequestId as Id<"approvalRequests">,
            decision,
            comment,
          });
        } catch (error) {
          logConvexWriteFailure("decideEstimateApproval", error);
          throw error;
        }
      },
    }),
    [
      activeOrganizationId,
      addTimesheetEntryMutation,
      bootstrapOperatingDepth,
      bulkUpdateLeadsMutation,
      commitLeadImportRowsMutation,
      createLeadImportPreviewMutation,
      decideApprovalRequestMutation,
      decideProductionApprovalMutation,
      expireMemberInviteMutation,
      closeJobMutation,
      generateComplianceRecordMutation,
      generateInvoiceFromJobMutation,
      inviteMemberMutation,
      isDemoMode,
      priceFertilizationProgramMutation,
      recalculateJobCostsMutation,
      recordCustomerPaymentMutation,
      refreshCostIntelligenceMutation,
      revokeMemberInviteMutation,
      runStaleLeadCheckMutation,
      selectedOrganization,
      submitWebLeadMutation,
      updateLeadMutation,
      updateMemberRoleMutation,
      upsertLeadStatusSettingMutation,
      upsertLaborRateMutation,
      upsertVendorCatalogItemMutation,
    ],
  );

  if (organizationRows === undefined && !isDemoMode) {
    return (
      <TenantGate
        title="Loading workspaces"
        description="Convex is checking your account memberships before opening the production app."
        action={
          <TextButton type="button" variant="secondary" icon={<ShieldCheck size={16} />} onClick={() => setIsDemoMode(true)}>
            Open sample workspace
          </TextButton>
        }
      />
    );
  }

  if (!isDemoMode && organizationRows && organizationRows.length === 0) {
    return (
      <TenantGate
        title="Create your first workspace"
        description="Sign in creates the account. A Convex organization is still required before this session can enter the production app."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/signin" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#224036] px-4 text-sm font-semibold text-white">
              Create workspace
              <ArrowRight size={16} />
            </Link>
            <TextButton type="button" variant="secondary" icon={<ShieldCheck size={16} />} onClick={() => setIsDemoMode(true)}>
              Open sample workspace
            </TextButton>
          </div>
        }
      />
    );
  }

  // Never mount the interactive shell with placeholder IDs while Convex is still loading.
  // A placeholder customer or visit can pass through a mutation and fail validation before the
  // realtime workspace arrives.
  if ((!isLocalDemoPersona && isDemoMode && liveWorkspace === undefined) || (!isDemoMode && activeOrganizationId && productionWorkspace === undefined)) {
    return (
      <TenantGate
        title={isDemoMode ? "Loading Protected demo workspace" : "Loading selected workspace"}
        description="Convex is loading the workspace records and permissions before enabling writes."
        action={<div className="text-sm font-semibold text-stone-600">Please keep this tab open while the workspace connects.</div>}
      />
    );
  }

  const activeWorkspace = isLocalDemoPersona ? getDemoWorkspaceForPersona(demoPersona) : isDemoMode ? liveWorkspace : productionWorkspace;
  const activePlan = isLocalDemoPersona
    ? getDemoPersonaOption(demoPersona).plan
    : selectedOrganization?.subscription?.plan ?? selectedOrganization?.organization.billingPlan ?? "free";
  const activeSubscriptionStatus = isLocalDemoPersona
    ? "demo"
    : selectedOrganization?.subscription?.status ?? selectedOrganization?.organization.subscriptionStatus ?? "active";
  const activeRole = selectedOrganization?.membership.role;
  const backendState: BackendState = {
    mode: isLocalDemoPersona ? "local" : activeWorkspace ? "convex-live" : "convex-loading",
    label: isLocalDemoPersona ? `${getDemoPersonaOption(demoPersona).label} demo` : isDemoMode ? "Protected demo workspace" : activeWorkspace ? "Production tenant" : "Connecting tenant",
    detail: isLocalDemoPersona
      ? "This guided demo uses isolated synthetic browser data. Choose another demo profile or sign in to open a real tenant."
      : isDemoMode
      ? activeWorkspace
        ? "This is the shared demo workspace. Use the selector above to return to real client data."
        : "Seeding the protected demo workspace in Convex."
      : activeWorkspace
        ? `${selectedOrganization?.organization.name ?? "Workspace"} is loaded from Convex with the ${activePlan} plan and ${activeSubscriptionStatus} subscription status.`
        : "Loading the selected organization from Convex without bootstrapping shared demo data.",
    blueprint: backendBlueprint ?? fallbackBackendBlueprint,
    activeOrganizationId: activeOrganizationId,
    activeMembershipRole: activeRole,
    plan: activePlan,
    subscriptionStatus: activeSubscriptionStatus,
    isDemoMode,
    demoPersona: isLocalDemoPersona ? demoPersona : undefined,
  };

  if (isLocalDemoPersona) {
    return (
      <div className="min-h-screen bg-[#f6f7f1]">
        <DemoPersonaSwitcher persona={demoPersona} onSelect={setDemoPersona} />
        <LandscapeOsWorkspace
          key={demoPersona}
          initialWorkspace={activeWorkspace ?? getDemoWorkspaceForPersona(demoPersona)}
          backendState={backendState}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7f1]">
      <TenantSwitcher
        organizationRows={organizationRows ?? []}
        selectedOrganizationId={selectedOrganization?.organization._id ?? ""}
        isDemoMode={isDemoMode}
        onSelectOrganization={(organizationId) => {
          setSelectedOrganizationId(organizationId);
          setIsDemoMode(false);
        }}
        onOpenDemo={() => {
          setDemoPersona("established");
          setIsDemoMode(true);
        }}
      />
      <LandscapeOsWorkspace
        initialWorkspace={activeWorkspace ?? demoWorkspace}
        backendState={backendState}
        // Keep the demo backed by Convex too so audit history and workflow writes are real,
        // while the adapter still selects demo mutations when no tenant is active.
        liveActions={liveActions}
        operatingDepth={operatingDepth ?? undefined}
        operatingActions={operatingActions}
      />
    </div>
  );
}

function DemoPersonaSwitcher({ persona, onSelect }: { persona: DemoPersona; onSelect: (persona: DemoPersona) => void }) {
  return (
    <div className="relative z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/signin" className="flex items-center gap-2 font-bold text-[#224036]">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-[#e8efe8] text-[#224036]"><Sprout size={19} /></span>
            <span>Turf Pro CRM</span>
          </Link>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase text-amber-800">Sample data</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
            Demo profile
            <select
              aria-label="Demo profile"
              className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm font-semibold normal-case text-stone-900 outline-none focus:border-[#315a4d]"
              value={persona}
              onChange={(event) => onSelect(event.target.value as DemoPersona)}
            >
              {demoPersonaOptions.map((option) => <option key={option.id} value={option.id}>{option.shortLabel}</option>)}
            </select>
          </label>
          <Link href="/signin" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-[#224036] px-3 text-sm font-semibold text-white transition hover:bg-[#315a4d]">
            Start with your own data
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function TenantGate({ title, description, action }: { title: string; description: string; action: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f7f1] px-4 py-10 text-stone-950">
      <div className="mx-auto grid max-w-2xl gap-5 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div className="grid h-12 w-12 place-items-center rounded-md bg-[#e8efe8] text-[#224036]">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-normal">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
        </div>
        <div>{action}</div>
      </div>
    </main>
  );
}

function TenantSwitcher({
  organizationRows,
  selectedOrganizationId,
  isDemoMode,
  onSelectOrganization,
  onOpenDemo,
}: {
  organizationRows: Array<{
    organization: {
      _id: Id<"organizations">;
      name: string;
      slug: string;
      billingPlan?: string;
      subscriptionStatus?: string;
    };
    membership: {
      role: Role;
      status: string;
    };
    subscription?: {
      plan: string;
      status: string;
    } | null;
    usage: {
      contacts: number;
      contactLimit?: number | null;
    };
  }>;
  selectedOrganizationId: string;
  isDemoMode: boolean;
  onSelectOrganization: (organizationId: Id<"organizations">) => void;
  onOpenDemo: () => void;
}) {
  return (
    <div className="relative z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-[#224036]">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-[#e8efe8] text-[#224036]">
              <Sprout size={19} />
            </span>
            <span>Turf Pro CRM</span>
          </Link>
          <label className="flex min-w-[260px] flex-1 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600 md:max-w-lg">
            <Briefcase size={16} className="shrink-0 text-[#224036]" />
            <select
              className="min-w-0 flex-1 bg-transparent font-semibold text-stone-900 outline-none"
              value={isDemoMode ? "demo" : selectedOrganizationId}
              onChange={(event) => {
                if (event.target.value === "demo") {
                  onOpenDemo();
                  return;
                }
                onSelectOrganization(event.target.value as Id<"organizations">);
              }}
            >
              {organizationRows.map((row) => (
                <option key={row.organization._id} value={row.organization._id}>
                  {row.organization.name} / {row.organization.slug}
                </option>
              ))}
              <option value="demo">Demo workspace</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isDemoMode ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase text-amber-800">Demo workspace</span>
          ) : (
            organizationRows
              .filter((row) => row.organization._id === selectedOrganizationId)
              .map((row) => (
                <div key={row.organization._id} className="flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-600">
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 uppercase">{roleLabel(row.membership.role)}</span>
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 uppercase">
                    {row.subscription?.plan ?? row.organization.billingPlan ?? "free"} / {row.subscription?.status ?? row.organization.subscriptionStatus ?? "active"}
                  </span>
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 uppercase">
                    {row.usage.contacts}
                    {row.usage.contactLimit ? `/${row.usage.contactLimit}` : ""} contacts
                  </span>
                </div>
              ))
          )}
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </div>
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
  const normalizedInitialWorkspace = useMemo(() => normalizeWorkspaceSnapshot(initialWorkspace), [initialWorkspace]);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>(normalizedInitialWorkspace);
  const [view, setView] = useState<View>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(normalizedInitialWorkspace.customers[0]?.id ?? "");
  const [selectedJobId, setSelectedJobId] = useState(normalizedInitialWorkspace.jobs[0]?.id ?? "");
  const [selectedVisitId, setSelectedVisitId] = useState(normalizedInitialWorkspace.visits[0]?.id ?? "");
  const [leadForm, setLeadForm] = useState<LeadFormState>(() => defaultLeadForm());
  const [leadSubmitState, setLeadSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [leadSubmitMessage, setLeadSubmitMessage] = useState("");
  const [customerActivityForm, setCustomerActivityForm] = useState<ActivityComposerState>(() => defaultActivityComposer());
  const [jobActivityForm, setJobActivityForm] = useState<ActivityComposerState>(() => defaultActivityComposer());
  const [clientOnboardingForm, setClientOnboardingForm] = useState<ClientOnboardingFormState>(() => defaultClientOnboardingForm());
  const [provisionedClients, setProvisionedClients] = useState<ProvisionedClientWorkspace[]>([]);
  const [jobTaskForm, setJobTaskForm] = useState<JobTaskFormState>(() => defaultJobTaskForm());
  const [jobTaskMessage, setJobTaskMessage] = useState<{ state: "success" | "error" | "pending"; message: string } | null>(null);
  const [crewName, setCrewName] = useState("");
  const [issueFlag, setIssueFlag] = useState("");
  const workspaceRef = useRef(normalizedInitialWorkspace);
  const localImportJobsRef = useRef(new Map<string, Array<ImportPreviewUiRow & { id: string }>>());
  const [localOperatingDepth, setLocalOperatingDepth] = useState<OperatingDepth>(() => buildFallbackOperatingDepth(normalizedInitialWorkspace));

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const previousWorkspace = workspaceRef.current;
      setWorkspace((current) => mergeWorkspaceSnapshots(current, normalizedInitialWorkspace));
      setSelectedCustomerId((current) => preserveCustomerSelection(previousWorkspace, normalizedInitialWorkspace, current));
      setSelectedJobId((current) => preserveJobSelection(previousWorkspace, normalizedInitialWorkspace, current));
      setSelectedVisitId((current) => preserveVisitSelection(previousWorkspace, normalizedInitialWorkspace, current));
    });
    return () => {
      cancelled = true;
    };
  }, [normalizedInitialWorkspace]);

  const membersById = useMemo(() => new Map(workspace.members.map((member) => [member.id, member])), [workspace.members]);
  const customersById = useMemo(() => new Map(workspace.customers.map((customer) => [customer.id, customer])), [workspace.customers]);
  const contactsByCustomerId = useMemo(() => {
    const contacts = new Map<string, WorkspaceSnapshot["contacts"]>();
    for (const contact of workspace.contacts) {
      contacts.set(contact.customerId, [...(contacts.get(contact.customerId) ?? []), contact]);
    }
    return contacts;
  }, [workspace.contacts]);
  const propertiesById = useMemo(() => new Map(workspace.properties.map((property) => [property.id, property])), [workspace.properties]);
  const crewsById = useMemo(() => new Map(workspace.crews.map((crew) => [crew.id, crew])), [workspace.crews]);
  const jobsById = useMemo(() => new Map(workspace.jobs.map((job) => [job.id, job])), [workspace.jobs]);
  const fallbackOperatingDepth = useMemo(() => buildFallbackOperatingDepth(workspace), [workspace]);
  const effectiveOperatingDepth = useMemo(() => {
    if (operatingDepth) return normalizeOperatingDepth(operatingDepth, fallbackOperatingDepth);
    const statusByCode = new Map(localOperatingDepth.leadOps.statusSettings.map((setting) => [setting.status, setting]));
    const customStatuses = localOperatingDepth.leadOps.statusSettings.filter((setting) => !fallbackOperatingDepth.leadOps.statusSettings.some((fallback) => fallback.status === setting.status));
    return normalizeOperatingDepth(
      {
        ...fallbackOperatingDepth,
        leadOps: {
          ...fallbackOperatingDepth.leadOps,
          statusSettings: [
            ...fallbackOperatingDepth.leadOps.statusSettings.map((setting) => statusByCode.get(setting.status) ?? setting),
            ...customStatuses,
          ],
        },
        fieldOps: {
          ...fallbackOperatingDepth.fieldOps,
          complianceRecords: [
            ...localOperatingDepth.fieldOps.complianceRecords.filter((record) => record.id.startsWith("local-compliance-")),
            ...fallbackOperatingDepth.fieldOps.complianceRecords,
          ],
        },
        admin: {
          ...fallbackOperatingDepth.admin,
          members: [
            ...localOperatingDepth.admin.members.filter((member) => member.id.startsWith("local-invite-")),
            ...fallbackOperatingDepth.admin.members,
          ],
          auditEvents: [
            ...localOperatingDepth.admin.auditEvents.filter((event) => event.id.startsWith("local-audit-")),
            ...fallbackOperatingDepth.admin.auditEvents,
          ],
        },
        costIntelligence: {
          ...fallbackOperatingDepth.costIntelligence,
          laborRates: [
            ...localOperatingDepth.costIntelligence.laborRates.filter((rate) => rate.id.startsWith("local-labor-")),
            ...fallbackOperatingDepth.costIntelligence.laborRates,
          ],
          vendorCatalogs: [
            ...localOperatingDepth.costIntelligence.vendorCatalogs.filter((item) => item.id.startsWith("local-vendor-")),
            ...fallbackOperatingDepth.costIntelligence.vendorCatalogs,
          ],
        },
        jobCosting: {
          ...fallbackOperatingDepth.jobCosting,
          timesheets: [
            ...localOperatingDepth.jobCosting.timesheets.filter((entry) => entry.id.startsWith("local-timesheet-")),
            ...fallbackOperatingDepth.jobCosting.timesheets,
          ],
        },
        revenue: {
          ...fallbackOperatingDepth.revenue,
          invoices: [
            ...localOperatingDepth.revenue.invoices.filter((invoice) => invoice.id.startsWith("local-invoice-")),
            ...fallbackOperatingDepth.revenue.invoices,
          ],
          payments: [
            ...localOperatingDepth.revenue.payments.filter((payment) => payment.id.startsWith("local-payment-")),
            ...fallbackOperatingDepth.revenue.payments,
          ],
        },
      },
      fallbackOperatingDepth,
    );
  }, [fallbackOperatingDepth, localOperatingDepth, operatingDepth]);

  function appendLocalAudit(input: { action: string; summary: string; entityType: string; entityId: string; actorName?: string; module?: string; changedFields?: string[] }) {
    const createdAt = now();
    setLocalOperatingDepth((current) => ({
      ...current,
      admin: {
        ...current.admin,
        auditEvents: [
          {
            id: `local-audit-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
            action: input.action,
            summary: input.summary,
            entityType: input.entityType,
            entityId: input.entityId,
            actorName: input.actorName ?? "Demo/Admin",
            module: input.module ?? "System / automation",
            exportState: "not_exported",
            changedFields: input.changedFields ?? [],
            createdAt,
          },
          ...current.admin.auditEvents,
        ],
      },
    }));
  }

  function addImportedRowsToWorkspace(rows: Array<ImportPreviewUiRow & { id: string }>) {
    const readyRows = rows.filter((row) => row.status === "ready");
    if (readyRows.length === 0) return;
    const createdAt = now();
    setWorkspace((current) => {
      const customers = [...current.customers];
      const contacts = [...current.contacts];
      const properties = [...current.properties];
      const leads = [...current.leads];
      const opportunities = [...current.opportunities];
      const activities = [...current.activities];
      for (const row of readyRows) {
        const customerId = newId("cust");
        const propertyId = newId("prop");
        const leadId = newId("lead");
        const serviceLine = (row.serviceLine as ServiceCategory | undefined) ?? "maintenance";
        customers.unshift({ id: customerId, name: row.customerName || "Imported customer", type: "residential", status: "prospect", phone: row.phone ?? "", email: row.email ?? "", tags: ["Imported", categoryLabels[serviceLine]], ownerId: "u-amy" });
        contacts.unshift({ id: newId("contact"), customerId, name: row.customerName || "Imported customer", email: row.email, phone: row.phone, roleTitle: "Primary contact", isPrimary: true });
        properties.unshift({ id: propertyId, customerId, label: "Primary property", street: row.street ?? "", city: row.city ?? "", state: row.state ?? "", postalCode: row.postalCode ?? "", notes: "Imported from CSV preview." });
        leads.unshift({ id: leadId, title: `${categoryLabels[serviceLine]} request from ${row.customerName}`, customerId, propertyId, source: row.source ?? "CSV import", status: "new", urgency: "normal", ownerId: "u-amy", leadType: "form", accountType: "residential", programRequests: [serviceLine], qualityScore: 82, spamScore: 0, receivedAt: createdAt, createdAt });
        opportunities.unshift({ id: newId("opp"), leadId, customerId, propertyId, title: `${categoryLabels[serviceLine]} request from ${row.customerName}`, stage: "qualified", valueCents: 150000, closeProbability: 30, expectedCloseDate: createdAt + 14 * 24 * 60 * 60 * 1000, ownerId: "u-amy", serviceLines: [serviceLine], updatedAt: createdAt });
        activities.unshift({ id: newId("act"), entityType: "lead", entityId: leadId, kind: "system", summary: `Imported lead ${row.customerName}`, actorId: "u-amy", occurredAt: createdAt });
      }
      return { ...current, customers, contacts, properties, leads, opportunities, activities };
    });
  }

  const localOperatingActions: OperatingActions = {
    updateLead: (leadId, fields) => {
      setWorkspace((current) => ({
        ...current,
        leads: current.leads.map((lead) => lead.id === leadId ? {
          ...lead,
          status: (fields.status as typeof lead.status | undefined) ?? lead.status,
          qualityScore: fields.grade ? ({ a: 92, b: 78, c: 64, d: 48, f: 20 }[fields.grade] ?? lead.qualityScore) : lead.qualityScore,
        } : lead),
      }));
    },
    bulkUpdateLeads: (leadIds, status) => {
      const selected = new Set(leadIds);
      setWorkspace((current) => ({ ...current, leads: current.leads.map((lead) => selected.has(lead.id) ? { ...lead, status: status as typeof lead.status } : lead) }));
    },
    createLeadImportPreview: async ({ fileName, csvText }) => {
      const rows = parseLeadImportCsv(csvText, {
        currentContactCount: workspaceRef.current.contacts.length,
        freeContactLimit: Number.MAX_SAFE_INTEGER,
        serviceTerritory: ["Foxborough", "Mansfield", "Sharon"],
      }).map((row) => ({ ...row, id: `local-import-row-${row.rowNumber}` }));
      const importJobId = `local-import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      localImportJobsRef.current.set(importJobId, rows);
      appendLocalAudit({ action: "import.preview", summary: `Prepared ${fileName ?? "CSV"} for import`, entityType: "import_job", entityId: importJobId, changedFields: ["rows", "status"] });
      return { importJobId, rows };
    },
    commitLeadImportRows: async (importJobId) => {
      const rows = localImportJobsRef.current.get(importJobId) ?? [];
      addImportedRowsToWorkspace(rows);
      const result = {
        imported: rows.filter((row) => row.status === "ready").length,
        skipped: rows.filter((row) => row.status === "needs_review").length,
        failed: rows.filter((row) => row.status === "blocked").length,
      };
      appendLocalAudit({ action: "import.commit", summary: `Committed sample import ${importJobId}`, entityType: "import_job", entityId: importJobId, changedFields: ["status"] });
      return result;
    },
    submitWebLead: async (input) => {
      const createdAt = now();
      const customerId = newId("cust");
      const propertyId = newId("prop");
      const leadId = newId("lead");
      const solicitation = /unsubscribe|business opportunity|generate leads/i.test(input.message);
      const spamScore = solicitation ? 72 : 4;
      const leadStatus = solicitation ? "disqualified" as const : "new" as const;
      const submissionStatus = solicitation ? "spam" : "new";
      setWorkspace((current) => ({
        ...current,
        customers: [{ id: customerId, name: input.customerName, type: "residential", status: "prospect", phone: input.phone, email: input.email, tags: [categoryLabels[input.serviceLine], "Website"], ownerId: "u-amy" }, ...current.customers],
        contacts: [{ id: newId("contact"), customerId, name: input.customerName, email: input.email, phone: input.phone, roleTitle: "Primary contact", isPrimary: true }, ...current.contacts],
        properties: [{ id: propertyId, customerId, label: "Primary property", street: input.street, city: input.city, state: input.state, postalCode: input.postalCode, notes: `Captured from ${input.campaign || "website form"}.` }, ...current.properties],
        leads: [{ id: leadId, title: `${categoryLabels[input.serviceLine]} request from ${input.customerName}`, customerId, propertyId, source: input.sourceDetail || "Website", status: leadStatus, urgency: "normal", ownerId: "u-amy", leadType: "form", accountType: "residential", programRequests: [input.serviceLine], message: input.message, qualityScore: 86, spamScore, receivedAt: createdAt, createdAt }, ...current.leads],
        opportunities: solicitation ? current.opportunities : [{ id: newId("opp"), leadId, customerId, propertyId, title: `${categoryLabels[input.serviceLine]} request from ${input.customerName}`, stage: "qualified", valueCents: dollarsToCents(input.estimatedValue), closeProbability: 30, expectedCloseDate: createdAt + 14 * 24 * 60 * 60 * 1000, ownerId: "u-amy", serviceLines: [input.serviceLine], updatedAt: createdAt }, ...current.opportunities],
      }));
      return { leadId, submissionId: newId("submission"), spamScore, spamReasons: solicitation ? ["Solicitation language"] : [], status: submissionStatus };
    },
    runStaleLeadCheck: async () => ({ inserted: Math.max(1, effectiveOperatingDepth.leadOps.metrics.slaOverdue) }),
    updateMemberRole: (membershipId, role) => setLocalOperatingDepth((current) => ({ ...current, admin: { ...current.admin, members: current.admin.members.map((member) => member.id === membershipId ? { ...member, role } : member) } })),
    inviteMember: async (input) => {
      const id = `local-invite-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setLocalOperatingDepth((current) => ({ ...current, admin: { ...current.admin, members: [{ id, userId: `local-user-${input.email}`, name: input.name ?? input.email, email: input.email, role: input.role, status: "invited" }, ...current.admin.members] } }));
      appendLocalAudit({ action: "member.invite", summary: `Invited ${input.email} as ${input.role}`, entityType: "organization", entityId: "local-demo", actorName: "Admin", module: "Admin", changedFields: ["memberships"] });
    },
    expireMemberInvite: (membershipId) => setLocalOperatingDepth((current) => ({ ...current, admin: { ...current.admin, members: current.admin.members.map((member) => member.id === membershipId ? { ...member, status: "expired" } : member) } })),
    revokeMemberInvite: (membershipId) => setLocalOperatingDepth((current) => ({ ...current, admin: { ...current.admin, members: current.admin.members.map((member) => member.id === membershipId ? { ...member, status: "revoked" } : member) } })),
    upsertLeadStatusSetting: (input) => {
      setLocalOperatingDepth((current) => {
        const next = { ...input, id: input.id ?? `local-status-${input.status}` };
        const exists = current.leadOps.statusSettings.some((setting) => setting.status === input.status);
        return { ...current, leadOps: { ...current.leadOps, statusSettings: exists ? current.leadOps.statusSettings.map((setting) => setting.status === input.status ? next : setting) : [...current.leadOps.statusSettings, next] } };
      });
      appendLocalAudit({ action: "workflow_status.update", summary: `Updated workflow status ${input.label}`, entityType: "organization", entityId: "local-demo", actorName: "Admin", module: "Admin", changedFields: ["label", "color", "sortOrder", "terminal", "active"] });
    },
    upsertLaborRate: (input) => setLocalOperatingDepth((current) => ({ ...current, costIntelligence: { ...current.costIntelligence, laborRates: [{ id: input.id ?? `local-labor-${Date.now()}`, name: input.roleName, roleName: input.roleName, source: "Admin override", hourlyCostCents: input.hourlyCostCents, billableRateCents: input.billableRateCents, active: true }, ...current.costIntelligence.laborRates.filter((rate) => rate.id !== input.id && rate.roleName !== input.roleName)] } })),
    upsertVendorCatalogItem: (input) => setLocalOperatingDepth((current) => ({ ...current, costIntelligence: { ...current.costIntelligence, vendorCatalogs: [{ id: input.id ?? `local-vendor-${Date.now()}`, vendorName: input.vendorName, itemName: input.itemName, category: input.category, unit: input.unit, unitCostCents: input.unitCostCents, source: "Admin override", active: true }, ...current.costIntelligence.vendorCatalogs.filter((item) => item.id !== input.id && item.itemName !== input.itemName)] } })),
    addTimesheetEntry: (jobId, roleName, hours, hourlyCostCents) => setLocalOperatingDepth((current) => ({ ...current, jobCosting: { ...current.jobCosting, timesheets: [{ id: `local-timesheet-${Date.now()}`, jobTitle: workspaceRef.current.jobs.find((job) => job.id === jobId)?.title ?? "Demo job", roleName, hours, totalCostCents: Math.round(hours * hourlyCostCents), status: "approved" }, ...current.jobCosting.timesheets] } })),
    recordCustomerPayment: (invoiceId, amountCents, method, reference) => setLocalOperatingDepth((current) => {
      const invoice = current.revenue.invoices.find((item) => item.id === invoiceId);
      if (!invoice) return current;
      return { ...current, revenue: { ...current.revenue, invoices: current.revenue.invoices.map((item) => item.id === invoiceId ? { ...item, paidCents: Math.min(item.totalCents, item.paidCents + amountCents), balanceCents: Math.max(0, item.balanceCents - amountCents) } : item), payments: [{ id: `local-payment-${Date.now()}`, invoiceId, customerName: invoice.customerName, status: "posted", method, amountCents, receivedAt: now(), reference }, ...current.revenue.payments] } };
    }),
    generateInvoiceFromJob: async (jobId, status = "sent", dueInDays = 14) => {
      const job = workspaceRef.current.jobs.find((item) => item.id === jobId);
      const customer = job ? workspaceRef.current.customers.find((item) => item.id === job.customerId) : undefined;
      const totalCents = effectiveOperatingDepth.jobCosting.summaries.find((summary) => summary.jobId === jobId)?.actualRevenueCents ?? 250000;
      const invoiceId = `local-invoice-${Date.now()}`;
      const invoiceNumber = `INV-DEMO-${String(Date.now()).slice(-6)}`;
      setLocalOperatingDepth((current) => ({ ...current, revenue: { ...current.revenue, invoices: [{ id: invoiceId, customerId: job?.customerId ?? "", jobId, invoiceNumber, customerName: customer?.name ?? "Demo customer", jobTitle: job?.title ?? "Demo job", status, totalCents, paidCents: 0, balanceCents: totalCents, dueAt: now() + dueInDays * 24 * 60 * 60 * 1000 }, ...current.revenue.invoices] } }));
      return { invoiceId, invoiceNumber, created: true, totalCents, balanceCents: totalCents };
    },
    closeJob: async (jobId) => {
      setWorkspace((current) => ({ ...current, jobs: current.jobs.map((job) => job.id === jobId ? { ...job, status: "completed" } : job) }));
      return { jobId, status: "completed" };
    },
    generateComplianceRecord: async (visitId) => {
      const visit = workspaceRef.current.visits.find((item) => item.id === visitId);
      const job = visit ? workspaceRef.current.jobs.find((item) => item.id === visit.jobId) : undefined;
      const customer = visit ? workspaceRef.current.customers.find((item) => item.id === visit.customerId) : undefined;
      const property = visit ? workspaceRef.current.properties.find((item) => item.id === visit.propertyId) : undefined;
      const id = `local-compliance-${Date.now()}`;
      setLocalOperatingDepth((current) => ({ ...current, fieldOps: { ...current.fieldOps, complianceRecords: [{ id, reportNumber: `CMP-DEMO-${String(Date.now()).slice(-5)}`, visitId, jobTitle: job?.title ?? "Demo visit", customerName: customer?.name ?? "Demo customer", propertyName: property?.label ?? "Primary property", siteAddress: property ? `${property.street}, ${property.city}, ${property.state} ${property.postalCode}` : "Address unavailable", materialName: "Demo material application", restrictedUse: false, quantity: 1.5, unit: "gal", targetArea: "Target treatment area", applicator: "Field technician", weatherSummary: "Dry, 68 F, wind 4 mph", applicationRisk: "low", generatedAt: now(), ready: false, missing: ["EPA registration number"] }, ...current.fieldOps.complianceRecords] } }));
      return { visitId, recordCount: 1, ready: false, missing: ["EPA registration number"] };
    },
    recalculateJobCosts: () => undefined,
    refreshCostIntelligence: () => undefined,
    priceFertilizationProgram: async (input) => {
      const property = workspaceRef.current.properties.find((item) => item.id === input.propertyId);
      const material = workspaceRef.current.materials.find((item) => item.id === input.materialId);
      const output = calculateFertilizationProgramPricing({
        ...input,
        turfAreaSqFt: property?.lawnSizeSqFt ?? 10000,
        materialUnitCostCents: material?.costCents ?? 7300,
        priceBookRateCentsPerSqFt: 1.8,
        minPriceCents: 62000,
      });
      return { sessionId: `local-pricing-${Date.now()}`, output, estimateLineItemPreview: input.estimateLineItemName ? { name: input.estimateLineItemName, quantity: 1, unit: input.estimateLineItemUnit ?? "program", unitPriceCents: input.estimateLineItemUnitPriceCents ?? 0 } : undefined };
    },
    decideEstimateApproval: async (approvalRequestId, decision) => ({ approvalRequestId, status: decision }),
  };
  const effectiveOperatingActions = operatingActions ?? localOperatingActions;

  const dashboard = useMemo(() => {
    const openOpps = workspace.opportunities.filter((opp) => !["won", "lost"].includes(opp.stage));
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = todayStart.getTime() + 24 * 60 * 60 * 1000;
    return {
      pipelineValue: openOpps.reduce((sum, opp) => sum + opp.valueCents, 0),
      todayVisits: workspace.visits
        .filter((visit) => visit.scheduledStart >= todayStart.getTime() && visit.scheduledStart < tomorrow)
        .sort((left, right) => left.scheduledStart - right.scheduledStart),
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

  async function createLead(event: FormEvent) {
    event.preventDefault();
    setLeadSubmitState("submitting");
    setLeadSubmitMessage("");

    const createdAt = now();
    const valueCents = Math.max(0, Math.round(Number(leadForm.value || "0") * 100));
    const source = leadForm.source.trim() || "Manual entry";
    const lawnSizeSqFt = numericOrUndefined(leadForm.lawnSizeSqFt);
    const qualityScore = leadQualityScore(leadForm);
    const followUpDueInDays = Math.max(1, Math.min(30, Math.round(Number(leadForm.followUpDueInDays || "1"))));
    const callOutcomeLabel = callOutcomeLabels[leadForm.callOutcome];
    const shouldLogCall = leadForm.leadType === "phone_call";
    const leadInput = {
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
      callOutcome: shouldLogCall ? leadForm.callOutcome : undefined,
      createCallFollowUp: shouldLogCall && leadForm.createCallFollowUp,
      followUpDueInDays,
    };

    let liveIds: { customerId?: string; leadId?: string; opportunityId?: string } = {};
    if (liveActions?.createLead) {
      try {
        liveIds = (await liveActions.createLead(leadInput)) ?? {};
      } catch (error) {
        setLeadSubmitState("error");
        setLeadSubmitMessage(userFacingWriteError(error));
        return;
      }
    }

    const customerId = liveIds.customerId ?? newId("cust");
    const contactId = newId("contact");
    const propertyId = newId("prop");
    const leadId = liveIds.leadId ?? newId("lead");
    const opportunityId = liveIds.opportunityId ?? newId("opp");
    const callActivitySummary = `Phone intake: ${callOutcomeLabel}${leadInput.message ? ` - ${leadInput.message}` : ""}`;

    setWorkspace((current) => ({
      ...current,
      customers: [
        {
          id: customerId,
          name: leadInput.customerName,
          type: leadInput.accountType,
          status: "prospect",
          phone: leadForm.phone,
          email: leadForm.email,
          tags: [categoryLabels[leadInput.serviceLine], source],
          ownerId: "u-amy",
        },
        ...current.customers,
      ],
      contacts: [
        {
          id: contactId,
          customerId,
          name: leadInput.customerName,
          email: leadInput.email,
          phone: leadInput.phone,
          roleTitle: leadInput.accountType === "commercial" ? "Primary contact" : "Homeowner",
          isPrimary: true,
        },
        ...current.contacts,
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
          title: leadInput.title,
          customerId,
          propertyId,
          source,
          status: leadInput.leadType === "phone_call" ? "contacted" : "new",
          urgency: leadInput.urgency,
          ownerId: "u-amy",
          leadType: leadInput.leadType,
          accountType: leadInput.accountType,
          companyAssignment: leadInput.companyAssignment,
          programRequests: [leadInput.serviceLine],
          lawnSizeSqFt,
          message: leadInput.message,
          estimateNotes: leadInput.estimateNotes,
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
          title: leadInput.title,
          stage: "qualified",
          valueCents,
          closeProbability: 35,
          expectedCloseDate: createdAt + 14 * 24 * 60 * 60 * 1000,
          ownerId: "u-amy",
          serviceLines: [leadInput.serviceLine],
          updatedAt: createdAt,
        },
        ...current.opportunities,
      ],
      tasks: leadInput.createCallFollowUp
        ? [
            {
              id: newId("task"),
              entityType: "customer",
              entityId: customerId,
              title: `Call follow-up: ${leadInput.title}`,
              status: "open",
              priority: leadInput.urgency === "high" ? "high" : "normal",
              dueAt: createdAt + followUpDueInDays * 24 * 60 * 60 * 1000,
              assignedUserId: "u-amy",
            },
            ...current.tasks,
          ]
        : current.tasks,
      activities: [
        ...(shouldLogCall
          ? [
              {
                id: newId("act"),
                entityType: "customer" as const,
                entityId: customerId,
                kind: "call" as const,
                summary: callActivitySummary,
                actorId: "u-amy",
                occurredAt: createdAt,
              },
            ]
          : []),
        {
          id: newId("act"),
          entityType: "lead",
          entityId: leadId,
          kind: "system",
          summary: `Created lead ${leadInput.title}`,
          actorId: "u-amy",
          occurredAt: createdAt,
        },
        ...current.activities,
      ],
    }));

    setSelectedCustomerId(customerId);
    setLeadSubmitState("success");
    setLeadSubmitMessage(`${leadInput.customerName} was added to Customers, Leads, and Pipeline.`);
    setLeadForm(defaultLeadForm());
  }

  async function createRepeatCustomerLead(input: {
    customerId: string;
    propertyId?: string;
    title: string;
    source: string;
    valueCents: number;
    serviceLine: ServiceCategory;
    message?: string;
  }) {
    const createdAt = now();
    let liveIds: { leadId?: string; opportunityId?: string } = {};
    if (liveActions?.createLeadForCustomer) {
      try {
        liveIds = (await liveActions.createLeadForCustomer(input)) ?? {};
      } catch (error) {
        throw new Error(userFacingWriteError(error));
      }
    }

    const leadId = liveIds.leadId ?? newId("lead");
    const opportunityId = liveIds.opportunityId ?? newId("opp");
    setWorkspace((current) => {
      const property = input.propertyId
        ? current.properties.find((item) => item.id === input.propertyId)
        : current.properties.find((item) => item.customerId === input.customerId);
      if (!property) return current;
      return {
        ...current,
        leads: [
          {
            id: leadId,
            title: input.title,
            customerId: input.customerId,
            propertyId: property.id,
            source: input.source,
            status: "new",
            urgency: "normal",
            ownerId: "u-amy",
            leadType: "other",
            accountType: "residential",
            programRequests: [input.serviceLine],
            message: input.message,
            qualityScore: 86,
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
            customerId: input.customerId,
            propertyId: property.id,
            title: input.title,
            stage: "qualified",
            valueCents: input.valueCents,
            closeProbability: 45,
            expectedCloseDate: createdAt + 10 * 24 * 60 * 60 * 1000,
            ownerId: "u-amy",
            serviceLines: [input.serviceLine],
            updatedAt: createdAt,
          },
          ...current.opportunities,
        ],
        activities: [
          {
            id: newId("act"),
            entityType: "customer",
            entityId: input.customerId,
            kind: "system",
            summary: `Repeat service request created: ${input.title}`,
            actorId: "u-amy",
            occurredAt: createdAt,
          },
          ...current.activities,
        ],
      };
    });

    return { leadId, opportunityId };
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

  async function createQuoteFromOpportunity(input: {
    opportunity: Opportunity;
    status: "draft" | "sent";
    lineItemName: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    terms?: string;
    servicePackageId?: string;
    serviceCatalogItemId?: string;
  }) {
    const createdAt = now();
    const subtotalCents = Math.max(0, Math.round(input.quantity * input.unitPriceCents));
    const fallbackEstimateNumber = `EST-${new Date(createdAt).getFullYear()}-${String(createdAt).slice(-6)}`;
    let liveEstimate: { estimateId?: string; estimateNumber?: string } = {};

    if (liveActions?.createEstimateFromOpportunity) {
      liveEstimate = (await liveActions.createEstimateFromOpportunity({
        opportunityId: input.opportunity.id,
        status: input.status,
        lineItemName: input.lineItemName,
        quantity: input.quantity,
        unit: input.unit,
        unitPriceCents: input.unitPriceCents,
        terms: input.terms,
        servicePackageId: input.servicePackageId,
        serviceCatalogItemId: input.serviceCatalogItemId,
      })) ?? {};
    }

    const estimateId = liveEstimate.estimateId ?? newId("est");
    const estimateNumberValue = liveEstimate.estimateNumber ?? fallbackEstimateNumber;
    setWorkspace((current) => ({
      ...current,
      estimates: [
        {
          id: estimateId,
          opportunityId: input.opportunity.id,
          customerId: input.opportunity.customerId,
          propertyId: input.opportunity.propertyId,
          estimateNumber: estimateNumberValue,
          status: input.status,
          approvalStatus: "not_required",
          subtotalCents,
          taxCents: 0,
          totalCents: subtotalCents,
          sentAt: input.status === "sent" ? createdAt : undefined,
          expiresAt: input.status === "sent" ? createdAt + 14 * 24 * 60 * 60 * 1000 : undefined,
          terms: input.terms,
        },
        ...current.estimates.filter((estimate) => estimate.id !== estimateId),
      ],
      opportunities: current.opportunities.map((item) =>
        item.id === input.opportunity.id
          ? {
              ...item,
              stage: input.status === "sent" ? "proposal_sent" : "estimating",
              valueCents: subtotalCents,
              updatedAt: createdAt,
            }
          : item,
      ),
      activities: [
        {
          id: newId("act"),
          entityType: "opportunity",
          entityId: input.opportunity.id,
          kind: "estimate",
          summary: `Created ${estimateNumberValue} from lead context`,
          actorId: "u-amy",
          occurredAt: createdAt,
        },
        ...current.activities,
      ],
    }));

    return { estimateId, estimateNumber: estimateNumberValue };
  }

  async function sendQuoteToCustomer(estimateId: string) {
    const sentAt = now();
    const liveResult = await liveActions?.sendEstimateToCustomer?.(estimateId);
    const sentAtValue = liveResult?.sentAt ?? sentAt;
    const expiresAtValue = liveResult?.expiresAt ?? sentAtValue + 14 * 24 * 60 * 60 * 1000;
    let sentEstimateNumber = liveResult?.estimateNumber;

    setWorkspace((current) => {
      const estimate = current.estimates.find((item) => item.id === estimateId);
      if (!estimate) return current;
      sentEstimateNumber = sentEstimateNumber ?? estimate.estimateNumber;
      return {
        ...current,
        estimates: current.estimates.map((item) =>
          item.id === estimateId
            ? {
                ...item,
                status: "sent",
                sentAt: sentAtValue,
                expiresAt: item.expiresAt ?? expiresAtValue,
              }
            : item,
        ),
        opportunities: current.opportunities.map((item) =>
          item.id === estimate.opportunityId
            ? {
                ...item,
                stage: "proposal_sent",
                updatedAt: sentAtValue,
              }
            : item,
        ),
        activities: [
          {
            id: newId("act"),
            entityType: "estimate",
            entityId: estimateId,
            kind: "estimate",
            summary: `Sent ${estimate.estimateNumber} to customer`,
            actorId: "u-amy",
            occurredAt: sentAtValue,
          },
          ...current.activities,
        ],
      };
    });

    return { estimateId, estimateNumber: sentEstimateNumber ?? "Estimate", sentAt: sentAtValue, expiresAt: expiresAtValue };
  }

  async function acceptQuoteFromCustomer(input: {
    estimateId: string;
    acceptedByName?: string;
    acceptedByEmail?: string;
    acceptanceSource?: "customer_portal" | "email" | "verbal" | "office";
    acceptanceNote?: string;
  }) {
    const acceptedAt = now();
    const liveResult = await liveActions?.acceptEstimateFromCustomer?.(input);
    const acceptedAtValue = liveResult?.acceptedAt ?? acceptedAt;
    let acceptedEstimateNumber = liveResult?.estimateNumber;

    setWorkspace((current) => {
      const estimate = current.estimates.find((item) => item.id === input.estimateId);
      if (!estimate) return current;
      acceptedEstimateNumber = acceptedEstimateNumber ?? estimate.estimateNumber;
      return {
        ...current,
        estimates: current.estimates.map((item) =>
          item.id === input.estimateId
            ? {
                ...item,
                status: "accepted",
                acceptedAt: acceptedAtValue,
                acceptedByName: input.acceptedByName,
                acceptedByEmail: input.acceptedByEmail,
                acceptanceSource: input.acceptanceSource ?? "office",
                acceptanceNote: input.acceptanceNote,
              }
            : item,
        ),
        opportunities: current.opportunities.map((item) =>
          item.id === estimate.opportunityId
            ? {
                ...item,
                stage: "won",
                closeProbability: 100,
                updatedAt: acceptedAtValue,
              }
            : item,
        ),
        activities: [
          {
            id: newId("act"),
            entityType: "estimate",
            entityId: input.estimateId,
            kind: "estimate",
            summary: `Customer accepted ${estimate.estimateNumber}`,
            actorId: "u-amy",
            occurredAt: acceptedAtValue,
          },
          ...current.activities,
        ],
      };
    });

    return { estimateId: input.estimateId, estimateNumber: acceptedEstimateNumber ?? "Estimate", acceptedAt: acceptedAtValue };
  }

  async function convertAcceptedQuoteToJob(input: {
    estimateId: string;
    scheduledStart?: number;
    scheduledEnd?: number;
    crewId?: string;
  }) {
    const fallbackStart = (() => {
      const value = new Date(now() + 24 * 60 * 60 * 1000);
      value.setHours(8, 30, 0, 0);
      return value.getTime();
    })();
    const scheduledStart = input.scheduledStart ?? fallbackStart;
    const scheduledEnd = input.scheduledEnd ?? scheduledStart + 2 * 60 * 60 * 1000;
    const liveResult = await liveActions?.convertEstimateToJob?.({
      ...input,
      scheduledStart,
      scheduledEnd,
    });

    let estimateNumberValue = liveResult?.estimateNumber ?? "Estimate";
    let jobIdValue = liveResult?.jobId ?? newId("job");
    let visitIdValue = liveResult?.visitId ?? newId("visit");
    let jobTitleValue = liveResult?.jobTitle ?? "Scheduled job";

    setWorkspace((current) => {
      const estimate = current.estimates.find((item) => item.id === input.estimateId);
      if (!estimate) return current;
      const opportunity = current.opportunities.find((item) => item.id === estimate.opportunityId);
      const existingJob = current.jobs.find((job) => job.estimateId === estimate.id);
      estimateNumberValue = liveResult?.estimateNumber ?? estimate.estimateNumber;
      if (existingJob) {
        const existingVisit = current.visits.find((visit) => visit.jobId === existingJob.id);
        jobIdValue = existingJob.id;
        visitIdValue = existingVisit?.id ?? visitIdValue;
        jobTitleValue = existingJob.title;
        return current;
      }

      const crewId = input.crewId ?? current.crews.find((crew) => crew.active)?.id ?? current.crews[0]?.id ?? "";
      const taskId = newId("task");
      jobTitleValue = liveResult?.jobTitle ?? opportunity?.title ?? `Job from ${estimate.estimateNumber}`;
      const propertyId = estimate.propertyId || opportunity?.propertyId || "";
      const managerId = opportunity?.ownerId ?? current.members[0]?.id ?? "";
      const createdAt = now();

      return {
        ...current,
        jobs: [
          {
            id: jobIdValue,
            customerId: estimate.customerId,
            propertyId,
            opportunityId: estimate.opportunityId,
            estimateId: estimate.id,
            title: jobTitleValue,
            status: "scheduled",
            priority: "normal",
            managerId,
            startDate: scheduledStart,
          },
          ...current.jobs,
        ],
        jobPhases: [
          { id: newId("phase"), jobId: jobIdValue, name: "Sales handoff", status: "scheduled", sortOrder: 1, startDate: createdAt, dueDate: scheduledStart },
          { id: newId("phase"), jobId: jobIdValue, name: "Production visit", status: "scheduled", sortOrder: 2, startDate: scheduledStart, dueDate: scheduledEnd },
          { id: newId("phase"), jobId: jobIdValue, name: "Completion review", status: "scheduled", sortOrder: 3, startDate: scheduledEnd, dueDate: scheduledEnd + 2 * 60 * 60 * 1000 },
          ...current.jobPhases,
        ],
        visits: [
          {
            id: visitIdValue,
            jobId: jobIdValue,
            customerId: estimate.customerId,
            propertyId,
            scheduledStart,
            scheduledEnd,
            status: "scheduled",
            routeOrder: 1,
            crewId,
            checklist: [
              { id: "handoff-1", label: "Confirm approved estimate scope", isDone: false },
              { id: "handoff-2", label: "Complete approved service scope", isDone: false },
              { id: "handoff-3", label: "Record product and EPA label", isDone: false },
              { id: "handoff-4", label: "Capture completion photos", isDone: false },
            ],
            notes: `Created from approved estimate ${estimate.estimateNumber}.`,
          },
          ...current.visits,
        ],
        tasks: [
          {
            id: taskId,
            entityType: "job",
            entityId: jobIdValue,
            title: "Confirm schedule and crew handoff",
            status: "open",
            priority: "high",
            dueAt: Math.max(createdAt, scheduledStart - 4 * 60 * 60 * 1000),
            assignedUserId: managerId,
          },
          ...current.tasks,
        ],
        opportunities: current.opportunities.map((item) =>
          item.id === estimate.opportunityId
            ? {
                ...item,
                stage: "won",
                closeProbability: 100,
                updatedAt: createdAt,
              }
            : item,
        ),
        activities: [
          {
            id: newId("act"),
            entityType: "job",
            entityId: jobIdValue,
            kind: "system",
            summary: `Converted ${estimate.estimateNumber} to job ${jobTitleValue}`,
            actorId: managerId,
            occurredAt: createdAt,
          },
          ...current.activities,
        ],
      };
    });
    setSelectedJobId(jobIdValue);
    setSelectedVisitId(visitIdValue);

    return { estimateId: input.estimateId, estimateNumber: estimateNumberValue, jobId: jobIdValue, visitId: visitIdValue, jobTitle: jobTitleValue };
  }

  function assignCrew(visitId: string, crewId: string) {
    setWorkspace((current) => ({
      ...current,
      visits: current.visits.map((visit) => (visit.id === visitId ? { ...visit, crewId } : visit)),
    }));
    liveActions?.assignVisit?.(visitId, crewId);
  }

  function moveRouteStop(visitId: string, direction: "up" | "down") {
    const orderedVisits = workspaceRef.current.visits
      .slice()
      .sort((a, b) => a.routeOrder - b.routeOrder || a.scheduledStart - b.scheduledStart || a.id.localeCompare(b.id));
    const currentIndex = orderedVisits.findIndex((visit) => visit.id === visitId);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedVisits.length) return;

    const nextVisits = [...orderedVisits];
    const [target] = nextVisits.splice(currentIndex, 1);
    nextVisits.splice(nextIndex, 0, target);
    const nextRouteOrders = new Map(nextVisits.map((visit, index) => [visit.id, index + 1]));

    setWorkspace((current) => ({
      ...current,
      visits: current.visits.map((visit) => ({
        ...visit,
        routeOrder: nextRouteOrders.get(visit.id) ?? visit.routeOrder,
      })),
    }));

    for (const [id, routeOrder] of nextRouteOrders) {
      const previous = workspaceRef.current.visits.find((visit) => visit.id === id);
      if (previous && previous.routeOrder !== routeOrder) {
        liveActions?.reorderVisit?.(id, routeOrder);
      }
    }
  }

  async function generateRecurringRoute(input: {
    jobId: string;
    frequency: "weekly" | "biweekly" | "monthly" | "seasonal" | "custom";
    count: number;
    firstStart: number;
    durationMinutes: number;
    crewId?: string;
  }) {
    const intervalDaysByFrequency = { weekly: 7, biweekly: 14, monthly: 28, seasonal: 90, custom: 7 } as const;
    const count = Math.max(1, Math.min(26, Math.round(input.count)));
    const durationMinutes = Math.max(30, Math.min(12 * 60, Math.round(input.durationMinutes)));
    const intervalDays = intervalDaysByFrequency[input.frequency];
    const liveResult = await liveActions?.generateRecurringRoute?.({ ...input, count, durationMinutes });
    const planId = liveResult?.planId ?? newId("rsp");
    const visitIds = liveResult?.visitIds ?? Array.from({ length: count }, () => newId("visit"));
    const generatedAt = now();
    let generatedCount = liveResult?.generatedCount ?? count;

    setWorkspace((current) => {
      const job = current.jobs.find((item) => item.id === input.jobId);
      if (!job) return current;
      const generatedVisits = visitIds.map((visitId, index) => {
        const scheduledStart = input.firstStart + index * intervalDays * 24 * 60 * 60 * 1000;
        const crewId = input.crewId ?? current.crews.find((crew) => crew.active)?.id ?? "";
        const routeOrder = current.visits
          .filter((visit) => sameCalendarDay(visit.scheduledStart, scheduledStart) && visit.crewId === crewId)
          .reduce((max, visit) => Math.max(max, visit.routeOrder), 0) + 1;
        return {
          id: visitId,
          jobId: job.id,
          customerId: job.customerId,
          propertyId: job.propertyId,
          scheduledStart,
          scheduledEnd: scheduledStart + durationMinutes * 60 * 1000,
          status: "scheduled" as const,
          routeOrder,
          crewId,
          checklist: [
            { id: "recurring-1", label: "Confirm recurring scope and property access", isDone: false },
            { id: "recurring-2", label: "Complete scheduled recurring service", isDone: false },
            { id: "recurring-3", label: "Log materials, issues, and customer notes", isDone: false },
          ],
          notes: `Generated from recurring plan ${planId}.`,
        };
      });
      generatedCount = generatedVisits.length;
      const nextRunAt = liveResult?.nextRunAt ?? input.firstStart + generatedCount * intervalDays * 24 * 60 * 60 * 1000;
      return {
        ...current,
        jobs: current.jobs.map((item) => (item.id === job.id ? { ...item, recurrence: input.frequency } : item)),
        recurringServicePlans: [
          {
            id: planId,
            customerId: job.customerId,
            propertyId: job.propertyId,
            jobId: job.id,
            crewId: input.crewId,
            name: `${job.title} ${input.frequency} route`,
            frequency: input.frequency,
            intervalDays,
            visitDurationMinutes: durationMinutes,
            nextRunAt,
            lastGeneratedAt: generatedAt,
            generatedVisitIds: visitIds,
            status: "active",
          },
          ...current.recurringServicePlans,
        ],
        visits: [...current.visits, ...generatedVisits],
        activities: [
          {
            id: newId("act"),
            entityType: "job",
            entityId: job.id,
            kind: "system",
            summary: `Generated ${generatedCount} ${input.frequency} visits for ${job.title}`,
            actorId: job.managerId,
            occurredAt: generatedAt,
          },
          ...current.activities,
        ],
      };
    });

    return { planId, visitIds, generatedCount };
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

  async function startFieldVisit(visit: JobVisit) {
    const result = await liveActions?.startVisit?.(visit.id, "manual");
    setWorkspace((current) => ({
      ...current,
      visits: current.visits.map((item) => (item.id === visit.id ? { ...item, status: "on_site" } : item)),
      activities: [
        {
          id: newId("act"),
          entityType: "visit",
          entityId: visit.id,
          kind: "visit",
          summary: "Started field visit",
          actorId: "u-nina",
          occurredAt: result?.startedAt ?? now(),
        },
        ...current.activities,
      ],
    }));
    return result;
  }

  async function submitVisit(
    visit: JobVisit,
    input?: {
      notes?: string;
      issue?: FieldIssueSubmitInput;
      materialApplications?: Array<{ materialId: string; quantity: number; unit: string; targetAreaId?: string; notes?: string }>;
    },
  ) {
    const result = await liveActions?.submitVisit?.(visit.id, {
      issueFlag: issueFlag || undefined,
      issue: input?.issue,
      notes: input?.notes,
      materialApplications: input?.materialApplications,
    });
    const completedAt = now();
    const issue = input?.issue;
    const issueTaskTitle = issue ? `${fieldIssueCategoryLabel(issue.category)}: ${issue.summary}` : issueFlag;
    setWorkspace((current) => ({
      ...current,
      visits: current.visits.map((item) => (item.id === visit.id ? { ...item, status: "complete", notes: input?.notes ?? item.notes } : item)),
      tasks: issue
        ? [
            {
              id: newId("task"),
              entityType: "visit",
              entityId: visit.id,
              title: issueTaskTitle,
              description: issue.details,
              status: "open",
              priority: issue.severity === "low" ? "low" : issue.severity === "normal" ? "normal" : "high",
              dueAt: now() + (issue.severity === "urgent" ? 4 : 24) * 60 * 60 * 1000,
              assignedUserId: "u-justin",
            },
            ...current.tasks,
          ]
        : current.tasks,
      opportunities: issue?.createOpportunity
        ? [
            {
              id: result?.issueOpportunityId ?? newId("opp"),
              customerId: visit.customerId,
              propertyId: visit.propertyId,
              title: `Field upsell: ${issue.summary}`,
              stage: "qualified",
              valueCents: issue.estimatedValueCents ?? 0,
              closeProbability: 35,
              expectedCloseDate: completedAt + 7 * 24 * 60 * 60 * 1000,
              ownerId: "u-nina",
              serviceLines: [issue.serviceCategory ?? "maintenance"],
              updatedAt: completedAt,
            },
            ...current.opportunities,
          ]
        : current.opportunities,
      activities: [
        {
          id: newId("act"),
          entityType: "visit",
          entityId: visit.id,
          kind: "visit",
          summary: issue ? `Field issue flagged: ${issue.summary}` : `Completed ${jobsById.get(visit.jobId)?.title ?? "visit"}`,
          actorId: "u-nina",
          occurredAt: completedAt,
        },
        ...current.activities,
      ],
    }));
    setIssueFlag("");
    return result;
  }

  async function addJobTask(event: FormEvent) {
    event.preventDefault();
    const title = jobTaskForm.title.trim();
    if (!title || !selectedJob) return;
    const dueInDays = Math.max(0, Math.min(365, Math.round(Number(jobTaskForm.dueInDays || "0"))));
    const dueAt = now() + dueInDays * 24 * 60 * 60 * 1000;
    const currentMembers = workspaceRef.current.members;
    const selectedManagerIsValid = currentMembers.some((member) => member.id === selectedJob.managerId);
    const assignedUserId = jobTaskForm.assignedUserId || (selectedManagerIsValid ? selectedJob.managerId : currentMembers[0]?.id) || "";
    setJobTaskMessage({ state: "pending", message: `Creating task ${title}.` });
    try {
      const liveTaskId = await liveActions?.addTask?.(selectedJob.id, {
        title,
        priority: jobTaskForm.priority,
        dueAt,
        assignedUserId: assignedUserId || undefined,
      });
      setWorkspace((current) => ({
        ...current,
        tasks: [
          {
            id: typeof liveTaskId === "string" ? liveTaskId : newId("task"),
            entityType: "job",
            entityId: selectedJob.id,
            title,
            status: "open",
            priority: jobTaskForm.priority,
            dueAt,
            assignedUserId,
          },
          ...current.tasks,
        ],
      }));
      setJobTaskForm((current) => ({ ...current, title: "" }));
      setJobTaskMessage({ state: "success", message: `Task ${title} assigned to ${membersById.get(assignedUserId)?.name ?? "team"}.` });
    } catch (error) {
      setJobTaskMessage({ state: "error", message: error instanceof Error ? error.message : "Task could not be created." });
    }
  }

  async function createJobChangeOrder(input: {
    jobId: string;
    title: string;
    description: string;
    requestedByName?: string;
    revenueDeltaCents: number;
    estimatedCostDeltaCents: number;
    scheduleImpactDays: number;
  }) {
    const job = workspaceRef.current.jobs.find((item) => item.id === input.jobId);
    if (!job) throw new Error("Job not found.");
    const liveResult = await liveActions?.createChangeOrder?.(input);
    const changeOrderId = typeof liveResult === "string" ? liveResult : liveResult?.changeOrderId ?? newId("co");
    const requestedAt = now();
    const grossProfitDeltaCents = input.revenueDeltaCents - input.estimatedCostDeltaCents;
    const grossMarginPercent = input.revenueDeltaCents > 0 ? Math.round((grossProfitDeltaCents / input.revenueDeltaCents) * 1000) / 10 : 0;
    setWorkspace((current) => ({
      ...current,
      changeOrders: [
        {
          id: changeOrderId,
          jobId: job.id,
          customerId: job.customerId,
          propertyId: job.propertyId,
          estimateId: job.estimateId,
          title: input.title,
          description: input.description,
          status: "pending_approval",
          requestedByName: input.requestedByName,
          revenueDeltaCents: input.revenueDeltaCents,
          estimatedCostDeltaCents: input.estimatedCostDeltaCents,
          grossProfitDeltaCents,
          grossMarginPercent,
          scheduleImpactDays: input.scheduleImpactDays,
          requestedAt,
        },
        ...current.changeOrders,
      ],
      activities: [
        {
          id: newId("act"),
          entityType: "job",
          entityId: job.id,
          kind: "system",
          summary: `Created change order ${input.title}`,
          actorId: job.managerId,
          occurredAt: requestedAt,
        },
        ...current.activities,
      ],
    }));
    return changeOrderId;
  }

  async function approveJobChangeOrder(input: { changeOrderId: string; approvedByName: string; approvedByEmail?: string }) {
    const changeOrder = workspaceRef.current.changeOrders.find((item) => item.id === input.changeOrderId);
    if (!changeOrder) throw new Error("Change order not found.");
    const job = workspaceRef.current.jobs.find((item) => item.id === changeOrder.jobId);
    if (!job) throw new Error("Job not found.");
    const liveResult = await liveActions?.approveChangeOrder?.(input);
    const approvedAt = now();
    const taskId = liveResult?.taskId ?? newId("task");
    setWorkspace((current) => ({
      ...current,
      changeOrders: current.changeOrders.map((item) =>
        item.id === input.changeOrderId
          ? { ...item, status: "approved", approvedByName: input.approvedByName, approvedByEmail: input.approvedByEmail, approvedAt, taskId }
          : item,
      ),
      tasks: [
        {
          id: taskId,
          entityType: "job",
          entityId: job.id,
          title: `Schedule approved change order: ${changeOrder.title}`,
          status: "open",
          priority: changeOrder.scheduleImpactDays > 0 ? "high" : "normal",
          dueAt: approvedAt + Math.max(1, changeOrder.scheduleImpactDays || 1) * 24 * 60 * 60 * 1000,
          assignedUserId: job.managerId,
        },
        ...current.tasks,
      ],
      activities: [
        {
          id: newId("act"),
          entityType: "job",
          entityId: job.id,
          kind: "system",
          summary: `Approved change order ${changeOrder.title}`,
          actorId: job.managerId,
          occurredAt: approvedAt,
        },
        ...current.activities,
      ],
    }));
    return { changeOrderId: input.changeOrderId, taskId };
  }

  function addRecordActivity(
    event: FormEvent,
    target: { entityType: "customer" | "job"; entityId: string; form: ActivityComposerState; reset: (value: ActivityComposerState) => void },
  ) {
    event.preventDefault();
    const summary = target.form.body.trim();
    if (!summary) return;
    const dueInDays = Math.max(1, Math.min(30, Math.round(Number(target.form.dueInDays || "2"))));
    const activitySummary = target.form.kind === "call" ? `Call outcome: ${activityCallOutcomeLabels[target.form.callOutcome]}. ${summary}` : summary;
    const occurredAt = now();
    setWorkspace((current) => ({
      ...current,
      opportunities:
        target.entityType === "customer" && target.form.opportunityImpact !== "none"
          ? current.opportunities.map((opportunity) => {
              const activeCustomerOpportunity = current.opportunities
                .filter((item) => item.customerId === target.entityId && item.stage !== "won" && item.stage !== "lost")
                .sort((a, b) => b.updatedAt - a.updatedAt)[0];
              if (!activeCustomerOpportunity || opportunity.id !== activeCustomerOpportunity.id) return opportunity;
              if (target.form.opportunityImpact === "advance_stage") {
                const nextStage = nextOpportunityStage[opportunity.stage] ?? opportunity.stage;
                return { ...opportunity, stage: nextStage, closeProbability: Math.max(opportunity.closeProbability, nextStage === "won" ? 100 : opportunity.closeProbability + 10), updatedAt: occurredAt };
              }
              if (target.form.opportunityImpact === "increase_probability") {
                return { ...opportunity, closeProbability: Math.min(95, opportunity.closeProbability + 10), updatedAt: occurredAt };
              }
              return { ...opportunity, closeProbability: Math.max(5, opportunity.closeProbability - 15), updatedAt: occurredAt };
            })
          : current.opportunities,
      activities: [
        {
          id: newId("act"),
          entityType: target.entityType,
          entityId: target.entityId,
          kind: target.form.kind,
          summary: activitySummary,
          actorId: "u-amy",
          occurredAt,
        },
        ...current.activities,
      ],
      tasks: target.form.createFollowUp
        ? [
            {
              id: newId("task"),
              entityType: target.entityType,
              entityId: target.entityId,
              title: `Follow up: ${activitySummary.slice(0, 80)}`,
              status: "open",
              priority: "normal",
              dueAt: occurredAt + dueInDays * 24 * 60 * 60 * 1000,
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
      summary: activitySummary,
      createFollowUp: target.form.createFollowUp,
      dueInDays,
      callOutcome: target.form.kind === "call" ? target.form.callOutcome : undefined,
      opportunityImpact: target.form.kind === "call" ? target.form.opportunityImpact : "none",
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

  async function upsertServiceCatalogItem(input: {
    itemId?: string;
    name: string;
    category: ServiceCategory;
    defaultUnit: string;
    defaultPriceCents: number;
    active: boolean;
  }) {
    const liveResult = await liveActions?.upsertServiceCatalogItem?.(input);
    const itemId = typeof liveResult === "string" ? liveResult : input.itemId ?? newId("svc");
    setWorkspace((current) => {
      const nextItem = {
        id: itemId,
        name: input.name,
        category: input.category,
        defaultUnit: input.defaultUnit,
        defaultPriceCents: input.defaultPriceCents,
        active: input.active,
      };
      const exists = current.serviceCatalog.some((item) => item.id === itemId);
      return {
        ...current,
        serviceCatalog: exists
          ? current.serviceCatalog.map((item) => (item.id === itemId ? { ...item, ...nextItem } : item))
          : [nextItem, ...current.serviceCatalog],
      };
    });
    if (!liveActions?.upsertServiceCatalogItem) {
      appendLocalAudit({
        action: input.itemId ? "demo.catalog.update" : "demo.catalog.create",
        summary: `${input.itemId ? "Updated" : "Created"} service ${input.name}`,
        entityType: "service_catalog_item",
        entityId: itemId,
        actorName: "Demo/Admin",
        module: "System / automation",
        changedFields: ["name", "category", "defaultUnit", "defaultPriceCents", "active"],
      });
    }
    return itemId;
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

  const activeNavItem = navItems.find((item) => item.id === view);

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

          <nav className="mt-6 grid gap-5" aria-label="Primary navigation">
            {navGroups.map((group) => (
              <div key={group.label} className="grid gap-1">
                <div className="px-3 pb-1 text-[11px] font-bold uppercase text-stone-400">{group.label}</div>
                {group.items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setView(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-stone-600 transition hover:bg-stone-100",
                      view === item.id && "bg-[#e8efe8] text-[#224036]",
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {backendState.isDemoMode ? (
            <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-3" aria-label="Sample workspace summary">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                <Sprout size={16} />
                Sample workspace
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-200 pt-3 text-center">
                <div><div className="text-sm font-bold">{workspace.contacts.length}</div><div className="text-[10px] uppercase text-stone-500">Contacts</div></div>
                <div><div className="text-sm font-bold">{workspace.jobs.length}</div><div className="text-[10px] uppercase text-stone-500">Jobs</div></div>
                <div><div className="text-sm font-bold">{workspace.visits.length}</div><div className="text-[10px] uppercase text-stone-500">Visits</div></div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-3" aria-label="Workspace plan information">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={16} />
                {backendState.activeMembershipRole ? roleLabel(backendState.activeMembershipRole) : "Workspace member"}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-stone-600">
                <span>{formatStatus(backendState.plan ?? "free")} plan</span>
                <Badge tone={backendState.subscriptionStatus === "active" ? "success" : "neutral"}>{formatStatus(backendState.subscriptionStatus ?? "active")}</Badge>
              </div>
            </div>
          )}
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
                  <h1 className="truncate text-xl font-bold">{activeNavItem?.label ?? "Dashboard"}</h1>
                  <p className="truncate text-sm text-stone-500">{viewDescriptions[view] ?? "Run customer, field, and financial work from one workspace."}</p>
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
            {view === "journeys" && <JourneyAuditView />}
            {view === "lead_ops" && <LeadOpsView operatingDepth={effectiveOperatingDepth} operatingActions={effectiveOperatingActions} />}
            {view === "crm" && (
              <CrmView
                workspace={workspace}
                plan={backendState.plan}
                customerSearch={customerSearch}
                setCustomerSearch={setCustomerSearch}
                selectedCustomer={selectedCustomer}
                setSelectedCustomerId={setSelectedCustomerId}
                membersById={membersById}
                leadForm={leadForm}
                setLeadForm={setLeadForm}
                createLead={createLead}
                createRepeatCustomerLead={createRepeatCustomerLead}
                leadSubmitState={leadSubmitState}
                leadSubmitMessage={leadSubmitMessage}
                activityForm={customerActivityForm}
                setActivityForm={setCustomerActivityForm}
                addActivity={addCustomerActivity}
              />
            )}
            {view === "pipeline" && <PipelineView workspace={workspace} customersById={customersById} moveOpportunity={moveOpportunity} createQuoteFromOpportunity={createQuoteFromOpportunity} sendQuoteToCustomer={sendQuoteToCustomer} acceptQuoteFromCustomer={acceptQuoteFromCustomer} convertAcceptedQuoteToJob={convertAcceptedQuoteToJob} openJob={(jobId) => { setSelectedJobId(jobId); setView("jobs"); }} />}
            {view === "calendar" && (
              <CalendarDayView
                workspace={workspace}
                customersById={customersById}
                propertiesById={propertiesById}
                crewsById={crewsById}
                jobsById={jobsById}
                setSelectedVisitId={setSelectedVisitId}
                setView={setView}
                generateRecurringRoute={generateRecurringRoute}
              />
            )}
            {view === "dispatch" && (
              <DispatchView workspace={workspace} operatingDepth={effectiveOperatingDepth} customersById={customersById} propertiesById={propertiesById} crewsById={crewsById} jobsById={jobsById} assignCrew={assignCrew} moveRouteStop={moveRouteStop} generateRecurringRoute={generateRecurringRoute} />
            )}
            {view === "routing" && (
              <RoutingView
                workspace={workspace}
                operatingDepth={effectiveOperatingDepth}
                customersById={customersById}
                propertiesById={propertiesById}
                jobsById={jobsById}
                setSelectedVisitId={setSelectedVisitId}
                setView={setView}
              />
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
                membersById={membersById}
                jobTaskForm={jobTaskForm}
                setJobTaskForm={setJobTaskForm}
                jobTaskMessage={jobTaskMessage}
                addJobTask={addJobTask}
                activityForm={jobActivityForm}
                setActivityForm={setJobActivityForm}
                addActivity={addJobActivity}
                toggleTask={toggleTask}
                createChangeOrder={createJobChangeOrder}
                approveChangeOrder={approveJobChangeOrder}
                operatingActions={effectiveOperatingActions}
              />
            )}
            {view === "job_analysis" && <JobAnalysisView operatingDepth={effectiveOperatingDepth} setSelectedJobId={setSelectedJobId} setView={setView} />}
            {view === "job_pricer" && <JobsPricerView workspace={workspace} operatingDepth={effectiveOperatingDepth} />}
            {view === "chemicals" && (
              <ChemicalTrackingView
                workspace={workspace}
                operatingDepth={effectiveOperatingDepth}
                propertiesById={propertiesById}
                setSelectedVisitId={setSelectedVisitId}
                setView={setView}
              />
            )}
            {view === "field" && (
              <FieldView
                workspace={workspace}
                operatingDepth={effectiveOperatingDepth}
                selectedVisit={selectedVisit}
                setSelectedVisitId={setSelectedVisitId}
                customersById={customersById}
                contactsByCustomerId={contactsByCustomerId}
                propertiesById={propertiesById}
                crewsById={crewsById}
                jobsById={jobsById}
                issueFlag={issueFlag}
                setIssueFlag={setIssueFlag}
                startVisit={startFieldVisit}
                toggleChecklist={toggleChecklist}
                submitVisit={submitVisit}
                operatingActions={effectiveOperatingActions}
              />
            )}
            {view === "costing" && <CostingView workspace={workspace} operatingDepth={effectiveOperatingDepth} operatingActions={effectiveOperatingActions} />}
            {view === "profit" && <ProfitView operatingDepth={effectiveOperatingDepth} operatingActions={effectiveOperatingActions} />}
            {view === "churn_ltv" && <ChurnLtvDashboard operatingDepth={effectiveOperatingDepth} />}
            {view === "cost_intel" && <CostIntelligenceView operatingDepth={effectiveOperatingDepth} operatingActions={effectiveOperatingActions} />}
            {view === "admin" && (
              <AdminView
                workspace={workspace}
                operatingDepth={effectiveOperatingDepth}
                operatingActions={effectiveOperatingActions}
                membersById={membersById}
                crewName={crewName}
                setCrewName={setCrewName}
                createCrew={createCrew}
                toggleService={toggleService}
                upsertServiceCatalogItem={upsertServiceCatalogItem}
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
                operatingActions={effectiveOperatingActions}
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

function JourneyAuditView() {
  const summary = journeyCoverageSummary();
  const p0Open = customerJourneys.filter((journey) => journey.priority === "P0" && journey.coverage !== "verified");
  const gapJourneys = customerJourneys.filter((journey) => journey.coverage === "gap");

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
              <ClipboardCheck size={16} />
              Customer Journey Audit
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">100 Customer Journey Coverage</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-stone-600">
              This is the operating QA board for the full customer journey list. Each journey is tied to a product surface, backend objects, acceptance criteria, current proof, and the remaining implementation gap so the goal can be burned down without losing scope.
            </p>
          </div>
          <div className="grid gap-2 text-right">
            <div className="text-4xl font-bold text-[#224036]">{summary.verifiedPercent}%</div>
            <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">verified coverage</div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Total journeys" value={`${summary.total} journeys`} />
          <Metric label="Verified" value={summary.byCoverage.verified} tone="success" />
          <Metric label="Interactive" value={summary.byCoverage.interactive} tone="success" />
          <Metric label="Modeled" value={summary.byCoverage.modeled} tone="warning" />
          <Metric label="P0 not verified" value={summary.p0Open} tone={summary.p0Open > 0 ? "danger" : "success"} />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold">Lifecycle Coverage</h2>
            <Badge>{customerJourneyCategories.length} journey groups</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {customerJourneyCategories.map((category) => {
              const journeys = customerJourneys.filter((journey) => journey.categoryId === category.id);
              const verified = journeys.filter((journey) => journey.coverage === "verified").length;
              const interactive = journeys.filter((journey) => journey.coverage === "interactive").length;
              const modeled = journeys.filter((journey) => journey.coverage === "modeled").length;
              const gaps = journeys.filter((journey) => journey.coverage === "gap").length;
              const score = Math.round(((verified + interactive * 0.65 + modeled * 0.35) / journeys.length) * 100);

              return (
                <div key={category.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{category.label}</div>
                      <p className="mt-1 text-sm leading-5 text-stone-500">{category.summary}</p>
                    </div>
                    <Badge tone={score >= 70 ? "success" : score >= 45 ? "warning" : "danger"}>{score}%</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-md bg-emerald-50 p-2 text-emerald-800"><div className="font-bold">{verified}</div><div>verified</div></div>
                    <div className="rounded-md bg-lime-50 p-2 text-lime-800"><div className="font-bold">{interactive}</div><div>live UI</div></div>
                    <div className="rounded-md bg-amber-50 p-2 text-amber-800"><div className="font-bold">{modeled}</div><div>modeled</div></div>
                    <div className="rounded-md bg-rose-50 p-2 text-rose-800"><div className="font-bold">{gaps}</div><div>gaps</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel>
            <h2 className="text-base font-bold">P0 Journey Work Queue</h2>
            <div className="mt-4 grid gap-2">
              {p0Open.length > 0 ? p0Open.slice(0, 12).map((journey) => (
                <div key={journey.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Journey {journey.id} - {journey.priority}</div>
                      <div className="mt-1 font-semibold">{journey.title}</div>
                    </div>
                    <Badge tone={customerJourneyCoverageTone[journey.coverage]}>{customerJourneyCoverageLabels[journey.coverage]}</Badge>
                  </div>
                  <div className="mt-2 text-sm leading-5 text-stone-600">{journey.gaps[0]}</div>
                </div>
              )) : (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
                  All P0 journeys are currently verified. Keep this queue empty by adding tests when critical journeys change.
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">True Product Gaps</h2>
            <div className="mt-4 grid gap-2">
              {gapJourneys.length > 0 ? gapJourneys.map((journey) => (
                <div key={journey.id} className="rounded-md border border-rose-100 bg-rose-50 p-3">
                  <div className="font-semibold text-rose-950">Journey {journey.id}</div>
                  <div className="mt-1 text-sm leading-5 text-rose-900">{journey.title}</div>
                </div>
              )) : (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
                  No journey is currently classified as a product gap.
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">All Journey Evidence</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(summary.byCoverage) as Array<keyof typeof summary.byCoverage>).map((coverage) => (
              <Badge key={coverage} tone={customerJourneyCoverageTone[coverage]}>
                {customerJourneyCoverageLabels[coverage]}: {summary.byCoverage[coverage]}
              </Badge>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          {customerJourneyCategories.map((category) => {
            const journeys = customerJourneys.filter((journey) => journey.categoryId === category.id);

            return (
              <div key={category.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{category.label}</h3>
                    <p className="mt-1 text-sm leading-5 text-stone-500">{category.summary}</p>
                  </div>
                  <Badge>{journeys.length} journeys</Badge>
                </div>
                <div className="mt-3 grid gap-3 xl:grid-cols-2">
                  {journeys.map((journey) => (
                    <article key={journey.id} className="rounded-md border border-stone-200 bg-white p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Journey {journey.id} - {journey.priority} - {journey.actor}</div>
                          <h4 className="mt-1 font-semibold">{journey.title}</h4>
                          <p className="mt-2 text-sm leading-5 text-stone-600">{journey.outcome}</p>
                        </div>
                        <Badge tone={customerJourneyCoverageTone[journey.coverage]}>{customerJourneyCoverageLabels[journey.coverage]}</Badge>
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Surface</div>
                          <div className="mt-1 text-sm font-semibold text-stone-800">{journey.primarySurface}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Backend</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {journey.backendObjects.slice(0, 5).map((object) => (
                              <span key={object} className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-medium text-stone-600">{object}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Acceptance</div>
                          <ul className="mt-2 grid gap-1 text-xs leading-5 text-stone-600">
                            {journey.acceptance.map((item) => <li key={item}>- {item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Evidence</div>
                          <ul className="mt-2 grid gap-1 text-xs leading-5 text-stone-600">
                            {journey.evidence.map((item) => <li key={item}>- {item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Remaining gap</div>
                          <ul className="mt-2 grid gap-1 text-xs leading-5 text-stone-600">
                            {journey.gaps.map((item) => <li key={item}>- {item}</li>)}
                          </ul>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
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
  const [dashboardLens, setDashboardLens] = useState<"owner" | "sales" | "operations" | "field">("owner");
  const [dashboardOpenedAt] = useState(() => Date.now());
  const unassignedVisits = workspace.visits.filter((visit) => !visit.crewId && !["complete", "canceled"].includes(visit.status));
  const staleOpportunities = workspace.opportunities.filter((opportunity) => !["won", "lost"].includes(opportunity.stage) && opportunity.updatedAt < dashboardOpenedAt - 7 * 24 * 60 * 60 * 1000);
  const actionItems = [
    { id: "overdue-tasks", title: `${dashboard.overdueTasks.length} overdue ${dashboard.overdueTasks.length === 1 ? "task" : "tasks"}`, detail: "Close the loop on customer and production commitments.", count: dashboard.overdueTasks.length, view: "jobs" as View, lenses: ["owner", "operations", "field"], urgent: true },
    { id: "stale-opportunities", title: `${staleOpportunities.length} sales ${staleOpportunities.length === 1 ? "follow-up" : "follow-ups"} due`, detail: "Advance, reschedule, or close opportunities that need a next step.", count: staleOpportunities.length, view: "pipeline" as View, lenses: ["owner", "sales"] },
    { id: "unassigned-visits", title: `${unassignedVisits.length} unassigned ${unassignedVisits.length === 1 ? "visit" : "visits"}`, detail: "Assign a crew before the route is released to the field.", count: unassignedVisits.length, view: "dispatch" as View, lenses: ["owner", "operations"] },
    { id: "open-estimates", title: `${dashboard.openEstimates.length} open ${dashboard.openEstimates.length === 1 ? "estimate" : "estimates"}`, detail: "Review aging quotes and capture the next customer decision.", count: dashboard.openEstimates.length, view: "pipeline" as View, lenses: ["owner", "sales"] },
  ].filter((item) => item.lenses.includes(dashboardLens) && item.count > 0);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<DollarSign size={18} />} label="Open pipeline" value={currency(dashboard.pipelineValue)} detail="Review pipeline" onClick={() => setView("pipeline")} />
        <Metric icon={<Route size={18} />} label="Today's visits" value={String(dashboard.todayVisits.length)} detail="Open today's calendar" onClick={() => setView("calendar")} />
        <Metric icon={<FileText size={18} />} label="Open estimates" value={String(dashboard.openEstimates.length)} detail="Review estimates" onClick={() => setView("pipeline")} />
        <Metric icon={<ClipboardCheck size={18} />} label="Overdue tasks" value={String(dashboard.overdueTasks.length)} detail="Review job tasks" onClick={() => setView("jobs")} tone={dashboard.overdueTasks.length ? "danger" : "success"} />
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Operator shortcuts</h2>
            <p className="mt-1 text-sm text-stone-500">Start the next customer, schedule, dispatch, or pricing action.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TextButton icon={<Plus size={16} />} onClick={() => setView("crm")}>Add Lead</TextButton>
            <TextButton variant="secondary" icon={<CalendarDays size={16} />} onClick={() => setView("calendar")}>Day Calendar</TextButton>
            <TextButton variant="secondary" icon={<Route size={16} />} onClick={() => setView("dispatch")}>Dispatch</TextButton>
            <TextButton variant="secondary" icon={<Calculator size={16} />} onClick={() => setView("job_pricer")}>Build Price</TextButton>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">Today’s Route Board</h2>
            <TextButton variant="secondary" icon={<CalendarDays size={16} />} onClick={() => setView("calendar")}>
              Calendar
            </TextButton>
          </div>
          <div className="mt-4 grid gap-2">
            {dashboard.todayVisits.length === 0 ? (
              <div className="grid min-h-40 place-items-center rounded-md border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                <div>
                  <CalendarDays size={22} className="mx-auto text-stone-400" />
                  <div className="mt-3 text-sm font-semibold">No visits scheduled today</div>
                  <p className="mt-1 max-w-md text-sm text-stone-500">Create a lead, approve an estimate, and schedule the first visit to build the route board.</p>
                  <TextButton className="mt-4" variant="secondary" icon={<Plus size={15} />} onClick={() => setView("crm")}>Add the first lead</TextButton>
                </div>
              </div>
            ) : dashboard.todayVisits.map((visit) => {
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Action center</h2>
              <p className="mt-1 text-xs text-stone-500">Prioritized for the selected role.</p>
            </div>
            <select aria-label="Dashboard role" value={dashboardLens} onChange={(event) => setDashboardLens(event.target.value as typeof dashboardLens)} className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm font-semibold text-stone-800">
              <option value="owner">Owner</option>
              <option value="sales">Sales</option>
              <option value="operations">Operations</option>
              <option value="field">Field</option>
            </select>
          </div>
          <div className="mt-4 grid gap-3">
            {actionItems.length === 0 ? (
              <div className="grid min-h-40 place-items-center rounded-md border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                <div>
                  <Check size={22} className="mx-auto text-emerald-600" />
                  <div className="mt-3 text-sm font-semibold">No urgent actions</div>
                  <p className="mt-1 text-sm text-stone-500">This role&apos;s immediate queue is clear.</p>
                </div>
              </div>
            ) : actionItems.map((item) => (
              <button key={item.id} type="button" onClick={() => setView(item.view)} className="group flex items-start gap-3 rounded-md border border-stone-200 p-3 text-left transition hover:border-[#8aa99a] hover:bg-[#f5f8f5]">
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-md text-sm font-bold", "urgent" in item && item.urgent ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>{item.count}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-stone-900">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-stone-500">{item.detail}</span>
                </span>
                <ArrowRight size={16} className="mt-1 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-[#224036]" />
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">Recent activity</h2>
          <Badge>{workspace.activities.length} events</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workspace.activities.length === 0 ? <div className="text-sm text-stone-500">Calls, notes, estimates, schedule changes, and completed visits will appear here.</div> : [...workspace.activities].sort((left, right) => right.occurredAt - left.occurredAt).slice(0, 6).map((activity) => (
            <div key={activity.id} className="flex gap-3 rounded-md border border-stone-200 p-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#224036]" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{activity.summary}</div>
                <div className="mt-1 text-xs text-stone-500">{shortDate(activity.occurredAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function sameCalendarDay(left: number, right: number) {
  return new Date(left).toDateString() === new Date(right).toDateString();
}

function calendarInputDate(value: number) {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

function recurringFrequencyLabel(frequency: WorkspaceSnapshot["recurringServicePlans"][number]["frequency"], intervalDays: number) {
  if (frequency === "weekly") return "Weekly";
  if (frequency === "biweekly") return "Every 2 weeks";
  if (frequency === "monthly") return "Every 4 weeks";
  if (frequency === "seasonal") return "Seasonal";
  return `Every ${intervalDays} days`;
}

function CalendarDayView({
  workspace,
  customersById,
  propertiesById,
  crewsById,
  jobsById,
  setSelectedVisitId,
  setView,
  generateRecurringRoute,
}: {
  workspace: WorkspaceSnapshot;
  customersById: Map<string, WorkspaceSnapshot["customers"][number]>;
  propertiesById: Map<string, WorkspaceSnapshot["properties"][number]>;
  crewsById: Map<string, WorkspaceSnapshot["crews"][number]>;
  jobsById: Map<string, WorkspaceSnapshot["jobs"][number]>;
  setSelectedVisitId: (id: string) => void;
  setView: (view: View) => void;
  generateRecurringRoute: (input: {
    jobId: string;
    frequency: "weekly" | "biweekly" | "monthly" | "seasonal" | "custom";
    count: number;
    firstStart: number;
    durationMinutes: number;
    crewId?: string;
  }) => Promise<{ planId: string; visitIds: string[]; generatedCount: number }>;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [selectedDate, setSelectedDate] = useState(today.getTime());
  const [cadenceJobId, setCadenceJobId] = useState(workspace.jobs[0]?.id ?? "");
  const [cadenceFrequency, setCadenceFrequency] = useState<"weekly" | "biweekly" | "monthly" | "seasonal">("weekly");
  const [cadenceFirstDate, setCadenceFirstDate] = useState(calendarInputDate(today.getTime()));
  const [cadenceStartTime, setCadenceStartTime] = useState("08:00");
  const [cadenceDuration, setCadenceDuration] = useState(60);
  const [cadenceCount, setCadenceCount] = useState(12);
  const [cadenceCrewId, setCadenceCrewId] = useState(workspace.crews.find((crew) => crew.active)?.id ?? "");
  const [cadenceState, setCadenceState] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [cadenceSaving, setCadenceSaving] = useState(false);
  const dayVisits = workspace.visits
    .filter((visit) => sameCalendarDay(visit.scheduledStart, selectedDate))
    .sort((a, b) => a.scheduledStart - b.scheduledStart || a.routeOrder - b.routeOrder);
  const openVisits = dayVisits.filter((visit) => !["complete", "canceled"].includes(visit.status));
  const scheduledHours = dayVisits.reduce((sum, visit) => sum + Math.max(0, visit.scheduledEnd - visit.scheduledStart), 0) / (60 * 60 * 1000);
  const dayRevenue = dayVisits.reduce((sum, visit) => {
    const job = jobsById.get(visit.jobId);
    const estimate = job?.estimateId ? workspace.estimates.find((candidate) => candidate.id === job.estimateId) : undefined;
    return sum + (estimate?.totalCents ?? 0);
  }, 0);
  const routeGroups = Array.from(dayVisits.reduce((groups, visit) => {
    const key = visit.crewId || "unassigned";
    const group = groups.get(key) ?? [];
    group.push(visit);
    groups.set(key, group);
    return groups;
  }, new Map<string, JobVisit[]>())).map(([crewId, visits]) => ({
    crewId,
    crew: crewsById.get(crewId),
    visits: visits.sort((left, right) => left.routeOrder - right.routeOrder || left.scheduledStart - right.scheduledStart),
  })).sort((left, right) => {
    if (left.crewId === "unassigned") return 1;
    if (right.crewId === "unassigned") return -1;
    return (left.crew?.name ?? "").localeCompare(right.crew?.name ?? "");
  });
  const weekStart = new Date(selectedDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date.getTime();
  });

  function moveDay(days: number) {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + days);
      return next.getTime();
    });
  }

  async function createCadence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCadenceState(null);
    if (!cadenceJobId || !cadenceFirstDate || !cadenceStartTime) {
      setCadenceState({ kind: "error", message: "Choose a client job, first service date, and start time." });
      return;
    }
    const firstStart = new Date(`${cadenceFirstDate}T${cadenceStartTime}:00`).getTime();
    if (!Number.isFinite(firstStart)) {
      setCadenceState({ kind: "error", message: "Enter a valid first service date and time." });
      return;
    }
    setCadenceSaving(true);
    try {
      const result = await generateRecurringRoute({
        jobId: cadenceJobId,
        frequency: cadenceFrequency,
        count: cadenceCount,
        firstStart,
        durationMinutes: cadenceDuration,
        crewId: cadenceCrewId || undefined,
      });
      const job = jobsById.get(cadenceJobId);
      const firstDay = new Date(firstStart);
      firstDay.setHours(0, 0, 0, 0);
      setSelectedDate(firstDay.getTime());
      setCadenceState({ kind: "success", message: `${result.generatedCount} ${recurringFrequencyLabel(cadenceFrequency, cadenceFrequency === "weekly" ? 7 : cadenceFrequency === "biweekly" ? 14 : cadenceFrequency === "monthly" ? 28 : 90).toLowerCase()} visits added for ${job?.title ?? "this job"}.` });
    } catch {
      setCadenceState({ kind: "error", message: "The cadence could not be created. Review the schedule and try again." });
    } finally {
      setCadenceSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]"><CalendarDays size={16} />Service calendar</div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">{shortDate(selectedDate)} client routes</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <TextButton variant="secondary" icon={<ChevronLeft size={16} />} onClick={() => moveDay(-1)}>Prev</TextButton>
            <TextButton variant="secondary" icon={<Clock size={16} />} onClick={() => setSelectedDate(today.getTime())}>Today</TextButton>
            <TextButton variant="secondary" icon={<ChevronRight size={16} />} onClick={() => moveDay(1)}>Next</TextButton>
            <input aria-label="Calendar date" type="date" value={calendarInputDate(selectedDate)} onChange={(event) => {
              const next = new Date(`${event.target.value}T00:00:00`).getTime();
              if (Number.isFinite(next)) setSelectedDate(next);
            }} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1" aria-label="Calendar week">
          {weekDays.map((day) => {
            const visitCount = workspace.visits.filter((visit) => sameCalendarDay(visit.scheduledStart, day)).length;
            const active = sameCalendarDay(day, selectedDate);
            return (
              <button key={day} type="button" onClick={() => setSelectedDate(day)} className={cn("min-w-0 rounded-md border px-1 py-2 text-center transition", active ? "border-[#315a4d] bg-[#224036] text-white" : "border-stone-200 bg-white hover:bg-stone-50")}>
                <span className="block text-[10px] font-bold uppercase">{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}</span>
                <span className="mt-1 block text-lg font-bold">{new Date(day).getDate()}</span>
                <span className={cn("mt-1 block text-[10px]", active ? "text-white/75" : "text-stone-500")}>{visitCount} {visitCount === 1 ? "stop" : "stops"}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric label="Visits" value={dayVisits.length} />
          <Metric label="Crews routed" value={routeGroups.filter((group) => group.crewId !== "unassigned").length} />
          <Metric label="Scheduled hours" value={scheduledHours.toFixed(1)} />
          <Metric label="Open stops" value={openVisits.length} tone={openVisits.length ? "warning" : "success"} />
        </div>
        {dayRevenue > 0 ? <div className="mt-3 text-right text-xs font-semibold text-stone-500">Booked job value on this route: {currency(dayRevenue)}</div> : null}
      </Panel>

      <div className="grid items-start gap-4 xl:grid-cols-[1.45fr_0.55fr]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Daily routes</h3>
              <p className="mt-1 text-sm text-stone-500">Every client stop in crew route order.</p>
            </div>
            <Badge>{routeGroups.length} {routeGroups.length === 1 ? "route" : "routes"}</Badge>
          </div>
          <div className="mt-4 grid gap-4">
            {routeGroups.length === 0 ? <div className="rounded-md border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">No client visits on this date. Add a service cadence to build the route.</div> : null}
            {routeGroups.map(({ crewId, crew, visits }) => (
              <section key={crewId} aria-label={`${crew?.name ?? "Unassigned"} route`} className="overflow-hidden rounded-md border border-stone-200">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-3 py-2">
                  <div className="flex items-center gap-2 font-bold"><Route size={16} className="text-[#315a4d]" />{crew?.name ?? "Unassigned route"}</div>
                  <div className="text-xs font-semibold text-stone-500">{visits.length} {visits.length === 1 ? "stop" : "stops"} · {(visits.reduce((sum, visit) => sum + visit.scheduledEnd - visit.scheduledStart, 0) / (60 * 60 * 1000)).toFixed(1)} hrs</div>
                </div>
                <div className="divide-y divide-stone-100">
                  {visits.map((visit, index) => {
                    const job = jobsById.get(visit.jobId);
                    const customer = customersById.get(visit.customerId);
                    const property = visit.propertyId ? propertiesById.get(visit.propertyId) : undefined;
                    const plan = workspace.recurringServicePlans.find((candidate) => candidate.generatedVisitIds?.includes(visit.id))
                      ?? workspace.recurringServicePlans.find((candidate) => candidate.jobId === visit.jobId && candidate.status === "active");
                    const address = property ? `${property.street}, ${property.city}, ${property.state} ${property.postalCode}` : "";
                    return (
                      <div key={visit.id} className="grid gap-3 p-3 lg:grid-cols-[46px_118px_1fr_auto] lg:items-center">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e8efe8] text-sm font-bold text-[#224036]" aria-label={`Stop ${index + 1}`}>{index + 1}</div>
                        <div className="text-sm font-semibold">{timeRange(visit.scheduledStart, visit.scheduledEnd)}</div>
                        <div className="min-w-0">
                          <div className="font-bold">{customer?.name ?? "Customer"}</div>
                          <div className="mt-0.5 text-sm text-stone-600">{job?.title ?? "Service visit"}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                            {property ? <span>{address}</span> : <span>No property address</span>}
                            {plan ? <Badge tone="success">{recurringFrequencyLabel(plan.frequency, plan.intervalDays)}</Badge> : <Badge>One-time</Badge>}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <button type="button" onClick={() => { setSelectedVisitId(visit.id); setView("field"); }} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-bold uppercase text-stone-700 transition hover:border-[#8aa99a] hover:bg-[#eef4ee]">{visitStatusLabel(visit.status)}</button>
                          {property ? <a href={googleMapsUrl(address)} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 text-stone-600 transition hover:bg-stone-50" title={`Open ${customer?.name ?? "customer"} in Google Maps`} aria-label={`Open ${customer?.name ?? "customer"} in Google Maps`}><MapPin size={15} /></a> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2 font-bold"><CalendarDays size={17} className="text-[#315a4d]" />Add service cadence</div>
          <p className="mt-1 text-sm leading-5 text-stone-500">Schedule repeat client visits and place them on crew routes.</p>
          <form className="mt-4 grid gap-3" aria-label="Add service cadence" onSubmit={createCadence}>
            <Field label="Client job">
              <select aria-label="Cadence client job" value={cadenceJobId} onChange={(event) => setCadenceJobId(event.target.value)} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-900">
                {workspace.jobs.length === 0 ? <option value="">No jobs available</option> : workspace.jobs.map((job) => <option key={job.id} value={job.id}>{customersById.get(job.customerId)?.name ?? "Customer"} - {job.title}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Frequency">
                <select aria-label="Cadence frequency" value={cadenceFrequency} onChange={(event) => setCadenceFrequency(event.target.value as typeof cadenceFrequency)} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-900">
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Every 4 weeks</option>
                  <option value="seasonal">Seasonal</option>
                </select>
              </Field>
              <Field label="Visits to create">
                <select aria-label="Cadence visit count" value={cadenceCount} onChange={(event) => setCadenceCount(Number(event.target.value))} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-900">
                  <option value={4}>4 visits</option>
                  <option value={8}>8 visits</option>
                  <option value={12}>12 visits</option>
                  <option value={26}>26 visits</option>
                </select>
              </Field>
            </div>
            <Field label="Crew">
              <select aria-label="Cadence crew" value={cadenceCrewId} onChange={(event) => setCadenceCrewId(event.target.value)} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-900">
                <option value="">Unassigned</option>
                {workspace.crews.filter((crew) => crew.active).map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First service">
                <input aria-label="Cadence first service date" type="date" value={cadenceFirstDate} onChange={(event) => setCadenceFirstDate(event.target.value)} className="h-10 min-w-0 rounded-md border border-stone-200 bg-white px-2 text-sm font-medium text-stone-900" />
              </Field>
              <Field label="Start time">
                <input aria-label="Cadence start time" type="time" value={cadenceStartTime} onChange={(event) => setCadenceStartTime(event.target.value)} className="h-10 min-w-0 rounded-md border border-stone-200 bg-white px-2 text-sm font-medium text-stone-900" />
              </Field>
            </div>
            <Field label="Visit duration (minutes)">
              <input aria-label="Cadence visit duration" type="number" min={30} max={720} step={15} value={cadenceDuration} onChange={(event) => setCadenceDuration(Number(event.target.value))} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-900" />
            </Field>
            {cadenceState ? <div role="status" className={cn("rounded-md border p-3 text-sm", cadenceState.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800")}>{cadenceState.message}</div> : null}
            <TextButton type="submit" icon={<Plus size={16} />} disabled={cadenceSaving || workspace.jobs.length === 0}>{cadenceSaving ? "Adding cadence..." : "Add cadence to calendar"}</TextButton>
          </form>
          {workspace.recurringServicePlans.length > 0 ? (
            <div className="mt-5 border-t border-stone-200 pt-4">
              <div className="text-xs font-bold uppercase text-stone-500">Active cadences</div>
              <div className="mt-2 grid gap-2">
                {workspace.recurringServicePlans.filter((plan) => plan.status === "active").slice(0, 4).map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate font-medium">{customersById.get(plan.customerId)?.name ?? plan.name}</span>
                    <Badge>{recurringFrequencyLabel(plan.frequency, plan.intervalDays)}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

function RoutingView({
  workspace,
  operatingDepth,
  customersById,
  propertiesById,
  jobsById,
  setSelectedVisitId,
  setView,
}: {
  workspace: WorkspaceSnapshot;
  operatingDepth: OperatingDepth;
  customersById: Map<string, WorkspaceSnapshot["customers"][number]>;
  propertiesById: Map<string, WorkspaceSnapshot["properties"][number]>;
  jobsById: Map<string, WorkspaceSnapshot["jobs"][number]>;
  setSelectedVisitId: (id: string) => void;
  setView: (view: View) => void;
}) {
  const visitsByCrew = workspace.crews.map((crew) => ({
    crew,
    visits: workspace.visits.filter((visit) => visit.crewId === crew.id).sort((a, b) => a.routeOrder - b.routeOrder || a.scheduledStart - b.scheduledStart),
  }));
  const totalWarnings = operatingDepth.fieldOps.routeConfidence.reduce((sum, route) => sum + route.warnings.length + route.equipmentConflicts.length, 0);
  const avgScore = Math.round(operatingDepth.fieldOps.routeConfidence.reduce((sum, route) => sum + route.score, 0) / Math.max(1, operatingDepth.fieldOps.routeConfidence.length));

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]"><Route size={16} />Route optimization</div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">Daily routing, stop order, conflicts, and Maps links</h2>
          </div>
          <Badge tone={totalWarnings ? "warning" : "success"}>{totalWarnings} route issues</Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Route confidence" value={`${avgScore}%`} tone={avgScore >= 80 ? "success" : "warning"} />
          <Metric label="Visits routed" value={workspace.visits.filter((visit) => visit.crewId).length} />
          <Metric label="Unassigned" value={workspace.visits.filter((visit) => !visit.crewId).length} tone={workspace.visits.some((visit) => !visit.crewId) ? "warning" : "success"} />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        {visitsByCrew.map(({ crew, visits }) => (
          <Panel key={crew.id}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">{crew.name}</h3>
              <Badge>{visits.length} stops</Badge>
            </div>
            <div className="mt-4 grid gap-2">
              {visits.length === 0 ? <div className="rounded-md border border-dashed border-stone-300 p-3 text-sm text-stone-500">No routed stops.</div> : null}
              {visits.map((visit, index) => {
                const job = jobsById.get(visit.jobId);
                const customer = customersById.get(visit.customerId);
                const property = visit.propertyId ? propertiesById.get(visit.propertyId) : undefined;
                const route = operatingDepth.fieldOps.routeConfidence.find((row) => row.visitId === visit.id);
                return (
                  <div key={visit.id} className="rounded-md border border-stone-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase text-stone-500">Stop {visit.routeOrder || index + 1}</div>
                        <div className="mt-1 font-semibold">{job?.title ?? "Visit"}</div>
                        <div className="mt-1 text-sm text-stone-500">{customer?.name ?? "Customer"} - {property?.city ?? "No city"}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVisitId(visit.id);
                          setView("field");
                        }}
                        className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-bold uppercase hover:bg-[#eef4ee]"
                      >
                        {route?.score ?? 80}% score
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {property ? (
                        <a href={googleMapsUrl(`${property.street}, ${property.city}, ${property.state} ${property.postalCode}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700">
                          <MapPin size={13} /> Maps
                        </a>
                      ) : null}
                      {(route?.warnings ?? []).map((warning) => <Badge key={warning} tone="warning">{warning}</Badge>)}
                      {(route?.equipmentConflicts ?? []).map((warning) => <Badge key={warning} tone="danger">{warning}</Badge>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function ChemicalTrackingView({
  workspace,
  operatingDepth,
  propertiesById,
  setSelectedVisitId,
  setView,
}: {
  workspace: WorkspaceSnapshot;
  operatingDepth: OperatingDepth;
  propertiesById: Map<string, WorkspaceSnapshot["properties"][number]>;
  setSelectedVisitId: (id: string) => void;
  setView: (view: View) => void;
}) {
  const restricted = workspace.materials.filter((material) => material.restrictedUse);
  const epaMissing = workspace.materials.filter((material) => material.active && !material.epaRegistrationNumber);
  const recordsReady = operatingDepth.fieldOps.complianceRecords.filter((record) => record.ready).length;

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]"><Package size={16} />Chemical tracking</div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">Materials, EPA labels, weather rules, applications, and compliance records</h2>
          </div>
          <Badge tone={epaMissing.length ? "warning" : "success"}>{epaMissing.length} missing EPA labels</Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Active materials" value={workspace.materials.filter((material) => material.active).length} />
          <Metric label="Restricted use" value={restricted.length} tone={restricted.length ? "warning" : "success"} />
          <Metric label="Application lots" value={operatingDepth.fieldOps.materialLots.length} />
          <Metric label="Compliance ready" value={`${recordsReady}/${operatingDepth.fieldOps.complianceRecords.length}`} tone={recordsReady ? "success" : "warning"} />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <h3 className="font-bold">Material catalog</h3>
          <div className="mt-4 grid gap-2">
            {workspace.materials.map((material) => (
              <div key={material.id} className="rounded-md border border-stone-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{material.name}</div>
                    <div className="mt-1 text-sm text-stone-500">{currency(material.costCents ?? 0)} / {material.unit}</div>
                  </div>
                  <Badge tone={material.restrictedUse ? "warning" : "success"}>{material.restrictedUse ? "Restricted" : "Standard"}</Badge>
                </div>
                <div className="mt-2 text-xs text-stone-500">EPA {material.epaRegistrationNumber ?? "missing"} - {material.active ? "active" : "inactive"}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h3 className="font-bold">Applications and compliance</h3>
          <div className="mt-4 grid gap-3">
            {operatingDepth.fieldOps.complianceRecords.map((record) => {
              const visit = workspace.visits.find((candidate) => candidate.id === record.visitId);
              const property = visit?.propertyId ? propertiesById.get(visit.propertyId) : undefined;
              return (
                <div key={record.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{record.reportNumber} - {record.materialName}</div>
                      <div className="mt-1 text-sm text-stone-500">{record.customerName} - {property?.label ?? record.propertyName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVisitId(record.visitId);
                        setView("field");
                      }}
                      className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-bold uppercase hover:bg-[#eef4ee]"
                    >
                      {record.ready ? "Ready" : "Needs review"}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{record.quantity} {record.unit}</Badge>
                    <Badge tone={record.applicationRisk === "high" ? "danger" : record.applicationRisk === "medium" ? "warning" : "success"}>{record.weatherSummary}</Badge>
                    {record.missing.map((missing) => <Badge key={missing} tone="warning">Missing {missing}</Badge>)}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function JobAnalysisView({ operatingDepth, setSelectedJobId, setView }: { operatingDepth: OperatingDepth; setSelectedJobId: (id: string) => void; setView: (view: View) => void }) {
  const summaries = [...operatingDepth.jobCosting.summaries].sort((a, b) => b.varianceCents - a.varianceCents);
  const bottomMargin = [...operatingDepth.jobCosting.summaries].sort((a, b) => a.grossMarginPercent - b.grossMarginPercent)[0];

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]"><BarChart3 size={16} />Jobs analysis</div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">Estimated vs actual revenue, labor, materials, equipment, overhead, and margin</h2>
          </div>
          <Badge tone={bottomMargin && bottomMargin.grossMarginPercent < 25 ? "warning" : "success"}>{bottomMargin ? `Lowest margin ${percent(bottomMargin.grossMarginPercent)}` : "No jobs"}</Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Analyzed jobs" value={summaries.length} />
          <Metric label="Gross profit" value={currency(operatingDepth.revenue.grossProfitCents)} tone={operatingDepth.revenue.grossProfitCents >= 0 ? "success" : "danger"} />
          <Metric label="Actual margin" value={percent(operatingDepth.revenue.grossMarginPercent)} />
          <Metric label="AR balance" value={currency(operatingDepth.revenue.arCents)} tone={operatingDepth.revenue.arCents ? "warning" : "success"} />
        </div>
      </Panel>

      <Panel>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase text-stone-500">
                <th className="px-3 py-2">Job</th>
                <th className="px-3 py-2">Crew</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">Costs</th>
                <th className="px-3 py-2 text-right">Profit</th>
                <th className="px-3 py-2 text-right">Margin</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {summaries.map((summary) => {
                const costCents = summary.actualLaborCostCents + summary.actualMaterialCostCents + summary.actualEquipmentCostCents + summary.overheadCostCents;
                return (
                  <tr key={summary.id} className="align-top">
                    <td className="px-3 py-3">
                      <button type="button" className="font-semibold text-[#224036] hover:underline" onClick={() => { setSelectedJobId(summary.jobId); setView("jobs"); }}>{summary.jobTitle}</button>
                      <div className="mt-1 text-xs text-stone-500">{summary.customerName}</div>
                    </td>
                    <td className="px-3 py-3">{summary.crewName}</td>
                    <td className="px-3 py-3 text-right">{currency(summary.actualRevenueCents)}</td>
                    <td className="px-3 py-3 text-right">{currency(costCents)}</td>
                    <td className="px-3 py-3 text-right">{currency(summary.grossProfitCents)}</td>
                    <td className="px-3 py-3 text-right"><Badge tone={summary.grossMarginPercent >= 35 ? "success" : summary.grossMarginPercent < 20 ? "danger" : "warning"}>{percent(summary.grossMarginPercent)}</Badge></td>
                    <td className="px-3 py-3"><Badge tone={operatingTone(summary.status)}>{formatStatus(summary.status)}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function JobsPricerView({ workspace, operatingDepth }: { workspace: WorkspaceSnapshot; operatingDepth: OperatingDepth }) {
  const defaultPackage = workspace.servicePackages[0];
  const [packageId, setPackageId] = useState(defaultPackage?.id ?? "");
  const selectedPackage = workspace.servicePackages.find((item) => item.id === packageId) ?? defaultPackage;
  const [laborHours, setLaborHours] = useState(String(selectedPackage?.laborHours ?? 4));
  const [laborRate, setLaborRate] = useState(String(Math.round((selectedPackage?.laborRateCents ?? 6500) / 100)));
  const [materials, setMaterials] = useState(String(Math.round((selectedPackage?.materialCostCents ?? 25000) / 100)));
  const [equipment, setEquipment] = useState(String(Math.round((selectedPackage?.equipmentCostCents ?? 8000) / 100)));
  const [overheadPercent, setOverheadPercent] = useState(String(selectedPackage?.overheadPercent ?? 18));
  const [targetMargin, setTargetMargin] = useState(String(selectedPackage?.targetMarginPercent ?? 42));
  const laborCostCents = dollarsToCents(String(Number(laborHours || "0") * Number(laborRate || "0")));
  const materialCostCents = dollarsToCents(materials);
  const equipmentCostCents = dollarsToCents(equipment);
  const directCostCents = laborCostCents + materialCostCents + equipmentCostCents;
  const overheadCents = Math.round(directCostCents * (Number(overheadPercent || "0") / 100));
  const totalCostCents = directCostCents + overheadCents;
  const priceCents = Math.round(totalCostCents / Math.max(0.05, 1 - Number(targetMargin || "0") / 100));
  const profitCents = priceCents - totalCostCents;

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel>
        <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]"><Calculator size={16} />Jobs pricer</div>
        <h2 className="mt-2 text-2xl font-bold tracking-normal">Autoprice calculator for labor, material, equipment, overhead, and target margin</h2>
        <div className="mt-5 grid gap-3">
          <Field label="Service package">
            <select className={inputClass()} value={packageId} onChange={(event) => setPackageId(event.target.value)}>
              {workspace.servicePackages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Labor hours"><input className={inputClass()} value={laborHours} onChange={(event) => setLaborHours(event.target.value)} inputMode="decimal" /></Field>
            <Field label="Labor $/hour"><input className={inputClass()} value={laborRate} onChange={(event) => setLaborRate(event.target.value)} inputMode="decimal" /></Field>
            <Field label="Materials"><input className={inputClass()} value={materials} onChange={(event) => setMaterials(event.target.value)} inputMode="decimal" /></Field>
            <Field label="Equipment"><input className={inputClass()} value={equipment} onChange={(event) => setEquipment(event.target.value)} inputMode="decimal" /></Field>
            <Field label="Overhead %"><input className={inputClass()} value={overheadPercent} onChange={(event) => setOverheadPercent(event.target.value)} inputMode="decimal" /></Field>
            <Field label="Target margin %"><input className={inputClass()} value={targetMargin} onChange={(event) => setTargetMargin(event.target.value)} inputMode="decimal" /></Field>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4">
        <Panel>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Recommended price" value={currency(priceCents)} tone="success" />
            <Metric label="Gross profit" value={currency(profitCents)} />
            <Metric label="Margin" value={percent(priceCents > 0 ? (profitCents / priceCents) * 100 : 0)} />
          </div>
        </Panel>
        <Panel>
          <h3 className="font-bold">Cost stack</h3>
          <div className="mt-4 grid gap-2">
            {[
              ["Labor", laborCostCents],
              ["Materials", materialCostCents],
              ["Equipment", equipmentCostCents],
              ["Overhead", overheadCents],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-md bg-stone-50 px-3 py-2 text-sm">
                <span className="font-semibold">{label}</span>
                <span>{currency(value as number)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h3 className="font-bold">Price-book context</h3>
          <div className="mt-3 grid gap-2">
            {operatingDepth.revenue.serviceLineProfitability.slice(0, 4).map((row) => (
              <div key={row.serviceCategory} className="flex items-center justify-between rounded-md border border-stone-200 p-3 text-sm">
                <span className="font-semibold">{row.label}</span>
                <span>{percent(row.grossMarginPercent)} margin</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ChurnLtvDashboard({ operatingDepth }: { operatingDepth: OperatingDepth }) {
  const analytics = operatingDepth.admin.ownerAnalytics;
  const highRisk = operatingDepth.revenue.customerProfitability.filter((customer) => ["high", "critical"].includes(customer.churnRiskLevel));
  const turfProReference = {
    churned: 2239,
    greenAceChurned: 291,
    turfProChurned: 1948,
    greenAceTenure: 2.0,
    turfProTenure: 4.8,
    missingArchiveDate: 68,
    landscaperCustomers: 740,
  };

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#224036]">GreenAce (2013-2026) - Turf Pro (1998-2026)</div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">Churn & LTV Dashboard</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Both Companies</Badge>
            <Badge>All Customers</Badge>
            <Badge>All Time</Badge>
            <Badge>Compare Off</Badge>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Total Churned" value={turfProReference.churned.toLocaleString()} />
          <Metric label="GreenAce Churned" value={turfProReference.greenAceChurned.toLocaleString()} />
          <Metric label="Turf Pro Churned" value={turfProReference.turfProChurned.toLocaleString()} />
          <Metric label="Avg. Tenure GA" value={`${turfProReference.greenAceTenure.toFixed(1)} yrs`} />
          <Metric label="Avg. Tenure TP" value={`${turfProReference.turfProTenure.toFixed(1)} yrs`} />
          <Metric label="Missing Archive Date" value={turfProReference.missingArchiveDate} tone="warning" />
          <Metric label="Landscaper Customers" value={turfProReference.landscaperCustomers} />
          <Metric label="Current Churn Risk" value={percent(analytics.kpis.churnRatePercent)} tone={analytics.kpis.churnRatePercent > 12 ? "warning" : "success"} />
          <Metric label="Average LTV" value={currency(analytics.kpis.averageLtvCents)} />
          <Metric label="LTV:CAC" value={`${analytics.kpis.ltvToCac}x`} tone={analytics.kpis.ltvToCac >= 3 ? "success" : "warning"} />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <h3 className="font-bold">Churn by segment</h3>
          <div className="mt-4 grid gap-3">
            {analytics.churn.map((row) => (
              <div key={row.segment} className="rounded-md border border-stone-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{row.segment}</div>
                  <Badge tone={row.churnRatePercent > 20 ? "danger" : row.churnRatePercent > 10 ? "warning" : "success"}>{percent(row.churnRatePercent)}</Badge>
                </div>
                <div className="mt-2 text-sm text-stone-500">{row.atRisk} of {row.customers} customers at risk - {currency(row.ltvAtRiskCents)} LTV exposed</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{row.drivers.map((driver) => <Badge key={driver}>{driver}</Badge>)}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h3 className="font-bold">LTV analysis</h3>
          <div className="mt-4 grid gap-3">
            {analytics.ltv.map((row) => (
              <div key={row.segment} className="grid gap-2 rounded-md border border-stone-200 p-3 sm:grid-cols-3 sm:items-center">
                <div className="font-semibold">{row.segment}</div>
                <div><div className="text-xs text-stone-500">Average LTV</div><div className="font-bold">{currency(row.averageLtvCents)}</div></div>
                <div><div className="text-xs text-stone-500">Payback</div><div className="font-bold">{row.paybackMonths} mo</div></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <h3 className="font-bold">Full customer risk data</h3>
        <div className="mt-4 grid gap-2">
          {highRisk.slice(0, 8).map((customer) => (
            <div key={customer.customerId} className="grid gap-2 rounded-md border border-stone-200 p-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <div className="font-semibold">{customer.customerName}</div>
                <div className="text-sm text-stone-500">{customer.churnDrivers.join(", ") || "No driver captured"}</div>
              </div>
              <Badge tone={customer.churnRiskLevel === "critical" ? "danger" : "warning"}>{formatStatus(customer.churnRiskLevel)}</Badge>
              <div className="text-sm font-semibold">{currency(customer.estimatedLtvCents)} est. LTV</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Metric({ icon = <Gauge size={18} />, label, value, tone = "neutral", detail, onClick }: { icon?: ReactNode; label: string; value: ReactNode; tone?: string; detail?: string; onClick?: () => void }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-stone-500">{label}</div>
          <div className="mt-2 text-2xl font-bold tracking-normal">{value}</div>
          {detail ? <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#315a4d]">{detail}<ArrowRight size={12} /></div> : null}
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
    </>
  );
  if (onClick) {
    return <button type="button" onClick={onClick} className="rounded-lg border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-[#8aa99a] hover:shadow">{content}</button>;
  }
  return <Panel>{content}</Panel>;
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
      {form.kind === "call" ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Call outcome">
            <select
              aria-label={`${contextLabel} call outcome`}
              className={inputClass()}
              value={form.callOutcome}
              onChange={(event) => setForm({ ...form, callOutcome: event.target.value as ActivityCallOutcome })}
            >
              {Object.entries(activityCallOutcomeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Opportunity impact">
            <select
              aria-label={`${contextLabel} opportunity impact`}
              className={inputClass()}
              value={form.opportunityImpact}
              onChange={(event) => setForm({ ...form, opportunityImpact: event.target.value as OpportunityImpact })}
            >
              {Object.entries(opportunityImpactLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}
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
  plan,
  customerSearch,
  setCustomerSearch,
  selectedCustomer,
  setSelectedCustomerId,
  membersById,
  leadForm,
  setLeadForm,
  createLead,
  createRepeatCustomerLead,
  leadSubmitState,
  leadSubmitMessage,
  activityForm,
  setActivityForm,
  addActivity,
}: {
  workspace: WorkspaceSnapshot;
  plan?: string;
  customerSearch: string;
  setCustomerSearch: (value: string) => void;
  selectedCustomer?: WorkspaceSnapshot["customers"][number];
  setSelectedCustomerId: (id: string) => void;
  membersById: Map<string, WorkspaceSnapshot["members"][number]>;
  leadForm: LeadFormState;
  setLeadForm: (value: LeadFormState) => void;
  createLead: (event: FormEvent) => void | Promise<void>;
  createRepeatCustomerLead: (input: { customerId: string; propertyId?: string; title: string; source: string; valueCents: number; serviceLine: ServiceCategory; message?: string }) => Promise<{ leadId: string; opportunityId: string }>;
  leadSubmitState: "idle" | "submitting" | "success" | "error";
  leadSubmitMessage: string;
  activityForm: ActivityComposerState;
  setActivityForm: (value: ActivityComposerState) => void;
  addActivity: (event: FormEvent) => void;
}) {
  const filtered = workspace.customers.filter((customer) => customer.name.toLowerCase().includes(customerSearch.toLowerCase()));
  const customerContacts = selectedCustomer ? workspace.contacts.filter((contact) => contact.customerId === selectedCustomer.id) : [];
  const customerProperties = selectedCustomer ? workspace.properties.filter((property) => property.customerId === selectedCustomer.id) : [];
  const customerOpps = selectedCustomer ? workspace.opportunities.filter((opp) => opp.customerId === selectedCustomer.id) : [];
  const customerEstimates = selectedCustomer ? workspace.estimates.filter((estimate) => estimate.customerId === selectedCustomer.id) : [];
  const customerJobs = selectedCustomer ? workspace.jobs.filter((job) => job.customerId === selectedCustomer.id) : [];
  const customerInvoices = selectedCustomer ? workspace.invoices.filter((invoice) => invoice.customerId === selectedCustomer.id) : [];
  const customerPayments = selectedCustomer ? workspace.payments.filter((payment) => payment.customerId === selectedCustomer.id) : [];
  const customerActivities = selectedCustomer ? workspace.activities.filter((activity) => activity.entityType === "customer" && activity.entityId === selectedCustomer.id) : [];
  const customerTasks = selectedCustomer ? workspace.tasks.filter((task) => task.entityType === "customer" && task.entityId === selectedCustomer.id && task.status !== "done") : [];
  const customerNotes = selectedCustomer ? workspace.notes.filter((note) => note.entityType === "customer" && note.entityId === selectedCustomer.id) : [];
  const customerPropertyIds = new Set(customerProperties.map((property) => property.id));
  const customerEstimateIds = new Set(customerEstimates.map((estimate) => estimate.id));
  const customerJobIds = new Set(customerJobs.map((job) => job.id));
  const customerFiles = selectedCustomer
    ? workspace.files.filter((file) =>
        (file.entityType === "customer" && file.entityId === selectedCustomer.id) ||
        (file.entityType === "property" && customerPropertyIds.has(file.entityId)) ||
        (file.entityType === "estimate" && customerEstimateIds.has(file.entityId)) ||
        (file.entityType === "job" && customerJobIds.has(file.entityId)),
      )
    : [];
  const accountInvoicedCents = customerInvoices.reduce((sum, invoice) => sum + invoice.totalCents, 0);
  const accountBalanceCents = customerInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.totalCents - invoice.paidCents), 0);
  const latestPayment = [...customerPayments].sort((a, b) => b.receivedAt - a.receivedAt)[0];
  const freeContactLimit = 10;
  const contactCount = workspace.contacts.length;
  const isProPlan = plan === "pro" || plan === "growth" || plan === "enterprise";
  const contactUsagePercent = Math.min(100, Math.round((contactCount / freeContactLimit) * 100));
  const isAtFreeLimit = !isProPlan && contactCount >= freeContactLimit;
  const [repeatLeadForm, setRepeatLeadForm] = useState<RepeatLeadFormState>(() => defaultRepeatLeadForm());
  const [repeatLeadState, setRepeatLeadState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [repeatLeadMessage, setRepeatLeadMessage] = useState("");

  async function submitRepeatLead(event: FormEvent) {
    event.preventDefault();
    if (!selectedCustomer) return;
    const property = customerProperties[0];
    if (!property) {
      setRepeatLeadState("error");
      setRepeatLeadMessage("Add a property before creating a repeat service request.");
      return;
    }
    const title = repeatLeadForm.title.trim();
    if (!title) return;
    try {
      setRepeatLeadState("submitting");
      setRepeatLeadMessage("");
      await createRepeatCustomerLead({
        customerId: selectedCustomer.id,
        propertyId: property.id,
        title,
        source: repeatLeadForm.source.trim() || "Repeat customer",
        valueCents: dollarsToCents(repeatLeadForm.value),
        serviceLine: repeatLeadForm.serviceLine,
        message: repeatLeadForm.message.trim() || undefined,
      });
      setRepeatLeadState("success");
      setRepeatLeadMessage(`${selectedCustomer.name} repeat service request added to Pipeline.`);
      setRepeatLeadForm(defaultRepeatLeadForm());
    } catch (error) {
      setRepeatLeadState("error");
      setRepeatLeadMessage(error instanceof Error ? error.message : "Could not create that repeat service request.");
    }
  }

  return (
    <div className={cn("grid gap-4", workspace.customers.length > 0 && "xl:grid-cols-[0.8fr_1.2fr]")}>
      <Panel className={workspace.customers.length === 0 ? "hidden" : undefined}>
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

      <div className={cn("grid gap-4", workspace.customers.length === 0 && "mx-auto w-full max-w-4xl")}>
        <Panel className={!selectedCustomer ? "hidden" : undefined}>
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
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold">Customer Account Workspace</h3>
                    <p className="mt-1 text-sm text-stone-500">Contacts, properties, sales, work, finance, notes, and files attached to this account.</p>
                  </div>
                  <Badge tone={accountBalanceCents > 0 ? "warning" : "success"}>{accountBalanceCents > 0 ? `${currency(accountBalanceCents)} AR` : "No AR"}</Badge>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Contacts", value: customerContacts.length, icon: <UsersRound size={16} /> },
                    { label: "Properties", value: customerProperties.length, icon: <MapPin size={16} /> },
                    { label: "Jobs", value: customerJobs.length, icon: <ClipboardList size={16} /> },
                    { label: "Estimates", value: customerEstimates.length, icon: <FileText size={16} /> },
                    { label: "Invoices", value: customerInvoices.length, icon: <Receipt size={16} /> },
                    { label: "Payments", value: customerPayments.length, icon: <DollarSign size={16} /> },
                    { label: "Notes", value: customerNotes.length, icon: <ClipboardCheck size={16} /> },
                    { label: "Files", value: customerFiles.length, icon: <FileText size={16} /> },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-white p-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">{item.label}</div>
                        <div className="mt-1 text-xl font-bold">{item.value}</div>
                      </div>
                      <span className="grid h-8 w-8 place-items-center rounded-md bg-[#e8efe8] text-[#224036]">{item.icon}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <section className="rounded-md border border-stone-200 bg-white p-3" aria-label="Contacts">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold">Contacts</h4>
                      <Badge>{customerContacts.length}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {customerContacts.slice(0, 4).map((contact) => (
                        <div key={contact.id} className="rounded-md border border-stone-100 p-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold">{contact.name}</span>
                            <Badge tone={contact.isPrimary ? "success" : "neutral"}>{contact.isPrimary ? "Primary" : contact.roleTitle ?? "Contact"}</Badge>
                          </div>
                          <div className="mt-1 text-sm text-stone-500">{[contact.roleTitle, contact.phone, contact.email].filter(Boolean).join(" - ")}</div>
                        </div>
                      ))}
                      {customerContacts.length === 0 ? <div className="text-sm text-stone-500">No contacts are attached yet.</div> : null}
                    </div>
                  </section>
                  <section className="rounded-md border border-stone-200 bg-white p-3" aria-label="Properties">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold">Properties</h4>
                      <Badge>{customerProperties.length}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {customerProperties.slice(0, 3).map((property) => (
                        <div key={property.id} className="rounded-md border border-stone-100 p-2">
                          <div className="font-semibold">{property.label}</div>
                          <div className="mt-1 text-sm text-stone-500">{property.street}, {property.city}</div>
                          <a className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#224036]" href={googleMapsUrl(`${property.street}, ${property.city}, ${property.state} ${property.postalCode}`)} target="_blank" rel="noreferrer">
                            <MapPin size={15} />
                            Maps
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      ))}
                      {customerProperties.length === 0 ? <div className="text-sm text-stone-500">No properties are attached yet.</div> : null}
                    </div>
                  </section>
                  <section className="rounded-md border border-stone-200 bg-white p-3" aria-label="Jobs and estimates">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold">Jobs + Estimates</h4>
                      <Badge>{customerJobs.length + customerEstimates.length}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {customerJobs.slice(0, 3).map((job) => (
                        <div key={job.id} className="flex items-center justify-between gap-3 rounded-md border border-stone-100 p-2">
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{job.title}</div>
                            <div className="text-sm text-stone-500">Starts {shortDate(job.startDate)}</div>
                          </div>
                          <Badge tone={statusTone(job.status)}>{formatStatus(job.status)}</Badge>
                        </div>
                      ))}
                      {customerEstimates.slice(0, 3).map((estimate) => (
                        <div key={estimate.id} className="flex items-center justify-between gap-3 rounded-md border border-stone-100 p-2">
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{estimate.estimateNumber}</div>
                            <div className="text-sm text-stone-500">{currency(estimate.totalCents)}</div>
                          </div>
                          <Badge tone={statusTone(estimate.status)}>{formatStatus(estimate.status)}</Badge>
                        </div>
                      ))}
                      {customerJobs.length === 0 && customerEstimates.length === 0 ? <div className="text-sm text-stone-500">No jobs or estimates are attached yet.</div> : null}
                    </div>
                  </section>
                  <section className="rounded-md border border-stone-200 bg-white p-3" aria-label="Invoices and payments">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold">Invoices + Payments</h4>
                      <Badge>{currency(accountInvoicedCents)}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {customerInvoices.slice(0, 3).map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between gap-3 rounded-md border border-stone-100 p-2">
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{invoice.invoiceNumber}</div>
                            <div className="text-sm text-stone-500">{currency(invoice.totalCents)} total - {currency(Math.max(0, invoice.totalCents - invoice.paidCents))} open</div>
                          </div>
                          <Badge tone={operatingTone(invoice.status)}>{formatStatus(invoice.status)}</Badge>
                        </div>
                      ))}
                      {latestPayment ? (
                        <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2 text-sm">
                          <span className="font-semibold">Latest payment:</span> {currency(latestPayment.amountCents)} by {formatStatus(latestPayment.method)} on {shortDate(latestPayment.receivedAt)}
                        </div>
                      ) : null}
                      {customerInvoices.length === 0 && customerPayments.length === 0 ? <div className="text-sm text-stone-500">No invoices or payments are attached yet.</div> : null}
                    </div>
                  </section>
                  <section className="rounded-md border border-stone-200 bg-white p-3" aria-label="Notes">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold">Notes</h4>
                      <Badge>{customerNotes.length}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {customerNotes.slice(0, 3).map((note) => (
                        <div key={note.id} className="rounded-md border border-stone-100 p-2">
                          <div className="text-sm leading-5 text-stone-700">{note.body}</div>
                          <div className="mt-1 text-xs text-stone-500">{formatStatus(note.visibility)} - {shortDate(note.createdAt)}</div>
                        </div>
                      ))}
                      {customerNotes.length === 0 ? <div className="text-sm text-stone-500">No notes are attached yet.</div> : null}
                    </div>
                  </section>
                  <section className="rounded-md border border-stone-200 bg-white p-3" aria-label="Files">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold">Files</h4>
                      <Badge>{customerFiles.length}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {customerFiles.slice(0, 4).map((file) => (
                        <div key={file.id} className="flex items-center justify-between gap-3 rounded-md border border-stone-100 p-2">
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{file.fileName}</div>
                            <div className="text-sm text-stone-500">{formatStatus(file.entityType)} - {shortDate(file.createdAt)}</div>
                          </div>
                          <FileText className="shrink-0 text-stone-400" size={16} />
                        </div>
                      ))}
                      {customerFiles.length === 0 ? <div className="text-sm text-stone-500">No files are attached yet.</div> : null}
                    </div>
                  </section>
                </div>
                <div className="mt-3">
                  <h4 className="text-sm font-bold">Opportunities</h4>
                  <div className="mt-2 grid gap-2">
                    {customerOpps.map((opp) => (
                      <div key={opp.id} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-white p-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{opp.title}</div>
                          <div className="text-sm text-stone-500">{currency(opp.valueCents)} - {opp.closeProbability}% probability</div>
                        </div>
                        <Badge tone={statusTone(opp.stage)}>{opportunityStageLabel(opp.stage)}</Badge>
                      </div>
                    ))}
                    {customerOpps.length === 0 ? <div className="rounded-md border border-dashed border-stone-200 bg-white p-3 text-sm text-stone-500">No opportunities are attached yet.</div> : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </Panel>

        <Panel className={!selectedCustomer ? "hidden" : undefined}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">New Service for Customer</h2>
              <p className="mt-1 text-sm leading-5 text-stone-500">Create a new lead and qualified opportunity tied to the selected customer and property.</p>
            </div>
            <Badge>{selectedCustomer ? selectedCustomer.name : "No customer"}</Badge>
          </div>
          {repeatLeadMessage ? (
            <div className={cn("mt-4 rounded-md border p-3 text-sm font-medium", repeatLeadState === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>
              {repeatLeadMessage}
            </div>
          ) : null}
          <form onSubmit={submitRepeatLead} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Repeat service request">
              <input className={inputClass()} value={repeatLeadForm.title} onChange={(event) => setRepeatLeadForm({ ...repeatLeadForm, title: event.target.value })} disabled={!selectedCustomer} required />
            </Field>
            <Field label="Repeat service line">
              <select className={inputClass()} value={repeatLeadForm.serviceLine} onChange={(event) => setRepeatLeadForm({ ...repeatLeadForm, serviceLine: event.target.value as ServiceCategory })} disabled={!selectedCustomer}>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Repeat source">
              <input className={inputClass()} value={repeatLeadForm.source} onChange={(event) => setRepeatLeadForm({ ...repeatLeadForm, source: event.target.value })} disabled={!selectedCustomer} />
            </Field>
            <Field label="Repeat value">
              <input className={inputClass()} value={repeatLeadForm.value} onChange={(event) => setRepeatLeadForm({ ...repeatLeadForm, value: event.target.value })} disabled={!selectedCustomer} inputMode="decimal" />
            </Field>
            <div className="md:col-span-2 xl:col-span-3">
              <Field label="Repeat message">
                <textarea className={cn(inputClass(), "min-h-20 resize-y py-2")} value={repeatLeadForm.message} onChange={(event) => setRepeatLeadForm({ ...repeatLeadForm, message: event.target.value })} disabled={!selectedCustomer} />
              </Field>
            </div>
            <div className="flex items-end">
              <TextButton type="submit" icon={<Plus size={16} />} disabled={!selectedCustomer || repeatLeadState === "submitting"} className="w-full">
                {repeatLeadState === "submitting" ? "Adding" : "Add Customer Service Request"}
              </TextButton>
            </div>
          </form>
        </Panel>

        <Panel className={!selectedCustomer ? "hidden" : undefined}>
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">{workspace.customers.length === 0 ? "Add your first lead" : "Create Lead"}</h2>
              <p className="mt-1 text-sm leading-5 text-stone-500">
                {workspace.customers.length === 0
                  ? "Enter the customer and property once. We will organize the contact, lead, and sales opportunity for you."
                  : "Every new lead creates a customer, contact, property, lead, and opportunity."}
              </p>
            </div>
            <Badge tone={isAtFreeLimit ? "warning" : "success"}>
              {isProPlan ? `${contactCount} contacts` : `${contactCount}/${freeContactLimit} free contacts`}
            </Badge>
          </div>
          <div className={cn("mt-4 rounded-md border p-3", isAtFreeLimit ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{isProPlan ? "All-In Pro" : isAtFreeLimit ? "Free plan contact limit reached" : "Free plan"}</div>
                <p className="mt-1 text-sm leading-5 text-stone-600">
                  {isProPlan
                    ? "This workspace includes the complete customer book with no contact cap."
                    : isAtFreeLimit
                      ? "Upgrade to All-In Pro to add more contacts and keep every customer workflow in one place."
                      : `You can add ${freeContactLimit - contactCount} more contact${freeContactLimit - contactCount === 1 ? "" : "s"} before upgrading to All-In Pro.`}
                </p>
              </div>
              {!isProPlan ? (
                <Link href="/pricing" className="inline-flex min-h-9 items-center justify-center rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50">
                  View plans
                </Link>
              ) : null}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
              <div className={cn("h-full rounded-full", isAtFreeLimit ? "bg-amber-600" : "bg-emerald-700")} style={{ width: `${isProPlan ? 100 : contactUsagePercent}%` }} />
            </div>
          </div>
          {leadSubmitMessage ? (
            <div className={cn("mt-4 rounded-md border p-3 text-sm font-medium", leadSubmitState === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>
              {leadSubmitMessage}
            </div>
          ) : null}
          <form aria-label="Create new lead" onSubmit={createLead} className="mt-4 grid gap-3 md:grid-cols-2">
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
            {leadForm.leadType === "phone_call" ? (
              <div className="grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 md:col-span-2 md:grid-cols-[1fr_auto_auto]">
                <Field label="Call outcome">
                  <select className={inputClass()} value={leadForm.callOutcome} onChange={(event) => setLeadForm({ ...leadForm, callOutcome: event.target.value as CallOutcome })}>
                    {callOutcomeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Follow-up days">
                  <input
                    aria-label="Call follow-up due days"
                    className={cn(inputClass(), "w-full md:w-32")}
                    value={leadForm.followUpDueInDays}
                    onChange={(event) => setLeadForm({ ...leadForm, followUpDueInDays: event.target.value })}
                    disabled={!leadForm.createCallFollowUp}
                    inputMode="numeric"
                  />
                </Field>
                <label className="flex items-center gap-2 self-end rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
                  <input
                    aria-label="Create call follow-up"
                    type="checkbox"
                    checked={leadForm.createCallFollowUp}
                    onChange={(event) => setLeadForm({ ...leadForm, createCallFollowUp: event.target.checked })}
                    className="h-4 w-4 rounded border-stone-300 text-[#224036]"
                  />
                  Create follow-up
                </label>
              </div>
            ) : null}
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
                <TextButton type="submit" icon={<Plus size={16} />} className="w-full sm:w-auto" disabled={leadSubmitState === "submitting"}>
                  {leadSubmitState === "submitting" ? "Creating..." : "Create Lead"}
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
  createQuoteFromOpportunity,
  sendQuoteToCustomer,
  acceptQuoteFromCustomer,
  convertAcceptedQuoteToJob,
  openJob,
}: {
  workspace: WorkspaceSnapshot;
  customersById: Map<string, WorkspaceSnapshot["customers"][number]>;
  moveOpportunity: (opportunity: Opportunity, direction: "next" | "previous" | "lost") => void;
  createQuoteFromOpportunity: (input: {
    opportunity: Opportunity;
    status: "draft" | "sent";
    lineItemName: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    terms?: string;
    servicePackageId?: string;
    serviceCatalogItemId?: string;
  }) => Promise<{ estimateId: string; estimateNumber: string }>;
  sendQuoteToCustomer: (estimateId: string) => Promise<{ estimateId: string; estimateNumber: string; sentAt: number; expiresAt: number }>;
  acceptQuoteFromCustomer: (input: {
    estimateId: string;
    acceptedByName?: string;
    acceptedByEmail?: string;
    acceptanceSource?: "customer_portal" | "email" | "verbal" | "office";
    acceptanceNote?: string;
  }) => Promise<{ estimateId: string; estimateNumber: string; acceptedAt: number }>;
  convertAcceptedQuoteToJob: (input: {
    estimateId: string;
    scheduledStart?: number;
    scheduledEnd?: number;
    crewId?: string;
  }) => Promise<{ estimateId: string; estimateNumber: string; jobId: string; visitId: string; jobTitle: string }>;
  openJob: (jobId: string) => void;
}) {
  const leadsById = new Map(workspace.leads.map((lead) => [lead.id, lead]));
  const membersById = new Map(workspace.members.map((member) => [member.id, member]));
  const propertiesById = new Map(workspace.properties.map((property) => [property.id, property]));
  const primaryContactByCustomerId = new Map(workspace.contacts.filter((contact) => contact.isPrimary).map((contact) => [contact.customerId, contact]));
  const nowMs = now();
  const sourceOptions = Array.from(new Set(workspace.leads.map((lead) => lead.source).filter(Boolean))).sort();
  const ownerOptions = workspace.members.filter((member) => workspace.opportunities.some((opp) => opp.ownerId === member.id));
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState<ServiceCategory | "all">("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [probabilityFilter, setProbabilityFilter] = useState("all");
  const [minValue, setMinValue] = useState("");
  const [nextStepFilter, setNextStepFilter] = useState("all");
  const [quoteMessages, setQuoteMessages] = useState<Record<string, { state: "submitting" | "success" | "error"; message: string }>>({});
  const [sendMessages, setSendMessages] = useState<Record<string, { state: "submitting" | "success" | "error"; message: string }>>({});
  const [acceptMessages, setAcceptMessages] = useState<Record<string, { state: "submitting" | "success" | "error"; message: string }>>({});
  const [convertMessages, setConvertMessages] = useState<Record<string, { state: "submitting" | "success" | "error"; message: string; jobId?: string }>>({});
  const [selectedPackageByOpportunity, setSelectedPackageByOpportunity] = useState<Record<string, string>>({});
  const activeServicePackages = workspace.servicePackages.filter((servicePackage) => servicePackage.active);
  const savedViews = [
    { id: "all", name: "All Open", filters: { owner: "all", source: "all", service: "all" as const, age: "all", probability: "all", nextStep: "all", minValue: "" } },
    { id: "hot", name: "Hot Estimates", filters: { owner: "all", source: "all", service: "all" as const, age: "all", probability: "high", nextStep: "proposal", minValue: "1000" } },
    { id: "stale", name: "Stale Follow-Up", filters: { owner: "all", source: "all", service: "all" as const, age: "stale", probability: "all", nextStep: "follow_up", minValue: "" } },
    { id: "lawn", name: "Lawn Programs", filters: { owner: "all", source: "all", service: "lawn_care" as const, age: "all", probability: "all", nextStep: "all", minValue: "" } },
  ];

  function applySavedView(viewId: string) {
    const view = savedViews.find((item) => item.id === viewId);
    if (!view) return;
    setOwnerFilter(view.filters.owner);
    setSourceFilter(view.filters.source);
    setServiceFilter(view.filters.service);
    setAgeFilter(view.filters.age);
    setProbabilityFilter(view.filters.probability);
    setNextStepFilter(view.filters.nextStep);
    setMinValue(view.filters.minValue);
    setSearch("");
  }

  const filteredOpportunities = workspace.opportunities.filter((opp) => {
    const lead = opp.leadId ? leadsById.get(opp.leadId) : undefined;
    const customer = customersById.get(opp.customerId);
    const normalizedSearch = search.trim().toLowerCase();
    if (ownerFilter !== "all" && opp.ownerId !== ownerFilter) return false;
    if (sourceFilter !== "all" && (lead?.source ?? "Unknown") !== sourceFilter) return false;
    if (serviceFilter !== "all" && !opp.serviceLines.includes(serviceFilter)) return false;
    if (probabilityFilter === "high" && opp.closeProbability < 60) return false;
    if (probabilityFilter === "low" && opp.closeProbability >= 40) return false;
    if (nextStepFilter === "proposal" && !["estimating", "proposal_sent"].includes(opp.stage)) return false;
    if (nextStepFilter === "follow_up" && !["new", "qualified"].includes(opp.stage)) return false;
    if (minValue && opp.valueCents < dollarsToCents(minValue)) return false;
    const ageDays = Math.floor((nowMs - opp.updatedAt) / (24 * 60 * 60 * 1000));
    if (ageFilter === "fresh" && ageDays > 7) return false;
    if (ageFilter === "stale" && ageDays < 14) return false;
    if (normalizedSearch && ![opp.title, customer?.name, lead?.source, opp.serviceLines.join(" ")].some((value) => (value ?? "").toLowerCase().includes(normalizedSearch))) return false;
    return true;
  });
  const filteredValueCents = filteredOpportunities.reduce((sum, opportunity) => sum + opportunity.valueCents, 0);
  const weightedValueCents = filteredOpportunities.reduce((sum, opportunity) => sum + Math.round((opportunity.valueCents * opportunity.closeProbability) / 100), 0);
  const averageProbability = filteredOpportunities.length ? Math.round(filteredOpportunities.reduce((sum, opportunity) => sum + opportunity.closeProbability, 0) / filteredOpportunities.length) : 0;

  function packageOptionsForOpportunity(opportunity: Opportunity) {
    const matching = activeServicePackages.filter((servicePackage) => opportunity.serviceLines.includes(servicePackage.category));
    return matching.length > 0 ? matching : activeServicePackages;
  }

  function quoteUnitForPackage(servicePackage?: WorkspaceSnapshot["servicePackages"][number]) {
    if (!servicePackage) return "project";
    if (servicePackage.billingCadence === "seasonal") return "season";
    if (servicePackage.billingCadence === "annual") return "year";
    if (servicePackage.billingCadence === "monthly") return "month";
    return "project";
  }

  async function handleCreateQuote(opportunity: Opportunity) {
    const primaryService = opportunity.serviceLines[0];
    const packageOptions = packageOptionsForOpportunity(opportunity);
    const selectedServicePackage = packageOptions.find((servicePackage) => servicePackage.id === selectedPackageByOpportunity[opportunity.id]) ?? packageOptions[0];
    const lineItemName = selectedServicePackage?.name ?? (primaryService ? `${categoryLabels[primaryService]} - ${opportunity.title}` : opportunity.title);
    setQuoteMessages((current) => ({ ...current, [opportunity.id]: { state: "submitting", message: "Creating quote from lead context..." } }));
    try {
      const result = await createQuoteFromOpportunity({
        opportunity,
        status: "draft",
        lineItemName,
        quantity: 1,
        unit: quoteUnitForPackage(selectedServicePackage),
        unitPriceCents: selectedServicePackage?.defaultPriceCents ?? opportunity.valueCents,
        terms: "Review scope, pricing, add-ons, and expiration before sending to the customer.",
        servicePackageId: selectedServicePackage?.id,
        serviceCatalogItemId: selectedServicePackage?.includedServiceCatalogItemIds[0],
      });
      setQuoteMessages((current) => ({
        ...current,
        [opportunity.id]: { state: "success", message: `Draft quote ${result.estimateNumber} created for ${opportunity.title}${selectedServicePackage ? ` using ${selectedServicePackage.name}` : ""}.` },
      }));
    } catch (error) {
      setQuoteMessages((current) => ({
        ...current,
        [opportunity.id]: { state: "error", message: error instanceof Error ? error.message : "Could not create quote." },
      }));
    }
  }

  async function handleSendQuote(estimate: WorkspaceSnapshot["estimates"][number]) {
    setSendMessages((current) => ({ ...current, [estimate.id]: { state: "submitting", message: `Sending ${estimate.estimateNumber}...` } }));
    try {
      const result = await sendQuoteToCustomer(estimate.id);
      setSendMessages((current) => ({
        ...current,
        [estimate.id]: {
          state: "success",
          message: `Quote ${result.estimateNumber} sent to customer with 14-day expiration.`,
        },
      }));
    } catch (error) {
      setSendMessages((current) => ({
        ...current,
        [estimate.id]: {
          state: "error",
          message: error instanceof Error ? error.message : "Could not send quote.",
        },
      }));
    }
  }

  async function handleAcceptQuote(estimate: WorkspaceSnapshot["estimates"][number], customer?: WorkspaceSnapshot["customers"][number], primaryContact?: WorkspaceSnapshot["contacts"][number]) {
    setAcceptMessages((current) => ({ ...current, [estimate.id]: { state: "submitting", message: `Capturing approval for ${estimate.estimateNumber}...` } }));
    try {
      const acceptedByName = primaryContact?.name ?? customer?.name ?? "Customer";
      const result = await acceptQuoteFromCustomer({
        estimateId: estimate.id,
        acceptedByName,
        acceptedByEmail: primaryContact?.email ?? customer?.email,
        acceptanceSource: "office",
        acceptanceNote: "Customer approval captured from Pipeline quote package.",
      });
      setAcceptMessages((current) => ({
        ...current,
        [estimate.id]: {
          state: "success",
          message: `Quote ${result.estimateNumber} accepted by customer.`,
        },
      }));
    } catch (error) {
      setAcceptMessages((current) => ({
        ...current,
        [estimate.id]: {
          state: "error",
          message: error instanceof Error ? error.message : "Could not capture customer approval.",
        },
      }));
    }
  }

  async function handleConvertQuote(estimate: WorkspaceSnapshot["estimates"][number]) {
    const existingJob = workspace.jobs.find((job) => job.estimateId === estimate.id);
    if (existingJob) {
      setConvertMessages((current) => ({
        ...current,
        [estimate.id]: {
          state: "success",
          message: `Job ${existingJob.title} is already linked to ${estimate.estimateNumber}.`,
          jobId: existingJob.id,
        },
      }));
      return;
    }

    const scheduledStart = (() => {
      const value = new Date(now() + 24 * 60 * 60 * 1000);
      value.setHours(8, 30, 0, 0);
      return value.getTime();
    })();
    const scheduledEnd = scheduledStart + 2 * 60 * 60 * 1000;
    const crewId = workspace.crews.find((crew) => crew.active)?.id ?? workspace.crews[0]?.id;
    setConvertMessages((current) => ({ ...current, [estimate.id]: { state: "submitting", message: `Converting ${estimate.estimateNumber} to an operations job...` } }));
    try {
      const result = await convertAcceptedQuoteToJob({
        estimateId: estimate.id,
        scheduledStart,
        scheduledEnd,
        crewId,
      });
      setConvertMessages((current) => ({
        ...current,
        [estimate.id]: {
          state: "success",
          message: `Job ${result.jobTitle} created from ${result.estimateNumber}.`,
          jobId: result.jobId,
        },
      }));
    } catch (error) {
      setConvertMessages((current) => ({
        ...current,
        [estimate.id]: {
          state: "error",
          message: error instanceof Error ? error.message : "Could not convert estimate to job.",
        },
      }));
    }
  }

  function quoteSendDisabledReason(estimate: WorkspaceSnapshot["estimates"][number]) {
    if (estimate.status !== "draft") return "Quote has already left draft.";
    if (estimate.approvalStatus === "pending") return "Internal approval is pending.";
    if (estimate.approvalStatus === "rejected") return "Internal approval was rejected.";
    return "";
  }

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
              <Gauge size={16} />
              Pipeline Review
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-normal">Manager pipeline filters and saved views</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Filtered deals" value={filteredOpportunities.length} />
            <Metric label="Filtered value" value={currency(filteredValueCents)} />
            <Metric label="Weighted value" value={currency(weightedValueCents)} />
            <Metric label="Avg probability" value={percent(averageProbability)} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {savedViews.map((view) => (
            <button key={view.id} type="button" onClick={() => applySavedView(view.id)} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50">
              <Filter size={15} />
              {view.name}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_repeat(6,minmax(130px,1fr))]">
          <Field label="Search">
            <input aria-label="Pipeline search" className={inputClass()} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Opportunity, customer, source" />
          </Field>
          <Field label="Owner">
            <select aria-label="Pipeline owner filter" className={inputClass()} value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option value="all">All owners</option>
              {ownerOptions.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
            </select>
          </Field>
          <Field label="Source">
            <select aria-label="Pipeline source filter" className={inputClass()} value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="all">All sources</option>
              {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
            </select>
          </Field>
          <Field label="Service">
            <select aria-label="Pipeline service filter" className={inputClass()} value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value as ServiceCategory | "all")}>
              <option value="all">All services</option>
              {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Age">
            <select aria-label="Pipeline age filter" className={inputClass()} value={ageFilter} onChange={(event) => setAgeFilter(event.target.value)}>
              <option value="all">All ages</option>
              <option value="fresh">Updated 7d</option>
              <option value="stale">Stale 14d+</option>
            </select>
          </Field>
          <Field label="Probability">
            <select aria-label="Pipeline probability filter" className={inputClass()} value={probabilityFilter} onChange={(event) => setProbabilityFilter(event.target.value)}>
              <option value="all">All probability</option>
              <option value="high">60%+</option>
              <option value="low">Under 40%</option>
            </select>
          </Field>
          <Field label="Min value">
            <input aria-label="Pipeline minimum value" className={inputClass()} value={minValue} onChange={(event) => setMinValue(event.target.value)} inputMode="decimal" placeholder="0" />
          </Field>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Next step">
            <select aria-label="Pipeline next step filter" className={inputClass()} value={nextStepFilter} onChange={(event) => setNextStepFilter(event.target.value)}>
              <option value="all">All next steps</option>
              <option value="proposal">Proposal/estimate action</option>
              <option value="follow_up">Sales follow-up</option>
            </select>
          </Field>
        </div>
      </Panel>

      <div className="grid gap-4 overflow-x-auto pb-2 xl:grid-cols-6">
        {opportunityStages.map((stage) => {
          const opportunities = filteredOpportunities.filter((opp) => opp.stage === stage);
          return (
            <Panel key={stage} className="min-w-72">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold">{opportunityStageLabel(stage)}</h2>
                <Badge>{opportunities.length}</Badge>
              </div>
              <div className="mt-4 grid gap-3">
                {opportunities.map((opp) => {
                  const lead = opp.leadId ? leadsById.get(opp.leadId) : undefined;
                  const customer = customersById.get(opp.customerId);
                  const property = propertiesById.get(opp.propertyId);
                  const primaryContact = primaryContactByCustomerId.get(opp.customerId);
                  const owner = membersById.get(opp.ownerId);
                  const ageDays = Math.max(0, Math.floor((nowMs - opp.updatedAt) / (24 * 60 * 60 * 1000)));
                  const nextStep = ["estimating", "proposal_sent"].includes(opp.stage) ? "Proposal action" : opp.stage === "qualified" ? "Sales follow-up" : opp.stage === "new" ? "Qualify lead" : "Closeout";
                  const existingEstimate = workspace.estimates.find((estimate) => estimate.opportunityId === opp.id);
                  const quoteMessage = quoteMessages[opp.id];
                  const sendMessage = existingEstimate ? sendMessages[existingEstimate.id] : undefined;
                  const acceptMessage = existingEstimate ? acceptMessages[existingEstimate.id] : undefined;
                  const convertMessage = existingEstimate ? convertMessages[existingEstimate.id] : undefined;
                  const linkedJob = existingEstimate ? workspace.jobs.find((job) => job.estimateId === existingEstimate.id) : undefined;
                  const sendDisabledReason = existingEstimate ? quoteSendDisabledReason(existingEstimate) : "";
                  const packageOptions = packageOptionsForOpportunity(opp);
                  const selectedServicePackage = packageOptions.find((servicePackage) => servicePackage.id === selectedPackageByOpportunity[opp.id]) ?? packageOptions[0];
                  return (
                    <div key={opp.id} className="rounded-md border border-stone-200 p-3">
                      <div className="font-semibold">{opp.title}</div>
                      <div className="mt-1 text-sm text-stone-500">{customer?.name}</div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {lead?.source ? <Badge>{lead.source}</Badge> : null}
                        {opp.serviceLines.map((service) => <Badge key={service}>{categoryLabels[service]}</Badge>)}
                        {owner ? <Badge>{owner.name}</Badge> : null}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div><div className="font-bold">{currency(opp.valueCents)}</div><div className="text-xs text-stone-500">Value</div></div>
                        <div><div className="font-bold">{opp.closeProbability}%</div><div className="text-xs text-stone-500">Prob.</div></div>
                        <div><div className="font-bold">{ageDays}d</div><div className="text-xs text-stone-500">Age</div></div>
                      </div>
                      <div className="mt-3 rounded-md bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-600">{nextStep}</div>
                      <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Quote from lead</div>
                            <div className="mt-1 text-xs leading-5 text-stone-500">Uses customer, property, package assumptions, and opportunity value.</div>
                          </div>
                          {existingEstimate ? (
                            <Badge tone={statusTone(existingEstimate.status)}>{existingEstimate.estimateNumber}</Badge>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Create quote for ${opp.title}`}
                              onClick={() => void handleCreateQuote(opp)}
                              disabled={quoteMessage?.state === "submitting" || opp.stage === "won" || opp.stage === "lost"}
                              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#224036] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a332b] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <FileText size={15} />
                              {quoteMessage?.state === "submitting" ? "Creating" : "Create Quote"}
                            </button>
                          )}
                        </div>
                        {packageOptions.length > 0 ? (
                          <div className="mt-3 grid gap-2">
                            <label className="text-xs font-semibold uppercase tracking-normal text-stone-500" htmlFor={`quote-package-${opp.id}`}>Service package</label>
                            <select
                              id={`quote-package-${opp.id}`}
                              aria-label={`Service package for ${opp.title}`}
                              className={inputClass()}
                              value={selectedServicePackage?.id ?? ""}
                              onChange={(event) => setSelectedPackageByOpportunity((current) => ({ ...current, [opp.id]: event.target.value }))}
                              disabled={Boolean(existingEstimate) || quoteMessage?.state === "submitting" || opp.stage === "won" || opp.stage === "lost"}
                            >
                              {packageOptions.map((servicePackage) => (
                                <option key={`${opp.id}-${servicePackage.id}`} value={servicePackage.id}>
                                  {servicePackage.name} - {currency(servicePackage.defaultPriceCents)}
                                </option>
                              ))}
                            </select>
                            {selectedServicePackage ? (
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="rounded-md border border-stone-200 bg-white p-2">
                                  <div className="font-semibold">{selectedServicePackage.laborHours ?? 0}h</div>
                                  <div className="text-stone-500">Labor</div>
                                </div>
                                <div className="rounded-md border border-stone-200 bg-white p-2">
                                  <div className="font-semibold">{currency(selectedServicePackage.materialCostCents ?? 0)}</div>
                                  <div className="text-stone-500">Materials</div>
                                </div>
                                <div className="rounded-md border border-stone-200 bg-white p-2">
                                  <div className="font-semibold">{percent(selectedServicePackage.targetMarginPercent ?? 0)}</div>
                                  <div className="text-stone-500">Target margin</div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {existingEstimate ? (
                          <div role="region" className="mt-3 rounded-md border border-stone-200 bg-white p-3" aria-label={`Customer quote package ${existingEstimate.estimateNumber}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Customer Quote Package</div>
                                <div className="mt-1 font-semibold">{existingEstimate.estimateNumber} - {customer?.name ?? "Customer"}</div>
                                <div className="mt-1 text-xs leading-5 text-stone-500">
                                  {primaryContact?.email ?? primaryContact?.phone ?? "No primary contact"} - {property ? `${property.label}, ${property.city}` : "No property selected"}
                                </div>
                              </div>
                              <Badge tone={statusTone(existingEstimate.status)}>{formatStatus(existingEstimate.status)}</Badge>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                              <div className="rounded-md border border-stone-200 bg-stone-50 p-2">
                                <div className="font-semibold">{currency(existingEstimate.totalCents)}</div>
                                <div className="text-stone-500">Quote total</div>
                              </div>
                              <div className="rounded-md border border-stone-200 bg-stone-50 p-2">
                                <div className="font-semibold">{existingEstimate.expiresAt ? shortDate(existingEstimate.expiresAt) : "14 days after send"}</div>
                                <div className="text-stone-500">Expiration</div>
                              </div>
                              <div className="rounded-md border border-stone-200 bg-stone-50 p-2">
                                <div className="font-semibold">{formatStatus(existingEstimate.approvalStatus ?? "not_required")}</div>
                                <div className="text-stone-500">Internal approval</div>
                              </div>
                              <div className="rounded-md border border-stone-200 bg-stone-50 p-2">
                                <div className="font-semibold">{existingEstimate.acceptedAt ? shortDate(existingEstimate.acceptedAt) : "Not captured"}</div>
                                <div className="text-stone-500">Customer approval</div>
                              </div>
                            </div>
                            <div className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">
                              <span className="font-semibold text-stone-800">Scope: </span>
                              {opp.serviceLines.map((service) => categoryLabels[service]).join(", ")} for {property?.label ?? customer?.name ?? "customer property"}.
                            </div>
                            <div className="mt-2 rounded-md bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">
                              <span className="font-semibold text-stone-800">Terms: </span>
                              {existingEstimate.terms ?? "Review scope, pricing, add-ons, and expiration before sending to the customer."}
                            </div>
                            {existingEstimate.acceptedAt ? (
                              <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
                                <span className="font-semibold">Approved by {existingEstimate.acceptedByName ?? "customer"}</span>
                                {existingEstimate.acceptedByEmail ? ` - ${existingEstimate.acceptedByEmail}` : ""} via {formatStatus(existingEstimate.acceptanceSource ?? "office")}.
                              </div>
                            ) : null}
                            {linkedJob ? (
                              <div className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-950">
                                <span className="font-semibold">Operations handoff ready:</span> {linkedJob.title} has {workspace.visits.filter((visit) => visit.jobId === linkedJob.id).length} scheduled visit.
                              </div>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {existingEstimate.status === "draft" ? (
                                <button
                                  type="button"
                                  aria-label={`Send quote ${existingEstimate.estimateNumber}`}
                                  disabled={Boolean(sendDisabledReason) || sendMessage?.state === "submitting"}
                                  onClick={() => void handleSendQuote(existingEstimate)}
                                  className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#224036] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a332b] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Send size={15} />
                                  {sendMessage?.state === "submitting" ? "Sending" : "Send Quote"}
                                </button>
                              ) : existingEstimate.status === "sent" ? (
                                <>
                                  <Badge tone="success">Customer-facing link ready</Badge>
                                  <button
                                    type="button"
                                    aria-label={`Capture approval ${existingEstimate.estimateNumber}`}
                                    disabled={acceptMessage?.state === "submitting"}
                                    onClick={() => void handleAcceptQuote(existingEstimate, customer, primaryContact)}
                                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#224036] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a332b] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Check size={15} />
                                    {acceptMessage?.state === "submitting" ? "Capturing" : "Capture Approval"}
                                  </button>
                                </>
                              ) : existingEstimate.status === "accepted" ? (
                                <>
                                  <Badge tone="success">Customer approved</Badge>
                                  {linkedJob ? (
                                    <button
                                      type="button"
                                      aria-label={`Open job ${linkedJob.title}`}
                                      onClick={() => openJob(linkedJob.id)}
                                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
                                    >
                                      <ClipboardCheck size={15} />
                                      Open Job
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      aria-label={`Convert estimate ${existingEstimate.estimateNumber} to job`}
                                      disabled={convertMessage?.state === "submitting"}
                                      onClick={() => void handleConvertQuote(existingEstimate)}
                                      className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#224036] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a332b] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <ClipboardCheck size={15} />
                                      {convertMessage?.state === "submitting" ? "Converting" : "Convert to Job"}
                                    </button>
                                  )}
                                </>
                              ) : (
                                <Badge>{formatStatus(existingEstimate.status)}</Badge>
                              )}
                              {sendDisabledReason ? <span className="text-xs font-semibold text-amber-700">{sendDisabledReason}</span> : null}
                            </div>
                            {sendMessage ? (
                              <div className={cn("mt-2 rounded-md border px-2 py-1 text-xs font-semibold", sendMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                                {sendMessage.message}
                              </div>
                            ) : null}
                            {acceptMessage ? (
                              <div className={cn("mt-2 rounded-md border px-2 py-1 text-xs font-semibold", acceptMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                                {acceptMessage.message}
                              </div>
                            ) : null}
                            {convertMessage ? (
                              <div className={cn("mt-2 rounded-md border px-2 py-1 text-xs font-semibold", convertMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-sky-200 bg-sky-50 text-sky-900")}>
                                {convertMessage.message}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {quoteMessage ? (
                          <div className={cn("mt-2 rounded-md border px-2 py-1 text-xs font-semibold", quoteMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                            {quoteMessage.message}
                          </div>
                        ) : null}
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
                  );
                })}
                {opportunities.length === 0 ? <div className="rounded-md border border-dashed border-stone-200 p-4 text-sm text-stone-500">No opportunities match the current filters.</div> : null}
              </div>
            </Panel>
          );
        })}
      </div>
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
  moveRouteStop,
  generateRecurringRoute,
}: {
  workspace: WorkspaceSnapshot;
  operatingDepth: OperatingDepth;
  customersById: Map<string, WorkspaceSnapshot["customers"][number]>;
  propertiesById: Map<string, WorkspaceSnapshot["properties"][number]>;
  crewsById: Map<string, WorkspaceSnapshot["crews"][number]>;
  jobsById: Map<string, WorkspaceSnapshot["jobs"][number]>;
  assignCrew: (visitId: string, crewId: string) => void;
  moveRouteStop: (visitId: string, direction: "up" | "down") => void;
  generateRecurringRoute: (input: {
    jobId: string;
    frequency: "weekly" | "biweekly" | "monthly" | "seasonal" | "custom";
    count: number;
    firstStart: number;
    durationMinutes: number;
    crewId?: string;
  }) => Promise<{ planId: string; visitIds: string[]; generatedCount: number }>;
}) {
  const [routeMessages, setRouteMessages] = useState<Record<string, string>>({});
  const defaultRecurringPlan = workspace.recurringServicePlans.find((plan) => plan.status === "active") ?? workspace.recurringServicePlans[0];
  const defaultRecurringJobId = defaultRecurringPlan?.jobId ?? workspace.jobs[0]?.id ?? "";
  const defaultRecurringCrewId = defaultRecurringPlan?.crewId ?? workspace.crews.find((crew) => crew.active)?.id ?? workspace.crews[0]?.id ?? "";
  const [recurringJobId, setRecurringJobId] = useState(defaultRecurringJobId);
  const [recurringFrequency, setRecurringFrequency] = useState<"weekly" | "biweekly" | "monthly" | "seasonal" | "custom">(defaultRecurringPlan?.frequency ?? "weekly");
  const [recurringCount, setRecurringCount] = useState("4");
  const [recurringDurationMinutes, setRecurringDurationMinutes] = useState(String(defaultRecurringPlan?.visitDurationMinutes ?? 180));
  const [recurringCrewId, setRecurringCrewId] = useState(defaultRecurringCrewId);
  const [recurringMessage, setRecurringMessage] = useState<{ state: "success" | "error" | "pending"; message: string } | null>(null);
  const routeByVisitId = new Map(operatingDepth.fieldOps.routeConfidence.map((route) => [route.visitId, route]));
  const equipmentByVisitId = new Map<string, OperatingDepth["fieldOps"]["equipmentCheckouts"]>();
  for (const checkout of operatingDepth.fieldOps.equipmentCheckouts) {
    const existing = equipmentByVisitId.get(checkout.visitId) ?? [];
    existing.push(checkout);
    equipmentByVisitId.set(checkout.visitId, existing);
  }
  const sortedVisits = workspace.visits
    .slice()
    .sort((a, b) => a.routeOrder - b.routeOrder || a.scheduledStart - b.scheduledStart || a.id.localeCompare(b.id));
  const activeRecurringPlans = workspace.recurringServicePlans.filter((plan) => plan.status === "active");

  async function handleGenerateRecurringRoute(event: FormEvent) {
    event.preventDefault();
    const job = workspace.jobs.find((item) => item.id === recurringJobId) ?? workspace.jobs[0];
    if (!job) {
      setRecurringMessage({ state: "error", message: "Choose a job before generating recurring visits." });
      return;
    }
    const count = Number.parseInt(recurringCount, 10);
    const durationMinutes = Number.parseInt(recurringDurationMinutes, 10);
    if (!Number.isFinite(count) || count < 1 || !Number.isFinite(durationMinutes) || durationMinutes < 30) {
      setRecurringMessage({ state: "error", message: "Use at least 1 visit and at least 30 minutes per visit." });
      return;
    }

    const firstStart = new Date();
    firstStart.setDate(firstStart.getDate() + 7);
    firstStart.setHours(9, 0, 0, 0);
    setRecurringMessage({ state: "pending", message: `Generating ${count} ${formatStatus(recurringFrequency)} visits for ${job.title}.` });

    try {
      const result = await generateRecurringRoute({
        jobId: job.id,
        frequency: recurringFrequency,
        count,
        firstStart: firstStart.getTime(),
        durationMinutes,
        crewId: recurringCrewId || undefined,
      });
      setRecurringMessage({ state: "success", message: `Generated ${result.generatedCount} ${formatStatus(recurringFrequency)} visits for ${job.title}.` });
    } catch {
      setRecurringMessage({ state: "error", message: "Recurring route could not be generated. Check permissions and try again." });
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Panel>
        <h2 className="text-base font-bold">Schedule</h2>
        <div className="mt-4 grid gap-3">
          {sortedVisits
            .map((visit, index) => {
              const property = visit.propertyId ? propertiesById.get(visit.propertyId) : undefined;
              const jobTitle = jobsById.get(visit.jobId)?.title ?? "visit";
              const route = routeByVisitId.get(visit.id);
              const equipment = equipmentByVisitId.get(visit.id) ?? [];
              return (
                <div key={visit.id} role="region" aria-label={`Dispatch route stop ${visit.routeOrder} ${jobTitle}`} className="grid gap-3 rounded-md border border-stone-200 p-3 lg:grid-cols-[150px_1fr_210px_180px_150px] lg:items-center">
                  <div>
                    <div className="font-semibold">{timeRange(visit.scheduledStart, visit.scheduledEnd)}</div>
                    <div className="mt-1 text-sm text-stone-500">Stop {visit.routeOrder}</div>
                    <div className="mt-2 flex gap-1">
                      <IconButton
                        title={`Move route stop up for ${jobTitle}`}
                        onClick={() => {
                          moveRouteStop(visit.id, "up");
                          setRouteMessages((current) => ({ ...current, [visit.id]: `${jobTitle} moved earlier in route order.` }));
                        }}
                        disabled={index === 0}
                      >
                        <ArrowUp size={15} />
                      </IconButton>
                      <IconButton
                        title={`Move route stop down for ${jobTitle}`}
                        onClick={() => {
                          moveRouteStop(visit.id, "down");
                          setRouteMessages((current) => ({ ...current, [visit.id]: `${jobTitle} moved later in route order.` }));
                        }}
                        disabled={index === sortedVisits.length - 1}
                      >
                        <ArrowDown size={15} />
                      </IconButton>
                    </div>
                    {routeMessages[visit.id] ? <div className="mt-2 text-xs font-semibold text-[#224036]">{routeMessages[visit.id]}</div> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{jobTitle}</div>
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
                  <select aria-label={`Assign crew for ${jobTitle}`} className={inputClass()} value={visit.crewId} onChange={(event) => assignCrew(visit.id, event.target.value)}>
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
      <div className="grid gap-4">
        <Panel>
          <h2 className="text-base font-bold">Recurring Route Generator</h2>
          <form className="mt-4 grid gap-3" onSubmit={handleGenerateRecurringRoute}>
            <Field label="Job">
              <select aria-label="Recurring job" className={inputClass()} value={recurringJobId} onChange={(event) => setRecurringJobId(event.target.value)}>
                {workspace.jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Frequency">
                <select aria-label="Recurring frequency" className={inputClass()} value={recurringFrequency} onChange={(event) => setRecurringFrequency(event.target.value as typeof recurringFrequency)}>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>
              <Field label="Visits">
                <input aria-label="Recurring visit count" className={inputClass()} value={recurringCount} onChange={(event) => setRecurringCount(event.target.value)} inputMode="numeric" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Duration">
                <input aria-label="Recurring visit duration minutes" className={inputClass()} value={recurringDurationMinutes} onChange={(event) => setRecurringDurationMinutes(event.target.value)} inputMode="numeric" />
              </Field>
              <Field label="Crew">
                <select aria-label="Recurring crew" className={inputClass()} value={recurringCrewId} onChange={(event) => setRecurringCrewId(event.target.value)}>
                  <option value="">Unassigned</option>
                  {workspace.crews.map((crew) => (
                    <option key={crew.id} value={crew.id}>{crew.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#224036] px-3 py-2 text-sm font-semibold text-white">
              <Route size={16} />
              Generate Recurring Route
            </button>
            {recurringMessage ? (
              <div className={cn("rounded-md border px-3 py-2 text-sm font-semibold", recurringMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : recurringMessage.state === "pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                {recurringMessage.message}
              </div>
            ) : null}
          </form>
          <div className="mt-4 grid gap-2">
            <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Active recurring plans</div>
            {activeRecurringPlans.map((plan) => (
              <div key={plan.id} className="rounded-md border border-stone-200 p-2 text-sm">
                <div className="font-semibold">{plan.name}</div>
                <div className="mt-1 text-xs text-stone-500">{formatStatus(plan.frequency)} - {plan.generatedVisitIds?.length ?? 0} generated - next {shortDate(plan.nextRunAt)}</div>
              </div>
            ))}
            {activeRecurringPlans.length === 0 ? <div className="rounded-md border border-dashed border-stone-200 p-2 text-sm text-stone-500">No active recurring plans yet.</div> : null}
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
  membersById,
  jobTaskForm,
  setJobTaskForm,
  jobTaskMessage,
  addJobTask,
  activityForm,
  setActivityForm,
  addActivity,
  toggleTask,
  createChangeOrder,
  approveChangeOrder,
  operatingActions,
}: {
  workspace: WorkspaceSnapshot;
  operatingDepth: OperatingDepth;
  selectedJob?: WorkspaceSnapshot["jobs"][number];
  setSelectedJobId: (id: string) => void;
  customersById: Map<string, WorkspaceSnapshot["customers"][number]>;
  propertiesById: Map<string, WorkspaceSnapshot["properties"][number]>;
  crewsById: Map<string, WorkspaceSnapshot["crews"][number]>;
  membersById: Map<string, WorkspaceSnapshot["members"][number]>;
  jobTaskForm: JobTaskFormState;
  setJobTaskForm: (value: JobTaskFormState) => void;
  jobTaskMessage: { state: "success" | "error" | "pending"; message: string } | null;
  addJobTask: (event: FormEvent) => void;
  activityForm: ActivityComposerState;
  setActivityForm: (value: ActivityComposerState) => void;
  addActivity: (event: FormEvent) => void;
  toggleTask: (taskId: string) => void;
  createChangeOrder: (input: {
    jobId: string;
    title: string;
    description: string;
    requestedByName?: string;
    revenueDeltaCents: number;
    estimatedCostDeltaCents: number;
    scheduleImpactDays: number;
  }) => Promise<string>;
  approveChangeOrder: (input: { changeOrderId: string; approvedByName: string; approvedByEmail?: string }) => Promise<{ changeOrderId: string; taskId: string }>;
  operatingActions?: OperatingActions;
}) {
  const visits = selectedJob ? workspace.visits.filter((visit) => visit.jobId === selectedJob.id) : [];
  const phases = selectedJob ? [...workspace.jobPhases.filter((phase) => phase.jobId === selectedJob.id)].sort((left, right) => left.sortOrder - right.sortOrder) : [];
  const tasks = selectedJob ? workspace.tasks.filter((task) => task.entityType === "job" && task.entityId === selectedJob.id) : [];
  const jobActivities = selectedJob ? workspace.activities.filter((activity) => activity.entityType === "job" && activity.entityId === selectedJob.id) : [];
  const changeOrders = selectedJob ? workspace.changeOrders.filter((changeOrder) => changeOrder.jobId === selectedJob.id) : [];
  const jobNotes = selectedJob ? workspace.notes.filter((note) => note.entityType === "job" && note.entityId === selectedJob.id) : [];
  const relatedFiles = selectedJob
    ? workspace.files.filter((file) =>
        (file.entityType === "job" && file.entityId === selectedJob.id) ||
        (selectedJob.estimateId && file.entityType === "estimate" && file.entityId === selectedJob.estimateId) ||
        (selectedJob.propertyId && file.entityType === "property" && file.entityId === selectedJob.propertyId) ||
        (file.entityType === "customer" && file.entityId === selectedJob.customerId),
      )
    : [];
  const property = selectedJob?.propertyId ? propertiesById.get(selectedJob.propertyId) : undefined;
  const selectedSummary = selectedJob ? operatingDepth.jobCosting.summaries.find((summary) => summary.jobId === selectedJob.id) : undefined;
  const selectedTime = selectedJob ? operatingDepth.fieldOps.timeBreakdowns.find((row) => row.jobId === selectedJob.id) : undefined;
  const defaultTaskOwnerId = selectedJob && membersById.has(selectedJob.managerId) ? selectedJob.managerId : workspace.members[0]?.id ?? "";
  const taskOwnerId = jobTaskForm.assignedUserId || defaultTaskOwnerId;
  const selectedVisitIds = new Set(visits.map((visit) => visit.id));
  const selectedCallbacks = selectedJob ? operatingDepth.fieldOps.callbacks.filter((callback) => callback.jobTitle === selectedJob.title) : [];
  const selectedMaterialLots = operatingDepth.fieldOps.materialLots.filter((lot) => selectedVisitIds.has(lot.visitId));
  const selectedEquipment = operatingDepth.fieldOps.equipmentCheckouts.filter((checkout) => selectedVisitIds.has(checkout.visitId));
  const selectedInvoices = selectedJob ? operatingDepth.revenue.invoices.filter((invoice) => invoice.jobId === selectedJob.id) : [];
  const openVisitCount = visits.filter((visit) => !["complete", "canceled"].includes(visit.status)).length;
  const openTaskCount = tasks.filter((task) => ["open", "in_progress"].includes(task.status)).length;
  const invoiceReady = Boolean(selectedSummary && selectedSummary.actualRevenueCents > 0);
  const displayPhases = selectedJob
    ? phases.length > 0
      ? phases
      : [
          { id: "fallback-phase-1", jobId: selectedJob.id, name: "Sales handoff", status: selectedJob.status, sortOrder: 1, startDate: selectedJob.startDate, dueDate: selectedJob.startDate },
          { id: "fallback-phase-2", jobId: selectedJob.id, name: "Production visit", status: selectedJob.status, sortOrder: 2, startDate: visits[0]?.scheduledStart, dueDate: visits[0]?.scheduledEnd },
          { id: "fallback-phase-3", jobId: selectedJob.id, name: "Completion review", status: selectedJob.status, sortOrder: 3, startDate: visits.at(-1)?.scheduledEnd, dueDate: visits.at(-1)?.scheduledEnd },
        ]
    : [];
  const jobTimeline = [
    ...displayPhases.map((phase) => ({ id: `phase-${phase.id}`, label: `Phase: ${phase.name}`, detail: `${formatStatus(phase.status)}${phase.dueDate ? ` - due ${shortDate(phase.dueDate)}` : ""}`, at: phase.completedAt ?? phase.dueDate ?? phase.startDate ?? selectedJob?.startDate ?? 0, tone: phase.status === "completed" ? "success" : phase.status === "blocked" ? "danger" : "neutral" })),
    ...visits.map((visit) => ({ id: `visit-${visit.id}`, label: `Visit ${visitStatusLabel(visit.status)}`, detail: `${shortDate(visit.scheduledStart)} - ${timeRange(visit.scheduledStart, visit.scheduledEnd)}`, at: visit.scheduledStart, tone: visit.status === "complete" ? "success" : visit.status === "missed" ? "danger" : "neutral" })),
    ...tasks.map((task) => ({ id: `task-${task.id}`, label: `Task: ${task.title}`, detail: `${formatStatus(task.status)} - ${membersById.get(task.assignedUserId)?.name ?? "Unassigned"}`, at: task.dueAt, tone: task.status === "done" ? "success" : task.priority === "high" ? "warning" : "neutral" })),
    ...changeOrders.map((changeOrder) => ({ id: `co-${changeOrder.id}`, label: `Change order: ${changeOrder.title}`, detail: `${formatStatus(changeOrder.status)} - ${currency(changeOrder.revenueDeltaCents)}`, at: changeOrder.approvedAt ?? changeOrder.requestedAt, tone: changeOrder.status === "approved" ? "success" : changeOrder.status === "pending_approval" ? "warning" : "neutral" })),
    ...selectedInvoices.map((invoice) => ({ id: `invoice-${invoice.id}`, label: `Invoice ${invoice.invoiceNumber}`, detail: `${formatStatus(invoice.status)} - ${currency(invoice.balanceCents)} open`, at: invoice.dueAt ?? selectedJob?.startDate ?? 0, tone: invoice.balanceCents > 0 ? "warning" : "success" })),
    ...jobActivities.map((activity) => ({ id: `activity-${activity.id}`, label: activity.summary, detail: formatStatus(activity.kind), at: activity.occurredAt, tone: "neutral" })),
  ].sort((left, right) => right.at - left.at);
  const [changeOrderForm, setChangeOrderForm] = useState({
    title: "Additional landscape scope",
    description: "Customer requested extra work while the job is already active.",
    requestedByName: "",
    revenueDelta: "1250",
    estimatedCostDelta: "520",
    scheduleImpactDays: "2",
  });
  const [changeOrderMessage, setChangeOrderMessage] = useState<{ state: "success" | "error" | "pending"; message: string } | null>(null);
  const [closeoutMessage, setCloseoutMessage] = useState<{ state: "success" | "error" | "pending"; message: string } | null>(null);

  async function handleCreateChangeOrder(event: FormEvent) {
    event.preventDefault();
    if (!selectedJob) return;
    const title = changeOrderForm.title.trim();
    const description = changeOrderForm.description.trim();
    if (!title || !description) {
      setChangeOrderMessage({ state: "error", message: "Change order title and scope are required." });
      return;
    }
    const revenueDeltaCents = dollarsToCents(changeOrderForm.revenueDelta);
    const estimatedCostDeltaCents = dollarsToCents(changeOrderForm.estimatedCostDelta);
    const scheduleImpactDays = Math.max(0, Math.min(90, Math.round(Number(changeOrderForm.scheduleImpactDays || "0"))));
    setChangeOrderMessage({ state: "pending", message: `Creating change order ${title}.` });
    try {
      await createChangeOrder({
        jobId: selectedJob.id,
        title,
        description,
        requestedByName: changeOrderForm.requestedByName.trim() || undefined,
        revenueDeltaCents,
        estimatedCostDeltaCents,
        scheduleImpactDays,
      });
      setChangeOrderMessage({ state: "success", message: `Change order ${title} created for customer approval.` });
      setChangeOrderForm((current) => ({ ...current, title: "", description: "", requestedByName: "" }));
    } catch {
      setChangeOrderMessage({ state: "error", message: "Change order could not be created. Check permissions and try again." });
    }
  }

  async function handleApproveChangeOrder(changeOrder: WorkspaceSnapshot["changeOrders"][number]) {
    setChangeOrderMessage({ state: "pending", message: `Approving change order ${changeOrder.title}.` });
    try {
      await approveChangeOrder({
        changeOrderId: changeOrder.id,
        approvedByName: changeOrder.requestedByName ?? customersById.get(changeOrder.customerId)?.name ?? "Customer",
        approvedByEmail: customersById.get(changeOrder.customerId)?.email,
      });
      setChangeOrderMessage({ state: "success", message: `Change order ${changeOrder.title} approved and scheduling task created.` });
    } catch (error) {
      const detail = error instanceof Error ? userFacingWriteError(error) : "Check approval permission and try again.";
      setChangeOrderMessage({ state: "error", message: `Change order could not be approved. ${detail}` });
    }
  }

  async function handleCloseJob(forceWithExceptions: boolean) {
    if (!selectedJob) return;
    setCloseoutMessage({ state: "pending", message: forceWithExceptions ? "Closing job with documented exceptions." : "Validating job closeout." });
    try {
      const result = await operatingActions?.closeJob?.(selectedJob.id, forceWithExceptions, true);
      const blockers = result?.blockers ?? [];
      const invoiceNumber = result?.invoice?.invoiceNumber;
      setCloseoutMessage({
        state: "success",
        message: `Job closeout saved${invoiceNumber ? ` and invoice ${invoiceNumber} prepared` : ""}${blockers.length ? ` with ${blockers.length} exception${blockers.length === 1 ? "" : "s"}` : ""}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Resolve closeout blockers or use exceptions.";
      setCloseoutMessage({ state: "error", message });
    }
  }

  async function handleGenerateInvoice() {
    if (!selectedJob) return;
    setCloseoutMessage({ state: "pending", message: "Generating invoice from job work and approved changes." });
    try {
      const result = await operatingActions?.generateInvoiceFromJob?.(selectedJob.id, "sent", 14);
      setCloseoutMessage({ state: "success", message: result?.created === false ? `Invoice ${result.invoiceNumber} already exists for this job.` : `Invoice ${result?.invoiceNumber ?? "created"} generated for finance.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invoice could not be generated.";
      setCloseoutMessage({ state: "error", message });
    }
  }

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
                <Metric label="Change orders" value={String(changeOrders.length)} tone={changeOrders.some((changeOrder) => changeOrder.status === "pending_approval") ? "warning" : "success"} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {visits.map((visit) => (
                  <div key={visit.id} className="rounded-md border border-stone-200 p-3">
                    <div className="font-semibold">{shortDate(visit.scheduledStart)} - {timeRange(visit.scheduledStart, visit.scheduledEnd)}</div>
                    <div className="mt-1 text-sm text-stone-500">{crewsById.get(visit.crewId)?.name}</div>
                    <div className="mt-3">
                      <Badge tone={statusTone(visit.status)}>{visitStatusLabel(visit.status)}</Badge>
                    </div>
                    <div className="mt-3 grid gap-1 text-xs text-stone-600">
                      {visit.checklist.slice(0, 4).map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Check size={13} className={item.isDone ? "text-emerald-700" : "text-stone-300"} />
                          <span className={cn(item.isDone && "line-through")}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Closeout + Billing</h2>
              <div className="mt-1 text-sm text-stone-500">Validates completion, cost, margin, invoice readiness, and audit trail before finance handoff.</div>
            </div>
            <Badge tone={selectedJob?.status === "completed" ? "success" : openVisitCount || openTaskCount ? "warning" : "success"}>
              {selectedJob?.status === "completed" ? "closed" : openVisitCount || openTaskCount ? "exceptions" : "ready"}
            </Badge>
          </div>
          {selectedJob ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Open visits" value={String(openVisitCount)} tone={openVisitCount > 0 ? "warning" : "success"} />
                <Metric label="Open tasks" value={String(openTaskCount)} tone={openTaskCount > 0 ? "warning" : "success"} />
                <Metric label="Margin" value={percent(selectedSummary?.grossMarginPercent ?? 0)} tone={(selectedSummary?.grossMarginPercent ?? 0) >= 30 ? "success" : "warning"} />
                <Metric label="Invoice balance" value={currency(selectedInvoices.reduce((sum, invoice) => sum + invoice.balanceCents, 0))} />
              </div>
              <div className="rounded-md border border-stone-200 p-3">
                <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Invoice readiness</div>
                <div className="mt-2 grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3"><span>Billable revenue</span><Badge tone={invoiceReady ? "success" : "danger"}>{invoiceReady ? currency(selectedSummary?.actualRevenueCents ?? 0) : "missing"}</Badge></div>
                  <div className="flex items-center justify-between gap-3"><span>Existing invoices</span><Badge>{selectedInvoices.length}</Badge></div>
                  <div className="flex items-center justify-between gap-3"><span>Collected</span><strong>{currency(selectedSummary?.collectedCents ?? 0)}</strong></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <TextButton type="button" icon={<Check size={16} />} onClick={() => void handleCloseJob(false)} disabled={!operatingActions?.closeJob}>Close Job</TextButton>
                  <TextButton type="button" variant="secondary" icon={<AlertTriangle size={16} />} onClick={() => void handleCloseJob(true)} disabled={!operatingActions?.closeJob}>Close With Exceptions</TextButton>
                  <TextButton type="button" variant="secondary" icon={<Receipt size={16} />} onClick={() => void handleGenerateInvoice()} disabled={!operatingActions?.generateInvoiceFromJob}>Generate Invoice</TextButton>
                </div>
              </div>
              {closeoutMessage ? (
                <div className={cn("rounded-md border px-3 py-2 text-sm font-semibold lg:col-span-2", closeoutMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : closeoutMessage.state === "pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                  {closeoutMessage.message}
                </div>
              ) : null}
              {selectedInvoices.length > 0 ? (
                <div className="grid gap-2 lg:col-span-2 md:grid-cols-2">
                  {selectedInvoices.map((invoice) => (
                    <div key={invoice.id} className="rounded-md border border-stone-200 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">{invoice.invoiceNumber}</div>
                        <Badge tone={operatingTone(invoice.status)}>{formatStatus(invoice.status)}</Badge>
                      </div>
                      <div className="mt-1 text-stone-500">{currency(invoice.totalCents)} total - {currency(invoice.balanceCents)} open - due {invoice.dueAt ? shortDate(invoice.dueAt) : "not set"}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Job Workspace</h2>
              <div className="mt-1 text-sm text-stone-500">Phases, budget, visits, files, comments, and timeline in one operating view.</div>
            </div>
            <Badge>{displayPhases.length} phases</Badge>
          </div>
          {selectedJob ? (
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                {displayPhases.map((phase) => (
                  <div key={phase.id} role="group" aria-label={`Job phase ${phase.name}`} className="rounded-md border border-stone-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Phase {phase.sortOrder}</div>
                        <div className="mt-1 font-semibold">{phase.name}</div>
                      </div>
                      <Badge tone={statusTone(phase.status)}>{formatStatus(phase.status)}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-stone-500">Due {phase.dueDate ? shortDate(phase.dueDate) : "not set"}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold">Files + Comments</h3>
                    <Badge>{relatedFiles.length} files / {jobNotes.length} comments</Badge>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {relatedFiles.slice(0, 4).map((file) => (
                      <div key={file.id} className="flex items-center justify-between gap-3 rounded-md bg-stone-50 p-2 text-sm">
                        <span className="font-semibold">{file.fileName}</span>
                        <Badge>{formatStatus(file.entityType)}</Badge>
                      </div>
                    ))}
                    {relatedFiles.length === 0 ? <div className="rounded-md border border-dashed border-stone-200 p-3 text-sm text-stone-500">No files linked to this job yet.</div> : null}
                    {jobNotes.slice(0, 3).map((note) => (
                      <div key={note.id} className="rounded-md bg-stone-50 p-2 text-sm">
                        <div className="font-semibold">{formatStatus(note.visibility)} comment</div>
                        <div className="mt-1 text-stone-600">{note.body}</div>
                      </div>
                    ))}
                    {jobNotes.length === 0 ? <div className="rounded-md border border-dashed border-stone-200 p-3 text-sm text-stone-500">No job comments yet. Add one from Job Activity.</div> : null}
                  </div>
                </div>

                <div className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold">Workspace Timeline</h3>
                    <Badge>{jobTimeline.length} events</Badge>
                  </div>
                  <div className="mt-3 grid max-h-[360px] gap-2 overflow-auto pr-1">
                    {jobTimeline.slice(0, 12).map((item) => (
                      <div key={item.id} role="group" aria-label={`Job timeline ${item.label}`} className="grid grid-cols-[auto_1fr] gap-3 rounded-md border border-stone-100 p-2 text-sm">
                        <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", item.tone === "success" ? "bg-emerald-600" : item.tone === "warning" ? "bg-amber-500" : item.tone === "danger" ? "bg-rose-600" : "bg-stone-300")} />
                        <span>
                          <span className="block font-semibold">{item.label}</span>
                          <span className="mt-0.5 block text-xs text-stone-500">{item.detail}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold">Change Orders</h2>
            <Badge tone={changeOrders.some((changeOrder) => changeOrder.status === "pending_approval") ? "warning" : "success"}>{changeOrders.length} tracked</Badge>
          </div>
          {selectedJob ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <form className="grid gap-3" onSubmit={handleCreateChangeOrder}>
                <Field label="Title">
                  <input aria-label="Change order title" className={inputClass()} value={changeOrderForm.title} onChange={(event) => setChangeOrderForm({ ...changeOrderForm, title: event.target.value })} />
                </Field>
                <Field label="Scope">
                  <textarea aria-label="Change order scope" className={cn(inputClass(), "min-h-20 resize-y py-2")} value={changeOrderForm.description} onChange={(event) => setChangeOrderForm({ ...changeOrderForm, description: event.target.value })} />
                </Field>
                <Field label="Requested by">
                  <input aria-label="Change order requested by" className={inputClass()} value={changeOrderForm.requestedByName} onChange={(event) => setChangeOrderForm({ ...changeOrderForm, requestedByName: event.target.value })} />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Revenue">
                    <input aria-label="Change order revenue delta" className={inputClass()} value={changeOrderForm.revenueDelta} onChange={(event) => setChangeOrderForm({ ...changeOrderForm, revenueDelta: event.target.value })} inputMode="decimal" />
                  </Field>
                  <Field label="Cost">
                    <input aria-label="Change order cost delta" className={inputClass()} value={changeOrderForm.estimatedCostDelta} onChange={(event) => setChangeOrderForm({ ...changeOrderForm, estimatedCostDelta: event.target.value })} inputMode="decimal" />
                  </Field>
                  <Field label="Days">
                    <input aria-label="Change order schedule impact days" className={inputClass()} value={changeOrderForm.scheduleImpactDays} onChange={(event) => setChangeOrderForm({ ...changeOrderForm, scheduleImpactDays: event.target.value })} inputMode="numeric" />
                  </Field>
                </div>
                <TextButton type="submit" icon={<Plus size={16} />}>Create Change Order</TextButton>
                {changeOrderMessage ? (
                  <div className={cn("rounded-md border px-3 py-2 text-sm font-semibold", changeOrderMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : changeOrderMessage.state === "pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                    {changeOrderMessage.message}
                  </div>
                ) : null}
              </form>
              <div className="grid gap-2">
                {changeOrders.map((changeOrder) => (
                  <div key={changeOrder.id} className="rounded-md border border-stone-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{changeOrder.title}</div>
                        <div className="mt-1 text-sm text-stone-500">{changeOrder.description}</div>
                      </div>
                      <Badge tone={changeOrder.status === "approved" ? "success" : changeOrder.status === "pending_approval" ? "warning" : "neutral"}>{formatStatus(changeOrder.status)}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                      <div><div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Revenue</div><div className="font-semibold">{currency(changeOrder.revenueDeltaCents)}</div></div>
                      <div><div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Cost</div><div className="font-semibold">{currency(changeOrder.estimatedCostDeltaCents)}</div></div>
                      <div><div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Margin</div><div className="font-semibold">{percent(changeOrder.grossMarginPercent)}</div></div>
                      <div><div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Schedule</div><div className="font-semibold">{changeOrder.scheduleImpactDays}d</div></div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                      <span>{changeOrder.approvedAt ? `Approved ${shortDate(changeOrder.approvedAt)}` : `Requested ${shortDate(changeOrder.requestedAt)}`}</span>
                      {changeOrder.status === "pending_approval" ? (
                        <TextButton type="button" icon={<Check size={16} />} onClick={() => void handleApproveChangeOrder(changeOrder)}>Approve Change Order</TextButton>
                      ) : null}
                    </div>
                  </div>
                ))}
                {changeOrders.length === 0 ? <div className="rounded-md border border-dashed border-stone-200 p-3 text-sm text-stone-500">No change orders for this job yet.</div> : null}
              </div>
            </div>
          ) : null}
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">Tasks</h2>
            <Badge>{tasks.length}</Badge>
          </div>
          <form onSubmit={addJobTask} className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_130px_130px_auto] lg:items-end">
            <Field label="Task">
              <input aria-label="Job task title" className={inputClass()} value={jobTaskForm.title} onChange={(event) => setJobTaskForm({ ...jobTaskForm, title: event.target.value })} placeholder="Add internal task" />
            </Field>
            <Field label="Owner">
              <select aria-label="Job task owner" className={inputClass()} value={taskOwnerId} onChange={(event) => setJobTaskForm({ ...jobTaskForm, assignedUserId: event.target.value })}>
                {workspace.members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Due days">
              <input aria-label="Job task due days" className={inputClass()} value={jobTaskForm.dueInDays} onChange={(event) => setJobTaskForm({ ...jobTaskForm, dueInDays: event.target.value })} inputMode="numeric" />
            </Field>
            <Field label="Priority">
              <select aria-label="Job task priority" className={inputClass()} value={jobTaskForm.priority} onChange={(event) => setJobTaskForm({ ...jobTaskForm, priority: event.target.value as JobTaskFormState["priority"] })}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </Field>
            <TextButton type="submit" icon={<Plus size={16} />}>Add Task</TextButton>
          </form>
          {jobTaskMessage ? (
            <div className={cn("mt-3 rounded-md border px-3 py-2 text-sm font-semibold", jobTaskMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : jobTaskMessage.state === "pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
              {jobTaskMessage.message}
            </div>
          ) : null}
          <div className="mt-4 grid gap-2">
            {tasks.map((task) => (
              <button key={task.id} type="button" onClick={() => toggleTask(task.id)} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3 text-left">
                <span className="min-w-0">
                  <span className={cn("block truncate font-medium", task.status === "done" && "text-stone-400 line-through")}>{task.title}</span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {membersById.get(task.assignedUserId)?.name ?? "Unassigned"} - due {shortDate(task.dueAt)} - {formatStatus(task.priority)}
                  </span>
                </span>
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
  selectedVisit: requestedVisit,
  setSelectedVisitId,
  customersById,
  contactsByCustomerId,
  propertiesById,
  crewsById,
  jobsById,
  issueFlag,
  setIssueFlag,
  startVisit,
  toggleChecklist,
  submitVisit,
  operatingActions,
}: {
  workspace: WorkspaceSnapshot;
  operatingDepth: OperatingDepth;
  selectedVisit?: JobVisit;
  setSelectedVisitId: (id: string) => void;
  customersById: Map<string, WorkspaceSnapshot["customers"][number]>;
  contactsByCustomerId: Map<string, WorkspaceSnapshot["contacts"]>;
  propertiesById: Map<string, WorkspaceSnapshot["properties"][number]>;
  crewsById: Map<string, WorkspaceSnapshot["crews"][number]>;
  jobsById: Map<string, WorkspaceSnapshot["jobs"][number]>;
  issueFlag: string;
  setIssueFlag: (value: string) => void;
  startVisit: (visit: JobVisit) => Promise<{ visitId?: string; timesheetEntryId?: string; startedAt?: number } | void>;
  toggleChecklist: (visitId: string, itemId: string) => void;
  submitVisit: (
    visit: JobVisit,
    input?: {
      notes?: string;
      issue?: FieldIssueSubmitInput;
      materialApplications?: Array<{ materialId: string; quantity: number; unit: string; targetAreaId?: string; notes?: string }>;
    },
  ) => Promise<{ visitId?: string; timesheetEntryId?: string; fieldIssueId?: string; issueTaskId?: string; issueOpportunityId?: string } | void>;
  operatingActions?: OperatingActions;
}) {
  const defaultSessionCrewId = requestedVisit?.crewId ?? workspace.visits.find((visit) => visit.crewId)?.crewId ?? "";
  const [fieldSessionRole, setFieldSessionRole] = useState<Role>("technician");
  const [fieldSessionCrewId, setFieldSessionCrewId] = useState(defaultSessionCrewId);
  const fieldRouteVisits = useMemo(
    () => [...workspace.visits].sort((a, b) => a.routeOrder - b.routeOrder || a.scheduledStart - b.scheduledStart || a.id.localeCompare(b.id)),
    [workspace.visits],
  );
  const fieldSessionCanSeeAll = ["owner", "admin", "manager", "dispatcher"].includes(fieldSessionRole);
  const fieldVisibleVisits = useMemo(
    () => fieldSessionCanSeeAll ? fieldRouteVisits : fieldRouteVisits.filter((visit) => visit.crewId && visit.crewId === fieldSessionCrewId),
    [fieldRouteVisits, fieldSessionCanSeeAll, fieldSessionCrewId],
  );
  const selectedVisit = fieldVisibleVisits.find((visit) => visit.id === requestedVisit?.id) ?? fieldVisibleVisits[0];
  const property = selectedVisit?.propertyId ? propertiesById.get(selectedVisit.propertyId) : undefined;
  const customer = selectedVisit ? customersById.get(selectedVisit.customerId) : undefined;
  const selectedContacts = selectedVisit ? contactsByCustomerId.get(selectedVisit.customerId) ?? [] : [];
  const primaryContact = selectedContacts.find((contact) => contact.isPrimary) ?? selectedContacts[0];
  const selectedRoute = selectedVisit ? operatingDepth.fieldOps.routeConfidence.find((route) => route.visitId === selectedVisit.id) : undefined;
  const selectedLots = selectedVisit ? operatingDepth.fieldOps.materialLots.filter((lot) => lot.visitId === selectedVisit.id) : [];
  const selectedComplianceRecords = selectedVisit ? operatingDepth.fieldOps.complianceRecords.filter((record) => record.visitId === selectedVisit.id) : [];
  const selectedEquipment = selectedVisit ? operatingDepth.fieldOps.equipmentCheckouts.filter((checkout) => checkout.visitId === selectedVisit.id) : [];
  const selectedTime = selectedVisit ? operatingDepth.fieldOps.timeBreakdowns.find((row) => row.jobId === selectedVisit.jobId) : undefined;
  const selectedWeather = selectedVisit ? operatingDepth.costIntelligence.weatherSnapshots.find((snapshot) => snapshot.id === `weather-${selectedVisit.id}` || snapshot.observedAt === selectedVisit.scheduledStart) : undefined;
  const selectedPropertyAreas = useMemo(
    () => (selectedVisit ? workspace.propertyAreas.filter((area) => area.propertyId === selectedVisit.propertyId) : []),
    [selectedVisit, workspace.propertyAreas],
  );
  const defaultMaterial = workspace.materials.find((material) => material.active) ?? workspace.materials[0];
  const [startMessage, setStartMessage] = useState<{ state: "success" | "error" | "pending"; message: string } | null>(null);
  const [materialForm, setMaterialForm] = useState({
    materialId: defaultMaterial?.id ?? "",
    quantity: "1",
    unit: defaultMaterial?.unit ?? "unit",
    targetAreaId: selectedPropertyAreas[0]?.id ?? "",
    notes: "",
  });
  const [pendingMaterialApplications, setPendingMaterialApplications] = useState<Array<{ materialId: string; quantity: number; unit: string; targetAreaId?: string; notes?: string }>>([]);
  const [materialMessage, setMaterialMessage] = useState<{ state: "success" | "error"; message: string } | null>(null);
  const [submitMessage, setSubmitMessage] = useState<{ state: "success" | "error" | "pending"; message: string } | null>(null);
  const [complianceMessage, setComplianceMessage] = useState<{ state: "success" | "error" | "pending"; message: string } | null>(null);
  const [fieldIssueDraft, setFieldIssueDraft] = useState<FieldIssueDraft>({
    category: "customer_concern",
    severity: "high",
    details: "",
    customerVisible: true,
    serviceCategory: "maintenance",
    estimatedValue: "0",
  });
  const selectedMaterialId = materialForm.materialId || defaultMaterial?.id || "";
  const selectedMaterial = workspace.materials.find((item) => item.id === selectedMaterialId) ?? defaultMaterial;
  const selectedMaterialUnit = materialForm.unit || selectedMaterial?.unit || "unit";
  const selectedTargetAreaId = selectedPropertyAreas.some((area) => area.id === materialForm.targetAreaId) ? materialForm.targetAreaId : "";
  const issueCreatesOpportunity = fieldIssueDraft.category === "upsell_opportunity";

  async function handleStartVisit(visit: JobVisit) {
    setStartMessage({ state: "pending", message: "Starting visit and opening time capture." });
    try {
      await startVisit(visit);
      setStartMessage({ state: "success", message: "Visit started with manual time confirmation." });
    } catch {
      setStartMessage({ state: "error", message: "Visit could not be started. Check assignment and try again." });
    }
  }

  function handleMaterialChange(materialId: string) {
    const material = workspace.materials.find((item) => item.id === materialId);
    setMaterialForm((current) => ({ ...current, materialId, unit: material?.unit ?? current.unit }));
  }

  function handleAddMaterialUse() {
    const material = workspace.materials.find((item) => item.id === selectedMaterialId);
    const quantity = Number(materialForm.quantity);
    if (!material || !Number.isFinite(quantity) || quantity <= 0 || !selectedMaterialUnit.trim()) {
      setMaterialMessage({ state: "error", message: "Choose a material, quantity, and unit before adding usage." });
      return;
    }
    setPendingMaterialApplications((current) => [
      ...current,
      {
        materialId: material.id,
        quantity,
        unit: selectedMaterialUnit.trim(),
        targetAreaId: selectedTargetAreaId || undefined,
        notes: materialForm.notes.trim() || undefined,
      },
    ]);
    setMaterialMessage({ state: "success", message: `${material.name} material use queued for submit.` });
  }

  function handleIssuePreset(preset: (typeof fieldIssuePresets)[number]) {
    setIssueFlag(preset.label);
    setFieldIssueDraft({
      category: preset.category,
      severity: preset.severity,
      details: preset.details,
      customerVisible: preset.customerVisible ?? false,
      serviceCategory: preset.serviceCategory ?? "maintenance",
      estimatedValue: String(Math.round((preset.estimatedValueCents ?? 0) / 100)),
    });
  }

  function buildFieldIssueInput(): FieldIssueSubmitInput | undefined {
    const summary = issueFlag.trim();
    if (!summary) return undefined;
    const estimatedValue = Number(fieldIssueDraft.estimatedValue.replace(/[$,]/g, ""));
    return {
      category: fieldIssueDraft.category,
      severity: fieldIssueDraft.severity,
      summary,
      details: fieldIssueDraft.details.trim() || undefined,
      customerVisible: fieldIssueDraft.customerVisible,
      createOpportunity: issueCreatesOpportunity,
      serviceCategory: fieldIssueDraft.serviceCategory,
      estimatedValueCents: Math.max(0, Math.round((Number.isFinite(estimatedValue) ? estimatedValue : 0) * 100)),
    };
  }

  async function handleSubmitVisit(visit: JobVisit) {
    setSubmitMessage({ state: "pending", message: "Submitting visit completion with time and material records." });
    const issue = buildFieldIssueInput();
    try {
      await submitVisit(visit, {
        notes: visit.notes,
        issue,
        materialApplications: pendingMaterialApplications,
      });
      setPendingMaterialApplications([]);
      setSubmitMessage({
        state: "success",
        message: `Visit submitted with ${pendingMaterialApplications.length} material record${pendingMaterialApplications.length === 1 ? "" : "s"}${issue ? " and issue follow-up" : ""}.`,
      });
      if (issue) {
        setFieldIssueDraft({
          category: "customer_concern",
          severity: "high",
          details: "",
          customerVisible: true,
          serviceCategory: "maintenance",
          estimatedValue: "0",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Check material entries and try again.";
      setSubmitMessage({ state: "error", message: `Visit could not be submitted. ${message}` });
    }
  }

  async function handleGenerateCompliance(visit: JobVisit) {
    setComplianceMessage({ state: "pending", message: "Generating pesticide/material compliance record." });
    try {
      const result = await operatingActions?.generateComplianceRecord?.(visit.id);
      setComplianceMessage({
        state: result?.ready === false ? "error" : "success",
        message: `Compliance record generated for ${result?.recordCount ?? selectedComplianceRecords.length} material application${(result?.recordCount ?? selectedComplianceRecords.length) === 1 ? "" : "s"}${result?.missing?.length ? `; missing ${result.missing.join(", ")}` : ""}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Compliance record could not be generated.";
      setComplianceMessage({ state: "error", message });
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[360px_1fr]">
      <Panel>
        <h2 className="text-base font-bold">My Visits</h2>
        <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3" aria-label="Field login scope">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Field technician login</div>
              <div className="mt-1 text-sm font-semibold">Scoped mobile session</div>
            </div>
            <Badge tone={fieldSessionCanSeeAll ? "warning" : "success"}>{fieldSessionCanSeeAll ? "All visits" : "Assigned crew only"}</Badge>
          </div>
          <div className="mt-3 grid gap-2">
            <Field label="Role">
              <select aria-label="Field session role" className={inputClass()} value={fieldSessionRole} onChange={(event) => setFieldSessionRole(event.target.value as Role)}>
                <option value="technician">Technician</option>
                <option value="crew_lead">Crew lead</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="manager">Manager</option>
              </select>
            </Field>
            <Field label="Assigned crew">
              <select aria-label="Field assigned crew" className={inputClass()} value={fieldSessionCrewId} onChange={(event) => setFieldSessionCrewId(event.target.value)} disabled={fieldSessionCanSeeAll}>
                {workspace.crews.map((crew) => (
                  <option key={crew.id} value={crew.id}>{crew.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-3 grid gap-2 text-xs leading-5 text-stone-600">
            <div className="flex items-center justify-between gap-3">
              <span>Visible visits</span>
              <strong>{fieldVisibleVisits.length} of {fieldRouteVisits.length}</strong>
            </div>
            <div className="flex gap-2">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#224036]" />
              <span>Contact info, property hazards, notes, and job scope stay limited to visible stops.</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {fieldVisibleVisits.length > 0 ? fieldVisibleVisits.map((visit) => (
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
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-500">
                <span className="rounded-full bg-stone-100 px-2 py-0.5 font-semibold text-stone-700">Stop {visit.routeOrder}</span>
                <span>{customersById.get(visit.customerId)?.name}</span>
              </div>
            </button>
          )) : (
            <div className="rounded-md border border-dashed border-stone-200 p-4 text-sm text-stone-500">No assigned visits are visible for this field session.</div>
          )}
        </div>
      </Panel>

      <Panel>
        {selectedVisit ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{jobsById.get(selectedVisit.jobId)?.title}</h2>
                <div className="mt-1 text-sm text-stone-500">{customersById.get(selectedVisit.customerId)?.name} - {crewsById.get(selectedVisit.crewId)?.name}</div>
                <div className="mt-2 inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold uppercase tracking-normal text-stone-600">Route stop {selectedVisit.routeOrder}</div>
              </div>
              <Badge tone={statusTone(selectedVisit.status)}>{visitStatusLabel(selectedVisit.status)}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TextButton icon={<Clock size={16} />} onClick={() => void handleStartVisit(selectedVisit)} disabled={selectedVisit.status === "complete" || selectedVisit.status === "canceled"}>
                Start Visit
              </TextButton>
              {startMessage ? (
                <div className={cn("rounded-md border px-3 py-2 text-sm font-semibold", startMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : startMessage.state === "pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                  {startMessage.message}
                </div>
              ) : null}
            </div>
            {property ? (
              <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-md border border-stone-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{property.label}</div>
                      <div className="mt-1 text-sm text-stone-500">{property.street}, {property.city}, {property.state}</div>
                    </div>
                    <a className="inline-flex items-center gap-2 text-sm font-semibold text-[#224036]" href={googleMapsUrl(`${property.street}, ${property.city}, ${property.state} ${property.postalCode}`)} target="_blank" rel="noreferrer">
                      <MapPin size={15} />
                      Maps
                      <ExternalLink size={13} />
                    </a>
                  </div>
                  <div className="mt-3 rounded-md bg-stone-50 p-3 text-sm leading-5 text-stone-700">
                    <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Property notes / hazards</div>
                    <div className="mt-1">{property.notes || "No property notes or hazards on file."}</div>
                  </div>
                  <div className="mt-3 rounded-md bg-stone-50 p-3 text-sm leading-5 text-stone-700">
                    <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Scope notes</div>
                    <div className="mt-1">{selectedVisit.notes || "No visit-specific scope notes."}</div>
                  </div>
                </div>
                <div className="rounded-md border border-stone-200 p-3">
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Customer contact</div>
                  <div className="mt-2 font-semibold">{primaryContact?.name ?? customer?.name ?? "No contact"}</div>
                  <div className="mt-1 text-sm text-stone-500">{primaryContact?.roleTitle ?? "Primary contact"}</div>
                  <div className="mt-3 grid gap-2 text-sm">
                    <div><span className="font-semibold">Phone:</span> {primaryContact?.phone ?? customer?.phone ?? "Not provided"}</div>
                    <div><span className="font-semibold">Email:</span> {primaryContact?.email ?? customer?.email ?? "Not provided"}</div>
                  </div>
                  {selectedContacts.length > 1 ? (
                    <div className="mt-3 text-xs text-stone-500">{selectedContacts.length - 1} alternate contact{selectedContacts.length === 2 ? "" : "s"} on file</div>
                  ) : null}
                </div>
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
                <div className="mt-3 grid gap-2">
                  <Field label="Product">
                    <select aria-label="Material product" className={inputClass()} value={selectedMaterialId} onChange={(event) => handleMaterialChange(event.target.value)}>
                      {workspace.materials.filter((material) => material.active).map((material) => (
                        <option key={material.id} value={material.id}>{material.name} - {currency(material.costCents ?? 0)} / {material.unit}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Quantity">
                      <input aria-label="Material quantity" className={inputClass()} value={materialForm.quantity} onChange={(event) => setMaterialForm({ ...materialForm, quantity: event.target.value })} inputMode="decimal" />
                    </Field>
                    <Field label="Unit">
                      <input aria-label="Material unit" className={inputClass()} value={selectedMaterialUnit} onChange={(event) => setMaterialForm({ ...materialForm, unit: event.target.value })} />
                    </Field>
                  </div>
                  <Field label="Target area">
                    <select aria-label="Material target area" className={inputClass()} value={selectedTargetAreaId} onChange={(event) => setMaterialForm({ ...materialForm, targetAreaId: event.target.value })}>
                      <option value="">Whole property</option>
                      {selectedPropertyAreas.map((area) => (
                        <option key={area.id} value={area.id}>{area.name}{area.size ? ` - ${area.size.toLocaleString()} ${area.unit ?? "sq ft"}` : ""}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Application notes">
                    <input aria-label="Material application notes" className={inputClass()} value={materialForm.notes} onChange={(event) => setMaterialForm({ ...materialForm, notes: event.target.value })} placeholder="Rate, pest, area, or lot note" />
                  </Field>
                  <TextButton type="button" icon={<Package size={16} />} onClick={handleAddMaterialUse}>Add Material Use</TextButton>
                  {materialMessage ? (
                    <div className={cn("rounded-md border px-3 py-2 text-sm font-semibold", materialMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                      {materialMessage.message}
                    </div>
                  ) : null}
                  {pendingMaterialApplications.length > 0 ? (
                    <div className="grid gap-2">
                      {pendingMaterialApplications.map((application, index) => {
                        const material = workspace.materials.find((item) => item.id === application.materialId);
                        const area = selectedPropertyAreas.find((item) => item.id === application.targetAreaId);
                        return (
                          <div key={`${application.materialId}-${index}`} className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900">
                            <div className="font-semibold">{material?.name ?? "Material"} queued</div>
                            <div>{application.quantity} {application.unit}{area ? ` - ${area.name}` : " - whole property"}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
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

            <div className="rounded-md border border-stone-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Compliance record</div>
                  <div className="mt-1 text-sm text-stone-600">Chemical, material, weather, applicator, site, quantity, and customer-ready record.</div>
                </div>
                <TextButton type="button" icon={<ShieldCheck size={16} />} onClick={() => void handleGenerateCompliance(selectedVisit)} disabled={!operatingActions?.generateComplianceRecord}>
                  Generate Compliance Record
                </TextButton>
              </div>
              {complianceMessage ? (
                <div className={cn("mt-3 rounded-md border px-3 py-2 text-sm font-semibold", complianceMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : complianceMessage.state === "pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                  {complianceMessage.message}
                </div>
              ) : null}
              <div className="mt-3 grid gap-2">
                {selectedComplianceRecords.length > 0 ? selectedComplianceRecords.map((record) => (
                  <div key={record.id} role="group" aria-label={`Compliance record ${record.reportNumber}`} className="rounded-md bg-stone-50 p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{record.reportNumber} - {record.materialName}</div>
                        <div className="mt-1 text-stone-500">{record.siteAddress}</div>
                      </div>
                      <Badge tone={record.ready ? "success" : "warning"}>{record.ready ? "ready" : "needs review"}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <div><div className="text-xs font-semibold uppercase text-stone-500">EPA</div><div>{record.epaRegistrationNumber ?? "Missing"}</div></div>
                      <div><div className="text-xs font-semibold uppercase text-stone-500">Quantity</div><div>{record.quantity} {record.unit}</div></div>
                      <div><div className="text-xs font-semibold uppercase text-stone-500">Applicator</div><div>{record.applicator}</div></div>
                    </div>
                    <div className="mt-2 text-xs text-stone-500">{record.weatherSummary}</div>
                    {record.missing.length > 0 ? <div className="mt-2 text-xs font-semibold text-amber-700">Missing: {record.missing.join(", ")}</div> : null}
                  </div>
                )) : <div className="rounded-md border border-dashed border-stone-200 p-3 text-sm text-stone-500">No compliance records generated from material usage yet.</div>}
              </div>
            </div>

            <div className="grid gap-2">
              {selectedVisit.checklist.map((item) => (
                <button key={item.id} type="button" aria-label={`Checklist ${item.label}`} onClick={() => toggleChecklist(selectedVisit.id, item.id)} className="flex items-center gap-3 rounded-md border border-stone-200 p-3 text-left">
                  <span className={cn("grid h-6 w-6 place-items-center rounded-md border", item.isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-stone-300 bg-white text-transparent")}>
                    <Check size={15} />
                  </span>
                  <span className={cn("font-medium", item.isDone && "text-stone-400 line-through")}>{item.label}</span>
                </button>
              ))}
            </div>

            <div className="rounded-md border border-stone-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Issue capture</div>
                  <div className="mt-1 text-sm text-stone-600">Damage, access problems, pest activity, customer concerns, and upsell signals.</div>
                </div>
                <Badge tone={issueCreatesOpportunity ? "success" : "warning"}>{issueCreatesOpportunity ? "Creates opportunity" : "Creates task"}</Badge>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <Field label="Issue category">
                  <select
                    aria-label="Issue category"
                    className={inputClass()}
                    value={fieldIssueDraft.category}
                    onChange={(event) => setFieldIssueDraft({ ...fieldIssueDraft, category: event.target.value as FieldIssueCategory })}
                  >
                    {fieldIssueCategories.map((category) => (
                      <option key={category} value={category}>{fieldIssueCategoryLabel(category)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Issue severity">
                  <select
                    aria-label="Issue severity"
                    className={inputClass()}
                    value={fieldIssueDraft.severity}
                    onChange={(event) => setFieldIssueDraft({ ...fieldIssueDraft, severity: event.target.value as FieldIssueSeverity })}
                  >
                    {fieldIssueSeverities.map((severity) => (
                      <option key={severity} value={severity}>{formatStatus(severity)}</option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700 md:mt-5">
                  <input
                    aria-label="Customer-visible issue"
                    type="checkbox"
                    checked={fieldIssueDraft.customerVisible}
                    onChange={(event) => setFieldIssueDraft({ ...fieldIssueDraft, customerVisible: event.target.checked })}
                  />
                  Customer-visible
                </label>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr]">
                <Field label="Issue summary">
                  <input aria-label="Issue summary" className={inputClass()} value={issueFlag} onChange={(event) => setIssueFlag(event.target.value)} placeholder="Optional follow-up task" />
                </Field>
                <Field label="Service line">
                  <select
                    aria-label="Issue service line"
                    className={inputClass()}
                    value={fieldIssueDraft.serviceCategory}
                    onChange={(event) => setFieldIssueDraft({ ...fieldIssueDraft, serviceCategory: event.target.value as ServiceCategory })}
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_180px]">
                <Field label="Issue details">
                  <textarea
                    aria-label="Issue details"
                    className={cn(inputClass(), "min-h-20 resize-y")}
                    value={fieldIssueDraft.details}
                    onChange={(event) => setFieldIssueDraft({ ...fieldIssueDraft, details: event.target.value })}
                    placeholder="What happened, where, and what should the office do next?"
                  />
                </Field>
                <Field label="Upsell value">
                  <input
                    aria-label="Issue estimated value"
                    className={inputClass()}
                    value={fieldIssueDraft.estimatedValue}
                    onChange={(event) => setFieldIssueDraft({ ...fieldIssueDraft, estimatedValue: event.target.value })}
                    inputMode="decimal"
                    disabled={!issueCreatesOpportunity}
                  />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {fieldIssuePresets.map((preset) => (
                  <button key={preset.label} type="button" onClick={() => handleIssuePreset(preset)} className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-dashed border-stone-300 p-3 text-sm text-stone-500">Before/after photo capture queue</div>
              <div className="rounded-md border border-dashed border-stone-300 p-3 text-sm text-stone-500">Customer signature and service receipt preview</div>
            </div>
            {submitMessage ? (
              <div className={cn("rounded-md border px-3 py-2 text-sm font-semibold", submitMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : submitMessage.state === "pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                {submitMessage.message}
              </div>
            ) : null}
            <TextButton icon={<ClipboardCheck size={16} />} onClick={() => void handleSubmitVisit(selectedVisit)}>
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
  const [reviewedDuplicateIds, setReviewedDuplicateIds] = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>(operatingDepth.leadOps.rows[0]?.id);
  const [leadOpsImportName, setLeadOpsImportName] = useState("");
  const [leadOpsImportRows, setLeadOpsImportRows] = useState<ImportPreviewUiRow[]>([]);
  const [leadOpsImportJobId, setLeadOpsImportJobId] = useState("");
  const [leadOpsImportState, setLeadOpsImportState] = useState<"idle" | "saving" | "saved" | "committing" | "committed" | "error">("idle");
  const [leadOpsImportMessage, setLeadOpsImportMessage] = useState("");
  const [leadOpsImportError, setLeadOpsImportError] = useState("");
  const [webLeadForm, setWebLeadForm] = useState<WebLeadFormState>(() => defaultWebLeadForm());
  const [webLeadState, setWebLeadState] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [webLeadMessage, setWebLeadMessage] = useState("");
  const [staleCheckState, setStaleCheckState] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [staleCheckMessage, setStaleCheckMessage] = useState("");
  const statusOptions = operatingDepth.leadOps.statusSettings.length > 0 ? operatingDepth.leadOps.statusSettings : [];
  const leadOpsImportTerritory = ["Foxborough", "Mansfield", "Sharon", "Wrentham", "Plainville"];
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
  const reviewedDuplicateSet = new Set(reviewedDuplicateIds);
  const duplicateReviewRows = rows
    .filter((row) => row.duplicateWarnings.length > 0 && !reviewedDuplicateSet.has(row.id))
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, 6);
  const staleIssues = operatingDepth.leadOps.qualityIssues.filter((issue) => issue.kind === "stale_follow_up" && issue.status === "open");
  const staleRows = rows.filter((row) => row.slaStatus === "overdue" || staleIssues.some((issue) => issue.leadId === row.id)).slice(0, 6);
  const leadOpsImportCounts = {
    ready: leadOpsImportRows.filter((row) => row.status === "ready").length,
    review: leadOpsImportRows.filter((row) => row.status === "needs_review").length,
    blocked: leadOpsImportRows.filter((row) => row.status === "blocked").length,
  };

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function bulkMove(status: string) {
    if (selectedIds.length === 0) return;
    operatingActions?.bulkUpdateLeads?.(selectedIds, status);
    setSelectedIds([]);
  }

  function reviewDuplicate(row: LeadOpsRow, action: "keep" | "hide_duplicate") {
    setReviewedDuplicateIds((current) => (current.includes(row.id) ? current : [...current, row.id]));
    setSelectedLeadId(row.id);
    if (action === "hide_duplicate") {
      operatingActions?.updateLead?.(row.id, { status: "lost_confirmed", hidden: true });
    }
  }

  async function handleLeadOpsImportUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csv = await file.text();
      setLeadOpsImportState("saving");
      setLeadOpsImportMessage("");
      const previewRows = parseLeadImportCsv(csv, {
        currentContactCount: 0,
        freeContactLimit: Number.MAX_SAFE_INTEGER,
        serviceTerritory: leadOpsImportTerritory,
      });
      setLeadOpsImportName(file.name);
      setLeadOpsImportRows(previewRows);
      setLeadOpsImportJobId("");
      setLeadOpsImportError(previewRows.length === 0 ? "No importable rows were found in that CSV." : "");
      if (previewRows.length > 0 && operatingActions?.createLeadImportPreview) {
        const persisted = await operatingActions.createLeadImportPreview({ fileName: file.name, csvText: csv });
        setLeadOpsImportJobId(persisted.importJobId);
        setLeadOpsImportRows(persisted.rows);
        setLeadOpsImportState("saved");
        setLeadOpsImportMessage(`Lead Ops import job saved with ${persisted.rows.length} rows. Commit ready rows after QA.`);
      } else {
        setLeadOpsImportState(previewRows.length > 0 ? "saved" : "idle");
        setLeadOpsImportMessage(previewRows.length > 0 ? "Local preview created. Connect Convex actions to commit these rows." : "");
      }
    } catch (error) {
      setLeadOpsImportName("");
      setLeadOpsImportRows([]);
      setLeadOpsImportJobId("");
      setLeadOpsImportState("error");
      setLeadOpsImportMessage("");
      setLeadOpsImportError(error instanceof Error ? userFacingWriteError(error) : "Could not read that CSV file.");
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function commitLeadOpsImport() {
    if (!leadOpsImportJobId || !operatingActions?.commitLeadImportRows) return;
    try {
      setLeadOpsImportState("committing");
      const result = await operatingActions.commitLeadImportRows(leadOpsImportJobId);
      setLeadOpsImportState("committed");
      setLeadOpsImportMessage(`${result.imported} rows imported, ${result.skipped} skipped, ${result.failed} failed.`);
    } catch (error) {
      setLeadOpsImportState("error");
      setLeadOpsImportMessage(userFacingWriteError(error));
    }
  }

  async function submitWebLead(event: FormEvent) {
    event.preventDefault();
    if (!operatingActions?.submitWebLead) {
      setWebLeadState("error");
      setWebLeadMessage("Connect Convex web lead intake before submitting this form.");
      return;
    }
    const submittedName = webLeadForm.customerName.trim() || "Web form lead";
    try {
      setWebLeadState("submitting");
      setWebLeadMessage("");
      const result = await operatingActions.submitWebLead(webLeadForm);
      setWebLeadState("submitted");
      setWebLeadMessage(`${submittedName} captured from web form as ${formatStatus(result.status)} with spam score ${result.spamScore}.`);
      setWebLeadForm(defaultWebLeadForm());
    } catch (error) {
      setWebLeadState("error");
      setWebLeadMessage(userFacingWriteError(error));
    }
  }

  async function runStaleLeadCheck() {
    if (!operatingActions?.runStaleLeadCheck) return;
    try {
      setStaleCheckState("running");
      setStaleCheckMessage("");
      const result = await operatingActions.runStaleLeadCheck();
      setStaleCheckState("complete");
      setStaleCheckMessage(`${result.inserted} stale lead${result.inserted === 1 ? "" : "s"} flagged for follow-up.`);
    } catch (error) {
      setStaleCheckState("error");
      setStaleCheckMessage(userFacingWriteError(error));
    }
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

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
              <FileText size={16} />
              Lead Import Center
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-normal">CSV intake with QA, duplicate risk, and commit controls</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Import lead lists directly into Lead Ops, review row-level blockers, then commit clean records into customers, contacts, properties, leads, and opportunities.
            </p>
          </div>
          <div className="grid min-w-60 grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900"><span className="block text-lg font-bold">{leadOpsImportCounts.ready}</span> ready</div>
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900"><span className="block text-lg font-bold">{leadOpsImportCounts.review}</span> review</div>
            <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-900"><span className="block text-lg font-bold">{leadOpsImportCounts.blocked}</span> blocked</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50">
            <FileText size={16} />
            Upload Lead CSV
            <input aria-label="Upload Lead Ops import CSV" type="file" accept=".csv,text/csv" className="sr-only" onChange={handleLeadOpsImportUpload} />
          </label>
          <TextButton
            type="button"
            icon={<Check size={16} />}
            disabled={!leadOpsImportJobId || !operatingActions?.commitLeadImportRows || leadOpsImportState === "committing" || leadOpsImportState === "committed"}
            onClick={commitLeadOpsImport}
          >
            {leadOpsImportState === "committing" ? "Committing" : "Commit Lead Ops Ready Rows"}
          </TextButton>
          <Badge tone={leadOpsImportRows.length > 0 ? "success" : "neutral"}>{leadOpsImportName || "No file uploaded"}</Badge>
          <Badge>{leadOpsImportRows.length} rows</Badge>
        </div>
        {leadOpsImportError ? (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900">{leadOpsImportError}</div>
        ) : null}
        {leadOpsImportMessage ? (
          <div
            className={cn(
              "mt-3 rounded-md border p-3 text-sm font-medium",
              leadOpsImportState === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900",
            )}
          >
            {leadOpsImportMessage}
          </div>
        ) : null}
        <div className="mt-4 grid gap-2 lg:grid-cols-3">
          {leadOpsImportRows.length > 0 ? leadOpsImportRows.slice(0, 6).map((row) => (
            <div key={row.id ?? `lead-ops-import-${row.rowNumber}`} className="rounded-md border border-stone-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">Row {row.rowNumber} - {row.customerName || "Unnamed lead"}</div>
                  <div className="mt-1 truncate text-sm text-stone-500">{row.city || "No city"} - maps to {row.mappedEntity}</div>
                </div>
                <Badge tone={row.status === "ready" ? "success" : row.status === "blocked" ? "danger" : "warning"}>{formatStatus(row.status)}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {row.issues.length > 0 ? row.issues.map((issue) => <Badge key={`${row.rowNumber}-${issue.message}`} tone="warning">{issue.message}</Badge>) : <Badge tone="success">No issues</Badge>}
              </div>
            </div>
          )) : (
            <div className="rounded-md border border-dashed border-stone-200 p-4 text-sm text-stone-500 lg:col-span-3">
              Upload a CSV with Customer, Email, Phone, Street, City, State, Zip, Service, and Source columns to preview import quality before committing.
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#224036]">
              <ExternalLink size={16} />
              Web Form Intake
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-normal">Capture website leads with campaign, service, location, and spam scoring</h2>
          </div>
          <Badge tone={webLeadState === "error" ? "danger" : webLeadState === "submitted" ? "success" : "neutral"}>{webLeadState === "submitting" ? "submitting" : webLeadState}</Badge>
        </div>
        {webLeadMessage ? (
          <div className={cn("mt-4 rounded-md border p-3 text-sm font-medium", webLeadState === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>
            {webLeadMessage}
          </div>
        ) : null}
        <form onSubmit={submitWebLead} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Web customer">
            <input className={inputClass()} value={webLeadForm.customerName} onChange={(event) => setWebLeadForm({ ...webLeadForm, customerName: event.target.value })} required />
          </Field>
          <Field label="Web email">
            <input className={inputClass()} value={webLeadForm.email} onChange={(event) => setWebLeadForm({ ...webLeadForm, email: event.target.value })} type="email" />
          </Field>
          <Field label="Web phone">
            <input className={inputClass()} value={webLeadForm.phone} onChange={(event) => setWebLeadForm({ ...webLeadForm, phone: event.target.value })} />
          </Field>
          <Field label="Web service">
            <select className={inputClass()} value={webLeadForm.serviceLine} onChange={(event) => setWebLeadForm({ ...webLeadForm, serviceLine: event.target.value as ServiceCategory })}>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Web street">
            <input className={inputClass()} value={webLeadForm.street} onChange={(event) => setWebLeadForm({ ...webLeadForm, street: event.target.value })} />
          </Field>
          <Field label="Web city">
            <input className={inputClass()} value={webLeadForm.city} onChange={(event) => setWebLeadForm({ ...webLeadForm, city: event.target.value })} required />
          </Field>
          <Field label="Web state">
            <input className={inputClass()} value={webLeadForm.state} onChange={(event) => setWebLeadForm({ ...webLeadForm, state: event.target.value.toUpperCase().slice(0, 2) })} required />
          </Field>
          <Field label="Web ZIP">
            <input className={inputClass()} value={webLeadForm.postalCode} onChange={(event) => setWebLeadForm({ ...webLeadForm, postalCode: event.target.value })} />
          </Field>
          <Field label="Web campaign">
            <input className={inputClass()} value={webLeadForm.campaign} onChange={(event) => setWebLeadForm({ ...webLeadForm, campaign: event.target.value })} />
          </Field>
          <Field label="Web source detail">
            <input className={inputClass()} value={webLeadForm.sourceDetail} onChange={(event) => setWebLeadForm({ ...webLeadForm, sourceDetail: event.target.value })} />
          </Field>
          <Field label="Web value">
            <input className={inputClass()} value={webLeadForm.estimatedValue} onChange={(event) => setWebLeadForm({ ...webLeadForm, estimatedValue: event.target.value })} inputMode="decimal" />
          </Field>
          <div className="flex items-end">
            <TextButton type="submit" icon={<Plus size={16} />} disabled={webLeadState === "submitting"} className="w-full">
              {webLeadState === "submitting" ? "Submitting" : "Submit Web Lead"}
            </TextButton>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <Field label="Web message">
              <textarea className={cn(inputClass(), "min-h-20 resize-y py-2")} value={webLeadForm.message} onChange={(event) => setWebLeadForm({ ...webLeadForm, message: event.target.value })} />
            </Field>
          </div>
        </form>
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Duplicate Review Queue</h2>
                <p className="mt-1 text-sm leading-5 text-stone-500">Compare warning signals, inspect the lead, keep the record, or hide it as a duplicate before it pollutes estimates and revenue reporting.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={duplicateReviewRows.length > 0 ? "warning" : "success"}>{duplicateReviewRows.length} open</Badge>
                {reviewedDuplicateIds.length > 0 ? <Badge>{reviewedDuplicateIds.length} reviewed</Badge> : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {duplicateReviewRows.length > 0 ? duplicateReviewRows.map((row) => (
                <div key={row.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button type="button" onClick={() => setSelectedLeadId(row.id)} className="truncate text-left font-semibold text-stone-900 hover:text-[#224036]">
                        {row.customerName}
                      </button>
                      <div className="mt-1 text-sm text-stone-500">{row.title} - {row.city || "No city"} - {row.source}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={row.qualityScore >= 80 ? "success" : "warning"}>{row.qualityScore} quality</Badge>
                      <Badge tone={row.spamScore >= 35 ? "danger" : "neutral"}>{row.spamScore} spam</Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {row.duplicateWarnings.map((warning) => (
                      <div key={warning} className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSelectedLeadId(row.id)} className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50">
                      <FileText size={15} />
                      Review duplicate
                    </button>
                    <button type="button" onClick={() => reviewDuplicate(row, "keep")} className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100">
                      <Check size={15} />
                      Keep Lead
                    </button>
                    <button type="button" onClick={() => reviewDuplicate(row, "hide_duplicate")} className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-800 transition hover:bg-rose-100">
                      <X size={15} />
                      Hide Duplicate
                    </button>
                  </div>
                </div>
              )) : (
                <div className="rounded-md border border-dashed border-stone-200 p-4 text-sm text-stone-500">No duplicate warnings in the current lead filters.</div>
              )}
            </div>
          </Panel>

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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Stale Follow-Up Queue</h2>
                <p className="mt-1 text-sm leading-5 text-stone-500">Overdue lead follow-ups that should be reassigned, advanced, or closed before pipeline value goes stale.</p>
              </div>
              <Badge tone={staleRows.length > 0 || staleIssues.length > 0 ? "warning" : "success"}>{Math.max(staleRows.length, staleIssues.length)} open</Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TextButton type="button" variant="secondary" icon={<Clock size={16} />} disabled={!operatingActions?.runStaleLeadCheck || staleCheckState === "running"} onClick={runStaleLeadCheck}>
                {staleCheckState === "running" ? "Checking" : "Run Stale Lead Check"}
              </TextButton>
            </div>
            {staleCheckMessage ? (
              <div className={cn("mt-3 rounded-md border p-3 text-sm font-medium", staleCheckState === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>
                {staleCheckMessage}
              </div>
            ) : null}
            <div className="mt-4 grid gap-2">
              {staleRows.length > 0 ? staleRows.map((row) => (
                <div key={row.id} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button type="button" onClick={() => setSelectedLeadId(row.id)} className="truncate text-left font-semibold text-amber-950 hover:text-[#224036]">{row.customerName}</button>
                      <div className="mt-1 text-sm text-amber-800">{row.title}</div>
                    </div>
                    <Badge tone="warning">{formatStatus(row.slaStatus)}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-amber-800">Due {dateTime(row.slaDueAt)}</div>
                </div>
              )) : (
                <div className="rounded-md border border-dashed border-stone-200 p-4 text-sm text-stone-500">No stale leads in the current filters.</div>
              )}
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
  const activeServicePackages = workspace.servicePackages.filter((servicePackage) => servicePackage.active);
  const [selectedPackageId, setSelectedPackageId] = useState(activeServicePackages[0]?.id ?? "");
  const selectedServicePackage = activeServicePackages.find((servicePackage) => servicePackage.id === selectedPackageId) ?? activeServicePackages[0];
  const serviceCatalogById = new Map(workspace.serviceCatalog.map((item) => [item.id, item]));
  const selectedPackageCatalogItems = selectedServicePackage?.includedServiceCatalogItemIds.map((id) => serviceCatalogById.get(id)).filter((item): item is WorkspaceSnapshot["serviceCatalog"][number] => Boolean(item)) ?? [];
  const selectedPackageLaborCostCents = Math.round((selectedServicePackage?.laborHours ?? 0) * (selectedServicePackage?.laborRateCents ?? 0));
  const selectedPackageMaterialCostCents = selectedServicePackage?.materialCostCents ?? 0;
  const selectedPackageEquipmentCostCents = selectedServicePackage?.equipmentCostCents ?? 0;
  const selectedPackageDirectCostCents = selectedPackageLaborCostCents + selectedPackageMaterialCostCents + selectedPackageEquipmentCostCents;
  const selectedPackageOverheadCents = Math.round(selectedPackageDirectCostCents * ((selectedServicePackage?.overheadPercent ?? 0) / 100));
  const selectedPackageTotalCostCents = selectedPackageDirectCostCents + selectedPackageOverheadCents;
  const selectedPackageRevenueCents = selectedServicePackage?.defaultPriceCents ?? 0;
  const selectedPackageGrossProfitCents = selectedPackageRevenueCents - selectedPackageTotalCostCents;
  const selectedPackageMarginPercent = selectedPackageRevenueCents > 0 ? Math.round((selectedPackageGrossProfitCents / selectedPackageRevenueCents) * 100) : 0;
  const selectedPackageTargetRevenueCents =
    selectedPackageTotalCostCents > 0 && selectedServicePackage?.targetMarginPercent && selectedServicePackage.targetMarginPercent < 100
      ? Math.ceil(selectedPackageTotalCostCents / (1 - selectedServicePackage.targetMarginPercent / 100))
      : selectedPackageRevenueCents;
  const fertilizationProperties = workspace.properties.filter((property) => property.lawnSizeSqFt || workspace.propertyAreas.some((area) => area.propertyId === property.id && area.unit === "sq_ft"));
  const fertilizationMaterials = workspace.materials.filter((material) => material.active);
  const fertilizationPriceBookItems = workspace.priceBookItems.filter((item) => item.active && (item.name.toLowerCase().includes("six-step") || item.pricingModel === "per_sq_ft"));
  const [fertPropertyId, setFertPropertyId] = useState(fertilizationProperties[0]?.id ?? "");
  const [fertAreaId, setFertAreaId] = useState("whole");
  const [fertMaterialId, setFertMaterialId] = useState(fertilizationMaterials.find((material) => material.name.toLowerCase().includes("grub"))?.id ?? fertilizationMaterials[0]?.id ?? "");
  const [fertPriceBookItemId, setFertPriceBookItemId] = useState(fertilizationPriceBookItems[0]?.id ?? "");
  const [fertApplications, setFertApplications] = useState("6");
  const [fertMaterialRate, setFertMaterialRate] = useState("0.008");
  const [fertLaborHours, setFertLaborHours] = useState("1.5");
  const [fertLaborRate, setFertLaborRate] = useState("32.00");
  const [fertEquipmentCost, setFertEquipmentCost] = useState("25.00");
  const [fertOverheadPercent, setFertOverheadPercent] = useState("18");
  const [fertTargetMargin, setFertTargetMargin] = useState("42");
  const [selectedFertScenarioKey, setSelectedFertScenarioKey] = useState<FertilizationMarginScenarioKey>("target");
  const [fertSaveState, setFertSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [fertSaveMessage, setFertSaveMessage] = useState("");
  const [approvalMessages, setApprovalMessages] = useState<Record<string, { state: "saving" | "success" | "error"; message: string; status?: "approved" | "rejected" }>>({});
  const selectedFertProperty = workspace.properties.find((property) => property.id === fertPropertyId) ?? fertilizationProperties[0];
  const selectedFertAreas = selectedFertProperty ? workspace.propertyAreas.filter((area) => area.propertyId === selectedFertProperty.id && area.unit === "sq_ft") : [];
  const selectedFertArea = selectedFertAreas.find((area) => area.id === fertAreaId);
  const selectedFertMaterial = workspace.materials.find((material) => material.id === fertMaterialId) ?? fertilizationMaterials[0];
  const selectedFertPriceBookItem = workspace.priceBookItems.find((item) => item.id === fertPriceBookItemId) ?? fertilizationPriceBookItems[0];
  const selectedFertRules = selectedFertPriceBookItem ? workspace.pricingRules.filter((rule) => rule.priceBookItemId === selectedFertPriceBookItem.id) : [];
  const fertTurfAreaSqFt = Math.round(selectedFertArea?.size ?? selectedFertProperty?.lawnSizeSqFt ?? 0);
  const fertApplicationCount = Math.max(1, Math.round(Number(fertApplications || "1")));
  const fertPriceBookRateMatch = selectedFertPriceBookItem?.formula?.match(/lawnSizeSqFt\s*\*\s*([0-9.]+)/)?.[1];
  const fertPriceBookRateCentsPerSqFt = fertPriceBookRateMatch ? Math.round(Number(fertPriceBookRateMatch) * 1000) / 10 : 1.8;
  const fertAdjustments = activeFertilizationPricingAdjustments(selectedFertRules, { turfAreaSqFt: fertTurfAreaSqFt, applicationCount: fertApplicationCount });
  const fertPricingInput = {
    turfAreaSqFt: fertTurfAreaSqFt,
    applicationCount: fertApplicationCount,
    materialUnitCostCents: selectedFertMaterial?.costCents ?? 0,
    materialRateUnitsPer1000SqFt: Number(fertMaterialRate || "0"),
    laborHoursPerApplication: Number(fertLaborHours || "0"),
    laborRateCents: dollarsToCents(fertLaborRate),
    equipmentCostCentsPerApplication: dollarsToCents(fertEquipmentCost),
    overheadPercent: Number(fertOverheadPercent || "0"),
    targetMarginPercent: Number(fertTargetMargin || "0"),
    priceBookRateCentsPerSqFt: fertPriceBookRateCentsPerSqFt,
    minPriceCents: selectedFertPriceBookItem?.minPriceCents ?? 0,
    adjustments: fertAdjustments,
  };
  const fertPricing = calculateFertilizationProgramPricing(fertPricingInput);
  const fertMarginScenarios = buildFertilizationMarginScenarios(fertPricingInput);
  const selectedFertScenario = fertMarginScenarios.find((scenario) => scenario.key === selectedFertScenarioKey) ?? fertMarginScenarios[1] ?? fertMarginScenarios[0];
  const membersById = new Map(workspace.members.map((member) => [member.id, member]));
  const approvalRequests = workspace.approvalRequests
    .slice()
    .sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || a.dueAt - b.dueAt);
  const pendingApprovalRequests = approvalRequests.filter((request) => request.status === "pending" && !approvalMessages[request.id]?.status);

  function submitTimesheet(event: FormEvent) {
    event.preventDefault();
    if (!jobId) return;
    operatingActions?.addTimesheetEntry?.(jobId, roleName, Math.max(0, Number(hours || "0")), dollarsToCents(hourlyRate));
    setHours("1.5");
  }

  async function saveFertilizationPricing() {
    if (!selectedFertProperty || !selectedFertMaterial) return;
    setFertSaveState("saving");
    setFertSaveMessage("");
    try {
      if (operatingActions?.priceFertilizationProgram) {
        const result = await operatingActions.priceFertilizationProgram({
          propertyId: selectedFertProperty.id,
          propertyAreaId: selectedFertArea?.id,
          materialId: selectedFertMaterial.id,
          priceBookItemId: selectedFertPriceBookItem?.id,
          applicationCount: fertApplicationCount,
          materialRateUnitsPer1000SqFt: Number(fertMaterialRate || "0"),
          laborHoursPerApplication: Number(fertLaborHours || "0"),
          laborRateCents: dollarsToCents(fertLaborRate),
          equipmentCostCentsPerApplication: dollarsToCents(fertEquipmentCost),
          overheadPercent: Number(fertOverheadPercent || "0"),
          targetMarginPercent: selectedFertScenario.targetMarginPercent,
          selectedScenarioKey: selectedFertScenario.key,
          selectedScenarioLabel: selectedFertScenario.label,
          selectedScenarioTargetMarginPercent: selectedFertScenario.targetMarginPercent,
          estimateLineItemName: selectedFertScenario.estimateLineItem.name,
          estimateLineItemUnit: selectedFertScenario.estimateLineItem.unit,
          estimateLineItemUnitPriceCents: selectedFertScenario.estimateLineItem.unitPriceCents,
        });
        setFertSaveMessage(`Fertilization price session saved: ${selectedFertScenario.label} scenario at ${currency(result.output.recommendedPriceCents)}.`);
      } else {
        setFertSaveMessage(`${selectedFertScenario.label} scenario calculated locally at ${currency(selectedFertScenario.recommendedPriceCents)}.`);
      }
      setFertSaveState("success");
    } catch (error) {
      setFertSaveState("error");
      setFertSaveMessage(error instanceof Error ? error.message : "Could not save fertilization pricing.");
    }
  }

  async function decideApprovalRequest(request: WorkspaceSnapshot["approvalRequests"][number], decision: "approved" | "rejected") {
    setApprovalMessages((current) => ({ ...current, [request.id]: { state: "saving", message: `${decision === "approved" ? "Approving" : "Rejecting"} ${request.estimateNumber}...` } }));
    try {
      if (operatingActions?.decideEstimateApproval) {
        await operatingActions.decideEstimateApproval(request.id, decision, decision === "approved" ? "Approved from Costing margin review." : "Rejected from Costing margin review.");
      }
      setApprovalMessages((current) => ({
        ...current,
        [request.id]: {
          state: "success",
          status: decision,
          message: `Approval ${decision} for ${request.estimateNumber}.`,
        },
      }));
    } catch (error) {
      setApprovalMessages((current) => ({
        ...current,
        [request.id]: {
          state: "error",
          message: error instanceof Error ? error.message : "Could not update approval request.",
        },
      }));
    }
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
            <h2 className="text-base font-bold">Service Package Picker</h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-stone-500">Catalog-backed package assumptions for labor, materials, equipment, overhead, checklist defaults, price, and margin.</p>
          </div>
          {selectedServicePackage ? (
            <Badge tone={selectedPackageMarginPercent >= (selectedServicePackage.targetMarginPercent ?? 0) ? "success" : "warning"}>
              Package margin {percent(selectedPackageMarginPercent)}
            </Badge>
          ) : null}
        </div>
        {activeServicePackages.length > 0 ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
            <div className="grid gap-3">
              <Field label="Service package">
                <select aria-label="Service package" className={inputClass()} value={selectedServicePackage?.id ?? ""} onChange={(event) => setSelectedPackageId(event.target.value)}>
                  {activeServicePackages.map((servicePackage) => (
                    <option key={servicePackage.id} value={servicePackage.id}>{servicePackage.name}</option>
                  ))}
                </select>
              </Field>
              {selectedServicePackage ? (
                <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
                  <div className="font-semibold">{selectedServicePackage.name}</div>
                  <div className="mt-1 text-sm leading-5 text-stone-500">{selectedServicePackage.description ?? "No package description."}</div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge>{categoryLabels[selectedServicePackage.category]}</Badge>
                    <Badge>{formatStatus(selectedServicePackage.billingCadence)}</Badge>
                    <Badge>{currency(selectedServicePackage.defaultPriceCents)}</Badge>
                  </div>
                </div>
              ) : null}
            </div>
            {selectedServicePackage ? (
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-4">
                  <Metric label="Labor" value={`${selectedServicePackage.laborHours ?? 0}h / ${currency(selectedPackageLaborCostCents)}`} />
                  <Metric label="Materials" value={currency(selectedPackageMaterialCostCents)} />
                  <Metric label="Equipment" value={currency(selectedPackageEquipmentCostCents)} />
                  <Metric label="Overhead" value={currency(selectedPackageOverheadCents)} />
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <Metric label="Price" value={currency(selectedPackageRevenueCents)} />
                  <Metric label="Total cost" value={currency(selectedPackageTotalCostCents)} />
                  <Metric label="Target margin" value={percent(selectedServicePackage.targetMarginPercent ?? 0)} />
                  <Metric label="Target revenue" value={currency(selectedPackageTargetRevenueCents)} tone={selectedPackageRevenueCents >= selectedPackageTargetRevenueCents ? "success" : "warning"} />
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-md border border-stone-200 p-3">
                    <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Included catalog items</div>
                    <div className="mt-3 grid gap-2 text-sm">
                      {selectedPackageCatalogItems.length > 0 ? selectedPackageCatalogItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-stone-50 px-3 py-2">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-stone-500">{currency(item.defaultPriceCents)} / {item.defaultUnit}</span>
                        </div>
                      )) : <div className="text-stone-500">No linked catalog items.</div>}
                    </div>
                  </div>
                  <div className="rounded-md border border-stone-200 p-3">
                    <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Checklist defaults</div>
                    <div className="mt-3 grid gap-2 text-sm">
                      {(selectedServicePackage.checklistDefaults ?? []).length > 0 ? selectedServicePackage.checklistDefaults?.map((item) => (
                        <div key={item} className="flex gap-2 rounded-md bg-stone-50 px-3 py-2">
                          <Check size={15} className="mt-0.5 shrink-0 text-[#224036]" />
                          <span>{item}</span>
                        </div>
                      )) : <div className="text-stone-500">No checklist defaults.</div>}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-stone-200 p-4 text-sm text-stone-500">No active service packages are configured yet.</div>
        )}
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold">Fertilization Pricing Calculator</h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-stone-500">Price a lawn program from property area, application count, product rate, material cost, labor, equipment, overhead, price-book rules, and target margin.</p>
          </div>
          <Badge tone={fertPricing.grossMarginPercent >= Number(fertTargetMargin || "0") ? "success" : "warning"}>Gross margin {percent(fertPricing.grossMarginPercent)}</Badge>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <Field label="Property">
            <select
              aria-label="Fertilization property"
              className={inputClass()}
              value={selectedFertProperty?.id ?? ""}
              onChange={(event) => {
                setFertPropertyId(event.target.value);
                setFertAreaId("whole");
              }}
            >
              {fertilizationProperties.map((property) => (
                <option key={property.id} value={property.id}>{property.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Turf area">
            <select aria-label="Fertilization turf area" className={inputClass()} value={selectedFertArea?.id ?? "whole"} onChange={(event) => setFertAreaId(event.target.value)}>
              <option value="whole">Whole property - {fertTurfAreaSqFt.toLocaleString()} sq ft</option>
              {selectedFertAreas.map((area) => (
                <option key={area.id} value={area.id}>{area.name} - {(area.size ?? 0).toLocaleString()} sq ft</option>
              ))}
            </select>
          </Field>
          <Field label="Material product">
            <select aria-label="Fertilization material product" className={inputClass()} value={selectedFertMaterial?.id ?? ""} onChange={(event) => setFertMaterialId(event.target.value)}>
              {fertilizationMaterials.map((material) => (
                <option key={material.id} value={material.id}>{material.name} - {currency(material.costCents ?? 0)} / {material.unit}</option>
              ))}
            </select>
          </Field>
          <Field label="Price book">
            <select aria-label="Fertilization price book item" className={inputClass()} value={selectedFertPriceBookItem?.id ?? ""} onChange={(event) => setFertPriceBookItemId(event.target.value)}>
              {fertilizationPriceBookItems.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <Field label="Applications">
            <input aria-label="Fertilization applications" className={inputClass()} value={fertApplications} onChange={(event) => setFertApplications(event.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Material rate / 1k sq ft">
            <input aria-label="Fertilization material rate" className={inputClass()} value={fertMaterialRate} onChange={(event) => setFertMaterialRate(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Labor hrs / app">
            <input aria-label="Fertilization labor hours" className={inputClass()} value={fertLaborHours} onChange={(event) => setFertLaborHours(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Labor cost / hr">
            <input aria-label="Fertilization labor rate" className={inputClass()} value={fertLaborRate} onChange={(event) => setFertLaborRate(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Equipment / app">
            <input aria-label="Fertilization equipment cost" className={inputClass()} value={fertEquipmentCost} onChange={(event) => setFertEquipmentCost(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Overhead %">
            <input aria-label="Fertilization overhead percent" className={inputClass()} value={fertOverheadPercent} onChange={(event) => setFertOverheadPercent(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Target margin">
            <input aria-label="Fertilization target margin" className={inputClass()} value={fertTargetMargin} onChange={(event) => setFertTargetMargin(event.target.value)} inputMode="decimal" />
          </Field>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Recommended price" value={currency(fertPricing.recommendedPriceCents)} tone="success" />
          <Metric label="Price book" value={currency(fertPricing.priceBookRevenueCents)} />
          <Metric label="Target revenue" value={currency(fertPricing.targetRevenueCents)} />
          <Metric label="Material cost" value={currency(fertPricing.materialCostCents)} />
          <Metric label="Total cost" value={currency(fertPricing.totalCostCents)} />
          <Metric label="Per application" value={currency(fertPricing.pricePerApplicationCents)} />
        </div>

        <div className="mt-4 rounded-md border border-stone-200 p-3" aria-label="Margin Scenario Builder">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Margin Scenario Builder</h3>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-stone-500">Compare close-rate, owner-target, and premium pricing before creating the estimate line item.</p>
            </div>
            <Badge tone={selectedFertScenario.priceLiftFromPriceBookCents > 0 ? "warning" : "success"}>
              {selectedFertScenario.priceLiftFromPriceBookCents > 0 ? `${currency(selectedFertScenario.priceLiftFromPriceBookCents)} lift needed` : "Price book clears margin"}
            </Badge>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {fertMarginScenarios.map((scenario) => {
              const selected = scenario.key === selectedFertScenario.key;
              return (
                <button
                  key={scenario.key}
                  type="button"
                  aria-label={`Select ${scenario.label} scenario`}
                  aria-pressed={selected}
                  onClick={() => setSelectedFertScenarioKey(scenario.key)}
                  className={cn(
                    "rounded-md border p-3 text-left transition",
                    selected ? "border-[#224036] bg-[#eef5ef] shadow-sm" : "border-stone-200 bg-white hover:bg-stone-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{scenario.label}</div>
                      <div className="mt-1 text-xs text-stone-500">{percent(scenario.targetMarginPercent)} target margin</div>
                    </div>
                    <Badge tone={selected ? "success" : "neutral"}>{currency(scenario.recommendedPriceCents)}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="font-bold">{percent(scenario.grossMarginPercent)}</div>
                      <div className="text-stone-500">Margin</div>
                    </div>
                    <div>
                      <div className="font-bold">{currency(scenario.grossProfitCents)}</div>
                      <div className="text-stone-500">Profit</div>
                    </div>
                    <div>
                      <div className="font-bold">{currency(scenario.pricePerApplicationCents)}</div>
                      <div className="text-stone-500">Per app</div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-1 text-xs leading-5 text-stone-600">
                    {scenario.riskNotes.slice(0, 2).map((note) => (
                      <div key={`${scenario.key}-${note}`} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_260px]">
            <div className="rounded-md bg-stone-50 p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Estimate line-item preview</div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{selectedFertScenario.estimateLineItem.name}</div>
                  <div className="mt-1 text-stone-500">{selectedFertScenario.estimateLineItem.quantity} {selectedFertScenario.estimateLineItem.unit} - {fertPricing.turfAreaSqFt.toLocaleString()} sq ft - {fertPricing.applicationCount} applications</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{currency(selectedFertScenario.estimateLineItem.unitPriceCents)}</div>
                  <div className="text-xs text-stone-500">{currency(selectedFertScenario.pricePer1000SqFtCents)} / 1k sq ft</div>
                </div>
              </div>
            </div>
            <TextButton type="button" icon={<Calculator size={16} />} className="w-full self-stretch" onClick={() => void saveFertilizationPricing()} disabled={fertSaveState === "saving" || !selectedFertProperty || !selectedFertMaterial}>
              {fertSaveState === "saving" ? "Saving" : "Save Selected Scenario"}
            </TextButton>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_320px]">
          <div className="rounded-md border border-stone-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Price rules</div>
            <div className="mt-3 grid gap-2 text-sm">
              {selectedFertRules.length > 0 ? selectedFertRules.map((rule) => {
                const applied = fertAdjustments.some((adjustment) => adjustment.name === rule.name);
                return (
                  <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-stone-50 px-3 py-2">
                    <div>
                      <div className="font-semibold">{rule.name}</div>
                      <div className="text-stone-500">{rule.adjustmentType} {rule.adjustmentValue}{rule.adjustmentType === "percent" ? "%" : ""}</div>
                    </div>
                    <Badge tone={applied ? "success" : "neutral"}>{applied ? "applied" : "not applied"}</Badge>
                  </div>
                );
              }) : <div className="text-stone-500">No price rules configured for this item.</div>}
            </div>
          </div>
          <div className="rounded-md border border-stone-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Fertilizer math</div>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3"><span>Area</span><strong>{fertPricing.turfAreaSqFt.toLocaleString()} sq ft</strong></div>
              <div className="flex justify-between gap-3"><span>Units / app</span><strong>{fertPricing.materialUnitsPerApplication}</strong></div>
              <div className="flex justify-between gap-3"><span>Total units</span><strong>{fertPricing.totalMaterialUnits}</strong></div>
              <div className="flex justify-between gap-3"><span>Per 1k sq ft</span><strong>{currency(fertPricing.pricePer1000SqFtCents)}</strong></div>
            </div>
            <TextButton type="button" icon={<Calculator size={16} />} className="mt-4 w-full" onClick={() => void saveFertilizationPricing()} disabled={fertSaveState === "saving" || !selectedFertProperty || !selectedFertMaterial}>
              {fertSaveState === "saving" ? "Saving" : "Save Fertilization Price Session"}
            </TextButton>
            {fertSaveMessage ? (
              <div className={cn("mt-3 rounded-md border px-3 py-2 text-sm font-semibold", fertSaveState === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>{fertSaveMessage}</div>
            ) : null}
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold">Estimate Approval Queue</h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-stone-500">Approval required when discounts, low margin, unusual scope, or material constraints make an estimate risky before sending.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3" aria-label={`Pending approvals ${pendingApprovalRequests.length}`}>
              <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Pending</div>
              <div className="mt-1 text-lg font-bold">{pendingApprovalRequests.length}</div>
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Avg risk</div>
              <div className="mt-1 text-lg font-bold">{approvalRequests.length ? Math.round(approvalRequests.reduce((sum, request) => sum + request.riskScore, 0) / approvalRequests.length) : 0}</div>
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Blocked value</div>
              <div className="mt-1 text-lg font-bold">{currency(pendingApprovalRequests.reduce((sum, request) => sum + request.totalCents, 0))}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {approvalRequests.length > 0 ? approvalRequests.slice(0, 5).map((request) => {
            const localDecision = approvalMessages[request.id]?.status;
            const displayStatus = localDecision ?? request.status;
            const assignedApprover = request.assignedApproverUserId ? membersById.get(request.assignedApproverUserId) : undefined;
            const requester = request.requestedByUserId ? membersById.get(request.requestedByUserId) : undefined;
            const message = approvalMessages[request.id];
            return (
              <div key={request.id} className="rounded-md border border-stone-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">{request.estimateNumber} - {request.customerName}</div>
                      <Badge tone={displayStatus === "approved" ? "success" : displayStatus === "rejected" ? "danger" : "warning"}>{displayStatus === "pending" ? "Approval required" : formatStatus(displayStatus)}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-stone-500">
                      Requested by {requester?.name ?? "sales"} - assigned to {assignedApprover?.name ?? "manager"} - due {shortDate(request.dueAt)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-right text-sm">
                    <div>
                      <div className="font-bold">{percent(request.grossMarginPercent)}</div>
                      <div className="text-xs text-stone-500">Margin</div>
                    </div>
                    <div>
                      <div className="font-bold">{percent(request.discountPercent)}</div>
                      <div className="text-xs text-stone-500">Discount</div>
                    </div>
                    <div>
                      <div className="font-bold">{request.riskScore}</div>
                      <div className="text-xs text-stone-500">Risk</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_220px]">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Risk reasons</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {request.reasonDetails.map((reason) => (
                        <div key={`${request.id}-${reason.code}`} className={cn("rounded-md border px-3 py-2 text-sm", reason.severity === "critical" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-900")}>
                          <div className="font-semibold">{reason.label}</div>
                          <div className="mt-1 max-w-sm text-xs leading-5">{reason.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid content-start gap-2">
                    <button
                      type="button"
                      aria-label={`Approve estimate ${request.estimateNumber}`}
                      disabled={displayStatus !== "pending" || message?.state === "saving"}
                      onClick={() => void decideApprovalRequest(request, "approved")}
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-[#224036] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a332b] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check size={15} />
                      Approve Estimate
                    </button>
                    <button
                      type="button"
                      aria-label={`Reject estimate ${request.estimateNumber}`}
                      disabled={displayStatus !== "pending" || message?.state === "saving"}
                      onClick={() => void decideApprovalRequest(request, "rejected")}
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={15} />
                      Reject Estimate
                    </button>
                    {message ? (
                      <div className={cn("rounded-md border px-3 py-2 text-xs font-semibold", message.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>{message.message}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-md border border-dashed border-stone-200 p-4 text-sm text-stone-500">No approval requests are queued.</div>
          )}
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

function ProfitView({ operatingDepth, operatingActions }: { operatingDepth: OperatingDepth; operatingActions?: OperatingActions }) {
  const directCosts = operatingDepth.revenue.laborCostCents + operatingDepth.revenue.materialCostCents + operatingDepth.revenue.equipmentCostCents + operatingDepth.revenue.overheadCostCents;
  const sortedJobs = [...operatingDepth.jobCosting.summaries].sort((a, b) => b.grossProfitCents - a.grossProfitCents);
  const analytics = operatingDepth.admin.ownerAnalytics;
  const openInvoices = operatingDepth.revenue.invoices.filter((invoice) => invoice.balanceCents > 0);
  const defaultInvoiceableJobId = operatingDepth.revenue.invoiceableJobs[0]?.jobId ?? "";
  const defaultOpenInvoiceId = openInvoices[0]?.id ?? "";
  const [invoiceJobId, setInvoiceJobId] = useState(defaultInvoiceableJobId);
  const activeInvoiceJobId = invoiceJobId || defaultInvoiceableJobId;
  const [invoiceDueInDays, setInvoiceDueInDays] = useState("14");
  const [invoiceMessage, setInvoiceMessage] = useState<{ state: "success" | "error" | "pending"; message: string } | null>(null);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState(defaultOpenInvoiceId);
  const activePaymentInvoiceId = paymentInvoiceId || defaultOpenInvoiceId;
  const activePaymentInvoice = openInvoices.find((invoice) => invoice.id === activePaymentInvoiceId) ?? openInvoices[0];
  const [paymentAmount, setPaymentAmount] = useState("");
  const displayedPaymentAmount = paymentAmount || (activePaymentInvoice ? String(Math.round(activePaymentInvoice.balanceCents / 100)) : "0");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "check" | "card" | "ach" | "other">("ach");
  const [paymentReference, setPaymentReference] = useState("Manual payment");
  const [paymentMessage, setPaymentMessage] = useState<{ state: "success" | "error" | "pending"; message: string } | null>(null);

  async function handleGenerateProfitInvoice(event: FormEvent) {
    event.preventDefault();
    if (!activeInvoiceJobId) {
      setInvoiceMessage({ state: "error", message: "Choose a billable job before generating an invoice." });
      return;
    }
    setInvoiceMessage({ state: "pending", message: "Generating invoice from completed job work." });
    try {
      const result = await operatingActions?.generateInvoiceFromJob?.(activeInvoiceJobId, "sent", Math.max(1, Math.round(Number(invoiceDueInDays || "14"))));
      setInvoiceMessage({ state: "success", message: result?.created === false ? `Invoice ${result.invoiceNumber} already exists.` : `Invoice ${result?.invoiceNumber ?? "created"} generated.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invoice could not be generated.";
      setInvoiceMessage({ state: "error", message });
    }
  }

  function handlePaymentInvoiceChange(invoiceId: string) {
    setPaymentInvoiceId(invoiceId);
    const invoice = openInvoices.find((candidate) => candidate.id === invoiceId);
    if (invoice) setPaymentAmount(String(Math.round(invoice.balanceCents / 100)));
  }

  function handleRecordPayment(event: FormEvent) {
    event.preventDefault();
    const invoice = activePaymentInvoice;
    if (!invoice) {
      setPaymentMessage({ state: "error", message: "Choose an invoice with an open balance." });
      return;
    }
    const amountCents = Math.min(invoice.balanceCents, dollarsToCents(displayedPaymentAmount));
    if (amountCents <= 0) {
      setPaymentMessage({ state: "error", message: "Payment amount must be greater than zero." });
      return;
    }
    setPaymentMessage({ state: "pending", message: `Recording ${currency(amountCents)} payment for ${invoice.invoiceNumber}.` });
    operatingActions?.recordCustomerPayment?.(invoice.id, amountCents, paymentMethod, paymentReference.trim() || undefined);
    setPaymentMessage({ state: "success", message: `Payment queued for ${invoice.invoiceNumber}.` });
  }

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

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-[#224036]" />
            <h2 className="text-base font-bold">Invoice Builder</h2>
          </div>
          <form onSubmit={handleGenerateProfitInvoice} className="mt-4 grid gap-3">
            <Field label="Billable job">
              <select aria-label="Invoice builder job" className={inputClass()} value={activeInvoiceJobId} onChange={(event) => setInvoiceJobId(event.target.value)}>
                {operatingDepth.revenue.invoiceableJobs.length === 0 ? <option value="">No uninvoiced jobs</option> : null}
                {operatingDepth.revenue.invoiceableJobs.map((job) => (
                  <option key={job.jobId} value={job.jobId}>{job.jobTitle} - {job.customerName} - {currency(job.billableCents)}</option>
                ))}
              </select>
            </Field>
            <Field label="Due days">
              <input aria-label="Invoice due days" className={inputClass()} value={invoiceDueInDays} onChange={(event) => setInvoiceDueInDays(event.target.value)} inputMode="numeric" />
            </Field>
            <TextButton type="submit" icon={<Receipt size={16} />} disabled={!operatingActions?.generateInvoiceFromJob || !activeInvoiceJobId}>Generate Invoice</TextButton>
            {invoiceMessage ? (
              <div className={cn("rounded-md border px-3 py-2 text-sm font-semibold", invoiceMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : invoiceMessage.state === "pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                {invoiceMessage.message}
              </div>
            ) : null}
          </form>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-[#224036]" />
            <h2 className="text-base font-bold">Payment Entry</h2>
          </div>
          <form onSubmit={handleRecordPayment} className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_130px] md:items-end">
            <Field label="Invoice">
              <select aria-label="Payment invoice" className={inputClass()} value={activePaymentInvoiceId} onChange={(event) => handlePaymentInvoiceChange(event.target.value)}>
                {openInvoices.length === 0 ? <option value="">No open invoices</option> : null}
                {openInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} - {invoice.customerName} - {currency(invoice.balanceCents)} open</option>
                ))}
              </select>
            </Field>
            <Field label="Amount">
              <input aria-label="Payment amount" className={inputClass()} value={displayedPaymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Method">
              <select aria-label="Payment method" className={inputClass()} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}>
                <option value="ach">ACH</option>
                <option value="card">Card</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Reference">
              <input aria-label="Payment reference" className={inputClass()} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <TextButton type="submit" icon={<DollarSign size={16} />} disabled={!operatingActions?.recordCustomerPayment || !activePaymentInvoiceId}>Record Payment</TextButton>
            </div>
          </form>
          {paymentMessage ? (
            <div className={cn("mt-3 rounded-md border px-3 py-2 text-sm font-semibold", paymentMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : paymentMessage.state === "pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
              {paymentMessage.message}
            </div>
          ) : null}
        </Panel>
      </div>

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

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel className="overflow-hidden p-0">
          <div className="border-b border-stone-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">AR Aging Review</h2>
              <Badge tone={operatingDepth.revenue.arAging.some((invoice) => invoice.risk === "high") ? "danger" : operatingDepth.revenue.arAging.length ? "warning" : "success"}>{operatingDepth.revenue.arAging.length} open</Badge>
            </div>
          </div>
          <div className="grid gap-2 p-4">
            {operatingDepth.revenue.arAging.slice(0, 6).map((invoice) => (
              <div key={invoice.invoiceId} role="group" aria-label={`AR aging invoice ${invoice.invoiceNumber}`} className="rounded-md border border-stone-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{invoice.invoiceNumber}</div>
                    <div className="mt-1 text-sm text-stone-500">{invoice.customerName} - {invoice.jobTitle}</div>
                  </div>
                  <Badge tone={invoice.risk === "high" ? "danger" : invoice.risk === "medium" ? "warning" : "success"}>{invoice.bucket}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div><div className="font-bold">{currency(invoice.balanceCents)}</div><div className="text-xs text-stone-500">Open</div></div>
                  <div><div className="font-bold">{invoice.daysPastDue}</div><div className="text-xs text-stone-500">Days late</div></div>
                  <div><div className="font-bold">{invoice.dueAt ? shortDate(invoice.dueAt) : "No due date"}</div><div className="text-xs text-stone-500">Due</div></div>
                </div>
                <div className="mt-2 text-xs font-semibold text-stone-600">{invoice.nextAction}</div>
              </div>
            ))}
            {operatingDepth.revenue.arAging.length === 0 ? <div className="rounded-md border border-dashed border-stone-200 p-4 text-sm text-stone-500">No open AR balances.</div> : null}
          </div>
        </Panel>

        <Panel className="overflow-hidden p-0">
          <div className="border-b border-stone-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">Customer Profitability Profiles</h2>
              <Badge>{operatingDepth.revenue.customerProfitability.length} accounts</Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full border-collapse text-sm">
              <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-normal text-stone-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Profit</th>
                  <th className="px-4 py-3 text-right">Margin</th>
                  <th className="px-4 py-3 text-right">LTV</th>
                  <th className="px-4 py-3">Risk / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {operatingDepth.revenue.customerProfitability.slice(0, 8).map((customer) => (
                  <tr key={customer.customerId} role="row" aria-label={`Customer profitability ${customer.customerName}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{customer.customerName}</div>
                      <div className="text-xs text-stone-500">{customer.serviceMix.slice(0, 3).join(", ") || formatStatus(customer.customerType)}</div>
                    </td>
                    <td className="px-4 py-3 text-right">{currency(customer.lifetimeRevenueCents)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{currency(customer.grossProfitCents)}</td>
                    <td className="px-4 py-3 text-right"><Badge tone={customer.grossMarginPercent >= 35 ? "success" : customer.grossMarginPercent < 20 ? "danger" : "warning"}>{percent(customer.grossMarginPercent)}</Badge></td>
                    <td className="px-4 py-3 text-right">{currency(customer.estimatedLtvCents)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge tone={customer.churnRiskLevel === "critical" || customer.churnRiskLevel === "high" ? "danger" : customer.churnRiskLevel === "medium" ? "warning" : "success"}>{formatStatus(customer.churnRiskLevel)}</Badge>
                        <Badge>{customer.paymentBehavior}</Badge>
                        <Badge>{customer.callbackCount} callbacks</Badge>
                      </div>
                      <div className="mt-1 text-xs text-stone-500">{customer.nextBestAction}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
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
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold">Service-Line Profitability</h2>
                <Badge>{operatingDepth.revenue.serviceLineProfitability.length} lines</Badge>
              </div>
            </div>
            <div className="grid gap-2 p-4 md:grid-cols-2">
              {operatingDepth.revenue.serviceLineProfitability.map((line, index) => (
                <div key={line.serviceCategory} role="group" aria-label={`Service line profitability ${line.serviceCategory}`} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase text-stone-500">Rank {index + 1}</div>
                      <div className="mt-1 font-semibold">{line.label}</div>
                    </div>
                    <Badge tone={line.grossMarginPercent >= 35 ? "success" : line.grossMarginPercent < 20 ? "danger" : "warning"}>{percent(line.grossMarginPercent)}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div><div className="font-bold">{currency(line.revenueCents)}</div><div className="text-xs text-stone-500">Revenue</div></div>
                    <div><div className="font-bold">{currency(line.grossProfitCents)}</div><div className="text-xs text-stone-500">Profit</div></div>
                    <div><div className="font-bold">{line.jobCount}</div><div className="text-xs text-stone-500">Jobs</div></div>
                  </div>
                  <div className="mt-3 text-xs text-stone-500">
                    Collected {currency(line.collectedCents)} - Labor {currency(line.laborCostCents)} - Materials {currency(line.materialCostCents)} - Equipment {currency(line.equipmentCostCents)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

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
  const [laborRateMessage, setLaborRateMessage] = useState("");
  const [vendorName, setVendorName] = useState("Local supplier");
  const [itemName, setItemName] = useState("19-0-6 fertilizer");
  const [itemCategory, setItemCategory] = useState<ServiceCategory>("lawn_care");
  const [itemUnit, setItemUnit] = useState("bag");
  const [itemCost, setItemCost] = useState("44.00");
  const [vendorItemMessage, setVendorItemMessage] = useState("");

  function submitLabor(event: FormEvent) {
    event.preventDefault();
    const roleName = laborRole.trim();
    if (!roleName) {
      setLaborRateMessage("Labor role is required.");
      return;
    }
    operatingActions?.upsertLaborRate?.({ roleName, hourlyCostCents: dollarsToCents(laborCost), billableRateCents: dollarsToCents(laborBillable) });
    setLaborRateMessage(`Labor rate ${roleName} saved.`);
  }

  function submitVendor(event: FormEvent) {
    event.preventDefault();
    const nextVendorName = vendorName.trim();
    const nextItemName = itemName.trim();
    const nextUnit = itemUnit.trim();
    if (!nextVendorName || !nextItemName || !nextUnit) {
      setVendorItemMessage("Vendor, item, and unit are required.");
      return;
    }
    operatingActions?.upsertVendorCatalogItem?.({ vendorName: nextVendorName, itemName: nextItemName, category: itemCategory, unit: nextUnit, unitCostCents: dollarsToCents(itemCost) });
    setVendorItemMessage(`Vendor item ${nextItemName} saved.`);
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
                    <div key={rate.id} role="group" aria-label={`Labor rate ${rate.roleName}`} className="rounded-md border border-stone-200 p-3">
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
              <Field label="Role"><input aria-label="Labor rate role" className={inputClass()} value={laborRole} onChange={(event) => setLaborRole(event.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost / hr"><input aria-label="Labor cost per hour" className={inputClass()} value={laborCost} onChange={(event) => setLaborCost(event.target.value)} inputMode="decimal" /></Field>
                <Field label="Bill / hr"><input aria-label="Labor billable per hour" className={inputClass()} value={laborBillable} onChange={(event) => setLaborBillable(event.target.value)} inputMode="decimal" /></Field>
              </div>
              <TextButton type="submit" icon={<Plus size={16} />} variant={operatingActions?.upsertLaborRate ? "primary" : "secondary"}>Save Rate</TextButton>
              {laborRateMessage ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">{laborRateMessage}</div> : null}
            </form>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">Vendor Item</h2>
            <form onSubmit={submitVendor} className="mt-4 grid gap-3">
              <Field label="Vendor"><input aria-label="Vendor catalog supplier" className={inputClass()} value={vendorName} onChange={(event) => setVendorName(event.target.value)} /></Field>
              <Field label="Item"><input aria-label="Vendor catalog item name" className={inputClass()} value={itemName} onChange={(event) => setItemName(event.target.value)} /></Field>
              <Field label="Category">
                <select aria-label="Vendor catalog category" className={inputClass()} value={itemCategory} onChange={(event) => setItemCategory(event.target.value as ServiceCategory)}>
                  {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit"><input aria-label="Vendor catalog unit" className={inputClass()} value={itemUnit} onChange={(event) => setItemUnit(event.target.value)} /></Field>
                <Field label="Cost"><input aria-label="Vendor catalog cost per unit" className={inputClass()} value={itemCost} onChange={(event) => setItemCost(event.target.value)} inputMode="decimal" /></Field>
              </div>
              <TextButton type="submit" icon={<Plus size={16} />} variant={operatingActions?.upsertVendorCatalogItem ? "primary" : "secondary"}>Save Item</TextButton>
              {vendorItemMessage ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">{vendorItemMessage}</div> : null}
            </form>
          </Panel>

          <Panel>
            <h2 className="text-base font-bold">Vendor Catalog</h2>
            <div className="mt-4 grid gap-2">
              {operatingDepth.costIntelligence.vendorCatalogs.slice(0, 6).map((item) => (
                <div key={item.id} role="group" aria-label={`Vendor catalog item ${item.itemName}`} className="rounded-md border border-stone-200 p-3">
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
  upsertServiceCatalogItem,
}: {
  workspace: WorkspaceSnapshot;
  operatingDepth: OperatingDepth;
  operatingActions?: OperatingActions;
  membersById: Map<string, WorkspaceSnapshot["members"][number]>;
  crewName: string;
  setCrewName: (value: string) => void;
  createCrew: (event: FormEvent) => void;
  toggleService: (itemId: string) => void;
  upsertServiceCatalogItem: (input: {
    itemId?: string;
    name: string;
    category: ServiceCategory;
    defaultUnit: string;
    defaultPriceCents: number;
    active: boolean;
  }) => Promise<string>;
}) {
  const roleOptions: Role[] = ["owner", "admin", "manager", "sales", "dispatcher", "crew_lead", "technician"];
  const analytics = operatingDepth.admin.ownerAnalytics;
  const tagGroups = operatingDepth.admin.tagTaxonomy.reduce<Record<string, typeof operatingDepth.admin.tagTaxonomy>>((groups, tag) => {
    groups[tag.category] = [...(groups[tag.category] ?? []), tag];
    return groups;
  }, {});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("technician");
  const [inviteExpiresInDays, setInviteExpiresInDays] = useState("14");
  const [inviteMessage, setInviteMessage] = useState("");
  const [optimisticInviteMembers, setOptimisticInviteMembers] = useState<OperatingDepth["admin"]["members"]>([]);
  const [serviceCatalogForm, setServiceCatalogForm] = useState<ServiceCatalogFormState>(() => defaultServiceCatalogForm());
  const [serviceCatalogMessage, setServiceCatalogMessage] = useState<{ state: "success" | "error" | "pending"; message: string } | null>(null);
  const [leadStatusForm, setLeadStatusForm] = useState<LeadStatusSettingFormState>(() => defaultLeadStatusSettingForm());
  const [leadStatusMessage, setLeadStatusMessage] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditModuleFilter, setAuditModuleFilter] = useState("all");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditEntityFilter, setAuditEntityFilter] = useState("all");
  const [auditActorFilter, setAuditActorFilter] = useState("all");
  const [auditDateFilter, setAuditDateFilter] = useState("all");
  const displayedMembers = useMemo(
    () => [
      ...optimisticInviteMembers,
      ...operatingDepth.admin.members.filter((member) => !optimisticInviteMembers.some((optimistic) => optimistic.email === member.email)),
    ],
    [operatingDepth.admin.members, optimisticInviteMembers],
  );
  const memberStatusCounts = displayedMembers.reduce<Record<string, number>>((counts, member) => {
    counts[member.status] = (counts[member.status] ?? 0) + 1;
    return counts;
  }, {});
  const sortedWorkflowStatuses = useMemo(
    () => [...operatingDepth.leadOps.statusSettings].sort((left, right) => left.sortOrder - right.sortOrder),
    [operatingDepth.leadOps.statusSettings],
  );
  const auditEvents = operatingDepth.admin.auditEvents;
  const auditModuleOptions = useMemo(() => [...new Set(auditEvents.map((event) => event.module))].sort(), [auditEvents]);
  const auditActionOptions = useMemo(() => [...new Set(auditEvents.map((event) => event.action))].sort(), [auditEvents]);
  const auditEntityOptions = useMemo(() => [...new Set(auditEvents.map((event) => event.entityType))].sort(), [auditEvents]);
  const auditActorOptions = useMemo(() => [...new Set(auditEvents.map((event) => event.actorName))].sort(), [auditEvents]);
  const filteredAuditEvents = useMemo(() => {
    const normalizedSearch = auditSearch.trim().toLowerCase();
    const auditTimeAnchor = auditEvents[0]?.createdAt ?? 0;
    const cutoff =
      auditDateFilter === "today"
        ? auditTimeAnchor - 24 * 60 * 60 * 1000
        : auditDateFilter === "7d"
          ? auditTimeAnchor - 7 * 24 * 60 * 60 * 1000
          : auditDateFilter === "30d"
            ? auditTimeAnchor - 30 * 24 * 60 * 60 * 1000
            : 0;

    return auditEvents.filter((event) => {
      const searchable = [event.action, event.summary, event.entityType, event.entityId, event.actorName, event.module, event.exportState, event.requestId ?? "", ...event.changedFields].join(" ").toLowerCase();
      return (
        (!normalizedSearch || searchable.includes(normalizedSearch)) &&
        (auditModuleFilter === "all" || event.module === auditModuleFilter) &&
        (auditActionFilter === "all" || event.action === auditActionFilter) &&
        (auditEntityFilter === "all" || event.entityType === auditEntityFilter) &&
        (auditActorFilter === "all" || event.actorName === auditActorFilter) &&
        (!cutoff || event.createdAt >= cutoff)
      );
    });
  }, [auditActionFilter, auditActorFilter, auditDateFilter, auditEntityFilter, auditEvents, auditModuleFilter, auditSearch]);
  const auditExportCount = filteredAuditEvents.filter((event) => event.exportState !== "not_exported").length;
  const auditChangedFieldCount = filteredAuditEvents.reduce((total, event) => total + event.changedFields.length, 0);

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    const optimisticMember = {
      id: `local-invite-${Date.now()}`,
      userId: `local-user-${email}`,
      name: inviteName.trim() || email,
      email,
      role: inviteRole,
      status: "invited",
    };
    setOptimisticInviteMembers((current) => [optimisticMember, ...current.filter((member) => member.email !== email)]);
    setInviteMessage(`Invitation queued for ${email}.`);
    setInviteEmail("");
    setInviteName("");
    setInviteRole("technician");
    setInviteExpiresInDays("14");
    try {
      await operatingActions?.inviteMember?.({
        email,
        name: optimisticMember.name,
        role: optimisticMember.role,
        expiresInDays: Math.max(1, Math.min(30, Math.round(Number(inviteExpiresInDays || "14")))),
      });
    } catch (error) {
      setOptimisticInviteMembers((current) => current.filter((member) => member.id !== optimisticMember.id));
      setInviteMessage(error instanceof Error ? error.message : `Invitation for ${email} could not be sent.`);
    }
  }

  function updateOptimisticInvite(memberId: string, status: "expired" | "revoked") {
    setOptimisticInviteMembers((current) => current.map((member) => (member.id === memberId ? { ...member, status } : member)));
  }

  function expireInvite(memberId: string) {
    updateOptimisticInvite(memberId, "expired");
    if (!memberId.startsWith("local-invite-")) operatingActions?.expireMemberInvite?.(memberId);
  }

  function revokeInvite(memberId: string) {
    updateOptimisticInvite(memberId, "revoked");
    if (!memberId.startsWith("local-invite-")) operatingActions?.revokeMemberInvite?.(memberId);
  }

  function editServiceCatalogItem(item: WorkspaceSnapshot["serviceCatalog"][number]) {
    setServiceCatalogForm({
      itemId: item.id,
      name: item.name,
      category: item.category,
      defaultUnit: item.defaultUnit,
      defaultPrice: String(Math.round(item.defaultPriceCents / 100)),
      active: item.active,
    });
  }

  function editLeadStatusSetting(setting: OperatingDepth["leadOps"]["statusSettings"][number]) {
    setLeadStatusForm({
      settingId: setting.id,
      status: setting.status,
      label: setting.label,
      color: setting.color,
      sortOrder: String(setting.sortOrder),
      terminal: setting.terminal,
      active: setting.active,
    });
    setLeadStatusMessage("");
  }

  function submitLeadStatusSetting(event: FormEvent) {
    event.preventDefault();
    const label = leadStatusForm.label.trim();
    if (!label) {
      setLeadStatusMessage("Workflow status label is required.");
      return;
    }
    operatingActions?.upsertLeadStatusSetting?.({
      id: leadStatusForm.settingId || undefined,
      status: leadStatusForm.status,
      label,
      color: leadStatusForm.color.trim() || "#64748b",
      sortOrder: Math.max(0, Math.round(Number(leadStatusForm.sortOrder || "0"))),
      terminal: leadStatusForm.terminal,
      active: leadStatusForm.active,
    });
    setLeadStatusMessage(`Workflow status ${label} saved.`);
  }

  async function submitServiceCatalogItem(event: FormEvent) {
    event.preventDefault();
    const name = serviceCatalogForm.name.trim();
    const defaultUnit = serviceCatalogForm.defaultUnit.trim();
    if (!name || !defaultUnit) {
      setServiceCatalogMessage({ state: "error", message: "Service name and unit are required." });
      return;
    }
    setServiceCatalogMessage({ state: "pending", message: `Saving service ${name}.` });
    try {
      const wasEditing = Boolean(serviceCatalogForm.itemId);
      await upsertServiceCatalogItem({
        itemId: serviceCatalogForm.itemId || undefined,
        name,
        category: serviceCatalogForm.category,
        defaultUnit,
        defaultPriceCents: dollarsToCents(serviceCatalogForm.defaultPrice),
        active: serviceCatalogForm.active,
      });
      setServiceCatalogMessage({ state: "success", message: `Service ${name} saved to catalog.` });
      if (!wasEditing) setServiceCatalogForm(defaultServiceCatalogForm());
    } catch (error) {
      setServiceCatalogMessage({ state: "error", message: error instanceof Error ? error.message : "Service could not be saved." });
    }
  }

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
            <Metric label="Members" value={displayedMembers.length} />
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
          <div className="mt-5 border-t border-stone-200 pt-4">
            <h3 className="text-sm font-bold">Lead Quality Thresholds</h3>
            <div className="mt-3 grid gap-2">
              {leadQualityThresholds.map((threshold) => (
                <div key={threshold.band} className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 p-2 text-sm">
                  <div>
                    <div className="font-semibold">{threshold.label}</div>
                    <div className="text-xs text-stone-500">{threshold.action}</div>
                  </div>
                  <Badge tone={threshold.minimumScore >= 85 ? "success" : threshold.minimumScore >= 55 ? "warning" : "danger"}>{threshold.minimumScore}+</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 border-t border-stone-200 pt-4">
            <h3 className="text-sm font-bold">Workflow Status Settings</h3>
            <form onSubmit={submitLeadStatusSetting} className="mt-3 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
              <Field label="Status">
                <select aria-label="Workflow status code" className={inputClass()} value={leadStatusForm.status} onChange={(event) => setLeadStatusForm({ ...leadStatusForm, status: event.target.value as LeadStatusSettingCode })}>
                  {sortedWorkflowStatuses.map((setting) => (
                    <option key={setting.status} value={setting.status}>{formatStatus(setting.status)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Label">
                <input aria-label="Workflow status label" className={inputClass()} value={leadStatusForm.label} onChange={(event) => setLeadStatusForm({ ...leadStatusForm, label: event.target.value })} />
              </Field>
              <div className="grid grid-cols-[1fr_110px] gap-3">
                <Field label="Color">
                  <input aria-label="Workflow status color" className={inputClass()} value={leadStatusForm.color} onChange={(event) => setLeadStatusForm({ ...leadStatusForm, color: event.target.value })} />
                </Field>
                <Field label="Order">
                  <input aria-label="Workflow status order" className={inputClass()} value={leadStatusForm.sortOrder} onChange={(event) => setLeadStatusForm({ ...leadStatusForm, sortOrder: event.target.value })} inputMode="numeric" />
                </Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700">
                  <input aria-label="Workflow status terminal" type="checkbox" checked={leadStatusForm.terminal} onChange={(event) => setLeadStatusForm({ ...leadStatusForm, terminal: event.target.checked })} />
                  Terminal
                </label>
                <label className="flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700">
                  <input aria-label="Workflow status active" type="checkbox" checked={leadStatusForm.active} onChange={(event) => setLeadStatusForm({ ...leadStatusForm, active: event.target.checked })} />
                  Active
                </label>
              </div>
              <TextButton type="submit" icon={<Settings size={16} />} disabled={!operatingActions?.upsertLeadStatusSetting}>Save Workflow Status</TextButton>
              {leadStatusMessage ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">{leadStatusMessage}</div> : null}
            </form>
            <div className="mt-3 grid gap-2">
              {sortedWorkflowStatuses.map((setting) => (
                <div key={setting.id} role="group" aria-label={`Workflow status ${setting.status}`} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: setting.color }} />
                        {setting.label}
                      </div>
                      <div className="mt-1 text-xs text-stone-500">{setting.status} - order {setting.sortOrder}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge tone={setting.active ? "success" : "neutral"}>{setting.active ? "active" : "inactive"}</Badge>
                      <Badge tone={setting.terminal ? "warning" : "neutral"}>{setting.terminal ? "terminal" : "open"}</Badge>
                      <TextButton type="button" variant="secondary" icon={<Settings size={16} />} onClick={() => editLeadStatusSetting(setting)}>Edit</TextButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <UsersRound size={18} className="text-[#224036]" />
                <h2 className="text-base font-bold">Members + Roles</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {["active", "invited", "expired", "revoked"].map((status) => (
                  <Badge key={status} tone={status === "active" ? "success" : status === "invited" ? "warning" : status === "revoked" ? "danger" : "neutral"}>
                    {memberStatusCounts[status] ?? 0} {status}
                  </Badge>
                ))}
              </div>
            </div>
            <form onSubmit={submitInvite} className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Invite email">
                  <input className={inputClass()} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} type="email" required />
                </Field>
                <Field label="Invite name">
                  <input className={inputClass()} value={inviteName} onChange={(event) => setInviteName(event.target.value)} />
                </Field>
                <Field label="Invite role">
                  <select className={inputClass()} value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Role)}>
                    {roleOptions.filter((role) => role !== "owner").map((role) => (
                      <option key={role} value={role}>{roleLabel(role)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Expires days">
                  <input className={inputClass()} value={inviteExpiresInDays} onChange={(event) => setInviteExpiresInDays(event.target.value)} inputMode="numeric" />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <TextButton type="submit" icon={<Plus size={16} />} disabled={!operatingActions?.inviteMember}>Send Invite</TextButton>
                {inviteMessage ? <span className="text-sm font-medium text-emerald-800">{inviteMessage}</span> : null}
              </div>
            </form>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {displayedMembers.map((member) => (
                <div key={member.id} role="group" aria-label={`Member ${member.email}`} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{member.name}</div>
                      <div className="mt-1 text-sm text-stone-500">{member.email}</div>
                    </div>
                    <Badge tone={operatingTone(member.status)}>{member.status}</Badge>
                  </div>
                  <div className="mt-3">
                    <select
                      className={inputClass()}
                      value={member.role}
                      disabled={!operatingActions?.updateMemberRole && !member.id.startsWith("local-invite-")}
                      onChange={(event) => {
                        const nextRole = event.target.value as Role;
                        setOptimisticInviteMembers((current) => current.map((candidate) => (candidate.id === member.id ? { ...candidate, role: nextRole } : candidate)));
                        if (!member.id.startsWith("local-invite-")) operatingActions?.updateMemberRole?.(member.id, nextRole);
                      }}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>{roleLabel(role)}</option>
                      ))}
                    </select>
                  </div>
                  {member.status === "invited" || member.status === "expired" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {member.status === "invited" ? (
                        <TextButton variant="secondary" icon={<CalendarDays size={16} />} onClick={() => expireInvite(member.id)}>
                          Expire Invite
                        </TextButton>
                      ) : null}
                      <TextButton variant="ghost" icon={<X size={16} />} onClick={() => revokeInvite(member.id)}>
                        Revoke Invite
                      </TextButton>
                    </div>
                  ) : null}
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
              <form onSubmit={submitServiceCatalogItem} className="mt-4 grid gap-3">
                <div className="grid gap-3 md:grid-cols-[1fr_170px]">
                  <Field label="Service name">
                    <input aria-label="Catalog service name" className={inputClass()} value={serviceCatalogForm.name} onChange={(event) => setServiceCatalogForm({ ...serviceCatalogForm, name: event.target.value })} />
                  </Field>
                  <Field label="Category">
                    <select aria-label="Catalog service category" className={inputClass()} value={serviceCatalogForm.category} onChange={(event) => setServiceCatalogForm({ ...serviceCatalogForm, category: event.target.value as ServiceCategory })}>
                      {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
                  <Field label="Unit">
                    <input aria-label="Catalog service unit" className={inputClass()} value={serviceCatalogForm.defaultUnit} onChange={(event) => setServiceCatalogForm({ ...serviceCatalogForm, defaultUnit: event.target.value })} />
                  </Field>
                  <Field label="Price">
                    <input aria-label="Catalog service price" className={inputClass()} value={serviceCatalogForm.defaultPrice} onChange={(event) => setServiceCatalogForm({ ...serviceCatalogForm, defaultPrice: event.target.value })} inputMode="decimal" />
                  </Field>
                  <label className="mt-5 flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 text-sm font-semibold text-stone-700">
                    <input aria-label="Catalog service active" type="checkbox" checked={serviceCatalogForm.active} onChange={(event) => setServiceCatalogForm({ ...serviceCatalogForm, active: event.target.checked })} />
                    Active
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <TextButton type="submit" icon={<Plus size={16} />}>{serviceCatalogForm.itemId ? "Save Service" : "Create Service"}</TextButton>
                  {serviceCatalogForm.itemId ? (
                    <TextButton type="button" variant="secondary" icon={<X size={16} />} onClick={() => setServiceCatalogForm(defaultServiceCatalogForm())}>
                      New Service
                    </TextButton>
                  ) : null}
                </div>
                {serviceCatalogMessage ? (
                  <div className={cn("rounded-md border px-3 py-2 text-sm font-semibold", serviceCatalogMessage.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : serviceCatalogMessage.state === "pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                    {serviceCatalogMessage.message}
                  </div>
                ) : null}
              </form>
              <div className="mt-4 grid gap-2">
                {workspace.serviceCatalog.map((item) => (
                  <div key={item.id} role="group" aria-label={`Service catalog item ${item.name}`} className="rounded-md border border-stone-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="mt-1 text-sm text-stone-500">{categoryLabels[item.category]} - {currency(item.defaultPriceCents)} / {item.defaultUnit}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <TextButton type="button" variant="secondary" icon={<Settings size={16} />} onClick={() => editServiceCatalogItem(item)}>Edit</TextButton>
                        <button type="button" onClick={() => toggleService(item.id)} className={cn("h-6 w-11 rounded-full p-0.5 transition", item.active ? "bg-[#224036]" : "bg-stone-300")} aria-label={`Toggle service ${item.name}`}>
                          <span className={cn("block h-5 w-5 rounded-full bg-white transition", item.active && "translate-x-5")} />
                        </button>
                      </div>
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
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#224036]" />
              <h2 className="text-base font-bold">Audit Log</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="Filtered events" value={filteredAuditEvents.length} />
              <Metric label="Changed fields" value={auditChangedFieldCount} />
              <Metric label="Export events" value={auditExportCount} />
            </div>
            <div className="mt-4 grid gap-3">
              <Field label="Audit search">
                <input
                  aria-label="Audit search"
                  className={inputClass()}
                  value={auditSearch}
                  onChange={(event) => setAuditSearch(event.target.value)}
                  placeholder="Search summary, actor, action, entity, request"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Audit module">
                  <select aria-label="Audit module filter" className={inputClass()} value={auditModuleFilter} onChange={(event) => setAuditModuleFilter(event.target.value)}>
                    <option value="all">All modules</option>
                    {auditModuleOptions.map((module) => (
                      <option key={module} value={module}>{module}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Audit action">
                  <select aria-label="Audit action filter" className={inputClass()} value={auditActionFilter} onChange={(event) => setAuditActionFilter(event.target.value)}>
                    <option value="all">All actions</option>
                    {auditActionOptions.map((action) => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Audit entity">
                  <select aria-label="Audit entity filter" className={inputClass()} value={auditEntityFilter} onChange={(event) => setAuditEntityFilter(event.target.value)}>
                    <option value="all">All entities</option>
                    {auditEntityOptions.map((entity) => (
                      <option key={entity} value={entity}>{formatStatus(entity)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Audit actor">
                  <select aria-label="Audit actor filter" className={inputClass()} value={auditActorFilter} onChange={(event) => setAuditActorFilter(event.target.value)}>
                    <option value="all">All actors</option>
                    {auditActorOptions.map((actor) => (
                      <option key={actor} value={actor}>{actor}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Audit date">
                  <select aria-label="Audit date filter" className={inputClass()} value={auditDateFilter} onChange={(event) => setAuditDateFilter(event.target.value)}>
                    <option value="all">All dates</option>
                    <option value="today">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </select>
                </Field>
              </div>
            </div>
            <div className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto pr-1">
              {filteredAuditEvents.length === 0 ? (
                <div className="rounded-md border border-dashed border-stone-300 p-4 text-sm text-stone-500">No audit events match the current filters.</div>
              ) : (
                filteredAuditEvents.map((event) => (
                  <div key={event.id} role="group" aria-label={`Audit event ${event.action} ${event.summary}`} className="rounded-md border border-stone-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{event.action}</div>
                        <div className="mt-1 text-sm text-stone-500">{event.summary}</div>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        <Badge>{event.module}</Badge>
                        <Badge>{formatStatus(event.entityType)}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-stone-500">
                      <div><span className="font-semibold text-stone-700">Actor:</span> {event.actorName}</div>
                      <div><span className="font-semibold text-stone-700">Entity:</span> {event.entityType} / {event.entityId}</div>
                      <div><span className="font-semibold text-stone-700">When:</span> {dateTime(event.createdAt)}</div>
                      <div><span className="font-semibold text-stone-700">Export:</span> {formatStatus(event.exportState)}</div>
                      {event.requestId ? <div><span className="font-semibold text-stone-700">Request:</span> {event.requestId}</div> : null}
                    </div>
                    {event.changedFields.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {event.changedFields.map((field) => (
                          <Badge key={field}>{formatStatus(field)}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
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
  operatingActions,
}: {
  form: ClientOnboardingFormState;
  setForm: (value: ClientOnboardingFormState) => void;
  provisionedClients: ProvisionedClientWorkspace[];
  createClientWorkspace: (event: FormEvent) => void;
  authConfigured: boolean;
  operatingDepth: OperatingDepth;
  operatingActions?: OperatingActions;
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
  const [uploadedImportName, setUploadedImportName] = useState("");
  const [uploadedImportRows, setUploadedImportRows] = useState<ImportPreviewUiRow[]>([]);
  const [persistedImportJobId, setPersistedImportJobId] = useState("");
  const [importCommitState, setImportCommitState] = useState<"idle" | "saving" | "saved" | "committing" | "committed" | "error">("idle");
  const [importCommitMessage, setImportCommitMessage] = useState("");
  const [importUploadError, setImportUploadError] = useState("");
  const serviceTerritory = form.serviceTerritory.split(",").map((city) => city.trim()).filter(Boolean);
  const uploadedQaRows = uploadedImportRows.map((row) => ({
    id: row.id ?? `uploaded-${row.rowNumber}`,
    source: uploadedImportName || "Uploaded CSV",
    rowLabel: `Row ${row.rowNumber} - ${row.customerName || "Unnamed lead"}`,
    status: row.status,
    issues: row.issues.map((issue) => issue.message),
    mappedEntity: row.mappedEntity,
  }));
  const importQaRows = uploadedQaRows.length > 0 ? uploadedQaRows : operatingDepth.fieldOps.importQaRows;
  const importCounts = {
    ready: importQaRows.filter((row) => row.status === "ready").length,
    review: importQaRows.filter((row) => row.status === "needs_review").length,
    blocked: importQaRows.filter((row) => row.status === "blocked").length,
  };

  async function handleLeadImportUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csv = await file.text();
      setImportCommitState("saving");
      setImportCommitMessage("");
      const rows = parseLeadImportCsv(csv, {
        currentContactCount: 0,
        freeContactLimit: form.billingPlan === "free" ? 10 : Number.MAX_SAFE_INTEGER,
        serviceTerritory,
      });
      setUploadedImportName(file.name);
      setUploadedImportRows(rows);
      setPersistedImportJobId("");
      setImportUploadError(rows.length === 0 ? "No importable rows were found in that CSV." : "");
      if (rows.length > 0 && operatingActions?.createLeadImportPreview) {
        const persisted = await operatingActions.createLeadImportPreview({ fileName: file.name, csvText: csv });
        setPersistedImportJobId(persisted.importJobId);
        setUploadedImportRows(persisted.rows);
        setImportCommitState("saved");
        setImportCommitMessage(`Import job saved with ${persisted.rows.length} rows. Commit ready rows when QA is done.`);
      } else {
        setImportCommitState(rows.length > 0 ? "saved" : "idle");
        setImportCommitMessage(rows.length > 0 ? "Local preview created. Connect Convex actions to commit these rows." : "");
      }
    } catch (error) {
      setUploadedImportName("");
      setUploadedImportRows([]);
      setPersistedImportJobId("");
      setImportCommitState("error");
      setImportCommitMessage("");
      setImportUploadError(error instanceof Error ? userFacingWriteError(error) : "Could not read that CSV file.");
    }
  }

  async function commitUploadedImport() {
    if (!persistedImportJobId || !operatingActions?.commitLeadImportRows) return;
    try {
      setImportCommitState("committing");
      const result = await operatingActions.commitLeadImportRows(persistedImportJobId);
      setImportCommitState("committed");
      setImportCommitMessage(`${result.imported} rows imported, ${result.skipped} skipped, ${result.failed} failed.`);
    } catch (error) {
      setImportCommitState("error");
      setImportCommitMessage(userFacingWriteError(error));
    }
  }

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
              <Badge tone={importCounts.blocked > 0 ? "warning" : "success"}>{importQaRows.length} rows</Badge>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50">
                <FileText size={16} />
                Upload CSV
                <input aria-label="Upload lead import CSV" type="file" accept=".csv,text/csv" className="sr-only" onChange={handleLeadImportUpload} />
              </label>
              <TextButton
                type="button"
                icon={<Check size={16} />}
                disabled={!persistedImportJobId || !operatingActions?.commitLeadImportRows || importCommitState === "committing" || importCommitState === "committed"}
                onClick={commitUploadedImport}
              >
                {importCommitState === "committing" ? "Committing" : "Commit Ready Rows"}
              </TextButton>
              <Badge tone={uploadedImportRows.length > 0 ? "success" : "neutral"}>{uploadedImportName || "Sample rows"}</Badge>
            </div>
            {importUploadError ? (
              <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900">{importUploadError}</div>
            ) : null}
            {importCommitMessage ? (
              <div
                className={cn(
                  "mt-3 rounded-md border p-3 text-sm font-medium",
                  importCommitState === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-emerald-200 bg-emerald-50 text-emerald-900",
                )}
              >
                {importCommitMessage}
              </div>
            ) : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900"><span className="font-bold">{importCounts.ready}</span> ready</div>
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900"><span className="font-bold">{importCounts.review}</span> needs review</div>
              <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-900"><span className="font-bold">{importCounts.blocked}</span> blocked</div>
            </div>
            <div className="mt-4 grid gap-2">
              {importQaRows.map((row) => (
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
      <JourneyWorkflowPanel
        title="Data Export Workflow"
        description="Tenant export request controls for audit history, reporting snapshots, and operational records."
        items={specsJourneyWorkflows}
      />
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
