# 100 Customer Journeys for Landscape CRM

This is the goal-run source map for building the product into a serious green-industry SaaS. It covers the full customer lifecycle for the SaaS buyer/user and the operator's own customers: discovery, signup, onboarding, lead ops, CRM, estimating, dispatch, field work, job management, revenue, profitability, admin, governance, and churn.

The executable registry lives in `src/data/customer-journeys.ts`, and the in-app surface lives in `/app` under Journeys. Keep this document human-readable and keep the TypeScript registry test-enforced.

## Goal Run Standard

Every journey should eventually have:

- A visible app surface where a non-technical operator can start and finish the journey.
- Tenant-owned Convex records with organization isolation and role checks.
- A clear success state and a recoverable failure state.
- Audit or activity events for important state changes.
- At least one test: unit, Convex function, or Playwright.
- Reporting hooks for later SaaS analytics, revenue analytics, and Postgres mirror export through `auditEvents`.

Coverage definitions:

- `verified`: screen, data path, permission/audit behavior, and test evidence exist.
- `interactive`: user can try it in the app, but persistence, permission depth, or tests are incomplete.
- `modeled`: schema/domain support exists, but the workflow is not usable enough yet.
- `gap`: a meaningful product object, screen, function, or workflow is missing.

Implementation order:

1. Finish P0 gaps.
2. Finish P0 modeled journeys.
3. Finish P0 interactive journeys.
4. Fill P1 gaps.
5. Harden scale, governance, and P2 journeys.

Current registry snapshot, June 22, 2026: 100 total journeys, 58 verified, 12 interactive, 26 modeled, 4 gaps.

## SaaS Discovery, Evaluation, and Purchase

### 1. Owner searches for an Arborgold or Jobber alternative

- Actor: owner, founder, or general manager.
- Trigger: the business has outgrown spreadsheets, whiteboards, or a generic CRM.
- Prime-time path: search result or referral lands on the homepage, the page proves this is built for landscaping, lawn care, pest control, tree care, irrigation, snow, and outdoor services, then routes to pricing, features, demo, or signup.
- Required data and events: anonymous visit, source channel, selected industry interest, demo CTA, pricing CTA, signup CTA, and audit-safe conversion event.
- Done when: the buyer understands the product category in under one minute and can start a demo or free account without talking to a developer.

### 2. Solo lawn-care operator compares free CRM options

- Actor: owner-operator with limited admin time.
- Trigger: the operator wants a free or low-risk way to organize contacts and follow-ups.
- Prime-time path: pricing explains the free plan, the 10-contact limit, what happens at the limit, and the upgrade value without hiding core workflow details.
- Required data and events: plan, contact cap, current usage, upgrade CTA, plan-limit rejection state, and subscription event.
- Done when: a free account can be created, 10 contacts can be managed, and the 11th contact produces a clear upgrade path.

### 3. Pest-control owner checks chemical tracking fit

- Actor: pest-control owner or compliance lead.
- Trigger: buyer needs confidence that applications, materials, weather, and compliance records are not afterthoughts.
- Prime-time path: solutions page and field/cost screens show product, quantity, EPA or chemical metadata, applicator, site, weather, and service history.
- Required data and events: material catalog, material application, applicator user, property, weather snapshot, visit, job, and compliance activity.
- Done when: a pest operator can see how a visit becomes a defensible chemical/service record.

### 4. Landscape company evaluates job-costing depth

- Actor: owner, estimator, or operations manager.
- Trigger: margins are unclear across labor, materials, equipment, overhead, and callbacks.
- Prime-time path: job-costing page shows estimated vs actual labor, materials, equipment, overhead, revenue, gross profit, margin, variance, and recommendations.
- Required data and events: job cost summary, estimate line items, timesheets, material usage, equipment rates, labor rates, overhead settings, and recalculation event.
- Done when: a buyer can compare expected margin to actual margin by job and understand the main variance driver.

### 5. Sales manager compares lead pipeline to HubSpot

- Actor: sales manager.
- Trigger: team needs pipeline discipline without losing green-industry job context.
- Prime-time path: lead and pipeline views show lead stages, owners, saved views, source, service line, value, probability, activity timeline, tasks, and conversion.
- Required data and events: leads, opportunities, owners, activities, notes, tasks, stage changes, saved views, and audit events.
- Done when: the sales manager can filter the pipeline, spot stale leads, and understand next action by rep.

### 6. Dispatcher compares schedule board to Arborgold

- Actor: dispatcher or operations coordinator.
- Trigger: dispatch team wants to know whether the schedule board can replace current field coordination.
- Prime-time path: dispatch surface shows date, crews, visits, time windows, route order, workload conflicts, missing skills/equipment, and map links.
- Required data and events: job visits, crews, assignments, crew members, route plans, route stops, equipment, skill tags, and schedule audit events.
- Done when: a dispatcher can assign work and immediately see capacity or route risk.

### 7. Field supervisor validates mobile workflow

- Actor: field supervisor.
- Trigger: supervisor wants proof crews can run the day from a phone.
- Prime-time path: mobile field app shows assigned visits, job detail, property notes, checklists, photos, materials, equipment, issue flags, and submit flow.
- Required data and events: assignments, job visits, checklist items, photos/files, material applications, timesheets, field notes, and completion audit event.
- Done when: a crew member can complete a representative visit from mobile without office assistance.

### 8. Admin evaluates user permissions

- Actor: administrator, owner, or security-minded manager.
- Trigger: buyer needs role boundaries before inviting staff.
- Prime-time path: admin screen shows roles, member invites, permission matrix, feature flags, plan limits, and audit log.
- Required data and events: users, memberships, invitations, roles, feature flags, permission changes, audit events, and plan entitlements.
- Done when: an admin can explain what a technician, sales user, dispatcher, manager, and owner can and cannot do.

### 9. Multi-branch company evaluates tenant model

- Actor: owner/admin of a multi-location company.
- Trigger: buyer needs confidence that each company, branch, or client account is isolated.
- Prime-time path: app demonstrates organization-owned data, role-scoped access, separate members, and reporting boundaries.
- Required data and events: organizations, memberships, organization IDs on tenant tables, tenant checks in functions, and cross-tenant rejection tests.
- Done when: data from one organization cannot be read, mutated, exported, or reported by another organization.

