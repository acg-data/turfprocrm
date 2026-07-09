import type { Metadata } from "next";
import { DemoPage } from "@/components/marketing/demo-page";

export const metadata: Metadata = {
  title: "Request a demo - Turf Pro CRM",
  description: "See Turf Pro CRM on your own leads and workflows in a 15-minute walkthrough.",
};

export default function Page() {
  return <DemoPage />;
}
