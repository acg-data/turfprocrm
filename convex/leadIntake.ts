import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
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

type SpamRule = Doc<"spamRules">;

const serviceLabels: Record<string, string> = {
  lawn_care: "Lawn care",
  landscaping: "Landscaping",
  pest_control: "Pest control",
  tree_shrub: "Tree and shrub",
  irrigation: "Irrigation",
  snow: "Snow",
  maintenance: "Maintenance",
};

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function spamSignals(
  input: { customerName: string; email?: string; phone?: string; message?: string; campaign?: string; sourceDetail?: string },
  rules: SpamRule[],
) {
  const email = normalize(input.email);
  const message = normalize(input.message);
  const campaign = normalize(input.campaign);
  const sourceDetail = normalize(input.sourceDetail);
  const reasons: string[] = [];
  let score = 0;

  if (!input.customerName.trim() && !input.phone?.trim() && !input.email?.trim()) {
    reasons.push("missing_name_and_contact");
    score += 40;
  }
  if (!input.phone?.trim() && !input.email?.trim()) {
    reasons.push("missing_contact");
    score += 25;
  }
  if (/^(sales|info|marketing|noreply|no-reply|partner|recruit|newsletter)@/.test(email)) {
    reasons.push("bulk_sender_email_prefix");
    score += 30;
  }
  if (/(lead generation|business opportunity|schedule a 15|unsubscribe|we generate leads)/.test(message)) {
    reasons.push("solicitation_phrase");
    score += 45;
  }

  for (const rule of rules.filter((item) => item.active)) {
    const pattern = normalize(rule.pattern);
    if (!pattern) continue;
    const matched =
      (rule.kind === "email_prefix" && email.startsWith(pattern)) ||
      (rule.kind === "domain" && email.endsWith(`@${pattern.replace(/^@/, "")}`)) ||
      (rule.kind === "message_phrase" && message.includes(pattern)) ||
      (rule.kind === "missing_contact" && !input.phone?.trim() && !input.email?.trim()) ||
      (rule.kind === "custom" && [message, campaign, sourceDetail].some((value) => value.includes(pattern)));
    if (matched) {
      reasons.push(rule.name);
      score += rule.score;
    }
  }

  return { score: Math.min(100, score), reasons: Array.from(new Set(reasons)) };
}

export const submitWebLead = mutation({
  args: {
    organizationSlug: v.string(),
    customerName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    street: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    postalCode: v.optional(v.string()),
    serviceLine: serviceCategory,
    campaign: v.optional(v.string()),
    sourceDetail: v.optional(v.string()),
    message: v.optional(v.string()),
    estimatedValueCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.query("organizations").withIndex("by_slug", (q) => q.eq("slug", args.organizationSlug)).unique();
    if (!organization) throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found." });

    const now = Date.now();
    const source = "Website form";
    const spamRules = await ctx.db.query("spamRules").withIndex("by_org_active", (q) => q.eq("organizationId", organization._id).eq("active", true)).collect();
    const spam = spamSignals(args, spamRules);
    const campaign = args.campaign?.trim() || undefined;
    const sourceDetail = args.sourceDetail?.trim() || campaign;
    const customerName = args.customerName.trim() || "Web form lead";
    const serviceLabel = serviceLabels[args.serviceLine] ?? args.serviceLine;

    const submissionId = await ctx.db.insert("leadIntakeSubmissions", {
      organizationId: organization._id,
      source,
      payload: {
        ...args,
        campaign,
        sourceDetail,
      },
      spamScore: spam.score,
      createdAt: now,
    });

    const customerId = await ctx.db.insert("customers", {
      organizationId: organization._id,
      name: customerName,
      type: "residential",
      status: "prospect",
      source,
      tags: [args.serviceLine, source, ...(campaign ? [campaign] : [])],
      createdAt: now,
      updatedAt: now,
    });

    const contactId = await ctx.db.insert("contacts", {
      organizationId: organization._id,
      customerId,
      name: customerName,
      email: args.email,
      phone: args.phone,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    });

    const propertyId = await ctx.db.insert("properties", {
      organizationId: organization._id,
      customerId,
      label: "Web form property",
      street: args.street?.trim() || "Address pending",
      city: args.city.trim(),
      state: args.state.trim().toUpperCase().slice(0, 2) || "MA",
      postalCode: args.postalCode?.trim() || "",
      createdAt: now,
      updatedAt: now,
    });

    const leadId = await ctx.db.insert("leads", {
      organizationId: organization._id,
      customerId,
      contactId,
      propertyId,
      title: `${serviceLabel} request from ${customerName}`,
      source,
      sourceDetail,
      leadType: "form",
      accountType: "residential",
      email: args.email,
      mobilePhone: args.phone,
      normalizedPhone: args.phone?.replace(/\D/g, ""),
      message: args.message,
      programRequests: [args.serviceLine],
      grade: "ungraded",
      status: spam.score >= 70 ? "spam" : "new",
      urgency: spam.score >= 70 ? "low" : "normal",
      spamScore: spam.score,
      spamReasons: spam.reasons,
      qualityScore: Math.max(20, 100 - spam.reasons.length * 12 - (!args.street?.trim() ? 10 : 0)),
      receivedAt: now,
      externalSourceId: `web:${submissionId}`,
      rawPayload: { ...args, campaign, sourceDetail, submissionId },
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(submissionId, { leadId, processedAt: now });

    if (spam.score > 0) {
      await ctx.db.insert("dataQualityIssues", {
        organizationId: organization._id,
        kind: "potential_spam",
        severity: spam.score >= 70 ? "critical" : "warning",
        status: "open",
        leadId,
        customerId,
        fieldName: "message",
        currentValue: args.message,
        summary: `Web form spam score ${spam.score}: ${spam.reasons.join(", ")}`,
        createdAt: now,
        updatedAt: now,
      });
    }

    await audit(ctx, {
      organizationId: organization._id,
      action: "lead_intake.web_submit",
      entityType: "lead",
      entityId: leadId,
      summary: `Captured web form lead for ${customerName}`,
      after: { leadId, submissionId, source, campaign, sourceDetail, spamScore: spam.score, spamReasons: spam.reasons },
    });

    return {
      submissionId,
      leadId,
      customerId,
      spamScore: spam.score,
      spamReasons: spam.reasons,
      status: spam.score >= 70 ? "spam" : "new",
    };
  },
});
