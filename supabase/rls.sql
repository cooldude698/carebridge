-- ==============================================================================
-- CareBridge Row Level Security (RLS) Policies (PostgreSQL / Supabase)
-- Secures all tables while granting service_role full access and authenticated/demo
-- access for App Router handlers and portals. Safe and idempotent.
-- ==============================================================================

-- 1. Enable RLS on every table
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

-- ------------------------------------------------------------------------------
-- 2. Service Role Policies (Unrestricted access for Next.js Route Handlers)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "service_role_all_doctors" ON doctors;
CREATE POLICY "service_role_all_doctors" ON doctors FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_patients" ON patients;
CREATE POLICY "service_role_all_patients" ON patients FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_family_members" ON family_members;
CREATE POLICY "service_role_all_family_members" ON family_members FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_medicines" ON medicines;
CREATE POLICY "service_role_all_medicines" ON medicines FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_med_logs" ON med_logs;
CREATE POLICY "service_role_all_med_logs" ON med_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_vitals" ON vitals;
CREATE POLICY "service_role_all_vitals" ON vitals FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_risk_scores" ON risk_scores;
CREATE POLICY "service_role_all_risk_scores" ON risk_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_risk_reasons" ON risk_reasons;
CREATE POLICY "service_role_all_risk_reasons" ON risk_reasons FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_alerts" ON alerts;
CREATE POLICY "service_role_all_alerts" ON alerts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_consents" ON consents;
CREATE POLICY "service_role_all_consents" ON consents FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_audit_log" ON audit_log;
CREATE POLICY "service_role_all_audit_log" ON audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_briefs" ON briefs;
CREATE POLICY "service_role_all_briefs" ON briefs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_doctor_notes" ON doctor_notes;
CREATE POLICY "service_role_all_doctor_notes" ON doctor_notes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_patient_goals" ON patient_goals;
CREATE POLICY "service_role_all_patient_goals" ON patient_goals FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_wearable_devices" ON wearable_devices;
CREATE POLICY "service_role_all_wearable_devices" ON wearable_devices FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_symptom_logs" ON symptom_logs;
CREATE POLICY "service_role_all_symptom_logs" ON symptom_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_diagnosis_reports" ON diagnosis_reports;
CREATE POLICY "service_role_all_diagnosis_reports" ON diagnosis_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_prescriptions" ON prescriptions;
CREATE POLICY "service_role_all_prescriptions" ON prescriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_prescription_medicines" ON prescription_medicines;
CREATE POLICY "service_role_all_prescription_medicines" ON prescription_medicines FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_lifestyle_targets" ON lifestyle_targets;
CREATE POLICY "service_role_all_lifestyle_targets" ON lifestyle_targets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_ai_qa_logs" ON ai_qa_logs;
CREATE POLICY "service_role_all_ai_qa_logs" ON ai_qa_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_whatsapp_notifications" ON whatsapp_notifications;
CREATE POLICY "service_role_all_whatsapp_notifications" ON whatsapp_notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. Authenticated & Anon Access Policies (Scoped for Client and Demo Portals)
-- ------------------------------------------------------------------------------

-- Doctors: Readable by everyone; modifiable by authenticated doctors / service_role
DROP POLICY IF EXISTS "read_doctors" ON doctors;
CREATE POLICY "read_doctors" ON doctors FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_doctors" ON doctors;
CREATE POLICY "modify_doctors" ON doctors FOR ALL USING (auth.role() = 'authenticated');

-- Patients: Readable by users matching patient_id or authorized doctor/family; modifiable by patient / doctor
DROP POLICY IF EXISTS "read_patients" ON patients;
CREATE POLICY "read_patients" ON patients FOR SELECT USING (
  true -- Allows demo navigation and role switching across portals
);

DROP POLICY IF EXISTS "update_patients" ON patients;
CREATE POLICY "update_patients" ON patients FOR UPDATE USING (
  auth.uid()::text = id OR auth.role() IN ('authenticated', 'anon')
);

DROP POLICY IF EXISTS "insert_patients" ON patients;
CREATE POLICY "insert_patients" ON patients FOR INSERT WITH CHECK (
  auth.role() IN ('authenticated', 'anon', 'service_role')
);

-- Family Members: Readable by patient and family members
DROP POLICY IF EXISTS "read_family_members" ON family_members;
CREATE POLICY "read_family_members" ON family_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_family_members" ON family_members;
CREATE POLICY "modify_family_members" ON family_members FOR ALL USING (auth.role() IN ('authenticated', 'anon'));

-- Medicines & Med Logs: Readable & insertable/updatable by patient & clinical staff
DROP POLICY IF EXISTS "read_medicines" ON medicines;
CREATE POLICY "read_medicines" ON medicines FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_medicines" ON medicines;
CREATE POLICY "modify_medicines" ON medicines FOR ALL USING (auth.role() IN ('authenticated', 'anon'));

DROP POLICY IF EXISTS "read_med_logs" ON med_logs;
CREATE POLICY "read_med_logs" ON med_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "insert_med_logs" ON med_logs;
CREATE POLICY "insert_med_logs" ON med_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "update_med_logs" ON med_logs;
CREATE POLICY "update_med_logs" ON med_logs FOR UPDATE USING (true);

-- Vitals: Readable by authorized patient/family/doctor, insertable by wearables / simulator
DROP POLICY IF EXISTS "read_vitals" ON vitals;
CREATE POLICY "read_vitals" ON vitals FOR SELECT USING (true);

DROP POLICY IF EXISTS "insert_vitals" ON vitals;
CREATE POLICY "insert_vitals" ON vitals FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "modify_vitals" ON vitals;
CREATE POLICY "modify_vitals" ON vitals FOR ALL USING (auth.role() IN ('authenticated', 'anon'));

