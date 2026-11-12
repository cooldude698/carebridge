# CareBridge — Master Architecture & BuilderCon Execution Blueprint
## Google BuilderCon | Team `poweredbycaffine`
### Equal Co-Builders: Swapnil · Vedesh · Aryan · Aman *(Flat peer team — no designated leader)*

---

## 1. Executive Startup Vision & BuilderCon Thesis

> **CareBridge** is a closed-loop clinical telemetry SaaS platform that converts raw consumer smartwatch data into **structured medical diagnosis reports, paperless digital prescriptions, and voice-guided daily care** — connecting patients, treating physicians, and family guardians without installing third-party code on watch firmware.

### The Core Startup Problem & Why Existing Solutions Fail
1. **Watches generate analytics, not medical clarity**: Consumer wearables record heart rate, SpO2, blood pressure, steps, calories, and sleep—but only present isolated charts and generic step rings. Patients do not know what a nocturnal tachycardia spike (`>100 bpm`) or SpO2 dip (`<92%`) actually means for their diabetes or hypertension.
2. **You cannot put custom apps inside closed watch OS firmware**: Third-party startups cannot rewrite proprietary firmware on consumer smartwatches. CareBridge solves this by operating as an **authorized cloud/mobile SaaS intermediary**—ingesting normalized telemetry via Google Fit / Health Connect / wearable REST webhooks and pushing concise, structured prescription updates back to the patient's app & watch notification layer.
3. **Physical paper prescriptions break continuity of care**: Paper slips are lost, illegible, never update patient reminders, and give zero feedback to doctors or family members between 90-day clinic visits. CareBridge **completely abolishes physical prescriptions**: doctors review watch analytics + AI diagnostic summaries + patient voice-reported symptoms ("word of mouth"), then issue a **digital prescription + lifestyle plan** (medicines, food/diet rules, daily step targets, daily calorie targets) that syncs automatically across the **Patient App**, **Watch Companion feed**, **Guardian Portal**, and **WhatsApp**.
4. **Seniors need voice-first local AI for everyday food & health decisions**: Asking *"How many vitamins are in this dish? Does it have too much oil? Is it safe for my blood sugar and cholesterol?"* shouldn't require searching generic blogs. CareBridge embeds a **voice-activated local LLM (`Ollama llama3.2`)** grounded in the patient's active prescriptions, conditions, and live watch vitals.
5. **The current prototype UI looks childish and cluttered**: Our current repository carries a Daisy × Claud neo-brutalist theme (`2px solid #121214` thick borders, `4px` hard drop shadows, graph-paper background, neon pink/lime/yellow badges, Mona Lisa collages, and cartoon doodles). For Google BuilderCon and startup readiness, **Aman** will completely abolish that aesthetic and establish a **professional, minimal, seamless clinical SaaS design system**.

---

## 2. Team Ownership & Non-Colliding Boundaries

> **Governance Rule**: There is **no team leader**. All 4 builders share equal ownership of product quality and merge readiness. Folder boundaries prevent merge conflicts—if you need a change outside your folder, tag the owner with the exact interface needed.

