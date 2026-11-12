export type RiskBand = "green" | "yellow" | "red";

export type ConsentCategory = "vitals" | "medicines" | "steps" | "glucose";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender?: string;
  whatsapp_number?: string | null;
  whatsappNumber?: string | null;
  blood_group?: string | null;
  bloodGroup?: string | null;
  allergies?: string[];
  language: "Hindi" | "Kannada" | "English" | string;
  conditions: string[];
  doctor_id: string;
  doctorId?: string;
  family_id: string;
  familyId?: string;
  discharged_at?: string | null;
  dischargedAt?: string | null;
  created_at: string;
  createdAt?: string;
}

export interface Doctor {
  id: string;
  name: string;
  clinic: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  patient_id: string;
  patientId?: string;
  phone: string;
}

export interface Medicine {
  id: string;
  patient_id?: string;
  name: string;
  dose: string;
  times: string[];
  instructions?: string;
}

export interface MedLog {
  id: string;
  patient_id?: string;
  patientId?: string;
  medicine_id?: string;
  medicineId?: string;
  medicine_name?: string;
  medicineName?: string;
  dose?: string;
  scheduled_at?: string;
  scheduledAt?: string;
  taken_at?: string | null;
  takenAt?: string | null;
  status: "taken" | "missed" | "pending";
}

export interface Vital {
  id: string;
  patient_id?: string;
  patientId?: string;
  type: "bp" | "steps" | "glucose" | "hr" | "spo2" | "calories" | "sleep";
  value_a?: number;
  valueA?: number;
  value_b?: number | null;
  valueB?: number | null;
  recorded_at?: string;
  recordedAt?: string;
  source?: "wearable" | "manual" | "simulator";
  device_id?: string | null;
  deviceId?: string | null;
}

export interface AnomalyFlag {
  ruleId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail: string;
  readingId: string; // MUST be a real vitals.id from the DB — never invented
}

export interface WearableContext {
  patientId: string;
  windowDays: 14;
  heartRate: {
    mean: number;
    nocturnalMean: number; // hours 23:00–05:00
    max: number;
    readings: { id: string; at: string; bpm: number }[];
  };
  bloodPressure: {
    latestSystolic: number;
    latestDiastolic: number;
    avgSystolic7d: number;
    prevAvgSystolic7d: number; // prior 7 days
    trend: "rising" | "stable" | "falling";
  };
  steps: {
    dailyMean: number;
    baseline14d: number;
    pctChangeFromBaseline: number;
  };
  glucose: {
    latestFasting: number | null;
    mean: number | null;
  };
  spo2?: {
    latest: number | null;
    min24h: number | null;
    readings: { id: string; at: string; pct: number }[];
  };
  calories?: {
    dailyMean: number;
    latest: number;
  };
  sleep?: {
    lastNightHours: number | null;
    avg7dHours: number | null;
  };
  anomalyFlags: AnomalyFlag[];
  lastUpdated: string;
}

export interface RiskScore {
  id: string;
  patient_id: string;
  score: number;
  band: RiskBand;
  computed_at: string;
}

export interface RiskReason {
  id?: string;
  risk_score_id?: string;
  rule_id?: string;
  ruleId?: string;
  text: string;
  weight: number;
}

export interface Alert {
  id: string;
  patient_id?: string;
  patientId?: string;
  level: "reminder" | "family" | "doctor" | "wearable_anomaly" | "doctor_note";
  audience: "patient" | "family" | "doctor";
  message: string;
  created_at?: string;
  createdAt?: string;
  acknowledged_at?: string | null;
  acknowledgedAt?: string | null;
}

export interface Consent {
  id?: string;
  patient_id: string;
  category: ConsentCategory;
  granted: boolean;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  patient_id: string;
  patientId?: string;
  actor_type: string;
  actor_id: string;
  actor?: string;
  action: string;
  category: string;
  created_at?: string;
  at?: string;
}

export interface Brief {
  id?: string;
  patient_id: string;
  text: string;
  source: "llm" | "fallback";
  created_at: string;
  sections?: {
    sinceLastVisit: string;
    concerns: string;
    suggestedChecks: string;
  };
}

