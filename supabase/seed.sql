-- ==============================================================================
-- CareBridge Seed Data (Simulated Data for BuilderCon Demo & Evaluation)
-- Matches lib/supabase/localStore.ts 1:1
-- ==============================================================================

TRUNCATE TABLE
  whatsapp_notifications,
  ai_qa_logs,
  lifestyle_targets,
  prescription_medicines,
  prescriptions,
  diagnosis_reports,
  symptom_logs,
  wearable_devices,
  patient_goals,
  doctor_notes,
  briefs,
  audit_log,
  consents,
  alerts,
  risk_reasons,
  risk_scores,
  vitals,
  med_logs,
  medicines,
  family_members,
  patients,
  doctors
CASCADE;

-- 1. Doctor
INSERT INTO doctors (id, name, clinic) VALUES
('d1', 'Dr. Meera Rao', 'Sunrise Clinic, Indiranagar');

-- 2. Patients
INSERT INTO patients (id, name, age, language, conditions, doctor_id, family_id, gender, whatsapp_number, blood_group, allergies, discharged_at, created_at) VALUES
('p1', 'Ramesh K.', 62, 'Hindi', ARRAY['Diabetes Type 2', 'Hypertension'], 'd1', 'f1', 'Male', '+91 98450 11223', 'B+', ARRAY['Sulfa drugs'], NOW() - INTERVAL '10 days', NOW() - INTERVAL '30 days'),
('p2', 'Anita S.', 54, 'Kannada', ARRAY['Hypertension'], 'd1', 'f2', 'Female', '+91 98451 22334', 'O+', '{}', NULL, NOW() - INTERVAL '30 days'),
('p3', 'Suresh P.', 48, 'English', ARRAY['Diabetes Type 2'], 'd1', 'f3', 'Male', '+91 98452 33445', 'A+', '{}', NULL, NOW() - INTERVAL '30 days');

-- 3. Family Members
INSERT INTO family_members (id, name, relation, patient_id, phone) VALUES
('f1', 'Karan K.', 'Son (Bengaluru)', 'p1', '+91 98450 12345'),
('f2', 'Priya S.', 'Daughter (Mysuru)', 'p2', '+91 98451 23456'),
('f3', 'Neha P.', 'Spouse (Bengaluru)', 'p3', '+91 98452 34567');

-- 4. Medicines
INSERT INTO medicines (id, patient_id, name, dose, times, instructions) VALUES
('m1', 'p1', 'Metformin', '500mg', ARRAY['08:00', '20:00'], 'Take after breakfast and dinner'),
('m2', 'p1', 'Amlodipine', '5mg', ARRAY['08:00'], 'Take once in the morning after food'),
('m3', 'p2', 'Telmisartan', '40mg', ARRAY['09:00'], 'Take in the morning'),
('m4', 'p2', 'Hydrochlorothiazide', '12.5mg', ARRAY['09:00'], 'Take in the morning with water'),
('m5', 'p3', 'Metformin', '500mg', ARRAY['08:30'], 'Take after breakfast');

-- 5. Consents (DPDP Act Compliance)
INSERT INTO consents (id, patient_id, category, granted, updated_at) VALUES
('c1', 'p1', 'vitals', TRUE, NOW()),
('c2', 'p1', 'medicines', TRUE, NOW()),
('c3', 'p1', 'steps', TRUE, NOW()),
('c4', 'p1', 'glucose', TRUE, NOW()),
('c5', 'p2', 'vitals', TRUE, NOW()),
('c6', 'p2', 'medicines', TRUE, NOW()),
('c7', 'p2', 'steps', TRUE, NOW()),
('c8', 'p2', 'glucose', TRUE, NOW()),
('c9', 'p3', 'vitals', TRUE, NOW()),
('c10', 'p3', 'medicines', TRUE, NOW()),
('c11', 'p3', 'steps', TRUE, NOW()),
('c12', 'p3', 'glucose', TRUE, NOW());

