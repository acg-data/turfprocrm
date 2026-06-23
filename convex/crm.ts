import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { assertOrg, requireMembership } from "./lib/auth";
import { audit } from "./lib/audit";

const serviceCategory = v.union(
  v.literal("lawn_care"),
  v.literal("landscaping"),
  v.literal("pest_control"),
  v.literal("tree_shrub"),
  v.literal("irrigation"),
  v.literal("snow"),
  v.literal("maintenance"),
);
const leadType = v.union(v.literal("phone_call"), v.literal("form"), v.literal("direct_email"), v.literal("referral"), v.literal("other"));
const accountType = v.union(v.literal("residential"), v.literal("commercial"));
const urgency = v.union(v.literal("low"), v.literal("normal"), v.literal("high"));
const callOutcome = v.union(v.literal("estimate_requested"), v.literal("needs_callback"), v.literal("price_shopping"), v.literal("not_a_fit"), v.literal("emergency"));

const callOutcomeLabels: Record<string, string> = {
  estimate_requested: "Estimate requested",
  needs_callback: "Needs callback",
  price_shopping: "Price shopping",
  not_a_fit: "Not a fit",
  emergency: "Emergency service",
};

function leadQualityIssues(input: { email?: string; phone?: string; street?: string; city?: string; postalCode?: string }) {
  const issues: Array<{ kind: "bad_phone" | "invalid_email" | "missing_address"; severity: "warning"; summary: string; fieldName?: string; currentValue?: string }> = [];
  const digits = input.phone?.replace(/\D/g, "") ?? "";
  if (input.phone && digits.length < 10) issues.push({ kind: "bad_phone", severity: "warning", fieldName: "phone", currentValue: input.phone, summary: "Phone number looks too short for reliable follow-up." });
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) issues.push({ kind: "invalid_email", severity: "warning", fieldName: "email", currentValue: input.email, summary: "Email address does not look valid." });
  if (!input.street?.trim() || !input.city?.trim() || !input.postalCode?.trim()) issues.push({ kind: "missing_address", severity: "warning", fieldName: "property", summary: "Full property address is incomplete." });
  return issues;
}

function contactLimitForPlan(plan?: string) {
  if (plan === "free") return 10;
  if (plan === "starter") return 250;
  return null;
}

function callOutcomeLabel(value?: string) {
  return value ? (callOutcomeLabels[value] ?? value) : "Call logged";
}

function followUpDays(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(30, Math.round(value)));
}

async function assertCanCreateContact(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const organization = await ctx.db.get(organizationId);
  if (!organization) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found." });
  const subscription = await ctx.db.query("subscriptions").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).first();
  const plan = subscription?.plan ?? organization.billingPlan ?? "free";
  const contactLimit = contactLimitForPlan(plan);
  if (contactLimit === null) return;
  const contacts = await ctx.db.query("contacts").withIndex("by_org", (q) => q.eq("organizationId", organizationId)).collect();
  if (contacts.length >= contactLimit) {
    throw new ConvexError({
      code: "PLAN_LIMIT_REACHED",
      message: `The ${plan} plan allows ${contactLimit} contacts. Upgrade to add more contacts.`,
      plan,
      contactLimit,
      currentContacts: contacts.length,
    });
  }
}

export const listCustomers = query({
  args: {
    organizationId: v.id("organizations"),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_org_updated", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(100);

    const search = args.search?.trim().toLowerCase();
    const visibleCustomers = search ? customers.filter((customer) => customer.name.toLowerCase().includes(search)) : customers;

    return await Promise.all(
      visibleCustomers.map(async (customer) => {
        const [primaryContact, properties] = await Promise.all([
          ctx.db
            .query("contacts")
            .withIndex("by_org_customer", (q) => q.eq("organizationId", args.organizationId).eq("customerId", customer._id))
            .filter((q) => q.eq(q.field("isPrimary"), true))
            .first(),
          ctx.db
            .query("properties")
            .withIndex("by_org_customer", (q) => q.eq("organizationId", args.organizationId).eq("customerId", customer._id))
            .collect(),
        ]);
        return { customer, primaryContact, propertyCount: properties.length };
      }),
    );
  },
});