### 10. Buyer requests a sales demo

- Actor: prospect.
- Trigger: buyer wants guided proof before committing.
- Prime-time path: prospect enters company details, industry, team size, pain points, and preferred next step, then gets a demo workspace or booking path.
- Required data and events: demo request, contact details, company profile, source, UTM/campaign, requested modules, sales activity, and notification.
- Done when: the request becomes a lead or opportunity with enough context for a seller to follow up.

## Signup, Account Creation, and Onboarding

### 11. New user creates a free account

- Actor: owner.
- Trigger: prospect clicks signup or free plan.
- Prime-time path: one sign-in/signup page supports email/social auth, creates an authenticated user, and routes to onboarding.
- Required data and events: Clerk user, Convex user, organization, owner membership, subscription plan, account-created audit event.
- Done when: a non-technical user can create an account and land in a ready workspace.

### 12. New workspace is provisioned

- Actor: owner.
- Trigger: first authenticated session has no existing organization.
- Prime-time path: provisioning creates default organization records, owner role, free plan, starter settings, catalog defaults, and onboarding checklist.
- Required data and events: organizations, users, memberships, subscription, service catalog, statuses, crews placeholder, checklist, and audit event.
- Done when: the workspace is usable immediately and can be rebuilt idempotently without duplicate core records.

### 13. Owner chooses service verticals

- Actor: owner.
- Trigger: onboarding asks what the business does.
- Prime-time path: owner selects landscaping, lawn care, pest control, tree care, irrigation, snow, design/build, or mixed services.
- Required data and events: organization verticals, enabled modules, starter services, default statuses, default checklists, and analytics event.
- Done when: the app tailors language, catalog defaults, and reporting categories to the selected verticals.

### 14. Owner sets company profile

- Actor: admin or owner.
- Trigger: onboarding needs business identity and operating context.
- Prime-time path: admin enters company name, phone, email, website, logo, service area, address, time zone, tax settings, and default currency.
- Required data and events: organization profile, service area, timezone, billing/contact identity, logo/file, and profile-updated audit event.
- Done when: estimates, invoices, field screens, and reports can show correct company identity.

### 15. Owner imports contacts

- Actor: owner/admin.
- Trigger: business wants to migrate from spreadsheets, phone contacts, or another CRM.
- Prime-time path: CSV upload previews rows, validates name, phone, email, address, service line, source, owner, duplicate risk, and free-plan cap.
- Required data and events: import job, import rows, data quality issues, contacts, customers, properties, leads, opportunities, and import audit event.
- Done when: clean rows can be committed, risky rows can be reviewed, and plan limits are enforced.

### 16. Owner invites first teammate

- Actor: owner/admin.
- Trigger: workspace needs more users.
- Prime-time path: owner enters email, role, optional crew, and invite message; invite moves through pending, accepted, expired, revoked.
- Required data and events: user placeholder, membership invite, role, status, expiration, inviter, and invite audit events.
- Done when: a teammate can be invited without exposing owner-only admin controls.

### 17. Owner configures roles

- Actor: owner/admin.
- Trigger: company needs separation between owner, manager, sales, dispatcher, field tech, and viewer roles.
- Prime-time path: admin reviews matrix, edits memberships, and sees dangerous changes clearly before saving.
- Required data and events: membership role, permission map, role update mutation, audit event, and denial events for forbidden operations.
- Done when: every critical mutation checks membership and role before reading or writing.

### 18. Owner adds crews

- Actor: dispatcher/admin.
- Trigger: company needs scheduling capacity.
- Prime-time path: admin creates crews, assigns members, sets work days, capacity, vehicle, service skills, equipment needs, and home/start point.
- Required data and events: crews, crew members, users, equipment, skills, availability, capacity, and crew audit event.
- Done when: dispatch can use crews for assignments and conflict detection.

### 19. Owner selects starter catalog

- Actor: owner/admin.
- Trigger: new workspace needs service templates.
- Prime-time path: owner selects starter templates by vertical, such as mowing, fertilization, pest recurring, mosquito, irrigation, tree care, snow, or landscape install.
- Required data and events: service catalog, service packages, materials, estimate templates, checklists, price books, statuses, and setup event.
- Done when: estimator can start quoting without building every service from scratch.

### 20. Owner completes onboarding checklist

- Actor: owner.
- Trigger: onboarding needs to drive setup progress.
- Prime-time path: checklist tracks company profile, import, roles, crews, catalog, first lead, first estimate, first job, and demo data cleanup.
- Required data and events: checklist items, completion status, completed by, completed at, recommended next step, and audit event.
- Done when: the app can guide a new customer to first operational value.

## Lead Capture, Import, and Qualification

### 21. Admin imports a lead list

- Actor: admin or sales manager.
- Trigger: business buys, exports, or collects a prospect list.
- Prime-time path: upload list, map columns, validate fields, flag duplicates, assign owners, enforce plan caps, then commit clean rows.
- Required data and events: import jobs, import rows, leads, contacts, customers, properties, opportunities, data quality issues, and import audit event.
- Done when: the team can trust what was imported and see what needs review.

### 22. Sales rep manually creates a lead

- Actor: sales rep.
- Trigger: prospect calls, walks in, emails, or is sourced manually.
- Prime-time path: rep enters contact, property, service request, source, value, urgency, owner, notes, and next step.
- Required data and events: lead, customer/contact/property, opportunity, activity, task, source, service line, and create audit event.
- Done when: the new lead appears in Lead Ops, CRM, and Pipeline without duplicate customer confusion.

### 23. Call-in lead is logged

- Actor: office coordinator.
- Trigger: inbound phone call from a prospect or customer.
- Prime-time path: coordinator captures caller, phone, urgency, property, service need, call outcome, follow-up due date, and owner.
- Required data and events: lead, contact, customer, property, call activity, follow-up task, urgency, and audit event.
- Done when: no inbound call disappears without an owner and next action.

### 24. Web-form lead arrives

