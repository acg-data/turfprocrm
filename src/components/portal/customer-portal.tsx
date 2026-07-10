"use client";

import { SignIn, UserButton } from "@clerk/nextjs";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Headphones,
  Home,
  Inbox,
  Leaf,
  LockKeyhole,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PawPrint,
  Plus,
  Receipt,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { demoPortal } from "@/data/demo-portal";
import styles from "./customer-portal.module.css";

type Section = "overview" | "estimates" | "schedule" | "services" | "invoices" | "documents" | "messages" | "properties" | "settings";
type EstimateDecision = "accept" | "decline" | "request_changes";

type PortalModel = {
  live: boolean;
  portalUserId?: string;
  person: { name: string; email: string };
  company: { name: string; phone?: string; email?: string };
  customer: { name: string; balanceCents: number };
  properties: Array<{ id: string; label: string; street: string; city: string; state: string; postalCode: string; lawnSizeSqFt?: number; accessNotes?: string; pets?: string; irrigation?: string }>;
  estimates: Array<{ id: string; estimateNumber: string; title: string; propertyId?: string; status: string; totalCents: number; expiresAt?: number; acceptedAt?: number; updatedAt: number; terms?: string; lineItems: Array<{ id: string; name: string; description?: string; quantity: number; unit: string; unitPriceCents: number; totalCents: number }> }>;
  visits: Array<{ id: string; title: string; propertyId?: string; scheduledStart: number; scheduledEnd: number; completedAt?: number; status: string; arrivalWindow?: string; crew?: string; weather?: string; checklist: string[]; notes?: string; materials: Array<{ id: string; name: string; epaRegistrationNumber?: string; quantity: number; unit: string; applicationRate?: string; activeIngredient?: string }>; photos: Array<{ id: string; type: string; caption?: string }> }>;
  invoices: Array<{ id: string; invoiceNumber: string; title: string; status: string; totalCents: number; paidCents: number; dueAt?: number; paidAt?: number; createdAt: number }>;
  payments: Array<{ id: string; invoiceId?: string; amountCents: number; method: string; status: string; receivedAt: number; reference?: string }>;
  documents: Array<{ id: string; fileName: string; category: string; createdAt: number; size?: number; url?: string | null }>;
  messages: Array<{ id: string; direction: "customer" | "team" | "system"; author: string; body: string; createdAt: number; read: boolean }>;
  serviceRequests: Array<{ id: string; subject: string; kind: string; status: string; detail: string; createdAt: number }>;
  preferences: { emailNotifications: boolean; smsNotifications: boolean; serviceReminders: boolean; invoiceReminders: boolean; estimateReminders: boolean; marketingMessages: boolean };
};