export const getCustomerProfile = query({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId);
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found." });
    assertOrg(customer, args.organizationId);

    const [contacts, properties, opportunities, estimates, jobs, invoices, payments, activities, notes, files] = await Promise.all([
      ctx.db.query("contacts").withIndex("by_org_customer", (q) => q.eq("organizationId", args.organizationId).eq("customerId", args.customerId)).collect(),
      ctx.db.query("properties").withIndex("by_org_customer", (q) => q.eq("organizationId", args.organizationId).eq("customerId", args.customerId)).collect(),
      ctx.db.query("opportunities").withIndex("by_customer", (q) => q.eq("customerId", args.customerId)).collect(),
      ctx.db.query("estimates").withIndex("by_customer", (q) => q.eq("customerId", args.customerId)).collect(),
      ctx.db.query("jobs").withIndex("by_customer", (q) => q.eq("customerId", args.customerId)).collect(),
      ctx.db.query("customerInvoices").withIndex("by_customer", (q) => q.eq("customerId", args.customerId)).collect(),
      ctx.db.query("customerPayments").withIndex("by_customer", (q) => q.eq("customerId", args.customerId)).collect(),
      ctx.db.query("activities").withIndex("by_entity", (q) => q.eq("entityType", "customer").eq("entityId", args.customerId)).order("desc").take(20),
      ctx.db.query("notes").withIndex("by_entity", (q) => q.eq("entityType", "customer").eq("entityId", args.customerId)).order("desc").take(20),
      ctx.db.query("files").withIndex("by_entity", (q) => q.eq("entityType", "customer").eq("entityId", args.customerId)).order("desc").take(20),
    ]);

    return {
      customer,
      contacts: contacts.filter((contact) => contact.organizationId === args.organizationId),
      properties: properties.filter((property) => property.organizationId === args.organizationId),
      opportunities: opportunities.filter((opportunity) => opportunity.organizationId === args.organizationId),
      estimates: estimates.filter((estimate) => estimate.organizationId === args.organizationId),
      jobs: jobs.filter((job) => job.organizationId === args.organizationId),
      invoices: invoices.filter((invoice) => invoice.organizationId === args.organizationId),
      payments: payments.filter((payment) => payment.organizationId === args.organizationId),
      activities: activities.filter((activity) => activity.organizationId === args.organizationId),
      notes: notes.filter((note) => note.organizationId === args.organizationId),
      files: files.filter((file) => file.organizationId === args.organizationId),
    };
  },
});

export const createLead = mutation({
  args: {
    organizationId: v.id("organizations"),
    customerName: v.string(),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    property: v.object({
      label: v.optional(v.string()),
      street: v.string(),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      notes: v.optional(v.string()),
    }),
    title: v.string(),
    source: v.string(),
    leadType: v.optional(leadType),
    accountType: v.optional(accountType),
    companyAssignment: v.optional(v.string()),
    lawnSizeSqFt: v.optional(v.number()),
    urgency: v.optional(urgency),
    message: v.optional(v.string()),
    estimateNotes: v.optional(v.string()),
    callOutcome: v.optional(callOutcome),
    createCallFollowUp: v.optional(v.boolean()),
    followUpDueInDays: v.optional(v.number()),
    valueCents: v.number(),
    serviceLines: v.array(serviceCategory),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "managePipeline");
    await assertCanCreateContact(ctx, args.organizationId);
    const now = Date.now();
    const qualityIssues = leadQualityIssues({ email: args.email, phone: args.phone, street: args.property.street, city: args.property.city, postalCode: args.property.postalCode });
    const qualityScore = Math.max(20, 100 - qualityIssues.length * 14 - (args.lawnSizeSqFt ? 0 : 6));

    const customerId = await ctx.db.insert("customers", {
      organizationId: args.organizationId,
      name: args.customerName,
      type: args.accountType ?? "residential",
      status: "prospect",
      source: args.source,
      ownerUserId: user._id,
      tags: args.serviceLines,
      createdAt: now,
      updatedAt: now,
    });

    const contactId = await ctx.db.insert("contacts", {
      organizationId: args.organizationId,
      customerId,
      name: args.contactName ?? args.customerName,
      email: args.email,
      phone: args.phone,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    });

    const propertyId = await ctx.db.insert("properties", {
      organizationId: args.organizationId,
      customerId,
      label: args.property.label ?? "Primary property",
      street: args.property.street,
      city: args.property.city,
      state: args.property.state,
      postalCode: args.property.postalCode,
      notes: args.property.notes,
      lawnSizeSqFt: args.lawnSizeSqFt,
      createdAt: now,
      updatedAt: now,
    });

    const leadId = await ctx.db.insert("leads", {
      organizationId: args.organizationId,
      customerId,
      contactId,
      propertyId,
      title: args.title,
      source: args.source,
      leadType: args.leadType,
      companyAssignment: args.companyAssignment,
      accountType: args.accountType ?? "residential",
      email: args.email,
      mobilePhone: args.phone,
      normalizedPhone: args.phone?.replace(/\D/g, ""),
      message: args.message,
      estimateNotes: args.estimateNotes,
      programRequests: args.serviceLines,
      lawnSizeSqFt: args.lawnSizeSqFt,
      grade: "ungraded",
      status: args.leadType === "phone_call" ? "contacted" : "new",
      urgency: args.urgency ?? "normal",
      ownerUserId: user._id,
      spamScore: 0,
      spamReasons: [],
      qualityScore,
      receivedAt: now,
      rawPayload: args,
      createdAt: now,
      updatedAt: now,
    });

    const opportunityId = await ctx.db.insert("opportunities", {
      organizationId: args.organizationId,
      leadId,
      customerId,
      propertyId,
      title: args.title,
      stage: "qualified",
      valueCents: args.valueCents,
      closeProbability: 35,
      expectedCloseDate: now + 14 * 24 * 60 * 60 * 1000,
      ownerUserId: user._id,
      serviceLines: args.serviceLines,
      createdAt: now,
      updatedAt: now,
    });

    const shouldLogCall = args.leadType === "phone_call" || Boolean(args.callOutcome);
    if (shouldLogCall) {
      await ctx.db.insert("activities", {
        organizationId: args.organizationId,
        entityType: "customer",
        entityId: customerId,
        kind: "call",
        summary: `Phone intake: ${callOutcomeLabel(args.callOutcome)}${args.message ? ` - ${args.message}` : ""}`,
        metadata: {
          leadId,
          opportunityId,
          phone: args.phone,
          source: args.source,
          urgency: args.urgency ?? "normal",
          callOutcome: args.callOutcome,
        },
        actorUserId: user._id,
        occurredAt: now,
      });
    }

    if (args.createCallFollowUp) {
      const days = followUpDays(args.followUpDueInDays);
      await ctx.db.insert("tasks", {
        organizationId: args.organizationId,
        entityType: "customer",
        entityId: customerId,
        title: `Call follow-up: ${args.title}`,
        description: args.message,
        status: "open",
        priority: (args.urgency ?? "normal") === "high" ? "high" : "normal",
        dueAt: now + days * 24 * 60 * 60 * 1000,
        assignedUserId: user._id,
        createdByUserId: user._id,
        createdAt: now,
        updatedAt: now,
      });
    }

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "lead.create",
      entityType: "lead",
      entityId: leadId,
      summary: `Created lead ${args.title}`,
      after: { leadId, opportunityId, customerId },
    });

    for (const issue of qualityIssues) {
      await ctx.db.insert("dataQualityIssues", {
        organizationId: args.organizationId,
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

    return { customerId, contactId, propertyId, leadId, opportunityId };
  },
});

