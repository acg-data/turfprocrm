# Prime Time Top 100

This repo now carries the top-100 SaaS hardening backlog as product data in `src/data/prime-time-roadmap.ts` and renders it in the app under `/app` -> `Prime Time`.

## Purpose

The board is the operating checklist for turning the current green-industry CRM MVP into a sellable SaaS. It is intentionally broader than feature work: it covers product workflow, lead ops, estimating, dispatch, field, finance, admin, data, integrations, security, reliability, go-to-market, onboarding, billing, and support.

## How To Use It

- `done`: already represented in the app, Convex schema/functions, or deployment setup.
- `in_progress`: partially built and ready for the next implementation pass.
- `next`: not started, but does not require a vendor account or secret to design/build.
- `blocked`: needs an external account, credential, business decision, or vendor setup before code can finish.

The launch score in the UI is weighted:

- `done` = full credit
- `in_progress` = partial credit
- `next` and `blocked` = no launch credit yet

## Current P0 Blockers

- Stripe checkout and billing operations need Stripe products, prices, webhook signing secret, and production checkout flow.
- Clerk invite flow needs organization/member invitation configuration.
- Error monitoring needs a production service selection and DSN.
- Uptime checks need a monitoring target and alert destination.
- Backup and restore runbook needs a documented Convex restore/export/rollback procedure.

## Batch Strategy

Work in small checkpoints:

1. Pick the highest-impact open P0/P1 items.
2. Implement the code/doc/test slice.
3. Run `npm run typecheck`, `npm run lint`, `npm run test:once`, and `npm run build`.
4. Deploy Convex dev when backend demo functions changed.
5. Deploy Cloudflare from Linux/WSL Node for OpenNext.
6. Commit and push.

## External Setup Still Needed

- Clerk production app keys and issuer.
- Stripe products/prices/webhook secret.
- Error monitoring service credentials.
- Email provider credentials for transactional email.
- Production Convex URL and Cloudflare env alignment before real customer launch.
