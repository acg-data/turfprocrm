import { and, asc, desc, eq } from "drizzle-orm";
import type { ServerCtx } from "../context";
import { requireWorkspace, workspaceSettings } from "../guards";
import { ApiError } from "../errors";
import { newId } from "../ids";
import {
  activities,
  auditEvents,
  checklistTemplates,
  cityNormalizationRules,
  contacts,
  crewMembers,
  crews,
  customers,
  dashboardWidgets,
  dataQualityIssues,
  estimates,
  externalIntegrations,
  jobVisits,
  jobs,
  leads,
  materials,
  memberships,
  opportunities,
  organizations,
  priceBookItems,
  priceBooks,
  properties,
  serviceCatalogItems,
  spamRules,
  tasks,
  users,
} from "../db/schema";

type ServiceCategory =
  | "lawn_care"
  | "landscaping"
  | "pest_control"
  | "tree_shrub"
  | "irrigation"
  | "snow"
  | "maintenance";

type OpportunityStage = "new" | "qualified" | "estimating" | "proposal_sent" | "won" | "lost";
type LeadType = "phone_call" | "form" | "direct_email" | "referral" | "other";
type AccountType = "residential" | "commercial";
type Urgency = "low" | "normal" | "high";
type ActivityEntityType = "customer" | "job";
type ActivityComposerKind = "call" | "email" | "note";

type ChecklistItem = { id: string; label: string; isDone: boolean; completedAt?: number };

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = partsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function dayStart() {
  const timeZone = "America/New_York";
  const today = partsInTimeZone(new Date(), timeZone);
  const utcMidnightGuess = Date.UTC(today.year, today.month - 1, today.day, 0, 0, 0);
  return utcMidnightGuess - timeZoneOffsetMs(new Date(utcMidnightGuess), timeZone);
}

function at(hour: number, minute = 0, offset = 0) {
  return dayStart() + offset * 24 * 60 * 60 * 1000 + hour * 60 * 60 * 1000 + minute * 60 * 1000;
}

async function refreshDemoDates(ctx: ServerCtx, organizationId: string) {
  const [leadRows, opportunityRows, estimateRows, jobRows, visitRows, taskRows, activityRows] = await Promise.all([
    ctx.db.select().from(leads).where(eq(leads.organizationId, organizationId)),
    ctx.db.select().from(opportunities).where(eq(opportunities.organizationId, organizationId)),
    ctx.db.select().from(estimates).where(eq(estimates.organizationId, organizationId)),
    ctx.db.select().from(jobs).where(eq(jobs.organizationId, organizationId)),
    ctx.db.select().from(jobVisits).where(eq(jobVisits.organizationId, organizationId)),
    ctx.db.select().from(tasks).where(eq(tasks.organizationId, organizationId)),
    ctx.db.select().from(activities).where(eq(activities.organizationId, organizationId)),
  ]);

  for (const lead of leadRows) {
    if (lead.title.includes("Mosquito"))
      await ctx.db
        .update(leads)
        .set({ createdAt: at(9, 15, -1), receivedAt: at(9, 15, -1), updatedAt: at(14, 15) })
        .where(eq(leads.id, lead.id));
    if (lead.title.includes("Spring grub"))
      await ctx.db
        .update(leads)
        .set({ createdAt: at(13, 30, -4), receivedAt: at(13, 30, -4), convertedAt: at(10, 20, -1), updatedAt: at(10, 20, -1) })
        .where(eq(leads.id, lead.id));
  }
  for (const opportunity of opportunityRows) {
    if (opportunity.title.includes("Seasonal mosquito"))
      await ctx.db
        .update(opportunities)
        .set({ expectedCloseDate: at(17, 0, 3), updatedAt: at(14, 15) })
        .where(eq(opportunities.id, opportunity.id));
    if (opportunity.title.includes("Grub prevention"))
      await ctx.db
        .update(opportunities)
        .set({ expectedCloseDate: at(11, 0, -2), updatedAt: at(10, 20, -1) })
        .where(eq(opportunities.id, opportunity.id));
    if (opportunity.title.includes("Weekly grounds"))
      await ctx.db
        .update(opportunities)
        .set({ expectedCloseDate: at(16, 0, 9), updatedAt: at(12, 5) })
        .where(eq(opportunities.id, opportunity.id));
  }
  for (const estimate of estimateRows) {
    if (estimate.estimateNumber === "EST-1024")
      await ctx.db
        .update(estimates)
        .set({ sentAt: at(14, 15), createdAt: at(14, 0), updatedAt: at(14, 15) })
        .where(eq(estimates.id, estimate.id));
    if (estimate.estimateNumber === "EST-1019")
      await ctx.db
        .update(estimates)
        .set({ acceptedAt: at(10, 20, -1), createdAt: at(9, 0, -1), updatedAt: at(10, 20, -1) })
        .where(eq(estimates.id, estimate.id));
  }
  for (const job of jobRows) {
    if (job.title.includes("Brookside"))
      await ctx.db.update(jobs).set({ startDate: at(8, 30), updatedAt: Date.now() }).where(eq(jobs.id, job.id));
    if (job.title.includes("Northgate"))
      await ctx.db.update(jobs).set({ startDate: at(7, 30), updatedAt: Date.now() }).where(eq(jobs.id, job.id));
  }
  for (const visit of visitRows) {
    if (visit.routeOrder === 1)
      await ctx.db
        .update(jobVisits)
        .set({ scheduledStart: at(8, 30), scheduledEnd: at(10, 30), updatedAt: Date.now() })
        .where(eq(jobVisits.id, visit.id));
    if (visit.routeOrder === 2)
      await ctx.db
        .update(jobVisits)
        .set({ scheduledStart: at(11, 0), scheduledEnd: at(14, 0), updatedAt: Date.now() })
        .where(eq(jobVisits.id, visit.id));
  }
  for (const task of taskRows) {
    if (task.title.includes("Follow up"))
      await ctx.db.update(tasks).set({ dueAt: at(16, 0), updatedAt: Date.now() }).where(eq(tasks.id, task.id));
    if (task.title.includes("irrigation"))
      await ctx.db.update(tasks).set({ dueAt: at(12, 0, 1), updatedAt: Date.now() }).where(eq(tasks.id, task.id));
  }
  for (const activity of activityRows) {
    if (activity.summary.includes("EST-1024"))
      await ctx.db.update(activities).set({ occurredAt: at(14, 15) }).where(eq(activities.id, activity.id));
    if (activity.summary.includes("Crew Charlie"))
      await ctx.db.update(activities).set({ occurredAt: at(11, 8) }).where(eq(activities.id, activity.id));
    if (activity.summary.includes("Brookside opportunity"))
      await ctx.db.update(activities).set({ occurredAt: at(10, 20, -1) }).where(eq(activities.id, activity.id));
  }
}

function spamSignals(input: { email?: string; message?: string; customerName?: string; phone?: string }) {
  const email = input.email?.toLowerCase() ?? "";
  const message = input.message?.toLowerCase() ?? "";
  const reasons: string[] = [];

  if (!input.customerName && !input.phone && !input.email) reasons.push("missing_name_and_contact");
  if (/^(sales|info|marketing|noreply|no-reply|partner|recruit|newsletter)@/.test(email)) reasons.push("bulk_sender_email_prefix");
  if (/(lead generation|business opportunity|schedule a 15|unsubscribe|we generate leads)/.test(message)) reasons.push("solicitation_phrase");

  return { score: Math.min(100, reasons.length * 35), reasons };
}

