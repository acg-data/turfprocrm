import { pgTable, text, doublePrecision, boolean, jsonb, index } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    industryFocus: text("industryFocus").notNull(),
    timezone: text("timezone").notNull(),
    defaultCurrency: text("defaultCurrency"),
    billingPlan: text("billingPlan"),
    subscriptionStatus: text("subscriptionStatus"),
    trialEndsAt: doublePrecision("trialEndsAt"),
    serviceTerritory: jsonb("serviceTerritory"),
    settings: jsonb("settings"),
    createdByClerkUserId: text("createdByClerkUserId").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("organizations_slug_idx").on(t.slug)],
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    clerkUserId: text("clerkUserId").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    avatarUrl: text("avatarUrl"),
    phone: text("phone"),
    timezone: text("timezone"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("users_clerk_user_id_idx").on(t.clerkUserId)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    clerkOrganizationId: text("clerkOrganizationId"),
    role: text("role").notNull(),
    status: text("status").notNull(),
    fieldPinEnabled: boolean("fieldPinEnabled"),
    notificationProfileId: text("notificationProfileId"),
    joinedAt: doublePrecision("joinedAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [
    index("memberships_org_idx").on(t.organizationId),
    index("memberships_org_user_idx").on(t.organizationId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull(),
    source: text("source"),
    ownerUserId: text("ownerUserId"),
    tags: jsonb("tags").notNull(),
    lifetimeValueCents: doublePrecision("lifetimeValueCents"),
    balanceCents: doublePrecision("balanceCents"),
    lastContactedAt: doublePrecision("lastContactedAt"),
    doNotContact: boolean("doNotContact"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [
    index("customers_org_idx").on(t.organizationId),
    index("customers_org_updated_idx").on(t.organizationId, t.updatedAt),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    customerId: text("customerId").notNull(),
    name: text("name").notNull(),
    roleTitle: text("roleTitle"),
    email: text("email"),
    phone: text("phone"),
    mobilePhone: text("mobilePhone"),
    workPhone: text("workPhone"),
    preferredChannel: text("preferredChannel"),
    isPrimary: boolean("isPrimary").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("contacts_org_idx").on(t.organizationId)],
);

export const properties = pgTable(
  "properties",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    customerId: text("customerId").notNull(),
    label: text("label").notNull(),
    street: text("street").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postalCode").notNull(),
    county: text("county"),
    gateCode: text("gateCode"),
    notes: text("notes"),
    geo: jsonb("geo"),
    lawnSizeSqFt: doublePrecision("lawnSizeSqFt"),
    lotSizeSqFt: doublePrecision("lotSizeSqFt"),
    serviceWarnings: jsonb("serviceWarnings"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("properties_org_idx").on(t.organizationId)],
);

export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    customerId: text("customerId"),
    contactId: text("contactId"),
    propertyId: text("propertyId"),
    title: text("title").notNull(),
    source: text("source").notNull(),
    sourceDetail: text("sourceDetail"),
    leadType: text("leadType"),
    companyAssignment: text("companyAssignment"),
    accountType: text("accountType"),
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email"),
    homePhone: text("homePhone"),
    workPhone: text("workPhone"),
    mobilePhone: text("mobilePhone"),
    normalizedPhone: text("normalizedPhone"),
    message: text("message"),
    estimateNotes: text("estimateNotes"),
    programRequests: jsonb("programRequests"),
    lawnSizeSqFt: doublePrecision("lawnSizeSqFt"),
    estimatedServiceDate: doublePrecision("estimatedServiceDate"),
    isEstimatedDate: boolean("isEstimatedDate"),
    grade: text("grade"),
    status: text("status").notNull(),
    unqualifiedReason: text("unqualifiedReason"),
    lossReason: text("lossReason"),
    urgency: text("urgency").notNull(),
    ownerUserId: text("ownerUserId"),
    hiddenAt: doublePrecision("hiddenAt"),
    hiddenByUserId: text("hiddenByUserId"),
    spamScore: doublePrecision("spamScore"),
    spamReasons: jsonb("spamReasons"),
    spamReviewedAt: doublePrecision("spamReviewedAt"),
    duplicateClusterKey: text("duplicateClusterKey"),
    qualityScore: doublePrecision("qualityScore"),
    receivedAt: doublePrecision("receivedAt"),
    convertedAt: doublePrecision("convertedAt"),
    externalSourceId: text("externalSourceId"),
    rawPayload: jsonb("rawPayload"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [
    index("leads_org_idx").on(t.organizationId),
    index("leads_org_created_idx").on(t.organizationId, t.createdAt),
  ],
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    leadId: text("leadId"),
    customerId: text("customerId").notNull(),
    propertyId: text("propertyId"),
    title: text("title").notNull(),
    stage: text("stage").notNull(),
    valueCents: doublePrecision("valueCents").notNull(),
    closeProbability: doublePrecision("closeProbability").notNull(),
    expectedCloseDate: doublePrecision("expectedCloseDate"),
    ownerUserId: text("ownerUserId"),
    serviceLines: jsonb("serviceLines").notNull(),
    lossReason: text("lossReason"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("opportunities_org_idx").on(t.organizationId)],
);

export const estimates = pgTable(
  "estimates",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    opportunityId: text("opportunityId"),
    customerId: text("customerId").notNull(),
    propertyId: text("propertyId"),
    estimateNumber: text("estimateNumber").notNull(),
    status: text("status").notNull(),
    subtotalCents: doublePrecision("subtotalCents").notNull(),
    discountCents: doublePrecision("discountCents"),
    taxCents: doublePrecision("taxCents").notNull(),
    totalCents: doublePrecision("totalCents").notNull(),
    sentAt: doublePrecision("sentAt"),
    acceptedAt: doublePrecision("acceptedAt"),
    expiresAt: doublePrecision("expiresAt"),
    terms: text("terms"),
    templateId: text("templateId"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("estimates_org_idx").on(t.organizationId)],
);

export const serviceCatalogItems = pgTable(
  "serviceCatalogItems",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    defaultUnit: text("defaultUnit").notNull(),
    defaultPriceCents: doublePrecision("defaultPriceCents").notNull(),
    durationMinutes: doublePrecision("durationMinutes"),
    seasonStartMonth: doublePrecision("seasonStartMonth"),
    seasonEndMonth: doublePrecision("seasonEndMonth"),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("serviceCatalogItems_org_idx").on(t.organizationId)],
);

export const priceBooks = pgTable(
  "priceBooks",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    effectiveFrom: doublePrecision("effectiveFrom"),
    effectiveTo: doublePrecision("effectiveTo"),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("priceBooks_org_idx").on(t.organizationId)],
);

export const priceBookItems = pgTable(
  "priceBookItems",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    priceBookId: text("priceBookId").notNull(),
    serviceCatalogItemId: text("serviceCatalogItemId"),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    basePriceCents: doublePrecision("basePriceCents").notNull(),
    minPriceCents: doublePrecision("minPriceCents"),
    pricingModel: text("pricingModel").notNull(),
    formula: text("formula"),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("priceBookItems_org_idx").on(t.organizationId)],
);

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    customerId: text("customerId").notNull(),
    propertyId: text("propertyId"),
    opportunityId: text("opportunityId"),
    estimateId: text("estimateId"),
    title: text("title").notNull(),
    status: text("status").notNull(),
    priority: text("priority").notNull(),
    recurrence: text("recurrence"),
    startDate: doublePrecision("startDate"),
    endDate: doublePrecision("endDate"),
    managerUserId: text("managerUserId"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("jobs_org_idx").on(t.organizationId)],
);

