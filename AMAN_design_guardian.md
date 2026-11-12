# AMAN — UI/UX Overhaul, Minimal Clinical Design System & Guardian Portal
## Google BuilderCon | CareBridge (`carebridge` Next.js 16.3.8 App Router)
### Owns: `design/**` · `app/globals.css` · `app/fonts.ts` · `app/layout.tsx` · `tailwind.config.ts` · `components/ui/**` · `app/page.tsx` · `app/(family)/**`

> **Team Rule**: Flat 4-person peer team (no leader). You own the entire **UI/UX design language**, abolishing the childish Neo-Brutalist aesthetic across the repo, maintaining all shared UI primitives (`components/ui/*`), building the startup Landing Page (`app/page.tsx`), building the Guardian/Supervisor Portal (`app/(family)/family/page.tsx`), and leading the cross-portal visual & responsive audit.
> **Verified Stack**: Next.js 16.3.8 App Router, React 19.2.8, Tailwind CSS `^3.4.17`, `lucide-react@^0.441.0`, `framer-motion@^12.0.0`, `recharts@^2.12.7`, `clsx@^2.1.1`, `tailwind-merge@^2.5.2`, `next/font/google`.
> **Hard Boundary**: Never edit backend routes (`app/api/**`), database/risk code (`lib/risk/**`, `lib/supabase/**`, `supabase/**`), or business-specific pages owned by Swapnil (`app/(patient)`) or Aryan (`app/(doctor)`), except during coordinated UI-token cleanup. Always keep exported prop signatures in `components/ui/*` backwards-compatible so Swapnil and Aryan's pages never break!

---

## 0. Pre-Flight Audit: Exact Visual Problems Currently in the Repo

Inspecting the actual codebase revealed why the site looks childish and cluttered right now:
1. **Neo-Brutalist Tokens (`design/tokens.css` & `app/globals.css` & `tailwind.config.ts`)**:
   - `--canvas-paper: #FBF9F4` with `.bg-grid-paper` graph-paper lines
   - `2px solid #121214` heavy black borders (`--border-width: 2px`)
   - Hard offset shadows (`--shadow-brutal: 4px 4px 0px #121214`, `6px 6px 0px #121214`)
   - Garish sticker highlights: `.highlight-pink` (`#FF5C98`), `.highlight-yellow` (`#FEE159`), `.highlight-lime` (`#D4F77C`), `.sticky-tag` rotated labels, `.cloud-badge`
   - `app/globals.css` uses `!important` overrides forcing `font-serif` -> `Montserrat` and `font-mono` -> `Sora`.
2. **Split Font Loading**:
   - `app/fonts.ts` configures `next/font/google` (`Montserrat`, `DM_Sans`, `Sora`), while `app/layout.tsx` loads Google Fonts via `<link>` tags AND `app/globals.css` uses `@import url(...)`!
3. **Bloated Cartoon Landing Page (`app/page.tsx`)**:
   - Currently **1,116 lines** implementing tilted polaroid cards, `DoodleDaisy`, `DoodleClaudCloud`, `DoodleSleepingCat`, `DaisyMonaLisaCollage` from `components/ui/Doodles.tsx`, and `public/images/mona-lisa-*.png`.
4. **Heavy Neo-Brutalist Primitives (`components/ui/*`)**:
   - `Button.tsx` renders neon lime `#D4F77C` / lavender `#EDE9FE` pills with `border-2 border-ink-900 shadow-[2px_2px_0px_#121214]`.
   - `Card.tsx` uses `rounded-[var(--r-xl)] border-2 border-[var(--ink-900)] shadow-[4px_4px_0px_var(--ink-900)]`.
   - `MedicineCard.tsx` renders neon lime buttons and heavy black borders.
   - `RiskBadge.tsx` puts `shadow-[1.5px_1.5px_0px_rgba(18,18,20,0.8)]` and `border-2` on every pill.

**Goal**: Transform CareBridge into a calm, crisp, high-trust **modern clinical SaaS interface** (reference aesthetic: Linear, Stripe, Apple Health, Modern Clinical EHR — clean light neutral surfaces, `1px` subtle borders, refined typography, generous spacing, zero cartoons, zero brutalist drop shadows).

---

## Copy-Pasteable Prompts (Execute in Order: Prompt 1 -> Prompt 5)

