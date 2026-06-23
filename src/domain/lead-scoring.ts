import type { ServiceCategory } from "./workflow";

export type LeadQualityInput = {
  source?: string;
  phone?: string;
  email?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  serviceLine?: ServiceCategory;
  lawnSizeSqFt?: number;
  message?: string;
  ownerOrCompany?: string;
  spamScore?: number;
};

export type LeadQualityBand = "a" | "b" | "c" | "d" | "f";

export const leadQualityThresholds: Array<{ band: LeadQualityBand; label: string; minimumScore: number; action: string }> = [
  { band: "a", label: "A quality", minimumScore: 85, action: "Estimate-ready" },
  { band: "b", label: "B quality", minimumScore: 70, action: "Sales follow-up" },
  { band: "c", label: "C quality", minimumScore: 55, action: "Needs data cleanup" },
  { band: "d", label: "D quality", minimumScore: 40, action: "Manager review" },
  { band: "f", label: "F quality", minimumScore: 0, action: "Spam or disqualify" },
];

function hasText(value?: string) {
  return Boolean(value?.trim());
}

export function leadQualityBand(score: number): LeadQualityBand {
  return leadQualityThresholds.find((threshold) => score >= threshold.minimumScore)?.band ?? "f";
}

export function scoreLeadQuality(input: LeadQualityInput) {
  const reasons: string[] = [];
  let score = 100;

  if (!hasText(input.source)) {
    score -= 8;
    reasons.push("Missing lead source");
  }
  if (!hasText(input.phone)) {
    score -= 18;
    reasons.push("Missing phone");
  }
  if (!hasText(input.email)) {
    score -= 12;
    reasons.push("Missing email");
  }
  if (!hasText(input.street) || !hasText(input.city) || !hasText(input.postalCode)) {
    score -= 18;
    reasons.push("Incomplete property address");
  }
  if (!input.serviceLine) {
    score -= 10;
    reasons.push("Missing service line");
  }
  if (!hasText(input.message)) {
    score -= 8;
    reasons.push("Missing customer message");
  }
  if (!input.lawnSizeSqFt || input.lawnSizeSqFt <= 0) {
    score -= 6;
    reasons.push("Missing measurable area");
  }
  if (!hasText(input.ownerOrCompany)) {
    score -= 6;
    reasons.push("Missing owner or company assignment");
  }
  if ((input.spamScore ?? 0) >= 35) {
    const penalty = Math.min(35, Math.round((input.spamScore ?? 0) / 2));
    score -= penalty;
    reasons.push("Spam score requires review");
  }

  const normalizedScore = Math.max(20, Math.min(100, score));
  const band = leadQualityBand(normalizedScore);
  const threshold = leadQualityThresholds.find((item) => item.band === band) ?? leadQualityThresholds[leadQualityThresholds.length - 1];

  return {
    score: normalizedScore,
    band,
    label: threshold.label,
    action: threshold.action,
    reasons,
    estimateReady: normalizedScore >= 85 && (input.spamScore ?? 0) < 35,
  };
}
