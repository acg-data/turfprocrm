/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import type { TestConvexForDataModelAndIdentity } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type TestBackend = TestConvexForDataModelAndIdentity<DataModel>;
type TestRole = "owner" | "admin" | "manager" | "sales" | "dispatcher" | "crew_lead" | "technician";

function identity(key: string) {
  return {
    subject: `user_${key}`,
    email: `${key}@example.com`,
    name: key
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  };
}

async function createOperationalTenant(t: TestBackend, key: string) {
  const owner = t.withIdentity(identity(`${key}_owner`));
  const organizationId = await owner.mutation(api.setup.createOrganization, {
    name: `${key} Turf Co`,
    timezone: "America/New_York",
    industryFocus: "both",
    billingPlan: "pro",
  });

  const lead = await owner.mutation(api.crm.createLead, {
    organizationId,
    customerName: `${key} Customer`,
    contactName: `${key} Customer`,
    email: `${key}.customer@example.com`,
    phone: "(508) 555-0100",
    property: {
      street: "10 Tenant Lane",
      city: "Foxborough",
      state: "MA",
      postalCode: "02035",
    },
    title: `${key} service request`,
    source: "Manual",
    valueCents: 90000,
    serviceLines: ["pest_control"],
  });

  const settings = await owner.query(api.admin.getSettings, { organizationId });
  const crewId = settings.crews[0]._id;
  const serviceCatalogItemId = settings.serviceCatalog[0]._id;
  const estimateId = await owner.mutation(api.estimates.createEstimate, {
    organizationId,
    opportunityId: lead.opportunityId,
    status: "sent",
    lineItems: [
      {
        serviceCatalogItemId,
        name: "Mosquito and tick barrier",
        quantity: 6,
        unit: "visit",
        unitPriceCents: 15000,
      },
    ],
  });

  const scheduledStart = Date.now() + 60 * 60 * 1000;
  const scheduledEnd = scheduledStart + 2 * 60 * 60 * 1000;
  await owner.mutation(api.estimates.acceptEstimate, {
    organizationId,
    estimateId,
    acceptedByName: `${key} Customer`,
    acceptanceSource: "office",
  });
  const converted = await owner.mutation(api.estimates.convertToJob, {
    organizationId,
    estimateId,
    scheduledStart,
    scheduledEnd,
    crewId,
  });

  return {
    owner,
    organizationId,
    crewId,
    serviceCatalogItemId,
    scheduledStart,
    scheduledEnd,
    customerId: lead.customerId,
    propertyId: lead.propertyId,
    leadId: lead.leadId,
    opportunityId: lead.opportunityId,
    estimateId,
    jobId: converted.jobId,
    visitId: converted.visitId,
  };
}

async function addMember(t: TestBackend, organizationId: Id<"organizations">, key: string, role: TestRole) {
  const actor = t.withIdentity(identity(key));
  const userId = await actor.mutation(api.setup.syncCurrentUser);
  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("memberships", {
      organizationId,
      userId,
      role,
      status: "active",
      joinedAt: now,
      updatedAt: now,
    });
  });
  return { actor, userId };
}

