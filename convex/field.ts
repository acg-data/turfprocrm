import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOrg, requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

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
const serviceCategory = v.union(
  v.literal("lawn_care"),
  v.literal("landscaping"),
  v.literal("pest_control"),
  v.literal("tree_shrub"),
  v.literal("irrigation"),
  v.literal("snow"),
  v.literal("maintenance"),
);

type FieldIssueCategory =
  | "damage"
  | "pest_activity"
  | "customer_concern"
  | "access_issue"
  | "upsell_opportunity"
  | "safety_hazard"
  | "other";
type FieldIssueSeverity = "low" | "normal" | "high" | "urgent";
type FieldIssueInput = {
  category: FieldIssueCategory;
  severity?: FieldIssueSeverity;
  summary: string;
  details?: string;
  customerVisible?: boolean;
  createOpportunity?: boolean;
  serviceCategory?: "lawn_care" | "landscaping" | "pest_control" | "tree_shrub" | "irrigation" | "snow" | "maintenance";
  estimatedValueCents?: number;
};

function fieldIssueCategoryLabel(category: FieldIssueCategory) {
  const labels: Record<FieldIssueCategory, string> = {
    damage: "Damage",
    pest_activity: "Pest activity",
    customer_concern: "Customer concern",
    access_issue: "Access issue",
    upsell_opportunity: "Upsell opportunity",
    safety_hazard: "Safety hazard",
    other: "Field issue",
  };
  return labels[category];
}

function priorityForIssue(severity: FieldIssueSeverity) {
  if (severity === "urgent" || severity === "high") return "high" as const;
  if (severity === "low") return "low" as const;
  return "normal" as const;
}

function normalizeFieldIssue(issueFlag?: string, issue?: FieldIssueInput) {
  const summary = (issue?.summary ?? issueFlag ?? "").trim();
  if (!summary) return undefined;
  return {
    category: issue?.category ?? ("other" as const),
    severity: issue?.severity ?? ("high" as const),
    summary,
    details: issue?.details?.trim() || undefined,
    customerVisible: issue?.customerVisible ?? false,
    createOpportunity: issue?.createOpportunity ?? issue?.category === "upsell_opportunity",
    serviceCategory: issue?.serviceCategory ?? ("maintenance" as const),
    estimatedValueCents: Math.max(0, Math.round(issue?.estimatedValueCents ?? 0)),
    structured: Boolean(issue),
  };
}

async function assertCanMutateVisit(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  visit: Doc<"jobVisits">,
  userId: Id<"users">,
  role: Doc<"memberships">["role"],
) {
  if (["owner", "admin", "manager"].includes(role)) return;

  if (!visit.assignedCrewId) {
    throw new ConvexError({ code: "FORBIDDEN", message: "This visit is not assigned to your crew." });
  }

  const crewMember = await ctx.db
    .query("crewMembers")
    .withIndex("by_org_user", (q) => q.eq("organizationId", organizationId).eq("userId", userId))
    .filter((q) => q.and(q.eq(q.field("crewId"), visit.assignedCrewId), q.eq(q.field("active"), true)))
    .first();

  if (!crewMember) {
    throw new ConvexError({ code: "FORBIDDEN", message: "This visit is not assigned to your crew." });
  }
}

export const getMyVisits = query({
  args: {
    organizationId: v.id("organizations"),
    start: v.number(),
    end: v.number(),
  },
  handler: async (ctx, args) => {
    const { user, membership } = await requireMembership(ctx, args.organizationId);
    const visits = await ctx.db
      .query("jobVisits")
      .withIndex("by_org_date", (q) => q.eq("organizationId", args.organizationId).gte("scheduledStart", args.start).lt("scheduledStart", args.end))
      .collect();

    const crewMemberships = await ctx.db
      .query("crewMembers")
      .withIndex("by_org_user", (q) => q.eq("organizationId", args.organizationId).eq("userId", user._id))
      .collect();
    const crewIds = new Set(crewMemberships.filter((item) => item.active).map((item) => item.crewId));
    const canSeeAll = ["owner", "admin", "manager", "dispatcher"].includes(membership.role);
    const visibleVisits = canSeeAll ? visits : visits.filter((visit) => visit.assignedCrewId && crewIds.has(visit.assignedCrewId));

    return await Promise.all(
      visibleVisits.map(async (visit) => {
        const [job, customer, property, crew] = await Promise.all([
          ctx.db.get(visit.jobId),
          ctx.db.get(visit.customerId),
          visit.propertyId ? ctx.db.get(visit.propertyId) : null,
          visit.assignedCrewId ? ctx.db.get(visit.assignedCrewId) : null,
        ]);
        return { visit, job, customer, property, crew };
      }),
    );
  },
});

