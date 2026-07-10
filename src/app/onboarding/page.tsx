import type { Metadata } from "next";
import { TrialOnboarding } from "@/components/onboarding/trial-onboarding";

export const metadata: Metadata = {
  title: "Set up your Turf Pro CRM workspace",
  description: "Configure your company, services, team, data import, and first live workflow during your Turf Pro CRM trial.",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ organizationId?: string | string[] }> }) {
  const value = (await searchParams).organizationId;
  return <TrialOnboarding requestedOrganizationId={typeof value === "string" ? value : undefined} />;
}
