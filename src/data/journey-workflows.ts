export type JourneyWorkflowItem = {
  id: number;
  title: string;
  owner: string;
  outcome: string;
  fields: string[];
  dataObjects: string[];
  nextAction: string;
};

export const onboardingJourneyWorkflows: JourneyWorkflowItem[] = [
  {
    id: 13,
    title: "Service vertical selector",
    owner: "Owner",
    outcome: "Tenant setup captures landscaping, lawn care, pest, tree care, snow, irrigation, or mixed operations.",
    fields: ["Verticals", "Default service packages", "Industry-specific checklist", "Route assumptions"],
    dataObjects: ["organizations", "serviceCatalogItems", "featureFlags"],
    nextAction: "Save vertical mix",
  },
  {
    id: 14,
    title: "Company profile setup",
    owner: "Admin",
    outcome: "Company name, phone, address, service territory, timezone, and logo URL are ready for quotes and customer records.",
    fields: ["Company", "Phone", "Address", "Service area", "Timezone", "Logo URL"],
    dataObjects: ["organizations", "externalIntegrations", "auditEvents"],
    nextAction: "Update profile",
  },
  {
    id: 19,
    title: "Starter catalog template",
    owner: "Owner/Admin",
    outcome: "Loads default services, materials, checklists, statuses, and estimate templates by service line.",
    fields: ["Template", "Services", "Materials", "Checklist defaults", "Lead statuses"],
    dataObjects: ["serviceCatalogItems", "materials", "leadStatusSettings", "estimateTemplates"],
    nextAction: "Apply template",
  },
  {
    id: 20,
    title: "Onboarding checklist closeout",
    owner: "Owner",
    outcome: "Tracks remaining implementation tasks and gives the owner a clear go-live path.",
    fields: ["Checklist item", "Owner", "Due date", "Status", "Demo data cleanup"],
    dataObjects: ["onboardingChecklistItems", "auditEvents"],
    nextAction: "Mark ready",
  },
];

export const adminJourneyWorkflows: JourneyWorkflowItem[] = [
  {
    id: 18,
    title: "Crew setup",
    owner: "Dispatcher/Admin",
    outcome: "Crew capacity, vehicle, skills, schedule availability, and equipment assignments are ready for dispatch.",
    fields: ["Crew", "Capacity", "Vehicle", "Skills", "Availability", "Equipment"],
    dataObjects: ["crews", "crewMembers", "equipment"],
    nextAction: "Save crew setup",
  },
  {
    id: 94,
    title: "Equipment rate editor",
    owner: "Admin/Finance",
    outcome: "Equipment hourly, mileage, depreciation, fuel, maintenance, and replacement assumptions feed costing.",
    fields: ["Equipment", "Hourly rate", "Mileage rate", "Fuel", "Maintenance", "Replacement reserve"],
    dataObjects: ["equipmentRateCards", "equipment", "auditEvents"],
    nextAction: "Save equipment rate",
  },
  {
    id: 99,
    title: "Data retention policy",
    owner: "Admin/Security",
    outcome: "Retention settings protect audit logs while defining archive windows for operational records.",
    fields: ["Record type", "Retention days", "Archive mode", "Legal hold", "Export before purge"],
    dataObjects: ["auditEvents", "exportJobs", "reportingWatermarks"],
    nextAction: "Apply retention policy",
  },
];

export const crmJourneyWorkflows: JourneyWorkflowItem[] = [
  {
    id: 25,
    title: "Referral lead tracker",
    owner: "Sales",
    outcome: "Referral source, referring customer, value, and conversion are visible from CRM.",
    fields: ["Referring customer", "Referral source", "Reward", "Value", "Conversion state"],
    dataObjects: ["leads", "customers", "entityTags"],
    nextAction: "Log referral",
  },
  {
    id: 34,
    title: "Site visit scheduler",
    owner: "Sales/Estimator",
    outcome: "Creates a visit task, assigns estimator, and opens the property map before estimating.",
    fields: ["Estimator", "Visit window", "Property", "Map link", "Prep notes"],
    dataObjects: ["tasks", "jobVisits", "properties"],
    nextAction: "Schedule site visit",
  },
  {
    id: 38,
    title: "Property profile",
    owner: "Operations",
    outcome: "Property areas, service history, active jobs, alerts, and measurements are reviewed in one place.",
    fields: ["Areas", "Measurements", "Service history", "Alerts", "Active jobs"],
    dataObjects: ["properties", "propertyAreas", "jobs", "jobVisits"],
    nextAction: "Open property profile",
  },
  {
    id: 39,
    title: "Decision-maker map",
    owner: "Sales",
    outcome: "Tracks owner, billing, site, property manager, and HOA board contacts without losing the primary contact.",
    fields: ["Role", "Primary", "Billing", "Site contact", "HOA board"],
    dataObjects: ["contacts", "customers"],
    nextAction: "Review contacts",
  },
  {
    id: 43,
    title: "Measurement editor",
    owner: "Estimator",
    outcome: "Captures turf, beds, perimeter, trees, slopes, and custom areas for pricing calculators.",
    fields: ["Area type", "Size", "Unit", "Slope", "Notes", "Import source"],
    dataObjects: ["propertyAreas", "pricingCalculatorSessions"],
    nextAction: "Save measurement",
  },
];

