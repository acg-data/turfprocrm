# Deep Logic Audit — Landscape CRM (July 19, 2026)

Read-only audit of workflow completeness and lawncare/landscaping/pest-control domain fit. No code was modified. Method: (1) static state-machine mapping of every status-bearing entity across `convex/` and `src/domain/`, by four parallel audit passes; (2) full test-suite run (`vitest run`: **8 files, 58 tests, all pass** — happy-path only, see §6); (3) live browser exercise of the demo workspace (golden path driven end-to-end; UI action inventory checked against backend gaps).

Severity: **P0** = workflow dead end or data-corruption risk on the core path · **P1** = missing core lawncare capability, incorrect money math, or billing-enforcement gap · **P2** = rare-status gap, demo/live divergence · **P3** = polish.

---

## 1. Executive summary — top 10 findings

1. **(P0) Recurring service silently dies at the generation horizon.** `generateRecurringRoute` (`convex/dispatch.ts:127`) one-shot generates at most **26 visits** (`:154`), writes `nextRunAt`/`generatedVisitIds` (`:216-217`) — and **no cron ever reads them** (`convex/crons.ts` has only cost/weather/stale-lead/job-cost jobs). A weekly mowing customer stops getting visits after ~6 months with no alert. This is the single most important lawncare failure in the product. [D-02]

2. **(P0) The job lifecycle is two states.** Jobs are only ever `scheduled` (created by `convertToJob`, `estimates.ts:447`) or `completed` (`closeJob`, `operating.ts:2336`). `in_progress`, `blocked`, and `canceled` are never set by any mutation — you cannot cancel a job, mark it underway, or block it. [A-09]

3. **(P1) Selling recurring work doesn't create a recurring plan.** `convertToJob` ignores `servicePackages.billingCadence` entirely — an accepted recurring/seasonal estimate produces one job with one visit. Creating the plan is a separate manual dispatch action, and it also only uses the **first** service package of a multi-service estimate for cost/checklist (`estimates.ts:420-425,522-526`), under-costing multi-line jobs. [A-19, A-20]

4. **(P1) Customers can't say no, and estimates never expire.** No mutation sets estimate `declined` or `expired`; `expiresAt` (+14d, `estimates.ts:286`) is never enforced, so stale estimates remain acceptable forever, and a rejection leaves the opportunity dangling at `proposal_sent`. Compounding: there is **no updateEstimate/reviseEstimate mutation** — estimates are immutable after creation — and `requestApproval` has **no UI caller**, so the approval workflow can't be initiated from the app (only decided, against demo-seeded rows). [A-03, A-04, A-05, A-13, A-21]

5. **(P1) The exception paths of field operations don't exist.** Visit statuses `en_route`/`missed`/`canceled` are unreachable; there is no reschedule, no-show, make-up, or cancel-visit mutation. Assignment `accepted`/`declined` are never written and a decline would trigger nothing. `assignVisit` does zero crew-capacity math. The entire `routePlans`/`routeStops` subsystem (draft→published→…) is schema-only — no mutation ever writes it — and drive times are hardcoded (`routeOrder===1?18:31`, `operating.ts:973-983`). UI grep confirms: **no button labeled decline/refund/reschedule/missed/skip/pause/renew/void exists anywhere in the 12k-line app component.** [B-03, B-04, B-05, B-08, A-10, A-11, A-18]

6. **(P1) AR is forward-only.** Invoices never become `overdue` (no cron, no query-time transition — runtime-confirmed: a demo invoice due Jul 11 still displays "Partially Paid" on Jul 19) and can't be voided; payments can't be refunded, failed, or unwound (`paymentAllocations` never reversed). Overpayment is silently truncated with no customer credit (`operating.ts:2256`). Field-submitted timesheets are a dead end: `submitted` has no approve/reject transition, yet **all** timesheet entries — including would-be rejected ones — flow into job cost (`operating.ts:332,345`). [C-01, C-02, C-03, C-06, C-08, A-14–A-16]

7. **(P1) SaaS billing never enforces.** Both Stripe and Paddle webhooks hard-code `plan:"pro"` on every event (`api/billing/webhook/route.ts:91`, `paddle/webhook/route.ts:131`), so cancellation never downgrades an org; and nothing anywhere reads `subscriptionStatus` to gate access — a canceled/past-due org keeps unlimited Pro forever. Separately, the public web-lead endpoint bypasses the free-plan 10-contact cap entirely (`leadIntake.ts:107-139` never calls `assertCanCreateContact`) and is unauthenticated + un-rate-limited. [F-01, F-02, F-03]

