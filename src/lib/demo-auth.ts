"use client";

/**
 * Local demo authentication — used ONLY when the live stack (Convex + Clerk)
 * is not configured, so the in-memory demo can be explored as a named,
 * "signed-in" user. This is not real security: there is no backend to protect
 * locally, the credential is a shared demo password, and the identity lives in
 * localStorage. In production (Clerk configured) this path is never reached.
 */

const KEY = "turfpro.demoUser";

/** Shared demo password. Any email + this password signs into the demo. */
export const DEMO_PASSWORD = "turfpro2026";

export type DemoUser = { name: string; email: string };

export function nameFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (normalized === "justin@aryocg.com") return "Justin Abrams";
  const local = normalized.split("@")[0]?.replace(/[._-]+/g, " ") ?? "";
  const titled = local
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return titled || "Demo Owner";
}

export function getDemoUser(): DemoUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DemoUser) : null;
  } catch {
    return null;
  }
}

export function setDemoUser(user: DemoUser): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function clearDemoUser(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