| Builder | Role & Primary Scope | Strictly Owned Paths | Guide File |
|---|---|---|---|
| **Vedesh** | **Backend Engineer** — Postgres/Supabase schema & RLS, dual-mode persistence (`db.ts` + `localStore.ts`), Wearable telemetry ingestion & Google Fit OAuth, Deterministic Risk & Anomaly Engine, AI Diagnosis Reports, Digital Prescriptions CRUD, Local LLM (`Ollama llama3.2`) Q&A & Draft Suggestions APIs, WhatsApp dispatch, ABDM FHIR R4 export, Auth/Role session | `supabase/**`, `lib/types.ts`, `lib/supabase/**`, `lib/risk/**`, `lib/wearable/**`, `lib/escalation/**`, `lib/ai/**`, `lib/fhir/**`, `lib/notifications/**`, `app/api/**` | [`VEDESH_backend.md`](./VEDESH_backend.md) |
| **Aman** | **UI/UX Designer & Guardian Portal** — Completely abolish childish Neo-Brutalism; build the minimal clinical SaaS design system (`tokens.css`, `globals.css`, `tailwind.config.ts`, `fonts.ts`); refactor all 20+ primitives in `components/ui/`; rebuild Landing Page (`app/page.tsx`); build the Guardian/Supervisor Portal (`app/(family)/family/**`); run cross-portal responsive & visual QA | `design/**`, `app/globals.css`, `app/fonts.ts`, `app/layout.tsx`, `tailwind.config.ts`, `components/ui/**`, `app/page.tsx`, `app/(family)/**` | [`AMAN_design_guardian.md`](./AMAN_design_guardian.md) |
| **Swapnil** | **Patient Portal, Watch Bridge & Voice Local LLM** — Patient Portal (`app/(patient)/patient/**`), interactive digital Rx & medicine check-offs, prescribed lifestyle/food/step/calorie tracker, Google Fit OAuth UI & Watch Companion sync preview (`/patient/watch`), Medical Diagnosis Reports viewer (`/patient/reports`), Voice-activated local LLM food/vitamin/sugar/cholesterol Q&A (`/patient/voice` + `lib/voice/*`), `en/hi/kn` localization, WhatsApp alert controls | `app/(patient)/**`, `components/patient/**`, `lib/voice/**`, `lib/i18n/**` | [`SWAPNIL_patient_portal.md`](./SWAPNIL_patient_portal.md) |
| **Aryan** | **Doctor Cockpit, Digital Prescriptions & Demo Ops** — Doctor Overview & live triage queue (`app/(doctor)/doctor/**`), AI Diagnosis Report reviewer & sign-off, Paperless Digital Prescription & Lifestyle Writer (with AI draft suggestions), What-If Medication Simulator, Hospital ROI & AI Audit (`/admin`), BuilderCon Demo Simulator (`/sim`), and cohesive stage seed data | `app/(doctor)/**`, `components/doctor/**`, `app/(admin)/**`, `app/sim/**`, `lib/mockData.ts`, `supabase/seed.sql` *(coordinate with Vedesh)* | [`ARYAN_doctor_portal.md`](./ARYAN_doctor_portal.md) |

---

## 3. Verified Tech Stack (Grounded 100% in `package.json` & Repo)

> **STRICT ACCURACY RULE**: Do NOT reference non-existent packages or folders (`VitalSync`, `Turborepo`, `pnpm`, `apps/web`, `packages/ui`, `packages/types`, `@google/generative-ai`). This project is a **single Next.js 16.3.8 App Router** application managed with **`npm`**.

| Layer | Exact Package / Tech in Repo | Notes & Configuration |
|---|---|---|
| Core Framework | `next@16.3.8` (App Router) | `next.config.ts` / `next.config.mjs` (consolidate duplicate config), `tsconfig.json` (`@/*` -> root) |
| UI Runtime | `react@19.2.8`, `react-dom@19.2.8` | Strict TypeScript (`typescript@^5`) |
| Styling & Tokens | `tailwindcss@^3.4.17`, `clsx@^2.1.1`, `tailwind-merge@^2.5.2` | `tailwind.config.ts`, `design/tokens.css`, `app/globals.css` |
| Icons & Motion | `lucide-react@^0.441.0`, `framer-motion@^12.0.0` | `design/motion.ts` (respecting `prefers-reduced-motion`) |
| Data Visualization | `recharts@^2.12.7` | Heart Rate, SpO2, BP, Glucose, Steps, Calories, ROI charts |
| Database & Realtime | `@supabase/supabase-js@^2.45.4` | Dual-mode: Supabase Postgres + `lib/supabase/localStore.ts` (`USE_LOCAL_STORE=true` safe mode) |
| Local & Cloud LLM | **Ollama (`llama3.2`)** via `fetch()` | `.env.example`: `OLLAMA_BASE_URL=http://localhost:11434`, `OLLAMA_MODEL=llama3.2`; optional `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`; deterministic clinical fallback when offline |
| Voice Recognition & TTS | Browser **Web Speech API** + `window.speechSynthesis` | `lib/voice/useSpeech.ts` (`en-IN`, `hi-IN`, `kn-IN`) + typed fallback |
| Interoperability | **HL7 FHIR R4 (ABDM)** | `lib/fhir/export.ts` (LOINC + SNOMED CT JSON Bundles) |
| Messaging (Optional Live) | **WhatsApp Cloud API / Twilio** | `lib/notifications/whatsapp.ts` with audited simulated log fallback |

