import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service - Turf Pro CRM",
  description: "Terms governing access to and use of Turf Pro CRM.",
};

const sections: LegalSection[] = [
  { title: "Using the service", paragraphs: ["You must be authorized to act for the business or organization that creates a Turf Pro CRM workspace. You are responsible for account activity, the accuracy and legality of submitted data, and keeping credentials secure."], bullets: ["Use the service only for lawful business purposes", "Do not probe, disrupt, reverse engineer, or misuse the platform", "Do not upload malware or content that infringes another party's rights", "Promptly notify us of suspected unauthorized access"] },
  { title: "Subscriptions and trials", paragraphs: ["Paid plans are billed in advance through Stripe according to the price shown at checkout. Trials convert to a paid subscription unless canceled before the trial ends. You can manage or cancel an active subscription from the Stripe-hosted billing portal. Except where required by law, fees already paid are non-refundable."] },
  { title: "Your data", paragraphs: ["You retain ownership of content and business data submitted to the service. You grant us the limited rights needed to host, process, back up, and transmit that data solely to provide and secure Turf Pro CRM. You are responsible for having the rights and notices needed to process customer and employee information."] },
  { title: "Availability and changes", paragraphs: ["We work to keep the service reliable, but availability is not guaranteed and planned or emergency maintenance may occur. We may improve, replace, or discontinue features. If a change materially reduces a paid service, we will provide reasonable notice when practicable."] },
  { title: "Third-party services", paragraphs: ["Turf Pro CRM may connect to third-party services such as Clerk, Stripe, mapping tools, or accounting providers. Their terms govern your use of those services, and we are not responsible for third-party systems outside our control."] },
  { title: "Confidentiality and feedback", paragraphs: ["Each party will protect non-public information received from the other using reasonable care. If you provide product feedback, you allow us to use it without restriction or compensation, while we will not identify you publicly without permission."] },
  { title: "Disclaimers and liability", paragraphs: ["The service is provided on an as-is and as-available basis to the extent permitted by law. We disclaim implied warranties and are not liable for indirect, special, incidental, or consequential damages. Our aggregate liability is limited to fees paid for the service during the 12 months before the claim, unless applicable law requires otherwise."] },
  { title: "Termination and general terms", paragraphs: ["Either party may terminate as permitted by the subscription terms. We may suspend access for material breach, security risk, unlawful use, or nonpayment. Provisions that should reasonably survive termination will survive. These terms, the privacy policy, and any order form are the complete agreement for the service."] },
];

export default function TermsPage() {
  return <LegalPage title="Terms of" accent="Service" updated="July 9, 2026" intro="These terms set the ground rules for using Turf Pro CRM. By creating an account or using the service, you agree to them on behalf of yourself and your organization." sections={sections} />;
}