- Actor: sales rep monitoring inbound.
- Trigger: website form or landing page submits a request.
- Prime-time path: API receives submission, scores spam, tags source/campaign/service/location, creates records, and displays it in Lead Ops.
- Required data and events: lead intake form, submission, lead, customer, contact, property, spam score, data quality issue, and audit event.
- Done when: web leads are traceable, filtered, and safe from obvious spam.

### 25. Referral lead is captured

- Actor: sales rep.
- Trigger: existing customer refers a neighbor, friend, HOA, property manager, or business.
- Prime-time path: rep selects referring customer, enters referred prospect, tracks promised incentive, and follows conversion value.
- Required data and events: lead, referring customer relationship, referral source, incentive, opportunity, activity, and conversion attribution.
- Done when: referral performance can be reported and credited.

### 26. Repeat customer requests new service

- Actor: sales rep or office coordinator.
- Trigger: existing customer requests a new job, recurring plan, add-on, or seasonal service.
- Prime-time path: rep opens customer, starts new service request, selects existing property, adds scope, and creates lead/opportunity without duplicate customer.
- Required data and events: existing customer, existing property, new lead, opportunity, activity, task, and audit event.
- Done when: the customer history stays unified.

### 27. Commercial RFP lead is entered

- Actor: sales manager.
- Trigger: commercial bid, HOA request, municipality request, or property manager RFP arrives.
- Prime-time path: capture due date, bid type, document requirements, property count, site walk date, contacts, and internal owner.
- Required data and events: lead, opportunity, tasks, files, contacts, properties, RFP metadata, and due-date reminders.
- Done when: the team can manage bid deadlines and required documents without external spreadsheets.

### 28. Lead is flagged as possible duplicate

- Actor: sales/admin.
- Trigger: imported or created lead matches phone, email, address, or existing customer.
- Prime-time path: duplicate queue shows match reason, confidence, affected records, merge option, dismiss option, and audit trail.
- Required data and events: data quality issue, duplicate candidates, decision, merged records or dismissal, and audit event.
- Done when: duplicate risk is visible before reps create messy account history.

### 29. Lead quality is scored

- Actor: sales manager.
- Trigger: team needs to prioritize follow-up.
- Prime-time path: lead score uses source, service fit, budget/value, urgency, territory, property size, completeness, spam risk, and owner responsiveness.
- Required data and events: score, reasons, thresholds, source, service line, property, budget/value, spam signals, and data quality issues.
- Done when: a manager can sort leads by quality and understand why the score changed.

### 30. Stale lead is surfaced

- Actor: sales manager.
- Trigger: lead has no follow-up or progress within SLA.
- Prime-time path: stale queue shows age, owner, last activity, next task, priority, reassignment, close, or reminder actions.
- Required data and events: lead, activity, task, stale rule, data quality issue, notification, and audit event.
- Done when: no high-value lead can quietly age out.

## CRM, Sales Pipeline, and Relationship Management

### 31. Sales rep opens lead detail

- Actor: sales rep.
- Trigger: rep needs context before follow-up.
- Prime-time path: detail view shows source, quality, contact, property, next step, timeline, notes, tasks, estimate/job links, and duplicate warnings.
- Required data and events: lead, contacts, properties, activities, notes, tasks, opportunities, estimates, and audit-safe read context.
- Done when: the rep can make the next call without searching multiple screens.

### 32. Sales rep logs a call

- Actor: sales rep.
- Trigger: rep completes an outbound or inbound call.
- Prime-time path: rep logs call outcome, notes, follow-up date, opportunity impact, and optional recording/transcript attachment.
- Required data and events: activity, task, opportunity probability/stage update, call outcome, follow-up due date, and audit event.
- Done when: the call changes the timeline and next action immediately.

### 33. Sales rep adds a note

- Actor: sales, manager, or dispatcher.
- Trigger: user needs to preserve context.
- Prime-time path: user attaches note to customer, lead, opportunity, property, job, visit, or invoice with visibility controls.
- Required data and events: note, entity link, author, timestamp, visibility, search index, and audit event.
- Done when: notes are searchable, permissioned, and tied to the correct record.

### 34. Sales rep schedules a site visit

- Actor: sales rep or estimator.
- Trigger: job needs in-person measurement or evaluation.
- Prime-time path: rep schedules estimator visit, selects property, time window, assigned user or crew, map link, and customer instructions.
- Required data and events: task or job visit, property, assigned user/crew, calendar date, map URL, activity, and audit event.
- Done when: site visit appears on the right schedule and the estimator has property context.

### 35. Estimator updates opportunity stage

- Actor: estimator or sales manager.
- Trigger: opportunity moves through qualification, estimate, proposal, won, lost, or nurture.
- Prime-time path: stage control enforces allowed transitions, requires reasons for terminal/lost states, and updates pipeline rollups.
- Required data and events: opportunity, stage, workflow rule, previous stage, next stage, actor, and audit event.
- Done when: invalid transitions are blocked and valid transitions are visible in the timeline.

### 36. Manager reviews pipeline

- Actor: sales manager.
- Trigger: weekly sales review or daily follow-up check.
- Prime-time path: manager filters by owner, source, service line, age, probability, value, next step, and saved view.
- Required data and events: opportunities, leads, owners, activities, saved views, stale flags, and aggregate metrics.
- Done when: manager can identify what to push, rescue, reassign, or close.

### 37. Customer profile is opened

- Actor: office, sales, manager, or finance.
- Trigger: team needs full account context.
- Prime-time path: customer profile shows contacts, properties, jobs, estimates, invoices, payments, notes, files, activities, tasks, and profitability signals.
- Required data and events: customer, contacts, properties, jobs, estimates, invoices, payments, notes, files, activities, tasks, and read permissions.
- Done when: the team can answer "what is happening with this customer?" from one profile.

### 38. Property profile is opened

- Actor: operations, sales, field supervisor, or estimator.
- Trigger: user needs site-specific context.
- Prime-time path: property profile shows address, service areas, measurements, hazards, gate/access notes, service history, active jobs, weather context, and map link.
- Required data and events: property, property areas, jobs, visits, notes, files/photos, weather snapshots, customer, and contacts.
- Done when: a property can be planned, serviced, and priced without re-collecting basic site data.

