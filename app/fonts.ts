/**
 * CareBridge Unified Font Configuration
 * ──────────────────────────────────────
 * Clean Minimal Clinical SaaS Typography:
 *   fontDisplay → Plus_Jakarta_Sans (--font-display) for headings, hero, buttons, nav
 *   fontBody    → DM_Sans (--font-body) for body text, forms, labels, tables
 *   fontData    → Sora (--font-data) for telemetry, timestamps, vitals, numbers (with tabular-nums)
 */

import { Plus_Jakarta_Sans, DM_Sans, Sora } from "next/font/google";

export const fontDisplay = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const fontBody = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

export const fontData = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-data",
  display: "swap",
});

// Backwards-compatible aliases so existing imports in teammate code continue working
export const montserrat = fontDisplay;
export const dmSans = fontBody;
export const sora = fontData;
