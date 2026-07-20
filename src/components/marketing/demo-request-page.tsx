"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, CalendarCheck, CheckCircle2, Send } from "lucide-react";

const inputClass = "min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-[#2f6b4f] focus:ring-2 focus:ring-[#2f6b4f]/15";

export function DemoRequestPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setName(String(data.get("name") ?? "").trim());
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-[#f5f6f1] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-5">
          <Link href="/" className="text-base font-extrabold text-[#224036]">TURF PRO CRM</Link>
          <Link href="/app?demo=established" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 hover:bg-stone-50">
            Explore live sample
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-5 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
        <div className="self-start">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2f6b4f]"><ArrowLeft size={16} /> Back home</Link>
          <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-[#2f6b4f]"><CalendarCheck size={18} /> Product walkthrough</div>
          <h1 className="mt-3 text-4xl font-bold tracking-normal sm:text-5xl">Book a Turf Pro CRM demo</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-stone-600">Tell us about your operation. We will tailor the walkthrough around sales, scheduling, field work, job costing, or retention.</p>
        </div>

        {submitted ? (
          <div className="rounded-md border border-emerald-200 bg-white p-8 shadow-sm" role="status">
            <CheckCircle2 size={36} className="text-emerald-700" />
            <h2 className="mt-5 text-2xl font-bold">Request submitted</h2>
            <p className="mt-3 leading-7 text-stone-600">Thanks{name ? `, ${name}` : ""}. Your demo request is ready for the sales team to review.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/app?demo=established" className="inline-flex min-h-11 items-center rounded-md bg-[#224036] px-4 text-sm font-semibold text-white">Open live sample</Link>
              <button type="button" onClick={() => setSubmitted(false)} className="min-h-11 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800">Submit another</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-5 rounded-md border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">Your name<input required name="name" autoComplete="name" className={inputClass} /></label>
              <label className="grid gap-2 text-sm font-semibold">Company<input required name="company" autoComplete="organization" className={inputClass} /></label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">Work email<input required type="email" name="email" autoComplete="email" className={inputClass} /></label>
              <label className="grid gap-2 text-sm font-semibold">Phone <span className="font-normal text-stone-500">optional</span><input type="tel" name="phone" autoComplete="tel" className={inputClass} /></label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">Primary business
                <select required name="industry" className={inputClass} defaultValue="">
                  <option value="" disabled>Select one</option>
                  <option>Landscaping</option><option>Lawn care</option><option>Pest control</option><option>Tree and shrub</option><option>Multi-service</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">Team size
                <select required name="teamSize" className={inputClass} defaultValue="">
                  <option value="" disabled>Select one</option>
                  <option>Just me</option><option>2-5 people</option><option>6-20 people</option><option>21-50 people</option><option>51+ people</option>
                </select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">What should we cover? <span className="font-normal text-stone-500">optional</span><textarea name="notes" rows={4} className={`${inputClass} py-3`} placeholder="Scheduling, route planning, chemical tracking, job costing..." /></label>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#224036] px-4 text-sm font-semibold text-white hover:bg-[#183228]"><Send size={16} /> Submit demo request</button>
          </form>
        )}
      </section>
    </main>
  );
}