-- 6. Wearable Devices
INSERT INTO wearable_devices (id, patient_id, provider, device_name, last_synced_at, is_active, created_at) VALUES
('dev-fit-p1', 'p1', 'google_fit', 'WearOS Smartwatch (Google Fit Bridge)', NOW() - INTERVAL '12 minutes', TRUE, NOW() - INTERVAL '10 days');

-- 7. 14 Days History for p1, p2, p3 (BP, Steps, Glucose, SpO2, Calories, Sleep, Baseline HR)
DO $$
DECLARE
  day_offset INT;
  curr_date TIMESTAMPTZ;
BEGIN
  FOR day_offset IN REVERSE 14..1 LOOP
    curr_date := (NOW() - (day_offset || ' days')::INTERVAL)::DATE + TIME '08:00:00';

    -- Ramesh K. (p1) meds
    INSERT INTO med_logs (id, patient_id, medicine_id, scheduled_at, taken_at, status)
    VALUES (
      'p1-m1-am-' || day_offset,
      'p1',
      'm1',
      curr_date,
      CASE WHEN day_offset = 1 THEN NULL ELSE curr_date + INTERVAL '15 minutes' END,
      CASE WHEN day_offset = 1 THEN 'missed' ELSE 'taken' END
    );

    INSERT INTO med_logs (id, patient_id, medicine_id, scheduled_at, taken_at, status)
    VALUES (
      'p1-m2-' || day_offset,
      'p1',
      'm2',
      curr_date,
      curr_date + INTERVAL '16 minutes',
      'taken'
    );

    INSERT INTO med_logs (id, patient_id, medicine_id, scheduled_at, taken_at, status)
    VALUES (
      'p1-m1-pm-' || day_offset,
      'p1',
      'm1',
      curr_date + INTERVAL '12 hours',
      CASE WHEN day_offset = 2 THEN NULL ELSE curr_date + INTERVAL '12 hours 20 minutes' END,
      CASE WHEN day_offset = 2 THEN 'missed' ELSE 'taken' END
    );

    -- p1 BP
    INSERT INTO vitals (id, patient_id, type, value_a, value_b, source, device_id, recorded_at)
    VALUES (
      'p1-bp-' || day_offset,
      'p1',
      'bp',
      CASE WHEN day_offset <= 7 THEN 140 + (day_offset % 3) * 2 ELSE 126 + (day_offset % 4) END,
      CASE WHEN day_offset <= 7 THEN 88 + (day_offset % 2) * 2 ELSE 82 + (day_offset % 3) END,
      'manual',
      NULL,
      curr_date + INTERVAL '1 hour'
    );

    -- p1 Steps
    INSERT INTO vitals (id, patient_id, type, value_a, value_b, source, device_id, recorded_at)
    VALUES (
      'p1-steps-' || day_offset,
      'p1',
      'steps',
      CASE WHEN day_offset <= 7 THEN 2750 + day_offset * 50 ELSE 5400 + (day_offset % 5) * 100 END,
      NULL,
      'wearable',
      'dev-fit-p1',
      curr_date + INTERVAL '13 hours'
    );

    -- p1 Glucose
    INSERT INTO vitals (id, patient_id, type, value_a, value_b, source, device_id, recorded_at)
    VALUES (
      'p1-glu-' || day_offset,
      'p1',
      'glucose',
      CASE WHEN day_offset <= 7 THEN 152 + day_offset * 3 ELSE 132 + (day_offset % 8) END,
      NULL,
      'manual',
      NULL,
      curr_date - INTERVAL '30 minutes'
    );

    -- 7-day SpO2, Calories, Sleep for p1
    IF day_offset <= 7 THEN
      INSERT INTO vitals (id, patient_id, type, value_a, value_b, source, device_id, recorded_at)
      VALUES
        ('p1-spo2-' || day_offset, 'p1', 'spo2', 96 + (day_offset % 3), NULL, 'wearable', 'dev-fit-p1', curr_date + INTERVAL '2 hours'),
        ('p1-cal-' || day_offset, 'p1', 'calories', 280 + ((7 - day_offset) * 15), NULL, 'wearable', 'dev-fit-p1', curr_date + INTERVAL '13 hours'),
        ('p1-sleep-' || day_offset, 'p1', 'sleep', 6.4 + ((day_offset % 4) * 0.2), NULL, 'wearable', 'dev-fit-p1', curr_date - INTERVAL '1 hour');
    END IF;

    -- Anita S. (p2)
    INSERT INTO med_logs (id, patient_id, medicine_id, scheduled_at, taken_at, status)
    VALUES (
      'p2-m3-' || day_offset,
      'p2',
      'm3',
      curr_date + INTERVAL '1 hour',
      CASE WHEN day_offset IN (1, 3, 5) THEN NULL ELSE curr_date + INTERVAL '1 hour 20 minutes' END,
      CASE WHEN day_offset IN (1, 3, 5) THEN 'missed' ELSE 'taken' END
    );

    INSERT INTO vitals (id, patient_id, type, value_a, value_b, source, recorded_at)
    VALUES
      ('p2-bp-' || day_offset, 'p2', 'bp', CASE WHEN day_offset <= 7 THEN 140 + (day_offset % 4) ELSE 124 + (day_offset % 4) END, CASE WHEN day_offset <= 7 THEN 88 + (day_offset % 3) ELSE 80 + (day_offset % 2) END, 'manual', curr_date + INTERVAL '2 hours'),
      ('p2-steps-' || day_offset, 'p2', 'steps', 4200 + day_offset * 40, NULL, 'wearable', curr_date + INTERVAL '13 hours');

    -- Suresh P. (p3)
    INSERT INTO med_logs (id, patient_id, medicine_id, scheduled_at, taken_at, status)
    VALUES ('p3-m5-' || day_offset, 'p3', 'm5', curr_date + INTERVAL '30 minutes', curr_date + INTERVAL '45 minutes', 'taken');

    INSERT INTO vitals (id, patient_id, type, value_a, value_b, source, recorded_at)
    VALUES
      ('p3-bp-' || day_offset, 'p3', 'bp', 120 + (day_offset % 3), 78 + (day_offset % 2), 'manual', curr_date + INTERVAL '1 hour'),
      ('p3-steps-' || day_offset, 'p3', 'steps', 6800 + (day_offset % 6) * 150, NULL, 'wearable', curr_date + INTERVAL '13 hours');
  END LOOP;

  -- Today's med logs for p1 (morning taken, evening pending for interactive demo)
  INSERT INTO med_logs (id, patient_id, medicine_id, scheduled_at, taken_at, status) VALUES
  ('p1-today-m1-am', 'p1', 'm1', CURRENT_DATE + TIME '08:00:00', CURRENT_DATE + TIME '08:15:00', 'taken'),
  ('p1-today-m2-am', 'p1', 'm2', CURRENT_DATE + TIME '08:00:00', CURRENT_DATE + TIME '08:16:00', 'taken'),
  ('p1-today-m1-pm', 'p1', 'm1', CURRENT_DATE + TIME '20:00:00', NULL, 'pending');

  -- Baseline normal HR readings for last 7 days at 02:00 (no initial HR anomaly)
  FOR day_offset IN 1..7 LOOP
    INSERT INTO vitals (id, patient_id, type, value_a, value_b, source, device_id, recorded_at)
    VALUES (
      'p1-hr-' || day_offset,
      'p1',
      'hr',
      70 + (day_offset % 4),
      NULL,
      'wearable',
      'dev-fit-p1',
      (CURRENT_DATE - (day_offset || ' days')::INTERVAL) + TIME '02:00:00'
    );
  END LOOP;
