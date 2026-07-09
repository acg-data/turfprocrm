import type { WorkspaceSnapshot } from "@/domain/types";

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
    {
      id: "cust-hartwell",
      name: "Hartwell Residence",
      type: "residential",
      status: "prospect",
      phone: "(508) 555-0173",
      email: "d.hartwell@example.com",
      tags: ["lawn_care", "walk-in"],
      ownerId: "u-amy",
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
    },
    {
      id: "prop-hartwell",
      customerId: "cust-hartwell",
      label: "Primary property",
      street: "42 Meadow Lane",
      city: "Foxborough",
      state: "MA",
      postalCode: "02035",
      notes: "Walk-in request logged at the front desk.",
    },
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
    {
      id: "lead-hartwell",
      title: "Walk-in lawn care request",
      customerId: "cust-hartwell",
      propertyId: "prop-hartwell",
      source: "Manual entry",
      status: "new",
      urgency: "normal",
      ownerId: "u-amy",
      createdAt: at(10, 5, -1),
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
      subtotalCents: 78000,
      taxCents: 0,
      totalCents: 78000,
    },
    {
      id: "est-brookside",
      opportunityId: "opp-brookside",
      customerId: "cust-brookside",
      propertyId: "prop-brookside",
      estimateNumber: "EST-1019",
      status: "accepted",
      subtotalCents: 920000,
      taxCents: 0,
      totalCents: 920000,
    },
  ],
  serviceCatalog: [
    { id: "svc-fert", name: "Six-step fertilization program", category: "lawn_care", defaultUnit: "season", defaultPriceCents: 165000, active: true },
    { id: "svc-mosquito", name: "Mosquito and tick barrier", category: "pest_control", defaultUnit: "visit", defaultPriceCents: 13000, active: true },
    { id: "svc-aeration", name: "Core aeration and overseeding", category: "lawn_care", defaultUnit: "acre", defaultPriceCents: 42000, active: true },
    { id: "svc-cleanup", name: "Spring cleanup", category: "landscaping", defaultUnit: "crew hour", defaultPriceCents: 9500, active: true },
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
      title: "Brookside six-step season",
      status: "scheduled",
      priority: "normal",
      managerId: "u-justin",
      startDate: at(8, 30),
    },
    {
      id: "job-northgate",
      customerId: "cust-northgate",
      propertyId: "prop-northgate",
      title: "Northgate weekly maintenance",
      status: "in_progress",
      priority: "high",
      managerId: "u-justin",
      startDate: at(7, 30),
    },
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
  materials: [
    { id: "mat-grub", name: "Merit grub control", unit: "bag", costCents: 7300, active: true },
    { id: "mat-barrier", name: "Mosquito barrier mix", unit: "gallon", costCents: 2800, active: true },
    { id: "mat-seed", name: "Premium overseed blend", unit: "bag", costCents: 6400, active: true },
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

function buildScaledDemoWorkspace(workspace: WorkspaceSnapshot): WorkspaceSnapshot {
  const syntheticMembers: WorkspaceSnapshot["members"] = Array.from({ length: 100 }, (_, index) => {
    const number = index + 1;
    const firstName = scaleFirstNames[index % scaleFirstNames.length];
    const lastName = scaleLastNames[Math.floor(index / scaleFirstNames.length) % scaleLastNames.length];
    return {
      id: `u-demo-${String(number).padStart(3, "0")}`,
      name: `${firstName} ${lastName}`,
      email: `demo.user${String(number).padStart(3, "0")}@turfpro.test`,
      role: scaleRoles[index % scaleRoles.length],
    };
  });

  const syntheticCustomers: WorkspaceSnapshot["customers"] = [];
  const syntheticProperties: WorkspaceSnapshot["properties"] = [];
  const syntheticLeads: WorkspaceSnapshot["leads"] = [];
  const syntheticOpportunities: WorkspaceSnapshot["opportunities"] = [];
  const syntheticJobs: WorkspaceSnapshot["jobs"] = [];
  const syntheticVisits: WorkspaceSnapshot["visits"] = [];
  const syntheticTasks: WorkspaceSnapshot["tasks"] = [];
  const syntheticActivities: WorkspaceSnapshot["activities"] = [];

  for (let index = 0; index < 100; index += 1) {
    const number = index + 1;
    const padded = String(number).padStart(3, "0");
    const firstName = scaleFirstNames[index % scaleFirstNames.length];
    const lastName = scaleLastNames[(index * 3) % scaleLastNames.length];
    const program = scalePrograms[index % scalePrograms.length];
    const owner = syntheticMembers[index % syntheticMembers.length];
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
      receivedAt: at(8 + (index % 9), (index * 7) % 60, -1 * (index % 21)),
      createdAt: at(8 + (index % 9), (index * 7) % 60, -1 * (index % 21)),
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
        managerId: owner.id,
        startDate: at(7 + (index % 8), 30, index % 12),
      });
      syntheticVisits.push({
        id: `visit-scale-${padded}`,
        jobId: `job-scale-${padded}`,
        customerId: `cust-scale-${padded}`,
        propertyId: `prop-scale-${padded}`,
        scheduledStart: at(7 + (index % 8), 30, index % 12),
        scheduledEnd: at(9 + (index % 8), 0, index % 12),
        status: index % 6 === 0 ? "complete" : index % 3 === 0 ? "on_site" : "scheduled",
        routeOrder: (index % 12) + 1,
        crewId: workspace.crews[index % workspace.crews.length]?.id ?? "crew-alpha",
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
        assignedUserId: owner.id,
      });
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
  }

  return {
    ...workspace,
    members: [...workspace.members, ...syntheticMembers],
    customers: [...workspace.customers, ...syntheticCustomers],
    properties: [...workspace.properties, ...syntheticProperties],
    leads: [...workspace.leads, ...syntheticLeads],
    opportunities: [...workspace.opportunities, ...syntheticOpportunities],
    jobs: [...workspace.jobs, ...syntheticJobs],
    visits: [...workspace.visits, ...syntheticVisits],
    tasks: [...workspace.tasks, ...syntheticTasks],
    activities: [...workspace.activities, ...syntheticActivities],
  };
}

export const demoWorkspace: WorkspaceSnapshot = buildScaledDemoWorkspace(baseDemoWorkspace);
