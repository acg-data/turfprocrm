import { describe, expect, it } from "vitest";
import { activeFertilizationPricingAdjustments, buildFertilizationMarginScenarios, calculateFertilizationProgramPricing } from "@/domain/fertilization-pricing";

describe("fertilization program pricing", () => {
  it("prices a turf program from area, applications, material rate, and target margin", () => {
    const result = calculateFertilizationProgramPricing({
      turfAreaSqFt: 50000,
      applicationCount: 6,
      materialUnitCostCents: 7300,
      materialRateUnitsPer1000SqFt: 0.008,
      laborHoursPerApplication: 1.5,
      laborRateCents: 3200,
      equipmentCostCentsPerApplication: 2500,
      overheadPercent: 18,
      targetMarginPercent: 42,
      priceBookRateCentsPerSqFt: 1.8,
      minPriceCents: 62000,
    });

    expect(result.materialUnitsPerApplication).toBe(0.4);
    expect(result.totalMaterialUnits).toBe(2.4);
    expect(result.materialCostCents).toBe(17520);
    expect(result.laborCostCents).toBe(28800);
    expect(result.equipmentCostCents).toBe(15000);
    expect(result.totalCostCents).toBe(72358);
    expect(result.priceBookRevenueCents).toBe(90000);
    expect(result.targetRevenueCents).toBe(124756);
    expect(result.recommendedPriceCents).toBe(124756);
    expect(result.grossMarginPercent).toBe(42);
    expect(result.warnings).toContain("Price book is below target margin; recommended price uses margin floor.");
  });

  it("applies ordered pricing rule adjustments before comparing to margin floor", () => {
    const adjustments = activeFertilizationPricingAdjustments(
      [
        { name: "Fuel surcharge", adjustmentType: "fixed", adjustmentValue: 12000, order: 2, active: true },
        { name: "Commercial complexity", adjustmentType: "percent", adjustmentValue: 10, order: 1, active: true, condition: { minAreaSqFt: 50000 } },
        { name: "Small lawn handling", adjustmentType: "fixed", adjustmentValue: 5000, order: 3, active: true, condition: { maxAreaSqFt: 10000 } },
      ],
      { turfAreaSqFt: 80000, applicationCount: 6 },
    );
    const result = calculateFertilizationProgramPricing({
      turfAreaSqFt: 80000,
      applicationCount: 6,
      materialUnitCostCents: 5000,
      materialRateUnitsPer1000SqFt: 0.004,
      laborHoursPerApplication: 1,
      laborRateCents: 3000,
      equipmentCostCentsPerApplication: 1000,
      overheadPercent: 10,
      targetMarginPercent: 20,
      priceBookRateCentsPerSqFt: 2,
      minPriceCents: 60000,
      adjustments,
    });

    expect(result.priceBookRevenueCents).toBe(188000);
    expect(result.recommendedPriceCents).toBe(188000);
    expect(result.appliedAdjustments.map((adjustment) => adjustment.name)).toEqual(["Commercial complexity", "Fuel surcharge"]);
    expect(result.grossMarginPercent).toBeGreaterThan(50);
  });

  it("builds low, target, and premium margin scenarios from the same cost basis", () => {
    const scenarios = buildFertilizationMarginScenarios({
      turfAreaSqFt: 55000,
      applicationCount: 6,
      materialUnitCostCents: 7300,
      materialRateUnitsPer1000SqFt: 0.008,
      laborHoursPerApplication: 1.5,
      laborRateCents: 3200,
      equipmentCostCentsPerApplication: 2500,
      overheadPercent: 18,
      targetMarginPercent: 42,
      priceBookRateCentsPerSqFt: 1.8,
      minPriceCents: 62000,
    });

    expect(scenarios.map((scenario) => scenario.key)).toEqual(["low", "target", "premium"]);
    expect(scenarios.map((scenario) => scenario.targetMarginPercent)).toEqual([32, 42, 52]);
    expect(scenarios[0].recommendedPriceCents).toBeLessThan(scenarios[1].recommendedPriceCents);
    expect(scenarios[2].recommendedPriceCents).toBeGreaterThan(scenarios[1].recommendedPriceCents);
    expect(scenarios[1].estimateLineItem).toMatchObject({
      name: "6-step fertilization program",
      quantity: 1,
      unit: "season",
      unitPriceCents: scenarios[1].recommendedPriceCents,
    });
    expect(scenarios[1].riskNotes).toContain("Meets the configured owner margin target for this program.");
  });
});
