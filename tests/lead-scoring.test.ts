import { describe, expect, it } from "vitest";
import { leadQualityBand, leadQualityThresholds, scoreLeadQuality } from "@/domain/lead-scoring";

describe("lead quality scoring", () => {
  it("marks complete low-spam leads as estimate-ready A quality", () => {
    const result = scoreLeadQuality({
      source: "Website form",
      phone: "(508) 555-0100",
      email: "owner@example.com",
      street: "10 Main Street",
      city: "Foxborough",
      postalCode: "02035",
      serviceLine: "lawn_care",
      lawnSizeSqFt: 12000,
      message: "Interested in a fertilization program.",
      ownerOrCompany: "Turf Pro",
      spamScore: 0,
    });

    expect(result.score).toBe(100);
    expect(result.band).toBe("a");
    expect(result.estimateReady).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("penalizes missing contact, address, message, area, and owner assignment", () => {
    const result = scoreLeadQuality({
      source: "Phone",
      serviceLine: "pest_control",
      city: "Foxborough",
    });

    expect(result.score).toBe(32);
    expect(result.band).toBe("f");
    expect(result.estimateReady).toBe(false);
    expect(result.reasons).toContain("Missing phone");
    expect(result.reasons).toContain("Missing email");
    expect(result.reasons).toContain("Incomplete property address");
  });

  it("blocks estimate-ready status when spam score crosses review threshold", () => {
    const result = scoreLeadQuality({
      source: "Website form",
      phone: "(508) 555-0100",
      email: "marketing@example.com",
      street: "10 Main Street",
      city: "Foxborough",
      postalCode: "02035",
      serviceLine: "maintenance",
      lawnSizeSqFt: 7000,
      message: "We generate leads and you can unsubscribe.",
      ownerOrCompany: "Turf Pro",
      spamScore: 75,
    });

    expect(result.score).toBe(65);
    expect(result.band).toBe("c");
    expect(result.estimateReady).toBe(false);
    expect(result.reasons).toContain("Spam score requires review");
  });

  it("keeps admin threshold bands ordered from highest to lowest", () => {
    expect(leadQualityThresholds.map((threshold) => threshold.band)).toEqual(["a", "b", "c", "d", "f"]);
    expect(leadQualityBand(85)).toBe("a");
    expect(leadQualityBand(70)).toBe("b");
    expect(leadQualityBand(55)).toBe("c");
    expect(leadQualityBand(40)).toBe("d");
    expect(leadQualityBand(20)).toBe("f");
  });
});
