# VEDESH — Backend Engineering Playbook & AI Execution Prompts
## Google BuilderCon | CareBridge (`carebridge` Next.js 16.3.8 App Router)
### Owns: `supabase/**` · `lib/types.ts` · `lib/supabase/**` · `lib/risk/**` · `lib/wearable/**` · `lib/escalation/**` · `lib/ai/**` · `lib/fhir/**` · `lib/notifications/**` · `app/api/**`

> **Team Rule**: Flat 4-person peer team (no leader). You own the entire server-side architecture, persistence, security, deterministic clinical rules, local LLM pipelines, and API contracts consumed by **Swapnil** (Patient), **Aryan** (Doctor/Admin/Sim), and **Aman** (UI/Landing/Guardian).
> **Verified Stack**: Next.js 16.3.8 Route Handlers (`app/api/**`), TypeScript 5 (`strict`), `@supabase/supabase-js@^2.45.4`, in-memory `localStore.ts` fallback (`USE_LOCAL_STORE`), local **Ollama (`llama3.2`)** via `fetch()` (`OLLAMA_BASE_URL`), optional `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`, Web/REST Google Fit OAuth2, WhatsApp Cloud API (with audited dry-run fallback), ABDM HL7 FHIR R4.
> **Hard Boundary**: Never edit `app/(patient)`, `app/(doctor)`, `app/(family)`, `app/(admin)`, `components/`, or `design/`.

---

## 0. Pre-Flight Audit: Exact Bugs & Gaps in the Current Backend

Before writing code, note these real defects inspected directly in the repo:
1. **Duplicate Config Files**: Both `next.config.ts` & `next.config.mjs` and both `eslint.config.mjs` & `.eslintrc.json` exist at the repo root.
2. **Half-Wired Supabase**: `app/api/patients/route.ts`, `app/api/patients/[id]/med-log/route.ts`, `app/api/patients/[id]/vitals/route.ts`, `app/api/patients/[id]/consents/route.ts`, `app/api/family/[id]/feed/route.ts`, `app/api/doctor/actions/route.ts`, `app/api/sim/event/route.ts`, and `app/api/admin/roi/route.ts` ONLY talk to `localStore.ts` and ignore Supabase completely. Only newer routes (`doctor-note`, `goals`, `ai-audit`, `sim/reset`) attempt `createClient()`.
3. **Hardcoded Stub in `lib/wearable/ingester.ts`**: Line 53 literally sets `const meanNocturnalHr = 106;` unconditionally instead of reading `type === 'hr'` vitals.
4. **Static FHIR Export**: `app/api/patients/[id]/fhir/route.ts` reads static `MOCK_PATIENT_DETAILS` instead of live patient data, and `lib/fhir/export.ts` hardcodes `effectiveDateTime: "2026-10-05T08:30:00Z"` and `gender: "male"`, while omitting `hr`, `spo2`, `glucose`, and `MedicationRequest` prescriptions.
5. **Missing Vital Types & Tables**: `supabase/schema.sql` uses `TEXT` IDs (`'p1'`, `'d1'`) and restricts `vitals.type` to `('bp', 'steps', 'glucose', 'hr')`. It lacks `'spo2'`, `'calories'`, `'sleep'`, and lacks `wearable_devices`, `symptom_logs`, `diagnosis_reports`, `prescriptions`, `prescription_medicines`, `lifestyle_targets`, `ai_qa_logs`, `whatsapp_notifications`, and RLS policies.
6. **Missing Core Startup Endpoints**: No `/api/wearables/ingest`, no Google Fit OAuth (`/api/wearables/google-fit/*`), no `/api/patients/[id]/diagnosis`, no `/api/patients/[id]/prescriptions`, no streaming local LLM `/api/ai/ask` for voice food/vitamin/disease Q&A, no `/api/ai/prescription-suggestions`, and no `/api/notifications/whatsapp`.

---

## Copy-Pasteable Prompts (Execute in Order: Prompt 1 -> Prompt 6)

> **How to use**: Paste each prompt directly into a coding session (or execute step-by-step). Every prompt is self-contained and enforces zero breaking changes to existing callers.

---

### PROMPT 1 — Config Cleanup, Shared Types (`lib/types.ts`), Schema (`supabase/`) & RLS

