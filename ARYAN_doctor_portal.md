# ARYAN — Doctor Cockpit, Paperless Prescriptions, Admin ROI & Demo Seed
## Google BuilderCon | CareBridge (`carebridge` Next.js 16.3.8 App Router)
### Owns: `app/(doctor)/**` · `components/doctor/**` · `app/(admin)/**` · `app/sim/page.tsx` · `lib/mockData.ts` · `supabase/seed.sql` *(coordinate with Vedesh)*

> **Team Rule**: Flat 4-person peer team (no leader). You own the entire **physician cockpit**, **AI diagnosis report review & verification**, the **paperless Digital Prescription & Lifestyle Writer** (abolishing physical prescriptions and syncing straight to patient/watch/guardian/WhatsApp), the **What-If Medication Simulator**, the **Hospital ROI & AI Audit Dashboard (`/admin`)**, the **BuilderCon Live Demo Simulator (`/sim`)**, and realistic **demo seed data**.
> **Verified Stack**: Next.js 16.3.8 App Router, React 19.2.8, Tailwind CSS, Recharts `^2.12.7`, `lucide-react`, `framer-motion`.
> **Hard Boundary**: Import UI primitives from `@/components/ui` (Aman) and shared types from `@/lib/types` (Vedesh). Never edit `app/api/**`, `lib/risk/**`, or `app/(patient)/**`.

---

## 0. Pre-Flight Audit: Exact Bugs & Gaps in Your Folders

Inspecting the actual codebase revealed these exact stubs and missing capabilities you own fixing:
1. **Hardcoded Fake Doctor Overview (`app/(doctor)/doctor/page.tsx` & `layout.tsx`)**:
   - `app/(doctor)/doctor/page.tsx` hardcodes `"42 patients"`, `"1 patient"`, `"88.4% avg"`, and `"Ramesh K. (68) Flagged RED"` instead of fetching live data from `GET /api/patients` and `GET /api/admin/roi`.
   - `app/(doctor)/doctor/layout.tsx` passes hardcoded `<DoctorHeader urgentCount={1} />`.
2. **Hardcoded HR Simulation Inside `components/doctor/TrendCharts.tsx`**:
   - Line 29 computes synthetic `nocturnalHr = idx >= 4 ? 104 + (idx - 4) * 4 : ...` instead of reading real `vitals.filter((v) => v.type === 'hr')` rows!
3. **No Paperless Digital Prescription & Lifestyle Writer Yet**:
   - Currently doctors only have `DoctorNoteModal.tsx` (a raw 500-char text box) and `ActionsBar.tsx` (`Call`, `Message`, `Book Teleconsult`). There is **no structured Digital Prescription Writer** for medicines (dosage, frequency, schedule times, duration, food rule) + lifestyle plans (diet/food rules, step target, calorie burn target) + AI draft suggestions.
4. **No AI Diagnosis Report Reviewer Tab**:
   - Doctors can open `BriefPanel` (15s pre-consult brief), but need a full **Diagnosis Reports** tab inside `/doctor/[id]` to review watch-generated medical diagnosis reports + patient voice-reported symptoms (`symptom_logs`) and verify/sign off (`PATCH /api/patients/[id]/diagnosis/[reportId]`).
5. **Incomplete FHIR Drawer Wiring (`components/doctor/FhirExportDrawer.tsx`)**:
   - Currently calls client-side `generateFhirR4Bundle(detail)` directly instead of downloading the live server bundle from `GET /api/patients/[id]/fhir` (which includes live `MedicationRequest` prescriptions and real timestamps).
6. **Incomplete Demo Simulator (`app/sim/page.tsx`)**:
   - Currently only exposes 4 events (`miss_dose`, `bp_spike`, `steps_drop`, `recover`) and omits `hr_spike` (already in backend) and `spo2_drop` (new critical watch drop).
7. **Old Neo-Brutalist Styling**:
   - `doctor/page.tsx`, `doctor/[id]/page.tsx`, `DoctorHeader.tsx`, `PatientListPane.tsx`, `DoctorNoteModal.tsx`, `admin/page.tsx`, and `sim/page.tsx` carry `border-2 border-ink-900`, `shadow-[4px_4px_0px_#121214]`, `#D4F77C`, `#FEE159`, and `Doodles`. Align them cleanly to Aman's minimal clinical SaaS components.

---

## Copy-Pasteable Prompts (Execute in Order: Prompt 1 -> Prompt 5)

---

### PROMPT 1 — Live Doctor Overview, Triage Queue & Real Telemetry Charts

