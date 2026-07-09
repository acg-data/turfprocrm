"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Leaf, Menu, X } from "lucide-react";
import { marketingNav } from "@/data/marketing";
import { cn } from "@/lib/utils";
import styles from "./chrome.module.css";

const route = (href: string) => href as Route;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function Brand() {
  return (
    <Link href="/" className={styles.brand}>
      <span className={styles.mark} aria-hidden="true">
        <Leaf size={18} />
      </span>
      <span className={styles.brandText}>
        <span className={styles.brandName}>Turf Pro</span>
        <span className={styles.brandSub}>CRM</span>
      </span>
    </Link>
  );
}

export function MarketingNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className={cn(styles.mast, scrolled && styles.mastScrolled)}>
      <div className={cn(styles.wrap, styles.mastInner)}>
        <Brand />
        <nav className={styles.nav} aria-label="Marketing navigation">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={route(item.href)}
              className={cn(styles.navLink, pathname === item.href && styles.navLinkActive)}
            >
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
        <button
          type="button"
          className={styles.menuButton}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className={styles.mobilePanel}
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
          >
            <div className={styles.mobilePanelInner}>
              {marketingNav.map((item) => (
                <Link key={item.href} href={route(item.href)} className={styles.mobileLink}>
                  {item.label}
                </Link>
              ))}
              <div className={styles.mobileActions}>
                <Link href={route("/signin")} className={styles.buttonSoft} style={{ flex: 1 }}>
                  Sign in
                </Link>
                <Link href={route("/signin")} className={styles.button} style={{ flex: 1 }}>
                  Start free
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