### 39. Account has multiple decision-makers

- Actor: sales rep or account manager.
- Trigger: commercial, HOA, property manager, or large residential account has several people involved.
- Prime-time path: profile tracks owner, billing contact, site contact, property manager, HOA board contact, tenant, and emergency contact.
- Required data and events: contacts, contact roles, primary flags, communication permissions, customer/property links, and activity timeline.
- Done when: the right person can be contacted for sales, billing, site access, and approvals.

### 40. Lost opportunity is closed

- Actor: sales manager.
- Trigger: prospect declines, ghosts, chooses competitor, or defers.
- Prime-time path: close-lost action requires reason, competitor, price sensitivity, lost value, reactivation date, and optional nurture task.
- Required data and events: opportunity, lost reason, competitor, price note, reactivation task, activity, and audit event.
- Done when: losses become learning data, not just dead records.

## Estimating, Measurements, Quotes, and Approvals

### 41. Estimator creates a quote from a lead

- Actor: estimator.
- Trigger: lead qualifies for pricing.
- Prime-time path: estimator converts lead context into opportunity and estimate, then adds line items, scope, property, measurements, terms, and expiration.
- Required data and events: lead, opportunity, estimate, line items, property, service catalog, price book, and audit event.
- Done when: no lead details are retyped into the quote.

### 42. Estimator adds service package

- Actor: estimator.
- Trigger: quote needs a standard service offering.
- Prime-time path: estimator picks package, sees included labor/material/equipment/checklist defaults, adjusts quantity, and sees margin.
- Required data and events: service package, service catalog item, price book item, line item, labor assumption, material assumption, equipment assumption.
- Done when: common estimates can be built quickly and consistently.
- Current evidence: Costing Service Package Picker, package-backed Pipeline quote selector, seeded package assumptions, and Convex/Playwright coverage verify the v1 path.

### 43. Estimator enters property measurements

- Actor: estimator.
- Trigger: pricing depends on turf, perimeter, bed area, slope, trees, structures, or custom measurements.
- Prime-time path: estimator enters or imports measurements, labels areas, associates services, and sees pricing quantities update.
- Required data and events: property areas, measurement units, service category, estimate line item quantity, pricing session, and audit event.
- Done when: measurements become reusable property intelligence.

### 44. Estimator prices fertilization program

- Actor: estimator.
- Trigger: lawn-care quote needs application-based recurring pricing.
- Prime-time path: estimator chooses program, application count, area, product, rate, material cost, labor assumption, and target margin.
- Required data and events: material, material rate, property area, service package, recurring plan, price rule, and job cost estimate.
- Done when: fertilizer pricing reflects property size, product costs, and margin.
- Current evidence: Costing Fertilization Pricing Calculator, shared pricing formula, seeded fertilizer material/price-book/rules, persisted pricing sessions, audit events, and Convex/Playwright tests verify the v1 path.

### 45. Estimator prices pest recurring plan

- Actor: estimator.
- Trigger: pest customer needs one-time or recurring service.
- Prime-time path: estimator chooses pest category, frequency, treatment type, property constraints, materials/chemicals, and route expectations.
- Required data and events: service package, pest category, material, route constraints, recurring plan, price rule, and estimate line items.
- Done when: recurring pest plans are priced consistently and remain schedulable.

### 46. Estimator compares margin scenarios

- Actor: estimator or owner.
- Trigger: quote price needs confidence before sending.
- Prime-time path: user compares low, target, and premium scenarios, with revenue, gross margin, labor/material/equipment risk, and suggested price.
- Required data and events: pricing session, estimate lines, job cost assumptions, margin guardrails, and scenario records.
- Done when: low-margin work is obvious before the quote reaches the customer.

### 47. Estimate needs internal approval

- Actor: manager.
- Trigger: quote has low margin, large discount, unusual scope, high risk, or manual override.
- Prime-time path: approval queue shows reason, margin impact, requested by, due date, approve/reject decision, and comments.
- Required data and events: approval request, estimate, margin rule, manager decision, comments, and audit event.
- Done when: risky quotes cannot be sent without proper approval.
- Current evidence: ApprovalRequests schema, shared approval rule engine, sendEstimate approval gate, Costing approval queue, manager approve/reject actions, audit events, and Convex/Playwright tests verify the v1 path.

### 48. Estimate is sent to customer

- Actor: sales rep.
- Trigger: quote is ready.
- Prime-time path: sales rep previews customer-facing quote, selected options, terms, expiration, scope, photos, and sends by email/link/export.
- Required data and events: estimate, line items, files, customer contact, send status, sent at, expiration, and activity event.
- Done when: the customer receives a professional, trackable quote package.
- Current evidence: Pipeline Customer Quote Package, quote-send action, sent status, 14-day expiration, activity/audit events, and Convex/Playwright tests verify the v1 path.

### 49. Customer approves quote

- Actor: end customer.
- Trigger: customer accepts proposal or selected option.
- Prime-time path: customer approves through portal/link or office captures verbal approval with source and timestamp.
- Required data and events: estimate status, accepted at, accepted by, signature/approval metadata, activity, and audit event.
- Done when: approved estimate can be converted to a job without ambiguity.
- Current evidence: Estimate acceptance metadata, production acceptEstimate mutation, demo customer approval capture, Pipeline quote package approval state, activity/audit events, and Convex/Playwright tests verify the v1 path.

### 50. Estimate is converted to job

- Actor: operations manager.
- Trigger: quote is won and approved.
- Prime-time path: convert action creates job, phases, visits, tasks, checklists, budget, planned costs, assignments, and timeline.
- Required data and events: estimate, jobs, job visits, tasks, checklist items, job cost summary, assignment, and audit event.
- Done when: sales handoff becomes operational work without manual reconstruction.
- Current evidence: Accepted-estimate conversion gate, production/demo conversion mutations, Pipeline Convert to Job/Open Job controls, job phases, scheduled visit, crew assignment, handoff checklist, handoff task, job-cost summary, activity/audit events, and Convex/Playwright tests verify the v1 path.

## Scheduling, Dispatch, Routing, and Capacity