```text
You are working as the Backend Engineer (Vedesh) on the CareBridge repository (Next.js 16.3.8 App Router, React 19, TypeScript 5 strict, Supabase Postgres + localStore fallback).
Read 00_MASTER_PLAN.md, package.json, supabase/schema.sql, lib/types.ts, and lib/supabase/localStore.ts first.
ONLY touch root config duplicates, lib/types.ts, and supabase/. Never touch components/, design/, or frontend pages.

Task 1 — Clean up duplicate config files:
- Check next.config.ts vs next.config.mjs and eslint.config.mjs vs .eslintrc.json.
- Keep the active Next 16 config (next.config.ts, eslint.config.mjs) and remove dead duplicates only after confirming `npm run lint` and `npm run build` succeed cleanly.

Task 2 — Expand lib/types.ts (keep ALL existing interfaces and optional properties backwards-compatible):
1. Update Vital['type']:
   type: "bp" | "steps" | "glucose" | "hr" | "spo2" | "calories" | "sleep";
   Also add optional `source?: "wearable" | "manual" | "simulator"` and `device_id?: string | null`.
2. Update AnomalyFlag['severity'] to `"CRITICAL" | "HIGH" | "MEDIUM" | "LOW"`.
3. Extend WearableContext to include:
   - spo2: { latest: number | null; min24h: number | null; readings: { id: string; at: string; pct: number }[] }
   - calories: { dailyMean: number; latest: number }
   - sleep: { lastNightHours: number | null; avg7dHours: number | null }
4. Add and export these strict interfaces:
   - WearableDevice: { id: string; patient_id: string; provider: "google_fit" | "wearos" | "apple_health" | "manual" | "simulator"; device_name: string; is_active: boolean; last_synced_at: string | null; created_at: string }
   - SymptomLog: { id: string; patient_id: string; raw_text: string; language: string; extracted_symptoms: string[]; severity_hint: "low" | "moderate" | "high"; created_at: string }
   - RiskFlag: { type: string; severity: "low" | "medium" | "high" | "critical"; value: number | string; normalRange: string; message: string; readingId?: string }
   - DiagnosisReport: {
       id: string; patient_id: string; generated_at: string; ai_summary: string;
       risk_flags: RiskFlag[]; urgency: "routine" | "soon" | "urgent" | "emergency";
       recommended_specialties: string[]; lifestyle_recommendations: string[];
       symptom_input?: string | null; reading_ids: string[]; model_version: string;
       reviewed_by_doctor?: string | null; doctor_notes?: string | null; reviewed_at?: string | null;
     }
   - PrescribedMedicine: {
       id: string; prescription_id: string; medicine_id?: string; medicine_name: string;
       dosage: string; frequency: string; times: string[]; duration: string;
       with_food: boolean; instructions?: string | null;
     }
   - LifestyleTarget: {
       id: string; prescription_id: string; patient_id: string;
       category: "diet" | "steps" | "calories" | "sleep" | "bp" | "glucose" | "other";
       description: string; target_value?: number | null; unit?: string | null;
     }
   - WatchSyncPayload: {
       synced_at: string; next_dose_summary: string; daily_step_target: number;
       daily_calorie_target: number; active_alert_level: "normal" | "watch" | "urgent";
       diet_rule_short: string;
     }
   - Prescription: {
       id: string; patient_id: string; doctor_id: string; doctor_name: string;
       diagnosis_report_id?: string | null; issued_at: string; follow_up_date?: string | null;
       status: "active" | "completed" | "cancelled"; doctor_summary: string;
       medicines: PrescribedMedicine[]; lifestyle_targets: LifestyleTarget[];
       watch_sync_payload?: WatchSyncPayload | null;
     }
   - WhatsAppNotificationLog: {
       id: string; patient_id: string; recipient_phone: string; recipient_role: "patient" | "family" | "doctor";
       event_type: string; message: string; status: "sent" | "simulated_sent" | "failed";
       provider_message_id?: string | null; created_at: string;
     }
   - Extend SimEventRequest['kind'] to include "spo2_drop".
   - Extend FamilyFeedResponse to optionally include:
     latestDiagnosis?: DiagnosisReport | null;
     activePrescriptions?: Prescription[];
     lifestyleProgress?: { stepsCurrent: number; stepsTarget: number; caloriesCurrent: number; caloriesTarget: number; goalsCompleted: number; goalsTotal: number };
     wearableSummary?: { spo2: number | null; hr: number | null; bp: string | null; steps: number; calories: number };

Task 3 — Upgrade supabase/schema.sql and create supabase/rls.sql:
- IMPORTANT: Keep TEXT primary keys across ALL tables so seed IDs ('p1', 'd1', 'f1', 'm1') work without UUID mismatch errors.
- Update vitals CHECK constraint to: type IN ('bp', 'steps', 'glucose', 'hr', 'spo2', 'calories', 'sleep').
- Add columns to vitals: source TEXT NOT NULL DEFAULT 'wearable', device_id TEXT.
- Add columns to patients: gender TEXT DEFAULT 'Male', whatsapp_number TEXT, blood_group TEXT, allergies TEXT[] NOT NULL DEFAULT '{}'.
- Create tables (with ON DELETE CASCADE FKs + performance indexes):
  1. wearable_devices (id, patient_id, provider, device_name, access_token_encrypted, refresh_token_encrypted, token_expires_at, last_synced_at, is_active, created_at)
  2. symptom_logs (id, patient_id, raw_text, language, extracted_symptoms JSONB, severity_hint, created_at)
  3. diagnosis_reports (id, patient_id, generated_at, ai_summary, risk_flags JSONB, urgency, recommended_specialties TEXT[], lifestyle_recommendations TEXT[], symptom_input TEXT, reading_ids TEXT[], model_version TEXT, reviewed_by_doctor TEXT REFERENCES doctors(id), doctor_notes TEXT, reviewed_at TIMESTAMPTZ)
  4. prescriptions (id, patient_id, doctor_id, diagnosis_report_id REFERENCES diagnosis_reports(id) ON DELETE SET NULL, issued_at, follow_up_date DATE, status, doctor_summary, watch_sync_payload JSONB)
  5. prescription_medicines (id, prescription_id, medicine_name, dosage, frequency, times TEXT[], duration, with_food BOOLEAN, instructions TEXT)
  6. lifestyle_targets (id, prescription_id, patient_id, category, description, target_value NUMERIC, unit TEXT, created_at)
  7. ai_qa_logs (id, patient_id, question TEXT, answer TEXT, model_used TEXT, created_at)
  8. whatsapp_notifications (id, patient_id, recipient_phone, recipient_role, event_type, message, status, provider_message_id, created_at)
- Add Supabase Realtime publication statements for diagnosis_reports, prescriptions, whatsapp_notifications, patient_goals.
- Create supabase/rls.sql enabling RLS on every table and adding clean policies scoped by auth.uid() / role metadata (plus service_role access for Next.js server routes).

Verify with `npx tsc --noEmit` and `npm run lint`. Fix any type issues immediately.
```

