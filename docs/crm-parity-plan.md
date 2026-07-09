# TurfPro CRM → World-Class Parity Plan

**Goal:** take TurfPro from "broad demo with an enterprise-grade schema" to a CRM that stands at functional parity with Salesforce Sales Cloud / HubSpot for its market — while keeping the vertical depth (green industry field service) that those platforms can't match without a year of consulting spend.

**Benchmark set used for this analysis:**

| Platform | What we benchmark from it |
|---|---|
| Salesforce Sales Cloud | Pipeline, forecasting, permissions model, custom fields/objects, reporting, automation (Flow), AI (Einstein) |
| Salesforce Field Service | Dispatch console, service territories, mobile offline, work orders |
| HubSpot (Sales + Marketing + Service Hubs) | Email/comms layer, sequences, forms & attribution, ease-of-use bar, free-tier onboarding, Breeze AI |
| ServiceTitan | Vertical gold standard: call booking, dispatch, pricebook, financing, "the office runs on it" depth |
| Jobber / Aspire / RealGreen / FieldRoutes | Direct competitors: quoting, routing, client hub, chemical tracking compliance |

Parity ≠ cloning Salesforce's 25 years of surface area. Parity = **a buyer evaluating us against HubSpot + Jobber finds no dealbreaker gap, and finds vertical capabilities neither has.**

---

## 1. Where we actually stand (honest scorecard)

Scores: **Model** = schema/data-model completeness. **Runtime** = what a real authenticated customer could use today. 0–5.

| # | Domain | Model | Runtime | Salesforce/HubSpot bar | Verdict |
|---|---|---|---|---|---|
| 1 | Tenancy, auth, roles | 4 | 1 | Custom roles, record sharing, field-level security | RBAC exists but **the shipped UI bypasses it entirely** (demo backend) |
| 2 | Leads & lead quality | 5 | 3 | Scoring, routing, dedupe, web-to-lead | Our spam/grade/duplicate model is genuinely better than stock SFDC |
| 3 | Accounts/contacts/properties | 5 | 3 | 360 view, hierarchies | Strong; property/area model beats horizontal CRMs |
| 4 | Pipeline & deals | 3 | 2 | Multiple pipelines, custom stages, forecasting, quotas | Single hardcoded pipeline, no forecasting |
| 5 | Communications (email/SMS/calls/calendar) | 1 | 0 | 2-way email sync, templates, sequences, tracking, calling, meeting scheduler | **Biggest gap. Zero live channels.** |
| 6 | Quotes & CPQ | 4 | 2 | Quote → PDF → e-sign → order | No PDF, no e-sign, no public quote link |
| 7 | Scheduling/dispatch/routing | 4 | 2 | FSL dispatch console, optimization | Board exists; no drag-drop, no real routing/optimization |
| 8 | Field mobile & offline | 3 | 2 | Offline-first mobile app | PWA field view, online-only |
| 9 | Invoicing & payments | 4 | 1 | Payments, financing, accounting sync | Model complete; **no gateway, no QuickBooks** |
| 10 | Automation platform | 2 | 0 | Flow / HubSpot workflows | Tables exist (`any`-typed); **no engine** |
| 11 | Reporting & analytics | 3 | 2 | Report builder, dashboards, goals | Fixed dashboards only; snapshots are seeded |
| 12 | Custom fields & data platform | 2 | 1 | Custom fields/objects, validation rules, dedupe/merge | Tags only; no user-defined fields; import/export half-built |
| 13 | Customer portal | 0 | 0 | Client hub (Jobber), Experience Cloud | Nothing |
| 14 | API/webhooks/integrations | 1 | 0 | REST API, webhooks, Zapier, marketplace | **No http.ts at all.** Every integration is seeded constants |
| 15 | AI layer | 1 | 0 | Einstein/Breeze: scoring, forecasts, copilot, agents | Churn scores are seeded math, not live |
| 16 | Trust: audit/backup/monitoring/compliance | 3 | 1 | SOC2 posture, audit trail, uptime | Audit log real (in unused modules); no monitoring/backup runbook |

