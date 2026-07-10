# TurfPro CRM — Master Plan: The Definitive Green-Industry Business OS

> Supersedes the "Convex Production Plan" previously in this file — that plan **shipped** (commits `80e0fcd`…`deee614`: Clerk auth, Stripe billing, invites, email, ops hardening, marketing rebuild + restyle). This plan is the next horizon: everything.

## Context

**Goal:** make TurfPro CRM the best product a landscaper / lawn-care / pest / tree / irrigation / snow operator — or any blue-collar service owner — can run their business on. Parity-or-better with every sales CRM (Salesforce, HubSpot, Pipedrive, Close, Attio) and every vertical platform (ServiceTitan, Jobber, Housecall Pro, Aspire, LMN, SingleOps, RealGreen, FieldRoutes, Arborgold, Service Autopilot), plus the duct-taped adjacents owners buy separately (QuickBooks, Gusto, NiceJob/Podium, CallRail, CompanyCam, DocuSign, SiteRecon, Fleetio).

**Where we are:** Repo `C:\Users\Justin Abrams\.claude\worktrees\turfprocrm` (= github.com/acg-data/turfprocrm, main, all pushed). Next.js 16 + Convex (79-table schema, authenticated multi-tenant RBAC, audit log, crons) + Clerk (public email/password + Google) + Stripe subscriptions (checkout/portal/webhooks/plan-gating/dunning) + Resend email + team invites + marketing site (restyled, 18 pages) + 13 backend tests + 12 e2e. Strategy ancestor: `docs/crm-parity-plan.md`. Launch board: `src/data/prime-time-roadmap.ts` (rendered in-app under Prime Time).

**What this plan contains:** Part I names the competitive canon. Part II is the exhaustive capability catalog — **630 concrete, buildable capabilities across 20 domains**, each tagged [DONE]/[PARTIAL]/[NEW] against today's codebase (≈75 done, ≈45 partial, ≈510 new). Part III sequences them into 13 execution waves with code anchors and acceptance criteria. Part IV is the run protocol — how agent sessions consume this plan wave by wave. When each wave is decomposed into granular tickets at run time (each catalog bullet expands to 3–8 tickets: schema, backend, UI, tests, docs), this catalog is the "thousands of things."

---

## Part I — The competitive canon (what we absorb, and our edge)

| Source | What we take |
|---|---|
| Salesforce / HubSpot / Pipedrive / Close / Attio | Pipelines, 2-way comms, sequences, automation, custom fields/objects, report builder, forecasting, AI copilot |
| ServiceTitan | Call booking/CTI, dispatch depth, pricebook rigor, financing, "the office runs on it" completeness |
| Jobber / Housecall Pro | Client hub portal, quote→invoice→pay loop simplicity, en-route texts, reviews |
| Aspire / LMN / SingleOps | Production rates, kits/assemblies, WIP & job costing, snow ops, commercial contracts |
| RealGreen / Service Autopilot / FieldRoutes | Chemical program rounds, batch renewals, prepay, postcard marketing, per-1,000-sq-ft pricing |
| Arborgold | Tree inventory, multi-visit work orders |
| Adjacent tools | QBO sync, payroll export, review funnels, call tracking, photo history, satellite measurement, fleet |