```text
You are working as the Doctor Portal Engineer (Aryan) on CareBridge (Next.js 16.3.8 App Router, React 19, Tailwind CSS).
Read 00_MASTER_PLAN.md, lib/types.ts, components/ui/index.ts, app/(doctor)/doctor/layout.tsx, app/(doctor)/doctor/page.tsx, components/doctor/DoctorHeader.tsx, components/doctor/PatientListPane.tsx, and components/doctor/TrendCharts.tsx.
ONLY touch app/(doctor)/** and components/doctor/**.

Task 1 — Fix Dynamic Header & Layout (DoctorHeader.tsx & app/(doctor)/doctor/layout.tsx):
- Strip Neo-Brutalist `border-2 border-ink-900`, `#D4F77C`, `#FEE159`, `#EDE9FE`, and `shadow-[...]` classes. Use crisp minimal white surfaces (`bg-white border-b border-[#E2E8F0]`) and `#0D9488` clinical teal active links.
- Replace hardcoded `urgentCount={1}` in `doctor/layout.tsx`: let `DoctorHeader` (or a client wrapper) poll `GET /api/patients` every 5 seconds and compute `urgentCount = patients.filter(p => p.band === 'red').length`. Also show a clean `"Dr. Meera Rao · Sunrise Clinic"` header badge and navigation links to `Patients` (`/doctor`), `Admin ROI` (`/admin`), and `Demo Sim` (`/sim`).

Task 2 — Replace Static Stubs in app/(doctor)/doctor/page.tsx:
- Remove `"42 patients"`, `"1 patient"`, `"88.4% avg"`, and static `"Ramesh K. (68) Flagged RED"`.
- Fetch live `GET /api/patients` and `GET /api/admin/roi`:
  - Render top priority banner for the highest-scoring `red` (or `yellow` if none red) patient with real score, real `topReason`, and `"Open Clinical Cockpit →"` (`/doctor/${topPatient.id}`).
  - Render 3 clean `<StatTile />` KPIs computed live from API data: Active Monitored Patients, Urgent / Red Queue Count, and Cohort 7-day Adherence / Alerts Actioned.
  - Use Aman's `<Card />` and minimal clinical typography cleanly.

Task 3 — Upgrade PatientListPane.tsx & Fix TrendCharts.tsx:
- In `PatientListPane.tsx`: clean minimal left rail (`w-full md:w-[340px] bg-white border-r border-[#E2E8F0]`), search bar, `All | High | Watch | Stable` filter pills, and smooth `<PatientRow />` items sorted by risk score DESC.
- In `TrendCharts.tsx`:
  - DELETE line 29 (`const nocturnalHr = idx >= 4 ? 104 + ...`). Read REAL `vitals.filter((v) => v.type === 'hr')` and `vitals.filter((v) => v.type === 'spo2')` alongside `bp` and `steps`!
  - Strip `shadow-card` / old colors; use crisp `#0D9488` (teal), `#4F46E5` (indigo), `#D97706` (amber), `#DC2626` (red) Recharts strokes and clean `tabular-nums` tooltips.

