# CareBridge Project Memory

Shared brain for all four humans and every AI agent. Read this first. Update the Status Log and Decisions last. Keep entries short.

## Project
CareBridge: phone health data -> risk-ranked action list for doctors, with family in the loop. Prototype for a shortlisted hackathon pitch. Team name: poweredbycaffine.

## Team and ownership
- Vedesh: lead, patient app, family view, voice, i18n (`app/(patient)`, `app/(family)`, `lib/voice`, `lib/i18n`)
- Aman: doctor portal, admin ROI (`app/(doctor)`, `app/(admin)`, `components/doctor`)
- Swapin: UI/UX, design system (`components/ui`, `design/`, Figma)
- Aryan: backend, risk engine, AI, simulator (`app/api`, `lib/risk`, `lib/ai`, `lib/escalation`, `supabase/`)

## Hard constraints
- Fonts: ONLY Montserrat (primary), DM Sans (secondary), Sora (data). No others. No JetBrains, Arial, Calibri, Inter, Roboto, monospace.
- Theme: warm artist paper canvas (`#FCFBF8`), midnight navy ink (`#0B1F4B`), hand-drawn vector illustrations with offset flat colour blobs (see DESIGN.md).
- Wording: "risk flag, decision support, doctor decides". Never "diagnosis".
- All data is simulated and labelled so.
- Stack: Next.js (App Router) + TS + Tailwind + Supabase + Vercel.

## Frozen contracts
- API routes: ARCHITECTURE.md section 7
- Types: `lib/types.ts`
- Risk bands: Green 0-39, Yellow 40-69, Red 70-100
- Escalation demo delays: 10 s (family), 25 s (doctor)

## Seed patients
| Name | Age | Language | Conditions | Story |
|---|---|---|---|---|
| Ramesh K. | 62 | Hindi | Diabetes, BP | Demo hero; starts Green/Yellow, ends Red |
| Anita S. | 54 | Kannada | BP | Stays Yellow |
| Suresh P. | 48 | English | Diabetes | Stays Green |
Family: Ramesh's son Karan (Bengaluru). Doctor: Dr. Meera Rao, Sunrise Clinic (fictional).

## Decisions log
(Format: date time, who, decision, why)
- 2026-10-06 00:10, Swapin, merged swapin/ui into main with full artist-grade design system, hand-drawn vector illustrations, responsive landing page, and all 16 UI primitives.
- 2026-10-05 23:15, Aryan, implemented localStore with in-memory reactivity & Supabase fallback, so demo operates flawlessly offline or during venue network instability.
- 2026-10-05 22:45, team, one Next.js monorepo, role-switcher instead of real auth, to save time.
- 2026-10-05 22:45, team, rule-based risk engine, LLM only for the brief, so the score is explainable.
- 2026-10-05 22:42, Vedesh, switched AI layer from Gemini/Anthropic to Ollama (llama3.2, local) with fallback template.

## Dependencies added
(next, react, tailwindcss, @supabase/supabase-js, recharts, lucide-react, framer-motion by default)

## Status log
- 2026-10-06 02:30, Swapin, Phase 6 DONE: Completed font audit (strictly Montserrat, DM Sans, Sora), color audit (tokens only, Recharts SVG chart styling exception), design/motion.ts variants (riskBadgeSwap, listSlide layout FLIP, micPulse, prefers-reduced-motion check), accessibility pass (modal focus trap, Escape listeners on BriefPanel & DoctorNoteModal, aria-labels), and populated design/screenshots/.
- 2026-10-06 02:22, Swapin, Phase 5 DONE: Built lib/voice/useBriefStream SSE hook with fallback & token appending, wired real streaming into Doctor Portal; upgraded app/(family)/family/page.tsx and AlertItem with wearable_anomaly & doctor_note alert cards, strict urgency sort order, 3-language switcher (EN/HI/KN), and DM Sans relative timestamp footer.
- 2026-10-06 01:54, Swapin, Phase 4 DONE: upgraded app/(patient)/patient/page.tsx with "Your Health Today" gentle wearable cards, interactive GoalItem (56px touch target), DoctorNoteCard with reminders & optimistic goal completion, and full Hindi/Kannada/English i18n support.
- 2026-10-06 01:38, Swapin, Phase 3 DONE: upgraded app/(doctor)/doctor/[id]/page.tsx with Wearable Data 2nd tab & red anomaly dot, BriefPanel drawer wire-up with citations, DoctorNoteModal care plan updater, and urgent alert banner.
- 2026-10-06 01:35, Swapin, Phase 2 DONE: upgraded components/ui/BriefPanel.tsx to sliding drawer with Framer Motion, dynamic 3-section parsing, citation chips, source badges, and streaming cursor.
- 2026-10-06 01:30, Swapin, Phase 1 DONE: built components/ui/WearablePanel.tsx with 3 Recharts line graphs, Sora numbers, DM Sans labels, deterministic AnomalyBanner strip, and empty/loading states.
- 2026-10-06 01:30, Aryan, Backend Phases 1-5 complete: Wearable processor (buildWearableContext), cited AI brief, SSE stream route (/api/patients/:id/brief/stream), doctor note -> patient goals feedback loop, AI audit endpoint, and hr_spike sim event.
- 2026-10-06 00:15, All, Merged swapin/ui to main. Lint and build clean. Full system operational.
- 2026-10-06 00:05, Vedesh, Phase 4 & 5 DONE: Created complete hackathon submission document (docs/SUBMISSION.md), 2-minute live demo rehearsal guide with contingency playbook (docs/DEMO_SCRIPT.md), 1-page judge disclosure matrix (docs/REAL_VS_SIMULATED.md).
- 2026-10-05 23:55, Vedesh, Phase 3 DONE: Consent settings screen for patient (P5 at app/(patient)/patient/consent/page.tsx), ConsentToggle component with category icons and accessible switch, immutable audit log preview.
- 2026-10-05 23:45, Vedesh, Phase 2 DONE: Web Speech API hook (lib/voice/useSpeech.ts) for hi-IN/kn-IN/en-IN, deterministic intent parser, VoiceButton, full P3 Voice Logging screen with live transcription.
- 2026-10-05 23:35, Team, Phase 4 & Phase 5 DONE: built app/sim/page.tsx interactive demo control panel, verified seed data sanity.
- 2026-10-05 23:25, Swapin, Phase 1 & 2 UI DONE: all 16 UI primitives + hand-drawn vector illustrations + artist paper landing page.
- 2026-10-05 23:18, Aryan, completed Phase 0-3 backend: Postgres schema, seed, types, risk engine (8 rules), 14 API routes, escalation ladder, AI brief fallback.
- 2026-10-05 22:45, Aman, built Doctor Portal (list, details, trends, why-flagged, brief, actions, audit) & Admin ROI.
