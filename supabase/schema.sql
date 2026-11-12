-- ==============================================================================
-- CareBridge Database Schema (PostgreSQL / Supabase)
-- Upgraded for Full Wearables, Clinical AI Diagnosis, Prescriptions & WhatsApp
-- ==============================================================================

-- Drop tables in reverse dependency order if recreating
DROP TABLE IF EXISTS whatsapp_notifications CASCADE;
DROP TABLE IF EXISTS ai_qa_logs CASCADE;
DROP TABLE IF EXISTS lifestyle_targets CASCADE;
DROP TABLE IF EXISTS prescription_medicines CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS diagnosis_reports CASCADE;
DROP TABLE IF EXISTS symptom_logs CASCADE;
DROP TABLE IF EXISTS wearable_devices CASCADE;
DROP TABLE IF EXISTS patient_goals CASCADE;
DROP TABLE IF EXISTS doctor_notes CASCADE;
DROP TABLE IF EXISTS briefs CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS consents CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS risk_reasons CASCADE;
DROP TABLE IF EXISTS risk_scores CASCADE;
DROP TABLE IF EXISTS vitals CASCADE;
DROP TABLE IF EXISTS med_logs CASCADE;
DROP TABLE IF EXISTS medicines CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;

-- 1. Doctors
CREATE TABLE doctors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  clinic TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Patients (Expanded with demographics, contact, blood group & allergies)
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT DEFAULT 'Male',
  whatsapp_number TEXT,
  blood_group TEXT,
  allergies TEXT[] NOT NULL DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'Hindi',
  conditions TEXT[] NOT NULL DEFAULT '{}',
  doctor_id TEXT REFERENCES doctors(id) ON DELETE SET NULL,
  family_id TEXT,
  discharged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Family Members
