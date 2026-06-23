import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { audit } from "./audit";
import { issueMessages, parseLeadImportCsv, type LeadImportIssue, type LeadImportIssueCode, type ParsedLeadImportRow } from "./imports";

type Ctx = QueryCtx | MutationCtx;

export type LeadImportDisplayRow = {
  id: string;
  rowNumber: number;
  customerName: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  serviceLine?: ParsedLeadImportRow["serviceLine"];
  source?: string;
  mappedEntity: ParsedLeadImportRow["mappedEntity"];
  status: ParsedLeadImportRow["status"];
  issues: LeadImportIssue[];
};

function contactLimitForPlan(plan?: string) {
  if (plan === "free") return 10;
  if (plan === "starter") return 250;
  return null;
}

async function getOrganizationPlan(ctx: Ctx, organizationId: Id<"organizations">) {
  const organization = await ctx.db.get(organizationId);
  if (!organization) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found." });
  const subscription = await ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).first();
  const plan = subscription?.plan ?? organization.billingPlan ?? "free";
  return { organization, plan, contactLimit: contactLimitForPlan(plan) };
}

function issueKind(code: LeadImportIssueCode) {
  if (code === "outside_service_territory") return "out_of_territory";
  if (code === "free_plan_limit") return "plan_limit";
  return code;
}

function issueFieldName(code: LeadImportIssueCode) {
  if (code === "missing_name") return "customerName";
  if (code === "missing_contact") return "contact";
  if (code === "missing_address" || code === "outside_service_territory") return "property";
  if (code === "unknown_service_line") return "serviceLine";
  if (code === "duplicate") return "duplicate";
  if (code === "free_plan_limit") return "plan";
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mappedFromRow(row: Doc<"importRows">): ParsedLeadImportRow | null {
  if (!isObject(row.mapped)) return null;
  const mapped = row.mapped as Partial<ParsedLeadImportRow>;
  if (typeof mapped.customerName !== "string" || typeof mapped.rowNumber !== "number") return null;
  return {
    rowNumber: mapped.rowNumber,
    raw: isObject(mapped.raw) ? Object.fromEntries(Object.entries(mapped.raw).map(([key, value]) => [key, String(value ?? "")])) : {},
    customerName: mapped.customerName,
    email: typeof mapped.email === "string" ? mapped.email : undefined,
    phone: typeof mapped.phone === "string" ? mapped.phone : undefined,
    street: typeof mapped.street === "string" ? mapped.street : undefined,
    city: typeof mapped.city === "string" ? mapped.city : undefined,
    state: typeof mapped.state === "string" ? mapped.state : undefined,
    postalCode: typeof mapped.postalCode === "string" ? mapped.postalCode : undefined,
    serviceLine: mapped.serviceLine,
    source: typeof mapped.source === "string" ? mapped.source : undefined,
    ownerEmail: typeof mapped.ownerEmail === "string" ? mapped.ownerEmail : undefined,
    accountType: mapped.accountType,
    valueCents: typeof mapped.valueCents === "number" ? mapped.valueCents : undefined,
    mappedEntity: mapped.mappedEntity ?? "lead",
    status: mapped.status ?? (row.status === "failed" ? "blocked" : row.status === "imported" ? "ready" : "needs_review"),
    issues: Array.isArray(mapped.issues) ? (mapped.issues as LeadImportIssue[]) : [],
  };
}

function displayRow(row: Doc<"importRows">): LeadImportDisplayRow {
  const mapped = mappedFromRow(row);
  return {
    id: row._id,
    rowNumber: row.rowNumber,
    customerName: mapped?.customerName ?? "",
    email: mapped?.email,
    phone: mapped?.phone,
    street: mapped?.street,
    city: mapped?.city,
    state: mapped?.state,
    postalCode: mapped?.postalCode,
    serviceLine: mapped?.serviceLine,
    source: mapped?.source,
    mappedEntity: mapped?.mappedEntity ?? "lead",
    status: mapped?.status ?? (row.status === "failed" ? "blocked" : row.status === "imported" ? "ready" : "needs_review"),
    issues: mapped?.issues ?? (row.error ? [{ code: "missing_status", severity: "review", message: row.error } as LeadImportIssue] : []),
  };
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0], lastName: undefined };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function normalizedPhone(value?: string) {
  return value?.replace(/\D/g, "") || undefined;
}