### 51. Dispatcher views today schedule

- Actor: dispatcher.
- Trigger: start of day or scheduling check.
- Prime-time path: dispatch board shows visits by date, crew, route order, time window, status, duration, job, customer, property, and conflict flags.
- Required data and events: job visits, crews, assignments, jobs, properties, route plans, and schedule metrics.
- Done when: dispatcher can understand the day at a glance.

### 52. Dispatcher assigns a visit

- Actor: dispatcher.
- Trigger: unassigned visit needs crew/date/time.
- Prime-time path: dispatcher selects crew, date, time window, estimated duration, skills, equipment, and route position, then sees conflict impact.
- Required data and events: visit assignment, crew, crew members, route stop, equipment needs, schedule audit event, and conflict result.
- Done when: assignment persists and appears on dispatch and field screens.
- Current evidence: Accessible per-visit crew selector, production/demo assignment persistence, primary assignment upsert, route order update, audit event, route confidence and equipment risk display, Convex assignment persistence test, and Playwright dispatch reassignment test verify the v1 path.

### 53. Dispatcher handles urgent pest call

- Actor: dispatcher.
- Trigger: urgent pest issue or emergency customer request.
- Prime-time path: dispatcher inserts priority visit, sees disruption, chooses crew, alerts office/team, and tracks promise window.
- Required data and events: lead/service request, job visit, priority, route plan, task, customer notification placeholder, and audit event.
- Done when: urgent work can be inserted without losing the original route state.

### 54. Dispatcher reschedules due to weather

- Actor: dispatcher.
- Trigger: rain, snow, wind, heat, chemical restriction, or unsafe conditions affect work.
- Prime-time path: weather panel suggests affected visits, dispatcher bulk moves/reschedules, records reason, and preserves customer communication history.
- Required data and events: weather snapshot, job visits, reschedule reason, activities, tasks, notifications, and audit events.
- Done when: weather disruption is tracked and recoverable.

### 55. Dispatcher builds route order

- Actor: dispatcher.
- Trigger: crew route needs efficient sequencing.
- Prime-time path: dispatcher orders stops by geography, priority, duration, crew start point, service type, and customer constraints.
- Required data and events: route plan, route stops, job visits, properties, estimated travel time, order index, and audit event.
- Done when: route order persists and is visible to crews.
- Current evidence: Dispatch stop numbers, route-order sorting, accessible up/down route controls, production/demo reorder mutations, routeOrder persistence, audit events, Convex route reorder test, and Playwright route reorder test verify the v1 path.

### 56. Crew workload conflict appears

- Actor: dispatcher.
- Trigger: assignment creates overbooking or mismatch.
- Prime-time path: conflict banner explains over capacity, missing skill, missing equipment, travel gap, overlapping time, or blocked crew member.
- Required data and events: crew capacity, skills, equipment, visit duration, assignments, route stops, and conflict rules.
- Done when: dispatcher sees why work is risky before crews are sent out.

### 57. Recurring maintenance route is generated

- Actor: dispatcher.
- Trigger: recurring lawn, pest, irrigation, snow, or maintenance contract needs future visits.
- Prime-time path: recurrence builder creates weekly, biweekly, monthly, seasonal, route-based, or custom visits with exceptions.
- Required data and events: recurring service plan, visit templates, generated visits, route plan, customer/property links, and audit event.
- Done when: recurring work can be generated without duplicate manual entry.
- Current evidence: Recurring service plan schema/type/demo seed, production and demo route-generation mutations, Dispatch Recurring Route Generator UI, generated checklist defaults, assignment rows, job recurrence update, audit event, Convex recurring route test, and Playwright dispatch generation test verify the v1 path.

### 58. Commercial multi-site job is scheduled

- Actor: dispatcher.
- Trigger: property manager, HOA, commercial account, or municipality has multiple locations.
- Prime-time path: scheduler groups properties by customer, geography, service window, crew skills, and contract requirements.
- Required data and events: customer, properties, jobs, visits, route plans, contract window, service group, and assignments.
- Done when: multi-site accounts can be scheduled as a portfolio, not one-off disconnected jobs.

### 59. Missed visit is recovered

- Actor: dispatcher or manager.
- Trigger: visit was skipped, failed, blocked, or not completed.
- Prime-time path: recovery queue shows reason, customer impact, promised makeup, assigned owner, and reschedule action.
- Required data and events: job visit status, missed reason, task, activity, rescheduled visit, notification placeholder, and audit event.
- Done when: missed work creates accountable recovery steps.

### 60. Crew receives daily route

- Actor: field crew.
- Trigger: crew starts day on mobile.
- Prime-time path: field route shows ordered stops, map links, customer/property context, notes, hazards, materials, checklists, and status buttons.
- Required data and events: assignments, route stops, job visits, jobs, properties, checklists, materials, and crew user.
- Done when: crews can run the day without printed route sheets.
- Current evidence: Field PWA sorts the mobile visit list by route order, labels each stop, selected stop detail shows route stop number and Google Maps link, and desktop/mobile Playwright field route assertions verify the route list before start, checklist, material, issue, and submit flow.

## Field Mobile PWA and Crew Execution

### 61. Field tech logs in on mobile

- Actor: field tech.
- Trigger: technician opens app on phone.
- Prime-time path: authenticated field view shows only assigned work and hides restricted CRM/admin/finance data.
- Required data and events: Clerk user, Convex user, membership role, assignments, crew membership, and permission checks.
- Done when: field users see the right jobs and cannot access unrelated tenant data.

### 62. Field tech opens job detail

- Actor: field tech.
- Trigger: tech arrives or prepares for a stop.
- Prime-time path: detail shows scope, property notes, gate codes, hazards, contacts, customer instructions, checklist, materials, and map link.
- Required data and events: job, visit, property, contacts, notes, checklist, materials, and field access rules.
- Done when: field crew has enough context to do the job safely and correctly.
- Current evidence: Field selected-stop detail shows job, route stop, customer, crew, property address, Maps link, property notes/hazards, scope notes, customer contact, weather, time, materials, equipment, checklist, issue capture, and submit controls. Desktop/mobile Playwright field detail assertions verify the v1 path.

