import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BarChart3, Check, ClipboardList, Filter } from "lucide-react";
import { getMarketingPage, productModules } from "@/data/marketing";
import { MarketingNav } from "./chrome";
import { Footer } from "./footer";
import { Reveal, Stagger, StaggerItem } from "./reveal";
import styles from "./turf-pro-marketing.module.css";

const route = (href: string) => href as Route;
const page = getMarketingPage("features")!;

const showcases = [
  {
    icon: Filter,
    title: "A lead table that works like an operating queue",
    body: "Filter, grade, bulk-move, and convert leads without losing the source, owner, program, or follow-up trail. Spam and duplicate detection keep the list clean automatically.",
    bullets: ["Saved views per rep or territory", "Quality and spam scoring on every lead", "One-click convert to opportunity or estimate"],
    visual: [
      { label: "Megan Walsh", meta: "Website · A grade" },
      { label: "Brookside HOA", meta: "Referral · Converted" },
      { label: "Northgate Park", meta: "Phone · Estimate sent" },
    ],
  },
  {
    icon: ClipboardList,
    title: "A field app crews actually want to use",
    body: "The mobile PWA keeps technicians focused on the day: job list, checklist, materials, notes, and issue flags — no desktop CRM navigation required in the yard.",
    bullets: ["Checklist completion with photo capture", "Issue flags create manager follow-up tasks", "Materials and timesheets feed job costing automatically"],
    visual: [
      { label: "Pre-treatment inspection", meta: "Done · 8:42 AM" },
      { label: "Apply granular fertilizer", meta: "In progress" },
      { label: "Photo — before/after", meta: "Pending" },
    ],
  },
  {
    icon: BarChart3,
    title: "Know what a job costs while it's still useful to know",
    body: "Labor, materials, equipment, and overhead roll up to a real margin per job, crew, and customer — not a spreadsheet built after the season ends.",
    bullets: ["Estimated vs. actual on every job", "Gross profit and margin by crew or service line", "Hourly recalculation, always current"],
    visual: [
      { label: "Labor", meta: "$1,240" },
      { label: "Materials", meta: "$380" },
      { label: "Gross margin", meta: "71%" },
    ],
  },
];

export function FeaturesPage() {
  return (
    <main className={styles.site}>
      <MarketingNav />

      <section className={styles.pageHero}>
        <div className={`${styles.wrap} ${styles.pageHeroGrid}`}>
          <Reveal immediate>
            <p className={styles.eyebrow}>{page.eyebrow}</p>
            <h1 className={styles.pageTitle}>{page.title}</h1>
          </Reveal>
          <Reveal immediate step={1}>
            <p className={styles.lede}>{page.lede}</p>
            <div className={styles.heroActions} style={{ marginTop: "var(--space-lg)" }}>
              <Link href={route("/signin")} className={styles.button}>
                Start free <ArrowRight size={16} />
              </Link>
              <Link href={route("/pricing")} className={styles.buttonSoft}>
                See pricing
              </Link>
            </div>
            <div className={styles.pageProof} style={{ marginTop: "var(--space-lg)" }}>
              {page.proof.map((item) => (
                <span key={item} className={styles.pill}>
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {showcases.map((item, index) => (
        <section key={item.title} className={styles.showcase}>
          <div className={styles.wrap}>
            <div className={`${styles.showcaseRow} ${index % 2 === 1 ? styles.showcaseReverse : ""}`}>
              <Reveal className={styles.showcaseCopy}>
                <p className={styles.eyebrow}>0{index + 1}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <div className={styles.featureBullets}>
                  {item.bullets.map((bullet) => (
                    <div key={bullet} className={styles.featureBullet}>
                      <span className={styles.featureBulletIcon}>
                        <Check size={12} />
                      </span>
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
              <Reveal step={1}>
                <div className={styles.showcaseVisual}>
                  <div className={styles.showcaseVisualHeader}>
                    <span>
                      <item.icon size={16} style={{ marginRight: 6, verticalAlign: "-3px" }} />
                      Live preview
                    </span>
                    <span className={styles.pill}>Convex data</span>
                  </div>
                  <div className={styles.showcaseRows}>
                    {item.visual.map((row) => (
                      <div key={row.label} className={styles.showcaseChip}>
                        <span className={styles.showcaseChipDot} aria-hidden="true" />
                        <span>{row.label}</span>
                        <span className={styles.showcaseChipMeta}>{row.meta}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      ))}

      <section className={styles.section}>
        <div className={styles.wrap}>
          <Reveal>
            <div className={styles.sectionHeader}>
              <p className={styles.eyebrow}>Everything included</p>
              <h2 className={styles.sectionTitle}>Eight modules, one workspace.</h2>
              <p className={styles.sectionLede}>No add-on tiers to unlock the features operators actually need — every module below ships in Starter and Pro.</p>
            </div>
          </Reveal>
          <Stagger className={styles.moduleGrid}>
            {productModules.map((feature) => (
              <StaggerItem key={feature.label}>
                <Link href={route(feature.href)} className={styles.moduleCard}>
                  <div className={styles.moduleTop}>
                    <span className={styles.moduleLabel}>{feature.label}</span>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                  <span className={styles.moduleLink}>
                    View page <ArrowRight size={16} />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <Footer year={new Date().getFullYear()} />
    </main>
  );
}