function normalizedEmail(value?: string) {
  return value?.trim().toLowerCase() || undefined;
}

function leadTitle(row: ParsedLeadImportRow) {
  if (row.serviceLine) return `${row.serviceLine.replaceAll("_", " ")} request for ${row.customerName}`;
  return `Imported lead for ${row.customerName}`;
}

function duplicateClusterKey(row: ParsedLeadImportRow) {
  const email = normalizedEmail(row.email);
  if (email) return `email:${email}`;
  const phone = normalizedPhone(row.phone);
  if (phone) return `phone:${phone}`;
  return row.customerName ? `name:${row.customerName.trim().toLowerCase()}` : undefined;
}

async function writeImportIssues(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  row: ParsedLeadImportRow,
  args: {
    leadId?: Id<"leads">;
    customerId?: Id<"customers">;
    propertyId?: Id<"properties">;
  } = {},
) {
  const now = Date.now();
  for (const issue of row.issues) {
    await ctx.db.insert("dataQualityIssues", {
      organizationId,
      kind: issueKind(issue.code),
      severity: issue.severity === "block" ? "critical" : "warning",
      status: "open",
      leadId: args.leadId,
      customerId: args.customerId,
      propertyId: args.propertyId,
      fieldName: issueFieldName(issue.code),
      currentValue: issue.code === "unknown_service_line" ? row.raw.serviceLine : issue.code === "outside_service_territory" ? row.city : undefined,
      summary: `Import row ${row.rowNumber}: ${issue.message}`,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function ownerByEmail(ctx: Ctx, organizationId: Id<"organizations">) {
  const memberships = await ctx.db.query("memberships").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect();
  const rows = await Promise.all(memberships.map(async (membership) => ({ membership, user: await ctx.db.get(membership.userId) })));
  return new Map(rows.filter((row) => row.user?.email).map((row) => [row.user!.email.toLowerCase(), row.user!._id]));
}

export async function createLeadImportPreviewJob(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    actorUserId?: Id<"users">;
    fileName?: string;
    csvText: string;
  },
) {
  if (args.csvText.length > 250_000) {
    throw new ConvexError({ code: "IMPORT_TOO_LARGE", message: "CSV imports are limited to 250KB in this workflow." });
  }

  const { organization, plan, contactLimit } = await getOrganizationPlan(ctx, args.organizationId);
  const contacts = await ctx.db.query("contacts").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect();
  const rows = parseLeadImportCsv(args.csvText, {
    currentContactCount: contacts.length,
    contactLimit,
    serviceTerritory: organization.serviceTerritory,
    existingContacts: contacts.map((contact) => ({ name: contact.name, email: contact.email, phone: contact.phone ?? contact.mobilePhone })),
  });

  if (rows.length === 0) {
    throw new ConvexError({ code: "INVALID_IMPORT", message: "No importable rows were found in that CSV." });
  }

  const now = Date.now();
  const importJobId = await ctx.db.insert("importJobs", {
    organizationId: args.organizationId,
    source: "csv",
    status: "queued",
    fileName: args.fileName,
    rowCount: rows.length,
    importedCount: 0,
    skippedCount: 0,
    failedCount: rows.filter((row) => row.status === "blocked").length,
    startedAt: now,
    createdByUserId: args.actorUserId,
    createdAt: now,
    updatedAt: now,
  });

  const createdRows: Doc<"importRows">[] = [];
  for (const row of rows) {
    const rowId = await ctx.db.insert("importRows", {
      organizationId: args.organizationId,
      importJobId,
      rowNumber: row.rowNumber,
      status: row.status === "blocked" ? "failed" : "pending",
      raw: row.raw,
      mapped: row,
      targetEntityType: "lead",
      error: row.issues.length ? issueMessages(row.issues) : undefined,
      createdAt: now,
      updatedAt: now,
    });
    const created = await ctx.db.get(rowId);
    if (created) createdRows.push(created);
    if (row.issues.length) await writeImportIssues(ctx, args.organizationId, row);
  }

  await audit(ctx, {
    organizationId: args.organizationId,
    actorUserId: args.actorUserId,
    action: "import.preview",
    entityType: "import",
    entityId: importJobId,
    summary: `Previewed ${rows.length} CSV import rows for ${plan} plan`,
    after: {
      fileName: args.fileName,
      ready: rows.filter((row) => row.status === "ready").length,
      needsReview: rows.filter((row) => row.status === "needs_review").length,
      blocked: rows.filter((row) => row.status === "blocked").length,
    },
  });

  return { importJobId, rows: createdRows.map(displayRow) };
}

export async function commitLeadImportJob(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    importJobId: Id<"importJobs">;
    actorUserId?: Id<"users">;
    rowIds?: Array<Id<"importRows">>;
    includeReviewRows?: boolean;
  },
) {
  const importJob = await ctx.db.get(args.importJobId);
  if (!importJob || importJob.organizationId !== args.organizationId) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Import job not found for this organization." });
  }
  if (importJob.status === "completed") {
    throw new ConvexError({ code: "IMPORT_ALREADY_COMMITTED", message: "This import job has already been committed." });
  }

  const { contactLimit } = await getOrganizationPlan(ctx, args.organizationId);
  const [contacts, importRows, ownerLookup] = await Promise.all([
    ctx.db.query("contacts").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
    ctx.db.query("importRows").withIndex("by_import_job", (q) => q.eq("importJobId", args.importJobId)).collect(),
    ownerByEmail(ctx, args.organizationId),
  ]);

  const requested = new Set((args.rowIds ?? []).map(String));
  if (requested.size > 0 && importRows.some((row) => requested.has(row._id) && row.organizationId !== args.organizationId)) {
    throw new ConvexError({ code: "TENANT_MISMATCH", message: "Import row does not belong to this organization." });
  }
  for (const rowId of requested) {
    if (!importRows.some((row) => row._id === rowId)) {
      throw new ConvexError({ code: "NOT_FOUND", message: "One or more import rows do not belong to this import job." });
    }
  }

  const rowsToCommit = importRows
    .filter((row) => requested.size === 0 || requested.has(row._id))
    .sort((left, right) => left.rowNumber - right.rowNumber);
  const now = Date.now();
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  await ctx.db.patch(args.importJobId, { status: "processing", updatedAt: now });

  for (const importRow of rowsToCommit) {
    const row = mappedFromRow(importRow);
    if (!row) {
      await ctx.db.patch(importRow._id, { status: "failed", error: "Could not read mapped import row.", updatedAt: now });
      failed += 1;
      continue;
    }
    if (importRow.status !== "pending") {
      if (importRow.status === "failed") failed += 1;
      else skipped += 1;
      continue;
    }
    if (row.status === "blocked") {
      await ctx.db.patch(importRow._id, { status: "failed", error: issueMessages(row.issues), updatedAt: now });
      failed += 1;
      continue;
    }
    if (row.status === "needs_review" && !args.includeReviewRows) {
      await ctx.db.patch(importRow._id, { status: "skipped", error: "Needs review before commit.", updatedAt: now });
      skipped += 1;
      continue;
    }
    if (contactLimit !== null && contacts.length + imported >= contactLimit) {
      await ctx.db.patch(importRow._id, { status: "skipped", error: "Plan contact limit reached before this row.", updatedAt: now });
      skipped += 1;
      continue;
    }

    try {
      const ownerUserId = row.ownerEmail ? ownerLookup.get(row.ownerEmail.toLowerCase()) ?? args.actorUserId : args.actorUserId;
      const serviceLines = row.serviceLine ? [row.serviceLine] : [];
      const { firstName, lastName } = splitName(row.customerName);
      const customerId = await ctx.db.insert("customers", {
        organizationId: args.organizationId,
        name: row.customerName,
        type: row.accountType ?? "residential",
        status: "prospect",
        source: row.source ?? "CSV import",
        ownerUserId,
        tags: serviceLines.length ? ["imported", ...serviceLines] : ["imported"],
        createdAt: now,
        updatedAt: now,
      });

      const contactId = await ctx.db.insert("contacts", {
        organizationId: args.organizationId,
        customerId,
        name: row.customerName,
        email: row.email,
        phone: row.phone,
        isPrimary: true,
        createdAt: now,
        updatedAt: now,
      });

      const propertyId =
        row.street && row.city
          ? await ctx.db.insert("properties", {
              organizationId: args.organizationId,
              customerId,
              label: "Primary property",
              street: row.street,
              city: row.city,
              state: row.state ?? "",
              postalCode: row.postalCode ?? "",
              createdAt: now,
              updatedAt: now,
            })
          : undefined;

      const leadId = await ctx.db.insert("leads", {
        organizationId: args.organizationId,
        customerId,
        contactId,
        propertyId,
        title: leadTitle(row),
        source: row.source ?? "CSV import",
        leadType: "other",
        accountType: row.accountType ?? "residential",
        firstName,
        lastName,
        email: row.email,
        mobilePhone: row.phone,
        normalizedPhone: normalizedPhone(row.phone),
        programRequests: serviceLines,
        grade: "ungraded",
        status: "new",
        urgency: "normal",
        ownerUserId,
        spamScore: 0,
        spamReasons: [],
        duplicateClusterKey: duplicateClusterKey(row),
        qualityScore: Math.max(20, 100 - row.issues.length * 15 - (row.serviceLine ? 0 : 8)),
        receivedAt: now,
        externalSourceId: `${args.importJobId}:${importRow.rowNumber}`,
        rawPayload: row.raw,
        createdAt: now,
        updatedAt: now,
      });

      const opportunityId = await ctx.db.insert("opportunities", {
        organizationId: args.organizationId,
        leadId,
        customerId,
        propertyId,
        title: leadTitle(row),
        stage: "qualified",
        valueCents: row.valueCents ?? 50000,
        closeProbability: 30,
        expectedCloseDate: now + 14 * 24 * 60 * 60 * 1000,
        ownerUserId,
        serviceLines,
        createdAt: now,
        updatedAt: now,
      });

      if (row.issues.length) await writeImportIssues(ctx, args.organizationId, row, { leadId, customerId, propertyId });
      await ctx.db.patch(importRow._id, {
        status: "imported",
        targetEntityType: "lead",
        targetEntityId: leadId,
        error: undefined,
        updatedAt: now,
      });
      imported += 1;

      await audit(ctx, {
        organizationId: args.organizationId,
        actorUserId: args.actorUserId,
        action: "import.row.commit",
        entityType: "lead",
        entityId: leadId,
        summary: `Committed import row ${row.rowNumber} for ${row.customerName}`,
        after: { importJobId: args.importJobId, importRowId: importRow._id, customerId, contactId, propertyId, opportunityId },
      });
    } catch (error) {
      await ctx.db.patch(importRow._id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Import row failed.",
        updatedAt: now,
      });
      failed += 1;
    }
  }

  const allRows = await ctx.db.query("importRows").withIndex("by_import_job", (q) => q.eq("importJobId", args.importJobId)).collect();
  const importedCount = allRows.filter((row) => row.status === "imported").length;
  const skippedCount = allRows.filter((row) => row.status === "skipped").length;
  const failedCount = allRows.filter((row) => row.status === "failed").length;

  await ctx.db.patch(args.importJobId, {
    status: "completed",
    importedCount,
    skippedCount,
    failedCount,
    completedAt: Date.now(),
    updatedAt: Date.now(),
  });

  await audit(ctx, {
    organizationId: args.organizationId,
    actorUserId: args.actorUserId,
    action: "import.commit",
    entityType: "import",
    entityId: args.importJobId,
    summary: `Committed CSV import: ${imported} imported, ${skipped} skipped, ${failed} failed`,
    after: { imported, skipped, failed, importJobId: args.importJobId },
  });

  return { imported, skipped, failed };
}

export async function listLeadImportJobs(ctx: QueryCtx, organizationId: Id<"organizations">) {
  const jobs = await ctx.db.query("importJobs").withIndex("by_org_created", (q) => q.eq("organizationId", organizationId)).order("desc").take(20);
  return await Promise.all(
    jobs.map(async (job) => {
      const rows = await ctx.db.query("importRows").withIndex("by_import_job", (q) => q.eq("importJobId", job._id)).collect();
      return { job, rows: rows.sort((left, right) => left.rowNumber - right.rowNumber).map(displayRow) };
    }),
  );
}