### 63. Field tech starts visit

- Actor: field tech.
- Trigger: tech begins work.
- Prime-time path: start action records status, start time, crew/user, optional GPS/manual confirmation, and creates timesheet entry.
- Required data and events: job visit, timesheet entry, visit assignment, location metadata, status change, and audit event.
- Done when: actual labor timing begins from the field workflow.
- Current evidence: Production/demo startVisit mutations, Field PWA Start Visit control, manual time-confirmation success state, on-site status update, draft timesheet creation with start source metadata, visit.start audit/activity, backend field-role test, and desktop/mobile Playwright field test verify the v1 path.

### 64. Crew completes checklist

- Actor: field crew.
- Trigger: crew works through required service steps.
- Prime-time path: checklist supports done, required, optional, failed, skipped, note, photo, and blocker states.
- Required data and events: checklist items, item state, notes, photos, user, timestamp, and visit audit event.
- Done when: required work cannot be submitted incomplete without a reason.

### 65. Crew adds before photos

- Actor: field crew.
- Trigger: work requires proof, documentation, or before/after comparison.
- Prime-time path: user uploads photo, labels before/after/issue/completion, links it to visit/property/job, and sees it in timeline.
- Required data and events: file/photo, storage ID, visit, job, property, label, uploader, timestamp, and audit event.
- Done when: photos are useful for customer communication and dispute protection.

### 66. Crew records materials used

- Actor: field crew.
- Trigger: visit consumes fertilizer, chemical, seed, mulch, parts, bait, or other materials.
- Prime-time path: tech selects item, quantity, unit, application area, lot/chemical details if needed, and cost source.
- Required data and events: material application, material, vendor catalog item, quantity, unit, cost, site, weather if chemical, and audit event.
- Done when: material usage rolls into job cost and compliance history.
- Current evidence: Field PWA material entry form, product/cost/EPA context, target-area selector, queued material usage, production/demo submitVisit materialApplication writes, weather snapshot capture, backend material persistence assertions, and desktop/mobile Playwright material-entry flow verify the v1 path.

### 67. Crew records equipment used

- Actor: field crew.
- Trigger: job uses mower, spreader, sprayer, truck, trailer, skid steer, aerator, or other equipment.
- Prime-time path: tech logs equipment, time, mileage/hours if relevant, status, and issue notes.
- Required data and events: equipment usage, equipment, rate card, job/visit, duration, cost, and maintenance flag.
- Done when: equipment cost and maintenance signals can affect job profitability.

### 68. Crew flags an issue

- Actor: field crew.
- Trigger: crew observes access issue, property damage, pest activity, customer concern, safety hazard, or upsell opportunity.
- Prime-time path: issue form captures category, severity, photo, note, customer visibility, and follow-up owner.
- Required data and events: activity, task, issue flag, photo, opportunity if upsell, job/property link, and audit event.
- Done when: field observations become actionable office work.
- Current evidence: Field PWA structured issue capture, fieldIssues table, production/demo submitVisit task and activity persistence, upsell-to-opportunity creation, visit issue flag persistence, audit metadata, backend field issue assertions, and desktop/mobile Playwright field issue-to-pipeline test verify the v1 path.

### 69. Crew completes visit

- Actor: field crew.
- Trigger: work is done for the stop.
- Prime-time path: submit visit validates checklist, labor, materials, photos, notes, issues, and customer-ready summary.
- Required data and events: visit status, completed at, timesheet, materials, checklist state, notes, photos, and audit event.
- Done when: operations and finance can trust completed work for invoicing and costing.
- Current evidence: Production/demo submitVisit completion flow, completed visit status, submitted timesheet entry, queued material application persistence, issue follow-up task creation, visit.submit audit metadata, backend completion assertions, and desktop/mobile Playwright field submission test verify the v1 path.

### 70. Supervisor reviews field submission

- Actor: supervisor.
- Trigger: visit completion needs QA before customer communication, invoice, or closeout.
- Prime-time path: supervisor reviews scope, exceptions, photos, materials, failed/skipped items, notes, and customer-ready summary.
- Required data and events: visit, checklist, photos, material applications, tasks, QA decision, comments, and audit event.
- Done when: questionable field submissions are caught before billing or customer delivery.

## Job Management, Projects, and Operations

### 71. Operations opens job workspace

- Actor: operations manager.
- Trigger: manager needs complete job command center.
- Prime-time path: job workspace shows phases, visits, tasks, budget, actuals, customer/property, timeline, files, comments, issues, and closeout readiness.
- Required data and events: jobs, phases, visits, tasks, job cost summary, files, photos, activities, comments/notes, and audit timeline.
- Done when: the job can be managed from one place.

### 72. Project has multiple phases

- Actor: project manager.
- Trigger: design/build, install, renovation, or complex service requires staged work.
- Prime-time path: manager creates phases such as design, prep, install, cleanup, inspection, warranty, with dates, owners, and dependencies.
- Required data and events: job phases, tasks, visits, dependencies, phase status, owner, and audit event.
- Done when: project schedule and progress are visible beyond a flat job status.

### 73. Manager adds internal task

- Actor: manager.
- Trigger: team needs accountable follow-up.
- Prime-time path: manager creates task with owner, due date, priority, status, linked customer/property/job/visit, and reminders.
- Required data and events: task, assignee, due date, priority, entity links, activity, and audit event.
- Done when: internal work is not buried in notes.
- Current evidence: Jobs workspace task form captures title, owner, due-days, and priority; task rows show owner, due date, priority, and status; production/demo mutations persist assigned tasks and audit events; Convex tests verify active-member assignee guardrails and cross-tenant rejection; desktop/mobile Playwright lead-to-job flow creates and verifies a high-priority assigned internal task.

### 74. Job scope changes midstream

- Actor: manager or sales rep.
- Trigger: customer adds work, site condition changes, or original scope is wrong.
- Prime-time path: change order captures requested change, price/cost/margin impact, approval, schedule impact, and linked tasks.
- Required data and events: change order, job, estimate, line items, approval, job cost summary, activity, and audit event.
- Done when: extra work is priced, approved, and tracked before being performed.
- Current evidence: Change order schema, production create/approve mutations, demo mutations, Jobs Change Orders panel, job-cost summary rollup, schedule task creation, activity/audit writes, Convex change-order test, and desktop/mobile Playwright lead-to-job change-order flow verify the v1 path.

