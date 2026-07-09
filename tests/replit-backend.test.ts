import { beforeAll, describe, expect, it } from "vitest";
import { getDb, type Db } from "../src/server/db/client";
import type { ServerCtx } from "../src/server/context";
import { memberships, users } from "../src/server/db/schema";
import { newId } from "../src/server/ids";
import * as setup from "../src/server/modules/setup";
import * as workspace from "../src/server/modules/workspace";
import * as operating from "../src/server/modules/operating";

let db: Db;

function asUser(subject: string, name: string): ServerCtx {
  return { db, identity: { subject, name, email: `${subject.replace(/[^a-z0-9]/gi, "")}@example.com` } };
}

const anon = (): ServerCtx => ({ db, identity: null });

beforeAll(async () => {
  db = await getDb();
}, 60_000);

describe("replit backend (PGlite)", () => {
  it("provisions a workspace, seeds sample data, and runs the operating lifecycle", { timeout: 120_000 }, async () => {
    const owner = asUser("user_sample_owner", "Sample Owner");

    const organizationId = (await setup.createOrganization(owner, {
      name: "Sample Seed Co",
      timezone: "America/New_York",
      industryFocus: "both",
    })) as string;

    // Unauthenticated access must be rejected.
    await expect(workspace.getWorkspace(anon(), { organizationId })).rejects.toThrow();

    await workspace.seedSampleData(owner, { organizationId });
    const snapshot = await workspace.getWorkspace(owner, { organizationId });
    expect(snapshot.seeded).toBe(true);
    expect(snapshot.customers.length).toBeGreaterThan(0);
    expect(snapshot.viewer.role).toBe("owner");

    const before = await operating.getOperatingDepth(owner, { organizationId });
    expect(before?.seeded).toBe(false);

    const bootstrap = await operating.seedOperatingDepth(owner, { organizationId });
    expect(bootstrap.recalculated).toBeGreaterThan(0);

    const seeded = await operating.getOperatingDepth(owner, { organizationId });
    expect(seeded?.seeded).toBe(true);
    expect(seeded?.leadOps.rows.length).toBeGreaterThan(0);
    expect(seeded?.jobCosting.summaries.length).toBeGreaterThan(0);
    expect(seeded?.costIntelligence.laborRates.length).toBeGreaterThan(0);
    expect(seeded?.revenue.invoices.length).toBeGreaterThan(0);

    const leadId = seeded!.leadOps.rows[0].id;
    await operating.updateLead(owner, { organizationId, leadId, status: "do_estimate", grade: "a" });
    const updated = await operating.getOperatingDepth(owner, { organizationId });
    expect(updated?.leadOps.rows.find((lead) => lead.id === leadId)?.status).toBe("do_estimate");

    const jobId = seeded!.jobCosting.summaries[0].jobId;
    await operating.addTimesheetEntry(owner, { organizationId, jobId, roleName: "Technician", hours: 1.25, hourlyCostCents: 3000 });
    const afterTime = await operating.getOperatingDepth(owner, { organizationId });
    expect(afterTime?.jobCosting.timesheets.some((entry) => entry.roleName === "Technician" && entry.hours === 1.25)).toBe(true);

    const invoice = afterTime!.revenue.invoices.find((candidate) => candidate.balanceCents > 0)!;
    const collectedBefore = afterTime!.revenue.collectedCents;
    await operating.recordCustomerPayment(owner, { organizationId, invoiceId: invoice.id, amountCents: 1000, method: "ach" });
    const afterPayment = await operating.getOperatingDepth(owner, { organizationId });
    expect(afterPayment!.revenue.collectedCents).toBeGreaterThan(collectedBefore);

    const snapshotCount = afterPayment!.costIntelligence.costSnapshots.length;
    await operating.refreshCostIntelligence(owner, { organizationId });
    const afterRefresh = await operating.getOperatingDepth(owner, { organizationId });
    expect(afterRefresh!.costIntelligence.costSnapshots.length).toBeGreaterThan(snapshotCount);

    // A signed-in non-member cannot touch the workspace.
    const outsider = asUser("user_outsider", "Outsider User");
    await setup.syncCurrentUser(outsider);
    await expect(workspace.getWorkspace(outsider, { organizationId })).rejects.toThrow();
    await expect(operating.refreshCostIntelligence(outsider, { organizationId })).rejects.toThrow();

    // A technician member cannot manage finance or members.
    const techCtx = asUser("user_technician", "Tech User");
    const techUserId = (await setup.syncCurrentUser(techCtx)) as string;
    const now = Date.now();
    await db.insert(memberships).values({
      id: newId(),
      organizationId,
      userId: techUserId,
      role: "technician",
      status: "active",
      joinedAt: now,
      updatedAt: now,
    });
    await expect(operating.refreshCostIntelligence(techCtx, { organizationId })).rejects.toThrow();
    await expect(operating.updateMemberRole(techCtx, { organizationId, membershipId: "whatever", role: "admin" })).rejects.toThrow();
    // ...but can read the workspace.
    const techView = await workspace.getWorkspace(techCtx, { organizationId });
    expect(techView.viewer.role).toBe("technician");
  });

  it("blocks sample seeding on a workspace that already has real customers", { timeout: 60_000 }, async () => {
    const owner = asUser("user_real_owner", "Real Owner");
    const organizationId = (await setup.createOrganization(owner, {
      name: "Real Data Co",
      timezone: "America/New_York",
      industryFocus: "landscaping",
    })) as string;

    await workspace.createLead(owner, {
      organizationId,
      customerName: "Actual Customer",
      title: "Mowing quote",
      street: "1 Real St",
      city: "Foxborough",
      state: "MA",
      postalCode: "02035",
      valueCents: 25_000,
      serviceLine: "lawn_care",
    });

    await expect(workspace.seedSampleData(owner, { organizationId })).rejects.toThrow(/empty workspace/i);
    await expect(operating.seedOperatingDepth(owner, { organizationId })).rejects.toThrow();
  });

  it("keeps auth subjects distinct per user", async () => {
    const rows = await db.select().from(users);
    const subjects = rows.map((row) => row.clerkUserId);
    expect(new Set(subjects).size).toBe(subjects.length);
  });
});
