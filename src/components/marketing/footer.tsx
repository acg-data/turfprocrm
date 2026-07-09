import Link from "next/link";
import type { Route } from "next";
import { Leaf } from "lucide-react";
import { Brand } from "./chrome";
import styles from "./chrome.module.css";

function SocialSvg({ path }: { path: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

// lucide-react removed brand icons, so these are inline simplified marks.
const FacebookIcon = () => <SocialSvg path="M13.5 9H16V6h-2.5C11.6 6 10 7.6 10 9.5V11H8v3h2v7h3v-7h2.5l.5-3h-3V9.5c0-.3.2-.5.5-.5z" />;
const InstagramIcon = () => (
  <SocialSvg path="M12 8.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6zm0 5.1a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6zM16.9 8.4a.9.9 0 1 1-1.8 0 .9.9 0 0 1 1.8 0zM12 4.5c-2 0-2.3 0-3.1.05a5.6 5.6 0 0 0-1.9.35 3.9 3.9 0 0 0-2.2 2.2 5.6 5.6 0 0 0-.35 1.9C4.5 9.7 4.5 10 4.5 12s0 2.3.05 3.1c.03.7.14 1.3.35 1.9a3.9 3.9 0 0 0 2.2 2.2c.6.2 1.2.32 1.9.35.8.05 1.1.05 3.1.05s2.3 0 3.1-.05a5.6 5.6 0 0 0 1.9-.35 3.9 3.9 0 0 0 2.2-2.2c.2-.6.32-1.2.35-1.9.05-.8.05-1.1.05-3.1s0-2.3-.05-3.1a5.6 5.6 0 0 0-.35-1.9 3.9 3.9 0 0 0-2.2-2.2 5.6 5.6 0 0 0-1.9-.35C14.3 4.5 14 4.5 12 4.5zm0 1.5c1.9 0 2.2 0 3 .05.6.02 1 .12 1.3.22.4.15.7.37 1 .7.32.3.54.6.7 1 .1.3.2.7.21 1.3.05.8.05 1 .05 3s0 2.2-.05 3c-.02.6-.12 1-.22 1.3a2.4 2.4 0 0 1-1.68 1.68c-.3.1-.7.2-1.3.21-.8.05-1 .05-3 .05s-2.2 0-3-.05a3.9 3.9 0 0 1-1.3-.22 2.4 2.4 0 0 1-1.68-1.68 3.9 3.9 0 0 1-.21-1.3c-.05-.8-.05-1-.05-3s0-2.2.05-3c.02-.6.12-1 .22-1.3.15-.4.37-.7.7-1 .3-.32.6-.54 1-.7.3-.1.7-.2 1.3-.21.8-.05 1-.05 3-.05z" />
);
const YoutubeIcon = () => <SocialSvg path="M21.6 8s-.2-1.4-.8-2c-.7-.8-1.6-.8-2-.85C16 5 12 5 12 5s-4 0-6.8.15c-.4.05-1.3.05-2 .85-.6.6-.8 2-.8 2S2.2 9.6 2.2 11.3v1.5c0 1.6.2 3.3.2 3.3s.2 1.4.8 2c.7.8 1.7.75 2.1.85 1.6.15 6.7.15 6.7.15s4 0 6.8-.15c.4-.05 1.3-.05 2-.85.6-.6.8-2 .8-2s.2-1.6.2-3.3v-1.5c0-1.6-.2-3.3-.2-3.3zM10 14.6V9.4l5.2 2.6-5.2 2.6z" />;
const LinkedinIcon = () => <SocialSvg path="M6.94 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM3.5 8.5h2.9V21H3.5V8.5zm5.6 0h2.8v1.7h.04c.39-.74 1.34-1.9 3.16-1.9 3.38 0 4 2.2 4 5.06V21h-2.9v-6.6c0-1.6-.03-3.6-2.2-3.6-2.2 0-2.5 1.7-2.5 3.5V21H9.1V8.5z" />;

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
      { label: "Request a demo", href: "/demo" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log In", href: "/signin" },
      { label: "Start free trial", href: "/signin" },
      { label: "Open the app", href: "/app" },
    ],
  },
];

const socials = [
  { label: "Facebook", icon: FacebookIcon },
  { label: "Instagram", icon: InstagramIcon },
  { label: "YouTube", icon: YoutubeIcon },
  { label: "LinkedIn", icon: LinkedinIcon },
];

export function Footer({ year }: { year: number }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <div className={styles.footerTop}>
          <div className={styles.footerLead}>
            <Brand light />
            <p>The all-in-one CRM for lawn care, landscaping, and pest control professionals.</p>
            <div className={styles.socialRow}>
              {socials.map(({ label, icon: Icon }) => (
                <span key={label} className={styles.socialIcon} aria-label={label}>
                  <Icon />
                </span>
              ))}
            </div>
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