**Our structural edge (don't dilute it):** cost/margin intelligence native to every object; weather-aware operations; green-industry compliance built in (EPA/state chemical records, certified payroll); one login instead of seven tools; modern UX + AI layer the incumbents can't retrofit.

---

## Part II — The Capability Catalog (630 items, 20 domains)

Status legend: **[DONE]** shipped and live · **[PARTIAL]** modeled or half-built · **[NEW]** to build. Every bullet is a buildable unit that expands into granular tickets at run time.

## 1. Leads & Sales Pipeline

- [DONE] Lead records — source, status, owner, operating-state fields on every lead
- [DONE] Lead grading — automatic A–D quality grade on intake
- [DONE] Spam scoring engine — configurable spam rules score and quarantine junk leads
- [DONE] Lead quality scores — stored quality metrics surfaced for triage
- [DONE] Duplicate detection — cluster-key matching flags likely duplicate leads
- [PARTIAL] Duplicate review queue — inspect/keep/hide workflow; persisted merge decisions unfinished
- [DONE] Lead list filters — search, status, quality, source, owner, state filters
- [DONE] Bulk lead actions — multi-select status moves and assignments
- [DONE] Saved lead views — persisted filter sets per user
- [PARTIAL] Configurable lead statuses — status tables exist; admin create/reorder/deactivate editor unfinished
- [PARTIAL] Web-to-lead intake forms — form/submission tables modeled; hosted serving not live
- [NEW] Embeddable form widget — script-tag form embed for customer websites
- [NEW] Drag-drop form builder — custom fields, conditional logic, service pickers
- [NEW] Instant auto-response — email/SMS reply within seconds of form submit
- [PARTIAL] Lead SLA timers — untouched-lead aging computed in UI; scheduled escalations missing
- [NEW] Lead routing rules — round-robin, territory, source, and service-line assignment
- [NEW] Speed-to-lead alerts — push/SMS to owner when A-grade lead arrives
- [NEW] UTM attribution capture — first-touch/last-touch source stamped on every lead
- [NEW] Call tracking numbers — per-source numbers attribute phone leads (CallRail parity)
- [NEW] Facebook Lead Ads connector — webhook ingest with auto-grading
- [NEW] Google LSA connector — Local Services Ads lead ingest and dispute helper
- [NEW] Angi/Thumbtack ingestion — marketplace lead email/API parsing into pipeline
- [NEW] Web chat lead capture — site chat conversations create graded leads
- [NEW] Multiple pipelines — separate boards per service line (maintenance, design-build, snow)
- [NEW] Custom stages with probabilities — org-defined stages driving weighted forecast
- [NEW] Stage-gate required fields — block stage moves until fields complete
- [DONE] Opportunity/deal records — opportunities linked to customers and estimates on a pipeline board
- [NEW] Deal rotting indicators — days-in-stage aging flags and idle-deal alerts
- [NEW] Win/loss reasons — required loss reason with competitor tracking and analysis
- [NEW] Lost-deal seasonal recycling — auto re-engage lost quotes next season
- [NEW] Estimate booking links — customer self-books estimate slots honoring territory/availability
- [NEW] Door-knocking canvass mode — map pins, walk lists, knock outcomes per territory
- [NEW] Neighborhood cluster prospecting — radius targeting around scheduled jobs ("we're on your street")
- [NEW] Commercial bid calendar — RFP due dates, bid/no-bid tracking, site walk scheduling

## 2. Communications Hub (email, SMS, calling, chat)

- [DONE] Transactional account email — Resend sends invites, dunning, trial reminders
- [NEW] Document email delivery — estimates, invoices, visit reminders sent from app
- [NEW] Verified sending domains — per-org DKIM/SPF setup wizard
- [NEW] Rich-text email templates — editor with merge fields across all objects
- [NEW] Merge-field token system — `{{customer.firstName}}`-style tokens including custom fields
- [NEW] Org template library — quote follow-up, renewal, review-request starter templates
- [NEW] Two-way Gmail sync — OAuth send-as-rep, auto-log inbound to contact timeline
- [NEW] Two-way Outlook/M365 sync — same sync for Microsoft shops
- [NEW] Shared team inbox — office@ conversations assignable to staff
- [NEW] Email open/click tracking — per-message and per-template performance stats
- [NEW] Send-later scheduling — queue emails for optimal send times
- [NEW] Sequences/cadences — multi-step email/SMS/task flows with reply/won exit conditions
- [NEW] Two-way SMS — Twilio dedicated number per org, threaded on timeline
- [NEW] 10DLC registration flow — guided carrier compliance registration
- [NEW] SMS opt-out compliance — STOP/HELP handling wired to doNotContact flags
- [NEW] Appointment reminder texts — day-before and morning-of visit reminders
- [NEW] "Tech en route" texts — live ETA message with tracking link
- [NEW] Missed-call text-back — instant SMS when office misses a call
- [NEW] Click-to-call — Twilio Voice dialing with auto-logged call activity
- [NEW] Call recording + transcripts — stored recordings attached to timeline
- [NEW] Inbound call screen-pop — caller-ID match opens customer booking screen (CTI)
- [NEW] Call dispositions — outcome codes, follow-up task creation from calls
- [NEW] IVR/business-hours routing — phone tree, ring groups, after-hours voicemail
- [NEW] Voicemail drop — pre-recorded voicemail library for reps
- [NEW] Website live chat widget — staffed chat routed to team inbox
- [NEW] Unified conversation inbox — email, SMS, chat, calls in one queue
- [NEW] Facebook Messenger/Google Business Messages — social channels into inbox
- [NEW] Broadcast messaging — segment-targeted email/SMS blasts with throttling
- [NEW] Two-way calendar sync — Google/Microsoft calendars for estimates and meetings
- [NEW] Internal @mentions — team comments and mentions on any record
- [PARTIAL] Manual activity logging — note/call/email composer on customer and job; other objects pending
- [PARTIAL] Do-not-contact controls — flags modeled; enforcement across channels unbuilt
- [NEW] Spanish-language templates — bilingual customer message variants per template
- [NEW] Postcard/letter triggers — direct-mail piece dispatch via print API (RealGreen-style)

## 3. Customers, Properties & Relationship 360

- [DONE] Customer/account records — residential and commercial accounts with lifecycle status
- [DONE] Contact records — people linked to customers with contact details
- [DONE] Property records — service addresses with geodata per customer
- [DONE] Property areas — turf zones, beds, hardscape areas with measurements modeled
- [DONE] Customer activity timeline — chronological events on the customer record
- [DONE] Notes on records — free-text notes across objects
- [DONE] Governed tags — org-defined tag taxonomy applied to any entity
- [PARTIAL] File attachments — files table modeled; upload/storage wiring incomplete
- [PARTIAL] Property photo history — photos modeled; capture/display not wired (CompanyCam parity)
- [PARTIAL] Land measurement capture — area objects exist; map-draw measurement UX unfinished
- [NEW] Satellite auto-measurement — aerial turf/bed/linear takeoffs (SiteRecon/Attentive.ai parity)
- [NEW] Annotated site maps — property diagrams with zones, gates, hazards marked
- [NEW] Access notes — gate codes, pet warnings, alarm info surfaced to crews
- [NEW] Company hierarchies — HOA → community → property and commercial parent/child rollups
- [NEW] Contact roles per deal — decision maker, gatekeeper, billing contact designation
- [NEW] Multi-contact properties — tenant vs owner vs property-manager relationships
- [NEW] Unified 360 timeline — emails, texts, calls, visits, invoices, portal events in one stream
- [PARTIAL] At-a-glance health header — LTV, balance, churn risk, next visit; snapshot data exists, live wiring pending
- [NEW] Customer merge — survivorship UI with child-record re-parenting
- [NEW] Service history per property — every visit, product applied, and result by address
- [NEW] Equipment-on-site registry — irrigation controllers, zones, backflow devices per property
- [NEW] Tree inventory — species, DBH, condition, GPS pin per tree (Arborgold parity)
- [NEW] Snow site attributes — priority tier, surface types, stake maps, salt sensitivity
- [NEW] Customer segments — residential/commercial/HOA/municipal with segment-level views
- [NEW] Service-level tiers — VIP flags, response-time promises, priority routing
- [NEW] Billing vs service address — separate billing entity for property managers
- [NEW] Communication preferences — per-contact channel, language, and frequency choices
- [NEW] Data enrichment — parcel data, lot size, home value, year built auto-appended
- [NEW] Map view of book-of-business — all customers/properties plotted with filters
- [NEW] Customer anniversary tracking — customer-since dates driving loyalty touches
- [NEW] Consolidated commercial rollups — portfolio-level spend and site status for multi-site clients
- [NEW] Relationship intelligence — auto-logged interaction recency and strength scoring (Attio parity)

## 4. Estimating, CPQ & Proposals

- [DONE] Estimate records + line items — quantities, units, prices per estimate
- [DONE] Service catalog — category, unit, default price, duration per item
- [DONE] Estimate-to-job conversion — accepted estimate spawns job/visits
- [PARTIAL] Estimate templates — tables exist; reusable layouts by service line unfinished
- [PARTIAL] Price books — book/item tables modeled; management UI thin
- [PARTIAL] Declarative pricing rules — rules engine modeled; authoring UI missing
- [PARTIAL] No-code pricing calculator — calculator sessions modeled; builder UI unbuilt
- [PARTIAL] Margin guardrails — costing computes target-margin variance; not enforced at quote time
- [NEW] Branded quote PDFs — logo, photos, terms, per-template layouts
- [NEW] Good/better/best options — option groups the customer picks from (Jobber-beater)
- [NEW] Optional add-on line items — customer-selectable upsells on the quote
- [NEW] Public quote link — tokenized page to view, select options, accept
- [NEW] E-signature — draw/type signature with IP, timestamp, hash-sealed audit
- [NEW] Deposit at acceptance — card/ACH deposit collected on signing
- [NEW] Discount approval workflow — >X% discounts require manager sign-off
- [NEW] Quote expiration + follow-up — auto-expire and nudge sequences on stale quotes
- [NEW] Quote-viewed notifications — rep alerted when customer opens quote
- [NEW] Formula pricing — per-sq-ft, per-acre, per-crew-hour computed pricing
- [NEW] Production rate library — man-hours per unit standards feeding labor estimates (LMN parity)
- [NEW] Kits/assemblies — bundled material+labor+equipment line items (Aspire/SingleOps parity)
- [NEW] Measure-to-quote — auto-price services from measured property areas
- [NEW] Chemical program builder — rounds, products, rates per 1,000 sq ft with EPA product data
- [NEW] Snow pricing models — per-push, per-event, per-inch tiers, seasonal caps
- [NEW] Renewal pricing engine — last year's program + uplift %, batch-generated each winter
- [NEW] Multi-year agreements — escalators and term pricing on contracts
- [NEW] Seasonal price book versions — 2026 vs 2027 books with effective dates
- [NEW] Cost-based margin floors — "below 40% margin" warnings from live cost data
- [NEW] Estimate versioning — revisions with change history and compare
- [NEW] Mobile on-site estimating — build and present quotes at the property with photos
- [NEW] Design-build phased proposals — phases, allowances, exclusions, drawings attached
- [NEW] Proposal content blocks — cover pages, case studies, warranty inserts
- [NEW] Sales tax on quotes — jurisdiction rates and exemption handling
- [NEW] Consumer financing offers — monthly-payment display and lender handoff (Wisetack-style)
- [NEW] Quote analytics — acceptance rate by template, rep, service, and price band

## 5. Scheduling, Dispatch & Routing

- [DONE] Dispatch board — visits, crews, route order, workload, conflicts visible
- [DONE] Crew assignment — assigning visits to crews writes through backend
- [DONE] Crew records + capacity — crews, members, capacityMinutesPerDay modeled and shown
- [DONE] Google Maps deep links — navigation links from property addresses
- [PARTIAL] Route plans + stops — sequencing tables modeled; management UI thin
- [PARTIAL] Drive-time estimates — cached matrix estimates exist; live provider hardening pending
- [NEW] Drag-and-drop dispatch calendar — day/week grid by crew lane with optimistic updates
- [NEW] Conflict + capacity blocking — hard warnings on double-booking and overload at drag time
- [NEW] Route optimization — nearest-neighbor + 2-opt over geocoded stops with "optimize day" button
- [NEW] Embedded map dispatch view — Mapbox GL pins, routes, and territories inline
- [NEW] Recurring visit generation — 8-round program auto-spaces visits across season windows
- [NEW] Season window scheduling — round timing by date windows or growing-degree-days
- [NEW] Weather-aware holds — spray-risk flags from wind/rain/temp against org rules
- [NEW] Rain-day batch reschedule — one-click push of a day's routes with customer notices
- [NEW] Snow event dispatch — storm activation, priority-tier routes, per-event crew callouts
- [NEW] Zone day planning — territory-based route days ("Tuesdays = north zone")
- [NEW] Multi-day job scheduling — design-build crews blocked across consecutive days
- [NEW] Arrival windows — promised time windows with automatic customer notification
- [NEW] Schedule-change notifications — auto email/SMS when a visit moves
- [NEW] Live crew GPS map — real-time technician locations during the day
- [NEW] Geofenced arrival detection — auto status change entering/leaving property
- [NEW] Skill/license-based assignment — pesticide-licensed tech required for application visits
- [NEW] Equipment-to-route assignment — trucks, trailers, sprayers attached to routes
- [NEW] Gap-fill backlog queue — waitlisted work auto-suggested into open slots
- [NEW] Same-day emergency slotting — priority insertion with route re-optimization
- [NEW] Route locking + versions — freeze published routes, track changes after lock
- [NEW] Printable route sheets — per-crew daily sheets with stop details
- [NEW] Crew time-off calendar — availability and PTO blocking assignment
- [NEW] Irrigation seasonal scheduling — start-up/winterization batch scheduling by zone count
- [NEW] Capacity utilization view — booked vs available crew-hours by week
- [NEW] Self-serve booking rules — bookable slot inventory derived from capacity and territory
- [NEW] Fleet telematics ingest — GPS provider (Samsara/Verizon) feeds actual arrival data

## 6. Field Operations & Mobile

- [DONE] Field PWA — technicians see visits, details, checklists, materials, weather, equipment
- [DONE] Checklist completion — per-visit checklist items write through field mutations
- [DONE] Visit completion submission — techs submit completion state from the field
- [PARTIAL] Photo capture — photo tables modeled; upload, compression, storage unwired
- [NEW] Before/after photo pairing — grouped comparison shots per visit and area
- [NEW] Photo annotation — draw/arrow markup on job photos
- [NEW] Offline outbox — IndexedDB queue for checklists, notes, photos, materials with sync
- [NEW] Offline conflict handling — last-write-wins merge with audit entries
- [NEW] GPS check-in/check-out — per-visit clock punches with location stamp
- [NEW] Auto-timesheets from visits — check-in/out fills timesheet entries
- [PARTIAL] Material usage logging — materialApplications modeled; field entry flow incomplete
- [PARTIAL] Chemical application records — EPA reg numbers, rates modeled; capture UX unfinished
- [NEW] Wind/temp/target-pest capture — full state-compliant application detail entry
- [NEW] State compliance PDFs — audit-ready pesticide application reports per state format
- [NEW] Customer signature at completion — on-device sign-off stored to visit
- [NEW] On-site custom forms — safety JSAs, inspection forms, punch lists per job type
- [NEW] Field-flagged upsells — "beds need mulch" flag creates estimate opportunity with photo
- [NEW] Two-way office messaging — visit-level chat between crew and dispatcher
- [NEW] Crew leader day view — full-day agenda with route, hours, and notes
- [NEW] Spanish-language field UI — full field surface toggle per user
- [NEW] Voice-to-text notes — dictated visit notes on mobile
- [NEW] Per-phase time tracking — clock against job phases/cost codes
- [NEW] Push notifications — assignment, schedule change, and message alerts
- [NEW] Installable PWA polish — A2HS prompts, icons, splash, offline shell
- [PARTIAL] Equipment checkout — checkout state exists; return/maintenance flow unfinished
- [NEW] Pre-trip inspections — DVIR truck/trailer checklists with defect flags
- [NEW] Incident reporting — accident/injury/property-damage capture with photos
- [NEW] Barcode/QR scanning — scan materials and equipment for usage logging
- [NEW] Crew site map overlay — measured areas and access notes on mobile map
- [NEW] Irrigation zone test capture — per-zone inspection results and repair flags
- [NEW] Snow service log — per-visit conditions, spread rates, timestamps for slip-and-fall defense
- [NEW] Field quick quotes — tech creates simple priced quote on site

## 7. Jobs, Production & Recurring Programs

- [DONE] Job records — jobs with status, customer, property linkage
- [DONE] Job phases — phase breakdown per job modeled and used
- [DONE] Job visits — visit instances under jobs feeding dispatch
- [DONE] Tasks — assignable follow-ups linked across objects
- [PARTIAL] Service packages/programs — program tables modeled; generation engine missing
- [NEW] Recurring program engine — generate full season of visits from a program
- [NEW] Round tracking — "Round 3 of 7" state per program per property
- [NEW] Skip/pause/resume — program interruptions with billing proration
- [NEW] Batch renewals — winter-generated renewal proposals across the book (RealGreen staple)
- [NEW] Auto-renew with uplift — silent renewal plus price-increase letter flow
- [NEW] Prepay season billing — discounted prepay invoicing and balance draw-down
- [NEW] Job templates — service-line templates with default phases, checklists, materials
- [NEW] Work orders — printable/mobile work orders with task and material detail
- [NEW] Design-build production schedule — Gantt-lite phase timeline with dependencies
- [PARTIAL] Job budget vs actual — cost summaries live; budget baselines and alerts missing
- [NEW] Mid-job profitability alerts — margin erosion warnings while work is open
- [NEW] Change orders — scoped additions with approval, e-sign, and billing linkage
- [NEW] Punch lists — final walkthrough items gating completion
- [NEW] Warranty + callback tracking — non-billable redo visits flagged and reported
- [NEW] Job completion certificates — branded completion documents for commercial clients
- [NEW] Subcontractor assignments — sub scope, cost, insurance status per job
- [NEW] Contract billing types — fixed-monthly, per-visit, T&M, unit-price contracts
- [NEW] Master service agreements — portfolio MSAs governing many sites/jobs
- [NEW] Enhancement pipeline — upsell opportunities tracked against maintenance contracts (Aspire parity)
- [NEW] Snow season contracts — event-triggered service obligations with verification records
- [NEW] Irrigation program templates — start-up, backflow test, winterization packages
- [NEW] Fert/squirt program templates — 5–8 round chemical programs with add-ons
- [NEW] Customizable job workflows — org-defined job statuses and transitions
- [NEW] Actuals-to-estimating feedback — actual hours reprice production rate library
- [NEW] Job document packets — permits, plans, contracts collected per job

## 8. Invoicing, Payments & AR

- [PARTIAL] Customer invoices — invoice/line tables modeled and surfaced; no send/pay lifecycle
- [PARTIAL] Payments + allocations — payment and allocation tables modeled; no gateway
- [DONE] SaaS subscription billing — Stripe checkout, portal, webhooks, plan gating, dunning for TurfPro itself
- [NEW] Stripe Connect onboarding — per-org merchant accounts for field payments
- [NEW] Card payments on invoices — hosted pay links with saved cards
- [NEW] ACH payments — bank-debit rails with lower fees for commercial
- [NEW] Auto-pay enrollment — card-on-file charged per visit or per month
- [NEW] Surcharging config — card fee pass-through where legal
- [NEW] Quote deposits — deposit invoice generated and collected at e-sign
- [NEW] Visit-complete auto-invoicing — draft invoice from actuals when visit closes
- [NEW] Batch monthly invoicing — commercial consolidated runs on billing day
- [NEW] Progress/milestone billing — design-build percent-complete invoicing
- [NEW] Branded invoice PDFs — templated layouts with photos of completed work
- [NEW] Invoice delivery — email/SMS with pay-now link and open tracking
- [NEW] Dunning sequences — 3/7/14-day reminders escalating in tone
- [NEW] Late fee automation — policy-driven fees applied to overdue balances
- [NEW] Customer statements — monthly statements across open invoices
- [NEW] Credit memos + refunds — adjustments flowing back to gateway and books
- [NEW] Partial payments + plans — installment schedules against a balance
- [NEW] Prepay balance application — season prepay credits burn down per visit
- [NEW] AR aging dashboard — 30/60/90 buckets with drill-through and owner rollup
- [NEW] Collections workflow — promise-to-pay tracking, hold-service flags, write-offs
- [NEW] Sales tax engine — jurisdiction rates, exemption certificates, filing exports
- [NEW] Tips on payment — optional gratuity routed to crew
- [NEW] Consumer financing — invoice-level financing offers (Wisetack parity)
- [NEW] Tap-to-pay in field — card-present capture on technician phone
- [NEW] Deposit reconciliation — payout batches matched to invoices and fees ledger
- [NEW] Snow event billing — storm totals auto-generate per-event/per-inch invoices
- [NEW] Multi-property consolidated invoices — one invoice across a portfolio with per-site detail
- [NEW] Payment receipts — automatic receipt email with balance summary
- [NEW] Invoice dispute threads — customer questions tracked on invoice record
- [NEW] Service-hold on delinquency — auto-flag routes when balance exceeds threshold

## 9. Accounting, Costing & Back Office

- [DONE] Job cost summaries — revenue, labor, materials, equipment, overhead, margin, variance per job
- [DONE] Revenue dashboard — booked, completed, invoiced, collected, AR, gross profit
- [DONE] P&L proxy — operating profit, cost breakdown, break-even revenue analytics
- [DONE] Timesheet entries — labor hours feeding actual job cost
- [PARTIAL] Labor rate cards — modeled with BLS regional defaults; admin override flow unfinished
- [PARTIAL] Equipment rate cards — hourly equipment costing modeled
- [PARTIAL] Vendor catalogs — local material cost representation modeled
- [PARTIAL] Commodity cost intelligence — FRED/World Bank fertilizer snapshots; refresh + stale UI pending
- [PARTIAL] Purchase orders — PO objects exist; approvals, receiving, vendor billing missing
- [NEW] QuickBooks Online sync — customers, invoices, payments, items two-way where safe
- [NEW] QuickBooks Desktop/IIF export — file-based export for legacy shops
- [NEW] Chart-of-accounts mapping — GL account, class, location mapping per item/service
- [NEW] Xero/Sage GL export — generic journal export for other accounting systems
- [NEW] Overhead recovery rules — per-crew-hour overhead allocation into job costs (LMN parity)
- [NEW] Inventory tracking — on-hand quantities by location (shop, truck, yard)
- [NEW] Truck restock lists — par levels generate morning replenishment sheets
- [NEW] PO receiving — receive against PO, update on-hand and job cost
- [NEW] Vendor bills / AP — bill capture, due dates, payment status
- [NEW] Vendor price imports — CSV price updates repricing catalogs and kits
- [NEW] Chemical inventory — lot numbers, EPA reg linkage, SDS document library
- [NEW] Salt/de-icer usage costing — per-event material burn against snow contracts
- [NEW] Equipment maintenance schedules — hours/mileage-based service intervals with alerts
- [NEW] Equipment service logs — repairs, downtime, cost history per asset
- [NEW] Fleet management — vehicles, registrations, insurance, DOT compliance dates (Fleetio parity)
- [NEW] Fuel tracking — fuel card imports allocated to vehicles and jobs
- [NEW] Equipment cost-per-hour recovery — depreciation and usage-based hourly rates
- [NEW] Small tool assignment — asset checkout to crews with loss accountability
- [NEW] Timesheet approval workflow — supervisor review, edit, lock before payroll
- [NEW] Overtime rules — daily/weekly OT calculation by state rules
- [NEW] Payroll export — Gusto/ADP/Paychex-formatted hours and earnings files
- [NEW] Certified payroll reports — Davis-Bacon/prevailing-wage WH-347 output
- [NEW] Labor burden rates — taxes, workers comp, benefits loaded into job cost
- [NEW] Workers comp class codes — per-employee class tracking for audit
- [NEW] WIP reporting — over/under billing schedule for design-build
- [NEW] Department budgets — budget vs actual by service line and month
- [NEW] Receipt capture — photo receipts coded to jobs and GL accounts
- [NEW] Subcontractor cost + 1099 — sub payment tracking with year-end totals
- [NEW] Bank deposit matching — gateway payouts reconciled to recorded payments

## 10. Automation Platform

- [PARTIAL] Automation rule storage — automationRules/automationRuns tables exist; untyped, no engine
- [DONE] Scheduled cron jobs — recurring backend tasks run on schedule
- [NEW] Typed trigger catalog — record created/updated, stage change, form submit, visit complete, invoice overdue
- [NEW] Time-based triggers — X days before/after any date field
- [NEW] Email/SMS engagement triggers — replied, opened, clicked events start flows
- [NEW] Weather triggers — freeze warning, rain forecast, snowfall threshold events
- [NEW] Condition trees — AND/OR groups over standard and custom fields
- [NEW] Action: create task — assigned follow-up with due date
- [NEW] Action: send email/SMS — templated message with merge fields
- [NEW] Action: enroll in sequence — start/stop cadences from rules
- [NEW] Action: update field/assign owner/add tag — record mutations
- [NEW] Action: create record — spawn lead, task, estimate, or job
- [NEW] Action: outbound webhook — HMAC-signed POST to external URL
- [NEW] Wait/delay + branch steps — timed pauses and conditional paths
- [NEW] Approval gates — approve/reject steps powering discount and PO approvals
- [NEW] Durable execution runtime — scheduler-backed runs with retries and backoff
- [NEW] Per-step run logs — inspectable execution history with failure notifications
- [NEW] Loop protection — max depth, self-retrigger prevention, per-org rate limits
- [NEW] Builder UI — linear-with-branches editor (HubSpot-style, not Flow canvas)
- [NEW] Test with sample record — dry-run against a real record before activating
- [NEW] Automation version history — change tracking and rollback per rule
- [NEW] Recipe gallery — ~15 prebuilt green-industry automations installable in one click
- [NEW] Stale-lead recipe — "A-lead untouched 2h → text owner"
- [NEW] Review-request recipe — round completed → review ask with rating gate
- [NEW] Quote-chase recipe — viewed twice, unsigned 5 days → follow-up sequence
- [NEW] Renewal + unpaid-invoice recipes — seasonal renewal nudges and AR chasing
- [NEW] Quiet hours + frequency caps — org-level messaging guardrails across all automations
- [NEW] Enrollment manager — see and remove records active in each automation
- [NEW] Automation analytics — completion, conversion, and revenue per recipe

## 11. Marketing & Growth (campaigns, reviews, referrals, attribution)

- [DONE] Marketing lead capture — site demo form writes marketingLeads
- [NEW] Campaign objects — name, channel, budget, member counts, date ranges
- [NEW] Cost-per-lead/cost-per-won — campaign ROI computed from pipeline outcomes
- [NEW] Multi-touch attribution — first/last-touch reporting across sources
- [NEW] Email campaign builder — drag-drop marketing emails to segments (Mailchimp parity)
- [NEW] Audience segmentation — dynamic lists from any field, tag, or behavior
- [NEW] SMS marketing — promotional texts with TCPA consent ledger
- [NEW] Postcard campaigns — direct-mail sends via print API with source codes
- [NEW] Neighborhood radius marketing — target homes around scheduled jobs automatically
- [NEW] Seasonal upsell campaigns — aeration, mosquito, overseeding blitzes to eligible segments
- [NEW] Win-back campaigns — cancelled-customer reactivation offers by cancel reason
- [NEW] Newsletter engine — recurring lawn-tips content sends with engagement stats
- [NEW] Review requests — post-visit email/SMS asks with smart timing (NiceJob parity)
- [NEW] Review funnel gating — happy → Google, unhappy → private feedback form
- [NEW] Review monitoring — Google/Facebook/Yelp reviews aggregated in-app (Birdeye parity)
- [NEW] Review response console — reply from app with AI draft suggestions
- [NEW] Review website widgets — embeddable star ratings and testimonial feeds
- [NEW] Google Business Profile integration — posts, Q&A, review sync
- [NEW] Referral program — trackable links, reward credits, double-sided incentives
- [NEW] Promo codes — discount codes applied to quotes with campaign attribution
- [NEW] Landing page builder — hosted offer pages with embedded intake forms
- [NEW] Lead magnet widgets — instant-quote calculators as embeddable capture tools
- [NEW] NPS/CSAT surveys — post-service surveys feeding churn signals
- [NEW] Cancel-save workflow — retention offers presented at cancellation intent
- [NEW] Yard sign / door hanger codes — offline source tracking via unique codes/QR
- [NEW] Marketing calendar — planned campaigns by season and service line
- [NEW] GA4 integration — website behavior joined to lead records
- [NEW] Audience export — customer segments to Meta/Google for lookalikes
- [NEW] HOA/bulk-neighborhood deals — group signup offers with shared pricing
- [NEW] Email deliverability monitoring — bounce, complaint, and domain reputation dashboards
- [NEW] UTM link builder — standardized campaign URL generator
- [NEW] Marketing ROI dashboard — spend vs revenue by channel and season

## 12. Customer Portal & Self-Service

- [NEW] Magic-link portal access — tokenized per-customer portal, no password required
- [NEW] Optional portal accounts — password/passkey upgrade for frequent users
- [NEW] Upcoming visits view — schedule with arrival windows and crew info
- [NEW] Visit history — completed work with before/after photos and notes
- [NEW] Quote review + e-sign — view, pick good/better/best options, sign in portal
- [NEW] Invoice viewing + payment — pay by card/ACH with saved methods
- [NEW] Auto-pay self-enrollment — customer opts into card-on-file billing
- [NEW] Statement + payment history — balance, receipts, downloadable statements
- [NEW] Service requests — issue submission creating lead/task with photos
- [NEW] Reschedule/skip requests — customer-initiated changes routed to dispatch
- [NEW] Program status view — rounds completed/remaining, next application date
- [NEW] Chemical application notices — state-required pre/post application notifications
- [NEW] Prepay offers — discounted season prepay checkout in portal
- [NEW] Communication preferences — channel, frequency, language self-management
- [NEW] Referral sharing — personal referral link with reward tracking
- [NEW] Document library — contracts, COIs, warranties, compliance sheets
- [NEW] Portal branding — org logo, colors, custom domain
- [NEW] Portal notifications — email/SMS alerts for new quotes, invoices, photos
- [NEW] Multi-property switcher — commercial/property-manager view across sites
- [NEW] HOA board view — community-level reporting for board contacts
- [NEW] Snow verification view — timestamps, materials, photos per event for liability records
- [NEW] Tip-the-crew option — gratuity at payment routed to crew
- [NEW] Post-payment review prompt — review ask after successful payment
- [NEW] Spanish-language portal — full portal translation toggle
- [NEW] New-service request catalog — browse and request additional services with instant pricing
- [NEW] Portal activity events — opens/approvals logged to CRM timeline

## 13. Reporting, Analytics & Forecasting

- [DONE] Owner dashboard — pipeline, visits, estimates, overdue tasks, routes, recent activity
- [DONE] Revenue dashboard — booked/completed/invoiced/collected, AR, margin views
- [DONE] Churn/LTV analytics — churn risk, LTV, LTV:CAC, segment health (seeded inputs)
- [DONE] P&L dashboard — operating profit and cost breakdown views
- [PARTIAL] Analytics snapshot pipeline — snapshot tables computed from seeded data, not live activity
- [PARTIAL] Dashboard widget model — widget tables exist; composer UI unbuilt
- [PARTIAL] Reporting watermarks — mirror/export sync design modeled only
- [NEW] Report builder — object + joins, filters, group-by, aggregates, chart type
- [NEW] Saved + shared reports — role-visible report library
- [NEW] Scheduled report delivery — emailed reports on cron
- [NEW] Report export — CSV/PDF output from any report
- [NEW] Dashboard composer — drag/resize widget grid per user
- [NEW] Role-default dashboards — owner, sales, dispatch, tech home dashboards
- [NEW] Drill-through everywhere — every metric clicks to its record list
- [NEW] Pipeline-weighted forecast — stage probability × value by close month
- [NEW] Seasonal revenue forecast — deterministic projection from programs + renewals
- [NEW] Goals + quotas — per-rep targets with pacing bars
- [NEW] Sales leaderboards — revenue, close rate, speed-to-lead rankings
- [NEW] Close rate analysis — by source, rep, service line, price band
- [NEW] Estimate-vs-actual variance — job costing accuracy reports by estimator
- [NEW] Crew productivity — revenue and completed visits per crew-hour
- [NEW] Route density reports — drive time vs on-site time (windshield report)
- [NEW] Renewal retention reports — program renewal rate by segment and price change
- [NEW] Chemical usage reports — product totals by EPA number for state audits
- [NEW] Snow event profitability — per-storm revenue, materials, labor rollup
- [NEW] AR + collections reports — aging trends, DSO, collector effectiveness
- [NEW] Marketing ROI reports — channel spend to closed revenue
- [NEW] Capacity forecast — booked backlog vs crew capacity by week
- [NEW] Cohort retention — customer cohorts by start season and source
- [NEW] Cross-tenant benchmarks — anonymized industry KPI comparisons (opt-in)
- [NEW] Custom-field reporting — user-defined fields available in all reports
- [NEW] Live snapshot recompute — nightly P&L/churn/LTV from real transactions, not seeds

## 14. Data Platform (custom fields/objects, import, dedupe, search, views)

- [DONE] Tenant-scoped data model — organizationId + indexes on all tenant tables
- [DONE] Governed tags — tag definitions with entity tagging across objects
- [DONE] Global command search — cross-object jump across customers, leads, jobs, visits, tasks
- [DONE] Lead saved views — persisted filters for lead lists
- [PARTIAL] Data quality queue — dataQualityIssues table with triage surface unfinished
- [PARTIAL] City normalization rules — address cleanup rules modeled
- [PARTIAL] Import pipeline — importJobs/importRows staging + QA preview; production wizard missing
- [PARTIAL] Export jobs — export tables modeled; scheduled/self-serve flows unbuilt
- [PARTIAL] Duplicate decisions — review decisions table exists; full merge unpersisted
- [NEW] Custom field definitions — text/number/currency/date/select/user/boolean/formula-lite per object
- [NEW] Custom field rendering — dynamic display in forms, lists, filters, reports
- [NEW] Validation rules — regex/range/required-when enforced in shared mutation middleware
- [NEW] Field history tracking — audit of value changes on chosen fields
- [NEW] Custom objects (lite) — org-defined record types with relations
- [NEW] Import wizard UI — column mapper, auto-match, saved mappings, validation preview
- [NEW] Import dedupe policies — skip/update/create matching on commit
- [NEW] Import rollback — one-click delete-by-importJobId reversal
- [NEW] Competitor migration kits — Jobber/RealGreen/Service Autopilot/LMN export mappers
- [NEW] Merge engine — field survivorship UI, child re-parenting, tombstone redirects
- [NEW] Recycle bin — soft-delete with restore window per object
- [NEW] Bulk edit — mass field updates from any filtered list
- [NEW] Saved views everywhere — dispatch, jobs, invoices, reports get lead-style views
- [NEW] List customization — column pick, reorder, inline edit, density
- [NEW] Advanced filter builder — nested AND/OR conditions on any field
- [NEW] Full-text search — content search across notes, emails, documents
- [NEW] Address validation + geocoding — normalize and pin every property on entry
- [NEW] Data health dashboard — missing emails, ungeocodable addresses, stale records
- [NEW] Record ownership tools — bulk reassignment on rep departure
- [NEW] Scheduled full-org export — recurring backup export to storage
- [NEW] Property/parcel enrichment — lot size and county data appended on import

## 15. Team, Permissions & People Ops (commissions, scorecards, certs)

- [DONE] Seven built-in roles — owner, admin, manager, sales, dispatcher, crew lead, technician
- [DONE] Permission matrix enforcement — production mutations check role permissions
- [DONE] Team invites — tokenized email invites with role, expiry, single-use accept
- [DONE] Seat limits — plan-based seat caps enforced
- [DONE] Audit trail on actions — who-did-what events captured on mutations
- [NEW] Custom roles — org-defined permission sets over ~40 granular verbs
- [NEW] Record-level sharing — private/team/org visibility with ownerUserId checks
- [NEW] Field-level security — hide costs/margins from technician roles server-side
- [NEW] 2FA enforcement — org policy requiring second factor
- [NEW] SSO (SAML/OIDC) — enterprise identity, plan-gated
- [NEW] Session/device management — active session list with revoke
- [NEW] Commission plans — % of sale or gross profit by service line and role
- [NEW] Commission statements — per-rep earned/pending/paid with dispute notes
- [NEW] Spiffs + bonuses — upsell, review, and safety incentives tracked to payroll
- [NEW] Tech scorecards — completion rate, callbacks, reviews, upsell revenue per tech
- [NEW] Sales scorecards — close rate, speed-to-lead, pipeline coverage per rep
- [NEW] License + cert tracking — pesticide applicator, ISA arborist, CDL with expiry alerts
- [NEW] Cert-gated assignment — dispatch blocks unlicensed techs from application visits
- [NEW] Training checklists — role-based onboarding paths for new hires
- [NEW] Document acknowledgment — handbook/safety policy sign-offs tracked
- [NEW] Safety meeting logs — toolbox talk records with attendance
- [NEW] Skills matrix — capability tags feeding dispatch matching
- [NEW] Time-off requests — PTO submission/approval synced to scheduling
- [NEW] Hiring pipeline lite — applicant stages for seasonal crew recruiting
- [NEW] Employee files — I-9, W-4, cert documents stored per employee
- [PARTIAL] Notification preferences — per-user preference table exists; full channel controls unbuilt
- [NEW] Per-user language — Spanish UI preference per team member
- [NEW] Org chart + teams — team groupings with territory assignment
- [NEW] Performance reviews lite — periodic scorecard reviews with notes
- [NEW] Anniversary/birthday reminders — team milestone prompts to owners

## 16. Platform & Ecosystem (API, webhooks, Zapier, marketplace, white-label/franchise)

- [DONE] Health endpoint — public health check for monitors
- [DONE] Stripe billing webhooks — subscription lifecycle events processed
- [PARTIAL] Integration registry — externalIntegrations table exists; connections are seeded constants
- [PARTIAL] Clerk sync — auth live; user/org webhook sync hardening pending
- [NEW] Public REST API v1 — CRUD on leads, customers, properties, estimates, jobs, visits, invoices
- [NEW] Cursor pagination — consistent list endpoints across resources
- [NEW] Per-org API keys — scoped keys with create/revoke UI
- [NEW] API rate limiting — per-key limits with usage dashboard
- [NEW] OpenAPI docs — hosted interactive API reference
- [NEW] Outbound webhooks — event subscriptions, HMAC signing, retries with backoff
- [NEW] Zapier app — triggers (new lead, won deal, visit complete) and actions (create lead/task)
- [NEW] Make/n8n connectors — low-code platform coverage beyond Zapier
- [NEW] Inbound email webhook — parse-and-ingest endpoint for email channels
- [NEW] Inbound SMS webhook — Twilio callback processing endpoint
- [NEW] Form intake endpoints — public web-to-lead POST with spam screening
- [NEW] Google/Microsoft OAuth connections — token management for mail/calendar sync
- [NEW] CompanyCam integration — photo feed sync to properties and jobs
- [NEW] Fleet GPS integrations — Samsara/Verizon Connect location feeds
- [NEW] Property measurement APIs — SiteRecon/Attentive.ai takeoff import
- [NEW] Gusto/payroll connectors — hours export and roster sync
- [NEW] Integration marketplace UI — browsable directory with per-org enablement
- [NEW] OAuth app framework — third parties build against TurfPro auth
- [NEW] Embeddable widget SDK — booking and form embeds versioned for customer sites
- [NEW] SFTP/CSV data feeds — scheduled flat-file exchange for enterprise clients
- [NEW] Audit/event stream export — firehose of org events to external warehouses
- [NEW] White-label theming — logo/colors/domain for resellers
- [NEW] Franchise hierarchy — corporate parent with location orgs and rollup reporting
- [NEW] Cross-location standards push — corporate pricebooks/templates propagated to franchisees
- [NEW] Sandbox orgs — test environments mirroring production config
- [NEW] API versioning + changelog — deprecation policy and developer updates

## 17. AI & Intelligence

- [PARTIAL] Churn risk scores — displayed today but computed from seeded math, not live signals
- [NEW] Lead scoring v2 — model trained on org conversion history with explanations
- [NEW] Next-best-action queue — daily "call these 5" prioritized worklist
- [NEW] Live churn recompute — invoice/visit/complaint signals refresh lifecycle scores
- [NEW] CRM copilot — natural-language queries ("B-grade leads in Powell we never called")
- [NEW] Draft reply generation — email/SMS drafts from timeline context
- [NEW] Call transcription + summary — recorded calls summarized to activities
- [NEW] Visit note summarization — crew notes condensed for office and customer
- [NEW] Estimate description writer — scope-of-work prose from line items
- [NEW] Inbound email extraction — parse emails into structured lead fields
- [NEW] Photo condition analysis — weed/disease/pest identification from job photos
- [NEW] Photo-to-notes — field photos auto-captioned into visit records
- [NEW] AI receptionist — voice agent answers, qualifies, and books after-hours calls
- [NEW] Website chat-to-book agent — AI chat quotes standard services and schedules estimates
- [NEW] Smart scheduling suggestions — best slot by route density and drive time
- [NEW] Dynamic pricing suggestions — demand, season, and margin-aware price nudges
- [NEW] Anomaly alerts — job over budget, margin dip, churn spike detection
- [NEW] Review response drafts — tone-matched replies per review sentiment
- [NEW] Win-probability prediction — per-deal close likelihood on pipeline
- [NEW] Weather-adjusted demand forecast — seasonal volume projection by service line
- [NEW] Upsell recommendations — per-property service suggestions from history and area data
- [NEW] Auto-tagging + cleanup — AI-suggested tags, dedupe, and data fixes
- [NEW] Natural-language reports — "show revenue by crew this quarter" builds a report
- [NEW] Follow-up agent — AI works a lead cadence until human reply detected
- [NEW] AI translation — English↔Spanish for crew instructions and customer messages
- [NEW] Chemical mix assistant — tank-mix math and label-rate checks with product data
- [NEW] Call coaching insights — talk ratios and objection patterns from recordings
- [NEW] Meeting/estimate prep briefs — auto-summarized customer context before appointments
- [PARTIAL] AI feature flagging — featureFlags table exists; per-feature AI rollout controls unbuilt
- [NEW] Model usage metering — per-org AI usage tracking and plan limits

## 18. Trust, Compliance & Scale

- [DONE] Multi-tenant isolation — membership required before tenant data access
- [DONE] RBAC on mutations — role permission checks on core writes
- [DONE] Audit event capture — before/after data recorded on actions
- [PARTIAL] Audit log viewer — events surface in admin; filters, diff view, export missing
- [DONE] Security headers — baseline browser headers configured
- [DONE] Error monitoring — Sentry SDK wired for client and server
- [DONE] Health endpoint — uptime probe target live
- [DONE] Secret hygiene — env templates without real secrets, gitignored locals
- [NEW] Content Security Policy — tested CSP across auth/analytics domains
- [NEW] Uptime monitoring + status page — external checks on public routes, sign-in, lead creation
- [PARTIAL] Backup/restore runbook — documented; restore drill not yet executed
- [NEW] Disaster recovery drills — rollback and customer-communication rehearsals
- [NEW] Data retention policies — photo, audit, export, deleted-tenant retention schedules
- [NEW] GDPR/CCPA deletion — DSR intake with delete cascades and proof
- [NEW] Self-serve org export — full data takeout reducing lock-in fear
- [NEW] SOC 2 posture — Type I then Type II with continuous evidence collection
- [NEW] Vulnerability management — dependency audits, pen tests, remediation SLAs
- [NEW] PII field encryption — extra encryption tier for sensitive fields
- [NEW] Public endpoint rate limiting — abuse protection on forms, API, portal
- [NEW] Bot protection — Turnstile/honeypots on all public capture surfaces
- [NEW] TCPA consent ledger — SMS consent capture, proof, and revocation records
- [NEW] CAN-SPAM compliance — unsubscribe links and suppression lists on bulk email
- [NEW] E-sign legal compliance — ESIGN/UETA audit trails with document hashes
- [NEW] PCI scope minimization — Stripe-hosted fields, no card data at rest
- [NEW] State chemical record retention — per-state application record keeping (2–7 years)
- [NEW] COI vault — org insurance certificates with expiry for commercial bids
- [NEW] Terms acceptance tracking — versioned ToS/DPA acceptance per org
- [NEW] Support impersonation — consented, fully-audited support access mode
- [NEW] Performance SLOs — load-tested targets at 100k+ records per org
- [NEW] Subprocessor transparency — published list with change notifications

## 19. Product Surfaces & UX Platform

- [DONE] App shell navigation — dashboard, leads, CRM, pipeline, dispatch, jobs, field, finance, admin reachable
- [DONE] Global command palette — keyboard search across objects
- [DONE] Onboarding flow — tenant provisioning, services, imports, checklist setup
- [DONE] Demo workspace — seeded org at operating scale for trials and sales
- [PARTIAL] Record detail drawers — lead drawer shipped; customer/job/invoice/visit panels pending
- [PARTIAL] Inline activity composer — notes/calls/emails on customer and job; other objects pending
- [PARTIAL] Sample-data reset — idempotent seeding; safe reset/reseed command unfinished
- [NEW] Route-split architecture — per-view Next.js routes replacing the 5,108-line monolith component
- [NEW] Deep-linkable URLs — shareable links to any record and filtered view (query-param views shipped; per-record URLs new)
- [NEW] Role-based home screens — owner, sales, dispatch, tech land on different defaults
- [NEW] Extracted design system — shared component library with tokens
- [NEW] Dark mode — full theme support
- [NEW] Keyboard shortcuts — power-user bindings across modules
- [PARTIAL] Notification center — internalNotifications table exists; bell UI/read-state unbuilt
- [NEW] In-app product tours — guided walkthroughs per module
- [NEW] Contextual help — tooltips and docs links on complex screens
- [NEW] Guided empty states — setup CTAs when modules have no data
- [NEW] Undo for destructive actions — toast-based undo window
- [NEW] Optimistic update standards — instant UI with rollback on failure
- [NEW] Loading skeleton standards — consistent perceived-performance patterns
- [NEW] WCAG 2.1 AA pass — accessibility audit and remediation
- [NEW] i18n framework — string externalization enabling Spanish app localization
- [NEW] Setup wizard — org profile, services, rates, team, import in one flow
- [NEW] Usage-based upgrade prompts — contextual plan upsells at feature gates
- [NEW] Product analytics instrumentation — event tracking for activation funnels (PostHog)
- [NEW] Error boundaries — graceful per-module failure recovery
- [NEW] Print stylesheets — route sheets, work orders, reports print cleanly
- [NEW] Multi-workspace switcher — users belonging to multiple orgs switch cleanly (basic switcher shipped; polish new)
- [NEW] App store presence — wrapped PWA listed on iOS/Android stores
- [NEW] Tablet-optimized layouts — dispatch and field surfaces tuned for iPad

## 20. Marketing Site & Growth Engine

- [DONE] Marketing homepage — positioning, hero, feature overview
- [DONE] Feature pages — features index plus 12 templated detail pages
- [DONE] Pricing page — Free + $99 All-In plan presentation
- [DONE] About page — company story and team
- [DONE] Security page — trust posture for evaluators
- [DONE] Demo request form — captures marketing leads to backend
- [DONE] Self-serve signup — one route handles account, plan choice, workspace provisioning
- [PARTIAL] Competitive positioning content — Arborgold/Aspire vs Jobber framing in progress on pages
- [NEW] Comparison pages — vs Jobber, ServiceTitan, RealGreen, Aspire, Service Autopilot, LMN, Yardbook
- [NEW] Alternative pages — "Jobber alternative"-style SEO landers per competitor
- [NEW] Industry vertical landers — lawn care, landscaping, tree care, pest, irrigation, snow pages
- [NEW] Programmatic local SEO — "lawn care software + [state/metro]" page generation
- [NEW] ROI calculator — payroll/windshield-time savings calculator as lead magnet
- [NEW] Free pricing tools — lawn program price calculator, snow contract calculator widgets
- [NEW] Template library — free estimate, contract, and program templates gated by email
- [NEW] Blog + SEO content engine — keyword-mapped editorial pipeline
- [NEW] Glossary/learn center — green-industry terms and how-to guides for long-tail SEO
- [NEW] Case studies — customer stories with revenue/retention proof
- [NEW] Interactive product tour — click-through demo without signup (Navattic-style)
- [NEW] Demo video library — module-by-module recorded walkthroughs
- [NEW] Webinar program — live onboarding and seasonal-playbook sessions
- [NEW] Help center — public operator docs for setup, imports, field app, finance
- [NEW] Changelog page — public what's-new feed
- [NEW] Review-site presence — G2/Capterra profiles with review generation motion
- [NEW] Partner/affiliate program — consultant and agency referral tracking
- [NEW] Migration concierge pages — "switch from RealGreen" white-glove import offer
- [NEW] Newsletter nurture — email capture with automated education sequence
- [NEW] Site live chat — chat-to-sales on pricing and comparison pages
- [NEW] Technical SEO — sitemaps, schema.org, Core Web Vitals, OG images
- [NEW] A/B testing framework — headline/CTA experiments on key pages
- [NEW] Site-to-signup attribution — UTM persistence from first visit into the CRM org record
- [NEW] Annual benchmark report — industry KPI report from anonymized data as PR anchor
- [NEW] Community forum — operator peer community for retention and SEO

---

## Part III — Execution waves (sequenced, dependency-ordered)

Reusable machinery every wave builds on (do not reinvent): tenant guards `requireMembership`/`requireWorkspace` + permission matrix (`convex/lib/auth.ts`, mirrored in `src/domain/permissions.ts`); `audit()` (`convex/lib/audit.ts`); crons (`convex/crons.ts`); webhooks router (`convex/http.ts`); email (`convex/email.ts` + `convex/lib/emails.ts`); Stripe patterns (`convex/billing.ts`/`billingStore.ts`); invite/token pattern (`convex/team.ts`); schema conventions (`convex/schema.ts` — org-scoped, indexed, cents+epoch-ms); marketing design system (`src/components/marketing/*.module.css`, `tokens.css`, `Reveal`); test harnesses (`convex/backend.test.ts` convex-test, `e2e/app.spec.ts` Playwright, vitest config).

| Wave | Theme | Contents (catalog domains) | Key dependencies / external services | Exit criterion |
|---|---|---|---|---|
| **W0** | Platform foundations | Route-split the 5,108-line app into per-view routes + shared shell context; file/photo upload via Convex storage; notification center; custom fields core + validation; import wizard + merge engine + recycle bin; saved views everywhere; live snapshot recompute (analytics from real data); audit viewer UI (D14, D19, D13/18 partials) | None — pure engineering | Every view is a URL; photos upload; a Jobber CSV imports in <30 min; dashboards compute from live rows |
| **W1** | Communications hub | Doc email delivery, sending domains, templates + merge fields, 2-way Gmail/Outlook, shared inbox, open/click tracking, sequences; Twilio SMS (10DLC, opt-out, reminders, en-route); click-to-call + recording; calendar sync; unified inbox; @mentions (D2) | Twilio account, Google/Microsoft OAuth apps; W0 custom fields for tokens | A rep lives in TurfPro all day without opening Gmail; visit reminders text automatically |
| **W2** | Automation platform | Typed triggers/conditions/actions, durable runtime on Convex scheduler, builder UI, dry-run, recipe gallery (15 green-industry recipes), quiet hours, enrollment manager, analytics (D10); lead routing + SLA escalations + speed-to-lead (D1) | W1 (send actions) | The 15 recipes replace what a RealGreen consultant would configure; A-lead untouched 2h → owner texted |
| **W3** | Estimating, CPQ & e-sign | Quote PDFs, good/better/best, public quote link, e-sign, quote-viewed alerts, expiration chases; formula pricing, production rates, kits, chemical program builder, snow pricing, renewal engine, margin floors, versioning; discount approvals (via W2 gates) (D4) | Stripe Connect started here for deposits | Estimate → sent → signed → deposit paid → job scheduled without leaving the app |
| **W4** | Field payments & AR | Stripe Connect onboarding, card/ACH on invoices, auto-pay, visit-complete auto-invoicing, batch/progress billing, invoice PDFs + delivery, dunning, late fees, statements, credits/refunds, payment plans, prepay burn-down, AR aging + collections, sales tax v1, QuickBooks Online sync (D8, D9-QBO) | Stripe Connect approval; QBO developer app | Quote→work→invoice→pay→QBO loop closed; AR dashboard live |
| **W5** | Scheduling & field depth | Drag-drop dispatch calendar, conflict blocking, route optimization + embedded Mapbox, recurring program engine + rounds + batch renewals, weather holds + rain-day reschedule, arrival windows + notifications, snow event dispatch; offline outbox, GPS check-in→auto-timesheets, chemical compliance capture + state PDFs, customer signature, custom forms, field upsell flags, equipment checkout (D5, D6, D7) | Mapbox key; weather API (NWS free) | An 8-round program generates a season; a rain day reschedules in one click; a state auditor accepts the application report |
| **W6** | Portal & growth loop | Customer portal (full D12 list); review requests/funnel/monitoring/response console; referral program; campaigns + segments + broadcast + win-back + NPS + cancel-save; attribution + campaign ROI (D11) | Google Business Profile API; W1 + W4 | Customers self-serve quotes/payments/reschedules; review velocity measurably up |
| **W7** | Back office depth | PO approvals/receiving/AP, inventory + truck restock, chemical inventory + SDS, equipment/fleet maintenance + fuel, timesheet approval + OT + payroll export + certified payroll, labor burden, WIP, budgets, receipt capture, sub 1099 (D9); commissions, scorecards, license/cert tracking + cert-gated dispatch, time-off, training (D15) | Gusto/ADP export formats | Monday payroll export works; a prevailing-wage job produces WH-347; no unlicensed tech gets an application visit |
| **W8** | Reporting & forecasting | Report builder, saved/shared/scheduled reports, dashboard composer, role dashboards, drill-through, pipeline-weighted + seasonal forecasts, goals/quotas, leaderboards, all domain reports, benchmarks (D13) | W0 live snapshots | Owner runs the Monday meeting entirely from TurfPro |
| **W9** | Platform & ecosystem | Public REST API v1 + keys + rate limits + OpenAPI, outbound webhooks, Zapier app, Make/n8n, inbound endpoints, integration marketplace UI, CompanyCam/GPS/measurement/Gusto connectors, sandbox orgs, white-label + franchise hierarchy (D16) | Zapier dev account | "Does it integrate with X?" answered yes via API/Zapier for the long tail |
| **W10** | AI layer | Copilot, lead scoring v2, live churn + next-best-action, draft replies, call transcription/summaries, photo analysis, estimate writer, AI receptionist, chat-to-book, smart scheduling, dynamic pricing, anomaly alerts, NL reports, follow-up agent, ES↔EN translation, chemical mix assistant, usage metering (D17) | Anthropic API key; W1/W2/W5 data exhaust | AI answers touch every module; per-org metering gates cost |
| **W11** | Trust & scale | CSP, status page, DR drills, retention + GDPR deletion, SOC 2 Type I evidence, rate limiting + bot protection, TCPA/CAN-SPAM ledgers, PII encryption, COI vault, support impersonation, 100k-record SLOs, WCAG AA, i18n/Spanish app-wide, app-store PWA (D18, D19 remainder) | Vanta-style tooling optional | Enterprise security questionnaire passes; 100k-record org stays fast |
| **W12** | Marketing growth engine | Comparison/alternative pages, vertical landers, programmatic SEO, ROI calculator + free tools, template library, blog engine, help center, interactive tour, case studies, changelog, technical SEO, A/B tests, site→signup attribution, benchmark report (D20) | Content pipeline | Organic signups measurable; every competitor search has a TurfPro answer |

Parallelism notes: W12 can run any time (no app deps). W2 needs W1's send actions; W4 needs W3's Stripe Connect start; W5's renewals hook into W3's renewal engine; W10 last among product waves (feeds on data the earlier waves create). Within a wave, epics fan out to parallel agents once W0's route split lands.

---

## Part IV — Run protocol (how sessions consume this plan)

1. **Materialize first (start of the run):** commit this plan into the repo as `docs/master-roadmap.md`, and extend `src/data/prime-time-roadmap.ts` into a wave/epic/status board (`src/data/master-roadmap.ts`) rendered in the app's Prime Time view — the board is the single source of progress truth, updated in the same commit as the work.
2. **Ticket expansion at run time:** at the start of each wave, an agent decomposes each catalog bullet into granular tickets (schema Δ, backend fns + guards + audit, UI, tests, docs — typically 3–8 each) appended to the board. 630 bullets ≈ 2,500–4,000 tickets total; never pre-expand more than one wave ahead.
3. **Session shape per wave:** one orchestrating session; mechanical fan-out (schema ports, per-view extraction, per-report builders) delegated to parallel subagents with the strict conventions block (mirror the Drizzle-port prompts that worked in this repo's history); adversarial verify passes on security-touching epics (guards, payments, portal tokens).
4. **Gates (every epic, no exceptions):** `npx tsc --noEmit` clean → `npx vitest run` green (new convex-test coverage for every new module: tenancy rejection + permission rejection + happy path) → `npm run build` → `npx playwright test` (add a spec per new surface) → commit with board-status update → push. Stripe/Clerk/Twilio work verified in test mode with documented manual steps appended to `docs/production-launch-checklist.md`.
5. **External-service checklist per wave** (pause and collect from Justin): W1 Twilio + Google/Microsoft OAuth apps; W3/W4 Stripe Connect + QBO app; W5 Mapbox; W6 Google Business Profile; W9 Zapier; W10 Anthropic API key. Keys land in Convex env / Replit secrets per the launch checklist.
6. **Non-negotiables carried from S1:** every new backend function goes through `requireWorkspace`/`requireMembership` with an explicit permission; every write audits; every public token (portal, quote links, forms) is unguessable + expiring + rate-limited; money stays integer cents; timestamps epoch ms; no unauthenticated Convex function ever ships again.

## Verification

- **Per-epic:** the four gates above, plus targeted convex-tests (auth rejection is mandatory per new module) and a Playwright spec per new user-facing surface.
- **Per-wave exit review:** run the wave's exit criterion literally (e.g., W1: send/receive a real email + SMS in test mode; W4: full quote→pay→QBO loop in Stripe/QBO sandboxes; W5: generate a season, rain-day reschedule it, print the state chemical PDF).
- **Standing regression:** the current 13 vitest + 12 Playwright tests must never break; suite grows monotonically each wave.
- **Production smoke after each push:** `/api/health` 200, signup → workspace → seed sample data on the deployed site.
