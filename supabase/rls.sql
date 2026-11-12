-- ==============================================================================
-- CareBridge Row-Level Security (RLS) Policies (Supabase / PostgreSQL)
-- Enforces role-scoped access for patient, family, doctor, and service_role.
-- ==============================================================================

-- Enable RLS across all 22 CareBridge tables
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE med_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifestyle_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_qa_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: extract CareBridge role / entity claim safely
CREATE OR REPLACE FUNCTION public.cb_claim(claim_key TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> claim_key, ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> claim_key, ''),
    NULLIF(auth.jwt() ->> claim_key, ''),
    auth.uid()::text
  );
$$;

-- 1. Service Role Bypass Policies (Next.js server route handlers using SUPABASE_SERVICE_ROLE_KEY)
DO $$
DECLARE
  tbl TEXT;
  all_tables TEXT[] := ARRAY[
    'doctors', 'patients', 'family_members', 'medicines', 'med_logs',
    'vitals', 'risk_scores', 'risk_reasons', 'alerts', 'consents',
    'audit_log', 'briefs', 'doctor_notes', 'patient_goals',
    'wearable_devices', 'symptom_logs', 'diagnosis_reports', 'prescriptions',
    'prescription_medicines', 'lifestyle_targets', 'ai_qa_logs', 'whatsapp_notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY all_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS service_role_all ON %I;', tbl);
    EXECUTE format(
      'CREATE POLICY service_role_all ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);',
      tbl
    );
  END LOOP;
END $$;

-- 2. Doctors Table (Readable by authenticated clinical portal users)
DROP POLICY IF EXISTS doctors_read_authenticated ON doctors;
CREATE POLICY doctors_read_authenticated ON doctors
  FOR SELECT TO authenticated
  USING (true);

-- 3. Patients Table (Patient sees self, Family sees linked patient, Doctor sees assigned patients)
DROP POLICY IF EXISTS patients_scoped_select ON patients;
CREATE POLICY patients_scoped_select ON patients
  FOR SELECT TO authenticated
  USING (
    id = public.cb_claim('patient_id')
    OR doctor_id = public.cb_claim('doctor_id')
    OR EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.patient_id = patients.id
        AND (fm.id = public.cb_claim('family_id') OR fm.id = auth.uid()::text)
    )
  );

-- 4. Patient-Owned Clinical Tables (Read/Write for Patient & Assigned Doctor; Read-Only for Linked Family)
DO $$
DECLARE
  tbl TEXT;
  patient_tables TEXT[] := ARRAY[
    'medicines', 'med_logs', 'vitals', 'risk_scores', 'alerts',
    'consents', 'doctor_notes', 'patient_goals', 'wearable_devices',
    'symptom_logs', 'diagnosis_reports', 'prescriptions', 'lifestyle_targets',
    'ai_qa_logs', 'whatsapp_notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY patient_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_scoped_select ON %I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_scoped_select ON %I FOR SELECT TO authenticated USING (
        patient_id = public.cb_claim(''patient_id'')
        OR EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = %I.patient_id
            AND (
              p.doctor_id = public.cb_claim(''doctor_id'')
              OR EXISTS (
                SELECT 1 FROM family_members fm
                WHERE fm.patient_id = p.id
                  AND (fm.id = public.cb_claim(''family_id'') OR fm.id = auth.uid()::text)
              )
            )
        )
      );',
      tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- Patient write permissions (med_logs, vitals, consents, patient_goals, symptom_logs, wearable_devices)
DROP POLICY IF EXISTS med_logs_patient_write ON med_logs;
CREATE POLICY med_logs_patient_write ON med_logs
  FOR ALL TO authenticated
  USING (patient_id = public.cb_claim('patient_id'))
  WITH CHECK (patient_id = public.cb_claim('patient_id'));

DROP POLICY IF EXISTS vitals_patient_write ON vitals;
CREATE POLICY vitals_patient_write ON vitals
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = public.cb_claim('patient_id'));

DROP POLICY IF EXISTS consents_patient_write ON consents;
CREATE POLICY consents_patient_write ON consents
  FOR UPDATE TO authenticated
  USING (patient_id = public.cb_claim('patient_id'))
  WITH CHECK (patient_id = public.cb_claim('patient_id'));

DROP POLICY IF EXISTS patient_goals_patient_write ON patient_goals;
CREATE POLICY patient_goals_patient_write ON patient_goals
  FOR UPDATE TO authenticated
  USING (patient_id = public.cb_claim('patient_id'))
  WITH CHECK (patient_id = public.cb_claim('patient_id'));

DROP POLICY IF EXISTS symptom_logs_patient_write ON symptom_logs;
CREATE POLICY symptom_logs_patient_write ON symptom_logs
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = public.cb_claim('patient_id'));

-- Doctor write permissions (diagnosis_reports, prescriptions, prescription_medicines, lifestyle_targets, doctor_notes)
DROP POLICY IF EXISTS diagnosis_reports_doctor_write ON diagnosis_reports;
CREATE POLICY diagnosis_reports_doctor_write ON diagnosis_reports
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = diagnosis_reports.patient_id AND p.doctor_id = public.cb_claim('doctor_id')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = diagnosis_reports.patient_id AND p.doctor_id = public.cb_claim('doctor_id')
    )
  );

DROP POLICY IF EXISTS prescriptions_doctor_write ON prescriptions;
CREATE POLICY prescriptions_doctor_write ON prescriptions
  FOR ALL TO authenticated
  USING (doctor_id = public.cb_claim('doctor_id'))
  WITH CHECK (doctor_id = public.cb_claim('doctor_id'));

DROP POLICY IF EXISTS rx_medicines_scoped_select ON prescription_medicines;
CREATE POLICY rx_medicines_scoped_select ON prescription_medicines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prescriptions rx
      JOIN patients p ON p.id = rx.patient_id
      WHERE rx.id = prescription_medicines.prescription_id
        AND (p.id = public.cb_claim('patient_id') OR p.doctor_id = public.cb_claim('doctor_id'))
    )
  );

DROP POLICY IF EXISTS risk_reasons_scoped_select ON risk_reasons;
CREATE POLICY risk_reasons_scoped_select ON risk_reasons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM risk_scores rs
      JOIN patients p ON p.id = rs.patient_id
      WHERE rs.id = risk_reasons.risk_score_id
        AND (p.id = public.cb_claim('patient_id') OR p.doctor_id = public.cb_claim('doctor_id'))
    )
  );

-- Audit log: patient and doctor can read, never delete
DROP POLICY IF EXISTS audit_log_scoped_select ON audit_log;
CREATE POLICY audit_log_scoped_select ON audit_log
  FOR SELECT TO authenticated
  USING (
    patient_id = public.cb_claim('patient_id')
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = audit_log.patient_id AND p.doctor_id = public.cb_claim('doctor_id')
    )
  );

-- Briefs: doctor access only
DROP POLICY IF EXISTS briefs_doctor_select ON briefs;
CREATE POLICY briefs_doctor_select ON briefs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = briefs.patient_id AND p.doctor_id = public.cb_claim('doctor_id')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = briefs.patient_id AND p.doctor_id = public.cb_claim('doctor_id')
    )
  );

-- Family members: patient, doctor, or self
DROP POLICY IF EXISTS family_members_scoped_select ON family_members;
CREATE POLICY family_members_scoped_select ON family_members
  FOR SELECT TO authenticated
  USING (
    id = public.cb_claim('family_id')
    OR patient_id = public.cb_claim('patient_id')
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = family_members.patient_id AND p.doctor_id = public.cb_claim('doctor_id')
    )
  );