END $$;

-- 8. Initial Verified Diagnosis Report for p1
INSERT INTO diagnosis_reports (
  id, patient_id, generated_at, ai_summary, risk_flags, urgency,
  recommended_specialties, lifestyle_recommendations, reading_ids, model_version,
  reviewed_by_doctor, doctor_notes, reviewed_at
) VALUES (
  'diag-seed-1',
  'p1',
  NOW() - INTERVAL '1 day',
  '14-day watch and home cuff telemetry shows mild upward blood pressure drift (140/88 mmHg) and reduced daily walking (~2,800 steps vs 5,400 baseline) following recent discharge. Blood oxygen (97% SpO2) and resting heart rate (72 bpm) remain stable.',
  '[{"type":"bp_trend","severity":"medium","value":"140/88 mmHg","normalRange":"<130/80 mmHg","message":"Systolic BP trending mildly upward post-discharge","readingId":"p1-bp-1"},{"type":"steps_decline","severity":"medium","value":"2,800 steps","normalRange":">=4,500 steps/day","message":"Daily walking below post-discharge activity goal","readingId":"p1-steps-1"}]'::jsonb,
  'soon',
  ARRAY['General Medicine', 'Diabetology'],
  ARRAY['Target 4,500 steps/day in 2 short gentle walks', 'Burn ~350 active kcal/day without overexertion', 'Low-oil, low-glycemic South Indian meals; avoid fried snacks and extra salt'],
  ARRAY['p1-bp-1', 'p1-steps-1', 'p1-spo2-1', 'p1-hr-1'],
  'ollama-llama3.2',
  'd1',
  'Continue Metformin 500mg BD and Amlodipine 5mg OD. Gradually build walking to 4,500 steps/day.',
  NOW() - INTERVAL '20 hours'
);

