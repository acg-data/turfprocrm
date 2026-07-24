import type { WorkspaceSnapshot } from "@/domain/types";
import type { DemoPersona } from "./demo-personas";

const today = new Date();
today.setHours(0, 0, 0, 0);
const day = 24 * 60 * 60 * 1000;
const at = (hour: number, minute = 0, offset = 0) => today.getTime() + offset * day + hour * 60 * 60 * 1000 + minute * 60 * 1000;

const baseDemoWorkspace: WorkspaceSnapshot = {
  organization: {
    id: "org-greenline",
    name: "Greenline Turf & Pest",
    timezone: "America/New_York",
  },
  members: [
    { id: "u-justin", name: "Justin Abrams", email: "justin@example.com", role: "owner" },
    { id: "u-amy", name: "Amy Reed", email: "amy@example.com", role: "sales" },
    { id: "u-marco", name: "Marco Silva", email: "marco@example.com", role: "dispatcher" },
    { id: "u-nina", name: "Nina Hart", email: "nina@example.com", role: "crew_lead" },
  ],
  customers: [
    {
      id: "cust-brookside",
      name: "Brookside HOA",
      type: "hoa",
      status: "active",
      phone: "(508) 555-0148",
      email: "board@brookside.example",
      tags: ["hoa", "recurring", "fertilization"],
      ownerId: "u-amy",
    },
    {
      id: "cust-walsh",
      name: "Megan Walsh",
      type: "residential",
      status: "prospect",
      phone: "(508) 555-0188",
      email: "megan@example.com",
      tags: ["mosquito", "quote"],
      ownerId: "u-amy",
    },
    {
      id: "cust-northgate",
      name: "Northgate Industrial Park",
      type: "commercial",
      status: "active",
      phone: "(781) 555-0199",
      email: "facilities@northgate.example",
      tags: ["commercial", "weekly"],
      ownerId: "u-justin",
    },
  ],
  contacts: [
    {
      id: "contact-brookside-board",
      customerId: "cust-brookside",
      name: "Brookside Board",
      email: "board@brookside.example",
      phone: "(508) 555-0148",
      roleTitle: "Board inbox",
      isPrimary: true,
    },
    {
      id: "contact-brookside-site",
      customerId: "cust-brookside",
      name: "Lena Park",
      email: "lena@brookside.example",
      phone: "(508) 555-0172",
      roleTitle: "Site contact",
      isPrimary: false,
    },
    {
      id: "contact-walsh",
      customerId: "cust-walsh",
      name: "Megan Walsh",
      email: "megan@example.com",
      phone: "(508) 555-0188",
      roleTitle: "Homeowner",
      isPrimary: true,
    },
    {
      id: "contact-northgate-facilities",
      customerId: "cust-northgate",
      name: "Facilities Office",
      email: "facilities@northgate.example",
      phone: "(781) 555-0199",
      roleTitle: "Facilities",
      isPrimary: true,
    },
    {
      id: "contact-northgate-billing",
      customerId: "cust-northgate",
      name: "Rina Shah",
      email: "ap@northgate.example",
      phone: "(781) 555-0181",
      roleTitle: "Billing",
      isPrimary: false,
    },
  ],
  properties: [
    {
      id: "prop-brookside",
      customerId: "cust-brookside",
      label: "Brookside Common Areas",
      street: "18 Brookside Way",
      city: "Foxborough",
      state: "MA",
      postalCode: "02035",
      notes: "Gate code changes monthly. Notify board before treatment.",
      lawnSizeSqFt: 92000,
    },
    {
      id: "prop-walsh",
      customerId: "cust-walsh",
      label: "Walsh Residence",
      street: "42 Oak Terrace",
      city: "Mansfield",
      state: "MA",
      postalCode: "02048",
      notes: "Backyard has a wetland buffer. Avoid spraying within marked area.",
      lawnSizeSqFt: 14500,
    },
    {
      id: "prop-northgate",
      customerId: "cust-northgate",
      label: "Northgate Building 4",
      street: "225 Commerce Dr",
      city: "Sharon",
      state: "MA",
      postalCode: "02067",
      notes: "Service loading dock before office lawn.",
      lawnSizeSqFt: 188000,
    },
  ],
  propertyAreas: [
    { id: "area-brookside-common", propertyId: "prop-brookside", name: "Common turf zones", kind: "front_lawn", size: 55000, unit: "sq_ft", notes: "Primary HOA turf zone for six-step fertilization." },
    { id: "area-brookside-entry", propertyId: "prop-brookside", name: "North entrance turf", kind: "front_lawn", size: 12000, unit: "sq_ft", notes: "High-visibility entry area near playground." },
    { id: "area-walsh-front", propertyId: "prop-walsh", name: "Front lawn", kind: "front_lawn", size: 6500, unit: "sq_ft", notes: "Visible front turf near driveway." },
    { id: "area-walsh-back", propertyId: "prop-walsh", name: "Back lawn", kind: "back_lawn", size: 8000, unit: "sq_ft", notes: "Wetland buffer at rear edge." },
    { id: "area-northgate-office", propertyId: "prop-northgate", name: "Office lawn", kind: "front_lawn", size: 62000, unit: "sq_ft", notes: "Main public-facing lawn near office entrance." },
  ],
  leads: [
    {
      id: "lead-walsh",
      title: "Mosquito and tick package request",
      customerId: "cust-walsh",
      propertyId: "prop-walsh",
      source: "Website form",
      status: "contacted",
      urgency: "high",
      ownerId: "u-amy",
      createdAt: at(9, 15, -1),
    },
    {
      id: "lead-brookside",
      title: "Spring grub prevention renewal",
      customerId: "cust-brookside",
      propertyId: "prop-brookside",
      source: "Phone",
      status: "converted",
      urgency: "normal",
      ownerId: "u-amy",
      createdAt: at(13, 30, -4),
    },
  ],
  opportunities: [
    {
      id: "opp-walsh",
      leadId: "lead-walsh",
      customerId: "cust-walsh",
      propertyId: "prop-walsh",
      title: "Seasonal mosquito and tick control",
      stage: "proposal_sent",
      valueCents: 78000,
      closeProbability: 72,
      expectedCloseDate: at(17, 0, 3),
      ownerId: "u-amy",
      serviceLines: ["pest_control"],
      updatedAt: at(14, 15),
    },
    {
      id: "opp-brookside",
      leadId: "lead-brookside",
      customerId: "cust-brookside",
      propertyId: "prop-brookside",
      title: "Grub prevention plus six-step lawn program",
      stage: "won",
      valueCents: 920000,
      closeProbability: 100,
      expectedCloseDate: at(11, 0, -2),
      ownerId: "u-justin",
      serviceLines: ["lawn_care", "pest_control"],
      updatedAt: at(10, 20, -1),
    },
    {
      id: "opp-northgate",
      customerId: "cust-northgate",
      propertyId: "prop-northgate",
      title: "Weekly grounds maintenance expansion",
      stage: "estimating",
      valueCents: 1540000,
      closeProbability: 44,
      expectedCloseDate: at(16, 0, 9),
      ownerId: "u-justin",
      serviceLines: ["maintenance", "landscaping"],
      updatedAt: at(12, 5),
    },
  ],
  estimates: [
    {
      id: "est-walsh",
      opportunityId: "opp-walsh",
      customerId: "cust-walsh",
      propertyId: "prop-walsh",
      estimateNumber: "EST-1024",
      status: "sent",
      approvalStatus: "pending",
      subtotalCents: 78000,
      discountCents: 12000,
      taxCents: 0,
      totalCents: 78000,
      sentAt: at(14, 15),
      expiresAt: at(17, 0, 14),
      terms: "Customer may approve the seasonal mosquito package within 14 days. Wetland buffer treatment notes must remain attached to the quote.",
    },
    {
      id: "est-brookside",
      opportunityId: "opp-brookside",
      customerId: "cust-brookside",
      propertyId: "prop-brookside",
      estimateNumber: "EST-1019",
      status: "accepted",
      approvalStatus: "not_required",
      subtotalCents: 920000,
      taxCents: 0,
      totalCents: 920000,
      sentAt: at(9, 0, -1),
      acceptedAt: at(10, 20, -1),
      acceptedByName: "Brookside Board",
      acceptedByEmail: "board@brookside.example",
      acceptanceSource: "email",
      acceptanceNote: "Board approved the seasonal renewal by email.",
      expiresAt: at(17, 0, 13),
      terms: "Seasonal lawn-health renewal includes the six-step program, grub prevention, route notes, and board communication before each application.",
    },
  ],
  approvalRequests: [
    {
      id: "approval-walsh-low-margin",
      estimateId: "est-walsh",
      estimateNumber: "EST-1024",
      opportunityId: "opp-walsh",
      customerId: "cust-walsh",
      customerName: "Megan Walsh",
      requestedByUserId: "u-amy",
      assignedApproverUserId: "u-justin",
      status: "pending",
      reasonDetails: [
        {
          code: "low_margin",
          label: "Low margin",
          severity: "critical",
          detail: "Gross margin 18.5% is below 30% target.",
          impactCents: 18500,
        },
        {
          code: "material_constraint",
          label: "Material constraint",
          severity: "critical",
          detail: "Wetland buffer requires product and application review before sending.",
        },
      ],
      riskScore: 70,
      grossMarginPercent: 18.5,
      discountCents: 12000,
      discountPercent: 13.3,
      estimatedCostCents: 63570,
      totalCents: 78000,
      dueAt: at(12, 0, 1),
      requestedAt: at(14, 30),
    },
  ],
  invoices: [
    {
      id: "inv-brookside-1020",
      customerId: "cust-brookside",
      jobId: "job-brookside",
      estimateId: "est-brookside",
      invoiceNumber: "INV-1020",
      status: "sent",
      subtotalCents: 420000,
      taxCents: 0,
      totalCents: 420000,
      paidCents: 0,
      dueAt: at(17, 0, 14),
      sentAt: at(10, 30, -1),
    },
    {
      id: "inv-northgate-1018",
      customerId: "cust-northgate",
      jobId: "job-northgate",
      invoiceNumber: "INV-1018",
      status: "partially_paid",
      subtotalCents: 680000,
      taxCents: 0,
      totalCents: 680000,
      paidCents: 300000,
      dueAt: at(17, 0, 7),
      sentAt: at(9, 45, -3),
    },
    {
      id: "inv-walsh-1024",
      customerId: "cust-walsh",
      estimateId: "est-walsh",
      invoiceNumber: "INV-1024",
      status: "draft",
      subtotalCents: 78000,
      taxCents: 0,
      totalCents: 78000,
      paidCents: 0,
    },
  ],
  payments: [
    {
      id: "pay-northgate-3000",
      customerId: "cust-northgate",
      invoiceId: "inv-northgate-1018",
      status: "posted",
      method: "ach",
      amountCents: 300000,
      receivedAt: at(13, 15, -1),
      reference: "ACH-7781",
    },
  ],
  serviceCatalog: [
    { id: "svc-fert", name: "Six-step fertilization program", category: "lawn_care", defaultUnit: "season", defaultPriceCents: 165000, active: true },
    { id: "svc-mosquito", name: "Mosquito and tick barrier", category: "pest_control", defaultUnit: "visit", defaultPriceCents: 13000, active: true },
    { id: "svc-aeration", name: "Core aeration and overseeding", category: "lawn_care", defaultUnit: "acre", defaultPriceCents: 42000, active: true },
    { id: "svc-cleanup", name: "Spring cleanup", category: "landscaping", defaultUnit: "crew hour", defaultPriceCents: 9500, active: true },
  ],
  servicePackages: [
    {
      id: "pkg-lawn-season",
      name: "Lawn health season package",
      category: "lawn_care",
      description: "Six-step fertility, grub prevention, aeration, and overseeding assumptions for a full lawn-care season.",
      includedServiceCatalogItemIds: ["svc-fert", "svc-aeration"],
      defaultPriceCents: 185000,
      billingCadence: "seasonal",
      laborHours: 5.5,
      laborRateCents: 3200,
      materialCostCents: 38500,
      equipmentCostCents: 14500,
      overheadPercent: 18,
      targetMarginPercent: 42,
      checklistDefaults: ["Measure turf zones", "Confirm fertilizer rate", "Flag treated areas", "Capture before/after photos"],
      active: true,
    },
    {
      id: "pkg-pest-barrier",
      name: "Mosquito and tick protection package",
      category: "pest_control",
      description: "Seasonal barrier program with chemical, route, applicator, and compliance defaults.",
      includedServiceCatalogItemIds: ["svc-mosquito"],
      defaultPriceCents: 78000,
      billingCadence: "seasonal",
      laborHours: 3.5,
      laborRateCents: 3400,
      materialCostCents: 12600,
      equipmentCostCents: 5800,
      overheadPercent: 16,
      targetMarginPercent: 45,
      checklistDefaults: ["Confirm wetland buffer", "Record product and EPA label", "Capture weather snapshot", "Notify customer after service"],
      active: true,
    },
    {
      id: "pkg-spring-cleanup",
      name: "Spring cleanup production package",
      category: "landscaping",
      description: "Crew-hour cleanup package with disposal, equipment, and margin assumptions.",
      includedServiceCatalogItemIds: ["svc-cleanup"],
      defaultPriceCents: 152000,
      billingCadence: "one_time",
      laborHours: 12,
      laborRateCents: 3000,
      materialCostCents: 9000,
      equipmentCostCents: 22000,
      overheadPercent: 18,
      targetMarginPercent: 38,
      checklistDefaults: ["Walk property with customer notes", "Stage debris removal", "Inspect beds and edges", "Log disposal or dump fees"],
      active: true,
    },
  ],
  priceBookItems: [
    {
      id: "pbi-six-step-area",
      serviceCatalogItemId: "svc-fert",
      name: "Six-step program by lawn size",
      unit: "season",
      basePriceCents: 165000,
      minPriceCents: 62000,
      pricingModel: "per_sq_ft",
      formula: "max(minPrice, lawnSizeSqFt * 0.018)",
      active: true,
    },
    {
      id: "pbi-mosquito-visit",
      serviceCatalogItemId: "svc-mosquito",
      name: "Mosquito barrier visit",
      unit: "visit",
      basePriceCents: 13000,
      minPriceCents: 9500,
      pricingModel: "per_visit",
      active: true,
    },
  ],
  pricingRules: [
    {
      id: "rule-large-turf-complexity",
      priceBookItemId: "pbi-six-step-area",
      name: "Large turf production complexity",
      condition: { minAreaSqFt: 50000 },
      adjustmentType: "percent",
      adjustmentValue: 8,
      order: 1,
      active: true,
    },
    {
      id: "rule-small-property-minimum",
      priceBookItemId: "pbi-six-step-area",
      name: "Small property minimum handling",
      condition: { maxAreaSqFt: 10000 },
      adjustmentType: "fixed",
      adjustmentValue: 15000,
      order: 2,
      active: true,
    },
  ],
  crews: [
    { id: "crew-alpha", name: "Alpha Lawn", color: "#2f6b4f", active: true },
    { id: "crew-bravo", name: "Bravo Pest", color: "#7c6a2b", active: true },
    { id: "crew-charlie", name: "Charlie Maintenance", color: "#42526b", active: true },
  ],
  jobs: [
    {
      id: "job-brookside",
      customerId: "cust-brookside",
      propertyId: "prop-brookside",
      opportunityId: "opp-brookside",
      estimateId: "est-brookside",
      title: "Brookside six-step season",
      status: "scheduled",
      priority: "normal",
      managerId: "u-justin",
      startDate: at(8, 30),
      recurrence: "custom",
    },
    {
      id: "job-northgate",
      customerId: "cust-northgate",
      propertyId: "prop-northgate",
      opportunityId: "opp-northgate",
      title: "Northgate weekly maintenance",
      status: "in_progress",
      priority: "high",
      managerId: "u-justin",
      startDate: at(7, 30),
      recurrence: "weekly",
    },
  ],
  jobPhases: [
    { id: "phase-brookside-handoff", jobId: "job-brookside", name: "Sales handoff", status: "completed", sortOrder: 1, startDate: at(10, 20, -1), dueDate: at(8, 30), completedAt: at(10, 30, -1) },
    { id: "phase-brookside-production", jobId: "job-brookside", name: "Production visit", status: "scheduled", sortOrder: 2, startDate: at(8, 30), dueDate: at(10, 30) },
    { id: "phase-brookside-review", jobId: "job-brookside", name: "Completion review", status: "scheduled", sortOrder: 3, startDate: at(10, 30), dueDate: at(12, 0) },
    { id: "phase-northgate-production", jobId: "job-northgate", name: "Weekly maintenance production", status: "in_progress", sortOrder: 1, startDate: at(7, 30), dueDate: at(14, 0) },
    { id: "phase-northgate-review", jobId: "job-northgate", name: "Facilities review", status: "scheduled", sortOrder: 2, startDate: at(14, 0), dueDate: at(16, 0) },
  ],
  visits: [
    {
      id: "visit-brookside-am",
      jobId: "job-brookside",
      customerId: "cust-brookside",
      propertyId: "prop-brookside",
      scheduledStart: at(8, 30),
      scheduledEnd: at(10, 30),
      status: "scheduled",
      routeOrder: 1,
      crewId: "crew-alpha",
      checklist: [
        { id: "c1", label: "Post treatment flags", isDone: false },
        { id: "c2", label: "Apply grub prevention to common turf", isDone: false },
        { id: "c3", label: "Capture after photos", isDone: false },
      ],
      notes: "Board requested photos at north entrance and playground.",
    },
    {
      id: "visit-northgate",
      jobId: "job-northgate",
      customerId: "cust-northgate",
      propertyId: "prop-northgate",
      scheduledStart: at(11, 0),
      scheduledEnd: at(14, 0),
      status: "on_site",
      routeOrder: 2,
      crewId: "crew-charlie",
      checklist: [
        { id: "c4", label: "Mow front lawn and loading dock side", isDone: true },
        { id: "c5", label: "Edge sidewalks", isDone: false },
        { id: "c6", label: "Log irrigation leak near dock", isDone: false },
      ],
      notes: "Facilities asked for a quote on mulch refresh.",
    },
  ],
  recurringServicePlans: [
    {
      id: "rsp-brookside-six-step",
      customerId: "cust-brookside",
      propertyId: "prop-brookside",
      jobId: "job-brookside",
      crewId: "crew-alpha",
      name: "Brookside six-step treatment season",
      frequency: "custom",
      intervalDays: 42,
      visitDurationMinutes: 120,
      nextRunAt: at(8, 30, 42),
      generatedVisitIds: ["visit-brookside-am"],
      status: "active",
    },
    {
      id: "rsp-northgate-weekly",
      customerId: "cust-northgate",
      propertyId: "prop-northgate",
      jobId: "job-northgate",
      crewId: "crew-charlie",
      name: "Northgate weekly maintenance route",
      frequency: "weekly",
      intervalDays: 7,
      visitDurationMinutes: 180,
      nextRunAt: at(9, 0, 7),
      status: "active",
    },
  ],
  changeOrders: [
    {
      id: "co-brookside-playground-edge",
      jobId: "job-brookside",
      customerId: "cust-brookside",
      propertyId: "prop-brookside",
      estimateId: "est-brookside",
      title: "Add playground perimeter edging",
      description: "Board requested additional edging and debris removal around playground border.",
      status: "pending_approval",
      requestedByName: "Brookside Board",
      revenueDeltaCents: 185000,
      estimatedCostDeltaCents: 72000,
      grossProfitDeltaCents: 113000,
      grossMarginPercent: 61,
      scheduleImpactDays: 2,
      requestedAt: at(13, 15, -1),
    },
  ],
  tasks: [
    {
      id: "task-call-walsh",
      entityType: "opportunity",
      entityId: "opp-walsh",
      title: "Follow up on mosquito proposal",
      status: "open",
      priority: "high",
      dueAt: at(16, 0),
      assignedUserId: "u-amy",
    },
    {
      id: "task-irrigation",
      entityType: "job",
      entityId: "job-northgate",
      title: "Prepare irrigation repair estimate",
      status: "in_progress",
      priority: "normal",
      dueAt: at(12, 0, 1),
      assignedUserId: "u-justin",
    },
  ],
  activities: [
    {
      id: "act-1",
      entityType: "opportunity",
      entityId: "opp-walsh",
      kind: "email",
      summary: "Estimate EST-1024 sent to Megan Walsh",
      actorId: "u-amy",
      occurredAt: at(14, 15),
    },
    {
      id: "act-2",
      entityType: "visit",
      entityId: "visit-northgate",
      kind: "visit",
      summary: "Crew Charlie marked Northgate visit on site",
      actorId: "u-nina",
      occurredAt: at(11, 8),
    },
    {
      id: "act-3",
      entityType: "opportunity",
      entityId: "opp-brookside",
      kind: "status_change",
      summary: "Brookside opportunity won and converted to job",
      actorId: "u-justin",
      occurredAt: at(10, 20, -1),
    },
  ],
  notes: [
    {
      id: "note-brookside-access",
      entityType: "customer",
      entityId: "cust-brookside",
      body: "Board prefers treatment notices 24 hours before applications and photos after playground service.",
      visibility: "internal",
      createdByUserId: "u-amy",
      createdAt: at(15, 20, -2),
    },
    {
      id: "note-walsh-buffer",
      entityType: "customer",
      entityId: "cust-walsh",
      body: "Wetland buffer in backyard. Keep mosquito application notes customer-ready.",
      visibility: "internal",
      createdByUserId: "u-amy",
      createdAt: at(9, 40, -1),
    },
    {
      id: "note-northgate-billing",
      entityType: "customer",
      entityId: "cust-northgate",
      body: "Billing contact wants invoices grouped by building and paid by ACH.",
      visibility: "internal",
      createdByUserId: "u-justin",
      createdAt: at(11, 25, -3),
    },
  ],
  files: [
    {
      id: "file-brookside-agreement",
      entityType: "customer",
      entityId: "cust-brookside",
      fileName: "Brookside HOA service agreement.pdf",
      contentType: "application/pdf",
      size: 248000,
      createdByUserId: "u-justin",
      createdAt: at(10, 0, -5),
    },
    {
      id: "file-brookside-map",
      entityType: "property",
      entityId: "prop-brookside",
      fileName: "Brookside common-area treatment map.png",
      contentType: "image/png",
      size: 913000,
      createdByUserId: "u-nina",
      createdAt: at(12, 20, -1),
    },
    {
      id: "file-walsh-estimate",
      entityType: "estimate",
      entityId: "est-walsh",
      fileName: "Walsh mosquito estimate package.pdf",
      contentType: "application/pdf",
      size: 175000,
      createdByUserId: "u-amy",
      createdAt: at(14, 20),
    },
  ],
  materials: [
    { id: "mat-grub", name: "Merit grub control", unit: "bag", costCents: 7300, active: true, epaRegistrationNumber: "EPA-432-1471" },
    { id: "mat-barrier", name: "Mosquito barrier mix", unit: "gallon", costCents: 2800, active: true, epaRegistrationNumber: "EPA-8329-98" },
    { id: "mat-seed", name: "Premium overseed blend", unit: "bag", costCents: 6400, active: true, epaRegistrationNumber: "EPA-100-1102" },
  ],
};

