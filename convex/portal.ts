import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireMembership, requireUser } from "./lib/auth";
import { audit } from "./lib/audit";
import { portalInviteEmail } from "./lib/emails";

const PORTAL_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function portalIdentity(ctx: QueryCtx | MutationCtx, selectedPortalUserId?: Id<"portalUsers">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const users = await ctx.db
    .query("portalUsers")
    .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
    .collect();
  const portalUser = selectedPortalUserId
    ? users.find((candidate) => candidate._id === selectedPortalUserId)
    : users.find((candidate) => candidate.status === "active");
  if (!portalUser || portalUser.status !== "active") return null;
  return { identity, portalUser };
}

async function requirePortalIdentity(ctx: MutationCtx, selectedPortalUserId?: Id<"portalUsers">) {
  const access = await portalIdentity(ctx, selectedPortalUserId);
  if (!access) {
    throw new ConvexError({ code: "PORTAL_ACCESS_REQUIRED", message: "An active customer portal account is required." });
  }
  return access;
}

export const listMyPortals = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const users = await ctx.db
      .query("portalUsers")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
      .collect();
    return await Promise.all(
      users
        .filter((user) => user.status === "active")
        .map(async (user) => {
          const [organization, customer] = await Promise.all([
            ctx.db.get(user.organizationId),
            ctx.db.get(user.customerId),
          ]);
          return {
            portalUserId: user._id,
            organizationName: organization?.name ?? "Service company",
            customerName: customer?.name ?? user.name,
          };
        }),
    );
  },
});

export const getMyPortal = query({
  args: { portalUserId: v.optional(v.id("portalUsers")) },
  handler: async (ctx, args) => {
    const access = await portalIdentity(ctx, args.portalUserId);
    if (!access) return null;
    const { portalUser } = access;
    const [organization, customer, contact, properties, estimates, jobs, visits, invoices, payments, messages, requests, preferences] = await Promise.all([
      ctx.db.get(portalUser.organizationId),
      ctx.db.get(portalUser.customerId),
      portalUser.contactId ? ctx.db.get(portalUser.contactId) : null,
      ctx.db.query("properties").withIndex("by_customer", (q) => q.eq("customerId", portalUser.customerId)).collect(),
      ctx.db.query("estimates").withIndex("by_customer", (q) => q.eq("customerId", portalUser.customerId)).collect(),
      ctx.db.query("jobs").withIndex("by_customer", (q) => q.eq("customerId", portalUser.customerId)).collect(),
      ctx.db.query("jobVisits").withIndex("by_org", (q) => q.eq("organizationId", portalUser.organizationId)).collect(),
      ctx.db.query("customerInvoices").withIndex("by_customer", (q) => q.eq("customerId", portalUser.customerId)).collect(),
      ctx.db.query("customerPayments").withIndex("by_customer", (q) => q.eq("customerId", portalUser.customerId)).collect(),
      ctx.db.query("portalMessages").withIndex("by_customer", (q) => q.eq("customerId", portalUser.customerId)).collect(),
      ctx.db.query("portalServiceRequests").withIndex("by_customer", (q) => q.eq("customerId", portalUser.customerId)).collect(),
      ctx.db.query("portalPreferences").withIndex("by_portal_user", (q) => q.eq("portalUserId", portalUser._id)).unique(),
    ]);

    const propertyIds = new Set(properties.map((property) => property._id));
    const customerJobs = new Map(jobs.map((job) => [job._id, job]));
    const customerVisits = visits.filter((visit) => customerJobs.has(visit.jobId) && (!visit.propertyId || propertyIds.has(visit.propertyId)));

    const estimateRows = await Promise.all(
      estimates.map(async (estimate) => ({
        ...estimate,
        lineItems: await ctx.db.query("estimateLineItems").withIndex("by_estimate", (q) => q.eq("estimateId", estimate._id)).collect(),
      })),
    );

    const visitRows = await Promise.all(
      customerVisits.map(async (visit) => {
        const [photos, applications] = await Promise.all([
          ctx.db.query("photos").withIndex("by_visit", (q) => q.eq("visitId", visit._id)).collect(),
          ctx.db.query("materialApplications").withIndex("by_visit", (q) => q.eq("visitId", visit._id)).collect(),
        ]);
        const materials = await Promise.all(
          applications.map(async (application) => ({ ...application, material: await ctx.db.get(application.materialId) })),
        );
        return { ...visit, job: customerJobs.get(visit.jobId) ?? null, photos, materials };
      }),
    );

    const publicNotes = await ctx.db
      .query("notes")
      .withIndex("by_org", (q) => q.eq("organizationId", portalUser.organizationId))
      .collect();
    const visibleEntityIds = new Set<string>([
      portalUser.customerId,
      ...properties.map((property) => property._id),
      ...jobs.map((job) => job._id),
      ...customerVisits.map((visit) => visit._id),
      ...estimates.map((estimate) => estimate._id),
      ...invoices.map((invoice) => invoice._id),
    ]);

    const files = await ctx.db
      .query("files")
      .withIndex("by_org", (q) => q.eq("organizationId", portalUser.organizationId))
      .collect();
    const documents = await Promise.all(
      files
        .filter((file) => visibleEntityIds.has(file.entityId))
        .map(async (file) => ({ ...file, url: file.storageId ? await ctx.storage.getUrl(file.storageId) : null })),
    );

    return {
      portalUser: { id: portalUser._id, name: portalUser.name, email: portalUser.email },
      organization: organization ? { id: organization._id, name: organization.name, timezone: organization.timezone } : null,
      customer,
      contact,
      properties,
      estimates: estimateRows.sort((a, b) => b.updatedAt - a.updatedAt),
      jobs,
      visits: visitRows.sort((a, b) => b.scheduledStart - a.scheduledStart),
      invoices: invoices.sort((a, b) => b.createdAt - a.createdAt),
      payments: payments.sort((a, b) => b.receivedAt - a.receivedAt),
      documents: documents.sort((a, b) => b.createdAt - a.createdAt),
      notes: publicNotes.filter((note) => note.visibility === "customer" && visibleEntityIds.has(note.entityId)),
      messages: messages.sort((a, b) => a.createdAt - b.createdAt),
      serviceRequests: requests.sort((a, b) => b.createdAt - a.createdAt),
      preferences,
    };
  },
});