export const startVisit = mutation({
  args: {
    organizationId: v.id("organizations"),
    visitId: v.id("jobVisits"),
    startSource: v.optional(v.union(v.literal("manual"), v.literal("gps"))),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user, membership } = await requireMembership(ctx, args.organizationId, "completeFieldWork");
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new ConvexError({ code: "NOT_FOUND", message: "Visit not found." });
    assertOrg(visit, args.organizationId);
    await assertCanMutateVisit(ctx, args.organizationId, visit, user._id, membership.role);
    if (visit.status === "complete" || visit.status === "canceled") {
      throw new ConvexError({ code: "INVALID_STATE", message: "Completed or canceled visits cannot be started." });
    }

    const now = Date.now();
    await ctx.db.patch(args.visitId, {
      status: "on_site",
      updatedAt: now,
    });

    const existingEntries = await ctx.db.query("timesheetEntries").withIndex("by_visit", (q) => q.eq("visitId", args.visitId)).collect();
    const existingEntry = existingEntries.find((entry) => entry.userId === user._id && entry.status === "draft");
    const timesheetPatch = {
      userId: user._id,
      crewId: visit.assignedCrewId,
      jobId: visit.jobId,
      visitId: args.visitId,
      status: "draft" as const,
      roleName: membership.role,
      startSource: args.startSource ?? "manual",
      startedLatitude: args.latitude,
      startedLongitude: args.longitude,
      startedAt: existingEntry?.startedAt ?? now,
      endedAt: existingEntry?.endedAt ?? now,
      breakMinutes: existingEntry?.breakMinutes ?? 0,
      hours: existingEntry?.hours ?? 0,
      hourlyCostCents: existingEntry?.hourlyCostCents ?? 0,
      totalCostCents: existingEntry?.totalCostCents ?? 0,
      notes: "Visit started from field workflow.",
      updatedAt: now,
    };
    const timesheetEntryId = existingEntry
      ? (await ctx.db.patch(existingEntry._id, timesheetPatch), existingEntry._id)
      : await ctx.db.insert("timesheetEntries", {
          organizationId: args.organizationId,
          ...timesheetPatch,
          createdAt: now,
        });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "visit.start",
      entityType: "visit",
      entityId: args.visitId,
      summary: "Started field visit",
      after: { status: "on_site", timesheetEntryId, startSource: args.startSource ?? "manual" },
    });

    return { visitId: args.visitId, timesheetEntryId, startedAt: timesheetPatch.startedAt };
  },
});

export const completeChecklistItem = mutation({
  args: {
    organizationId: v.id("organizations"),
    visitId: v.id("jobVisits"),
    itemId: v.string(),
    isDone: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user, membership } = await requireMembership(ctx, args.organizationId, "completeFieldWork");
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new ConvexError({ code: "NOT_FOUND", message: "Visit not found." });
    assertOrg(visit, args.organizationId);
    await assertCanMutateVisit(ctx, args.organizationId, visit, user._id, membership.role);

    const now = Date.now();
    const checklist = visit.checklist.map((item) =>
      item.id === args.itemId
        ? {
            ...item,
            isDone: args.isDone,
            completedAt: args.isDone ? now : undefined,
          }
        : item,
    );

    await ctx.db.patch(args.visitId, {
      checklist,
      status: visit.status === "scheduled" ? "on_site" : visit.status,
      updatedAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "visit.checklist",
      entityType: "visit",
      entityId: args.visitId,
      summary: `Updated checklist item ${args.itemId}`,
      after: { itemId: args.itemId, isDone: args.isDone },
    });

    return args.visitId;
  },
});

