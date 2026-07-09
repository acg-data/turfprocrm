import type { ServerCtx } from "./context";
import * as workspaceModule from "./modules/workspace";
import * as operatingModule from "./modules/operating";
import * as setupModule from "./modules/setup";
import * as specsModule from "./modules/specs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (ctx: ServerCtx, args: any) => Promise<unknown>;

export const registry: Record<string, Handler> = {
  "workspace.getWorkspace": workspaceModule.getWorkspace,
  "workspace.seedSampleData": workspaceModule.seedSampleData,
  "workspace.createLead": workspaceModule.createLead,
  "workspace.advanceOpportunity": workspaceModule.advanceOpportunity,
  "workspace.assignVisit": workspaceModule.assignVisit,
  "workspace.completeChecklistItem": workspaceModule.completeChecklistItem,
  "workspace.submitVisit": workspaceModule.submitVisit,
  "workspace.addTask": workspaceModule.addTask,
  "workspace.addActivity": workspaceModule.addActivity,
  "workspace.createCrew": workspaceModule.createCrew,
  "workspace.toggleServiceCatalogItem": workspaceModule.toggleServiceCatalogItem,
  "operating.getOperatingDepth": operatingModule.getOperatingDepth,
  "operating.seedOperatingDepth": operatingModule.seedOperatingDepth,
  "operating.updateLead": operatingModule.updateLead,
  "operating.bulkUpdateLeads": operatingModule.bulkUpdateLeads,
  "operating.updateMemberRole": operatingModule.updateMemberRole,
  "operating.upsertLaborRate": operatingModule.upsertLaborRate,
  "operating.upsertVendorCatalogItem": operatingModule.upsertVendorCatalogItem,
  "operating.addTimesheetEntry": operatingModule.addTimesheetEntry,
  "operating.recordCustomerPayment": operatingModule.recordCustomerPayment,
  "operating.recalculateJobCosts": operatingModule.recalculateJobCosts,
  "operating.refreshCostIntelligence": operatingModule.refreshCostIntelligence,
  "setup.syncCurrentUser": (ctx) => setupModule.syncCurrentUser(ctx),
  "setup.listMyOrganizations": (ctx) => setupModule.listMyOrganizations(ctx),
  "setup.createOrganization": setupModule.createOrganization,
  "specs.getBackendBlueprint": () => specsModule.getBackendBlueprint(),
};
