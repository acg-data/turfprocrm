export type MarketingFeature = {
  label: string;
  title: string;
  body: string;
  href: string;
};

export type MarketingPage = {
  slug: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  lede: string;
  primaryAction: string;
  proof: string[];
  sections: Array<{
    title: string;
    body: string;
    bullets: string[];
  }>;
};

export const productModules: MarketingFeature[] = [
  {
    label: "Lead Ops",
    title: "A real lead command table",
    body: "Filter, grade, bulk-move, de-spam, and convert green-industry leads without losing the source, owner, program, or follow-up trail.",
    href: "/lead-ops",
  },
  {
    label: "CRM",
    title: "Customers, contacts, and properties",
    body: "Manage residential, HOA, commercial, and municipal accounts with contacts, properties, notes, tasks, and timeline activity.",
    href: "/crm",
  },
  {
    label: "Estimating",
    title: "Quote work from the catalog",
    body: "Use service catalogs, price books, property areas, line items, and conversion flows that turn accepted quotes into jobs.",
    href: "/features",
  },
  {
    label: "Dispatch",
    title: "Calendar, crews, route order",
    body: "Schedule visits, assign crews, spot workload conflicts, and send field teams to Google Maps links from the property address.",
    href: "/dispatch",
  },
  {
    label: "Field PWA",
    title: "Mobile work completion",
    body: "Give technicians a focused job list, job detail, checklist, materials, notes, issue flags, and visit submission workflow.",
    href: "/field",
  },
  {
    label: "Job Costing",
    title: "Estimated vs actual cost",
    body: "Track labor, materials, equipment, overhead, revenue, profit, margin, and variance by job, crew, service, customer, and property.",
    href: "/job-costing",
  },
  {
    label: "Cost Intel",
    title: "Weather and cost signals",
    body: "Model NWS weather snapshots, BLS wage defaults, fertilizer index context, vendor catalogs, and admin overrides.",
    href: "/cost-intelligence",
  },
  {
    label: "Admin",
    title: "Roles, rates, workflows",
    body: "Control members, permissions, crews, service catalog, rate cards, vendor items, workflow statuses, flags, and audit history.",
    href: "/admin-controls",
  },
];

