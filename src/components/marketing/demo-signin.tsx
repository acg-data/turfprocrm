"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { DEMO_PASSWORD, nameFromEmail, setDemoUser } from "@/lib/demo-auth";

/**
 * Local demo sign-in shown when Clerk is not configured. Accepts any email
 * with the shared demo password and drops the visitor into /app identified as
 * that user. No real backend, no real security — see lib/demo-auth.ts.
 */
export function DemoSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("justin@aryocg.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password !== DEMO_PASSWORD) {
      setError("Incorrect demo password.");
      return;
    }
    setDemoUser({ name: nameFromEmail(trimmed), email: trimmed });
    router.push("/app");
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <LockKeyhole size={20} className="text-[#224036]" />
          Sign in to the demo
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          The live backend isn&apos;t connected in this environment, so this signs you into the interactive demo workspace as
          yourself.
        </p>
      </div>
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-normal text-stone-500">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 rounded-md border border-stone-200 px-3 text-sm normal-case text-stone-900 outline-none focus:border-[#315a4d] focus:ring-2 focus:ring-[#315a4d]/15"
            placeholder="you@company.com"
            required
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-normal text-stone-500">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 rounded-md border border-stone-200 px-3 text-sm normal-case text-stone-900 outline-none focus:border-[#315a4d] focus:ring-2 focus:ring-[#315a4d]/15"
            placeholder="Demo password"
            required
          />
        </label>
        {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#224036] px-4 text-sm font-semibold text-white transition hover:bg-[#1a332b]"
        >
          Sign in to demo
          <ArrowRight size={16} />
        </button>
        <p className="text-xs leading-5 text-stone-400">
          Demo password: <span className="font-mono font-semibold text-stone-600">{DEMO_PASSWORD}</span> — any email works.
        </p>
      </form>
    </div>
  );
}