**Aggregate: model ~3.4/5 (excellent), runtime ~1.3/5.** The strategy writes itself: we don't have a design problem, we have an **execution-wiring problem**. The 78-table schema is roughly Salesforce-object-model-shaped already, plus vertical extras (EPA material tracking, weather application-risk, drive-time, labor/commodity cost intelligence, churn/LTV/P&L) that Salesforce charges six figures to approximate.

---

## 2. The four structural deficits — nothing else matters until these are fixed

### S1. Kill the dual backend (the demo fork)
The UI runs entirely on `api.demo.*` / `api.operating.*` — unauthenticated, single shared workspace. The authenticated, RBAC-enforced, audited, tested modules (`crm.ts`, `pipeline.ts`, `dispatch.ts`, `field.ts`, `estimates.ts`, …) are **dead code from the UI's perspective**.

- Migrate every UI read/write to the production modules; demo mode becomes a seeded org behind the same auth path (a `isDemo` org flag), not a parallel API.
- Port the good logic that only exists in `operating.ts` (bulk lead updates, timesheets, payments, cost recalc) into authenticated modules with `requireMembership` + `audit()`.
- Delete `demo.ts`/`operating.ts` write paths when migration completes. One backend, one truth.
- **Exit criteria:** every mutation reachable from the UI enforces tenant + role; convex-test coverage on each.

### S2. Break up the 5,108-line component
`landscape-os-app.tsx` is unmaintainable and blocks parallel work. Split into route-based structure: `/app/dashboard`, `/app/leads`, `/app/crm/[customerId]`, `/app/pipeline`, `/app/dispatch`, `/app/jobs/[jobId]`, `/app/field`, `/app/finance`, `/app/reports`, `/app/settings/*` — real Next.js sub-routes (deep-linkable, code-split), shared shell layout, extracted component library. This also unlocks per-URL permissions gating.

### S3. Build the HTTP layer (`convex/http.ts`)
There are zero HTTP endpoints. Webhooks and public API are the substrate for *everything* in sections 4.5–4.14 (email inbound, SMS inbound, Stripe webhooks, Clerk webhooks, form intake, Zapier). Stand up:
- `POST /webhooks/clerk` (user/org sync), `POST /webhooks/stripe` (billing), `POST /intake/forms/:formId` (web-to-lead), `POST /webhooks/email`, `POST /webhooks/sms`.
- `/api/v1/*` public REST surface (see 4.14) with per-org API keys + rate limiting.

### S4. Clear the P0 launch blockers (already on the prime-time board)
Stripe billing live, Clerk invite flow, error monitoring (Sentry), uptime checks, backup/restore runbook, CSP. A CRM sells trust; none of the feature work below is credible without these.

---

## 3. Parity strategy in one paragraph

Fix S1–S4 (Phase 0). Then build the **communications layer** first (Phase 1) because it's the single capability whose absence makes us "not a CRM" in a buyer's eyes — every Salesforce/HubSpot workflow begins and ends in email/SMS/calls. Then the **automation engine + custom fields** (Phase 2) because they multiply every other feature. Then **money** (payments, QuickBooks, e-sign quotes — Phase 3) because that's what vertical buyers actually switch for. Then **reporting/forecasting** (Phase 4), **portal + mobile offline** (Phase 5), and the **AI layer** (Phase 6) which by then has real data to feed on.

---

## 4. Domain-by-domain build specs

### 4.1 Identity, tenancy & permissions → Salesforce-grade access control
**Have:** 7 fixed roles × 9 coarse permissions; org-scoped tables; plan gating.
**Gap:** custom roles, record ownership/sharing, field-level security, invite flow, SSO.
**Build:**
- Clerk invite flow (email invites → membership `invited` → accept) — P0.
- `roleDefinitions` table: org-defined roles as permission-set documents (keep 7 built-ins as templates). Expand permission keys from 9 to ~40 granular verbs (`leads.delete`, `invoices.void`, `reports.export`, `settings.billing`…).
- Record-level access: `ownerUserId` + team visibility rule per object type (private / team / org), checked in a single `canAccessRecord()` helper.
- Field-level sensitivity tiers (e.g., hide `costCents`/margins from technicians) enforced in query projections, not client-side.
- Session/device management + 2FA via Clerk; SSO (SAML/OIDC) gated to enterprise plan.
**Parity test:** an admin can create a "Franchise Viewer" role that sees dashboards but no financials, without us shipping code.

