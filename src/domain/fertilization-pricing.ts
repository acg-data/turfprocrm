export type FertilizationPricingAdjustment = {
  name: string;
  adjustmentType: "fixed" | "percent" | "multiplier";
  adjustmentValue: number;
};

export type FertilizationPricingRule = FertilizationPricingAdjustment & {
  active?: boolean;
  order?: number;
  condition?: {
    minAreaSqFt?: number;
    maxAreaSqFt?: number;
    minApplications?: number;
    maxApplications?: number;
  };
};

export type FertilizationPricingRuleContext = {
  turfAreaSqFt: number;
  applicationCount: number;
};

export type FertilizationPricingInput = {
  turfAreaSqFt: number;
  applicationCount: number;
  materialUnitCostCents: number;
  materialRateUnitsPer1000SqFt: number;
  laborHoursPerApplication: number;
  laborRateCents: number;
  equipmentCostCentsPerApplication: number;
  overheadPercent: number;
  targetMarginPercent: number;
  priceBookRateCentsPerSqFt: number;
  minPriceCents: number;
  standardApplicationCount?: number;
  adjustments?: FertilizationPricingAdjustment[];
};

export type FertilizationPricingOutput = {
  turfAreaSqFt: number;
  applicationCount: number;
  materialUnitsPerApplication: number;
  totalMaterialUnits: number;
  materialCostCents: number;
  laborCostCents: number;
  equipmentCostCents: number;
  directCostCents: number;
  overheadCostCents: number;
  totalCostCents: number;
  targetRevenueCents: number;
  priceBookRevenueCents: number;
  recommendedPriceCents: number;
  pricePerApplicationCents: number;
  pricePer1000SqFtCents: number;
  grossProfitCents: number;
  grossMarginPercent: number;
  appliedAdjustments: FertilizationPricingAdjustment[];
  warnings: string[];
};

export type FertilizationMarginScenarioKey = "low" | "target" | "premium";

export type FertilizationMarginScenario = {
  key: FertilizationMarginScenarioKey;
  label: string;
  targetMarginPercent: number;
  recommendedPriceCents: number;
  grossProfitCents: number;
  grossMarginPercent: number;
  pricePerApplicationCents: number;
  pricePer1000SqFtCents: number;
  priceLiftFromPriceBookCents: number;
  varianceFromTargetCents: number;
  estimateLineItem: {
    name: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
  };
  riskNotes: string[];
  output: FertilizationPricingOutput;
};

function positive(value: number, fallback = 0) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function roundTenth(value: number) {
  return Math.round(value * 10) / 10;
}

export function fertilizationPricingRuleApplies(rule: FertilizationPricingRule, context: FertilizationPricingRuleContext) {
  if (rule.active === false) return false;
  const condition = rule.condition ?? {};
  if (condition.minAreaSqFt !== undefined && context.turfAreaSqFt < condition.minAreaSqFt) return false;
  if (condition.maxAreaSqFt !== undefined && context.turfAreaSqFt > condition.maxAreaSqFt) return false;
  if (condition.minApplications !== undefined && context.applicationCount < condition.minApplications) return false;
  if (condition.maxApplications !== undefined && context.applicationCount > condition.maxApplications) return false;
  return true;
}

export function activeFertilizationPricingAdjustments(
  rules: FertilizationPricingRule[],
  context: FertilizationPricingRuleContext,
): FertilizationPricingAdjustment[] {
  return rules
    .filter((rule) => fertilizationPricingRuleApplies(rule, context))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((rule) => ({
      name: rule.name,
      adjustmentType: rule.adjustmentType,
      adjustmentValue: rule.adjustmentValue,
    }));
}