const navItems: Array<{ id: Section; label: string; icon: ReactNode }> = [
  { id: "overview", label: "Overview", icon: <Home size={18} /> },
  { id: "estimates", label: "Estimates", icon: <FileCheck2 size={18} /> },
  { id: "schedule", label: "Schedule", icon: <CalendarDays size={18} /> },
  { id: "services", label: "Service history", icon: <Sprout size={18} /> },
  { id: "invoices", label: "Invoices & payments", icon: <WalletCards size={18} /> },
  { id: "documents", label: "Documents", icon: <FileText size={18} /> },
  { id: "messages", label: "Messages", icon: <MessageCircle size={18} /> },
  { id: "properties", label: "Properties", icon: <MapPin size={18} /> },
  { id: "settings", label: "Profile & settings", icon: <Settings size={18} /> },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const dateTime = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const portalRenderEpoch = Date.now();

function demoModel(): PortalModel {
  return {
    live: false,
    portalUserId: demoPortal.portalUser.id,
    person: { name: demoPortal.portalUser.name, email: demoPortal.portalUser.email },
    company: demoPortal.organization,
    customer: { name: demoPortal.customer.name, balanceCents: demoPortal.customer.balanceCents },
    properties: demoPortal.properties.map((property) => ({ ...property })),
    estimates: demoPortal.estimates.map((estimate) => ({ ...estimate, lineItems: estimate.lineItems.map((line) => ({ ...line })) })),
    visits: demoPortal.visits.map((visit) => ({ ...visit, checklist: [...visit.checklist], materials: visit.materials.map((material) => ({ ...material })), photos: "photos" in visit ? visit.photos.map((photo) => ({ ...photo })) : [] })),
    invoices: demoPortal.invoices.map((invoice) => ({ ...invoice })),
    payments: demoPortal.payments.map((payment) => ({ ...payment })),
    documents: demoPortal.documents.map((document) => ({ ...document })),
    messages: demoPortal.messages.map((message) => ({ ...message })),
    serviceRequests: demoPortal.serviceRequests.map((request) => ({ ...request })),
    preferences: { ...demoPortal.preferences },
  };
}

function liveModel(value: NonNullable<ReturnType<typeof usePortalQuery>>): PortalModel {
  const jobs = new Map(value.jobs.map((job) => [String(job._id), job]));
  return {
    live: true,
    portalUserId: String(value.portalUser.id),
    person: { name: value.portalUser.name, email: value.portalUser.email },
    company: { name: value.organization?.name ?? "Service provider" },
    customer: { name: value.customer?.name ?? value.portalUser.name, balanceCents: value.customer?.balanceCents ?? value.invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.totalCents - invoice.paidCents), 0) },
    properties: value.properties.map((property) => ({ id: String(property._id), label: property.label, street: property.street, city: property.city, state: property.state, postalCode: property.postalCode, lawnSizeSqFt: property.lawnSizeSqFt, accessNotes: property.notes })),
    estimates: value.estimates.map((estimate) => ({ id: String(estimate._id), estimateNumber: estimate.estimateNumber, title: estimate.lineItems[0]?.name ?? `Estimate ${estimate.estimateNumber}`, propertyId: estimate.propertyId ? String(estimate.propertyId) : undefined, status: estimate.status, totalCents: estimate.totalCents, expiresAt: estimate.expiresAt, acceptedAt: estimate.acceptedAt, updatedAt: estimate.updatedAt, terms: estimate.terms, lineItems: estimate.lineItems.map((line) => ({ id: String(line._id), name: line.name, description: line.description, quantity: line.quantity, unit: line.unit, unitPriceCents: line.unitPriceCents, totalCents: line.totalCents })) })),
    visits: value.visits.map((visit) => ({ id: String(visit._id), title: visit.job?.title ?? jobs.get(String(visit.jobId))?.title ?? "Scheduled service", propertyId: visit.propertyId ? String(visit.propertyId) : undefined, scheduledStart: visit.scheduledStart, scheduledEnd: visit.scheduledEnd, completedAt: visit.completedAt, status: visit.status, checklist: visit.checklist.map((item) => item.label), notes: visit.notes, materials: visit.materials.map((application) => ({ id: String(application._id), name: application.material?.name ?? "Applied material", epaRegistrationNumber: application.material?.epaRegistrationNumber, quantity: application.quantity, unit: application.unit })), photos: visit.photos.map((photo) => ({ id: String(photo._id), type: photo.type, caption: photo.caption })) })),
    invoices: value.invoices.map((invoice) => ({ id: String(invoice._id), invoiceNumber: invoice.invoiceNumber, title: `Service invoice ${invoice.invoiceNumber}`, status: invoice.status, totalCents: invoice.totalCents, paidCents: invoice.paidCents, dueAt: invoice.dueAt, paidAt: invoice.paidAt, createdAt: invoice.createdAt })),
    payments: value.payments.map((payment) => ({ id: String(payment._id), invoiceId: payment.invoiceId ? String(payment.invoiceId) : undefined, amountCents: payment.amountCents, method: payment.method, status: payment.status, receivedAt: payment.receivedAt, reference: payment.reference })),
    documents: value.documents.map((document) => ({ id: String(document._id), fileName: document.fileName, category: document.entityType.replaceAll("_", " "), createdAt: document.createdAt, size: document.size, url: document.url })),
    messages: value.messages.map((message) => ({ id: String(message._id), direction: message.direction, author: message.direction === "customer" ? "You" : message.direction === "system" ? "Turf Pro" : value.organization?.name ?? "Service team", body: message.body, createdAt: message.createdAt, read: Boolean(message.readByCustomerAt) })),
    serviceRequests: value.serviceRequests.map((request) => ({ id: String(request._id), subject: request.subject, kind: request.kind, status: request.status, detail: request.detail, createdAt: request.createdAt })),
    preferences: value.preferences ? { emailNotifications: value.preferences.emailNotifications, smsNotifications: value.preferences.smsNotifications, serviceReminders: value.preferences.serviceReminders, invoiceReminders: value.preferences.invoiceReminders, estimateReminders: value.preferences.estimateReminders, marketingMessages: value.preferences.marketingMessages } : { emailNotifications: true, smsNotifications: false, serviceReminders: true, invoiceReminders: true, estimateReminders: true, marketingMessages: false },
  };
}

function usePortalQuery() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.portal.getMyPortal, isAuthenticated ? {} : "skip");
}