// Risk Engine Snapshot Structure
export interface PatientSnapshot {
  patient: Patient;
  medLogs: MedLog[];
  vitals: Vital[];
  consents?: Consent[];
  currentScore?: number;
}

// API DTOs

export interface PatientListItem {
  id: string;
  name: string;
  age: number;
  score: number;
  band: RiskBand;
  topReason: string;
  lastSeen: string;
  conditions: string[];
}

export interface PatientDetail {
  profile: Patient;
  medicines?: Medicine[];
  vitals: Vital[];
  medLogs: MedLog[];
  risk: {
    score: number;
    band: RiskBand;
    reasons: RiskReason[];
  };
  alerts: Alert[];
  consents?: Consent[];
  wearable?: WearableContext | null;
  diagnosisReports?: DiagnosisReport[];
  prescriptions?: Prescription[];
  wearableDevices?: WearableDevice[];
}

export interface DoctorNoteReminder {
  medicine: string;
  time: string;
  instruction: string;
}

export interface DoctorNote {
  id: string;
  patient_id: string;
  doctor_id: string;
  note_text: string;
  parsed_instructions?: {
    reminders: DoctorNoteReminder[];
    goals: { category: "steps" | "medicine" | "bp" | "glucose" | "other"; target: string; by: string }[];
    followUpDate: string | null;
  } | null;
  created_at: string;
}

