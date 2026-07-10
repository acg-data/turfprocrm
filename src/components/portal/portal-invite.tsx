"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { CheckCircle2, Leaf, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";

export function PortalInvite({ token }: { token: string }) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <Shell><h1>Portal invitations need the live environment</h1><p>Connect Clerk and Convex to activate secure customer invitations.</p><Link href="/portal">Preview the portal</Link></Shell>;
  }
  return <PortalInviteLive token={token} />;
}

function PortalInviteLive({ token }: { token: string }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const invite = useQuery(api.portal.getInviteByToken, { token });
  const syncUser = useMutation(api.setup.syncCurrentUser);
  const acceptInvite = useMutation(api.portal.acceptInvite);
  const started = useRef(false);
  const [synced, setSynced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!isAuthenticated || started.current) return;
    started.current = true;
    void syncUser({}).then(() => setSynced(true)).catch(() => setError("We couldn’t finish preparing your account. Try signing in again."));
  }, [isAuthenticated, syncUser]);
  async function accept() {
    setBusy(true); setError(null);
    try { await acceptInvite({ token }); router.push("/portal"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "We couldn’t activate this portal invitation."); setBusy(false); }
  }
  if (invite === undefined || isLoading) return <Shell><h1>Checking your invitation…</h1><p>Verifying the secure invitation and its expiration.</p></Shell>;
  if (!invite || invite.status !== "pending" || invite.expired) return <Shell><h1>This invitation is no longer available</h1><p>{invite?.expired ? "It expired. Ask the service company to send a new invitation." : "It may already have been accepted or revoked."}</p><Link href="/portal">Go to customer portal</Link></Shell>;
  return <Shell><span><LockKeyhole size={16} /> Secure customer invitation</span><h1>{invite.organizationName} invited you to your portal</h1><p>Activate access for <strong>{invite.email}</strong> to see estimates, visits, service reports, invoices, and messages.</p>{!isAuthenticated ? <Link href={`/signin?redirect_url=${encodeURIComponent(`/portal/invite/${token}`)}`}>Sign in or create account</Link> : <><div><CheckCircle2 /> Signed in. Your customer account is ready to link.</div>{error ? <p role="alert">{error}</p> : null}<button type="button" onClick={() => void accept()} disabled={!synced || busy}>{busy ? "Activating…" : "Activate my portal"}</button></>}</Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_10%,#dff0d5,transparent_32%),linear-gradient(135deg,#f8faf5,#edf4e9)] px-4 py-12 text-stone-950"><div className="mx-auto max-w-lg"><Link href="/" className="mb-5 flex items-center gap-3 font-bold text-[#0b4834]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b4834] text-white"><Leaf /></span>Turf Pro CRM</Link><section className="grid gap-4 rounded-2xl border border-[#d9e4d4] bg-white p-7 shadow-[0_24px_60px_rgba(10,60,40,.12)] [&>span]:flex [&>span]:w-fit [&>span]:items-center [&>span]:gap-2 [&>span]:rounded-full [&>span]:bg-emerald-50 [&>span]:px-3 [&>span]:py-1.5 [&>span]:text-xs [&>span]:font-bold [&>span]:text-emerald-800 [&>h1]:font-display [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-[#0b4834] [&>p]:text-sm [&>p]:leading-6 [&>p]:text-stone-600 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a]:justify-center [&>a]:rounded-xl [&>a]:bg-[#0b4834] [&>a]:px-4 [&>a]:text-sm [&>a]:font-bold [&>a]:text-white [&>a]:no-underline [&>button]:min-h-11 [&>button]:rounded-xl [&>button]:border-0 [&>button]:bg-[#0b4834] [&>button]:px-4 [&>button]:text-sm [&>button]:font-bold [&>button]:text-white [&>button]:disabled:opacity-50 [&>div]:flex [&>div]:items-center [&>div]:gap-2 [&>div]:rounded-xl [&>div]:bg-emerald-50 [&>div]:p-3 [&>div]:text-sm [&>div]:text-emerald-800">{children}</section></div></main>;
}
