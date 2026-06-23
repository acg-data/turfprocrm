import type { Role } from "./workflow";

export const permissions = {
  manageOrganization: ["owner", "admin"],
  manageMembers: ["owner", "admin"],
  manageCatalog: ["owner", "admin", "manager"],
  managePipeline: ["owner", "admin", "manager", "sales"],
  createEstimate: ["owner", "admin", "manager", "sales"],
  approveEstimates: ["owner", "admin", "manager"],
  convertEstimate: ["owner", "admin", "manager"],
  dispatchVisits: ["owner", "admin", "manager", "dispatcher"],
  completeFieldWork: ["owner", "admin", "manager", "crew_lead", "technician"],
  addInternalNotes: ["owner", "admin", "manager", "sales", "dispatcher", "crew_lead", "technician"],
} as const;

export type Permission = keyof typeof permissions;

export function hasPermission(role: Role, permission: Permission) {
  return (permissions[permission] as readonly Role[]).includes(role);
}
