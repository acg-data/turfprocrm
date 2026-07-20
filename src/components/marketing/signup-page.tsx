"use client";

import { Show, SignIn, SignUp, UserButton, useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Check, CreditCard, LockKeyhole, ShieldCheck, Sprout, UsersRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, type ReactNode, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { demoPersonaOptions, type DemoPersona } from "@/data/demo-personas";

type SignupPlan = "free" | "pro";
type IndustryFocus = "landscaping" | "pest_control" | "both";
type AuthMode = "signin" | "create";
type SampleMode = "blank" | "sample";

const plans: Array<{
  id: SignupPlan;
  name: string;
  price: string;
  description: string;
  highlights: string[];
}> = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "For testing the CRM with a small book of business.",
    highlights: ["10 contacts included", "Lead tracking and CRM basics", "Dispatch, field, and costing demo workspace"],
  },
  {
    id: "pro",
    name: "All-In Pro",
    price: "$99/mo",
    description: "For operators who want Arborgold-style depth without enterprise-tier pricing.",
    highlights: ["Unlimited contacts and land measurements", "CRM, estimating, scheduling, routes, jobs, invoicing, payments, and reporting", "Job costing, material inventory, chemical tracking, renewals, permissions, and profit dashboards"],
  },
];

const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border border-stone-200 rounded-lg",
    card: "shadow-none",
    headerTitle: "text-stone-950",
    formButtonPrimary: "bg-[#224036] hover:bg-[#1a332b]",
    footerActionLink: "text-[#224036]",
  },
};

const demoPersonaIcons: Record<DemoPersona, ReactNode> = {
  new: <Sprout size={18} />,
  starter: <UsersRound size={18} />,
  established: <ShieldCheck size={18} />,
};

