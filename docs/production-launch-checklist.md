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

## 3. Stripe (billing — Starter $49 / Pro $99)

- [ ] Create two recurring monthly Products/Prices: Starter $49, Pro $99 → copy price IDs → Convex env `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`.
- [ ] Developers → Webhooks → add endpoint `https://<convex-prod>.convex.site/webhooks/stripe`, events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`; copy signing secret → `STRIPE_WEBHOOK_SECRET`.
- [ ] Settings → Billing → Customer portal: enable, allow plan switching between the two prices.
- [ ] API keys → secret key → Convex env `STRIPE_SECRET_KEY`.
- [ ] Test in **test mode** first with card `4242 4242 4242 4242` (see verification below).

## 4. Resend (email)

- [ ] Add and verify your sending domain (DKIM/SPF records).
- [ ] API key → Convex env `RESEND_API_KEY`; set `EMAIL_FROM` to the verified domain.

## 5. Frontend hosting (Replit)

- [ ] Secrets: `NEXT_PUBLIC_CONVEX_URL` (prod deployment URL), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
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
