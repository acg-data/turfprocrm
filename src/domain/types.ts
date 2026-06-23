import type {
  EstimateStatus,
  JobStatus,
  LeadStatus,
  OpportunityStage,
  Role,
  ServiceCategory,
  TaskStatus,
  VisitStatus,
} from "./workflow";

export type EntityType =
  | "organization"
  | "customer"
  | "contact"
  | "lead"
  | "opportunity"
  | "estimate"
  | "job"
  | "visit"
  | "property"
  | "task"
  | "field_issue"
  | "file"
  | "photo"
  | "customer_invoice"
  | "customer_payment";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Customer = {
  id: string;
  name: string;
  type: "residential" | "commercial" | "hoa" | "municipal";
  status: "active" | "prospect" | "inactive";
  phone: string;
  email: string;
  tags: string[];
  ownerId: string;
};

export type Contact = {
  id: string;
  customerId: string;
  name: string;
  email?: string;
  phone?: string;
  roleTitle?: string;
  isPrimary: boolean;
};

export type Property = {
  id: string;
  customerId: string;
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
  lawnSizeSqFt?: number;
};

export type PropertyArea = {
  id: string;
  propertyId: string;
  name: string;
  kind: "front_lawn" | "back_lawn" | "bed" | "perimeter" | "tree_shrub" | "other";
  size?: number;
  unit?: string;
  notes?: string;
};

export type Lead = {
  id: string;
  title: string;
  customerId: string;
  propertyId: string;
  source: string;
  status: LeadStatus;
  urgency: "low" | "normal" | "high";
  ownerId: string;
  leadType?: "phone_call" | "form" | "direct_email" | "referral" | "other";
  accountType?: "residential" | "commercial";
  companyAssignment?: string;
  programRequests?: ServiceCategory[];
  lawnSizeSqFt?: number;
  message?: string;
  estimateNotes?: string;
  qualityScore?: number;
  spamScore?: number;
  receivedAt?: number;
  createdAt: number;
};

export type Opportunity = {
  id: string;
  leadId?: string;
  customerId: string;
  propertyId: string;
  title: string;
  stage: OpportunityStage;
  valueCents: number;
  closeProbability: number;
  expectedCloseDate: number;
  ownerId: string;
  serviceLines: ServiceCategory[];
  updatedAt: number;
};

export type Estimate = {
  id: string;
  opportunityId: string;
  customerId: string;
  propertyId: string;
  estimateNumber: string;
  status: EstimateStatus;
  approvalStatus?: "not_required" | "pending" | "approved" | "rejected";
  subtotalCents: number;
  discountCents?: number;
  taxCents: number;
  totalCents: number;
  sentAt?: number;
  acceptedAt?: number;
  acceptedByName?: string;
  acceptedByEmail?: string;
  acceptanceSource?: "customer_portal" | "email" | "verbal" | "office";
  acceptanceNote?: string;
  expiresAt?: number;
  terms?: string;
};

export type ServiceCatalogItem = {
  id: string;
  name: string;
  category: ServiceCategory;
  description?: string;
  defaultUnit: string;
  defaultPriceCents: number;
  durationMinutes?: number;
  active: boolean;
};

export type ServicePackage = {
  id: string;
  name: string;
  category: ServiceCategory;
  description?: string;
  includedServiceCatalogItemIds: string[];
  defaultPriceCents: number;
  billingCadence: "one_time" | "monthly" | "seasonal" | "annual";
  laborHours?: number;
  laborRateCents?: number;
  materialCostCents?: number;
  equipmentCostCents?: number;
  overheadPercent?: number;
  targetMarginPercent?: number;
  checklistDefaults?: string[];
  active: boolean;
};

export type PriceBookItem = {
  id: string;
  serviceCatalogItemId?: string;
  name: string;
  unit: string;
  basePriceCents: number;
  minPriceCents?: number;
  pricingModel: "flat" | "per_sq_ft" | "per_acre" | "per_visit" | "per_crew_hour";
  formula?: string;
  active: boolean;
};

export type PricingRule = {
  id: string;
  priceBookItemId: string;
  name: string;
  condition?: {
    minAreaSqFt?: number;
    maxAreaSqFt?: number;
    minApplications?: number;
    maxApplications?: number;
  };
  adjustmentType: "fixed" | "percent" | "multiplier";
  adjustmentValue: number;
  order: number;
  active: boolean;
};

export type Crew = {
  id: string;
  name: string;
  color: string;
  active: boolean;
};

export type ChecklistItem = {
  id: string;
  label: string;
  isDone: boolean;
};

export type Job = {
  id: string;
  customerId: string;
  propertyId: string;
  opportunityId?: string;
  estimateId?: string;
  title: string;
  status: JobStatus;
  priority: "low" | "normal" | "high";
  managerId: string;
  startDate: number;
  recurrence?: RecurringServicePlan["frequency"];
};

