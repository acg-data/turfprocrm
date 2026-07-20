import { LandscapeOsApp } from "@/components/app/landscape-os-app";
import { parseDemoPersona } from "@/data/demo-personas";

export default async function OperatingAppPage({ searchParams }: { searchParams: Promise<{ demo?: string | string[]; view?: string | string[] }> }) {
  const params = await searchParams;
  const demoValue = Array.isArray(params.demo) ? params.demo[0] : params.demo;
  const viewValue = Array.isArray(params.view) ? params.view[0] : params.view;
  return <LandscapeOsApp initialDemoPersona={parseDemoPersona(demoValue)} initialView={viewValue} />;
}