---

### PROMPT 1 — Design Tokens, Font Unification & Abolishing Neo-Brutalism

```text
You are working as the UI/UX Designer (Aman) on the CareBridge repository (Next.js 16.3.8, React 19, Tailwind CSS 3.4).
Read design/tokens.css, app/globals.css, app/fonts.ts, app/layout.tsx, tailwind.config.ts, design/motion.ts, and docs/DESIGN.md first.
ONLY touch design/**, app/globals.css, app/fonts.ts, app/layout.tsx, tailwind.config.ts, and docs/DESIGN.md.

Task 1 — Consolidate Font Loading (app/fonts.ts & app/layout.tsx):
- Update app/fonts.ts to export clean clinical SaaS fonts via `next/font/google`:
  - `fontDisplay`: `Plus_Jakarta_Sans` (weights 500, 600, 700, variable `--font-display`)
  - `fontBody`: `DM_Sans` (weights 400, 500, 700, variable `--font-body`)
  - `fontData`: `Sora` (weights 500, 600, 700, variable `--font-data`) — used strictly with `tabular-nums` for telemetry metrics and timestamps.
  - Keep alias exports (`montserrat = fontDisplay`, `dmSans = fontBody`, `sora = fontData`) only if any component imports them, or audit & clean cleanly.
- Update app/layout.tsx:
  - Remove the manual Google Fonts `<link>` tags from `<head>`.
  - Apply `${fontDisplay.variable} ${fontBody.variable} ${fontData.variable}` onto `<html>` and set clean body defaults: `min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased`.

Task 2 — Replace design/tokens.css & app/globals.css:
- Completely abolish Neo-Brutalism tokens in design/tokens.css and replace with a Minimal Clinical SaaS Palette:
  - Canvas & Surfaces:
    --canvas-paper: #F8FAFC;
    --surface-0:    #FFFFFF;
    --surface-50:   #F1F5F9;
    --surface-100:  #E2E8F0;
    --surface-warm: #F8FAFC;
    --surface-teal: #F0FDFA;
  - Text & Borders:
    --ink-900: #0F172A;  /* primary text */
    --ink-800: #1E293B;
    --ink-700: #334155;  /* secondary body text */
    --ink-500: #64748B;  /* muted labels */
    --ink-300: #CBD5E1;  /* hairline borders */
    --ink-200: #E2E8F0;  /* card & divider borders */
  - Clinical Brand Accents:
    --brand-teal:       #0D9488;
    --brand-teal-hover: #0F766E;
    --brand-indigo:     #4F46E5;
    /* Keep legacy variable names mapped softly so zero pages break during migration: */
    --accent-lime:      #F0FDFA;
    --accent-lavender:  #F1F5F9;
    --accent-yellow:    #FFFBEB;
    --accent-pink:      #0D9488;
  - Semantic Risk Colors (strictly for clinical status — never decoration):
    --risk-red:      #DC2626;
    --risk-red-bg:   #FEF2F2;
    --risk-amber:    #D97706;
    --risk-amber-bg: #FFFBEB;
    --risk-green:    #15803D;
    --risk-green-bg: #F0FDF4;
  - Minimal Borders, Radii & Soft Elevation:
    --border-width: 1px;
    --r-sm: 6px;  --r-md: 10px;  --r-lg: 14px;  --r-xl: 16px;  --r-pill: 9999px;
    --shadow-card:  0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06);
    --shadow-hover: 0 4px 12px rgba(15, 23, 42, 0.08);
    --shadow-brutal: none; --shadow-brutal-sm: none; --shadow-brutal-lg: none;
- In app/globals.css:
  - Remove `@import url(...)` external font sheet.
  - Delete `.bg-grid-paper` graph paper pattern (replace with plain clean `background-color: var(--canvas-paper)` if referenced), delete `.highlight-pink`, `.highlight-yellow`, `.highlight-lime`, `.btn-tactile`, `.sticky-tag`, `.cloud-badge`, and remove `!important` font hacks.
  - Add `.tabular-nums { font-variant-numeric: tabular-nums; }` and crisp `:focus-visible` ring (`2px solid #0D9488`, `outline-offset: 2px`).
