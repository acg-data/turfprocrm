import { LandscapeOsApp } from "@/components/app/landscape-os-app";
import { parseDemoPersona } from "@/data/demo-personas";

export default async function OperatingAppPage({ searchParams }: { searchParams: Promise<{ demo?: string | string[] }> }) {
  const params = await searchParams;
  const demoValue = Array.isArray(params.demo) ? params.demo[0] : params.demo;
  return <LandscapeOsApp initialDemoPersona={parseDemoPersona(demoValue)} />;
}
