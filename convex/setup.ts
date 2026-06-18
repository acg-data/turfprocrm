import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function upsertCurrentUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in is required." });
  }

  const now = Date.now();
  const email = identity.email ?? `${identity.subject}@unknown.local`;
  const name = identity.name ?? identity.nickname ?? email;
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      name,
      email,
      avatarUrl: identity.pictureUrl,
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("users", {
    clerkUserId: identity.subject,
    name,
    email,
    avatarUrl: identity.pictureUrl,
    createdAt: now,
    updatedAt: now,
  });
}

const billingPlan = v.union(v.literal("free"), v.literal("starter"), v.literal("pro"), v.literal("growth"), v.literal("enterprise"));

function planLimits(plan?: string) {
  if (plan === "free") return { contactLimit: 10, memberLimit: 1 };
  if (plan === "starter") return { contactLimit: 250, memberLimit: 3 };
  return { contactLimit: null, memberLimit: null };
}

export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    return await upsertCurrentUser(ctx);
  },
});

export const listMyOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) return [];

    const memberships = await ctx.db.query("memberships").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    const rows = await Promise.all(
      memberships.map(async (membership) => {
        const organization = await ctx.db.get(membership.organizationId);
        if (!organization) return null;
        const [subscription, contacts] = await Promise.all([
          ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", organization._id)).first(),
          ctx.db.query("contacts").withIndex("by_org", (q) => q.eq("organizationId", organization._id)).collect(),
        ]);
        const plan = subscription?.plan ?? organization.billingPlan ?? "free";
        return {
          organization,
          membership,
          subscription,
          usage: {
            contacts: contacts.length,
            ...planLimits(plan),
          },
        };
      }),
    );
    return rows.filter((row): row is NonNullable<(typeof rows)[number]> => row !== null);
  },
});