Run `npm run lint && npm run build`.
```

---

### PROMPT 2 — Doctor Cockpit (`/doctor/[id]`) & AI Diagnosis Report Reviewer

```text
You are working as the Doctor Portal Engineer (Aryan) on CareBridge.
Read 00_MASTER_PLAN.md, lib/types.ts, app/(doctor)/doctor/[id]/page.tsx, components/doctor/FhirExportDrawer.tsx, components/doctor/WhatIfSimulator.tsx, and components/doctor/DoctorNoteModal.tsx.
ONLY touch app/(doctor)/doctor/[id]/** and components/doctor/**.

Task 1 — Upgrade app/(doctor)/doctor/[id]/page.tsx:
1. Strip all Neo-Brutalist `border-2 border-ink-900`, `shadow-[5px_5px_0px_#121214]`, `#FEE159` avatar boxes, and `animate-bounce` toasts. Replace with Aman's minimal clinical `<Card />`, `<Button />`, `<RiskBadge />`, and `<Toast />`.
2. Top Header & Urgent Banner:
   - Show urgent alert banner whenever `risk.band === 'red'` OR `wearable.anomalyFlags` has `CRITICAL` / `HIGH` flags.
   - Header actions row:
     - `Write Digital Prescription` (primary `#0D9488` button — opens Task 3's Prescription Writer)
     - `Pre-Consult Brief (SSE)` (opens streaming `<BriefPanel />` via `useBriefStream`)
     - `What-If Drug Simulator` (opens `<WhatIfSimulator />`)
     - `Update Care Plan Note` (opens `<DoctorNoteModal />`)
     - `FHIR R4 Export` (opens `<FhirExportDrawer />`)
   - Keep `<ActionsBar />` (`Call Patient`, `Send Message`, `Book Teleconsult`) cleanly styled underneath.
3. Clean Tabs (`Overview` | `Watch Telemetry` | `Diagnosis Reports` | `Prescriptions` | `Med Adherence` | `Consent & Audit`):
   - **Overview**:
     - Deterministic risk breakdown (`<ReasonList />`)
     - Latest Watch Vitals summary strip (`Heart Rate`, `Blood Oxygen SpO2`, `Blood Pressure`, `Glucose`, `Steps`, `Calories`)
     - **Patient Voice-Reported Symptoms ("Word of Mouth")** card displaying `detail.recentSymptoms` captured from the patient's voice assistant (`symptom_logs`), so the doctor combines watch analytics with what the patient physically reported feeling!
   - **Watch Telemetry**: Renders Aman's `<WearablePanel />` + `<TrendCharts />` with real 14-day sensor streams & citation-linked anomaly flags.
   - **Diagnosis Reports Tab** (NEW):
     - Fetches `GET /api/patients/${patientId}/diagnosis`.
     - Includes `"Synthesize New AI Diagnosis Report"` button (`POST /api/patients/${patientId}/diagnosis` with optional symptom/context input) — shows loading skeleton while generating.
     - Displays each `DiagnosisReport` via `<DiagnosisCard />` + an inline **Doctor Review & Verification Panel**:
       - Clinical verification notes textarea
       - `"Verify & Sign Off Report"` button calling `PATCH /api/patients/${patientId}/diagnosis/${report.id}` (`{ doctorNotes, verify: true, doctorId: 'd1' }`)
       - Explicit clinical label: `"AI-assisted clinical decision support. Final diagnosis & treatment decisions remain strictly with the physician."`
   - **Prescriptions Tab** (NEW):
     - Lists active & past digital prescriptions (`GET /api/patients/${patientId}/prescriptions`) rendered via `<PrescriptionCard readonly />` + `"Issue New Prescription"` button and `"Cancel / Mark Completed"` actions (`PATCH /api/patients/${patientId}/prescriptions/[rxId]`).
   - **Med Adherence & Consent/Audit Tabs**: Keep `<MedicineLogTable />`, `<SharedDataPanel />` (strictly respecting DPDP Act consent toggles), and `<AuditRow />` list.

Task 2 — Upgrade FhirExportDrawer.tsx & DoctorNoteModal.tsx:
- `FhirExportDrawer.tsx`: Fetch live bundle from `GET /api/patients/${detail.profile.id}/fhir` (falling back to client `generateFhirR4Bundle` only if offline) so exported JSON includes active `MedicationRequest` prescriptions and real timestamps, plus add a `"Download .json"` button.
- `DoctorNoteModal.tsx` & `WhatIfSimulator.tsx` & `ActionsBar.tsx`: Apply Aman's minimal `1px solid #E2E8F0` clean modal/drawer styling (`Escape` & backdrop dismiss, zero Neo-Brutalist borders).

Run `npm run lint && npm run build`.
```

---

### PROMPT 3 — Paperless Digital Prescription & Lifestyle Writer (`components/doctor/PrescriptionWriterModal.tsx`)

```text
You are working as the Doctor Portal Engineer (Aryan) on CareBridge.
Read 00_MASTER_PLAN.md, lib/types.ts, and app/(doctor)/doctor/[id]/page.tsx.
ONLY touch components/doctor/PrescriptionWriterModal.tsx and app/(doctor)/doctor/[id]/page.tsx.

Goal: Build a fast, sub-60-second **Paperless Digital Prescription & Lifestyle Writer** that abolishes physical paper slips and automatically updates the patient app, watch companion targets, guardian feed, and WhatsApp alerts.

Build components/doctor/PrescriptionWriterModal.tsx:
Props: `{ isOpen: boolean; onClose: () => void; patientId: string; patientName: string; patientConditions: string[]; latestDiagnosis?: DiagnosisReport | null; onIssued: (rx: Prescription) => void }`

Layout (Full-height sleek drawer or spacious `max-w-5xl` modal, responsive 2-column on desktop, stacked on mobile):
1. **Left Column — Structured Prescription & Lifestyle Form**:
   - **Medicines Builder (`+ Add Medicine`)**:
     - Each row lets doctor edit: `Medicine Name`, `Dosage` (e.g. `500mg`, `2 puffs`), `Frequency` (`Once morning`, `Twice daily`, `Three times daily`, `At bedtime`, `As needed`), `Schedule Times` (auto-populates `["08:00"]` or `["08:00", "20:00"]` editable chips), `Duration` (`7 days`, `30 days`, `Ongoing`), `With Food` checkbox (`Take after food` / `Before food`), and optional `Instructions`, plus `Remove` button.
   - **Lifestyle, Food & Activity Targets (`+ Add Target`)**:
     - Category select: `diet` | `steps` | `calories` | `sleep` | `bp` | `glucose`
     - Description: e.g., `"Low-oil, low-glycemic South Indian meals; limit white rice at dinner"`
     - Numeric Target + Unit: e.g., `4500` `steps/day`, `350` `kcal/day`, `7` `hours/night`
   - **Doctor Summary & Follow-Up Date**:
     - Clean clinical summary textarea explaining why this prescription was updated + `Follow-up Date` date picker.
2. **Right Column — Non-Blocking AI Prescription Assistant**:
   - Automatically calls `POST /api/ai/prescription-suggestions` (`{ patientId, diagnosisReportId: latestDiagnosis?.id }`) when opened (never blocks typing; shows clean `<Skeleton />` while loading).
   - Displays AI-suggested medicines & lifestyle targets with rationale, clearly tagged `"AI Draft — Physician must verify before prescribing"`.
   - Each suggestion has a 1-click `[+ Apply to Rx]` button that appends the medicine or lifestyle target straight into the form on the left for editing!
3. **1-Click Closed-Loop Dispatch (`"Issue Digital Prescription"`)**:
   - Confirmation step/dialog: `"Issue paperless prescription to ${patientName}? This immediately updates their medicine checklist, watch companion targets, guardian feed, and sends a WhatsApp notification."`
   - Calls `POST /api/patients/${patientId}/prescriptions`.
   - Loading spinner while submitting, inline error display if validation fails, and on success: calls `onIssued(prescription)`, closes cleanly, and triggers toast `"Digital prescription issued & synced across Patient, Watch Companion & Guardian."`
4. Accessibility: Focus trap, `Escape` closes (when not submitting), backdrop click closes.

Wire `PrescriptionWriterModal` into `app/(doctor)/doctor/[id]/page.tsx` cleanly. Run `npm run lint && npm run build`.
```

---

### PROMPT 4 — Hospital ROI Analytics (`/admin`) & BuilderCon Live Demo Simulator (`/sim`)

```text
You are working as the Doctor Portal & Demo Ops Engineer (Aryan) on CareBridge.
Read app/(admin)/admin/page.tsx, app/(admin)/admin/layout.tsx, and app/sim/page.tsx.
ONLY touch app/(admin)/** and app/sim/**.

Task 1 — Upgrade Hospital ROI & AI Safety Audit (app/(admin)/admin/page.tsx & layout.tsx):
- Remove all Neo-Brutalist `border-2 border-ink-900`, `shadow-[5px_5px_0px_#121214]`, `#D4F77C`, and `#EDE9FE` boxes. Apply Aman's clean minimal `<Card />` and `<StatTile />` styling.
- Fetch BOTH `GET /api/admin/roi` and `GET /api/admin/ai-audit`:
  1. Top 4 KPI tiles: `Patients Monitored`, `Alerts Actioned`, `Readmissions Averted`, `Doctor Hours Saved` + clean Cost Avoidance highlight (`₹6,30,000+` calculated dynamically from `readmissionsPrevented * 45000`).
  2. Recharts BarChart showing daily alerts actioned + collapsible `"Documented Clinical ROI Assumptions"` card.
  3. **AI Safety & Citation Audit Log Table** (from `GET /api/admin/ai-audit`): shows every generated pre-consult brief/diagnosis, `source` pill (`LLM` vs `Fallback`), citation count (`Reading:...`), character count, and expandable preview so BuilderCon judges can verify zero hallucinated numbers!

Task 2 — Upgrade BuilderCon Judge Control Panel (app/sim/page.tsx):
- Strip `DoodleDaisy`, `DoodleHandPress`, and Neo-Brutalist borders; apply clean clinical SaaS layout with a split 2-column evaluation console.
- Patient Selector (`p1` Ramesh K., `p2` Anita S., `p3` Suresh P.) showing live Risk Score + Band (`GET /api/patients`, polled every 3s).
- **One-Tap Telemetry & Clinical Event Triggers** (`POST /api/sim/event`):
  1. `SpO2 Critical Drop (88%)` (`kind: 'spo2_drop'`) — *Primary BuilderCon stage trigger!*
  2. `Nocturnal HR Spike (112 bpm)` (`kind: 'hr_spike'`)
  3. `BP Spike (156/98 mmHg)` (`kind: 'bp_spike'`)
  4. `Miss Medication Dose` (`kind: 'miss_dose'`)
  5. `Mobility / Steps Drop (-52%)` (`kind: 'steps_drop'`)
  6. `Patient Recover (Baseline)` (`kind: 'recover'`)
- **Escalation & Reset Controls**:
  - `Auto-Tick` toggle + manual `Fast-Forward Escalation` (`POST /api/escalation/tick`) showing Patient Reminder -> Family WhatsApp -> Doctor Alert transitions in real time.
  - Prominent `"Reset Demo to Clean Baseline"` button (`POST /api/sim/reset`) with immediate confirmation toast.
- Live Chronological Event & Escalation Feed + 1-click portal jump links (`/doctor/p1`, `/patient`, `/patient/watch`, `/patient/voice`, `/family`) for seamless stage transitions.

Run `npm run lint && npm run build`.
```

---

### PROMPT 5 — Cohesive BuilderCon Seed Data (`lib/mockData.ts` & `supabase/seed.sql`)

```text
You are working with Vedesh on the CareBridge demo story seed data.
Read lib/types.ts, lib/mockData.ts, lib/supabase/localStore.ts, and supabase/seed.sql.
ONLY touch lib/mockData.ts and coordinate updates to supabase/seed.sql with Vedesh so Postgres seed matches localStore.ts 1:1.

Ensure the BuilderCon 3-minute story works seamlessly from second 0:
1. Characters:
   - Doctor (`d1`): Dr. Meera Rao (Sunrise Clinic, Indiranagar — fictional)
   - Patient 1 (`p1` — Stage Hero): Ramesh K. (62M, Hindi, Diabetes Type 2 + Hypertension, recently discharged 10 days ago, starts in Yellow ~40–55 band with normal baseline SpO2 97% & HR 72 bpm so triggering `spo2_drop` or `hr_spike` on stage visibly flips him RED!).
   - Patient 2 (`p2`): Anita S. (54F, Kannada, Hypertension — steady Yellow).
   - Patient 3 (`p3`): Suresh P. (48M, English, Type 2 Diabetes — steady Green with 100% adherence).
   - Guardian 1 (`f1`): Karan K. (Son, Bengaluru, watching Ramesh K.).
2. Rich Initial State for `p1`:
   - 14 days of BP, steps, glucose, plus 7 days of SpO2 (96–98%), calories (280–400 kcal), sleep (6.5–7.2 hrs), and baseline nocturnal HR (70–74 bpm).
   - Active initial Prescription (`rx-seed-1`: Metformin 500mg twice daily + Amlodipine 5mg morning; lifestyle targets: 4,500 steps/day, 350 active kcal/day, low-oil low-GI diet).
   - Initial verified DiagnosisReport (`diag-seed-1`: `soon`, reviewed by Dr. Meera Rao) so Patient Reports, Guardian Feed, and Doctor Cockpit look realistic immediately on launch.
3. Verify `lib/mockData.ts` exports clean typed constants used as SSR/fallback helpers with zero TypeScript errors.

Run `npm run lint && npm run build` and test `/api/sim/reset` + all portals end-to-end.
```

---

## Daily Verification Matrix for Aryan

- [ ] `/doctor` and `DoctorHeader` show real dynamic counts from `/api/patients` & `/api/admin/roi` (zero hardcoded `42` or `urgentCount={1}`).
- [ ] `TrendCharts.tsx` reads real `hr` and `spo2` vital rows (fake `104 + ...` stub removed).
- [ ] `/doctor/[id]` displays Watch Telemetry, Patient Voice Symptoms, AI Diagnosis Report Review + Doctor Sign-Off, Live FHIR R4 Export, and `BriefPanel` SSE stream.
- [ ] `PrescriptionWriterModal.tsx` creates full paperless prescriptions + diet/steps/calorie targets via `POST /api/patients/[id]/prescriptions` with non-blocking AI suggestions.
- [ ] `/admin` displays live ROI metrics + AI citation audit trail in clean minimal clinical UI.
- [ ] `/sim` supports `spo2_drop`, `hr_spike`, `bp_spike`, `miss_dose`, `steps_drop`, `recover`, `tick`, and `reset`.
- [ ] `npm run lint && npm run build` exits with code 0.
