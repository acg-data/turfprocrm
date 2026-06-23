import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { activeFertilizationPricingAdjustments, calculateFertilizationProgramPricing } from "../src/domain/fertilization-pricing";
import { assertOrg, requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";

function inferPriceBookRateCentsPerSqFt(priceBookItem?: Doc<"priceBookItems"> | null) {
  const formulaRate = priceBookItem?.formula?.match(/lawnSizeSqFt\s*\*\s*([0-9.]+)/)?.[1];
  if (formulaRate) return Math.round(Number(formulaRate) * 1000) / 10;
  if (priceBookItem?.pricingModel === "per_sq_ft") return 1.8;
  return 1.8;
}

function normalizeRuleCondition(condition: unknown) {
  if (!condition || typeof condition !== "object") return undefined;
  const value = condition as Record<string, unknown>;
  return {
    minAreaSqFt: typeof value.minAreaSqFt === "number" ? value.minAreaSqFt : undefined,
    maxAreaSqFt: typeof value.maxAreaSqFt === "number" ? value.maxAreaSqFt : undefined,
    minApplications: typeof value.minApplications === "number" ? value.minApplications : undefined,
    maxApplications: typeof value.maxApplications === "number" ? value.maxApplications : undefined,
  };
}

export const priceFertilizationProgram = mutation({
  args: {
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    propertyAreaId: v.optional(v.id("propertyAreas")),
    materialId: v.id("materials"),
    priceBookItemId: v.optional(v.id("priceBookItems")),
    applicationCount: v.number(),
    materialRateUnitsPer1000SqFt: v.number(),
    laborHoursPerApplication: v.number(),
    laborRateCents: v.number(),
    equipmentCostCentsPerApplication: v.number(),
    overheadPercent: v.number(),
    targetMarginPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "createEstimate");
    const [property, propertyArea, material, requestedPriceBookItem] = await Promise.all([
      ctx.db.get(args.propertyId),
      args.propertyAreaId ? ctx.db.get(args.propertyAreaId) : undefined,
      ctx.db.get(args.materialId),
      args.priceBookItemId ? ctx.db.get(args.priceBookItemId) : undefined,
    ]);
    if (!property) throw new ConvexError({ code: "NOT_FOUND", message: "Property not found." });
    if (!material) throw new ConvexError({ code: "NOT_FOUND", message: "Material not found." });
    assertOrg(property, args.organizationId);
    assertOrg(material, args.organizationId);
    if (propertyArea) {
      assertOrg(propertyArea, args.organizationId);
      if (propertyArea.propertyId !== property._id) throw new ConvexError({ code: "INVALID_AREA", message: "Property area does not belong to the selected property." });
    }
    if (args.propertyAreaId && !propertyArea) throw new ConvexError({ code: "NOT_FOUND", message: "Property area not found." });
    if (requestedPriceBookItem) assertOrg(requestedPriceBookItem, args.organizationId);
    if (args.priceBookItemId && !requestedPriceBookItem) throw new ConvexError({ code: "NOT_FOUND", message: "Price book item not found." });

    const fallbackPriceBookItem = requestedPriceBookItem
      ?? (await ctx.db.query("priceBookItems").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect())
        .find((item) => item.active && item.name.toLowerCase().includes("six-step"));
    const pricingRules = fallbackPriceBookItem
      ? await ctx.db.query("pricingRules").withIndex("by_price_book_item", (q) => q.eq("priceBookItemId", fallbackPriceBookItem._id)).collect()
      : [];
    const turfAreaSqFt = Math.round(propertyArea?.unit === "sq_ft" && propertyArea.size ? propertyArea.size : property.lawnSizeSqFt ?? 0);
    if (turfAreaSqFt <= 0) {
      throw new ConvexError({ code: "MISSING_AREA", message: "A lawn size or sq_ft property area is required for fertilization pricing." });
    }

    const adjustments = activeFertilizationPricingAdjustments(
      pricingRules.map((rule) => ({
        name: rule.name,
        active: rule.active,
        order: rule.order,
        condition: normalizeRuleCondition(rule.condition),
        adjustmentType: rule.adjustmentType,
        adjustmentValue: rule.adjustmentValue,
      })),
      { turfAreaSqFt, applicationCount: args.applicationCount },
    );
    const output = calculateFertilizationProgramPricing({
      turfAreaSqFt,
      applicationCount: args.applicationCount,
      materialUnitCostCents: material.costCents ?? 0,
      materialRateUnitsPer1000SqFt: args.materialRateUnitsPer1000SqFt,
      laborHoursPerApplication: args.laborHoursPerApplication,
      laborRateCents: args.laborRateCents,
      equipmentCostCentsPerApplication: args.equipmentCostCentsPerApplication,
      overheadPercent: args.overheadPercent,
      targetMarginPercent: args.targetMarginPercent,
      priceBookRateCentsPerSqFt: inferPriceBookRateCentsPerSqFt(fallbackPriceBookItem),
      minPriceCents: fallbackPriceBookItem?.minPriceCents ?? 0,
      adjustments,
    });
    const now = Date.now();
    const sessionId = await ctx.db.insert("pricingCalculatorSessions", {
      organizationId: args.organizationId,
      propertyId: property._id,
      inputs: {
        kind: "fertilization_program",
        ...args,
        resolvedPropertyAreaId: propertyArea?._id,
        materialName: material.name,
        resolvedPriceBookItemId: fallbackPriceBookItem?._id,
        priceBookItemName: fallbackPriceBookItem?.name,
      },
      outputs: output,
      createdByUserId: user._id,
      createdAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "pricing.fertilization.calculate",
      entityType: "property",
      entityId: property._id,
      summary: `Calculated fertilization program for ${property.label}`,
      after: { sessionId, recommendedPriceCents: output.recommendedPriceCents, turfAreaSqFt },
    });

    return { sessionId, output };
  },
});
