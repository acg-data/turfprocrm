# World-Class CRM: 500-Item Product and Quality Backlog

This is the next-level execution backlog for Landscape CRM. It expands the existing 100 customer journeys into 500 buildable, testable improvements for an Arborgold/Aspire-depth operating system with Jobber-level usability.

The list is intentionally broader than feature requests. Every item is a product behavior, data contract, permission rule, bug-prevention check, operational control, or launch requirement.

Priority:

- `P0`: blocks trust, money, safety, tenant isolation, or a paid beta.
- `P1`: required for a strong daily operating product.
- `P2`: raises retention, efficiency, or competitive depth.
- `P3`: strategic scale, polish, or expansion.

Use this backlog with the current journey evidence. A listed item is not automatically missing; the audit step for every item is to mark it `verified`, `partial`, `missing`, or `blocked`, then attach code, test, screenshot, or deployment evidence.

## 1. Platform Foundation

- [ ] WCRM-001 [P0] Define the production environment contract for app URL, Clerk, Convex, Paddle, storage, email, maps, weather, and monitoring. Done when missing required production values fail a preflight check.
- [ ] WCRM-002 [P0] Add a single typed configuration loader with server-only and browser-safe variable separation. Done when client bundles cannot import secrets.
- [ ] WCRM-003 [P0] Add startup validation for invalid URLs, placeholder keys, sandbox keys in production, and mismatched environments. Done when deployment fails before serving unsafe config.
- [ ] WCRM-004 [P0] Record an application build ID and Convex deployment ID in the admin diagnostics screen. Done when support can identify the exact release for any report.
- [ ] WCRM-005 [P0] Add database schema migration documentation and rollback notes for every breaking change. Done when a release has a repeatable migration runbook.
- [ ] WCRM-006 [P0] Add idempotency keys to every money, import, provisioning, and external webhook mutation. Done when retries cannot create duplicate business records.
- [ ] WCRM-007 [P0] Create a canonical domain error taxonomy for auth, permission, validation, conflict, limit, external service, and transient failures. Done when UI messages map from typed errors.
- [ ] WCRM-008 [P1] Add request correlation IDs across Next routes, Convex functions, webhook processing, and audit events. Done when one support ID traces a full workflow.
- [ ] WCRM-009 [P1] Add clock and timezone helpers so all persisted timestamps are UTC and all display dates use workspace timezone. Done when daylight-saving transitions have tests.
- [ ] WCRM-010 [P1] Add a feature-flag registry with server-side evaluation and audit history. Done when beta features can be enabled per tenant without code edits.

## 2. Tenant and Workspace Model

- [ ] WCRM-011 [P0] Enforce organization membership before every tenant-owned query and mutation. Done when a cross-tenant test covers every public production module.
- [ ] WCRM-012 [P0] Make active organization selection explicit in session state and reject missing or stale organization context. Done when users never fall into a shared demo workspace accidentally.
- [ ] WCRM-013 [P0] Separate demo, staging, and production organization IDs in configuration and code. Done when production cannot call demo seed mutations.
- [ ] WCRM-014 [P0] Add organization lifecycle states: provisioning, active, suspended, deleting, deleted, and failed. Done when each state has allowed routes and mutations.
- [ ] WCRM-015 [P0] Add a workspace slug and immutable internal organization ID. Done when renaming a company never breaks foreign keys.
- [ ] WCRM-016 [P1] Support multiple locations under one organization with location-level settings and reporting. Done when a company can isolate branches without creating duplicate subscriptions.
- [ ] WCRM-017 [P1] Add territory records for zip codes, towns, service radii, and excluded areas. Done when leads and routes can be filtered by territory.
- [ ] WCRM-018 [P1] Add an organization-wide default currency, locale, tax regime, timezone, and measurement system. Done when all money and units render consistently.
- [ ] WCRM-019 [P1] Add a safe tenant cloning tool for owners that copies configuration but never customer PII or billing identifiers. Done when a new location can start from templates.
- [ ] WCRM-020 [P0] Add tenant deletion preview, export-before-delete, confirmation, grace period, and irreversible delete job. Done when deletion is auditable and recoverable during the grace period.

## 3. Authentication and Sessions

- [ ] WCRM-021 [P0] Configure Clerk production and development instances with separate allowed origins. Done when local keys cannot authenticate against production data.
- [ ] WCRM-022 [P0] Require a verified email before workspace creation unless an owner explicitly enables another policy. Done when unverified accounts cannot provision tenants.
- [ ] WCRM-023 [P0] Add session expiration and refresh handling for long field shifts. Done when a technician receives a recoverable sign-in state instead of lost work.
- [ ] WCRM-024 [P0] Handle revoked Clerk sessions in Convex and Next without rendering stale app data. Done when revoked sessions return to sign-in cleanly.
- [ ] WCRM-025 [P0] Add organization invitation acceptance with expiration, revocation, and wrong-account handling. Done when invite links cannot be claimed by an unintended account.
- [ ] WCRM-026 [P1] Add active workspace switcher for users with multiple organizations. Done when switching reloads all tenant-scoped queries and clears stale selections.
- [ ] WCRM-027 [P1] Add sign-out from all sessions for owners and users. Done when compromised sessions can be invalidated quickly.
- [ ] WCRM-028 [P1] Add login activity view with device, location approximation, timestamp, and session revocation. Done when users can investigate suspicious access.
- [ ] WCRM-029 [P1] Add passwordless and social sign-in configuration behind a controlled flag. Done when new providers do not bypass organization provisioning rules.
- [ ] WCRM-030 [P0] Add auth smoke tests for unauthenticated, expired, wrong-org, disabled-member, and valid-member states. Done when every protected route is covered.

## 4. Onboarding and Provisioning

- [ ] WCRM-031 [P0] Make the first-run flow choose Free or Pro before organization provisioning. Done when plan selection is persisted and cannot be bypassed.
- [ ] WCRM-032 [P0] Make Pro checkout state resumable after browser close or payment redirect. Done when returning users see the correct pending, paid, or failed state.
- [ ] WCRM-033 [P0] Provision defaults transactionally: organization, owner membership, settings, statuses, service categories, and audit event. Done when partial provisioning is repaired automatically.
- [ ] WCRM-034 [P1] Add Start Blank and Load Sample Data choices scoped to the new tenant. Done when sample data can be deleted without touching real records.
- [ ] WCRM-035 [P1] Add a setup checklist with progress, blockers, owner, and recommended next action. Done when each step links directly to its setup screen.
- [ ] WCRM-036 [P1] Add company profile setup for legal name, display name, logo, address, phone, email, and service territory. Done when documents and customer messages use the profile.
- [ ] WCRM-037 [P1] Add industry setup for landscape, lawn, pest, irrigation, tree, snow, or mixed operations. Done when modules and default catalogs reflect the selection.
- [ ] WCRM-038 [P1] Add guided setup for crews, roles, rates, catalog, tax, invoice terms, and route start locations. Done when a new tenant can reach a usable dashboard without hidden defaults.
- [ ] WCRM-039 [P1] Add CSV import preview during onboarding with mapping, duplicate review, validation, and rollback. Done when the owner sees exactly what will be created.
- [ ] WCRM-040 [P0] Add provisioning failure recovery with a support-safe retry and diagnostic event. Done when users are never trapped on a blank or half-created workspace.

## 5. Navigation and App Shell

- [ ] WCRM-041 [P1] Make every primary navigation item have a stable URL and browser back behavior. Done when a page can be bookmarked and reopened in the same workspace.
- [ ] WCRM-042 [P1] Preserve current filters, date range, and selected record in URL state where practical. Done when refresh does not erase working context.
- [ ] WCRM-043 [P1] Add global command search for customers, leads, jobs, properties, invoices, and settings. Done when a keyboard search opens the exact record.
- [ ] WCRM-044 [P1] Add a universal create menu for lead, customer, estimate, job, task, visit, invoice, and note. Done when creation starts from any module.
- [ ] WCRM-045 [P1] Add breadcrumbs and record context headers for deep workspaces. Done when users can identify where a child record belongs.
- [ ] WCRM-046 [P1] Add unsaved-change protection to forms and drawers. Done when accidental navigation prompts before losing edits.
- [ ] WCRM-047 [P1] Standardize loading, empty, error, permission, and offline states across all modules. Done when every screen has a purposeful state for each condition.
- [ ] WCRM-048 [P2] Add dense and comfortable table density settings saved per user. Done when office users can optimize scanning without changing mobile layout.
- [ ] WCRM-049 [P2] Add keyboard navigation for tables, drawers, tabs, and command actions. Done when common workflows can be completed without a mouse.
- [ ] WCRM-050 [P1] Add a visible tenant and plan indicator with a safe demo badge. Done when users can always tell which workspace and plan they are operating in.

## 6. Customer Accounts

