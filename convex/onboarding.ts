import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";

export const getActivationCenter = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { user, membership } = await requireMembership(ctx, args.organizationId);
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) throw new ConvexError({ code: "NOT_FOUND", message: "Workspace not found." });
    const [subscription, checklist, members, customers, leads, estimates, visits, invoices, services, crews] = await Promise.all([
      ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).first(),
      ctx.db.query("onboardingChecklistItems").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("customers").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("leads").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("estimates").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("jobVisits").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("customerInvoices").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("serviceCatalogItems").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("crews").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
    ]);
    const now = Date.now();
    const trialEndsAt = subscription?.trialEndsAt ?? organization.trialEndsAt;
    const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - now) / (24 * 60 * 60 * 1000))) : null;
    const signals = {
      companyProfile: Boolean(organization.serviceTerritory?.length && organization.timezone),
      serviceCatalog: services.some((service) => service.active),
      crewReady: crews.some((crew) => crew.active),
      teamInvited: members.filter((member) => member.status === "active").length > 1,
      customerCreated: customers.length > 0,
      leadCreated: leads.length > 0,
      estimateSent: estimates.some((estimate) => estimate.status !== "draft"),
      visitScheduled: visits.length > 0,
      invoiceCreated: invoices.length > 0,
    };
    const activationScore = Math.round((Object.values(signals).filter(Boolean).length / Object.values(signals).length) * 100);
    return {
      organization: { id: organization._id, name: organization.name, timezone: organization.timezone, serviceTerritory: organization.serviceTerritory ?? [], industryFocus: organization.industryFocus },
      viewer: { name: user.name, role: membership.role },
      trial: {
        plan: subscription?.plan ?? organization.billingPlan ?? "free",
        status: subscription?.status ?? organization.subscriptionStatus ?? "active",
        endsAt: trialEndsAt ?? null,
        graceEndsAt: trialEndsAt ? trialEndsAt + 7 * 24 * 60 * 60 * 1000 : null,
        retentionEndsAt: trialEndsAt ? trialEndsAt + 90 * 24 * 60 * 60 * 1000 : null,
        daysLeft: trialDaysLeft,
        isReadOnly: subscription?.status === "canceled" || (subscription?.status === "trialing" && trialEndsAt !== undefined && now > trialEndsAt),
      },
      checklist: checklist.sort((a, b) => a.sortOrder - b.sortOrder),
      signals,
      activationScore,
      counts: { members: members.length, customers: customers.length, leads: leads.length, estimates: estimates.length, visits: visits.length, invoices: invoices.length },
    };
  },
});

export const updateCompanyProfile = mutation({
  args: {
    organizationId: v.id("organizations"),
    timezone: v.string(),
    serviceTerritory: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageOrganization");
    const serviceTerritory = args.serviceTerritory.map((value) => value.trim()).filter(Boolean).slice(0, 100);
    if (!args.timezone.trim() || !serviceTerritory.length) throw new ConvexError({ code: "INVALID_PROFILE", message: "Add a timezone and at least one service area." });
    const now = Date.now();
    await ctx.db.patch(args.organizationId, { timezone: args.timezone.trim(), serviceTerritory, updatedAt: now });
    const item = await ctx.db.query("onboardingChecklistItems").withIndex("by_org_key", (q) => q.eq("organizationId", args.organizationId).eq("key", "profile")).unique();
    if (item && !item.completedAt) await ctx.db.patch(item._id, { completedAt: now, completedByUserId: user._id, updatedAt: now });
    await audit(ctx, { organizationId: args.organizationId, actorUserId: user._id, action: "onboarding.profile_completed", entityType: "customer", entityId: args.organizationId, summary: "Completed company profile setup" });
  },
});

export const setChecklistItem = mutation({
  args: { organizationId: v.id("organizations"), itemId: v.id("onboardingChecklistItems"), completed: v.boolean() },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageOrganization");
    const item = await ctx.db.get(args.itemId);
    if (!item || item.organizationId !== args.organizationId) throw new ConvexError({ code: "NOT_FOUND", message: "Checklist item not found." });
    const now = Date.now();
    await ctx.db.patch(item._id, { completedAt: args.completed ? now : undefined, completedByUserId: args.completed ? user._id : undefined, updatedAt: now });
    await audit(ctx, { organizationId: args.organizationId, actorUserId: user._id, action: args.completed ? "onboarding.item_completed" : "onboarding.item_reopened", entityType: "customer", entityId: args.organizationId, summary: `${args.completed ? "Completed" : "Reopened"} onboarding step: ${item.title}` });
  },
});
