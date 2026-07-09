const moduleBlueprint = [
  {
    name: "Dashboard",
    status: "implemented",
    details: [
      "Pipeline value, won value, open estimates, overdue tasks, today visits, crew workload, and recent activity.",
      "Widget records are modeled so each tenant can get a configurable executive dashboard later.",
      "Analytics snapshots are ready for period-over-period reports without overloading transactional screens.",
    ],
  },
  {
    name: "CRM + Lead Ops",
    status: "implemented",
    details: [
      "Customers, contacts, properties, property areas, leads, opportunities, tasks, notes, files, and activity timelines.",
      "Lead fields cover the Netlify console shape: grade, status, program request, source, company assignment, account type, lawn size, estimated dates, phones, email, messages, and estimate notes.",
      "Saved lead views preserve filter state, columns, and sort models for HubSpot-style operating workflows.",
    ],
  },
  {
    name: "Lead Ops Command Center",
    status: "implemented",
    details: [
      "Lead list/table supports source, owner, status, grade, program requests, quality score, spam score, hidden state, value, saved views, and data quality issue counts.",
      "Bulk lead status actions and per-lead status/grade edits write through Convex mutations with audit events.",
      "Lead operations are shaped for import validation and triage workflows from lawn, landscape, and pest lead sources.",
    ],
  },
  {
    name: "Data Quality + Spam",
    status: "implemented",
    details: [
      "Dedicated issue records for duplicates, missing names, missing status, bad phones, invalid emails, city spelling, missing company assignment, out-of-territory leads, potential spam, stale follow-up, and missing price data.",
      "Spam rules model email prefixes, message phrases, missing contact data, domains, and custom rules with scored signals.",
      "Duplicate review decisions and city normalization rules replace the legacy session-only hide/fix logic with auditable records.",
    ],
  },
  {
    name: "Estimating + Pricing",
    status: "implemented",
    details: [
      "Service catalog, packages, estimate templates, estimates, line items, price books, price book items, pricing rules, and calculator sessions.",
      "Pricing formulas are intentionally stored as declarative rules for review and reporting before any future no-code formula runner.",
      "Estimate-to-job conversion exists in production mutations and is mirrored in the demo workspace.",
    ],
  },
  {
    name: "Jobs, Dispatch, Field PWA",
    status: "implemented",
    details: [
      "Jobs, phases, visits, checklists, assignments, crews, route plans, route stops, photos, files, materials, equipment, and material applications.",
      "Field completion tracks checklist item state, visit completion, issue flags, and follow-up task creation.",
      "Google Maps remains the only v1 external map surface and is generated from property addresses.",
    ],
  },
  {
    name: "Job Costing + Production Finance",
    status: "implemented",
    details: [
      "Job cost summaries roll estimated revenue, actual revenue, labor, materials, equipment, overhead, gross profit, margin, and variance by job/customer.",
      "Timesheet entries, purchase orders, customer invoices, customer payments, and payment allocations support operational AR and job-cost calculations.",
      "Hourly scheduled recalculation keeps jobCostSummaries and profitabilitySnapshots fresh for dashboards and later reporting exports.",
    ],
  },
  {
    name: "Cost Intelligence",
    status: "implemented-demo-data",
    details: [
      "Labor rate cards, equipment rate cards, vendor catalogs, cost snapshots, weather snapshots, and route drive-time estimates are modeled as tenant-owned operating data.",
      "External-data sources are represented for NWS weather, BLS labor defaults, FRED/World Bank fertilizer trend context, and admin/vendor overrides for local prices.",
      "Scheduled Convex jobs refresh cost snapshots every 12 hours and job-site weather snapshots every 6 hours; live API fetch adapters are the next implementation step.",
    ],
  },
  {
    name: "Revenue + Profit Dashboards",
    status: "implemented",
    details: [
      "Dashboard exposes pipeline, booked revenue, completed revenue, invoiced revenue, collected revenue, AR, gross profit, gross margin, and direct cost buckets.",
      "Owner analytics include churn cohorts, LTV by customer segment, CAC, LTV:CAC, net revenue retention, break-even revenue, cost breakdowns, and P&L snapshots.",
      "Profitability drilldowns cover job, customer, crew, and service-line-ready dimensions through jobCostSummaries and profitabilitySnapshots.",
      "The finance surface is job costing and owner-level P&L proxy, not a full accounting ledger.",
    ],
  },
  {
    name: "Tags + Customer Lifecycle",
    status: "implemented",
    details: [
      "Governed tag definitions and entity-tag relationships replace freeform-only segmentation for customers, leads, jobs, risk, service lines, and profitability cohorts.",
      "Customer lifecycle snapshots model ARR, lifetime revenue, lifetime costs, gross profit, estimated LTV, churn risk, churn drivers, and next-best action.",
      "Admin charts use tag and lifecycle tables to slice churn, LTV, P&L, cost, and segment health without duplicating business rules in the UI.",
    ],
  },
  {
    name: "Admin + Permissions",
    status: "implemented",
    details: [
      "Member roles, permission matrix, feature flags, audit log, crews, service catalog, rate cards, equipment rates, and vendor catalog controls are available in the operating UI.",
      "Production function boundaries keep role checks in Convex auth helpers while demo functions remain scoped to the Greenline workspace.",
      "Workflow status settings and feature flags are table-backed so tenant-specific operating controls can be promoted without schema churn.",
    ],
  },
  {
    name: "Imports, Exports, Reporting Mirror",
    status: "ready-boundary",
    details: [
      "Import jobs and import rows support legacy Google Sheets/CSV migration without making Sheets the source of truth.",
      "Export jobs and reporting watermarks establish the future Postgres analytics mirror boundary.",
      "Audit events are the append-only source for timeline history and downstream reporting sync.",
    ],
  },
  {
    name: "SaaS Ops",
    status: "ready-boundary",
    details: [
      "Organizations, memberships, roles, feature flags, subscriptions, invoices, onboarding checklist items, account health, notifications, and integrations are modeled from day one.",
      "Production functions require Convex auth identity, synced Clerk user, active membership, and role permission checks.",
      "The public demo functions are isolated to the seeded Greenline demo workspace for local/live product walkthroughs while Clerk is configured.",
    ],
  },
];