### Environment Variables (`.env.example` Target Contract)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Local LLM (Ollama — primary offline-capable inference)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Optional Cloud LLM Fallbacks
GEMINI_API_KEY=
ANTHROPIC_API_KEY=

# Wearable Integration (Google Fit OAuth2)
GOOGLE_FIT_CLIENT_ID=
GOOGLE_FIT_CLIENT_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# WhatsApp Cloud API (optional for live stage messages; logs safely when unset)
WHATSAPP_API_KEY=
WHATSAPP_PHONE_NUMBER_ID=

# Demo & Offline Resilience Flags
NEXT_PUBLIC_DEMO_MODE=true
USE_LOCAL_STORE=false
```

---

## 4. End-to-End Closed-Loop System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. SMARTWATCH / WEARABLE LAYER (No Firmware Modification)                  │
│  Google Fit / Health Connect / WearOS / Demo Simulator                      │
│  Telemetry: HR, SpO2, Systolic/Diastolic BP, Glucose, Steps, Calories, Sleep│
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ POST /api/wearables/ingest (or /api/sim/event)
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. CAREBRIDGE INTELLIGENCE & PERSISTENCE LAYER (Vedesh)                    │
│  • Dual-mode Store (Supabase Postgres + RLS  ⇄  localStore.ts fallback)     │
│  • Deterministic Risk Engine (0–100 score + explicit clinical reason rules) │
│  • Wearable Anomaly Detector (readingId cited to real vitals.id rows)       │
│  • Local LLM (Ollama llama3.2): Diagnosis Reports, Pre-Consult Briefs,      │
│    Rx Suggestions, and Food/Disease Voice Q&A (/api/ai/ask)                 │
│  • 3-Tier Escalation State Machine (Patient -> Family -> Doctor)            │
└───────┬──────────────────────────┬───────────────────────────┬──────────────┘
        │                          │                           │
        ▼                          ▼                           ▼
┌───────────────────┐    ┌──────────────────────┐    ┌────────────────────────┐
│ 3A. DOCTOR COCKPIT│    │ 3B. PATIENT PORTAL   │    │ 3C. GUARDIAN PORTAL    │
│ /doctor/[id]      │    │ /patient/*           │    │ /family                │
│ (Aryan)           │    │ (Swapnil)            │    │ (Aman)                 │
│ • Red/Amber/Green │    │ • Watch sync & vitals│    │ • Plain-language status│
│   triage queue    │    │ • Digital Rx + ✓ med │    │ • Active Rx & diagnoses│
│ • AI diagnosis    │    │   check-off & diet/  │    │ • Today's med & step   │
│   review/sign-off │    │   step/kcal goals    │    │   completion tracker   │
│ • Paperless Rx &  │    │ • Watch Companion    │    │ • Chronological alert  │
│   Lifestyle Writer│───▶│   sync payload       │───▶│   timeline & WhatsApp  │
│ • What-If & FHIR  │    │ • Voice Local LLM Q&A│    │   nudges               │
└───────────────────┘    └──────────────────────┘    └────────────────────────┘
```

### Closed-Loop Propagation Guarantees
Whenever one stakeholder acts, every connected surface reflects it automatically:
1. **Watch Anomaly Ingested** -> `risk_scores` & `wearable_context` update -> `diagnosis_reports` draft synthesized -> Doctor queue re-sorts (`red` top) -> Critical alert fires to Doctor & Guardian + WhatsApp log.
2. **Doctor Issues Digital Prescription** (`POST /api/patients/[id]/prescriptions`) -> `prescriptions`, `prescription_medicines`, `lifestyle_targets`, `patient_goals`, and today's `med_logs` are created atomically -> `watch_sync_payload` updates -> Patient `/patient/medicines` & `/patient/watch` reflect the new plan -> Guardian `/family` timeline shows `"Dr. Meera Rao updated prescription"` -> WhatsApp notification sent.
3. **Patient Checks Off Medicine or Goal** (`POST /api/patients/[id]/med-log` or `/goals/[id]/complete`) -> Compliance % recalculates -> Pending escalation timer clears -> Risk score recomputes -> Doctor & Guardian adherence views update live.
4. **Patient Speaks Question or Symptom** (`/patient/voice` -> `POST /api/ai/ask`) -> Local LLM (`Ollama llama3.2`) reads patient's real conditions, active Rx, and latest vitals -> streams nutrition/safety answer + speaks aloud (`SpeechSynthesis`) -> if symptom detected, logs to `symptom_logs` for Doctor review.