export const marketingPages: MarketingPage[] = [
  {
    slug: "features",
    navLabel: "Features",
    eyebrow: "Operating system",
    title: "The green-industry CRM, scheduling, field, and costing stack in one workspace.",
    lede: "A connected product surface for sales, dispatch, field work, admin, and owner-level profitability without bolting together generic CRM screens.",
    primaryAction: "Open product tour",
    proof: ["Lead table", "CRM timeline", "Estimating", "Dispatch", "Field PWA", "Job costing"],
    sections: [
      {
        title: "Lead-to-job workflow",
        body: "Every record moves through a clear operating path instead of disappearing into a generic inbox.",
        bullets: ["Lead triage and saved views", "Opportunity and estimate conversion", "Job, visit, checklist, and task creation"],
      },
      {
        title: "Field-ready operations",
        body: "The field PWA keeps crews focused on the day and gives managers structured completion data.",
        bullets: ["Mobile job list and detail", "Checklist completion and issue flags", "Materials and notes ready for cost rollups"],
      },
      {
        title: "Built-in cost awareness",
        body: "Cost intelligence and job costing are first-class modules, not spreadsheet exports after the fact.",
        bullets: ["Labor, equipment, material, and overhead buckets", "AR and collected revenue visibility", "Profitability summaries for owner review"],
      },
    ],
  },
  {
    slug: "solutions",
    navLabel: "Solutions",
    eyebrow: "Industry fit",
    title: "Built around landscaping, lawn care, tree and shrub, irrigation, snow, and pest workflows.",
    lede: "The data model understands properties, areas, treatments, recurring visits, crews, route order, materials, equipment, and job-cost variance.",
    primaryAction: "See the operating model",
    proof: ["Residential", "Commercial", "HOA", "Pest", "Lawn", "Maintenance"],
    sections: [
      {
        title: "For lawn and landscape operators",
        body: "Estimate, schedule, and complete recurring and project work with service catalogs and property context.",
        bullets: ["Service packages and price books", "Crew and route planning", "Material usage and equipment rates"],
      },
      {
        title: "For pest-control teams",
        body: "Handle pest programs with weather-aware site snapshots, recurring plans, issue flags, and application notes.",
        bullets: ["Pest categories and materials", "Weather risk snapshots", "Mobile checklist completion"],
      },
      {
        title: "For owners and managers",
        body: "See where revenue, labor, materials, equipment, overhead, and AR are moving every day.",
        bullets: ["Job-cost summaries", "Profit dashboard", "Admin rate overrides"],
      },
    ],
  },
  {
    slug: "lead-ops",
    navLabel: "Lead Ops",
    eyebrow: "Lead operations",
    title: "A lead list that works like an operating queue, not a static spreadsheet.",
    lede: "Owners and sales teams can filter, grade, bulk-move, assign, review spam, inspect quality issues, and convert leads into revenue workflows.",
    primaryAction: "Open Lead Ops",
    proof: ["Saved views", "Quality score", "Spam score", "Bulk actions", "Audit events"],
    sections: [
      {
        title: "Import-ready fields",
        body: "The model keeps source, status, grade, owner, program requests, phone, email, address, lawn size, company assignment, and raw payload context.",
        bullets: ["Source and owner filters", "Program and status filters", "Hidden and spam handling"],
      },
      {
        title: "Quality queue",
        body: "Duplicate, bad phone, city spelling, missing address, out-of-territory, spam, and stale follow-up issues are separate records.",
        bullets: ["Open issue counts per lead", "Auditable fixes", "Status settings per tenant"],
      },
      {
        title: "Conversion path",
        body: "A lead can become an opportunity, estimate, job, and scheduled visit while keeping the timeline intact.",
        bullets: ["Opportunity value and owner", "Quote conversion", "Activity and audit history"],
      },
    ],
  },
  {
    slug: "crm",
    navLabel: "CRM",
    eyebrow: "Customer memory",
    title: "A HubSpot-style CRM shaped for properties, service history, and field execution.",
    lede: "Customers, contacts, properties, notes, tasks, files, activities, estimates, jobs, and visits stay attached to the account.",
    primaryAction: "Open CRM",
    proof: ["Customers", "Contacts", "Properties", "Tasks", "Notes", "Timeline"],
    sections: [
      {
        title: "Property-aware records",
        body: "Green-industry customers often have more than a name and email. The CRM stores sites, areas, warnings, size, and notes.",
        bullets: ["Multiple properties per customer", "Property areas", "Service warnings and gate notes"],
      },
      {
        title: "Timeline-first selling",
        body: "Calls, emails, notes, estimates, assignments, files, and visit events can be surfaced in one account history.",
        bullets: ["Activities", "Notes", "Tasks"],
      },
      {
        title: "Reusable for every module",
        body: "Dispatch, jobs, costing, admin, and reporting all point back to the same customer and property records.",
        bullets: ["No duplicated customer tables", "Tenant-owned data", "Audit-ready changes"],
      },
    ],
  },
  {
    slug: "dispatch",
    navLabel: "Dispatch",
    eyebrow: "Scheduling",
    title: "Calendar, board, crews, and route order for the day the team actually has to run.",
    lede: "Dispatch can assign crews, sort visits, inspect route conflicts, and open Google Maps links without leaving the operating workflow.",
    primaryAction: "Open Dispatch",
    proof: ["Visit list", "Crew assignment", "Route order", "Maps links", "Workload conflicts"],
    sections: [
      {
        title: "Crew capacity",
        body: "Visit assignments and route estimates make the schedule easier to reason about before crews are in the field.",
        bullets: ["Crew calendar", "Drive-time estimates", "Workload summary"],
      },
      {
        title: "Job-site context",
        body: "Each visit keeps customer, property, job, checklist, and service notes attached.",
        bullets: ["Customer and property labels", "Job status", "Crew and route order"],
      },
      {
        title: "Maps without integration sprawl",
        body: "V1 keeps the public interface narrow with Google Maps links from property addresses.",
        bullets: ["No Google Ads dependency", "No live route API requirement", "Upgrade path for drive-time providers"],
      },
    ],
  },
  {
    slug: "field",
    navLabel: "Field",
    eyebrow: "Mobile PWA",
    title: "A focused field experience for checklists, notes, photos, materials, and completion.",
    lede: "Technicians get the day, the job, the site, the checklist, and the submit workflow without navigating a full desktop CRM.",
    primaryAction: "Open Field PWA",
    proof: ["Mobile visits", "Checklist", "Issue flag", "Materials", "Completion"],
    sections: [
      {
        title: "Work list first",
        body: "The field screen starts with assigned visits and time windows, then opens into the work details.",
        bullets: ["Visit list", "Job detail", "Property link"],
      },
      {
        title: "Structured completion",
        body: "Completion is more than a status flip. Checklists, notes, materials, flags, and photos become usable operational data.",
        bullets: ["Checklist items", "Issue flags", "Follow-up task creation"],
      },
      {
        title: "Costing-ready inputs",
        body: "Field records become the raw material for actual labor, material, equipment, and overhead calculations.",
        bullets: ["Material applications", "Timesheet entries", "Job cost recalculation"],
      },
    ],
  },
  {
    slug: "job-costing",
    navLabel: "Job Costing",
    eyebrow: "Profitability",
    title: "Know what a job costs while it is still operationally useful.",
    lede: "Track estimated and actual revenue, labor, materials, equipment, overhead, gross profit, margin, collected revenue, and variance.",
    primaryAction: "Open Costing",
    proof: ["Labor", "Materials", "Equipment", "Overhead", "Margin", "Variance"],
    sections: [
      {
        title: "Actuals by job",
        body: "Timesheets, material applications, equipment rates, purchase orders, invoices, and payments feed the job-cost summary.",
        bullets: ["Estimated vs actual buckets", "Gross profit and margin", "Collected and AR context"],
      },
      {
        title: "Owner-level dashboard",
        body: "The profit view acts as a P&L proxy for the operating business without pretending to be a full accounting ledger.",
        bullets: ["Pipeline", "Booked and invoiced revenue", "Direct costs and gross profit"],
      },
      {
        title: "Scheduled recalculation",
        body: "Convex scheduled jobs refresh jobCostSummaries and profitabilitySnapshots on a steady cadence.",
        bullets: ["Hourly cost recalculation", "Profit snapshots", "Postgres reporting boundary"],
      },
    ],
  },
  {
    slug: "cost-intelligence",
    navLabel: "Cost Intel",
    eyebrow: "Cost signals",
    title: "Weather, wage, fertilizer, vendor, and route signals beside the operating data.",
    lede: "The product treats external cost data as context, then lets local vendor catalogs and admin overrides drive the numbers that matter.",
    primaryAction: "Open Cost Intel",
    proof: ["NWS", "BLS", "FRED", "World Bank", "Vendor catalog", "Admin override"],
    sections: [
      {
        title: "External data first",
        body: "NWS, BLS, FRED, and World Bank are modeled as refreshable snapshot sources, not hidden assumptions.",
        bullets: ["Weather snapshots", "Labor defaults", "Fertilizer trend context"],
      },
      {
        title: "Local overrides win",
        body: "Public APIs do not reliably expose local retail fertilizer pricing, so actual supplier costs live in vendor catalogs and admin overrides.",
        bullets: ["Vendor item imports", "Labor rate cards", "Equipment rate cards"],
      },
      {
        title: "Prepared for reporting",
        body: "Snapshots and audit events provide an export boundary for later Postgres analytics.",
        bullets: ["Cost snapshots", "Audit events", "Export-ready rows"],
      },
    ],
  },
  {
    slug: "admin-controls",
    navLabel: "Admin",
    eyebrow: "Tenant control",
    title: "The control plane for roles, rates, crews, catalog, workflows, flags, and audit history.",
    lede: "Admin is where the operator tunes the system to the way the company prices, schedules, dispatches, and protects permissions.",
    primaryAction: "Open Admin",
    proof: ["Roles", "Permissions", "Crews", "Catalog", "Rates", "Audit log"],
    sections: [
      {
        title: "Permissions by role",
        body: "Members map to tenant roles, and mutations verify membership and role before reading or writing tenant data.",
        bullets: ["Owner", "Admin", "Manager", "Sales", "Dispatcher", "Crew lead", "Technician"],
      },
      {
        title: "Rate and catalog controls",
        body: "Labor, equipment, material, price book, and service catalog controls are admin-owned.",
        bullets: ["Labor rate cards", "Equipment rate cards", "Vendor catalog items"],
      },
      {
        title: "Auditability",
        body: "Administrative changes and operating events can be surfaced as audit timeline data and reporting exports.",
        bullets: ["Audit events", "Feature flags", "Workflow status settings"],
      },
    ],
  },
  {
    slug: "pricing",
    navLabel: "Pricing",
    eyebrow: "Simple pricing",
    title: "Two plans. No surprises. A 14-day trial on both.",
    lede: "Start free with 10 contacts, then move to Starter or Pro when you're ready to run real operations. No setup fees, cancel any time from the billing portal.",
    primaryAction: "Start free",
    proof: ["Free: 10 contacts", "Starter: $49/mo", "Pro: $99/mo", "14-day trial", "Cancel anytime", "Self-serve portal"],
    sections: [
      {
        title: "Free account",
        body: "A new operator can create an account, provision a workspace, and test the core CRM before paying.",
        bullets: ["10 contacts, 1 seat included", "Single sign-in account setup", "Lead, CRM, dispatch, field, costing, and profit demo access"],
      },
      {
        title: "Starter — $49/mo",
        body: "For a small crew that needs the full operating core without enterprise pricing.",
        bullets: ["250 contacts, 3 seats", "Lead Ops, CRM, estimating, dispatch, and field PWA", "Job costing and cost intelligence"],
      },
      {
        title: "Pro — $99/mo",
        body: "Unlimited scale plus the admin and team controls that come with running a real company.",
        bullets: ["Unlimited contacts and seats", "Admin roles, permissions, and audit history", "Team invites, org switching, and priority support"],
      },
    ],
  },
  {
    slug: "integrations",
    navLabel: "Integrations",
    eyebrow: "Interfaces",
    title: "Keep integrations narrow until the operating core is trustworthy.",
    lede: "Google Maps links are live in v1. QuickBooks, Stripe payments, SMS/email, supplier APIs, and HubSpot sync are intentionally deferred.",
    primaryAction: "See integration plan",
    proof: ["Google Maps live", "Convex source of truth", "Audit export", "Postgres mirror later"],
    sections: [
      {
        title: "Live now",
        body: "V1 uses Google Maps links generated from property addresses and Convex as the operational source of truth.",
        bullets: ["Google Maps deep links", "Convex realtime data", "Audit events"],
      },
      {
        title: "Next adapters",
        body: "The backend already has scheduled jobs and snapshot tables for NWS, BLS, FRED, and World Bank fetch adapters.",
        bullets: ["Weather refresh", "Wage defaults", "Fertilizer trend snapshots"],
      },
      {
        title: "Deferred sync",
        body: "QuickBooks, Stripe live payments, SMS/email, HubSpot, and supplier APIs should wait until the operating workflow is reliable.",
        bullets: ["QuickBooks accounting", "Stripe payments", "SMS and email automation"],
      },
    ],
  },
  {
    slug: "security",
    navLabel: "Security",
    eyebrow: "Trust",
    title: "Multi-tenant isolation, role-based access, and an audit trail on every change.",
    lede: "Every read and write is checked against organization membership and role before it touches tenant data. Nothing is shared across workspaces.",
    primaryAction: "Talk to us",
    proof: ["Tenant isolation", "7 roles", "Audit log", "Encrypted at rest", "Daily backups", "Stripe-hosted billing"],
    sections: [
      {
        title: "Access control",
        body: "Membership and role are verified on every backend function before any tenant record is read or written.",
        bullets: ["Owner, admin, manager, sales, dispatcher, crew lead, and technician roles", "No cross-tenant reads, enforced server-side, not just in the UI", "Google and email/password sign-in through Clerk"],
      },
      {
        title: "Data protection",
        body: "Your data lives in Convex with automatic daily backups and an exportable audit trail.",
        bullets: ["Encrypted in transit and at rest", "Daily automatic backups with tested restore", "Every mutation writes an audit event with before/after state"],
      },
      {
        title: "Payments",
        body: "Billing runs entirely through Stripe. Turf Pro CRM never stores card numbers.",
        bullets: ["PCI compliance handled by Stripe", "Self-serve billing portal for plan changes and invoices", "Signature-verified webhooks for every billing event"],
      },
    ],
  },
  {
    slug: "about",
    navLabel: "About",
    eyebrow: "Company",
    title: "Built by people who kept hearing the same complaint from operators.",
    lede: "Generic CRMs don't understand properties, crews, or job costing. Legacy green-industry software understands the work but looks and feels ten years old. Turf Pro CRM is built to be both.",
    primaryAction: "Start free",
    proof: ["Green-industry focus", "Built with operators", "Modern stack", "Actively shipping"],
    sections: [
      {
        title: "Why we're building this",
        body: "Lawn care, landscaping, and pest-control operators deserve software that fits how the work actually happens — from the first lead to the invoice that gets paid.",
        bullets: ["Property-aware CRM, not a generic contact list", "Job costing and profit visibility built in from day one", "A field app crews actually want to use"],
      },
      {
        title: "How we work",
        body: "We ship in small, real increments and talk to operators constantly instead of guessing at a roadmap.",
        bullets: ["Weekly releases", "Direct line to the team for early customers", "Pricing that doesn't punish you for growing"],
      },
      {
        title: "Where we're headed",
        body: "The operating core comes first — communications, automation, and a customer portal are next.",
        bullets: ["Two-way email and SMS", "Automation recipes for lead follow-up", "A branded customer portal for quotes and invoices"],
      },
    ],
  },
  {
    slug: "resources",
    navLabel: "Resources",
    eyebrow: "Operator library",
    title: "Sales and onboarding resources for green-industry operators.",
    lede: "Use the resource center to educate prospects, support demos, and explain how the platform differs from generic CRM and niche legacy tools.",
    primaryAction: "Open resources",
    proof: ["Guides", "Webinars", "Checklists", "Comparisons", "Migration"],
    sections: [
      {
        title: "Buyer education",
        body: "Explain lead operations, job costing, cost intelligence, and field workflows in terms operators already understand.",
        bullets: ["Arborgold/Aspire comparison", "Jobber/GorillaDesk usability angle", "HubSpot/Salesforce gap framing"],
      },
      {
        title: "Implementation guides",
        body: "Help teams import leads, define services, set labor rates, configure crews, and train field users.",
        bullets: ["Lead import checklist", "Service catalog template", "Rate card worksheet"],
      },
      {
        title: "Demo support",
        body: "Create demo scripts around the workflows that sell the product: lead to job, dispatch, field completion, and profitability.",
        bullets: ["Lead-to-job demo", "Costing demo", "Admin controls walkthrough"],
      },
    ],
  },
];

export const marketingNav = [
  { label: "Features", href: "/features" },
  { label: "Solutions", href: "/solutions" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
];

export function getMarketingPage(slug: string) {
  return marketingPages.find((page) => page.slug === slug);
}

export const marketingSlugs = marketingPages.map((page) => page.slug);