-- 9. Initial Active Digital Prescription & Lifestyle Targets for p1
INSERT INTO prescriptions (id, patient_id, doctor_id, diagnosis_report_id, issued_at, follow_up_date, status, doctor_summary, watch_sync_payload) VALUES (
  'rx-seed-1',
  'p1',
  'd1',
  'diag-seed-1',
  NOW() - INTERVAL '1 day',
  CURRENT_DATE + 14,
  'active',
  'Post-discharge maintenance for Type 2 Diabetes & Hypertension: take Metformin twice daily after meals, Amlodipine each morning, walk 4,500 steps/day, and follow low-oil low-GI meals.',
  '{"synced_at":"","next_dose_summary":"Metformin 500mg · 8:00 PM (After food)","daily_step_target":4500,"daily_calorie_target":350,"active_alert_level":"watch","diet_rule_short":"Low-oil, low-GI meals; limit white rice at dinner"}'::jsonb
);

INSERT INTO prescription_medicines (id, prescription_id, medicine_id, medicine_name, dosage, frequency, times, duration, with_food, instructions) VALUES
('rxm-1', 'rx-seed-1', 'm1', 'Metformin', '500mg', 'Twice daily', ARRAY['08:00', '20:00'], '30 days', TRUE, 'Take after breakfast and dinner with water'),
('rxm-2', 'rx-seed-1', 'm2', 'Amlodipine', '5mg', 'Once morning', ARRAY['08:00'], '30 days', TRUE, 'Take every morning after breakfast');

INSERT INTO lifestyle_targets (id, prescription_id, patient_id, category, description, target_value, unit) VALUES
('lt-1', 'rx-seed-1', 'p1', 'steps', 'Walk 4,500 steps daily (split into morning & evening strolls)', 4500, 'steps/day'),
('lt-2', 'rx-seed-1', 'p1', 'calories', 'Maintain 350 active kcal daily energy burn', 350, 'kcal/day'),
('lt-3', 'rx-seed-1', 'p1', 'diet', 'Low-oil, low-glycemic South Indian meals; limit white rice at dinner & avoid extra pickle/salt', NULL, NULL);