export interface PatientGoal {
  id: string;
  patient_id: string;
  category: "steps" | "medicine" | "bp" | "glucose" | "other";
  target: string;
  by_date?: string | null;
  source_note_id?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface GoalsResponse {
  goals: PatientGoal[];
  latestNote: DoctorNote | null;
}

export interface DoctorActionRequest {
  patientId: string;
  type: "call" | "message" | "teleconsult";
  note?: string;
}

export interface DoctorActionResponse {
  success: boolean;
  message: string;
  actionRecord: {
    id: string;
    patientId: string;
    type: "call" | "message" | "teleconsult";
    timestamp: string;
  };
}

export interface AdminROIResponse {
  readmissionsPrevented: number;
  doctorHoursSaved: number;
  alertsActioned: number;
  patientsMonitored: number;
  assumptions: string[];
  alertsPerDay: {
    date: string;
    count: number;
  }[];
}

export interface FamilyFeedResponse {
  patient: {
    id: string;
    name: string;
    age: number;
    conditions?: string[];
    band: RiskBand;
    score?: number;
    lastSeen?: string;
  };
  today: {
    steps?: number;
    medicinesTaken?: number;
    medicinesTotal?: number;
    latestBp?: string;
    statusBand?: RiskBand;
    adherencePct: number;
    latestSteps: number;
  };
  alerts: Alert[];
  latestDiagnosis?: DiagnosisReport | null;
  activePrescriptions?: Prescription[];
  lifestyleProgress?: {
    stepsCurrent: number;
    stepsTarget: number;
    caloriesCurrent: number;
    caloriesTarget: number;
    goalsCompleted: number;
    goalsTotal: number;
  };
  wearableSummary?: {
    spo2: number | null;
    hr: number | null;
    bp: string | null;
    steps: number;
    calories: number;
  };
}

export interface SimEventRequest {
  patientId: string;
  kind: "miss_dose" | "bp_spike" | "steps_drop" | "recover" | "hr_spike" | "spo2_drop";
  params?: {
    systolic?: number;
    diastolic?: number;
    medicineId?: string;
    steps?: number;
    hr?: number;
    spo2?: number;
  };
}

export interface SimEventResponse {
  success: boolean;
  message: string;
  newRisk: {
    score: number;
    band: RiskBand;
    reasons: RiskReason[];
  };
  alertCreated?: Alert | null;
}

export interface EscalationTickResponse {
  fired: Alert[];
  pendingCount: number;
}

// ---------------------------------------------------------------------------
// Clinical Diagnostics, Devices, Prescriptions, Lifestyle & WhatsApp Interfaces
// ---------------------------------------------------------------------------

export interface WearableDevice {
  id: string;
  patient_id: string;
  patientId?: string;
  provider: "google_fit" | "wearos" | "apple_health" | "manual" | "simulator";
  device_name: string;
  deviceName?: string;
  is_active: boolean;
  isActive?: boolean;
  last_synced_at: string | null;
  lastSyncedAt?: string | null;
  created_at: string;
  createdAt?: string;
}

export interface SymptomLog {
  id: string;
  patient_id: string;
  patientId?: string;
  raw_text: string;
  rawText?: string;
  language: string;
  extracted_symptoms: string[];
  extractedSymptoms?: string[];
  severity_hint: "low" | "moderate" | "high";
  severityHint?: "low" | "moderate" | "high";
  created_at: string;
  createdAt?: string;
}

export interface RiskFlag {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  value: number | string;
  normalRange: string;
  message: string;
  readingId?: string;
}

export interface DiagnosisReport {
  id: string;
  patient_id: string;
  patientId?: string;
  generated_at: string;
  generatedAt?: string;
  ai_summary: string;
  aiSummary?: string;
  risk_flags: RiskFlag[];
  riskFlags?: RiskFlag[];
  urgency: "routine" | "soon" | "urgent" | "emergency";
  recommended_specialties: string[];
  recommendedSpecialties?: string[];
  lifestyle_recommendations: string[];
  lifestyleRecommendations?: string[];
  symptom_input?: string | null;
  symptomInput?: string | null;
  reading_ids: string[];
  readingIds?: string[];
  model_version: string;
  modelVersion?: string;
  reviewed_by_doctor?: string | null;
  reviewedByDoctor?: string | null;
  doctor_notes?: string | null;
  doctorNotes?: string | null;
  reviewed_at?: string | null;
  reviewedAt?: string | null;
}

export interface PrescribedMedicine {
  id: string;
  prescription_id: string;
  prescriptionId?: string;
  medicine_id?: string;
  medicineId?: string;
  medicine_name: string;
  medicineName?: string;
  dosage: string;
  frequency: string;
  times: string[];
  duration: string;
  with_food: boolean;
  withFood?: boolean;
  instructions?: string | null;
}

export interface LifestyleTarget {
  id: string;
  prescription_id: string;
  prescriptionId?: string;
  patient_id: string;
  patientId?: string;
  category: "diet" | "steps" | "calories" | "sleep" | "bp" | "glucose" | "other";
  description: string;
  target_value?: number | null;
  targetValue?: number | null;
  unit?: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface WatchSyncPayload {
  synced_at: string;
  syncedAt?: string;
  next_dose_summary: string;
  nextDoseSummary?: string;
  daily_step_target: number;
  dailyStepTarget?: number;
  daily_calorie_target: number;
  dailyCalorieTarget?: number;
  active_alert_level: "normal" | "watch" | "urgent";
  activeAlertLevel?: "normal" | "watch" | "urgent";
  diet_rule_short: string;
  dietRuleShort?: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  patientId?: string;
  doctor_id: string;
  doctorId?: string;
  doctor_name: string;
  doctorName?: string;
  diagnosis_report_id?: string | null;
  diagnosisReportId?: string | null;
  issued_at: string;
  issuedAt?: string;
  follow_up_date?: string | null;
  followUpDate?: string | null;
  status: "active" | "completed" | "cancelled";
  doctor_summary: string;
  doctorSummary?: string;
  medicines: PrescribedMedicine[];
  lifestyle_targets: LifestyleTarget[];
  lifestyleTargets?: LifestyleTarget[];
  watch_sync_payload?: WatchSyncPayload | null;
  watchSyncPayload?: WatchSyncPayload | null;
}

export interface WhatsAppNotificationLog {
  id: string;
  patient_id: string;
  patientId?: string;
  recipient_phone: string;
  recipientPhone?: string;
  recipient_role: "patient" | "family" | "doctor";
  recipientRole?: "patient" | "family" | "doctor";
  event_type: string;
  eventType?: string;
  message: string;
  status: "sent" | "simulated_sent" | "failed";
  provider_message_id?: string | null;
  providerMessageId?: string | null;
  created_at: string;
  createdAt?: string;
}
