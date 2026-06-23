import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";
import { requireIdentity, upsertCurrentUser } from "./lib/users";

const serviceCategory = v.union(
  v.literal("lawn_care"),
  v.literal("landscaping"),
  v.literal("pest_control"),
  v.literal("tree_shrub"),
  v.literal("irrigation"),
  v.literal("snow"),
  v.literal("maintenance"),
);
const role = v.union(v.literal("owner"), v.literal("admin"), v.literal("manager"), v.literal("sales"), v.literal("dispatcher"), v.literal("crew_lead"), v.literal("technician"));

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function memberLimitForPlan(plan?: string) {
  if (plan === "free") return 1;
  if (plan === "starter") return 3;
  return null;
}

async function assertCanInviteMember(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const organization = await ctx.db.get(organizationId);
  if (!organization) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found." });
  const subscription = await ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).first();
  const plan = subscription?.plan ?? organization.billingPlan ?? "free";
  const memberLimit = memberLimitForPlan(plan);
  if (memberLimit === null) return;

  const billableMembers = await ctx.db
    .query("memberships")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .filter((q) => q.or(q.eq(q.field("status"), "active"), q.eq(q.field("status"), "invited")))
    .collect();
  if (billableMembers.length >= memberLimit) {
    throw new ConvexError({
      code: "PLAN_LIMIT_REACHED",
      message: `The ${plan} plan allows ${memberLimit} member${memberLimit === 1 ? "" : "s"}. Upgrade to invite more teammates.`,
      plan,
      memberLimit,
      currentMembers: billableMembers.length,
    });
  }
}

export const getSettings = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    const [organization, memberships, crews, serviceCatalog, servicePackages, priceBookItems, pricingRules, materials, equipment] = await Promise.all([
      ctx.db.get(args.organizationId),
      ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("crews").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("serviceCatalogItems").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("servicePackages").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("priceBookItems").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("pricingRules").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("materials").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("equipment").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
    ]);

    const members = await Promise.all(
      memberships.map(async (membership) => ({
        membership,
        user: await ctx.db.get(membership.userId),
      })),
    );

    return { organization, members, crews, serviceCatalog, servicePackages, priceBookItems, pricingRules, materials, equipment };
  },
});

export const inviteMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    name: v.optional(v.string()),
    role,
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageMembers");
    const email = normalizeEmail(args.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError({ code: "INVALID_EMAIL", message: "A valid teammate email is required." });
    }
    if (args.role === "owner") {
      throw new ConvexError({ code: "INVALID_ROLE", message: "Invite teammates as admin, manager, sales, dispatcher, crew lead, or technician." });
    }

    await assertCanInviteMember(ctx, args.organizationId);
    const users = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).collect();
    const memberships = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect();
    const existingRows = await Promise.all(
      memberships.map(async (membership) => ({
        membership,
        invitedUser: users.find((candidate) => candidate._id === membership.userId) ?? await ctx.db.get(membership.userId),
      })),
    );
    const existingMembership = existingRows.find((row) => normalizeEmail(row.invitedUser?.email ?? row.membership.invitedEmail ?? "") === email)?.membership;
    if (existingMembership && ["active", "invited"].includes(existingMembership.status)) {
      throw new ConvexError({ code: "ALREADY_INVITED", message: "That teammate is already active or invited." });
    }

    const now = Date.now();
    const expiresAt = now + Math.max(1, Math.min(30, Math.round(args.expiresInDays ?? 14))) * 24 * 60 * 60 * 1000;
    const invitedUserId =
      users[0]?._id ??
      await ctx.db.insert("users", {
        clerkUserId: `invite:${args.organizationId}:${email}`,
        name: args.name?.trim() || email,
        email,
        createdAt: now,
        updatedAt: now,
      });

    const invitePatch = {
      userId: invitedUserId,
      role: args.role,
      status: "invited" as const,
      invitedEmail: email,
      invitedByUserId: user._id,
      inviteToken: `invite-${now}-${email.replace(/[^a-z0-9]/g, "-")}`,
      inviteExpiresAt: expiresAt,
      inviteAcceptedAt: undefined,
      inviteRevokedAt: undefined,
      updatedAt: now,
    };
    const membershipId = existingMembership
      ? existingMembership._id
      : await ctx.db.insert("memberships", {
          organizationId: args.organizationId,
          ...invitePatch,
          joinedAt: now,
        });

    if (existingMembership) {
      await ctx.db.patch(existingMembership._id, invitePatch);
    }

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "member.invite",
      entityType: "organization",
      entityId: args.organizationId,
      summary: `Invited ${email} as ${args.role}`,
      after: { membershipId, email, role: args.role, expiresAt },
    });

    return { membershipId, userId: invitedUserId, email, role: args.role, status: "invited" as const, expiresAt };
  },
});

