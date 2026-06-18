import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";

const serviceCategory = v.union(
  v.literal("lawn_care"),
  v.literal("landscaping"),
  v.literal("pest_control"),
  v.literal("tree_shrub"),
  v.literal("irrigation"),
  v.literal("snow"),
  v.literal("maintenance"),
);

export const getSettings = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    const [organization, memberships, crews, serviceCatalog, materials, equipment] = await Promise.all([
      ctx.db.get(args.organizationId),
      ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("crews").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("serviceCatalogItems").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("materials").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("equipment").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
    ]);

    const members = await Promise.all(
      memberships.map(async (membership) => ({
        membership,
        user: await ctx.db.get(membership.userId),
      })),
    );

    return { organization, members, crews, serviceCatalog, materials, equipment };
  },
});

export const upsertServiceCatalogItem = mutation({
  args: {
    organizationId: v.id("organizations"),
    itemId: v.optional(v.id("serviceCatalogItems")),
    name: v.string(),
    category: serviceCategory,
    defaultUnit: v.string(),
    defaultPriceCents: v.number(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageCatalog");
    const now = Date.now();
    if (args.itemId) {
      const item = await ctx.db.get(args.itemId);
      if (!item || item.organizationId !== args.organizationId) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Catalog item not found." });
      }
      await ctx.db.patch(args.itemId, {
        name: args.name,
        category: args.category,
        defaultUnit: args.defaultUnit,
        defaultPriceCents: args.defaultPriceCents,
        active: args.active,
        updatedAt: now,
      });
      return args.itemId;
    }

    const itemId = await ctx.db.insert("serviceCatalogItems", {
      organizationId: args.organizationId,
      name: args.name,
      category: args.category,
      defaultUnit: args.defaultUnit,
      defaultPriceCents: args.defaultPriceCents,
      active: args.active,
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "catalog.create",
      entityType: "customer",
      entityId: args.organizationId,
      summary: `Created service ${args.name}`,
      after: { itemId },
    });

    return itemId;
  },
});

export const createCrew = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "dispatchVisits");
    const now = Date.now();
    const crewId = await ctx.db.insert("crews", {
      organizationId: args.organizationId,
      name: args.name,
      color: args.color,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "crew.create",
      entityType: "customer",
      entityId: args.organizationId,
      summary: `Created crew ${args.name}`,
      after: { crewId },
    });

    return crewId;
  },
});
