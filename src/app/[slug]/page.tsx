import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClonedTurfProFeaturesPage } from "@/components/marketing/cloned-features-page";
import { TurfProMarketingPage } from "@/components/marketing/turf-pro-marketing";
import { getMarketingPage, marketingSlugs } from "@/data/marketing";

export function generateStaticParams() {
  return marketingSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (slug === "features") {
    return {
      title: "Features - Turf Pro CRM",
      description: "Powerful Turf Pro CRM features for scheduling, routing, customer management, work orders, invoicing, and payments.",
    };
  }

  const page = getMarketingPage(slug);

  if (!page) return {};

  return {
    title: `${page.navLabel} - Turf Pro CRM`,
    description: page.lede,
  };
}

export default async function MarketingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug === "features") {
    return <ClonedTurfProFeaturesPage />;
  }

  const page = getMarketingPage(slug);

  if (!page) notFound();

  return <TurfProMarketingPage page={page} />;
}
