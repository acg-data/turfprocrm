import { describe, expect, it } from "vitest";
import { calculateBreakEvenRevenueCents, calculateChurnRatePercent, calculateGrossMarginPercent, calculateJobCostRollup, calculateLtvToCac } from "@/domain/finance";
import { hasPermission } from "@/domain/permissions";
import { canAdvanceOpportunity, opportunityStageLabel } from "@/domain/workflow";
import { googleMapsUrl } from "@/lib/utils";

describe("workflow rules", () => {
  it("allows only adjacent opportunity movement plus loss from open stages", () => {
    expect(canAdvanceOpportunity("new", "qualified")).toBe(true);
    expect(canAdvanceOpportunity("qualified", "estimating")).toBe(true);
    expect(canAdvanceOpportunity("proposal_sent", "won")).toBe(true);
    expect(canAdvanceOpportunity("estimating", "won")).toBe(false);
    expect(canAdvanceOpportunity("won", "lost")).toBe(false);
  });

  it("keeps permission boundaries explicit", () => {
    expect(hasPermission("owner", "manageOrganization")).toBe(true);
    expect(hasPermission("dispatcher", "dispatchVisits")).toBe(true);
    expect(hasPermission("technician", "dispatchVisits")).toBe(false);
    expect(hasPermission("technician", "completeFieldWork")).toBe(true);
  });

  it("formats labels and map URLs for operational screens", () => {
    expect(opportunityStageLabel("proposal_sent")).toBe("Proposal Sent");
    expect(googleMapsUrl("18 Brookside Way, Foxborough, MA")).toContain("18%20Brookside%20Way");
  });

  it("calculates gross profit, margin, and cost variance", () => {
    const rollup = calculateJobCostRollup({
      revenueCents: 1000000,
      laborCostCents: 280000,
      materialCostCents: 140000,
      equipmentCostCents: 70000,
      overheadCostCents: 90000,
      estimatedCostCents: 520000,
    });

    expect(rollup.grossProfitCents).toBe(420000);
    expect(rollup.grossMarginPercent).toBe(42);
    expect(rollup.varianceCents).toBe(60000);
  });

  it("handles zero-revenue margin safely", () => {
    expect(calculateGrossMarginPercent(0, 1000)).toBe(0);
  });

  it("calculates owner analytics rules", () => {
    expect(calculateChurnRatePercent(3, 24)).toBe(12.5);
    expect(calculateLtvToCac(480000, 120000)).toBe(4);
    expect(calculateBreakEvenRevenueCents(200000, 40)).toBe(500000);
  });
});
