import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";
import { assertEntityInOrganization } from "./lib/entities";

const entityType = v.union(
  v.literal("customer"),
  v.literal("lead"),
  v.literal("opportunity"),
  v.literal("estimate"),
  v.literal("job"),
  v.literal("visit"),
  v.literal("property"),
);

export const addNote = mutation({
  args: {
    organizationId: v.id("organizations"),
    entityType,
    entityId: v.string(),
    body: v.string(),
    visibility: v.optional(v.union(v.literal("internal"), v.literal("customer"))),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "addInternalNotes");
    await assertEntityInOrganization(ctx, args.organizationId, args.entityType, args.entityId);
    const now = Date.now();
    const noteId = await ctx.db.insert("notes", {
      organizationId: args.organizationId,
      entityType: args.entityType,
      entityId: args.entityId,
      body: args.body,
      visibility: args.visibility ?? "internal",
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "note.create",
      entityType: args.entityType,
      entityId: args.entityId,
      summary: args.body,
      after: { noteId },
    });

    return noteId;
  },
});
