import Link from "next/link";
import type { Route } from "next";
import { Leaf } from "lucide-react";
import styles from "./chrome.module.css";

const route = (href: string) => href as Route;

const footerColumns: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Solutions", href: "/solutions" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/integrations" },
    ],
  },
  {
    title: "Modules",
    links: [
      { label: "Lead Ops", href: "/lead-ops" },
      { label: "CRM", href: "/crm" },
      { label: "Dispatch", href: "/dispatch" },
      { label: "Job Costing", href: "/job-costing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Security", href: "/security" },
      { label: "Resources", href: "/resources" },
      { label: "Talk to us", href: "/demo" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/signin" },
      { label: "Start free trial", href: "/signin" },
      { label: "Admin controls", href: "/admin-controls" },
    ],
  },
];

export function Footer({ year }: { year: number }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <div className={styles.footerTop}>
          <div className={styles.footerLead}>
            <h2>Run the whole operation from one workspace.</h2>
            <p>Leads, customers, dispatch, field work, and job costing — connected, for landscaping and pest-control teams.</p>
            <Link href={route("/signin")} className={styles.button}>
              Start free
            </Link>
          </div>
          <div className={styles.footerCols}>
            {footerColumns.map((col) => (
              <div key={col.title}>
                <div className={styles.footerColTitle}>{col.title}</div>
                <div className={styles.footerColLinks}>
                  {col.links.map((link) => (
                    <Link key={link.label} href={route(link.href)} className={styles.footLink}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span className={styles.copyright}>© {year} Turf Pro CRM. All rights reserved.</span>
          <span className={styles.footerMark}>
            <Leaf size={13} /> Built for the green industry
          </span>
        </div>
      </div>
    </footer>
  );
}
