export type EstimateApprovalReasonCode = "low_margin" | "high_discount" | "unusual_scope" | "material_constraint" | "manual_override";

export type EstimateApprovalReason = {
  code: EstimateApprovalReasonCode;
  label: string;
  severity: "warning" | "critical";
  detail: string;
  impactCents?: number;
};

export type EstimateApprovalEvaluationInput = {
  subtotalCents: number;
  totalCents: number;
  discountCents?: number;
  estimatedCostCents?: number;
  grossMarginPercent?: number;
  unusualScope?: boolean;
  materialConstraint?: boolean;
  manualOverride?: boolean;
};

export type EstimateApprovalEvaluation = {
  requiresApproval: boolean;
  reasons: EstimateApprovalReason[];
  riskScore: number;
  grossMarginPercent: number;
  estimatedCostCents: number;
  discountPercent: number;
};

export const estimateApprovalThresholds = {
  minimumMarginPercent: 30,
  highDiscountPercent: 10,
  dueInHours: 24,
} as const;

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function evaluateEstimateApproval(input: EstimateApprovalEvaluationInput): EstimateApprovalEvaluation {
  const discountCents = Math.max(0, Math.round(input.discountCents ?? Math.max(0, input.subtotalCents - input.totalCents)));
  const discountPercent = pct(discountCents, input.subtotalCents);
  const estimatedCostCents = Math.max(0, Math.round(input.estimatedCostCents ?? 0));
  const grossMarginPercent =
    input.grossMarginPercent !== undefined
      ? Math.round(input.grossMarginPercent * 10) / 10
      : input.totalCents > 0 && estimatedCostCents > 0
        ? pct(input.totalCents - estimatedCostCents, input.totalCents)
        : 100;
  const reasons: EstimateApprovalReason[] = [];

  if (grossMarginPercent < estimateApprovalThresholds.minimumMarginPercent) {
    reasons.push({
      code: "low_margin",
      label: "Low margin",
      severity: grossMarginPercent < 20 ? "critical" : "warning",
      detail: `Gross margin ${grossMarginPercent}% is below ${estimateApprovalThresholds.minimumMarginPercent}% target.`,
      impactCents: Math.max(0, Math.ceil(estimatedCostCents / (1 - estimateApprovalThresholds.minimumMarginPercent / 100)) - input.totalCents),
    });
  }
  if (discountPercent >= estimateApprovalThresholds.highDiscountPercent) {
    reasons.push({
      code: "high_discount",
      label: "High discount",
      severity: discountPercent >= 20 ? "critical" : "warning",
      detail: `Discount ${discountPercent}% exceeds ${estimateApprovalThresholds.highDiscountPercent}% approval threshold.`,
      impactCents: discountCents,
    });
  }
  if (input.unusualScope) {
    reasons.push({
      code: "unusual_scope",
      label: "Unusual scope",
      severity: "warning",
      detail: "Scope includes non-standard work that should be reviewed before sending.",
    });
  }
  if (input.materialConstraint) {
    reasons.push({
      code: "material_constraint",
      label: "Material constraint",
      severity: "critical",
      detail: "Material availability or product constraint may affect price, schedule, or compliance.",
    });
  }
  if (input.manualOverride) {
    reasons.push({
      code: "manual_override",
      label: "Manual override",
      severity: "warning",
      detail: "Estimator requested manager approval before sending.",
    });
  }

  const riskScore = Math.min(
    100,
    reasons.reduce((sum, reason) => sum + (reason.severity === "critical" ? 35 : 20), 0),
  );

  return {
    requiresApproval: reasons.length > 0,
    reasons,
    riskScore,
    grossMarginPercent,
    estimatedCostCents,
    discountPercent,
  };
}

export function approvalDueAt(requestedAt: number, dueInHours = estimateApprovalThresholds.dueInHours) {
  return requestedAt + dueInHours * 60 * 60 * 1000;
}