- [ ] WCRM-051 [P0] Define customer deduplication keys for email, phone, address, and external ID. Done when duplicate creation presents merge or reuse options.
- [ ] WCRM-052 [P1] Add customer lifecycle statuses such as prospect, active, paused, past due, churned, and archived. Done when status changes drive reporting and next actions.
- [ ] WCRM-053 [P1] Add account owner, service coordinator, billing contact, and preferred contact method. Done when responsibility is clear on every customer.
- [ ] WCRM-054 [P1] Add customer-level tags with color, description, and permission scope. Done when tags are searchable and consistent across modules.
- [ ] WCRM-055 [P1] Add customer profile sections for contacts, properties, estimates, jobs, invoices, payments, notes, files, and activities. Done when the profile is the operational source of truth.
- [ ] WCRM-056 [P1] Add merge preview showing field conflicts, linked records, and irreversible effects. Done when merges require an explicit field-by-field decision.
- [ ] WCRM-057 [P1] Add archive and restore instead of hard deleting ordinary customer accounts. Done when history remains available for reporting.
- [ ] WCRM-058 [P1] Add customer health indicators for overdue balance, missed visits, open issues, churn risk, and recent engagement. Done when risk is visible without opening reports.
- [ ] WCRM-059 [P2] Add household, commercial account, parent account, and child account relationships. Done when multi-property customers can bill and report correctly.
- [ ] WCRM-060 [P2] Add customer timeline filters by person, property, job, financial event, and communication type. Done when large histories remain scannable.

## 7. Contacts and Communication Preferences

- [ ] WCRM-061 [P0] Normalize phone, email, and name fields at write time. Done when search and duplicate detection work across formatting variations.
- [ ] WCRM-062 [P1] Support multiple emails and phones with labels and primary flags. Done when office and field users know which number to use.
- [ ] WCRM-063 [P1] Store contact role, decision authority, property relationship, and billing responsibility. Done when sales and service context is explicit.
- [ ] WCRM-064 [P0] Add consent, opt-out, communication channel, and consent timestamp fields. Done when future messaging integrations have an auditable permission basis.
- [ ] WCRM-065 [P1] Add preferred language, contact hours, gate instructions, and accessibility notes. Done when field teams can serve customers respectfully.
- [ ] WCRM-066 [P1] Add contact merge and unlink workflows with linked-activity preview. Done when corrections do not orphan history.
- [ ] WCRM-067 [P1] Add duplicate contact warnings before a new contact is saved. Done when the user can attach to an existing customer instead.
- [ ] WCRM-068 [P2] Add contact import confidence and source attribution. Done when data quality can be traced back to the original file or form.
- [ ] WCRM-069 [P2] Add relationship notes and last-confirmed date for key contact details. Done when stale contacts are easy to identify.
- [ ] WCRM-070 [P1] Add tests for contact visibility across roles and linked properties. Done when a technician sees only operationally necessary contact data.

## 8. Lead Operations

- [ ] WCRM-071 [P0] Make lead list filters composable for status, owner, source, service, territory, quality, spam, value, and age. Done when filters can be combined without losing rows.
- [ ] WCRM-072 [P1] Add saved lead views with owner, sharing scope, sort, columns, and default view. Done when teams can standardize daily queues.
- [ ] WCRM-073 [P0] Make lead status a real workflow with allowed transitions and required fields. Done when invalid status jumps are rejected server-side.
- [ ] WCRM-074 [P1] Add lead quality, fit, urgency, and spam scores with explainable factors. Done when a sales rep understands why a lead is prioritized.
- [ ] WCRM-075 [P1] Add lead owner assignment, round robin, territory routing, and fallback queue. Done when every valid lead has an accountable next owner.
- [ ] WCRM-076 [P1] Add bulk assign, status update, tag, archive, and export with confirmation and audit events. Done when bulk actions are safe and reversible where possible.
- [ ] WCRM-077 [P1] Add lead detail drawer with source, first response, activities, tasks, notes, property, and conversion path. Done when qualification does not require page hopping.
- [ ] WCRM-078 [P0] Add first-response SLA timer and overdue lead queue. Done when late responses are visible on the dashboard.
- [ ] WCRM-079 [P1] Add lead conversion wizard with duplicate match, customer reuse, opportunity, estimate, and job choices. Done when conversion never silently creates duplicate accounts.
- [ ] WCRM-080 [P1] Add lost and disqualified reason taxonomy with free-text context and reactivation date. Done when lost demand produces useful learning.

## 9. Lead Intake and Data Quality

- [ ] WCRM-081 [P0] Add public lead intake validation for required contact, service, address, and consent fields. Done when malformed submissions never create unusable leads.
- [ ] WCRM-082 [P0] Add rate limiting, CAPTCHA or Turnstile, honeypot, and IP/device abuse signals. Done when public intake has bot protection before launch.
- [ ] WCRM-083 [P1] Capture UTM source, medium, campaign, landing page, referrer, and submission timestamp. Done when source ROI can be analyzed.
- [ ] WCRM-084 [P1] Add intake form versioning and tenant-specific field configuration. Done when changing a form does not break old submissions.
- [ ] WCRM-085 [P1] Add spam quarantine instead of deleting suspicious submissions. Done when false positives can be reviewed and released.
- [ ] WCRM-086 [P1] Add duplicate lead matching by contact, property, service, and recent time window. Done when repeat inquiries are grouped appropriately.
- [ ] WCRM-087 [P1] Add submission replay protection with request ID and timestamp window. Done when browser retries cannot duplicate leads.
- [ ] WCRM-088 [P1] Add embeddable lead form with domain allowlist and postMessage-safe success handling. Done when a client can place the form on its website.
- [ ] WCRM-089 [P2] Add web-form conversion analytics for view, start, abandon, submit, spam, and qualified states. Done when marketing can find form friction.
- [ ] WCRM-090 [P1] Add import and intake data-quality issue queues with field-level fixes. Done when bad records have a repair path instead of a dead end.

## 10. Pipeline and Sales Workflow

- [ ] WCRM-091 [P1] Add configurable pipeline stages with probability, color, order, terminal behavior, and required fields. Done when each tenant can model its sales process.
- [ ] WCRM-092 [P1] Add opportunity amount, recurring value, one-time value, expected close date, and confidence. Done when pipeline value is financially meaningful.
- [ ] WCRM-093 [P1] Add stage aging and time-in-stage metrics. Done when stalled opportunities are actionable.
- [ ] WCRM-094 [P1] Add opportunity next step, due date, owner, and risk flag. Done when every open deal has a next action.
- [ ] WCRM-095 [P1] Add opportunity products and service lines linked to price books. Done when sales scope matches estimate scope.
- [ ] WCRM-096 [P1] Add competitor, lost reason, source, and win theme fields. Done when win-loss analysis is possible.
- [ ] WCRM-097 [P1] Add drag/drop stage movement with keyboard and accessible buttons. Done when visual movement has an equivalent safe action.
- [ ] WCRM-098 [P0] Validate all pipeline transitions in Convex, including permissions and required fields. Done when UI bypasses cannot corrupt stages.
- [ ] WCRM-099 [P1] Add forecast views for best case, commit, weighted, and closed revenue. Done when owners can compare forecast methods.
- [ ] WCRM-100 [P2] Add sales rep scorecard for response time, conversion, quote rate, win rate, and cycle time. Done when coaching can use consistent metrics.

## 11. Activities and Timeline

- [ ] WCRM-101 [P1] Create a single activity model for call, email, visit, text placeholder, note, status change, estimate, payment, and system events. Done when timelines use one sortable contract.
- [ ] WCRM-102 [P1] Add activity visibility levels: internal, team, customer-visible, and restricted. Done when sensitive notes do not leak.
- [ ] WCRM-103 [P1] Add activity links to customer, contact, property, lead, opportunity, estimate, job, visit, and invoice. Done when context is never lost.
- [ ] WCRM-104 [P1] Add activity composer with type, outcome, next action, due date, and attachments. Done when a rep can log a complete interaction quickly.
- [ ] WCRM-105 [P1] Add timeline pagination or virtualization for high-volume accounts. Done when large customers remain fast.
- [ ] WCRM-106 [P2] Add timeline filters and date range with clear reset. Done when a user can isolate a service incident or sales cycle.
- [ ] WCRM-107 [P1] Add edit and delete policy for activities with reason and audit event. Done when corrections are traceable.
- [ ] WCRM-108 [P2] Add automatic activities for key external events such as webhook, import, route change, and billing change. Done when timelines explain system behavior.
- [ ] WCRM-109 [P2] Add activity templates for call outcomes, visit summaries, and renewal conversations. Done when logging is faster and more consistent.
- [ ] WCRM-110 [P1] Add duplicate-key tests for timeline lists and stable event IDs. Done when React never logs duplicate key warnings.

## 12. Tasks and Follow-Up

- [ ] WCRM-111 [P1] Add task types, priority, status, due date, owner, creator, and linked entity. Done when tasks work across CRM, jobs, dispatch, and finance.
- [ ] WCRM-112 [P0] Enforce task visibility and assignment permissions server-side. Done when a user cannot inspect or reassign restricted work.
- [ ] WCRM-113 [P1] Add recurring tasks with timezone-aware recurrence and end conditions. Done when renewal and maintenance work can repeat safely.
- [ ] WCRM-114 [P1] Add overdue, due today, upcoming, and blocked task views. Done when daily work is scannable.
- [ ] WCRM-115 [P1] Add bulk complete, reassign, reschedule, and archive with audit events. Done when managers can clean queues safely.
- [ ] WCRM-116 [P1] Add task dependency and blocked-by reason. Done when handoffs show why work cannot proceed.
- [ ] WCRM-117 [P2] Add task templates per service, job phase, lead source, and issue type. Done when repeatable operations are generated consistently.
- [ ] WCRM-118 [P2] Add task SLA timers and escalation rules. Done when unresolved issues surface automatically.
- [ ] WCRM-119 [P1] Add task notifications with quiet hours and user preferences. Done when reminders are useful rather than noisy.
- [ ] WCRM-120 [P1] Add optimistic update rollback for task changes. Done when network failure never leaves a false completed state.