const tableGroups = [
  {
    group: "Identity + Tenancy",
    tables: ["organizations", "users", "memberships", "featureFlags", "notificationPreferences"],
  },
  {
    group: "CRM + Pipeline",
    tables: ["customers", "contacts", "properties", "propertyAreas", "leads", "opportunities", "tasks", "activities", "notes", "files"],
  },
  {
    group: "Lead Quality",
    tables: ["dataQualityIssues", "spamRules", "cityNormalizationRules", "duplicateReviewDecisions", "leadSavedViews", "leadStatusSettings", "leadIntakeForms", "leadIntakeSubmissions"],
  },
  {
    group: "Estimating + Pricing",
    tables: ["serviceCatalogItems", "servicePackages", "estimateTemplates", "estimates", "estimateLineItems", "priceBooks", "priceBookItems", "pricingRules", "pricingCalculatorSessions"],
  },
  {
    group: "Jobs + Field Ops",
    tables: ["jobs", "jobPhases", "jobVisits", "visitAssignments", "checklistTemplates", "crews", "crewMembers", "routePlans", "routeStops", "photos", "materials", "materialApplications", "equipment"],
  },
  {
    group: "Cost Intelligence + Job Costing",
    tables: ["laborRateCards", "equipmentRateCards", "vendorCatalogs", "costSnapshots", "weatherSnapshots", "routeDriveTimeEstimates", "timesheetEntries", "purchaseOrders", "customerInvoices", "customerPayments", "paymentAllocations", "jobCostSummaries", "profitabilitySnapshots", "pnlSnapshots"],
  },
  {
    group: "Tags + Lifecycle Analytics",
    tables: ["tagDefinitions", "entityTags", "customerLifecycleSnapshots"],
  },
  {
    group: "Integrations + Reporting",
    tables: ["externalIntegrations", "importJobs", "importRows", "exportJobs", "reportingWatermarks", "analyticsSnapshots", "dashboardWidgets", "automationRules", "automationRuns", "auditEvents", "internalNotifications"],
  },
  {
    group: "Commercial SaaS",
    tables: ["subscriptions", "invoices", "onboardingChecklistItems", "accountHealthScores"],
  },
];

