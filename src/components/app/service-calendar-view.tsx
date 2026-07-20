"use client";

import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  GripVertical,
  List,
  MapPin,
  Plus,
  Route,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { DragEvent as ReactDragEvent, FormEvent, useMemo, useState } from "react";
import type { JobVisit, WorkspaceSnapshot } from "@/domain/types";
import { statusTone, visitStatusLabel } from "@/domain/workflow";
import { cn, googleMapsUrl, shortDate, timeRange } from "@/lib/utils";

type CalendarMode = "day" | "week" | "month" | "agenda";
type DrawerMode = "visit" | "schedule" | null;

type RouteSignal = {
  visitId: string;
  score: number;
  warnings: string[];
  weatherRisk: string;
  equipmentConflicts: string[];
};

type ServiceCalendarProps = {
  workspace: WorkspaceSnapshot;
  customersById: Map<string, WorkspaceSnapshot["customers"][number]>;
  propertiesById: Map<string, WorkspaceSnapshot["properties"][number]>;
  crewsById: Map<string, WorkspaceSnapshot["crews"][number]>;
  jobsById: Map<string, WorkspaceSnapshot["jobs"][number]>;
  operatingDepth: { fieldOps: { routeConfidence: RouteSignal[] } };
  setSelectedVisitId: (id: string) => void;
  setView: (view: "field" | "routing") => void;
  updateVisit: (input: {
    visitId: string;
    scheduledStart: number;
    scheduledEnd: number;
    crewId: string;
    status: JobVisit["status"];
    routeOrder: number;
  }) => Promise<void>;
  createVisit: (input: { jobId: string; scheduledStart: number; durationMinutes: number; crewId: string }) => Promise<{ visitId: string; routeOrder: number; scheduledEnd: number }>;
  generateRecurringRoute: (input: {
    jobId: string;
    frequency: "weekly" | "biweekly" | "monthly" | "seasonal" | "custom";
    count: number;
    firstStart: number;
    durationMinutes: number;
    crewId?: string;
  }) => Promise<{ planId: string; visitIds: string[]; generatedCount: number }>;
};

const visitStatuses: JobVisit["status"][] = ["scheduled", "en_route", "on_site", "complete", "missed", "canceled"];
const modeOptions: Array<{ id: CalendarMode; label: string }> = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "agenda", label: "Agenda" },
];
const timelineStartMinutes = 7 * 60;
const timelineEndMinutes = 18 * 60;
const timelineHeight = timelineEndMinutes - timelineStartMinutes;

function startOfDay(value: number) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function sameDay(left: number, right: number) {
  return new Date(left).toDateString() === new Date(right).toDateString();
}

function dateInputValue(value: number) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function timeInputValue(value: number) {
  return new Date(value).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

function durationMinutes(visit: JobVisit) {
  return Math.max(15, Math.round((visit.scheduledEnd - visit.scheduledStart) / 60000));
}

function addDays(value: number, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return startOfDay(date.getTime());
}

function mondayOfWeek(value: number) {
  const date = new Date(value);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return startOfDay(date.getTime());
}

function frequencyLabel(frequency: WorkspaceSnapshot["recurringServicePlans"][number]["frequency"], intervalDays: number) {
  if (frequency === "weekly") return "Weekly";
  if (frequency === "biweekly") return "Every 2 weeks";
  if (frequency === "monthly") return "Monthly";
  if (frequency === "seasonal") return "Seasonal";
  return `Every ${intervalDays} days`;
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={cn("inline-flex h-6 items-center rounded-full border px-2 text-xs font-semibold", tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700", tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700", tone === "danger" && "border-rose-200 bg-rose-50 text-rose-700", tone === "neutral" && "border-stone-200 bg-stone-50 text-stone-600")}>{children}</span>;
}

function InputLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-xs font-semibold uppercase text-stone-500">{label}{children}</label>;
}

