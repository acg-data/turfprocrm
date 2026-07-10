import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ClipboardList,
  CreditCard,
  Plug,
  Plus,
  Smartphone,
  UsersRound,
} from "lucide-react";
import { getMarketingPage } from "@/data/marketing";
import { DashboardMock } from "./device-mocks";
import { MarketingNav } from "./chrome";
import { Footer } from "./footer";
import { Reveal } from "./reveal";
import { CtaBand } from "./turf-pro-marketing";
import styles from "./turf-pro-marketing.module.css";
import fx from "./features.module.css";

const route = (href: string) => href as Route;
const page = getMarketingPage("features")!;

const tabs = [
  { id: "scheduling", label: "Scheduling & Routing", icon: CalendarDays },
  { id: "customers", label: "Customer Management", icon: UsersRound },
  { id: "work", label: "Work Management", icon: ClipboardList },
  { id: "invoicing", label: "Invoicing & Payments", icon: CreditCard },
  { id: "reports", label: "Reports & Analytics", icon: BarChart3 },
  { id: "mobile", label: "Mobile & Access", icon: Smartphone },
  { id: "integrations", label: "Integrations", icon: Plug },
];

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div className={fx.checkItem}>
      <span className={fx.checkIcon}>
        <Check size={11} strokeWidth={3} />
      </span>
      <span>{children}</span>
    </div>
  );
}