export const leadOpsJourneyWorkflows: JourneyWorkflowItem[] = [
  {
    id: 27,
    title: "Commercial RFP intake",
    owner: "Sales manager",
    outcome: "RFP due date, property count, bid type, document checklist, and owner are captured for commercial bids.",
    fields: ["Due date", "Property count", "Bid type", "Required documents", "Owner", "File checklist"],
    dataObjects: ["leads", "files", "tasks", "opportunities"],
    nextAction: "Create RFP lead",
  },
];

export const pipelineJourneyWorkflows: JourneyWorkflowItem[] = [
  {
    id: 40,
    title: "Lost opportunity closeout",
    owner: "Sales manager",
    outcome: "Loss reason, competitor, price sensitivity, and reactivation date are recorded for future win-back.",
    fields: ["Loss reason", "Competitor", "Price sensitivity", "Reactivation date", "Follow-up task"],
    dataObjects: ["opportunities", "tasks", "activities"],
    nextAction: "Close lost",
  },
];

export const costingJourneyWorkflows: JourneyWorkflowItem[] = [
  {
    id: 45,
    title: "Recurring pest plan builder",
    owner: "Estimator",
    outcome: "Prices recurring pest programs from frequency, category, chemical defaults, route complexity, and compliance rules.",
    fields: ["Pest category", "Frequency", "Chemical default", "Route constraint", "Compliance note", "Margin"],
    dataObjects: ["servicePackages", "materials", "routePlans", "pricingCalculatorSessions"],
    nextAction: "Price pest plan",
  },
];

export const dispatchJourneyWorkflows: JourneyWorkflowItem[] = [
  {
    id: 53,
    title: "Urgent pest call insertion",
    owner: "Dispatcher",
    outcome: "Priority pest visit is inserted into the route and schedule disruption is visible.",
    fields: ["Priority", "Pest type", "Window", "Crew", "Route impact", "Customer alert"],
    dataObjects: ["leads", "jobVisits", "routePlans", "tasks"],
    nextAction: "Insert urgent visit",
  },
  {
    id: 54,
    title: "Weather reschedule",
    owner: "Dispatcher",
    outcome: "Weather-driven moves keep the reason, customer communication, and audit history attached to the visit.",
    fields: ["Weather risk", "New date", "Reason", "Customer message", "Internal note"],
    dataObjects: ["jobVisits", "weatherSnapshots", "activities", "auditEvents"],
    nextAction: "Reschedule visit",
  },
  {
    id: 58,
    title: "Commercial multi-site schedule",
    owner: "Dispatcher",
    outcome: "Multi-site contracts group visits by customer, property cluster, crew, and service window.",
    fields: ["Customer", "Property cluster", "Crew", "Contract window", "Route group"],
    dataObjects: ["customers", "properties", "jobVisits", "routePlans"],
    nextAction: "Build multi-site route",
  },
  {
    id: 59,
    title: "Missed visit recovery",
    owner: "Dispatcher/Manager",
    outcome: "Missed work is converted into a makeup visit with customer follow-up and internal task ownership.",
    fields: ["Missed reason", "Makeup window", "Owner", "Customer touch", "Recovery status"],
    dataObjects: ["jobVisits", "tasks", "activities"],
    nextAction: "Create makeup visit",
  },
];

export const fieldJourneyWorkflows: JourneyWorkflowItem[] = [
  {
    id: 65,
    title: "Before/after photo capture",
    owner: "Field crew",
    outcome: "Photo placeholders attach to visit, property, job, and audit timeline for supervisor review.",
    fields: ["Before photo", "After photo", "Caption", "Customer visible", "Visit link"],
    dataObjects: ["photos", "files", "auditEvents"],
    nextAction: "Attach photo set",
  },
  {
    id: 67,
    title: "Equipment time entry",
    owner: "Field crew",
    outcome: "Equipment type, usage time, rate source, and costing impact are visible during field completion.",
    fields: ["Equipment", "Start", "End", "Hours", "Rate card", "Cost impact"],
    dataObjects: ["equipment", "equipmentRateCards", "jobCostSummaries"],
    nextAction: "Log equipment time",
  },
];

