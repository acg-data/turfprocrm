# Production Launch Checklist — first 500 paying customers

Everything code-side is wired; these are the dashboard/env steps to flip production on. Work top to bottom.

## 1. Convex (backend)

- [ ] `npx convex deploy` to create/update the **production** deployment (or promote from the dashboard).
- [ ] Convex dashboard → Settings → Environment Variables (production):
  - `CLERK_JWT_ISSUER_DOMAIN` — from Clerk (step 2)
  - `CLERK_WEBHOOK_SECRET` — from Clerk webhook (step 2)
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO` — from Stripe (step 3)
  - `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `Turf Pro CRM <hello@yourdomain.com>`) — from Resend (step 4)
  - `APP_BASE_URL` — the public site URL (e.g. `https://app.turfpro.example`)
- [ ] Dashboard → Backups: enable automatic daily backups.

## 2. Clerk (auth — public email/password + Google)

- [ ] Create a **production** Clerk application; enable Email+Password and Google OAuth (Apple/Microsoft optional).
- [ ] JWT Templates → new template named exactly `convex` (default claims are fine).
- [ ] Copy the **Issuer** domain of that template → Convex env `CLERK_JWT_ISSUER_DOMAIN`.
- [ ] Webhooks → add endpoint `https://<convex-prod>.convex.site/webhooks/clerk`, subscribe to `user.created`, `user.updated`, `user.deleted`; copy the signing secret → Convex env `CLERK_WEBHOOK_SECRET`.
- [ ] Frontend host env (Replit Secrets): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

## 3. Stripe (subscriptions + customer invoice payments)

- [ ] Create one recurring monthly Product/Price: All-In Pro $99 → copy the price ID → Convex env `STRIPE_PRICE_PRO`. `STRIPE_PRICE_STARTER` is only needed if a legacy Starter workspace must be migrated.
- [ ] Developers → Webhooks → add endpoint `https://<convex-prod>.convex.site/webhooks/stripe`, events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`; copy signing secret → `STRIPE_WEBHOOK_SECRET`. The same signed endpoint posts portal invoice payments idempotently.
- [ ] Settings → Billing → Customer portal: enable subscription cancellation, payment-method updates, and invoice history.
- [ ] API keys → secret key → Convex env `STRIPE_SECRET_KEY`.
- [ ] Test in **test mode** first with card `4242 4242 4242 4242` (see verification below).

## 4. Resend (email)

- [ ] Add and verify your sending domain (DKIM/SPF records).
- [ ] API key → Convex env `RESEND_API_KEY`; set `EMAIL_FROM` to the verified domain.

## 5. Frontend hosting (Replit)

- [ ] Secrets: `NEXT_PUBLIC_CONVEX_URL` (prod deployment URL), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_APP_URL` (canonical public origin).
- [ ] Deploy (autoscale target in `.replit`); point your domain at it; set `APP_BASE_URL` in Convex to match.

## 6. Monitoring

- [ ] Point UptimeRobot/BetterStack at `https://<site>/api/health` (alerts on non-200).
- [ ] Sentry DSN → `NEXT_PUBLIC_SENTRY_DSN` (frontend) once Sentry is wired.

## Verification (test mode, before real customers)

1. Fresh browser → `/signin` → create account with Google → create "Pro" workspace → Stripe test checkout completes → app opens, badge shows plan.
2. Admin → invite a teammate (second email) → invite email arrives → accept flow joins with the right role.
3. Stripe dashboard → cancel the test subscription → app blocks writes with the billing message; reads still work.
4. `POST` a replayed Stripe webhook with a bad signature → 400; Clerk webhook with bad svix signature → 400.
5. `/api/health` returns `{ status: "ok", convex: "ok" }`.

## 7. Trial and activation acceptance

- [ ] `/signin?plan=pro` creates exactly one tenant, owner membership, subscription shell, service defaults, workflow statuses, flags, integrations, audit event, and onboarding checklist even if the user refreshes.
- [ ] Stripe Checkout returns to `/onboarding?organizationId=...`; canceled Checkout preserves the workspace and trial.
- [ ] The activation center saves company territory, selected service templates, teammates, CSV mapping review, and checklist completion.
- [ ] Trial reminders arrive 3 days and 1 day before expiration. At expiration, writes stop immediately while reads and export remain available during the documented 7-day grace period.
- [ ] Reactivating through Stripe restores writes without re-provisioning or losing data. Trial data is retained for 90 days unless the customer requests earlier deletion.
- [ ] Test timezone boundaries and daylight-saving changes for activation email timestamps, schedules, and trial expiration.

## 8. Customer portal acceptance

- [ ] Admin → Customer Portal sends a single-use, email-matched invitation that expires after seven days; resend, revoke, expired, already-used, and wrong-email paths are verified.
- [ ] A portal identity can only read its own customer, properties, estimates, visits, customer-visible notes, documents, invoices, payments, messages, requests, and preferences.
- [ ] Confirm internal notes, lead grade, employee data, costs, margin, private files, internal route notes, and other tenants never appear in portal network responses.
- [ ] Estimate approve, decline, and request-change paths create auditable activity and notify the office workflow.
- [ ] Stripe test payment for a portal invoice returns to `/portal?section=invoices&payment=success`, posts exactly once on webhook retries, updates the balance, and creates a receipt message.
- [ ] Verify customer portal at 375px, 768px, and desktop widths with keyboard-only navigation, visible focus, screen-reader labels, and reduced motion.
- [ ] Test customer states: invited, active, locked, revoked, no visible records, multiple properties, multiple service companies, past-due invoice, paid account, and expired estimate.
- [ ] Configure transactional templates for portal invitation, estimate, schedule/reschedule, on-the-way, service completion, invoice, receipt, past due, message, and payment failure.