const scaleFirstNames = [
  "Avery",
  "Blake",
  "Casey",
  "Dakota",
  "Emerson",
  "Finley",
  "Gray",
  "Harper",
  "Jordan",
  "Kai",
  "Logan",
  "Morgan",
  "Noel",
  "Parker",
  "Quinn",
  "Reese",
  "Sawyer",
  "Taylor",
  "Val",
  "Wren",
];

const scaleLastNames = [
  "Adams",
  "Bennett",
  "Carter",
  "Diaz",
  "Ellis",
  "Foster",
  "Garcia",
  "Hayes",
  "Iverson",
  "Johnson",
  "Kim",
  "Lopez",
  "Miller",
  "Nolan",
  "Owens",
  "Patel",
  "Rivera",
  "Stone",
  "Turner",
  "Young",
];

const scaleCities = ["Foxborough", "Mansfield", "Sharon", "Wrentham", "Plainville"];
const scaleSources = ["Website form", "Google Local Services", "Referral", "Phone", "Yard sign", "Facebook"];
const scalePrograms = ["lawn_care", "landscaping", "pest_control", "tree_shrub", "irrigation", "maintenance"] as const;
const scaleRoles = ["sales", "dispatcher", "crew_lead", "technician", "manager"] as const;
const scaleStatuses = ["new", "contacted", "converted", "disqualified"] as const;
const scaleStages = ["new", "qualified", "estimating", "proposal_sent", "won"] as const;

