import type { Metadata } from "next";

export const PRODUCT_NAME = "Turf Pro CRM";

export function siteUrl() {
  return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
}

export function marketingMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const canonical = new URL(path, siteUrl()).toString();
  const fullTitle = title.includes(PRODUCT_NAME) ? title : `${title} - ${PRODUCT_NAME}`;
  return {
    title: fullTitle,
    description,
    alternates: { canonical },
    openGraph: { type: "website", title: fullTitle, description, url: canonical, siteName: PRODUCT_NAME },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}