## 13. Communications

- [ ] WCRM-121 [P1] Define a provider-neutral communication event model before adding SMS or email vendors. Done when future providers map to one timeline contract.
- [ ] WCRM-122 [P0] Store communication consent, unsubscribe state, and suppression reason separately from contact details. Done when compliance decisions are auditable.
- [ ] WCRM-123 [P1] Add email template records with version, locale, variables, preview, and approval state. Done when template changes are controlled.
- [ ] WCRM-124 [P1] Add message delivery states: queued, sent, delivered, bounced, failed, and suppressed. Done when support can explain a missing message.
- [ ] WCRM-125 [P1] Add customer notification preferences for appointment, quote, invoice, payment, reminder, and marketing categories. Done when customers control noise.
- [ ] WCRM-126 [P2] Add internal mentions and notification inbox with read/unread state. Done when teams can coordinate without external chat.
- [ ] WCRM-127 [P2] Add communication templates for lead acknowledgment, quote follow-up, visit reminder, completion, and renewal. Done when the most common messages are standardized.
- [ ] WCRM-128 [P2] Add merge-field validation before sending a template. Done when missing customer values never produce broken messages.
- [ ] WCRM-129 [P2] Add communication history export by customer and date range. Done when a tenant can answer customer disputes.
- [ ] WCRM-130 [P1] Add provider failure retry policy with backoff and dead-letter review. Done when transient outages do not silently lose messages.

## 14. Search and Data Quality

- [ ] WCRM-131 [P1] Add global search across names, phones, emails, addresses, jobs, estimates, and invoice numbers. Done when exact and partial searches return useful results.
- [ ] WCRM-132 [P1] Add tenant-scoped full-text indexes for notes, activities, service descriptions, and issue details. Done when operational context is discoverable.
- [ ] WCRM-133 [P1] Add search result type, status, owner, and last-updated filters. Done when users can narrow results quickly.
- [ ] WCRM-134 [P0] Enforce tenant and permission filtering inside search queries. Done when search cannot reveal restricted data.
- [ ] WCRM-135 [P1] Add data-quality dashboard for missing phone, address, email, service, owner, rate, and tax data. Done when the workspace can measure cleanliness.
- [ ] WCRM-136 [P1] Add duplicate candidate queue with confidence and merge action. Done when data stewardship is a daily workflow.
- [ ] WCRM-137 [P1] Add normalization for addresses, states, postal codes, and unit numbers. Done when route and duplicate logic use consistent values.
- [ ] WCRM-138 [P2] Add configurable required-field policies by lifecycle stage. Done when a lead can be lightweight but a job must be complete.
- [ ] WCRM-139 [P2] Add record completeness score with explainable missing fields. Done when users know what to fix.
- [ ] WCRM-140 [P1] Add stale-record detection for contacts, leads, opportunities, and catalogs. Done when old data is queued for review instead of silently aging.

## 15. Properties and Service Locations

- [ ] WCRM-141 [P0] Support multiple properties per customer with independent service, billing, and access settings. Done when commercial accounts work correctly.
- [ ] WCRM-142 [P1] Add property status, occupancy, access, gate, pet, water, power, and hazard fields. Done when field planning has the needed context.
- [ ] WCRM-143 [P1] Add property coordinates with geocoding status and manual correction. Done when routes do not depend on perfect third-party results.
- [ ] WCRM-144 [P1] Add property service territory and branch assignment. Done when scheduling respects operational boundaries.
- [ ] WCRM-145 [P1] Add property notes separated into internal, field, and customer-visible categories. Done when sensitive information is controlled.
- [ ] WCRM-146 [P1] Add property access instructions with last-confirmed timestamp. Done when stale instructions are visible.
- [ ] WCRM-147 [P2] Add property history of service, weather, applications, issues, photos, and measurements. Done when a technician can understand the site quickly.
- [ ] WCRM-148 [P2] Add property map preview with route and service-area overlays. Done when location context is visible without leaving the record.
- [ ] WCRM-149 [P1] Add property archive and transfer between customers with audit trail. Done when ownership changes preserve history.
- [ ] WCRM-150 [P2] Add property-level profitability and service mix. Done when the operator can identify profitable or problematic sites.

## 16. Measurements and Site Intelligence

- [ ] WCRM-151 [P1] Add measurement records with source, unit, capture date, accuracy, and author. Done when measurements are trustworthy.
- [ ] WCRM-152 [P1] Support lawn, bed, tree, shrub, hardscape, roof, perimeter, and room measurement types. Done when service categories have appropriate units.
- [ ] WCRM-153 [P1] Add measurement versioning and approval. Done when a changed area does not erase the prior quote basis.
- [ ] WCRM-154 [P1] Add manual measurement entry with unit conversion and validation. Done when field teams can work without a mapping provider.
- [ ] WCRM-155 [P2] Add map drawing and polygon capture with save, edit, and delete. Done when unlimited land measurement has a usable workflow.
- [ ] WCRM-156 [P2] Add satellite or map-provider adapter boundary without locking core data to a vendor. Done when providers can be changed later.
- [ ] WCRM-157 [P1] Add measurement-to-price calculation trace showing formula inputs. Done when an estimator can explain a price.
- [ ] WCRM-158 [P1] Prevent stale measurement use when an estimate is generated. Done when quotes show measurement date and source.
- [ ] WCRM-159 [P2] Add measurement discrepancy flag between field, estimate, and completed work. Done when margin leakage is detectable.
- [ ] WCRM-160 [P2] Add measurement export for customer or internal review. Done when a scope dispute has evidence.

## 17. Estimating

- [ ] WCRM-161 [P0] Add estimate lifecycle states: draft, internal review, approved, sent, viewed, accepted, rejected, expired, converted, and canceled. Done when state transitions are explicit.
- [ ] WCRM-162 [P1] Add estimate versioning with immutable sent versions. Done when a revised quote cannot rewrite what the customer saw.
- [ ] WCRM-163 [P1] Add estimate templates by service line, property type, and customer segment. Done when repeatable quotes are fast.
- [ ] WCRM-164 [P1] Add scope, exclusions, assumptions, service frequency, start window, and renewal terms. Done when the quote describes the work clearly.
- [ ] WCRM-165 [P1] Add line-item quantity, unit, rate, discount, taxability, cost basis, and margin. Done when estimates can feed job costing.
- [ ] WCRM-166 [P1] Add optional add-ons and good/better/best packages. Done when the customer can choose scope without manual rework.
- [ ] WCRM-167 [P0] Require approval for below-floor margin, excessive discount, or missing cost basis. Done when risky quotes cannot be sent by accident.
- [ ] WCRM-168 [P1] Add estimate clone, renewal clone, and convert-from-opportunity actions. Done when repeat business is efficient.
- [ ] WCRM-169 [P1] Add estimate comparison showing version changes in scope and price. Done when internal reviewers see exactly what changed.
- [ ] WCRM-170 [P1] Add estimate calculation audit showing rates, formulas, overrides, and actor. Done when price disputes are explainable.

## 18. Jobs Pricer and Pricing Engine

- [ ] WCRM-171 [P0] Define a shared pricing formula contract for labor, materials, equipment, overhead, markup, tax, and target margin. Done when UI and Convex use the same result.
- [ ] WCRM-172 [P1] Add service-specific pricing rules with effective dates and precedence. Done when local overrides beat defaults predictably.
- [ ] WCRM-173 [P1] Add price books by branch, service line, customer segment, and season. Done when teams can quote with the correct rates.
- [ ] WCRM-174 [P1] Add price floor, target, and premium scenarios with risk notes. Done when the pricer supports decisions rather than one number.
- [ ] WCRM-175 [P1] Add labor productivity assumptions by crew type and service. Done when hours are not guessed uniformly.
- [ ] WCRM-176 [P1] Add material coverage rates, waste factors, and application frequency. Done when chemical and fertilizer pricing reflects reality.
- [ ] WCRM-177 [P1] Add equipment ownership, rental, fuel, and usage rates. Done when equipment cost is not hidden.
- [ ] WCRM-178 [P1] Add overhead allocation methods: percentage, per hour, per visit, and fixed monthly. Done when each operator can choose a defensible model.
- [ ] WCRM-179 [P1] Add price simulation comparing rate changes, wage changes, and margin impact. Done when owners can plan pricing changes.
- [ ] WCRM-180 [P2] Add saved pricing sessions with inputs, output, source, and reuse action. Done when estimates can be rebuilt reproducibly.

## 19. Quote Approval and Customer Acceptance