export const jobVisits = pgTable(
  "jobVisits",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    jobId: text("jobId").notNull(),
    customerId: text("customerId").notNull(),
    propertyId: text("propertyId"),
    scheduledStart: doublePrecision("scheduledStart").notNull(),
    scheduledEnd: doublePrecision("scheduledEnd").notNull(),
    status: text("status").notNull(),
    routeOrder: doublePrecision("routeOrder"),
    assignedCrewId: text("assignedCrewId"),
    checklistTemplateId: text("checklistTemplateId"),
    checklist: jsonb("checklist").notNull(),
    notes: text("notes"),
    issueFlags: jsonb("issueFlags"),
    completedAt: doublePrecision("completedAt"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [
    index("jobVisits_org_idx").on(t.organizationId),
    index("jobVisits_org_date_idx").on(t.organizationId, t.scheduledStart),
  ],
);

export const checklistTemplates = pgTable(
  "checklistTemplates",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    items: jsonb("items").notNull(),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("checklistTemplates_org_idx").on(t.organizationId)],
);

export const crews = pgTable(
  "crews",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    active: boolean("active").notNull(),
    capacityMinutesPerDay: doublePrecision("capacityMinutesPerDay"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("crews_org_idx").on(t.organizationId)],
);

export const crewMembers = pgTable(
  "crewMembers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    crewId: text("crewId").notNull(),
    userId: text("userId").notNull(),
    role: text("role").notNull(),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("crewMembers_org_idx").on(t.organizationId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    entityType: text("entityType").notNull(),
    entityId: text("entityId").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull(),
    priority: text("priority").notNull(),
    dueAt: doublePrecision("dueAt"),
    assignedUserId: text("assignedUserId"),
    createdByUserId: text("createdByUserId"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [
    index("tasks_org_idx").on(t.organizationId),
    index("tasks_org_due_idx").on(t.organizationId, t.dueAt),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    entityType: text("entityType").notNull(),
    entityId: text("entityId").notNull(),
    kind: text("kind").notNull(),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata"),
    actorUserId: text("actorUserId"),
    occurredAt: doublePrecision("occurredAt").notNull(),
  },
  (t) => [
    index("activities_org_idx").on(t.organizationId),
    index("activities_org_time_idx").on(t.organizationId, t.occurredAt),
  ],
);

export const materials = pgTable(
  "materials",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    costCents: doublePrecision("costCents"),
    active: boolean("active").notNull(),
    epaRegistrationNumber: text("epaRegistrationNumber"),
    restrictedUse: boolean("restrictedUse"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("materials_org_idx").on(t.organizationId)],
);

export const materialApplications = pgTable(
  "materialApplications",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    visitId: text("visitId").notNull(),
    materialId: text("materialId").notNull(),
    quantity: doublePrecision("quantity").notNull(),
    unit: text("unit").notNull(),
    targetAreaId: text("targetAreaId"),
    weatherSnapshot: jsonb("weatherSnapshot"),
    notes: text("notes"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("materialApplications_org_idx").on(t.organizationId)],
);

export const equipment = pgTable(
  "equipment",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull(),
    assignedCrewId: text("assignedCrewId"),
    serialNumber: text("serialNumber"),
    maintenanceDueAt: doublePrecision("maintenanceDueAt"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("equipment_org_idx").on(t.organizationId)],
);

export const laborRateCards = pgTable(
  "laborRateCards",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    roleName: text("roleName").notNull(),
    source: text("source").notNull(),
    hourlyCostCents: doublePrecision("hourlyCostCents").notNull(),
    billableRateCents: doublePrecision("billableRateCents"),
    burdenPercent: doublePrecision("burdenPercent"),
    metroArea: text("metroArea"),
    state: text("state"),
    effectiveFrom: doublePrecision("effectiveFrom"),
    effectiveTo: doublePrecision("effectiveTo"),
    active: boolean("active").notNull(),
    metadata: jsonb("metadata"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("laborRateCards_org_idx").on(t.organizationId)],
);

export const equipmentRateCards = pgTable(
  "equipmentRateCards",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    equipmentId: text("equipmentId"),
    name: text("name").notNull(),
    category: text("category").notNull(),
    hourlyCostCents: doublePrecision("hourlyCostCents").notNull(),
    billableRateCents: doublePrecision("billableRateCents"),
    fuelCostPerHourCents: doublePrecision("fuelCostPerHourCents"),
    maintenanceReservePerHourCents: doublePrecision("maintenanceReservePerHourCents"),
    source: text("source").notNull(),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("equipmentRateCards_org_idx").on(t.organizationId)],
);

export const vendorCatalogs = pgTable(
  "vendorCatalogs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    vendorName: text("vendorName").notNull(),
    sku: text("sku"),
    itemName: text("itemName").notNull(),
    category: text("category").notNull(),
    materialId: text("materialId"),
    unit: text("unit").notNull(),
    unitCostCents: doublePrecision("unitCostCents").notNull(),
    source: text("source").notNull(),
    lastImportedAt: doublePrecision("lastImportedAt"),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("vendorCatalogs_org_idx").on(t.organizationId)],
);

