import type { Metadata } from "next";
import { AuthEntryPage } from "@/components/marketing/signup-page";

export const metadata: Metadata = {
  title: "Sign in to Turf Pro CRM",
  description: "Sign in or create a Turf Pro CRM account, choose a plan, and provision your landscaping or pest-control workspace.",
};

export default function SignInPage() {
  return <AuthEntryPage />;
}