export const createOrganization = mutation({
  args: {
    name: v.string(),
    timezone: v.optional(v.string()),
    industryFocus: v.optional(v.union(v.literal("landscaping"), v.literal("pest_control"), v.literal("both"))),
    clerkOrganizationId: v.optional(v.string()),
    billingPlan: v.optional(billingPlan),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in is required." });
    }

    const userId = await upsertCurrentUser(ctx);
    const now = Date.now();
    const plan = args.billingPlan ?? "free";
    const isFree = plan === "free";
    const subscriptionStatus = isFree ? "active" : "trialing";
    const trialEndsAt = isFree ? undefined : now + 14 * 24 * 60 * 60 * 1000;
    const baseSlug = slugify(args.name) || "workspace";
    let slug = baseSlug;
    let suffix = 2;
    while (await ctx.db.query("organizations").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const organizationId = await ctx.db.insert("organizations", {
      name: args.name,
      slug,
      industryFocus: args.industryFocus ?? "both",
      timezone: args.timezone ?? "America/New_York",
      defaultCurrency: "USD",
      billingPlan: plan,
      subscriptionStatus,
      trialEndsAt,
      serviceTerritory: [],
      settings: {
        mapProvider: "google_maps_links",
        reportingMirror: "auditEvents_export_boundary",
        onboardingVersion: "green_industry_mvp_v1",
        planLimits: planLimits(plan),
      },
      createdByClerkUserId: identity.subject,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("memberships", {
      organizationId,
      userId,
      clerkOrganizationId: args.clerkOrganizationId,
      role: "owner",
      status: "active",
      joinedAt: now,
      updatedAt: now,
    });

    const defaultServices = [
      ["Six-step fertilization program", "lawn_care", "season", 165000],
      ["Mosquito and tick barrier", "pest_control", "visit", 13000],
      ["Core aeration and overseeding", "lawn_care", "acre", 42000],
      ["Spring cleanup", "landscaping", "crew hour", 9500],
    ] as const;

    for (const [name, category, defaultUnit, defaultPriceCents] of defaultServices) {
      await ctx.db.insert("serviceCatalogItems", {
        organizationId,
        name,
        category,
        defaultUnit,
        defaultPriceCents,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const crewId = await ctx.db.insert("crews", {
      organizationId,
      name: "Crew 1",
      color: "#2f6b4f",
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("crewMembers", {
      organizationId,
      crewId,
      userId,
      role: "Lead",
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("subscriptions", {
      organizationId,
      plan,
      status: subscriptionStatus,
      seats: 1,
      trialEndsAt,
      createdAt: now,
      updatedAt: now,
    });

    const leadStatuses = [
      ["new", "New", "#2563eb", 1, false],
      ["contacted", "Contacted", "#d97706", 2, false],
      ["do_estimate", "Do Estimate", "#2563eb", 3, false],
      ["estimate_provided", "Estimate Provided", "#7c3aed", 4, false],
      ["follow_up", "Follow Up", "#b45309", 5, false],
      ["converted", "Converted", "#047857", 6, true],
      ["lost_confirmed", "Lost", "#be123c", 7, true],
      ["spam", "Spam", "#475569", 8, true],
    ] as const;
    for (const [status, label, color, sortOrder, terminal] of leadStatuses) {
      await ctx.db.insert("leadStatusSettings", {
        organizationId,
        status,
        label,
        color,
        sortOrder,
        terminal,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const view of [
      { name: "New leads", filters: { status: "new" }, columns: ["lead", "owner", "source", "program", "quality", "received"] },
      { name: "Needs estimate", filters: { status: "do_estimate" }, columns: ["lead", "property", "value", "program", "owner"] },
      { name: "Spam review", filters: { spamScore: { gte: 35 } }, columns: ["lead", "source", "spamScore", "reasons"] },
    ]) {
      await ctx.db.insert("leadSavedViews", {
        organizationId,
        name: view.name,
        ownerUserId: userId,
        scope: "team",
        filters: view.filters,
        columns: view.columns,
        sort: { field: "receivedAt", direction: "desc" },
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const [key, label, category, color, description] of [
      ["residential", "Residential", "customer_segment", "#6b7f3a", "Residential homeowner account"],
      ["commercial", "Commercial", "customer_segment", "#42526b", "Commercial property or facilities account"],
      ["hoa", "HOA", "customer_segment", "#315a4d", "Association or managed community account"],
      ["recurring", "Recurring", "customer_segment", "#047857", "Recurring plan or contract relationship"],
      ["one_time", "One-time", "customer_segment", "#78716c", "One-off or project-only relationship"],
      ["fertilization", "Fertilization", "service_line", "#4ea84e", "Lawn fertilization and turf health program"],
      ["mosquito_tick", "Mosquito/Tick", "service_line", "#b45309", "Mosquito, tick, or exterior pest program"],
      ["maintenance", "Maintenance", "service_line", "#2563eb", "Recurring maintenance service line"],
      ["website_form", "Website Form", "lead_source", "#7c3aed", "Inbound website lead source"],
      ["phone", "Phone", "lead_source", "#d97706", "Phone lead source"],
      ["high_ltv", "High LTV", "profitability", "#059669", "Customer has above-average estimated lifetime value"],
      ["low_margin", "Low Margin", "profitability", "#be123c", "Customer or job needs margin review"],
      ["at_risk", "At Risk", "risk", "#e11d48", "Elevated churn or service risk"],
      ["high_ar", "High AR", "risk", "#f59e0b", "Open AR balance requires attention"],
    ] as const) {
      await ctx.db.insert("tagDefinitions", {
        organizationId,
        key,
        label,
        category,
        color,
        description,
        system: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("leadIntakeForms", {
      organizationId,
      name: "Website lead intake",
      source: "Website form",
      defaultOwnerUserId: userId,
      defaultServiceLines: ["lawn_care", "pest_control"],
      fieldConfig: {
        required: ["customerName", "phoneOrEmail", "street", "city", "serviceLine"],
        optional: ["message", "lawnSizeSqFt", "preferredServiceDate", "sourceDetail"],
      },
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of [
      ["profile", "Confirm company profile", "Set timezone, service territory, and operating focus."],
      ["members", "Invite team members", "Add sales, dispatch, admin, and field users."],
      ["catalog", "Review service catalog", "Confirm default services, units, and pricing assumptions."],
      ["lead_import", "Import leads and customers", "Map CSV/source fields into the lead quality model."],
      ["rates", "Set labor and material rates", "Configure labor, equipment, overhead, and vendor costs."],
      ["first_job", "Create first estimate/job", "Convert a lead through estimate, dispatch, and field completion."],
    ] as const) {
      await ctx.db.insert("onboardingChecklistItems", {
        organizationId,
        key: item[0],
        title: item[1],
        description: item[2],
        sortOrder: ["profile", "members", "catalog", "lead_import", "rates", "first_job"].indexOf(item[0]) + 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const flag of [
      { key: "lead_ops_table", enabled: true },
      { key: "dispatch_board", enabled: true },
      { key: "field_pwa", enabled: true },
      { key: "job_costing_v1", enabled: true },
      { key: "profit_dashboard", enabled: true },
    ]) {
      await ctx.db.insert("featureFlags", { organizationId, ...flag, config: { stage: "onboarding_default" }, createdAt: now, updatedAt: now });
    }

    await ctx.db.insert("externalIntegrations", {
      organizationId,
      provider: "google_maps",
      name: "Google Maps deep links",
      status: "enabled",
      config: { mode: "link_generation_only" },
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("externalIntegrations", {
      organizationId,
      provider: "csv",
      name: "CSV import",
      status: "enabled",
      config: { supportedEntities: ["leads", "customers", "properties"] },
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditEvents", {
      organizationId,
      actorUserId: userId,
      action: "organization.provision",
      entityType: "organization",
      entityId: organizationId,
      summary: `Provisioned ${args.name} workspace`,
      after: { slug, plan, checklistItems: 6, limits: planLimits(plan) },
      createdAt: now,
    });

    return organizationId;
  },
});