---

### PROMPT 2 — Unified Dual-Mode Persistence (`lib/supabase/db.ts` & `localStore.ts`)

```text
You are working as the Backend Engineer (Vedesh) on CareBridge.
Read lib/types.ts, lib/supabase/server.ts, lib/supabase/client.ts, lib/supabase/localStore.ts, and supabase/schema.sql.
ONLY touch lib/supabase/** and app/api/auth/**.

Problem to solve:
Currently, half the API routes read/write ONLY localStore.ts while ignoring Supabase Postgres even when SUPABASE_SERVICE_ROLE_KEY is set. We need a single, rock-solid dual-mode data layer so EVERY route persists to Postgres in production AND works seamlessly offline when USE_LOCAL_STORE=true or Supabase env vars are empty.

Task 1 — Expand lib/supabase/localStore.ts:
1. Add collections to CareBridgeState:
   - wearableDevices: WearableDevice[]
   - symptomLogs: SymptomLog[]
   - diagnosisReports: DiagnosisReport[]
   - prescriptions: Prescription[]
   - aiQaLogs: { id: string; patient_id: string; question: string; answer: string; model_used: string; created_at: string }[]
   - whatsappLogs: WhatsAppNotificationLog[]
2. Seed realistic initial data in createInitialState():
   - Baseline vitals for p1 (Ramesh K.) must now ALSO include 7 days of 'spo2' (96–98%), 'calories' (260–410 kcal), and 'sleep' (6.2–7.2 hrs) alongside bp, steps, glucose, and normal baseline hr (72 bpm) — so p1 starts Yellow (moderate) and visibly flips RED when spo2_drop or hr_spike fires.
   - Seed an initial active Prescription for p1 (Metformin 500mg twice daily + Amlodipine 5mg once morning) with lifestyle targets (4,500 steps/day, 350 active kcal/day, low-oil low-GI diet) and watch_sync_payload.
   - Seed an initial baseline DiagnosisReport for p1 (urgency: 'soon', reviewed_by_doctor: 'd1').
   - Seed a connected WearableDevice ('dev-fit-p1', provider: 'google_fit', device_name: 'WearOS Smartwatch (Google Fit Bridge)').
3. Add methods on CareBridgeStore:
   - ingestVitalsBatch(patientId, readings[], deviceId?) with timestamp+type deduplication ({ inserted, skipped, vitalsInserted }).
   - addDiagnosisReport(report), getDiagnosisReports(patientId), updateDiagnosisReport(patientId, reportId, patch).
   - createPrescription(input) — atomically inserts Prescription, syncs active medicines into state.medicines, generates today's pending med_logs if missing, inserts patient_goals from lifestyleTargets, builds watch_sync_payload, and pushes a doctor_note alert to both patient and family.
   - getPrescriptions(patientId), updatePrescription(patientId, rxId, patch).
   - addSymptomLog(log), getSymptomLogs(patientId).
   - addAiQaLog(entry), addWhatsAppLog(entry).
   - Support 'spo2_drop' in handleSimEvent() (inserts vitals type 'spo2', value_a: 88, triggers risk recomputation + critical alert).
   - Increment STORE_VERSION cleanly so Next.js HMR reloads new store fields automatically.

Task 2 — Create lib/supabase/db.ts:
Export typed async repository functions used by ALL app/api/** handlers:
- useLocalOnly(): returns true when process.env.USE_LOCAL_STORE === 'true' or !isServerSupabaseConfigured.
- getPatientsListDb()
- getPatientDetailDb(patientId, actorType)
- getPatientVitalsDb(patientId, filters: { type?, from?, to? })
- insertVitalsBatchDb(patientId, readings, deviceId?)
- logMedicineDb(patientId, medicineId, status)
- getPrescriptionsDb(patientId), createPrescriptionDb(input), updatePrescriptionDb(patientId, rxId, patch)
- getDiagnosisReportsDb(patientId), saveDiagnosisReportDb(report), updateDiagnosisReportDb(patientId, reportId, patch)
- getFamilyFeedDb(patientId)
- getConsentsDb(patientId), updateConsentDb(patientId, category, granted)
- getAuditLogsDb(patientId), appendAuditLogDb(entry)
- recordDoctorActionDb(patientId, type, note)
- saveSymptomLogDb(log), saveAiQaLogDb(entry), saveWhatsAppLogDb(entry)
- saveWearableDeviceDb(device), getWearableDevicesDb(patientId)
- resetDemoStateDb()
Pattern for each function:
- Try Supabase query/mutation when !useLocalOnly(); gracefully mirror/fallback to `store` if offline or if a table hasn't been migrated yet, without silent crashes. Never expose SUPABASE_SERVICE_ROLE_KEY to client components.

Task 3 — Lightweight Role Session Endpoint (app/api/auth/role/route.ts):
- POST { role: 'patient'|'doctor'|'family'|'admin', patientId?: string } -> validates role, sets HTTP-only/accessible demo session cookies (`cb_role`, `cb_patient_id`) so judges can switch portals in 1 click without login friction, and GET returns current session role.

Verify with `npx tsc --noEmit` and `npm run lint`.
```

