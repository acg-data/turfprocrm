"use client";

import { UserButton } from "@clerk/nextjs";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowRight, Check, CheckCircle2, ChevronLeft, CircleDollarSign, Clock3, CreditCard, FileSpreadsheet, Leaf, MapPin, PartyPopper, Rocket, ShieldCheck, Sparkles, Sprout, Upload, UserPlus, UsersRound, Wrench, X } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, ReactNode, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import styles from "./trial-onboarding.module.css";

type StepId = "welcome" | "company" | "services" | "team" | "import" | "launch";
const steps: Array<{ id: StepId; label: string; helper: string; icon: ReactNode }> = [
  { id: "welcome", label: "Your success plan", helper: "Set the goal", icon: <Sparkles /> },
  { id: "company", label: "Company profile", helper: "Territory & defaults", icon: <MapPin /> },
  { id: "services", label: "Services & pricing", helper: "Build the catalog", icon: <Sprout /> },
  { id: "team", label: "Team & crews", helper: "Invite your people", icon: <UsersRound /> },
  { id: "import", label: "Bring your data", helper: "Map and review", icon: <FileSpreadsheet /> },
  { id: "launch", label: "Go live", helper: "Start operating", icon: <Rocket /> },
];

const serviceOptions = [
  ["lawn_care", "Lawn care", "Fertilization, aeration, seeding, weed control"],
  ["landscaping", "Landscaping", "Design, installation, enhancements, cleanup"],
  ["pest_control", "Pest control", "Mosquito, tick, perimeter, and specialty pest"],
  ["tree_shrub", "Tree & shrub", "Plant health care, pruning, and treatments"],
  ["irrigation", "Irrigation", "Startups, repairs, audits, and winterization"],
  ["snow", "Snow & ice", "Plowing, walks, deicing, and seasonal contracts"],
] as const;

const demoChecklist = [
  { _id: "profile", key: "profile", title: "Confirm company profile", description: "Set timezone, service territory, and operating focus.", completedAt: undefined, sortOrder: 1 },
  { _id: "members", key: "members", title: "Invite team members", description: "Add sales, dispatch, admin, and field users.", completedAt: undefined, sortOrder: 2 },
  { _id: "catalog", key: "catalog", title: "Review service catalog", description: "Confirm default services, units, and pricing assumptions.", completedAt: undefined, sortOrder: 3 },
  { _id: "lead_import", key: "lead_import", title: "Import leads and customers", description: "Map CSV/source fields into the lead quality model.", completedAt: undefined, sortOrder: 4 },
  { _id: "rates", key: "rates", title: "Set labor and material rates", description: "Configure labor, equipment, overhead, and vendor costs.", completedAt: undefined, sortOrder: 5 },
  { _id: "first_job", key: "first_job", title: "Create first estimate/job", description: "Convert a lead through estimate, dispatch, and field completion.", completedAt: undefined, sortOrder: 6 },
];

type Center = {
  organization: { id: string; name: string; timezone: string; serviceTerritory: string[]; industryFocus: string };
  viewer: { name: string; role: string };
  trial: { plan: string; status: string; endsAt: number | null; daysLeft: number | null; isReadOnly: boolean };
  checklist: Array<{ _id: string; key: string; title: string; description?: string; completedAt?: number; sortOrder: number }>;
  activationScore: number;
  counts: { members: number; customers: number; leads: number; estimates: number; visits: number; invoices: number };
};

function demoCenter(): Center { return { organization: { id: "demo", name: "Greenline Turf & Pest", timezone: "America/New_York", serviceTerritory: ["Foxborough", "Mansfield", "Sharon"], industryFocus: "both" }, viewer: { name: "Justin", role: "owner" }, trial: { plan: "pro", status: "trialing", endsAt: Date.now() + 13 * 86400000, daysLeft: 13, isReadOnly: false }, checklist: demoChecklist.map((item) => ({ ...item })), activationScore: 22, counts: { members: 1, customers: 0, leads: 0, estimates: 0, visits: 0, invoices: 0 } }; }

export function TrialOnboarding({ requestedOrganizationId }: { requestedOrganizationId?: string }) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return <TrialOnboardingBody center={demoCenter()} requestedOrganizationId={requestedOrganizationId} live={false} />;
  return <TrialOnboardingLive requestedOrganizationId={requestedOrganizationId} />;
}

