export type PrimeTimeStatus = "done" | "in_progress" | "next" | "blocked";
export type PrimeTimePriority = "P0" | "P1" | "P2";

export type PrimeTimeTrack =
  | "Product Workflow"
  | "CRM + Lead Ops"
  | "Estimating + Pricing"
  | "Dispatch + Field"
  | "Finance + Costing"
  | "Admin + Permissions"
  | "Data + Reporting"
  | "Integrations + Automation"
  | "Security + Reliability"
  | "SaaS GTM + Ops";

export type PrimeTimeItem = {
  id: string;
  track: PrimeTimeTrack;
  title: string;
  priority: PrimeTimePriority;
  status: PrimeTimeStatus;
  owner: "product" | "engineering" | "data" | "ops" | "growth" | "support";
  detail: string;
};

type PrimeTimeSeedItem = Omit<PrimeTimeItem, "id" | "track">;

export type PrimeTimeGroup = {
  track: PrimeTimeTrack;
  goal: string;
  items: PrimeTimeSeedItem[];
};

export const primeTimeGroups = [
  {
    track: "Product Workflow",
    goal: "Make the app feel like one operating system from first lead to collected revenue.",
    items: [
      { title: "One-click lead-to-job path", priority: "P0", status: "done", owner: "product", detail: "Lead, opportunity, estimate, job, visit, and task objects are connected in the product model." },
      { title: "Demo data at operating scale", priority: "P0", status: "done", owner: "product", detail: "The live demo workspace has 100 synthetic users plus high-volume leads, customers, jobs, and activities." },
      { title: "Daily owner dashboard", priority: "P0", status: "done", owner: "product", detail: "Pipeline, visits, estimates, overdue tasks, route board, and recent activity are visible on load." },
      { title: "Cross-module navigation", priority: "P0", status: "done", owner: "product", detail: "Dashboard, lead ops, CRM, pipeline, dispatch, jobs, field, costing, profit, admin, onboarding, and specs are reachable from the app shell." },
      { title: "Global command/search layer", priority: "P1", status: "next", owner: "product", detail: "Add keyboard-friendly search for customers, leads, jobs, invoices, visits, and settings." },
      { title: "Record detail drawers", priority: "P1", status: "in_progress", owner: "product", detail: "Lead detail exists; expand the pattern to customer, job, invoice, and visit side panels." },
      { title: "Saved workspace views", priority: "P1", status: "in_progress", owner: "engineering", detail: "Lead saved views are modeled; extend saved views to dispatch, jobs, profit, and reporting." },
      { title: "Inline activity composer", priority: "P1", status: "next", owner: "product", detail: "Add call, email, SMS note, internal comment, and follow-up creation from every major record." },
      { title: "Customer portal boundary", priority: "P2", status: "next", owner: "product", detail: "Design the account, estimate approval, invoice, payment, and service-history portal before building public access." },
      { title: "Role-specific home screens", priority: "P2", status: "next", owner: "product", detail: "Owners, sales, dispatch, technicians, and admins should land on different default views." },
    ],
  },
  {
    track: "CRM + Lead Ops",
    goal: "Beat generic CRM by making lead intake, triage, quality, and conversion operationally deep.",
    items: [
      { title: "Lead list filters", priority: "P0", status: "done", owner: "product", detail: "Lead Ops includes filters for search, status, quality, source, owner, and operating state." },
      { title: "Create lead flow", priority: "P0", status: "done", owner: "product", detail: "CRM creates customer, contact, property, lead, opportunity, activity, and quality records." },
      { title: "Free plan contact cap", priority: "P0", status: "done", owner: "engineering", detail: "Convex enforces the 10-contact free workspace limit before lead creation." },
      { title: "Spam and quality scoring", priority: "P0", status: "done", owner: "data", detail: "Lead quality and spam score are stored and surfaced for triage." },
      { title: "Bulk lead actions", priority: "P1", status: "done", owner: "product", detail: "Bulk status movement exists for lead operations." },
      { title: "Duplicate review queue", priority: "P1", status: "in_progress", owner: "data", detail: "Duplicate review tables exist; add a full UI queue with merge and ignore decisions." },
      { title: "Lead import wizard", priority: "P1", status: "next", owner: "engineering", detail: "CSV mapping, validation preview, quality errors, and dry-run import need a production workflow." },
      { title: "SLA reminders", priority: "P1", status: "in_progress", owner: "product", detail: "SLA state is computed in the UI; add scheduled notifications and inbox tasks." },
      { title: "Source ROI attribution", priority: "P2", status: "next", owner: "growth", detail: "Track lead source cost, conversion, average ticket, close rate, and payback." },
      { title: "Call/email/SMS adapters", priority: "P2", status: "next", owner: "engineering", detail: "Twilio, email, and call-tracking adapters should wait until core lead ops is stable." },
    ],
  },
  {
    track: "Estimating + Pricing",
    goal: "Give operators repeatable pricing, measurement, templates, and margin guardrails.",
    items: [
      { title: "Service catalog", priority: "P0", status: "done", owner: "product", detail: "Catalog items include category, unit, default price, duration, and active state." },
      { title: "Price books", priority: "P0", status: "done", owner: "engineering", detail: "Price book and price book item tables are modeled for repeatable pricing." },
      { title: "Estimate-to-job conversion", priority: "P0", status: "done", owner: "engineering", detail: "Accepted estimates can convert to jobs through Convex functions." },
      { title: "Autoprice calculator model", priority: "P1", status: "in_progress", owner: "engineering", detail: "Declarative pricing rules and calculator sessions are stored; add the full no-code calculator UI." },
      { title: "Unlimited land measurements", priority: "P1", status: "in_progress", owner: "product", detail: "Property and area objects exist; map-based measurement interaction needs production polish." },
      { title: "Estimate templates", priority: "P1", status: "in_progress", owner: "product", detail: "Template tables exist; add reusable quote layouts by service line." },
      { title: "Margin guardrails", priority: "P1", status: "next", owner: "data", detail: "Warn when estimate labor, materials, equipment, or overhead will miss target margin." },
      { title: "Renewal pricing", priority: "P1", status: "next", owner: "product", detail: "Add renewal proposal generation with price increase rules and renewal status." },
      { title: "Approval and e-sign", priority: "P2", status: "next", owner: "engineering", detail: "Customer approvals need secure public links, signatures, audit events, and expiration." },
      { title: "Proposal PDF exports", priority: "P2", status: "next", owner: "engineering", detail: "Generate branded PDFs from estimate templates and record them as files." },
    ],
  },
  {
    track: "Dispatch + Field",
    goal: "Make scheduling, routes, crews, materials, photos, and completion reliable on desktop and mobile.",
    items: [
      { title: "Dispatch board", priority: "P0", status: "done", owner: "product", detail: "Visits, crews, route order, workload, and conflicts are visible in dispatch." },
      { title: "Crew assignment", priority: "P0", status: "done", owner: "engineering", detail: "Assigning a visit to a crew writes through Convex." },
      { title: "Mobile field screen", priority: "P0", status: "done", owner: "product", detail: "Field users can see visits, details, checklist, materials, weather, equipment, and submit state." },
      { title: "Checklist completion", priority: "P0", status: "done", owner: "engineering", detail: "Checklist items and visit submission write through field mutations." },
      { title: "Google Maps links", priority: "P0", status: "done", owner: "engineering", detail: "Maps links are generated from property addresses without a paid route API dependency." },
      { title: "Drag-and-drop scheduling", priority: "P1", status: "next", owner: "product", detail: "Add actual calendar drag/drop with conflict detection and optimistic updates." },
      { title: "Route optimization", priority: "P1", status: "in_progress", owner: "data", detail: "Route order and drive-time estimates exist; add provider-backed optimization and route locking." },
      { title: "Photo capture and upload", priority: "P1", status: "in_progress", owner: "engineering", detail: "Photo tables are modeled; add upload storage, compression, before/after grouping, and offline retry." },
      { title: "Offline field mode", priority: "P2", status: "next", owner: "engineering", detail: "Queue checklist, notes, photos, material usage, and completion events while disconnected." },
      { title: "Equipment maintenance workflow", priority: "P2", status: "in_progress", owner: "ops", detail: "Equipment records and checkout state exist; add maintenance schedules and service logs." },
    ],
  },
  {
    track: "Finance + Costing",
    goal: "Make job profitability, cash collection, and owner-level unit economics visible every day.",
    items: [
      { title: "Job cost summaries", priority: "P0", status: "done", owner: "engineering", detail: "Job summaries roll revenue, labor, materials, equipment, overhead, margin, and variance." },
      { title: "Revenue dashboard", priority: "P0", status: "done", owner: "product", detail: "Booked, completed, invoiced, collected, AR, gross profit, and margin are visible." },
      { title: "P&L proxy", priority: "P0", status: "done", owner: "data", detail: "Owner analytics include operating profit, cost breakdown, and break-even revenue." },
      { title: "Churn and LTV analytics", priority: "P0", status: "done", owner: "data", detail: "Lifecycle snapshots surface churn risk, LTV, LTV:CAC, and segment health." },
      { title: "Timesheet cost entry", priority: "P1", status: "done", owner: "engineering", detail: "Timesheet entries can feed actual labor cost in Convex." },
      { title: "Invoice and payment records", priority: "P1", status: "done", owner: "engineering", detail: "Customer invoice and payment tables are modeled and surfaced in finance views." },
      { title: "Stripe checkout", priority: "P0", status: "blocked", owner: "ops", detail: "Needs Stripe account, product, price, webhook signing secret, and production checkout flow." },
      { title: "QuickBooks sync", priority: "P2", status: "next", owner: "engineering", detail: "Defer until internal invoice/payment and job-cost data contracts are stable." },
      { title: "Purchase order workflow", priority: "P2", status: "in_progress", owner: "ops", detail: "Purchase order objects exist; add approvals, receiving, and vendor billing state." },
      { title: "Forecasting and budgets", priority: "P2", status: "next", owner: "data", detail: "Add monthly budget, forecast, seasonality, backlog, and crew-capacity planning." },
    ],
  },
  {
    track: "Admin + Permissions",
    goal: "Let a real operator configure people, rates, catalogs, workflows, and risk without calling engineering.",
    items: [
      { title: "Member roles", priority: "P0", status: "done", owner: "engineering", detail: "Owner, admin, manager, sales, dispatcher, crew lead, and technician roles are modeled." },
      { title: "Permission matrix", priority: "P0", status: "done", owner: "engineering", detail: "Admin shows role permissions and production functions check membership." },
      { title: "Crew management", priority: "P0", status: "done", owner: "product", detail: "Crews can be created and assigned to work." },
      { title: "Service catalog controls", priority: "P0", status: "done", owner: "product", detail: "Admins can review and toggle service catalog items." },
      { title: "Labor and equipment rates", priority: "P1", status: "done", owner: "data", detail: "Rate cards are modeled and surfaced in cost intelligence." },
      { title: "Vendor catalog", priority: "P1", status: "done", owner: "data", detail: "Vendor item costs can be represented for local material pricing." },
      { title: "Workflow status editor", priority: "P1", status: "in_progress", owner: "product", detail: "Status tables exist; add full admin create/reorder/deactivate controls." },
      { title: "Invite flow", priority: "P1", status: "blocked", owner: "ops", detail: "Needs Clerk organization/member invitation configuration." },
      { title: "Feature flag editor", priority: "P2", status: "in_progress", owner: "engineering", detail: "Flags exist and render; add toggles with audit events and rollout notes." },
      { title: "Audit log drilldown", priority: "P2", status: "in_progress", owner: "ops", detail: "Audit events surface in admin; add filters, entity links, diff viewer, and export." },
    ],
  },
  {
    track: "Data + Reporting",
    goal: "Keep Convex as source of truth while preparing clean analytics, exports, and reporting mirrors.",
    items: [
      { title: "Strict tenant indexes", priority: "P0", status: "done", owner: "engineering", detail: "Tenant-owned tables carry organizationId and common indexes." },
      { title: "Audit export boundary", priority: "P0", status: "done", owner: "engineering", detail: "Audit events provide the v1 source for timelines and future reporting sync." },
      { title: "Analytics snapshot tables", priority: "P1", status: "done", owner: "data", detail: "Snapshots support reporting without overloading transactional reads." },
      { title: "Postgres mirror design", priority: "P2", status: "next", owner: "data", detail: "Define export jobs, watermarks, schema mapping, replay, and idempotency before building." },
      { title: "Data dictionary", priority: "P1", status: "next", owner: "data", detail: "Publish table, field, owner, sensitivity, and retention metadata for operators and engineers." },
      { title: "Report builder", priority: "P2", status: "next", owner: "product", detail: "Add configurable reports for jobs, leads, finance, customer health, and team productivity." },
      { title: "CSV exports", priority: "P1", status: "next", owner: "engineering", detail: "Export customers, leads, jobs, invoices, payments, and audit rows with role checks." },
      { title: "Data retention policies", priority: "P1", status: "next", owner: "ops", detail: "Define retention for photos, files, audit events, exports, and deleted tenant data." },
      { title: "Backup and restore runbook", priority: "P0", status: "next", owner: "ops", detail: "Document Convex restore, export, incident rollback, and customer communication steps." },
      { title: "Synthetic data reset", priority: "P2", status: "in_progress", owner: "engineering", detail: "Demo seeding is idempotent; add a safe reset/reseed command for demos." },
    ],
  },
  {
    track: "Integrations + Automation",
    goal: "Add integrations in the order that helps operators without destabilizing the core workflow.",
    items: [
      { title: "Google Maps links", priority: "P0", status: "done", owner: "engineering", detail: "Address-based map links are live." },
      { title: "NWS weather snapshots", priority: "P1", status: "in_progress", owner: "data", detail: "Weather tables and scheduled refresh boundaries exist; live adapter needs API hardening." },
      { title: "BLS wage defaults", priority: "P1", status: "in_progress", owner: "data", detail: "Labor default source is modeled; add regional refresh and admin override precedence tests." },
      { title: "FRED and World Bank fertilizer context", priority: "P2", status: "in_progress", owner: "data", detail: "Commodity snapshot model exists; add series config, refresh, and stale-data UI." },
      { title: "CSV import", priority: "P1", status: "in_progress", owner: "engineering", detail: "Import tables and QA preview exist; add production mapping and commit flow." },
      { title: "Email notifications", priority: "P1", status: "next", owner: "engineering", detail: "Add transactional email for invites, estimates, invoices, task reminders, and field updates." },
      { title: "SMS reminders", priority: "P2", status: "next", owner: "engineering", detail: "Defer until consent, opt-out, templates, and audit rules are designed." },
      { title: "QuickBooks", priority: "P2", status: "next", owner: "engineering", detail: "Add after invoice/payment lifecycle is stable." },
      { title: "HubSpot migration adapter", priority: "P2", status: "next", owner: "growth", detail: "Migration import can help sales but should not become a two-way CRM sync in v1." },
      { title: "Automation rules", priority: "P2", status: "in_progress", owner: "product", detail: "Automation tables exist; add rules for stale leads, renewals, callbacks, and unpaid invoices." },
    ],
  },
  {
    track: "Security + Reliability",
    goal: "Make the SaaS trustworthy enough for real customer data and field operations.",
    items: [
      { title: "Clerk auth boundary", priority: "P0", status: "in_progress", owner: "ops", detail: "Code supports Clerk; production keys and issuer need final setup." },
      { title: "Organization isolation", priority: "P0", status: "done", owner: "engineering", detail: "Production functions require membership before tenant data access." },
      { title: "Role-based mutations", priority: "P0", status: "done", owner: "engineering", detail: "Core mutations check role permissions before writes." },
      { title: "Security headers", priority: "P0", status: "done", owner: "engineering", detail: "Baseline browser security headers are configured in Next." },
      { title: "Secret hygiene", priority: "P0", status: "done", owner: "ops", detail: "Environment templates exclude real secrets and git ignores local env files." },
      { title: "CSP policy", priority: "P1", status: "next", owner: "engineering", detail: "Add a tested content security policy after Clerk, Convex, and Cloudflare domains are final." },
      { title: "Error monitoring", priority: "P0", status: "next", owner: "ops", detail: "Add Sentry or equivalent for frontend and Convex function error visibility." },
      { title: "Uptime checks", priority: "P0", status: "next", owner: "ops", detail: "Monitor public routes, Convex health, sign-in, and lead creation." },
      { title: "Audit vulnerability policy", priority: "P1", status: "in_progress", owner: "engineering", detail: "npm audit is known; Next and Convex advisories need upstream-safe remediation planning." },
      { title: "Disaster recovery drill", priority: "P1", status: "next", owner: "ops", detail: "Practice restore, deployment rollback, and customer-status communication." },
    ],
  },
  {
    track: "SaaS GTM + Ops",
    goal: "Make the product sellable, supportable, onboardable, and measurable.",
    items: [
      { title: "$99 All-In plan", priority: "P0", status: "done", owner: "growth", detail: "Pricing pages and signup now position Free plus $99/mo All-In Pro." },
      { title: "Free signup route", priority: "P0", status: "done", owner: "growth", detail: "One sign-in route handles account creation, plan choice, and workspace provisioning." },
      { title: "Onboarding flow", priority: "P0", status: "done", owner: "product", detail: "Client onboarding preview shows tenant provisioning, services, imports, and checklist setup." },
      { title: "Sales demo data", priority: "P0", status: "done", owner: "growth", detail: "Live demo workspace has enough volume for lead, finance, field, and admin demos." },
      { title: "Competitive positioning", priority: "P1", status: "in_progress", owner: "growth", detail: "Marketing pages frame Arborgold/Aspire depth with Jobber/GorillaDesk usability." },
      { title: "Demo script", priority: "P1", status: "next", owner: "growth", detail: "Write a click-by-click sales demo for lead creation, quote, dispatch, field completion, and profit review." },
      { title: "Help center skeleton", priority: "P2", status: "next", owner: "support", detail: "Add operator docs for setup, imports, services, rates, field app, and finance." },
      { title: "Customer success dashboard", priority: "P2", status: "next", owner: "support", detail: "Track activation, imports, seats, active leads, field completions, and churn risk." },
      { title: "Billing operations", priority: "P0", status: "blocked", owner: "ops", detail: "Needs Stripe products, checkout, webhooks, receipts, plan state, and failed-payment handling." },
      { title: "Launch checklist ownership", priority: "P0", status: "done", owner: "ops", detail: "This top-100 Prime Time board gives every launch gap an owner, status, and priority." },
    ],
  },
] satisfies PrimeTimeGroup[];

export const primeTimeBacklog: PrimeTimeItem[] = primeTimeGroups.flatMap((group, groupIndex) =>
  group.items.map((item, itemIndex) => ({
    id: `PT-${String(groupIndex * 10 + itemIndex + 1).padStart(3, "0")}`,
    track: group.track,
    ...item,
  })),
);