---

### PROMPT 3 — Real Wearable Ingestion, Risk Engine Upgrade & Google Fit OAuth

```text
You are working as the Backend Engineer (Vedesh) on CareBridge.
Read lib/wearable/ingester.ts, lib/wearable/processor.ts, lib/risk/rules.ts, lib/risk/compute.ts, scripts/test-risk.ts, and app/api/patients/[id]/vitals/route.ts.
ONLY touch lib/wearable/**, lib/risk/**, app/api/wearables/**, app/api/patients/[id]/vitals/**, app/api/patients/route.ts, app/api/patients/[id]/route.ts, and scripts/test-risk.ts.

Task 1 — Remove hardcoded stub in lib/wearable/ingester.ts:
- Line 53 currently hardcodes `const meanNocturnalHr = 106;`. Delete that fake stub completely.
- Refactor analyzeWearableTelemetry(vitals) to derive metrics strictly from actual Vital[] rows (using nocturnal HR rules when type === 'hr', step decline when type === 'steps', SpO2 drop when type === 'spo2'), or delegate cleanly to shared pure computation functions so TrendCharts.tsx keeps working with real telemetry.

Task 2 — Upgrade lib/wearable/processor.ts (buildWearableContext):
- Query last 14 days of vitals from Supabase (if active) or localStore.
- Compute real metrics for ALL 7 vital types:
  1. heartRate: mean, nocturnalMean (23:00–05:00 local/UTC), max, readings[]
  2. bloodPressure: latestSystolic, latestDiastolic, avgSystolic7d, prevAvgSystolic7d, trend ('rising'|'stable'|'falling')
  3. steps: dailyMean, baseline14d, pctChangeFromBaseline
  4. glucose: latestFasting, mean
  5. spo2: latest, min24h, readings[]
  6. calories: dailyMean, latest
  7. sleep: lastNightHours, avg7dHours
- Deterministic Anomaly Rules (every AnomalyFlag.readingId MUST be a real vitals.id from the dataset, never invented):
  - SPO2_CRITICAL (CRITICAL): if spo2.latest !== null && spo2.latest < 90 -> severity: 'CRITICAL', title: 'Critically low blood oxygen', detail: 'SpO2 dropped to {val}% (normal 95–100%). Immediate clinical review advised.'
  - SPO2_LOW (HIGH): if spo2.latest >= 90 && spo2.latest < 94 -> severity: 'HIGH'
  - HR_NOCTURNAL_HIGH (HIGH): if nocturnalMean > 100
  - STEPS_DECLINE (MEDIUM): if pctChangeFromBaseline < -30
  - BP_TREND_UP (MEDIUM): if trend === 'rising'
  - GLUCOSE_HIGH (HIGH): if latestFasting >= 180

Task 3 — Upgrade lib/risk/rules.ts & scripts/test-risk.ts:
- Keep ALL 8 existing rules (MED_ADHERENCE_LOW, MED_MISSED_STREAK, BP_TREND_UP, BP_HIGH_ABS, STEPS_DROP, GLUCOSE_HIGH, RECENT_DISCHARGE, NO_DATA_48H) intact so existing baseline test assertions stay true.
- Add 2 new deterministic clinical rules:
  9. SPO2_CRITICAL (weight: 30): triggers when latest 'spo2' reading < 92%.
  10. HR_NOCTURNAL_HIGH (weight: 15): triggers when latest/mean nocturnal 'hr' reading > 100 bpm.
- Score remains capped at 100 (0–39 green, 40–69 yellow, 70–100 red).
- Extend scripts/test-risk.ts with unit tests covering: SpO2 critical drop (<90%), nocturnal HR elevation (>100 bpm), normal baseline staying green/yellow, and empty arrays not throwing.

Task 4 — Wearable Ingest & Google Fit Bridge APIs:
1. Upgrade app/api/patients/[id]/vitals/route.ts:
   - Add GET handler supporting ?type=all|bp|hr|spo2|glucose|steps|calories|sleep&from=ISO&to=ISO returning `{ vitals, summary: { count, latest, avg, min, max, trend } }`.
   - Upgrade POST handler to use db.ts and accept all 7 vital types + 'flag_acknowledged'.
2. Create app/api/wearables/ingest/route.ts (POST):
   - Validates { patientId, deviceId?, provider?, readings: [...] } (reject empty/invalid readings with 400).
   - Calls insertVitalsBatchDb() (deduplicating identical type+recorded_at rows).
   - Runs buildWearableContext() + recompute risk.
   - If risk band became 'red' OR any anomaly has severity 'CRITICAL' or 'HIGH': auto-generates a DiagnosisReport (non-blocking or awaited safely) and dispatches a critical alert + WhatsApp notification log.
   - Returns { inserted, skipped, anomalies, risk, diagnosisTriggered, diagnosisReportId }.
3. Create Google Fit OAuth endpoints (for authorized read-only wearable sync without watch firmware changes):
   - GET /api/wearables/google-fit/connect: builds Google OAuth2 authorization URL with Fitness scopes (`fitness.heart_rate.read`, `fitness.activity.read`, `fitness.blood_pressure.read`, `fitness.blood_glucose.read`, `fitness.oxygen_saturation.read`, `fitness.sleep.read`), or redirects cleanly to callback in demo mode when `GOOGLE_FIT_CLIENT_ID` is unset.
   - GET /api/wearables/google-fit/callback: exchanges auth code (when configured) or activates demo bridge device in `wearable_devices`, redirects to `/patient/watch?connected=1`.
   - POST /api/wearables/sync: reads device token (or simulated watch pulse if demo device), normalizes readings into Vital[], and runs the `/api/wearables/ingest` pipeline.
4. Upgrade GET /api/patients & GET /api/patients/[id] to use `db.ts` and include `{ wearable, activePrescriptions, latestDiagnosis, recentSymptoms }`.

Run `npx tsx scripts/test-risk.ts` (or compile/run with node), `npm run lint`, and `npm run build` to verify.
```