- [ ] WCRM-181 [P0] Add signed or tokenized quote links scoped to one estimate version. Done when a public link cannot access another quote.
- [ ] WCRM-182 [P0] Add quote link expiration, revoke, and regenerate controls. Done when stale links can be invalidated.
- [ ] WCRM-183 [P1] Add customer view analytics for sent, opened, time viewed, and accepted states. Done when sales follow-up has context.
- [ ] WCRM-184 [P1] Add acceptance name, email, timestamp, IP or consent metadata, and optional signature. Done when approval evidence is complete.
- [ ] WCRM-185 [P1] Add customer rejection reason and requested changes. Done when rejected quotes create a follow-up path.
- [ ] WCRM-186 [P1] Add selectable options and accepted-option snapshot. Done when the job matches what the customer approved.
- [ ] WCRM-187 [P1] Add internal approval comments and decision history. Done when pricing governance is explainable.
- [ ] WCRM-188 [P1] Block conversion of expired, rejected, or superseded estimates. Done when old quotes cannot create active jobs.
- [ ] WCRM-189 [P2] Add branded PDF or print-ready quote output. Done when a customer can receive a professional document.
- [ ] WCRM-190 [P2] Add quote change-order path after acceptance. Done when scope changes do not mutate the original agreement.

## 20. Jobs and Project Records

- [ ] WCRM-191 [P0] Define job lifecycle states from sold through closed, on hold, canceled, and warranty. Done when operational and financial states cannot conflict.
- [ ] WCRM-192 [P1] Add job number, service agreement, customer, property, branch, owner, and source links. Done when every job is traceable.
- [ ] WCRM-193 [P1] Add job template selection during estimate conversion. Done when phases, visits, checklists, and cost categories are seeded intentionally.
- [ ] WCRM-194 [P1] Add job scope snapshot from the accepted estimate. Done when later catalog edits do not rewrite sold work.
- [ ] WCRM-195 [P1] Add job health score for schedule, margin, tasks, issues, billing, and customer risk. Done when managers can triage jobs.
- [ ] WCRM-196 [P1] Add job workspace tabs for overview, scope, visits, costs, documents, issues, billing, and timeline. Done when operations has one home.
- [ ] WCRM-197 [P1] Add job closeout checklist with blockers and override permission. Done when jobs do not close with missing financial or compliance records.
- [ ] WCRM-198 [P1] Add job archive and reopen controls with reason. Done when corrections preserve history.
- [ ] WCRM-199 [P2] Add job cloning for recurring or similar projects with explicit field selection. Done when duplicate projects do not copy stale data.
- [ ] WCRM-200 [P1] Add job-level status history and duration metrics. Done when cycle time and delay causes are measurable.

## 21. Phases, Tasks, and Change Orders

- [ ] WCRM-201 [P1] Add configurable job phases with sequence, owner, status, dates, and completion rules. Done when complex projects are manageable.
- [ ] WCRM-202 [P1] Add phase dependencies and blocked reasons. Done when downstream work cannot start invisibly.
- [ ] WCRM-203 [P1] Add phase-level budget, actuals, margin, and variance. Done when managers find leakage before closeout.
- [ ] WCRM-204 [P1] Add job task templates with required evidence, due offsets, and assignee rules. Done when handoffs are repeatable.
- [ ] WCRM-205 [P1] Add task-to-visit and task-to-phase links. Done when field and office work stay connected.
- [ ] WCRM-206 [P1] Add change-order request with reason, scope, price, cost, margin, and approval state. Done when extra work is controlled.
- [ ] WCRM-207 [P1] Add change-order customer acceptance and signed snapshot. Done when billed scope has evidence.
- [ ] WCRM-208 [P1] Add approved change-order schedule impact and task generation. Done when operations receives the new work.
- [ ] WCRM-209 [P2] Add job issue-to-change-order conversion. Done when field upsells have a clean commercial path.
- [ ] WCRM-210 [P2] Add project completion percentage based on weighted phase and visit progress. Done when dashboards reflect real progress.

## 22. Calendar and Day-to-Day Planning

- [ ] WCRM-211 [P0] Add day, week, month, list, and crew calendar views. Done when dispatch can choose the right planning horizon.
- [ ] WCRM-212 [P1] Add calendar filters by branch, crew, technician, service line, status, territory, and conflict. Done when large schedules remain usable.
- [ ] WCRM-213 [P1] Add drag/drop rescheduling with server validation and undo. Done when schedule changes are safe and reversible.
- [ ] WCRM-214 [P1] Add visit time windows, duration, buffer, travel time, and locked appointments. Done when the calendar reflects capacity.
- [ ] WCRM-215 [P1] Add calendar conflict detection for person, crew, equipment, property, and overlapping visit. Done when conflicts are visible before save.
- [ ] WCRM-216 [P1] Add weather and access warnings directly on calendar entries. Done when dispatch decisions use site context.
- [ ] WCRM-217 [P1] Add day briefing with route, urgent issues, overdue tasks, weather, and crew notes. Done when a dispatcher can start the day from one screen.
- [ ] WCRM-218 [P2] Add print and export calendar views with privacy-safe field details. Done when crews can use a paper fallback.
- [ ] WCRM-219 [P2] Add external calendar subscription or provider-neutral export. Done when office users can see work alongside other commitments.
- [ ] WCRM-220 [P1] Add calendar audit history and reason for manual changes. Done when schedule disputes are explainable.

## 23. Dispatch Board

- [ ] WCRM-221 [P0] Add dispatch board columns for unassigned, scheduled, en route, on site, completed, blocked, and canceled. Done when all visits have a visible state.
- [ ] WCRM-222 [P1] Add crew capacity based on work hours, travel, skills, equipment, and breaks. Done when assignments are operationally realistic.
- [ ] WCRM-223 [P1] Add assignment validation for active crew membership and required skills. Done when unsafe or invalid assignment is rejected.
- [ ] WCRM-224 [P1] Add assignment history with previous crew, actor, reason, and timestamp. Done when handoffs are auditable.
- [ ] WCRM-225 [P1] Add dispatch filters for overdue, unassigned, high priority, weather risk, and customer escalation. Done when the board surfaces exceptions.
- [ ] WCRM-226 [P1] Add route order controls with keyboard alternative to drag/drop. Done when route planning is accessible.
- [ ] WCRM-227 [P1] Add crew availability, time off, recurring commitments, and maximum daily hours. Done when schedules respect real availability.
- [ ] WCRM-228 [P2] Add dispatcher notes and shift handoff summary. Done when context survives a change of operator.
- [ ] WCRM-229 [P2] Add dispatch exception queue for no-show, access failure, weather, vehicle issue, and customer request. Done when exceptions become managed work.
- [ ] WCRM-230 [P1] Add real-time refresh or subscription updates for assignments and status changes. Done when two dispatchers do not work from stale boards.

## 24. Routing and Maps

- [ ] WCRM-231 [P0] Add route plan records with date, branch, start location, end location, crew, and status. Done when routes are persisted work products.
- [ ] WCRM-232 [P1] Add stop records with sequence, visit, coordinates, service duration, travel duration, and locked state. Done when route quality is measurable.
- [ ] WCRM-233 [P1] Add Google Maps deep links for a route and individual property. Done when field users can navigate without retyping addresses.
- [ ] WCRM-234 [P1] Add geocode confidence and manual correction workflow. Done when bad map results do not silently distort routes.
- [ ] WCRM-235 [P1] Add drive-time estimate provider boundary and cached result timestamps. Done when routing can work with stale-data warnings.
- [ ] WCRM-236 [P1] Add route optimization objective selection: shortest time, lowest miles, balanced workload, or locked appointments. Done when operators control tradeoffs.
- [ ] WCRM-237 [P1] Add route feasibility warnings for time windows, service duration, breaks, and return-to-base. Done when impossible routes are flagged.
- [ ] WCRM-238 [P2] Add route comparison showing before and after miles, drive time, stops, and labor. Done when optimization has measurable value.
- [ ] WCRM-239 [P2] Add field route sync with stop reorder and acknowledgment. Done when crews see the latest plan.
- [ ] WCRM-240 [P2] Add territory heat map for unserved demand and route density. Done when sales and operations can coordinate growth.

## 25. Recurring Service and Renewals

- [ ] WCRM-241 [P0] Add recurring service plan with frequency, season, duration, price, scope, and cancellation rules. Done when recurring work has a durable contract.
- [ ] WCRM-242 [P1] Support weekly, biweekly, monthly, quarterly, seasonal, and custom recurrence. Done when common service schedules are supported.
- [ ] WCRM-243 [P1] Add blackout dates, holidays, weather buffers, and customer unavailable dates. Done when generated routes respect exceptions.
- [ ] WCRM-244 [P1] Prevent duplicate visit generation with recurrence watermark and idempotency key. Done when scheduled jobs cannot double-book customers.
- [ ] WCRM-245 [P1] Add renewal opportunity generation before contract end. Done when recurring revenue has a proactive workflow.
- [ ] WCRM-246 [P1] Add renewal risk signals from missed visits, low margin, complaints, and payment behavior. Done when renewals are prioritized.
- [ ] WCRM-247 [P1] Add plan pause, resume, skip, and one-off replacement visit. Done when exceptions do not require manual database work.
- [ ] WCRM-248 [P2] Add seasonal service templates for lawn, pest, irrigation, tree, and snow. Done when common programs are quick to configure.
- [ ] WCRM-249 [P2] Add recurring price escalation rules with customer notice requirement. Done when price changes are controlled.
- [ ] WCRM-250 [P2] Add recurring plan profitability forecast versus actual. Done when recurring work is evaluated as a portfolio.

