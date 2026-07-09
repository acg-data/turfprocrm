/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

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

    const overview = await owner.query(api.dashboard.getOverview, { organizationId });
    expect(overview.counts.customers).toBe(1);
    expect(overview.wonValueCents).toBe(90000);
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

  it("seeds sample data behind auth and recalculates lead, cost, and payment records", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "user_sample_owner", email: "sample-owner@example.com", name: "Sample Owner" });

    const organizationId = await owner.mutation(api.setup.createOrganization, {
      name: "Sample Seed Co",
      timezone: "America/New_York",
      industryFocus: "both",
    });

    // Unauthenticated access to the workspace API must be rejected.
    await expect(t.query(api.workspace.getWorkspace, { organizationId })).rejects.toThrow();

    await owner.mutation(api.workspace.seedSampleData, { organizationId });
    const workspace = await owner.query(api.workspace.getWorkspace, { organizationId });
    expect(workspace.seeded).toBe(true);
    expect(workspace.customers.length).toBeGreaterThan(0);
    expect(workspace.viewer.role).toBe("owner");

    const before = await owner.query(api.operating.getOperatingDepth, { organizationId });
    expect(before?.seeded).toBe(false);

    const bootstrap = await owner.mutation(api.operating.seedOperatingDepth, { organizationId });
    expect(bootstrap.recalculated).toBeGreaterThan(0);

    const seeded = await owner.query(api.operating.getOperatingDepth, { organizationId });
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

    const leadId = seeded!.leadOps.rows[0].id;
    await owner.mutation(api.operating.updateLead, { organizationId, leadId, status: "do_estimate", grade: "a" });
    const updated = await owner.query(api.operating.getOperatingDepth, { organizationId });
    expect(updated?.leadOps.rows.find((lead) => lead.id === leadId)?.status).toBe("do_estimate");

    const jobId = seeded!.jobCosting.summaries[0].jobId;
    await owner.mutation(api.operating.addTimesheetEntry, { organizationId, jobId, roleName: "Technician", hours: 1.25, hourlyCostCents: 3000 });
    const afterTime = await owner.query(api.operating.getOperatingDepth, { organizationId });
    expect(afterTime?.jobCosting.timesheets.some((entry) => entry.roleName === "Technician" && entry.hours === 1.25)).toBe(true);

    const invoice = afterTime!.revenue.invoices.find((candidate) => candidate.balanceCents > 0)!;
    const collectedBefore = afterTime!.revenue.collectedCents;
    await owner.mutation(api.operating.recordCustomerPayment, { organizationId, invoiceId: invoice.id, amountCents: 1000, method: "ach" });
    const afterPayment = await owner.query(api.operating.getOperatingDepth, { organizationId });
    expect(afterPayment!.revenue.collectedCents).toBeGreaterThan(collectedBefore);

    const snapshotCount = afterPayment!.costIntelligence.costSnapshots.length;
    await owner.mutation(api.operating.refreshCostIntelligence, { organizationId });
    const afterRefresh = await owner.query(api.operating.getOperatingDepth, { organizationId });
    expect(afterRefresh!.costIntelligence.costSnapshots.length).toBeGreaterThan(snapshotCount);

    // A non-member cannot touch the workspace even with valid auth.
    const outsider = t.withIdentity({ subject: "user_outsider_2", email: "outsider2@example.com", name: "Outsider Two" });
    await outsider.mutation(api.setup.syncCurrentUser);
    await expect(outsider.mutation(api.operating.refreshCostIntelligence, { organizationId })).rejects.toThrow();
  });
});
