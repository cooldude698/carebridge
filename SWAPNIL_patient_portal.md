# SWAPNIL — Patient Portal, Watch Bridge & Voice-Activated Local LLM
## Google BuilderCon | CareBridge (`carebridge` Next.js 16.3.8 App Router)
### Owns: `app/(patient)/**` · `components/patient/**` · `lib/voice/**` · `lib/i18n/**`

> **Team Rule**: Flat 4-person peer team (no leader). You own the entire **patient experience**: live watch telemetry & Watch Companion sync preview, paperless digital prescription & lifestyle check-offs, medical diagnosis reports viewer, Google Fit OAuth connector, **voice-activated local LLM (`Ollama llama3.2`)** food/vitamin/sugar/cholesterol/disease Q&A, multilingual localization (`en/hi/kn`), and patient WhatsApp alert preferences.
> **Verified Stack**: Next.js 16.3.8 App Router, React 19.2.8, Tailwind CSS, Recharts `^2.12.7`, `lucide-react`, Browser Web Speech API (`SpeechRecognition` + `window.speechSynthesis`), `lib/i18n/` (`en`, `hi`, `kn`).
> **Hard Boundary**: Import UI primitives from `@/components/ui` (Aman) and shared types from `@/lib/types` (Vedesh). Never edit `app/api/**`, `lib/risk/**`, `supabase/**`, or `app/(doctor)/**`.

---

## 0. Pre-Flight Audit: Exact Bugs & Gaps in the Current Patient Portal

Inspecting the actual repository revealed these concrete bugs and missing workflows in your folders:
1. **Static Mock Data Lock-In**:
   - `app/(patient)/patient/medicines/page.tsx` initializes `useState<Medicine[]>(SEED_MEDICINES)` and `useState<MedLog[]>(INITIAL_MED_LOGS)` and never fetches active prescriptions or live logs from the backend!
   - `app/(patient)/patient/vitals/page.tsx` initializes `useState<Vital[]>(INITIAL_VITALS)` statically and lacks watch telemetry tabs (`HR`, `SpO2`, `BP`, `Glucose`, `Steps`, `Calories`, `Sleep`).
2. **Broken Medicine ID in `voice/page.tsx`**:
   - Line 107 of `app/(patient)/patient/voice/page.tsx` hardcodes `medicineId: 'med-metformin-night'`, whereas actual seeded IDs in `localStore.ts` and `supabase/seed.sql` are `'m1'`, `'m2'`, etc.!
3. **No Local LLM Q&A Mode Yet**:
   - `app/(patient)/patient/voice/page.tsx` only passes speech through deterministic regex `parseVoiceIntent()` (`LOG_MED_TAKEN`, `LOG_BP`) and falls back to `"Unknown command"`! There is **no conversational local LLM integration** yet for asking food/nutrition/vitamin/sugar/cholesterol/oil/disease questions.