## 26. Field PWA Core

- [ ] WCRM-251 [P0] Make the field home screen show only assigned and authorized visits. Done when a technician cannot browse unrelated tenant work.
- [ ] WCRM-252 [P0] Add explicit start, pause, resume, arrive, complete, and submit visit states. Done when time and service state are not conflated.
- [ ] WCRM-253 [P1] Show property access, hazards, pets, weather, service scope, and customer notes before start. Done when the technician has critical context.
- [ ] WCRM-254 [P1] Add visit progress indicator for checklist, materials, photos, notes, and issues. Done when completion requirements are obvious.
- [ ] WCRM-255 [P1] Add field-safe error messages and retry without losing entered data. Done when weak connectivity is survivable.
- [ ] WCRM-256 [P1] Add supervisor override path for correcting status, time, material, or checklist records. Done when field mistakes have a controlled recovery.
- [ ] WCRM-257 [P1] Add customer-visible service summary preview before submission. Done when the crew can verify what the customer will receive.
- [ ] WCRM-258 [P1] Add signature or customer acknowledgment option per service policy. Done when required proof can be captured.
- [ ] WCRM-259 [P2] Add field quick actions for call office, open map, flag issue, add task, and report hazard. Done when common actions take one tap.
- [ ] WCRM-260 [P1] Add mobile-specific Playwright tests at narrow viewport and touch-friendly controls. Done when field workflows are verified on mobile layout.

## 27. Offline and Mobile Reliability

- [ ] WCRM-261 [P0] Add service worker caching for app shell and safe static assets. Done when the field app opens without a live page request.
- [ ] WCRM-262 [P0] Add an offline queue for checklist, notes, photos, materials, and visit state changes. Done when work can be captured offline.
- [ ] WCRM-263 [P0] Add idempotent queue replay with conflict handling. Done when reconnecting cannot duplicate completion or material usage.
- [ ] WCRM-264 [P1] Show connection, queue count, last sync, and failed sync states. Done when technicians know whether work is saved.
- [ ] WCRM-265 [P1] Add local encrypted storage policy for cached customer data. Done when sensitive data has a defined mobile retention limit.
- [ ] WCRM-266 [P1] Add photo compression, upload progress, retry, and background upload. Done when photos do not block visit submission.
- [ ] WCRM-267 [P1] Add offline conflict resolution for schedule changes and canceled visits. Done when stale routes are not silently executed.
- [ ] WCRM-268 [P2] Add install prompt and PWA update notification. Done when users can install and update predictably.
- [ ] WCRM-269 [P2] Add low-battery, low-storage, and large-queue warnings. Done when the device can be managed before failure.
- [ ] WCRM-270 [P2] Add device/session removal and remote cache purge for lost phones. Done when an owner can reduce exposure.

## 28. Checklists, Photos, and Issues

- [ ] WCRM-271 [P1] Add checklist templates by service, phase, and visit type. Done when recurring work starts with the right checklist.
- [ ] WCRM-272 [P0] Enforce required checklist items before completion or require supervisor override. Done when critical work cannot be skipped silently.
- [ ] WCRM-273 [P1] Support pass, fail, skip, not applicable, and needs review states. Done when a checklist captures reality.
- [ ] WCRM-274 [P1] Add checklist item notes, measurement values, and evidence requirements. Done when inspections have context.
- [ ] WCRM-275 [P1] Add before, during, and after photo labels with timestamp and visit link. Done when proof is organized.
- [ ] WCRM-276 [P1] Add photo orientation, compression, thumbnail, and upload status handling. Done when galleries render reliably.
- [ ] WCRM-277 [P1] Add issue categories for damage, pest activity, access, customer concern, safety, callback, and upsell. Done when issues route correctly.
- [ ] WCRM-278 [P1] Add issue severity, customer-visible flag, owner, SLA, and resolution state. Done when issues become accountable workflows.
- [ ] WCRM-279 [P2] Add issue-to-task, issue-to-opportunity, issue-to-change-order, and issue-to-callback actions. Done when field observations create next steps.
- [ ] WCRM-280 [P1] Add QA review queue for submitted visits with failed items, missing photos, unusual materials, and margin variance. Done when supervisors can inspect exceptions.

## 29. Chemical Tracking and Compliance

- [ ] WCRM-281 [P0] Store product name, EPA registration, active ingredient, formulation, unit, and restricted-use flag. Done when chemical identity is complete.
- [ ] WCRM-282 [P0] Require applicator certification and license check for restricted-use products. Done when unauthorized application is blocked.
- [ ] WCRM-283 [P1] Capture application rate, quantity, area, dilution, target pest, weather, wind, and temperature. Done when application records support compliance.
- [ ] WCRM-284 [P1] Capture lot number, expiration date, source, storage location, and disposal method. Done when traceability is possible.
- [ ] WCRM-285 [P1] Add label and safety document attachment with version and effective date. Done when technicians can access current product instructions.
- [ ] WCRM-286 [P1] Add state or local reporting fields and configurable compliance rules. Done when the system can adapt by territory.
- [ ] WCRM-287 [P1] Block chemical application when weather or required site data violates policy. Done when risky entries are stopped or escalated.
- [ ] WCRM-288 [P1] Generate printable or exportable application records by customer, property, date, and product. Done when an audit packet is one action.
- [ ] WCRM-289 [P2] Add inventory depletion and reorder threshold for chemical products. Done when field use affects supply planning.
- [ ] WCRM-290 [P2] Add chemical incident workflow for spill, exposure, misapplication, or customer complaint. Done when safety incidents are handled separately from ordinary issues.

## 30. Materials and Inventory

- [ ] WCRM-291 [P1] Add material catalog with unit, cost, vendor, active status, service category, and reorder point. Done when all cost inputs are structured.
- [ ] WCRM-292 [P1] Add warehouse, truck, branch, and job-site inventory locations. Done when stock ownership is visible.
- [ ] WCRM-293 [P1] Add receiving, transfer, adjustment, consumption, return, and waste transactions. Done when quantity changes are auditable.
- [ ] WCRM-294 [P1] Add average, FIFO, and latest-cost options with tenant setting. Done when job cost method is explicit.
- [ ] WCRM-295 [P1] Add vendor catalog import with effective date and source file. Done when supplier prices can be updated safely.
- [ ] WCRM-296 [P1] Add purchase order request, approval, receipt, and backorder state. Done when planned material spend is visible.
- [ ] WCRM-297 [P1] Add material reservation for scheduled jobs. Done when dispatch can see supply risk before arrival.
- [ ] WCRM-298 [P2] Add barcode or SKU scanning boundary for future field inventory use. Done when catalog identifiers are ready for devices.
- [ ] WCRM-299 [P2] Add material waste reason and variance reporting. Done when overuse can be coached.
- [ ] WCRM-300 [P1] Add material catalog change history with who, old value, new value, and effective date. Done when pricing disputes are explainable.

## 31. Labor and Time Tracking

- [ ] WCRM-301 [P0] Add timesheet start, pause, resume, stop, submit, approve, reject, and lock states. Done when payroll inputs have a controlled lifecycle.
- [ ] WCRM-302 [P1] Add labor rate cards by role, employee, crew, branch, and effective date. Done when cost assignment is accurate.
- [ ] WCRM-303 [P1] Separate labor cost rate from billable rate. Done when margin is not confused with payroll.
- [ ] WCRM-304 [P1] Add time source metadata for manual, GPS, geofence, imported, and supervisor-adjusted entries. Done when corrections are transparent.
- [ ] WCRM-305 [P1] Add technician and crew productivity metrics by service and property type. Done when estimates can improve from actuals.
- [ ] WCRM-306 [P1] Add overtime, travel, setup, cleanup, and non-billable time categories. Done when total labor cost is complete.
- [ ] WCRM-307 [P1] Add timesheet approval queue with variance thresholds. Done when managers review unusual entries.
- [ ] WCRM-308 [P1] Add edit lock after payroll export or invoice close. Done when historical cost cannot change silently.
- [ ] WCRM-309 [P2] Add geofence variance review without making GPS mandatory. Done when privacy and operational accuracy are balanced.
- [ ] WCRM-310 [P2] Add crew utilization report with scheduled, travel, service, idle, and approved hours. Done when capacity decisions use real data.

## 32. Equipment and Fleet