export const costSnapshots = pgTable(
  "costSnapshots",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    source: text("source").notNull(),
    kind: text("kind").notNull(),
    label: text("label").notNull(),
    value: doublePrecision("value").notNull(),
    unit: text("unit").notNull(),
    region: text("region"),
    periodStart: doublePrecision("periodStart"),
    periodEnd: doublePrecision("periodEnd"),
    metadata: jsonb("metadata"),
    capturedAt: doublePrecision("capturedAt").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
  },
  (t) => [index("costSnapshots_org_idx").on(t.organizationId)],
);

export const weatherSnapshots = pgTable(
  "weatherSnapshots",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    propertyId: text("propertyId"),
    visitId: text("visitId"),
    source: text("source").notNull(),
    observedAt: doublePrecision("observedAt").notNull(),
    temperatureF: doublePrecision("temperatureF"),
    windMph: doublePrecision("windMph"),
    precipitationProbability: doublePrecision("precipitationProbability"),
    precipitationInches: doublePrecision("precipitationInches"),
    conditions: text("conditions"),
    alertSummary: text("alertSummary"),
    applicationRisk: text("applicationRisk").notNull(),
    raw: jsonb("raw"),
    createdAt: doublePrecision("createdAt").notNull(),
  },
  (t) => [index("weatherSnapshots_org_idx").on(t.organizationId)],
);

