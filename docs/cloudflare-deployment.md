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
| `CLERK_SECRET_KEY` | Secret | Clerk dashboard, API keys |
| `CLERK_JWT_ISSUER_DOMAIN` | Variable | Clerk dashboard, Frontend API URL |
| `CONVEX_DEPLOY_KEY` | Secret | Convex dashboard, project/deployment settings |

Do not put real secret values in GitHub, docs, screenshots, or chat.

## Clerk Setup

In Clerk, add the production Cloudflare URL and custom domain to the allowed redirect/origin settings. The auth routes are:

- Sign in: `/signin`
- Sign up: `/signin`
- After sign in: `/app`
- After sign up: `/signin`

## Convex Setup

In Convex, set `CLERK_JWT_ISSUER_DOMAIN` on the production deployment so Convex can validate Clerk tokens.

The `npm run deploy` script runs:

1. `convex deploy --cmd "npm run cf:build"`
2. `opennextjs-cloudflare deploy -- --keep-vars`

That deploys Convex backend functions first, builds the frontend against the production Convex URL, and then deploys the Cloudflare Worker while preserving dashboard-managed environment variables.

## Local Commands

```bash
npm run cf:build
npm run cf:preview
npm run cf:deploy
npm run deploy
```

Use `npm run cf:preview` to test the Cloudflare Worker runtime locally before a production deploy.

## Current Status

The repo has the Cloudflare deployment files in place:

- `wrangler.jsonc`
- `open-next.config.ts`
- OpenNext and Wrangler package dependencies
- Cloudflare deployment scripts in `package.json`
