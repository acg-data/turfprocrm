# TurfPro CRM on Replit

Replit hosts the **Next.js frontend**; the backend is **Convex** (database + functions), auth is **Clerk**, billing is **Stripe**.

## Architecture

- **Backend:** Convex — schema (`convex/schema.ts`, 78 tables), authenticated org-scoped modules (`convex/workspace.ts`, `operating.ts`, `setup.ts`, `crm.ts`, …), RBAC in `convex/lib/auth.ts`, audit trail in `convex/lib/audit.ts`, crons in `convex/crons.ts`, HTTP webhooks in `convex/http.ts`.
- **Auth:** Clerk (email/password + Google OAuth for the public). Frontend providers in `src/components/app/providers.tsx`; Convex trusts the Clerk JWT via `CLERK_JWT_ISSUER_DOMAIN`.
- **Billing:** Stripe subscriptions (Starter $49 / Pro $99), webhook-driven state in the `subscriptions` table.
- **Local demo:** with no env vars (or `NEXT_PUBLIC_LOCAL_DEMO=1`) the app renders an in-memory demo workspace — this is what e2e tests use. Demo sign-in at `/signin`: any email + password `turfpro2026` (see `src/lib/demo-auth.ts`).

## Required secrets (Replit Secrets pane)

- `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — Clerk
- Convex-side env (set in the Convex dashboard, not Replit): `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`

## Commands

- `npm run dev` — frontend dev server (`npx convex dev` separately for backend development)
- `npm run build && npm run start` — production frontend
- `npx vitest run` — unit + convex-test suites
- `npx playwright test` — e2e (uses the local demo mode)

## Conventions

- New backend functions live in `convex/` modules and must use `requireMembership`/`requireWorkspace` from `convex/lib/auth.ts` — never ship an unauthenticated function.
- Permissions matrix: `convex/lib/auth.ts`, mirrored in `src/domain/permissions.ts` — keep in sync.
- Money is integer cents; timestamps are epoch ms numbers.
- Strategy & roadmap: `docs/master-roadmap.md` (630-capability catalog, 13 waves) read together with `docs/beyond-parity.md` (quality bars, wave order, [EDGE] items). Product direction: **win on price and speed without sacrificing features** — flat $99 pricing, p95 interaction < 100ms, the money loop (lead→quote→sign→schedule→invoice→paid) is sacred. First engineering priority: split the monolith app component into per-view routes (W0) before adding breadth.
- Historical note: a fully-Replit stack port (Drizzle + PGlite + RPC routes) exists at commit `cf0c367` if ever needed again.