function buildScaledDemoWorkspace(workspace: WorkspaceSnapshot, scaleCount = 100): WorkspaceSnapshot {
  // A realistic staff roster (base workspace already has owner/sales/dispatcher/crew lead).
  const syntheticMembers: WorkspaceSnapshot["members"] = [
    { id: "u-demo-001", name: "Priya Shah", email: "priya@greenline.test", role: "sales" },
    { id: "u-demo-002", name: "Derek Boone", email: "derek@greenline.test", role: "crew_lead" },
    { id: "u-demo-003", name: "Sofia Marin", email: "sofia@greenline.test", role: "technician" },
    { id: "u-demo-004", name: "Tom Gallagher", email: "tom@greenline.test", role: "technician" },
  ];
  const staffPool = [...workspace.members, ...syntheticMembers];
  const salesPool = staffPool.filter((member) => member.role === "sales" || member.role === "owner");
  const opsPool = staffPool.filter((member) => ["dispatcher", "crew_lead", "manager", "owner"].includes(member.role));

  const syntheticCustomers: WorkspaceSnapshot["customers"] = [];
  const syntheticContacts: WorkspaceSnapshot["contacts"] = [];
  const syntheticProperties: WorkspaceSnapshot["properties"] = [];
  const syntheticPropertyAreas: WorkspaceSnapshot["propertyAreas"] = [];
  const syntheticLeads: WorkspaceSnapshot["leads"] = [];
  const syntheticOpportunities: WorkspaceSnapshot["opportunities"] = [];
  const syntheticJobs: WorkspaceSnapshot["jobs"] = [];
  const syntheticVisits: WorkspaceSnapshot["visits"] = [];
  const syntheticTasks: WorkspaceSnapshot["tasks"] = [];
  const syntheticActivities: WorkspaceSnapshot["activities"] = [];
  const syntheticInvoices: WorkspaceSnapshot["invoices"] = [];
  const syntheticPayments: WorkspaceSnapshot["payments"] = [];
  const syntheticNotes: WorkspaceSnapshot["notes"] = [];
  const syntheticFiles: WorkspaceSnapshot["files"] = [];
  const crewStopCounters = new Map<string, number>();

  for (let index = 0; index < scaleCount; index += 1) {
    const number = index + 1;
    const padded = String(number).padStart(3, "0");
    const firstName = scaleFirstNames[index % scaleFirstNames.length];
    // Shift the last-name cycle each time the first-name pool wraps so every generated full name is unique.
    const lastName = scaleLastNames[(index * 3 + Math.floor(index / scaleFirstNames.length)) % scaleLastNames.length];
    const program = scalePrograms[index % scalePrograms.length];
    const owner = salesPool[index % salesPool.length];
    const manager = opsPool[index % opsPool.length];
    const city = scaleCities[index % scaleCities.length];
    const status = scaleStatuses[index % scaleStatuses.length];
    const stage = scaleStages[index % scaleStages.length];
    const accountType = index % 5 === 0 ? "commercial" : "residential";
    const customerType = index % 10 === 0 ? "hoa" : accountType;
    const valueCents = 18000 + (index % 18) * 12500 + (accountType === "commercial" ? 185000 : 0);

    syntheticCustomers.push({
      id: `cust-scale-${padded}`,
      name: accountType === "commercial" ? `${lastName} Facilities ${padded}` : `${firstName} ${lastName}`,
      type: customerType,
      status: status === "converted" ? "active" : "prospect",
      phone: `(508) 555-${String(1000 + number).slice(-4)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${padded}@example.test`,
      tags: ["scale-test", program, accountType],
      ownerId: owner.id,
    });
    syntheticContacts.push({
      id: `contact-scale-${padded}`,
      customerId: `cust-scale-${padded}`,
      name: accountType === "commercial" ? `${lastName} Operations` : `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${padded}@example.test`,
      phone: `(508) 555-${String(1000 + number).slice(-4)}`,
      roleTitle: accountType === "commercial" ? "Operations" : "Primary contact",
      isPrimary: true,
    });

    syntheticProperties.push({
      id: `prop-scale-${padded}`,
      customerId: `cust-scale-${padded}`,
      label: accountType === "commercial" ? `${lastName} Facility` : "Primary residence",
      street: `${100 + number} ${["Maple", "Cedar", "Oak", "Pine", "Elm"][index % 5]} ${accountType === "commercial" ? "Parkway" : "Lane"}`,
      city,
      state: "MA",
      postalCode: `02${String(30 + (index % 60)).padStart(3, "0")}`,
      notes: index % 7 === 0 ? "Gate code required. Confirm access before dispatch." : "Synthetic scale-test property.",
      lawnSizeSqFt: 6500 + (index % 30) * 1750 + (accountType === "commercial" ? 72000 : 0),
    });
    syntheticPropertyAreas.push({
      id: `area-scale-turf-${padded}`,
      propertyId: `prop-scale-${padded}`,
      name: accountType === "commercial" ? "Primary commercial turf" : "Primary lawn",
      kind: index % 3 === 0 ? "back_lawn" : "front_lawn",
      size: 5000 + (index % 22) * 1250 + (accountType === "commercial" ? 35000 : 0),
      unit: "sq_ft",
      notes: "Synthetic turf area for pricing calculator and measurement workflows.",
    });

    syntheticLeads.push({
      id: `lead-scale-${padded}`,
      title: `${program.replaceAll("_", " ")} request ${padded}`,
      customerId: `cust-scale-${padded}`,
      propertyId: `prop-scale-${padded}`,
      source: scaleSources[index % scaleSources.length],
      status,
      urgency: index % 9 === 0 ? "high" : index % 4 === 0 ? "low" : "normal",
      ownerId: owner.id,
      leadType: index % 4 === 0 ? "phone_call" : "form",
      accountType,
      companyAssignment: index % 2 === 0 ? "Turf Pro" : "GreenAce",
      programRequests: [program],
      lawnSizeSqFt: 6500 + (index % 30) * 1750 + (accountType === "commercial" ? 72000 : 0),
      message: "Generated scale-test lead for pricing, routing, follow-up, and quality scoring.",
      estimateNotes: "Use this record to test list performance, filters, owners, and conversion views.",
      qualityScore: 52 + (index % 45),
      spamScore: index % 17 === 0 ? 35 : 0,
      // Response SLAs are minutes-scale, so keep most leads inside their window
      // (received minutes ago) with a deliberate few aged 1-3 days for follow-up demos.
      receivedAt: index % 20 === 0 ? at(9, (index * 7) % 60, -3) : Date.now() - (index % 4) * 3 * 60 * 1000,
      createdAt: index % 20 === 0 ? at(9, (index * 7) % 60, -3) : Date.now() - (index % 4) * 3 * 60 * 1000,
    });

    syntheticOpportunities.push({
      id: `opp-scale-${padded}`,
      leadId: `lead-scale-${padded}`,
      customerId: `cust-scale-${padded}`,
      propertyId: `prop-scale-${padded}`,
      title: `${program.replaceAll("_", " ")} estimate ${padded}`,
      stage,
      valueCents,
      closeProbability: stage === "won" ? 100 : 20 + (index % 6) * 12,
      expectedCloseDate: at(16, 0, index % 18),
      ownerId: owner.id,
      serviceLines: [program],
      updatedAt: at(9 + (index % 7), (index * 11) % 60, -1 * (index % 10)),
    });

    if (index < 36) {
      const jobStatus = index % 6 === 0 ? "completed" : index % 3 === 0 ? "in_progress" : "scheduled";
      syntheticJobs.push({
        id: `job-scale-${padded}`,
        customerId: `cust-scale-${padded}`,
        propertyId: `prop-scale-${padded}`,
        title: `${program.replaceAll("_", " ")} production ${padded}`,
        status: jobStatus,
        priority: index % 8 === 0 ? "high" : "normal",
        managerId: manager.id,
        startDate: at(7 + (index % 8), 30, index % 12),
      });
      // Assign the crew whose skills match the service line so dispatch doesn't
      // flag a skill mismatch on every synthetic stop.
      const visitCrewId = program === "pest_control" ? "crew-bravo" : program === "maintenance" || program === "irrigation" ? "crew-charlie" : "crew-alpha";
      const crewStopKey = `${visitCrewId}-${index % 12}`;
      const nextStopNumber = (crewStopCounters.get(crewStopKey) ?? 0) + 1;
      crewStopCounters.set(crewStopKey, nextStopNumber);
      syntheticVisits.push({
        id: `visit-scale-${padded}`,
        jobId: `job-scale-${padded}`,
        customerId: `cust-scale-${padded}`,
        propertyId: `prop-scale-${padded}`,
        scheduledStart: at(7 + (index % 8), 30, index % 12),
        scheduledEnd: at(9 + (index % 8), 0, index % 12),
        status: index % 6 === 0 ? "complete" : index % 3 === 0 ? "on_site" : "scheduled",
        routeOrder: nextStopNumber,
        crewId: visitCrewId,
        checklist: [
          { id: `scale-${padded}-c1`, label: "Confirm property access", isDone: index % 3 === 0 },
          { id: `scale-${padded}-c2`, label: "Complete service scope", isDone: index % 6 === 0 },
          { id: `scale-${padded}-c3`, label: "Log materials and photos", isDone: false },
        ],
        notes: "Synthetic route stop for dispatch and mobile field testing.",
      });
      syntheticTasks.push({
        id: `task-scale-${padded}`,
        entityType: "job",
        entityId: `job-scale-${padded}`,
        title: `Review scale-test job ${padded}`,
        status: index % 5 === 0 ? "in_progress" : "open",
        priority: index % 8 === 0 ? "high" : "normal",
        dueAt: at(15, 0, index % 9),
        assignedUserId: manager.id,
      });
      syntheticInvoices.push({
        id: `inv-scale-${padded}`,
        customerId: `cust-scale-${padded}`,
        jobId: `job-scale-${padded}`,
        invoiceNumber: `INV-S${padded}`,
        status: index % 6 === 0 ? "paid" : index % 4 === 0 ? "overdue" : "sent",
        subtotalCents: valueCents,
        taxCents: 0,
        totalCents: valueCents,
        paidCents: index % 6 === 0 ? valueCents : index % 4 === 0 ? Math.round(valueCents * 0.35) : 0,
        dueAt: at(17, 0, 14 + (index % 12)),
        sentAt: at(9, 30, -1 * (index % 8)),
        ...(index % 6 === 0 ? { paidAt: at(13, 0, -1) } : {}),
      });
      if (index % 6 === 0 || index % 4 === 0) {
        syntheticPayments.push({
          id: `pay-scale-${padded}`,
          customerId: `cust-scale-${padded}`,
          invoiceId: `inv-scale-${padded}`,
          status: "posted",
          method: index % 2 === 0 ? "ach" : "card",
          amountCents: index % 6 === 0 ? valueCents : Math.round(valueCents * 0.35),
          receivedAt: at(12, 45, -1 * (index % 5)),
          reference: `SCALE-${padded}`,
        });
      }
    }

    if (index < 50) {
      syntheticActivities.push({
        id: `act-scale-${padded}`,
        entityType: "lead",
        entityId: `lead-scale-${padded}`,
        kind: index % 2 === 0 ? "call" : "email",
        summary: `Scale-test activity logged for ${firstName} ${lastName}`,
        actorId: owner.id,
        occurredAt: at(10 + (index % 6), (index * 5) % 60, -1 * (index % 14)),
      });
    }
    if (index < 40) {
      syntheticNotes.push({
        id: `note-scale-${padded}`,
        entityType: "customer",
        entityId: `cust-scale-${padded}`,
        body: "Synthetic account note for customer profile, follow-up, and service-history testing.",
        visibility: "internal",
        createdByUserId: owner.id,
        createdAt: at(11, (index * 3) % 60, -1 * (index % 9)),
      });
    }
    if (index < 24) {
      syntheticFiles.push({
        id: `file-scale-${padded}`,
        entityType: "customer",
        entityId: `cust-scale-${padded}`,
        fileName: `Scale account service packet ${padded}.pdf`,
        contentType: "application/pdf",
        size: 128000 + index * 1000,
        createdByUserId: owner.id,
        createdAt: at(10, (index * 4) % 60, -1 * (index % 10)),
      });
    }
  }

  // Two intentional duplicate submissions for the same customer so the Lead Ops
  // duplicate queue demonstrates a realistic (small) duplicate cluster.
  syntheticLeads.push(
    {
      id: "lead-dup-walsh-1",
      title: "Mosquito quote request (web form resubmission)",
      customerId: "cust-walsh",
      propertyId: "prop-walsh",
      source: "Website form",
      status: "new",
      urgency: "normal",
      ownerId: "u-amy",
      leadType: "form",
      accountType: "residential",
      programRequests: ["pest_control"],
      message: "Submitted the form again to ask about mosquito pricing.",
      qualityScore: 74,
      spamScore: 0,
      receivedAt: at(10, 5, 0),
      createdAt: at(10, 5, 0),
    },
    {
      id: "lead-dup-walsh-2",
      title: "Mosquito quote request (phone follow-up)",
      customerId: "cust-walsh",
      propertyId: "prop-walsh",
      source: "Phone",
      status: "new",
      urgency: "normal",
      ownerId: "u-justin",
      leadType: "phone_call",
      accountType: "residential",
      programRequests: ["pest_control"],
      message: "Called in about the same mosquito quote submitted online.",
      qualityScore: 71,
      spamScore: 0,
      receivedAt: at(11, 40, 0),
      createdAt: at(11, 40, 0),
    },
  );

  return {
    ...workspace,
    members: [...workspace.members, ...syntheticMembers],
    customers: [...workspace.customers, ...syntheticCustomers],
    contacts: [...workspace.contacts, ...syntheticContacts],
    properties: [...workspace.properties, ...syntheticProperties],
    propertyAreas: [...workspace.propertyAreas, ...syntheticPropertyAreas],
    leads: [...workspace.leads, ...syntheticLeads],
    opportunities: [...workspace.opportunities, ...syntheticOpportunities],
    invoices: [...workspace.invoices, ...syntheticInvoices],
    payments: [...workspace.payments, ...syntheticPayments],
    jobs: [...workspace.jobs, ...syntheticJobs],
    visits: [...workspace.visits, ...syntheticVisits],
    tasks: [...workspace.tasks, ...syntheticTasks],
    activities: [...workspace.activities, ...syntheticActivities],
    notes: [...workspace.notes, ...syntheticNotes],
    files: [...workspace.files, ...syntheticFiles],
  };
}