export const routeDriveTimeEstimates = pgTable(
  "routeDriveTimeEstimates",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    routePlanId: text("routePlanId"),
    visitId: text("visitId"),
    fromAddress: text("fromAddress").notNull(),
    toAddress: text("toAddress").notNull(),
    driveMinutes: doublePrecision("driveMinutes").notNull(),
    distanceMiles: doublePrecision("distanceMiles"),
    source: text("source").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("routeDriveTimeEstimates_org_idx").on(t.organizationId)],
);

export const timesheetEntries = pgTable(
  "timesheetEntries",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    userId: text("userId"),
    crewId: text("crewId"),
    jobId: text("jobId"),
    visitId: text("visitId"),
    laborRateCardId: text("laborRateCardId"),
    status: text("status").notNull(),
    roleName: text("roleName").notNull(),
    startedAt: doublePrecision("startedAt").notNull(),
    endedAt: doublePrecision("endedAt").notNull(),
    breakMinutes: doublePrecision("breakMinutes"),
    hours: doublePrecision("hours").notNull(),
    hourlyCostCents: doublePrecision("hourlyCostCents").notNull(),
    totalCostCents: doublePrecision("totalCostCents").notNull(),
    notes: text("notes"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("timesheetEntries_org_idx").on(t.organizationId)],
);

export const purchaseOrders = pgTable(
  "purchaseOrders",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    vendorName: text("vendorName").notNull(),
    status: text("status").notNull(),
    orderNumber: text("orderNumber"),
    jobId: text("jobId"),
    subtotalCents: doublePrecision("subtotalCents").notNull(),
    taxCents: doublePrecision("taxCents"),
    totalCents: doublePrecision("totalCents").notNull(),
    orderedAt: doublePrecision("orderedAt"),
    receivedAt: doublePrecision("receivedAt"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("purchaseOrders_org_idx").on(t.organizationId)],
);

export const customerInvoices = pgTable(
  "customerInvoices",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    customerId: text("customerId").notNull(),
    jobId: text("jobId"),
    estimateId: text("estimateId"),
    invoiceNumber: text("invoiceNumber").notNull(),
    status: text("status").notNull(),
    subtotalCents: doublePrecision("subtotalCents").notNull(),
    taxCents: doublePrecision("taxCents").notNull(),
    totalCents: doublePrecision("totalCents").notNull(),
    paidCents: doublePrecision("paidCents").notNull(),
    dueAt: doublePrecision("dueAt"),
    sentAt: doublePrecision("sentAt"),
    paidAt: doublePrecision("paidAt"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("customerInvoices_org_idx").on(t.organizationId)],
);

export const customerPayments = pgTable(
  "customerPayments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    customerId: text("customerId").notNull(),
    invoiceId: text("invoiceId"),
    status: text("status").notNull(),
    method: text("method").notNull(),
    amountCents: doublePrecision("amountCents").notNull(),
    receivedAt: doublePrecision("receivedAt").notNull(),
    reference: text("reference"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("customerPayments_org_idx").on(t.organizationId)],
);

export const paymentAllocations = pgTable(
  "paymentAllocations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    paymentId: text("paymentId").notNull(),
    invoiceId: text("invoiceId").notNull(),
    amountCents: doublePrecision("amountCents").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
  },
  (t) => [index("paymentAllocations_org_idx").on(t.organizationId)],
);