### 75. Customer requests add-on service

- Actor: field user, sales rep, or account manager.
- Trigger: customer or crew identifies additional work.
- Prime-time path: note/issue becomes upsell opportunity or change order with owner, value, service line, and follow-up.
- Required data and events: activity/issue, opportunity, customer, property, job, task, and audit event.
- Done when: add-ons do not remain trapped in field notes.

### 76. Job is put on hold

- Actor: manager.
- Trigger: job is blocked by weather, customer, material, permit, payment, staffing, or scope issue.
- Prime-time path: hold action records reason, owner, expected restart, blocked revenue, customer impact, and required next step.
- Required data and events: job status, hold reason, blocked revenue, task, activity, and audit event.
- Done when: held jobs are visible and not confused with active work.

### 77. Job materials are backordered

- Actor: operations manager.
- Trigger: material or equipment needed for job is delayed.
- Prime-time path: manager links vendor item, quantity, ETA, affected job/phase/visit, cost impact, and reschedule risk.
- Required data and events: purchase order, vendor catalog item, material, job, task, ETA, cost impact, and audit event.
- Done when: material constraints are visible in scheduling and costing.

### 78. Quality inspection is performed

- Actor: supervisor.
- Trigger: completed work needs inspection.
- Prime-time path: supervisor runs inspection checklist, records pass/fail, photos, corrective tasks, severity, and customer-ready summary.
- Required data and events: inspection checklist, job/visit, photos, tasks, result, inspector, and audit event.
- Done when: QA creates measurable corrections and proof.

### 79. Warranty callback is opened

- Actor: service manager.
- Trigger: customer reports issue after completed work.
- Prime-time path: callback links original job, issue, responsibility, cost impact, schedule, corrective visit, and resolution.
- Required data and events: callback/warranty record, original job, visit, tasks, job cost summary, customer activity, and audit event.
- Done when: warranty work is tracked separately from profitable new work.

### 80. Job is closed

- Actor: operations or finance.
- Trigger: all work is complete and ready for billing/final review.
- Prime-time path: closeout verifies visit completion, open tasks, costs, invoice readiness, margin, customer notes, files/photos, and final audit event.
- Required data and events: job status, visits, tasks, job cost summary, invoice readiness, activity, and audit event.
- Done when: closed jobs are clean for finance, reporting, and future service history.

## Revenue, Invoicing, Payments, and Profitability

### 81. Invoice is generated from completed work

- Actor: office or finance.
- Trigger: job, visit, recurring plan, or contract is billable.
- Prime-time path: invoice builder pulls completed work, approved change orders, pricing, taxes, terms, and customer billing contact.
- Required data and events: customer invoice, job/visit, line items, taxes, terms, billing contact, status, and audit event.
- Done when: completed work can become an accurate invoice with minimal re-entry.

### 82. Customer pays invoice

- Actor: customer or office user.
- Trigger: payment is received online, by check, cash, ACH, card, or manual entry.
- Prime-time path: payment record captures amount, date, method, reference, invoice allocation, and remaining balance.
- Required data and events: customer payment, invoice, payment allocation, method, transaction reference, balance, and audit event.
- Done when: AR and invoice status update from the payment.

### 83. Partial payment is applied

- Actor: office/finance.
- Trigger: customer pays less than total or one payment covers multiple invoices.
- Prime-time path: finance allocates payment across invoices, sees unapplied balance, and AR updates.
- Required data and events: payment, payment allocations, invoices, balance, customer account, and audit event.
- Done when: partial payments do not distort revenue or AR.

### 84. Overdue invoice is reviewed

- Actor: finance or owner.
- Trigger: invoice passes due date.
- Prime-time path: AR dashboard shows aging bucket, customer, amount, last touch, promised payment, risk, and collection task.
- Required data and events: invoice, due date, status, payment history, activities, tasks, risk flag, and audit event.
- Done when: overdue money has an owner and next action.

### 85. Job cost summary recalculates

- Actor: operations/finance.
- Trigger: actual labor, materials, equipment, invoice, or overhead data changes.
- Prime-time path: recalculation compares estimate vs actual across cost categories and updates profit/margin/variance.
- Required data and events: job cost summary, timesheets, material applications, equipment usage, overhead rates, revenue, and recalculation event.
- Done when: profitability stays current without manual spreadsheet work.

### 86. Low-margin job is flagged

- Actor: owner or manager.
- Trigger: actual or estimated margin falls below threshold.
- Prime-time path: margin alert explains driver, service line, crew, price, cost, variance, and future pricing recommendation.
- Required data and events: job cost summary, pricing assumptions, service line, crew, variance reason, task/alert, and audit event.
- Done when: bad margin becomes an operational learning loop.

### 87. Crew productivity is reviewed

- Actor: manager.
- Trigger: weekly operations review.
- Prime-time path: manager compares planned hours, actual hours, visits completed, revenue/hour, callbacks, travel burden, and crew utilization.
- Required data and events: timesheets, job visits, route plans, revenue, job cost summaries, callbacks, and productivity snapshot.
- Done when: managers can identify crew-level bottlenecks.

### 88. Service-line profitability is reviewed

- Actor: owner.
- Trigger: pricing, staffing, or growth planning.
- Prime-time path: report ranks mowing, fertilization, pest, tree, irrigation, design/build, snow, and other services by revenue, cost, margin, and trend.
- Required data and events: profitability snapshot, service line, job costs, revenue, labor/material/equipment splits, and period.
- Done when: owners can decide which work to grow, reprice, or stop selling.
- Current evidence: job-cost recalculation writes service_category profitabilitySnapshots, the Profit dashboard renders ranked Service-Line Profitability cards, and Convex/Playwright checks verify service-line rollups.

### 89. Customer profitability is reviewed