export const demoWorkspace: WorkspaceSnapshot = buildScaledDemoWorkspace(baseDemoWorkspace);

function filterWorkspaceToContacts(workspace: WorkspaceSnapshot, contactLimit: number): WorkspaceSnapshot {
  const contacts = workspace.contacts.slice(0, contactLimit);
  const customerIds = new Set(contacts.map((contact) => contact.customerId));
  const properties = workspace.properties.filter((property) => customerIds.has(property.customerId));
  const propertyIds = new Set(properties.map((property) => property.id));
  const leads = workspace.leads.filter((lead) => customerIds.has(lead.customerId));
  const leadIds = new Set(leads.map((lead) => lead.id));
  const opportunities = workspace.opportunities.filter((opportunity) => customerIds.has(opportunity.customerId));
  const opportunityIds = new Set(opportunities.map((opportunity) => opportunity.id));
  const estimates = workspace.estimates.filter((estimate) => customerIds.has(estimate.customerId));
  const estimateIds = new Set(estimates.map((estimate) => estimate.id));
  const jobs = workspace.jobs.filter((job) => customerIds.has(job.customerId));
  const jobIds = new Set(jobs.map((job) => job.id));
  const visits = workspace.visits.filter((visit) => jobIds.has(visit.jobId));
  const visitIds = new Set(visits.map((visit) => visit.id));
  const invoiceIds = new Set(workspace.invoices.filter((invoice) => customerIds.has(invoice.customerId)).map((invoice) => invoice.id));

  const entityIds = {
    customer: customerIds,
    property: propertyIds,
    lead: leadIds,
    opportunity: opportunityIds,
    estimate: estimateIds,
    job: jobIds,
    visit: visitIds,
    customer_invoice: invoiceIds,
  };
  const belongsToEntity = (entityType: string, entityId: string) => entityIds[entityType as keyof typeof entityIds]?.has(entityId) ?? false;

  return {
    ...workspace,
    contacts,
    customers: workspace.customers.filter((customer) => customerIds.has(customer.id)),
    properties,
    propertyAreas: workspace.propertyAreas.filter((area) => propertyIds.has(area.propertyId)),
    leads,
    opportunities,
    estimates,
    approvalRequests: workspace.approvalRequests.filter((request) => estimateIds.has(request.estimateId)),
    invoices: workspace.invoices.filter((invoice) => invoiceIds.has(invoice.id)),
    payments: workspace.payments.filter((payment) => Boolean(payment.invoiceId && invoiceIds.has(payment.invoiceId))),
    jobs,
    jobPhases: workspace.jobPhases.filter((phase) => jobIds.has(phase.jobId)),
    visits,
    recurringServicePlans: workspace.recurringServicePlans.filter((plan) => Boolean(plan.jobId && jobIds.has(plan.jobId)) || customerIds.has(plan.customerId)),
    changeOrders: workspace.changeOrders.filter((changeOrder) => jobIds.has(changeOrder.jobId)),
    tasks: workspace.tasks.filter((task) => belongsToEntity(task.entityType, task.entityId)),
    activities: workspace.activities.filter((activity) => belongsToEntity(activity.entityType, activity.entityId)),
    notes: workspace.notes.filter((note) => belongsToEntity(note.entityType, note.entityId)),
    files: workspace.files.filter((file) => belongsToEntity(file.entityType, file.entityId)),
  };
}