export const jobCostSummaries = pgTable(
  "jobCostSummaries",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    jobId: text("jobId").notNull(),
    customerId: text("customerId").notNull(),
    estimatedRevenueCents: doublePrecision("estimatedRevenueCents").notNull(),
    actualRevenueCents: doublePrecision("actualRevenueCents").notNull(),
    invoicedCents: doublePrecision("invoicedCents").notNull(),
    collectedCents: doublePrecision("collectedCents").notNull(),
    estimatedLaborCostCents: doublePrecision("estimatedLaborCostCents").notNull(),
    actualLaborCostCents: doublePrecision("actualLaborCostCents").notNull(),
    estimatedMaterialCostCents: doublePrecision("estimatedMaterialCostCents").notNull(),
    actualMaterialCostCents: doublePrecision("actualMaterialCostCents").notNull(),
    estimatedEquipmentCostCents: doublePrecision("estimatedEquipmentCostCents").notNull(),
    actualEquipmentCostCents: doublePrecision("actualEquipmentCostCents").notNull(),
    overheadCostCents: doublePrecision("overheadCostCents").notNull(),
    grossProfitCents: doublePrecision("grossProfitCents").notNull(),
    grossMarginPercent: doublePrecision("grossMarginPercent").notNull(),
    varianceCents: doublePrecision("varianceCents").notNull(),
    calculatedAt: doublePrecision("calculatedAt").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("jobCostSummaries_org_idx").on(t.organizationId)],
);

export const profitabilitySnapshots = pgTable(
  "profitabilitySnapshots",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    periodStart: doublePrecision("periodStart").notNull(),
    periodEnd: doublePrecision("periodEnd").notNull(),
    dimensionType: text("dimensionType").notNull(),
    dimensionId: text("dimensionId"),
    revenueCents: doublePrecision("revenueCents").notNull(),
    invoicedCents: doublePrecision("invoicedCents").notNull(),
    collectedCents: doublePrecision("collectedCents").notNull(),
    laborCostCents: doublePrecision("laborCostCents").notNull(),
    materialCostCents: doublePrecision("materialCostCents").notNull(),
    equipmentCostCents: doublePrecision("equipmentCostCents").notNull(),
    overheadCostCents: doublePrecision("overheadCostCents").notNull(),
    grossProfitCents: doublePrecision("grossProfitCents").notNull(),
    grossMarginPercent: doublePrecision("grossMarginPercent").notNull(),
    metadata: jsonb("metadata"),
    calculatedAt: doublePrecision("calculatedAt").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
  },
  (t) => [index("profitabilitySnapshots_org_idx").on(t.organizationId)],
);

export const tagDefinitions = pgTable(
  "tagDefinitions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    category: text("category").notNull(),
    color: text("color").notNull(),
    description: text("description"),
    system: boolean("system").notNull(),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("tagDefinitions_org_idx").on(t.organizationId)],
);

export const entityTags = pgTable(
  "entityTags",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    tagId: text("tagId").notNull(),
    entityType: text("entityType").notNull(),
    entityId: text("entityId").notNull(),
    source: text("source").notNull(),
    confidence: doublePrecision("confidence"),
    createdByUserId: text("createdByUserId"),
    createdAt: doublePrecision("createdAt").notNull(),
  },
  (t) => [index("entityTags_org_idx").on(t.organizationId)],
);

export const customerLifecycleSnapshots = pgTable(
  "customerLifecycleSnapshots",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    customerId: text("customerId").notNull(),
    snapshotDate: doublePrecision("snapshotDate").notNull(),
    segmentKeys: jsonb("segmentKeys").notNull(),
    firstWonAt: doublePrecision("firstWonAt"),
    lastServiceAt: doublePrecision("lastServiceAt"),
    lastInvoiceAt: doublePrecision("lastInvoiceAt"),
    annualRecurringRevenueCents: doublePrecision("annualRecurringRevenueCents").notNull(),
    lifetimeRevenueCents: doublePrecision("lifetimeRevenueCents").notNull(),
    lifetimeCostCents: doublePrecision("lifetimeCostCents").notNull(),
    grossProfitCents: doublePrecision("grossProfitCents").notNull(),
    grossMarginPercent: doublePrecision("grossMarginPercent").notNull(),
    estimatedLtvCents: doublePrecision("estimatedLtvCents").notNull(),
    churnRiskScore: doublePrecision("churnRiskScore").notNull(),
    churnRiskLevel: text("churnRiskLevel").notNull(),
    churnDrivers: jsonb("churnDrivers").notNull(),
    nextBestAction: text("nextBestAction"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("customerLifecycleSnapshots_org_idx").on(t.organizationId)],
);

