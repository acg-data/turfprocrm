import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in is required." });
  }
  return identity;
}

export async function upsertCurrentUser(ctx: MutationCtx) {
  const identity = await requireIdentity(ctx);
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