function leadQualityIssues(input: { email?: string; phone?: string; street?: string; city?: string; postalCode?: string; lawnSizeSqFt?: number; serviceTerritory?: string[] }) {
  const issues: Array<{ kind: "bad_phone" | "invalid_email" | "missing_address" | "out_of_territory" | "price_missing"; severity: "info" | "warning" | "critical"; summary: string; fieldName?: string; currentValue?: string }> = [];
  const digits = input.phone?.replace(/\D/g, "") ?? "";
  if (input.phone && digits.length < 10) issues.push({ kind: "bad_phone", severity: "warning", fieldName: "phone", currentValue: input.phone, summary: "Phone number looks too short for reliable follow-up." });
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) issues.push({ kind: "invalid_email", severity: "warning", fieldName: "email", currentValue: input.email, summary: "Email address does not look valid." });
  if (!input.street?.trim() || !input.city?.trim() || !input.postalCode?.trim()) issues.push({ kind: "missing_address", severity: "warning", fieldName: "property", summary: "Full property address is incomplete." });
  if (input.serviceTerritory?.length && input.city && !input.serviceTerritory.map((city) => city.toLowerCase()).includes(input.city.toLowerCase())) {
    issues.push({ kind: "out_of_territory", severity: "critical", fieldName: "city", currentValue: input.city, summary: "Lead city is outside the configured service territory." });
  }
  if (!input.lawnSizeSqFt) issues.push({ kind: "price_missing", severity: "info", fieldName: "lawnSizeSqFt", summary: "Lawn size is missing, so size-based pricing will need manual review." });
  return issues;
}

const scaleFirstNames = ["Avery", "Blake", "Casey", "Dakota", "Emerson", "Finley", "Gray", "Harper", "Jordan", "Kai", "Logan", "Morgan", "Noel", "Parker", "Quinn", "Reese", "Sawyer", "Taylor", "Val", "Wren"];
const scaleLastNames = ["Adams", "Bennett", "Carter", "Diaz", "Ellis", "Foster", "Garcia", "Hayes", "Iverson", "Johnson", "Kim", "Lopez", "Miller", "Nolan", "Owens", "Patel", "Rivera", "Stone", "Turner", "Young"];
const scaleCities = ["Foxborough", "Mansfield", "Sharon", "Wrentham", "Plainville"];
const scaleSources = ["Website form", "Google Local Services", "Referral", "Phone", "Yard sign", "Facebook"];
const scalePrograms = ["lawn_care", "landscaping", "pest_control", "tree_shrub", "irrigation", "maintenance"] as const;
const scaleRoles = ["sales", "dispatcher", "crew_lead", "technician", "manager"] as const;
const scaleStatuses = ["new", "contacted", "do_estimate", "estimate_provided", "follow_up", "waiting", "converted"] as const;
const scaleStages = ["new", "qualified", "estimating", "proposal_sent", "won"] as const;

