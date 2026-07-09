"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Leaf, Menu, X } from "lucide-react";
import { marketingNav, type MarketingNavItem } from "@/data/marketing";
import { cn } from "@/lib/utils";
import styles from "./chrome.module.css";

const route = (href: string) => href as Route;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={cn(styles.brand, light && styles.brandLight)}>
      <span className={styles.mark} aria-hidden="true">
        <Leaf size={18} />
      </span>
      <span className={styles.brandText}>
        <span className={styles.brandName}>
          TURF <em>PRO</em>
        </span>
        <span className={styles.brandSub}>
          <i aria-hidden="true" />
          CRM
          <i aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

function NavDropdown({ item, pathname }: { item: MarketingNavItem; pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isActive = item.children?.some((child) => child.href === pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className={styles.dropdownWrapper}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={cn(styles.navLink, isActive && styles.navLinkActive)}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {item.label}
        <ChevronDown size={13} className={cn(styles.chevron, open && styles.chevronOpen)} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            className={styles.dropdown}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            {item.children!.map((child) => (
              <Link
                key={child.href}
                href={route(child.href)}
                className={cn(styles.dropdownLink, pathname === child.href && styles.dropdownLinkActive)}
              >
                {child.label}
              </Link>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
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
          {marketingNav.map((item) =>
            item.children ? (
              <NavDropdown key={item.label} item={item} pathname={pathname} />
            ) : (
              <Link
                key={item.label}
                href={route(item.href!)}
                className={cn(styles.navLink, pathname === item.href && styles.navLinkActive)}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className={styles.actions}>
          <Link href={route("/signin")} className={styles.buttonSoft}>
            Log In
          </Link>
          <Link href={route("/signin")} className={styles.button}>
            Get Started
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
              {marketingNav.map((item) =>
                item.children ? (
                  <div key={item.label}>
                    <div className={styles.mobileGroupLabel}>{item.label}</div>
                    {item.children.map((child) => (
                      <Link key={child.href} href={route(child.href)} className={cn(styles.mobileLink, styles.mobileChildLink)}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link key={item.label} href={route(item.href!)} className={styles.mobileLink}>
                    {item.label}
                  </Link>
                ),
              )}
              <div className={styles.mobileActions}>
                <Link href={route("/signin")} className={styles.buttonSoft} style={{ flex: 1 }}>
                  Log In
                </Link>
                <Link href={route("/signin")} className={styles.button} style={{ flex: 1 }}>
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
