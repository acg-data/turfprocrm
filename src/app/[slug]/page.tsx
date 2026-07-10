import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeaturesPage } from "@/components/marketing/features-page";
import { TurfProMarketingPage } from "@/components/marketing/turf-pro-marketing";
import { getMarketingPage, marketingSlugs } from "@/data/marketing";
import { marketingMetadata } from "@/lib/seo";

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
    return marketingMetadata({ title: "Features", description: "Powerful Turf Pro CRM features for scheduling, routing, customer management, work orders, invoicing, and payments.", path: "/features" });
  }

  const page = getMarketingPage(slug);

  if (!page) return {};

  return marketingMetadata({ title: page.navLabel, description: page.lede, path: `/${page.slug}` });
}

export default async function MarketingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug === "features") {
    return <FeaturesPage />;
  }

  const page = getMarketingPage(slug);

  if (!page) notFound();

  return <TurfProMarketingPage page={page} />;
}
