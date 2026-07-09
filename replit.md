# TurfPro CRM on Replit

Fully-Replit stack — no external SaaS services required.

## Architecture

- **Database:** Replit PostgreSQL via `DATABASE_URL` (auto-provisioned by the postgresql module). Drizzle ORM; schema in `src/server/db/schema.ts`; SQL migrations in `drizzle/` run automatically on first DB connection (`src/server/db/client.ts`). Without `DATABASE_URL` the app falls back to an embedded PGlite database at `.data/pglite` — this is what local dev and tests use.
- **Auth:** Replit Auth. The Replit proxy sets `x-replit-user-id` / `x-replit-user-name` headers after the user completes the popup login (`loginWithReplit()` in `src/lib/live-api.ts`). Outside Replit in non-production, a `dev:local` identity is used automatically (`src/server/auth.ts`).
- **API:** All data flows through `POST /api/rpc/<module.fn>` (`src/app/api/rpc/[fn]/route.ts`), dispatching to plain server modules in `src/server/modules/` (workspace, operating, setup, specs). Every read/write is org-scoped and role-checked in `src/server/guards.ts`.
- **Legacy:** The `convex/` directory is the previous backend, kept dormant for reference. Do not wire new features to it.

## Commands

- `npm run dev` — dev server
- `npm run build && npm run start` — production
- `npx vitest run` — unit + backend tests (backend tests run against in-memory PGlite)
- `npx drizzle-kit generate` — regenerate SQL after editing `src/server/db/schema.ts` (never edit `drizzle/*.sql` by hand)

## Conventions

- New backend functions: add to a module in `src/server/modules/`, register in `src/server/registry.ts`, call from the client via `api.*` names in `src/lib/live-api.ts`.
- Permissions: `src/domain/permissions.ts` (mirrored server-side); check with `requireWorkspace(ctx, organizationId, "<permission>")`.
- Money is integer cents; timestamps are epoch ms numbers.
- The CRM capability roadmap lives in `docs/crm-parity-plan.md`.
