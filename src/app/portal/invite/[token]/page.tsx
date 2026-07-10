import type { Metadata } from "next";
import { PortalInvite } from "@/components/portal/portal-invite";

export const metadata: Metadata = { title: "Activate customer portal | Turf Pro CRM", robots: { index: false, follow: false } };

export default async function PortalInvitePage({ params }: { params: Promise<{ token: string }> }) {
  return <PortalInvite token={(await params).token} />;
}
