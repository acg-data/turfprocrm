import { LandscapeOsApp } from "@/components/app/landscape-os-app";
import Link from "next/link";

export default async function OperatingAppPage({ searchParams }: { searchParams: Promise<{ billing?: string | string[] }> }) {
  const billing = (await searchParams).billing;
  const notice = billing === "success"
    ? { tone: "border-emerald-200 bg-emerald-50 text-emerald-900", title: "Billing connected", body: "Your subscription is being activated. You can start using the workspace now." }
    : billing === "canceled"
      ? { tone: "border-amber-200 bg-amber-50 text-amber-900", title: "Checkout canceled", body: "Nothing was charged. Return to Account & billing whenever you are ready." }
      : null;

  return (
    <>
      {notice ? (
        <aside className={`fixed right-4 top-4 z-50 w-[min(24rem,calc(100%-2rem))] rounded-lg border p-4 shadow-lg ${notice.tone}`} aria-live="polite">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-bold">{notice.title}</div>
              <p className="mt-1 text-sm leading-6">{notice.body}</p>
            </div>
            <Link href="/app" aria-label="Dismiss billing notice" className="text-lg leading-none">×</Link>
          </div>
        </aside>
      ) : null}
      <LandscapeOsApp />
    </>
  );
}
