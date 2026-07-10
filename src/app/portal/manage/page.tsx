import type { Metadata } from "next";
import { PortalManager } from "@/components/portal/portal-manager";

export const metadata: Metadata = { title: "Customer portal access | Turf Pro CRM", robots: { index: false, follow: false } };

export default async function PortalManagePage({ searchParams }: { searchParams: Promise<{ organizationId?: string | string[] }> }) {
  const value = (await searchParams).organizationId;
  return <PortalManager organizationId={typeof value === "string" ? value : undefined} />;
}