### 4.2 Data platform: custom fields, validation, dedupe/merge, import/export
**Have:** governed tags; `duplicateClusterKey` + review decisions; import/export tables without a working end-to-end pipeline.
**Gap:** this is HubSpot's quiet superpower — every object customizable in-app.
**Build:**
- `customFieldDefinitions` (org, entityType, key, label, type: text/number/currency/date/select/multiselect/user/boolean/formula-lite, required, options, defaultValue, showInList) + `customFieldValues` or a `custom: v.record()` bag per record. Render dynamically in forms, lists, filters, and reports.
- Validation rules: per-field regex/range/required-when; enforced in a shared mutation middleware.
- **Merge engine:** finish duplicate merge — field-level survivorship UI, re-parent children (activities, tasks, estimates, jobs), tombstone + redirect old IDs, full audit entry. Apply to leads, customers, contacts.
- **Import v1 (production):** CSV upload → column mapper (auto-match + saved mappings) → validation preview (reuse `importRows`) → commit with dedupe policy (skip/update/create) → import report + one-click rollback (delete-by-importJobId).
- **Export:** filtered list → CSV; scheduled full exports to `exportJobs` storage; per-object and full-org backup export (also satisfies trust requirements).
**Parity test:** migrate a real Jobber/RealGreen customer list in under 30 minutes with zero engineering help.

### 4.3 Leads & marketing capture
**Have (strong):** grading, spam scoring/rules, quality scores, duplicate clusters, saved views, configurable statuses, intake form *tables*.
**Gap:** live capture channels and attribution.
**Build:**
- Hosted + embeddable web forms (served via http.ts + a tiny embed script), honeypot + spam scoring on ingest, instant lead + auto-response.
- Lead routing: round-robin / territory / source-based assignment rules with SLA timers ("untouched A-lead > 2h → escalate") running on the automation engine (4.10).
- Source attribution: UTM capture on forms, `firstTouch`/`lastTouch` on lead; simple campaign object (`campaigns`: name, channel, budgetCents, memberCounts) → cost-per-lead / cost-per-won reporting.
- Facebook Lead Ads + Google LSA connectors (webhook ingest) — the two channels every lawn/pest company actually buys.
**Parity test:** HubSpot-style "form to graded, routed, auto-replied lead" in <5 seconds with attribution intact.

### 4.4 Accounts, contacts & 360 view
**Have:** customers/contacts/properties/areas, timelines, notes — genuinely good.
**Build (polish to parity):**
- Company hierarchies (HOA → communities → properties; commercial parent/child).
- Activity timeline unification: one stream mixing emails, SMS, calls, visits, invoices, portal events, with filters — the Salesforce "activity history" bar.
- Relationship fields: contact roles per deal (decision maker, gatekeeper), property ↔ multiple contacts.
- At-a-glance header: LTV, balance, churn risk, open work, next scheduled visit (data already exists in snapshots — wire it live).