---

### PROMPT 4 — AI Diagnosis Engine, Digital Prescriptions & Live FHIR R4 Export

```text
You are working as the Backend Engineer (Vedesh) on CareBridge.
Read lib/ai/brief.ts, lib/ai/contextBuilder.ts, lib/fhir/export.ts, app/api/patients/[id]/doctor-note/route.ts, and app/api/patients/[id]/fhir/route.ts.
ONLY touch lib/ai/**, lib/fhir/**, app/api/patients/[id]/diagnosis/**, app/api/patients/[id]/prescriptions/**, app/api/patients/[id]/med-log/**, app/api/patients/[id]/brief/**, app/api/patients/[id]/fhir/**, and app/api/ai/prescription-suggestions/**.

Task 1 — Standardize Local LLM (Ollama llama3.2) Helper (lib/ai/llmClient.ts):
Create a clean, reusable LLM invocation helper used by Diagnosis, Pre-Consult Briefs, Rx Suggestions, and Voice Q&A:
- Priority order:
  1. Local Ollama (`process.env.OLLAMA_BASE_URL || 'http://localhost:11434'`, model `process.env.OLLAMA_MODEL || 'llama3.2'`) via `fetch('/api/chat')` with AbortController timeout (default 4500ms, never hangs!).
  2. Optional cloud fallback if `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` is configured.
  3. Returns `null` immediately on timeout/connection refused so every caller triggers its deterministic clinical fallback cleanly.
- Update `lib/ai/brief.ts` and `app/api/patients/[id]/brief/stream/route.ts` to support Ollama streaming cleanly as well!

Task 2 — Medical Diagnosis Synthesis & Doctor Sign-Off APIs:
1. Create lib/ai/diagnosisGenerator.ts:
   - Gathers 14-day WearableContext, computeRisk() reasons, active medicines, and recent symptom_logs ("word of mouth" patient reports).
   - Prompts LLM to return strict JSON: { aiSummary, urgency ('routine'|'soon'|'urgent'|'emergency'), recommendedSpecialties[], lifestyleRecommendations[] }.
   - Includes a deterministic, medically accurate template fallback built from actual riskFlags + anomalyFlags + symptoms when Ollama is offline.
   - Binds real vitals.id rows into reading_ids[].
2. Create app/api/patients/[id]/diagnosis/route.ts:
   - GET: returns DiagnosisReport[] for patient sorted newest first.
   - POST: optional `{ symptomNote?: string }`; if symptomNote provided, saves into symptom_logs first, runs diagnosisGenerator, persists via `saveDiagnosisReportDb()`, creates doctor alert if urgency is 'urgent' or 'emergency', returns `{ report }`.
3. Create app/api/patients/[id]/diagnosis/[reportId]/route.ts:
   - PATCH: validates `{ doctorNotes?: string, verify?: boolean, doctorId?: string }`, sets `reviewed_by_doctor` and `reviewed_at`, returns updated `{ report }`.

Task 3 — Paperless Digital Prescription & Lifestyle Plan APIs:
1. Create app/api/patients/[id]/prescriptions/route.ts:
   - GET: returns Prescription[] (with nested medicines & lifestyle_targets & watch_sync_payload).
   - POST: validates input:
     - doctorSummary (required, string >= 5 chars)
     - medicines (array, >= 1 medicine with medicineName, dosage, frequency, times[], duration, withFood)
     - lifestyleTargets (array of { category, description, targetValue?, unit? })
     - followUpDate (optional ISO date), diagnosisReportId (optional), doctorId (defaults 'd1')
   - Atomically executes `createPrescriptionDb()` which:
     a) Creates prescription + prescription_medicines + lifestyle_targets
     b) Updates active `medicines` and generates upcoming pending `med_logs`
     c) Converts lifestyleTargets into interactive `patient_goals`
     d) Generates compact `watch_sync_payload` (next dose, step target, calorie burn target, diet rule, alert tier)
     e) Creates alerts for both `patient` and `family`
     f) Triggers WhatsApp notification dispatch (via Task 1 in Prompt 5 / shared helper)
   - Returns HTTP 201 with `{ prescription, generatedGoalsCount, watchSyncPayload, whatsappStatus }`.
2. Create app/api/patients/[id]/prescriptions/[rxId]/route.ts:
   - PATCH: update prescription status ('active'|'completed'|'cancelled') or doctorSummary.
3. Create app/api/ai/prescription-suggestions/route.ts (POST):
   - Accepts `{ patientId, diagnosisReportId? }`.
   - Reads patient conditions, allergies, latest diagnosis report, and latest vitals.
   - Calls Ollama (`llama3.2`) or deterministic clinical rules fallback (for Diabetes Type 2, Hypertension, Low SpO2, Nocturnal HR) returning:
     `{ medicines: [...], lifestyle: [...], source: 'llm'|'fallback', disclaimer: 'AI draft suggestions only. Treating physician must verify before issuing.' }`.

Task 4 — Fix Medication Adherence & Live ABDM FHIR R4 Export:
1. Upgrade `app/api/patients/[id]/med-log/route.ts` to use `logMedicineDb()`, compute 7-day & today `compliancePct`, clear pending missed-dose escalations when `status === 'taken'`, and return `{ success: true, log, risk, compliancePct }`.
2. Fix `lib/fhir/export.ts` & `app/api/patients/[id]/fhir/route.ts`:
   - Route handler MUST fetch live `getPatientDetailDb(patientId, 'doctor')` + `getPrescriptionsDb(patientId)` (NEVER static `MOCK_PATIENT_DETAILS`).
   - Update `generateFhirR4Bundle()` to use real `vital.recorded_at` timestamps (fix hardcoded `"2026-10-05T08:30:00Z"`), include LOINC Observations for `bp` (`85354-9`), `hr` (`8867-4`), `spo2` (`59408-5`), `glucose` (`1558-6`), `steps` (`55423-8`), and export active prescriptions as HL7 FHIR `MedicationRequest` resources.

Verify with `npm run lint && npm run build`.
```