- [ ] WCRM-311 [P1] Add equipment records with type, serial, branch, owner, status, and assigned crew. Done when resources are traceable.
- [ ] WCRM-312 [P1] Add equipment rate card for ownership, rental, fuel, maintenance, and usage. Done when job costs include equipment.
- [ ] WCRM-313 [P1] Add equipment requirements to service catalog and job visits. Done when dispatch can identify conflicts.
- [ ] WCRM-314 [P1] Add inspection, maintenance, repair, downtime, and retirement states. Done when unsafe equipment is not assignable.
- [ ] WCRM-315 [P1] Add maintenance schedule by calendar, hours, miles, or usage count. Done when recurring maintenance is planned.
- [ ] WCRM-316 [P2] Add vehicle mileage, fuel, and route cost capture. Done when transportation cost is measurable.
- [ ] WCRM-317 [P2] Add equipment assignment conflict warnings. Done when one unit cannot be scheduled to two crews.
- [ ] WCRM-318 [P2] Add equipment checkout and return workflow. Done when responsibility is clear.
- [ ] WCRM-319 [P2] Add equipment cost allocation to visit and job. Done when actual margin reflects usage.
- [ ] WCRM-320 [P2] Add maintenance and downtime dashboard. Done when fleet decisions are proactive.

## 33. Job Costing

- [ ] WCRM-321 [P0] Define canonical job cost categories for labor, materials, equipment, subcontractor, disposal, travel, and overhead. Done when every cost maps consistently.
- [ ] WCRM-322 [P0] Store estimated, committed, actual, and forecast cost separately. Done when managers can distinguish plan from reality.
- [ ] WCRM-323 [P0] Recalculate job cost summaries idempotently from source transactions. Done when totals cannot drift from repeated jobs.
- [ ] WCRM-324 [P1] Add cost allocation by job, phase, visit, service line, property, and crew. Done when profitability can be drilled down.
- [ ] WCRM-325 [P1] Add revenue snapshot tied to sold scope, invoice, and payment state. Done when revenue definitions are explicit.
- [ ] WCRM-326 [P1] Add gross profit, gross margin, contribution margin, and variance formulas. Done when reports use named formulas.
- [ ] WCRM-327 [P1] Add threshold alerts for labor overrun, material overuse, low margin, and missing actuals. Done when owners see risk early.
- [ ] WCRM-328 [P1] Add variance reason taxonomy and manager comment. Done when deviations create learning.
- [ ] WCRM-329 [P1] Add cost correction workflow with source transaction and reason. Done when corrections never become unexplained edits.
- [ ] WCRM-330 [P2] Add job-cost close lock after invoice or period close. Done when historical reporting remains stable.

## 34. Invoicing

- [ ] WCRM-331 [P0] Add invoice lifecycle states: draft, issued, sent, viewed, partially paid, paid, overdue, void, and disputed. Done when AR states are unambiguous.
- [ ] WCRM-332 [P1] Add invoice number sequencing per organization or branch. Done when numbers are unique and compliant.
- [ ] WCRM-333 [P1] Add invoice lines with quantity, unit, rate, discount, tax, cost reference, and service period. Done when invoices reconcile to work.
- [ ] WCRM-334 [P1] Add invoice generation from job closeout, estimate, recurring plan, and change order. Done when billing does not require retyping.
- [ ] WCRM-335 [P0] Add tax calculation boundary with jurisdiction, exemption, and rounding policy. Done when taxes are explicit and testable.
- [ ] WCRM-336 [P1] Add payment terms, due date, billing contact, PO number, and customer reference. Done when commercial requirements are captured.
- [ ] WCRM-337 [P1] Add branded invoice PDF or print output with service address and payment instructions. Done when customers receive a complete document.
- [ ] WCRM-338 [P1] Add invoice preview before issue and confirmation for irreversible issue. Done when accidental billing is minimized.
- [ ] WCRM-339 [P1] Add credit memo, void, write-off, and reissue flows with permission and audit. Done when corrections preserve the financial trail.
- [ ] WCRM-340 [P1] Add invoice aging and overdue task generation. Done when unpaid balances create work automatically.

## 35. Payments and Accounts Receivable

- [ ] WCRM-341 [P0] Define payment and allocation records separately from invoices. Done when one payment can be allocated across invoices.
- [ ] WCRM-342 [P1] Support manual payment methods with reference, date, amount, and deposit account metadata. Done when office payments are traceable.
- [ ] WCRM-343 [P0] Add provider-neutral payment webhook contract for future live payment integrations. Done when provider events map idempotently.
- [ ] WCRM-344 [P1] Add partial payment, overpayment, unapplied payment, refund, and chargeback states. Done when balances reconcile.
- [ ] WCRM-345 [P1] Add customer balance and statement view. Done when staff can answer “what do I owe?” quickly.
- [ ] WCRM-346 [P1] Add collection stages and next action for overdue accounts. Done when AR is managed rather than merely reported.
- [ ] WCRM-347 [P1] Add payment confirmation activity and optional customer notification. Done when receipts have an audit trail.
- [ ] WCRM-348 [P1] Add payment reconciliation report by date, method, processor, invoice, and deposit batch. Done when books can be checked.
- [ ] WCRM-349 [P2] Add autopay eligibility and mandate state without storing payment instruments. Done when future payment automation is safe.
- [ ] WCRM-350 [P1] Add finance permission tests preventing field and sales roles from changing payments. Done when money controls are enforced.

## 36. Revenue and P&L Proxy

- [ ] WCRM-351 [P0] Define booked, completed, invoiced, collected, deferred, and recurring revenue metrics. Done when dashboards do not mix incompatible totals.
- [ ] WCRM-352 [P1] Add revenue recognition period fields for service dates and invoice dates. Done when period reports are explainable.
- [ ] WCRM-353 [P1] Add operating expense categories for labor overhead, vehicle, equipment, materials, subcontractors, software, and other. Done when the P&L proxy has structure.
- [ ] WCRM-354 [P1] Add monthly revenue and cost snapshots for stable historical reporting. Done when late edits do not rewrite closed months.
- [ ] WCRM-355 [P1] Add gross profit and contribution profit by month, service, branch, crew, and customer. Done when leaders can act on margins.
- [ ] WCRM-356 [P1] Add budget versus actual operating expense input. Done when owners can compare plan to reality.
- [ ] WCRM-357 [P1] Add cash collection view separate from accrual-style revenue. Done when cash flow is not confused with sales.
- [ ] WCRM-358 [P2] Add owner-level P&L proxy with clear exclusions from a full accounting ledger. Done when expectations are honest.
- [ ] WCRM-359 [P2] Add export-ready monthly P&L rows with formula provenance. Done when accountants can continue the analysis externally.
- [ ] WCRM-360 [P1] Add dashboard definitions and tooltip glossary for every financial KPI. Done when the same number means the same thing everywhere.

## 37. Customer Profitability and LTV

- [ ] WCRM-361 [P1] Add customer lifecycle snapshots with tenure, revenue, cost, margin, visits, and payment history. Done when LTV has a stable basis.
- [ ] WCRM-362 [P1] Define LTV formula options for historical, recurring, cohort, and forecast models. Done when owners can choose a defensible method.
- [ ] WCRM-363 [P1] Add customer acquisition cost input by source and period. Done when LTV:CAC is meaningful.
- [ ] WCRM-364 [P1] Add LTV:CAC ratio with data completeness warning. Done when missing CAC does not look like excellent performance.
- [ ] WCRM-365 [P1] Add customer profitability profile with service mix, callbacks, discounts, AR, and next action. Done when account reviews are actionable.
- [ ] WCRM-366 [P1] Add profitability by property and service line. Done when individual sites can be repriced or redesigned.
- [ ] WCRM-367 [P2] Add cohort analysis by acquisition month, service, territory, and plan. Done when retention trends are comparable.
- [ ] WCRM-368 [P2] Add LTV sensitivity to churn, price, frequency, labor, and material cost. Done when strategy can be simulated.
- [ ] WCRM-369 [P2] Add customer profitability export with definitions and source timestamps. Done when reporting is reviewable outside the app.
- [ ] WCRM-370 [P1] Add data freshness status to all LTV cards. Done when stale snapshots are not mistaken for live truth.

## 38. Churn and Retention

- [ ] WCRM-371 [P0] Define churn event, cancellation date, archive date, pause, downgrade, and win-back states. Done when churn is not inferred inconsistently.
- [ ] WCRM-372 [P1] Add cancellation reason taxonomy including price, service, move, competitor, no response, seasonality, and bad fit. Done when churn is learnable.
- [ ] WCRM-373 [P1] Add churn trend by month, company, plan, service, town, lawn size, and tenure. Done when segments can be compared.
- [ ] WCRM-374 [P1] Add missing archive-date and missing-reason data-quality flags. Done when incomplete historical data is disclosed.
- [ ] WCRM-375 [P1] Add account health score from usage, overdue work, complaints, margin, visits, and engagement. Done when risk is explainable.
- [ ] WCRM-376 [P1] Add high-risk customer queue with owner, reason, next action, and due date. Done when retention has a workflow.
- [ ] WCRM-377 [P2] Add renewal forecast and expected retained revenue. Done when churn risk connects to revenue planning.
- [ ] WCRM-378 [P2] Add win-back campaigns as task sequences without sending messages automatically. Done when outreach can be planned safely.
- [ ] WCRM-379 [P2] Add churn comparison between GreenAce, Turf Pro, and live tenant data with source labeling. Done when demo benchmarks never masquerade as tenant facts.
- [ ] WCRM-380 [P1] Add churn metric tests for tenure, denominator, canceled plan, and archived customer edge cases. Done when dashboard totals are defensible.