### 4.5 Communications hub — **the flagship phase**
**Have:** nothing live. Activity kinds only.
**Build (in order):**
1. **Transactional email out** (Resend or Postmark): estimates, invoices, visit reminders, auto-responses. Org-verified sending domains (DKIM/SPF wizard).
2. **Templates + merge fields:** rich-text editor, `{{customer.firstName}}`-style tokens across all objects incl. custom fields; per-org template library (quote follow-up, seasonal renewal, review request).
3. **Two-way email sync** (Gmail + Microsoft via OAuth): send from the CRM as the rep, auto-log inbound/outbound to the matching contact (match on address), thread view on the timeline. This single feature is most of what makes HubSpot feel like HubSpot.
4. **Open/click tracking** + per-template performance stats.
5. **Sequences:** multi-step email/SMS/task cadences with exit conditions (replied, booked, won). Enrollment manually or via automation rules.
6. **SMS (Twilio):** dedicated number per org, 2-way threads on the timeline, appointment reminders + "tech en route" texts (kills a top Jobber selling point), 10DLC registration flow, opt-out compliance (`doNotContact` already modeled).
7. **Calling:** click-to-call via Twilio Voice with recording + auto-logged call activity; inbound call → screen-pop matching customer (ServiceTitan's booking screen, v1).
8. **Calendar sync (Google/Microsoft):** two-way for estimates/visits; self-serve booking link ("pick an estimate slot") honoring territory + crew availability.
**Parity test:** a sales rep lives in TurfPro all day and never opens Gmail.

### 4.6 Quotes → CPQ → e-signature
**Have:** estimates, line items, templates, price books, pricing rules, calculator sessions.
**Build:**
- Quote PDF generation (branded, photos, good/better/best option groups — option groups are a Jobber-beater for upsells).
- **Public quote link:** tokenized page where the customer views, picks options, **e-signs (draw/type + IP + timestamp + hash-sealed audit entry)**, and pays deposit (4.8). Self-built e-sign is fine for this market; Dropbox Sign API later for enterprise.
- Approval workflow: discounts > X% require manager approval (uses automation engine's approval primitive).
- Finish the no-code pricing calculator (per-sq-ft/acre/crew-hour formulas already modeled) and renewal pricing (last year's program + % uplift, batch-generated each winter — a RealGreen staple).
**Parity test:** estimate → sent → signed → deposit paid → job scheduled without leaving the app; acceptance rate visible per template.

### 4.7 Scheduling, dispatch & routing
**Have:** jobs/visits/crews/route tables, static board, Maps deep links.
**Build:**
- Drag-and-drop dispatch calendar (day/week × crew lanes), conflict + capacity warnings (crew `capacityMinutesPerDay` already modeled).
- Recurring visit generation from `servicePackages` (8-round program → 8 visits auto-spaced by season windows) — this is *the* lawn-care workflow.
- Route optimization v1: nearest-neighbor + 2-opt over geocoded stops (Mapbox/Google Distance Matrix for drive times, cached in `routeDriveTimeEstimates`); "optimize day" button; live ETA push → customer SMS.
- Embedded map view (Mapbox GL) for the dispatch board and territories.
- Weather-aware scheduling: `weatherSnapshots` + org spray rules → flag/hold risky applications, one-click batch reschedule (unique vs every horizontal CRM).

### 4.8 Invoicing, payments & accounting
**Have:** complete invoice/payment/allocation model; no processor.
**Build:**
- Stripe Connect (Standard) per org: card + ACH on invoices and quote deposits; surcharging config where legal; auto-pay for recurring programs (this is ServiceTitan/Jobber's revenue engine — also our take-rate opportunity).
- Invoice lifecycle automation: visit complete → draft invoice from actuals → send → dunning reminders (3/7/14 days) → late fees. Batch monthly invoicing for commercial.
- **QuickBooks Online sync** (customers, invoices, payments, items; two-way where safe) — the #1 integration demanded in this market, ahead of everything else.
- Statements, credit memos, refunds; payment portal page (shared with 4.12).

### 4.9 Products & pricebook (mostly done — finish it)
Finish calculator UI, seasonal price versions (2026 book vs 2027 book), cost-based margin floors using `laborRateCards`/`vendorCatalogs` ("this quote is below 40% margin" warning — Salesforce CPQ can't do this without consultants; we can because cost intelligence is native).

### 4.10 Automation platform — the multiplier
**Have:** `automationRules`/`automationRuns` with `any` types; 4 crons; no engine.
**Build (this is a real product-within-the-product; spec it tightly):**
- Typed trigger catalog: record created/updated (with field filters), stage changed, form submitted, email replied/opened, visit completed, invoice overdue, time-based (X days before/after date field), schedule (cron).
- Condition tree: AND/OR groups over standard + custom fields.
- Action catalog: create task, send email/SMS (template), enroll in sequence, update field, assign owner, add tag, create record, webhook out, wait/delay, branch, **request approval** (approve/reject gates used by 4.6).
- Execution runtime on Convex scheduler: durable runs in `automationRuns`, per-step logs, retries with backoff, failure notifications, per-org rate limits, loop protection (max depth, no self-retrigger).
- Builder UI: linear-with-branches (HubSpot-style beats Salesforce Flow's canvas for SMB), test-with-sample-record, version history, template gallery of ~15 prebuilt green-industry recipes ("A-grade lead untouched 2h → text owner", "round completed → review request", "quote viewed twice, unsigned 5 days → follow-up sequence").
**Parity test:** the 15 recipe templates cover what a RealGreen consultant would charge to configure.

### 4.11 Reporting, forecasting & goals
**Have:** fixed dashboard, seeded snapshots, widget/analytics tables.
**Build:**
- Report builder: pick object (+ its joins), filters, group-by, aggregates, chart type; save/share; schedule email delivery; export CSV. Powered by indexed Convex queries with a per-object "reportable fields" registry (standard + custom fields).
- Dashboard composer over `dashboardWidgets` (drag/resize grid, per-role default dashboards: owner, sales, dispatch).
- **Forecasting:** pipeline-weighted forecast (stage probability × value by expected close month), plus vertical twist — **seasonal revenue forecast** from recurring programs + renewals (deterministic and better than Einstein for this market).
- Goals/quotas: per-rep monthly targets, pacing bars on dashboards.
- Make the P&L/profitability/churn snapshots **computed on real data on schedules** instead of seeded — the tables and math already exist.

### 4.12 Customer portal ("Client Hub")
**Have:** nothing.
**Build:** tokenized (magic-link) portal per customer: upcoming visits, visit history with before/after photos, quotes to approve/sign, invoices to pay, service requests (→ lead/task), referral link, communication preferences. No password until they want one (Clerk optional). This is Jobber's most-loved feature and table stakes for the vertical.

### 4.13 Field mobile & offline
**Have:** responsive PWA field view, online-only; photos not wired.
**Build:** photo upload (compressed, before/after, offline-queued) to Convex storage; offline queue for checklist/materials/notes (IndexedDB outbox + sync w/ conflict = last-write-wins + audit); GPS check-in/out per visit (timesheet auto-fill); chemical application compliance sheet output (EPA reg numbers already modeled — state-audit-ready PDF is a pest-control dealmaker); installable PWA polish, push notifications.

### 4.14 Public API, webhooks & ecosystem
**Have:** none.
**Build:** `/api/v1` REST (CRUD on leads, customers, contacts, properties, opportunities, estimates, jobs, visits, invoices; list endpoints with cursor pagination; per-org API keys, scopes, rate limits, OpenAPI docs page); outbound webhooks (subscriptions table: event → URL, HMAC-signed, retries); **Zapier app** (triggers: new lead/won deal/completed visit; actions: create lead/task) — Zapier alone answers 80% of "do you integrate with X" in sales calls.

### 4.15 AI layer (after Phases 1–4 generate real data)
- Lead scoring v2: train on our own conversion history (grade + source + territory + response-time features); explanation strings on each score.
- Churn risk live: recompute `customerLifecycleSnapshots` from actual invoice/visit/complaint signals; surface next-best-action queue ("call these 5 today").
- Copilot (Claude API): natural-language over CRM ("show B-grade leads in Powell we never called"), draft replies from timeline context, call/visit summarization, estimate description writer.
- Auto-everything: inbound email → suggested lead fields; photo → condition notes. Ship behind per-feature flags (`featureFlags` table already exists).

### 4.16 Trust & operations
Sentry + uptime + status page (P0); backup/restore runbook with tested restores; data retention & deletion (GDPR/CCPA delete cascades); audit log viewer UI with before/after diffs (data already captured); SOC 2 Type I posture work when enterprise deals demand it; per-org data export (self-serve, reduces perceived lock-in, increases actual trust).

---

## 5. Sequenced roadmap

| Phase | Theme | Contents | Exit criterion |
|---|---|---|---|
| **0** | Foundation | S1 un-fork backend, S2 split monolith, S3 http.ts + Clerk/Stripe webhooks, S4 P0 blockers (Stripe billing, invites, Sentry, backups) | A real paying org can sign up, invite a team, and use every existing screen against the authenticated backend |
| **1** | Communications | 4.5 items 1–6 (email out → templates → 2-way sync → tracking → sequences → SMS), web forms + lead routing (4.3), calendar sync | Rep never leaves the app; leads arrive from real forms |
| **2** | Platform multipliers | 4.10 automation engine + recipes, 4.2 custom fields + import v1 + merge engine, granular permissions (4.1) | Migrating customer self-onboards and automates follow-up without us |
| **3** | Money | 4.8 Stripe Connect + invoicing automation + QuickBooks, 4.6 quote PDF + public link + e-sign + deposits, renewal pricing | Quote→sign→pay→schedule→invoice→sync loop closed |
| **4** | Insight | 4.11 report builder, dashboards, forecasting, goals; live (not seeded) P&L/churn/LTV snapshots | Owner runs Monday meeting from TurfPro dashboards |
| **5** | Experience | 4.12 customer portal, 4.13 offline field + photos + compliance PDFs, 4.7 drag-drop dispatch + route optimization + embedded maps | Techs and customers each have their own loved surface |
| **6** | Intelligence & ecosystem | 4.15 AI layer, 4.14 public API + webhooks + Zapier, calling (4.5.7), Facebook/LSA connectors | "Does it have AI / does it integrate" both answered yes |

Dependencies are real: automation (2) needs comms (1) for its actions; e-sign/payments (3) need http.ts (0); AI (6) needs live data (1–4). Within each phase, workstreams parallelize cleanly once S2's route split lands.

---

## 6. What we deliberately do NOT build (anti-bloat list)

- **Full territory/quota hierarchies, enterprise CPQ constraint engines, Pardot-style B2B marketing automation** — our buyers have 1–3 salespeople.
- **A plugin marketplace / custom objects with Apex-style scripting** — custom fields + automation + API + Zapier covers the SMB ceiling.
- **Native mobile apps (year one)** — offline PWA gets 90% there; revisit at scale.
- **Omnichannel service desk (live chat, ticketing SLAs)** — service requests → tasks in the portal is enough; don't become Zendesk.
- **Multi-currency/multi-language (year one)** — US green industry first.

Every one of these is where Salesforce's complexity tax lives. Skipping them *is* the strategy.

---

## 7. How we win the head-to-head (positioning cheat sheet)

| vs | They win on | We win on |
|---|---|---|
| HubSpot | Brand, marketing suite polish | Properties/routing/field ops don't exist in HubSpot without 3 add-ons; our cost & margin intelligence is native |
| Salesforce | Infinite configurability | Time-to-value (days not months), price, vertical workflows out of the box |
| Jobber | Simplicity, brand in the trade | Lead ops (grading/spam/dupes), cost intelligence/P&L, automation depth, real CRM pipeline |
| ServiceTitan | Depth for HVAC/plumbing at enterprise scale | Green-industry specificity (rounds, chemicals, weather windows), SMB price point, modern UX |
| RealGreen/FieldRoutes | Vertical incumbency | Modern stack, actual CRM (their CRM layers are weak), AI, portal UX |

---

*Prepared 2026-07-09. Companion to `prime-time-top-100.md` (launch hardening) — this document is the capability roadmap; that one is the operational checklist. Sections 4.x are written to be handed to Claude Code as implementation briefs one at a time.*

*Stack note (2026-07-09, later the same day): the runtime moved to a fully-Replit stack — Replit Postgres + Drizzle (`src/server/db/`), Replit Auth (`src/server/auth.ts`), and a Next.js RPC layer (`src/app/api/rpc/`, `src/server/modules/`) replacing Convex/Clerk, which remain in-tree but dormant. Everything in this plan still applies; read "Convex scheduler" as a cron route/worker, "http.ts" as additional Next.js route handlers, and "Convex storage" as Replit Object Storage. S1's auth/tenancy rules were preserved 1:1 in the port (see `src/server/guards.ts`).*
