import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireMembership, requireUser } from "./lib/auth";
import { audit } from "./lib/audit";
import { planLimits } from "./setup";
import { inviteEmail } from "./lib/emails";

const role = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("manager"),
  v.literal("sales"),
  v.literal("dispatcher"),
  v.literal("crew_lead"),
  v.literal("technician"),
);

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const createInvite = mutation({
  args: { organizationId: v.id("organizations"), email: v.string(), role },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageMembers");
    if (args.role === "owner") {
      throw new ConvexError({ code: "INVALID_ROLE", message: "Ownership is transferred, not invited." });
    }
    const org = await ctx.db.get(args.organizationId);
    if (!org) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found." });

    const normalizedEmail = normalizeEmail(args.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new ConvexError({ code: "INVALID_EMAIL", message: "Enter a valid email address." });
    }

    const [memberships, pendingInvites, subscription] = await Promise.all([
      ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("invites").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).first(),
    ]);

    // Seat limit: active members + pending invites must stay within plan.
    const plan = subscription?.plan ?? org.billingPlan ?? "free";
    const { memberLimit } = planLimits(plan);
    const activeMembers = memberships.filter((m) => m.status === "active").length;
    const pending = pendingInvites.filter((i) => i.status === "pending" && i.expiresAt > Date.now()).length;
    if (memberLimit !== null && activeMembers + pending >= memberLimit) {
      throw new ConvexError({
        code: "PLAN_LIMIT_REACHED",
        message: `Your ${plan} plan allows ${memberLimit} member${memberLimit === 1 ? "" : "s"}. Upgrade to invite more.`,
      });
    }

    // No duplicate pending invite or existing member with this email.
    const duplicate = pendingInvites.find(
      (i) => i.normalizedEmail === normalizedEmail && i.status === "pending" && i.expiresAt > Date.now(),
    );
    if (duplicate) {
      throw new ConvexError({ code: "ALREADY_INVITED", message: "There is already a pending invite for this email." });
    }
    for (const membership of memberships) {
      if (membership.status === "disabled") continue;
      const memberUser = await ctx.db.get(membership.userId);
      if (memberUser && normalizeEmail(memberUser.email) === normalizedEmail) {
        throw new ConvexError({ code: "ALREADY_MEMBER", message: "That person is already a member of this workspace." });
      }
    }

    const now = Date.now();
    const token = newToken();
    const inviteId = await ctx.db.insert("invites", {
      organizationId: args.organizationId,
      email: args.email.trim(),
      normalizedEmail,
      role: args.role,
      token,
      status: "pending",
      invitedByUserId: user._id,
      expiresAt: now + INVITE_TTL_MS,
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "team.invite_created",
      entityType: "customer",
      entityId: inviteId,
      summary: `Invited ${normalizedEmail} as ${args.role}`,
    });

    const acceptUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/invite/${token}`;
    const email = inviteEmail({ organizationName: org.name, inviterName: user.name, role: args.role, acceptUrl });
    await ctx.scheduler.runAfter(0, internal.email.send, { to: normalizedEmail, ...email });

    return { inviteId };
  },
});

export const listInvites = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, "manageMembers");
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    const now = Date.now();
    return invites
      .filter((invite) => invite.status === "pending")
      .map((invite) => ({
        id: invite._id,
        email: invite.email,
        role: invite.role,
        expired: invite.expiresAt <= now,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      }));
  },
});

export const revokeInvite = mutation({
  args: { organizationId: v.id("organizations"), inviteId: v.id("invites") },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageMembers");
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.organizationId !== args.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Invite not found." });
    }
    await ctx.db.patch(args.inviteId, { status: "revoked", updatedAt: Date.now() });
    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "team.invite_revoked",
      entityType: "customer",
      entityId: args.inviteId,
      summary: `Revoked invite for ${invite.normalizedEmail}`,
    });
  },
});

/** Public: the invite landing page looks the invite up by its secret token. */
export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!invite) return null;
    const org = await ctx.db.get(invite.organizationId);
    return {
      organizationName: org?.name ?? "a workspace",
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expired: invite.expiresAt <= Date.now(),
    };
  },
});

export const acceptInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!invite || invite.status !== "pending") {
      throw new ConvexError({ code: "INVITE_INVALID", message: "This invitation is no longer valid." });
    }
    if (invite.expiresAt <= Date.now()) {
      await ctx.db.patch(invite._id, { status: "expired", updatedAt: Date.now() });
      throw new ConvexError({ code: "INVITE_EXPIRED", message: "This invitation has expired. Ask for a new one." });
    }
    if (normalizeEmail(user.email) !== invite.normalizedEmail) {
      throw new ConvexError({
        code: "INVITE_EMAIL_MISMATCH",
        message: `This invitation was sent to ${invite.email}. Sign in with that email to accept it.`,
      });
    }

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_org_user", (q) => q.eq("organizationId", invite.organizationId).eq("userId", user._id))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { status: "active", role: invite.role, updatedAt: now });
    } else {
      await ctx.db.insert("memberships", {
        organizationId: invite.organizationId,
        userId: user._id,
        role: invite.role,
        status: "active",
        joinedAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(invite._id, { status: "accepted", acceptedByUserId: user._id, acceptedAt: now, updatedAt: now });

    await audit(ctx, {
      organizationId: invite.organizationId,
      actorUserId: user._id,
      action: "team.invite_accepted",
      entityType: "customer",
      entityId: invite._id,
      summary: `${user.name} joined as ${invite.role}`,
    });

    return { organizationId: invite.organizationId };
  },
});