async function ensureDemoScaleData(ctx: ServerCtx, organizationId: string) {
  const now = Date.now();
  const existingLeads = await ctx.db.select().from(leads).where(eq(leads.organizationId, organizationId));
  const existingScaleLeadKeys = new Set(existingLeads.map((lead) => lead.externalSourceId).filter(Boolean));
  const scaleUserIds: string[] = [];

  for (let index = 0; index < 100; index += 1) {
    const number = index + 1;
    const padded = String(number).padStart(3, "0");
    const clerkUserId = `demo-scale-user-${padded}`;
    const firstName = scaleFirstNames[index % scaleFirstNames.length];
    const lastName = scaleLastNames[Math.floor(index / scaleFirstNames.length) % scaleLastNames.length];
    const role = scaleRoles[index % scaleRoles.length];
    const email = `demo.user${padded}@turfpro.test`;

    let user = (await ctx.db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1))[0] ?? null;
    if (!user) {
      const userId = newId();
      await ctx.db.insert(users).values({
        id: userId,
        clerkUserId,
        name: `${firstName} ${lastName}`,
        email,
        createdAt: now,
        updatedAt: now,
      });
      user = (await ctx.db.select().from(users).where(eq(users.id, userId)).limit(1))[0] ?? null;
    }
    if (!user) continue;
    scaleUserIds.push(user.id);

    const existingMembership =
      (
        await ctx.db
          .select()
          .from(memberships)
          .where(and(eq(memberships.organizationId, organizationId), eq(memberships.userId, user.id)))
          .limit(1)
      )[0] ?? null;
    if (!existingMembership) {
      await ctx.db.insert(memberships).values({
        id: newId(),
        organizationId,
        userId: user.id,
        role,
        status: "active",
        joinedAt: now,
        updatedAt: now,
      });
    }
  }

  const crewRows = await ctx.db.select().from(crews).where(eq(crews.organizationId, organizationId));
  let insertedRecords = 0;

  for (let index = 0; index < 100; index += 1) {
    const number = index + 1;
    const padded = String(number).padStart(3, "0");
    const externalSourceId = `demo-scale-lead-${padded}`;
    if (existingScaleLeadKeys.has(externalSourceId)) continue;

    const firstName = scaleFirstNames[index % scaleFirstNames.length];
    const lastName = scaleLastNames[(index * 3) % scaleLastNames.length];
    const program = scalePrograms[index % scalePrograms.length];
    const ownerUserId = scaleUserIds[index % Math.max(1, scaleUserIds.length)];
    const city = scaleCities[index % scaleCities.length];
    const status = scaleStatuses[index % scaleStatuses.length];
    const stage = scaleStages[index % scaleStages.length];
    const accountType = index % 5 === 0 ? "commercial" : "residential";
    const customerType = index % 10 === 0 ? "hoa" : accountType;
    const lawnSizeSqFt = 6500 + (index % 30) * 1750 + (accountType === "commercial" ? 72000 : 0);
    const valueCents = 18000 + (index % 18) * 12500 + (accountType === "commercial" ? 185000 : 0);
    const leadCreatedAt = at(8 + (index % 9), (index * 7) % 60, -1 * (index % 21));
    const customerName = accountType === "commercial" ? `${lastName} Facilities ${padded}` : `${firstName} ${lastName}`;

    const customerId = newId();
    await ctx.db.insert(customers).values({
      id: customerId,
      organizationId,
      name: customerName,
      type: customerType,
      status: status === "converted" ? "active" : "prospect",
      source: scaleSources[index % scaleSources.length],
      ownerUserId,
      tags: ["scale-test", program, accountType],
      lifetimeValueCents: stage === "won" ? valueCents * 3 : 0,
      createdAt: leadCreatedAt,
      updatedAt: leadCreatedAt,
    });
    const contactId = newId();
    await ctx.db.insert(contacts).values({
      id: contactId,
      organizationId,
      customerId,
      name: customerName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${padded}@example.test`,
      phone: `(508) 555-${String(1000 + number).slice(-4)}`,
      preferredChannel: index % 2 === 0 ? "phone" : "email",
      isPrimary: true,
      createdAt: leadCreatedAt,
      updatedAt: leadCreatedAt,
    });
    const propertyId = newId();
    await ctx.db.insert(properties).values({
      id: propertyId,
      organizationId,
      customerId,
      label: accountType === "commercial" ? `${lastName} Facility` : "Primary residence",
      street: `${100 + number} ${["Maple", "Cedar", "Oak", "Pine", "Elm"][index % 5]} ${accountType === "commercial" ? "Parkway" : "Lane"}`,
      city,
      state: "MA",
      postalCode: `02${String(30 + (index % 60)).padStart(3, "0")}`,
      notes: index % 7 === 0 ? "Gate code required. Confirm access before dispatch." : "Synthetic scale-test property.",
      lawnSizeSqFt,
      createdAt: leadCreatedAt,
      updatedAt: leadCreatedAt,
    });
    const leadId = newId();
    await ctx.db.insert(leads).values({
      id: leadId,
      organizationId,
      customerId,
      contactId,
      propertyId,
      title: `${program.replaceAll("_", " ")} request ${padded}`,
      source: scaleSources[index % scaleSources.length],
      leadType: index % 4 === 0 ? "phone_call" : "form",
      companyAssignment: index % 2 === 0 ? "Turf Pro" : "GreenAce",
      accountType,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${padded}@example.test`,
      mobilePhone: `(508) 555-${String(1000 + number).slice(-4)}`,
      normalizedPhone: `508555${String(1000 + number).slice(-4)}`,
      message: "Generated scale-test lead for pricing, routing, follow-up, and quality scoring.",
      estimateNotes: "Use this record to test list performance, filters, owners, and conversion views.",
      programRequests: [program],
      lawnSizeSqFt,
      grade: index % 6 === 0 ? "a" : index % 4 === 0 ? "b" : index % 3 === 0 ? "c" : "ungraded",
      status,
      urgency: index % 9 === 0 ? "high" : index % 4 === 0 ? "low" : "normal",
      ownerUserId,
      spamScore: index % 17 === 0 ? 35 : 0,
      spamReasons: index % 17 === 0 ? ["scale_test_solicitation_phrase"] : [],
      qualityScore: 52 + (index % 45),
      receivedAt: leadCreatedAt,
      externalSourceId,
      rawPayload: { source: "demo_scale_seed", rowNumber: number },
      createdAt: leadCreatedAt,
      updatedAt: leadCreatedAt,
    });
    const opportunityId = newId();
    await ctx.db.insert(opportunities).values({
      id: opportunityId,
      organizationId,
      leadId,
      customerId,
      propertyId,
      title: `${program.replaceAll("_", " ")} estimate ${padded}`,
      stage,
      valueCents,
      closeProbability: stage === "won" ? 100 : 20 + (index % 6) * 12,
      expectedCloseDate: at(16, 0, index % 18),
      ownerUserId,
      serviceLines: [program],
      createdAt: leadCreatedAt,
      updatedAt: at(9 + (index % 7), (index * 11) % 60, -1 * (index % 10)),
    });

    if (index < 36 && crewRows.length) {
      const jobId = newId();
      await ctx.db.insert(jobs).values({
        id: jobId,
        organizationId,
        customerId,
        propertyId,
        opportunityId,
        title: `${program.replaceAll("_", " ")} production ${padded}`,
        status: index % 6 === 0 ? "completed" : index % 3 === 0 ? "in_progress" : "scheduled",
        priority: index % 8 === 0 ? "high" : "normal",
        startDate: at(7 + (index % 8), 30, index % 12),
        managerUserId: ownerUserId,
        createdAt: leadCreatedAt,
        updatedAt: leadCreatedAt,
      });
      const visitId = newId();
      await ctx.db.insert(jobVisits).values({
        id: visitId,
        organizationId,
        jobId,
        customerId,
        propertyId,
        scheduledStart: at(7 + (index % 8), 30, index % 12),
        scheduledEnd: at(9 + (index % 8), 0, index % 12),
        status: index % 6 === 0 ? "complete" : index % 3 === 0 ? "on_site" : "scheduled",
        routeOrder: (index % 12) + 1,
        assignedCrewId: crewRows[index % crewRows.length].id,
        checklist: [
          { id: `scale-${padded}-c1`, label: "Confirm property access", isDone: index % 3 === 0 },
          { id: `scale-${padded}-c2`, label: "Complete service scope", isDone: index % 6 === 0 },
          { id: `scale-${padded}-c3`, label: "Log materials and photos", isDone: false },
        ],
        notes: "Synthetic route stop for dispatch and mobile field testing.",
        createdAt: leadCreatedAt,
        updatedAt: leadCreatedAt,
      });
      await ctx.db.insert(tasks).values({
        id: newId(),
        organizationId,
        entityType: "job",
        entityId: jobId,
        title: `Review scale-test job ${padded}`,
        status: index % 5 === 0 ? "in_progress" : "open",
        priority: index % 8 === 0 ? "high" : "normal",
        dueAt: at(15, 0, index % 9),
        assignedUserId: ownerUserId,
        createdAt: leadCreatedAt,
        updatedAt: leadCreatedAt,
      });
      await ctx.db.insert(activities).values({
        id: newId(),
        organizationId,
        entityType: "visit",
        entityId: visitId,
        kind: "visit",
        summary: `Scale-test visit created for ${customerName}`,
        actorUserId: ownerUserId,
        occurredAt: leadCreatedAt,
      });
    }

    if (index < 50) {
      await ctx.db.insert(activities).values({
        id: newId(),
        organizationId,
        entityType: "lead",
        entityId: leadId,
        kind: index % 2 === 0 ? "call" : "email",
        summary: `Scale-test activity logged for ${customerName}`,
        actorUserId: ownerUserId,
        occurredAt: at(10 + (index % 6), (index * 5) % 60, -1 * (index % 14)),
      });
    }

    insertedRecords += 1;
  }

  if (insertedRecords > 0) {
    await ctx.db.insert(auditEvents).values({
      id: newId(),
      organizationId,
      action: "demo.scale_seed",
      entityType: "organization",
      entityId: organizationId,
      summary: `Seeded ${insertedRecords} synthetic accounts and 100 synthetic team users for scale testing`,
      after: { insertedAccounts: insertedRecords, syntheticUsers: 100 },
      createdAt: now,
    });
  }

  return { insertedAccounts: insertedRecords, syntheticUsers: 100 };
}