export const createLeadForCustomer = mutation({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    propertyId: v.optional(v.id("properties")),
    title: v.string(),
    source: v.string(),
    message: v.optional(v.string()),
    estimateNotes: v.optional(v.string()),
    valueCents: v.number(),
    serviceLines: v.array(serviceCategory),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "managePipeline");
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found." });
    assertOrg(customer, args.organizationId);

    const property = args.propertyId
      ? await ctx.db.get(args.propertyId)
      : await ctx.db.query("properties").withIndex("by_org_customer", (q) => q.eq("organizationId", args.organizationId).eq("customerId", args.customerId)).first();
    if (!property || property.customerId !== args.customerId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Property not found for this customer." });
    }
    assertOrg(property, args.organizationId);

    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_org_customer", (q) => q.eq("organizationId", args.organizationId).eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();
    const now = Date.now();
    const accountType = customer.type === "commercial" ? "commercial" : "residential";

    const leadId = await ctx.db.insert("leads", {
      organizationId: args.organizationId,
      customerId: args.customerId,
      contactId: contact?._id,
      propertyId: property._id,
      title: args.title,
      source: args.source,
      leadType: "other",
      accountType,
      email: contact?.email,
      mobilePhone: contact?.phone ?? contact?.mobilePhone,
      normalizedPhone: (contact?.phone ?? contact?.mobilePhone)?.replace(/\D/g, ""),
      message: args.message,
      estimateNotes: args.estimateNotes,
      programRequests: args.serviceLines,
      grade: "ungraded",
      status: "new",
      urgency: "normal",
      ownerUserId: user._id,
      spamScore: 0,
      spamReasons: [],
      qualityScore: 86,
      receivedAt: now,
      rawPayload: args,
      createdAt: now,
      updatedAt: now,
    });

    const opportunityId = await ctx.db.insert("opportunities", {
      organizationId: args.organizationId,
      leadId,
      customerId: args.customerId,
      propertyId: property._id,
      title: args.title,
      stage: "qualified",
      valueCents: args.valueCents,
      closeProbability: 45,
      expectedCloseDate: now + 10 * 24 * 60 * 60 * 1000,
      ownerUserId: user._id,
      serviceLines: args.serviceLines,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("activities", {
      organizationId: args.organizationId,
      entityType: "customer",
      entityId: args.customerId,
      kind: "system",
      summary: `Repeat service request created: ${args.title}`,
      metadata: { leadId, opportunityId, source: args.source, serviceLines: args.serviceLines },
      actorUserId: user._id,
      occurredAt: now,
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "lead.create_repeat_customer",
      entityType: "lead",
      entityId: leadId,
      summary: `Created repeat-customer lead ${args.title}`,
      after: { leadId, opportunityId, customerId: args.customerId, propertyId: property._id },
    });

    return { leadId, opportunityId };
  },
});

export const updateCustomer = mutation({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.id("customers"),
    name: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("prospect"), v.literal("inactive"))),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "managePipeline");
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new ConvexError({ code: "NOT_FOUND", message: "Customer not found." });
    assertOrg(customer, args.organizationId);

    await ctx.db.patch(args.customerId, {
      name: args.name ?? customer.name,
      status: args.status ?? customer.status,
      tags: args.tags ?? customer.tags,
      updatedAt: Date.now(),
    });

    await audit(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      action: "customer.update",
      entityType: "customer",
      entityId: args.customerId,
      summary: `Updated customer ${args.name ?? customer.name}`,
      before: customer,
      after: { name: args.name, status: args.status, tags: args.tags },
    });

    return args.customerId;
  },
});
