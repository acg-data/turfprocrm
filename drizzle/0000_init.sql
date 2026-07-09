CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb,
	"actorUserId" text,
	"occurredAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditEvents" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"actorUserId" text,
	"action" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"summary" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"requestId" text,
	"createdAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklistTemplates" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"items" jsonb NOT NULL,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cityNormalizationRules" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"rawCity" text NOT NULL,
	"normalizedCity" text NOT NULL,
	"state" text NOT NULL,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"customerId" text NOT NULL,
	"name" text NOT NULL,
	"roleTitle" text,
	"email" text,
	"phone" text,
	"mobilePhone" text,
	"workPhone" text,
	"preferredChannel" text,
	"isPrimary" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "costSnapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"source" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"value" double precision NOT NULL,
	"unit" text NOT NULL,
	"region" text,
	"periodStart" double precision,
	"periodEnd" double precision,
	"metadata" jsonb,
	"capturedAt" double precision NOT NULL,
	"createdAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crewMembers" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"crewId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crews" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"active" boolean NOT NULL,
	"capacityMinutesPerDay" double precision,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customerInvoices" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"customerId" text NOT NULL,
	"jobId" text,
	"estimateId" text,
	"invoiceNumber" text NOT NULL,
	"status" text NOT NULL,
	"subtotalCents" double precision NOT NULL,
	"taxCents" double precision NOT NULL,
	"totalCents" double precision NOT NULL,
	"paidCents" double precision NOT NULL,
	"dueAt" double precision,
	"sentAt" double precision,
	"paidAt" double precision,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customerLifecycleSnapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"customerId" text NOT NULL,
	"snapshotDate" double precision NOT NULL,
	"segmentKeys" jsonb NOT NULL,
	"firstWonAt" double precision,
	"lastServiceAt" double precision,
	"lastInvoiceAt" double precision,
	"annualRecurringRevenueCents" double precision NOT NULL,
	"lifetimeRevenueCents" double precision NOT NULL,
	"lifetimeCostCents" double precision NOT NULL,
	"grossProfitCents" double precision NOT NULL,
	"grossMarginPercent" double precision NOT NULL,
	"estimatedLtvCents" double precision NOT NULL,
	"churnRiskScore" double precision NOT NULL,
	"churnRiskLevel" text NOT NULL,
	"churnDrivers" jsonb NOT NULL,
	"nextBestAction" text,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customerPayments" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"customerId" text NOT NULL,
	"invoiceId" text,
	"status" text NOT NULL,
	"method" text NOT NULL,
	"amountCents" double precision NOT NULL,
	"receivedAt" double precision NOT NULL,
	"reference" text,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"source" text,
	"ownerUserId" text,
	"tags" jsonb NOT NULL,
	"lifetimeValueCents" double precision,
	"balanceCents" double precision,
	"lastContactedAt" double precision,
	"doNotContact" boolean,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboardWidgets" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"config" jsonb NOT NULL,
	"sortOrder" double precision NOT NULL,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dataQualityIssues" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"kind" text NOT NULL,
	"severity" text NOT NULL,
	"status" text NOT NULL,
	"leadId" text,
	"customerId" text,
	"propertyId" text,
	"fieldName" text,
	"currentValue" text,
	"suggestedValue" text,
	"duplicateLeadIds" jsonb,
	"summary" text NOT NULL,
	"ignoredByUserId" text,
	"ignoredAt" double precision,
	"fixedByUserId" text,
	"fixedAt" double precision,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entityTags" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"tagId" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"source" text NOT NULL,
	"confidence" double precision,
	"createdByUserId" text,
	"createdAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"assignedCrewId" text,
	"serialNumber" text,
	"maintenanceDueAt" double precision,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipmentRateCards" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"equipmentId" text,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"hourlyCostCents" double precision NOT NULL,
	"billableRateCents" double precision,
	"fuelCostPerHourCents" double precision,
	"maintenanceReservePerHourCents" double precision,
	"source" text NOT NULL,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimates" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"opportunityId" text,
	"customerId" text NOT NULL,
	"propertyId" text,
	"estimateNumber" text NOT NULL,
	"status" text NOT NULL,
	"subtotalCents" double precision NOT NULL,
	"discountCents" double precision,
	"taxCents" double precision NOT NULL,
	"totalCents" double precision NOT NULL,
	"sentAt" double precision,
	"acceptedAt" double precision,
	"expiresAt" double precision,
	"terms" text,
	"templateId" text,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "externalIntegrations" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"config" jsonb NOT NULL,
	"lastSyncAt" double precision,
	"lastError" text,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "featureFlags" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text,
	"key" text NOT NULL,
	"enabled" boolean NOT NULL,
	"config" jsonb,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "importJobs" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"integrationId" text,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"fileName" text,
	"rowCount" double precision,
	"importedCount" double precision,
	"skippedCount" double precision,
	"failedCount" double precision,
	"startedAt" double precision,
	"completedAt" double precision,
	"createdByUserId" text,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "importRows" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"importJobId" text NOT NULL,
	"rowNumber" double precision NOT NULL,
	"status" text NOT NULL,
	"raw" jsonb NOT NULL,
	"mapped" jsonb,
	"targetEntityType" text,
	"targetEntityId" text,
	"error" text,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobCostSummaries" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"jobId" text NOT NULL,
	"customerId" text NOT NULL,
	"estimatedRevenueCents" double precision NOT NULL,
	"actualRevenueCents" double precision NOT NULL,
	"invoicedCents" double precision NOT NULL,
	"collectedCents" double precision NOT NULL,
	"estimatedLaborCostCents" double precision NOT NULL,
	"actualLaborCostCents" double precision NOT NULL,
	"estimatedMaterialCostCents" double precision NOT NULL,
	"actualMaterialCostCents" double precision NOT NULL,
	"estimatedEquipmentCostCents" double precision NOT NULL,
	"actualEquipmentCostCents" double precision NOT NULL,
	"overheadCostCents" double precision NOT NULL,
	"grossProfitCents" double precision NOT NULL,
	"grossMarginPercent" double precision NOT NULL,
	"varianceCents" double precision NOT NULL,
	"calculatedAt" double precision NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobVisits" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"jobId" text NOT NULL,
	"customerId" text NOT NULL,
	"propertyId" text,
	"scheduledStart" double precision NOT NULL,
	"scheduledEnd" double precision NOT NULL,
	"status" text NOT NULL,
	"routeOrder" double precision,
	"assignedCrewId" text,
	"checklistTemplateId" text,
	"checklist" jsonb NOT NULL,
	"notes" text,
	"issueFlags" jsonb,
	"completedAt" double precision,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"customerId" text NOT NULL,
	"propertyId" text,
	"opportunityId" text,
	"estimateId" text,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"priority" text NOT NULL,
	"recurrence" text,
	"startDate" double precision,
	"endDate" double precision,
	"managerUserId" text,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "laborRateCards" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"roleName" text NOT NULL,
	"source" text NOT NULL,
	"hourlyCostCents" double precision NOT NULL,
	"billableRateCents" double precision,
	"burdenPercent" double precision,
	"metroArea" text,
	"state" text,
	"effectiveFrom" double precision,
	"effectiveTo" double precision,
	"active" boolean NOT NULL,
	"metadata" jsonb,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leadIntakeForms" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"source" text NOT NULL,
	"defaultOwnerUserId" text,
	"defaultServiceLines" jsonb NOT NULL,
	"fieldConfig" jsonb NOT NULL,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leadSavedViews" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"ownerUserId" text,
	"scope" text NOT NULL,
	"filters" jsonb NOT NULL,
	"columns" jsonb NOT NULL,
	"sort" jsonb NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leadStatusSettings" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"status" text NOT NULL,
	"label" text NOT NULL,
	"color" text NOT NULL,
	"sortOrder" double precision NOT NULL,
	"terminal" boolean NOT NULL,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"customerId" text,
	"contactId" text,
	"propertyId" text,
	"title" text NOT NULL,
	"source" text NOT NULL,
	"sourceDetail" text,
	"leadType" text,
	"companyAssignment" text,
	"accountType" text,
	"firstName" text,
	"lastName" text,
	"email" text,
	"homePhone" text,
	"workPhone" text,
	"mobilePhone" text,
	"normalizedPhone" text,
	"message" text,
	"estimateNotes" text,
	"programRequests" jsonb,
	"lawnSizeSqFt" double precision,
	"estimatedServiceDate" double precision,
	"isEstimatedDate" boolean,
	"grade" text,
	"status" text NOT NULL,
	"unqualifiedReason" text,
	"lossReason" text,
	"urgency" text NOT NULL,
	"ownerUserId" text,
	"hiddenAt" double precision,
	"hiddenByUserId" text,
	"spamScore" double precision,
	"spamReasons" jsonb,
	"spamReviewedAt" double precision,
	"duplicateClusterKey" text,
	"qualityScore" double precision,
	"receivedAt" double precision,
	"convertedAt" double precision,
	"externalSourceId" text,
	"rawPayload" jsonb,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materialApplications" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"visitId" text NOT NULL,
	"materialId" text NOT NULL,
	"quantity" double precision NOT NULL,
	"unit" text NOT NULL,
	"targetAreaId" text,
	"weatherSnapshot" jsonb,
	"notes" text,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"costCents" double precision,
	"active" boolean NOT NULL,
	"epaRegistrationNumber" text,
	"restrictedUse" boolean,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"clerkOrganizationId" text,
	"role" text NOT NULL,
	"status" text NOT NULL,
	"fieldPinEnabled" boolean,
	"notificationProfileId" text,
	"joinedAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboardingChecklistItems" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"completedAt" double precision,
	"completedByUserId" text,
	"sortOrder" double precision NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"leadId" text,
	"customerId" text NOT NULL,
	"propertyId" text,
	"title" text NOT NULL,
	"stage" text NOT NULL,
	"valueCents" double precision NOT NULL,
	"closeProbability" double precision NOT NULL,
	"expectedCloseDate" double precision,
	"ownerUserId" text,
	"serviceLines" jsonb NOT NULL,
	"lossReason" text,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"industryFocus" text NOT NULL,
	"timezone" text NOT NULL,
	"defaultCurrency" text,
	"billingPlan" text,
	"subscriptionStatus" text,
	"trialEndsAt" double precision,
	"serviceTerritory" jsonb,
	"settings" jsonb,
	"createdByClerkUserId" text NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paymentAllocations" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"paymentId" text NOT NULL,
	"invoiceId" text NOT NULL,
	"amountCents" double precision NOT NULL,
	"createdAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pnlSnapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"periodStart" double precision NOT NULL,
	"periodEnd" double precision NOT NULL,
	"serviceRevenueCents" double precision NOT NULL,
	"recurringRevenueCents" double precision NOT NULL,
	"oneTimeRevenueCents" double precision NOT NULL,
	"laborCostCents" double precision NOT NULL,
	"materialCostCents" double precision NOT NULL,
	"equipmentCostCents" double precision NOT NULL,
	"subcontractorCostCents" double precision NOT NULL,
	"overheadCostCents" double precision NOT NULL,
	"adminPayrollCents" double precision NOT NULL,
	"salesMarketingCents" double precision NOT NULL,
	"softwareCents" double precision NOT NULL,
	"insuranceCents" double precision NOT NULL,
	"fuelCents" double precision NOT NULL,
	"rentUtilitiesCents" double precision NOT NULL,
	"grossProfitCents" double precision NOT NULL,
	"operatingProfitCents" double precision NOT NULL,
	"grossMarginPercent" double precision NOT NULL,
	"operatingMarginPercent" double precision NOT NULL,
	"metadata" jsonb,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priceBookItems" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"priceBookId" text NOT NULL,
	"serviceCatalogItemId" text,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"basePriceCents" double precision NOT NULL,
	"minPriceCents" double precision,
	"pricingModel" text NOT NULL,
	"formula" text,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priceBooks" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"effectiveFrom" double precision,
	"effectiveTo" double precision,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profitabilitySnapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"periodStart" double precision NOT NULL,
	"periodEnd" double precision NOT NULL,
	"dimensionType" text NOT NULL,
	"dimensionId" text,
	"revenueCents" double precision NOT NULL,
	"invoicedCents" double precision NOT NULL,
	"collectedCents" double precision NOT NULL,
	"laborCostCents" double precision NOT NULL,
	"materialCostCents" double precision NOT NULL,
	"equipmentCostCents" double precision NOT NULL,
	"overheadCostCents" double precision NOT NULL,
	"grossProfitCents" double precision NOT NULL,
	"grossMarginPercent" double precision NOT NULL,
	"metadata" jsonb,
	"calculatedAt" double precision NOT NULL,
	"createdAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"customerId" text NOT NULL,
	"label" text NOT NULL,
	"street" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postalCode" text NOT NULL,
	"county" text,
	"gateCode" text,
	"notes" text,
	"geo" jsonb,
	"lawnSizeSqFt" double precision,
	"lotSizeSqFt" double precision,
	"serviceWarnings" jsonb,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchaseOrders" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"vendorName" text NOT NULL,
	"status" text NOT NULL,
	"orderNumber" text,
	"jobId" text,
	"subtotalCents" double precision NOT NULL,
	"taxCents" double precision,
	"totalCents" double precision NOT NULL,
	"orderedAt" double precision,
	"receivedAt" double precision,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routeDriveTimeEstimates" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"routePlanId" text,
	"visitId" text,
	"fromAddress" text NOT NULL,
	"toAddress" text NOT NULL,
	"driveMinutes" double precision NOT NULL,
	"distanceMiles" double precision,
	"source" text NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serviceCatalogItems" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"defaultUnit" text NOT NULL,
	"defaultPriceCents" double precision NOT NULL,
	"durationMinutes" double precision,
	"seasonStartMonth" double precision,
	"seasonEndMonth" double precision,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spamRules" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"pattern" text NOT NULL,
	"score" double precision NOT NULL,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"stripeCustomerId" text,
	"stripeSubscriptionId" text,
	"plan" text NOT NULL,
	"status" text NOT NULL,
	"seats" double precision NOT NULL,
	"currentPeriodStart" double precision,
	"currentPeriodEnd" double precision,
	"trialEndsAt" double precision,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tagDefinitions" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"category" text NOT NULL,
	"color" text NOT NULL,
	"description" text,
	"system" boolean NOT NULL,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text NOT NULL,
	"priority" text NOT NULL,
	"dueAt" double precision,
	"assignedUserId" text,
	"createdByUserId" text,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheetEntries" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text,
	"crewId" text,
	"jobId" text,
	"visitId" text,
	"laborRateCardId" text,
	"status" text NOT NULL,
	"roleName" text NOT NULL,
	"startedAt" double precision NOT NULL,
	"endedAt" double precision NOT NULL,
	"breakMinutes" double precision,
	"hours" double precision NOT NULL,
	"hourlyCostCents" double precision NOT NULL,
	"totalCostCents" double precision NOT NULL,
	"notes" text,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerkUserId" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"avatarUrl" text,
	"phone" text,
	"timezone" text,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendorCatalogs" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"vendorName" text NOT NULL,
	"sku" text,
	"itemName" text NOT NULL,
	"category" text NOT NULL,
	"materialId" text,
	"unit" text NOT NULL,
	"unitCostCents" double precision NOT NULL,
	"source" text NOT NULL,
	"lastImportedAt" double precision,
	"active" boolean NOT NULL,
	"createdAt" double precision NOT NULL,
	"updatedAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weatherSnapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"propertyId" text,
	"visitId" text,
	"source" text NOT NULL,
	"observedAt" double precision NOT NULL,
	"temperatureF" double precision,
	"windMph" double precision,
	"precipitationProbability" double precision,
	"precipitationInches" double precision,
	"conditions" text,
	"alertSummary" text,
	"applicationRisk" text NOT NULL,
	"raw" jsonb,
	"createdAt" double precision NOT NULL
);
--> statement-breakpoint
CREATE INDEX "activities_org_idx" ON "activities" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "activities_org_time_idx" ON "activities" USING btree ("organizationId","occurredAt");--> statement-breakpoint
CREATE INDEX "auditEvents_org_idx" ON "auditEvents" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "checklistTemplates_org_idx" ON "checklistTemplates" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "cityNormalizationRules_org_idx" ON "cityNormalizationRules" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "contacts_org_idx" ON "contacts" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "costSnapshots_org_idx" ON "costSnapshots" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "crewMembers_org_idx" ON "crewMembers" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "crews_org_idx" ON "crews" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "customerInvoices_org_idx" ON "customerInvoices" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "customerLifecycleSnapshots_org_idx" ON "customerLifecycleSnapshots" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "customerPayments_org_idx" ON "customerPayments" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "customers_org_idx" ON "customers" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "customers_org_updated_idx" ON "customers" USING btree ("organizationId","updatedAt");--> statement-breakpoint
CREATE INDEX "dashboardWidgets_org_idx" ON "dashboardWidgets" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "dataQualityIssues_org_idx" ON "dataQualityIssues" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "entityTags_org_idx" ON "entityTags" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "equipment_org_idx" ON "equipment" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "equipmentRateCards_org_idx" ON "equipmentRateCards" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "estimates_org_idx" ON "estimates" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "externalIntegrations_org_idx" ON "externalIntegrations" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "featureFlags_org_idx" ON "featureFlags" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "importJobs_org_idx" ON "importJobs" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "importRows_org_idx" ON "importRows" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "jobCostSummaries_org_idx" ON "jobCostSummaries" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "jobVisits_org_idx" ON "jobVisits" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "jobVisits_org_date_idx" ON "jobVisits" USING btree ("organizationId","scheduledStart");--> statement-breakpoint
CREATE INDEX "jobs_org_idx" ON "jobs" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "laborRateCards_org_idx" ON "laborRateCards" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "leadIntakeForms_org_idx" ON "leadIntakeForms" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "leadSavedViews_org_idx" ON "leadSavedViews" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "leadStatusSettings_org_idx" ON "leadStatusSettings" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "leads_org_idx" ON "leads" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "leads_org_created_idx" ON "leads" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "materialApplications_org_idx" ON "materialApplications" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "materials_org_idx" ON "materials" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "memberships_org_idx" ON "memberships" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "memberships_org_user_idx" ON "memberships" USING btree ("organizationId","userId");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "onboardingChecklistItems_org_idx" ON "onboardingChecklistItems" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "opportunities_org_idx" ON "opportunities" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "paymentAllocations_org_idx" ON "paymentAllocations" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "pnlSnapshots_org_idx" ON "pnlSnapshots" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "priceBookItems_org_idx" ON "priceBookItems" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "priceBooks_org_idx" ON "priceBooks" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "profitabilitySnapshots_org_idx" ON "profitabilitySnapshots" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "properties_org_idx" ON "properties" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "purchaseOrders_org_idx" ON "purchaseOrders" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "routeDriveTimeEstimates_org_idx" ON "routeDriveTimeEstimates" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "serviceCatalogItems_org_idx" ON "serviceCatalogItems" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "spamRules_org_idx" ON "spamRules" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "tagDefinitions_org_idx" ON "tagDefinitions" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "tasks_org_idx" ON "tasks" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "tasks_org_due_idx" ON "tasks" USING btree ("organizationId","dueAt");--> statement-breakpoint
CREATE INDEX "timesheetEntries_org_idx" ON "timesheetEntries" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "users_clerk_user_id_idx" ON "users" USING btree ("clerkUserId");--> statement-breakpoint
CREATE INDEX "vendorCatalogs_org_idx" ON "vendorCatalogs" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "weatherSnapshots_org_idx" ON "weatherSnapshots" USING btree ("organizationId");