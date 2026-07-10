import type { Metadata } from "next";
import { CustomerPortal } from "@/components/portal/customer-portal";

export const metadata: Metadata = {
  title: "Customer Portal | Turf Pro CRM",
  description: "Review estimates, service visits, invoices, documents, and messages in your secure customer portal.",
  robots: { index: false, follow: false },
};

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ section?: string | string[]; payment?: string | string[] }> }) {
  const authConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CONVEX_URL);
  const params = await searchParams;
  const allowedSections = ["overview", "estimates", "schedule", "services", "invoices", "documents", "messages", "properties", "settings"] as const;
  const sectionValue = typeof params.section === "string" && allowedSections.includes(params.section as (typeof allowedSections)[number]) ? params.section as (typeof allowedSections)[number] : "overview";
  const payment = typeof params.payment === "string" ? params.payment : null;
  const paymentNotice = payment === "success" ? "Payment received. Your receipt will appear here in a moment." : payment === "canceled" ? "Payment was canceled. Your invoice is still available whenever you’re ready." : null;
  return <CustomerPortal authConfigured={authConfigured} initialSection={sectionValue} paymentNotice={paymentNotice} />;
}
