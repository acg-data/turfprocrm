export type CostRollupInput = {
  revenueCents: number;
  laborCostCents: number;
  materialCostCents: number;
  equipmentCostCents: number;
  overheadCostCents: number;
  estimatedCostCents?: number;
};

export function calculateGrossProfitCents(input: CostRollupInput) {
  return input.revenueCents - input.laborCostCents - input.materialCostCents - input.equipmentCostCents - input.overheadCostCents;
}

export function calculateGrossMarginPercent(revenueCents: number, grossProfitCents: number) {
  if (revenueCents <= 0) return 0;
  return Math.round((grossProfitCents / revenueCents) * 1000) / 10;
}

export function calculateCostVarianceCents(input: CostRollupInput) {
  const actualCost = input.laborCostCents + input.materialCostCents + input.equipmentCostCents + input.overheadCostCents;
  return actualCost - (input.estimatedCostCents ?? actualCost);
}

export function calculateJobCostRollup(input: CostRollupInput) {
  const grossProfitCents = calculateGrossProfitCents(input);
  return {
    grossProfitCents,
    grossMarginPercent: calculateGrossMarginPercent(input.revenueCents, grossProfitCents),
    varianceCents: calculateCostVarianceCents(input),
  };
}

export function calculateChurnRatePercent(atRiskOrChurnedCustomers: number, totalCustomers: number) {
  if (totalCustomers <= 0) return 0;
  return Math.round((atRiskOrChurnedCustomers / totalCustomers) * 1000) / 10;
}

export function calculateLtvToCac(ltvCents: number, cacCents: number) {
  if (cacCents <= 0) return 0;
  return Math.round((ltvCents / cacCents) * 10) / 10;
}

export function calculateBreakEvenRevenueCents(operatingExpenseCents: number, grossMarginPercent: number) {
  if (operatingExpenseCents <= 0 || grossMarginPercent <= 0) return 0;
  return Math.round(operatingExpenseCents / (grossMarginPercent / 100));
}
