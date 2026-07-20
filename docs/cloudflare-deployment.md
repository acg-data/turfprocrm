# Cloudflare Deployment

This app should deploy to Cloudflare Workers with the OpenNext adapter. Convex remains the source-of-truth backend and database.

## What Changes On Cloudflare

- Cloudflare runs the Next.js frontend as a Worker.
- Convex still runs the database, realtime queries, mutations, cron jobs, and backend functions.
- Clerk still handles sign-in and account creation.
- Environment variables must be added in Cloudflare for both build time and runtime.

## One-Time Accounts You Need

- Cloudflare account with Workers access.
- Clerk application for production auth.
- Convex production deployment or deploy key for this project.
- Paddle Billing product, monthly price, and webhook endpoint for the paid beta.
- Optional Stripe product, monthly price, and webhook endpoint if you keep Stripe as a fallback processor.
- GitHub repo connected to Cloudflare: `acg-data/turfprocrm`.

## Cloudflare Dashboard Setup

1. Go to Cloudflare Dashboard.
2. Open `Workers & Pages`.
3. Create a Worker from the GitHub repository `acg-data/turfprocrm`.
4. Set the project name to `landscape-crm`.
5. Use Node.js `20` or newer for the build environment.
6. Set the install command to `npm ci`.
7. Set the deploy command to `npm run deploy`.
8. Set the root directory to `/`.
9. Add the build variables and secrets below.

## Cloudflare Build Variables And Secrets

Add these in Cloudflare under the Worker project settings. Use secrets for private values.

| Name | Type | Where To Get It |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Variable | Convex dashboard, production deployment URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Variable | Convex dashboard, production site URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Variable | Clerk dashboard, API keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Variable | Set to `/signin` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Variable | Set to `/signin` |
| `NEXT_PUBLIC_APP_URL` | Variable | Production app URL, for Stripe return URLs |
| `CLERK_SECRET_KEY` | Secret | Clerk dashboard, API keys |
| `CLERK_JWT_ISSUER_DOMAIN` | Variable | Clerk dashboard, Frontend API URL |
| `CONVEX_DEPLOY_KEY` | Secret | Convex dashboard, project/deployment settings |
| `STRIPE_SECRET_KEY` | Secret | Stripe dashboard, Developers > API keys |
| `STRIPE_WEBHOOK_SECRET` | Secret | Stripe webhook endpoint signing secret |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Variable | Stripe monthly recurring price for the $99/mo plan |
| `PADDLE_API_KEY` | Secret | Paddle, Developer tools > Authentication |
| `PADDLE_ENVIRONMENT` | Variable | `sandbox` for test mode, `production` for live mode |
| `PADDLE_WEBHOOK_SECRET_KEY` | Secret | Paddle notification destination endpoint secret |
| `PADDLE_PRO_MONTHLY_PRICE_ID` | Variable | Paddle recurring monthly price for the $99/mo plan |

Do not put real secret values in GitHub, docs, screenshots, or chat.

Rotate any development secrets that were pasted into chat before a production deploy.

## Clerk Setup

In Clerk, add the production Cloudflare URL and custom domain to the allowed redirect/origin settings. The auth routes are:

- Sign in: `/signin`
- Sign up: `/signin`
- After sign in: `/app`
- After sign up: `/signin`

## Convex Setup

In Convex, set `CLERK_JWT_ISSUER_DOMAIN` on the production deployment so Convex can validate Clerk tokens.

Use separate Convex deployments for dev, staging, and production. Production billing webhooks call Convex with the provider webhook secret, so set `PADDLE_WEBHOOK_SECRET_KEY` and, if enabled, `STRIPE_WEBHOOK_SECRET` in both the production Convex environment and Cloudflare Worker environment.

## Paddle Setup

1. Create a Paddle Billing product for Turf Pro CRM.
2. Create one recurring monthly price at `$99/mo`.
3. Add the price ID to `PADDLE_PRO_MONTHLY_PRICE_ID`.
4. Create an API key with transaction, customer portal session, and read permissions.
5. Add a notification destination for `/api/billing/paddle/webhook`.
6. Subscribe the destination to subscription lifecycle and transaction events.
7. Add the endpoint secret to `PADDLE_WEBHOOK_SECRET_KEY` in both Cloudflare and Convex.

The app exposes:

- `POST /api/billing/paddle/checkout` returning `{ "url": "..." }`
- `POST /api/billing/paddle/portal` returning `{ "url": "..." }`
- `POST /api/billing/paddle/webhook` returning `{ "received": true }`

Checkout and portal calls require `Authorization: Bearer <Convex JWT>`. The client obtains that Clerk/Convex token before calling the route, then the route uses Convex membership checks as the tenant authority. Do not add a Next proxy/middleware dependency for billing auth on Cloudflare; OpenNext packages the route handlers, while Next 16 Proxy currently defaults to Node runtime.

## Stripe Setup

Stripe is retained as a fallback provider. Paddle is the default signup/upgrade route.

1. Create a Stripe product for Turf Pro CRM.
2. Create one recurring monthly price at `$99/mo`.
3. Add the price ID to `STRIPE_PRO_MONTHLY_PRICE_ID`.
4. Add a webhook endpoint for `/api/billing/webhook`.
5. Subscribe the webhook to checkout session, customer subscription, and invoice events.
6. Add the webhook signing secret to `STRIPE_WEBHOOK_SECRET` in both Cloudflare and Convex.

The app exposes:

- `POST /api/billing/checkout` returning `{ "url": "..." }`
- `POST /api/billing/portal` returning `{ "url": "..." }`
- `POST /api/billing/webhook` returning `{ "received": true }`

The Cloudflare Git deploy command is:

```bash
npm run deploy
```

That command deploys the Cloudflare Worker frontend only. Use this for normal Cloudflare dashboard deploys so the site can publish even when Convex production deploy keys have not been added yet.

The full manual deploy command is:

```bash
npm run deploy:full
```

That runs:

1. `convex deploy --cmd "npm run cf:build"`
2. `opennextjs-cloudflare deploy -- --keep-vars`

That deploys Convex backend functions first, builds the frontend against the production Convex URL, and then deploys the Cloudflare Worker while preserving dashboard-managed environment variables.

## Local Commands

```bash
npm run cf:build
npm run cf:preview
npm run cf:deploy
npm run deploy
npm run deploy:full
```

Use `npm run cf:preview` to test the Cloudflare Worker runtime locally before a production deploy.

## Paid Beta Launch Gate

Run these before accepting paying clients:

```bash
npm run verify
npm run cf:preview
```

Then run a Paddle webhook simulator test against the local preview and the deployed Cloudflare endpoint. Confirm Clerk production sign-in creates a Convex user, `setup.createOrganization` creates the owner membership, and a Paddle checkout completion updates `subscriptions`, `invoices`, and `organizations.subscriptionStatus`.

## Current Status

The repo has the Cloudflare deployment files in place:

- `wrangler.jsonc`
- `open-next.config.ts`
- OpenNext and Wrangler package dependencies
- Cloudflare deployment scripts in `package.json`
