import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;
type Role = "owner" | "admin" | "manager" | "sales" | "dispatcher" | "crew_lead" | "technician";

export const permissionRoles = {
  manageOrganization: ["owner", "admin"],
  manageMembers: ["owner", "admin"],
  manageCatalog: ["owner", "admin", "manager"],
  manageFinance: ["owner", "admin", "manager"],
  managePipeline: ["owner", "admin", "manager", "sales"],
  createEstimate: ["owner", "admin", "manager", "sales"],
  approveEstimates: ["owner", "admin", "manager"],
  convertEstimate: ["owner", "admin", "manager"],
  dispatchVisits: ["owner", "admin", "manager", "dispatcher"],
  completeFieldWork: ["owner", "admin", "manager", "crew_lead", "technician"],
  addInternalNotes: ["owner", "admin", "manager", "sales", "dispatcher", "crew_lead", "technician"],
} as const;

export type Permission = keyof typeof permissionRoles;

export function assertOrg(value: { organizationId: Id<"organizations"> }, organizationId: Id<"organizations">) {
  if (value.organizationId !== organizationId) {
    throw new ConvexError({ code: "TENANT_MISMATCH", message: "Record does not belong to this organization." });
  }
}

export async function requireUser(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in is required." });
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError({ code: "USER_NOT_SYNCED", message: "User profile has not been synced." });
  }

  return { identity, user };
}

export async function requireMembership(
  ctx: Ctx,
  organizationId: Id<"organizations">,
  permission?: Permission,
) {
  const { user } = await requireUser(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_org_user", (q) => q.eq("organizationId", organizationId).eq("userId", user._id))
    .unique();

  if (!membership || membership.status !== "active") {
    throw new ConvexError({ code: "FORBIDDEN", message: "Active organization membership is required." });
  }

  if (permission && !(permissionRoles[permission] as readonly Role[]).includes(membership.role)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "This role cannot perform that action." });
  }

  return { user, membership };
}
