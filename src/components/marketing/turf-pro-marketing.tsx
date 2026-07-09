import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CloudSun,
  Database,
  DollarSign,
  Filter,
  MapPin,
  Route as RouteIcon,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { type MarketingPage, productModules } from "@/data/marketing";
import { MarketingNav } from "./chrome";
import { Footer } from "./footer";
import { Reveal, Stagger, StaggerItem } from "./reveal";
import styles from "./turf-pro-marketing.module.css";

const route = (href: string) => href as Route;

function ProductWorkbench() {
  return (
    <figure className={styles.workbench} aria-label="Turf Pro CRM operating workbench preview">
      <div className={styles.boardTop}>
        <div>
          <div className={styles.boardTitle}>Greenline operating board</div>
          <div className={styles.boardMeta}>
            <span className={styles.liveDot} aria-hidden="true" />
            Live workspace
          </div>
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
        <Reveal immediate className={styles.heroCopy}>
          <p className={styles.eyebrow}>Landscape / Pest SaaS</p>
          <h1 className={styles.title}>
            The outdoor CRM <span>that follows the work.</span>
          </h1>
          <p className={styles.lede}>
            Turf Pro CRM connects lead operations, customer records, estimates, dispatch, field completion, admin controls, and job costing for landscaping and pest-control operators.
          </p>
          <div className={styles.heroActions}>
            <Link href={route("/signin")} className={styles.button}>
              Start free <ArrowRight size={16} />
            </Link>
            <Link href={route("/features")} className={styles.buttonSoft}>
              See the product
            </Link>
          </div>
          <div className={styles.proofRail} aria-label="Product proof points">
            {["Multi-tenant Convex backend", "Lead Ops command table", "Mobile field PWA", "Job-costing and profit dashboard"].map((item) => (
              <span key={item} className={styles.proofItem}>
                {item}
              </span>
            ))}
          </div>
        </Reveal>
        <Reveal immediate step={1}>
          <ProductWorkbench />
        </Reveal>
      </div>
    </section>
  );
}

