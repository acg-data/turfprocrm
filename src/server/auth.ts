/**
 * Replit Auth: when a user signs in via the Replit auth flow, Replit's proxy
 * attaches identity headers to every request. Locally (no Replit proxy) we
 * fall back to a deterministic dev identity so the app remains usable.
 */
export type AuthIdentity = {
  subject: string;
  name: string;
  email?: string;
};

export function identityFromHeaders(headers: Headers): AuthIdentity | null {
  const replitUserId = headers.get("x-replit-user-id");
  const replitUserName = headers.get("x-replit-user-name");
  if (replitUserId) {
    return {
      subject: `replit:${replitUserId}`,
      name: replitUserName ?? `Replit user ${replitUserId}`,
      email: undefined,
    };
  }

  // Local development fallback: no Replit proxy in front of us.
  if (!process.env.REPL_ID && process.env.NODE_ENV !== "production") {
    return { subject: "dev:local", name: "Local Dev", email: "dev@example.com" };
  }

  return null;
}
