import type { MetadataRoute } from "next";
import { marketingSlugs } from "@/data/marketing";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const staticPaths = ["/", "/demo", "/signin", "/privacy", "/terms"];
  return [...staticPaths, ...marketingSlugs.map((slug) => `/${slug}`)].map((path) => ({
    url: new URL(path, base).toString(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/pricing" || path === "/features" ? 0.9 : 0.7,
  }));
}

