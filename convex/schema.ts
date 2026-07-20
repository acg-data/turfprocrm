import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("manager"),
  v.literal("sales"),
  v.literal("dispatcher"),
  v.literal("crew_lead"),
  v.literal("technician"),
);

const memberStatus = v.union(v.literal("active"), v.literal("invited"), v.literal("disabled"), v.literal("expired"), v.literal("revoked"));
const customerType = v.union(v.literal("residential"), v.literal("commercial"), v.literal("hoa"), v.literal("municipal"));
const customerStatus = v.union(v.literal("active"), v.literal("prospect"), v.literal("inactive"), v.literal("do_not_service"));
const accountType = v.union(v.literal("residential"), v.literal("commercial"));
const leadGrade = v.union(v.literal("a"), v.literal("b"), v.literal("c"), v.literal("d"), v.literal("f"), v.literal("ungraded"));
const leadStatus = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("do_estimate"),
  v.literal("estimate_provided"),
  v.literal("follow_up"),
  v.literal("waiting"),
  v.literal("converted"),
  v.literal("lost_confirmed"),
  v.literal("lost_assumed"),
  v.literal("unqualified"),
  v.literal("passed_on"),
  v.literal("disqualified"),
  v.literal("spam"),
);
const urgency = v.union(v.literal("low"), v.literal("normal"), v.literal("high"));
const opportunityStage = v.union(
  v.literal("new"),
  v.literal("qualified"),
  v.literal("estimating"),
  v.literal("proposal_sent"),
  v.literal("won"),
  v.literal("lost"),
);
const estimateStatus = v.union(v.literal("draft"), v.literal("sent"), v.literal("accepted"), v.literal("declined"), v.literal("expired"));
const estimateApprovalStatus = v.union(v.literal("not_required"), v.literal("pending"), v.literal("approved"), v.literal("rejected"));
const approvalRequestStatus = v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("canceled"));
const jobStatus = v.union(v.literal("scheduled"), v.literal("in_progress"), v.literal("blocked"), v.literal("completed"), v.literal("canceled"));
const changeOrderStatus = v.union(v.literal("draft"), v.literal("pending_approval"), v.literal("approved"), v.literal("rejected"), v.literal("canceled"));
const visitStatus = v.union(v.literal("scheduled"), v.literal("en_route"), v.literal("on_site"), v.literal("complete"), v.literal("missed"), v.literal("canceled"));
const taskStatus = v.union(v.literal("open"), v.literal("in_progress"), v.literal("done"), v.literal("canceled"));
const priority = v.union(v.literal("low"), v.literal("normal"), v.literal("high"));
const fieldIssueCategory = v.union(
  v.literal("damage"),
  v.literal("pest_activity"),
  v.literal("customer_concern"),
  v.literal("access_issue"),
  v.literal("upsell_opportunity"),
  v.literal("safety_hazard"),
  v.literal("other"),
);
const fieldIssueSeverity = v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent"));
const fieldIssueStatus = v.union(v.literal("open"), v.literal("reviewed"), v.literal("resolved"), v.literal("dismissed"));
const serviceCategory = v.union(
  v.literal("lawn_care"),
  v.literal("landscaping"),
  v.literal("pest_control"),
  v.literal("tree_shrub"),
  v.literal("irrigation"),
  v.literal("snow"),
  v.literal("maintenance"),
);
const entityType = v.union(
  v.literal("organization"),
  v.literal("customer"),
  v.literal("contact"),
  v.literal("lead"),
  v.literal("opportunity"),
  v.literal("estimate"),
  v.literal("job"),
  v.literal("visit"),
  v.literal("property"),
  v.literal("task"),
  v.literal("crew"),
  v.literal("material"),
  v.literal("equipment"),
  v.literal("service_catalog_item"),
  v.literal("price_book"),
  v.literal("route_plan"),
  v.literal("data_quality_issue"),
  v.literal("import"),
  v.literal("export"),
  v.literal("automation"),
  v.literal("subscription"),
  v.literal("file"),
  v.literal("photo"),
  v.literal("customer_invoice"),
  v.literal("customer_payment"),
  v.literal("timesheet_entry"),
  v.literal("field_issue"),
  v.literal("labor_rate_card"),
  v.literal("equipment_rate_card"),
  v.literal("vendor_catalog"),
  v.literal("purchase_order"),
  v.literal("cost_snapshot"),
  v.literal("weather_snapshot"),
  v.literal("job_cost_summary"),
  v.literal("profitability_snapshot"),
  v.literal("tag_definition"),
  v.literal("entity_tag"),
  v.literal("customer_lifecycle_snapshot"),
  v.literal("pnl_snapshot"),
);
const activityKind = v.union(
  v.literal("call"),
  v.literal("email"),
  v.literal("sms"),
  v.literal("note"),
  v.literal("status_change"),
  v.literal("estimate"),
  v.literal("visit"),
  v.literal("assignment"),
  v.literal("file"),
  v.literal("system"),
);
const dataQualityIssueKind = v.union(
  v.literal("duplicate"),
  v.literal("missing_name"),
  v.literal("missing_contact"),
  v.literal("missing_status"),
  v.literal("bad_phone"),
  v.literal("invalid_email"),
  v.literal("city_spelling"),
  v.literal("missing_company_assignment"),
  v.literal("missing_address"),
  v.literal("out_of_territory"),
  v.literal("potential_spam"),
  v.literal("stale_follow_up"),
  v.literal("price_missing"),
  v.literal("unknown_service_line"),
  v.literal("plan_limit"),
);
const issueStatus = v.union(v.literal("open"), v.literal("ignored"), v.literal("fixed"), v.literal("false_positive"));
const severity = v.union(v.literal("info"), v.literal("warning"), v.literal("critical"));
const integrationProvider = v.union(
  v.literal("google_sheets"),
  v.literal("google_maps"),
  v.literal("clerk"),
  v.literal("stripe"),
  v.literal("convex"),
  v.literal("postgres_reporting"),
  v.literal("csv"),
  v.literal("manual"),
);
const integrationStatus = v.union(v.literal("planned"), v.literal("enabled"), v.literal("disabled"), v.literal("error"));
const importStatus = v.union(v.literal("queued"), v.literal("processing"), v.literal("completed"), v.literal("failed"), v.literal("canceled"));
const importRowStatus = v.union(v.literal("pending"), v.literal("imported"), v.literal("skipped"), v.literal("failed"));
const exportStatus = v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed"));
const billingPlan = v.union(v.literal("free"), v.literal("starter"), v.literal("pro"), v.literal("growth"), v.literal("enterprise"));
const subscriptionStatus = v.union(
  v.literal("trialing"),
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("unpaid"),
  v.literal("incomplete"),
  v.literal("incomplete_expired"),
  v.literal("paused"),
  v.literal("manual"),
);
const routeStatus = v.union(v.literal("draft"), v.literal("published"), v.literal("in_progress"), v.literal("completed"));
const automationStatus = v.union(v.literal("draft"), v.literal("active"), v.literal("paused"), v.literal("archived"));
const costSource = v.union(v.literal("admin_override"), v.literal("vendor_import"), v.literal("nws"), v.literal("bls"), v.literal("fred"), v.literal("world_bank"), v.literal("manual"));
const timesheetStatus = v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("rejected"));
const customerInvoiceStatus = v.union(v.literal("draft"), v.literal("sent"), v.literal("partially_paid"), v.literal("paid"), v.literal("overdue"), v.literal("void"));
const paymentStatus = v.union(v.literal("pending"), v.literal("posted"), v.literal("failed"), v.literal("refunded"));
const tagCategory = v.union(v.literal("customer_segment"), v.literal("service_line"), v.literal("lead_source"), v.literal("profitability"), v.literal("risk"), v.literal("property"), v.literal("operations"), v.literal("marketing"), v.literal("custom"));
const tagSource = v.union(v.literal("manual"), v.literal("automation"), v.literal("import"), v.literal("system"));
const churnRiskLevel = v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"));

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    industryFocus: v.union(v.literal("landscaping"), v.literal("pest_control"), v.literal("both")),
    timezone: v.string(),
    defaultCurrency: v.optional(v.string()),
    billingPlan: v.optional(billingPlan),
    subscriptionStatus: v.optional(subscriptionStatus),
    trialEndsAt: v.optional(v.number()),
    serviceTerritory: v.optional(v.array(v.string())),
    settings: v.optional(v.any()),
    createdByClerkUserId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_created_by", ["createdByClerkUserId"]),

  users: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
    timezone: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_email", ["email"]),

  memberships: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    clerkOrganizationId: v.optional(v.string()),
    role,
    status: memberStatus,
    invitedEmail: v.optional(v.string()),
    invitedByUserId: v.optional(v.id("users")),
    inviteToken: v.optional(v.string()),
    inviteExpiresAt: v.optional(v.number()),
    inviteAcceptedAt: v.optional(v.number()),
    inviteRevokedAt: v.optional(v.number()),
    fieldPinEnabled: v.optional(v.boolean()),
    notificationProfileId: v.optional(v.id("notificationPreferences")),
    joinedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["organizationId"])
    .index("by_org_user", ["organizationId", "userId"])
    .index("by_clerk_org", ["clerkOrganizationId"]),

  customers: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    type: customerType,
    status: customerStatus,
    source: v.optional(v.string()),
    ownerUserId: v.optional(v.id("users")),
    tags: v.array(v.string()),
    lifetimeValueCents: v.optional(v.number()),
    balanceCents: v.optional(v.number()),
    lastContactedAt: v.optional(v.number()),
    doNotContact: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_owner", ["organizationId", "ownerUserId"])
    .index("by_org_updated", ["organizationId", "updatedAt"]),

  contacts: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    name: v.string(),
    roleTitle: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    workPhone: v.optional(v.string()),
    preferredChannel: v.optional(v.union(v.literal("phone"), v.literal("email"), v.literal("sms"))),
    isPrimary: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_customer", ["customerId"])
    .index("by_org_customer", ["organizationId", "customerId"]),

  properties: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    label: v.string(),
    street: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    county: v.optional(v.string()),
    gateCode: v.optional(v.string()),
    notes: v.optional(v.string()),
    geo: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    lawnSizeSqFt: v.optional(v.number()),
    lotSizeSqFt: v.optional(v.number()),
    serviceWarnings: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_customer", ["customerId"])
    .index("by_org_customer", ["organizationId", "customerId"])
    .index("by_org_city", ["organizationId", "city"]),

  propertyAreas: defineTable({
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    name: v.string(),
    kind: v.union(v.literal("front_lawn"), v.literal("back_lawn"), v.literal("bed"), v.literal("perimeter"), v.literal("tree_shrub"), v.literal("other")),
    size: v.optional(v.number()),
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_property", ["propertyId"]),

  leads: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.optional(v.id("customers")),
    contactId: v.optional(v.id("contacts")),
    propertyId: v.optional(v.id("properties")),
    title: v.string(),
    source: v.string(),
    sourceDetail: v.optional(v.string()),
    leadType: v.optional(v.union(v.literal("phone_call"), v.literal("form"), v.literal("direct_email"), v.literal("referral"), v.literal("other"))),
    companyAssignment: v.optional(v.string()),
    accountType: v.optional(accountType),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    homePhone: v.optional(v.string()),
    workPhone: v.optional(v.string()),
    mobilePhone: v.optional(v.string()),
    normalizedPhone: v.optional(v.string()),
    message: v.optional(v.string()),
    estimateNotes: v.optional(v.string()),
    programRequests: v.optional(v.array(serviceCategory)),
    lawnSizeSqFt: v.optional(v.number()),
    estimatedServiceDate: v.optional(v.number()),
    isEstimatedDate: v.optional(v.boolean()),
    grade: v.optional(leadGrade),
    status: leadStatus,
    unqualifiedReason: v.optional(v.string()),
    lossReason: v.optional(v.string()),
    urgency,
    ownerUserId: v.optional(v.id("users")),
    hiddenAt: v.optional(v.number()),
    hiddenByUserId: v.optional(v.id("users")),
    spamScore: v.optional(v.number()),
    spamReasons: v.optional(v.array(v.string())),
    spamReviewedAt: v.optional(v.number()),
    duplicateClusterKey: v.optional(v.string()),
    qualityScore: v.optional(v.number()),
    receivedAt: v.optional(v.number()),
    convertedAt: v.optional(v.number()),
    externalSourceId: v.optional(v.string()),
    rawPayload: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_owner", ["organizationId", "ownerUserId"])
    .index("by_org_created", ["organizationId", "createdAt"])
    .index("by_org_received", ["organizationId", "receivedAt"])
    .index("by_org_grade", ["organizationId", "grade"])
    .index("by_org_quality", ["organizationId", "qualityScore"])
    .index("by_org_spam", ["organizationId", "spamScore"])
    .index("by_duplicate_cluster", ["organizationId", "duplicateClusterKey"]),

  opportunities: defineTable({
    organizationId: v.id("organizations"),
    leadId: v.optional(v.id("leads")),
    customerId: v.id("customers"),
    propertyId: v.optional(v.id("properties")),
    title: v.string(),
    stage: opportunityStage,
    valueCents: v.number(),
    closeProbability: v.number(),
    expectedCloseDate: v.optional(v.number()),
    ownerUserId: v.optional(v.id("users")),
    serviceLines: v.array(serviceCategory),
    lossReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_stage", ["organizationId", "stage"])
    .index("by_org_owner", ["organizationId", "ownerUserId"])
    .index("by_customer", ["customerId"])
    .index("by_org_updated", ["organizationId", "updatedAt"]),

  estimates: defineTable({
    organizationId: v.id("organizations"),
    opportunityId: v.optional(v.id("opportunities")),
    customerId: v.id("customers"),
    propertyId: v.optional(v.id("properties")),
    estimateNumber: v.string(),
    status: estimateStatus,
    approvalStatus: v.optional(estimateApprovalStatus),
    approvalRequestId: v.optional(v.id("approvalRequests")),
    subtotalCents: v.number(),
    discountCents: v.optional(v.number()),
    taxCents: v.number(),
    totalCents: v.number(),
    sentAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
    acceptedByName: v.optional(v.string()),
    acceptedByEmail: v.optional(v.string()),
    acceptanceSource: v.optional(v.union(v.literal("customer_portal"), v.literal("email"), v.literal("verbal"), v.literal("office"))),
    acceptanceNote: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    terms: v.optional(v.string()),
    templateId: v.optional(v.id("estimateTemplates")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_opportunity", ["opportunityId"])
    .index("by_customer", ["customerId"]),

  approvalRequests: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    opportunityId: v.optional(v.id("opportunities")),
    customerId: v.id("customers"),
    requestedByUserId: v.optional(v.id("users")),
    assignedApproverUserId: v.optional(v.id("users")),
    status: approvalRequestStatus,
    reasonDetails: v.array(
      v.object({
        code: v.string(),
        label: v.string(),
        severity: v.union(v.literal("warning"), v.literal("critical")),
        detail: v.string(),
        impactCents: v.optional(v.number()),
      }),
    ),
    riskScore: v.number(),
    grossMarginPercent: v.number(),
    discountCents: v.number(),
    discountPercent: v.number(),
    estimatedCostCents: v.number(),
    totalCents: v.number(),
    dueAt: v.number(),
    decidedByUserId: v.optional(v.id("users")),
    decidedAt: v.optional(v.number()),
    decisionComment: v.optional(v.string()),
    requestedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_estimate", ["estimateId"])
    .index("by_org_assignee_status", ["organizationId", "assignedApproverUserId", "status"]),

  estimateLineItems: defineTable({
    organizationId: v.id("organizations"),
    estimateId: v.id("estimates"),
    servicePackageId: v.optional(v.id("servicePackages")),
    serviceCatalogItemId: v.optional(v.id("serviceCatalogItems")),
    priceBookItemId: v.optional(v.id("priceBookItems")),
    name: v.string(),
    description: v.optional(v.string()),
    quantity: v.number(),
    unit: v.string(),
    unitPriceCents: v.number(),
    totalCents: v.number(),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_estimate", ["estimateId"]),

  estimateTemplates: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    serviceCategory,
    introCopy: v.optional(v.string()),
    terms: v.optional(v.string()),
    defaultLineItems: v.array(v.any()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"]),

  serviceCatalogItems: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    category: serviceCategory,
    description: v.optional(v.string()),
    defaultUnit: v.string(),
    defaultPriceCents: v.number(),
    durationMinutes: v.optional(v.number()),
    seasonStartMonth: v.optional(v.number()),
    seasonEndMonth: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"])
    .index("by_org_category", ["organizationId", "category"]),

  servicePackages: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    category: serviceCategory,
    description: v.optional(v.string()),
    includedServiceCatalogItemIds: v.array(v.id("serviceCatalogItems")),
    defaultPriceCents: v.number(),
    billingCadence: v.union(v.literal("one_time"), v.literal("monthly"), v.literal("seasonal"), v.literal("annual")),
    laborHours: v.optional(v.number()),
    laborRateCents: v.optional(v.number()),
    materialCostCents: v.optional(v.number()),
    equipmentCostCents: v.optional(v.number()),
    overheadPercent: v.optional(v.number()),
    targetMarginPercent: v.optional(v.number()),
    checklistTemplateId: v.optional(v.id("checklistTemplates")),
    checklistDefaults: v.optional(v.array(v.string())),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"]),

  priceBooks: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    effectiveFrom: v.optional(v.number()),
    effectiveTo: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"]),

  priceBookItems: defineTable({
    organizationId: v.id("organizations"),
    priceBookId: v.id("priceBooks"),
    serviceCatalogItemId: v.optional(v.id("serviceCatalogItems")),
    name: v.string(),
    unit: v.string(),
    basePriceCents: v.number(),
    minPriceCents: v.optional(v.number()),
    pricingModel: v.union(v.literal("flat"), v.literal("per_sq_ft"), v.literal("per_acre"), v.literal("per_visit"), v.literal("per_crew_hour")),
    formula: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_price_book", ["priceBookId"])
    .index("by_service", ["serviceCatalogItemId"]),

  pricingRules: defineTable({
    organizationId: v.id("organizations"),
    priceBookItemId: v.id("priceBookItems"),
    name: v.string(),
    condition: v.any(),
    adjustmentType: v.union(v.literal("fixed"), v.literal("percent"), v.literal("multiplier")),
    adjustmentValue: v.number(),
    order: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_price_book_item", ["priceBookItemId"]),

  pricingCalculatorSessions: defineTable({
    organizationId: v.id("organizations"),
    leadId: v.optional(v.id("leads")),
    estimateId: v.optional(v.id("estimates")),
    propertyId: v.optional(v.id("properties")),
    inputs: v.any(),
    outputs: v.any(),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_lead", ["leadId"])
    .index("by_estimate", ["estimateId"]),

  jobs: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    propertyId: v.optional(v.id("properties")),
    opportunityId: v.optional(v.id("opportunities")),
    estimateId: v.optional(v.id("estimates")),
    title: v.string(),
    status: jobStatus,
    priority,
    recurrence: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    managerUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_customer", ["customerId"])
    .index("by_org_manager", ["organizationId", "managerUserId"]),

  changeOrders: defineTable({
    organizationId: v.id("organizations"),
    jobId: v.id("jobs"),
    customerId: v.id("customers"),
    propertyId: v.optional(v.id("properties")),
    estimateId: v.optional(v.id("estimates")),
    title: v.string(),
    description: v.string(),
    status: changeOrderStatus,
    requestedByName: v.optional(v.string()),
    approvedByName: v.optional(v.string()),
    approvedByEmail: v.optional(v.string()),
    revenueDeltaCents: v.number(),
    estimatedCostDeltaCents: v.number(),
    grossProfitDeltaCents: v.number(),
    grossMarginPercent: v.number(),
    scheduleImpactDays: v.number(),
    requestedAt: v.number(),
    approvedAt: v.optional(v.number()),
    taskId: v.optional(v.id("tasks")),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_job", ["jobId"])
    .index("by_customer", ["customerId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_updated", ["organizationId", "updatedAt"]),

  recurringServicePlans: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    propertyId: v.optional(v.id("properties")),
    jobId: v.optional(v.id("jobs")),
    crewId: v.optional(v.id("crews")),
    name: v.string(),
    frequency: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly"), v.literal("seasonal"), v.literal("custom")),
    intervalDays: v.number(),
    visitDurationMinutes: v.number(),
    nextRunAt: v.number(),
    lastGeneratedAt: v.optional(v.number()),
    generatedVisitIds: v.optional(v.array(v.id("jobVisits"))),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("completed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_job", ["jobId"])
    .index("by_customer", ["customerId"])
    .index("by_org_next_run", ["organizationId", "nextRunAt"]),

  jobPhases: defineTable({
    organizationId: v.id("organizations"),
    jobId: v.id("jobs"),
    name: v.string(),
    status: jobStatus,
    sortOrder: v.number(),
    startDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_job", ["jobId"]),

  jobVisits: defineTable({
    organizationId: v.id("organizations"),
    jobId: v.id("jobs"),
    customerId: v.id("customers"),
    propertyId: v.optional(v.id("properties")),
    scheduledStart: v.number(),
    scheduledEnd: v.number(),
    status: visitStatus,
    routeOrder: v.optional(v.number()),
    assignedCrewId: v.optional(v.id("crews")),
    checklistTemplateId: v.optional(v.id("checklistTemplates")),
    checklist: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        isDone: v.boolean(),
        completedAt: v.optional(v.number()),
      }),
    ),
    notes: v.optional(v.string()),
    issueFlags: v.optional(v.array(v.string())),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_date", ["organizationId", "scheduledStart"])
    .index("by_job", ["jobId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_crew_date", ["assignedCrewId", "scheduledStart"]),

  visitAssignments: defineTable({
    organizationId: v.id("organizations"),
    visitId: v.id("jobVisits"),
    crewId: v.optional(v.id("crews")),
    userId: v.optional(v.id("users")),
    role: v.string(),
    status: v.union(v.literal("assigned"), v.literal("accepted"), v.literal("declined")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_visit", ["visitId"])
    .index("by_crew", ["crewId"])
    .index("by_user", ["userId"]),

  checklistTemplates: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    category: serviceCategory,
    items: v.array(v.object({ id: v.string(), label: v.string(), required: v.boolean() })),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"]),

  routePlans: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    serviceDate: v.number(),
    crewId: v.optional(v.id("crews")),
    status: routeStatus,
    startAddress: v.optional(v.string()),
    endAddress: v.optional(v.string()),
    totalDriveMinutes: v.optional(v.number()),
    totalServiceMinutes: v.optional(v.number()),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_date", ["organizationId", "serviceDate"])
    .index("by_crew_date", ["crewId", "serviceDate"]),

  routeStops: defineTable({
    organizationId: v.id("organizations"),
    routePlanId: v.id("routePlans"),
    visitId: v.id("jobVisits"),
    stopOrder: v.number(),
    plannedArrival: v.optional(v.number()),
    plannedDeparture: v.optional(v.number()),
    driveMinutesFromPrevious: v.optional(v.number()),
    mapUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_route", ["routePlanId"])
    .index("by_visit", ["visitId"]),

  crews: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    color: v.string(),
    active: v.boolean(),
    capacityMinutesPerDay: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"]),

  crewMembers: defineTable({
    organizationId: v.id("organizations"),
    crewId: v.id("crews"),
    userId: v.id("users"),
    role: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_crew", ["crewId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"]),

  tasks: defineTable({
    organizationId: v.id("organizations"),
    entityType,
    entityId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: taskStatus,
    priority,
    dueAt: v.optional(v.number()),
    assignedUserId: v.optional(v.id("users")),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_assignee", ["organizationId", "assignedUserId"])
    .index("by_org_due", ["organizationId", "dueAt"])
    .index("by_entity", ["entityType", "entityId"]),

  fieldIssues: defineTable({
    organizationId: v.id("organizations"),
    visitId: v.id("jobVisits"),
    jobId: v.id("jobs"),
    customerId: v.id("customers"),
    propertyId: v.optional(v.id("properties")),
    taskId: v.optional(v.id("tasks")),
    opportunityId: v.optional(v.id("opportunities")),
    category: fieldIssueCategory,
    severity: fieldIssueSeverity,
    status: fieldIssueStatus,
    summary: v.string(),
    details: v.optional(v.string()),
    customerVisible: v.boolean(),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_visit", ["visitId"])
    .index("by_task", ["taskId"])
    .index("by_opportunity", ["opportunityId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_category", ["organizationId", "category"])
    .index("by_org_created", ["organizationId", "createdAt"]),

  activities: defineTable({
    organizationId: v.id("organizations"),
    entityType,
    entityId: v.string(),
    kind: activityKind,
    summary: v.string(),
    metadata: v.optional(v.any()),
    actorUserId: v.optional(v.id("users")),
    occurredAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_org_time", ["organizationId", "occurredAt"]),

  notes: defineTable({
    organizationId: v.id("organizations"),
    entityType,
    entityId: v.string(),
    body: v.string(),
    visibility: v.union(v.literal("internal"), v.literal("customer")),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_entity", ["entityType", "entityId"]),

  files: defineTable({
    organizationId: v.id("organizations"),
    entityType,
    entityId: v.string(),
    storageId: v.optional(v.id("_storage")),
    fileName: v.string(),
    contentType: v.optional(v.string()),
    size: v.optional(v.number()),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_entity", ["entityType", "entityId"]),

  photos: defineTable({
    organizationId: v.id("organizations"),
    visitId: v.optional(v.id("jobVisits")),
    propertyId: v.optional(v.id("properties")),
    jobId: v.optional(v.id("jobs")),
    fileId: v.optional(v.id("files")),
    storageId: v.optional(v.id("_storage")),
    caption: v.optional(v.string()),
    type: v.union(v.literal("before"), v.literal("after"), v.literal("issue"), v.literal("general")),
    createdByUserId: v.optional(v.id("users")),
    takenAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_visit", ["visitId"])
    .index("by_property", ["propertyId"])
    .index("by_job", ["jobId"]),

  materials: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    unit: v.string(),
    costCents: v.optional(v.number()),
    active: v.boolean(),
    epaRegistrationNumber: v.optional(v.string()),
    restrictedUse: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"]),

  materialApplications: defineTable({
    organizationId: v.id("organizations"),
    visitId: v.id("jobVisits"),
    materialId: v.id("materials"),
    quantity: v.number(),
    unit: v.string(),
    targetAreaId: v.optional(v.id("propertyAreas")),
    weatherSnapshot: v.optional(v.any()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_visit", ["visitId"])
    .index("by_material", ["materialId"]),

  equipment: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    type: v.string(),
    status: v.union(v.literal("available"), v.literal("assigned"), v.literal("maintenance"), v.literal("retired")),
    assignedCrewId: v.optional(v.id("crews")),
    serialNumber: v.optional(v.string()),
    maintenanceDueAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_crew", ["assignedCrewId"]),

  laborRateCards: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    roleName: v.string(),
    source: costSource,
    hourlyCostCents: v.number(),
    billableRateCents: v.optional(v.number()),
    burdenPercent: v.optional(v.number()),
    metroArea: v.optional(v.string()),
    state: v.optional(v.string()),
    effectiveFrom: v.optional(v.number()),
    effectiveTo: v.optional(v.number()),
    active: v.boolean(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"])
    .index("by_org_role", ["organizationId", "roleName"]),

  equipmentRateCards: defineTable({
    organizationId: v.id("organizations"),
    equipmentId: v.optional(v.id("equipment")),
    name: v.string(),
    category: v.string(),
    hourlyCostCents: v.number(),
    billableRateCents: v.optional(v.number()),
    fuelCostPerHourCents: v.optional(v.number()),
    maintenanceReservePerHourCents: v.optional(v.number()),
    source: costSource,
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"])
    .index("by_equipment", ["equipmentId"]),

  vendorCatalogs: defineTable({
    organizationId: v.id("organizations"),
    vendorName: v.string(),
    sku: v.optional(v.string()),
    itemName: v.string(),
    category: serviceCategory,
    materialId: v.optional(v.id("materials")),
    unit: v.string(),
    unitCostCents: v.number(),
    source: costSource,
    lastImportedAt: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_vendor", ["organizationId", "vendorName"])
    .index("by_material", ["materialId"])
    .index("by_org_active", ["organizationId", "active"]),

  costSnapshots: defineTable({
    organizationId: v.id("organizations"),
    source: costSource,
    kind: v.union(v.literal("labor"), v.literal("fertilizer_index"), v.literal("fuel_index"), v.literal("material"), v.literal("overhead")),
    label: v.string(),
    value: v.number(),
    unit: v.string(),
    region: v.optional(v.string()),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),
    metadata: v.optional(v.any()),
    capturedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_kind", ["organizationId", "kind"])
    .index("by_org_source", ["organizationId", "source"])
    .index("by_org_time", ["organizationId", "capturedAt"]),

  weatherSnapshots: defineTable({
    organizationId: v.id("organizations"),
    propertyId: v.optional(v.id("properties")),
    visitId: v.optional(v.id("jobVisits")),
    source: costSource,
    observedAt: v.number(),
    temperatureF: v.optional(v.number()),
    windMph: v.optional(v.number()),
    precipitationProbability: v.optional(v.number()),
    precipitationInches: v.optional(v.number()),
    conditions: v.optional(v.string()),
    alertSummary: v.optional(v.string()),
    applicationRisk: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    raw: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_property", ["propertyId"])
    .index("by_visit", ["visitId"])
    .index("by_org_time", ["organizationId", "observedAt"]),

  routeDriveTimeEstimates: defineTable({
    organizationId: v.id("organizations"),
    routePlanId: v.optional(v.id("routePlans")),
    visitId: v.optional(v.id("jobVisits")),
    fromAddress: v.string(),
    toAddress: v.string(),
    driveMinutes: v.number(),
    distanceMiles: v.optional(v.number()),
    source: v.union(v.literal("google_maps_link"), v.literal("manual"), v.literal("estimated")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_route", ["routePlanId"])
    .index("by_visit", ["visitId"]),

  timesheetEntries: defineTable({
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    crewId: v.optional(v.id("crews")),
    jobId: v.optional(v.id("jobs")),
    visitId: v.optional(v.id("jobVisits")),
    laborRateCardId: v.optional(v.id("laborRateCards")),
    status: timesheetStatus,
    roleName: v.string(),
    startSource: v.optional(v.union(v.literal("manual"), v.literal("gps"))),
    startedLatitude: v.optional(v.number()),
    startedLongitude: v.optional(v.number()),
    startedAt: v.number(),
    endedAt: v.number(),
    breakMinutes: v.optional(v.number()),
    hours: v.number(),
    hourlyCostCents: v.number(),
    totalCostCents: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_job", ["jobId"])
    .index("by_visit", ["visitId"])
    .index("by_user", ["userId"])
    .index("by_org_status", ["organizationId", "status"]),

  purchaseOrders: defineTable({
    organizationId: v.id("organizations"),
    vendorName: v.string(),
    status: v.union(v.literal("draft"), v.literal("ordered"), v.literal("received"), v.literal("canceled")),
    orderNumber: v.optional(v.string()),
    jobId: v.optional(v.id("jobs")),
    subtotalCents: v.number(),
    taxCents: v.optional(v.number()),
    totalCents: v.number(),
    orderedAt: v.optional(v.number()),
    receivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_job", ["jobId"])
    .index("by_org_status", ["organizationId", "status"]),

  customerInvoices: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    jobId: v.optional(v.id("jobs")),
    estimateId: v.optional(v.id("estimates")),
    invoiceNumber: v.string(),
    status: customerInvoiceStatus,
    subtotalCents: v.number(),
    taxCents: v.number(),
    totalCents: v.number(),
    paidCents: v.number(),
    dueAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_customer", ["customerId"])
    .index("by_job", ["jobId"])
    .index("by_org_status", ["organizationId", "status"]),

  customerPayments: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    invoiceId: v.optional(v.id("customerInvoices")),
    status: paymentStatus,
    method: v.union(v.literal("cash"), v.literal("check"), v.literal("card"), v.literal("ach"), v.literal("other")),
    amountCents: v.number(),
    receivedAt: v.number(),
    reference: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_customer", ["customerId"])
    .index("by_invoice", ["invoiceId"])
    .index("by_org_status", ["organizationId", "status"]),

  paymentAllocations: defineTable({
    organizationId: v.id("organizations"),
    paymentId: v.id("customerPayments"),
    invoiceId: v.id("customerInvoices"),
    amountCents: v.number(),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_payment", ["paymentId"])
    .index("by_invoice", ["invoiceId"]),

  jobCostSummaries: defineTable({
    organizationId: v.id("organizations"),
    jobId: v.id("jobs"),
    customerId: v.id("customers"),
    estimatedRevenueCents: v.number(),
    actualRevenueCents: v.number(),
    invoicedCents: v.number(),
    collectedCents: v.number(),
    estimatedLaborCostCents: v.number(),
    actualLaborCostCents: v.number(),
    estimatedMaterialCostCents: v.number(),
    actualMaterialCostCents: v.number(),
    estimatedEquipmentCostCents: v.number(),
    actualEquipmentCostCents: v.number(),
    overheadCostCents: v.number(),
    grossProfitCents: v.number(),
    grossMarginPercent: v.number(),
    varianceCents: v.number(),
    calculatedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_job", ["jobId"])
    .index("by_customer", ["customerId"])
    .index("by_org_time", ["organizationId", "calculatedAt"]),

  profitabilitySnapshots: defineTable({
    organizationId: v.id("organizations"),
    periodStart: v.number(),
    periodEnd: v.number(),
    dimensionType: v.union(v.literal("organization"), v.literal("service_category"), v.literal("crew"), v.literal("customer"), v.literal("property"), v.literal("job")),
    dimensionId: v.optional(v.string()),
    revenueCents: v.number(),
    invoicedCents: v.number(),
    collectedCents: v.number(),
    laborCostCents: v.number(),
    materialCostCents: v.number(),
    equipmentCostCents: v.number(),
    overheadCostCents: v.number(),
    grossProfitCents: v.number(),
    grossMarginPercent: v.number(),
    metadata: v.optional(v.any()),
    calculatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_period", ["organizationId", "periodStart", "periodEnd"])
    .index("by_dimension", ["organizationId", "dimensionType", "dimensionId"]),

  tagDefinitions: defineTable({
    organizationId: v.id("organizations"),
    key: v.string(),
    label: v.string(),
    category: tagCategory,
    color: v.string(),
    description: v.optional(v.string()),
    system: v.boolean(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_key", ["organizationId", "key"])
    .index("by_org_category", ["organizationId", "category"]),

  entityTags: defineTable({
    organizationId: v.id("organizations"),
    tagId: v.id("tagDefinitions"),
    entityType,
    entityId: v.string(),
    source: tagSource,
    confidence: v.optional(v.number()),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_tag", ["tagId"])
    .index("by_entity", ["organizationId", "entityType", "entityId"])
    .index("by_org_tag", ["organizationId", "tagId"]),

  customerLifecycleSnapshots: defineTable({
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    snapshotDate: v.number(),
    segmentKeys: v.array(v.string()),
    firstWonAt: v.optional(v.number()),
    lastServiceAt: v.optional(v.number()),
    lastInvoiceAt: v.optional(v.number()),
    annualRecurringRevenueCents: v.number(),
    lifetimeRevenueCents: v.number(),
    lifetimeCostCents: v.number(),
    grossProfitCents: v.number(),
    grossMarginPercent: v.number(),
    estimatedLtvCents: v.number(),
    churnRiskScore: v.number(),
    churnRiskLevel,
    churnDrivers: v.array(v.string()),
    nextBestAction: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_customer", ["customerId"])
    .index("by_org_risk", ["organizationId", "churnRiskLevel"])
    .index("by_org_ltv", ["organizationId", "estimatedLtvCents"]),

  pnlSnapshots: defineTable({
    organizationId: v.id("organizations"),
    periodStart: v.number(),
    periodEnd: v.number(),
    serviceRevenueCents: v.number(),
    recurringRevenueCents: v.number(),
    oneTimeRevenueCents: v.number(),
    laborCostCents: v.number(),
    materialCostCents: v.number(),
    equipmentCostCents: v.number(),
    subcontractorCostCents: v.number(),
    overheadCostCents: v.number(),
    adminPayrollCents: v.number(),
    salesMarketingCents: v.number(),
    softwareCents: v.number(),
    insuranceCents: v.number(),
    fuelCents: v.number(),
    rentUtilitiesCents: v.number(),
    grossProfitCents: v.number(),
    operatingProfitCents: v.number(),
    grossMarginPercent: v.number(),
    operatingMarginPercent: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_period", ["organizationId", "periodStart", "periodEnd"]),

  dataQualityIssues: defineTable({
    organizationId: v.id("organizations"),
    kind: dataQualityIssueKind,
    severity,
    status: issueStatus,
    leadId: v.optional(v.id("leads")),
    customerId: v.optional(v.id("customers")),
    propertyId: v.optional(v.id("properties")),
    fieldName: v.optional(v.string()),
    currentValue: v.optional(v.string()),
    suggestedValue: v.optional(v.string()),
    duplicateLeadIds: v.optional(v.array(v.id("leads"))),
    summary: v.string(),
    ignoredByUserId: v.optional(v.id("users")),
    ignoredAt: v.optional(v.number()),
    fixedByUserId: v.optional(v.id("users")),
    fixedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_kind", ["organizationId", "kind"])
    .index("by_lead", ["leadId"])
    .index("by_customer", ["customerId"]),

  spamRules: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    kind: v.union(v.literal("email_prefix"), v.literal("message_phrase"), v.literal("missing_contact"), v.literal("domain"), v.literal("custom")),
    pattern: v.string(),
    score: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"]),

  cityNormalizationRules: defineTable({
    organizationId: v.id("organizations"),
    rawCity: v.string(),
    normalizedCity: v.string(),
    state: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_raw", ["organizationId", "rawCity"]),

  duplicateReviewDecisions: defineTable({
    organizationId: v.id("organizations"),
    leadId: v.id("leads"),
    duplicateLeadId: v.id("leads"),
    disposition: v.union(v.literal("duplicate"), v.literal("not_duplicate"), v.literal("merged")),
    decidedByUserId: v.optional(v.id("users")),
    decidedAt: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_org", ["organizationId"])
    .index("by_pair", ["leadId", "duplicateLeadId"]),

  leadSavedViews: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    ownerUserId: v.optional(v.id("users")),
    scope: v.union(v.literal("private"), v.literal("team")),
    filters: v.any(),
    columns: v.array(v.string()),
    sort: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_owner", ["ownerUserId"]),

  leadStatusSettings: defineTable({
    organizationId: v.id("organizations"),
    status: leadStatus,
    label: v.string(),
    color: v.string(),
    sortOrder: v.number(),
    terminal: v.boolean(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"]),

  leadIntakeForms: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    source: v.string(),
    defaultOwnerUserId: v.optional(v.id("users")),
    defaultServiceLines: v.array(serviceCategory),
    fieldConfig: v.any(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"]),

  leadIntakeSubmissions: defineTable({
    organizationId: v.id("organizations"),
    intakeFormId: v.optional(v.id("leadIntakeForms")),
    leadId: v.optional(v.id("leads")),
    source: v.string(),
    payload: v.any(),
    spamScore: v.optional(v.number()),
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_lead", ["leadId"])
    .index("by_org_created", ["organizationId", "createdAt"]),

  externalIntegrations: defineTable({
    organizationId: v.id("organizations"),
    provider: integrationProvider,
    name: v.string(),
    status: integrationStatus,
    config: v.any(),
    lastSyncAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_provider", ["organizationId", "provider"]),

  importJobs: defineTable({
    organizationId: v.id("organizations"),
    integrationId: v.optional(v.id("externalIntegrations")),
    source: integrationProvider,
    status: importStatus,
    fileName: v.optional(v.string()),
    rowCount: v.optional(v.number()),
    importedCount: v.optional(v.number()),
    skippedCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_created", ["organizationId", "createdAt"]),

  importRows: defineTable({
    organizationId: v.id("organizations"),
    importJobId: v.id("importJobs"),
    rowNumber: v.number(),
    status: importRowStatus,
    raw: v.any(),
    mapped: v.optional(v.any()),
    targetEntityType: v.optional(entityType),
    targetEntityId: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_import_job", ["importJobId"])
    .index("by_import_status", ["importJobId", "status"]),

  exportJobs: defineTable({
    organizationId: v.id("organizations"),
    destination: integrationProvider,
    status: exportStatus,
    entityTypes: v.array(entityType),
    cursor: v.optional(v.string()),
    rowCount: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    requestedByUserId: v.optional(v.id("users")),
    requestedAt: v.number(),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_created", ["organizationId", "createdAt"]),

  reportingWatermarks: defineTable({
    organizationId: v.id("organizations"),
    destination: integrationProvider,
    entityType,
    lastAuditEventId: v.optional(v.id("auditEvents")),
    lastExportedAt: v.optional(v.number()),
    cursor: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_destination", ["organizationId", "destination"]),

  analyticsSnapshots: defineTable({
    organizationId: v.id("organizations"),
    metricKey: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
    dimensions: v.any(),
    value: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_metric_period", ["organizationId", "metricKey", "periodStart"]),

  dashboardWidgets: defineTable({
    organizationId: v.id("organizations"),
    key: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    config: v.any(),
    sortOrder: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_key", ["organizationId", "key"]),

  automationRules: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    trigger: v.any(),
    conditions: v.any(),
    actions: v.any(),
    status: automationStatus,
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"]),

  automationRuns: defineTable({
    organizationId: v.id("organizations"),
    automationRuleId: v.id("automationRules"),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("succeeded"), v.literal("failed"), v.literal("skipped")),
    input: v.any(),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_rule", ["automationRuleId"])
    .index("by_org_created", ["organizationId", "createdAt"]),

  notificationPreferences: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    emailEnabled: v.boolean(),
    smsEnabled: v.boolean(),
    inAppEnabled: v.boolean(),
    eventSettings: v.any(),
    quietHours: v.optional(v.any()),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"]),

  featureFlags: defineTable({
    organizationId: v.optional(v.id("organizations")),
    key: v.string(),
    enabled: v.boolean(),
    config: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_org", ["organizationId"]),

  subscriptions: defineTable({
    organizationId: v.id("organizations"),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    paddleCustomerId: v.optional(v.string()),
    paddleSubscriptionId: v.optional(v.string()),
    paddleTransactionId: v.optional(v.string()),
    plan: billingPlan,
    status: subscriptionStatus,
    seats: v.number(),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"])
    .index("by_paddle_customer", ["paddleCustomerId"])
    .index("by_paddle_subscription", ["paddleSubscriptionId"])
    .index("by_paddle_transaction", ["paddleTransactionId"])
    .index("by_status", ["status"]),

  invoices: defineTable({
    organizationId: v.id("organizations"),
    subscriptionId: v.optional(v.id("subscriptions")),
    stripeInvoiceId: v.optional(v.string()),
    paddleTransactionId: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("open"), v.literal("paid"), v.literal("void"), v.literal("uncollectible")),
    amountDueCents: v.number(),
    amountPaidCents: v.number(),
    dueAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_stripe_invoice", ["stripeInvoiceId"])
    .index("by_paddle_transaction", ["paddleTransactionId"]),

  onboardingChecklistItems: defineTable({
    organizationId: v.id("organizations"),
    key: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    completedByUserId: v.optional(v.id("users")),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_key", ["organizationId", "key"]),

  accountHealthScores: defineTable({
    organizationId: v.id("organizations"),
    score: v.number(),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    signals: v.array(v.string()),
    calculatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_time", ["organizationId", "calculatedAt"]),

  auditEvents: defineTable({
    organizationId: v.id("organizations"),
    actorUserId: v.optional(v.id("users")),
    action: v.string(),
    entityType,
    entityId: v.string(),
    summary: v.string(),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    requestId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_org_time", ["organizationId", "createdAt"]),

  internalNotifications: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    entityType: v.optional(entityType),
    entityId: v.optional(v.string()),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "readAt"]),
});
