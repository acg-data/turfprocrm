import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f5f6f1] px-5 py-16 text-stone-950">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-[#2f6b4f]">Back to Turf Pro CRM</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-normal">Privacy Policy</h1>
        <p className="mt-5 leading-7 text-stone-600">Turf Pro CRM is preparing for paid beta. This page is a launch placeholder and will be replaced by the reviewed production privacy policy before customer data is accepted.</p>
        <h2 className="mt-10 text-xl font-bold">Beta data handling</h2>
        <p className="mt-3 leading-7 text-stone-600">Account, workspace, billing, and operational data are used to provide the service, secure tenant access, and support customers. Production retention, subprocessors, deletion, and contact terms must be finalized before public launch.</p>
      </article>
    </main>
  );
}