---

### PROMPT 5 — Voice-Activated Local LLM Food & Health Q&A + WhatsApp + Remaining Routes

```text
You are working as the Backend Engineer (Vedesh) on CareBridge.
Read .env.example, lib/ai/llmClient.ts, lib/supabase/db.ts, app/api/family/[id]/feed/route.ts, app/api/sim/event/route.ts, app/api/sim/reset/route.ts, app/api/admin/roi/route.ts, and app/api/doctor/actions/route.ts.
ONLY touch lib/ai/**, lib/notifications/**, app/api/ai/ask/**, app/api/notifications/**, app/api/family/**, app/api/sim/**, app/api/admin/**, app/api/doctor/**, and app/api/escalation/**.

Task 1 — Streaming Voice Local LLM Health & Nutrition Q&A (lib/ai/nutritionQa.ts + app/api/ai/ask/route.ts):
This powers the patient's voice-activated local LLM assistant for food, vitamins, sugar, cholesterol, oil, and disease questions.
1. POST /api/ai/ask accepts `{ patientId, question, language?: 'en'|'hi'|'kn' }` (400 if question empty).
2. Fetches live patient context via `db.ts`:
   - Name, age, conditions (e.g. Type 2 Diabetes, Hypertension), allergies
   - Active prescriptions & current medicines (from `getPrescriptionsDb`)
   - Latest diagnosis report & urgency
   - Latest watch vitals (`BP`, `HR`, `SpO2`, `glucose`, `steps`, `calories`)
3. Symptom auto-detection: if the question expresses acute physical symptoms (e.g., dizzy, chest pain, breathless, high fever, chakkar, sans phoolna), automatically record a `SymptomLog` via `saveSymptomLogDb()` so the doctor sees the patient's "word of mouth" in their cockpit!
4. Builds system prompt for **Ollama (`llama3.2`)** streaming (`stream: true`):
   - Instructs model to answer in warm, simple conversational language (under 110 words; respond in English, Hindi, or Kannada matching `language` parameter).
   - For food/drink questions: explicitly estimate approximate calories, key vitamins/nutrients, oil/saturated-fat/cholesterol & glycemic/sodium impact **given this patient's exact conditions and active medicines**, and give a clear recommendation (`Safe in small portion` / `Avoid today` / `Better alternative`).
   - Never claim to replace their doctor; if acute emergency symptoms appear, advise immediate clinic/doctor contact.
5. Streams `text/plain; charset=utf-8` via `ReadableStream` from Ollama token chunks (`/api/chat` NDJSON lines `{ message: { content } }`).
6. Deterministic Offline Nutrition & Clinical Fallback (CRITICAL for demo reliability when Ollama isn't running):
   - If Ollama refuses connection or times out (>4.5s), immediately stream a smart context-aware response covering common Indian foods & queries (biryani, masala dosa, samosa, rice/roti, banana/mango, tea/coffee, cholesterol/oil, vitamins, diabetes sugar, BP/salt, missed medicine, dizziness) infused with the patient's actual live BP/glucose/Rx numbers!
   - Log every Q&A pair to `ai_qa_logs`.

Task 2 — WhatsApp Notification Service (lib/notifications/whatsapp.ts + app/api/notifications/whatsapp/route.ts):
1. Create `sendWhatsAppMessage({ patientId, recipientPhone, recipientRole, eventType, message })`:
   - If `process.env.WHATSAPP_API_KEY` and `process.env.WHATSAPP_PHONE_NUMBER_ID` are present, send POST to Meta WhatsApp Cloud API (`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`).
   - If keys are missing or API errors out, cleanly record `status: 'simulated_sent'` in `whatsapp_notifications` so the app never fails during live demos and every message is auditable.
2. Create `POST /api/notifications/whatsapp` for manual test triggers from Patient Consent / Guardian Settings, and `GET /api/notifications/whatsapp?patientId=p1` to inspect sent notification history.
3. Wire `sendWhatsAppMessage()` into critical ingestion alerts, Stage 2/3 escalation (`lib/escalation/index.ts`), and prescription creation (`POST /api/patients/[id]/prescriptions`).

Task 3 — Wire Remaining Routes Through `db.ts`:
- Upgrade `app/api/family/[id]/feed/route.ts` to return full `FamilyFeedResponse` including `latestDiagnosis`, `activePrescriptions`, `lifestyleProgress`, `wearableSummary`, and enriched `alerts`.
- Upgrade `app/api/sim/event/route.ts` to support `'spo2_drop'` alongside `'miss_dose' | 'bp_spike' | 'steps_drop' | 'hr_spike' | 'recover'`, and wire through `db.ts`.
- Upgrade `app/api/sim/reset/route.ts` to reset ALL tables cleanly (`diagnosis_reports`, `prescriptions`, `prescription_medicines`, `lifestyle_targets`, `symptom_logs`, `ai_qa_logs`, `whatsapp_notifications`, `vitals`, `med_logs`, `alerts`).
- Upgrade `app/api/doctor/actions/route.ts`, `app/api/admin/roi/route.ts`, `app/api/patients/[id]/consents/route.ts`, `app/api/patients/[id]/audit/route.ts`, and `app/api/escalation/tick/route.ts` to use `db.ts` cleanly.

Verify with `npm run lint && npm run build`.
```