- Actor: owner or account manager.
- Trigger: retention, renewal, pricing, or account review.
- Prime-time path: profile shows lifetime revenue, gross margin, callbacks, payment behavior, service mix, retention risk, and LTV.
- Required data and events: customer lifecycle snapshot, invoices, payments, job costs, callbacks, activities, and churn signals.
- Done when: the team knows which customers are profitable and which need action.

### 90. Monthly P&L proxy is reviewed

- Actor: owner.
- Trigger: month-end or weekly financial review.
- Prime-time path: dashboard shows booked, completed, invoiced, collected revenue, AR, labor, materials, equipment, overhead, gross margin, and variance.
- Required data and events: P&L snapshot, profitability snapshots, invoices, payments, job costs, overhead assumptions, and period close event.
- Done when: owner has a practical operating P&L even before full accounting integration.

## Admin Controls, Data Governance, and Compliance

### 91. Admin updates service catalog

- Actor: admin.
- Trigger: services, packages, prices, terms, or defaults change.
- Prime-time path: admin edits service name, category, price, cost assumptions, default checklist, taxability, status, and price book.
- Required data and events: service catalog items, price books, price book items, checklist defaults, status, and audit event.
- Done when: catalog changes flow into estimates and reporting.
- Current evidence: Admin Service Catalog editor creates and edits service name, category, unit, price, and active status; production/demo mutations persist catalog changes and service_catalog_item audit events; Convex tests verify create/update/audit behavior; desktop/mobile Playwright admin flow creates and verifies a pest-control service row.

### 92. Admin updates labor rates

- Actor: admin/finance.
- Trigger: wage, burden, overtime, role, crew, or employee cost changes.
- Prime-time path: admin sets role/user/crew rates, burden, overtime, effective dates, and override precedence.
- Required data and events: labor rate cards, users, crews, effective dates, rate type, and audit event.
- Done when: job costing uses the correct labor cost for the date and worker context.
- Current evidence: Cost Intel Labor Override saves role, hourly cost, and billable rate into Convex laborRateCards, writes labor_rate audit events, and is covered by Convex and Playwright checks.

### 93. Admin updates material costs

- Actor: admin.
- Trigger: fertilizer, chemical, seed, mulch, parts, or vendor pricing changes.
- Prime-time path: admin imports or edits vendor catalog, unit cost, unit, effective date, supplier, and fallback market index context.
- Required data and events: vendor catalog items, materials, cost snapshots, import rows, effective dates, and audit event.
- Done when: estimates and actuals use current local material costs where available.
- Current evidence: Cost Intel Vendor Item saves supplier, item, category, unit, and unit cost into Convex vendorCatalogs, writes vendor_catalog audit events, and is covered by Convex and Playwright checks.

### 94. Admin updates equipment rates

- Actor: admin or finance.
- Trigger: equipment cost assumptions need maintenance.
- Prime-time path: admin sets hourly, daily, mileage, depreciation, fuel, maintenance, replacement, and effective date assumptions.
- Required data and events: equipment, equipment rate cards, effective dates, usage records, and audit event.
- Done when: equipment usage meaningfully affects job cost.

### 95. Admin edits workflow statuses

- Actor: admin.
- Trigger: company process differs from default statuses.
- Prime-time path: admin controls status labels, order, allowed transitions, terminal states, reporting mappings, and role permissions.
- Required data and events: workflow/status settings, allowed transitions, reporting category, permission rule, and audit event.
- Done when: custom workflows remain valid and reportable.
- Current evidence: Admin Workflow Status Settings edits label, color, order, terminal, and active flags for Convex leadStatusSettings, writes workflow_status audit events, and is covered by Convex and Playwright checks.

### 96. Admin audits user activity

- Actor: admin/security.
- Trigger: owner needs accountability, troubleshooting, or compliance review.
- Prime-time path: audit viewer filters by actor, date, entity, action, module, IP/session if available, and export status.
- Required data and events: audit events, users, organizations, entities, action metadata, and retention policy.
- Done when: important system changes can be explained later.
- Current evidence: Admin Audit Log is backed by Convex audit events, exposes search/module/action/entity/actor/date filters, and is covered by Convex and Playwright checks for catalog and member-invite audit records.

### 97. Admin exports data

- Actor: owner/admin.
- Trigger: backup, reporting, accountant request, migration, or analytics sync.
- Prime-time path: admin chooses data set, date range, format, and export destination, then receives generated file/status.
- Required data and events: export job, selected entities, reporting watermarks, file, requester, status, and audit event.
- Done when: tenant data can be exported without bypassing permission checks.

### 98. Compliance record is generated

- Actor: pest compliance lead.
- Trigger: chemical/material application requires a defensible record.
- Prime-time path: record includes applicator, product, rate, quantity, site, target pest, weather, customer, property, date/time, and notes.
- Required data and events: material application, material, applicator user, weather snapshot, property, visit, customer, and compliance file/export.
- Done when: the company can produce a clean service/compliance record for regulators or customers.

### 99. Data retention policy is applied

- Actor: admin/security.
- Trigger: company needs legal, storage, or privacy controls.
- Prime-time path: admin defines retention windows, archive rules, protected audit logs, export-before-delete behavior, and irreversible actions.
- Required data and events: retention policy, audit events, archive jobs, export jobs, protected records, and deletion/archival audit trail.
- Done when: data can age out without destroying required business or compliance history.

### 100. Account cancellation or churn is analyzed

- Actor: SaaS admin/owner.
- Trigger: customer downgrades, cancels, stops using product, or becomes at-risk.
- Prime-time path: churn view records reason, usage, plan, revenue, support history, missing value, competitor, win-back date, and health score.
- Required data and events: subscription, account health score, customer lifecycle snapshot, usage metrics, cancellation reason, support activity, and churn event.
- Done when: churn teaches the SaaS what to fix, sell, or automate next.

## Next Goal Prompt

Use this prompt when ready:

```text
Audit the app against docs/customer-journeys-100.md and src/data/customer-journeys.ts. For each journey, identify existing coverage, missing screens, missing Convex schema/function support, missing permissions, missing audit events, missing tests, and SaaS readiness risks. Then implement the highest-impact P0/P1 fixes in priority order, updating journey evidence and tests as each one becomes verified.
```
