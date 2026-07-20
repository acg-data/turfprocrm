import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { customerJourneyCategories, customerJourneys, journeyCoverageSummary } from "@/data/customer-journeys";

describe("customer journey registry", () => {
  it("tracks exactly 100 unique journeys", () => {
    expect(customerJourneys).toHaveLength(100);
    expect(new Set(customerJourneys.map((journey) => journey.id)).size).toBe(100);
    expect(customerJourneys.map((journey) => journey.id)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
  });

  it("keeps every journey mapped to product, backend, acceptance, evidence, and gap metadata", () => {
    const categoryIds = new Set(customerJourneyCategories.map((category) => category.id));

    for (const journey of customerJourneys) {
      expect(categoryIds.has(journey.categoryId), `journey ${journey.id} category`).toBe(true);
      expect(journey.title, `journey ${journey.id} title`).toBeTruthy();
      expect(journey.actor, `journey ${journey.id} actor`).toBeTruthy();
      expect(journey.outcome, `journey ${journey.id} outcome`).toBeTruthy();
      expect(journey.primarySurface, `journey ${journey.id} surface`).toBeTruthy();
      expect(journey.backendObjects.length, `journey ${journey.id} backend`).toBeGreaterThan(0);
      expect(journey.acceptance.length, `journey ${journey.id} acceptance`).toBeGreaterThanOrEqual(3);
      expect(journey.evidence.length, `journey ${journey.id} evidence`).toBeGreaterThan(0);
      expect(journey.gaps.length, `journey ${journey.id} gaps`).toBeGreaterThan(0);
    }
  });

  it("stays aligned with the markdown source list", () => {
    const markdown = readFileSync("docs/customer-journeys-100.md", "utf8");
    const numberedItems = markdown.match(/^### \d+\. /gm) ?? [];

    expect(numberedItems).toHaveLength(100);
    for (const journey of customerJourneys) {
      expect(markdown).toContain(`### ${journey.id}. ${journey.title}`);
    }
  });

  it("summarizes verified, interactive, modeled, and gap coverage", () => {
    const summary = journeyCoverageSummary();

    expect(summary.total).toBe(100);
    expect(summary.byCoverage.verified + summary.byCoverage.interactive + summary.byCoverage.modeled + summary.byCoverage.gap).toBe(100);
    expect(summary.byCoverage.verified).toBeGreaterThan(0);
    expect(summary.p0Open).toBe(0);
  });
});
