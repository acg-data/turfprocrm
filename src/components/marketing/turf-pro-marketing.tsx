import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bug,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  CloudUpload,
  Filter,
  Headset,
  Leaf,
  Mountain,
  Navigation,
  Plug,
  ShieldCheck,
  Smartphone,
  Sprout,
  ThumbsUp,
  TreePine,
  UsersRound,
  Workflow,
} from "lucide-react";
import type { MarketingPage } from "@/data/marketing";
import { MarketingNav } from "./chrome";
import { Footer } from "./footer";
import { Reveal, Stagger, StaggerItem } from "./reveal";
import { DashboardMock, PhoneMock } from "./device-mocks";
import { FloatingChips, IconColumns, SectionHead, StatBand as SharedStatBand } from "./kit";
import styles from "./turf-pro-marketing.module.css";
import hm from "./home.module.css";
import fx from "./features.module.css";

const route = (href: string) => href as Route;

/* ---------- Shared CTA band (used on home + template pages) ---------- */

export function CtaBand({
  title,
  accent,
  body,
}: {
  title: string;
  accent: string;
  body: string;
}) {
  return (
    <div className={styles.wrap}>
      <Reveal>
        <div className={fx.ctaBand}>
          <span className={fx.ctaIcon}>
            <ShieldCheck size={26} />
          </span>
          <div>
            <h2>
              {title} <em>{accent}</em>
            </h2>
            <p>{body}</p>
          </div>
          <div className={fx.ctaActions}>
            <Link href={route("/signin?plan=pro")} className={styles.button}>
              Start Free Trial
            </Link>
            <Link href={route("/demo")} className={styles.buttonSoft}>
              Book a Demo
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* ---------- Hero ---------- */

function HomeHero() {
  return (
    <section className={hm.hero}>
      <div className={`${styles.wrap} ${hm.heroGrid}`}>
        <Reveal immediate className={hm.heroCopy}>
          <h1 className={hm.heroTitle}>
            The All-in-One CRM Built for <em>Outdoor Professionals</em>
          </h1>
          <p className={hm.heroLede}>
            Turf Pro CRM helps lawn care, landscaping, and pest control businesses streamline operations, impress customers, and grow with confidence.
          </p>
          <div className={hm.heroActions}>
            <Link href={route("/signin?plan=pro")} className={styles.button}>
              Start Free Trial
            </Link>
            <Link href={route("/demo")} className={styles.buttonSoft}>
              Book a Demo
            </Link>
          </div>
          <div className={hm.microProof}>
            <span className={hm.microProofItem}>
              <Check size={15} strokeWidth={3} /> 14-day All-In Pro trial
            </span>
            <span className={hm.microProofItem}>
              <Check size={15} strokeWidth={3} /> Cancel anytime
            </span>
          </div>
        </Reveal>
        <Reveal immediate step={1}>
          <div className={hm.deviceStack}>
            <div className={hm.tabletFrame}>
              <DashboardMock />
            </div>
            <div className={hm.phoneFloat}>
              <PhoneMock />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Trust logo bar ---------- */

const trustLogos = [
  { name: "Lawn Care", sub: "Operators", icon: Leaf },
  { name: "Landscape", sub: "Companies", icon: Sprout },
  { name: "Tree & Shrub", sub: "Specialists", icon: Mountain },
  { name: "Pest Control", sub: "Teams", icon: Bug },
  { name: "Snow & Seasonal", sub: "Crews", icon: TreePine },
];

function TrustBar() {
  return (
    <section className={hm.logoBar}>
      <div className={styles.wrap}>
        <div className={hm.logoBarLabel}>Purpose-built for the outdoor service businesses that keep properties thriving</div>
        <Stagger className={hm.logoRow} gap={0.05}>
          {trustLogos.map(({ name, sub, icon: Icon }) => (
            <StaggerItem key={name} className={hm.brandLogo}>
              <Icon size={22} />
              <span className={hm.brandLogoText}>
                <strong>{name}</strong>
                <small>{sub}</small>
              </span>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ---------- Powerful tools row ---------- */

const tools = [
  { icon: CalendarDays, title: "Scheduling & Routing", body: "Optimize routes, manage appointments, and keep your team on track." },
  { icon: UsersRound, title: "Customer Management", body: "Store every detail, track history, and build stronger customer relationships." },
  { icon: ClipboardCheck, title: "Work Management", body: "Create work orders, assign techs, and ensure nothing falls through the cracks." },
  { icon: BarChart3, title: "Reports & Analytics", body: "Real-time insights to monitor performance and make smarter decisions." },
  { icon: CircleDollarSign, title: "Invoicing & AR", body: "Track invoices, record payments, and keep receivables tied to the work." },
];

function ToolsRow() {
  return (
    <section className={hm.section}>
      <div className={styles.wrap}>
        <SectionHead kicker="Everything You Need. All in One Place." title="Powerful Tools to" accent="Run Your Business" />
        <IconColumns cols={5} items={tools} />
      </div>
    </section>
  );
}

/* ---------- Industry solutions ---------- */

function IndustrySection() {
  const chips = [
    { icon: CalendarDays, title: "New Job Scheduled", sub: "123 Greenway Dr. · Lawn Care Service", style: { top: "8%", left: "6%" } },
    { icon: CircleDollarSign, title: "Invoice Paid", sub: "$245.00 · View Receipt", style: { top: "10%", right: "5%" } },
    { icon: Navigation, title: "Technician En Route", sub: "Mike S. · 10 mins away", style: { bottom: "12%", left: "8%" } },
    { icon: CheckCircle2, title: "Service Completed", sub: "Fertilization Treatment", style: { bottom: "10%", right: "6%" } },
  ];
  return (
    <section className={hm.section}>
      <div className={styles.wrap}>
        <Reveal>
          <div className={hm.industryCard}>
            <div>
              <p className={hm.kicker}>Built for Your Industry</p>
              <h2 className={hm.sectionTitle} style={{ maxWidth: "14ch" }}>
                Solutions that grow with your business.
              </h2>
              <p className={hm.sectionLede}>
                Whether you&apos;re a solo operator or managing multiple crews, Turf Pro CRM adapts to the way you work.
              </p>
              <div className={hm.checkList}>
                {["Lawn Care", "Landscaping", "Pest Control", "Snow & Seasonal Services"].map((item) => (
                  <div key={item} className={hm.checkItem}>
                    <span className={hm.checkIcon}>
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
              <div className={hm.heroActions}>
                <Link href={route("/solutions")} className={styles.button}>
                  Explore Solutions
                </Link>
              </div>
            </div>
            <div className={hm.industryVisual} role="img" aria-label="Live job activity notifications over a serviced property">
              <svg className={hm.industryScene} viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M0 220 Q90 190 200 214 T400 208 L400 300 L0 300 Z" fill="oklch(45% 0.11 148)" />
                <path d="M0 250 Q120 226 240 248 T400 244 L400 300 L0 300 Z" fill="oklch(38% 0.09 152)" />
                <path d="M150 150 L200 110 L250 150 Z" fill="oklch(96% 0.01 95)" />
                <rect x="158" y="150" width="84" height="58" fill="oklch(92% 0.015 95)" />
                <rect x="188" y="172" width="22" height="36" fill="oklch(35% 0.07 152)" />
                <circle cx="96" cy="180" r="26" fill="oklch(52% 0.13 146)" />
                <rect x="92" y="196" width="8" height="20" fill="oklch(35% 0.08 60)" />
                <circle cx="316" cy="172" r="32" fill="oklch(48% 0.12 148)" />
                <rect x="312" y="192" width="8" height="24" fill="oklch(35% 0.08 60)" />
                <path d="M180 300 Q200 250 220 300 Z" fill="oklch(80% 0.03 95)" />
              </svg>
              <FloatingChips items={chips} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Advantage strip ---------- */

function AdvantageStrip() {
  return (
    <div className={styles.wrap}>
      <Reveal>
        <div className={hm.advantage}>
          <h2>
            More Time. Happier Customers. Bigger Profits.
            <br />
            That&apos;s the <em>Turf Pro CRM Advantage</em>.
          </h2>
          <div className={hm.advantageActions}>
            <Link href={route("/signin?plan=pro")} className={styles.button}>
              Start Free Trial
            </Link>
            <Link href={route("/demo")} className={styles.buttonSoft}>
              Book a Demo
            </Link>
          </div>
          <div className={hm.advantageProof}>
            {[
              { icon: ThumbsUp, label: "Easy to use" },
              { icon: Headset, label: "Human-centered support" },
              { icon: ShieldCheck, label: "Secure & reliable" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className={hm.advantageProofItem}>
                <Icon size={22} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* ---------- Capabilities row + integrations ---------- */

const capabilities = [
  { icon: Smartphone, title: "Mobile Access", body: "Manage your business from anywhere with our powerful mobile app." },
  { icon: Bell, title: "Actionable Reminders", body: "Keep tasks, trial reminders, and payment issues visible before they become problems." },
  { icon: Workflow, title: "Custom Workflows", body: "Build processes that match the way your business runs." },
  { icon: UsersRound, title: "Team Collaboration", body: "Keep your team connected and every job on the same page." },
  { icon: CloudUpload, title: "Cloud-Based & Secure", body: "Your data is safe, backed up, and accessible 24/7." },
  { icon: Plug, title: "Secure Connections", body: "Run identity, billing, and app data through focused, auditable integrations." },
];

function CapabilitiesSection() {
  return (
    <section className={hm.section}>
      <div className={styles.wrap}>
        <SectionHead
          kicker="Built to Save Time & Drive Results"
          title="Everything You Need."
          accent="All in One Place."
          lede="Turf Pro CRM brings your entire business together — so you can focus on what you do best."
        />
        <IconColumns cols={6} items={capabilities} />
        <Reveal step={1}>
          <div className={hm.integrations} style={{ marginTop: "var(--space-xl)" }}>
            <h2>Production-Ready Foundations</h2>
            <div className={hm.integrationRow}>
              <span className={hm.integrationMark} style={{ fontFamily: "var(--font-display)" }}>
                Convex realtime data
              </span>
              <span className={hm.integrationMark} style={{ fontStyle: "italic", letterSpacing: "-0.02em" }}>
                Stripe billing
              </span>
              <span className={hm.integrationMark}>
                <Navigation size={18} /> Google Maps links
              </span>
              <span className={hm.integrationMark}>
                <ShieldCheck size={16} /> Clerk identity
              </span>
              <span className={hm.integrationMark} style={{ color: "oklch(58% 0.18 40 / 0.75)" }}>
                Cloudflare ready
              </span>
              <span className={hm.integrationMark}>
                <small>More adapters on the roadmap</small>
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Testimonial ---------- */

function TestimonialSection() {
  return (
    <section className={hm.section}>
      <div className={styles.wrap}>
        <Reveal>
          <div className={hm.testimonial}>
            <div>
              <h2 className={hm.sectionTitle}>
                Designed Around the Work. <em>Down to Every Detail.</em>
              </h2>
              <div className={hm.quoteMark} aria-hidden="true">
                &ldquo;
              </div>
              <p className={hm.quoteText}>
                From the first lead to the final payment, every screen is designed around the real decisions outdoor service teams make each day.
              </p>
              <div className={hm.quoteAuthor}>The Turf Pro standard</div>
              <div className={hm.quoteRole}>Clear workflows. Reliable numbers. A faster day.</div>
            </div>
            <div className={hm.portraitWrap}>
              <div className={hm.portrait} role="img" aria-label="Turf Pro CRM product promise">
                <span className={hm.portraitInitials}>TP</span>
              </div>
              <div className={hm.statCard}>
                <div className={hm.statCardLabel}>One Connected Operating System</div>
                <div className={hm.statCardRow}>
                  <span className={hm.statCell}>
                    <strong>Lead</strong>
                    <small>Capture &amp; qualify</small>
                  </span>
                  <span className={hm.statCell}>
                    <strong>Field</strong>
                    <small>Schedule &amp; deliver</small>
                  </span>
                  <span className={hm.statCell}>
                    <strong>Profit</strong>
                    <small>Invoice &amp; improve</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Stats band ---------- */

const stats = [
  { icon: UsersRound, value: "7", label: "Role-Based Access Levels" },
  { icon: ClipboardCheck, value: "10", label: "Contacts Included Free" },
  { icon: BarChart3, value: "14 Days", label: "All-In Pro Trial" },
  { icon: CircleDollarSign, value: "$99", label: "One All-In Monthly Plan" },
];

function StatsBand() {
  return <SharedStatBand title="Built for Serious Work." accent="Priced for Growing Teams." stats={stats} />;
}

/* ---------- Resources ---------- */

const resourceCards = [
  { kicker: "Guide", title: "The Ultimate Guide to Scaling Your Landscaping Business", action: "Read More", icon: Sprout },
  { kicker: "Webinar", title: "How to Maximize Profits with Smarter Scheduling & Routing", action: "Watch Now", icon: CalendarDays },
  { kicker: "Article", title: "5 Ways Pest Control Pros Can Improve Customer Retention", action: "Read More", icon: Bug },
];

function ResourcesSection() {
  return (
    <section className={hm.section}>
      <div className={styles.wrap}>
        <div className={hm.resourcesGrid}>
          <Reveal>
            <p className={hm.kickerCaps}>Learn. Grow. Succeed.</p>
            <h2 className={hm.sectionTitle}>
              Resources to Help You <em>Grow Your Business</em>
            </h2>
            <p className={hm.sectionLede}>
              Explore our library of guides, webinars, and articles designed to help outdoor professionals work smarter and grow faster.
            </p>
            <div className={hm.heroActions}>
              <Link href={route("/resources")} className={styles.button}>
                Visit Resource Center
              </Link>
            </div>
          </Reveal>
          <Stagger className={hm.resourceCards} step={1}>
            {resourceCards.map(({ kicker, title, action, icon: Icon }) => (
              <StaggerItem key={title}>
                <Link href={route("/resources")} className={hm.resourceCard}>
                  <span className={hm.resourceThumb}>
                    <Icon size={34} strokeWidth={1.5} />
                  </span>
                  <span className={hm.resourceBody}>
                    <span className={hm.resourceKicker}>{kicker}</span>
                    <h3>{title}</h3>
                    <span className={hm.resourceLink}>
                      {action} <ArrowRight size={14} />
                    </span>
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}

/* ---------- Landing page ---------- */

export function TurfProLandingPage() {
  return (
    <main className={styles.site}>
      <MarketingNav />
      <HomeHero />
      <TrustBar />
      <ToolsRow />
      <IndustrySection />
      <AdvantageStrip />
      <CapabilitiesSection />
      <TestimonialSection />
      <StatsBand />
      <ResourcesSection />
      <section style={{ paddingBottom: "var(--space-2xl)" }}>
        <CtaBand
          title="Ready to Take Your Business to the"
          accent="Next Level?"
          body="Bring leads, crews, jobs, payments, and profit into one calm, connected workspace."
        />
      </section>
      <Footer year={new Date().getFullYear()} />
    </main>
  );
}

/* ---------- Template page (all /[slug] marketing pages) ---------- */

const sectionIcons = [Filter, UsersRound, BarChart3];

function splitTitle(title: string): { lead: string; accent: string } {
  const words = title.replace(/\.$/, "").split(" ");
  if (words.length <= 3) return { lead: title, accent: "" };
  const split = Math.max(2, words.length - 3);
  return { lead: words.slice(0, split).join(" "), accent: words.slice(split).join(" ") + "." };
}

export function TurfProMarketingPage({ page }: { page: MarketingPage }) {
  const { lead, accent } = splitTitle(page.title);
  return (
    <main className={styles.site}>
      <MarketingNav />
      <section className={styles.pageHero}>
        <div className={`${styles.wrap} ${styles.pageHeroGrid}`}>
          <Reveal immediate>
            <p className={styles.eyebrow}>{page.eyebrow}</p>
            <h1 className={styles.pageTitle}>
              {lead} {accent ? <span>{accent}</span> : null}
            </h1>
          </Reveal>
          <Reveal immediate step={1}>
            <p className={styles.lede}>{page.lede}</p>
            <div className={styles.heroActions} style={{ marginTop: "var(--space-lg)" }}>
              <Link href={route("/signin")} className={styles.button}>
                {page.primaryAction}
              </Link>
              <Link href={route("/demo")} className={styles.buttonSoft}>
                Book a Demo
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
      <section style={{ paddingBottom: "var(--space-2xl)" }}>
        <CtaBand
          title="Everything You Need."
          accent="All in One Place."
          body="Turf Pro CRM has the tools to help you save time, impress customers, and grow your business."
        />
      </section>
      <Footer year={new Date().getFullYear()} />
    </main>
  );
}