export async function seedSampleData(ctx: ServerCtx, args: { organizationId: string }) {
  const { org, user } = await requireWorkspace(ctx, args.organizationId, "manageOrganization");
  const settings = workspaceSettings(org);

  if (settings.sampleDataSeededAt) {
    await refreshDemoDates(ctx, org.id);
    const scale = await ensureDemoScaleData(ctx, org.id);
    return { organizationId: org.id, created: false, refreshed: true, scale };
  }

  const existingCustomer =
    (
      await ctx.db.select().from(customers).where(eq(customers.organizationId, org.id)).limit(1)
    )[0] ?? null;
  if (existingCustomer) {
    throw new ApiError(
      "SAMPLE_DATA_BLOCKED",
      "This workspace already has customer data. Sample data can only be loaded into an empty workspace.",
    );
  }

  const now = Date.now();
  const organizationId = org.id;
  const existingTerritory = org.serviceTerritory as string[] | null;

  await ctx.db
    .update(organizations)
    .set({
      serviceTerritory:
        existingTerritory && existingTerritory.length > 0
          ? existingTerritory
          : ["Foxborough", "Mansfield", "Sharon", "Wrentham", "Plainville"],
      settings: {
        ...settings,
        sampleDataSeededAt: now,
        companyAssignments: ["GreenAce", "Turf Pro"],
        defaultCapacityEstimatesPerWeek: 32,
      },
      updatedAt: now,
    })
    .where(eq(organizations.id, organizationId));

  const justinId = user.id;
  const amyId = newId();
  await ctx.db.insert(users).values({ id: amyId, clerkUserId: `sample-sales-${organizationId}`, name: "Amy Reed", email: "amy@example.com", createdAt: now, updatedAt: now });
  const marcoId = newId();
  await ctx.db.insert(users).values({ id: marcoId, clerkUserId: `sample-dispatch-${organizationId}`, name: "Marco Silva", email: "marco@example.com", createdAt: now, updatedAt: now });
  const ninaId = newId();
  await ctx.db.insert(users).values({ id: ninaId, clerkUserId: `sample-field-${organizationId}`, name: "Nina Hart", email: "nina@example.com", createdAt: now, updatedAt: now });

  for (const [userId, role] of [
    [amyId, "sales"],
    [marcoId, "dispatcher"],
    [ninaId, "crew_lead"],
  ] as Array<[string, "sales" | "dispatcher" | "crew_lead"]>) {
    await ctx.db.insert(memberships).values({ id: newId(), organizationId, userId, role, status: "active", joinedAt: now, updatedAt: now });
  }

  const brooksideId = newId();
  await ctx.db.insert(customers).values({
    id: brooksideId,
    organizationId,
    name: "Brookside HOA",
    type: "hoa",
    status: "active",
    source: "Renewal",
    ownerUserId: amyId,
    tags: ["hoa", "recurring", "fertilization"],
    lifetimeValueCents: 1840000,
    createdAt: now,
    updatedAt: now,
  });
  const walshId = newId();
  await ctx.db.insert(customers).values({
    id: walshId,
    organizationId,
    name: "Megan Walsh",
    type: "residential",
    status: "prospect",
    source: "Website form",
    ownerUserId: amyId,
    tags: ["mosquito", "quote"],
    lifetimeValueCents: 0,
    createdAt: now,
    updatedAt: now,
  });
  const northgateId = newId();
  await ctx.db.insert(customers).values({
    id: northgateId,
    organizationId,
    name: "Northgate Industrial Park",
    type: "commercial",
    status: "active",
    source: "Referral",
    ownerUserId: justinId,
    tags: ["commercial", "weekly"],
    lifetimeValueCents: 6120000,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.insert(contacts).values({ id: newId(), organizationId, customerId: brooksideId, name: "Brookside Board", email: "board@brookside.example", phone: "(508) 555-0148", isPrimary: true, createdAt: now, updatedAt: now });
  await ctx.db.insert(contacts).values({ id: newId(), organizationId, customerId: walshId, name: "Megan Walsh", email: "megan@example.com", phone: "(508) 555-0188", isPrimary: true, createdAt: now, updatedAt: now });
  await ctx.db.insert(contacts).values({ id: newId(), organizationId, customerId: northgateId, name: "Facilities Office", email: "facilities@northgate.example", phone: "(781) 555-0199", isPrimary: true, createdAt: now, updatedAt: now });

  const brooksidePropertyId = newId();
  await ctx.db.insert(properties).values({
    id: brooksidePropertyId,
    organizationId,
    customerId: brooksideId,
    label: "Brookside Common Areas",
    street: "18 Brookside Way",
    city: "Foxborough",
    state: "MA",
    postalCode: "02035",
    notes: "Gate code changes monthly. Notify board before treatment.",
    lawnSizeSqFt: 92000,
    createdAt: now,
    updatedAt: now,
  });
  const walshPropertyId = newId();
  await ctx.db.insert(properties).values({
    id: walshPropertyId,
    organizationId,
    customerId: walshId,
    label: "Walsh Residence",
    street: "42 Oak Terrace",
    city: "Mansfield",
    state: "MA",
    postalCode: "02048",
    notes: "Backyard has a wetland buffer. Avoid spraying within marked area.",
    lawnSizeSqFt: 14500,
    createdAt: now,
    updatedAt: now,
  });
  const northgatePropertyId = newId();
  await ctx.db.insert(properties).values({
    id: northgatePropertyId,
    organizationId,
    customerId: northgateId,
    label: "Northgate Building 4",
    street: "225 Commerce Dr",
    city: "Sharon",
    state: "MA",
    postalCode: "02067",
    notes: "Service loading dock before office lawn.",
    lawnSizeSqFt: 188000,
    createdAt: now,
    updatedAt: now,
  });

  const walshLeadId = newId();
  await ctx.db.insert(leads).values({
    id: walshLeadId,
    organizationId,
    customerId: walshId,
    propertyId: walshPropertyId,
    title: "Mosquito and tick package request",
    source: "Website form",
    leadType: "form",
    companyAssignment: "Turf Pro",
    accountType: "residential",
    firstName: "Megan",
    lastName: "Walsh",
    email: "megan@example.com",
    mobilePhone: "(508) 555-0188",
    normalizedPhone: "5085550188",
    programRequests: ["pest_control"],
    lawnSizeSqFt: 14500,
    grade: "a",
    status: "contacted",
    urgency: "high",
    ownerUserId: amyId,
    spamScore: 0,
    spamReasons: [],
    qualityScore: 92,
    receivedAt: at(9, 15, -1),
    createdAt: at(9, 15, -1),
    updatedAt: at(14, 15),
  });
  const brooksideLeadId = newId();
  await ctx.db.insert(leads).values({
    id: brooksideLeadId,
    organizationId,
    customerId: brooksideId,
    propertyId: brooksidePropertyId,
    title: "Spring grub prevention renewal",
    source: "Phone",
    leadType: "phone_call",
    companyAssignment: "GreenAce",
    accountType: "commercial",
    firstName: "Brookside",
    lastName: "Board",
    mobilePhone: "(508) 555-0148",
    normalizedPhone: "5085550148",
    programRequests: ["lawn_care", "pest_control"],
    lawnSizeSqFt: 92000,
    grade: "a",
    status: "converted",
    urgency: "normal",
    ownerUserId: amyId,
    spamScore: 0,
    spamReasons: [],
    qualityScore: 96,
    receivedAt: at(13, 30, -4),
    convertedAt: at(10, 20, -1),
    createdAt: at(13, 30, -4),
    updatedAt: at(10, 20, -1),
  });

  const walshOppId = newId();
  await ctx.db.insert(opportunities).values({
    id: walshOppId,
    organizationId,
    leadId: walshLeadId,
    customerId: walshId,
    propertyId: walshPropertyId,
    title: "Seasonal mosquito and tick control",
    stage: "proposal_sent",
    valueCents: 78000,
    closeProbability: 72,
    expectedCloseDate: at(17, 0, 3),
    ownerUserId: amyId,
    serviceLines: ["pest_control"],
    createdAt: at(9, 15, -1),
    updatedAt: at(14, 15),
  });
  const brooksideOppId = newId();
  await ctx.db.insert(opportunities).values({
    id: brooksideOppId,
    organizationId,
    leadId: brooksideLeadId,
    customerId: brooksideId,
    propertyId: brooksidePropertyId,
    title: "Grub prevention plus six-step lawn program",
    stage: "won",
    valueCents: 920000,
    closeProbability: 100,
    expectedCloseDate: at(11, 0, -2),
    ownerUserId: justinId,
    serviceLines: ["lawn_care", "pest_control"],
    createdAt: at(13, 30, -4),
    updatedAt: at(10, 20, -1),
  });
  await ctx.db.insert(opportunities).values({
    id: newId(),
    organizationId,
    customerId: northgateId,
    propertyId: northgatePropertyId,
    title: "Weekly grounds maintenance expansion",
    stage: "estimating",
    valueCents: 1540000,
    closeProbability: 44,
    expectedCloseDate: at(16, 0, 9),
    ownerUserId: justinId,
    serviceLines: ["maintenance", "landscaping"],
    createdAt: at(12, 5, -2),
    updatedAt: at(12, 5),
  });

  const walshEstimateId = newId();
  await ctx.db.insert(estimates).values({
    id: walshEstimateId,
    organizationId,
    opportunityId: walshOppId,
    customerId: walshId,
    propertyId: walshPropertyId,
    estimateNumber: "EST-1024",
    status: "sent",
    subtotalCents: 78000,
    taxCents: 0,
    totalCents: 78000,
    sentAt: at(14, 15),
    createdAt: at(14, 0),
    updatedAt: at(14, 15),
  });
  await ctx.db.insert(estimates).values({
    id: newId(),
    organizationId,
    opportunityId: brooksideOppId,
    customerId: brooksideId,
    propertyId: brooksidePropertyId,
    estimateNumber: "EST-1019",
    status: "accepted",
    subtotalCents: 920000,
    taxCents: 0,
    totalCents: 920000,
    acceptedAt: at(10, 20, -1),
    createdAt: at(9, 0, -1),
    updatedAt: at(10, 20, -1),
  });

  const fertId = newId();
  await ctx.db.insert(serviceCatalogItems).values({ id: fertId, organizationId, name: "Six-step fertilization program", category: "lawn_care", defaultUnit: "season", defaultPriceCents: 165000, durationMinutes: 120, active: true, createdAt: now, updatedAt: now });
  const mosquitoId = newId();
  await ctx.db.insert(serviceCatalogItems).values({ id: mosquitoId, organizationId, name: "Mosquito and tick barrier", category: "pest_control", defaultUnit: "visit", defaultPriceCents: 13000, durationMinutes: 35, active: true, createdAt: now, updatedAt: now });
  await ctx.db.insert(serviceCatalogItems).values({ id: newId(), organizationId, name: "Core aeration and overseeding", category: "lawn_care", defaultUnit: "acre", defaultPriceCents: 42000, durationMinutes: 90, active: true, createdAt: now, updatedAt: now });
  await ctx.db.insert(serviceCatalogItems).values({ id: newId(), organizationId, name: "Spring cleanup", category: "landscaping", defaultUnit: "crew hour", defaultPriceCents: 9500, durationMinutes: 60, active: true, createdAt: now, updatedAt: now });

  const priceBookId = newId();
  await ctx.db.insert(priceBooks).values({ id: priceBookId, organizationId, name: "2026 Residential + Commercial", description: "Default production price book for lawn, landscape, and pest services.", active: true, createdAt: now, updatedAt: now });
  await ctx.db.insert(priceBookItems).values({ id: newId(), organizationId, priceBookId, serviceCatalogItemId: fertId, name: "Six-step program by lawn size", unit: "season", basePriceCents: 165000, minPriceCents: 62000, pricingModel: "per_sq_ft", formula: "max(minPrice, lawnSizeSqFt * 0.018)", active: true, createdAt: now, updatedAt: now });
  await ctx.db.insert(priceBookItems).values({ id: newId(), organizationId, priceBookId, serviceCatalogItemId: mosquitoId, name: "Mosquito barrier visit", unit: "visit", basePriceCents: 13000, minPriceCents: 9500, pricingModel: "per_visit", active: true, createdAt: now, updatedAt: now });

  const alphaCrewId = newId();
  await ctx.db.insert(crews).values({ id: alphaCrewId, organizationId, name: "Alpha Lawn", color: "#2f6b4f", active: true, capacityMinutesPerDay: 420, createdAt: now, updatedAt: now });
  const bravoCrewId = newId();
  await ctx.db.insert(crews).values({ id: bravoCrewId, organizationId, name: "Bravo Pest", color: "#7c6a2b", active: true, capacityMinutesPerDay: 390, createdAt: now, updatedAt: now });
  const charlieCrewId = newId();
  await ctx.db.insert(crews).values({ id: charlieCrewId, organizationId, name: "Charlie Maintenance", color: "#42526b", active: true, capacityMinutesPerDay: 480, createdAt: now, updatedAt: now });
  await ctx.db.insert(crewMembers).values({ id: newId(), organizationId, crewId: bravoCrewId, userId: ninaId, role: "crew lead", active: true, createdAt: now, updatedAt: now });

  const brooksideJobId = newId();
  await ctx.db.insert(jobs).values({
    id: brooksideJobId,
    organizationId,
    customerId: brooksideId,
    propertyId: brooksidePropertyId,
    opportunityId: brooksideOppId,
    title: "Brookside six-step season",
    status: "scheduled",
    priority: "normal",
    recurrence: "seasonal",
    startDate: at(8, 30),
    managerUserId: justinId,
    createdAt: now,
    updatedAt: now,
  });
  const northgateJobId = newId();
  await ctx.db.insert(jobs).values({
    id: northgateJobId,
    organizationId,
    customerId: northgateId,
    propertyId: northgatePropertyId,
    title: "Northgate weekly maintenance",
    status: "in_progress",
    priority: "high",
    recurrence: "weekly",
    startDate: at(7, 30),
    managerUserId: justinId,
    createdAt: now,
    updatedAt: now,
  });

  const lawnChecklistId = newId();
  await ctx.db.insert(checklistTemplates).values({
    id: lawnChecklistId,
    organizationId,
    name: "Lawn treatment visit",
    category: "lawn_care",
    items: [
      { id: "flags", label: "Post treatment flags", required: true },
      { id: "apply", label: "Apply product to mapped turf zones", required: true },
      { id: "photos", label: "Capture after photos", required: false },
    ],
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.insert(jobVisits).values({
    id: newId(),
    organizationId,
    jobId: brooksideJobId,
    customerId: brooksideId,
    propertyId: brooksidePropertyId,
    scheduledStart: at(8, 30),
    scheduledEnd: at(10, 30),
    status: "scheduled",
    routeOrder: 1,
    assignedCrewId: alphaCrewId,
    checklistTemplateId: lawnChecklistId,
    checklist: [
      { id: "c1", label: "Post treatment flags", isDone: false },
      { id: "c2", label: "Apply grub prevention to common turf", isDone: false },
      { id: "c3", label: "Capture after photos", isDone: false },
    ],
    notes: "Board requested photos at north entrance and playground.",
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.insert(jobVisits).values({
    id: newId(),
    organizationId,
    jobId: northgateJobId,
    customerId: northgateId,
    propertyId: northgatePropertyId,
    scheduledStart: at(11, 0),
    scheduledEnd: at(14, 0),
    status: "on_site",
    routeOrder: 2,
    assignedCrewId: charlieCrewId,
    checklist: [
      { id: "c4", label: "Mow front lawn and loading dock side", isDone: true },
      { id: "c5", label: "Edge sidewalks", isDone: false },
      { id: "c6", label: "Log irrigation leak near dock", isDone: false },
    ],
    notes: "Facilities asked for a quote on mulch refresh.",
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.insert(tasks).values({ id: newId(), organizationId, entityType: "opportunity", entityId: walshOppId, title: "Follow up on mosquito proposal", status: "open", priority: "high", dueAt: at(16, 0), assignedUserId: amyId, createdByUserId: justinId, createdAt: now, updatedAt: now });
  await ctx.db.insert(tasks).values({ id: newId(), organizationId, entityType: "job", entityId: northgateJobId, title: "Prepare irrigation repair estimate", status: "in_progress", priority: "normal", dueAt: at(12, 0, 1), assignedUserId: justinId, createdByUserId: justinId, createdAt: now, updatedAt: now });

  await ctx.db.insert(activities).values({ id: newId(), organizationId, entityType: "opportunity", entityId: walshOppId, kind: "email", summary: "Estimate EST-1024 sent to Megan Walsh", actorUserId: amyId, occurredAt: at(14, 15) });
  await ctx.db.insert(activities).values({ id: newId(), organizationId, entityType: "visit", entityId: northgateJobId, kind: "visit", summary: "Crew Charlie marked Northgate visit on site", actorUserId: ninaId, occurredAt: at(11, 8) });
  await ctx.db.insert(activities).values({ id: newId(), organizationId, entityType: "opportunity", entityId: brooksideOppId, kind: "status_change", summary: "Brookside opportunity won and converted to job", actorUserId: justinId, occurredAt: at(10, 20, -1) });

  await ctx.db.insert(materials).values({ id: newId(), organizationId, name: "Merit grub control", unit: "bag", costCents: 7300, active: true, epaRegistrationNumber: "432-1312", restrictedUse: false, createdAt: now, updatedAt: now });
  await ctx.db.insert(materials).values({ id: newId(), organizationId, name: "Mosquito barrier mix", unit: "gallon", costCents: 2800, active: true, restrictedUse: false, createdAt: now, updatedAt: now });
  await ctx.db.insert(materials).values({ id: newId(), organizationId, name: "Premium overseed blend", unit: "bag", costCents: 6400, active: true, createdAt: now, updatedAt: now });

  for (const [pattern, kind] of [
    ["sales", "email_prefix"],
    ["info", "email_prefix"],
    ["marketing", "email_prefix"],
    ["lead generation", "message_phrase"],
    ["business opportunity", "message_phrase"],
    ["schedule a 15", "message_phrase"],
  ] as const) {
    await ctx.db.insert(spamRules).values({ id: newId(), organizationId, name: `Flag ${pattern}`, kind, pattern, score: 35, active: true, createdAt: now, updatedAt: now });
  }

  await ctx.db.insert(cityNormalizationRules).values({ id: newId(), organizationId, rawCity: "Foxboro", normalizedCity: "Foxborough", state: "MA", active: true, createdAt: now, updatedAt: now });
  await ctx.db.insert(dataQualityIssues).values({ id: newId(), organizationId, kind: "city_spelling", severity: "warning", status: "open", leadId: walshLeadId, fieldName: "city", currentValue: "Foxboro", suggestedValue: "Foxborough", summary: "Normalize common Foxboro spelling before estimating.", createdAt: now, updatedAt: now });
  await ctx.db.insert(externalIntegrations).values({ id: newId(), organizationId, provider: "google_maps", name: "Google Maps deep links", status: "enabled", config: { mode: "link_generation_only" }, createdAt: now, updatedAt: now });
  await ctx.db.insert(externalIntegrations).values({ id: newId(), organizationId, provider: "google_sheets", name: "Legacy lead sheet import", status: "planned", config: { source: "Netlify dashboard parity import" }, createdAt: now, updatedAt: now });
  await ctx.db.insert(dashboardWidgets).values({ id: newId(), organizationId, key: "pipeline_value", title: "Pipeline value", description: "Open opportunity value weighted by current sales stage.", config: { source: "opportunities" }, sortOrder: 1, active: true, createdAt: now, updatedAt: now });

  await ctx.db.insert(auditEvents).values({
    id: newId(),
    organizationId,
    actorUserId: justinId,
    action: "workspace.seed_sample_data",
    entityType: "organization",
    entityId: organizationId,
    summary: "Loaded the sample workspace dataset",
    after: { estimateId: walshEstimateId },
    createdAt: now,
  });

  const scale = await ensureDemoScaleData(ctx, organizationId);

  return { organizationId, created: true, scale };
}

export async function getWorkspace(ctx: ServerCtx, args: { organizationId: string }) {
  const { org, user, membership } = await requireWorkspace(ctx, args.organizationId);

  const [
    membershipRows,
    customerRows,
    contactRows,
    propertyRows,
    leadRows,
    opportunityRows,
    estimateRows,
    serviceCatalogRows,
    crewRows,
    jobRows,
    visitRows,
    taskRows,
    activityRows,
    materialRows,
  ] = await Promise.all([
    ctx.db.select().from(memberships).where(eq(memberships.organizationId, org.id)),
    ctx.db.select().from(customers).where(eq(customers.organizationId, org.id)).orderBy(desc(customers.updatedAt)),
    ctx.db.select().from(contacts).where(eq(contacts.organizationId, org.id)),
    ctx.db.select().from(properties).where(eq(properties.organizationId, org.id)),
    ctx.db.select().from(leads).where(eq(leads.organizationId, org.id)).orderBy(desc(leads.createdAt)),
    ctx.db.select().from(opportunities).where(eq(opportunities.organizationId, org.id)).orderBy(desc(opportunities.updatedAt)),
    ctx.db.select().from(estimates).where(eq(estimates.organizationId, org.id)),
    ctx.db.select().from(serviceCatalogItems).where(eq(serviceCatalogItems.organizationId, org.id)),
    ctx.db.select().from(crews).where(eq(crews.organizationId, org.id)),
    ctx.db.select().from(jobs).where(eq(jobs.organizationId, org.id)),
    ctx.db.select().from(jobVisits).where(eq(jobVisits.organizationId, org.id)).orderBy(asc(jobVisits.scheduledStart)),
    ctx.db.select().from(tasks).where(eq(tasks.organizationId, org.id)).orderBy(asc(tasks.dueAt)),
    ctx.db.select().from(activities).where(eq(activities.organizationId, org.id)).orderBy(desc(activities.occurredAt)).limit(50),
    ctx.db.select().from(materials).where(eq(materials.organizationId, org.id)),
  ]);

  const userRows = await Promise.all(
    membershipRows.map(
      async (membershipRow) =>
        (await ctx.db.select().from(users).where(eq(users.id, membershipRow.userId)).limit(1))[0] ?? null,
    ),
  );
  const primaryContactByCustomer = new Map(
    contactRows.filter((contact) => contact.isPrimary).map((contact) => [contact.customerId, contact]),
  );

  return {
    viewer: { userId: user.id, role: membership.role },
    seeded: Boolean(workspaceSettings(org).sampleDataSeededAt),
    organization: {
      id: org.id,
      name: org.name,
      timezone: org.timezone,
    },
    members: membershipRows.map((membershipRow, index) => {
      const memberUser = userRows[index];
      return {
        id: memberUser?.id ?? membershipRow.userId,
        name: memberUser?.name ?? "Unknown member",
        email: memberUser?.email ?? "",
        role: membershipRow.role,
      };
    }),
    customers: customerRows.map((customer) => {
      const contact = primaryContactByCustomer.get(customer.id);
      return {
        id: customer.id,
        name: customer.name,
        type: customer.type,
        status: customer.status === "do_not_service" ? "inactive" : customer.status,
        phone: contact?.phone ?? contact?.mobilePhone ?? "",
        email: contact?.email ?? "",
        tags: customer.tags as string[],
        ownerId: customer.ownerUserId ?? "",
      };
    }),
    properties: propertyRows.map((property) => ({
      id: property.id,
      customerId: property.customerId,
      label: property.label,
      street: property.street,
      city: property.city,
      state: property.state,
      postalCode: property.postalCode,
      notes: property.notes ?? "",
      lawnSizeSqFt: property.lawnSizeSqFt,
    })),
    leads: leadRows.map((lead) => ({
      id: lead.id,
      title: lead.title,
      customerId: lead.customerId ?? "",
      propertyId: lead.propertyId ?? "",
      source: lead.source,
      status: lead.status === "do_estimate" || lead.status === "estimate_provided" || lead.status === "follow_up" || lead.status === "waiting" ? "contacted" : lead.status === "spam" ? "disqualified" : lead.status === "lost_confirmed" || lead.status === "lost_assumed" || lead.status === "passed_on" || lead.status === "unqualified" ? "disqualified" : lead.status,
      urgency: lead.urgency,
      ownerId: lead.ownerUserId ?? "",
      leadType: lead.leadType,
      accountType: lead.accountType,
      companyAssignment: lead.companyAssignment,
      programRequests: lead.programRequests as string[] | null,
      lawnSizeSqFt: lead.lawnSizeSqFt,
      message: lead.message,
      estimateNotes: lead.estimateNotes,
      qualityScore: lead.qualityScore,
      spamScore: lead.spamScore,
      receivedAt: lead.receivedAt,
      createdAt: lead.createdAt,
    })),
    opportunities: opportunityRows.map((opportunity) => ({
      id: opportunity.id,
      leadId: opportunity.leadId,
      customerId: opportunity.customerId,
      propertyId: opportunity.propertyId ?? "",
      title: opportunity.title,
      stage: opportunity.stage,
      valueCents: opportunity.valueCents,
      closeProbability: opportunity.closeProbability,
      expectedCloseDate: opportunity.expectedCloseDate ?? opportunity.updatedAt,
      ownerId: opportunity.ownerUserId ?? "",
      serviceLines: opportunity.serviceLines as string[],
      updatedAt: opportunity.updatedAt,
    })),
    estimates: estimateRows.map((estimate) => ({
      id: estimate.id,
      opportunityId: estimate.opportunityId ?? "",
      customerId: estimate.customerId,
      propertyId: estimate.propertyId ?? "",
      estimateNumber: estimate.estimateNumber,
      status: estimate.status,
      subtotalCents: estimate.subtotalCents,
      taxCents: estimate.taxCents,
      totalCents: estimate.totalCents,
    })),
    serviceCatalog: serviceCatalogRows.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      defaultUnit: item.defaultUnit,
      defaultPriceCents: item.defaultPriceCents,
      active: item.active,
    })),
    crews: crewRows.map((crew) => ({
      id: crew.id,
      name: crew.name,
      color: crew.color,
      active: crew.active,
    })),
    jobs: jobRows.map((job) => ({
      id: job.id,
      customerId: job.customerId,
      propertyId: job.propertyId ?? "",
      title: job.title,
      status: job.status,
      priority: job.priority,
      managerId: job.managerUserId ?? "",
      startDate: job.startDate ?? job.createdAt,
    })),
    visits: visitRows.map((visit) => ({
      id: visit.id,
      jobId: visit.jobId,
      customerId: visit.customerId,
      propertyId: visit.propertyId ?? "",
      scheduledStart: visit.scheduledStart,
      scheduledEnd: visit.scheduledEnd,
      status: visit.status,
      routeOrder: visit.routeOrder ?? 0,
      crewId: visit.assignedCrewId ?? "",
      checklist: visit.checklist as ChecklistItem[],
      notes: visit.notes ?? "",
    })),
    tasks: taskRows.map((task) => ({
      id: task.id,
      entityType: task.entityType,
      entityId: task.entityId,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt ?? task.createdAt,
      assignedUserId: task.assignedUserId ?? "",
    })),
    activities: activityRows.map((activity) => ({
      id: activity.id,
      entityType: activity.entityType,
      entityId: activity.entityId,
      kind: activity.kind,
      summary: activity.summary,
      actorId: activity.actorUserId ?? "",
      occurredAt: activity.occurredAt,
    })),
    materials: materialRows.map((material) => ({
      id: material.id,
      name: material.name,
      unit: material.unit,
      costCents: material.costCents ?? 0,
      active: material.active,
    })),
  };
}

export async function createLead(
  ctx: ServerCtx,
  args: {
    organizationId: string;
    customerName: string;
    title: string;
    phone?: string;
    email?: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    valueCents: number;
    serviceLine: ServiceCategory;
    source?: string;
    leadType?: LeadType;
    accountType?: AccountType;
    companyAssignment?: string;
    lawnSizeSqFt?: number;
    urgency?: Urgency;
    message?: string;
    estimateNotes?: string;
  },
) {
  const { org, user } = await requireWorkspace(ctx, args.organizationId, "managePipeline");
  const now = Date.now();
  const source = args.source?.trim() || "Manual entry";
  const signals = spamSignals({ customerName: args.customerName, phone: args.phone, email: args.email, message: `${args.title} ${args.message ?? ""}` });
  const qualityIssues = leadQualityIssues({ email: args.email, phone: args.phone, street: args.street, city: args.city, postalCode: args.postalCode, lawnSizeSqFt: args.lawnSizeSqFt, serviceTerritory: (org.serviceTerritory as string[] | null) ?? undefined });
  const qualityScore = Math.max(20, 100 - qualityIssues.length * 12 - Math.round(signals.score / 3));

  const customerId = newId();
  await ctx.db.insert(customers).values({
    id: customerId,
    organizationId: org.id,
    name: args.customerName || "New customer",
    type: args.accountType ?? "residential",
    status: "prospect",
    source,
    ownerUserId: user.id,
    tags: [args.serviceLine, source],
    lifetimeValueCents: 0,
    createdAt: now,
    updatedAt: now,
  });
  const contactId = newId();
  await ctx.db.insert(contacts).values({
    id: contactId,
    organizationId: org.id,
    customerId,
    name: args.customerName || "New customer",
    email: args.email,
    phone: args.phone,
    isPrimary: true,
    createdAt: now,
    updatedAt: now,
  });
  const propertyId = newId();
  await ctx.db.insert(properties).values({
    id: propertyId,
    organizationId: org.id,
    customerId,
    label: "Primary property",
    street: args.street,
    city: args.city,
    state: args.state,
    postalCode: args.postalCode,
    notes: args.estimateNotes,
    lawnSizeSqFt: args.lawnSizeSqFt,
    createdAt: now,
    updatedAt: now,
  });
  const leadId = newId();
  await ctx.db.insert(leads).values({
    id: leadId,
    organizationId: org.id,
    customerId,
    contactId,
    propertyId,
    title: args.title,
    source,
    leadType: args.leadType ?? "other",
    companyAssignment: args.companyAssignment,
    accountType: args.accountType ?? "residential",
    email: args.email,
    mobilePhone: args.phone,
    normalizedPhone: args.phone?.replace(/\D/g, ""),
    message: args.message,
    estimateNotes: args.estimateNotes,
    programRequests: [args.serviceLine],
    lawnSizeSqFt: args.lawnSizeSqFt,
    status: signals.score >= 70 ? "spam" : "contacted",
    urgency: args.urgency ?? "normal",
    ownerUserId: user.id,
    spamScore: signals.score,
    spamReasons: signals.reasons,
    qualityScore,
    receivedAt: now,
    rawPayload: args,
    createdAt: now,
    updatedAt: now,
  });
  const opportunityId = newId();
  await ctx.db.insert(opportunities).values({
    id: opportunityId,
    organizationId: org.id,
    leadId,
    customerId,
    propertyId,
    title: args.title,
    stage: "qualified",
    valueCents: args.valueCents,
    closeProbability: 35,
    expectedCloseDate: now + 14 * 24 * 60 * 60 * 1000,
    ownerUserId: user.id,
    serviceLines: [args.serviceLine],
    createdAt: now,
    updatedAt: now,
  });

  if (signals.score > 0) {
    await ctx.db.insert(dataQualityIssues).values({
      id: newId(),
      organizationId: org.id,
      kind: "potential_spam",
      severity: signals.score >= 70 ? "critical" : "warning",
      status: "open",
      leadId,
      customerId,
      summary: `Potential spam signal: ${signals.reasons.join(", ")}`,
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const issue of qualityIssues) {
    await ctx.db.insert(dataQualityIssues).values({
      id: newId(),
      organizationId: org.id,
      kind: issue.kind,
      severity: issue.severity,
      status: "open",
      leadId,
      customerId,
      fieldName: issue.fieldName,
      currentValue: issue.currentValue,
      summary: issue.summary,
      createdAt: now,
      updatedAt: now,
    });
  }
  await ctx.db.insert(auditEvents).values({ id: newId(), organizationId: org.id, actorUserId: user.id, action: "lead.create", entityType: "lead", entityId: leadId, summary: `Created lead ${args.title}`, after: { customerId, propertyId, opportunityId }, createdAt: now });
  return { customerId, leadId, opportunityId };
}

export async function advanceOpportunity(
  ctx: ServerCtx,
  args: { organizationId: string; opportunityId: string; stage: OpportunityStage },
) {
  const { org } = await requireWorkspace(ctx, args.organizationId, "managePipeline");
  const opportunity =
    (await ctx.db.select().from(opportunities).where(eq(opportunities.id, args.opportunityId)).limit(1))[0] ?? null;
  if (!opportunity || opportunity.organizationId !== org.id) throw new Error("Opportunity not found.");
  const now = Date.now();
  await ctx.db
    .update(opportunities)
    .set({
      stage: args.stage,
      closeProbability: args.stage === "won" ? 100 : args.stage === "lost" ? 0 : opportunity.closeProbability,
      updatedAt: now,
    })
    .where(eq(opportunities.id, args.opportunityId));
  await ctx.db.insert(activities).values({ id: newId(), organizationId: org.id, entityType: "opportunity", entityId: args.opportunityId, kind: "status_change", summary: `Moved ${opportunity.title} to ${args.stage}`, actorUserId: opportunity.ownerUserId, occurredAt: now });
}

export async function assignVisit(
  ctx: ServerCtx,
  args: { organizationId: string; visitId: string; crewId: string },
) {
  const { org } = await requireWorkspace(ctx, args.organizationId, "dispatchVisits");
  const visit = (await ctx.db.select().from(jobVisits).where(eq(jobVisits.id, args.visitId)).limit(1))[0] ?? null;
  const crew = (await ctx.db.select().from(crews).where(eq(crews.id, args.crewId)).limit(1))[0] ?? null;
  if (!visit || !crew || visit.organizationId !== org.id || crew.organizationId !== org.id) throw new Error("Visit or crew not found.");
  await ctx.db.update(jobVisits).set({ assignedCrewId: args.crewId, updatedAt: Date.now() }).where(eq(jobVisits.id, args.visitId));
}

export async function completeChecklistItem(
  ctx: ServerCtx,
  args: { organizationId: string; visitId: string; itemId: string },
) {
  const { org } = await requireWorkspace(ctx, args.organizationId, "completeFieldWork");
  const visit = (await ctx.db.select().from(jobVisits).where(eq(jobVisits.id, args.visitId)).limit(1))[0] ?? null;
  if (!visit || visit.organizationId !== org.id) throw new Error("Visit not found.");
  const now = Date.now();
  await ctx.db
    .update(jobVisits)
    .set({
      status: visit.status === "scheduled" ? "on_site" : visit.status,
      checklist: (visit.checklist as ChecklistItem[]).map((item) =>
        item.id === args.itemId ? { ...item, isDone: !item.isDone, completedAt: item.isDone ? undefined : now } : item,
      ),
      updatedAt: now,
    })
    .where(eq(jobVisits.id, args.visitId));
}

export async function submitVisit(
  ctx: ServerCtx,
  args: { organizationId: string; visitId: string; issueFlag?: string },
) {
  const { org } = await requireWorkspace(ctx, args.organizationId, "completeFieldWork");
  const visit = (await ctx.db.select().from(jobVisits).where(eq(jobVisits.id, args.visitId)).limit(1))[0] ?? null;
  if (!visit || visit.organizationId !== org.id) throw new Error("Visit not found.");
  const now = Date.now();
  await ctx.db.update(jobVisits).set({ status: "complete", completedAt: now, updatedAt: now }).where(eq(jobVisits.id, args.visitId));
  if (args.issueFlag?.trim()) {
    await ctx.db.insert(tasks).values({
      id: newId(),
      organizationId: org.id,
      entityType: "visit",
      entityId: args.visitId,
      title: args.issueFlag.trim(),
      status: "open",
      priority: "high",
      dueAt: now + 24 * 60 * 60 * 1000,
      createdAt: now,
      updatedAt: now,
    });
  }
  await ctx.db.insert(activities).values({ id: newId(), organizationId: org.id, entityType: "visit", entityId: args.visitId, kind: "visit", summary: "Submitted visit completion from field PWA", occurredAt: now });
}

export async function addTask(ctx: ServerCtx, args: { organizationId: string; jobId: string; title: string }) {
  const { org } = await requireWorkspace(ctx, args.organizationId, "addInternalNotes");
  const job = (await ctx.db.select().from(jobs).where(eq(jobs.id, args.jobId)).limit(1))[0] ?? null;
  if (!job || job.organizationId !== org.id) throw new Error("Job not found.");
  const now = Date.now();
  const taskId = newId();
  await ctx.db.insert(tasks).values({
    id: taskId,
    organizationId: org.id,
    entityType: "job",
    entityId: args.jobId,
    title: args.title,
    status: "open",
    priority: "normal",
    dueAt: now + 48 * 60 * 60 * 1000,
    createdAt: now,
    updatedAt: now,
  });
  return taskId;
}

export async function addActivity(
  ctx: ServerCtx,
  args: {
    organizationId: string;
    entityType: ActivityEntityType;
    entityId: string;
    kind: ActivityComposerKind;
    summary: string;
    createFollowUp?: boolean;
    dueInDays?: number;
  },
) {
  const { org, user } = await requireWorkspace(ctx, args.organizationId, "addInternalNotes");
  const summary = args.summary.trim();
  if (!summary) throw new Error("Activity summary is required.");

  const target =
    args.entityType === "customer"
      ? ((await ctx.db.select().from(customers).where(eq(customers.id, args.entityId)).limit(1))[0] ?? null)
      : ((await ctx.db.select().from(jobs).where(eq(jobs.id, args.entityId)).limit(1))[0] ?? null);
  if (!target || target.organizationId !== org.id) throw new Error("Activity target not found.");

  const now = Date.now();
  const activityId = newId();
  await ctx.db.insert(activities).values({
    id: activityId,
    organizationId: org.id,
    entityType: args.entityType,
    entityId: args.entityId,
    kind: args.kind,
    summary,
    actorUserId: user.id,
    occurredAt: now,
  });

  if (args.createFollowUp) {
    const dueInDays = Math.max(1, Math.min(30, Math.round(args.dueInDays ?? 2)));
    await ctx.db.insert(tasks).values({
      id: newId(),
      organizationId: org.id,
      entityType: args.entityType,
      entityId: args.entityId,
      title: `Follow up: ${summary.slice(0, 80)}`,
      status: "open",
      priority: "normal",
      dueAt: now + dueInDays * 24 * 60 * 60 * 1000,
      createdAt: now,
      updatedAt: now,
    });
  }

  return activityId;
}

export async function createCrew(ctx: ServerCtx, args: { organizationId: string; name: string }) {
  const { org } = await requireWorkspace(ctx, args.organizationId, "manageCatalog");
  const colors = ["#2f6b4f", "#7c6a2b", "#42526b", "#8a4f36", "#315a72"];
  const crewRows = await ctx.db.select().from(crews).where(eq(crews.organizationId, org.id));
  const crewId = newId();
  await ctx.db.insert(crews).values({
    id: crewId,
    organizationId: org.id,
    name: args.name,
    color: colors[crewRows.length % colors.length],
    active: true,
    capacityMinutesPerDay: 420,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return crewId;
}

export async function toggleServiceCatalogItem(
  ctx: ServerCtx,
  args: { organizationId: string; itemId: string },
) {
  const { org } = await requireWorkspace(ctx, args.organizationId, "manageCatalog");
  const item =
    (await ctx.db.select().from(serviceCatalogItems).where(eq(serviceCatalogItems.id, args.itemId)).limit(1))[0] ?? null;
  if (!item || item.organizationId !== org.id) throw new Error("Catalog item not found.");
  await ctx.db.update(serviceCatalogItems).set({ active: !item.active, updatedAt: Date.now() }).where(eq(serviceCatalogItems.id, args.itemId));
}
