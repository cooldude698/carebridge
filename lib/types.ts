export type RiskBand = "green" | "yellow" | "red";

export type ConsentCategory = "vitals" | "medicines" | "steps" | "glucose";

export interface Patient {
  id: string;
  name: string;
  age: number;
  language: "Hindi" | "Kannada" | "English" | string;
  conditions: string[];
  doctor_id: string;
  family_id: string;
  discharged_at?: string | null;
  created_at: string;
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
  type: "bp" | "steps" | "glucose" | "hr";
  value_a?: number;
  valueA?: number;
  value_b?: number | null;
  valueB?: number | null;
  recorded_at?: string;
  recordedAt?: string;
}

export interface AnomalyFlag {
  ruleId: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
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
}

export interface SimEventRequest {
  patientId: string;
  kind: "miss_dose" | "bp_spike" | "steps_drop" | "recover" | "hr_spike";
  params?: {
    systolic?: number;
    diastolic?: number;
    medicineId?: string;
    steps?: number;
    hr?: number;
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