export function ServiceCalendarView({
  workspace,
  customersById,
  propertiesById,
  crewsById,
  jobsById,
  operatingDepth,
  setSelectedVisitId,
  setView,
  updateVisit,
  createVisit,
  generateRecurringRoute,
}: ServiceCalendarProps) {
  const [today] = useState(() => startOfDay(Date.now()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(Date.now()));
  const [mode, setMode] = useState<CalendarMode>("day");
  const [crewFilter, setCrewFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [activeVisitId, setActiveVisitId] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [editDate, setEditDate] = useState(dateInputValue(today));
  const [editTime, setEditTime] = useState("08:00");
  const [editDuration, setEditDuration] = useState(60);
  const [editCrewId, setEditCrewId] = useState("");
  const [editStatus, setEditStatus] = useState<JobVisit["status"]>("scheduled");
  const [editRouteOrder, setEditRouteOrder] = useState(1);

  const [scheduleJobId, setScheduleJobId] = useState(workspace.jobs[0]?.id ?? "");
  const [scheduleDate, setScheduleDate] = useState(dateInputValue(today));
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [scheduleDuration, setScheduleDuration] = useState(60);
  const [scheduleCrewId, setScheduleCrewId] = useState(workspace.crews.find((crew) => crew.active)?.id ?? "");
  const [scheduleType, setScheduleType] = useState<"once" | "repeat">("once");
  const [scheduleFrequency, setScheduleFrequency] = useState<"weekly" | "biweekly" | "monthly" | "seasonal">("weekly");
  const [scheduleCount, setScheduleCount] = useState(12);

  const routeSignals = useMemo(() => new Map(operatingDepth.fieldOps.routeConfidence.map((signal) => [signal.visitId, signal])), [operatingDepth.fieldOps.routeConfidence]);
  const filteredVisits = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workspace.visits.filter((visit) => {
      if (crewFilter !== "all" && (crewFilter === "unassigned" ? Boolean(visit.crewId) : visit.crewId !== crewFilter)) return false;
      if (statusFilter === "open" && ["complete", "canceled"].includes(visit.status)) return false;
      if (statusFilter !== "all" && statusFilter !== "open" && visit.status !== statusFilter) return false;
      if (!query) return true;
      const customer = customersById.get(visit.customerId);
      const property = propertiesById.get(visit.propertyId);
      const job = jobsById.get(visit.jobId);
      return [customer?.name, property?.street, property?.city, job?.title].some((value) => value?.toLowerCase().includes(query));
    });
  }, [crewFilter, customersById, jobsById, propertiesById, search, statusFilter, workspace.visits]);

  const dayVisits = useMemo(() => filteredVisits.filter((visit) => sameDay(visit.scheduledStart, selectedDate)).sort((left, right) => left.scheduledStart - right.scheduledStart || left.routeOrder - right.routeOrder), [filteredVisits, selectedDate]);
  const activeVisit = workspace.visits.find((visit) => visit.id === activeVisitId);
  const weekStart = mondayOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const agendaEnd = addDays(selectedDate, 14);
  const agendaVisits = filteredVisits.filter((visit) => visit.scheduledStart >= selectedDate && visit.scheduledStart < agendaEnd).sort((left, right) => left.scheduledStart - right.scheduledStart);
  const monthStart = new Date(selectedDate);
  monthStart.setDate(1);
  const monthGridStart = mondayOfWeek(monthStart.getTime());
  const monthDays = Array.from({ length: 42 }, (_, index) => addDays(monthGridStart, index));
  const unscheduledVisits = filteredVisits.filter((visit) => !visit.crewId && !["complete", "canceled"].includes(visit.status)).sort((left, right) => left.scheduledStart - right.scheduledStart);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).getTime();
  const rangeVisits = mode === "day" ? dayVisits : mode === "week" ? filteredVisits.filter((visit) => visit.scheduledStart >= weekStart && visit.scheduledStart < addDays(weekStart, 7)) : mode === "month" ? filteredVisits.filter((visit) => visit.scheduledStart >= monthStart.getTime() && visit.scheduledStart < monthEnd) : agendaVisits;
  const rangeDayCount = mode === "day" ? 1 : mode === "week" ? 7 : mode === "agenda" ? 14 : new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  const conflictIds = useMemo(() => {
    const result = new Set<string>();
    const byCrew = new Map<string, JobVisit[]>();
    for (const visit of dayVisits.filter((item) => item.crewId && item.status !== "canceled")) {
      const group = byCrew.get(visit.crewId) ?? [];
      group.push(visit);
      byCrew.set(visit.crewId, group);
    }
    for (const visits of byCrew.values()) {
      for (let left = 0; left < visits.length; left += 1) {
        for (let right = left + 1; right < visits.length; right += 1) {
          if (visits[left].scheduledStart < visits[right].scheduledEnd && visits[right].scheduledStart < visits[left].scheduledEnd) {
            result.add(visits[left].id);
            result.add(visits[right].id);
          }
        }
      }
    }
    return result;
  }, [dayVisits]);

  const activeCrews = workspace.crews.filter((crew) => crew.active && (crewFilter === "all" || crew.id === crewFilter));
  const timelineCrews = [...activeCrews.map((crew) => ({ id: crew.id, name: crew.name, color: crew.color })), ...(dayVisits.some((visit) => !visit.crewId) ? [{ id: "unassigned", name: "Unassigned", color: "#78716c" }] : [])];
  const crewMinutes = new Map(timelineCrews.map((crew) => [crew.id, dayVisits.filter((visit) => (visit.crewId || "unassigned") === crew.id && visit.status !== "canceled").reduce((sum, visit) => sum + durationMinutes(visit), 0)]));
  const overloadedCrews = timelineCrews.filter((crew) => (crewMinutes.get(crew.id) ?? 0) > 480);
  const weatherRiskCount = dayVisits.filter((visit) => ["high", "medium"].includes(routeSignals.get(visit.id)?.weatherRisk ?? "")).length;
  const openCount = rangeVisits.filter((visit) => !["complete", "canceled"].includes(visit.status)).length;
  const scheduledMinutes = rangeVisits.reduce((sum, visit) => sum + durationMinutes(visit), 0);
  const capacityPercent = activeCrews.length ? Math.round((scheduledMinutes / (activeCrews.length * 480 * rangeDayCount)) * 100) : 0;

  function moveRange(direction: number) {
    if (mode === "month") {
      const date = new Date(selectedDate);
      date.setMonth(date.getMonth() + direction);
      setSelectedDate(startOfDay(date.getTime()));
      return;
    }
    setSelectedDate((current) => addDays(current, direction * (mode === "week" ? 7 : 1)));
  }

  function openScheduleDrawer() {
    setScheduleDate(dateInputValue(selectedDate));
    setNotice(null);
    setDrawerMode("schedule");
  }

  function openVisit(visit: JobVisit) {
    setActiveVisitId(visit.id);
    setEditDate(dateInputValue(visit.scheduledStart));
    setEditTime(timeInputValue(visit.scheduledStart));
    setEditDuration(durationMinutes(visit));
    setEditCrewId(visit.crewId);
    setEditStatus(visit.status);
    setEditRouteOrder(visit.routeOrder);
    setNotice(null);
    setDrawerMode("visit");
  }

  async function saveVisit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeVisit) return;
    const scheduledStart = new Date(`${editDate}T${editTime}:00`).getTime();
    if (!Number.isFinite(scheduledStart) || editDuration < 15) {
      setNotice({ tone: "danger", text: "Enter a valid date, start time, and duration." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await updateVisit({ visitId: activeVisit.id, scheduledStart, scheduledEnd: scheduledStart + editDuration * 60000, crewId: editCrewId, status: editStatus, routeOrder: editRouteOrder });
      setSelectedDate(startOfDay(scheduledStart));
      setNotice({ tone: "success", text: "Visit schedule updated." });
    } catch {
      setNotice({ tone: "danger", text: "The visit could not be updated. Check your access and try again." });
    } finally {
      setSaving(false);
    }
  }

  async function submitSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstStart = new Date(`${scheduleDate}T${scheduleTime}:00`).getTime();
    if (!scheduleJobId || !Number.isFinite(firstStart) || scheduleDuration < 15) {
      setNotice({ tone: "danger", text: "Choose a job and enter a valid date, time, and duration." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      if (scheduleType === "once") {
        await createVisit({ jobId: scheduleJobId, scheduledStart: firstStart, durationMinutes: scheduleDuration, crewId: scheduleCrewId });
        setNotice({ tone: "success", text: "Visit added to the schedule." });
      } else {
        const result = await generateRecurringRoute({ jobId: scheduleJobId, frequency: scheduleFrequency, count: scheduleCount, firstStart, durationMinutes: scheduleDuration, crewId: scheduleCrewId || undefined });
        setNotice({ tone: "success", text: `${result.generatedCount} recurring visits added.` });
      }
      setSelectedDate(startOfDay(firstStart));
    } catch {
      setNotice({ tone: "danger", text: "The schedule could not be created. Review the details and try again." });
    } finally {
      setSaving(false);
    }
  }

  function dropVisit(event: ReactDragEvent<HTMLDivElement>, crewId: string) {
    event.preventDefault();
    const visitId = event.dataTransfer.getData("text/visit-id");
    const visit = workspace.visits.find((item) => item.id === visitId);
    if (!visit) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
    const rawMinutes = timelineStartMinutes + (position / bounds.height) * (timelineEndMinutes - timelineStartMinutes);
    const roundedMinutes = Math.max(timelineStartMinutes, Math.min(timelineEndMinutes - 15, Math.round(rawMinutes / 15) * 15));
    const scheduledStart = new Date(selectedDate);
    scheduledStart.setHours(Math.floor(roundedMinutes / 60), roundedMinutes % 60, 0, 0);
    setNotice(null);
    void updateVisit({ visitId, scheduledStart: scheduledStart.getTime(), scheduledEnd: scheduledStart.getTime() + durationMinutes(visit) * 60000, crewId: crewId === "unassigned" ? "" : crewId, status: visit.status, routeOrder: visit.routeOrder }).catch(() => setNotice({ tone: "danger", text: "The visit could not be moved." }));
  }

  function renderCompactVisit(visit: JobVisit, showDate = false) {
    const customer = customersById.get(visit.customerId);
    const job = jobsById.get(visit.jobId);
    const signal = routeSignals.get(visit.id);
    return (
      <button key={visit.id} type="button" onClick={() => openVisit(visit)} className={cn("w-full min-w-0 rounded-md border bg-white p-2 text-left shadow-sm transition hover:border-[#789586] hover:shadow", conflictIds.has(visit.id) ? "border-rose-300" : "border-stone-200")}>
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-xs font-bold text-stone-900">{customer?.name ?? "Customer"}</span>
          {signal?.warnings.length || signal?.equipmentConflicts.length ? <AlertTriangle size={13} className="shrink-0 text-amber-600" /> : null}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-stone-600">{job?.title ?? "Service visit"}</div>
        <div className="mt-1 text-[10px] font-semibold text-stone-500">{showDate ? `${shortDate(visit.scheduledStart)} - ` : ""}{timeRange(visit.scheduledStart, visit.scheduledEnd)}</div>
      </button>
    );
  }

  return (
    <div className="grid gap-3">
      <section className="min-w-0 rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 p-3">
          <div className="mr-auto min-w-[190px]">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#315a4d]"><CalendarDays size={15} />Service planner</div>
            <div className="mt-1 text-lg font-bold text-stone-950">{mode === "month" ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(selectedDate) : shortDate(selectedDate)}</div>
          </div>
          <div className="flex items-center rounded-md border border-stone-200 bg-stone-50 p-0.5" aria-label="Calendar view">
            {modeOptions.map((option) => <button key={option.id} type="button" onClick={() => setMode(option.id)} className={cn("h-8 rounded px-2.5 text-xs font-semibold", mode === option.id ? "bg-white text-[#224036] shadow-sm" : "text-stone-500 hover:text-stone-900")}>{option.label}</button>)}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => moveRange(-1)} aria-label="Previous date range" className="grid h-9 w-9 place-items-center rounded-md border border-stone-200 hover:bg-stone-50"><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => setSelectedDate(today)} className="h-9 rounded-md border border-stone-200 px-3 text-xs font-bold hover:bg-stone-50">Today</button>
            <button type="button" onClick={() => moveRange(1)} aria-label="Next date range" className="grid h-9 w-9 place-items-center rounded-md border border-stone-200 hover:bg-stone-50"><ChevronRight size={16} /></button>
          </div>
          <input aria-label="Calendar date" type="date" value={dateInputValue(selectedDate)} onChange={(event) => { const next = new Date(`${event.target.value}T00:00:00`).getTime(); if (Number.isFinite(next)) setSelectedDate(next); }} className="h-9 rounded-md border border-stone-200 bg-white px-2 text-xs font-semibold" />
          <button type="button" onClick={() => setShowFilters((current) => !current)} className={cn("inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-bold", showFilters || crewFilter !== "all" || statusFilter !== "all" ? "border-[#789586] bg-[#eef4ee] text-[#224036]" : "border-stone-200 bg-white text-stone-700")}><Filter size={14} />Filters</button>
          <button type="button" onClick={() => setView("routing")} className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-200 px-3 text-xs font-bold text-stone-700 hover:bg-stone-50"><Route size={14} />Route map</button>
          <button type="button" onClick={openScheduleDrawer} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#224036] px-3 text-xs font-bold text-white hover:bg-[#1a332b]"><Plus size={15} />Visit</button>
        </div>

        {showFilters ? <div className="grid gap-2 border-b border-stone-200 bg-stone-50 p-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
          <label className="relative"><Search size={15} className="absolute left-3 top-2.5 text-stone-400" /><input aria-label="Search calendar" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Customer, service, town, address" className="h-9 w-full rounded-md border border-stone-200 bg-white pl-9 pr-3 text-sm" /></label>
          <select aria-label="Filter by crew" value={crewFilter} onChange={(event) => setCrewFilter(event.target.value)} className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm"><option value="all">All crews</option><option value="unassigned">Unassigned</option>{workspace.crews.filter((crew) => crew.active).map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select>
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm"><option value="open">Open work</option><option value="all">All statuses</option>{visitStatuses.map((status) => <option key={status} value={status}>{visitStatusLabel(status)}</option>)}</select>
          <button type="button" onClick={() => { setSearch(""); setCrewFilter("all"); setStatusFilter("all"); }} className="h-9 rounded-md px-3 text-xs font-bold text-stone-600 hover:bg-stone-100">Clear</button>
        </div> : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-stone-200 px-3 py-2 text-xs">
          <span><strong className="text-stone-900">{rangeVisits.length}</strong> stops</span>
          <span><strong className="text-stone-900">{openCount}</strong> open</span>
          <span><strong className="text-stone-900">{(scheduledMinutes / 60).toFixed(1)}</strong> crew hours</span>
          <span><strong className={capacityPercent > 100 ? "text-rose-700" : "text-stone-900"}>{capacityPercent}%</strong> capacity</span>
          <span><strong className="text-stone-900">{activeCrews.length}</strong> active crews</span>
        </div>

        {(conflictIds.size > 0 || unscheduledVisits.length > 0 || overloadedCrews.length > 0 || weatherRiskCount > 0) ? <div className="flex flex-wrap gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          <AlertTriangle size={15} />
          {conflictIds.size > 0 ? <button type="button" onClick={() => setMode("day")} className="underline decoration-amber-400 underline-offset-2">{conflictIds.size} overlapping visits</button> : null}
          {unscheduledVisits.length > 0 ? <button type="button" onClick={() => setShowUnscheduled(true)} className="underline decoration-amber-400 underline-offset-2">{unscheduledVisits.length} unassigned</button> : null}
          {overloadedCrews.length > 0 ? <span>{overloadedCrews.length} crews over 8 hours</span> : null}
          {weatherRiskCount > 0 ? <span>{weatherRiskCount} weather-sensitive stops</span> : null}
        </div> : null}

        {notice && !drawerMode ? <div role="status" className={cn("mx-3 mt-3 rounded-md border p-3 text-sm", notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800")}>{notice.text}</div> : null}

        {showUnscheduled && unscheduledVisits.length > 0 ? <div className="border-b border-stone-200 bg-stone-50 px-3 py-2">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs font-bold uppercase text-stone-600"><List size={14} />Unscheduled queue</div><button type="button" onClick={() => setShowUnscheduled(false)} aria-label="Collapse unscheduled queue"><X size={15} /></button></div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">{unscheduledVisits.slice(0, 8).map((visit) => <div key={visit.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/visit-id", visit.id)} className="w-52 shrink-0 cursor-grab">{renderCompactVisit(visit, true)}</div>)}</div>
        </div> : null}

        {mode === "day" ? <div className="overflow-x-auto">
          {timelineCrews.length === 0 ? <div className="p-12 text-center text-sm text-stone-500">No active crews match these filters.</div> : <div className="min-w-max" style={{ width: `${72 + timelineCrews.length * 240}px` }}>
            <div className="grid border-b border-stone-200 bg-stone-50" style={{ gridTemplateColumns: `72px repeat(${timelineCrews.length}, minmax(240px, 1fr))` }}>
              <div className="border-r border-stone-200 p-2 text-[10px] font-bold uppercase text-stone-400">Time</div>
              {timelineCrews.map((crew) => {
                const minutes = crewMinutes.get(crew.id) ?? 0;
                return <div key={crew.id} className="border-r border-stone-200 p-2 last:border-r-0"><div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2 truncate text-xs font-bold"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: crew.color }} />{crew.name}</span><span className={cn("text-[10px] font-semibold", minutes > 480 ? "text-rose-700" : "text-stone-500")}>{(minutes / 60).toFixed(1)}h</span></div><div className="mt-1 h-1 overflow-hidden rounded bg-stone-200"><div className={cn("h-full", minutes > 480 ? "bg-rose-500" : "bg-emerald-600")} style={{ width: `${Math.min(100, Math.round((minutes / 480) * 100))}%` }} /></div></div>;
              })}
            </div>
            <div className="grid" style={{ gridTemplateColumns: `72px repeat(${timelineCrews.length}, minmax(240px, 1fr))` }}>
              <div className="relative border-r border-stone-200 bg-stone-50" style={{ height: timelineHeight }}>
                {Array.from({ length: 12 }, (_, index) => { const hour = 7 + index; return <div key={hour} className="absolute left-0 right-0 -translate-y-2 px-2 text-right text-[10px] font-semibold text-stone-400" style={{ top: index * 60 }}>{new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", { hour: "numeric" })}</div>; })}
              </div>
              {timelineCrews.map((crew) => <div key={crew.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropVisit(event, crew.id)} className="relative border-r border-stone-200 last:border-r-0" style={{ height: timelineHeight }} aria-label={`${crew.name} schedule`}>
                {Array.from({ length: 12 }, (_, index) => <div key={index} className="pointer-events-none absolute left-0 right-0 border-t border-stone-100" style={{ top: index * 60 }} />)}
                {dayVisits.filter((visit) => (visit.crewId || "unassigned") === crew.id).map((visit) => {
                  const start = new Date(visit.scheduledStart);
                  const startMinutes = start.getHours() * 60 + start.getMinutes();
                  const top = Math.max(0, startMinutes - timelineStartMinutes);
                  const height = Math.max(42, Math.min(durationMinutes(visit), timelineHeight - top));
                  const conflict = conflictIds.has(visit.id);
                  const customer = customersById.get(visit.customerId);
                  const property = propertiesById.get(visit.propertyId);
                  const job = jobsById.get(visit.jobId);
                  const signal = routeSignals.get(visit.id);
                  const laneConflictVisits = dayVisits.filter((candidate) => (candidate.crewId || "unassigned") === crew.id && conflictIds.has(candidate.id));
                  const conflictColumns = Math.min(4, Math.max(1, laneConflictVisits.length));
                  const conflictColumn = Math.max(0, laneConflictVisits.findIndex((candidate) => candidate.id === visit.id));
                  return <button key={visit.id} type="button" draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/visit-id", visit.id); }} onClick={() => openVisit(visit)} className={cn("absolute z-10 overflow-hidden rounded-md border p-2 text-left shadow-sm transition hover:z-20 hover:shadow-md", conflict ? "border-rose-400 bg-rose-50" : visit.status === "complete" ? "border-emerald-200 bg-emerald-50" : "border-[#b8c8bf] bg-white")} style={{ top, height, left: conflict ? `${2 + conflictColumn * (96 / conflictColumns)}%` : 4, width: conflict ? `${96 / conflictColumns}%` : "calc(100% - 8px)", borderLeftWidth: 4, borderLeftColor: crew.color }} title={`${customer?.name ?? "Customer"} - ${timeRange(visit.scheduledStart, visit.scheduledEnd)}`}>
                    <div className="flex items-start gap-1"><GripVertical size={13} className="mt-0.5 shrink-0 text-stone-400" /><span className="min-w-0 flex-1 truncate text-xs font-bold">{customer?.name ?? "Customer"}</span>{conflict || signal?.warnings.length || signal?.equipmentConflicts.length ? <AlertTriangle size={13} className="shrink-0 text-amber-600" /> : null}</div>
                    <div className="mt-0.5 truncate text-[11px] text-stone-600">{job?.title ?? "Service visit"}</div>
                    {height >= 64 ? <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-semibold text-stone-500"><span>{timeRange(visit.scheduledStart, visit.scheduledEnd)}</span><span className="truncate">{property?.city}</span></div> : null}
                  </button>;
                })}
              </div>)}
            </div>
          </div>}
        </div> : null}

        {mode === "week" ? <div className="overflow-x-auto p-3"><div className="grid min-w-[980px] grid-cols-7 gap-2">{weekDays.map((day) => { const visits = filteredVisits.filter((visit) => sameDay(visit.scheduledStart, day)).sort((left, right) => left.scheduledStart - right.scheduledStart); const minutes = visits.reduce((sum, visit) => sum + durationMinutes(visit), 0); return <section key={day} className={cn("min-h-[430px] rounded-md border", sameDay(day, today) ? "border-[#789586] bg-[#f5f8f5]" : "border-stone-200 bg-stone-50")}><button type="button" onClick={() => { setSelectedDate(day); setMode("day"); }} className="w-full border-b border-stone-200 p-2 text-left"><span className="block text-[10px] font-bold uppercase text-stone-500">{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}</span><span className="mt-0.5 block text-lg font-bold">{new Date(day).getDate()}</span><span className="text-[10px] text-stone-500">{visits.length} stops - {(minutes / 60).toFixed(1)}h</span></button><div className="grid gap-1.5 p-1.5">{visits.map((visit) => renderCompactVisit(visit))}</div></section>; })}</div></div> : null}

        {mode === "month" ? <div className="p-3"><div className="grid grid-cols-7 border-l border-t border-stone-200">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="border-b border-r border-stone-200 bg-stone-50 p-2 text-center text-[10px] font-bold uppercase text-stone-500">{day}</div>)}{monthDays.map((day) => { const visits = filteredVisits.filter((visit) => sameDay(visit.scheduledStart, day)); const minutes = visits.reduce((sum, visit) => sum + durationMinutes(visit), 0); const inMonth = new Date(day).getMonth() === monthStart.getMonth(); return <button key={day} type="button" onClick={() => { setSelectedDate(day); setMode("day"); }} className={cn("min-h-24 border-b border-r border-stone-200 p-2 text-left hover:bg-stone-50", !inMonth && "bg-stone-50 text-stone-400", sameDay(day, today) && "ring-2 ring-inset ring-[#789586]")}><span className="text-xs font-bold">{new Date(day).getDate()}</span>{visits.length > 0 ? <><div className="mt-2 text-lg font-bold text-stone-900">{visits.length}</div><div className="text-[10px] text-stone-500">stops - {(minutes / 60).toFixed(1)}h</div><div className={cn("mt-2 h-1 rounded", minutes > Math.max(1, activeCrews.length) * 480 ? "bg-rose-500" : minutes > Math.max(1, activeCrews.length) * 360 ? "bg-amber-500" : "bg-emerald-600")} /></> : null}</button>; })}</div></div> : null}

        {mode === "agenda" ? <div className="divide-y divide-stone-100">{agendaVisits.length === 0 ? <div className="p-12 text-center text-sm text-stone-500">No visits match these filters in the next 14 days.</div> : agendaVisits.map((visit) => { const customer = customersById.get(visit.customerId); const property = propertiesById.get(visit.propertyId); const job = jobsById.get(visit.jobId); const crew = crewsById.get(visit.crewId); return <button key={visit.id} type="button" onClick={() => openVisit(visit)} className="grid w-full gap-2 px-3 py-3 text-left hover:bg-stone-50 md:grid-cols-[120px_120px_minmax(180px,1fr)_160px_110px] md:items-center"><span className="text-xs font-bold">{shortDate(visit.scheduledStart)}</span><span className="text-xs font-semibold">{timeRange(visit.scheduledStart, visit.scheduledEnd)}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{customer?.name ?? "Customer"}</span><span className="block truncate text-xs text-stone-500">{job?.title} - {property?.city}</span></span><span className="text-xs font-semibold text-stone-600">{crew?.name ?? "Unassigned"}</span><Pill tone={statusTone(visit.status)}>{visitStatusLabel(visit.status)}</Pill></button>; })}</div> : null}
      </section>

      {drawerMode ? <div className="fixed inset-0 z-50 flex justify-end">
        <button type="button" aria-label="Close calendar drawer" onClick={() => { setDrawerMode(null); setNotice(null); }} className="absolute inset-0 bg-black/25" />
        <aside role="dialog" aria-modal="true" aria-label={drawerMode === "visit" ? "Visit details" : "Schedule visit"} className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-stone-200 bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3"><div><div className="text-xs font-bold uppercase text-[#315a4d]">{drawerMode === "visit" ? "Visit inspector" : "Schedule work"}</div><h3 className="mt-0.5 text-lg font-bold">{drawerMode === "visit" ? customersById.get(activeVisit?.customerId ?? "")?.name ?? "Visit" : "Add to calendar"}</h3></div><button type="button" onClick={() => { setDrawerMode(null); setNotice(null); }} aria-label="Close drawer" className="grid h-9 w-9 place-items-center rounded-md hover:bg-stone-100"><X size={18} /></button></div>

          {drawerMode === "visit" && activeVisit ? <form onSubmit={saveVisit} className="grid gap-4 p-4">
            {(() => { const property = propertiesById.get(activeVisit.propertyId); const job = jobsById.get(activeVisit.jobId); const plan = workspace.recurringServicePlans.find((candidate) => candidate.generatedVisitIds?.includes(activeVisit.id)) ?? workspace.recurringServicePlans.find((candidate) => candidate.jobId === activeVisit.jobId && candidate.status === "active"); const signal = routeSignals.get(activeVisit.id); const address = property ? `${property.street}, ${property.city}, ${property.state} ${property.postalCode}` : ""; return <>
              <div className="rounded-md border border-stone-200 bg-stone-50 p-3"><div className="font-bold">{job?.title ?? "Service visit"}</div><div className="mt-1 text-sm text-stone-600">{address || "No property address"}</div><div className="mt-2 flex flex-wrap gap-2"><Pill tone={statusTone(activeVisit.status)}>{visitStatusLabel(activeVisit.status)}</Pill><Pill>{plan ? frequencyLabel(plan.frequency, plan.intervalDays) : "One-time"}</Pill>{conflictIds.has(activeVisit.id) ? <Pill tone="danger">Schedule conflict</Pill> : null}</div></div>
              {signal && (signal.warnings.length > 0 || signal.equipmentConflicts.length > 0 || ["medium", "high"].includes(signal.weatherRisk)) ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="flex items-center gap-2 font-bold"><AlertTriangle size={15} />Dispatch checks</div><ul className="mt-2 grid gap-1 text-xs">{[...signal.warnings, ...signal.equipmentConflicts, ...(["medium", "high"].includes(signal.weatherRisk) ? [`${signal.weatherRisk} weather risk`] : [])].map((warning) => <li key={warning}>- {warning}</li>)}</ul></div> : null}
              <div className="grid grid-cols-2 gap-3"><InputLabel label="Service date"><input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} className="h-10 rounded-md border border-stone-200 px-3 text-sm" /></InputLabel><InputLabel label="Start time"><input type="time" value={editTime} onChange={(event) => setEditTime(event.target.value)} className="h-10 rounded-md border border-stone-200 px-3 text-sm" /></InputLabel></div>
              <div className="grid grid-cols-2 gap-3"><InputLabel label="Duration"><select value={editDuration} onChange={(event) => setEditDuration(Number(event.target.value))} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm">{[30, 45, 60, 90, 120, 180, 240, 360, 480].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} hr${minutes === 60 ? "" : "s"}`}</option>)}</select></InputLabel><InputLabel label="Route stop"><input type="number" min={1} value={editRouteOrder} onChange={(event) => setEditRouteOrder(Number(event.target.value))} className="h-10 rounded-md border border-stone-200 px-3 text-sm" /></InputLabel></div>
              <InputLabel label="Crew"><select value={editCrewId} onChange={(event) => setEditCrewId(event.target.value)} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm"><option value="">Unassigned</option>{workspace.crews.filter((crew) => crew.active).map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select></InputLabel>
              <InputLabel label="Status"><select value={editStatus} onChange={(event) => setEditStatus(event.target.value as JobVisit["status"])} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm">{visitStatuses.map((status) => <option key={status} value={status}>{visitStatusLabel(status)}</option>)}</select></InputLabel>
              {notice ? <div role="status" className={cn("rounded-md border p-3 text-sm", notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800")}>{notice.text}</div> : null}
              <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#224036] px-3 text-sm font-bold text-white disabled:opacity-50"><Check size={16} />{saving ? "Saving..." : "Save visit"}</button>
              <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { setSelectedVisitId(activeVisit.id); setView("field"); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-200 text-sm font-bold hover:bg-stone-50"><UsersRound size={15} />Open field work</button>{property ? <a href={googleMapsUrl(address)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-200 text-sm font-bold hover:bg-stone-50"><MapPin size={15} />Directions</a> : <span />}</div>
            </>; })()}
          </form> : null}

          {drawerMode === "schedule" ? <form onSubmit={submitSchedule} className="grid gap-4 p-4">
            <div className="grid grid-cols-2 rounded-md border border-stone-200 bg-stone-50 p-1"><button type="button" onClick={() => setScheduleType("once")} className={cn("h-9 rounded text-sm font-bold", scheduleType === "once" ? "bg-white text-[#224036] shadow-sm" : "text-stone-500")}>One-time</button><button type="button" onClick={() => setScheduleType("repeat")} className={cn("h-9 rounded text-sm font-bold", scheduleType === "repeat" ? "bg-white text-[#224036] shadow-sm" : "text-stone-500")}>Recurring</button></div>
            <InputLabel label="Customer job"><select value={scheduleJobId} onChange={(event) => setScheduleJobId(event.target.value)} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm"><option value="">Choose a job</option>{workspace.jobs.filter((job) => job.status !== "canceled").map((job) => <option key={job.id} value={job.id}>{customersById.get(job.customerId)?.name ?? "Customer"} - {job.title}</option>)}</select></InputLabel>
            <div className="grid grid-cols-2 gap-3"><InputLabel label="Service date"><input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} className="h-10 rounded-md border border-stone-200 px-3 text-sm" /></InputLabel><InputLabel label="Start time"><input type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} className="h-10 rounded-md border border-stone-200 px-3 text-sm" /></InputLabel></div>
            <div className="grid grid-cols-2 gap-3"><InputLabel label="Duration"><select value={scheduleDuration} onChange={(event) => setScheduleDuration(Number(event.target.value))} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm">{[30, 45, 60, 90, 120, 180, 240, 360, 480].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} hr${minutes === 60 ? "" : "s"}`}</option>)}</select></InputLabel><InputLabel label="Crew"><select value={scheduleCrewId} onChange={(event) => setScheduleCrewId(event.target.value)} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm"><option value="">Unassigned</option>{workspace.crews.filter((crew) => crew.active).map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}</select></InputLabel></div>
            {scheduleType === "repeat" ? <div className="grid grid-cols-2 gap-3 rounded-md border border-stone-200 bg-stone-50 p-3"><InputLabel label="Cadence"><select value={scheduleFrequency} onChange={(event) => setScheduleFrequency(event.target.value as typeof scheduleFrequency)} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm"><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Monthly</option><option value="seasonal">Seasonal</option></select></InputLabel><InputLabel label="Visits"><select value={scheduleCount} onChange={(event) => setScheduleCount(Number(event.target.value))} className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm"><option value={4}>4 visits</option><option value={8}>8 visits</option><option value={12}>12 visits</option><option value={26}>26 visits</option></select></InputLabel></div> : null}
            {notice ? <div role="status" className={cn("rounded-md border p-3 text-sm", notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800")}>{notice.text}</div> : null}
            <button type="submit" disabled={saving || !workspace.jobs.length} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#224036] px-3 text-sm font-bold text-white disabled:opacity-50"><Plus size={16} />{saving ? "Scheduling..." : scheduleType === "once" ? "Add visit" : "Create recurring visits"}</button>
            {workspace.recurringServicePlans.some((plan) => plan.status === "active") ? <div aria-label="Active service cadences" className="border-t border-stone-200 pt-4"><div className="text-xs font-bold uppercase text-stone-500">Active cadences</div><div className="mt-2 grid gap-2">{workspace.recurringServicePlans.filter((plan) => plan.status === "active").slice(0, 5).map((plan) => <div key={plan.id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate font-medium">{customersById.get(plan.customerId)?.name ?? plan.name}</span><Pill>{frequencyLabel(plan.frequency, plan.intervalDays)}</Pill></div>)}</div></div> : null}
          </form> : null}
        </aside>
      </div> : null}
    </div>
  );
}