## 39. Admin Roles and Permissions

- [ ] WCRM-381 [P0] Define permission matrix for owner, admin, manager, sales, estimator, dispatcher, crew, technician, finance, and viewer. Done when every module has explicit access.
- [ ] WCRM-382 [P0] Enforce least privilege in Convex rather than relying on hidden UI controls. Done when direct function calls are safe.
- [ ] WCRM-383 [P1] Add role editor with permission preview and affected-module summary. Done when admins understand the effect of a role change.
- [ ] WCRM-384 [P1] Add custom role templates without allowing owners to remove their own last-owner access. Done when misconfiguration cannot lock out a tenant.
- [ ] WCRM-385 [P0] Add last-owner protection, ownership transfer, and emergency owner recovery. Done when admin continuity is preserved.
- [ ] WCRM-386 [P1] Add field-level visibility rules for financial, personal, chemical, and internal notes. Done when roles see only necessary data.
- [ ] WCRM-387 [P1] Add branch and territory scope to membership permissions. Done when multi-location teams can be separated.
- [ ] WCRM-388 [P1] Add invite rate limits, expiration, resend, revoke, and audit. Done when membership lifecycle is controlled.
- [ ] WCRM-389 [P1] Add temporary access grants with start, end, reason, and automatic revocation. Done when contractors can be onboarded safely.
- [ ] WCRM-390 [P0] Add automated negative permission tests for every sensitive mutation. Done when role drift fails CI.

## 40. Workflow Settings and Catalog Administration

- [ ] WCRM-391 [P1] Add editable lead, opportunity, estimate, job, visit, invoice, and issue statuses. Done when tenants can model their process.
- [ ] WCRM-392 [P1] Add allowed transitions, required fields, terminal states, and reporting category per status. Done when configuration remains coherent.
- [ ] WCRM-393 [P1] Add service catalog editor with unit, category, default duration, default checklist, required equipment, and active state. Done when services drive operations.
- [ ] WCRM-394 [P1] Add price-book editor with effective dates and branch scope. Done when rates can change without rewriting history.
- [ ] WCRM-395 [P1] Add labor and equipment rate editor with approval and change history. Done when cost assumptions are governed.
- [ ] WCRM-396 [P1] Add default tax, invoice terms, late fee, and payment instruction settings. Done when billing defaults are intentional.
- [ ] WCRM-397 [P2] Add template editor for checklists, tasks, quotes, invoices, and visit summaries. Done when operations can improve without deployments.
- [ ] WCRM-398 [P2] Add feature enable/disable controls by industry and branch. Done when mixed operators can keep screens focused.
- [ ] WCRM-399 [P1] Add settings validation for orphaned statuses, inactive catalog dependencies, and missing rates. Done when admins cannot save broken configuration.
- [ ] WCRM-400 [P1] Add settings preview and publish workflow. Done when high-impact changes can be reviewed before going live.

## 41. Audit, Compliance, and Data Governance

- [ ] WCRM-401 [P0] Audit every login-sensitive, billing, permission, import, export, delete, merge, and data-changing action. Done when privileged activity is traceable.
- [ ] WCRM-402 [P0] Store actor, organization, action, entity, before summary, after summary, timestamp, request ID, and source. Done when events can answer who changed what.
- [ ] WCRM-403 [P0] Prevent ordinary users from editing or deleting audit records. Done when the audit trail is trustworthy.
- [ ] WCRM-404 [P1] Add audit filters by actor, module, action, entity, date, and request ID. Done when support can investigate quickly.
- [ ] WCRM-405 [P1] Add retention policy for operational, financial, chemical, and audit records. Done when retention is intentional.
- [ ] WCRM-406 [P0] Add privacy export for a customer or user with linked records and exclusions. Done when data requests have a process.
- [ ] WCRM-407 [P0] Add deletion or anonymization workflow with legal hold and financial-record rules. Done when privacy deletion does not corrupt books.
- [ ] WCRM-408 [P1] Add chemical compliance record generation with validation and evidence links. Done when regulatory packets are reproducible.
- [ ] WCRM-409 [P1] Add consent history and policy version tracking. Done when permission changes can be explained.
- [ ] WCRM-410 [P1] Add audit export with integrity metadata and export event. Done when records can be handed to an auditor.

## 42. Imports and Exports

- [ ] WCRM-411 [P0] Define versioned CSV schemas for customers, contacts, properties, leads, services, materials, rates, and invoices. Done when imports are documented.
- [ ] WCRM-412 [P1] Add column mapping with saved mapping templates. Done when each client does not repeat setup.
- [ ] WCRM-413 [P1] Add row preview with normalized and original values side by side. Done when transformations are visible.
- [ ] WCRM-414 [P0] Add import transaction, row status, error code, warning, and source line number. Done when failures are repairable.
- [ ] WCRM-415 [P0] Add dry run and commit separation. Done when owners can inspect impact before writing data.
- [ ] WCRM-416 [P1] Add import rollback or compensating archive for created records. Done when a bad file is recoverable.
- [ ] WCRM-417 [P1] Add duplicate handling modes: skip, update, merge review, or create new. Done when behavior is explicit.
- [ ] WCRM-418 [P1] Add export jobs for filtered data with progress, expiration, and audit. Done when large exports do not block the UI.
- [ ] WCRM-419 [P1] Add export privacy controls and redaction presets. Done when users do not export more than necessary.
- [ ] WCRM-420 [P2] Add import quality report comparing pre-import and post-import completeness. Done when migration outcomes are measurable.

## 43. Integrations and External Data

- [ ] WCRM-421 [P1] Create provider-neutral integration records with status, scopes, connected user, and last sync. Done when connections are manageable.
- [ ] WCRM-422 [P0] Keep third-party secrets server-side and redact them from logs, errors, and audit metadata. Done when integrations cannot leak credentials.
- [ ] WCRM-423 [P1] Add Google Maps link generation with address fallback and manual correction. Done when maps work without storing unnecessary data.
- [ ] WCRM-424 [P1] Add NWS weather adapter with forecast, observation, alert, and stale-data state. Done when field decisions have weather context.
- [ ] WCRM-425 [P1] Add BLS wage adapter with occupation, geography, period, source, and confidence. Done when labor defaults have provenance.
- [ ] WCRM-426 [P1] Add FRED or World Bank commodity index adapter with series, period, value, and source. Done when market trends are separated from local price truth.
- [ ] WCRM-427 [P1] Add admin overrides for external cost data with effective dates and reason. Done when local knowledge wins predictably.
- [ ] WCRM-428 [P1] Add integration retry, backoff, stale status, and manual refresh. Done when provider failures are visible.
- [ ] WCRM-429 [P2] Add webhook event log for each external provider. Done when support can inspect delivery and processing state.
- [ ] WCRM-430 [P2] Add connector health dashboard with last success, failure count, and next retry. Done when integrations are operationally owned.

## 44. Notifications and Automation

- [ ] WCRM-431 [P1] Add notification preference model by user, channel, event, priority, and quiet hours. Done when users control noise.
- [ ] WCRM-432 [P1] Add internal notification inbox for assignments, approvals, failures, mentions, and escalations. Done when action-required events have a home.
- [ ] WCRM-433 [P1] Add event-driven automation rules with trigger, conditions, actions, owner, and enabled state. Done when simple workflows do not require code.
- [ ] WCRM-434 [P0] Add loop prevention and max-run limits for automations. Done when a rule cannot create an event storm.
- [ ] WCRM-435 [P1] Add automation run log with input, action, result, error, and retry. Done when an admin can debug a rule.
- [ ] WCRM-436 [P1] Add lead SLA escalation automation. Done when aging leads are reassigned or surfaced.
- [ ] WCRM-437 [P1] Add visit reminder and weather-alert task automation. Done when dispatch has a head start on exceptions.
- [ ] WCRM-438 [P1] Add invoice overdue and payment failure task automation. Done when AR follow-up is consistent.
- [ ] WCRM-439 [P2] Add renewal and churn-risk playbook automation. Done when retention work is repeatable.
- [ ] WCRM-440 [P2] Add automation dry run and sample event preview. Done when admins can test safely.

## 45. Reporting and Dashboards

- [ ] WCRM-441 [P0] Define a KPI dictionary with formula, source tables, timezone, filters, and freshness. Done when every dashboard card has a definition.
- [ ] WCRM-442 [P1] Add dashboard date range, branch, territory, service, crew, owner, and customer filters. Done when users can answer scoped questions.
- [ ] WCRM-443 [P1] Add dashboard loading and stale-data indicators. Done when delayed calculations are disclosed.
- [ ] WCRM-444 [P1] Add saved dashboard views and default role dashboards. Done when each role sees relevant work.
- [ ] WCRM-445 [P1] Add pipeline dashboard with volume, value, stage aging, win rate, and source. Done when sales performance is visible.
- [ ] WCRM-446 [P1] Add operations dashboard with today visits, conflicts, overdue tasks, route risk, and crew workload. Done when dispatch starts from exceptions.
- [ ] WCRM-447 [P1] Add financial dashboard with booked, invoiced, collected, AR, margin, and variance. Done when owners can see business health.
- [ ] WCRM-448 [P2] Add service and crew benchmarking with minimum sample warnings. Done when comparisons are not misleading.
- [ ] WCRM-449 [P2] Add drill-through from every KPI to the filtered source records. Done when charts lead to action.
- [ ] WCRM-450 [P1] Add chart empty, partial, error, and no-permission states. Done when visualizations never imply zero when data is unavailable.