8. **(P1) Chemical compliance is a display, not a record.** Material applications ARE captured during `submitVisit` with a weather snapshot (`field.ts:346-366`, vertical-agnostic — pest/lawn parity is real), but `generateComplianceRecord` only writes an `auditEvents` row; there is **no complianceRecords table**, no applicator-license field anywhere in the schema, no restricted-use gating, no target pest/dilution-rate capture, no re-entry interval, and high `applicationRisk` weather never warns or blocks. Not defensible for either vertical's regulators. [E-01–E-06]

9. **(P1) Measured property never drives price.** `createEstimate` takes `unitPriceCents` straight from client args and never reads `properties.lawnSizeSqFt` or `priceBookItems.pricingModel` (per_sq_ft/per_acre models are schema-only). The only sq-ft engine (`priceDemoFertilizationProgram`) writes a calculator preview, not estimate line items. Billing granularity is per-JOB only — a weekly plan cannot bill per-visit or monthly-flat (`billingCadence` is consumed only as a UI label). [C/E scorecard rows 2, 10]

10. **(P1) The self-assessment is self-certifying.** The registry marks **all 100 journeys "verified"** (`src/data/customer-journeys.ts`), contradicting the doc's own 58/12/26/4 breakdown; `tests/customer-journeys.test.ts` asserts only well-formedness and markdown string matches — zero behavioral evidence. Journeys like J54 (weather reschedule), J59 (missed-visit recovery), and J45 (pest recurring plan) are "verified" with no mutation existing at all. Many others are exercised only through `demo.ts` — 23 unauthenticated twins with no permission checks, no crew scoping, and (in spots) no audit writes. [DOC-01, DOC-02, F-04, DIFF-01–03]

**What's genuinely solid:** live Convex modules are consistently tenant-guarded (`requireMembership` + `assertOrg` verified across a 10-mutation spot check) and audited; the golden happy path — lead → quote → send → approval → accept → convert → invoice → payment — works end-to-end (statically traced and driven live in the demo); webhook signature verification is sound; intake/spam/duplicate heuristics on leads are real; estimate margin math and the fertilization pricing calculator have tests that pass.

---

## 2. State-machine matrices

**24+ schema-defined status values are never written by any live mutation.** Dead/unreachable states **bolded**.

| Entity (schema) | Live-reachable states | Dead / unreachable states |
|---|---|---|
| leads (13 statuses, `schema.ts:19-33`) | new, contacted, spam, converted, disqualified (business logic); all 13 settable manually via unguarded `updateLead` | none unreachable, but **8 statuses are manual-only free text** (do_estimate, estimate_provided, follow_up, waiting, lost_confirmed, lost_assumed, unqualified, passed_on) with no workflow logic — `src/domain/workflow.ts:40` models only 4 |
| opportunities (6 stages) | all 6 | — (but stage patched unguarded by estimate mutations, A-08) |
| estimates (5) | draft, sent, accepted | **declined**, **expired** |
| approvalRequests (4) | pending (backend-only), approved, rejected | **canceled**; pending uncreatable from UI (A-05) |
| jobs (5) | scheduled, completed | **in_progress**, **blocked**, **canceled** |
| jobVisits (6) | scheduled, on_site, complete | **en_route**, **missed**, **canceled** |
| visitAssignments (3) | assigned (dead-end) | **accepted**, **declined** |
| changeOrders (5) | pending_approval, approved | **draft** (accepted as precondition `jobs.ts:121`, never written), **rejected**, **canceled** |
| customerInvoices (6) | draft, sent, partially_paid, paid | **overdue**, **void** |
| customerPayments (4) | posted (immutable) | **pending**, **failed**, **refunded** |
| timesheetEntries (4) | draft, **submitted (dead-end)**, approved (only via direct manager insert, never from submitted) | **rejected** |
| recurringServicePlans (3) | active (dead-end) | **paused**, **completed** |
| routePlans (4) | — | **entire table never written** (draft/published/in_progress/completed all dead) |

Full per-status set-by/exited-by detail with citations is in the findings register (§5) — key writers: `crm.ts:148/337`, `pipeline.ts:81-126`, `estimates.ts:33/259/320/398`, `dispatch.ts:34/93/127`, `field.ts:142/209/254`, `jobs.ts:48/109`, `operating.ts:2243/2290/2310`.

