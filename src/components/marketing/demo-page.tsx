"use client";

import { useMutation } from "convex/react";
import { motion } from "motion/react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { MarketingNav } from "./chrome";
import { Footer } from "./footer";
import { Reveal } from "./reveal";
import styles from "./turf-pro-marketing.module.css";
import formStyles from "./demo-page.module.css";

const whatWeCover = [
  "Walk through Lead Ops, dispatch, and field completion with your own workflow in mind",
  "See job costing and profit tracking on a job like the ones you actually run",
  "Get a straight answer on migration from Jobber, Arborgold, or a spreadsheet",
];

export function DemoPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <main className={styles.site}>
        <MarketingNav />
        <section className={styles.pageHero}>
          <div className={styles.wrap}>
            <p className={styles.eyebrow}>Talk to us</p>
            <h1 className={styles.pageTitle}>Demo requests aren&apos;t available in this preview.</h1>
            <p className={styles.lede}>Configure NEXT_PUBLIC_CONVEX_URL to enable the live form.</p>
          </div>
        </section>
        <Footer year={new Date().getFullYear()} />
      </main>
    );
  }
  return <DemoPageLive />;
}

function DemoPageLive() {
  const submitDemoRequest = useMutation(api.marketingLeads.submitDemoRequest);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", crewSize: "1-5", message: "" });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus("submitting");
    try {
      await submitDemoRequest({ ...form, source: "demo-page" });
      setStatus("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send that — try again.");
      setStatus("idle");
    }
  }

  return (
    <main className={styles.site}>
      <MarketingNav />
      <section className={styles.pageHero}>
        <div className={`${styles.wrap} ${styles.pageHeroGrid}`}>
          <Reveal>
            <p className={styles.eyebrow}>Talk to us</p>
            <h1 className={styles.pageTitle}>See it on your own leads, not a canned demo.</h1>
            <p className={styles.lede} style={{ marginTop: "var(--space-md)" }}>
              Fifteen minutes, no slide deck. We&apos;ll walk through the workspace using workflows that look like yours.
            </p>
            <div className={formStyles.coverList}>
              {whatWeCover.map((item) => (
                <div key={item} className={formStyles.coverItem}>
                  <span className={styles.featureBulletIcon}>
                    <Check size={12} />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal step={1}>
            <div className={formStyles.card}>
              {status === "done" ? (
                <motion.div
                  className={formStyles.doneState}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className={formStyles.doneIcon}>
                    <Sparkles size={22} />
                  </span>
                  <h3>Got it — we&apos;ll be in touch.</h3>
                  <p>Someone from the team will reach out within one business day to find a time that works.</p>
                </motion.div>
              ) : (
                <form onSubmit={onSubmit} className={formStyles.form}>
                  <div className={formStyles.row}>
                    <label className={formStyles.field}>
                      <span>Name</span>
                      <input
                        required
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                        placeholder="Jordan Reyes"
                      />
                    </label>
                    <label className={formStyles.field}>
                      <span>Company</span>
                      <input
                        required
                        value={form.company}
                        onChange={(event) => setForm({ ...form, company: event.target.value })}
                        placeholder="Reyes Lawn & Landscape"
                      />
                    </label>
                  </div>
                  <div className={formStyles.row}>
                    <label className={formStyles.field}>
                      <span>Email</span>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                        placeholder="jordan@reyeslawn.com"
                      />
                    </label>
                    <label className={formStyles.field}>
                      <span>Phone (optional)</span>
                      <input
                        value={form.phone}
                        onChange={(event) => setForm({ ...form, phone: event.target.value })}
                        placeholder="(555) 555-0100"
                      />
                    </label>
                  </div>
                  <label className={formStyles.field}>
                    <span>Crew size</span>
                    <select value={form.crewSize} onChange={(event) => setForm({ ...form, crewSize: event.target.value })}>
                      <option value="1">Just me</option>
                      <option value="1-5">1–5</option>
                      <option value="6-15">6–15</option>
                      <option value="16+">16+</option>
                    </select>
                  </label>
                  <label className={formStyles.field}>
                    <span>What are you hoping to solve? (optional)</span>
                    <textarea
                      rows={3}
                      value={form.message}
                      onChange={(event) => setForm({ ...form, message: event.target.value })}
                      placeholder="We're tracking leads in a spreadsheet and losing them."
                    />
                  </label>
                  {error ? <div className={formStyles.error}>{error}</div> : null}
                  <button type="submit" className={styles.button} disabled={status === "submitting"}>
                    {status === "submitting" ? (
                      <>
                        <Loader2 size={16} className={formStyles.spin} /> Sending…
                      </>
                    ) : (
                      "Request a demo"
                    )}
                  </button>
                  <p className={formStyles.privacyNote}>
                    By submitting, you agree that Turf Pro CRM may contact you about your request. See our <Link href="/privacy">Privacy Policy</Link>.
                  </p>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
      <Footer year={new Date().getFullYear()} />
    </main>
  );
}