export function calculateFertilizationProgramPricing(input: FertilizationPricingInput): FertilizationPricingOutput {
  const turfAreaSqFt = Math.round(positive(input.turfAreaSqFt));
  const applicationCount = Math.max(1, Math.round(positive(input.applicationCount, 1)));
  const standardApplicationCount = Math.max(1, Math.round(positive(input.standardApplicationCount ?? 6, 6)));
  const materialUnitsPerApplication = roundTenth((turfAreaSqFt / 1000) * positive(input.materialRateUnitsPer1000SqFt));
  const totalMaterialUnits = roundTenth(materialUnitsPerApplication * applicationCount);
  const materialCostCents = Math.round(totalMaterialUnits * positive(input.materialUnitCostCents));
  const laborCostCents = Math.round(applicationCount * positive(input.laborHoursPerApplication) * positive(input.laborRateCents));
  const equipmentCostCents = Math.round(applicationCount * positive(input.equipmentCostCentsPerApplication));
  const directCostCents = materialCostCents + laborCostCents + equipmentCostCents;
  const overheadCostCents = Math.round(directCostCents * (positive(input.overheadPercent) / 100));
  const totalCostCents = directCostCents + overheadCostCents;
  const targetMargin = Math.min(95, positive(input.targetMarginPercent)) / 100;
  const targetRevenueCents = targetMargin > 0 ? Math.ceil(totalCostCents / (1 - targetMargin)) : totalCostCents;
  const seasonalAreaPriceCents = Math.round(turfAreaSqFt * positive(input.priceBookRateCentsPerSqFt) * (applicationCount / standardApplicationCount));

  let priceBookRevenueCents = Math.max(Math.round(positive(input.minPriceCents)), seasonalAreaPriceCents);
  const appliedAdjustments: FertilizationPricingAdjustment[] = [];
  for (const adjustment of input.adjustments ?? []) {
    if (adjustment.adjustmentType === "fixed") {
      priceBookRevenueCents += Math.round(adjustment.adjustmentValue);
    } else if (adjustment.adjustmentType === "percent") {
      priceBookRevenueCents = Math.round(priceBookRevenueCents * (1 + adjustment.adjustmentValue / 100));
    } else if (adjustment.adjustmentType === "multiplier") {
      priceBookRevenueCents = Math.round(priceBookRevenueCents * adjustment.adjustmentValue);
    }
    appliedAdjustments.push(adjustment);
  }
  priceBookRevenueCents = Math.max(0, priceBookRevenueCents);

  const recommendedPriceCents = Math.max(priceBookRevenueCents, targetRevenueCents);
  const pricePerApplicationCents = Math.round(recommendedPriceCents / applicationCount);
  const pricePer1000SqFtCents = turfAreaSqFt > 0 ? Math.round((recommendedPriceCents / turfAreaSqFt) * 1000) : 0;
  const grossProfitCents = recommendedPriceCents - totalCostCents;
  const grossMarginPercent = recommendedPriceCents > 0 ? Math.round((grossProfitCents / recommendedPriceCents) * 1000) / 10 : 0;
  const warnings = [
    ...(turfAreaSqFt <= 0 ? ["Turf area is missing, so pricing cannot be trusted."] : []),
    ...(priceBookRevenueCents < targetRevenueCents ? ["Price book is below target margin; recommended price uses margin floor."] : []),
    ...(materialCostCents > laborCostCents + equipmentCostCents ? ["Material cost is the dominant cost driver."] : []),
  ];

  return {
    turfAreaSqFt,
    applicationCount,
    materialUnitsPerApplication,
    totalMaterialUnits,
    materialCostCents,
    laborCostCents,
    equipmentCostCents,
    directCostCents,
    overheadCostCents,
    totalCostCents,
    targetRevenueCents,
    priceBookRevenueCents,
    recommendedPriceCents,
    pricePerApplicationCents,
    pricePer1000SqFtCents,
    grossProfitCents,
    grossMarginPercent,
    appliedAdjustments,
    warnings,
  };
}

function clampPercent(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function buildFertilizationMarginScenarios(input: FertilizationPricingInput): FertilizationMarginScenario[] {
  const targetMargin = clampPercent(positive(input.targetMarginPercent, 42), 15, 80);
  const scenarioTargets: Array<{ key: FertilizationMarginScenarioKey; label: string; targetMarginPercent: number }> = [
    { key: "low", label: "Low close-rate", targetMarginPercent: clampPercent(targetMargin - 10, 12, 80) },
    { key: "target", label: "Target margin", targetMarginPercent: targetMargin },
    { key: "premium", label: "Premium service", targetMarginPercent: clampPercent(targetMargin + 10, 15, 85) },
  ];
  const targetOutput = calculateFertilizationProgramPricing({ ...input, targetMarginPercent: targetMargin });

  return scenarioTargets.map((scenario) => {
    const output = calculateFertilizationProgramPricing({ ...input, targetMarginPercent: scenario.targetMarginPercent });
    const priceLiftFromPriceBookCents = Math.max(0, output.recommendedPriceCents - output.priceBookRevenueCents);
    const riskNotes = [
      ...(scenario.key === "low" ? ["Best close-rate option; watch labor/material drift before sending."] : []),
      ...(scenario.key === "target" ? ["Meets the configured owner margin target for this program."] : []),
      ...(scenario.key === "premium" ? ["Use when scope, response time, or service complexity supports premium pricing."] : []),
      ...(output.priceBookRevenueCents < output.targetRevenueCents ? ["Price book is below this margin floor."] : []),
      ...(output.materialCostCents > output.laborCostCents + output.equipmentCostCents ? ["Material cost is the dominant risk driver."] : []),
    ];

    return {
      key: scenario.key,
      label: scenario.label,
      targetMarginPercent: scenario.targetMarginPercent,
      recommendedPriceCents: output.recommendedPriceCents,
      grossProfitCents: output.grossProfitCents,
      grossMarginPercent: output.grossMarginPercent,
      pricePerApplicationCents: output.pricePerApplicationCents,
      pricePer1000SqFtCents: output.pricePer1000SqFtCents,
      priceLiftFromPriceBookCents,
      varianceFromTargetCents: output.recommendedPriceCents - targetOutput.recommendedPriceCents,
      estimateLineItem: {
        name: `${output.applicationCount}-step fertilization program`,
        quantity: 1,
        unit: "season",
        unitPriceCents: output.recommendedPriceCents,
      },
      riskNotes,
      output,
    };
  });
}
