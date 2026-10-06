/**
 * CareBridge Motion Variants & Utilities (owner: Swapin)
 * ─────────────────────────────────────────────────────────
 * Standardised framer-motion animation variants per DESIGN.md §7.
 *
 * Rules:
 *  - 180–220ms ease-out for quick state changes.
 *  - List re-sorting FLIP layout transitions so rows visibly slide.
 *  - Continuous gentle mic pulse for listening states.
 *  - Respects prefers-reduced-motion via CSS & transition configurations.
 */

import type { Variants, Transition } from "framer-motion";

const isReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/** Standard transition respecting prefers-reduced-motion */
export const defaultTransition: Transition = {
  duration: isReducedMotion() ? 0 : 0.2,
  ease: [0.16, 1, 0.3, 1], // ease-out quad/cubic
};

/** Risk badge swap animation: quick scale pop + color fade */
export const riskBadgeSwap: Variants = {
  initial: {
    scale: 0.9,
    opacity: 0.7,
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
    scale: 0.9,
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
    scale: [1, 1.08, 1],
    transition: {
      repeat: Infinity,
      duration: isReducedMotion() ? 0 : 0.9,
      ease: "easeInOut",
    },
  },
};

export const micPulseVariants: Variants = micPulse;

/** FLIP transition layout settings for PatientRow list sliding */
export const listSlide = {
  layout: true,
  transition: {
    duration: isReducedMotion() ? 0 : 0.22,
    ease: "easeOut",
  },
};

/** List item entrance and re-order animation */
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: 0.15,
    },
  },
};

/** Drawer / Panel slide in from right (for BriefPanel / Details) */
export const drawerVariants: Variants = {
  closed: {
    x: "100%",
    opacity: 0.5,
    transition: {
      duration: 0.25,
      ease: [0.32, 0.72, 0, 1],
    },
  },
  open: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

/** Fade in with slight scale pop */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
};