export const pnlSnapshots = pgTable(
  "pnlSnapshots",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    periodStart: doublePrecision("periodStart").notNull(),
    periodEnd: doublePrecision("periodEnd").notNull(),
    serviceRevenueCents: doublePrecision("serviceRevenueCents").notNull(),
    recurringRevenueCents: doublePrecision("recurringRevenueCents").notNull(),
    oneTimeRevenueCents: doublePrecision("oneTimeRevenueCents").notNull(),
    laborCostCents: doublePrecision("laborCostCents").notNull(),
    materialCostCents: doublePrecision("materialCostCents").notNull(),
    equipmentCostCents: doublePrecision("equipmentCostCents").notNull(),
    subcontractorCostCents: doublePrecision("subcontractorCostCents").notNull(),
    overheadCostCents: doublePrecision("overheadCostCents").notNull(),
    adminPayrollCents: doublePrecision("adminPayrollCents").notNull(),
    salesMarketingCents: doublePrecision("salesMarketingCents").notNull(),
    softwareCents: doublePrecision("softwareCents").notNull(),
    insuranceCents: doublePrecision("insuranceCents").notNull(),
    fuelCents: doublePrecision("fuelCents").notNull(),
    rentUtilitiesCents: doublePrecision("rentUtilitiesCents").notNull(),
    grossProfitCents: doublePrecision("grossProfitCents").notNull(),
    operatingProfitCents: doublePrecision("operatingProfitCents").notNull(),
    grossMarginPercent: doublePrecision("grossMarginPercent").notNull(),
    operatingMarginPercent: doublePrecision("operatingMarginPercent").notNull(),
    metadata: jsonb("metadata"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("pnlSnapshots_org_idx").on(t.organizationId)],
);

export const dataQualityIssues = pgTable(
  "dataQualityIssues",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    kind: text("kind").notNull(),
    severity: text("severity").notNull(),
    status: text("status").notNull(),
    leadId: text("leadId"),
    customerId: text("customerId"),
    propertyId: text("propertyId"),
    fieldName: text("fieldName"),
    currentValue: text("currentValue"),
    suggestedValue: text("suggestedValue"),
    duplicateLeadIds: jsonb("duplicateLeadIds"),
    summary: text("summary").notNull(),
    ignoredByUserId: text("ignoredByUserId"),
    ignoredAt: doublePrecision("ignoredAt"),
    fixedByUserId: text("fixedByUserId"),
    fixedAt: doublePrecision("fixedAt"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("dataQualityIssues_org_idx").on(t.organizationId)],
);

export const spamRules = pgTable(
  "spamRules",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    pattern: text("pattern").notNull(),
    score: doublePrecision("score").notNull(),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("spamRules_org_idx").on(t.organizationId)],
);

export const cityNormalizationRules = pgTable(
  "cityNormalizationRules",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    rawCity: text("rawCity").notNull(),
    normalizedCity: text("normalizedCity").notNull(),
    state: text("state").notNull(),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("cityNormalizationRules_org_idx").on(t.organizationId)],
);

export const leadSavedViews = pgTable(
  "leadSavedViews",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    ownerUserId: text("ownerUserId"),
    scope: text("scope").notNull(),
    filters: jsonb("filters").notNull(),
    columns: jsonb("columns").notNull(),
    sort: jsonb("sort").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("leadSavedViews_org_idx").on(t.organizationId)],
);

export const leadStatusSettings = pgTable(
  "leadStatusSettings",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    status: text("status").notNull(),
    label: text("label").notNull(),
    color: text("color").notNull(),
    sortOrder: doublePrecision("sortOrder").notNull(),
    terminal: boolean("terminal").notNull(),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("leadStatusSettings_org_idx").on(t.organizationId)],
);

export const leadIntakeForms = pgTable(
  "leadIntakeForms",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    name: text("name").notNull(),
    source: text("source").notNull(),
    defaultOwnerUserId: text("defaultOwnerUserId"),
    defaultServiceLines: jsonb("defaultServiceLines").notNull(),
    fieldConfig: jsonb("fieldConfig").notNull(),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("leadIntakeForms_org_idx").on(t.organizationId)],
);