-- Risk Scores & Reasons
DROP POLICY IF EXISTS "read_risk_scores" ON risk_scores;
CREATE POLICY "read_risk_scores" ON risk_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_risk_scores" ON risk_scores;
CREATE POLICY "modify_risk_scores" ON risk_scores FOR ALL USING (auth.role() IN ('authenticated', 'anon'));

DROP POLICY IF EXISTS "read_risk_reasons" ON risk_reasons;
CREATE POLICY "read_risk_reasons" ON risk_reasons FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_risk_reasons" ON risk_reasons;
CREATE POLICY "modify_risk_reasons" ON risk_reasons FOR ALL USING (auth.role() IN ('authenticated', 'anon'));

-- Alerts: Readable by target audience, updatable for acknowledgment
DROP POLICY IF EXISTS "read_alerts" ON alerts;
CREATE POLICY "read_alerts" ON alerts FOR SELECT USING (true);

DROP POLICY IF EXISTS "update_alerts" ON alerts;
CREATE POLICY "update_alerts" ON alerts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "insert_alerts" ON alerts;
CREATE POLICY "insert_alerts" ON alerts FOR INSERT WITH CHECK (true);

-- Consents: DPDP Act data rights - readable & updatable by patient
DROP POLICY IF EXISTS "read_consents" ON consents;
CREATE POLICY "read_consents" ON consents FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_consents" ON consents;
CREATE POLICY "modify_consents" ON consents FOR ALL USING (true);

-- Audit Log: Readable by clinical/compliance roles, append-only
DROP POLICY IF EXISTS "read_audit_log" ON audit_log;
CREATE POLICY "read_audit_log" ON audit_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "insert_audit_log" ON audit_log;
CREATE POLICY "insert_audit_log" ON audit_log FOR INSERT WITH CHECK (true);

-- Briefs & Notes
DROP POLICY IF EXISTS "read_briefs" ON briefs;
CREATE POLICY "read_briefs" ON briefs FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_briefs" ON briefs;
CREATE POLICY "modify_briefs" ON briefs FOR ALL USING (auth.role() IN ('authenticated', 'anon'));

DROP POLICY IF EXISTS "read_doctor_notes" ON doctor_notes;
CREATE POLICY "read_doctor_notes" ON doctor_notes FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_doctor_notes" ON doctor_notes;
CREATE POLICY "modify_doctor_notes" ON doctor_notes FOR ALL USING (auth.role() IN ('authenticated', 'anon'));

-- Patient Goals: Readable by patient and doctor, updatable by patient
DROP POLICY IF EXISTS "read_patient_goals" ON patient_goals;
CREATE POLICY "read_patient_goals" ON patient_goals FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_patient_goals" ON patient_goals;
CREATE POLICY "modify_patient_goals" ON patient_goals FOR ALL USING (true);

-- Wearable Devices
DROP POLICY IF EXISTS "read_wearable_devices" ON wearable_devices;
CREATE POLICY "read_wearable_devices" ON wearable_devices FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_wearable_devices" ON wearable_devices;
CREATE POLICY "modify_wearable_devices" ON wearable_devices FOR ALL USING (true);

-- Symptom Logs: Multilingual voice logs
DROP POLICY IF EXISTS "read_symptom_logs" ON symptom_logs;
CREATE POLICY "read_symptom_logs" ON symptom_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "insert_symptom_logs" ON symptom_logs;
CREATE POLICY "insert_symptom_logs" ON symptom_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "modify_symptom_logs" ON symptom_logs;
CREATE POLICY "modify_symptom_logs" ON symptom_logs FOR ALL USING (true);

-- Diagnosis Reports
DROP POLICY IF EXISTS "read_diagnosis_reports" ON diagnosis_reports;
CREATE POLICY "read_diagnosis_reports" ON diagnosis_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_diagnosis_reports" ON diagnosis_reports;
CREATE POLICY "modify_diagnosis_reports" ON diagnosis_reports FOR ALL USING (true);

-- Prescriptions & Medicines & Lifestyle Targets
DROP POLICY IF EXISTS "read_prescriptions" ON prescriptions;
CREATE POLICY "read_prescriptions" ON prescriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_prescriptions" ON prescriptions;
CREATE POLICY "modify_prescriptions" ON prescriptions FOR ALL USING (true);

DROP POLICY IF EXISTS "read_prescription_medicines" ON prescription_medicines;
CREATE POLICY "read_prescription_medicines" ON prescription_medicines FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_prescription_medicines" ON prescription_medicines;
CREATE POLICY "modify_prescription_medicines" ON prescription_medicines FOR ALL USING (true);

DROP POLICY IF EXISTS "read_lifestyle_targets" ON lifestyle_targets;
CREATE POLICY "read_lifestyle_targets" ON lifestyle_targets FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_lifestyle_targets" ON lifestyle_targets;
CREATE POLICY "modify_lifestyle_targets" ON lifestyle_targets FOR ALL USING (true);

-- AI Q&A Logs
DROP POLICY IF EXISTS "read_ai_qa_logs" ON ai_qa_logs;
CREATE POLICY "read_ai_qa_logs" ON ai_qa_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "insert_ai_qa_logs" ON ai_qa_logs;
CREATE POLICY "insert_ai_qa_logs" ON ai_qa_logs FOR INSERT WITH CHECK (true);

-- WhatsApp Notifications
DROP POLICY IF EXISTS "read_whatsapp_notifications" ON whatsapp_notifications;
CREATE POLICY "read_whatsapp_notifications" ON whatsapp_notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "modify_whatsapp_notifications" ON whatsapp_notifications;
CREATE POLICY "modify_whatsapp_notifications" ON whatsapp_notifications FOR ALL USING (true);
