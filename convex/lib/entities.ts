import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { assertOrg } from "./auth";

type Ctx = MutationCtx | QueryCtx;

export type LinkableEntityType = "customer" | "lead" | "opportunity" | "estimate" | "job" | "visit" | "property";

export async function assertEntityInOrganization(
  ctx: Ctx,
  organizationId: Id<"organizations">,
  entityType: LinkableEntityType,
  entityId: string,
) {
  const record = await (async () => {
    switch (entityType) {
      case "customer":
        return await ctx.db.get(entityId as Id<"customers">);
      case "lead":
        return await ctx.db.get(entityId as Id<"leads">);
      case "opportunity":
        return await ctx.db.get(entityId as Id<"opportunities">);
      case "estimate":
        return await ctx.db.get(entityId as Id<"estimates">);
      case "job":
        return await ctx.db.get(entityId as Id<"jobs">);
      case "visit":
        return await ctx.db.get(entityId as Id<"jobVisits">);
      case "property":
        return await ctx.db.get(entityId as Id<"properties">);
    }
  })();

  if (!record) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Linked entity not found." });
  }

  assertOrg(record, organizationId);
}