-- 10. Doctor Notes & Patient Goals
INSERT INTO doctor_notes (id, patient_id, doctor_id, note_text, parsed_instructions, created_at) VALUES (
  'dn-1',
  'p1',
  'd1',
  'Walk 4,500 steps daily in gentle sessions. Monitor BP before breakfast and keep evening meals light.',
  '{"reminders":[{"medicine":"Metformin 500mg","time":"08:00 & 20:00","instruction":"Take after meals"},{"medicine":"Amlodipine 5mg","time":"08:00","instruction":"Take after breakfast"}],"goals":[{"category":"steps","target":"Walk 4,500 steps today","by":"Today"},{"category":"calories","target":"Burn 350 active kcal today","by":"Today"},{"category":"diet","target":"Follow low-oil, low-GI dinner (limit white rice)","by":"Today"}],"followUpDate":"In 14 days"}'::jsonb,
  NOW() - INTERVAL '1 day'
);

INSERT INTO patient_goals (id, patient_id, category, target, by_date, source_note_id, completed_at, created_at) VALUES
('g-1', 'p1', 'steps', 'Walk 4,500 steps daily', 'Today', 'dn-1', NULL, NOW() - INTERVAL '1 day'),
('g-2', 'p1', 'calories', 'Burn 350 active kcal today', 'Today', 'dn-1', NULL, NOW() - INTERVAL '1 day'),
('g-3', 'p1', 'diet', 'Low-oil, low-GI dinner (limit white rice)', 'Today', 'dn-1', NULL, NOW() - INTERVAL '1 day');

-- 11. Risk Scores & Reasons
INSERT INTO risk_scores (id, patient_id, score, band, computed_at) VALUES
('rs-p1-init', 'p1', 40, 'yellow', NOW()),
('rs-p2-init', 'p2', 45, 'yellow', NOW()),
('rs-p3-init', 'p3', 10, 'green', NOW());

INSERT INTO risk_reasons (id, risk_score_id, rule_id, text, weight, created_at) VALUES
('rr-p1-1', 'rs-p1-init', 'BP_TREND_UP', 'Avg systolic BP trended up +10.2% vs previous period (now 141 mmHg).', 20, NOW()),
('rr-p1-2', 'rs-p1-init', 'STEPS_DROP', 'Daily activity dropped by 48% (average 2,850 steps vs baseline 5,500 steps).', 10, NOW()),
('rr-p1-3', 'rs-p1-init', 'RECENT_DISCHARGE', 'Recent hospital discharge (10 days ago) - heightened readmission risk window.', 10, NOW()),
('rr-p2-1', 'rs-p2-init', 'BP_TREND_UP', 'Diastolic BP persistently elevated around 88 mmHg.', 20, NOW()),
('rr-p2-2', 'rs-p2-init', 'MED_ADHERENCE_LOW', 'Adherence below 70% over past 7 days.', 25, NOW());

-- 12. Alerts & Audit Log
INSERT INTO alerts (id, patient_id, level, audience, message, created_at, acknowledged_at) VALUES
('alt-doc-1', 'p1', 'doctor_note', 'family', 'Dr. Meera Rao updated digital prescription & lifestyle plan.', NOW() - INTERVAL '30 minutes', NULL),
('alt-1', 'p1', 'reminder', 'patient', 'Time for evening Metformin (500mg) after dinner', NOW() - INTERVAL '15 minutes', NULL),
('alt-3', 'p2', 'reminder', 'patient', 'Scheduled BP check reminder', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours');

INSERT INTO audit_log (id, patient_id, actor_type, actor_id, action, category, created_at) VALUES
('aud-1', 'p1', 'doctor', 'd1', 'VIEW_TELEMETRY', 'vitals', NOW() - INTERVAL '2 days'),
('aud-2', 'p1', 'doctor', 'd1', 'ISSUED_DIGITAL_PRESCRIPTION', 'medicines', NOW() - INTERVAL '1 day'),
('aud-3', 'p2', 'doctor', 'd1', 'VIEW_PROFILE', 'all', NOW() - INTERVAL '1 day');
