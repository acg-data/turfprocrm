import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f5f6f1] px-5 py-16 text-stone-950">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-[#2f6b4f]">Back to Turf Pro CRM</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-normal">Terms of Service</h1>
        <p className="mt-5 leading-7 text-stone-600">Turf Pro CRM is preparing for paid beta. These terms are a launch placeholder and are not a substitute for reviewed production terms.</p>
        <h2 className="mt-10 text-xl font-bold">Beta use</h2>
        <p className="mt-3 leading-7 text-stone-600">Beta access is intended for evaluation with authorized business data. Final subscription, acceptable use, support, payment, cancellation, warranty, and liability terms must be approved before accepting paying customers.</p>
      </article>
    </main>
  );
}