---

### PROMPT 6 — Backend Verification, Smoke Tests & Edge-Case Hardening

```text
You are working as the Backend Engineer (Vedesh) on CareBridge.
Perform a strict production-grade verification pass across all files you own.

Checklist:
1. Run `npx tsx scripts/test-risk.ts` (or node test runner) and verify 100% pass across all 10 risk rules, SpO2 critical thresholds, nocturnal HR, and edge cases.
2. Check for secret leaks: confirm `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_API_KEY`, `GOOGLE_FIT_CLIENT_SECRET`, and `GEMINI_API_KEY` never appear in any client component (`app/(patient)`, `app/(doctor)`, `app/(family)`, `app/(admin)`, `components/`).
3. Remove any stray `console.log` statements inside `lib/` and `app/api/`.
4. Verify dual-mode resilience:
   - Test with `USE_LOCAL_STORE=true` and `OLLAMA_BASE_URL=""` — confirm every endpoint (`/api/patients`, `/api/wearables/ingest`, `/api/patients/p1/diagnosis`, `/api/patients/p1/prescriptions`, `/api/ai/ask`, `/api/family/p1/feed`, `/api/sim/event`, `/api/sim/reset`) returns HTTP 200/201 with valid JSON/stream and zero unhandled exceptions.
5. Run `npm run lint && npm run build` and ensure exit code 0 with zero TypeScript errors.
```

---

## Daily Verification Matrix for Vedesh

- [x] Config duplicates cleaned; `npm run lint && npm run build` green.
- [x] `lib/types.ts` frozen & imported across all portals with zero local type duplication.
- [x] `supabase/schema.sql` (`TEXT` keys) & `supabase/rls.sql` cleanly support all 22 tables & 7 vital types.
- [x] `lib/wearable/ingester.ts` & `processor.ts` free of hardcoded fake numbers; every `AnomalyFlag.readingId` maps to a real vital row.
- [x] `POST /api/wearables/ingest` deduplicates, updates risk, triggers diagnosis & WhatsApp log.
- [x] `POST /api/patients/[id]/prescriptions` performs atomic closed-loop sync (`prescriptions`, `medicines`, `med_logs`, `patient_goals`, `watch_sync_payload`, `alerts`, `whatsapp_notifications`).
- [x] `POST /api/ai/ask` streams personalized food/vitamin/sugar/cholesterol/disease guidance via local Ollama `llama3.2` with seamless offline fallback.
- [x] `GET /api/patients/[id]/fhir` exports live ABDM HL7 FHIR R4 Bundle (`Patient`, `Condition`, `Observation`, `MedicationRequest`).
