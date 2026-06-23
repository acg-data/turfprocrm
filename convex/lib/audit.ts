import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type EntityType =
  | "organization"
  | "customer"
  | "lead"
  | "opportunity"
  | "estimate"
  | "job"
  | "visit"
  | "property"
  | "task"
  | "service_catalog_item"
  | "import";

export async function audit(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    actorUserId?: Id<"users">;
    action: string;
    entityType: EntityType;
    entityId: string;
    summary: string;
    before?: unknown;
    after?: unknown;
  },
) {
  const now = Date.now();
  await ctx.db.insert("auditEvents", {
    ...args,
    createdAt: now,
  });

  await ctx.db.insert("activities", {
    organizationId: args.organizationId,
    entityType: args.entityType,
    entityId: args.entityId,
    kind: args.action.includes("note") ? "note" : args.action.includes("visit") ? "visit" : "system",
    summary: args.summary,
    metadata: { action: args.action },
    actorUserId: args.actorUserId,
    occurredAt: now,
  });
}