export function CustomerPortal({ authConfigured, initialSection = "overview", paymentNotice = null }: { authConfigured: boolean; initialSection?: Section; paymentNotice?: string | null }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const live = usePortalQuery();
  const [section, setSection] = useState<Section>(initialSection);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(paymentNotice);
  const [demo, setDemo] = useState<PortalModel>(() => demoModel());

  const model = useMemo(() => (live ? liveModel(live) : demo), [live, demo]);
  const selectSection = (value: Section) => {
    setSection(value);
    setMobileOpen(false);
    window.history.replaceState(null, "", value === "overview" ? "/portal" : `/portal?section=${value}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (authConfigured && (isLoading || !isAuthenticated)) {
    return (
      <main className={styles.authPage}>
        <Link href="/" className={styles.authBrand}><BrandMark /> Turf Pro CRM</Link>
        <section className={styles.authCard}>
          <div className={styles.authIntro}>
            <span className={styles.eyebrow}><LockKeyhole size={15} /> Secure customer portal</span>
            <h1>Everything about your service, in one calm place.</h1>
            <p>Review estimates, see upcoming visits, read service notes, message your team, and pay securely.</p>
            <div className={styles.authTrust}><ShieldCheck size={17} /> Private access · Encrypted sessions · No internal company data</div>
          </div>
          <div className={styles.clerkFrame}>{isLoading ? <LoadingState label="Checking your secure session" /> : <SignIn routing="hash" forceRedirectUrl="/portal" fallbackRedirectUrl="/portal" />}</div>
        </section>
      </main>
    );
  }

  return (
    <div className={styles.portalShell}>
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sideBrand}><BrandMark /><div><strong>{model.company.name}</strong><span>Customer portal</span></div></div>
        <button type="button" className={styles.mobileClose} onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        <nav aria-label="Customer portal">
          {navItems.map((item) => <button key={item.id} type="button" className={section === item.id ? styles.navActive : ""} onClick={() => selectSection(item.id)}>{item.icon}<span>{item.label}</span>{item.id === "messages" && model.messages.some((message) => !message.read && message.direction === "team") ? <i /> : null}</button>)}
        </nav>
        <div className={styles.sideHelp}><Headphones size={19} /><div><strong>Need a hand?</strong><span>We’re here Monday–Friday</span></div><button type="button" onClick={() => selectSection("messages")}>Message us</button></div>
        <div className={styles.sideFoot}><Leaf size={15} /> Powered by Turf Pro CRM</div>
      </aside>

      {mobileOpen ? <button className={styles.scrim} aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}

      <main className={styles.portalMain}>
        <header className={styles.topbar}>
          <button type="button" className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className={styles.mobileBrand}><BrandMark /><strong>{model.company.name}</strong></div>
          <div className={styles.topActions}>
            {!model.live ? <span className={styles.demoBadge}><Sparkles size={14} /> Interactive preview</span> : null}
            <button type="button" className={styles.iconButton} aria-label="Notifications"><Bell size={18} /><i /></button>
            {authConfigured ? <UserButton /> : <div className={styles.avatar}>{initials(model.person.name)}</div>}
          </div>
        </header>
        <div className={styles.pageWrap}>
          {notice ? <div className={styles.notice}><CheckCircle2 size={18} /><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"><X size={16} /></button></div> : null}
          {section === "overview" ? <Overview model={model} go={selectSection} /> : null}
          {section === "estimates" ? <Estimates model={model} setDemo={setDemo} notify={setNotice} /> : null}
          {section === "schedule" ? <Schedule model={model} go={selectSection} /> : null}
          {section === "services" ? <ServiceHistory model={model} /> : null}
          {section === "invoices" ? <Invoices model={model} setDemo={setDemo} notify={setNotice} /> : null}
          {section === "documents" ? <Documents model={model} notify={setNotice} /> : null}
          {section === "messages" ? <Messages model={model} setDemo={setDemo} notify={setNotice} /> : null}
          {section === "properties" ? <Properties model={model} notify={setNotice} /> : null}
          {section === "settings" ? <PortalSettings model={model} setDemo={setDemo} notify={setNotice} /> : null}
        </div>
      </main>
    </div>
  );
}

function Overview({ model, go }: { model: PortalModel; go: (section: Section) => void }) {
  const nextVisit = model.visits.filter((visit) => visit.status === "scheduled" && visit.scheduledStart > portalRenderEpoch).sort((a, b) => a.scheduledStart - b.scheduledStart)[0];
  const openEstimate = model.estimates.find((estimate) => estimate.status === "sent");
  const openBalance = model.invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.totalCents - invoice.paidCents), 0);
  const property = nextVisit ? model.properties.find((candidate) => candidate.id === nextVisit.propertyId) : model.properties[0];
  return <div className={styles.stack}>
    <section className={styles.welcome}><div><span className={styles.eyebrow}><Sprout size={15} /> Your outdoor care, organized</span><h1>Good {daypart()}, {firstName(model.person.name)}.</h1><p>Here’s what’s happening with your properties and service.</p></div><div className={styles.weatherOrb}><span>72°</span><small>Perfect service weather</small></div></section>
    <section className={styles.quickGrid}>
      <button type="button" onClick={() => go("schedule")}><CalendarDays /><div><span>Next visit</span><strong>{nextVisit ? dateTime.format(nextVisit.scheduledStart) : "Nothing scheduled"}</strong><small>{nextVisit?.title ?? "Request service anytime"}</small></div><ChevronRight /></button>
      <button type="button" onClick={() => go("estimates")}><FileCheck2 /><div><span>Estimate awaiting you</span><strong>{openEstimate ? money.format(openEstimate.totalCents / 100) : "All caught up"}</strong><small>{openEstimate?.estimateNumber ?? "No open estimates"}</small></div><ChevronRight /></button>
      <button type="button" onClick={() => go("invoices")}><CircleDollarSign /><div><span>Account balance</span><strong>{money.format(openBalance / 100)}</strong><small>{openBalance ? "Secure payment available" : "Paid in full"}</small></div><ChevronRight /></button>
    </section>
    <div className={styles.dashboardGrid}>
      <section className={styles.card}>
        <CardHead title="Upcoming service" action="Full schedule" onAction={() => go("schedule")} />
        {nextVisit ? <div className={styles.upcoming}>
          <div className={styles.dateTile}><strong>{new Date(nextVisit.scheduledStart).getDate()}</strong><span>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(nextVisit.scheduledStart)}</span></div>
          <div className={styles.upcomingBody}><span className={styles.statusPill}>Scheduled</span><h3>{nextVisit.title}</h3><p><Clock3 size={15} /> {nextVisit.arrivalWindow ?? dateTime.format(nextVisit.scheduledStart)}</p><p><MapPin size={15} /> {property ? `${property.label} · ${property.street}` : "Your property"}</p><div className={styles.reminder}><Bell size={15} /> We’ll text when your crew is on the way.</div></div>
        </div> : <Empty icon={<CalendarDays />} title="No upcoming visits" body="When your next service is scheduled, it will appear here." action="Request service" onAction={() => go("messages")} />}
      </section>
      <section className={styles.card}>
        <CardHead title="Quick actions" />
        <div className={styles.actionList}>
          <button type="button" onClick={() => go("messages")}><MessageCircle /><span><strong>Message the team</strong><small>Ask a question or share a photo</small></span><ChevronRight /></button>
          <button type="button" onClick={() => go("estimates")}><ClipboardCheck /><span><strong>Review an estimate</strong><small>Approve or request a change</small></span><ChevronRight /></button>
          <button type="button" onClick={() => go("invoices")}><Receipt /><span><strong>Pay an invoice</strong><small>Card or bank transfer</small></span><ChevronRight /></button>
          <button type="button" onClick={() => go("properties")}><MapPin /><span><strong>Update property notes</strong><small>Gate, pet, and access details</small></span><ChevronRight /></button>
        </div>
      </section>
    </div>
    <section className={styles.card}><CardHead title="Recent service" action="All service history" onAction={() => go("services")} />{model.visits.filter((visit) => visit.status === "complete").slice(0, 2).map((visit) => <div key={visit.id} className={styles.recentRow}><span className={styles.doneIcon}><Check size={17} /></span><div><strong>{visit.title}</strong><small>{date.format(visit.completedAt ?? visit.scheduledEnd)} · {visit.notes}</small></div><button type="button" onClick={() => go("services")}>View report</button></div>)}</section>
  </div>;
}

function Estimates({ model, setDemo, notify }: { model: PortalModel; setDemo: React.Dispatch<React.SetStateAction<PortalModel>>; notify: (message: string) => void }) {
  const decide = useMutation(api.portal.decideEstimate);
  const [selected, setSelected] = useState(model.estimates[0]?.id ?? "");
  const [decision, setDecision] = useState<EstimateDecision | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const estimate = model.estimates.find((candidate) => candidate.id === selected) ?? model.estimates[0];
  async function submitDecision() {
    if (!estimate || !decision) return;
    setBusy(true);
    try {
      if (model.live) await decide({ portalUserId: model.portalUserId as Id<"portalUsers">, estimateId: estimate.id as Id<"estimates">, decision, message: message || undefined });
      else setDemo((current) => ({ ...current, estimates: current.estimates.map((row) => row.id === estimate.id && decision !== "request_changes" ? { ...row, status: decision === "accept" ? "accepted" : "declined", acceptedAt: decision === "accept" ? Date.now() : row.acceptedAt, updatedAt: Date.now() } : row) }));
      notify(decision === "accept" ? "Estimate approved. The service team has been notified." : decision === "decline" ? "Estimate declined. The service team has been notified." : "Your change request was sent to the service team.");
      setDecision(null); setMessage("");
    } catch (error) { notify(error instanceof Error ? error.message : "We couldn’t update the estimate."); } finally { setBusy(false); }
  }
  if (!estimate) return <PageScaffold eyebrow="Decide with confidence" title="Estimates" description="Review scope, options, and pricing in one place."><Empty icon={<FileCheck2 />} title="No estimates yet" body="New proposals will appear here." /></PageScaffold>;
  return <PageScaffold eyebrow="Decide with confidence" title="Estimates" description="Review line items, approve work, or ask for a change without an email chain.">
    <div className={styles.splitView}>
      <div className={styles.listPane}>{model.estimates.map((row) => <button type="button" key={row.id} className={row.id === estimate.id ? styles.selectedRow : ""} onClick={() => setSelected(row.id)}><div><span>{row.estimateNumber}</span><strong>{row.title}</strong><small>Updated {date.format(row.updatedAt)}</small></div><div><Status value={row.status} /><strong>{money.format(row.totalCents / 100)}</strong></div></button>)}</div>
      <article className={styles.detailPane}>
        <div className={styles.documentHeader}><div><span>{estimate.estimateNumber}</span><h2>{estimate.title}</h2><p>{estimate.expiresAt ? `Valid through ${date.format(estimate.expiresAt)}` : `Updated ${date.format(estimate.updatedAt)}`}</p></div><div><Status value={estimate.status} /><strong>{money.format(estimate.totalCents / 100)}</strong></div></div>
        <div className={styles.lineItems}>{estimate.lineItems.map((line) => <div key={line.id}><div><strong>{line.name}</strong><p>{line.description}</p><small>{line.quantity} {line.unit} × {money.format(line.unitPriceCents / 100)}</small></div><strong>{money.format(line.totalCents / 100)}</strong></div>)}<div className={styles.totalRow}><span>Total</span><strong>{money.format(estimate.totalCents / 100)}</strong></div></div>
        {estimate.terms ? <div className={styles.terms}><strong>Scope & terms</strong><p>{estimate.terms}</p></div> : null}
        {estimate.status === "sent" ? <div className={styles.decisionBar}><button type="button" className={styles.primaryButton} onClick={() => setDecision("accept")}><CheckCircle2 size={17} /> Approve estimate</button><button type="button" className={styles.secondaryButton} onClick={() => setDecision("request_changes")}>Request changes</button><button type="button" className={styles.textButtonDanger} onClick={() => setDecision("decline")}>Decline</button></div> : <div className={styles.resolvedBanner}><CheckCircle2 /> This estimate is {estimate.status}. A complete record remains available here.</div>}
      </article>
    </div>
    {decision ? <Modal title={decision === "accept" ? "Approve this estimate?" : decision === "decline" ? "Decline this estimate?" : "What would you like changed?"} onClose={() => setDecision(null)}><p className={styles.modalLead}>{decision === "accept" ? `You’re approving ${estimate.estimateNumber} for ${money.format(estimate.totalCents / 100)}. This records your approval and notifies the service team.` : "Add a note so the service team knows exactly how to help."}</p><label className={styles.field}>Message to the team<textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={decision === "accept" ? "Optional note" : "Tell us what you’d like to change"} /></label><div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={() => setDecision(null)}>Cancel</button><button type="button" className={decision === "decline" ? styles.dangerButton : styles.primaryButton} onClick={() => void submitDecision()} disabled={busy || (decision === "request_changes" && message.trim().length < 3)}>{busy ? "Saving…" : decision === "accept" ? "Approve estimate" : decision === "decline" ? "Decline estimate" : "Send request"}</button></div></Modal> : null}
  </PageScaffold>;
}

function Schedule({ model, go }: { model: PortalModel; go: (section: Section) => void }) {
  const upcoming = model.visits.filter((visit) => visit.status !== "complete").sort((a, b) => a.scheduledStart - b.scheduledStart);
  const completed = model.visits.filter((visit) => visit.status === "complete").sort((a, b) => b.scheduledStart - a.scheduledStart);
  return <PageScaffold eyebrow="Know what’s next" title="Schedule" description="Upcoming appointments, arrival windows, and recent service — always current."><div className={styles.scheduleLayout}><section className={styles.card}><CardHead title="Upcoming appointments" />{upcoming.length ? upcoming.map((visit) => <VisitRow key={visit.id} visit={visit} model={model} onMessage={() => go("messages")} />) : <Empty icon={<CalendarDays />} title="Nothing scheduled" body="Need something? Send the team a request." action="Request service" onAction={() => go("messages")} />}</section><aside className={styles.card}><CardHead title="What to expect" /><div className={styles.expectList}>{[[Bell, "Arrival text", "You’ll receive an update when your crew is on the way."], [ShieldCheck, "Property-aware", "Access notes and pet instructions travel with the work order."], [FileCheck2, "Service report", "Completion details and recommendations appear after every visit."]].map(([Icon, title, body]) => { const IconType = Icon as typeof Bell; return <div key={String(title)}><IconType /><div><strong>{String(title)}</strong><p>{String(body)}</p></div></div>; })}</div></aside></div><section className={styles.card}><CardHead title="Completed" action="Service reports" onAction={() => go("services")} />{completed.map((visit) => <div key={visit.id} className={styles.historyRow}><span className={styles.doneIcon}><Check /></span><div><strong>{visit.title}</strong><small>{date.format(visit.completedAt ?? visit.scheduledEnd)} · {model.properties.find((property) => property.id === visit.propertyId)?.label}</small></div><Status value="complete" /></div>)}</section></PageScaffold>;
}

function VisitRow({ visit, model, onMessage }: { visit: PortalModel["visits"][number]; model: PortalModel; onMessage: () => void }) {
  const property = model.properties.find((candidate) => candidate.id === visit.propertyId);
  return <div className={styles.visitCard}><div className={styles.dateTile}><strong>{new Date(visit.scheduledStart).getDate()}</strong><span>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(visit.scheduledStart)}</span></div><div className={styles.visitBody}><div><Status value={visit.status} /><span>{visit.weather}</span></div><h3>{visit.title}</h3><p><Clock3 /> {visit.arrivalWindow ?? dateTime.format(visit.scheduledStart)}</p><p><MapPin /> {property ? `${property.label} · ${property.street}, ${property.city}` : "Your property"}</p><details><summary>Preparation & visit details <ChevronDown /></summary><ul>{visit.checklist.map((item) => <li key={item}><Check /> {item}</li>)}</ul>{visit.notes ? <p>{visit.notes}</p> : null}</details></div><div className={styles.visitActions}><button type="button" className={styles.secondaryButton} onClick={onMessage}>Request a change</button><button type="button" className={styles.iconButton} aria-label="More options"><MoreHorizontal /></button></div></div>;
}

function ServiceHistory({ model }: { model: PortalModel }) {
  const [open, setOpen] = useState(model.visits.find((visit) => visit.status === "complete")?.id ?? "");
  const visits = model.visits.filter((visit) => visit.status === "complete");
  return <PageScaffold eyebrow="Proof after every visit" title="Service history" description="See what was completed, what was applied, conditions on site, and what we recommend next."><div className={styles.reportStack}>{visits.map((visit) => { const expanded = open === visit.id; return <article key={visit.id} className={styles.reportCard}><button type="button" className={styles.reportSummary} onClick={() => setOpen(expanded ? "" : visit.id)}><span className={styles.doneIcon}><Check /></span><div><strong>{visit.title}</strong><small>{dateTime.format(visit.completedAt ?? visit.scheduledEnd)} · {visit.crew ?? "Service team"}</small></div><Status value="complete" /><ChevronDown className={expanded ? styles.rotate : ""} /></button>{expanded ? <div className={styles.reportBody}><div className={styles.reportHero}><div><span>Service report</span><h2>{visit.title}</h2><p>{visit.notes}</p></div><div><strong>{date.format(visit.completedAt ?? visit.scheduledEnd)}</strong><small>{visit.weather}</small></div></div><div className={styles.reportGrid}><section><h3>Work completed</h3>{visit.checklist.map((item) => <p key={item}><CheckCircle2 /> {item}</p>)}</section><section><h3>Products & applications</h3>{visit.materials.length ? visit.materials.map((material) => <div key={material.id} className={styles.materialCard}><strong>{material.name}</strong><span>{material.quantity} {material.unit}{material.applicationRate ? ` · ${material.applicationRate}` : ""}</span>{material.activeIngredient ? <small>{material.activeIngredient}</small> : null}{material.epaRegistrationNumber ? <small>EPA Reg. {material.epaRegistrationNumber}</small> : null}</div>) : <p className={styles.muted}>No regulated materials recorded for this visit.</p>}</section></div>{visit.photos.length ? <div className={styles.photoGrid}>{visit.photos.map((photo, index) => <div key={photo.id} className={index % 2 ? styles.photoAfter : styles.photoBefore}><span>{photo.type}</span><small>{photo.caption}</small></div>)}</div> : null}<div className={styles.reportActions}><button type="button" className={styles.secondaryButton}><Download /> Download report</button><button type="button" className={styles.secondaryButton}><MessageCircle /> Ask a question</button></div></div> : null}</article>; })}</div></PageScaffold>;
}

function Invoices({ model, setDemo, notify }: { model: PortalModel; setDemo: React.Dispatch<React.SetStateAction<PortalModel>>; notify: (message: string) => void }) {
  const checkout = useAction(api.portalPayments.createInvoiceCheckoutSession);
  const [busy, setBusy] = useState<string | null>(null);
  async function pay(invoice: PortalModel["invoices"][number]) {
    setBusy(invoice.id);
    try {
      if (model.live) { const result = await checkout({ invoiceId: invoice.id as Id<"customerInvoices"> }); if (result.url) window.location.assign(result.url); }
      else { const amount = invoice.totalCents - invoice.paidCents; setDemo((current) => ({ ...current, customer: { ...current.customer, balanceCents: Math.max(0, current.customer.balanceCents - amount) }, invoices: current.invoices.map((row) => row.id === invoice.id ? { ...row, paidCents: row.totalCents, status: "paid", paidAt: Date.now() } : row), payments: [{ id: `demo-${Date.now()}`, invoiceId: invoice.id, amountCents: amount, method: "card", status: "posted", receivedAt: Date.now(), reference: "Visa •••• 4242" }, ...current.payments] })); notify("Demo payment completed. A receipt has been added to your account."); }
    } catch (error) { notify(error instanceof Error ? error.message : "Payment could not be started."); } finally { setBusy(null); }
  }
  const outstanding = model.invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.totalCents - invoice.paidCents), 0);
  return <PageScaffold eyebrow="Simple, secure billing" title="Invoices & payments" description="See every charge, pay open balances, and keep receipts close."><section className={styles.balanceCard}><div><span>Outstanding balance</span><strong>{money.format(outstanding / 100)}</strong><small>{outstanding ? "Across your open invoices" : "You’re all paid up"}</small></div><div><ShieldCheck /><span><strong>Secure checkout</strong><small>Payments are handled by Stripe</small></span></div></section><section className={styles.card}><CardHead title="Invoices" /><div className={styles.invoiceTable}><div className={styles.tableHead}><span>Invoice</span><span>Date</span><span>Status</span><span>Total</span><span /></div>{model.invoices.map((invoice) => { const balance = invoice.totalCents - invoice.paidCents; return <div key={invoice.id} className={styles.invoiceRow}><div><strong>{invoice.invoiceNumber}</strong><small>{invoice.title}</small></div><span>{date.format(invoice.createdAt)}</span><Status value={invoice.status} /><strong>{money.format(invoice.totalCents / 100)}</strong><div>{balance > 0 && invoice.status !== "void" ? <button type="button" className={styles.primarySmall} disabled={busy === invoice.id} onClick={() => void pay(invoice)}>{busy === invoice.id ? "Opening…" : `Pay ${money.format(balance / 100)}`}</button> : <button type="button" className={styles.secondarySmall}><Download /> Receipt</button>}</div></div>; })}</div></section><section className={styles.card}><CardHead title="Payment history" />{model.payments.map((payment) => <div key={payment.id} className={styles.paymentRow}><span className={styles.doneIcon}><Check /></span><div><strong>{money.format(payment.amountCents / 100)} payment</strong><small>{date.format(payment.receivedAt)} · {payment.reference ?? payment.method}</small></div><Status value={payment.status} /></div>)}</section></PageScaffold>;
}

function Documents({ model, notify }: { model: PortalModel; notify: (message: string) => void }) {
  const [filter, setFilter] = useState("All");
  const categories = ["All", ...Array.from(new Set(model.documents.map((document) => document.category)))];
  const documents = filter === "All" ? model.documents : model.documents.filter((document) => document.category === filter);
  return <PageScaffold eyebrow="Your records, ready" title="Documents" description="Agreements, service reports, receipts, and care guides — easy to find and easy to share."><div className={styles.filterBar}>{categories.map((category) => <button type="button" key={category} className={filter === category ? styles.filterActive : ""} onClick={() => setFilter(category)}>{category}</button>)}</div><section className={styles.documentGrid}>{documents.map((document) => <article key={document.id}><div className={styles.fileIcon}><FileText /></div><div><span>{document.category}</span><strong>{document.fileName}</strong><small>{date.format(document.createdAt)}{document.size ? ` · ${Math.round(document.size / 1000)} KB` : ""}</small></div>{document.url ? <a href={document.url} className={styles.iconButton} aria-label={`Download ${document.fileName}`}><Download /></a> : <button type="button" className={styles.iconButton} aria-label={`Download ${document.fileName}`} onClick={() => notify("Download previewed. Live files open from secure cloud storage.")}><Download /></button>}</article>)}</section></PageScaffold>;
}

function Messages({ model, setDemo, notify }: { model: PortalModel; setDemo: React.Dispatch<React.SetStateAction<PortalModel>>; notify: (message: string) => void }) {
  const send = useMutation(api.portal.sendMessage);
  const request = useMutation(api.portal.submitServiceRequest);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [detail, setDetail] = useState("");
  async function sendMessage(event: FormEvent) {
    event.preventDefault(); if (body.trim().length < 2) return; setBusy(true);
    try { if (model.live) await send({ portalUserId: model.portalUserId as Id<"portalUsers">, body }); else setDemo((current) => ({ ...current, messages: [...current.messages, { id: `message-${Date.now()}`, direction: "customer", author: "You", body: body.trim(), createdAt: Date.now(), read: true }] })); setBody(""); notify("Message sent to the service team."); } catch (error) { notify(error instanceof Error ? error.message : "Message could not be sent."); } finally { setBusy(false); }
  }
  async function sendRequest() {
    setBusy(true); try { if (model.live) await request({ portalUserId: model.portalUserId as Id<"portalUsers">, kind: "new_service", subject, detail, propertyId: model.properties[0]?.id as Id<"properties"> | undefined }); else setDemo((current) => ({ ...current, serviceRequests: [{ id: `request-${Date.now()}`, subject, detail, kind: "new_service", status: "submitted", createdAt: Date.now() }, ...current.serviceRequests] })); setRequestOpen(false); setSubject(""); setDetail(""); notify("Service request submitted. The team will follow up shortly."); } catch (error) { notify(error instanceof Error ? error.message : "Request could not be sent."); } finally { setBusy(false); }
  }
  return <PageScaffold eyebrow="One conversation" title="Messages" description="Questions, updates, and service requests stay connected to your account."><div className={styles.messageLayout}><section className={styles.messageCard}><div className={styles.conversationHead}><div className={styles.teamAvatar}><Leaf /></div><div><strong>{model.company.name}</strong><span><i /> Typically replies within one business hour</span></div><button type="button" className={styles.secondarySmall} onClick={() => setRequestOpen(true)}><Plus /> New request</button></div><div className={styles.thread}>{model.messages.map((message) => <div key={message.id} className={message.direction === "customer" ? styles.messageMine : message.direction === "system" ? styles.messageSystem : styles.messageTheirs}><span>{message.author}</span><p>{message.body}</p><small>{dateTime.format(message.createdAt)}</small></div>)}</div><form className={styles.composer} onSubmit={sendMessage}><textarea aria-label="Message" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message…" maxLength={4000} /><div><span>{body.length}/4000</span><button type="submit" className={styles.primaryButton} disabled={busy || body.trim().length < 2}><Send /> {busy ? "Sending…" : "Send"}</button></div></form></section><aside className={styles.card}><CardHead title="Open requests" />{model.serviceRequests.map((item) => <div key={item.id} className={styles.requestCard}><Status value={item.status} /><strong>{item.subject}</strong><p>{item.detail}</p><small>Submitted {date.format(item.createdAt)}</small></div>)}<button type="button" className={styles.secondaryButton} onClick={() => setRequestOpen(true)}><Plus /> Request new service</button></aside></div>{requestOpen ? <Modal title="Request service" onClose={() => setRequestOpen(false)}><label className={styles.field}>What do you need?<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Example: Add grub prevention" /></label><label className={styles.field}>Details<textarea value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Tell us what you’re seeing or what you’d like scheduled." /></label><div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={() => setRequestOpen(false)}>Cancel</button><button type="button" className={styles.primaryButton} onClick={() => void sendRequest()} disabled={busy || !subject.trim() || detail.trim().length < 5}>{busy ? "Submitting…" : "Submit request"}</button></div></Modal> : null}</PageScaffold>;
}

function Properties({ model, notify }: { model: PortalModel; notify: (message: string) => void }) {
  return <PageScaffold eyebrow="Details that prevent surprises" title="Properties" description="Keep access, pet, lawn, and irrigation notes accurate for every visit."><div className={styles.propertyGrid}>{model.properties.map((property, index) => <article key={property.id} className={styles.propertyCard}><div className={`${styles.propertyVisual} ${index % 2 ? styles.propertyAlt : ""}`}><span><MapPin /> {property.label}</span></div><div className={styles.propertyBody}><div><span>Service property</span><h2>{property.label}</h2><p>{property.street}<br />{property.city}, {property.state} {property.postalCode}</p></div><dl><div><dt><Sprout /> Turf area</dt><dd>{property.lawnSizeSqFt ? `${property.lawnSizeSqFt.toLocaleString()} sq ft` : "Not measured"}</dd></div><div><dt><LockKeyhole /> Access</dt><dd>{property.accessNotes ?? "No access notes"}</dd></div><div><dt><PawPrint /> Pets</dt><dd>{property.pets ?? "No pet notes"}</dd></div><div><dt><Sparkles /> Irrigation</dt><dd>{property.irrigation ?? "No irrigation notes"}</dd></div></dl><button type="button" className={styles.secondaryButton} onClick={() => notify("Property updates are ready to send to the office in the live workspace.")}>Update property details</button></div></article>)}</div></PageScaffold>;
}

function PortalSettings({ model, setDemo, notify }: { model: PortalModel; setDemo: React.Dispatch<React.SetStateAction<PortalModel>>; notify: (message: string) => void }) {
  const update = useMutation(api.portal.updatePreferences);
  const [preferences, setPreferences] = useState(model.preferences);
  const [busy, setBusy] = useState(false);
  async function save() { setBusy(true); try { if (model.live) await update({ portalUserId: model.portalUserId as Id<"portalUsers">, ...preferences }); else setDemo((current) => ({ ...current, preferences })); notify("Notification preferences saved."); } catch (error) { notify(error instanceof Error ? error.message : "Preferences could not be saved."); } finally { setBusy(false); } }
  return <PageScaffold eyebrow="Your account, your preferences" title="Profile & settings" description="Manage contact details and choose the updates that are useful to you."><div className={styles.settingsGrid}><section className={styles.card}><CardHead title="Profile" /><div className={styles.profileHeader}><div className={styles.profileAvatar}>{initials(model.person.name)}</div><div><strong>{model.person.name}</strong><span>{model.person.email}</span></div></div><div className={styles.readonlyFields}><label>Name<input value={model.person.name} readOnly /></label><label>Email address<input value={model.person.email} readOnly /></label></div><p className={styles.securityNote}><LockKeyhole /> Contact the service team to change the email tied to secure portal access.</p></section><section className={styles.card}><CardHead title="Notifications" /><div className={styles.toggleList}>{([{ key: "serviceReminders", title: "Service reminders", body: "Schedule confirmations, changes, and on-the-way alerts" }, { key: "invoiceReminders", title: "Invoice reminders", body: "New invoices, due dates, payments, and receipts" }, { key: "estimateReminders", title: "Estimate reminders", body: "New proposals and approaching expiration dates" }, { key: "smsNotifications", title: "Text messages", body: "Time-sensitive service and arrival updates" }, { key: "marketingMessages", title: "Seasonal offers", body: "Relevant program recommendations and promotions" }] as const).map((item) => <label key={item.key}><span><strong>{item.title}</strong><small>{item.body}</small></span><input type="checkbox" checked={preferences[item.key]} onChange={(event) => setPreferences({ ...preferences, [item.key]: event.target.checked })} /><i /></label>)}</div><button type="button" className={styles.primaryButton} onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save preferences"}</button></section><section className={styles.card}><CardHead title="Security" /><div className={styles.securityList}><p><ShieldCheck /><span><strong>Secure sign-in</strong><small>Your portal uses protected Clerk sessions and server-verified access.</small></span></p><p><LockKeyhole /><span><strong>Private by design</strong><small>Only customer-visible notes and documents are returned to this portal.</small></span></p><p><Inbox /><span><strong>Session control</strong><small>Use your account menu to sign out on this device.</small></span></p></div></section></div></PageScaffold>;
}

function PageScaffold({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) { return <div className={styles.stack}><header className={styles.pageHeader}><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>{children}</div>; }
function CardHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { return <div className={styles.cardHead}><h2>{title}</h2>{action ? <button type="button" onClick={onAction}>{action} <ChevronRight /></button> : null}</div>; }
function Status({ value }: { value: string }) { return <span className={`${styles.status} ${styles[`status_${value}`] ?? ""}`}>{value.replaceAll("_", " ")}</span>; }
function Empty({ icon, title, body, action, onAction }: { icon: ReactNode; title: string; body: string; action?: string; onAction?: () => void }) { return <div className={styles.empty}><span>{icon}</span><strong>{title}</strong><p>{body}</p>{action ? <button type="button" className={styles.secondaryButton} onClick={onAction}>{action}</button> : null}</div>; }
function LoadingState({ label }: { label: string }) { return <div className={styles.loading}><span /><strong>{label}</strong></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close"><X /></button></header>{children}</section></div>; }
function BrandMark() { return <span className={styles.brandMark}><Leaf size={20} /></span>; }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function firstName(name: string) { return name.trim().split(/\s+/)[0] || "there"; }
function daypart() { const hour = new Date().getHours(); return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"; }
