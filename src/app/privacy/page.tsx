import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy - Turf Pro CRM",
  description: "How Turf Pro CRM collects, uses, protects, and shares information.",
};

const sections: LegalSection[] = [
  { title: "Information we collect", paragraphs: ["We collect account, workspace, billing, and product-usage information needed to provide and improve Turf Pro CRM. This may include your name, email, company details, customer and job records you choose to store, device information, and support communications."], bullets: ["Account and profile information", "Business data submitted to a workspace", "Product usage, diagnostics, and security events", "Billing status and transaction identifiers from Stripe"] },
  { title: "How we use information", paragraphs: ["We use information to operate the service, authenticate users, process subscriptions, provide support, secure accounts, maintain audit history, and improve product performance. We do not sell personal information."], bullets: ["Provide and personalize the service", "Prevent abuse and protect tenant data", "Communicate about the account and service", "Meet legal and compliance obligations"] },
  { title: "Service providers", paragraphs: ["We use vetted providers for authentication, application data, billing, hosting, monitoring, and transactional email. They may process information only to provide their contracted services to us. Current core providers include Clerk, Convex, Stripe, Cloudflare, Sentry, and our email delivery provider when configured."] },
  { title: "Data retention and security", paragraphs: ["We retain information while an account is active and as reasonably necessary for backups, dispute resolution, security, and legal obligations. We use encryption in transit and at rest, role-based access controls, tenant-scoped authorization, signed webhooks, and audit records. No online service can guarantee absolute security."] },
  { title: "Your choices", paragraphs: ["Workspace owners may update or export account data and request deletion, subject to legal and operational retention requirements. Marketing communications can be opted out of at any time; essential service and security messages will still be sent."] },
  { title: "Children and international use", paragraphs: ["Turf Pro CRM is a business service and is not directed to children under 13. If information is transferred across borders, we apply appropriate contractual and technical protections."] },
  { title: "Changes and contact", paragraphs: ["We may update this policy as the service evolves. Material changes will be communicated through the product or account email. Questions or privacy requests can be sent through the demo/contact form and will be routed to the account team."] },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy" accent="Policy" updated="July 9, 2026" intro="Your business data should stay yours. This policy explains the information Turf Pro CRM processes, why we process it, and the choices available to you." sections={sections} />;
}

