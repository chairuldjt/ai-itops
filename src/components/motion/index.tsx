"use client";
import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

/** Hook: returns true only after client-side hydration is complete */
function useHasMounted() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  y = 24,
  ...props
}: React.ComponentProps<typeof motion.div> & {
  delay?: number;
  duration?: number;
  y?: number;
}) {
  const prefersReduced = useReducedMotion();
  const mounted = useHasMounted();

  if (prefersReduced || !mounted) {
    return <div className={className}>{children as React.ReactNode}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function FadeInStagger({
  children,
  className,
  stagger = 0.1,
  ...props
}: React.ComponentProps<typeof motion.div> & { stagger?: number }) {
  const prefersReduced = useReducedMotion();
  const mounted = useHasMounted();

  if (prefersReduced || !mounted) {
    return <div className={className}>{children as React.ReactNode}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ staggerChildren: stagger }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function FadeInItem({
  children,
  className,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children as React.ReactNode}</div>;
  }

  return (
    <motion.div variants={fadeUp} className={className} {...props}>
      {children}
    </motion.div>
  );
}

export function SlideIn({
  children,
  className,
  from = "left",
  delay = 0,
  ...props
}: React.ComponentProps<typeof motion.div> & {
  from?: "left" | "right" | "bottom" | "top";
  delay?: number;
}) {
  const prefersReduced = useReducedMotion();
  const mounted = useHasMounted();

  if (prefersReduced || !mounted) {
    return <div className={className}>{children as React.ReactNode}</div>;
  }

  const dirs = {
    left: { x: -40, y: 0 },
    right: { x: 40, y: 0 },
    bottom: { x: 0, y: 40 },
    top: { x: 0, y: -40 },
  };
  return (
    <motion.div
      initial={{ opacity: 0, ...dirs[from] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({
  children,
  className,
  delay = 0,
  ...props
}: React.ComponentProps<typeof motion.div> & { delay?: number }) {
  const prefersReduced = useReducedMotion();
  const mounted = useHasMounted();

  if (prefersReduced || !mounted) {
    return <div className={className}>{children as React.ReactNode}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Contextual icon swap: cross-fades between two icons with opacity + scale +
 * blur instead of a hard toggle. `initial={false}` so nothing animates on
 * first page load — only on state changes.
 */
export function IconSwap({
  activeKey,
  children,
  className,
}: {
  activeKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <span className={className}>{children}</span>;
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={activeKey}
        initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
        transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        className={className}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}
