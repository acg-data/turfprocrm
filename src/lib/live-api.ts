"use client";

/**
 * Replit-stack replacement for the convex/react hooks. Queries fetch through
 * /api/rpc/<module.fn>; any successful mutation invalidates every mounted
 * query so the UI re-syncs (polling stand-in for Convex reactivity).
 */
import { useCallback, useEffect, useState } from "react";

export const api = {
  workspace: {
    getWorkspace: "workspace.getWorkspace",
    seedSampleData: "workspace.seedSampleData",
    createLead: "workspace.createLead",
    advanceOpportunity: "workspace.advanceOpportunity",
    assignVisit: "workspace.assignVisit",
    completeChecklistItem: "workspace.completeChecklistItem",
    submitVisit: "workspace.submitVisit",
    addTask: "workspace.addTask",
    addActivity: "workspace.addActivity",
    createCrew: "workspace.createCrew",
    toggleServiceCatalogItem: "workspace.toggleServiceCatalogItem",
  },
  operating: {
    getOperatingDepth: "operating.getOperatingDepth",
    seedOperatingDepth: "operating.seedOperatingDepth",
    updateLead: "operating.updateLead",
    bulkUpdateLeads: "operating.bulkUpdateLeads",
    updateMemberRole: "operating.updateMemberRole",
    upsertLaborRate: "operating.upsertLaborRate",
    upsertVendorCatalogItem: "operating.upsertVendorCatalogItem",
    addTimesheetEntry: "operating.addTimesheetEntry",
    recordCustomerPayment: "operating.recordCustomerPayment",
    recalculateJobCosts: "operating.recalculateJobCosts",
    refreshCostIntelligence: "operating.refreshCostIntelligence",
  },
  setup: {
    syncCurrentUser: "setup.syncCurrentUser",
    listMyOrganizations: "setup.listMyOrganizations",
    createOrganization: "setup.createOrganization",
  },
  specs: {
    getBackendBlueprint: "specs.getBackendBlueprint",
  },
} as const;

export type RpcArgs = Record<string, unknown>;

export class RpcError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "RpcError";
  }
}

export async function rpc(fn: string, args: RpcArgs): Promise<unknown> {
  const response = await fetch(`/api/rpc/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });
  const payload = (await response.json()) as {
    ok: boolean;
    result?: unknown;
    error?: { code: string; message: string };
  };
  if (!payload.ok) {
    throw new RpcError(payload.error?.code ?? "UNKNOWN", payload.error?.message ?? "Request failed.");
  }
  return payload.result;
}

const invalidationListeners = new Set<() => void>();

export function invalidateQueries() {
  for (const listener of Array.from(invalidationListeners)) listener();
}

export function useQuery(fn: string, args: RpcArgs | "skip"): unknown {
  const [data, setData] = useState<unknown>(undefined);
  const [tick, setTick] = useState(0);
  const argsKey = args === "skip" ? "skip" : JSON.stringify(args);

  useEffect(() => {
    const listener = () => setTick((value) => value + 1);
    invalidationListeners.add(listener);
    return () => {
      invalidationListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (argsKey === "skip") {
      setData(undefined);
      return;
    }
    let cancelled = false;
    rpc(fn, JSON.parse(argsKey) as RpcArgs)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => {
        if (!cancelled) console.error(`[query:${fn}]`, error);
      });
    return () => {
      cancelled = true;
    };
  }, [fn, argsKey, tick]);

  return data;
}

export function useMutation(fn: string) {
  return useCallback(
    async (args: RpcArgs) => {
      const result = await rpc(fn, args);
      invalidateQueries();
      return result;
    },
    [fn],
  );
}

export function useAuth() {
  const [state, setState] = useState<{ isLoading: boolean; isAuthenticated: boolean; name: string | null }>({
    isLoading: true,
    isAuthenticated: false,
    name: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload: { authenticated?: boolean; name?: string | null }) => {
        if (!cancelled) {
          setState({ isLoading: false, isAuthenticated: Boolean(payload.authenticated), name: payload.name ?? null });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ isLoading: false, isAuthenticated: false, name: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** Opens the Replit auth popup; Replit posts "auth_complete" back when done. */
export function loginWithReplit(onComplete: () => void) {
  const width = 360;
  const height = 550;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  const authWindow = window.open(
    `https://replit.com/auth_with_repl_site?domain=${location.host}`,
    "_blank",
    `modal=yes,toolbar=no,location=no,status=no,width=${width},height=${height},left=${left},top=${top}`,
  );
  function onMessage(event: MessageEvent) {
    if (event.data !== "auth_complete") return;
    window.removeEventListener("message", onMessage);
    authWindow?.close();
    onComplete();
  }
  window.addEventListener("message", onMessage);
}