const netlifyParity = [
  "Lead CRUD with required date/status/name validation model",
  "Status, grade, program, source, company, period, and compare filter primitives",
  "Quick filters for blank names, out-of-territory, hidden, spam, and data quality review",
  "Potential spam scoring from email prefixes, missing contact info, and solicitation phrases",
  "City spelling auto-fix records with before/after audit trail",
  "Duplicate review decisions with not-a-duplicate persistence",
  "Lead volume, rolling average, forecast, and capacity-check metric storage",
  "Conversion funnel, cohort speed, grade outcome, program heatmap, Pareto, city, source, and company comparison metrics",
  "Estimate/pricing calculator session storage for reproducibility",
  "Help/runbook/changelog concepts promoted to admin specs and audit history",
  "Lead Ops table with saved views, bulk status actions, grade/status editing, quality score, spam score, hidden state, and lead detail-ready records",
  "Admin controls for roles, permission matrix, feature flags, crews, service catalog, labor rates, equipment rates, vendor catalog, and audit log",
  "Job costing rollups for estimated vs actual labor/material/equipment/overhead, revenue, gross profit, margin, and variance",
  "Revenue dashboard for booked, invoiced, collected, AR, gross margin, and owner-level P&L proxy",
  "Owner analytics for churn risk, retention, LTV, CAC, LTV:CAC, net revenue retention, break-even revenue, segment health, and cost breakdowns",
  "Governed tag definitions, entity tags, customer lifecycle snapshots, and P&L snapshots for reporting-grade segmentation",
  "Cost intelligence objects for NWS weather snapshots, BLS labor defaults, FRED/World Bank fertilizer trend context, and admin/vendor local overrides",
];

const readiness = [
  { item: "Convex project linked", status: "done", owner: "engineering" },
  { item: "Strict multi-tenant schema", status: "done", owner: "engineering" },
  { item: "Production auth and role guards", status: "done-needs-clerk-env", owner: "engineering" },
  { item: "Live Convex demo workspace", status: "done", owner: "product" },
  { item: "Lead Ops command table", status: "done", owner: "product" },
  { item: "Admin permissions surface", status: "done", owner: "engineering" },
  { item: "Job costing v1", status: "done", owner: "engineering" },
  { item: "Revenue and profit dashboards", status: "done", owner: "product" },
  { item: "Admin churn, LTV, P&L, and cost charts", status: "done", owner: "product" },
  { item: "Governed tags and customer lifecycle snapshots", status: "done", owner: "data" },
  { item: "Cost intelligence data model", status: "done-demo-refresh", owner: "data" },
  { item: "Convex scheduled jobs", status: "done", owner: "engineering" },
  { item: "Live NWS/BLS/FRED/World Bank API adapters", status: "next", owner: "data" },
  { item: "Clerk organization setup", status: "next", owner: "ops" },
  { item: "Stripe billing and plan gates", status: "next", owner: "ops" },
  { item: "Legacy Google Sheet importer", status: "next", owner: "engineering" },
  { item: "Postgres reporting mirror", status: "deferred", owner: "data" },
  { item: "Production observability", status: "next", owner: "engineering" },
  { item: "Sales landing/demo funnel", status: "next", owner: "growth" },
];

export async function getBackendBlueprint() {
  return {
    generatedAt: Date.now(),
    productName: "Landscape/Pest SaaS Operating System",
    deploymentTarget: "justin-abrams/turfpro-crm/dutiful-salmon-300",
    modules: moduleBlueprint,
    tableGroups,
    netlifyParity,
    readiness,
    publicV1Interfaces: ["Google Maps deep links generated from property addresses"],
    deferredInterfaces: ["Google Ads", "Meta", "HubSpot sync", "SMS", "call tracking", "marketing attribution", "QuickBooks", "Stripe live payments", "supplier APIs", "Postgres reporting mirror"],
  };
}