async function addCrewMembership(
  t: TestBackend,
  organizationId: Id<"organizations">,
  crewId: Id<"crews">,
  userId: Id<"users">,
) {
  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("crewMembers", {
      organizationId,
      crewId,
      userId,
      role: "Technician",
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function expectRejected(name: string, attempt: () => Promise<unknown>) {
  await expect(attempt(), name).rejects.toThrow();
}

describe("Convex operating system functions", () => {
  it("creates an organization, lead, opportunity, estimate, job, visit, and audit trail", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({
      subject: "user_owner",
      email: "owner@example.com",
      name: "Owner User",
    });

    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Test Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
    });

    const lead = await owner.mutation(api.crm.createLead, {
      organizationId,
      customerName: "Jordan Homeowner",
      contactName: "Jordan Homeowner",
      email: "jordan@example.com",
      phone: "(508) 555-0100",
      property: {
        street: "10 Test Lane",
        city: "Foxborough",
        state: "MA",
        postalCode: "02035",
      },
      title: "Tick and mosquito service",
      source: "Manual",
      valueCents: 90000,
      serviceLines: ["pest_control"],
    });

    const opportunities = await owner.query(api.pipeline.listOpportunities, { organizationId });
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0].opportunity._id).toEqual(lead.opportunityId);
    expect(opportunities[0].opportunity.stage).toBe("qualified");

    await owner.mutation(api.pipeline.advanceOpportunity, {
      organizationId,
      opportunityId: lead.opportunityId,
      stage: "estimating",
    });

    const estimateId = await owner.mutation(api.estimates.createEstimate, {
      organizationId,
      opportunityId: lead.opportunityId,
      status: "sent",
      lineItems: [
        {
          name: "Mosquito and tick barrier",
          quantity: 6,
          unit: "visit",
          unitPriceCents: 15000,
        },
      ],
    });

    const settings = await owner.query(api.admin.getSettings, { organizationId });
    const crewId = settings.crews[0]._id;
    const scheduledStart = Date.now() + 60 * 60 * 1000;
    await owner.mutation(api.estimates.acceptEstimate, {
      organizationId,
      estimateId,
      acceptedByName: "Jordan Homeowner",
      acceptedByEmail: "jordan@example.com",
      acceptanceSource: "office",
    });
    const converted = await owner.mutation(api.estimates.convertToJob, {
      organizationId,
      estimateId,
      scheduledStart,
      scheduledEnd: scheduledStart + 2 * 60 * 60 * 1000,
      crewId,
    });

    const job = await owner.query(api.jobs.getJobWorkspace, {
      organizationId,
      jobId: converted.jobId,
    });
    expect(job.visits).toHaveLength(1);
    expect(job.job.status).toBe("scheduled");
    expect(job.visits[0].checklist.map((item) => item.label)).toEqual(expect.arrayContaining(["Confirm approved estimate scope", "Complete approved service scope"]));

    const handoff = await t.run(async (ctx) => {
      const [estimate, opportunity, phases, tasks, assignments, summaries, activities, audits] = await Promise.all([
        ctx.db.get(estimateId),
        ctx.db.get(lead.opportunityId),
        ctx.db.query("jobPhases").withIndex("by_job", (q) => q.eq("jobId", converted.jobId)).collect(),
        ctx.db.query("tasks").withIndex("by_entity", (q) => q.eq("entityType", "job").eq("entityId", converted.jobId)).collect(),
        ctx.db.query("visitAssignments").withIndex("by_visit", (q) => q.eq("visitId", converted.visitId)).collect(),
        ctx.db.query("jobCostSummaries").withIndex("by_job", (q) => q.eq("jobId", converted.jobId)).collect(),
        ctx.db.query("activities").withIndex("by_entity", (q) => q.eq("entityType", "job").eq("entityId", converted.jobId)).collect(),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
      ]);
      return { estimate, opportunity, phases, tasks, assignments, summaries, activities, audits };
    });
    expect(handoff.estimate?.status).toBe("accepted");
    expect(handoff.opportunity?.stage).toBe("won");
    expect(handoff.phases.map((phase) => phase.name)).toEqual(["Sales handoff", "Production visit", "Completion review"]);
    expect(handoff.tasks.some((task) => task.title === "Confirm schedule and crew handoff")).toBe(true);
    expect(handoff.assignments.some((assignment) => assignment.crewId === crewId)).toBe(true);
    expect(handoff.summaries[0].estimatedRevenueCents).toBe(90000);
    expect(handoff.activities.some((activity) => activity.summary.includes("Converted"))).toBe(true);
    expect(handoff.audits.some((event) => event.action === "estimate.convert" && event.entityId === converted.jobId && event.after?.estimateId === estimateId)).toBe(true);

    const overview = await owner.query(api.dashboard.getOverview, { organizationId });
    expect(overview.counts.customers).toBe(1);
    expect(overview.wonValueCents).toBe(90000);
  });

  it("runs operating controls against a real tenant and rejects a non-member", async () => {
    const t = convexTest(schema, modules);
    const tenant = await createOperationalTenant(t, "production_operating");

    const before = await tenant.owner.query(api.operating.getDemoOperatingDepth, { organizationId: tenant.organizationId });
    expect(before?.leadOps.rows.some((row) => row.id === tenant.leadId)).toBe(true);

    await tenant.owner.mutation(api.operating.updateLead, {
      organizationId: tenant.organizationId,
      leadId: tenant.leadId,
      status: "contacted",
      grade: "a",
    });
    await tenant.owner.mutation(api.operating.upsertLeadStatusSetting, {
      organizationId: tenant.organizationId,
      status: "follow_up",
      label: "Follow-up queue",
      color: "#b45309",
      sortOrder: 5,
      terminal: false,
      active: true,
    });
    await tenant.owner.mutation(api.operating.upsertLaborRate, {
      organizationId: tenant.organizationId,
      roleName: "Production technician",
      hourlyCostCents: 3200,
      billableRateCents: 7200,
    });

    const invoice = await tenant.owner.mutation(api.operating.generateInvoiceFromJob, {
      organizationId: tenant.organizationId,
      jobId: tenant.jobId,
      status: "sent",
      dueInDays: 14,
    });
    expect(invoice.created).toBe(true);
    expect(invoice.invoiceId).toBeDefined();

    await tenant.owner.mutation(api.operating.recordCustomerPayment, {
      organizationId: tenant.organizationId,
      invoiceId: invoice.invoiceId!,
      amountCents: 10000,
      method: "ach",
      reference: "PROD-TEST-10000",
    });

    const after = await tenant.owner.query(api.operating.getDemoOperatingDepth, { organizationId: tenant.organizationId });
    expect(after?.leadOps.rows.find((row) => row.id === tenant.leadId)?.status).toBe("contacted");
    expect(after?.revenue.payments.some((payment) => payment.reference === "PROD-TEST-10000")).toBe(true);
    expect(after?.admin.auditEvents.some((event) => event.action === "payment.record" && event.actorName === "Production Operating Owner")).toBe(true);

    const outsider = t.withIdentity(identity("production_operating_outsider"));
    await expectRejected("non-members cannot run real tenant operating mutations", () =>
      outsider.mutation(api.operating.updateLead, {
        organizationId: tenant.organizationId,
        leadId: tenant.leadId,
        status: "spam",
      }),
    );
  });

  it("persists dispatch crew assignment with assignment row and audit trail", async () => {
    const t = convexTest(schema, modules);
    const tenant = await createOperationalTenant(t, "dispatch_assign");
    const nextCrewId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("crews", {
        organizationId: tenant.organizationId,
        name: "Dispatch Test Crew",
        color: "#315a72",
        active: true,
        capacityMinutesPerDay: 420,
        createdAt: now,
        updatedAt: now,
      });
    });

    await tenant.owner.mutation(api.dispatch.assignVisit, {
      organizationId: tenant.organizationId,
      visitId: tenant.visitId,
      crewId: nextCrewId,
      routeOrder: 7,
    });

    const persisted = await t.run(async (ctx) => {
      const [visit, assignments, audits] = await Promise.all([
        ctx.db.get(tenant.visitId),
        ctx.db.query("visitAssignments").withIndex("by_visit", (q) => q.eq("visitId", tenant.visitId)).collect(),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", tenant.organizationId)).collect(),
      ]);
      return { visit, assignments, audits };
    });

    expect(persisted.visit?.assignedCrewId).toBe(nextCrewId);
    expect(persisted.visit?.routeOrder).toBe(7);
    expect(persisted.assignments.some((assignment) => assignment.crewId === nextCrewId && assignment.status === "assigned")).toBe(true);
    expect(persisted.audits.some((event) => event.action === "visit.assign" && event.entityId === tenant.visitId && event.after?.assignedCrewId === nextCrewId)).toBe(true);

    await tenant.owner.mutation(api.dispatch.reorderVisit, {
      organizationId: tenant.organizationId,
      visitId: tenant.visitId,
      routeOrder: 3,
    });
    const reordered = await t.run(async (ctx) => {
      const [visit, audits] = await Promise.all([
        ctx.db.get(tenant.visitId),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", tenant.organizationId)).collect(),
      ]);
      return { visit, audits };
    });
    expect(reordered.visit?.routeOrder).toBe(3);
    expect(reordered.audits.some((event) => event.action === "visit.reorder" && event.entityId === tenant.visitId && event.after?.routeOrder === 3)).toBe(true);
  });

  it("generates recurring maintenance route visits, assignments, recurrence, and audit trail", async () => {
    const t = convexTest(schema, modules);
    const tenant = await createOperationalTenant(t, "recurring_route");
    const firstStart = tenant.scheduledStart + 7 * 24 * 60 * 60 * 1000;

    const generated = await tenant.owner.mutation(api.dispatch.generateRecurringRoute, {
      organizationId: tenant.organizationId,
      jobId: tenant.jobId,
      frequency: "weekly",
      count: 3,
      firstStart,
      durationMinutes: 90,
      crewId: tenant.crewId,
    });

    expect(generated.generatedCount).toBe(3);

    const persisted = await t.run(async (ctx) => {
      const [job, plan, visits, assignments, audits] = await Promise.all([
        ctx.db.get(tenant.jobId),
        ctx.db.get(generated.planId),
        Promise.all(generated.visitIds.map((visitId) => ctx.db.get(visitId))),
        ctx.db.query("visitAssignments").withIndex("by_org", (q) => q.eq("organizationId", tenant.organizationId)).collect(),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", tenant.organizationId)).collect(),
      ]);
      return { job, plan, visits, assignments, audits };
    });

    expect(persisted.job?.recurrence).toBe("weekly");
    expect(persisted.plan?.frequency).toBe("weekly");
    expect(persisted.plan?.generatedVisitIds).toEqual(generated.visitIds);
    expect(persisted.plan?.nextRunAt).toBe(firstStart + 3 * 7 * 24 * 60 * 60 * 1000);
    expect(persisted.visits).toHaveLength(3);
    expect(persisted.visits[0]?.scheduledStart).toBe(firstStart);
    expect(persisted.visits[1]?.scheduledStart).toBe(firstStart + 7 * 24 * 60 * 60 * 1000);
    expect(persisted.visits[2]?.scheduledEnd).toBe(firstStart + 2 * 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000);
    expect(persisted.visits.every((visit) => Boolean(visit && visit.assignedCrewId === tenant.crewId && visit.checklist.some((item) => item.label === "Confirm recurring scope and property access")))).toBe(true);
    expect(generated.visitIds.every((visitId) => persisted.assignments.some((assignment) => assignment.visitId === visitId && assignment.crewId === tenant.crewId && assignment.status === "assigned"))).toBe(true);
    expect(persisted.audits.some((event) => event.action === "recurring_route.generate" && event.entityId === tenant.jobId && event.after?.count === 3)).toBe(true);
  });

  it("creates and approves a job change order with margin, schedule, task, and audit impact", async () => {
    const t = convexTest(schema, modules);
    const tenant = await createOperationalTenant(t, "change_order");

    const changeOrderId = await tenant.owner.mutation(api.jobs.createChangeOrder, {
      organizationId: tenant.organizationId,
      jobId: tenant.jobId,
      title: "Add perimeter bed cleanup",
      description: "Customer requested extra bed cleanup before the scheduled pest visit.",
      requestedByName: "Change Order Customer",
      revenueDeltaCents: 25000,
      estimatedCostDeltaCents: 9000,
      scheduleImpactDays: 2,
    });

    const approved = await tenant.owner.mutation(api.jobs.approveChangeOrder, {
      organizationId: tenant.organizationId,
      changeOrderId,
      approvedByName: "Change Order Customer",
      approvedByEmail: "change-order@example.com",
    });

    const persisted = await t.run(async (ctx) => {
      const [changeOrder, task, summary, job, activities, audits] = await Promise.all([
        ctx.db.get(changeOrderId),
        ctx.db.get(approved.taskId),
        ctx.db.query("jobCostSummaries").withIndex("by_job", (q) => q.eq("jobId", tenant.jobId)).first(),
        ctx.db.get(tenant.jobId),
        ctx.db.query("activities").withIndex("by_entity", (q) => q.eq("entityType", "job").eq("entityId", tenant.jobId)).collect(),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", tenant.organizationId)).collect(),
      ]);
      return { changeOrder, task, summary, job, activities, audits };
    });

    expect(persisted.changeOrder?.status).toBe("approved");
    expect(persisted.changeOrder?.grossProfitDeltaCents).toBe(16000);
    expect(persisted.changeOrder?.grossMarginPercent).toBe(64);
    expect(persisted.changeOrder?.approvedByEmail).toBe("change-order@example.com");
    expect(persisted.task?.title).toBe("Schedule approved change order: Add perimeter bed cleanup");
    expect(persisted.task?.priority).toBe("high");
    expect(persisted.job?.endDate).toBeTruthy();
    expect(persisted.summary?.estimatedRevenueCents).toBe(115000);
    expect(persisted.summary?.estimatedMaterialCostCents).toBe(9000);
    expect(persisted.summary?.grossProfitCents).toBe(106000);
    expect(persisted.activities.some((activity) => activity.summary === "Approved change order Add perimeter bed cleanup")).toBe(true);
    expect(persisted.audits.map((event) => event.action)).toEqual(expect.arrayContaining(["change_order.create", "change_order.approve"]));
  });

  it("creates assigned job tasks with due date, priority, active-member guard, and audit trail", async () => {
    const t = convexTest(schema, modules);
    const tenant = await createOperationalTenant(t, "job_task");
    const manager = await addMember(t, tenant.organizationId, "job_task_manager", "manager");
    const outsideTenant = await createOperationalTenant(t, "job_task_other");
    const outsideMember = await addMember(t, outsideTenant.organizationId, "job_task_outside_manager", "manager");

    const dueAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const taskId = await tenant.owner.mutation(api.jobs.addTask, {
      organizationId: tenant.organizationId,
      entityType: "job",
      entityId: tenant.jobId,
      title: "Order extra mosquito material before service",
      priority: "high",
      dueAt,
      assignedUserId: manager.userId,
    });

    const persisted = await t.run(async (ctx) => {
      const [task, audits] = await Promise.all([
        ctx.db.get(taskId),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", tenant.organizationId)).collect(),
      ]);
      return { task, audits };
    });

    expect(persisted.task?.entityType).toBe("job");
    expect(persisted.task?.entityId).toBe(tenant.jobId);
    expect(persisted.task?.priority).toBe("high");
    expect(persisted.task?.dueAt).toBe(dueAt);
    expect(persisted.task?.assignedUserId).toBe(manager.userId);
    expect(persisted.audits.some((event) => event.action === "task.create" && event.after?.taskId === taskId && event.after?.assignedUserId === manager.userId)).toBe(true);

    await expectRejected("job task assignment rejects users outside the tenant", () =>
      tenant.owner.mutation(api.jobs.addTask, {
        organizationId: tenant.organizationId,
        entityType: "job",
        entityId: tenant.jobId,
        title: "Invalid outside assignee",
        priority: "normal",
        dueAt,
        assignedUserId: outsideMember.userId,
      }),
    );
  });

  it("logs call-in lead activity and follow-up task", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("call_in_owner"));
    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Call In Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "pro",
    });

    const lead = await owner.mutation(api.crm.createLead, {
      organizationId,
      customerName: "Call In Homeowner",
      contactName: "Call In Homeowner",
      phone: "(508) 555-0123",
      property: {
        street: "23 Call Street",
        city: "Foxborough",
        state: "MA",
        postalCode: "02035",
      },
      title: "Emergency tick treatment",
      source: "Phone",
      leadType: "phone_call",
      urgency: "high",
      message: "Customer asked for the earliest available estimate.",
      callOutcome: "needs_callback",
      createCallFollowUp: true,
      followUpDueInDays: 3,
      valueCents: 120000,
      serviceLines: ["pest_control"],
    });

    const profile = await owner.query(api.crm.getCustomerProfile, { organizationId, customerId: lead.customerId });
    expect(profile.activities.some((activity) => activity.kind === "call" && activity.summary.includes("Phone intake: Needs callback"))).toBe(true);

    const tasks = await t.run(async (ctx) => {
      return await ctx.db.query("tasks").withIndex("by_entity", (q) => q.eq("entityType", "customer").eq("entityId", lead.customerId)).collect();
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Call follow-up: Emergency tick treatment");
    expect(tasks[0].priority).toBe("high");
    expect(tasks[0].assignedUserId).toBeTruthy();
  });

  it("creates an estimate from lead opportunity context", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("quote_from_lead_owner"));
    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Quote From Lead Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "pro",
    });

    const lead = await owner.mutation(api.crm.createLead, {
      organizationId,
      customerName: "Quote Lead Homeowner",
      contactName: "Quote Lead Homeowner",
      email: "quote-lead@example.com",
      phone: "(508) 555-0144",
      property: {
        street: "44 Quote Lane",
        city: "Foxborough",
        state: "MA",
        postalCode: "02035",
      },
      title: "Fertilization quote from lead",
      source: "Website form",
      valueCents: 185000,
      serviceLines: ["lawn_care"],
    });

    const estimateId = await owner.mutation(api.estimates.createEstimate, {
      organizationId,
      opportunityId: lead.opportunityId,
      status: "draft",
      terms: "Drafted from lead context.",
      lineItems: [
        {
          name: "Six-step fertilization program",
          quantity: 1,
          unit: "season",
          unitPriceCents: 185000,
        },
      ],
    });

    const created = await t.run(async (ctx) => {
      const [estimate, lineItems, opportunity] = await Promise.all([
        ctx.db.get(estimateId),
        ctx.db.query("estimateLineItems").withIndex("by_estimate", (q) => q.eq("estimateId", estimateId)).collect(),
        ctx.db.get(lead.opportunityId),
      ]);
      return { estimate, lineItems, opportunity };
    });

    expect(created.estimate?.customerId).toBe(lead.customerId);
    expect(created.estimate?.propertyId).toBe(lead.propertyId);
    expect(created.estimate?.totalCents).toBe(185000);
    expect(created.lineItems).toHaveLength(1);
    expect(created.lineItems[0].name).toBe("Six-step fertilization program");
    expect(created.opportunity?.stage).toBe("estimating");
    expect(created.opportunity?.valueCents).toBe(185000);
  });

  it("attaches service package assumptions to estimate line items", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("service_package_owner"));
    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Service Package Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "pro",
    });

    const settings = await owner.query(api.admin.getSettings, { organizationId });
    const servicePackage = settings.servicePackages.find((item) => item.name === "Mosquito and tick protection package");
    expect(servicePackage).toBeTruthy();
    expect(servicePackage?.laborHours).toBe(3.5);
    expect(servicePackage?.materialCostCents).toBe(12600);
    expect(servicePackage?.equipmentCostCents).toBe(5800);
    expect(servicePackage?.targetMarginPercent).toBe(45);
    expect(servicePackage?.checklistDefaults).toEqual(expect.arrayContaining(["Record product and EPA label"]));

    const lead = await owner.mutation(api.crm.createLead, {
      organizationId,
      customerName: "Package Lead Homeowner",
      contactName: "Package Lead Homeowner",
      email: "package-lead@example.com",
      phone: "(508) 555-0145",
      property: {
        street: "45 Package Lane",
        city: "Foxborough",
        state: "MA",
        postalCode: "02035",
      },
      title: "Mosquito package quote",
      source: "Website form",
      valueCents: servicePackage?.defaultPriceCents ?? 78000,
      serviceLines: ["pest_control"],
    });

    const estimateId = await owner.mutation(api.estimates.createEstimate, {
      organizationId,
      opportunityId: lead.opportunityId,
      status: "draft",
      lineItems: [
        {
          servicePackageId: servicePackage?._id,
          serviceCatalogItemId: servicePackage?.includedServiceCatalogItemIds[0],
          name: servicePackage?.name ?? "Mosquito and tick protection package",
          description: servicePackage?.description,
          quantity: 1,
          unit: "season",
          unitPriceCents: servicePackage?.defaultPriceCents ?? 78000,
        },
      ],
    });

    const created = await t.run(async (ctx) => {
      const [estimate, lineItems] = await Promise.all([
        ctx.db.get(estimateId),
        ctx.db.query("estimateLineItems").withIndex("by_estimate", (q) => q.eq("estimateId", estimateId)).collect(),
      ]);
      const packageDoc = servicePackage?._id ? await ctx.db.get(servicePackage._id) : null;
      return { estimate, lineItems, packageDoc };
    });

    expect(created.estimate?.totalCents).toBe(servicePackage?.defaultPriceCents);
    expect(created.lineItems).toHaveLength(1);
    expect(created.lineItems[0].servicePackageId).toBe(servicePackage?._id);
    expect(created.lineItems[0].serviceCatalogItemId).toBe(servicePackage?.includedServiceCatalogItemIds[0]);
    expect(created.packageDoc?.laborRateCents).toBe(3400);
    expect(created.packageDoc?.overheadPercent).toBe(16);
  });

  it("prices fertilization from material rates, property area, price rules, and margin target", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("fert_pricing_owner"));
    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Fert Pricing Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "pro",
    });
    const settings = await owner.query(api.admin.getSettings, { organizationId });
    const material = settings.materials.find((item) => item.name === "Merit grub control");
    const priceBookItem = settings.priceBookItems.find((item) => item.name === "Six-step program by lawn size");
    expect(material?.costCents).toBe(7300);
    expect(priceBookItem?.formula).toBe("max(minPrice, lawnSizeSqFt * 0.018)");
    expect(settings.pricingRules.map((rule) => rule.name)).toEqual(expect.arrayContaining(["Large turf production complexity", "Small property minimum handling"]));

    const lead = await owner.mutation(api.crm.createLead, {
      organizationId,
      customerName: "Fert Pricing HOA",
      contactName: "Fert Pricing HOA",
      email: "fert-pricing@example.com",
      phone: "(508) 555-0146",
      property: {
        street: "46 Fert Lane",
        city: "Foxborough",
        state: "MA",
        postalCode: "02035",
      },
      title: "Six-step fertilization pricing",
      source: "Website form",
      valueCents: 165000,
      serviceLines: ["lawn_care"],
      lawnSizeSqFt: 72000,
    });

    const propertyAreaId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("propertyAreas", {
        organizationId,
        propertyId: lead.propertyId,
        name: "HOA common turf",
        kind: "front_lawn",
        size: 52000,
        unit: "sq_ft",
        notes: "Shared turf used for fert pricing test.",
        createdAt: now,
        updatedAt: now,
      });
    });

    const priced = await owner.mutation(api.pricing.priceFertilizationProgram, {
      organizationId,
      propertyId: lead.propertyId,
      propertyAreaId,
      materialId: material!._id,
      priceBookItemId: priceBookItem!._id,
      applicationCount: 6,
      materialRateUnitsPer1000SqFt: 0.008,
      laborHoursPerApplication: 1.5,
      laborRateCents: 3200,
      equipmentCostCentsPerApplication: 2500,
      overheadPercent: 18,
      targetMarginPercent: 42,
      selectedScenarioKey: "target",
      selectedScenarioLabel: "Target margin",
      selectedScenarioTargetMarginPercent: 42,
      estimateLineItemName: "6-step fertilization program",
      estimateLineItemUnit: "season",
    });

    expect(priced.output.turfAreaSqFt).toBe(52000);
    expect(priced.output.appliedAdjustments.map((adjustment) => adjustment.name)).toContain("Large turf production complexity");
    expect(priced.output.recommendedPriceCents).toBeGreaterThan(priced.output.priceBookRevenueCents);
    expect(priced.output.grossMarginPercent).toBeGreaterThanOrEqual(42);

    const persisted = await t.run(async (ctx) => {
      const [session, audits] = await Promise.all([
        ctx.db.get(priced.sessionId),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
      ]);
      return { session, audits };
    });
    expect(persisted.session?.inputs.kind).toBe("fertilization_program");
    expect(persisted.session?.inputs.propertyAreaId).toBe(propertyAreaId);
    expect(persisted.session?.inputs.selectedScenario).toMatchObject({ key: "target", label: "Target margin", targetMarginPercent: 42 });
    expect(persisted.session?.outputs.recommendedPriceCents).toBe(priced.output.recommendedPriceCents);
    expect(persisted.session?.outputs.estimateLineItemPreview).toMatchObject({
      name: "6-step fertilization program",
      quantity: 1,
      unit: "season",
      unitPriceCents: priced.output.recommendedPriceCents,
    });
    expect(persisted.audits.some((event) => event.action === "pricing.fertilization.calculate" && event.entityId === lead.propertyId)).toBe(true);
  });

  it("blocks risky estimate send until manager approval is granted", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("approval_owner"));
    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Approval Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "pro",
    });
    const sales = await addMember(t, organizationId, "approval_sales", "sales");
    const manager = await addMember(t, organizationId, "approval_manager", "manager");
    const settings = await owner.query(api.admin.getSettings, { organizationId });
    const servicePackage = settings.servicePackages.find((item) => item.name === "Mosquito and tick protection package");
    expect(servicePackage).toBeTruthy();

    const lead = await sales.actor.mutation(api.crm.createLead, {
      organizationId,
      customerName: "Approval Homeowner",
      contactName: "Approval Homeowner",
      email: "approval@example.com",
      phone: "(508) 555-0147",
      property: {
        street: "47 Approval Lane",
        city: "Foxborough",
        state: "MA",
        postalCode: "02035",
      },
      title: "Discounted mosquito approval",
      source: "Website form",
      valueCents: 30000,
      serviceLines: ["pest_control"],
    });

    const estimateId = await sales.actor.mutation(api.estimates.createEstimate, {
      organizationId,
      opportunityId: lead.opportunityId,
      status: "draft",
      lineItems: [
        {
          servicePackageId: servicePackage!._id,
          serviceCatalogItemId: servicePackage!.includedServiceCatalogItemIds[0],
          name: "Discounted mosquito package",
          quantity: 1,
          unit: "season",
          unitPriceCents: 30000,
        },
      ],
    });

    await expectRejected("risky estimate cannot be sent without approval", () =>
      sales.actor.mutation(api.estimates.sendEstimate, { organizationId, estimateId }),
    );

    const request = await sales.actor.mutation(api.estimates.requestApproval, {
      organizationId,
      estimateId,
      assignedApproverUserId: manager.userId,
      materialConstraint: true,
    });
    expect(request.evaluation.requiresApproval).toBe(true);
    expect(request.evaluation.reasons.map((reason) => reason.code)).toEqual(expect.arrayContaining(["low_margin", "material_constraint"]));

    await expectRejected("sales cannot approve estimate requests", () =>
      sales.actor.mutation(api.estimates.decideApproval, {
        organizationId,
        approvalRequestId: request.approvalRequestId,
        decision: "approved",
        comment: "Should not be allowed.",
      }),
    );

    await manager.actor.mutation(api.estimates.decideApproval, {
      organizationId,
      approvalRequestId: request.approvalRequestId,
      decision: "approved",
      comment: "Margin reviewed and approved.",
    });
    await sales.actor.mutation(api.estimates.sendEstimate, { organizationId, estimateId });

    const persisted = await t.run(async (ctx) => {
      const [estimate, approvalRequest, audits] = await Promise.all([
        ctx.db.get(estimateId),
        ctx.db.get(request.approvalRequestId),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
      ]);
      return { estimate, approvalRequest, audits };
    });
    expect(persisted.estimate?.status).toBe("sent");
    expect(persisted.estimate?.approvalStatus).toBe("approved");
    expect(persisted.approvalRequest?.status).toBe("approved");
    expect(persisted.audits.map((event) => event.action)).toEqual(expect.arrayContaining(["estimate.approval.request", "estimate.approval.approved", "estimate.send"]));
  });

  it("sends a customer-ready estimate with expiration, activity, and audit trail", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("send_quote_owner"));
    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Send Quote Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "pro",
    });
    const settings = await owner.query(api.admin.getSettings, { organizationId });
    const serviceCatalogItemId = settings.serviceCatalog[0]._id;
    const lead = await owner.mutation(api.crm.createLead, {
      organizationId,
      customerName: "Quote Ready Homeowner",
      contactName: "Quote Ready Homeowner",
      email: "quote-ready@example.com",
      phone: "(508) 555-0148",
      property: {
        street: "48 Quote Lane",
        city: "Foxborough",
        state: "MA",
        postalCode: "02035",
      },
      title: "Customer quote send package",
      source: "Manual",
      valueCents: 125000,
      serviceLines: ["lawn_care"],
    });

    const estimateId = await owner.mutation(api.estimates.createEstimate, {
      organizationId,
      opportunityId: lead.opportunityId,
      status: "draft",
      terms: "Quote expires in 14 days and includes scope, price, property, and service terms.",
      lineItems: [
        {
          serviceCatalogItemId,
          name: "Customer-facing lawn quote",
          quantity: 1,
          unit: "project",
          unitPriceCents: 125000,
        },
      ],
    });
    const sent = await owner.mutation(api.estimates.sendEstimate, { organizationId, estimateId });
    expect(sent.status).toBe("sent");
    expect(sent.expiresAt).toBeGreaterThan(sent.sentAt);

    const persisted = await t.run(async (ctx) => {
      const [estimate, opportunity, activities, audits] = await Promise.all([
        ctx.db.get(estimateId),
        ctx.db.get(lead.opportunityId),
        ctx.db.query("activities").withIndex("by_org_time", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
      ]);
      return { estimate, opportunity, activities, audits };
    });

    expect(persisted.estimate?.status).toBe("sent");
    expect(persisted.estimate?.sentAt).toBe(sent.sentAt);
    expect(persisted.estimate?.expiresAt).toBe(sent.expiresAt);
    expect(persisted.opportunity?.stage).toBe("proposal_sent");
    expect(persisted.activities.some((activity) => activity.entityType === "estimate" && activity.entityId === estimateId && activity.summary.includes("to customer"))).toBe(true);
    expect(persisted.audits.some((event) => event.action === "estimate.send" && event.entityId === estimateId && event.after?.expiresAt === sent.expiresAt)).toBe(true);

    const accepted = await owner.mutation(api.estimates.acceptEstimate, {
      organizationId,
      estimateId,
      acceptedByName: "Quote Ready Homeowner",
      acceptedByEmail: "quote-ready@example.com",
      acceptanceSource: "email",
      acceptanceNote: "Customer approved the quoted scope by email.",
    });
    expect(accepted.status).toBe("accepted");

    const acceptedPersisted = await t.run(async (ctx) => {
      const [estimate, opportunity, activities, audits] = await Promise.all([
        ctx.db.get(estimateId),
        ctx.db.get(lead.opportunityId),
        ctx.db.query("activities").withIndex("by_org_time", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
      ]);
      return { estimate, opportunity, activities, audits };
    });
    expect(acceptedPersisted.estimate?.status).toBe("accepted");
    expect(acceptedPersisted.estimate?.acceptedAt).toBe(accepted.acceptedAt);
    expect(acceptedPersisted.estimate?.acceptedByName).toBe("Quote Ready Homeowner");
    expect(acceptedPersisted.estimate?.acceptedByEmail).toBe("quote-ready@example.com");
    expect(acceptedPersisted.estimate?.acceptanceSource).toBe("email");
    expect(acceptedPersisted.opportunity?.stage).toBe("won");
    expect(acceptedPersisted.opportunity?.closeProbability).toBe(100);
    expect(acceptedPersisted.activities.some((activity) => activity.entityType === "estimate" && activity.entityId === estimateId && activity.summary.includes("accepted"))).toBe(true);
    expect(acceptedPersisted.audits.some((event) => event.action === "estimate.accept" && event.entityId === estimateId && event.after?.acceptedByName === "Quote Ready Homeowner")).toBe(true);
  });

  it("captures public web-form leads with campaign and spam scoring", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("web_intake_owner"));
    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Public Web Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "pro",
    });
    const organization = await t.run(async (ctx) => await ctx.db.get(organizationId));
    expect(organization?.slug).toBe("public-web-turf-co");

    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("spamRules", {
        organizationId,
        name: "Unsubscribe solicitation",
        kind: "message_phrase",
        pattern: "unsubscribe",
        score: 50,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await owner.mutation(api.leadIntake.submitWebLead, {
      organizationSlug: "public-web-turf-co",
      customerName: "Web Spam Prospect",
      email: "marketing@example.com",
      city: "Foxborough",
      state: "MA",
      serviceLine: "lawn_care",
      campaign: "Spring Fertilization PPC",
      sourceDetail: "Google Ads",
      message: "We generate leads. Click unsubscribe if this is not relevant.",
      estimatedValueCents: 180000,
    });

    expect(result.status).toBe("spam");
    expect(result.spamScore).toBeGreaterThanOrEqual(70);
    const rows = await t.run(async (ctx) => {
      const [lead, submission, issues] = await Promise.all([
        ctx.db.get(result.leadId),
        ctx.db.get(result.submissionId),
        ctx.db.query("dataQualityIssues").withIndex("by_lead", (q) => q.eq("leadId", result.leadId)).collect(),
      ]);
      const property = lead?.propertyId ? await ctx.db.get(lead.propertyId) : null;
      return { lead, submission, issues, property };
    });

    expect(rows.submission?.source).toBe("Website form");
    expect(rows.submission?.payload.campaign).toBe("Spring Fertilization PPC");
    expect(rows.lead?.source).toBe("Website form");
    expect(rows.lead?.sourceDetail).toBe("Google Ads");
    expect(rows.lead?.programRequests).toEqual(["lawn_care"]);
    expect(rows.property?.city).toBe("Foxborough");
    expect(rows.issues.some((issue) => issue.kind === "potential_spam" && issue.severity === "critical")).toBe(true);
  });

  it("creates repeat-customer leads without duplicating the customer", async () => {
    const t = convexTest(schema, modules);
    const tenant = await createOperationalTenant(t, "repeat_customer");

    const beforeCustomers = await tenant.owner.query(api.crm.listCustomers, { organizationId: tenant.organizationId });
    expect(beforeCustomers).toHaveLength(1);

    const created = await tenant.owner.mutation(api.crm.createLeadForCustomer, {
      organizationId: tenant.organizationId,
      customerId: tenant.customerId,
      title: "Repeat irrigation inspection",
      source: "Repeat customer",
      valueCents: 65000,
      serviceLines: ["irrigation"],
      message: "Existing customer requested a second service line.",
    });

    const afterCustomers = await tenant.owner.query(api.crm.listCustomers, { organizationId: tenant.organizationId });
    expect(afterCustomers).toHaveLength(1);

    const opportunities = await tenant.owner.query(api.pipeline.listOpportunities, { organizationId: tenant.organizationId });
    expect(opportunities.some((row) => row.opportunity._id === created.opportunityId && row.opportunity.customerId === tenant.customerId)).toBe(true);

    const profile = await tenant.owner.query(api.crm.getCustomerProfile, { organizationId: tenant.organizationId, customerId: tenant.customerId });
    expect(profile.activities.some((activity) => activity.summary.includes("Repeat service request created: Repeat irrigation inspection"))).toBe(true);
  });

  it("returns a complete customer account profile with finance, notes, and files", async () => {
    const t = convexTest(schema, modules);
    const tenant = await createOperationalTenant(t, "customer_profile");
    const now = Date.now();

    const seeded = await t.run(async (ctx) => {
      const invoiceId = await ctx.db.insert("customerInvoices", {
        organizationId: tenant.organizationId,
        customerId: tenant.customerId,
        jobId: tenant.jobId,
        estimateId: tenant.estimateId,
        invoiceNumber: "INV-PROFILE-1001",
        status: "partially_paid",
        subtotalCents: 90000,
        taxCents: 0,
        totalCents: 90000,
        paidCents: 40000,
        dueAt: now + 7 * 24 * 60 * 60 * 1000,
        sentAt: now - 24 * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
      const paymentId = await ctx.db.insert("customerPayments", {
        organizationId: tenant.organizationId,
        customerId: tenant.customerId,
        invoiceId,
        status: "posted",
        method: "ach",
        amountCents: 40000,
        receivedAt: now,
        reference: "ACH-PROFILE",
        createdAt: now,
        updatedAt: now,
      });
      const noteId = await ctx.db.insert("notes", {
        organizationId: tenant.organizationId,
        entityType: "customer",
        entityId: tenant.customerId,
        body: "Customer profile note for account workspace coverage.",
        visibility: "internal",
        createdAt: now,
        updatedAt: now,
      });
      const fileId = await ctx.db.insert("files", {
        organizationId: tenant.organizationId,
        entityType: "customer",
        entityId: tenant.customerId,
        fileName: "Customer service agreement.pdf",
        contentType: "application/pdf",
        size: 128000,
        createdAt: now,
      });
      return { invoiceId, paymentId, noteId, fileId };
    });

    const profile = await tenant.owner.query(api.crm.getCustomerProfile, {
      organizationId: tenant.organizationId,
      customerId: tenant.customerId,
    });

    expect(profile.contacts.length).toBeGreaterThan(0);
    expect(profile.properties.length).toBeGreaterThan(0);
    expect(profile.estimates.map((estimate) => estimate._id)).toContain(tenant.estimateId);
    expect(profile.jobs.map((job) => job._id)).toContain(tenant.jobId);
    expect(profile.invoices.map((invoice) => invoice._id)).toContain(seeded.invoiceId);
    expect(profile.payments.map((payment) => payment._id)).toContain(seeded.paymentId);
    expect(profile.notes.map((note) => note._id)).toContain(seeded.noteId);
    expect(profile.files.map((file) => file._id)).toContain(seeded.fileId);
  });

  it("flags stale leads with quality issues and follow-up tasks", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("stale_owner"));

    await owner.mutation(api.demo.bootstrapWorkspace, {});
    await owner.mutation(api.operating.bootstrapOperatingDepth, {});
    const firstRun = await owner.mutation(api.operating.runStaleLeadCheck, {});
    const secondRun = await owner.mutation(api.operating.runStaleLeadCheck, {});

    expect(firstRun.inserted).toBeGreaterThan(0);
    expect(secondRun.inserted).toBe(0);

    const rows = await t.run(async (ctx) => {
      const organization = await ctx.db.query("organizations").withIndex("by_slug", (q) => q.eq("slug", "greenline-demo")).unique();
      if (!organization) return { issues: [], tasks: [] };
      const [issues, tasks] = await Promise.all([
        ctx.db.query("dataQualityIssues").withIndex("by_org_kind", (q) => q.eq("organizationId", organization._id).eq("kind", "stale_follow_up")).collect(),
        ctx.db.query("tasks").withIndex("by_org_status", (q) => q.eq("organizationId", organization._id).eq("status", "open")).collect(),
      ]);
      return { issues, tasks: tasks.filter((task) => task.title.startsWith("Follow up stale lead:")) };
    });

    expect(rows.issues.length).toBe(firstRun.inserted);
    expect(rows.tasks.length).toBe(firstRun.inserted);
  });

  it("logs customer call activity with opportunity impact", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("activity_owner"));
    await owner.mutation(api.demo.bootstrapWorkspace, {});
    const created = await owner.mutation(api.demo.createLead, {
      customerName: "Activity Impact Customer",
      title: "Activity impact test service",
      street: "55 Activity Way",
      city: "Foxborough",
      state: "MA",
      postalCode: "02035",
      valueCents: 50000,
      serviceLine: "maintenance",
      source: "Manual",
    });

    const before = await t.run(async (ctx) => {
      const opportunity = await ctx.db.get(created.opportunityId);
      if (!opportunity) throw new Error("missing opportunity");
      return { customerId: created.customerId, opportunityId: opportunity._id, closeProbability: opportunity.closeProbability };
    });

    await owner.mutation(api.demo.addActivity, {
      entityType: "customer",
      entityId: before.customerId,
      kind: "call",
      summary: "Call outcome: Estimate requested. Board asked for revised scope.",
      createFollowUp: true,
      dueInDays: 4,
      callOutcome: "estimate_requested",
      opportunityImpact: "increase_probability",
    });

    const after = await t.run(async (ctx) => {
      const [opportunity, activities, tasks] = await Promise.all([
        ctx.db.get(before.opportunityId),
        ctx.db.query("activities").withIndex("by_entity", (q) => q.eq("entityType", "customer").eq("entityId", before.customerId)).collect(),
        ctx.db.query("tasks").withIndex("by_entity", (q) => q.eq("entityType", "customer").eq("entityId", before.customerId)).collect(),
      ]);
      return { opportunity, activities, tasks };
    });

    expect(after.opportunity?.closeProbability).toBeGreaterThan(before.closeProbability);
    expect(after.activities.some((activity) => activity.kind === "call" && activity.metadata?.opportunityImpact === "increase_probability")).toBe(true);
    expect(after.tasks.some((task) => task.title.includes("Call outcome: Estimate requested"))).toBe(true);
  });

  it("filters manager pipeline views by source, service, probability, value, age, and next step", async () => {
    const t = convexTest(schema, modules);
    const tenant = await createOperationalTenant(t, "pipeline_filters");

    const repeat = await tenant.owner.mutation(api.crm.createLeadForCustomer, {
      organizationId: tenant.organizationId,
      customerId: tenant.customerId,
      title: "Pipeline irrigation expansion",
      source: "Repeat customer",
      valueCents: 65000,
      serviceLines: ["irrigation"],
      message: "Existing customer wants irrigation add-on.",
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(repeat.opportunityId, { updatedAt: Date.now() - 20 * 24 * 60 * 60 * 1000, closeProbability: 45 });
    });

    const repeatSource = await tenant.owner.query(api.pipeline.listOpportunities, {
      organizationId: tenant.organizationId,
      source: "Repeat customer",
    });
    expect(repeatSource.map((row) => row.opportunity._id)).toContain(repeat.opportunityId);
    expect(repeatSource.every((row) => row.lead?.source === "Repeat customer")).toBe(true);

    const irrigation = await tenant.owner.query(api.pipeline.listOpportunities, {
      organizationId: tenant.organizationId,
      serviceLine: "irrigation",
      minValueCents: 50000,
      minProbability: 40,
      staleDays: 14,
      nextStep: "follow_up",
      search: "irrigation",
    });
    expect(irrigation).toHaveLength(1);
    expect(irrigation[0].opportunity._id).toBe(repeat.opportunityId);

    const proposalAction = await tenant.owner.query(api.pipeline.listOpportunities, {
      organizationId: tenant.organizationId,
      nextStep: "proposal",
    });
    expect(proposalAction.every((row) => ["estimating", "proposal_sent"].includes(row.opportunity.stage))).toBe(true);
  });

  it("provisions a new SaaS workspace with plan limits, defaults, and audit evidence", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("provision_owner"));

    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Provisioned Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "free",
    });

    const organizations = await owner.query(api.setup.listMyOrganizations, {});
    const current = organizations.find((row) => row.organization._id === organizationId);
    expect(current?.organization.slug).toBe("provisioned-turf-co");
    expect(current?.membership.role).toBe("owner");
    expect(current?.subscription?.plan).toBe("free");
    expect(current?.usage.contacts).toBe(0);
    expect(current?.usage.contactLimit).toBe(10);
    expect(current?.usage.memberLimit).toBe(1);

    const settings = await owner.query(api.admin.getSettings, { organizationId });
    expect(settings.members).toHaveLength(1);
    expect(settings.crews).toHaveLength(1);
    expect(settings.serviceCatalog.map((item) => item.name)).toEqual(
      expect.arrayContaining(["Six-step fertilization program", "Mosquito and tick barrier"]),
    );
    expect(settings.servicePackages.map((item) => item.name)).toEqual(
      expect.arrayContaining(["Lawn health season package", "Mosquito and tick protection package", "Spring cleanup production package"]),
    );
    expect(settings.servicePackages.find((item) => item.name === "Lawn health season package")?.targetMarginPercent).toBe(42);
    expect(settings.materials.map((item) => item.name)).toEqual(expect.arrayContaining(["Merit grub control", "Premium overseed blend"]));
    expect(settings.priceBookItems.map((item) => item.name)).toEqual(expect.arrayContaining(["Six-step program by lawn size"]));
    expect(settings.pricingRules.map((rule) => rule.name)).toEqual(expect.arrayContaining(["Large turf production complexity", "Small property minimum handling"]));

    const seeded = await t.run(async (ctx) => {
      const [leadStatuses, savedViews, onboardingItems, featureFlags, integrations, auditEvents, crewMembers] = await Promise.all([
        ctx.db.query("leadStatusSettings").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("leadSavedViews").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("onboardingChecklistItems").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("featureFlags").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("externalIntegrations").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("crewMembers").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
      ]);
      return { leadStatuses, savedViews, onboardingItems, featureFlags, integrations, auditEvents, crewMembers };
    });

    expect(seeded.leadStatuses.map((status) => status.status)).toEqual(expect.arrayContaining(["new", "do_estimate", "converted", "spam"]));
    expect(seeded.savedViews.map((view) => view.name)).toEqual(expect.arrayContaining(["New leads", "Needs estimate", "Spam review"]));
    expect(seeded.onboardingItems.map((item) => item.key)).toEqual(expect.arrayContaining(["profile", "members", "catalog", "lead_import", "rates", "first_job"]));
    expect(seeded.featureFlags.filter((flag) => flag.enabled).map((flag) => flag.key)).toEqual(expect.arrayContaining(["lead_ops_table", "dispatch_board", "field_pwa", "job_costing_v1", "profit_dashboard"]));
    expect(seeded.integrations.map((integration) => integration.provider)).toEqual(expect.arrayContaining(["google_maps", "csv"]));
    expect(seeded.crewMembers).toHaveLength(1);
    expect(seeded.auditEvents.some((event) => event.action === "organization.provision" && event.entityId === organizationId)).toBe(true);
  });

  it("can provision tenant-scoped sample data without touching the shared demo workspace", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("sample_owner"));

    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Sample Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "free",
      seedSampleData: true,
    });

    const workspace = await owner.query(api.workspace.getWorkspace, { organizationId });
    expect(workspace?.organization.name).toBe("Sample Turf Co");
    expect(workspace?.customers.map((customer) => customer.name)).toContain("Sample HOA Property");
    expect(workspace?.leads.map((lead) => lead.title)).toContain("Sample six-step turf program");

    const rows = await t.run(async (ctx) => {
      const [customers, contacts, properties, leads, auditEvents] = await Promise.all([
        ctx.db.query("customers").withIndex("by_org_updated", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("contacts").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("properties").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("leads").withIndex("by_org_created", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
      ]);
      return { customers, contacts, properties, leads, auditEvents };
    });

    expect(rows.customers).toHaveLength(1);
    expect(rows.contacts).toHaveLength(1);
    expect(rows.properties).toHaveLength(1);
    expect(rows.leads).toHaveLength(1);
    expect(rows.auditEvents.some((event) => event.action === "organization.provision" && event.after?.seedSampleData === true)).toBe(true);
  });

  it("syncs Stripe subscription and invoice webhook state idempotently", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test_webhook_secret");
    try {
      const t = convexTest(schema, modules);
      const owner = t.withIdentity(identity("billing_owner"));
      const organizationId = await owner.mutation(api.setup.createOrganization, {
        name: "Billing Turf Co",
        timezone: "America/New_York",
        industryFocus: "both",
        billingPlan: "free",
      });

      const first = await owner.mutation(api.billing.syncStripeSubscriptionFromWebhook, {
        webhookSecret: "test_webhook_secret",
        eventId: "evt_1",
        eventType: "checkout.session.completed",
        organizationId,
        stripeCustomerId: "cus_test_123",
        stripeSubscriptionId: "sub_test_123",
        plan: "pro",
        status: "active",
        seats: 1,
        currentPeriodStart: 1_789_000_000_000,
        currentPeriodEnd: 1_791_592_000_000,
        invoice: {
          stripeInvoiceId: "in_test_123",
          status: "paid",
          amountDueCents: 9900,
          amountPaidCents: 9900,
          paidAt: 1_789_000_100_000,
        },
      });
      const second = await owner.mutation(api.billing.syncStripeSubscriptionFromWebhook, {
        webhookSecret: "test_webhook_secret",
        eventId: "evt_1_retry",
        eventType: "invoice.paid",
        organizationId,
        stripeCustomerId: "cus_test_123",
        stripeSubscriptionId: "sub_test_123",
        plan: "pro",
        status: "active",
        seats: 1,
        currentPeriodStart: 1_789_000_000_000,
        currentPeriodEnd: 1_791_592_000_000,
        invoice: {
          stripeInvoiceId: "in_test_123",
          status: "paid",
          amountDueCents: 9900,
          amountPaidCents: 9900,
          paidAt: 1_789_000_100_000,
        },
      });

      expect(second.subscriptionId).toBe(first.subscriptionId);

      const billingState = await t.run(async (ctx) => {
        const [organization, subscriptions, invoices, auditEvents] = await Promise.all([
          ctx.db.get(organizationId),
          ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
          ctx.db.query("invoices").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
          ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
        ]);
        return { organization, subscriptions, invoices, auditEvents };
      });

      expect(billingState.organization?.billingPlan).toBe("pro");
      expect(billingState.organization?.subscriptionStatus).toBe("active");
      expect(billingState.subscriptions).toHaveLength(1);
      expect(billingState.subscriptions[0].stripeCustomerId).toBe("cus_test_123");
      expect(billingState.subscriptions[0].stripeSubscriptionId).toBe("sub_test_123");
      expect(billingState.invoices).toHaveLength(1);
      expect(billingState.invoices[0].stripeInvoiceId).toBe("in_test_123");
      expect(billingState.invoices[0].amountPaidCents).toBe(9900);
      expect(billingState.auditEvents.filter((event) => event.action === "billing.stripe_webhook.sync")).toHaveLength(2);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("syncs Paddle subscription and transaction webhook state idempotently", async () => {
    vi.stubEnv("PADDLE_WEBHOOK_SECRET_KEY", "test_paddle_secret");
    try {
      const t = convexTest(schema, modules);
      const owner = t.withIdentity(identity("paddle_owner"));
      const organizationId = await owner.mutation(api.setup.createOrganization, {
        name: "Paddle Turf Co",
        timezone: "America/New_York",
        industryFocus: "both",
        billingPlan: "free",
      });

      const first = await owner.mutation(api.billing.syncPaddleSubscriptionFromWebhook, {
        webhookSecret: "test_paddle_secret",
        eventId: "evt_paddle_1",
        eventType: "transaction.completed",
        organizationId,
        paddleCustomerId: "ctm_01paddlecustomer0000000000",
        paddleSubscriptionId: "sub_01paddlesubscription000000",
        paddleTransactionId: "txn_01paddletransaction000000",
        plan: "pro",
        status: "active",
        seats: 1,
        currentPeriodStart: 1_789_000_000_000,
        currentPeriodEnd: 1_791_592_000_000,
        invoice: {
          paddleTransactionId: "txn_01paddletransaction000000",
          status: "paid",
          amountDueCents: 0,
          amountPaidCents: 9900,
          paidAt: 1_789_000_100_000,
        },
      });
      const second = await owner.mutation(api.billing.syncPaddleSubscriptionFromWebhook, {
        webhookSecret: "test_paddle_secret",
        eventId: "evt_paddle_1_retry",
        eventType: "subscription.updated",
        organizationId,
        paddleCustomerId: "ctm_01paddlecustomer0000000000",
        paddleSubscriptionId: "sub_01paddlesubscription000000",
        paddleTransactionId: "txn_01paddletransaction000000",
        plan: "pro",
        status: "active",
        seats: 1,
        currentPeriodStart: 1_789_000_000_000,
        currentPeriodEnd: 1_791_592_000_000,
      });

      expect(second.subscriptionId).toBe(first.subscriptionId);

      const billingState = await t.run(async (ctx) => {
        const [organization, subscriptions, invoices, auditEvents] = await Promise.all([
          ctx.db.get(organizationId),
          ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
          ctx.db.query("invoices").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
          ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
        ]);
        return { organization, subscriptions, invoices, auditEvents };
      });

      expect(billingState.organization?.billingPlan).toBe("pro");
      expect(billingState.organization?.subscriptionStatus).toBe("active");
      expect(billingState.subscriptions).toHaveLength(1);
      expect(billingState.subscriptions[0].paddleCustomerId).toBe("ctm_01paddlecustomer0000000000");
      expect(billingState.subscriptions[0].paddleSubscriptionId).toBe("sub_01paddlesubscription000000");
      expect(billingState.invoices).toHaveLength(1);
      expect(billingState.invoices[0].paddleTransactionId).toBe("txn_01paddletransaction000000");
      expect(billingState.invoices[0].amountPaidCents).toBe(9900);
      expect(billingState.auditEvents.filter((event) => event.action === "billing.paddle_webhook.sync")).toHaveLength(2);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("creates and updates service catalog items with pricing defaults and audit trail", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("catalog_owner"));
    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Catalog Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "pro",
    });

    const createdItemId = await owner.mutation(api.admin.upsertServiceCatalogItem, {
      organizationId,
      name: "Quarterly perimeter pest service",
      category: "pest_control",
      defaultUnit: "visit",
      defaultPriceCents: 19900,
      active: true,
    });

    await owner.mutation(api.admin.upsertServiceCatalogItem, {
      organizationId,
      itemId: createdItemId,
      name: "Quarterly perimeter pest service plus",
      category: "pest_control",
      defaultUnit: "quarter",
      defaultPriceCents: 54900,
      active: false,
    });

    const persisted = await t.run(async (ctx) => {
      const [item, audits] = await Promise.all([
        ctx.db.get(createdItemId),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
      ]);
      return { item, audits };
    });

    expect(persisted.item?.name).toBe("Quarterly perimeter pest service plus");
    expect(persisted.item?.defaultUnit).toBe("quarter");
    expect(persisted.item?.defaultPriceCents).toBe(54900);
    expect(persisted.item?.active).toBe(false);
    expect(persisted.audits.some((event) => event.action === "catalog.create" && event.entityType === "service_catalog_item" && event.entityId === createdItemId)).toBe(true);
    expect(persisted.audits.some((event) => event.action === "catalog.update" && event.entityType === "service_catalog_item" && event.entityId === createdItemId && event.after?.defaultPriceCents === 54900 && event.before?.active === true)).toBe(true);
  });

  it("handles member invite lifecycle with plan limits, role guards, and audit events", async () => {
    const t = convexTest(schema, modules);
    const freeOwner = t.withIdentity(identity("free_invite_owner"));
    const freeOrganizationId = await freeOwner.mutation(api.setup.createOrganization, {
      name: "Free Invite Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "free",
    });

    await expectRejected("free plan cannot invite a second member", () =>
      freeOwner.mutation(api.admin.inviteMember, {
        organizationId: freeOrganizationId,
        email: "second@example.com",
        role: "manager",
      }),
    );

    const owner = t.withIdentity(identity("invite_owner"));
    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Invite Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "pro",
    });
    const sales = await addMember(t, organizationId, "invite_sales", "sales");

    await expectRejected("sales role cannot invite teammates", () =>
      sales.actor.mutation(api.admin.inviteMember, {
        organizationId,
        email: "blocked@example.com",
        role: "dispatcher",
      }),
    );

    const managerInvite = await owner.mutation(api.admin.inviteMember, {
      organizationId,
      email: "manager.invite@example.com",
      name: "Manager Invite",
      role: "manager",
    });
    let settings = await owner.query(api.admin.getSettings, { organizationId });
    expect(settings.members.some((row) => row.membership._id === managerInvite.membershipId && row.membership.status === "invited")).toBe(true);

    const invitee = t.withIdentity({
      subject: "manager_invitee",
      email: "manager.invite@example.com",
      name: "Manager Invite",
    });
    await invitee.mutation(api.admin.acceptMemberInvite, { organizationId });
    settings = await owner.query(api.admin.getSettings, { organizationId });
    const accepted = settings.members.find((row) => row.membership._id === managerInvite.membershipId);
    expect(accepted?.membership.status).toBe("active");
    expect(accepted?.membership.role).toBe("manager");
    expect(accepted?.user?.email).toBe("manager.invite@example.com");

    const revokedInvite = await owner.mutation(api.admin.inviteMember, {
      organizationId,
      email: "revoked.invite@example.com",
      role: "dispatcher",
    });
    await owner.mutation(api.admin.revokeMemberInvite, { organizationId, membershipId: revokedInvite.membershipId });
    settings = await owner.query(api.admin.getSettings, { organizationId });
    expect(settings.members.find((row) => row.membership._id === revokedInvite.membershipId)?.membership.status).toBe("revoked");

    const expiredInvite = await owner.mutation(api.admin.inviteMember, {
      organizationId,
      email: "expired.invite@example.com",
      role: "technician",
    });
    await owner.mutation(api.admin.expireMemberInvite, { organizationId, membershipId: expiredInvite.membershipId });
    const expiredUser = t.withIdentity({
      subject: "expired_invitee",
      email: "expired.invite@example.com",
      name: "Expired Invite",
    });
    await expectRejected("expired invites cannot be accepted", () => expiredUser.mutation(api.admin.acceptMemberInvite, { organizationId }));

    const auditEvents = await t.run(async (ctx) => ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect());
    expect(auditEvents.map((event) => event.action)).toEqual(expect.arrayContaining(["member.invite", "member.invite.accept", "member.invite.revoke", "member.invite.expire"]));
  });

  it("enforces the free plan contact limit", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({
      subject: "free_owner",
      email: "free-owner@example.com",
      name: "Free Owner",
    });

    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Free Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "free",
    });

    for (let index = 0; index < 10; index += 1) {
      await owner.mutation(api.crm.createLead, {
        organizationId,
        customerName: `Free Contact ${index + 1}`,
        contactName: `Free Contact ${index + 1}`,
        email: `contact${index + 1}@example.com`,
        phone: "(508) 555-0100",
        property: {
          street: `${index + 1} Test Lane`,
          city: "Foxborough",
          state: "MA",
          postalCode: "02035",
        },
        title: `Service request ${index + 1}`,
        source: "Manual",
        valueCents: 50000,
        serviceLines: ["lawn_care"],
      });
    }

    await expect(
      owner.mutation(api.crm.createLead, {
        organizationId,
        customerName: "Free Contact 11",
        contactName: "Free Contact 11",
        email: "contact11@example.com",
        phone: "(508) 555-0100",
        property: {
          street: "11 Test Lane",
          city: "Foxborough",
          state: "MA",
          postalCode: "02035",
        },
        title: "Service request 11",
        source: "Manual",
        valueCents: 50000,
        serviceLines: ["lawn_care"],
      }),
    ).rejects.toThrow(/allows 10 contacts/);
  });

  it("persists CSV lead import previews and commits ready rows with QA, caps, roles, and audit evidence", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("import_owner"));
    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Import Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "pro",
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(organizationId, { serviceTerritory: ["Foxborough", "Mansfield"] });
    });

    await owner.mutation(api.crm.createLead, {
      organizationId,
      customerName: "Duplicate Home",
      contactName: "Duplicate Home",
      email: "duplicate@example.com",
      phone: "(508) 555-0111",
      property: {
        street: "1 Existing Lane",
        city: "Foxborough",
        state: "MA",
        postalCode: "02035",
      },
      title: "Existing duplicate lead",
      source: "Manual",
      valueCents: 50000,
      serviceLines: ["lawn_care"],
    });

    const technician = await addMember(t, organizationId, "import_technician", "technician");
    await expectRejected("technicians cannot import leads", () =>
      technician.actor.mutation(api.imports.createLeadImportPreview, {
        organizationId,
        fileName: "blocked.csv",
        csvText: "Customer,Email,Street,City,State,Zip,Service\nBlocked,blocked@example.com,1 Test,Foxborough,MA,02035,Lawn",
      }),
    );

    const preview = await owner.mutation(api.imports.createLeadImportPreview, {
      organizationId,
      fileName: "lead-import.csv",
      csvText: [
        "Customer,Email,Phone,Street,City,State,Zip,Service,Source,Owner,Value",
        "Import Ready,ready@example.com,(508) 555-0101,2 Test Street,Foxborough,MA,02035,Lawn,CSV,import_owner@example.com,1200",
        "Duplicate Home,duplicate@example.com,(508) 555-0111,3 Test Street,Mansfield,MA,02048,Pest,CSV,,800",
        "Import Blocked,blocked@example.com,(508) 555-0103,4 Test Street,Boston,MA,02108,Pest,CSV,,700",
        "Bad Service,bad@example.com,(508) 555-0104,5 Test Street,Foxborough,MA,02035,Pool,CSV,,600",
      ].join("\n"),
    });

    expect(preview.rows.map((row) => row.status)).toEqual(["ready", "needs_review", "blocked", "blocked"]);
    expect(preview.rows[1].issues.map((issue) => issue.code)).toContain("duplicate");
    expect(preview.rows[2].issues.map((issue) => issue.code)).toContain("outside_service_territory");
    expect(preview.rows[3].issues.map((issue) => issue.code)).toContain("unknown_service_line");

    const commit = await owner.mutation(api.imports.commitLeadImportRows, {
      organizationId,
      importJobId: preview.importJobId,
    });
    expect(commit).toEqual({ imported: 1, skipped: 1, failed: 2 });

    const persisted = await owner.query(api.imports.listLeadImports, { organizationId });
    expect(persisted[0].job._id).toBe(preview.importJobId);
    expect(persisted[0].job.status).toBe("completed");
    expect(persisted[0].rows.filter((row) => row.status === "ready")).toHaveLength(1);

    const records = await t.run(async (ctx) => {
      const [customers, importRows, issues, audits] = await Promise.all([
        ctx.db.query("customers").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("importRows").withIndex("by_import_job", (q) => q.eq("importJobId", preview.importJobId)).collect(),
        ctx.db.query("dataQualityIssues").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect(),
      ]);
      return { customers, importRows, issues, audits };
    });

    expect(records.customers.some((customer) => customer.name === "Import Ready")).toBe(true);
    expect(records.importRows.map((row) => row.status)).toEqual(expect.arrayContaining(["imported", "skipped", "failed"]));
    expect(records.issues.map((issue) => issue.kind)).toEqual(expect.arrayContaining(["duplicate", "out_of_territory", "unknown_service_line"]));
    expect(records.audits.map((event) => event.action)).toEqual(expect.arrayContaining(["import.preview", "import.commit", "import.row.commit"]));
  });

  it("blocks CSV import commits at the free plan contact cap", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(identity("free_import_owner"));
    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Free Import Turf Co",
      timezone: "America/New_York",
      industryFocus: "both",
      billingPlan: "free",
    });

    for (let index = 0; index < 9; index += 1) {
      await owner.mutation(api.crm.createLead, {
        organizationId,
        customerName: `Free Import Existing ${index + 1}`,
        email: `free-import-${index + 1}@example.com`,
        phone: "(508) 555-0100",
        property: {
          street: `${index + 1} Free Lane`,
          city: "Foxborough",
          state: "MA",
          postalCode: "02035",
        },
        title: `Free import existing ${index + 1}`,
        source: "Manual",
        valueCents: 25000,
        serviceLines: ["lawn_care"],
      });
    }

    const preview = await owner.mutation(api.imports.createLeadImportPreview, {
      organizationId,
      fileName: "free-cap.csv",
      csvText: [
        "Customer,Email,Phone,Street,City,State,Zip,Service,Source",
        "Free Import 10,free-import-10@example.com,(508) 555-0110,10 Free Lane,Foxborough,MA,02035,Lawn,CSV",
        "Free Import 11,free-import-11@example.com,(508) 555-0111,11 Free Lane,Foxborough,MA,02035,Lawn,CSV",
      ].join("\n"),
    });

    expect(preview.rows.map((row) => row.status)).toEqual(["ready", "blocked"]);
    expect(preview.rows[1].issues.map((issue) => issue.code)).toContain("free_plan_limit");

    const commit = await owner.mutation(api.imports.commitLeadImportRows, {
      organizationId,
      importJobId: preview.importJobId,
    });
    expect(commit).toEqual({ imported: 1, skipped: 0, failed: 1 });
  });

  it("rejects cross-tenant reads without membership", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "user_owner", email: "owner@example.com", name: "Owner User" });
    const outsider = t.withIdentity({ subject: "user_outsider", email: "outsider@example.com", name: "Outsider User" });

    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Locked Tenant",
      timezone: "America/New_York",
      industryFocus: "both",
    });

    await outsider.mutation(api.setup.syncCurrentUser);
    await expect(outsider.query(api.dashboard.getOverview, { organizationId })).rejects.toThrow();
  });

  it("rejects cross-tenant reads, writes, and linked-entity references across production modules", async () => {
    const t = convexTest(schema, modules);
    const tenantA = await createOperationalTenant(t, "tenant_a");
    const tenantB = await createOperationalTenant(t, "tenant_b");
    const tenantAImport = await tenantA.owner.mutation(api.imports.createLeadImportPreview, {
      organizationId: tenantA.organizationId,
      fileName: "tenant-a-import.csv",
      csvText: "Customer,Email,Phone,Street,City,State,Zip,Service\nTenant A Import,ta-import@example.com,(508) 555-0199,1 Import Lane,Foxborough,MA,02035,Lawn",
    });

    await expectRejected("dashboard overview requires membership in requested org", () =>
      tenantB.owner.query(api.dashboard.getOverview, { organizationId: tenantA.organizationId }),
    );
    await expectRejected("CRM customer list requires membership in requested org", () =>
      tenantB.owner.query(api.crm.listCustomers, { organizationId: tenantA.organizationId }),
    );
    await expectRejected("pipeline list requires membership in requested org", () =>
      tenantB.owner.query(api.pipeline.listOpportunities, { organizationId: tenantA.organizationId }),
    );
    await expectRejected("dispatch schedule requires membership in requested org", () =>
      tenantB.owner.query(api.dispatch.getSchedule, {
        organizationId: tenantA.organizationId,
        start: tenantA.scheduledStart - 1000,
        end: tenantA.scheduledEnd + 1000,
      }),
    );
    await expectRejected("field visits require membership in requested org", () =>
      tenantB.owner.query(api.field.getMyVisits, {
        organizationId: tenantA.organizationId,
        start: tenantA.scheduledStart - 1000,
        end: tenantA.scheduledEnd + 1000,
      }),
    );
    await expectRejected("admin settings require membership in requested org", () =>
      tenantB.owner.query(api.admin.getSettings, { organizationId: tenantA.organizationId }),
    );
    await expectRejected("import list requires membership in requested org", () =>
      tenantB.owner.query(api.imports.listLeadImports, { organizationId: tenantA.organizationId }),
    );
    await expectRejected("import commit rejects another tenant's import job id", () =>
      tenantB.owner.mutation(api.imports.commitLeadImportRows, {
        organizationId: tenantB.organizationId,
        importJobId: tenantAImport.importJobId,
      }),
    );

    await expectRejected("customer profile rejects another tenant's customer id", () =>
      tenantB.owner.query(api.crm.getCustomerProfile, {
        organizationId: tenantB.organizationId,
        customerId: tenantA.customerId,
      }),
    );
    await expectRejected("job workspace rejects another tenant's job id", () =>
      tenantB.owner.query(api.jobs.getJobWorkspace, {
        organizationId: tenantB.organizationId,
        jobId: tenantA.jobId,
      }),
    );
    await expectRejected("customer update rejects another tenant's customer id", () =>
      tenantB.owner.mutation(api.crm.updateCustomer, {
        organizationId: tenantB.organizationId,
        customerId: tenantA.customerId,
        name: "Cross-tenant rename",
      }),
    );
    await expectRejected("opportunity stage rejects another tenant's opportunity id", () =>
      tenantB.owner.mutation(api.pipeline.advanceOpportunity, {
        organizationId: tenantB.organizationId,
        opportunityId: tenantA.opportunityId,
        stage: "lost",
        lossReason: "cross tenant",
      }),
    );
    await expectRejected("estimate creation rejects another tenant's opportunity id", () =>
      tenantB.owner.mutation(api.estimates.createEstimate, {
        organizationId: tenantB.organizationId,
        opportunityId: tenantA.opportunityId,
        status: "draft",
        lineItems: [{ name: "Invalid linked estimate", quantity: 1, unit: "visit", unitPriceCents: 10000 }],
      }),
    );
    await expectRejected("estimate conversion rejects another tenant's estimate id", () =>
      tenantB.owner.mutation(api.estimates.convertToJob, {
        organizationId: tenantB.organizationId,
        estimateId: tenantA.estimateId,
        scheduledStart: tenantB.scheduledStart,
        scheduledEnd: tenantB.scheduledEnd,
        crewId: tenantB.crewId,
      }),
    );
    await expectRejected("dispatch assignment rejects another tenant's visit id", () =>
      tenantB.owner.mutation(api.dispatch.assignVisit, {
        organizationId: tenantB.organizationId,
        visitId: tenantA.visitId,
        crewId: tenantB.crewId,
      }),
    );
    await expectRejected("field checklist rejects another tenant's visit id", () =>
      tenantB.owner.mutation(api.field.completeChecklistItem, {
        organizationId: tenantB.organizationId,
        visitId: tenantA.visitId,
        itemId: "arrival",
        isDone: true,
      }),
    );
    await expectRejected("field start rejects another tenant's visit id", () =>
      tenantB.owner.mutation(api.field.startVisit, {
        organizationId: tenantB.organizationId,
        visitId: tenantA.visitId,
        startSource: "manual",
      }),
    );
    await expectRejected("field submit rejects another tenant's visit id", () =>
      tenantB.owner.mutation(api.field.submitVisit, {
        organizationId: tenantB.organizationId,
        visitId: tenantA.visitId,
        notes: "cross tenant",
      }),
    );
    await expectRejected("task creation rejects another tenant's linked job id", () =>
      tenantB.owner.mutation(api.jobs.addTask, {
        organizationId: tenantB.organizationId,
        entityType: "job",
        entityId: tenantA.jobId,
        title: "Invalid cross-tenant task",
      }),
    );
    await expectRejected("note creation rejects another tenant's linked customer id", () =>
      tenantB.owner.mutation(api.activities.addNote, {
        organizationId: tenantB.organizationId,
        entityType: "customer",
        entityId: tenantA.customerId,
        body: "Invalid cross-tenant note",
      }),
    );
    await expectRejected("catalog update rejects another tenant's service item id", () =>
      tenantB.owner.mutation(api.admin.upsertServiceCatalogItem, {
        organizationId: tenantB.organizationId,
        itemId: tenantA.serviceCatalogItemId,
        name: "Invalid cross-tenant catalog edit",
        category: "lawn_care",
        defaultUnit: "visit",
        defaultPriceCents: 10000,
        active: true,
      }),
    );
  });

  it("enforces role restrictions and crew assignment for field users", async () => {
    const t = convexTest(schema, modules);
    const tenant = await createOperationalTenant(t, "role_scope");
    const technician = await addMember(t, tenant.organizationId, "role_scope_technician", "technician");

    await expectRejected("technicians cannot create CRM leads", () =>
      technician.actor.mutation(api.crm.createLead, {
        organizationId: tenant.organizationId,
        customerName: "Technician Lead",
        property: {
          street: "22 Role Lane",
          city: "Foxborough",
          state: "MA",
          postalCode: "02035",
        },
        title: "Technician-created lead",
        source: "Manual",
        valueCents: 10000,
        serviceLines: ["lawn_care"],
      }),
    );
    await expectRejected("technicians cannot move pipeline stages", () =>
      technician.actor.mutation(api.pipeline.advanceOpportunity, {
        organizationId: tenant.organizationId,
        opportunityId: tenant.opportunityId,
        stage: "lost",
        lossReason: "role test",
      }),
    );
    await expectRejected("technicians cannot create estimates", () =>
      technician.actor.mutation(api.estimates.createEstimate, {
        organizationId: tenant.organizationId,
        opportunityId: tenant.opportunityId,
        status: "draft",
        lineItems: [{ name: "Role test estimate", quantity: 1, unit: "visit", unitPriceCents: 10000 }],
      }),
    );
    await expectRejected("technicians cannot dispatch visits", () =>
      technician.actor.mutation(api.dispatch.assignVisit, {
        organizationId: tenant.organizationId,
        visitId: tenant.visitId,
        crewId: tenant.crewId,
      }),
    );
    await expectRejected("technicians cannot edit the service catalog", () =>
      technician.actor.mutation(api.admin.upsertServiceCatalogItem, {
        organizationId: tenant.organizationId,
        itemId: tenant.serviceCatalogItemId,
        name: "Technician catalog edit",
        category: "lawn_care",
        defaultUnit: "visit",
        defaultPriceCents: 10000,
        active: true,
      }),
    );

    const unassignedVisits = await technician.actor.query(api.field.getMyVisits, {
      organizationId: tenant.organizationId,
      start: tenant.scheduledStart - 1000,
      end: tenant.scheduledEnd + 1000,
    });
    expect(unassignedVisits).toHaveLength(0);
    await expectRejected("technicians cannot mutate visits outside their crew", () =>
      technician.actor.mutation(api.field.completeChecklistItem, {
        organizationId: tenant.organizationId,
        visitId: tenant.visitId,
        itemId: "arrival",
        isDone: true,
      }),
    );
    await expectRejected("technicians cannot start visits outside their crew", () =>
      technician.actor.mutation(api.field.startVisit, {
        organizationId: tenant.organizationId,
        visitId: tenant.visitId,
        startSource: "manual",
      }),
    );

    await addCrewMembership(t, tenant.organizationId, tenant.crewId, technician.userId);
    const assignedVisits = await technician.actor.query(api.field.getMyVisits, {
      organizationId: tenant.organizationId,
      start: tenant.scheduledStart - 1000,
      end: tenant.scheduledEnd + 1000,
    });
    expect(assignedVisits).toHaveLength(1);

    const started = await technician.actor.mutation(api.field.startVisit, {
      organizationId: tenant.organizationId,
      visitId: tenant.visitId,
      startSource: "manual",
    });
    const startedState = await t.run(async (ctx) => {
      const [visit, timesheet, audits] = await Promise.all([
        ctx.db.get(tenant.visitId),
        ctx.db.get(started.timesheetEntryId),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", tenant.organizationId)).collect(),
      ]);
      return { visit, timesheet, audits };
    });
    expect(startedState.visit?.status).toBe("on_site");
    expect(startedState.timesheet?.visitId).toBe(tenant.visitId);
    expect(startedState.timesheet?.userId).toBe(technician.userId);
    expect(startedState.timesheet?.startSource).toBe("manual");
    expect(startedState.audits.some((event) => event.action === "visit.start" && event.entityId === tenant.visitId && event.after?.timesheetEntryId === started.timesheetEntryId)).toBe(true);

    await technician.actor.mutation(api.field.completeChecklistItem, {
      organizationId: tenant.organizationId,
      visitId: tenant.visitId,
      itemId: "handoff-1",
      isDone: true,
    });
    const job = await tenant.owner.query(api.jobs.getJobWorkspace, {
      organizationId: tenant.organizationId,
      jobId: tenant.jobId,
    });
    const completedItem = job.visits[0].checklist.find((item) => item.id === "handoff-1");
    expect(completedItem?.label).toBe("Confirm approved estimate scope");
    expect(completedItem?.isDone).toBe(true);

    const settings = await tenant.owner.query(api.admin.getSettings, { organizationId: tenant.organizationId });
    const material = settings.materials.find((item) => item.name === "Merit grub control") ?? settings.materials[0];
    const targetAreaId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("propertyAreas", {
        organizationId: tenant.organizationId,
        propertyId: tenant.propertyId,
        name: "Back lawn test zone",
        kind: "back_lawn",
        size: 4200,
        unit: "sq_ft",
        notes: "Test application area.",
        createdAt: now,
        updatedAt: now,
      });
    });

    const submitted = await technician.actor.mutation(api.field.submitVisit, {
      organizationId: tenant.organizationId,
      visitId: tenant.visitId,
      notes: "Completed service with material application.",
      issueFlag: "Customer requested follow-up on back gate.",
      issue: {
        category: "upsell_opportunity",
        severity: "normal",
        summary: "Customer requested mosquito add-on from field crew.",
        details: "Technician discussed quarterly mosquito service while completing the visit.",
        customerVisible: true,
        createOpportunity: true,
        serviceCategory: "pest_control",
        estimatedValueCents: 67500,
      },
      materialApplications: [
        {
          materialId: material._id,
          quantity: 1.5,
          unit: material.unit,
          targetAreaId,
          notes: "Applied to back lawn test zone.",
        },
      ],
    });
    const submittedState = await t.run(async (ctx) => {
      const [visit, timesheet, materialApplications, tasks, fieldIssues, opportunities, activities, audits] = await Promise.all([
        ctx.db.get(tenant.visitId),
        ctx.db.get(submitted.timesheetEntryId),
        ctx.db.query("materialApplications").withIndex("by_visit", (q) => q.eq("visitId", tenant.visitId)).collect(),
        ctx.db.query("tasks").withIndex("by_entity", (q) => q.eq("entityType", "visit").eq("entityId", tenant.visitId)).collect(),
        ctx.db.query("fieldIssues").withIndex("by_visit", (q) => q.eq("visitId", tenant.visitId)).collect(),
        ctx.db.query("opportunities").withIndex("by_customer", (q) => q.eq("customerId", tenant.customerId)).collect(),
        ctx.db.query("activities").withIndex("by_entity", (q) => q.eq("entityType", "visit").eq("entityId", tenant.visitId)).collect(),
        ctx.db.query("auditEvents").withIndex("by_org", (q) => q.eq("organizationId", tenant.organizationId)).collect(),
      ]);
      return { visit, timesheet, materialApplications, tasks, fieldIssues, opportunities, activities, audits };
    });
    expect(submittedState.visit?.status).toBe("complete");
    expect(submittedState.visit?.issueFlags).toContain("Customer requested mosquito add-on from field crew.");
    expect(submittedState.timesheet?.status).toBe("submitted");
    expect(submittedState.timesheet?.hours).toBeGreaterThanOrEqual(0.25);
    expect(submittedState.materialApplications).toHaveLength(1);
    expect(submittedState.materialApplications[0].materialId).toBe(material._id);
    expect(submittedState.materialApplications[0].targetAreaId).toBe(targetAreaId);
    expect(submittedState.materialApplications[0].quantity).toBe(1.5);
    const issueTask = submittedState.tasks.find((task) => task.title === "Upsell opportunity: Customer requested mosquito add-on from field crew.");
    expect(issueTask?.priority).toBe("normal");
    const upsellOpportunity = submittedState.opportunities.find((opportunity) => opportunity.title === "Field upsell: Customer requested mosquito add-on from field crew.");
    expect(upsellOpportunity?.valueCents).toBe(67500);
    expect(upsellOpportunity?.serviceLines).toEqual(["pest_control"]);
    expect(submittedState.fieldIssues).toHaveLength(1);
    expect(submittedState.fieldIssues[0].category).toBe("upsell_opportunity");
    expect(submittedState.fieldIssues[0].severity).toBe("normal");
    expect(submittedState.fieldIssues[0].taskId).toBe(issueTask?._id);
    expect(submittedState.fieldIssues[0].opportunityId).toBe(upsellOpportunity?._id);
    expect(submittedState.activities.some((activity) => activity.summary === "Field issue flagged: Customer requested mosquito add-on from field crew." && activity.metadata?.fieldIssueId === submittedState.fieldIssues[0]._id)).toBe(true);
    expect(submittedState.audits.some((event) => event.action === "visit.submit" && event.entityId === tenant.visitId && event.after?.materialApplicationCount === 1 && event.after?.issueCategory === "upsell_opportunity" && event.after?.issueTaskId === issueTask?._id && event.after?.issueOpportunityId === upsellOpportunity?._id && event.after?.timesheetEntryId === submitted.timesheetEntryId)).toBe(true);
  });

  it("bootstraps operating depth and recalculates lead, cost, and payment records", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.demo.bootstrapWorkspace, {});
    const before = await t.query(api.operating.getDemoOperatingDepth, {});
    expect(before?.seeded).toBe(false);

    const bootstrap = await t.mutation(api.operating.bootstrapOperatingDepth, {});
    expect(bootstrap.recalculated).toBeGreaterThan(0);

    const seeded = await t.query(api.operating.getDemoOperatingDepth, {});
    expect(seeded?.seeded).toBe(true);
    expect(seeded?.leadOps.rows.length).toBeGreaterThan(0);
    expect(seeded?.jobCosting.summaries.length).toBeGreaterThan(0);
    expect(seeded?.costIntelligence.laborRates.length).toBeGreaterThan(0);
    expect(seeded?.revenue.invoices.length).toBeGreaterThan(0);
    expect(seeded?.admin.tagTaxonomy.length).toBeGreaterThan(0);
    expect(seeded?.admin.segmentCards.length).toBeGreaterThan(0);
    expect(seeded?.admin.ownerAnalytics.churn.length).toBeGreaterThan(0);
    expect(seeded?.admin.ownerAnalytics.ltv.length).toBeGreaterThan(0);
    expect(seeded?.admin.ownerAnalytics.pnl.length).toBeGreaterThan(0);
    expect(seeded?.admin.ownerAnalytics.costBreakdown.length).toBeGreaterThan(0);
    expect(seeded?.revenue.serviceLineProfitability.length).toBeGreaterThan(0);
    expect(seeded?.revenue.serviceLineProfitability[0].grossMarginPercent).toBeGreaterThanOrEqual(seeded?.revenue.serviceLineProfitability.at(-1)?.grossMarginPercent ?? 0);
    const serviceSnapshots = await t.run(async (ctx) => {
      const org = await ctx.db.query("organizations").withIndex("by_slug", (q) => q.eq("slug", "greenline-demo")).unique();
      return org
        ? await ctx.db.query("profitabilitySnapshots").withIndex("by_dimension", (q) => q.eq("organizationId", org._id).eq("dimensionType", "service_category")).collect()
        : [];
    });
    expect(serviceSnapshots.length).toBeGreaterThan(0);
    expect(serviceSnapshots.every((snapshot) => snapshot.dimensionId && snapshot.metadata?.jobCount >= 0)).toBe(true);

    const leadId = seeded!.leadOps.rows[0].id;
    await t.mutation(api.operating.updateLead, { leadId, status: "do_estimate", grade: "a" });
    const updated = await t.query(api.operating.getDemoOperatingDepth, {});
    expect(updated?.leadOps.rows.find((lead) => lead.id === leadId)?.status).toBe("do_estimate");

    const jobId = seeded!.jobCosting.summaries[0].jobId;
    await t.mutation(api.operating.addTimesheetEntry, { jobId, roleName: "Technician", hours: 1.25, hourlyCostCents: 3000 });
    const afterTime = await t.query(api.operating.getDemoOperatingDepth, {});
    expect(afterTime?.jobCosting.timesheets.some((entry) => entry.roleName === "Technician" && entry.hours === 1.25)).toBe(true);

    const invoice = afterTime!.revenue.invoices.find((candidate) => candidate.balanceCents > 0)!;
    const collectedBefore = afterTime!.revenue.collectedCents;
    await t.mutation(api.operating.recordCustomerPayment, { invoiceId: invoice.id, amountCents: 1000, method: "ach", reference: "TEST-ACH-1000" });
    const afterPayment = await t.query(api.operating.getDemoOperatingDepth, {});
    expect(afterPayment!.revenue.collectedCents).toBeGreaterThan(collectedBefore);
    expect(afterPayment!.admin.auditEvents.some((event) => event.action === "payment.record" && event.entityType === "customer_payment" && event.module === "Revenue")).toBe(true);

    const billableJobId = await t.run(async (ctx) => {
      const org = await ctx.db.query("organizations").withIndex("by_slug", (q) => q.eq("slug", "greenline-demo")).unique();
      const customer = org ? await ctx.db.query("customers").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first() : null;
      const property = org ? await ctx.db.query("properties").withIndex("by_org", (q) => q.eq("organizationId", org._id)).first() : null;
      if (!org || !customer) throw new Error("Missing seeded tenant.");
      const now = Date.now();
      const newJobId = await ctx.db.insert("jobs", {
        organizationId: org._id,
        customerId: customer._id,
        propertyId: property?._id,
        title: "Backend verified closeout job",
        status: "in_progress",
        priority: "normal",
        startDate: now - 2 * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("jobVisits", {
        organizationId: org._id,
        jobId: newJobId,
        customerId: customer._id,
        propertyId: property?._id,
        scheduledStart: now - 2 * 60 * 60 * 1000,
        scheduledEnd: now - 60 * 60 * 1000,
        status: "complete",
        routeOrder: 9,
        checklist: [{ id: "done", label: "Verified work completed", isDone: true, completedAt: now - 60 * 60 * 1000 }],
        completedAt: now - 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("timesheetEntries", {
        organizationId: org._id,
        jobId: newJobId,
        status: "approved",
        roleName: "Technician",
        startedAt: now - 2 * 60 * 60 * 1000,
        endedAt: now - 60 * 60 * 1000,
        hours: 1,
        hourlyCostCents: 3200,
        totalCostCents: 3200,
        createdAt: now,
        updatedAt: now,
      });
      return newJobId;
    });
    await t.mutation(api.operating.addTimesheetEntry, { jobId: billableJobId, roleName: "Crew Lead", hours: 1, hourlyCostCents: 3600 });
    const generatedInvoice = await t.mutation(api.operating.generateInvoiceFromJob, { jobId: billableJobId, status: "sent", dueInDays: 7 });
    expect(generatedInvoice.created).toBe(true);
    expect(generatedInvoice.invoiceNumber).toMatch(/^INV-/);
    const closeout = await t.mutation(api.operating.closeJob, { jobId: billableJobId, generateInvoice: true });
    expect(closeout.status).toBe("completed");
    expect(closeout.blockers).toEqual([]);
    const afterCloseout = await t.query(api.operating.getDemoOperatingDepth, {});
    expect(afterCloseout!.revenue.invoices.some((candidate) => candidate.id === generatedInvoice.invoiceId && candidate.jobId === billableJobId)).toBe(true);
    expect(afterCloseout!.revenue.arAging.some((candidate) => candidate.invoiceId === generatedInvoice.invoiceId && candidate.balanceCents > 0)).toBe(true);
    expect(afterCloseout!.revenue.customerProfitability.some((customer) => customer.invoiceCount > 0 && customer.grossMarginPercent >= 0)).toBe(true);
    expect(afterCloseout!.admin.auditEvents.some((event) => event.action === "job.closeout" && event.entityId === billableJobId && event.module === "Jobs")).toBe(true);
    expect(afterCloseout!.admin.auditEvents.some((event) => event.action === "revenue.invoice.generate" && event.entityId === generatedInvoice.invoiceId && event.module === "Revenue")).toBe(true);

    const complianceRecord = afterCloseout!.fieldOps.complianceRecords[0];
    const generatedCompliance = await t.mutation(api.operating.generateComplianceRecord, { visitId: complianceRecord.visitId });
    expect(generatedCompliance.recordCount).toBeGreaterThan(0);
    const afterCompliance = await t.query(api.operating.getDemoOperatingDepth, {});
    expect(afterCompliance!.admin.auditEvents.some((event) => event.action === "compliance_record.generate" && event.entityId === complianceRecord.visitId && event.module === "Compliance")).toBe(true);

    const snapshotCount = afterPayment!.costIntelligence.costSnapshots.length;
    await t.mutation(api.operating.refreshCostIntelligence, {});
    const afterRefresh = await t.query(api.operating.getDemoOperatingDepth, {});
    expect(afterRefresh!.costIntelligence.costSnapshots.length).toBeGreaterThan(snapshotCount);

    const laborRateId = await t.mutation(api.operating.upsertLaborRate, { roleName: "Audit Crew Lead", hourlyCostCents: 4150, billableRateCents: 9200 });
    const afterLaborCreate = await t.query(api.operating.getDemoOperatingDepth, {});
    const createdLaborRate = afterLaborCreate!.costIntelligence.laborRates.find((rate) => rate.id === laborRateId);
    expect(createdLaborRate).toMatchObject({
      roleName: "Audit Crew Lead",
      hourlyCostCents: 4150,
      billableRateCents: 9200,
      source: "admin_override",
      active: true,
    });
    expect(afterLaborCreate!.admin.auditEvents.some((event) => event.action === "labor_rate.create" && event.entityType === "labor_rate_card" && event.entityId === laborRateId && event.module === "Cost Intel/Admin")).toBe(true);

    await t.mutation(api.operating.upsertLaborRate, { id: laborRateId, roleName: "Audit Crew Lead", hourlyCostCents: 4375, billableRateCents: 9700 });
    const afterLaborUpdate = await t.query(api.operating.getDemoOperatingDepth, {});
    const laborUpdateAudit = afterLaborUpdate!.admin.auditEvents.find((event) => event.action === "labor_rate.update" && event.entityId === laborRateId);
    expect(laborUpdateAudit?.changedFields).toEqual(expect.arrayContaining(["hourlyCostCents", "billableRateCents"]));

    const vendorCatalogId = await t.mutation(api.operating.upsertVendorCatalogItem, {
      vendorName: "Audit Supplier",
      itemName: "Audit fertilizer 19-0-6",
      category: "lawn_care",
      unit: "bag",
      unitCostCents: 5800,
    });
    const afterVendorCreate = await t.query(api.operating.getDemoOperatingDepth, {});
    const createdVendorItem = afterVendorCreate!.costIntelligence.vendorCatalogs.find((item) => item.id === vendorCatalogId);
    expect(createdVendorItem).toMatchObject({
      vendorName: "Audit Supplier",
      itemName: "Audit fertilizer 19-0-6",
      unitCostCents: 5800,
      source: "admin_override",
      active: true,
    });
    expect(afterVendorCreate!.admin.auditEvents.some((event) => event.action === "vendor_catalog.create" && event.entityType === "vendor_catalog" && event.entityId === vendorCatalogId && event.module === "Cost Intel/Admin")).toBe(true);

    await t.mutation(api.operating.upsertVendorCatalogItem, {
      id: vendorCatalogId,
      vendorName: "Audit Supplier",
      itemName: "Audit fertilizer 19-0-6",
      category: "lawn_care",
      unit: "bag",
      unitCostCents: 6100,
    });
    const afterVendorUpdate = await t.query(api.operating.getDemoOperatingDepth, {});
    const vendorUpdateAudit = afterVendorUpdate!.admin.auditEvents.find((event) => event.action === "vendor_catalog.update" && event.entityId === vendorCatalogId);
    expect(vendorUpdateAudit?.changedFields).toEqual(expect.arrayContaining(["unitCostCents"]));

    const followUpStatus = afterVendorUpdate!.leadOps.statusSettings.find((setting) => setting.status === "follow_up")!;
    await t.mutation(api.operating.upsertLeadStatusSetting, {
      id: followUpStatus.id,
      status: "follow_up",
      label: "Estimate Follow-Up",
      color: "#0f766e",
      sortOrder: 4,
      terminal: false,
      active: true,
    });
    const afterStatusUpdate = await t.query(api.operating.getDemoOperatingDepth, {});
    const updatedStatus = afterStatusUpdate!.leadOps.statusSettings.find((setting) => setting.status === "follow_up");
    expect(updatedStatus).toMatchObject({ label: "Estimate Follow-Up", color: "#0f766e", sortOrder: 4, terminal: false, active: true });
    const statusAudit = afterStatusUpdate!.admin.auditEvents.find((event) => event.action === "workflow_status.update" && event.summary === "Updated workflow status Estimate Follow-Up");
    expect(statusAudit?.module).toBe("Admin");
    expect(statusAudit?.changedFields).toEqual(expect.arrayContaining(["label", "color", "sortOrder"]));

    await t.mutation(api.operating.inviteMember, { email: "audit-review@example.com", name: "Audit Review", role: "dispatcher" });
    const afterInvite = await t.query(api.operating.getDemoOperatingDepth, {});
    const inviteAudit = afterInvite!.admin.auditEvents.find((event) => event.action === "member.invite" && event.summary.includes("audit-review@example.com"));
    expect(inviteAudit).toMatchObject({
      module: "Admin",
      entityType: "organization",
      actorName: "System / automation",
      exportState: "not_exported",
    });
  });
});