export const revokeMemberInvite = mutation({
  args: {
    organizationId: v.id("organizations"),
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageMembers");
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.organizationId !== args.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Invite not found." });
    }
    if (membership.status !== "invited" && membership.status !== "expired") {
      throw new ConvexError({ code: "INVALID_INVITE_STATUS", message: "Only pending or expired invites can be revoked." });
    }

    const now = Date.now();
    await ctx.db.patch(args.membershipId, { status: "revoked", inviteRevokedAt: now, updatedAt: now });
    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "member.invite.revoke",
      entityType: "organization",
      entityId: args.organizationId,
      summary: `Revoked invite ${membership.invitedEmail ?? membership.userId}`,
      before: { status: membership.status },
      after: { status: "revoked" },
    });

    return args.membershipId;
  },
});

export const expireMemberInvite = mutation({
  args: {
    organizationId: v.id("organizations"),
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageMembers");
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.organizationId !== args.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Invite not found." });
    }
    if (membership.status !== "invited") {
      throw new ConvexError({ code: "INVALID_INVITE_STATUS", message: "Only pending invites can expire." });
    }

    await ctx.db.patch(args.membershipId, { status: "expired", updatedAt: Date.now() });
    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "member.invite.expire",
      entityType: "organization",
      entityId: args.organizationId,
      summary: `Expired invite ${membership.invitedEmail ?? membership.userId}`,
      before: { status: membership.status },
      after: { status: "expired" },
    });

    return args.membershipId;
  },
});

export const acceptMemberInvite = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const email = normalizeEmail(identity.email ?? "");
    if (!email) throw new ConvexError({ code: "EMAIL_REQUIRED", message: "Your signed-in account needs an email to accept an invite." });

    const userId = await upsertCurrentUser(ctx);
    const memberships = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect();
    const rows = await Promise.all(
      memberships.map(async (membership) => ({
        membership,
        invitedUser: await ctx.db.get(membership.userId),
      })),
    );
    const existingActive = rows.find((row) => row.membership.userId === userId && row.membership.status === "active");
    if (existingActive) return existingActive.membership._id;

    const invite = rows.find((row) => row.membership.status === "invited" && normalizeEmail(row.membership.invitedEmail ?? row.invitedUser?.email ?? "") === email)?.membership;
    if (!invite) {
      const expired = rows.find((row) => row.membership.status === "expired" && normalizeEmail(row.membership.invitedEmail ?? row.invitedUser?.email ?? "") === email);
      if (expired) throw new ConvexError({ code: "INVITE_EXPIRED", message: "This invite has expired. Ask an admin to resend it." });
      throw new ConvexError({ code: "INVITE_NOT_FOUND", message: "No pending invite was found for this email." });
    }
    const now = Date.now();
    if (invite.inviteExpiresAt && invite.inviteExpiresAt < now) {
      await ctx.db.patch(invite._id, { status: "expired", updatedAt: now });
      throw new ConvexError({ code: "INVITE_EXPIRED", message: "This invite has expired. Ask an admin to resend it." });
    }

    await ctx.db.patch(invite._id, {
      userId,
      status: "active",
      invitedEmail: email,
      inviteAcceptedAt: now,
      joinedAt: now,
      updatedAt: now,
    });
    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: userId,
      action: "member.invite.accept",
      entityType: "organization",
      entityId: args.organizationId,
      summary: `Accepted invite for ${email}`,
      before: { status: "invited" },
      after: { status: "active" },
    });

    return invite._id;
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
      await audit(ctx, {
        organizationId: args.organizationId,
        actorUserId: user._id,
        action: "catalog.update",
        entityType: "service_catalog_item",
        entityId: args.itemId,
        summary: `Updated service ${args.name}`,
        before: {
          name: item.name,
          category: item.category,
          defaultUnit: item.defaultUnit,
          defaultPriceCents: item.defaultPriceCents,
          active: item.active,
        },
        after: {
          name: args.name,
          category: args.category,
          defaultUnit: args.defaultUnit,
          defaultPriceCents: args.defaultPriceCents,
          active: args.active,
        },
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
      entityType: "service_catalog_item",
      entityId: itemId,
      summary: `Created service ${args.name}`,
      after: { itemId, name: args.name, category: args.category, defaultUnit: args.defaultUnit, defaultPriceCents: args.defaultPriceCents, active: args.active },
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