const newUserDemoWorkspace: WorkspaceSnapshot = {
  ...baseDemoWorkspace,
  organization: {
    ...baseDemoWorkspace.organization,
    id: "org-demo-new",
    name: "Your New Turf Pro Workspace",
  },
  members: [baseDemoWorkspace.members[0]],
  customers: [],
  contacts: [],
  properties: [],
  propertyAreas: [],
  leads: [],
  opportunities: [],
  estimates: [],
  approvalRequests: [],
  invoices: [],
  payments: [],
  crews: [],
  jobs: [],
  jobPhases: [],
  visits: [],
  recurringServicePlans: [],
  changeOrders: [],
  tasks: [],
  activities: [],
  notes: [],
  files: [],
};

function withDemoPersonaIdentity(workspace: WorkspaceSnapshot, persona: Exclude<DemoPersona, "new">): WorkspaceSnapshot {
  return {
    ...workspace,
    organization: {
      ...workspace.organization,
      id: `org-demo-${persona}`,
      name: persona === "starter" ? "Growing Turf Pro Workspace" : "Established Turf Pro Operations",
    },
  };
}

export function getDemoWorkspaceForPersona(persona: DemoPersona): WorkspaceSnapshot {
  if (persona === "new") return newUserDemoWorkspace;
  if (persona === "starter") return withDemoPersonaIdentity(filterWorkspaceToContacts(buildScaledDemoWorkspace(baseDemoWorkspace, 5), 10), "starter");
  return withDemoPersonaIdentity(filterWorkspaceToContacts(demoWorkspace, 100), "established");
}