## 46. Performance and Reliability

- [ ] WCRM-451 [P0] Add query limits, pagination, and bounded list reads for every tenant-facing screen. Done when a large tenant cannot overload a query.
- [ ] WCRM-452 [P0] Add indexes for every high-volume filter and verify query plans during load testing. Done when common screens remain predictable.
- [ ] WCRM-453 [P1] Add virtualization for long tables and timelines. Done when 1,000-row screens remain responsive.
- [ ] WCRM-454 [P1] Add cache and invalidation policy for catalog, settings, weather, and dashboards. Done when stale data has an explicit TTL.
- [ ] WCRM-455 [P1] Add retry policy only for safe idempotent reads and writes. Done when retries cannot duplicate side effects.
- [ ] WCRM-456 [P1] Add graceful degradation when maps, weather, billing, or monitoring providers are unavailable. Done when core operations continue with clear warnings.
- [ ] WCRM-457 [P1] Add scheduled job lock and retry tracking. Done when scheduled recalculation cannot run concurrently without control.
- [ ] WCRM-458 [P1] Add load tests for large customer, lead, job, visit, and audit datasets. Done when limits are based on evidence.
- [ ] WCRM-459 [P1] Add failure recovery for interrupted imports, exports, route generation, and cost recalculation. Done when jobs resume or report exactly where they stopped.
- [ ] WCRM-460 [P0] Add uptime and error alerts with tenant-safe context. Done when a production failure reaches an owner quickly.

## 47. Security and Privacy

- [ ] WCRM-461 [P0] Run secret scanning in local verification and CI. Done when committed or unignored credential patterns fail checks.
- [ ] WCRM-462 [P0] Rotate any previously shared development or production secrets before launch. Done when old credentials are revoked.
- [ ] WCRM-463 [P0] Add authorization tests for every public route and Convex function. Done when unauthenticated access is rejected.
- [ ] WCRM-464 [P0] Add object-level access tests for customer, property, job, invoice, photo, export, and audit IDs. Done when guessed IDs reveal nothing.
- [ ] WCRM-465 [P0] Add input length, file type, file size, and content validation. Done when oversized or unsafe payloads are rejected.
- [ ] WCRM-466 [P0] Add secure file storage access with signed, expiring URLs. Done when files are never publicly enumerable.
- [ ] WCRM-467 [P1] Add CSP, security headers, CSRF strategy, and origin validation for mutating routes. Done when browser attack surfaces are covered.
- [ ] WCRM-468 [P1] Add rate limits for sign-in-adjacent, public intake, billing, exports, and expensive reports. Done when abuse has predictable controls.
- [ ] WCRM-469 [P1] Add privacy classification for PII, financial, location, chemical, and internal data. Done when retention and visibility can use data class.
- [ ] WCRM-470 [P1] Add quarterly access review and dormant-member deactivation workflow. Done when permissions do not accumulate forever.

## 48. Testing, Accessibility, and Quality

- [ ] WCRM-471 [P0] Make typecheck, lint, unit tests, Convex tests, build, and Cloudflare preview part of the release gate. Done when a broken release cannot be promoted silently.
- [ ] WCRM-472 [P0] Add tenant isolation tests for every new table and module. Done when schema growth cannot bypass the core security invariant.
- [ ] WCRM-473 [P1] Add state-machine tests for lead, estimate, job, visit, invoice, subscription, and issue workflows. Done when invalid transitions are caught.
- [ ] WCRM-474 [P1] Add property-based tests for price, margin, tax, allocation, and recurrence calculations. Done when edge inputs are exercised beyond examples.
- [ ] WCRM-475 [P1] Add Playwright fixtures for owner, admin, sales, dispatcher, technician, finance, viewer, free, pro, and demo tenants. Done when role behavior is reproducible.
- [ ] WCRM-476 [P1] Add visual regression screenshots for dashboard, lead table, calendar, dispatch, field, costing, profit, and admin. Done when UI drift is detectable.
- [ ] WCRM-477 [P1] Add accessibility tests for keyboard, focus, labels, contrast, dialogs, tables, and mobile controls. Done when core flows meet an agreed WCAG target.
- [ ] WCRM-478 [P1] Add duplicate-key and unstable-list regression tests. Done when console errors are treated as defects.
- [ ] WCRM-479 [P1] Add network failure and slow-response tests for forms and field submission. Done when retry UX is verified.
- [ ] WCRM-480 [P2] Add representative seeded datasets for small, medium, and high-volume tenants. Done when performance and UX tests reflect reality.

## 49. Billing and SaaS Operations

- [ ] WCRM-481 [P0] Define Free, Pro, trial, past-due, suspended, canceled, and grace-period entitlements. Done when plan state controls server behavior.
- [ ] WCRM-482 [P0] Enforce the Free contact limit in Convex, including imports, intake, conversion, and bulk actions. Done when no write path bypasses the cap.
- [ ] WCRM-483 [P0] Make Paddle checkout idempotent and attach organization metadata to every transaction. Done when payment events map to one tenant.
- [ ] WCRM-484 [P0] Verify Paddle webhook signatures, replay windows, event IDs, and idempotent processing. Done when forged or repeated events are rejected safely.
- [ ] WCRM-485 [P0] Map Paddle subscription states to organization billing state with a documented transition table. Done when access changes are predictable.
- [ ] WCRM-486 [P1] Add customer portal launch, payment method update, invoice history, cancellation, and plan change states. Done when support does not need manual billing edits.
- [ ] WCRM-487 [P1] Add billing grace period and read-only behavior for past-due tenants. Done when customers can recover without data loss.
- [ ] WCRM-488 [P1] Add billing audit timeline and support-safe subscription diagnostics. Done when payment problems are explainable without exposing secrets.
- [ ] WCRM-489 [P1] Add usage meter for contacts, storage, members, imports, and expensive jobs. Done when future packaging has facts.
- [ ] WCRM-490 [P1] Add billing test mode with isolated sandbox identifiers and webhook fixtures. Done when billing can be tested without live charges.

## 50. Launch, Support, and Scale

- [ ] WCRM-491 [P0] Write a paid-beta launch checklist covering auth, billing, data, security, support, monitoring, and rollback. Done when one owner can run the gate.
- [ ] WCRM-492 [P0] Add production smoke test that creates a tenant, invites a member, creates a lead, converts a quote, schedules a visit, submits field work, and records billing state. Done when the full path is tested.
- [ ] WCRM-493 [P0] Add backup, export, restore, and disaster-recovery runbook with recovery objectives. Done when an outage has an executable response.
- [ ] WCRM-494 [P1] Add support admin view with tenant diagnostics, recent errors, billing state, and safe impersonation alternative. Done when support can help without sharing credentials.
- [ ] WCRM-495 [P1] Add in-app bug report with page, tenant-safe context, browser, build ID, and optional screenshot. Done when reports arrive actionable.
- [ ] WCRM-496 [P1] Add status page, incident banner, maintenance mode, and customer communication template. Done when outages are communicated consistently.
- [ ] WCRM-497 [P1] Add product analytics for activation, time to first lead, time to first quote, time to first job, weekly active users, and feature adoption. Done when onboarding and retention have evidence.
- [ ] WCRM-498 [P1] Add customer success health view combining usage, support, billing, churn risk, and expansion signals. Done when client accounts can be managed proactively.
- [ ] WCRM-499 [P2] Add release notes, migration notices, and feature education tied to user role. Done when changes are understandable without training calls.
- [ ] WCRM-500 [P0] Establish a quarterly product audit that re-runs all 500 items, verifies evidence, retires obsolete work, and promotes the next implementation batch. Done when quality work becomes a durable operating process.

## Recommended Execution Order

Start with the P0 items that protect tenant isolation, money, compliance, data recovery, and field reliability. Next complete the P1 daily operating workflows: lead response, estimating, calendar, dispatch, field completion, job costing, invoicing, admin permissions, and dashboards. Then use P2 items to improve retention and competitive depth. P3 items should wait until usage data identifies the highest-value expansion.

The first build batch should be WCRM-011, WCRM-020, WCRM-030, WCRM-071, WCRM-078, WCRM-161, WCRM-167, WCRM-191, WCRM-211, WCRM-251, WCRM-261, WCRM-272, WCRM-281, WCRM-301, WCRM-321, WCRM-331, WCRM-351, WCRM-371, WCRM-381, WCRM-401, WCRM-461, WCRM-471, WCRM-481, and WCRM-491 through WCRM-493.

This backlog is the definition of "world class" only when each item has evidence. A feature is not done because a button exists; it is done when the workflow survives invalid input, wrong permissions, retries, network failure, mobile layout, audit review, and a realistic tenant dataset.