function ScheduleMock() {
  const techs = [
    { name: "Mike S.", meta: "8/10", color: "oklch(63% 0.17 145)" },
    { name: "Jacob T.", meta: "7/9", color: "oklch(68% 0.13 72)" },
    { name: "Chris D.", meta: "6/8", color: "oklch(56% 0.11 240)" },
    { name: "Sarah M.", meta: "5/7", color: "oklch(58% 0.17 24)" },
  ];
  return (
    <div className={fx.mockCard}>
      <div className={fx.mockHeader}>
        <span>Schedule</span>
        <div className={fx.mockTabs} style={{ margin: 0 }}>
          <span className={`${fx.mockTab} ${fx.mockTabActive}`}>Day</span>
          <span className={fx.mockTab}>Week</span>
          <span className={fx.mockTab}>Month</span>
        </div>
      </div>
      <div className={fx.scheduleGrid}>
        <div className={fx.techList}>
          {techs.map((tech) => (
            <div key={tech.name} className={fx.techRow}>
              <span className={fx.techDot} style={{ background: tech.color }} />
              <span>{tech.name}</span>
              <span className={fx.techMeta}>{tech.meta}</span>
            </div>
          ))}
        </div>
        <div className={fx.mapCanvas}>
          <svg className={fx.mapSvg} viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M22 140 C50 112, 60 64, 104 56 S170 84, 208 60" fill="none" stroke="oklch(63% 0.17 145)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M34 30 C82 40, 110 118, 158 126 S216 108, 226 128" fill="none" stroke="oklch(68% 0.13 72)" strokeWidth="3.5" strokeLinecap="round" />
            {[
              [22, 140, "1"],
              [104, 56, "2"],
              [208, 60, "3"],
              [158, 126, "4"],
            ].map(([cx, cy, n]) => (
              <g key={String(n)}>
                <circle cx={Number(cx)} cy={Number(cy)} r="10" fill="oklch(33% 0.08 156)" />
                <text x={Number(cx)} y={Number(cy) + 3.5} textAnchor="middle" fill="white" fontSize="10" fontWeight="700">
                  {n}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

function CustomerMock() {
  const history = [
    { date: "May 15, 2026", service: "Lawn Care" },
    { date: "May 1, 2026", service: "Fertilization" },
    { date: "Apr 15, 2026", service: "Weed Control" },
    { date: "Apr 1, 2026", service: "Lawn Care" },
  ];
  return (
    <div className={fx.mockCard}>
      <div className={fx.profileHeader}>
        <span className={fx.avatar}>JS</span>
        <div>
          <div className={fx.profileName}>John Smith</div>
          <div className={fx.profileMeta}>123 Greenway Dr. · Springfield, IL · (217) 555-1234</div>
        </div>
        <div className={fx.chipRow}>
          <span className={`${fx.chip} ${fx.chipGreen}`}>Active</span>
          <span className={`${fx.chip} ${fx.chipBlue}`}>Residential</span>
        </div>
      </div>
      <div className={fx.mockTabs}>
        <span className={`${fx.mockTab} ${fx.mockTabActive}`}>Overview</span>
        <span className={fx.mockTab}>Properties</span>
        <span className={fx.mockTab}>History</span>
        <span className={fx.mockTab}>Notes</span>
        <span className={fx.mockTab}>Files</span>
      </div>
      <div>
        {history.map((row) => (
          <div key={row.date} className={fx.historyRow}>
            <span className={fx.historyDate}>{row.date}</span>
            <span style={{ fontWeight: 600 }}>{row.service}</span>
            <span className={`${fx.chip} ${fx.chipGreen}`}>Completed</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkOrdersMock() {
  const orders = [
    { id: "#1032", address: "123 Greenway Dr.", service: "Lawn Care", status: "In Progress", chip: fx.chipBlue, tech: "Mike S." },
    { id: "#1031", address: "456 Oakridge Ln.", service: "Fertilization", status: "Scheduled", chip: fx.chipAmber, tech: "Jacob T." },
    { id: "#1030", address: "789 Maple Ave.", service: "Pest Control", status: "Completed", chip: fx.chipGreen, tech: "Chris D." },
    { id: "#1029", address: "321 Pinecrest St.", service: "Lawn Care", status: "Scheduled", chip: fx.chipAmber, tech: "Sarah M." },
  ];
  return (
    <div className={fx.mockCard}>
      <div className={fx.mockHeader}>
        <span>Work Orders</span>
        <span className={fx.mockAction}>
          <Plus size={11} strokeWidth={3} /> New Work Order
        </span>
      </div>
      <div className={fx.mockTabs}>
        <span className={`${fx.mockTab} ${fx.mockTabActive}`}>All</span>
        <span className={fx.mockTab}>Open</span>
        <span className={fx.mockTab}>In Progress</span>
        <span className={fx.mockTab}>Completed</span>
      </div>
      <div>
        {orders.map((order) => (
          <div key={order.id} className={fx.tableRow}>
            <span className={fx.rowId}>{order.id}</span>
            <div className={fx.rowPrimary}>
              <div className={fx.rowTitle}>{order.address}</div>
              <div className={fx.rowSub}>{order.service}</div>
            </div>
            <span className={`${fx.chip} ${order.chip}`}>{order.status}</span>
            <span className={fx.rowMeta}>{order.tech}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvoicesMock() {
  const invoices = [
    { id: "INV-1025", customer: "John Smith", due: "May 31, 2026", total: "$145.00", status: "Unpaid", chip: fx.chipRed },
    { id: "INV-1024", customer: "Sarah Johnson", due: "May 30, 2026", total: "$125.00", status: "Paid", chip: fx.chipGreen },
    { id: "INV-1023", customer: "Mike Williams", due: "May 29, 2026", total: "$165.00", status: "Paid", chip: fx.chipGreen },
    { id: "INV-1022", customer: "David Brown", due: "May 28, 2026", total: "$145.00", status: "Overdue", chip: fx.chipRed },
  ];
  return (
    <div className={fx.mockCard}>
      <div className={fx.mockHeader}>
        <span>Invoices</span>
      </div>
      <div className={fx.invoiceKpis}>
        <div className={fx.invoiceKpi}>
          <div className={fx.invoiceKpiLabel}>Unpaid</div>
          <div className={fx.invoiceKpiValue}>18</div>
          <div className={fx.invoiceKpiSub}>$6,250.00</div>
        </div>
        <div className={fx.invoiceKpi}>
          <div className={fx.invoiceKpiLabel}>Overdue</div>
          <div className={`${fx.invoiceKpiValue} ${fx.redValue}`}>7</div>
          <div className={fx.invoiceKpiSub}>$2,150.00</div>
        </div>
        <div className={fx.invoiceKpi}>
          <div className={fx.invoiceKpiLabel}>Paid (this month)</div>
          <div className={fx.invoiceKpiValue}>42</div>
          <div className={fx.invoiceKpiSub}>$18,540.00</div>
        </div>
        <div className={fx.invoiceKpi}>
          <div className={fx.invoiceKpiLabel}>Draft</div>
          <div className={fx.invoiceKpiValue}>5</div>
          <div className={fx.invoiceKpiSub}>$1,250.00</div>
        </div>
      </div>
      <div>
        {invoices.map((invoice) => (
          <div key={invoice.id} className={fx.tableRow}>
            <span className={fx.rowId}>{invoice.id}</span>
            <div className={fx.rowPrimary}>
              <div className={fx.rowTitle}>{invoice.customer}</div>
              <div className={fx.rowSub}>Due {invoice.due}</div>
            </div>
            <span className={fx.rowMeta}>{invoice.total}</span>
            <span className={`${fx.chip} ${invoice.chip}`}>{invoice.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const featureSections = [
  {
    id: "scheduling",
    kicker: "Scheduling & Routing",
    title: "Smarter Routes. Happier Customers.",
    body: "Optimize daily routes, manage appointment windows, and adjust on the go. Save time, reduce drive time, and get more jobs done.",
    bullets: ["Drag-and-drop scheduling", "Route order and drive-time estimates", "Real-time updates for the crew in the field"],
    mock: <ScheduleMock />,
  },
  {
    id: "customers",
    kicker: "Customer Management",
    title: "Stronger Relationships. Built In.",
    body: "Keep all your customer and property information in one place. Track history, notes, and communications so your team always has the full picture.",
    bullets: ["Customer & property profiles", "Service history & notes", "Tags, segments & saved views"],
    mock: <CustomerMock />,
    reverse: true,
  },
  {
    id: "work",
    kicker: "Work Management",
    title: "Stay Organized. Get More Done.",
    body: "Assign jobs, track technician progress, and manage tasks from start to finish — so nothing falls through the cracks.",
    bullets: ["Create & assign work orders", "Track job status in real time", "Technician notes, checklists & issue flags"],
    mock: <WorkOrdersMock />,
  },
  {
    id: "invoicing",
    kicker: "Invoicing & Payments",
    title: "Get Paid Faster. Without the Hassle.",
    body: "Create professional invoices, track what's owed, and keep AR visible next to the work that produced it — so your cash flow stays healthy.",
    bullets: ["Invoice tracking with payment status", "Customer payments and allocations", "Overdue and AR visibility per job"],
    mock: <InvoicesMock />,
    reverse: true,
  },
];

const trioCards = [
  {
    id: "reports",
    icon: BarChart3,
    title: "Reports & Analytics",
    body: "Job costing, profit dashboards, churn and LTV signals, and owner-level P&L context — computed from the operating data, not a spreadsheet.",
  },
  {
    id: "mobile",
    icon: Smartphone,
    title: "Mobile & Access",
    body: "A field PWA for technicians with checklists, materials, and photos — plus roles and permissions that control exactly who sees what.",
  },
  {
    id: "integrations",
    icon: Plug,
    title: "Integrations",
    body: "Google Maps links live today; Stripe billing built in. QuickBooks, SMS, and email sync are next on the roadmap — deliberately, in that order.",
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
            <h1 className={styles.pageTitle}>
              Powerful Features. <span>Built for Your Business.</span>
            </h1>
            <p className={styles.lede} style={{ marginTop: "var(--space-md)" }}>
              {page.lede}
            </p>
            <div className={styles.heroActions} style={{ marginTop: "var(--space-lg)" }}>
              <Link href={route("/signin?plan=pro")} className={styles.button}>
                Start Free Trial <ArrowRight size={16} />
              </Link>
              <Link href={route("/demo")} className={styles.buttonSoft}>
                Book a Demo
              </Link>
            </div>
          </Reveal>
          <Reveal immediate step={1}>
            <DashboardMock />
          </Reveal>
        </div>
      </section>

      <div className={`${styles.wrap} ${fx.tabBarWrap}`}>
        <Reveal immediate step={2}>
          <nav className={fx.tabBar} aria-label="Feature categories">
            {tabs.map(({ id, label, icon: Icon }) => (
              <a key={id} href={`#${id}`} className={fx.tab}>
                <span className={fx.tabIcon}>
                  <Icon size={16} />
                </span>
                {label}
              </a>
            ))}
          </nav>
        </Reveal>
      </div>

      {featureSections.map((section) => (
        <section key={section.id} id={section.id} className={fx.featureSection}>
          <div className={styles.wrap}>
            <div className={`${fx.featureRow} ${section.reverse ? fx.featureRowReverse : ""}`}>
              <Reveal className={fx.featureCopy}>
                <span className={fx.kicker}>{section.kicker}</span>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
                <div className={fx.checkList}>
                  {section.bullets.map((bullet) => (
                    <CheckItem key={bullet}>{bullet}</CheckItem>
                  ))}
                </div>
              </Reveal>
              <Reveal step={1}>{section.mock}</Reveal>
            </div>
          </div>
        </section>
      ))}

      <section className={fx.featureSection}>
        <div className={styles.wrap}>
          <div className={fx.trioGrid}>
            {trioCards.map((card, index) => (
              <Reveal key={card.id} step={index}>
                <article id={card.id} className={fx.trioCard}>
                  <span className={fx.tabIcon}>
                    <card.icon size={16} />
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Everything You Need."
        accent="All in One Place."
        body="Turf Pro CRM has the tools to help you save time, impress customers, and grow your business."
      />

      <Footer year={new Date().getFullYear()} />
    </main>
  );
}
