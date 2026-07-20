export type DemoPersona = "new" | "starter" | "established";

export type DemoPersonaOption = {
  id: DemoPersona;
  label: string;
  shortLabel: string;
  description: string;
  detail: string;
  plan: "free" | "pro";
  contactCount: number;
};

export const demoPersonaOptions: DemoPersonaOption[] = [
  {
    id: "new",
    label: "Completely new operator",
    shortLabel: "Start fresh",
    description: "A clean workspace with no customers, contacts, or jobs.",
    detail: "See the first-run dashboard, setup prompts, catalog defaults, and the path from your first lead to your first job.",
    plan: "free",
    contactCount: 0,
  },
  {
    id: "starter",
    label: "Growing operator",
    shortLabel: "10-contact starter",
    description: "A free-plan workspace with a small active book of business.",
    detail: "Practice lead intake, follow-ups, estimates, scheduling, and the 10-contact limit before upgrading.",
    plan: "free",
    contactCount: 10,
  },
  {
    id: "established",
    label: "Established operator",
    shortLabel: "100-contact operation",
    description: "A realistic, operating-scale workspace with a full book of business.",
    detail: "Explore lead operations, dispatch, field execution, chemical tracking, job costing, admin, and profitability at scale.",
    plan: "pro",
    contactCount: 100,
  },
];

export function getDemoPersonaOption(persona: DemoPersona) {
  return demoPersonaOptions.find((option) => option.id === persona) ?? demoPersonaOptions[0];
}

export function parseDemoPersona(value: string | null | undefined): DemoPersona | null {
  return value === "new" || value === "starter" || value === "established" ? value : null;
}
