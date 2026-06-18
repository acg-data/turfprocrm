type OpportunityStage = "new" | "qualified" | "estimating" | "proposal_sent" | "won" | "lost";

const nextStage: Partial<Record<OpportunityStage, OpportunityStage>> = {
  new: "qualified",
  qualified: "estimating",
  estimating: "proposal_sent",
  proposal_sent: "won",
};

const previousStage: Partial<Record<OpportunityStage, OpportunityStage>> = {
  qualified: "new",
  estimating: "qualified",
  proposal_sent: "estimating",
  won: "proposal_sent",
  lost: "proposal_sent",
};

export function canMoveOpportunity(from: OpportunityStage, to: OpportunityStage) {
  if (from === to) return true;
  if (to === "lost") return from !== "won";
  return nextStage[from] === to || previousStage[from] === to;
}

export function estimateNumber(now: number) {
  return `EST-${new Date(now).getFullYear()}-${String(now).slice(-6)}`;
}
