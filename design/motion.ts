/**
 * CareBridge Motion Variants & Utilities (Minimal Clinical Edition)
 * ─────────────────────────────────────────────────────────────
 * Clean, subtle clinical transitions:
 *  - 160–220ms easeOut for quick, confident state changes.
 *  - Respects prefers-reduced-motion.
 *  - Zero jarring physics or bouncy cartoons.
 */

import type { Variants, Transition } from "framer-motion";

const isReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/** Standard transition respecting prefers-reduced-motion */
export const defaultTransition: Transition = {
  duration: isReducedMotion() ? 0 : 0.18,
  ease: [0.16, 1, 0.3, 1],
};

/** Risk badge swap animation: subtle opacity & scale fade */
export const riskBadgeSwap: Variants = {
  initial: {
    scale: 0.96,
    opacity: 0.8,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: isReducedMotion() ? 0 : 0.18,
      ease: "easeOut",
    },
  },
  exit: {
    scale: 0.96,
    opacity: 0,
    transition: {
      duration: isReducedMotion() ? 0 : 0.12,
    },
  },
};

export const badgeSwapVariants: Variants = riskBadgeSwap;

/** Continuous gentle mic pulse for VoiceButton listening */
export const micPulse: Variants = {
  animate: {
    scale: [1, 1.04, 1],
    transition: {
      repeat: Infinity,
      duration: isReducedMotion() ? 0 : 1.2,
      ease: "easeInOut",
    },
  },
};

export const micPulseVariants: Variants = micPulse;

/** FLIP transition layout settings for PatientRow list sliding */
export const listSlide = {
  layout: true,
  transition: {
    duration: isReducedMotion() ? 0 : 0.2,
    ease: "easeOut",
  },
};

/** List item entrance and re-order animation */
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 6,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.12,
    },
  },
};

/** Drawer / Panel slide in from right (for BriefPanel / Details) */
export const drawerVariants: Variants = {
  closed: {
    x: "100%",
    opacity: 0.5,
    transition: {
      duration: 0.22,
      ease: [0.32, 0.72, 0, 1],
    },
  },
  open: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.24,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

/** Fade in with slight scale pop */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.18,
      ease: "easeOut",
    },
  },
};
