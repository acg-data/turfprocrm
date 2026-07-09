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

export type EntityType = "customer" | "lead" | "opportunity" | "estimate" | "job" | "visit" | "property";

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
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export type ServiceCatalogItem = {
  id: string;
  name: string;
  category: ServiceCategory;
  defaultUnit: string;
  defaultPriceCents: number;
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
  title: string;
  status: JobStatus;
  priority: "low" | "normal" | "high";
  managerId: string;
  startDate: number;
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

export type Task = {
  id: string;
  entityType: EntityType;
  entityId: string;
  title: string;
  status: TaskStatus;
  priority: "low" | "normal" | "high";
  dueAt: number;
  assignedUserId: string;
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

export type Material = {
  id: string;
  name: string;
  unit: string;
  costCents: number;
  active: boolean;
};

export type WorkspaceSnapshot = {
  viewer?: { userId: string; role: string };
  seeded?: boolean;
  organization: {
    id: string;
    name: string;
    timezone: string;
  };
  members: Member[];
  customers: Customer[];
  properties: Property[];
  leads: Lead[];
  opportunities: Opportunity[];
  estimates: Estimate[];
  serviceCatalog: ServiceCatalogItem[];
  crews: Crew[];
  jobs: Job[];
  visits: JobVisit[];
  tasks: Task[];
  activities: Activity[];
  materials: Material[];
};
