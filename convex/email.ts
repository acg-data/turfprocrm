import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * Sends an email through Resend. Without RESEND_API_KEY the send is skipped
 * (logged) so dev/test environments never require credentials.
 */
export const send = internalAction({
  args: { to: v.string(), subject: v.string(), html: v.string() },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? "Turf Pro CRM <onboarding@resend.dev>";
    if (!apiKey) {
      console.log(`[email skipped — RESEND_API_KEY unset] to=${args.to} subject="${args.subject}"`);
      return { sent: false };
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [args.to], subject: args.subject, html: args.html }),
    });
    if (!response.ok) {
      console.error(`[email] Resend error ${response.status}: ${await response.text()}`);
    }
    return { sent: response.ok };
  },
});