export function AuthEntryPage() {
  const authConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [companyName, setCompanyName] = useState("");
  const [industryFocus, setIndustryFocus] = useState<IndustryFocus>("both");
  const [selectedPlan, setSelectedPlan] = useState<SignupPlan>("free");
  const [sampleMode, setSampleMode] = useState<SampleMode>("blank");
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [billingActionId, setBillingActionId] = useState<string | null>(null);
  const workspaces = useQuery(api.setup.listMyOrganizations);
  const createOrganization = useMutation(api.setup.createOrganization);
  const { getToken } = useAuth();
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York", []);

  async function openBillingRoute(endpoint: "/api/billing/checkout" | "/api/billing/portal" | "/api/billing/paddle/checkout" | "/api/billing/paddle/portal", organizationId: string) {
    setBillingActionId(`${endpoint}:${organizationId}`);
    setError(null);
    try {
      const token = await getToken({ template: "convex" });
      if (!token) throw new Error("Sign in is required before billing can start.");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ organizationId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Billing session could not be started.");
      }
      window.location.href = payload.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Billing session could not be started.");
    } finally {
      setBillingActionId(null);
    }
  }

  async function submitWorkspace(event: FormEvent) {
    event.preventDefault();
    if (!companyName.trim()) return;
    setError(null);
    setIsCreating(true);
    try {
      const organizationId = await createOrganization({
        name: companyName.trim(),
        timezone,
        industryFocus,
        billingPlan: selectedPlan,
        seedSampleData: sampleMode === "sample",
      });
      setCreatedWorkspaceId(organizationId);
      setCompanyName("");
      if (selectedPlan === "pro") {
        await openBillingRoute("/api/billing/paddle/checkout", organizationId);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create workspace.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f1] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-3 font-bold text-[#224036]">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-[#e8efe8] text-[#2f6b4f]">
              <Sprout size={22} />
            </span>
            Turf Pro CRM
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/signin" className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
              Sign in
            </Link>
            {authConfigured ? (
              <Show when="signed-in">
                <UserButton />
              </Show>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-12">
        <div className="grid content-start gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
              <ShieldCheck size={15} />
              Single sign-in + Convex onboarding
            </div>
            <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-normal md:text-5xl">Sign in, then launch the workspace</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
              One route handles sign in, account creation, plan selection, and workspace provisioning. Clerk handles identity and SSO; Convex creates the tenant, subscription, defaults, and audit trail after auth.
            </p>
          </div>

          <div className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4">
            {[
              ["One entry point", "Every marketing, login, and trial click lands here first"],
              ["Free account", "10 contacts included before upgrading"],
              ["$99/mo paid plan", "All Arborgold-style operating modules included in one plan"],
              ["Guided onboarding", "After sign-in, create the company workspace and continue into the OS"],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-100 text-emerald-800">
                  <Check size={14} />
                </span>
                <div>
                  <div className="font-semibold">{title}</div>
                  <div className="text-sm leading-6 text-stone-500">{body}</div>
                </div>
              </div>
            ))}
          </div>

          {!authConfigured || !convexConfigured ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {!authConfigured ? "Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to enable live sign-in. " : null}
              {!convexConfigured ? "Add NEXT_PUBLIC_CONVEX_URL to enable workspace provisioning. " : null}
              The demo app remains available while credentials are being configured.
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`rounded-lg border bg-white p-5 text-left shadow-sm transition ${selectedPlan === plan.id ? "border-[#315a4d] ring-2 ring-[#315a4d]/15" : "border-stone-200 hover:border-stone-300"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold">{plan.name}</div>
                    <div className="mt-1 text-sm leading-6 text-stone-500">{plan.description}</div>
                  </div>
                  <div className="rounded-md bg-stone-100 px-2 py-1 text-sm font-bold">{plan.price}</div>
                </div>
                <div className="mt-4 grid gap-2">
                  {plan.highlights.map((highlight) => (
                    <div key={highlight} className="flex items-center gap-2 text-sm text-stone-700">
                      <Check size={14} className="text-emerald-700" />
                      {highlight}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <section className="rounded-lg border border-emerald-200 bg-[#eef4ee] p-5" aria-labelledby="guided-demo-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">No password required</div>
                <h2 id="guided-demo-heading" className="mt-1 text-xl font-bold text-stone-950">Try a guided demo</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Choose the operating profile that matches your business. These demos use isolated synthetic data and never touch a real client workspace.</p>
              </div>
              <span className="rounded-md bg-white p-2 text-[#224036]"><Sprout size={20} /></span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {demoPersonaOptions.map((option) => (
                <Link
                  key={option.id}
                  href={`/app?demo=${option.id}`}
                  aria-label={`Try ${option.shortLabel} demo`}
                  className="group flex min-h-40 flex-col justify-between rounded-md border border-emerald-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#315a4d] hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-md bg-[#e8efe8] text-[#224036]">{demoPersonaIcons[option.id]}</span>
                      <span className="text-xs font-bold uppercase text-stone-500">{option.plan === "free" ? "Free" : "Pro-scale"}</span>
                    </div>
                    <div className="mt-3 font-bold text-stone-950">{option.label}</div>
                    <div className="mt-1 text-sm leading-5 text-stone-600">{option.description}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 text-sm font-semibold text-[#224036]">
                    <span>{option.contactCount === 0 ? "0 contacts" : `${option.contactCount} contacts`}</span>
                    <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            {authConfigured ? (
              <Show when="signed-out">
                <div className="grid gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-bold">
                      <LockKeyhole size={20} className="text-[#224036]" />
                      Step 1: sign in or create account
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-stone-500">Use the same route for returning clients, new free trials, Google/Microsoft login, and future SSO.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-stone-100 p-1">
                    <button type="button" onClick={() => setAuthMode("signin")} className={`min-h-10 rounded-md text-sm font-semibold transition ${authMode === "signin" ? "bg-white text-stone-950 shadow-sm" : "text-stone-600"}`}>
                      Sign in
                    </button>
                    <button type="button" onClick={() => setAuthMode("create")} className={`min-h-10 rounded-md text-sm font-semibold transition ${authMode === "create" ? "bg-white text-stone-950 shadow-sm" : "text-stone-600"}`}>
                      Create account
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-lg">
                    {authMode === "signin" ? (
                      <SignIn routing="hash" signUpUrl="/signin" fallbackRedirectUrl="/signin" forceRedirectUrl="/signin" appearance={clerkAppearance} withSignUp />
                    ) : (
                      <SignUp routing="hash" signInUrl="/signin" fallbackRedirectUrl="/signin" forceRedirectUrl="/signin" appearance={clerkAppearance} />
                    )}
                  </div>
                </div>
              </Show>
            ) : (
              <div className="grid gap-4">
                <div>
                  <h2 className="text-xl font-bold">Step 1: sign in</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-500">Add Clerk keys to enable the live sign-in page. Until then, use the demo app for product review.</p>
                </div>
                <Link href="/app" className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-md bg-[#224036] px-4 text-sm font-semibold text-white">
                  Open demo app
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}

            {authConfigured ? (
              <Show when="signed-in">
              <form onSubmit={submitWorkspace} className="grid gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">Step 2: create the workspace</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-500">This writes the organization, owner membership, subscription, operating defaults, tag taxonomy, onboarding checklist, and audit event to Convex.</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-[#e8efe8] text-[#224036]">
                    <UsersRound size={18} />
                  </div>
                </div>
                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-normal text-stone-500">
                  Company name
                  <input className="h-10 rounded-md border border-stone-200 px-3 text-sm normal-case text-stone-900 outline-none focus:border-[#315a4d] focus:ring-2 focus:ring-[#315a4d]/15" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Acme Turf and Pest" required />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-normal text-stone-500">
                  Industry focus
                  <select className="h-10 rounded-md border border-stone-200 px-3 text-sm normal-case text-stone-900 outline-none focus:border-[#315a4d] focus:ring-2 focus:ring-[#315a4d]/15" value={industryFocus} onChange={(event) => setIndustryFocus(event.target.value as IndustryFocus)}>
                    <option value="both">Landscape + pest</option>
                    <option value="landscaping">Landscaping</option>
                    <option value="pest_control">Pest control</option>
                  </select>
                </label>
                <div className="grid gap-2">
                  <div className="text-xs font-semibold uppercase tracking-normal text-stone-500">Workspace data</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      ["blank", "Start blank", "Use live tenant defaults without sample customers."],
                      ["sample", "Load sample data", "Add tenant-scoped demo records that can be deleted later."],
                    ].map(([mode, title, body]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSampleMode(mode as SampleMode)}
                        className={`rounded-md border p-3 text-left text-sm transition ${sampleMode === mode ? "border-[#315a4d] bg-[#eef4ee] text-stone-950" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}
                      >
                        <span className="font-bold">{title}</span>
                        <span className="mt-1 block leading-5">{body}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
                {createdWorkspaceId ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Workspace created. {selectedPlan === "pro" ? "Paddle Checkout opens next." : "Open the app to continue onboarding."}</div> : null}
                <button type="submit" disabled={isCreating || Boolean(billingActionId) || !convexConfigured} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#224036] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                  <CreditCard size={16} />
                  {isCreating || billingActionId ? "Starting workspace..." : selectedPlan === "free" ? "Create free workspace" : "Create $99/mo workspace"}
                </button>
              </form>
              </Show>
            ) : null}
          </div>

          {authConfigured ? (
            <Show when="signed-in">
            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold">Step 3: continue onboarding</h2>
                <Link href="/app" className="text-sm font-semibold text-[#224036]">Open app</Link>
              </div>
              <div className="mt-4 grid gap-2">
                {workspaces && workspaces.length > 0 ? (
                  workspaces.map((row) => (
                    <div key={row.organization._id} className="rounded-md border border-stone-200 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{row.organization.name}</div>
                          <div className="mt-1 text-sm text-stone-500">/{row.organization.slug}</div>
                        </div>
                        <div className="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-semibold uppercase">{row.subscription?.plan ?? row.organization.billingPlan ?? "free"}</div>
                      </div>
                      <div className="mt-3 text-sm text-stone-600">
                        {row.usage.contacts} contacts used{row.usage.contactLimit ? ` of ${row.usage.contactLimit}` : ""}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href="/app" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-[#224036] px-3 text-sm font-semibold text-white">
                          Open workspace
                          <ArrowRight size={15} />
                        </Link>
                        {(row.subscription?.plan ?? row.organization.billingPlan) === "pro" ? (
                          <button
                            type="button"
                            disabled={Boolean(billingActionId)}
                            onClick={() => void openBillingRoute("/api/billing/paddle/portal", row.organization._id)}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CreditCard size={15} />
                            Billing portal
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={Boolean(billingActionId)}
                            onClick={() => void openBillingRoute("/api/billing/paddle/checkout", row.organization._id)}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CreditCard size={15} />
                            Upgrade to Pro
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-stone-300 p-4 text-sm text-stone-500">No workspaces yet.</div>
                )}
              </div>
            </div>
            </Show>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function SignupPage() {
  return <AuthEntryPage />;
}
