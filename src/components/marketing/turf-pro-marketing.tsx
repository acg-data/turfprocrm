import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CloudSun,
  Database,
  DollarSign,
  Filter,
  Leaf,
  MapPin,
  Route as RouteIcon,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { marketingNav, type MarketingPage, productModules } from "@/data/marketing";
import styles from "./turf-pro-marketing.module.css";

const route = (href: string) => href as Route;

function Brand() {
  return (
    <Link href="/" className={styles.brand}>
      <span className={styles.mark} aria-hidden="true">
        <Leaf size={22} />
      </span>
      <span className={styles.brandText}>
        <span className={styles.brandName}>Turf Pro</span>
        <span className={styles.brandSub}>CRM</span>
      </span>
    </Link>
  );
}

function MarketingNav() {
  return (
    <header className={styles.mast}>
      <div className={`${styles.wrap} ${styles.mastInner}`}>
        <Brand />
        <nav className={styles.nav} aria-label="Marketing navigation">
          {marketingNav.map((item) => (
            <Link key={item.href} href={route(item.href)} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          <Link href={route("/signin")} className={styles.buttonSoft}>
            Sign in
          </Link>
          <Link href={route("/signin")} className={styles.button}>
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

function ProductWorkbench() {
  return (
    <figure className={styles.workbench} aria-label="Turf Pro CRM operating workbench preview">
      <div className={styles.boardTop}>
        <div>
          <div className={styles.boardTitle}>Greenline operating board</div>
          <div className={styles.boardMeta}>Convex live workspace</div>
        </div>
        <span className={styles.pill}>Source of truth</span>
      </div>
      <div className={styles.boardGrid}>
        <div className={styles.surface}>
          <div className={styles.metricRow}>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Pipeline</div>
              <div className={styles.metricValue}>$16k</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Visits</div>
              <div className={styles.metricValue}>2</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>AR</div>
              <div className={styles.metricValue}>$6.5k</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Margin</div>
              <div className={styles.metricValue}>86%</div>
            </div>
          </div>
          <div className={styles.lane} style={{ marginTop: "var(--space-md)" }}>
            {[
              ["Lead Ops", "Megan Walsh", "Mosquito and tick package"],
              ["Dispatch", "Brookside HOA", "Six-step season"],
              ["Costing", "Northgate Park", "Weekly maintenance"],
            ].map(([stage, account, title]) => (
              <div key={stage} className={styles.ticket}>
                <div className={styles.laneHeader}>
                  <span>{stage}</span>
                  <span>ready</span>
                </div>
                <strong>{account}</strong>
                <small>{title}</small>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.surfaceDark}>
          <div className={styles.laneHeader} style={{ color: "inherit" }}>
            <span>Today route</span>
            <MapPin size={16} />
          </div>
          <div className={styles.routeRows} style={{ marginTop: "var(--space-md)" }}>
            {[
              ["1", "Brookside common areas", "8:30 AM"],
              ["2", "Northgate Building 4", "11:00 AM"],
              ["3", "Megan Walsh estimate", "2:45 PM"],
            ].map(([index, label, time]) => (
              <div key={index} className={styles.routeRow}>
                <span className={styles.routeNumber}>{index}</span>
                <span>{label}</span>
                <span className={styles.routeTime}>{time}</span>
              </div>
            ))}
          </div>
          <div className={styles.pillRow} style={{ marginTop: "var(--space-lg)" }}>
            <span className={styles.pill}>Checklist</span>
            <span className={styles.pill}>Weather</span>
            <span className={styles.pill}>Materials</span>
          </div>
        </div>
      </div>
    </figure>
  );
}

function HomeHero() {
  return (
    <section className={styles.hero}>
      <div className={`${styles.wrap} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Landscape / Pest SaaS</p>
          <h1 className={styles.title}>
            The outdoor CRM that follows the work.
          </h1>
          <p className={styles.lede}>
            Turf Pro CRM connects lead operations, customer records, estimates, dispatch, field completion, admin controls, and job costing for landscaping and pest-control operators.
          </p>
          <div className={styles.heroActions}>
            <Link href={route("/signin")} className={styles.button}>
              Start from sign in
            </Link>
            <Link href={route("/features")} className={styles.buttonSoft}>
              See pages
            </Link>
          </div>
          <div className={styles.proofRail} aria-label="Product proof points">
            {["Multi-tenant Convex backend", "Lead Ops command table", "Mobile field PWA", "Job-costing and profit dashboard"].map((item) => (
              <span key={item} className={styles.proofItem}>{item}</span>
            ))}
          </div>
        </div>
        <ProductWorkbench />
      </div>
    </section>
  );
}

function OperatingBand() {
  return (
    <section className={styles.band}>
      <div className={`${styles.wrap} ${styles.bandGrid}`}>
        <div className={styles.bandText}>One operating record from first lead to collected revenue.</div>
        <div className={styles.bandItems}>
          {[
            "Lead",
            "Estimate",
            "Visit",
            "Profit",
          ].map((item) => (
            <div key={item} className={styles.bandItem}>{item}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModuleIcon({ label }: { label: string }) {
  const icons: Record<string, ReactNode> = {
    "Lead Ops": <Filter size={18} />,
    CRM: <UsersRound size={18} />,
    Estimating: <DollarSign size={18} />,
    Dispatch: <CalendarDays size={18} />,
    "Field PWA": <RouteIcon size={18} />,
    "Job Costing": <BarChart3 size={18} />,
    "Cost Intel": <CloudSun size={18} />,
    Admin: <ShieldCheck size={18} />,
  };
  return icons[label] ?? <Database size={18} />;
}

function ProductModules() {
  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Product areas</p>
          <h2 className={styles.sectionTitle}>Built as modules, not loose tabs.</h2>
          <p className={styles.sectionLede}>
            Each page below mirrors a real area already represented in the app and backend, so the marketing surface can sell the product you are actually building.
          </p>
        </div>
        <div className={styles.moduleGrid}>
          {productModules.map((feature) => (
            <Link key={feature.label} href={route(feature.href)} className={styles.moduleCard}>
              <div className={styles.moduleTop}>
                <span className={styles.moduleLabel}>{feature.label}</span>
                <ModuleIcon label={feature.label} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              <span className={styles.moduleLink}>
                View page <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className={styles.section}>
      <div className={`${styles.wrap} ${styles.split}`}>
        <div>
          <p className={styles.eyebrow}>Workflow</p>
          <h2 className={styles.sectionTitle}>The same job, seen by sales, dispatch, field, and owner.</h2>
          <p className={styles.sectionLede}>
            The front page keeps the Turf Pro CRM feel from your pasted design, then anchors it in the deeper SaaS architecture: tenant records, workflow states, cost snapshots, audit events, and profit summaries.
          </p>
          <div className={styles.heroActions} style={{ marginTop: "var(--space-lg)" }}>
            <Link href={route("/job-costing")} className={styles.button}>
              Follow the money
            </Link>
            <Link href={route("/dispatch")} className={styles.buttonSoft}>
              Follow the route
            </Link>
          </div>
        </div>
        <div className={styles.splitVisual}>
          <div className={styles.timeline}>
            {[
              ["Lead arrives", "Owner, source, status, grade, program, spam and quality score"],
              ["Estimate accepted", "Service catalog, line items, property area, price book context"],
              ["Visit scheduled", "Crew assignment, route order, maps link, weather snapshot"],
              ["Work submitted", "Checklist, materials, issue flags, timesheet, audit events"],
              ["Profit reviewed", "Revenue, AR, labor, material, equipment, overhead, margin"],
            ].map(([title, body]) => (
              <div key={title} className={styles.timelineItem}>
                <span className={styles.timelineDot} />
                <div>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className={`${styles.section} ${styles.pricing}`}>
      <div className={styles.wrap}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Commercial path</p>
          <h2 className={styles.sectionTitle}>Pricing pages without fake proof.</h2>
          <p className={styles.sectionLede}>
            The billing model is ready for plan gates and seats. Live Stripe checkout is still a next-phase integration, so this page keeps the commercial message honest.
          </p>
        </div>
        <div className={styles.priceGrid}>
          {[
            ["Starter", "Small crews proving the workflow", ["Lead Ops", "CRM", "Dispatch", "Field PWA"]],
            ["Pro", "Growing operators tracking cost", ["Everything in Starter", "Job costing", "Rate cards", "Profit dashboard"]],
            ["Growth", "Multi-crew teams with admin depth", ["Everything in Pro", "Advanced roles", "Cost snapshots", "Reporting export boundary"]],
          ].map(([name, body, bullets]) => (
            <article key={name as string} className={styles.priceCard}>
              <h3>{name}</h3>
              <p>{body}</p>
              <div className={styles.price}>Price to confirm</div>
              <ul className={styles.list}>
                {(bullets as string[]).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResourceSection() {
  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Sales enablement</p>
          <h2 className={styles.sectionTitle}>Pages that explain why this is not generic CRM.</h2>
        </div>
        <div className={styles.resourceGrid}>
          {[
            ["Arborgold and Aspire gap", "Position the product as operational depth with Jobber-level usability."],
            ["Lead import checklist", "Show operators how to clean source, status, owner, program, and quality fields."],
            ["Job-costing demo script", "Walk from estimate to visit completion to profit dashboard."],
          ].map(([title, body]) => (
            <article key={title} className={styles.resourceCard}>
              <h3>{title}</h3>
              <p>{body}</p>
              <Link href={route("/resources")} className={styles.miniLink}>
                Read more <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.wrap} ${styles.footerInner}`}>
        <div className={styles.footerLead}>
          <h2>Ready to turn the MVP into a sellable SaaS?</h2>
          <p>
            Keep the landing page focused on operator pain, then route serious visitors into the live app, module pages, and demo workflow.
          </p>
        </div>
        <div>
          <div className={styles.footLinks}>
            {[...marketingNav, { label: "Integrations", href: "/integrations" }, { label: "Sign in", href: "/signin" }].map((item) => (
              <Link key={item.href} href={route(item.href)} className={styles.footLink}>
                {item.label}
              </Link>
            ))}
          </div>
          <p className={styles.copyright} style={{ marginTop: "var(--space-lg)" }}>
            Turf Pro CRM, production MVP in progress.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function TurfProLandingPage() {
  return (
    <main className={styles.site}>
      <MarketingNav />
      <HomeHero />
      <OperatingBand />
      <ProductModules />
      <WorkflowSection />
      <PricingSection />
      <ResourceSection />
      <Footer />
    </main>
  );
}

export function TurfProMarketingPage({ page }: { page: MarketingPage }) {
  return (
    <main className={styles.site}>
      <MarketingNav />
      <section className={styles.pageHero}>
        <div className={`${styles.wrap} ${styles.pageHeroGrid}`}>
          <div>
            <p className={styles.eyebrow}>{page.eyebrow}</p>
            <h1 className={styles.pageTitle}>{page.title}</h1>
          </div>
          <div>
            <p className={styles.lede}>{page.lede}</p>
            <div className={styles.heroActions} style={{ marginTop: "var(--space-lg)" }}>
              <Link href={route("/signin")} className={styles.button}>{page.primaryAction}</Link>
              <Link href={route("/")} className={styles.buttonSoft}>Back home</Link>
            </div>
            <div className={styles.pageProof} style={{ marginTop: "var(--space-lg)" }}>
              {page.proof.map((item) => <span key={item} className={styles.pill}>{item}</span>)}
            </div>
          </div>
        </div>
      </section>
      <section className={styles.pageBody}>
        <div className={`${styles.wrap} ${styles.pageGrid}`}>
          {page.sections.map((section) => (
            <article key={section.title} className={styles.pagePanel}>
              <Check size={20} color="var(--color-accent-dark)" />
              <h2>{section.title}</h2>
              <p>{section.body}</p>
              <ul className={styles.list}>
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
