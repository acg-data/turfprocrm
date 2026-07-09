import { and, eq } from "drizzle-orm";
import { memberships, organizations, users } from "./db/schema";
import type { MembershipRow, OrganizationRow, UserRow } from "./db/schema";
import { hasPermission, type Permission } from "../domain/permissions";
import type { Role } from "../domain/workflow";
import { ApiError } from "./errors";
import { newId } from "./ids";
import type { ServerCtx } from "./context";

export async function requireIdentity(ctx: ServerCtx) {
  if (!ctx.identity) {
    throw new ApiError("UNAUTHENTICATED", "Sign in is required.", 401);
  }
  return ctx.identity;
}

/** Create or refresh the user row for the current identity. Returns the user id. */
export async function upsertCurrentUser(ctx: ServerCtx) {
  const identity = await requireIdentity(ctx);
  const now = Date.now();
  const existing = (await ctx.db.select().from(users).where(eq(users.clerkUserId, identity.subject)).limit(1))[0];
  if (existing) {
    await ctx.db
      .update(users)
      .set({ name: identity.name, email: identity.email ?? existing.email, updatedAt: now })
      .where(eq(users.id, existing.id));
    return existing.id;
  }
  const id = newId();
  await ctx.db.insert(users).values({
    id,
    clerkUserId: identity.subject,
    name: identity.name,
    email: identity.email ?? "",
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function requireUser(ctx: ServerCtx): Promise<UserRow> {
  const identity = await requireIdentity(ctx);
  const user = (await ctx.db.select().from(users).where(eq(users.clerkUserId, identity.subject)).limit(1))[0];
  if (!user) {
    throw new ApiError("USER_NOT_SYNCED", "User profile has not been synced.", 401);
  }
  return user;
}

export async function requireMembership(
  ctx: ServerCtx,
  organizationId: string,
  permission?: Permission,
): Promise<{ user: UserRow; membership: MembershipRow }> {
  const user = await requireUser(ctx);
  const membership = (
    await ctx.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.organizationId, organizationId), eq(memberships.userId, user.id)))
      .limit(1)
  )[0];

  if (!membership || membership.status !== "active") {
    throw new ApiError("FORBIDDEN", "Active organization membership is required.", 403);
  }
  if (permission && !hasPermission(membership.role as Role, permission)) {
    throw new ApiError("FORBIDDEN", "This role cannot perform that action.", 403);
  }
  return { user, membership };
}

export async function requireWorkspace(
  ctx: ServerCtx,
  organizationId: string,
  permission?: Permission,
): Promise<{ org: OrganizationRow; user: UserRow; membership: MembershipRow }> {
  const { user, membership } = await requireMembership(ctx, organizationId, permission);
  const org = (await ctx.db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1))[0];
  if (!org) {
    throw new ApiError("NOT_FOUND", "Organization not found.", 404);
  }
  return { org, user, membership };
}

export function workspaceSettings(org: { settings?: unknown }) {
  return (org.settings ?? {}) as Record<string, unknown>;
}