- Update tailwind.config.ts to reference `var(--font-display)`, `var(--font-body)`, `var(--font-data)` and clean clinical tokens (`brand.teal`, `surface.*`, `ink.*`, `shadow-card`).
- Update design/motion.ts with restrained, subtle clinical motion (`duration: 0.16–0.22`, `ease: "easeOut"`) and keep `prefers-reduced-motion` support.
- Update docs/DESIGN.md to document the new Minimal Clinical SaaS design language.

Run `npm run lint && npm run build` and verify zero regressions.
```

---

### PROMPT 2 — Refactor All 20+ Primitives in `components/ui/` & Add Clinical Cards

```text
You are working as the UI/UX Designer (Aman) on CareBridge.
Read components/ui/index.ts and inspect every file inside components/ui/*.
ONLY touch components/ui/**. Keep ALL exported component names and TypeScript prop signatures backwards-compatible so Swapnil and Aryan's imports never break!

Task 1 — Refactor Existing Primitives to Minimal Clinical SaaS Quality:
1. Card.tsx:
   - Default card: `bg-white border border-[#E2E8F0] rounded-xl shadow-[var(--shadow-card)]` (NO 2px black border, NO 4px offset drop shadow).
   - Map `flat`, `bordered`, `lavender`, `yellow`, `lime` cleanly to subtle refined surfaces (`bg-[#F8FAFC]`, `bg-[#F0FDFA] border-[#CCFBF1]`, `bg-[#FFFBEB] border-[#FDE68A]`) so callers never crash and zero neon colors remain.
   - Interactive hover: smooth subtle `hover:border-[#CBD5E1] hover:shadow-[var(--shadow-hover)] transition-all duration-150`.
2. Button.tsx:
   - `primary`: `bg-[#0D9488] text-white hover:bg-[#0F766E] border border-transparent shadow-sm`
   - `secondary` / `outline`: `bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F8FAFC] shadow-xs`
   - `ghost`: `bg-transparent text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A]`
   - `dark`: `bg-[#0F172A] text-white hover:bg-[#1E293B]`
   - `danger`: `bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:bg-[#FEE2E2]`
   - `success`: `bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] hover:bg-[#DCFCE7]`
   - Smooth rounded-lg / rounded-full styling, clean focus ring, crisp disabled state, minimum 44px height on `md`, 48px+ on `lg`.
3. RiskBadge.tsx:
   - Clean semantic pill (`border`, soft tint background, crisp icon + label + tabular score, NO heavy `shadow-[1.5px_1.5px_0px_...]`, NO `border-2`).
4. StatTile.tsx, PatientRow.tsx, ReasonList.tsx, AuditRow.tsx, ConsentToggle.tsx, EmptyState.tsx, Skeleton.tsx, Toast.tsx:
   - Strip ALL `border-2 border-ink-900`, `shadow-brutal*`, and bright yellow/lime/pink backgrounds.
   - Use crisp `1px solid #E2E8F0` dividers, clean tabular numbers (`font-data tabular-nums`), calm spacing, and clear typographic hierarchy.
5. MedicineCard.tsx & GoalItem.tsx & DoctorNoteCard.tsx:
   - MedicineCard: clean white card, pill dosage tag (`bg-[#F1F5F9] text-[#334155]`), schedule clock icon, food timing chip, and crisp teal `"Mark Taken"` button (`min-h-[44px]`) or subtle green `"Taken ✓"` state.
   - GoalItem & DoctorNoteCard: subtle left teal accent bar (`border-l-2 border-l-[#0D9488]`), generous senior-friendly touch target (`>= 52px`), zero childish borders.
6. VoiceButton.tsx:
   - Clean clinical circular microphone control (`bg-[#0D9488]` idle -> soft pulsing `#DC2626` recording ring when listening; NO `#FF5C98` hot pink or hard black shadow).
7. BriefPanel.tsx & WearablePanel.tsx & TrendChart.tsx:
   - BriefPanel: sleek slide-over sheet (`bg-white border-l border-[#E2E8F0] shadow-xl`), clean section headers (`Since last visit`, `Concerns`, `Suggested checks`), minimal citation chips (`#id · value · time`), escape key + backdrop close, mandatory `"Clinical decision support · Doctor decides."` footer.
   - WearablePanel & TrendChart: clean Recharts charts with subtle `#E2E8F0` dashed gridlines, crisp `#0D9488` / `#4F46E5` / `#64748B` strokes, clear tooltips, and semantic anomaly banners only when real flags exist.
8. CareBridgeLogo.tsx:
   - Minimal geometric medical-bridge mark + crisp wordmark in `#0F172A` with `#0D9488` accent.
9. Retire Cartoons (`Doodles.tsx` & `Illustration.tsx`):
   - Replace cartoon/Mona Lisa artwork in `Illustration.tsx` and `Doodles.tsx` with clean minimal SVG system icons/placeholders or remove unused doodle clutter so zero childish illustrations exist anywhere in the codebase (check `grep -rn "Doodles\|DaisyMonaLisa"` to ensure nothing imports deleted symbols).

Task 2 — Add New Clinical Components & Export in components/ui/index.ts:
1. PrescriptionCard.tsx:
   - Props: `{ prescription: Prescription; readonly?: boolean; onToggleMedicine?: (medicineId: string) => void; medLogs?: MedLog[] }`
   - Displays prescribing physician, issued timestamp, follow-up date, doctor summary, medicine rows (name, dosage, times chips, `"With food"` / `"Before food"` badge, optional interactive check-off), and prescribed lifestyle targets (diet, steps, calories).
2. DiagnosisCard.tsx:
   - Props: `{ report: DiagnosisReport; compact?: boolean; onInspect?: () => void }`
   - Clean clinical summary card with urgency badge (`routine`, `soon`, `urgent`, `emergency`), AI summary, risk flag pills, lifestyle recommendations, and `"Verified by Dr. Meera Rao"` vs `"Pending physician review"` badge + `"AI decision support"` label.
3. WatchSyncPill.tsx:
   - Props: `{ provider?: string; lastSyncedAt?: string | null; status?: 'connected' | 'syncing' | 'offline' }`
   - Subtle green/teal live indicator pill showing wearable bridge status.

Run `npm run lint && npm run build`. Fix any broken imports across the repo if a retired symbol was referenced.
```

---

### PROMPT 3 — Rebuild Minimal Startup Landing Page (`app/page.tsx`)

```text
You are working as the UI/UX Designer (Aman) on CareBridge.
Read 00_MASTER_PLAN.md and inspect app/page.tsx (currently 1,116 lines of Neo-Brutalist scrapbook UI).
ONLY touch app/page.tsx (and optionally small landing subcomponents in components/ui/ if needed).

Goal: Replace the entire 1,116-line Neo-Brutalist page with a crisp, investor-ready, high-trust Google BuilderCon startup landing page (~250–350 lines total).

Design & Content Architecture:
1. Minimal Sticky Top Header:
   - Left: CareBridgeLogo
   - Center: `How It Works`, `Clinical Loop`, `Portals` anchor links (DM Sans 14px `#64748B` hover `#0F172A`)
   - Right: `"Watch Live Sim"` ghost link (`/sim`) + `"Open App"` primary teal button (`/doctor/p1` or portal chooser).
2. Hero Section (Clean 2-column grid, generous whitespace, zero doodles):
   - Left column:
     - Subtle eyebrow pill: `"Clinical Telemetry SaaS · Google BuilderCon"`
     - Display H1: `"Turn smartwatch analytics into real medical diagnosis."`
     - Subheadline: `"We don't touch watch firmware. CareBridge syncs authorized wearable vitals, generates AI-assisted clinical diagnosis reports, replaces paper prescriptions with closed-loop digital care plans, and equips patients with a voice-activated local LLM companion."`
     - Primary CTA row: `"Doctor Cockpit"` (`/doctor/p1`), `"Patient App"` (`/patient`), `"Guardian Portal"` (`/family`), `"Live Demo Sim"` (`/sim`).
   - Right column — Interactive Telemetry-to-Prescription Flow Preview Card:
     - Clean `#FFFFFF` card with subtle border showing a live animated step-through (clean `setInterval` or interactive state buttons `"Normal Baseline"` vs `"Simulate SpO2 Drop (88%)"`):
       - Watch Telemetry Feed (`HR 72 -> 109 bpm`, `SpO2 97% -> 88%`, `BP 140/88 mmHg`, `Steps 2,840`)
       - Risk & AI Diagnosis Flag (`HIGH RISK · Respiratory / Autonomic Review`)
       - Digital Prescription Sync (`Metformin 500mg · Salbutamol PRN · 4,500 steps/day`)
       - Delivery Chips (`Watch Companion Synced ✓`, `Guardian Notified ✓`)
3. 3-Step Closed-Loop Architecture Strip (`#how-it-works`):
   - Step 1: **Watch Data Bridge (Zero Firmware Changes)** — Authorized sync via Google Fit / Health Connect / wearable APIs captures HR, SpO2, BP, glucose, steps, calories, and sleep continuously.
   - Step 2: **AI Diagnosis & Paperless Prescriptions** — Deterministic risk scoring + local/cloud AI synthesis produce structured diagnosis reports; physicians issue digital prescriptions and lifestyle targets in 1 click.
   - Step 3: **Voice Local LLM & Guardian Loop** — Patients check off medicines, receive companion watch updates, and ask spoken food/vitamin/sugar/cholesterol questions; family supervisors stay informed in plain language.
4. 4-Portal Ecosystem Grid (`#portals`):
   - 4 crisp equal-height cards with `1px` borders linking cleanly to `/patient`, `/doctor/p1`, `/family`, and `/admin` + `/sim`.
5. Privacy, Clinical Guardrails & Footer:
   - Highlight: Row-level security (Supabase RLS), DPDP Act category consent toggles, offline-capable local LLM (`Ollama llama3.2`), HL7 FHIR R4 (ABDM) interoperability, and `"Clinical decision support · Treating physician always decides"`.

Verify mobile (`375px`) and desktop (`1280px`) layout with zero horizontal overflow. Run `npm run lint && npm run build`.
```

---

### PROMPT 4 — Build the Complete Guardian / Supervisor Portal (`app/(family)/family/page.tsx`)

```text
You are working as the UI/UX Designer (Aman) on CareBridge.
Read 00_MASTER_PLAN.md, lib/types.ts, and app/(family)/family/page.tsx.
ONLY touch app/(family)/** (and optionally add app/guardian/page.tsx redirecting cleanly to /family).

Target User: A concerned spouse, parent, or adult child checking on a loved one wearing the smartwatch from their phone (`375px`) or desktop.
Core Question Answered: "Is Ramesh okay right now, did he take his medicines, and what did the doctor prescribe?"

Language & UX Rules (STRICT):
- NEVER display raw medical jargon on Guardian screens:
  - Say "Blood Oxygen" (not "SpO2")
  - Say "Heart Rate" (not "nocturnal PPG")
  - Say "Blood Pressure" (not "systolic hypertension")
- Pair every status color with clear text + lucide icon (`Normal`, `Watch closely`, `High — Doctor Notified`).
- Read-only with respect to medical data (guardians monitor, cheer/remind, and call — never modify prescriptions).

Implementation Spec for app/(family)/family/page.tsx:
1. Data Fetching & Real-time Refresh:
   - Poll `GET /api/family/p1/feed` every 4 seconds (and fetch `GET /api/patients/p1/prescriptions` + `GET /api/patients/p1/diagnosis` if not already bundled in feed response) with clean loading skeletons (`<Skeleton />`) on initial mount.
   - Language switcher (`EN | हिंदी | ಕನ್ನಡ`) using `lib/i18n` synced with `localStorage`.
2. Calm Status Banner:
   - Shows `"Monitoring: Ramesh K. (62y)"`, `WatchSyncPill`, and overall plain-language status:
     - Green: `"Stable today — Vitals and medicines on track"`
     - Yellow/Amber: `"Watch closely — Check today's alert below"`
     - Red: `"Urgent update — Dr. Meera Rao has been notified automatically"`
   - Quick Contact Actions: `[Call Ramesh]` (`tel:...`), `[Call Dr. Meera Rao]` (`tel:...`), `[Send Gentle Reminder]` (triggers patient reminder toast + feed update).
3. Live Watch Vitals Grid (2x2 on mobile, 4-col on desktop):
   - **Blood Oxygen**: e.g. `97%` (`Normal`) or `88%` (`Critical — Doctor Notified`)
   - **Resting Heart Rate**: e.g. `72 beats/min`
   - **Blood Pressure**: e.g. `138/88`
   - **Daily Activity**: e.g. `2,840 steps · 310 kcal`
4. Active Doctor Prescription & Latest Diagnosis Summary:
   - Plain-language card showing Dr. Meera Rao's latest verified summary, active prescribed medicines, and daily lifestyle targets (diet rule, step goal, calorie burn goal) so the guardian knows what the patient should be following today.
5. Today's Medicine & Lifestyle Adherence Tracker:
   - Read-only checklist showing each medicine (`Metformin 500mg — Taken at 8:15 AM ✓`, `Metformin 500mg — Due at 8:00 PM`) and daily progress bar (`e.g. 2 of 3 doses taken · 67%`) + lifestyle step/goal progress bar.
6. Chronological Activity & Escalation Feed:
   - Uses refactored `<AlertItem />`, sorted urgent-first / newest-first (`doctor / critical > doctor_note > wearable_anomaly > family > reminder`).
   - Clear relative timestamp footer (`"Updated just now"` / `"Updated 2 min ago"`).
7. Supervisor WhatsApp Notification Panel:
   - Displays guardian WhatsApp number (`+91 98450 12345`), notification toggle status, and a `"Send Test WhatsApp Update"` button wired to `POST /api/notifications/whatsapp` with live confirmation toast.

Verify at 375px (mobile) and 1280px (desktop). Run `npm run lint && npm run build`.
```

---

### PROMPT 5 — Cross-Portal UI & Responsive Polish Pass (Final QA)

```text
You are working as the UI/UX Designer (Aman) on CareBridge.
Now that Swapnil (Patient Portal) and Aryan (Doctor/Admin/Sim) have wired their features, run a strict repo-wide visual consistency and accessibility audit across:
app/page.tsx, app/(patient)/**, app/(doctor)/**, app/(family)/**, app/(admin)/**, app/sim/page.tsx, and components/**.

Run these exact checks via terminal:
1. Neo-Brutalist leftover grep:
   grep -rn "shadow-brutal\|shadow-\[.*#121214\|bg-grid-paper\|highlight-pink\|highlight-lime\|highlight-yellow\|Doodle\|MonaLisa\|#FF5C98\|#D4F77C\|#FEE159" app/ components/
   → Eliminate every single visual match (coordinate quick fixes or clean shared classes).
2. Font consistency grep:
   grep -rn "JetBrains\|Arial\|Times New Roman\|Comic Sans\|@import url" app/ components/ design/
   → Ensure 0 matches; only our unified next/font/google stack (`Plus Jakarta Sans`, `DM Sans`, `Sora`) is active.
3. Responsive & Accessibility verification:
   - Verify 375px mobile viewport on `/`, `/patient`, `/patient/medicines`, `/patient/voice`, `/patient/watch`, and `/family`: zero horizontal scroll (`scrollWidth <= innerWidth`).
   - Verify all interactive touch targets on `/patient/**` and `/family` are >= 44px (`>= 48px` for primary patient buttons).
   - Verify modals/drawers (`BriefPanel`, `DoctorNoteModal`, `PrescriptionWriterModal`, `FhirExportDrawer`, `WhatIfSimulator`) close on `Escape` and backdrop click.
   - Verify every AI output surface includes `"Clinical decision support · Doctor decides"` attribution.
4. Run `npm run lint && npm run build` and verify zero errors and zero warnings that block production build.
```

---

## Daily Verification Matrix for Aman

- [ ] `design/tokens.css`, `app/globals.css`, `app/fonts.ts`, `app/layout.tsx`, and `tailwind.config.ts` completely clean of Neo-Brutalism and cartoon assets.
- [ ] All 20+ primitives in `components/ui/*` refactored + `PrescriptionCard`, `DiagnosisCard`, `WatchSyncPill` exported cleanly.
- [ ] `app/page.tsx` rebuilt as a tight, crisp startup homepage (~250–350 lines) with interactive telemetry preview.
- [ ] `app/(family)/family/page.tsx` displays plain-language watch vitals, active Rx & diagnosis summary, adherence progress, chronological alerts, and WhatsApp test trigger.
- [ ] Full repo grep shows zero `shadow-brutal`, `bg-grid-paper`, `#FF5C98`, `#D4F77C`, `#FEE159`, or cartoon doodle leftovers.
- [ ] `npm run lint && npm run build` green.
