import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Public, unauthenticated: the marketing site's demo-request form. No tenant
 * context exists yet — this just captures the lead and pings sales.
 */
export const submitDemoRequest = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    company: v.string(),
    phone: v.optional(v.string()),
    crewSize: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const email = args.email.trim();
    const company = args.company.trim();
    if (!name || !company) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Name and company are required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError({ code: "INVALID_EMAIL", message: "Enter a valid email address." });
    }

    const now = Date.now();
    const leadId = await ctx.db.insert("marketingLeads", {
      name,
      email,
      company,
      phone: args.phone?.trim() || undefined,
      crewSize: args.crewSize,
      message: args.message?.trim() || undefined,
      source: args.source?.trim() || "marketing-site",
      status: "new",
      createdAt: now,
    });

    const notifyEmail = process.env.SALES_NOTIFY_EMAIL;
    if (notifyEmail) {
      await ctx.scheduler.runAfter(0, internal.email.send, {
        to: notifyEmail,
        subject: `New demo request: ${company}`,
        html: `<p><strong>${name}</strong> at <strong>${company}</strong> requested a demo.</p>
<p>Email: ${email}${args.phone ? `<br>Phone: ${args.phone}` : ""}${args.crewSize ? `<br>Crew size: ${args.crewSize}` : ""}</p>
${args.message ? `<p>${args.message}</p>` : ""}`,
      });
    }

    return { leadId };
  },
});
