"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Sprout } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";

export function InvitePage({ token }: { token: string }) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <Shell>
        <h1 className="text-xl font-bold">Invitations are not available</h1>
        <p className="mt-2 text-sm leading-6 text-stone-500">This environment is not connected to the live backend.</p>
      </Shell>
    );
  }
  return <InvitePageLive token={token} />;
}

function InvitePageLive({ token }: { token: string }) {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const invite = useQuery(api.team.getInviteByToken, { token });
  const syncCurrentUser = useMutation(api.setup.syncCurrentUser);
  const acceptInvite = useMutation(api.team.acceptInvite);
  const [userSynced, setUserSynced] = useState(false);
  const syncStartedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || syncStartedRef.current) return;
    syncStartedRef.current = true;
    void syncCurrentUser({})
      .then(() => setUserSynced(true))
      .catch(() => setUserSynced(false));
  }, [isAuthenticated, syncCurrentUser]);

  async function accept() {
    setError(null);
    setAccepting(true);
    try {
      await acceptInvite({ token });
      router.push("/app");
    } catch (caught) {
      const message =
        caught && typeof caught === "object" && "data" in caught && caught.data && typeof caught.data === "object" && "message" in caught.data
          ? String((caught.data as { message: string }).message)
          : caught instanceof Error
            ? caught.message
            : "Could not accept the invitation.";
      setError(message);
      setAccepting(false);
    }
  }

  if (invite === undefined || authLoading) {
    return (
      <Shell>
        <h1 className="text-xl font-bold">Checking your invitation…</h1>
      </Shell>
    );
  }

  if (invite === null || invite.status !== "pending" || invite.expired) {
    return (
      <Shell>
        <h1 className="text-xl font-bold">This invitation is no longer valid</h1>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          {invite?.expired ? "It expired — ask your workspace admin to send a new one." : "It may have been revoked or already used."}
        </p>
        <Link href="/signin" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-[#224036] px-4 text-sm font-semibold text-white">
          Go to sign in
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-bold">Join {invite.organizationName}</h1>
      <p className="mt-2 text-sm leading-6 text-stone-500">
        You were invited as <strong className="text-stone-800">{invite.role.replace("_", " ")}</strong> using{" "}
        <strong className="text-stone-800">{invite.email}</strong>.
      </p>
      {!isAuthenticated ? (
        <>
          <p className="mt-3 text-sm leading-6 text-stone-500">Sign in (or create an account) with that email, then come back to this link.</p>
          <Link href="/signin" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-[#224036] px-4 text-sm font-semibold text-white">
            Sign in to continue
          </Link>
        </>
      ) : (
        <>
          {error ? <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          <button
            type="button"
            onClick={accept}
            disabled={!userSynced || accepting}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-[#224036] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {accepting ? "Joining…" : `Accept and join ${invite.organizationName}`}
          </button>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f1] px-4 text-stone-950">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center gap-3 font-bold text-[#224036]">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-[#e8efe8] text-[#2f6b4f]">
            <Sprout size={22} />
          </span>
          Turf Pro CRM
        </div>
        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">{children}</section>
      </div>
    </main>
  );
}