---

## 5. Frozen TypeScript & API Integration Contracts

### A. Canonical App Routes (`app/`)
| Route | Portal | Owner | Purpose |
|---|---|---|---|
| `/` | Landing | Aman | Minimal SaaS startup overview, closed-loop diagram, live interactive preview, portal links |
| `/patient` | Patient | Swapnil | Home dashboard: watch sync pill, vitals snapshot, next medicine check-off, active Rx & diagnosis summary |
| `/patient/medicines` | Patient | Swapnil | Active paperless prescriptions + medicine check-off list + prescribed food/steps/calories goals |
| `/patient/vitals` | Patient | Swapnil | Watch telemetry trends (`HR`, `SpO2`, `BP`, `Glucose`, `Steps`, `Calories`, `Sleep`) + manual BP log |
| `/patient/reports` | Patient | Swapnil | Medical diagnosis reports & doctor notes (plain-language view) |
| `/patient/watch` | Patient | Swapnil | Google Fit OAuth connector + Watch Companion sync preview |
| `/patient/voice` | Patient | Swapnil | Voice-activated local LLM food/vitamin/sugar/cholesterol Q&A + voice med/BP logger |
| `/patient/consent` | Patient | Swapnil | DPDP Act consent toggles, access audit log, WhatsApp alert settings |
| `/doctor` | Doctor | Aryan | Live clinic triage overview + patient roster metrics |
| `/doctor/[id]` | Doctor | Aryan | Full patient cockpit: Watch telemetry, AI diagnosis review, Digital Rx Writer, What-If, FHIR R4 |
| `/family` | Guardian | Aman | Plain-language loved-one status, watch vitals, active Rx & diagnosis, adherence bar, activity feed, WhatsApp |
| `/admin` | Admin | Aryan | Clinic ROI metrics, cost avoidance, AI safety/citation audit table |
| `/sim` | Simulator | Aryan | BuilderCon judge evaluation panel (`spo2_drop`, `hr_spike`, `bp_spike`, `miss_dose`, `steps_drop`, `recover`, `tick`, `reset`) |

### B. Canonical Backend APIs (`app/api/**` — Owned by Vedesh)

#### Core Patient, Vitals & Wearable Endpoints
```text
GET  /api/patients
  → PatientListItem[] (sorted risk score DESC)

GET  /api/patients/[id]?actor=doctor|patient|family
  → PatientDetail & { wearable: WearableContext, activePrescriptions: Prescription[], latestDiagnosis: DiagnosisReport | null, recentSymptoms: SymptomLog[] }

GET  /api/patients/[id]/vitals?type=all|bp|hr|spo2|glucose|steps|calories|sleep&from=ISO&to=ISO
  → { vitals: Vital[], summary: { count, latest, avg, min, max, trend } }

POST /api/patients/[id]/vitals
  Body: { type: 'bp'|'steps'|'glucose'|'hr'|'spo2'|'calories'|'sleep'|'flag_acknowledged', valueA: number, valueB?: number|null, recordedAt?: string }
  → { success: true, vital, risk }

POST /api/wearables/ingest
  Body: { patientId: string, deviceId?: string, provider?: 'google_fit'|'wearos'|'apple_health'|'simulator', readings: Array<{ type, valueA, valueB?, recordedAt? }> }
  → { inserted: number, skipped: number, anomalies: AnomalyFlag[], risk, diagnosisTriggered: boolean, diagnosisReportId?: string }

GET  /api/wearables/google-fit/connect?patientId=p1
  → Redirects to Google OAuth2 (or demo fallback callback when client ID unset)

GET  /api/wearables/google-fit/callback?code=...&state=...
  → Persists wearable_devices tokens, redirects to /patient/watch?connected=1

POST /api/wearables/sync
  Body: { patientId: string }
  → Fetches authorized watch data (or realistic synthetic watch pulse if demo token) and invokes ingest pipeline
```