CREATE TABLE family_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  relation TEXT NOT NULL,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Medicines
CREATE TABLE medicines (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dose TEXT NOT NULL,
  times TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Medication Logs
CREATE TABLE med_logs (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('taken', 'missed', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Vitals (Expanded with spo2, calories, sleep + source & device_id)
CREATE TABLE vitals (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bp', 'steps', 'glucose', 'hr', 'spo2', 'calories', 'sleep')),
  value_a NUMERIC NOT NULL,
  value_b NUMERIC,
  source TEXT NOT NULL DEFAULT 'wearable',
  device_id TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Risk Scores
CREATE TABLE risk_scores (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  band TEXT NOT NULL CHECK (band IN ('green', 'yellow', 'red')),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Risk Reasons
CREATE TABLE risk_reasons (
  id TEXT PRIMARY KEY,
  risk_score_id TEXT NOT NULL REFERENCES risk_scores(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  text TEXT NOT NULL,
  weight INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Alerts
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('reminder', 'family', 'doctor', 'wearable_anomaly', 'doctor_note')),
  audience TEXT NOT NULL CHECK (audience IN ('patient', 'family', 'doctor')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ
);

-- 10. Consents (DPDP Act compliance)
CREATE TABLE consents (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('vitals', 'medicines', 'steps', 'glucose')),
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_patient_category UNIQUE (patient_id, category)
);

-- 11. Audit Log (Tracking all provider queries and actions)
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Pre-Consult Briefs
CREATE TABLE briefs (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('llm', 'fallback')),
  sections JSONB,
  citations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Doctor Notes
CREATE TABLE doctor_notes (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  parsed_instructions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Patient Goals
CREATE TABLE patient_goals (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('steps', 'medicine', 'bp', 'glucose', 'other')),
  target TEXT NOT NULL,
  by_date DATE,
  source_note_id TEXT REFERENCES doctor_notes(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Connected Wearable Devices
CREATE TABLE wearable_devices (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_fit', 'wearos', 'apple_health', 'manual', 'simulator')),
  device_name TEXT NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Patient Symptom Logs (Voice & Multilingual NLP)
CREATE TABLE symptom_logs (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  extracted_symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity_hint TEXT NOT NULL CHECK (severity_hint IN ('low', 'moderate', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. AI Diagnosis Reports (Deterministic rules + local LLM clinical syntheses)
CREATE TABLE diagnosis_reports (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ai_summary TEXT NOT NULL,
  risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  urgency TEXT NOT NULL CHECK (urgency IN ('routine', 'soon', 'urgent', 'emergency')),
  recommended_specialties TEXT[] NOT NULL DEFAULT '{}',
  lifestyle_recommendations TEXT[] NOT NULL DEFAULT '{}',
  symptom_input TEXT,
  reading_ids TEXT[] NOT NULL DEFAULT '{}',
  model_version TEXT NOT NULL DEFAULT 'llama3.2',
  reviewed_by_doctor TEXT REFERENCES doctors(id) ON DELETE SET NULL,
  doctor_notes TEXT,
  reviewed_at TIMESTAMPTZ
);

-- 18. Formal Digital Prescriptions
CREATE TABLE prescriptions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  diagnosis_report_id TEXT REFERENCES diagnosis_reports(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  follow_up_date DATE,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  doctor_summary TEXT NOT NULL DEFAULT '',
  watch_sync_payload JSONB
);

-- 19. Prescribed Medicines (Child of Prescriptions)
CREATE TABLE prescription_medicines (
  id TEXT PRIMARY KEY,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_id TEXT,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  times TEXT[] NOT NULL DEFAULT '{}',
  duration TEXT NOT NULL,
  with_food BOOLEAN NOT NULL DEFAULT FALSE,
  instructions TEXT
);

-- 20. Lifestyle Targets (Child of Prescriptions & Patients)
CREATE TABLE lifestyle_targets (
  id TEXT PRIMARY KEY,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('diet', 'steps', 'calories', 'sleep', 'bp', 'glucose', 'other')),
  description TEXT NOT NULL,
  target_value NUMERIC,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. AI Clinical Q&A Audit Logs
CREATE TABLE ai_qa_logs (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  model_used TEXT NOT NULL DEFAULT 'llama3.2',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. WhatsApp Notifications Audit & Delivery Log
CREATE TABLE whatsapp_notifications (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('patient', 'family', 'doctor')),
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'simulated_sent', 'failed')) DEFAULT 'sent',
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Performance Indexes
-- ==============================================================================
CREATE INDEX idx_patients_doctor ON patients(doctor_id);
CREATE INDEX idx_med_logs_patient_time ON med_logs(patient_id, scheduled_at DESC);
CREATE INDEX idx_vitals_patient_time ON vitals(patient_id, recorded_at DESC);
CREATE INDEX idx_vitals_patient_type_time ON vitals(patient_id, type, recorded_at DESC);
CREATE INDEX idx_risk_scores_patient ON risk_scores(patient_id, computed_at DESC);
CREATE INDEX idx_risk_reasons_score ON risk_reasons(risk_score_id);
CREATE INDEX idx_alerts_patient ON alerts(patient_id, created_at DESC);
CREATE INDEX idx_alerts_audience ON alerts(audience, acknowledged_at);
CREATE INDEX idx_consents_patient ON consents(patient_id);
CREATE INDEX idx_audit_log_patient ON audit_log(patient_id, created_at DESC);
CREATE INDEX idx_doctor_notes_patient ON doctor_notes(patient_id, created_at DESC);
CREATE INDEX idx_patient_goals_patient ON patient_goals(patient_id, by_date ASC);
CREATE INDEX idx_wearable_devices_patient ON wearable_devices(patient_id);
CREATE INDEX idx_symptom_logs_patient ON symptom_logs(patient_id, created_at DESC);
CREATE INDEX idx_diagnosis_reports_patient ON diagnosis_reports(patient_id, generated_at DESC);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id, issued_at DESC);
CREATE INDEX idx_prescriptions_diagnosis ON prescriptions(diagnosis_report_id);
CREATE INDEX idx_prescription_meds_rx ON prescription_medicines(prescription_id);
CREATE INDEX idx_lifestyle_targets_patient ON lifestyle_targets(patient_id);
CREATE INDEX idx_lifestyle_targets_rx ON lifestyle_targets(prescription_id);
CREATE INDEX idx_ai_qa_logs_patient ON ai_qa_logs(patient_id, created_at DESC);
CREATE INDEX idx_whatsapp_notifications_patient ON whatsapp_notifications(patient_id, created_at DESC);

-- ==============================================================================
-- Supabase Realtime Publications (Safe & Idempotent)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'risk_scores') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE risk_scores;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'alerts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'med_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE med_logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'vitals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE vitals;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'diagnosis_reports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE diagnosis_reports;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'prescriptions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prescriptions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'patient_goals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE patient_goals;
  END IF;
END $$;
