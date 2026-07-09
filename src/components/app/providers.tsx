"use client";

import type { ReactNode } from "react";

/**
 * Fully-Replit stack: identity comes from Replit Auth headers server-side and
 * data flows through /api/rpc, so no client providers are required. Kept as a
 * seam for future cross-cutting providers (theme, toasts, query cache).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