#### Diagnosis, Prescriptions & Adherence Endpoints
```text
GET  /api/patients/[id]/diagnosis
  → DiagnosisReport[] (newest first)

POST /api/patients/[id]/diagnosis
  Body: { symptomNote?: string }
  → { report: DiagnosisReport, alertCreated?: Alert }

PATCH /api/patients/[id]/diagnosis/[reportId]
  Body: { doctorNotes?: string, verify?: boolean, doctorId?: string }
  → { report: DiagnosisReport }

GET  /api/patients/[id]/prescriptions
  → Prescription[] (active first, nested medicines & lifestyle_targets & watch_sync_payload)

POST /api/patients/[id]/prescriptions
  Body: {
    doctorId?: string,
    diagnosisReportId?: string,
    doctorSummary: string,
    followUpDate?: string,
    medicines: Array<{ medicineName, dosage, frequency, times: string[], duration, withFood: boolean, instructions?: string }>,
    lifestyleTargets: Array<{ category: 'diet'|'steps'|'calories'|'sleep'|'bp'|'glucose'|'other', description: string, targetValue?: number, unit?: string }>
  }
  → { prescription: Prescription, generatedGoalsCount: number, watchSyncPayload: WatchSyncPayload, whatsappStatus: string }

PATCH /api/patients/[id]/prescriptions/[rxId]
  Body: { status?: 'active'|'completed'|'cancelled', doctorSummary?: string }
  → { prescription: Prescription }

POST /api/patients/[id]/med-log
  Body: { medicineId: string, status: 'taken'|'missed' }
  → { success: true, log: MedLog, risk, compliancePct: number }

GET  /api/patients/[id]/goals
  → { goals: PatientGoal[], latestNote: DoctorNote | null }

POST /api/patients/[id]/goals/[goalId]/complete
  → { completedAt: string }
```

#### Local LLM AI, Briefs, Guardian, Notifications & Sim Endpoints
```text
POST /api/ai/ask
  Body: { patientId: string, question: string, language?: 'en'|'hi'|'kn' }
  → Streaming text/plain from Ollama llama3.2 (grounded in patient Rx, conditions, vitals) + fallback

POST /api/ai/prescription-suggestions
  Body: { patientId: string, diagnosisReportId?: string }
  → { medicines: SuggestedMedicine[], lifestyle: SuggestedLifestyle[], source: 'llm'|'fallback', disclaimer: string }

POST /api/patients/[id]/brief
  → BriefResult (Ollama llama3.2 -> fallback)

GET  /api/patients/[id]/brief/stream
  → text/event-stream ({ type: 'token'|'done'|'error' })

POST /api/patients/[id]/doctor-note
  Body: { noteText: string, doctorId?: string }
  → { noteId, parsedInstructions }

GET/PUT /api/patients/[id]/consents
GET     /api/patients/[id]/audit
GET     /api/patients/[id]/fhir           → Live HL7 FHIR R4 Bundle JSON (Patient, Conditions, Observations, MedicationRequests)
GET     /api/family/[id]/feed             → FamilyFeedResponse (+ latestDiagnosis, activePrescriptions, lifestyleProgress, timeline)
POST    /api/notifications/whatsapp       → { sent: boolean, provider: 'meta_cloud'|'simulated', logId: string, preview: string }
POST    /api/doctor/actions               → DoctorActionResponse
POST    /api/escalation/tick              → EscalationTickResponse
POST    /api/sim/event                    → SimEventResponse (miss_dose | bp_spike | hr_spike | spo2_drop | steps_drop | recover)
POST    /api/sim/reset                    → { success: true, message: string }
GET     /api/admin/roi                    → AdminROIResponse
GET     /api/admin/ai-audit               → BriefAuditItem[]
POST    /api/auth/role                    → Sets demo/role session cookie ({ role, userId, patientId })
```

---

## 6. Critical Codebase Fixes Discovered During Audit