export const createInvite = mutation({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    contactId: v.optional(v.id("contacts")),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageOrganization");
    const [organization, customer, contact] = await Promise.all([
      ctx.db.get(args.organizationId),
      ctx.db.get(args.customerId),
      args.contactId ? ctx.db.get(args.contactId) : null,
    ]);
    if (!organization || !customer || customer.organizationId !== args.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found." });
    }
    if (contact && (contact.organizationId !== args.organizationId || contact.customerId !== args.customerId)) {
      throw new ConvexError({ code: "TENANT_MISMATCH", message: "Contact does not belong to this customer." });
    }
    const email = normalizeEmail(args.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError({ code: "INVALID_EMAIL", message: "Enter a valid email address." });
    }
    const existingUsers = await ctx.db.query("portalUsers").withIndex("by_customer", (q) => q.eq("customerId", args.customerId)).collect();
    if (existingUsers.some((candidate) => normalizeEmail(candidate.email) === email && candidate.status !== "revoked")) {
      throw new ConvexError({ code: "PORTAL_USER_EXISTS", message: "This contact already has portal access or a pending invitation." });
    }
    const now = Date.now();
    const token = newToken();
    const inviteId = await ctx.db.insert("portalInvites", {
      organizationId: args.organizationId,
      customerId: args.customerId,
      contactId: args.contactId,
      email,
      name: args.name.trim() || customer.name,
      token,
      status: "pending",
      expiresAt: now + PORTAL_INVITE_TTL_MS,
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });
    const portalUserId = await ctx.db.insert("portalUsers", {
      organizationId: args.organizationId,
      customerId: args.customerId,
      contactId: args.contactId,
      email,
      name: args.name.trim() || customer.name,
      status: "invited",
      invitedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "portal.invite_created",
      entityType: "customer",
      entityId: args.customerId,
      summary: `Invited ${email} to the customer portal`,
      after: { inviteId, portalUserId },
    });
    const acceptUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/portal/invite/${token}`;
    const emailMessage = portalInviteEmail({ organizationName: organization.name, customerName: args.name.trim() || customer.name, acceptUrl });
    await ctx.scheduler.runAfter(0, internal.email.send, { to: email, ...emailMessage });
    return { inviteId, portalUserId };
  },
});

export const listAccess = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { membership } = await requireMembership(ctx, args.organizationId);
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only owners and admins can manage customer portal access." });
    }
    const [users, invites, customers, contacts] = await Promise.all([
      ctx.db.query("portalUsers").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("portalInvites").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("customers").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
      ctx.db.query("contacts").withIndex("by_org", (q) => q.eq("organizationId", args.organizationId)).collect(),
    ]);
    const customerById = new Map(customers.map((customer) => [customer._id, customer]));
    const contactById = new Map(contacts.map((contact) => [contact._id, contact]));
    return {
      users: users.map((user) => ({ ...user, customerName: customerById.get(user.customerId)?.name ?? "Customer", contactName: user.contactId ? contactById.get(user.contactId)?.name : undefined })),
      invites: invites.map((invite) => ({ ...invite, customerName: customerById.get(invite.customerId)?.name ?? "Customer", expired: invite.expiresAt <= Date.now() })),
      eligibleCustomers: customers.map((customer) => ({
        id: customer._id,
        name: customer.name,
        contacts: contacts.filter((contact) => contact.customerId === customer._id).map((contact) => ({ id: contact._id, name: contact.name, email: contact.email })),
      })),
    };
  },
});

export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db.query("portalInvites").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!invite) return null;
    const organization = await ctx.db.get(invite.organizationId);
    return {
      email: invite.email,
      name: invite.name,
      organizationName: organization?.name ?? "your service provider",
      status: invite.status,
      expired: invite.expiresAt <= Date.now(),
    };
  },
});

export const acceptInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { identity, user } = await requireUser(ctx);
    const invite = await ctx.db.query("portalInvites").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!invite || invite.status !== "pending") {
      throw new ConvexError({ code: "INVITE_INVALID", message: "This portal invitation is no longer valid." });
    }
    if (invite.expiresAt <= Date.now()) {
      await ctx.db.patch(invite._id, { status: "expired", updatedAt: Date.now() });
      throw new ConvexError({ code: "INVITE_EXPIRED", message: "This invitation expired. Ask the service company to send a new one." });
    }
    if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
      throw new ConvexError({ code: "INVITE_EMAIL_MISMATCH", message: `Sign in with ${invite.email} to accept this invitation.` });
    }
    const candidates = await ctx.db.query("portalUsers").withIndex("by_customer", (q) => q.eq("customerId", invite.customerId)).collect();
    const portalUser = candidates.find((candidate) => normalizeEmail(candidate.email) === normalizeEmail(invite.email));
    if (!portalUser) throw new ConvexError({ code: "NOT_FOUND", message: "Portal access record not found." });
    const now = Date.now();
    await ctx.db.patch(portalUser._id, { clerkUserId: identity.subject, status: "active", activatedAt: now, lastSignedInAt: now, updatedAt: now });
    await ctx.db.patch(invite._id, { status: "accepted", acceptedAt: now, updatedAt: now });
    await ctx.db.insert("portalPreferences", {
      organizationId: invite.organizationId,
      customerId: invite.customerId,
      portalUserId: portalUser._id,
      emailNotifications: true,
      smsNotifications: false,
      serviceReminders: true,
      invoiceReminders: true,
      estimateReminders: true,
      marketingMessages: false,
      createdAt: now,
      updatedAt: now,
    });
    return { portalUserId: portalUser._id };
  },
});

export const decideEstimate = mutation({
  args: {
    portalUserId: v.optional(v.id("portalUsers")),
    estimateId: v.id("estimates"),
    decision: v.union(v.literal("accept"), v.literal("decline"), v.literal("request_changes")),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { portalUser } = await requirePortalIdentity(ctx, args.portalUserId);
    const estimate = await ctx.db.get(args.estimateId);
    if (!estimate || estimate.customerId !== portalUser.customerId || estimate.organizationId !== portalUser.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Estimate not found." });
    }
    if (estimate.status !== "sent") {
      throw new ConvexError({ code: "ESTIMATE_NOT_ACTIONABLE", message: "This estimate can no longer be changed." });
    }
    const now = Date.now();
    if (args.decision === "accept") {
      await ctx.db.patch(estimate._id, { status: "accepted", acceptedAt: now, updatedAt: now });
    } else if (args.decision === "decline") {
      await ctx.db.patch(estimate._id, { status: "declined", updatedAt: now });
    }
    const body = args.message?.trim() || (args.decision === "accept" ? "Estimate approved." : args.decision === "decline" ? "Estimate declined." : "Please contact me about changes to this estimate.");
    await ctx.db.insert("portalMessages", {
      organizationId: portalUser.organizationId,
      customerId: portalUser.customerId,
      portalUserId: portalUser._id,
      direction: "customer",
      body,
      readByCustomerAt: now,
      createdAt: now,
    });
    await ctx.db.insert("activities", {
      organizationId: portalUser.organizationId,
      entityType: "estimate",
      entityId: estimate._id,
      kind: "estimate",
      summary: `Customer ${args.decision.replace("_", " ")} ${estimate.estimateNumber}`,
      metadata: { decision: args.decision, message: body },
      occurredAt: now,
    });
    return { status: args.decision === "accept" ? "accepted" : args.decision === "decline" ? "declined" : "sent" };
  },
});

export const sendMessage = mutation({
  args: { portalUserId: v.optional(v.id("portalUsers")), body: v.string() },
  handler: async (ctx, args) => {
    const { portalUser } = await requirePortalIdentity(ctx, args.portalUserId);
    const body = args.body.trim();
    if (body.length < 2 || body.length > 4000) {
      throw new ConvexError({ code: "INVALID_MESSAGE", message: "Message must be between 2 and 4,000 characters." });
    }
    const now = Date.now();
    return await ctx.db.insert("portalMessages", {
      organizationId: portalUser.organizationId,
      customerId: portalUser.customerId,
      portalUserId: portalUser._id,
      direction: "customer",
      body,
      readByCustomerAt: now,
      createdAt: now,
    });
  },
});

export const submitServiceRequest = mutation({
  args: {
    portalUserId: v.optional(v.id("portalUsers")),
    propertyId: v.optional(v.id("properties")),
    kind: v.union(v.literal("new_service"), v.literal("reschedule"), v.literal("service_issue"), v.literal("callback"), v.literal("other")),
    subject: v.string(),
    detail: v.string(),
    preferredDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { portalUser } = await requirePortalIdentity(ctx, args.portalUserId);
    if (args.propertyId) {
      const property = await ctx.db.get(args.propertyId);
      if (!property || property.customerId !== portalUser.customerId) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Property not found." });
      }
    }
    const subject = args.subject.trim();
    const detail = args.detail.trim();
    if (!subject || detail.length < 5) {
      throw new ConvexError({ code: "INVALID_REQUEST", message: "Add a subject and a little more detail." });
    }
    const now = Date.now();
    return await ctx.db.insert("portalServiceRequests", {
      organizationId: portalUser.organizationId,
      customerId: portalUser.customerId,
      propertyId: args.propertyId,
      portalUserId: portalUser._id,
      kind: args.kind,
      subject,
      detail,
      preferredDate: args.preferredDate,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePreferences = mutation({
  args: {
    portalUserId: v.optional(v.id("portalUsers")),
    emailNotifications: v.boolean(),
    smsNotifications: v.boolean(),
    serviceReminders: v.boolean(),
    invoiceReminders: v.boolean(),
    estimateReminders: v.boolean(),
    marketingMessages: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { portalUser } = await requirePortalIdentity(ctx, args.portalUserId);
    const existing = await ctx.db.query("portalPreferences").withIndex("by_portal_user", (q) => q.eq("portalUserId", portalUser._id)).unique();
    const now = Date.now();
    const values = {
      emailNotifications: args.emailNotifications,
      smsNotifications: args.smsNotifications,
      serviceReminders: args.serviceReminders,
      invoiceReminders: args.invoiceReminders,
      estimateReminders: args.estimateReminders,
      marketingMessages: args.marketingMessages,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, values);
      return existing._id;
    }
    return await ctx.db.insert("portalPreferences", {
      organizationId: portalUser.organizationId,
      customerId: portalUser.customerId,
      portalUserId: portalUser._id,
      ...values,
      createdAt: now,
    });
  },
});

export const revokeAccess = mutation({
  args: { organizationId: v.id("organizations"), portalUserId: v.id("portalUsers") },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "manageOrganization");
    const portalUser = await ctx.db.get(args.portalUserId);
    if (!portalUser || portalUser.organizationId !== args.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Portal user not found." });
    }
    await ctx.db.patch(portalUser._id, { status: "revoked", clerkUserId: undefined, updatedAt: Date.now() });
    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "portal.access_revoked",
      entityType: "customer",
      entityId: portalUser.customerId,
      summary: `Revoked portal access for ${portalUser.email}`,
    });
  },
});

export const getInvoicePaymentContext = internalQuery({
  args: { clerkUserId: v.string(), invoiceId: v.id("customerInvoices") },
  handler: async (ctx, args) => {
    const accessRows = await ctx.db.query("portalUsers").withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId)).collect();
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError({ code: "NOT_FOUND", message: "Invoice not found." });
    const portalUser = accessRows.find((candidate) => candidate.status === "active" && candidate.customerId === invoice.customerId && candidate.organizationId === invoice.organizationId);
    if (!portalUser) throw new ConvexError({ code: "FORBIDDEN", message: "This invoice is not available to your portal account." });
    const [organization, customer] = await Promise.all([ctx.db.get(invoice.organizationId), ctx.db.get(invoice.customerId)]);
    const balanceCents = Math.max(0, invoice.totalCents - invoice.paidCents);
    if (balanceCents <= 0 || invoice.status === "paid" || invoice.status === "void") {
      throw new ConvexError({ code: "INVOICE_NOT_PAYABLE", message: "This invoice does not have a payable balance." });
    }
    return {
      organizationId: invoice.organizationId,
      organizationName: organization?.name ?? "Service provider",
      customerId: invoice.customerId,
      customerName: customer?.name ?? portalUser.name,
      email: portalUser.email,
      invoiceNumber: invoice.invoiceNumber,
      balanceCents,
    };
  },
});

export const recordInvoicePayment = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    invoiceId: v.id("customerInvoices"),
    amountCents: v.number(),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.organizationId !== args.organizationId || invoice.customerId !== args.customerId) return { applied: false };
    const existing = await ctx.db.query("customerPayments").withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId)).collect();
    if (existing.some((payment) => payment.reference === args.reference && payment.status === "posted")) return { applied: false };
    const balanceCents = Math.max(0, invoice.totalCents - invoice.paidCents);
    const amountCents = Math.max(0, Math.min(Math.round(args.amountCents), balanceCents));
    if (!amountCents) return { applied: false };
    const now = Date.now();
    const paidCents = invoice.paidCents + amountCents;
    const status = paidCents >= invoice.totalCents ? "paid" : "partially_paid";
    const paymentId = await ctx.db.insert("customerPayments", {
      organizationId: args.organizationId,
      customerId: args.customerId,
      invoiceId: args.invoiceId,
      status: "posted",
      method: "card",
      amountCents,
      receivedAt: now,
      reference: args.reference,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("paymentAllocations", {
      organizationId: args.organizationId,
      paymentId,
      invoiceId: args.invoiceId,
      amountCents,
      createdAt: now,
    });
    await ctx.db.patch(args.invoiceId, { paidCents, status, paidAt: status === "paid" ? now : undefined, updatedAt: now });
    await ctx.db.insert("portalMessages", {
      organizationId: args.organizationId,
      customerId: args.customerId,
      direction: "system",
      body: `Payment of $${(amountCents / 100).toFixed(2)} received for ${invoice.invoiceNumber}. Thank you.`,
      readByTeamAt: now,
      createdAt: now,
    });
    return { applied: true, paymentId };
  },
});
