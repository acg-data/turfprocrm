import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

type ClerkUserPayload = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  image_url?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: Array<{ id: string; email_address: string }>;
};

/** Applies Clerk webhook events so the users table mirrors Clerk without waiting for a login. */
export const handleClerkEvent = internalMutation({
  args: { type: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    const data = args.data as ClerkUserPayload;
    const clerkUserId = data.id;
    if (!clerkUserId) return;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    const now = Date.now();

    if (args.type === "user.deleted") {
      if (!existing) return;
      const rows = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", existing._id))
        .collect();
      for (const membership of rows) {
        await ctx.db.patch(membership._id, { status: "disabled", updatedAt: now });
      }
      return;
    }

    if (args.type !== "user.created" && args.type !== "user.updated") return;

    const primaryEmail =
      data.email_addresses?.find((entry) => entry.id === data.primary_email_address_id) ?? data.email_addresses?.[0];
    const email = primaryEmail?.email_address ?? existing?.email ?? `${clerkUserId}@unknown.local`;
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || email;

    if (existing) {
      await ctx.db.patch(existing._id, { name, email, avatarUrl: data.image_url ?? undefined, updatedAt: now });
    } else {
      await ctx.db.insert("users", {
        clerkUserId,
        name,
        email,
        avatarUrl: data.image_url ?? undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
