"use client";

import { ArrowRight, Check, CreditCard, LockKeyhole, ShieldCheck, Sprout, UsersRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api, loginWithReplit, useAuth, useMutation, useQuery } from "@/lib/live-api";

type SignupPlan = "free" | "pro";
type IndustryFocus = "landscaping" | "pest_control" | "both";

type WorkspaceRow = {
  organization: { id: string; name: string; slug: string; billingPlan?: string | null };
  membership: { role: string };
  subscription?: { plan?: string | null } | null;
  usage: { contacts: number; contactLimit?: number | null; seatLimit?: number | null };
};

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

export function AuthEntryPage() {
  const auth = useAuth();
  const syncCurrentUser = useMutation(api.setup.syncCurrentUser);
  const createOrganization = useMutation(api.setup.createOrganization);
  const [userSynced, setUserSynced] = useState(false);
  const syncStartedRef = useRef(false);
  const [companyName, setCompanyName] = useState("");
  const [industryFocus, setIndustryFocus] = useState<IndustryFocus>("both");
  const [selectedPlan, setSelectedPlan] = useState<SignupPlan>("free");
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York", []);

  useEffect(() => {
    if (!auth.isAuthenticated || syncStartedRef.current) return;
    syncStartedRef.current = true;
    void syncCurrentUser({})
      .then(() => setUserSynced(true))
      .catch(() => setUserSynced(false));
  }, [auth.isAuthenticated, syncCurrentUser]);

  const workspaces = useQuery(api.setup.listMyOrganizations, userSynced ? {} : "skip") as WorkspaceRow[] | undefined;

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
      });
      setCreatedWorkspaceId(String(organizationId));
      setCompanyName("");
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
            {auth.isAuthenticated ? (
              <span className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700">
                {auth.name ?? "Signed in"}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => loginWithReplit(() => location.reload())}
                className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700"
              >
                Sign in with Replit
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-12">
        <div className="grid content-start gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
              <ShieldCheck size={15} />
              Single sign-in + Replit onboarding
            </div>
            <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-normal md:text-5xl">Sign in, then launch the workspace</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
              One route handles sign in, account creation, plan selection, and workspace provisioning. Replit handles identity; the built-in Postgres database stores the tenant, subscription, defaults, and audit trail after auth.
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

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            {!auth.isAuthenticated ? (
              <div className="grid gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold">
                    <LockKeyhole size={20} className="text-[#224036]" />
                    Step 1: sign in or create account
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    Sign in with your Replit account — the same route serves returning clients and new free trials.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loginWithReplit(() => location.reload())}
                  disabled={auth.isLoading}
                  className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-md bg-[#224036] px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {auth.isLoading ? "Checking session..." : "Sign in with Replit"}
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <form onSubmit={submitWorkspace} className="grid gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">Step 2: create the workspace</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-500">
                      This writes the organization, owner membership, subscription, operating defaults, and audit event to the built-in database.
                    </p>
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
                {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
                {createdWorkspaceId ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Workspace created. Open the app to continue onboarding.</div> : null}
                <button type="submit" disabled={isCreating} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#224036] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                  <CreditCard size={16} />
                  {isCreating ? "Creating workspace..." : selectedPlan === "free" ? "Create free workspace" : "Create $99/mo workspace"}
                </button>
              </form>
            )}
          </div>

          {auth.isAuthenticated ? (
            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold">Step 3: continue onboarding</h2>
                <Link href="/app" className="text-sm font-semibold text-[#224036]">Open app</Link>
              </div>
              <div className="mt-4 grid gap-2">
                {workspaces && workspaces.length > 0 ? (
                  workspaces.map((row) => (
                    <div key={row.organization.id} className="rounded-md border border-stone-200 p-3">
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
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-stone-300 p-4 text-sm text-stone-500">No workspaces yet.</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function SignupPage() {
  return <AuthEntryPage />;
}