---

## 3. Workflow trace results

### Trace A — Lead → Opportunity → Estimate → Approval → Job
Happy path **PASSES** (statically and in the live demo exercise: Create Quote → Send Quote → Capture Approval → Convert to Job all function). Failures are on the exception paths:
- Lead↔opportunity creation is atomic (single Convex mutation) — no orphan risk at creation. But **acceptEstimate/convertToJob set the opportunity `won` without marking the lead `converted`** (`estimates.ts:354-360,432-438`; only `pipeline.ts:106` syncs) — pipeline reporting inconsistency. [A-06]
- `updateLead`/`bulkUpdateLeads` patch any→any status with no transition guard (`operating.ts:1863,1882`). [A-02]
- Rejected approval: backend allows re-request (`estimates.ts:170-200`), but no estimate-edit mutation exists and `requestApproval` has no UI caller → **from the app, a rejected estimate is stuck**. [A-13]
- `operating.ts` mutations use `requireOperatingOrg`, which **skips membership checks when `organizationId` is omitted** (demo fallback, `operating.ts:39-44`) — reaches money mutations. [A-07]

### Trace B — Job → Dispatch → Field
Happy path **PASSES** (`convertToJob` → seed visit → `assignVisit` → `startVisit` → checklist → `submitVisit`, with proper tenancy + crew scoping in live mode). Failures:
- `submitVisit` completes the visit but **never advances the job**; `closeJob` is fully manual and `forceWithExceptions:true` (the UI's "Close With Exceptions" button) closes jobs with visits still scheduled and invoices unpaid (`operating.ts:2324-2336`). [B-01, B-02, C-09]
- No missed/reschedule/cancel path (B-03), no decline-handling (B-04), no capacity math (B-05), route subsystem unwritten (B-08).
- `dispatch.getSchedule`, `field.getMyVisits`, `jobs.getJobWorkspace` have **no UI caller** — the app renders scheduling from the `workspace.ts` aggregate instead. [B-07]

### Trace C — Field → Invoice → Payment → Close
Happy path **PASSES** (runtime-verified: Generate Invoice produced INV-DEMO-083709 "Sent"; Payment Entry form live). Failures: forward-only AR (§1 #6); change-order revenue reaches the invoice (`operating.ts:413-417`) but its patch to `jobCostSummaries` is **clobbered within ≤1h** by the hourly `recalculateJobCostSummaries` cron, which recomputes estimated revenue from the estimate/opportunity only (`jobs.ts:160-174` vs `operating.ts:341,552-570`) [C-04]; field timesheets enter cost at `hourlyCostCents:0` default (`field.ts:305`) and unapproved/rejected entries are never filtered from cost [C-06]; zero-revenue jobs report 0% margin instead of a loss signal (`operating.ts:57-59`) [C-07]; overhead 18% and equipment `visits×$65 + labor×0.12` are hardcoded, ignoring `equipmentRateCards`/`costSnapshots` [C-11].

### Trace D — Recurring plan lifecycle (lawncare-critical) — **FAILS**
Plans are created only by the manual dispatch action or demo seed — never by the sales flow [D-01]. Generation is one-shot, ≤26 visits, no cron continuation [D-02 — P0]. `paused`/`completed` are unreachable; no renewal, no skip-with-credit, no proration, no round sequencing ("round 3 of 7" cannot be represented — `recurringServicePlans` has no round field; `fertilization-pricing.ts` is pricing math only) [D-03–D-06]. Weather snapshots are collected on a 6h cron and computed into `applicationRisk`, but **nothing consumes weather to move, warn, or block a visit** [D-07].

### Trace E — Chemical compliance — **PARTIAL**
Capture path is real and vertical-agnostic (parity between pest and lawn-chem holds at the data layer). But the record isn't persisted as a compliance entity, lacks applicator/license/target-pest/rate fields, and nothing gates restricted-use products or risky weather (§1 #8). [E-01–E-07]

### Trace F — Tenancy & SaaS billing
Provisioning is atomic within Convex but **not idempotent** (retry → duplicate org+seed, `setup.ts:88-94`) [F-06]; `clerkOrganizationId` optional/never unique → Clerk↔Convex orphan possible [F-05]. Invites: no expiry cron (lazy/manual only) [F-07]; re-send of expired/revoked works. Free-cap enforced on `createLead` and imports, **bypassed by public web intake** [F-03]. Billing: no downgrade, no lapse enforcement [F-01, F-02]. Live guards consistent; `demo.ts`'s 23 mutations are unauthenticated shared-workspace writes [F-04].

---

## 4. Lawncare/landscaping fit scorecard

| # | Capability | Verdict | Evidence |
|---|---|---|---|
| 1 | Recurring plans (weekly/biweekly mowing) | **Partial** | Generation exists but one-shot ≤26 visits, no cron, not tied to sales (`dispatch.ts:127-234`, `crons.ts`) |
| 2 | Seasonal program round tracking (fert rounds, cleanups, aeration) | **Missing** | No round/sequence field (`schema.ts:635-651`); pricing math only |
| 3 | Weather delay → bulk reschedule + notify | **Missing** | Snapshots collected, never consumed for scheduling (`operating.ts:672-694`) |
| 4 | Skip-visit with credit | **Missing** | No mutation, no credit ledger |
| 5 | Prepay / installment billing | **Missing** | No prepay ledger or credit balance; overpayment truncated (`operating.ts:2256`) |
| 6 | Per-visit vs monthly-flat vs per-job billing | **Partial (per-job only)** | `createInvoiceForJob` bills whole job; `billingCadence` is a UI label only |
| 7 | Route density / drive-time optimization | **Missing** | `routePlans` never written; drive minutes hardcoded (`operating.ts:973-983`) |
| 8 | Pest-control compliance record | **Partial** | Capture real; record not persisted/defensible (E-01–E-04) |
| 9 | Lawn-chem compliance parity | **Partial (parity confirmed)** | Same category-agnostic path (`field.ts:337-366`); equally incomplete |
| 10 | Property measurement driving price | **Missing in live mode** | `createEstimate` never reads `lawnSizeSqFt`/`pricingModel` (`estimates.ts:33-105`) |
| 11 | Renewal campaigns / auto-renew | **Missing** | No renewal path; `completed` plan unreachable |
| 12 | Snow/irrigation seasonality | **Missing (enum-only)** | Categories exist; no activation/gating logic |
| 13 | Crew capacity overbooking guard | **Missing** | `capacityMinutesPerDay` never read by dispatch |
| 14 | Visit-day customer comms (on-my-way, photo summary) | **Missing (activity-log only)** | No SMS/email send path; `customerVisible` stored, never dispatched (`field.ts:428-444`) |

**Score: 0 Present · 5 Partial · 9 Missing.** The schema anticipates most of these (tables/enums exist); the operating logic behind them largely does not.

---

## 5. Findings register (merged, deduplicated)

Known = admitted in journeys `gaps[]`/backlog prose; Novel = not tracked.

| ID | Sev | Finding | Evidence | Known? |
|---|---|---|---|---|
| D-02 | **P0** | Recurring visit generation dead-ends ≤26 visits; `nextRunAt` never consumed; no cron | `dispatch.ts:154,178-217`; `crons.ts` | Novel |
| A-09 | **P0** | Jobs: only scheduled→completed reachable; no in_progress/blocked/cancel | `estimates.ts:447`; `operating.ts:2336` | Novel |
| A-03/A-04/A-21 | P1 | Estimate declined+expired unreachable; expiry unenforced; rejection leaves opportunity dangling | `estimates.ts:286` (writes expiresAt, nothing reads) | Novel |
| A-05/A-13 | P1 | `requestApproval` has no UI caller; rejected estimate unrecoverable from app (no estimate-edit mutation exists) | `estimates.ts:127`; `landscape-os-app.tsx:2282` | Novel |
| A-06 | P1 | Estimate-accept wins opportunity without converting lead | `estimates.ts:354-360,432-438` | Novel |
| A-07/C-10 | P1 | `requireOperatingOrg` skips membership when org omitted — reaches lead + money mutations | `operating.ts:39-44` | Novel |
| A-19 | P1 | convertToJob ignores billingCadence — recurring sale → one-off job | `estimates.ts:398-573` | Partial (journeys gaps) |
| A-20 | P1 | convertToJob uses only FIRST service package for cost/checklist on multi-service estimates | `estimates.ts:420-425,522-526` | Novel |
| A-02/A-01 | P1 | Lead status: 13 schema values, 4 modeled in workflow; any→any unguarded patches | `workflow.ts:40`; `operating.ts:1863,1882` | Novel |
| B-01/B-02/C-09 | P1 | Visits completing never advances job; Close-With-Exceptions closes with open visits/unpaid invoices | `field.ts:293-299`; `operating.ts:2324-2336` | Novel |
| B-03/A-10 | P1 | missed/en_route/canceled visits unreachable; no reschedule/make-up/cancel mutation | `schema.ts:48`; grep | Known (J54/J59 overstate) |
| B-04/A-11 | P1 | Assignment accept/decline never written; declined would trigger nothing | `schema.ts:710`; `dispatch.ts:34` | Novel |
| B-05 | P1 | Zero crew-capacity math in dispatch | `dispatch.ts:34-91` | Novel |
| B-08/A-18 | P1 | routePlans/routeStops never written; drive times hardcoded | `schema.ts:731`; `operating.ts:973-983` | Novel |
| D-01 | P1 | Recurring plans not created by sales flow | `estimates.ts:398-540` | Novel |
| D-03/D-04/A-17 | P1 | Plans can't pause/complete/renew | `schema.ts:648`; grep | Known (renewals in gaps) |
| D-05 | P1 | No skip-visit-with-credit | grep | Known |
| D-06 | P1 | No seasonal round sequencing | `schema.ts:635-651` | Novel |
| D-07 | P1 | Weather never drives scheduling | `operating.ts:672-694`; dispatch grep | Known (J54) |
| C-01/A-14 | P1 | Invoices never overdue (runtime-confirmed) or void | `crons.ts`; `operating.ts:383` | Novel |
| C-03/A-15 | P1 | No refund/failed payment path; allocations never unwound | `schema.ts:174`; `operating.ts:2263` | Novel |
| C-04/C-05 | P1 | Change-order revenue patch clobbered by hourly cost-recalc cron; margin denominator mixes actual/estimated | `jobs.ts:160-174` vs `operating.ts:341,552-570` | Novel |
| C-06 | P1 | All timesheets (incl. draft/would-be-rejected) count in job cost; field labor enters at $0/hr | `operating.ts:332,345`; `field.ts:305` | Novel |
| A-16 | P1 | Timesheet submitted→approved/rejected transitions don't exist | `field.ts:307`; `operating.ts:2227` | Novel |
| E-01–E-04 | P1 | No persisted compliance record, applicator license, restricted-use gating, or target-pest/rate fields | `operating.ts:2392-2434`; schema greps | Novel |
| F-01/F-02 | P1 | Webhooks hard-code plan "pro"; nothing reads subscriptionStatus — lapsed subs keep full access | `billing/webhook/route.ts:91`; `paddle/webhook/route.ts:131`; `crm.ts:54-71` | Novel |
| F-03 | P1 | Public web-lead bypasses free-plan contact cap; unauthenticated + un-rate-limited | `leadIntake.ts:107-139` | Partial (CAPTCHA gap known) |
| DOC-01/DOC-02 | P1 | Journeys registry marks 100/100 "verified"; test is self-referential; several "verified" journeys have no mutation at all | `customer-journeys.ts:100-210`; `customer-journeys.test.ts` | Novel |
| Scorecard #10 | P1 | Property measurement never flows into estimate pricing | `estimates.ts:33-105`; `operating.ts:2446-2528` | Novel |
| Scorecard #6 | P1 | Per-visit / monthly-flat billing absent | `operating.ts:393-437` | Novel |
| F-04 | P2 | 23 unauthenticated demo mutations on shared workspace | `demo.ts:163-169` | By design; flagged for prod exposure |
| DIFF-01–03 | P2 | Demo twins skip role checks, crew scoping, and (in spots) audit writes — journeys verified via demo overstate live | `demo.ts:2388,2618,2702,2439,3101` | Novel |
| F-05/F-06 | P2 | Clerk↔Convex org can orphan/duplicate; createOrganization not idempotent | `setup.ts:88-94,122` | Novel |
| A-08 | P2 | Opportunity stage patched without canMoveOpportunity guard by estimate mutations | `estimates.ts:107,295,355` | Novel |
| A-12 | P2 | Change-order draft/rejected/canceled unreachable | `jobs.ts:82,121,144` | Novel |
| B-06 | P2 | `blocked` job status dead; schedule-impact COs never block | `jobs.ts:152-158` | Novel |
| B-07 | P2 | getSchedule/getMyVisits/getJobWorkspace have no UI caller | src grep | Novel |
| C-07/C-08 | P2 | 0% margin masks losses on zero-revenue jobs; overpayment truncated w/o credit | `operating.ts:57-59,2256` | Novel |
| E-05–E-07 | P2 | Weather risk never blocks application; no REI/notification; weather snapshot optional at capture | `field.ts:336,360` | Novel |
| F-07 | P3 | No invite-expiry cron (lazy/manual only) | `admin.ts:197,255` | Novel |
| C-11/C-12 | P3 | Hardcoded overhead/equipment heuristics; 1:1 payment allocation despite multi-invoice table | `operating.ts:351,355,2271` | Novel |
| A-22 | P3 | submitWebLead creates new customer/property per submission, dedup deferred to heuristics | `leadIntake.ts:119-151` | Known |
| DIFF-04 | P3 | Audit EntityType lacks billing/subscription — billing events filed under "organization" | `lib/audit.ts:4-15` | Novel |
| RT-01 | P2 (unverified math) | Demo Financials header shows Gross profit $71,818 / 94% margin against Invoiced $76,373 − Direct costs $30,012 (= $46,361 / ~61%) — dashboard GP formula inconsistent with its own displayed inputs (demo "fallback model"; verify live formula) | browser exercise, Financials screen | Novel |

---

## 6. Runtime verification & doc-accuracy appendix

**Tests:** `npx vitest run` → 8 files / 58 tests, all green. Coverage maps to happy paths + registry well-formedness; none of the dead-end transitions in §2 have tests (they can't — the mutations don't exist).

**Browser exercise (demo workspace, established persona):**
- Golden path driven live: pipeline Create Quote → Send Quote → Capture Approval → Convert to Job → Jobs screen Generate Invoice (INV-DEMO-083709, "Sent") → Financials Payment Entry available. **Works.**
- UI action inventory: full-text grep of `landscape-os-app.tsx` for user-facing labels Decline / Refund / Reschedule / Mark missed / Skip / Pause / Renew / Void → **zero matches**. Jobs screen offers exactly: Close Job, Close With Exceptions, Generate Invoice, Create Change Order, Add Task, Log Activity. The exception-path gaps are absent at both layers.
- Overdue confirmation: invoice DRAFT-1001 "due Jul 11" displayed as "Partially Paid" on Jul 19 — no overdue state.
- Environment note: with Convex configured but unauthenticated, `/app?demo=owner` lands on the workspace gate rather than the demo (the `?demo=` param only takes effect via the marketing-page path that passes `initialDemoPersona`; the gate's "Open sample workspace" button is the in-app entry). Minor entry-flow inconsistency worth a look.

**Doc accuracy:** `docs/customer-journeys-100.md` line 9 ("all 100 verified") matches the registry; line 37 (58/12/26/4, dated Jun 22 2026) does not — the doc contradicts itself and the 4 "gaps" don't exist as data. "Verified" is an author-assigned string validated only by a self-referential test. Sampled journeys J22/23/24/26/41/47/49/50/52/57/63/69/81/82/98: live paths exist (J24 with the F-03 cap bypass, J98 partial). Overstated "verified" journeys with no mutation behind them: J45, J54, J59, plus ~20 schema-only entries (J34, J38-40, J43, J53, J58, J65, J67, J72, J76-79, J94, J97, J99, J100).

---

## 7. Suggested remediation order (not executed — audit only)

1. **Recurring continuity (D-02, D-01, A-19):** cron that consumes `nextRunAt` to extend visit horizons; create plans at `convertToJob` when cadence is recurring/seasonal.
2. **Exception-path state machines:** cancel/reschedule/missed for visits and jobs; decline/expire/revise for estimates; approve/reject for timesheets; void/refund for AR. (These are the dead ends that will strand real operators in week one.)
3. **Billing enforcement (F-01–F-03):** derive plan from the webhook price/product, gate on `subscriptionStatus`, and cap-check + rate-limit public intake.
4. **Money math (C-04, C-06, C-01):** persist CO deltas into recalc inputs; filter timesheets by status and require real rates; add AR aging.
5. **Lawncare differentiation (scorecard):** round sequencing, skip/credit, prepay ledger, per-visit billing, weather-driven dispatch — these are the features that make it a landscaping CRM rather than a generic one.
6. **Truth in self-assessment (DOC-01/02):** re-grade the journeys registry against this report; make "verified" require a behavioral test reference.