export type JobVisit = {
  id: string;
  jobId: string;
  customerId: string;
  propertyId: string;
  scheduledStart: number;
  scheduledEnd: number;
  status: VisitStatus;
  routeOrder: number;
  crewId: string;
  checklist: ChecklistItem[];
  notes: string;
};

export type RecurringServicePlan = {
  id: string;
  customerId: string;
  propertyId?: string;
  jobId?: string;
  crewId?: string;
  name: string;
  frequency: "weekly" | "biweekly" | "monthly" | "seasonal" | "custom";
  intervalDays: number;
  visitDurationMinutes: number;
  nextRunAt: number;
  lastGeneratedAt?: number;
  generatedVisitIds?: string[];
  status: "active" | "paused" | "completed";
};

export type ChangeOrder = {
  id: string;
  jobId: string;
  customerId: string;
  propertyId?: string;
  estimateId?: string;
  title: string;
  description: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "canceled";
  requestedByName?: string;
  approvedByName?: string;
  approvedByEmail?: string;
  revenueDeltaCents: number;
  estimatedCostDeltaCents: number;
  grossProfitDeltaCents: number;
  grossMarginPercent: number;
  scheduleImpactDays: number;
  requestedAt: number;
  approvedAt?: number;
  taskId?: string;
};

export type Task = {
  id: string;
  entityType: EntityType;
  entityId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: "low" | "normal" | "high";
  dueAt: number;
  assignedUserId: string;
};

export type FieldIssue = {
  id: string;
  visitId: string;
  jobId: string;
  customerId: string;
  propertyId?: string;
  taskId?: string;
  opportunityId?: string;
  category: "damage" | "pest_activity" | "customer_concern" | "access_issue" | "upsell_opportunity" | "safety_hazard" | "other";
  severity: "low" | "normal" | "high" | "urgent";
  status: "open" | "reviewed" | "resolved" | "dismissed";
  summary: string;
  details?: string;
  customerVisible: boolean;
};

export type Activity = {
  id: string;
  entityType: EntityType;
  entityId: string;
  kind: "call" | "email" | "note" | "status_change" | "estimate" | "visit" | "system";
  summary: string;
  actorId: string;
  occurredAt: number;
};

export type Note = {
  id: string;
  entityType: EntityType;
  entityId: string;
  body: string;
  visibility: "internal" | "customer";
  createdByUserId?: string;
  createdAt: number;
};

export type CustomerFile = {
  id: string;
  entityType: EntityType;
  entityId: string;
  fileName: string;
  contentType?: string;
  size?: number;
  createdByUserId?: string;
  createdAt: number;
};

export type CustomerInvoice = {
  id: string;
  customerId: string;
  jobId?: string;
  estimateId?: string;
  invoiceNumber: string;
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void";
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  dueAt?: number;
  sentAt?: number;
  paidAt?: number;
};

export type CustomerPayment = {
  id: string;
  customerId: string;
  invoiceId?: string;
  status: "pending" | "posted" | "failed" | "refunded";
  method: "cash" | "check" | "card" | "ach" | "other";
  amountCents: number;
  receivedAt: number;
  reference?: string;
};

export type ApprovalRequest = {
  id: string;
  estimateId: string;
  estimateNumber: string;
  opportunityId?: string;
  customerId: string;
  customerName: string;
  requestedByUserId?: string;
  assignedApproverUserId?: string;
  status: "pending" | "approved" | "rejected" | "canceled";
  reasonDetails: Array<{
    code: string;
    label: string;
    severity: "warning" | "critical";
    detail: string;
    impactCents?: number;
  }>;
  riskScore: number;
  grossMarginPercent: number;
  discountCents: number;
  discountPercent: number;
  estimatedCostCents: number;
  totalCents: number;
  dueAt: number;
  requestedAt: number;
  decidedByUserId?: string;
  decidedAt?: number;
  decisionComment?: string;
};

export type Material = {
  id: string;
  name: string;
  unit: string;
  costCents: number;
  active: boolean;
};

export type WorkspaceSnapshot = {
  organization: {
    id: string;
    name: string;
    timezone: string;
  };
  members: Member[];
  customers: Customer[];
  contacts: Contact[];
  properties: Property[];
  propertyAreas: PropertyArea[];
  leads: Lead[];
  opportunities: Opportunity[];
  estimates: Estimate[];
  approvalRequests: ApprovalRequest[];
  invoices: CustomerInvoice[];
  payments: CustomerPayment[];
  serviceCatalog: ServiceCatalogItem[];
  servicePackages: ServicePackage[];
  priceBookItems: PriceBookItem[];
  pricingRules: PricingRule[];
  crews: Crew[];
  jobs: Job[];
  visits: JobVisit[];
  recurringServicePlans: RecurringServicePlan[];
  changeOrders: ChangeOrder[];
  tasks: Task[];
  activities: Activity[];
  notes: Note[];
  files: CustomerFile[];
  materials: Material[];
};