export const submitVisit = mutation({
  args: {
    organizationId: v.id("organizations"),
    visitId: v.id("jobVisits"),
    notes: v.optional(v.string()),
    issueFlag: v.optional(v.string()),
    issue: v.optional(
      v.object({
        category: fieldIssueCategory,
        severity: v.optional(fieldIssueSeverity),
        summary: v.string(),
        details: v.optional(v.string()),
        customerVisible: v.optional(v.boolean()),
        createOpportunity: v.optional(v.boolean()),
        serviceCategory: v.optional(serviceCategory),
        estimatedValueCents: v.optional(v.number()),
      }),
    ),
    materialApplications: v.optional(
      v.array(
        v.object({
          materialId: v.id("materials"),
          quantity: v.number(),
          unit: v.string(),
          targetAreaId: v.optional(v.id("propertyAreas")),
          notes: v.optional(v.string()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { user, membership } = await requireMembership(ctx, args.organizationId, "completeFieldWork");
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new ConvexError({ code: "NOT_FOUND", message: "Visit not found." });
    assertOrg(visit, args.organizationId);
    await assertCanMutateVisit(ctx, args.organizationId, visit, user._id, membership.role);

    const now = Date.now();
    const fieldIssue = normalizeFieldIssue(args.issueFlag, args.issue);
    await ctx.db.patch(args.visitId, {
      status: "complete",
      completedAt: now,
      notes: args.notes ?? visit.notes,
      issueFlags: fieldIssue ? [...(visit.issueFlags ?? []), fieldIssue.summary] : visit.issueFlags,
      updatedAt: now,
    });

    const existingTimesheets = await ctx.db.query("timesheetEntries").withIndex("by_visit", (q) => q.eq("visitId", args.visitId)).collect();
    const draftTimesheet = existingTimesheets.find((entry) => entry.userId === user._id && entry.status === "draft");
    const startedAt = draftTimesheet?.startedAt ?? Math.min(visit.scheduledStart, now);
    const hours = Math.max(0.25, Math.round(((now - startedAt) / (60 * 60 * 1000)) * 100) / 100);
    const hourlyCostCents = draftTimesheet?.hourlyCostCents ?? 0;
    const timesheetPatch = {
      status: "submitted" as const,
      endedAt: now,
      hours,
      totalCostCents: Math.round(hours * hourlyCostCents),
      notes: args.notes ?? draftTimesheet?.notes ?? "Visit submitted from field workflow.",
      updatedAt: now,
    };
    const timesheetEntryId = draftTimesheet
      ? (await ctx.db.patch(draftTimesheet._id, timesheetPatch), draftTimesheet._id)
      : await ctx.db.insert("timesheetEntries", {
          organizationId: args.organizationId,
          userId: user._id,
          crewId: visit.assignedCrewId,
          jobId: visit.jobId,
          visitId: args.visitId,
          status: "submitted",
          roleName: membership.role,
          startSource: "manual",
          startedAt,
          endedAt: now,
          breakMinutes: 0,
          hours,
          hourlyCostCents,
          totalCostCents: Math.round(hours * hourlyCostCents),
          notes: args.notes ?? "Visit submitted from field workflow.",
          createdAt: now,
          updatedAt: now,
        });

    const weather = await ctx.db.query("weatherSnapshots").withIndex("by_visit", (q) => q.eq("visitId", args.visitId)).first();
    for (const application of args.materialApplications ?? []) {
      const material = await ctx.db.get(application.materialId);
      if (!material) throw new ConvexError({ code: "NOT_FOUND", message: "Material not found." });
      assertOrg(material, args.organizationId);
      if (application.targetAreaId) {
        const targetArea = await ctx.db.get(application.targetAreaId);
        if (!targetArea) throw new ConvexError({ code: "NOT_FOUND", message: "Target area not found." });
        assertOrg(targetArea, args.organizationId);
      }
      await ctx.db.insert("materialApplications", {
        organizationId: args.organizationId,
        visitId: args.visitId,
        materialId: application.materialId,
        quantity: application.quantity,
        unit: application.unit,
        targetAreaId: application.targetAreaId,
        weatherSnapshot: weather
          ? {
              observedAt: weather.observedAt,
              temperatureF: weather.temperatureF,
              windMph: weather.windMph,
              precipitationProbability: weather.precipitationProbability,
              conditions: weather.conditions,
              applicationRisk: weather.applicationRisk,
            }
          : undefined,
        notes: application.notes,
        createdAt: now,
        updatedAt: now,
      });
    }

    let issueTaskId: Id<"tasks"> | undefined;
    let issueOpportunityId: Id<"opportunities"> | undefined;
    let fieldIssueId: Id<"fieldIssues"> | undefined;
    if (fieldIssue) {
      const categoryLabel = fieldIssueCategoryLabel(fieldIssue.category);
      issueTaskId = await ctx.db.insert("tasks", {
        organizationId: args.organizationId,
        entityType: "visit",
        entityId: args.visitId,
        title: fieldIssue.structured ? `${categoryLabel}: ${fieldIssue.summary}` : fieldIssue.summary,
        description: [
          `Severity: ${fieldIssue.severity}.`,
          fieldIssue.details ? `Details: ${fieldIssue.details}` : undefined,
          fieldIssue.customerVisible ? "Customer-visible follow-up." : "Internal follow-up.",
        ].filter(Boolean).join(" "),
        status: "open",
        priority: priorityForIssue(fieldIssue.severity),
        createdByUserId: user._id,
        dueAt: now + (fieldIssue.severity === "urgent" ? 4 : 24) * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });

      if (fieldIssue.createOpportunity) {
        issueOpportunityId = await ctx.db.insert("opportunities", {
          organizationId: args.organizationId,
          customerId: visit.customerId,
          propertyId: visit.propertyId,
          title: `Field upsell: ${fieldIssue.summary}`,
          stage: "qualified",
          valueCents: fieldIssue.estimatedValueCents,
          closeProbability: 35,
          expectedCloseDate: now + 7 * 24 * 60 * 60 * 1000,
          ownerUserId: user._id,
          serviceLines: [fieldIssue.serviceCategory],
          createdAt: now,
          updatedAt: now,
        });
      }

      fieldIssueId = await ctx.db.insert("fieldIssues", {
        organizationId: args.organizationId,
        visitId: args.visitId,
        jobId: visit.jobId,
        customerId: visit.customerId,
        propertyId: visit.propertyId,
        taskId: issueTaskId,
        opportunityId: issueOpportunityId,
        category: fieldIssue.category,
        severity: fieldIssue.severity,
        status: "open",
        summary: fieldIssue.summary,
        details: fieldIssue.details,
        customerVisible: fieldIssue.customerVisible,
        createdByUserId: user._id,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("activities", {
        organizationId: args.organizationId,
        entityType: "visit",
        entityId: args.visitId,
        kind: "visit",
        summary: `Field issue flagged: ${fieldIssue.summary}`,
        metadata: {
          category: fieldIssue.category,
          severity: fieldIssue.severity,
          customerVisible: fieldIssue.customerVisible,
          taskId: issueTaskId,
          opportunityId: issueOpportunityId,
          fieldIssueId,
        },
        actorUserId: user._id,
        occurredAt: now,
      });
    }

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "visit.submit",
      entityType: "visit",
      entityId: args.visitId,
      summary: "Submitted field visit completion",
      after: {
        status: "complete",
        issueFlag: args.issueFlag,
        issueCategory: fieldIssue?.category,
        issueSeverity: fieldIssue?.severity,
        fieldIssueId,
        issueTaskId,
        issueOpportunityId,
        materialApplicationCount: args.materialApplications?.length ?? 0,
        timesheetEntryId,
      },
    });

    return { visitId: args.visitId, timesheetEntryId, fieldIssueId, issueTaskId, issueOpportunityId };
  },
});
