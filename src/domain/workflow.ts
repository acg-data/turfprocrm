export const roles = ["owner", "admin", "manager", "sales", "dispatcher", "crew_lead", "technician"] as const;
export type Role = (typeof roles)[number];

export const opportunityStages = [
  "new",
  "qualified",
  "estimating",
  "proposal_sent",
  "won",
  "lost",
] as const;
export type OpportunityStage = (typeof opportunityStages)[number];

export const estimateStatuses = ["draft", "sent", "accepted", "declined", "expired"] as const;
export type EstimateStatus = (typeof estimateStatuses)[number];

export const jobStatuses = ["scheduled", "in_progress", "blocked", "completed", "canceled"] as const;
export type JobStatus = (typeof jobStatuses)[number];

export const visitStatuses = ["scheduled", "en_route", "on_site", "complete", "missed", "canceled"] as const;
export type VisitStatus = (typeof visitStatuses)[number];

export const taskStatuses = ["open", "in_progress", "done", "canceled"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const fieldIssueCategories = [
  "damage",
  "pest_activity",
  "customer_concern",
  "access_issue",
  "upsell_opportunity",
  "safety_hazard",
  "other",
] as const;
export type FieldIssueCategory = (typeof fieldIssueCategories)[number];

export const fieldIssueSeverities = ["low", "normal", "high", "urgent"] as const;
export type FieldIssueSeverity = (typeof fieldIssueSeverities)[number];

export const leadStatuses = ["new", "contacted", "converted", "disqualified"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const serviceCategories = [
  "lawn_care",
  "landscaping",
  "pest_control",
  "tree_shrub",
  "irrigation",
  "snow",
  "maintenance",
] as const;
export type ServiceCategory = (typeof serviceCategories)[number];

export const nextOpportunityStage: Partial<Record<OpportunityStage, OpportunityStage>> = {
  new: "qualified",
  qualified: "estimating",
  estimating: "proposal_sent",
  proposal_sent: "won",
};

export const previousOpportunityStage: Partial<Record<OpportunityStage, OpportunityStage>> = {
  qualified: "new",
  estimating: "qualified",
  proposal_sent: "estimating",
  won: "proposal_sent",
  lost: "proposal_sent",
};

export function canAdvanceOpportunity(from: OpportunityStage, to: OpportunityStage) {
  if (from === to) return true;
  if (to === "lost") return from !== "won";
  return nextOpportunityStage[from] === to || previousOpportunityStage[from] === to;
}

export function opportunityStageLabel(stage: OpportunityStage) {
  const labels: Record<OpportunityStage, string> = {
    new: "New",
    qualified: "Qualified",
    estimating: "Estimating",
    proposal_sent: "Proposal Sent",
    won: "Won",
    lost: "Lost",
  };

  return labels[stage];
}

export function visitStatusLabel(status: VisitStatus) {
  const labels: Record<VisitStatus, string> = {
    scheduled: "Scheduled",
    en_route: "En Route",
    on_site: "On Site",
    complete: "Complete",
    missed: "Missed",
    canceled: "Canceled",
  };

  return labels[status];
}

export function roleLabel(role: Role) {
  const labels: Record<Role, string> = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    sales: "Sales",
    dispatcher: "Dispatcher",
    crew_lead: "Crew Lead",
    technician: "Technician",
  };

  return labels[role];
}

export function fieldIssueCategoryLabel(category: FieldIssueCategory) {
  const labels: Record<FieldIssueCategory, string> = {
    damage: "Damage",
    pest_activity: "Pest activity",
    customer_concern: "Customer concern",
    access_issue: "Access issue",
    upsell_opportunity: "Upsell opportunity",
    safety_hazard: "Safety hazard",
    other: "Other issue",
  };

  return labels[category];
}

export function statusTone(status: OpportunityStage | VisitStatus | JobStatus | TaskStatus | EstimateStatus | LeadStatus) {
  if (["won", "complete", "completed", "done", "accepted", "converted"].includes(status)) return "success";
  if (["lost", "missed", "canceled", "declined", "expired", "disqualified", "blocked"].includes(status)) return "danger";
  if (["proposal_sent", "sent", "on_site", "in_progress", "en_route", "contacted"].includes(status)) return "warning";
  return "neutral";
}