4. **Missing Core Patient Pages**:
   - No `/patient/reports` page to read structured medical diagnosis reports & doctor notes.
   - No `/patient/watch` page for Google Fit OAuth connection + viewing the compact **Watch Companion Sync Payload** (medicines, step goal, calorie goal, diet rule pushed from the doctor's prescription without touching watch firmware).
5. **Old Neo-Brutalist & Narrow Phone Frame CSS**:
   - `PatientHeader.tsx`, `BottomNav.tsx`, and `patient/*.tsx` contain `border-2 border-ink-900`, `shadow-[...]`, `#FF5C98`, `#D4F77C`, and hard phone-mockup borders on desktop (`md:border-x-2`).

---

## Copy-Pasteable Prompts (Execute in Order: Prompt 1 -> Prompt 5)

---

### PROMPT 1 — Clean Patient Navigation Shell & Live Patient Home (`app/(patient)/`)

```text
You are working as the Patient Portal Engineer (Swapnil) on CareBridge (Next.js 16.3.8 App Router, React 19, Tailwind CSS).
Read 00_MASTER_PLAN.md, lib/types.ts, components/ui/index.ts, components/patient/PatientHeader.tsx, components/patient/BottomNav.tsx, and app/(patient)/patient/page.tsx.
ONLY touch app/(patient)/**, components/patient/**, lib/voice/**, and lib/i18n/**.

Task 1 — Refactor components/patient/PatientHeader.tsx & BottomNav.tsx (Minimal Clinical SaaS):
- Remove all Neo-Brutalist styles (`border-2 border-ink-900`, `shadow-[...]`, `#FF5C98`, `#D4F77C`).
- PatientHeader.tsx:
  - Clean sticky white bar (`bg-white/95 backdrop-blur border-b border-[#E2E8F0]`).
  - Left: back button when `showBack` or CareBridgeLogo (`sm`).
  - Right: crisp segmented language switcher (`EN | हिंदी | ಕನ್ನಡ`), quick links to Watch Sync (`/patient/watch`), Privacy/Alerts (`/patient/consent`), and Clinic Call (`tel:+918023456789`). All buttons >= 44px touch target.
- BottomNav.tsx:
  - Fixed clean bottom navigation bar (`bg-white border-t border-[#E2E8F0]`):
    1. `Home` (`/patient`, Home icon)
    2. `Meds & Rx` (`/patient/medicines`, Pill icon)
    3. `Ask AI` (`/patient/voice`, elevated teal `#0D9488` circular Mic icon)
    4. `Vitals` (`/patient/vitals`, Activity icon)
    5. `Reports` (`/patient/reports`, FileText icon)
  - On desktop (>= 768px), center cleanly inside a responsive max-w-3xl or max-w-2xl container rather than looking like a cramped phone bezel (`remove md:border-x-2 md:max-w-md` phone-frame box across all patient pages; use `max-w-2xl mx-auto`).

Task 2 — Upgrade Patient Home (app/(patient)/patient/page.tsx):
- Remove reliance on static SEED_MEDICINES/INITIAL_MED_LOGS defaults as primary truth. Fetch live data on mount (with clean loading skeletons `<Skeleton />` and graceful error retry):
  - `GET /api/patients/p1?actor=patient`
  - `GET /api/patients/p1/prescriptions`
  - `GET /api/patients/p1/diagnosis`
  - `GET /api/patients/p1/goals`
- Render a calm, senior-friendly (body text >= 18px, touch targets >= 48px), clutter-free Home:
  1. **Greeting & Watch Sync Header Card**:
     - `"Good morning, Ramesh ji"` (localized via `lib/i18n`), `<WatchSyncPill />` showing watch connection (`Google Fit Bridge · Synced 2 min ago`), and quick link `"View Watch Sync →"` (`/patient/watch`).
  2. **4 Live Watch Telemetry Summary Tiles** (2x2 mobile, 4-col desktop):
     - Blood Oxygen (`SpO2 %`), Heart Rate (`bpm`), Blood Pressure (`mmHg`), Steps & Calories burned (`kcal`).
     - Keep calm labels without frightening clinical jargon.
  3. **Next Dose & Quick Medicine Check-Off**:
     - Shows the next pending medicine from the active digital prescription + 1-tap primary teal `"Mark Taken ✓"` (`POST /api/patients/p1/med-log` using the real `medicine.id`).
  4. **Active Lifestyle & Diet Targets Card** (from active prescription + `patient_goals`):
     - Shows prescribed food/diet guidance, daily step goal (`e.g. 4,500 steps`), and calorie burn target (`350 kcal`) using `<GoalItem />` with 1-tap completion (`POST /api/patients/p1/goals/[goalId]/complete`).
  5. **Latest Medical Diagnosis Summary Card**:
     - Uses `<DiagnosisCard compact />` showing Dr. Meera Rao's latest verified diagnosis summary or recommended actions, with link `"Read Full Report →"` (`/patient/reports`).
  6. **Ask CareBridge Voice AI Banner**:
     - Clean prompt card linking to `/patient/voice`: `"Ask by voice about food, vitamins, sugar, cholesterol, or log your medicines."`

Verify mobile (375px) and desktop (1280px). Run `npm run lint && npm run build`.
```

---

### PROMPT 2 — Paperless Digital Prescriptions, Lifestyle Check-Off & Diagnosis Reports

```text
You are working as the Patient Portal Engineer (Swapnil) on CareBridge.
Read lib/types.ts, components/ui/PrescriptionCard.tsx, components/ui/DiagnosisCard.tsx, components/ui/MedicineCard.tsx, and app/(patient)/patient/medicines/page.tsx.
ONLY touch app/(patient)/patient/medicines/**, app/(patient)/patient/reports/**, and lib/i18n/**.

Task 1 — Upgrade app/(patient)/patient/medicines/page.tsx (Paperless Prescriptions & Checklist):
- Replace static `SEED_MEDICINES` & `INITIAL_MED_LOGS` with live fetches from:
  - `GET /api/patients/p1/prescriptions`
  - `GET /api/patients/p1?actor=patient` (for today's `medLogs`)
  - `GET /api/patients/p1/goals`
- Layout:
  1. **Today's Adherence Summary Card**:
     - Shows `"X of Y doses taken today (Z%)"` with a clean `#0D9488` progress bar and streak badge.
  2. **Active Digital Prescriptions List** (replaces paper slips completely):
     - Renders each active `Prescription` using `<PrescriptionCard />` (or structured cards):
       - Header: Prescribing doctor (`Dr. Meera Rao`), issued date, follow-up date, doctor summary.
       - Medicine Rows: Medicine name, dosage (`500mg`), scheduled times (`08:00`, `20:00`), `"After food"` / `"With water"` instruction pill, status (`Taken ✓`, `Pending`, `Missed`), and an accessible 48px `"Mark Taken"` toggle calling `POST /api/patients/p1/med-log` with the exact medicine ID (`m.medicine_id || m.id`) and updating compliance % optimistically + from server response.
  3. **Prescribed Lifestyle & Diet Plan Section**:
     - Lists every `lifestyle_target` from the prescription (foods to eat/avoid, daily steps target, daily calorie burn target) paired with interactive `<GoalItem />` check-offs calling `POST /api/patients/p1/goals/[goalId]/complete`.
  4. **Quick Voice Check-Off Link**: `"Prefer speaking? Say 'Maine dawai le li' →"` (`/patient/voice`).

Task 2 — Create Medical Diagnosis Reports Page (app/(patient)/patient/reports/page.tsx):
- Fetch `GET /api/patients/p1/diagnosis` (display `<Skeleton />` while loading, `<EmptyState />` if empty).
- Render a clean list of `DiagnosisReport` items newest-first via `<DiagnosisCard />`:
  - Shows generated date, urgency badge (`Routine`, `Soon`, `Urgent`, `Emergency`), plain-language AI diagnosis summary derived from watch analytics, detected risk flags, suggested next steps / lifestyle recommendations, and `"Verified by Dr. Meera Rao"` (or `"Awaiting Doctor Review"`).
  - Clicking a report opens an accessible detail drawer/modal (Esc & backdrop close) showing the full diagnosis narrative, doctor notes, and cited vital readings.
  - Mandatory bottom clinical note: `"AI-assisted summary reviewed by your physician. Contact Dr. Meera Rao before changing any medication."`

Run `npm run lint && npm run build`.
```

---

### PROMPT 3 — Smartwatch Bridge (`/patient/watch`) & Multi-Vital Telemetry Trends (`/patient/vitals`)

```text
You are working as the Patient Portal Engineer (Swapnil) on CareBridge.
Read 00_MASTER_PLAN.md, lib/types.ts, and app/(patient)/patient/vitals/page.tsx.
ONLY touch app/(patient)/patient/watch/**, app/(patient)/patient/vitals/**, and lib/i18n/**.

Task 1 — Build Smartwatch Bridge & Watch Companion Sync View (app/(patient)/patient/watch/page.tsx):
Explain clearly in the UI why CareBridge works seamlessly across watches without touching watch firmware:
1. **Connected Wearable Source Card**:
   - Displays current device status from `GET /api/patients/p1?actor=patient` (provider: `Google Fit / Health Connect Bridge`, device name, last sync timestamp).
   - Detect `?connected=1` query param after OAuth redirect and show a crisp success toast (`"Smartwatch bridge connected!"`).
   - Action buttons:
     - `"Connect Google Fit"` -> navigates to `/api/wearables/google-fit/connect?patientId=p1`
     - `"Sync Watch Data Now"` -> calls `POST /api/wearables/sync` (`{ patientId: 'p1' }`), shows subtle syncing spinner, and refreshes live vitals immediately.
2. **Watch Companion Sync Preview** (Live Prescription-to-Watch Push):
   - Fetches `GET /api/patients/p1/prescriptions` and displays the active `watch_sync_payload` inside a clean, minimal smart-watch companion preview card:
     - **Next Medicine Alert**: e.g. `"Metformin 500mg · 8:00 PM (After food)"`
     - **Daily Step Goal**: e.g. `"2,840 / 4,500 steps"`
     - **Active Calorie Target**: e.g. `"310 / 350 kcal"`
     - **Diet Rule Alert**: e.g. `"Low-oil, low-GI meals today"`
     - **Sync Status**: `"Auto-updated from Dr. Meera Rao's latest digital prescription"`
   - When Aryan issues a new prescription in the Doctor Portal during the BuilderCon demo, reloading/polling this page shows the Watch Companion payload updated in real time!

Task 2 — Upgrade Watch Telemetry & Manual BP Page (app/(patient)/patient/vitals/page.tsx):
- Remove static `INITIAL_VITALS` initial data lock-in; fetch live from `GET /api/patients/p1/vitals?type=all`.
- Add clean Vital Category Tabs (`Heart Rate`, `Blood Oxygen`, `Blood Pressure`, `Glucose`, `Steps & Calories`, `Sleep`):
  - Render a clean Recharts `<LineChart />` (or `<AreaChart />`) for the selected vital + 4 summary stats (`Latest`, `Average`, `Min`, `Max`) using `Sora` tabular numerals.
- Keep the accessible **Manual Cuff Blood Pressure Logger** (`Systolic`, `Diastolic`, optional `Pulse`) posting to `POST /api/patients/p1/vitals` (`{ type: 'bp', valueA, valueB }`), classifying BP immediately (`Normal`, `Elevated`, `Stage 1`, `Stage 2`), and updating the live chart + history table.

Run `npm run lint && npm run build`.
```

---

### PROMPT 4 — Voice-Activated Local LLM Food, Vitamin & Health Q&A (`app/(patient)/patient/voice/page.tsx` & `lib/voice/*`)

```text
You are working as the Patient Portal Engineer (Swapnil) on CareBridge.
Read 00_MASTER_PLAN.md, lib/voice/useSpeech.ts, lib/voice/intent.ts, lib/voice/index.ts, and app/(patient)/patient/voice/page.tsx.
ONLY touch app/(patient)/patient/voice/** and lib/voice/**.

This is the signature patient experience for BuilderCon: a voice-activated local LLM (`Ollama llama3.2`) that answers real-world food, nutrient, vitamin, blood sugar, cholesterol, oil, and health questions personalized to the patient's prescriptions & vitals — PLUS fast voice med/BP logging.

Task 1 — Upgrade lib/voice/useSpeech.ts & lib/voice/intent.ts:
1. In `lib/voice/useSpeech.ts`:
   - Keep `SpeechRecognition` (`en-IN`, `hi-IN`, `kn-IN`) working cleanly with interim and final transcripts.
   - Add and export a clean TTS helper `speakResponse(text: string, locale: Locale)` and `stopSpeaking()` wrapping `window.speechSynthesis` (selecting `en-IN` / `hi-IN` / `kn-IN` voice if available, rate `0.95`, safe SSR/unsupported guard, returning `isSpeaking` state cleanly).
2. In `lib/voice/intent.ts`:
   - Keep zero-latency deterministic detection for `LOG_MED_TAKEN` and `LOG_BP`.
   - Accept optional `activeMedicines?: { id: string; name: string }[]` when resolving a spoken medicine so we match the REAL `medicine.id` (`m1`, `m2`, etc.) — NEVER hardcode `'med-metformin-night'`.
   - Any natural-language health, symptom, diet, or food question (anything not matched as strict `LOG_MED_TAKEN` or `LOG_BP`) should be classified cleanly as `ASK_AI_HEALTH_QUERY` (`{ type: 'ASK_AI_HEALTH_QUERY', question: rawText }`) so it routes directly to Vedesh's streaming local LLM endpoint `POST /api/ai/ask`!

Task 2 — Rebuild app/(patient)/patient/voice/page.tsx:
1. Load patient context on mount (`GET /api/patients/p1?actor=patient` and `GET /api/patients/p1/prescriptions`) so the header shows `"Tailored for Ramesh K. · Type 2 Diabetes · Hypertension"` and med voice logs resolve against real active medicines.
2. Conversational Assistant Layout (clean chat + voice controls, zero Neo-Brutalist clutter):
   - **Mode / Quick Chips Bar**:
     - Food & Nutrition Question chips (clickable for fast demo or mic blocked fallback):
       - `"How many vitamins & nutrients are in masala dosa? Is it good for my sugar and cholesterol?"`
       - `"Does biryani have too much oil for me to eat today?"`
       - `"Can I eat a banana with my Metformin?"`
       - `"What fruits are safe for my blood pressure?"`
     - Quick Voice Action chips:
       - `"Maine dawai le li"` (Logs next pending dose via `/api/patients/p1/med-log`)
       - `"BP 138 by 86"` (Logs BP via `/api/patients/p1/vitals`)
   - **Streaming Chat Stream (`POST /api/ai/ask`)**:
     - When `ASK_AI_HEALTH_QUERY` fires (by voice or typed submit):
       - Append user bubble immediately.
       - Stream response from `POST /api/ai/ask` (`{ patientId: 'p1', question, language: locale }`) chunk-by-chunk using `res.body.getReader()` + `TextDecoder`.
       - Show subtle badge: `"Local LLM (Ollama llama3.2) · Personalized to your Rx & Vitals"`.
       - Include `[🔊 Read Aloud]` / `[⏹ Stop]` button on every AI answer + an `"Auto-speak replies"` toggle (default ON when triggered via microphone!).
   - **Action Confirmation Cards**:
     - When `LOG_MED_TAKEN` or `LOG_BP` is recognized by voice, show clean confirmation card (`"Log Metformin 500mg as Taken?"` or `"Save BP 138/86 mmHg?"`) and execute against real API (`m1`/`m2`, NEVER `'med-metformin-night'`).
   - **Prominent Bottom Input Dock**:
     - Large accessible `<VoiceButton />` (`Tap to Speak` in `EN / हिंदी / ಕನ್ನಡ`) + clean text input field + `Send` button.

Run `npm run lint && npm run build`. Test both typed Q&A streaming and microphone flow.
```

---

### PROMPT 5 — Multilingual Strings (`lib/i18n/`) & DPDP Consent + WhatsApp Alerts (`consent/page.tsx`)

```text
You are working as the Patient Portal Engineer (Swapnil) on CareBridge.
Read lib/i18n/index.ts and app/(patient)/patient/consent/page.tsx.
ONLY touch lib/i18n/** and app/(patient)/patient/consent/page.tsx.

Task 1 — Expand lib/i18n/index.ts:
Add accurate, natural English (`en`), Hindi (`hi`), and Kannada (`kn`) translations for all new features:
- Digital Prescriptions (`rx.title`, `rx.doctor_issued`, `rx.with_food`, `rx.before_food`, `rx.follow_up`, `rx.lifestyle_title`)
- Medical Diagnosis Reports (`reports.title`, `reports.verified`, `reports.pending_review`, `reports.empty`)
- Watch Companion (`watch.title`, `watch.connect_google_fit`, `watch.sync_now`, `watch.companion_preview`, `watch.step_target`, `watch.calorie_target`)
- Voice Assistant (`voice.title`, `voice.subtitle`, `voice.tap_to_speak`, `voice.listening`, `voice.ask_placeholder`, `voice.auto_speak`, `voice.read_aloud`, `voice.local_llm_badge`)
- WhatsApp Alerts (`alerts.whatsapp_title`, `alerts.whatsapp_desc`, `alerts.send_test`)

Task 2 — Upgrade app/(patient)/patient/consent/page.tsx:
- Keep existing DPDP Act category consent switches (`vitals`, `medicines`, `steps`, `glucose`) wired to `GET/PUT /api/patients/p1/consents` and immutable doctor access audit list (`GET /api/patients/p1/audit`).
- Add a clean **WhatsApp Care Alerts Card**:
  - Shows patient's configured WhatsApp number & guardian alert linkage.
  - Toggle switches for `"New Prescription Alerts"`, `"Missed Medicine Reminders"`, and `"Critical Vital Alerts"`.
  - `"Send Test WhatsApp Message"` button calling `POST /api/notifications/whatsapp` (`{ patientId: 'p1', eventType: 'test_ping' }`) and displaying the response confirmation toast.
- Ensure the page uses Aman's minimal clinical `<Card />`, `<ConsentToggle />`, `<AuditRow />`, and `<Button />` with zero Neo-Brutalist styles.

Run `npm run lint && npm run build` and verify zero TypeScript or ESLint errors.
```

---

## Daily Verification Matrix for Swapnil

- [ ] `/patient`, `/patient/medicines`, and `/patient/vitals` load live data from APIs (zero static mock lock-in).
- [ ] Medicine check-off in `/patient/medicines` and `/patient/voice` posts real `medicine.id` (`m1`, `m2`, etc.) — `'med-metformin-night'` is gone forever.
- [ ] `/patient/reports` renders diagnosis reports with physician verification status and detail drawer.
- [ ] `/patient/watch` shows Google Fit OAuth connect + live Watch Companion payload synced from active digital prescriptions.
- [ ] `/patient/voice` streams personalized answers from `POST /api/ai/ask` (Ollama `llama3.2` + fallback) for food vitamins/nutrients/oil/sugar/cholesterol/disease questions AND supports Web `SpeechSynthesis` playback.
- [ ] All patient routes use Aman's minimal clinical design tokens with `>= 18px` body text and `>= 48px` touch targets.
- [ ] `npm run lint && npm run build` exits with code 0.