function TrialOnboardingLive({ requestedOrganizationId }: { requestedOrganizationId?: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const workspaces = useQuery(api.setup.listMyOrganizations, isAuthenticated ? {} : "skip");
  const organizationId = (requestedOrganizationId ?? workspaces?.[0]?.organization._id) as Id<"organizations"> | undefined;
  const center = useQuery(api.onboarding.getActivationCenter, organizationId ? { organizationId } : "skip");
  if (isLoading) return <LoadingPage label="Checking your workspace" />;
  if (!isAuthenticated) return <GatePage />;
  if (!organizationId && workspaces && workspaces.length === 0) return <GatePage empty />;
  if (!center) return <LoadingPage label="Preparing your activation plan" />;
  return <TrialOnboardingBody center={{ ...center, organization: { ...center.organization, id: String(center.organization.id) }, checklist: center.checklist.map((item) => ({ ...item, _id: String(item._id) })) }} requestedOrganizationId={String(organizationId)} live />;
}

function TrialOnboardingBody({ center: initialCenter, live }: { center: Center; requestedOrganizationId?: string; live: boolean }) {
  const [center, setCenter] = useState(initialCenter);
  const [step, setStep] = useState<StepId>("welcome");
  const [goal, setGoal] = useState("replace_spreadsheets");
  const [territory, setTerritory] = useState(center.organization.serviceTerritory.join(", "));
  const [timezone, setTimezone] = useState(center.organization.timezone);
  const [services, setServices] = useState<string[]>(["lawn_care", "pest_control"]);
  const [team, setTeam] = useState<Array<{ name: string; email: string; role: string }>>([{ name: "", email: "", role: "technician" }]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mappingReady, setMappingReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const updateProfile = useMutation(api.onboarding.updateCompanyProfile);
  const setChecklist = useMutation(api.onboarding.setChecklistItem);
  const checkout = useAction(api.billing.createCheckoutSession);
  const currentIndex = steps.findIndex((item) => item.id === step);
  const completedCount = center.checklist.filter((item) => item.completedAt).length;
  const progress = Math.max(center.activationScore, Math.round(((currentIndex + completedCount) / (steps.length + center.checklist.length)) * 100));
  const currentChecklist = (key: string) => center.checklist.find((item) => item.key === key);

  async function complete(key: string) {
    const item = currentChecklist(key); if (!item || item.completedAt) return;
    if (live) await setChecklist({ organizationId: center.organization.id as Id<"organizations">, itemId: item._id as Id<"onboardingChecklistItems">, completed: true });
    setCenter((value) => ({ ...value, checklist: value.checklist.map((candidate) => candidate.key === key ? { ...candidate, completedAt: Date.now() } : candidate) }));
  }
  async function next() {
    setBusy(true); setNotice(null);
    try {
      if (step === "company") {
        const areas = territory.split(",").map((value) => value.trim()).filter(Boolean);
        if (!areas.length) throw new Error("Add at least one service area.");
        if (live) await updateProfile({ organizationId: center.organization.id as Id<"organizations">, timezone, serviceTerritory: areas });
        setCenter((value) => ({ ...value, organization: { ...value.organization, timezone, serviceTerritory: areas } }));
        await complete("profile");
      }
      if (step === "services") { if (!services.length) throw new Error("Choose at least one service line."); await complete("catalog"); }
      if (step === "team" && team.some((person) => person.email.trim())) await complete("members");
      if (step === "import" && mappingReady) await complete("lead_import");
      if (currentIndex < steps.length - 1) setStep(steps[currentIndex + 1].id);
    } catch (error) { setNotice(error instanceof Error ? error.message : "We couldn’t save this step."); } finally { setBusy(false); }
  }
  async function startPlan() {
    setBusy(true);
    try { if (live) { const result = await checkout({ organizationId: center.organization.id as Id<"organizations">, plan: "pro" }); if (result.url) window.location.assign(result.url); } else setNotice("Stripe Checkout is ready. In the live environment this opens secure payment and preserves your 14-day trial."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Billing is not configured in this environment yet."); } finally { setBusy(false); }
  }
  return <main className={styles.onboardingPage}>
    <header className={styles.top}><Link href="/" className={styles.brand}><span><Leaf /></span><strong>TURF <em>PRO</em><small>CRM</small></strong></Link><div><span className={styles.trialPill}><Clock3 /> {center.trial.daysLeft ?? 14} days left in trial</span>{live ? <UserButton /> : <span className={styles.previewPill}>Preview mode</span>}</div></header>
    <div className={styles.shell}>
      <aside className={styles.stepRail}><div className={styles.progressHead}><span>Workspace setup</span><strong>{progress}%</strong><i><b style={{ width: `${progress}%` }} /></i></div><nav>{steps.map((item, index) => <button type="button" key={item.id} className={`${step === item.id ? styles.stepActive : ""} ${index < currentIndex ? styles.stepDone : ""}`} onClick={() => setStep(item.id)}><span>{index < currentIndex ? <Check /> : item.icon}</span><div><strong>{item.label}</strong><small>{item.helper}</small></div></button>)}</nav><div className={styles.supportCard}><ShieldCheck /><div><strong>Setup help is included</strong><p>Import review, launch guidance, and your data stay available during the trial.</p></div><Link href="/demo">Book setup help</Link></div></aside>
      <section className={styles.workspace}>
        {notice ? <div className={styles.notice}><Sparkles /><span>{notice}</span><button type="button" onClick={() => setNotice(null)}><X /></button></div> : null}
        {step === "welcome" ? <WelcomeStep center={center} goal={goal} setGoal={setGoal} /> : null}
        {step === "company" ? <CompanyStep center={center} territory={territory} setTerritory={setTerritory} timezone={timezone} setTimezone={setTimezone} /> : null}
        {step === "services" ? <ServicesStep selected={services} setSelected={setServices} /> : null}
        {step === "team" ? <TeamStep team={team} setTeam={setTeam} /> : null}
        {step === "import" ? <ImportStep fileName={fileName} setFileName={setFileName} mappingReady={mappingReady} setMappingReady={setMappingReady} /> : null}
        {step === "launch" ? <LaunchStep center={center} onUpgrade={() => void startPlan()} busy={busy} /> : null}
        <footer className={styles.stepFooter}><button type="button" className={styles.backButton} onClick={() => setStep(steps[Math.max(0, currentIndex - 1)].id)} disabled={currentIndex === 0}><ChevronLeft /> Back</button><span>Saved as you go</span>{step !== "launch" ? <button type="button" className={styles.nextButton} onClick={() => void next()} disabled={busy}>{busy ? "Saving…" : currentIndex === 0 ? "Build my workspace" : "Save & continue"}<ArrowRight /></button> : <Link href="/app" className={styles.nextButton}>Open Turf Pro CRM <ArrowRight /></Link>}</footer>
      </section>
    </div>
  </main>;
}

function WelcomeStep({ center, goal, setGoal }: { center: Center; goal: string; setGoal: (value: string) => void }) { const goals = [["replace_spreadsheets", FileSpreadsheet, "Replace spreadsheets", "Bring leads, customers, and schedules into one reliable system."], ["grow_revenue", CircleDollarSign, "Grow profitable revenue", "Improve follow-up, estimate conversion, renewals, and job margins."], ["run_field", Wrench, "Run the field better", "Plan routes, equip crews, capture work, and prevent callbacks."], ["customer_experience", Sparkles, "Impress customers", "Deliver a polished estimate-to-payment experience and portal."]] as const; return <StepContent kicker="Welcome to your 14-day All-In Pro trial" title={`Let’s build ${center.organization.name} around your goals.`} lede="Choose the outcome that matters most. We’ll prioritize your setup checklist around the fastest path to value."><div className={styles.goalGrid}>{goals.map(([id, Icon, title, body]) => <button type="button" key={id} className={goal === id ? styles.goalSelected : ""} onClick={() => setGoal(id)}><span><Icon /></span><strong>{title}</strong><p>{body}</p><i>{goal === id ? <Check /> : null}</i></button>)}</div><div className={styles.promiseRow}>{[[Clock3, "About 10 minutes", "You can finish the essentials now and return anytime."], [ShieldCheck, "Your data is private", "Tenant isolation and role controls are on from the start."], [Rocket, "A real working account", "This is your production workspace, not a throwaway sandbox."]].map(([Icon, title, body]) => { const I = Icon as typeof Clock3; return <div key={String(title)}><I /><span><strong>{String(title)}</strong><small>{String(body)}</small></span></div>; })}</div></StepContent>; }
function CompanyStep({ center, territory, setTerritory, timezone, setTimezone }: { center: Center; territory: string; setTerritory: (v: string) => void; timezone: string; setTimezone: (v: string) => void }) { return <StepContent kicker="Step 2 · Company profile" title="Set the operating defaults your whole team can trust." lede="These details drive schedule times, service-area checks, customer documents, and reporting."><div className={styles.formGrid}><label>Company name<input value={center.organization.name} readOnly /></label><label>Industry focus<select defaultValue={center.organization.industryFocus}><option value="both">Lawn, landscape & pest</option><option value="landscaping">Lawn & landscaping</option><option value="pest_control">Pest control</option></select></label><label>Business timezone<select value={timezone} onChange={(e) => setTimezone(e.target.value)}><option>America/New_York</option><option>America/Chicago</option><option>America/Denver</option><option>America/Los_Angeles</option></select></label><label>Primary phone<input placeholder="(508) 555-0123" /></label><label className={styles.fullField}>Service territory<input value={territory} onChange={(e) => setTerritory(e.target.value)} placeholder="Foxborough, Mansfield, Sharon" /><small>Separate towns, counties, or service zones with commas.</small></label></div><div className={styles.mapPreview}><div><MapPin /><span><strong>{territory.split(",").filter(Boolean).length || 0} service areas</strong><small>New leads outside this territory will be flagged for review.</small></span></div><div>{territory.split(",").filter(Boolean).slice(0,4).map((area) => <span key={area}>{area.trim()}</span>)}</div></div></StepContent>; }
function ServicesStep({ selected, setSelected }: { selected: string[]; setSelected: (v: string[]) => void }) { return <StepContent kicker="Step 3 · Services & pricing" title="Start with the work you sell today." lede="We’ll create smart catalog defaults. You can refine production rates, materials, and packages later."><div className={styles.serviceGrid}>{serviceOptions.map(([id,title,body]) => { const active=selected.includes(id); return <button type="button" key={id} className={active?styles.serviceSelected:""} onClick={() => setSelected(active?selected.filter((value)=>value!==id):[...selected,id])}><span><Sprout /></span><div><strong>{title}</strong><p>{body}</p></div><i>{active?<Check />:null}</i></button>; })}</div><div className={styles.templateCallout}><Sparkles /><div><strong>{selected.length} industry templates selected</strong><p>Turf Pro will seed recommended services, units, visit durations, checklists, estimate language, and seasonal timing.</p></div><Link href="/app?view=admin">Preview catalog</Link></div></StepContent>; }
function TeamStep({ team, setTeam }: { team: Array<{name:string;email:string;role:string}>; setTeam:(v:Array<{name:string;email:string;role:string}>)=>void }) { function update(index:number,key:"name"|"email"|"role",value:string){setTeam(team.map((person,i)=>i===index?{...person,[key]:value}:person));} return <StepContent kicker="Step 4 · Team & crews" title="Invite the people who move work forward." lede="Roles keep financial, customer, dispatch, and field information appropriately separated."><div className={styles.teamTable}><div><span>Name</span><span>Work email</span><span>Role</span><span /></div>{team.map((person,index)=><div key={index}><input aria-label={`Team member ${index+1} name`} value={person.name} onChange={(e)=>update(index,"name",e.target.value)} placeholder="Team member"/><input aria-label={`Team member ${index+1} email`} type="email" value={person.email} onChange={(e)=>update(index,"email",e.target.value)} placeholder="name@company.com"/><select aria-label={`Team member ${index+1} role`} value={person.role} onChange={(e)=>update(index,"role",e.target.value)}><option value="admin">Admin</option><option value="manager">Manager</option><option value="sales">Sales</option><option value="dispatcher">Dispatcher</option><option value="crew_lead">Crew lead</option><option value="technician">Technician</option></select><button type="button" onClick={()=>setTeam(team.filter((_,i)=>i!==index))}><X/></button></div>)}</div><button type="button" className={styles.addButton} onClick={()=>setTeam([...team,{name:"",email:"",role:"technician"}])}><UserPlus /> Add another teammate</button><div className={styles.roleNote}><ShieldCheck /><span><strong>Owner access stays with you.</strong><small>Technicians see field work, managers run operations, and admins can configure the workspace. Every role is editable.</small></span></div></StepContent>; }
function ImportStep({ fileName, setFileName, mappingReady, setMappingReady }: { fileName:string|null;setFileName:(v:string|null)=>void;mappingReady:boolean;setMappingReady:(v:boolean)=>void }) { function pick(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];if(file){setFileName(file.name);setMappingReady(true);}} return <StepContent kicker="Step 5 · Bring your data" title="Move in cleanly — with a review before anything changes." lede="Upload a CSV from Google Sheets or another CRM. Turf Pro maps common columns, flags duplicates, and lets you approve the import."><label className={styles.dropzone}><input type="file" accept=".csv,text/csv" onChange={pick}/><Upload /><strong>{fileName??"Drop a CSV here or choose a file"}</strong><span>Customers, contacts, properties, leads, and notes · up to 25 MB</span><button type="button">Choose CSV</button></label>{mappingReady?<div className={styles.mappingCard}><header><div><CheckCircle2/><span><strong>Mapping preview ready</strong><small>{fileName}</small></span></div><strong>96% confidence</strong></header><div className={styles.mappingTable}><div><span>Source column</span><span>Turf Pro field</span><span>Preview</span><span>Quality</span></div>{[["Customer Name","Customer name","Megan Walsh","Ready"],["Property Address","Service address","42 Oak Terrace","Ready"],["Status","Lead status","Estimate Provided","Mapped"],["Phone","Mobile phone","508-555-0188","Ready"],["Town","City","Foxboro","Review spelling"]].map(row=><div key={row[0]}>{row.map((cell,i)=><span key={cell} className={i===3&&cell.includes("Review")?styles.reviewCell:""}>{cell}</span>)}</div>)}</div><footer><span>1,222 rows found · 14 duplicates · 9 fields need review</span><button type="button">Review all mappings</button></footer></div>:null}<button type="button" className={styles.skipLink} onClick={()=>setMappingReady(false)}>I’ll start with a clean workspace and import later</button></StepContent>; }
function LaunchStep({ center,onUpgrade,busy }: {center:Center;onUpgrade:()=>void;busy:boolean}) { const tasks=center.checklist.map(item=>({...item,done:Boolean(item.completedAt)})); return <StepContent kicker="Final step · Go live" title="Your workspace is ready to run real work." lede="The setup center stays available after launch. Start with one customer journey and expand from there."><div className={styles.launchHero}><div><PartyPopper/><span><strong>{center.organization.name} is ready</strong><small>Lead intake, CRM, estimating, dispatch, field work, invoicing, portal, and reporting are provisioned.</small></span></div><span>{center.trial.daysLeft??14} trial days remaining</span></div><div className={styles.launchGrid}><section><h3>Activation checklist</h3>{tasks.map(item=><div key={item.key}><span className={item.done?styles.checkDone:""}>{item.done?<Check/>:null}</span><div><strong>{item.title}</strong><small>{item.description}</small></div></div>)}</section><section><h3>Your first win</h3>{[["1","Create or import a customer"],["2","Send a professional estimate"],["3","Invite the customer to their portal"],["4","Schedule, complete, invoice, and collect"]].map(([number,label])=><p key={number}><span>{number}</span>{label}</p>)}<Link href="/app">Run the first workflow <ArrowRight/></Link></section></div><div className={styles.billingCard}><div><CreditCard/><span><strong>All-In Pro · $99/month</strong><small>Every core module, unlimited contacts, unlimited portal customers, and no setup fee.</small></span></div><div><span><Check/> 14-day trial</span><span><Check/> Cancel anytime</span><span><Check/> Secure Stripe billing</span></div><button type="button" onClick={onUpgrade} disabled={busy}>{busy?"Opening…":"Add payment method"}</button></div></StepContent>; }
function StepContent({ kicker,title,lede,children }:{kicker:string;title:string;lede:string;children:ReactNode}){return <div className={styles.stepContent}><header><span>{kicker}</span><h1>{title}</h1><p>{lede}</p></header>{children}</div>}
function LoadingPage({label}:{label:string}){return <main className={styles.loadingPage}><span/><strong>{label}</strong></main>}
function GatePage({empty=false}:{empty?:boolean}){return <main className={styles.gatePage}><Link href="/" className={styles.brand}><span><Leaf/></span><strong>TURF <em>PRO</em><small>CRM</small></strong></Link><section><ShieldCheck/><h1>{empty?"Create your first workspace":"Sign in to continue setup"}</h1><p>{empty?"Choose a plan and name your company to begin the guided activation journey.":"Your trial, checklist, imports, and workspace settings are protected behind your account."}</p><Link href={empty?"/signin?plan=pro":"/signin"}>{empty?"Start free trial":"Sign in"}<ArrowRight/></Link></section></main>}
