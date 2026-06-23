import { describe, expect, it } from "vitest";
import { approvalDueAt, evaluateEstimateApproval } from "@/domain/estimate-approval";

describe("estimate approval rules", () => {
  it("requires approval for low margin and high discount", () => {
    const result = evaluateEstimateApproval({
      subtotalCents: 200000,
      totalCents: 160000,
      discountCents: 40000,
      estimatedCostCents: 128000,
    });

    expect(result.requiresApproval).toBe(true);
    expect(result.grossMarginPercent).toBe(20);
    expect(result.discountPercent).toBe(20);
    expect(result.reasons.map((reason) => reason.code)).toEqual(["low_margin", "high_discount"]);
    expect(result.riskScore).toBeGreaterThanOrEqual(55);
  });

  it("captures unusual scope, material constraints, and manual override", () => {
    const result = evaluateEstimateApproval({
      subtotalCents: 100000,
      totalCents: 100000,
      estimatedCostCents: 42000,
      unusualScope: true,
      materialConstraint: true,
      manualOverride: true,
    });

    expect(result.requiresApproval).toBe(true);
    expect(result.reasons.map((reason) => reason.code)).toEqual(["unusual_scope", "material_constraint", "manual_override"]);
    expect(result.reasons.find((reason) => reason.code === "material_constraint")?.severity).toBe("critical");
  });

  it("does not require approval for normal margin and discount", () => {
    const result = evaluateEstimateApproval({
      subtotalCents: 100000,
      totalCents: 96000,
      estimatedCostCents: 50000,
    });

    expect(result.requiresApproval).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it("sets a 24 hour default approval due date", () => {
    expect(approvalDueAt(1000)).toBe(1000 + 24 * 60 * 60 * 1000);
  });
});