Every teammate should be aware of these exact defects already sitting in the repository so none get carried forward:
1. **Duplicate Config Files**: Root contains both `next.config.ts` & `next.config.mjs`, and `eslint.config.mjs` & `.eslintrc.json`. Vedesh resolves & cleans unused duplicates on Day 1.
2. **Hardcoded Wearable Stub**: `lib/wearable/ingester.ts` line 53 literally hardcodes `const meanNocturnalHr = 106;`, and `components/doctor/TrendCharts.tsx` line 29 computes fake `nocturnalHr = idx >= 4 ? 104 + ...`. Both must use real vitals rows.
3. **Partial Supabase Wiring**: Routes in `app/api/patients/route.ts`, `med-log/route.ts`, `vitals/route.ts`, `consents/route.ts`, `family/[id]/feed/route.ts`, `sim/event/route.ts`, and `admin/roi/route.ts` currently ignore Supabase completely. Vedesh wires unified `lib/supabase/db.ts`.
4. **Hardcoded FHIR Export**: `app/api/patients/[id]/fhir/route.ts` ignores `localStore`/DB and reads static `MOCK_PATIENT_DETAILS`; `lib/fhir/export.ts` hardcodes `effectiveDateTime: "2026-10-05T08:30:00Z"`.
5. **Voice Med ID Bug**: `app/(patient)/patient/voice/page.tsx` line 107 posts `medicineId: 'med-metformin-night'` which does not match seeded ID `'m1'`. Swapnil fixes this to match active Rx medicines dynamically.
6. **Hardcoded Doctor Stats**: `app/(doctor)/doctor/page.tsx` displays hardcoded `"42 patients"` and `"88.4% avg"`, and `app/(doctor)/doctor/layout.tsx` passes hardcoded `urgentCount={1}`. Aryan wires these to live `/api/patients` & `/api/admin/roi`.
7. **Font Loading Split**: `app/fonts.ts` uses `next/font/google` while `app/layout.tsx` uses `<link>` tags and `app/globals.css` has `@import url(...)`. Aman unifies fonts cleanly in `app/fonts.ts` + `app/layout.tsx`.

---

## 7. Parallel 4-Phase Build Schedule

