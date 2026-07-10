"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Fades + lifts children into view once, on scroll (or renders instantly
 * visible for above-the-fold content via `immediate`).
 *
 * Always renders the same `motion.div` DOM structure on server and client —
 * branching between a plain `<div>` and `<motion.div>` based on
 * `useReducedMotion()` caused a hydration mismatch (the server can't know
 * the client's media-query preference), and for `immediate` hero content it
 * raced hydration and briefly painted invisible (opacity: 0) HTML before JS
 * caught up. `initial={false}` renders directly at the animate target with
 * zero risk of that flash; reduced motion just collapses the transition
 * duration instead of skipping the element entirely.
 *
 * `motion.div` etc. only resolve correctly inside a client boundary — a
 * Server Component rendering `<motion.div>` directly gets an RSC client
 * placeholder back from property access, not the real component. Server
 * Components must go through this wrapper (or Stagger/StaggerItem below).
 */
export function Reveal({
  children,
  step = 0,
  className,
  y = 16,
  immediate = false,
}: {
  children: ReactNode;
  step?: number;
  className?: string;
  y?: number;
  /** Render already-visible, no animate-on-mount — for hero/above-the-fold content. */
  immediate?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : 0.5;
  const transition = { duration, delay: reduceMotion ? 0 : step * 0.06, ease: EASE_OUT };

  if (immediate) {
    return (
      <motion.div className={className} initial={false} animate={{ opacity: 1, y: 0 }}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

/** Wraps a list of children and staggers their entrance. Children should be <StaggerItem>. */
export function Stagger({
  children,
  className,
  gap = 0.06,
  step = 0,
  style,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  step?: number;
  style?: CSSProperties;
}) {
  const reduceMotion = useReducedMotion();

  const variants: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: reduceMotion ? 0 : step * 0.06,
        staggerChildren: reduceMotion ? 0 : gap,
      },
    },
  };

  return (
    <motion.div className={className} style={style} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={variants}>
      {children}
    </motion.div>
  );
}

/**
 * The "hidden" (initial) shape must stay identical regardless of reduced
 * motion — it's what gets baked into the SSR HTML's inline style, and the
 * server can't know the client's media-query preference. Only "show"'s
 * transition duration varies, which purely affects the scroll-triggered
 * animation that runs well after hydration — never part of the initial paint.
 */
function itemVariants(reduceMotion: boolean | null): Variants {
  return {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.45, ease: EASE_OUT } },
  };
}

/** A single item inside <Stagger>. Safe to render from a Server Component. */
export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];
  return (
    <Component className={className} variants={itemVariants(reduceMotion)}>
      {children}
    </Component>
  );
}