export const externalIntegrations = pgTable(
  "externalIntegrations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    provider: text("provider").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull(),
    config: jsonb("config").notNull(),
    lastSyncAt: doublePrecision("lastSyncAt"),
    lastError: text("lastError"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("externalIntegrations_org_idx").on(t.organizationId)],
);

export const importJobs = pgTable(
  "importJobs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    integrationId: text("integrationId"),
    source: text("source").notNull(),
    status: text("status").notNull(),
    fileName: text("fileName"),
    rowCount: doublePrecision("rowCount"),
    importedCount: doublePrecision("importedCount"),
    skippedCount: doublePrecision("skippedCount"),
    failedCount: doublePrecision("failedCount"),
    startedAt: doublePrecision("startedAt"),
    completedAt: doublePrecision("completedAt"),
    createdByUserId: text("createdByUserId"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("importJobs_org_idx").on(t.organizationId)],
);

export const importRows = pgTable(
  "importRows",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    importJobId: text("importJobId").notNull(),
    rowNumber: doublePrecision("rowNumber").notNull(),
    status: text("status").notNull(),
    raw: jsonb("raw").notNull(),
    mapped: jsonb("mapped"),
    targetEntityType: text("targetEntityType"),
    targetEntityId: text("targetEntityId"),
    error: text("error"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("importRows_org_idx").on(t.organizationId)],
);

export const dashboardWidgets = pgTable(
  "dashboardWidgets",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    key: text("key").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    config: jsonb("config").notNull(),
    sortOrder: doublePrecision("sortOrder").notNull(),
    active: boolean("active").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("dashboardWidgets_org_idx").on(t.organizationId)],
);

export const featureFlags = pgTable(
  "featureFlags",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId"),
    key: text("key").notNull(),
    enabled: boolean("enabled").notNull(),
    config: jsonb("config"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("featureFlags_org_idx").on(t.organizationId)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    stripeCustomerId: text("stripeCustomerId"),
    stripeSubscriptionId: text("stripeSubscriptionId"),
    plan: text("plan").notNull(),
    status: text("status").notNull(),
    seats: doublePrecision("seats").notNull(),
    currentPeriodStart: doublePrecision("currentPeriodStart"),
    currentPeriodEnd: doublePrecision("currentPeriodEnd"),
    trialEndsAt: doublePrecision("trialEndsAt"),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("subscriptions_org_idx").on(t.organizationId)],
);

export const onboardingChecklistItems = pgTable(
  "onboardingChecklistItems",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    key: text("key").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    completedAt: doublePrecision("completedAt"),
    completedByUserId: text("completedByUserId"),
    sortOrder: doublePrecision("sortOrder").notNull(),
    createdAt: doublePrecision("createdAt").notNull(),
    updatedAt: doublePrecision("updatedAt").notNull(),
  },
  (t) => [index("onboardingChecklistItems_org_idx").on(t.organizationId)],
);

export const auditEvents = pgTable(
  "auditEvents",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    actorUserId: text("actorUserId"),
    action: text("action").notNull(),
    entityType: text("entityType").notNull(),
    entityId: text("entityId").notNull(),
    summary: text("summary").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    requestId: text("requestId"),
    createdAt: doublePrecision("createdAt").notNull(),
  },
  (t) => [index("auditEvents_org_idx").on(t.organizationId)],
);

export type OrganizationRow = InferSelectModel<typeof organizations>;
export type UserRow = InferSelectModel<typeof users>;
export type MembershipRow = InferSelectModel<typeof memberships>;
export type CustomerRow = InferSelectModel<typeof customers>;
export type ContactRow = InferSelectModel<typeof contacts>;
export type PropertyRow = InferSelectModel<typeof properties>;
export type LeadRow = InferSelectModel<typeof leads>;
export type OpportunityRow = InferSelectModel<typeof opportunities>;
export type EstimateRow = InferSelectModel<typeof estimates>;
export type JobRow = InferSelectModel<typeof jobs>;
export type JobVisitRow = InferSelectModel<typeof jobVisits>;
export type CrewRow = InferSelectModel<typeof crews>;
export type TaskRow = InferSelectModel<typeof tasks>;
export type ActivityRow = InferSelectModel<typeof activities>;
export type MaterialRow = InferSelectModel<typeof materials>;