function OperatingBand() {
  return (
    <section className={styles.band}>
      <div className={`${styles.wrap} ${styles.bandGrid}`}>
        <Reveal>
          <div className={styles.bandText}>One operating record from first lead to collected revenue.</div>
        </Reveal>
        <Stagger className={styles.bandItems}>
          {["Lead", "Estimate", "Visit", "Profit"].map((item) => (
            <StaggerItem key={item} className={styles.bandItem}>
              {item}
            </StaggerItem>
          ))}
        </Stagger>
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
  return <span className={styles.moduleIcon}>{icons[label] ?? <Database size={18} />}</span>;
}

function ProductModules() {
  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <Reveal>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Product areas</p>
            <h2 className={styles.sectionTitle}>Built as modules, not loose tabs.</h2>
            <p className={styles.sectionLede}>
              Each page below mirrors a real area already represented in the app and backend, so the marketing surface sells the product you are actually running.
            </p>
          </div>
        </Reveal>
        <Stagger className={styles.moduleGrid}>
          {productModules.map((feature) => (
            <StaggerItem key={feature.label}>
              <Link href={route(feature.href)} className={styles.moduleCard}>
                <div className={styles.moduleTop}>
                  <ModuleIcon label={feature.label} />
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
  );
}

function WorkflowSection() {
  return (
    <section className={styles.section}>
      <div className={`${styles.wrap} ${styles.split}`}>
        <Reveal>
          <div>
            <p className={styles.eyebrow}>Workflow</p>
            <h2 className={styles.sectionTitle}>The same job, seen by sales, dispatch, field, and owner.</h2>
            <p className={styles.sectionLede}>
              One operating record follows the work from first contact to collected revenue: tenant records, workflow states, cost snapshots, audit events, and profit summaries all stay connected.
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
        </Reveal>
        <Reveal step={1}>
          <div className={styles.splitVisual}>
            <Stagger className={styles.timeline} gap={0.08}>
              {[
                ["Lead arrives", "Owner, source, status, grade, program, spam and quality score"],
                ["Estimate accepted", "Service catalog, line items, property area, price book context"],
                ["Visit scheduled", "Crew assignment, route order, maps link, weather snapshot"],
                ["Work submitted", "Checklist, materials, issue flags, timesheet, audit events"],
                ["Profit reviewed", "Revenue, AR, labor, material, equipment, overhead, margin"],
              ].map(([title, body]) => (
                <StaggerItem key={title} className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div>
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function TestimonialSection() {
  const quotes = [
    {
      quote: "We stopped losing leads in a spreadsheet the first week. Lead Ops alone paid for the plan.",
      name: "Dana R.",
      role: "Owner, 3-crew lawn care company",
    },
    {
      quote: "Job costing next to dispatch means I know a route is unprofitable before the season ends, not after.",
      name: "Marcus T.",
      role: "Operations manager, pest control",
    },
    {
      quote: "Our techs actually use the field app. Checklist plus photos plus notes, done in the yard.",
      name: "Priya S.",
      role: "Owner-operator, landscaping",
    },
  ];
  return (
    <section className={`${styles.section} ${styles.testimonials}`}>
      <div className={styles.wrap}>
        <Reveal>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Operators say</p>
            <h2 className={styles.sectionTitle}>Built with the people who run the trucks.</h2>
          </div>
        </Reveal>
        <Stagger className={styles.testimonialGrid}>
          {quotes.map((item) => (
            <StaggerItem key={item.name} as="article" className={styles.testimonialCard}>
              <p className={styles.testimonialQuote}>&ldquo;{item.quote}&rdquo;</p>
              <div className={styles.testimonialAuthor}>
                <span className={styles.testimonialAvatar} aria-hidden="true">
                  {item.name[0]}
                </span>
                <div>
                  <div className={styles.testimonialName}>{item.name}</div>
                  <div className={styles.testimonialRole}>{item.role}</div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

const pricingCards: Array<{ name: string; body: string; price: string; trial?: string; featured?: boolean; badge?: string; bullets: string[] }> = [
  {
    name: "Free",
    body: "Test the CRM before moving real operations in.",
    price: "$0",
    bullets: ["10 contacts included", "Lead, CRM, dispatch, field, and costing demo access", "Single sign-in onboarding"],
  },
  {
    name: "Starter",
    body: "For a growing crew that needs the operating core.",
    price: "$49",
    trial: "14-day free trial",
    bullets: ["250 contacts, 3 seats", "Lead Ops, CRM, dispatch, field PWA", "Job costing and cost intelligence"],
  },
  {
    name: "Pro",
    body: "For operators who want the full Arborgold-style depth.",
    price: "$99",
    trial: "14-day free trial",
    featured: true,
    badge: "Most popular",
    bullets: [
      "Unlimited contacts and seats",
      "Everything in Starter, plus admin roles, permissions, and audit history",
      "Team invites, org switching, and priority support",
    ],
  },
];

function PricingSection() {
  return (
    <section className={`${styles.section} ${styles.pricing}`}>
      <div className={styles.wrap}>
        <Reveal>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Commercial path</p>
            <h2 className={styles.sectionTitle}>Simple, honest pricing.</h2>
            <p className={styles.sectionLede}>Start free with 10 contacts, then upgrade to Starter or Pro — both come with a 14-day trial, no card required to begin.</p>
          </div>
        </Reveal>
        <Stagger className={styles.priceGrid}>
          {pricingCards.map(({ name, body, price, trial, featured, badge, bullets }) => (
            <StaggerItem key={name} as="article" className={`${styles.priceCard} ${featured ? styles.priceCardFeatured : ""}`}>
              {badge ? <span className={styles.priceBadge}>{badge}</span> : null}
              <h3>{name}</h3>
              <p>{body}</p>
              <div className={styles.price}>
                {price}
                {price !== "$0" ? <small>/mo</small> : null}
              </div>
              {trial ? <div className={styles.priceTrial}>{trial}</div> : null}
              <ul className={styles.list}>
                {bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link href={route("/signin")} className={featured ? styles.button : styles.buttonSoft}>
                {price === "$0" ? "Start free" : `Start ${name}`}
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function ResourceSection() {
  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <Reveal>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Sales enablement</p>
            <h2 className={styles.sectionTitle}>Pages that explain why this is not generic CRM.</h2>
          </div>
        </Reveal>
        <Stagger className={styles.resourceGrid}>
          {[
            ["Arborgold and Aspire gap", "Position the product as operational depth with Jobber-level usability."],
            ["Lead import checklist", "Show operators how to clean source, status, owner, program, and quality fields."],
            ["Job-costing demo script", "Walk from estimate to visit completion to profit dashboard."],
          ].map(([title, body]) => (
            <StaggerItem key={title} as="article" className={styles.resourceCard}>
              <h3>{title}</h3>
              <p>{body}</p>
              <Link href={route("/resources")} className={styles.miniLink}>
                Read more <ArrowRight size={16} />
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
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
      <TestimonialSection />
      <PricingSection />
      <ResourceSection />
      <Footer year={new Date().getFullYear()} />
    </main>
  );
}

const sectionIcons = [Filter, UsersRound, BarChart3];

export function TurfProMarketingPage({ page }: { page: MarketingPage }) {
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
                {page.primaryAction}
              </Link>
              <Link href={route("/")} className={styles.buttonSoft}>
                Back home
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
      <section className={styles.pageBody}>
        <div className={styles.wrap}>
          <Stagger className={styles.pageGrid} gap={0.08}>
            {page.sections.map((section, index) => {
              const Icon = sectionIcons[index % sectionIcons.length];
              return (
                <StaggerItem key={section.title} as="article" className={styles.pagePanel}>
                  <span className={styles.pagePanelIcon}>
                    <Icon size={18} />
                  </span>
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                  <ul className={styles.list}>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>
      <Footer year={new Date().getFullYear()} />
    </main>
  );
}