export const jobsJourneyWorkflows: JourneyWorkflowItem[] = [
  {
    id: 70,
    title: "Supervisor submission review",
    owner: "Supervisor",
    outcome: "Scope, exceptions, photos, materials, and customer-ready notes are reviewed before closeout.",
    fields: ["Scope result", "Exceptions", "Photos", "Materials", "Customer note"],
    dataObjects: ["jobVisits", "photos", "materialApplications", "tasks"],
    nextAction: "Approve submission",
  },
  {
    id: 72,
    title: "Phase board",
    owner: "Project manager",
    outcome: "Design, prep, install, cleanup, inspection, and warranty phases are visible with owners and dates.",
    fields: ["Phase", "Owner", "Start", "Due", "Status", "Task count"],
    dataObjects: ["jobPhases", "tasks", "jobs"],
    nextAction: "Advance phase",
  },
  {
    id: 75,
    title: "Add-on conversion",
    owner: "Field/Sales",
    outcome: "Field issue or note can become an upsell opportunity or change order.",
    fields: ["Issue", "Estimated value", "Service line", "Owner", "Conversion path"],
    dataObjects: ["activities", "tasks", "opportunities"],
    nextAction: "Create add-on",
  },
  {
    id: 76,
    title: "Job hold control",
    owner: "Manager",
    outcome: "Hold reason, owner, restart date, customer impact, and blocked revenue are tracked.",
    fields: ["Hold reason", "Owner", "Expected restart", "Customer impact", "Blocked revenue"],
    dataObjects: ["jobs", "tasks", "activities"],
    nextAction: "Put job on hold",
  },
  {
    id: 77,
    title: "Backorder tracker",
    owner: "Operations",
    outcome: "Vendor, item, quantity, ETA, cost impact, and schedule impact are linked to the job.",
    fields: ["Vendor", "Item", "Quantity", "ETA", "Cost impact", "Schedule impact"],
    dataObjects: ["purchaseOrders", "vendorCatalogItems", "materials", "tasks"],
    nextAction: "Log backorder",
  },
  {
    id: 78,
    title: "Quality inspection",
    owner: "Supervisor",
    outcome: "Pass/fail items, photos, corrective tasks, and customer summary are captured.",
    fields: ["Inspection item", "Pass/fail", "Corrective task", "Photo", "Customer summary"],
    dataObjects: ["tasks", "photos", "jobVisits", "auditEvents"],
    nextAction: "Complete inspection",
  },
  {
    id: 79,
    title: "Warranty callback",
    owner: "Service manager",
    outcome: "Callback links original job, issue, cost responsibility, and resolution workflow.",
    fields: ["Original job", "Issue", "Cost owner", "Resolution", "Callback cost"],
    dataObjects: ["jobs", "tasks", "activities", "jobCostSummaries"],
    nextAction: "Open callback",
  },
];

export const profitJourneyWorkflows: JourneyWorkflowItem[] = [
  {
    id: 87,
    title: "Crew productivity trend",
    owner: "Manager",
    outcome: "Planned hours, actual hours, route count, revenue/hour, and callbacks are compared by crew.",
    fields: ["Crew", "Planned hours", "Actual hours", "Route count", "Revenue/hour", "Callbacks"],
    dataObjects: ["timesheetEntries", "jobVisits", "profitabilitySnapshots"],
    nextAction: "Review productivity",
  },
  {
    id: 100,
    title: "Cancellation/churn analysis",
    owner: "SaaS admin/owner",
    outcome: "Cancellation reason, usage, plan, revenue, support history, and win-back path are visible.",
    fields: ["Reason", "Plan", "Usage", "Revenue", "Support history", "Win-back path"],
    dataObjects: ["subscriptions", "accountHealthScores", "customerLifecycleSnapshots"],
    nextAction: "Save churn reason",
  },
];

export const specsJourneyWorkflows: JourneyWorkflowItem[] = [
  {
    id: 97,
    title: "Tenant data export",
    owner: "Owner/Admin",
    outcome: "Tenant records, audit history, and reporting snapshots are packaged through the audit/export boundary.",
    fields: ["Export scope", "Date range", "Format", "Requester", "Watermark"],
    dataObjects: ["exportJobs", "reportingWatermarks", "auditEvents"],
    nextAction: "Request export",
  },
];
