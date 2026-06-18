# Landscape CRM

Production MVP scaffold for a multi-tenant landscaping and pest-control operating system. It combines CRM, HubSpot-style activity tracking, estimating, dispatch, project management, and a mobile field PWA.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Convex primary operational database and server functions
- Clerk auth with organization membership mapped into Convex
- `convex-test`, Vitest, and Playwright test scaffolding
- Google Maps deep links only; marketing integrations are intentionally out of scope for v1

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app is currently linked to the Convex dev deployment:

- Dashboard: `https://dashboard.convex.dev/t/justin-abrams/turfpro-crm/dutiful-salmon-300`
- Client URL: `https://dutiful-salmon-300.convex.cloud`
- Site URL: `https://dutiful-salmon-300.convex.site`

The UI runs with seeded local demo data if Convex is not configured. With `NEXT_PUBLIC_CONVEX_URL` present, it loads the live `Greenline Turf & Pest` demo workspace and writes demo interactions through Convex mutations. To keep Convex and Next running locally:

```bash
npm run dev:convex
npm run dev
```

`npx convex dev` regenerates `convex/_generated/*` and pushes schema/function changes. The dev deployment currently has a placeholder `CLERK_JWT_ISSUER_DOMAIN` so the backend can deploy before Clerk is configured; replace it with the real Clerk issuer before production auth testing.

## Account Sign-In, Signup, And Plans

The public auth route is `/signin`. It handles returning sign-in, new account creation, free/paid plan selection, and Convex workspace provisioning from one page. `/signup` redirects to `/signin` for compatibility with older links.

Required auth variables:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/signin
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signin
```

The free plan is first-class in Convex. New free workspaces get owner membership, subscription state, default lead statuses, saved views, service catalog, crew defaults, feature flags, onboarding checklist, integrations, and an audit event. `crm.createLead` enforces the free cap at the backend: free workspaces can create 10 contacts, and the 11th contact/lead is rejected with `PLAN_LIMIT_REACHED`. Paid `pro` workspaces do not use the free contact cap.

## App Areas

- Dashboard: pipeline value, visits, open estimates, overdue work, and recent activity
- CRM: customers, properties, lead creation, owner context, and timelines
- Pipeline: opportunity stages with guarded transitions
- Dispatch: schedule board, crew assignment, route order, and Maps links
- Jobs: job workspace, visits, and tasks
- Field: mobile job list, checklist completion, issue flags, and visit submission
- Admin: members, crews, service catalog, materials, and settings foundation
- Specs: live backend blueprint, modeled table groups, Netlify dashboard parity, external interface boundaries, and SaaS readiness

## Convex Interfaces

Implemented public functions:

- Queries: `dashboard.getOverview`, `crm.listCustomers`, `crm.getCustomerProfile`, `pipeline.listOpportunities`, `dispatch.getSchedule`, `field.getMyVisits`, `jobs.getJobWorkspace`, `admin.getSettings`
- Mutations: `crm.createLead`, `crm.updateCustomer`, `pipeline.advanceOpportunity`, `estimates.createEstimate`, `estimates.convertToJob`, `dispatch.assignVisit`, `field.completeChecklistItem`, `field.submitVisit`, `jobs.addTask`, `activities.addNote`
- Setup helpers: `setup.syncCurrentUser`, `setup.listMyOrganizations`, `setup.createOrganization`
- Live demo helpers: `demo.bootstrapWorkspace`, `demo.getWorkspace`, `demo.createLead`, `demo.advanceOpportunity`, `demo.assignVisit`, `demo.completeChecklistItem`, `demo.submitVisit`, `demo.addTask`, `demo.createCrew`, `demo.toggleServiceCatalogItem`
- Backend spec query: `specs.getBackendBlueprint`

All organization-scoped functions call membership checks before data access.

## Backend Surface

The Convex schema now models identity/tenancy, CRM, lead quality, spam review, lead saved views, intake submissions, estimating, price books, pricing rules, jobs, phases, visits, assignments, route plans, field photos, materials, equipment, governed tag definitions, entity tags, customer lifecycle snapshots, churn/LTV analytics, P&L snapshots, imports, exports, analytics snapshots, automation, audit events, subscriptions, invoices, onboarding, and account health.

The Netlify reference dashboard concepts are represented as backend primitives rather than one-off UI state: lead validation, grade/status/program/source filters, spam signals, hidden/quality review queues, city normalization, duplicate review, governed segmentation tags, churn risk, LTV, P&L snapshots, analytics readiness, pricing calculator sessions, help/runbook specs, and changelog/audit history.

## Verification

```bash
npm run lint
npm run typecheck
npm run test:once
npm run build
```

Playwright smoke tests are available with:

```bash
npm run test:e2e
```

## Cloudflare Deployment

This app is configured for Cloudflare Workers through the OpenNext adapter. Use `npm run cf:build` to package the Next.js app for Cloudflare, `npm run cf:preview` to test the Worker runtime locally, `npm run deploy` for Cloudflare frontend deploys, and `npm run deploy:full` for the full Convex-plus-Cloudflare production deploy.

The deployment checklist and required dashboard variables are in `docs/cloudflare-deployment.md`.
