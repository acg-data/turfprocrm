const BRAND = "#224036";

function shell(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f1;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="font-weight:bold;color:${BRAND};font-size:18px;margin-bottom:16px">Turf Pro CRM</div>
    <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:8px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${bodyHtml}
    </div>
    <div style="color:#78716c;font-size:12px;margin-top:16px">You received this because of activity in a Turf Pro CRM workspace.</div>
  </div>
</body></html>`;
}

function button(url: string, label: string) {
  return `<a href="${url}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px;margin-top:8px">${label}</a>`;
}

export function inviteEmail(input: { organizationName: string; inviterName: string; role: string; acceptUrl: string }) {
  return {
    subject: `${input.inviterName} invited you to ${input.organizationName} on Turf Pro CRM`,
    html: shell(
      `Join ${input.organizationName}`,
      `<p style="line-height:1.6">${input.inviterName} invited you to join <strong>${input.organizationName}</strong> as <strong>${input.role.replace("_", " ")}</strong>.</p>
       ${button(input.acceptUrl, "Accept invitation")}
       <p style="line-height:1.6;color:#78716c;font-size:13px;margin-top:16px">This invitation expires in 7 days. If you weren't expecting it, you can ignore this email.</p>`,
    ),
  };
}

export function welcomeEmail(input: { organizationName: string; appUrl: string }) {
  return {
    subject: `Your ${input.organizationName} workspace is ready`,
    html: shell(
      "Welcome to Turf Pro CRM",
      `<p style="line-height:1.6"><strong>${input.organizationName}</strong> is provisioned: leads, dispatch, field work, job costing, and profit dashboards are ready to go.</p>
       ${button(input.appUrl, "Open your workspace")}`,
    ),
  };
}

export function paymentFailedEmail(input: { organizationName: string }) {
  return {
    subject: `Action needed: payment failed for ${input.organizationName}`,
    html: shell(
      "Payment failed",
      `<p style="line-height:1.6">The latest payment for <strong>${input.organizationName}</strong> didn't go through. Your workspace stays fully available while we retry, but please update your payment method to avoid interruption.</p>
       <p style="line-height:1.6">Open the app → Admin → Billing → Manage payment.</p>`,
    ),
  };
}

export function trialEndingEmail(input: { organizationName: string; daysLeft: number }) {
  return {
    subject: `${input.daysLeft === 1 ? "1 day" : `${input.daysLeft} days`} left in your Turf Pro CRM trial`,
    html: shell(
      "Your trial is ending soon",
      `<p style="line-height:1.6">The trial for <strong>${input.organizationName}</strong> ends in ${input.daysLeft === 1 ? "1 day" : `${input.daysLeft} days`}. Pick a plan to keep your leads, schedules, and job costing running without interruption.</p>
       <p style="line-height:1.6">Open the app → Admin → Billing → Choose plan.</p>`,
    ),
  };
}

export function portalInviteEmail(input: { organizationName: string; customerName: string; acceptUrl: string }) {
  return {
    subject: `${input.organizationName} invited you to your customer portal`,
    html: shell(
      `Your ${input.organizationName} portal is ready`,
      `<p style="line-height:1.6">Hi ${input.customerName},</p>
       <p style="line-height:1.6">Use your secure customer portal to review estimates, see upcoming visits, read service reports, download documents, message the team, and pay invoices.</p>
       ${button(input.acceptUrl, "Activate customer portal")}
       <p style="line-height:1.6;color:#78716c;font-size:13px;margin-top:16px">This invitation expires in 7 days and can only be accepted by the email address it was sent to.</p>`,
    ),
  };
}