### Phase 1 — Schema, Types & Minimal Design Foundation *(Hours 0–6)*
- **Vedesh**: Clean config duplicates -> freeze `lib/types.ts` -> upgrade `supabase/schema.sql` + `supabase/rls.sql` -> scaffold `lib/supabase/db.ts`.
- **Aman**: Abolish Neo-Brutalist tokens (`design/tokens.css`, `app/globals.css`, `tailwind.config.ts`, `app/fonts.ts`, `app/layout.tsx`) -> refactor core `Card`, `Button`, `RiskBadge`, `StatTile`, `Toast`, `EmptyState`, `Skeleton`.
- **Swapnil**: Clean `PatientHeader` & `BottomNav` (using Aman's tokens) -> wire live fetch hydration on `/patient` & `/patient/medicines` -> fix voice `medicineId` mapping.
- **Aryan**: Remove static `42 patients` / `urgentCount={1}` stubs in `/doctor` -> refactor `PatientListPane` & `DoctorHeader` -> draft cohesive BuilderCon seed story in `lib/mockData.ts`.

### Phase 2 — Closed-Loop Telemetry, Diagnosis & Paperless Prescriptions *(Hours 6–16)*
- **Vedesh**: Build `POST /api/wearables/ingest`, Google Fit OAuth endpoints, real `lib/wearable/ingester.ts` + `processor.ts`, upgraded `lib/risk/rules.ts` (`SPO2_CRITICAL`, `HR_NOCTURNAL_HIGH`), `diagnosis` CRUD, `prescriptions` CRUD (with atomic `watch_sync_payload` & `patient_goals` creation), and live FHIR R4 export.
- **Aman**: Finish refactoring `WearablePanel`, `BriefPanel`, `MedicineCard`, `AlertItem`, `DoctorNoteCard`, `GoalItem`, `TrendChart` + add `PrescriptionCard`, `DiagnosisCard`, `WatchSyncPill` -> rebuild minimal Landing Page (`app/page.tsx`).
- **Swapnil**: Build `/patient/medicines` (Rx + lifestyle check-off), `/patient/reports` (diagnosis reports viewer), `/patient/watch` (Google Fit connect + Watch Companion sync preview), and upgrade `/patient/vitals` tabs (`HR`, `SpO2`, `BP`, `Glucose`, `Steps`, `Calories`, `Sleep`).
- **Aryan**: Build Digital Prescription & Lifestyle Writer (`PrescriptionWriterModal.tsx` or `/doctor/[id]/prescribe`) + Diagnosis Report Review/Sign-off tab on `/doctor/[id]`.

### Phase 3 — Local LLM Voice Q&A, Guardian Portal & WhatsApp Loop *(Hours 16–24)*
- **Vedesh**: Build streaming `POST /api/ai/ask` (Ollama `llama3.2` + nutrition/disease prompt + offline fallback), `POST /api/ai/prescription-suggestions`, `POST /api/notifications/whatsapp`, and upgrade `/api/family/[id]/feed` + `/api/sim/event` (`spo2_drop`).
- **Swapnil**: Build conversational Voice & Food/Health Q&A in `/patient/voice` (streaming Ollama output + `SpeechSynthesis` playback + `en/hi/kn` prompt chips) + WhatsApp preference card in `/patient/consent`.
- **Aman**: Build complete plain-language Guardian Portal (`/family`) with watch vitals, active Rx & diagnosis summary, adherence progress bar, chronological timeline, gentle reminder CTA, and test WhatsApp button.
- **Aryan**: Upgrade `/admin` (live ROI + AI audit), upgrade `/sim` (full BuilderCon stage control panel with `spo2_drop`, `hr_spike`, `bp_spike`, `miss_dose`, `steps_drop`, `recover`, `tick`, `reset`), and finalize `supabase/seed.sql` with Vedesh.

### Phase 4 — Integration Hardening & Stage Rehearsal *(Final Sprint)*
- Full `npm run lint && npm run build` verification with zero errors.
- Test offline resilience (`USE_LOCAL_STORE=true` + Ollama stopped -> deterministic fallbacks work seamlessly).
- Test live mode (Supabase connected + `ollama serve` running `llama3.2` -> real streaming Q&A and real Postgres persistence).
- Mobile responsive audit (`375px` viewport across `/`, `/patient/*`, `/family`) and desktop audit (`1280px` across `/doctor/*`, `/admin`, `/sim`).
- Two timed end-to-end 3-minute stage rehearsals starting from `/sim` Reset.

---

## 8. BuilderCon 3-Minute Live Stage Script

| Time | Portal | Live Action & Spoken Pitch |
|---|---|---|
| **0:00–0:30** | `/` (Aman) | Open minimal landing page: *"Consumer smartwatches collect vitals every minute, but they only show charts—not medical diagnoses. And you can't put custom software inside proprietary watch firmware. CareBridge is an intermediary SaaS that turns watch analytics into doctor-verified diagnoses and paperless care."* |
| **0:30–0:55** | `/patient` & `/patient/watch` (Swapnil) | Show Ramesh K. (62M, Type 2 Diabetes & Hypertension). Highlight Watch Companion sync badge, current vitals (`HR 72 bpm`, `SpO2 97%`, `BP 140/88`, `Steps 2,800`), and today's digital medicines. |
| **0:55–1:25** | `/sim` -> `/doctor/p1` (Aryan / Vedesh) | Trigger **`SpO2 Drop (88%)`** + **`Nocturnal HR Spike (112 bpm)`**. Switch to Doctor Cockpit: Ramesh flips immediately to **HIGH RISK (RED)** at top of queue; AI Diagnosis Report synthesizes watch anomalies with real `[Reading:...]` citations. |
| **1:25–2:00** | `/doctor/p1` (Aryan) | Doctor verifies diagnosis, opens **Digital Prescription Writer**, accepts AI-suggested inhaler + Metformin schedule + lifestyle targets (`4,500 steps/day`, `350 active kcal`, `Low-oil low-GI South Indian diet`), clicks **Issue Prescription**. Explain: *"No paper slip—everything syncs digitally."* |
| **2:00–2:35** | `/patient/voice` & `/patient/medicines` (Swapnil) | Show Watch Companion & Patient checklist updated instantly. Tap mic on **Ask CareBridge** (Ollama `llama3.2`): *"Can I eat masala dosa with extra chutney? Is it okay for my blood sugar and cholesterol?"* Stream personalized nutrient/oil/glycemic answer aloud, then tap `✓ Taken` on Metformin. |
| **2:35–3:00** | `/family` & `/admin` (Aman / Aryan) | Switch to Guardian Portal (son Karan in Bengaluru): shows calm plain-language summary (*"Blood oxygen alert reviewed by Dr. Meera Rao · New prescription issued · Evening Metformin taken ✓"*). Flash `/admin` ROI metrics (*"14 readmissions prevented · ₹6.3L clinic savings"*). End with: *"CareBridge: watches track vitals; CareBridge closes the loop."* |
