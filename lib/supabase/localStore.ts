import {
  Patient,
  Doctor,
  FamilyMember,
  Medicine,
  MedLog,
  Vital,
  VitalType,
  RiskReason,
  Alert,
  Consent,
  AuditLog,
  Brief,
  PatientListItem,
  PatientDetail,
  FamilyFeedResponse,
  AdminROIResponse,
  DoctorActionResponse,
  SimEventRequest,
  SimEventResponse,
  DoctorNote,
  PatientGoal,
  WearableDevice,
  SymptomLog,
  DiagnosisReport,
  Prescription,
  PrescribedMedicine,
  LifestyleTarget,
  WatchSyncPayload,
  WhatsAppNotificationLog,
  WhatsAppPreferences,
} from "@/lib/types";
import { computeRisk } from "@/lib/risk/compute";

export interface AiQaLogEntry {
  id: string;
  patient_id: string;
  question: string;
  answer: string;
  model_used: string;
  created_at: string;
}

export interface CreatePrescriptionInput {
  patientId: string;
  doctorId?: string;
  diagnosisReportId?: string | null;
  doctorSummary: string;
  followUpDate?: string | null;
  medicines: Array<{
    medicineName: string;
    dosage: string;
    frequency: string;
    times: string[];
    duration: string;
    withFood: boolean;
    instructions?: string;
  }>;
  lifestyleTargets: Array<{
    category: LifestyleTarget["category"];
    description: string;
    targetValue?: number | null;
    unit?: string | null;
  }>;
}

export interface CareBridgeState {
  patients: Patient[];
  doctors: Doctor[];
  familyMembers: FamilyMember[];
  medicines: Medicine[];
  medLogs: MedLog[];
  vitals: Vital[];
  riskScores: Record<
    string,
    { score: number; band: "green" | "yellow" | "red"; reasons: RiskReason[]; computedAt: string }
  >;
  alerts: Alert[];
  consents: Consent[];
  auditLogs: AuditLog[];
  briefs: Brief[];
  doctorActions: {
    id: string;
    patientId: string;
    type: "call" | "message" | "teleconsult";
    note?: string;
    timestamp: string;
  }[];
  missedDoseEscalations: Record<
    string,
    { logId: string; patientId: string; detectedAt: number; firedStages: Set<"reminder" | "family" | "doctor"> }
  >;
  doctorNotes: DoctorNote[];
  patientGoals: PatientGoal[];
  wearableDevices: WearableDevice[];
  symptomLogs: SymptomLog[];
  diagnosisReports: DiagnosisReport[];
  prescriptions: Prescription[];
  aiQaLogs: AiQaLogEntry[];
  whatsappLogs: WhatsAppNotificationLog[];
  whatsappPrefs: Record<string, WhatsAppPreferences>;
}

function isoAtOffset(nowMs: number, daysAgo: number, hour: number, minute = 0): string {
  const d = new Date(nowMs - daysAgo * 24 * 60 * 60 * 1000);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function createInitialState(): CareBridgeState {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const doctors: Doctor[] = [
    {
      id: "d1",
      name: "Dr. Meera Rao",
      clinic: "Sunrise Clinic, Indiranagar",
    },
  ];

  const patients: Patient[] = [
    {
      id: "p1",
      name: "Ramesh K.",
      age: 62,
      language: "Hindi",
      conditions: ["Diabetes Type 2", "Hypertension"],
      doctor_id: "d1",
      family_id: "f1",
      gender: "Male",
      whatsapp_number: "+91 98450 11223",
      blood_group: "B+",
      allergies: ["Sulfa drugs"],
      discharged_at: new Date(now - 10 * dayMs).toISOString(),
      created_at: new Date(now - 30 * dayMs).toISOString(),
    },
    {
      id: "p2",
      name: "Anita S.",
      age: 54,
      language: "Kannada",
      conditions: ["Hypertension"],
      doctor_id: "d1",
      family_id: "f2",
      gender: "Female",
      whatsapp_number: "+91 98451 22334",
      blood_group: "O+",
      allergies: [],
      discharged_at: null,
      created_at: new Date(now - 30 * dayMs).toISOString(),
    },
    {
      id: "p3",
      name: "Suresh P.",
      age: 48,
      language: "English",
      conditions: ["Diabetes Type 2"],
      doctor_id: "d1",
      family_id: "f3",
      gender: "Male",
      whatsapp_number: "+91 98452 33445",
      blood_group: "A+",
      allergies: [],
      discharged_at: null,
      created_at: new Date(now - 30 * dayMs).toISOString(),
    },
  ];

  const familyMembers: FamilyMember[] = [
    {
      id: "f1",
      name: "Karan K.",
      relation: "Son (Bengaluru)",
      patient_id: "p1",
      phone: "+91 98450 12345",
    },
    {
      id: "f2",
      name: "Priya S.",
      relation: "Daughter (Mysuru)",
      patient_id: "p2",
      phone: "+91 98451 23456",
    },
    {
      id: "f3",
      name: "Neha P.",
      relation: "Spouse (Bengaluru)",
      patient_id: "p3",
      phone: "+91 98452 34567",
    },
  ];

  const medicines: Medicine[] = [
    {
      id: "m1",
      patient_id: "p1",
      name: "Metformin",
      dose: "500mg",
      times: ["08:00", "20:00"],
      instructions: "Take after breakfast and dinner",
    },
    {
      id: "m2",
      patient_id: "p1",
      name: "Amlodipine",
      dose: "5mg",
      times: ["08:00"],
      instructions: "Take once in the morning after food",
    },
    {
      id: "m3",
      patient_id: "p2",
      name: "Telmisartan",
      dose: "40mg",
      times: ["09:00"],
      instructions: "Take in the morning",
    },
    {
      id: "m4",
      patient_id: "p2",
      name: "Hydrochlorothiazide",
      dose: "12.5mg",
      times: ["09:00"],
      instructions: "Take in the morning with water",
    },
    {
      id: "m5",
      patient_id: "p3",
      name: "Metformin",
      dose: "500mg",
      times: ["08:30"],
      instructions: "Take after breakfast",
    },
  ];

  const consents: Consent[] = [
    { id: "c1", patient_id: "p1", category: "vitals", granted: true, updated_at: new Date(now).toISOString() },
    { id: "c2", patient_id: "p1", category: "medicines", granted: true, updated_at: new Date(now).toISOString() },
    { id: "c3", patient_id: "p1", category: "steps", granted: true, updated_at: new Date(now).toISOString() },
    { id: "c4", patient_id: "p1", category: "glucose", granted: true, updated_at: new Date(now).toISOString() },
    { id: "c5", patient_id: "p2", category: "vitals", granted: true, updated_at: new Date(now).toISOString() },
    { id: "c6", patient_id: "p2", category: "medicines", granted: true, updated_at: new Date(now).toISOString() },
    { id: "c7", patient_id: "p2", category: "steps", granted: true, updated_at: new Date(now).toISOString() },
    { id: "c8", patient_id: "p2", category: "glucose", granted: true, updated_at: new Date(now).toISOString() },
    { id: "c9", patient_id: "p3", category: "vitals", granted: true, updated_at: new Date(now).toISOString() },
    { id: "c10", patient_id: "p3", category: "medicines", granted: true, updated_at: new Date(now).toISOString() },
    { id: "c11", patient_id: "p3", category: "steps", granted: true, updated_at: new Date(now).toISOString() },
    { id: "c12", patient_id: "p3", category: "glucose", granted: true, updated_at: new Date(now).toISOString() },
  ];

  const wearableDevices: WearableDevice[] = [
    {
      id: "dev-fit-p1",
      patient_id: "p1",
      provider: "google_fit",
      device_name: "WearOS Smartwatch (Google Fit Bridge)",
      is_active: true,
      last_synced_at: new Date(now - 12 * 60 * 1000).toISOString(),
      created_at: new Date(now - 10 * dayMs).toISOString(),
    },
  ];

  const medLogs: MedLog[] = [];
  const vitals: Vital[] = [];

  for (let offset = 14; offset >= 1; offset--) {
    const isP1Recent = offset <= 7;
    const isP2Recent = offset <= 7;

    medLogs.push({
      id: `p1-m1-am-${offset}`,
      patient_id: "p1",
      medicine_id: "m1",
      medicine_name: "Metformin",
      dose: "500mg",
      scheduled_at: isoAtOffset(now, offset, 8, 0),
      taken_at: offset === 1 ? null : isoAtOffset(now, offset, 8, 15),
      status: offset === 1 ? "missed" : "taken",
    });

    medLogs.push({
      id: `p1-m2-${offset}`,
      patient_id: "p1",
      medicine_id: "m2",
      medicine_name: "Amlodipine",
      dose: "5mg",
      scheduled_at: isoAtOffset(now, offset, 8, 0),
      taken_at: isoAtOffset(now, offset, 8, 16),
      status: "taken",
    });

    medLogs.push({
      id: `p1-m1-pm-${offset}`,
      patient_id: "p1",
      medicine_id: "m1",
      medicine_name: "Metformin",
      dose: "500mg",
      scheduled_at: isoAtOffset(now, offset, 20, 0),
      taken_at: offset === 2 ? null : isoAtOffset(now, offset, 20, 20),
      status: offset === 2 ? "missed" : "taken",
    });

    vitals.push({
      id: `p1-bp-${offset}`,
      patient_id: "p1",
      type: "bp",
      value_a: isP1Recent ? 140 + (offset % 3) * 2 : 126 + (offset % 4),
      value_b: isP1Recent ? 88 + (offset % 2) * 2 : 82 + (offset % 3),
      source: "manual",
      device_id: null,
      recorded_at: isoAtOffset(now, offset, 9, 0),
    });

    vitals.push({
      id: `p1-steps-${offset}`,
      patient_id: "p1",
      type: "steps",
      value_a: isP1Recent ? 2750 + offset * 50 : 5400 + (offset % 5) * 100,
      value_b: null,
      source: "wearable",
      device_id: "dev-fit-p1",
      recorded_at: isoAtOffset(now, offset, 21, 0),
    });

    vitals.push({
      id: `p1-glu-${offset}`,
      patient_id: "p1",
      type: "glucose",
      value_a: isP1Recent ? 152 + offset * 3 : 132 + (offset % 8),
      value_b: null,
      source: "manual",
      device_id: null,
      recorded_at: isoAtOffset(now, offset, 7, 30),
    });

    if (offset <= 7) {
      vitals.push({
        id: `p1-spo2-${offset}`,
        patient_id: "p1",
        type: "spo2",
        value_a: 96 + (offset % 3),
        value_b: null,
        source: "wearable",
        device_id: "dev-fit-p1",
        recorded_at: isoAtOffset(now, offset, 6, 30),
      });

      vitals.push({
        id: `p1-cal-${offset}`,
        patient_id: "p1",
        type: "calories",
        value_a: 280 + (7 - offset) * 15,
        value_b: null,
        source: "wearable",
        device_id: "dev-fit-p1",
        recorded_at: isoAtOffset(now, offset, 21, 0),
      });

      vitals.push({
        id: `p1-sleep-${offset}`,
        patient_id: "p1",
        type: "sleep",
        value_a: Number((6.4 + (offset % 4) * 0.2).toFixed(1)),
        value_b: null,
        source: "wearable",
        device_id: "dev-fit-p1",
        recorded_at: isoAtOffset(now, offset, 6, 45),
      });

      vitals.push({
        id: `p1-hr-${offset}`,
        patient_id: "p1",
        type: "hr",
        value_a: 70 + (offset % 4),
        value_b: null,
        source: "wearable",
        device_id: "dev-fit-p1",
        recorded_at: isoAtOffset(now, offset, 2, 0),
      });
    }

    // Anita S (p2)
    medLogs.push({
      id: `p2-m3-${offset}`,
      patient_id: "p2",
      medicine_id: "m3",
      medicine_name: "Telmisartan",
      dose: "40mg",
      scheduled_at: isoAtOffset(now, offset, 9, 0),
      taken_at: offset === 1 || offset === 3 || offset === 5 ? null : isoAtOffset(now, offset, 9, 20),
      status: offset === 1 || offset === 3 || offset === 5 ? "missed" : "taken",
    });

    vitals.push({
      id: `p2-bp-${offset}`,
      patient_id: "p2",
      type: "bp",
      value_a: isP2Recent ? 140 + (offset % 4) : 124 + (offset % 4),
      value_b: isP2Recent ? 88 + (offset % 3) : 80 + (offset % 2),
      source: "manual",
      recorded_at: isoAtOffset(now, offset, 10, 0),
    });

    vitals.push({
      id: `p2-steps-${offset}`,
      patient_id: "p2",
      type: "steps",
      value_a: 4200 + offset * 40,
      value_b: null,
      source: "wearable",
      recorded_at: isoAtOffset(now, offset, 21, 0),
    });

    // Suresh P (p3)
    medLogs.push({
      id: `p3-m5-${offset}`,
      patient_id: "p3",
      medicine_id: "m5",
      medicine_name: "Metformin",
      dose: "500mg",
      scheduled_at: isoAtOffset(now, offset, 8, 30),
      taken_at: isoAtOffset(now, offset, 8, 45),
      status: "taken",
    });

    vitals.push({
      id: `p3-bp-${offset}`,
      patient_id: "p3",
      type: "bp",
      value_a: 120 + (offset % 3),
      value_b: 78 + (offset % 2),
      source: "manual",
      recorded_at: isoAtOffset(now, offset, 9, 0),
    });

    vitals.push({
      id: `p3-steps-${offset}`,
      patient_id: "p3",
      type: "steps",
      value_a: 6800 + (offset % 6) * 150,
      value_b: null,
      source: "wearable",
      recorded_at: isoAtOffset(now, offset, 21, 0),
    });
  }

  // Today's baseline vitals for Ramesh K. (recent watch pulse)
  vitals.unshift(
    {
      id: "p1-today-spo2",
      patient_id: "p1",
      type: "spo2",
      value_a: 97,
      value_b: null,
      source: "wearable",
      device_id: "dev-fit-p1",
      recorded_at: new Date(now - 15 * 60 * 1000).toISOString(),
    },
    {
      id: "p1-today-hr",
      patient_id: "p1",
      type: "hr",
      value_a: 72,
      value_b: null,
      source: "wearable",
      device_id: "dev-fit-p1",
      recorded_at: new Date(now - 15 * 60 * 1000).toISOString(),
    },
    {
      id: "p1-today-cal",
      patient_id: "p1",
      type: "calories",
      value_a: 310,
      value_b: null,
      source: "wearable",
      device_id: "dev-fit-p1",
      recorded_at: new Date(now - 20 * 60 * 1000).toISOString(),
    },
    {
      id: "p1-today-steps",
      patient_id: "p1",
      type: "steps",
      value_a: 2840,
      value_b: null,
      source: "wearable",
      device_id: "dev-fit-p1",
      recorded_at: new Date(now - 20 * 60 * 1000).toISOString(),
    }
  );

  // Today's med logs for Ramesh K. (morning taken, evening pending for interactive demo)
  medLogs.unshift(
    {
      id: "p1-today-m1-pm",
      patient_id: "p1",
      medicine_id: "m1",
      medicine_name: "Metformin",
      dose: "500mg",
      scheduled_at: isoAtOffset(now, 0, 20, 0),
      taken_at: null,
      status: "pending",
    },
    {
      id: "p1-today-m2-am",
      patient_id: "p1",
      medicine_id: "m2",
      medicine_name: "Amlodipine",
      dose: "5mg",
      scheduled_at: isoAtOffset(now, 0, 8, 0),
      taken_at: isoAtOffset(now, 0, 8, 16),
      status: "taken",
    },
    {
      id: "p1-today-m1-am",
      patient_id: "p1",
      medicine_id: "m1",
      medicine_name: "Metformin",
      dose: "500mg",
      scheduled_at: isoAtOffset(now, 0, 8, 0),
      taken_at: isoAtOffset(now, 0, 8, 15),
      status: "taken",
    }
  );

  const diagnosisReports: DiagnosisReport[] = [
    {
      id: "diag-seed-1",
      patient_id: "p1",
      generated_at: new Date(now - 1 * dayMs).toISOString(),
      ai_summary:
        "14-day watch and home cuff telemetry shows mild upward blood pressure drift (140/88 mmHg) and reduced daily walking (~2,840 steps vs 5,400 baseline) following recent discharge. Blood oxygen (97% SpO2) and resting heart rate (72 bpm) remain stable.",
      risk_flags: [
        {
          type: "bp_trend",
          severity: "medium",
          value: "140/88 mmHg",
          normalRange: "<130/80 mmHg",
          message: "Systolic BP trending mildly upward post-discharge",
          readingId: "p1-bp-1",
        },
        {
          type: "steps_decline",
          severity: "medium",
          value: "2,840 steps",
          normalRange: ">=4,500 steps/day",
          message: "Daily walking below post-discharge activity goal",
          readingId: "p1-today-steps",
        },
      ],
      urgency: "soon",
      recommended_specialties: ["General Medicine", "Diabetology"],
      lifestyle_recommendations: [
        "Walk 4,500 steps/day in 2 short gentle strolls",
        "Burn ~350 active kcal/day without overexertion",
        "Eat low-oil, low-glycemic South Indian meals; limit white rice at dinner",
      ],
      symptom_input: null,
      reading_ids: ["p1-bp-1", "p1-today-steps", "p1-today-spo2", "p1-today-hr"],
      model_version: "ollama-llama3.2",
      reviewed_by_doctor: "Dr. Meera Rao",
      doctor_notes:
        "Continue Metformin 500mg twice daily and Amlodipine 5mg morning. Gradually increase walking to 4,500 steps/day.",
      reviewed_at: new Date(now - 20 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const prescriptions: Prescription[] = [
    {
      id: "rx-seed-1",
      patient_id: "p1",
      doctor_id: "d1",
      doctor_name: "Dr. Meera Rao",
      diagnosis_report_id: "diag-seed-1",
      issued_at: new Date(now - 1 * dayMs).toISOString(),
      follow_up_date: new Date(now + 14 * dayMs).toISOString().split("T")[0],
      status: "active",
      doctor_summary:
        "Post-discharge maintenance for Type 2 Diabetes & Hypertension: take Metformin twice daily after meals, Amlodipine each morning, walk 4,500 steps/day, and follow low-oil low-GI meals.",
      medicines: [
        {
          id: "rxm-1",
          prescription_id: "rx-seed-1",
          medicine_id: "m1",
          medicine_name: "Metformin",
          dosage: "500mg",
          frequency: "Twice daily",
          times: ["08:00", "20:00"],
          duration: "30 days",
          with_food: true,
          instructions: "Take after breakfast and dinner with water",
        },
        {
          id: "rxm-2",
          prescription_id: "rx-seed-1",
          medicine_id: "m2",
          medicine_name: "Amlodipine",
          dosage: "5mg",
          frequency: "Once morning",
          times: ["08:00"],
          duration: "30 days",
          with_food: true,
          instructions: "Take every morning after breakfast",
        },
      ],
      lifestyle_targets: [
        {
          id: "lt-1",
          prescription_id: "rx-seed-1",
          patient_id: "p1",
          category: "steps",
          description: "Walk 4,500 steps daily (morning & evening gentle strolls)",
          target_value: 4500,
          unit: "steps/day",
        },
        {
          id: "lt-2",
          prescription_id: "rx-seed-1",
          patient_id: "p1",
          category: "calories",
          description: "Maintain 350 active kcal daily energy burn",
          target_value: 350,
          unit: "kcal/day",
        },
        {
          id: "lt-3",
          prescription_id: "rx-seed-1",
          patient_id: "p1",
          category: "diet",
          description: "Low-oil, low-glycemic South Indian meals; limit white rice at dinner & avoid extra salt",
          target_value: null,
          unit: null,
        },
      ],
      watch_sync_payload: {
        synced_at: new Date(now - 12 * 60 * 1000).toISOString(),
        next_dose_summary: "Metformin 500mg · 8:00 PM (After food)",
        daily_step_target: 4500,
        daily_calorie_target: 350,
        active_alert_level: "watch",
        diet_rule_short: "Low-oil, low-GI meals; limit white rice at dinner",
      },
    },
  ];

  const alerts: Alert[] = [
    {
      id: "alt-doc-1",
      patient_id: "p1",
      level: "doctor_note",
      audience: "family",
      message: "Dr. Meera Rao updated digital prescription & lifestyle plan.",
      created_at: new Date(now - 30 * 60 * 1000).toISOString(),
      acknowledged_at: null,
    },
    {
      id: "alt-1",
      patient_id: "p1",
      level: "reminder",
      audience: "patient",
      message: "Time for evening Metformin (500mg) after dinner",
      created_at: new Date(now - 15 * 60 * 1000).toISOString(),
      acknowledged_at: null,
    },
    {
      id: "alt-2",
      patient_id: "p2",
      level: "reminder",
      audience: "patient",
      message: "Scheduled BP check reminder",
      created_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      acknowledged_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: "aud-1",
      patient_id: "p1",
      actor_type: "doctor",
      actor_id: "d1",
      actor: "Dr. Meera Rao",
      action: "VIEW_TELEMETRY",
      category: "vitals",
      created_at: new Date(now - 2 * dayMs).toISOString(),
    },
    {
      id: "aud-2",
      patient_id: "p1",
      actor_type: "doctor",
      actor_id: "d1",
      actor: "Dr. Meera Rao",
      action: "ISSUED_DIGITAL_PRESCRIPTION",
      category: "medicines",
      created_at: new Date(now - 1 * dayMs).toISOString(),
    },
    {
      id: "aud-3",
      patient_id: "p2",
      actor_type: "doctor",
      actor_id: "d1",
      actor: "Dr. Meera Rao",
      action: "VIEW_PROFILE",
      category: "all",
      created_at: new Date(now - 1 * dayMs).toISOString(),
    },
  ];

  const doctorNotes: DoctorNote[] = [
    {
      id: "dn-1",
      patient_id: "p1",
      doctor_id: "d1",
      note_text: "Walk 4,500 steps daily in gentle sessions. Check BP before breakfast and keep evening meals low-oil.",
      parsed_instructions: {
        reminders: [
          { medicine: "Metformin 500mg", time: "08:00 & 20:00", instruction: "Take after meals" },
          { medicine: "Amlodipine 5mg", time: "08:00", instruction: "Take after breakfast" },
        ],
        goals: [
          { category: "steps", target: "Walk 4,500 steps daily", by: "Today" },
          { category: "bp", target: "Check BP before breakfast", by: "Ongoing" },
        ],
        followUpDate: new Date(now + 14 * dayMs).toISOString().split("T")[0],
      },
      created_at: new Date(now - 1 * dayMs).toISOString(),
    },
  ];

  const patientGoals: PatientGoal[] = [
    {
      id: "g-1",
      patient_id: "p1",
      category: "steps",
      target: "Walk 4,500 steps daily (morning & evening gentle strolls)",
      by_date: "Today",
      source_note_id: "dn-1",
      completed_at: null,
      created_at: new Date(now - 1 * dayMs).toISOString(),
    },
    {
      id: "g-2",
      patient_id: "p1",
      category: "calories",
      target: "Maintain 350 active kcal daily energy burn",
      by_date: "Today",
      source_note_id: "dn-1",
      completed_at: null,
      created_at: new Date(now - 1 * dayMs).toISOString(),
    },
    {
      id: "g-3",
      patient_id: "p1",
      category: "diet",
      target: "Low-oil, low-glycemic South Indian meals; limit white rice at dinner",
      by_date: "Today",
      source_note_id: "dn-1",
      completed_at: null,
      created_at: new Date(now - 1 * dayMs).toISOString(),
    },
  ];

  const whatsappPrefs: Record<string, WhatsAppPreferences> = {
    p1: {
      patient_id: "p1",
      patient_phone: "+91 98450 11223",
      guardian_name: "Karan K.",
      guardian_phone: "+91 98450 12345",
      new_prescription_alerts: true,
      missed_medicine_reminders: true,
      critical_vital_alerts: true,
    },
    p2: {
      patient_id: "p2",
      patient_phone: "+91 98451 22334",
      guardian_name: "Priya S.",
      guardian_phone: "+91 98451 23456",
      new_prescription_alerts: true,
      missed_medicine_reminders: true,
      critical_vital_alerts: true,
    },
    p3: {
      patient_id: "p3",
      patient_phone: "+91 98452 33445",
      guardian_name: "Neha P.",
      guardian_phone: "+91 98452 34567",
      new_prescription_alerts: true,
      missed_medicine_reminders: true,
      critical_vital_alerts: true,
    },
  };

  const state: CareBridgeState = {
    patients,
    doctors,
    familyMembers,
    medicines,
    medLogs,
    vitals,
    riskScores: {},
    alerts,
    consents,
    auditLogs,
    briefs: [],
    doctorActions: [],
    missedDoseEscalations: {},
    doctorNotes,
    patientGoals,
    wearableDevices,
    symptomLogs: [],
    diagnosisReports,
    prescriptions,
    aiQaLogs: [],
    whatsappLogs: [
      {
        id: "wa-seed-1",
        patient_id: "p1",
        recipient_phone: "+91 98450 12345",
        recipient_role: "family",
        event_type: "prescription_issued",
        message: "CareBridge: Dr. Meera Rao updated Ramesh K.'s digital prescription and 4,500 steps/day plan.",
        status: "simulated_sent",
        provider_message_id: "sim-seed-1",
        created_at: new Date(now - 20 * 60 * 60 * 1000).toISOString(),
      },
    ],
    whatsappPrefs,
  };

  for (const patient of patients) {
    const snapshot = {
      patient,
      medLogs: medLogs.filter((m) => m.patient_id === patient.id),
      vitals: vitals.filter((v) => v.patient_id === patient.id),
    };
    const result = computeRisk(snapshot);
    state.riskScores[patient.id] = {
      score: result.score,
      band: result.band,
      reasons: result.reasons,
      computedAt: new Date(now).toISOString(),
    };
  }

  return state;
}

class CareBridgeStore {
  private state: CareBridgeState;

  constructor() {
    this.state = createInitialState();
  }

  public reset(): void {
    this.state = createInitialState();
  }

  public getState(): CareBridgeState {
    return this.state;
  }

  public recomputePatientRisk(patientId: string): {
    score: number;
    band: "green" | "yellow" | "red";
    reasons: RiskReason[];
    alertCreated?: Alert;
  } {
    const patient = this.state.patients.find((p) => p.id === patientId);
    if (!patient) throw new Error("Patient not found");

    const previousScore = this.state.riskScores[patientId];
    const previousBand = previousScore?.band || "green";

    const snapshot = {
      patient,
      medLogs: this.state.medLogs.filter((m) => m.patient_id === patientId),
      vitals: this.state.vitals.filter((v) => v.patient_id === patientId),
    };

    const result = computeRisk(snapshot);
    this.state.riskScores[patientId] = {
      score: result.score,
      band: result.band,
      reasons: result.reasons,
      computedAt: new Date().toISOString(),
    };

    let alertCreated: Alert | undefined;

    if (result.band === "red" && previousBand !== "red") {
      alertCreated = {
        id: `alt-red-${Date.now()}`,
        patient_id: patientId,
        level: "doctor",
        audience: "doctor",
        message: `High Risk Alert: ${patient.name} score elevated to ${result.score} (RED). ${result.reasons[0]?.text || ""}`,
        created_at: new Date().toISOString(),
        acknowledged_at: null,
      };
      this.state.alerts.unshift(alertCreated);
    } else if (result.band === "yellow" && previousBand === "green") {
      alertCreated = {
        id: `alt-yellow-${Date.now()}`,
        patient_id: patientId,
        level: "family",
        audience: "family",
        message: `Care Alert: ${patient.name} health telemetry shifted to Yellow band.`,
        created_at: new Date().toISOString(),
        acknowledged_at: null,
      };
      this.state.alerts.unshift(alertCreated);
    }

    return { ...result, alertCreated };
  }

  public getPatientsList(): PatientListItem[] {
    const list: PatientListItem[] = this.state.patients.map((patient) => {
      const risk = this.state.riskScores[patient.id] || { score: 10, band: "green", reasons: [] };
      const patientVitals = this.state.vitals
        .filter((v) => v.patient_id === patient.id)
        .sort(
          (a, b) =>
            new Date(b.recorded_at || b.recordedAt || 0).getTime() -
            new Date(a.recorded_at || a.recordedAt || 0).getTime()
        );
      const lastVital = patientVitals[0];

      return {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        score: risk.score,
        band: risk.band,
        topReason: risk.reasons[0]?.text || "Telemetry stable within normal limits",
        lastSeen:
          (lastVital ? lastVital.recorded_at || lastVital.recordedAt : patient.created_at) ||
          new Date().toISOString(),
        conditions: patient.conditions,
      };
    });

    return list.sort((a, b) => b.score - a.score);
  }

  public computeCompliancePct(patientId: string): number {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const logs = this.state.medLogs.filter((l) => {
      if (l.patient_id !== patientId) return false;
      const t = new Date(l.scheduled_at || l.scheduledAt || 0).getTime();
      return !isNaN(t) && now - t <= sevenDaysMs;
    });
    const actionable = logs.filter((l) => l.status === "taken" || l.status === "missed");
    if (actionable.length === 0) return 100;
    const taken = actionable.filter((l) => l.status === "taken").length;
    return Math.round((taken / actionable.length) * 100);
  }

  public getPatientDetail(
    patientId: string,
    actorType?: "doctor" | "patient" | "family"
  ): PatientDetail | null {
    const patient = this.state.patients.find((p) => p.id === patientId);
    if (!patient) return null;

    const patientConsents = this.state.consents.filter((c) => c.patient_id === patientId);
    const consentMap: Record<string, boolean> = {};
    for (const c of patientConsents) {
      consentMap[c.category] = c.granted;
    }

    let vitals = this.state.vitals.filter((v) => v.patient_id === patientId);
    let medLogs = this.state.medLogs.filter((m) => m.patient_id === patientId);

    if (actorType === "doctor") {
      this.state.auditLogs.unshift({
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patient_id: patientId,
        actor_type: "doctor",
        actor_id: "d1",
        actor: "Dr. Meera Rao",
        action: "VIEW_PATIENT_CHART",
        category: "all",
        created_at: new Date().toISOString(),
      });

      vitals = vitals.filter((v) => {
        if (v.type === "steps" && consentMap["steps"] === false) return false;
        if (
          (v.type === "bp" ||
            v.type === "hr" ||
            v.type === "spo2" ||
            v.type === "calories" ||
            v.type === "sleep") &&
          consentMap["vitals"] === false
        ) {
          return false;
        }
        if (v.type === "glucose" && consentMap["glucose"] === false) return false;
        return true;
      });

      if (consentMap["medicines"] === false) {
        medLogs = [];
      }
    }

    const medicines = this.state.medicines.filter((m) => m.patient_id === patientId);
    const risk = this.state.riskScores[patientId] || { score: 10, band: "green", reasons: [] };
    const alerts = this.state.alerts.filter((a) => a.patient_id === patientId);
    const activePrescriptions = this.getPrescriptions(patientId).filter((rx) => rx.status === "active");
    const reports = this.getDiagnosisReports(patientId);
    const recentSymptoms = this.getSymptomLogs(patientId).slice(0, 5);
    const devices = this.getWearableDevices(patientId);

    return {
      profile: patient,
      medicines,
      vitals,
      medLogs,
      risk: {
        score: risk.score,
        band: risk.band,
        reasons: risk.reasons,
      },
      alerts,
      consents: patientConsents,
      activePrescriptions,
      latestDiagnosis: reports[0] || null,
      recentSymptoms,
      wearableDevice: devices.find((d) => d.is_active) || devices[0] || null,
      medCompliancePct: this.computeCompliancePct(patientId),
    };
  }

  public getVitalsFiltered(
    patientId: string,
    filters: { type?: string | null; from?: string | null; to?: string | null }
  ) {
    const typeFilter = filters.type && filters.type !== "all" ? filters.type : null;
    const fromMs = filters.from ? new Date(filters.from).getTime() : null;
    const toMs = filters.to ? new Date(filters.to).getTime() : null;

    const list = this.state.vitals
      .filter((v) => {
        if (v.patient_id !== patientId) return false;
        if (typeFilter && v.type !== typeFilter) return false;
        const ts = new Date(v.recorded_at || v.recordedAt || 0).getTime();
        if (fromMs !== null && !isNaN(fromMs) && ts < fromMs) return false;
        if (toMs !== null && !isNaN(toMs) && ts > toMs) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.recorded_at || b.recordedAt || 0).getTime() -
          new Date(a.recorded_at || a.recordedAt || 0).getTime()
      );

    const nums = list.map((v) => Number(v.value_a ?? v.valueA ?? 0)).filter((n) => !isNaN(n));
    const count = nums.length;
    const latest = count > 0 ? nums[0] : null;
    const avg = count > 0 ? Number((nums.reduce((a, b) => a + b, 0) / count).toFixed(1)) : null;
    const min = count > 0 ? Math.min(...nums) : null;
    const max = count > 0 ? Math.max(...nums) : null;

    let trend: "rising" | "falling" | "stable" = "stable";
    if (nums.length >= 4) {
      const half = Math.floor(nums.length / 2);
      const recentAvg = nums.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const olderAvg = nums.slice(half).reduce((a, b) => a + b, 0) / (nums.length - half);
      if (olderAvg > 0) {
        if (recentAvg > olderAvg * 1.05) trend = "rising";
        else if (recentAvg < olderAvg * 0.95) trend = "falling";
      }
    }

    return {
      vitals: list,
      summary: { count, latest, avg, min, max, trend },
    };
  }

  public logMedicine(
    patientId: string,
    medicineId: string,
    status: "taken" | "missed"
  ): { log: MedLog; risk: ReturnType<CareBridgeStore["recomputePatientRisk"]>; compliancePct: number } {
    const med =
      this.state.medicines.find((m) => m.id === medicineId && m.patient_id === patientId) ||
      this.state.medicines.find((m) => m.id === medicineId);
    const nowIso = new Date().toISOString();

    const newLog: MedLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      patient_id: patientId,
      medicine_id: medicineId,
      medicine_name: med?.name || "Medication",
      dose: med?.dose || "",
      scheduled_at: nowIso,
      taken_at: status === "taken" ? nowIso : null,
      status,
    };

    const pendingIdx = this.state.medLogs.findIndex(
      (m) => m.patient_id === patientId && m.medicine_id === medicineId && m.status === "pending"
    );
    if (pendingIdx >= 0) {
      newLog.scheduled_at = this.state.medLogs[pendingIdx].scheduled_at || nowIso;
      this.state.medLogs[pendingIdx] = newLog;
    } else {
      this.state.medLogs.unshift(newLog);
    }

    if (status === "missed") {
      this.state.missedDoseEscalations[newLog.id] = {
        logId: newLog.id,
        patientId,
        detectedAt: Date.now(),
        firedStages: new Set<"reminder" | "family" | "doctor">(),
      };
    } else if (status === "taken") {
      // Clear pending missed-dose escalations for this patient when dose confirmed
      for (const [key, esc] of Object.entries(this.state.missedDoseEscalations)) {
        if (esc.patientId === patientId) {
          delete this.state.missedDoseEscalations[key];
        }
      }
    }

    const risk = this.recomputePatientRisk(patientId);
    const compliancePct = this.computeCompliancePct(patientId);

    // Refresh watch sync payload if prescription active
    this.refreshActiveWatchPayload(patientId, risk.band);

    return { log: newLog, risk, compliancePct };
  }

  public logVital(
    patientId: string,
    type: VitalType,
    valueA: number,
    valueB: number | null = null,
    recordedAt?: string,
    source: Vital["source"] = "manual",
    deviceId: string | null = null
  ): { vital: Vital; risk: ReturnType<CareBridgeStore["recomputePatientRisk"]> } {
    const newVital: Vital = {
      id: `vital-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      patient_id: patientId,
      type,
      value_a: valueA,
      value_b: valueB,
      source,
      device_id: deviceId,
      recorded_at: recordedAt || new Date().toISOString(),
    };

    this.state.vitals.unshift(newVital);
    const risk = this.recomputePatientRisk(patientId);
    this.refreshActiveWatchPayload(patientId, risk.band);

    return { vital: newVital, risk };
  }

  public ingestVitalsBatch(
    patientId: string,
    readings: Array<{ type: VitalType; valueA: number; valueB?: number | null; recordedAt?: string }>,
    deviceId?: string | null,
    provider?: string
  ): { inserted: number; skipped: number; vitalsInserted: Vital[] } {
    let inserted = 0;
    let skipped = 0;
    const vitalsInserted: Vital[] = [];

    for (const r of readings) {
      const recAt = r.recordedAt || new Date().toISOString();
      const recMs = new Date(recAt).getTime();

      const duplicate = this.state.vitals.some((existing) => {
        if (existing.patient_id !== patientId || existing.type !== r.type) return false;
        const exMs = new Date(existing.recorded_at || existing.recordedAt || 0).getTime();
        return Math.abs(exMs - recMs) < 1000 && Number(existing.value_a ?? existing.valueA) === r.valueA;
      });

      if (duplicate) {
        skipped++;
        continue;
      }

      const v: Vital = {
        id: `vital-ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patient_id: patientId,
        type: r.type,
        value_a: r.valueA,
        value_b: r.valueB ?? null,
        source: provider === "simulator" ? "simulator" : "wearable",
        device_id: deviceId ?? null,
        recorded_at: recAt,
      };
      this.state.vitals.unshift(v);
      vitalsInserted.push(v);
      inserted++;
    }

    if (deviceId) {
      const dev = this.state.wearableDevices.find((d) => d.id === deviceId);
      if (dev) dev.last_synced_at = new Date().toISOString();
    } else {
      const activeDev = this.state.wearableDevices.find((d) => d.patient_id === patientId && d.is_active);
      if (activeDev) activeDev.last_synced_at = new Date().toISOString();
    }

    return { inserted, skipped, vitalsInserted };
  }

  private refreshActiveWatchPayload(patientId: string, band: "green" | "yellow" | "red") {
    const activeRx = this.state.prescriptions.find(
      (rx) => rx.patient_id === patientId && rx.status === "active"
    );
    if (!activeRx) return;

    const pendingLogs = this.state.medLogs.filter(
      (l) => l.patient_id === patientId && l.status === "pending"
    );
    const nextMed = pendingLogs[0]
      ? `${pendingLogs[0].medicine_name || "Medicine"} ${pendingLogs[0].dose || ""}`.trim()
      : activeRx.medicines[0]
      ? `${activeRx.medicines[0].medicine_name} ${activeRx.medicines[0].dosage}`
      : "All doses done";

    const stepTarget =
      activeRx.lifestyle_targets.find((t) => t.category === "steps")?.target_value || 4500;
    const calorieTarget =
      activeRx.lifestyle_targets.find((t) => t.category === "calories")?.target_value || 350;
    const dietRule =
      activeRx.lifestyle_targets.find((t) => t.category === "diet")?.description ||
      "Balanced low-oil, low-GI meals";

    activeRx.watch_sync_payload = {
      synced_at: new Date().toISOString(),
      next_dose_summary: pendingLogs[0] ? `${nextMed} · Due today` : `${nextMed} · Up to date`,
      daily_step_target: Number(stepTarget),
      daily_calorie_target: Number(calorieTarget),
      active_alert_level: band === "red" ? "urgent" : band === "yellow" ? "watch" : "normal",
      diet_rule_short: dietRule.slice(0, 72),
    };
  }

  public updateConsent(patientId: string, category: Consent["category"], granted: boolean): Consent {
    let consent = this.state.consents.find((c) => c.patient_id === patientId && c.category === category);
    if (consent) {
      consent.granted = granted;
      consent.updated_at = new Date().toISOString();
    } else {
      consent = {
        id: `c-${Date.now()}`,
        patient_id: patientId,
        category,
        granted,
        updated_at: new Date().toISOString(),
      };
      this.state.consents.push(consent);
    }
    return consent;
  }

  public getConsents(patientId: string): Consent[] {
    return this.state.consents.filter((c) => c.patient_id === patientId);
  }

  public getAuditLog(patientId: string): AuditLog[] {
    return this.state.auditLogs.filter((a) => a.patient_id === patientId);
  }

  public appendAuditLog(entry: Omit<AuditLog, "id" | "created_at"> & { id?: string; created_at?: string }): AuditLog {
    const full: AuditLog = {
      id: entry.id || `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      created_at: entry.created_at || new Date().toISOString(),
      ...entry,
    };
    this.state.auditLogs.unshift(full);
    return full;
  }

  public addDiagnosisReport(report: DiagnosisReport): DiagnosisReport {
    this.state.diagnosisReports.unshift(report);
    return report;
  }

  public getDiagnosisReports(patientId: string): DiagnosisReport[] {
    return this.state.diagnosisReports
      .filter((r) => r.patient_id === patientId)
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  }

  public updateDiagnosisReport(
    patientId: string,
    reportId: string,
    patch: { doctorNotes?: string; verify?: boolean; doctorId?: string }
  ): DiagnosisReport | null {
    const report = this.state.diagnosisReports.find(
      (r) => r.id === reportId && r.patient_id === patientId
    );
    if (!report) return null;

    if (typeof patch.doctorNotes === "string") {
      report.doctor_notes = patch.doctorNotes;
    }
    if (patch.verify) {
      const doc = this.state.doctors.find((d) => d.id === (patch.doctorId || "d1"));
      report.reviewed_by_doctor = doc?.name || "Dr. Meera Rao";
      report.reviewed_at = new Date().toISOString();
    }

    return report;
  }

  public createPrescription(input: CreatePrescriptionInput): {
    prescription: Prescription;
    generatedGoalsCount: number;
    watchSyncPayload: WatchSyncPayload;
  } {
    const rxId = `rx-${Date.now()}`;
    const doctorId = input.doctorId || "d1";
    const doctor = this.state.doctors.find((d) => d.id === doctorId);
    const issuedAt = new Date().toISOString();

    const prescribedMeds: PrescribedMedicine[] = input.medicines.map((m, idx) => {
      const existingMed = this.state.medicines.find(
        (em) =>
          em.patient_id === input.patientId &&
          em.name.toLowerCase() === m.medicineName.toLowerCase()
      );
      const medId = existingMed?.id || `med-${Date.now()}-${idx}`;

      if (!existingMed) {
        this.state.medicines.push({
          id: medId,
          patient_id: input.patientId,
          name: m.medicineName,
          dose: m.dosage,
          times: m.times.length > 0 ? m.times : ["08:00"],
          instructions: m.instructions || (m.withFood ? "Take after food" : "Take before food"),
        });
      } else {
        existingMed.dose = m.dosage;
        existingMed.times = m.times.length > 0 ? m.times : existingMed.times;
        existingMed.instructions =
          m.instructions || (m.withFood ? "Take after food" : "Take before food");
      }

      // Ensure at least one pending today log exists for this medicine if not already taken/pending
      const hasTodayLog = this.state.medLogs.some(
        (l) =>
          l.patient_id === input.patientId &&
          l.medicine_id === medId &&
          l.status === "pending"
      );
      if (!hasTodayLog) {
        this.state.medLogs.unshift({
          id: `log-rx-${Date.now()}-${idx}`,
          patient_id: input.patientId,
          medicine_id: medId,
          medicine_name: m.medicineName,
          dose: m.dosage,
          scheduled_at: issuedAt,
          taken_at: null,
          status: "pending",
        });
      }

      return {
        id: `rxm-${Date.now()}-${idx}`,
        prescription_id: rxId,
        medicine_id: medId,
        medicine_name: m.medicineName,
        dosage: m.dosage,
        frequency: m.frequency,
        times: m.times,
        duration: m.duration,
        with_food: m.withFood,
        instructions: m.instructions || null,
      };
    });

    const targets: LifestyleTarget[] = input.lifestyleTargets.map((t, idx) => ({
      id: `lt-${Date.now()}-${idx}`,
      prescription_id: rxId,
      patient_id: input.patientId,
      category: t.category,
      description: t.description,
      target_value: t.targetValue ?? null,
      unit: t.unit ?? null,
    }));

    // Create interactive patient_goals from lifestyle targets
    for (const target of targets) {
      const goalCategory: PatientGoal["category"] =
        target.category === "steps" ||
        target.category === "bp" ||
        target.category === "glucose" ||
        target.category === "diet" ||
        target.category === "calories" ||
        target.category === "sleep"
          ? target.category
          : "other";

      this.state.patientGoals.unshift({
        id: `pg-rx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patient_id: input.patientId,
        category: goalCategory,
        target: target.description,
        by_date: "Today",
        source_note_id: null,
        completed_at: null,
        created_at: issuedAt,
      });
    }

    const riskBand = this.state.riskScores[input.patientId]?.band || "yellow";
    const stepTarget = targets.find((t) => t.category === "steps")?.target_value || 4500;
    const calorieTarget = targets.find((t) => t.category === "calories")?.target_value || 350;
    const dietTarget =
      targets.find((t) => t.category === "diet")?.description || "Follow balanced low-GI meals";
    const firstMed = prescribedMeds[0];

    const watchSyncPayload: WatchSyncPayload = {
      synced_at: issuedAt,
      next_dose_summary: firstMed
        ? `${firstMed.medicine_name} ${firstMed.dosage} · ${firstMed.times[0] || "08:00"} (${
            firstMed.with_food ? "After food" : "Before food"
          })`
        : "No pending medicines",
      daily_step_target: Number(stepTarget),
      daily_calorie_target: Number(calorieTarget),
      active_alert_level: riskBand === "red" ? "urgent" : riskBand === "yellow" ? "watch" : "normal",
      diet_rule_short: dietTarget.slice(0, 72),
    };

    const rx: Prescription = {
      id: rxId,
      patient_id: input.patientId,
      doctor_id: doctorId,
      doctor_name: doctor?.name || "Dr. Meera Rao",
      diagnosis_report_id: input.diagnosisReportId || null,
      issued_at: issuedAt,
      follow_up_date: input.followUpDate || null,
      status: "active",
      doctor_summary: input.doctorSummary,
      medicines: prescribedMeds,
      lifestyle_targets: targets,
      watch_sync_payload: watchSyncPayload,
    };

    this.state.prescriptions.unshift(rx);

    // Emit alerts to patient and family
    this.state.alerts.unshift(
      {
        id: `alt-rx-pat-${Date.now()}`,
        patient_id: input.patientId,
        level: "doctor_note",
        audience: "patient",
        message: `${doctor?.name || "Dr. Meera Rao"} issued your updated digital prescription.`,
        created_at: issuedAt,
        acknowledged_at: null,
      },
      {
        id: `alt-rx-fam-${Date.now() + 1}`,
        patient_id: input.patientId,
        level: "doctor_note",
        audience: "family",
        message: `${doctor?.name || "Dr. Meera Rao"} issued a new digital prescription & lifestyle plan.`,
        created_at: issuedAt,
        acknowledged_at: null,
      }
    );

    this.appendAuditLog({
      patient_id: input.patientId,
      actor_type: "doctor",
      actor_id: doctorId,
      actor: doctor?.name || "Dr. Meera Rao",
      action: "ISSUED_DIGITAL_PRESCRIPTION",
      category: "medicines",
    });

    return {
      prescription: rx,
      generatedGoalsCount: targets.length,
      watchSyncPayload,
    };
  }

  public getPrescriptions(patientId: string): Prescription[] {
    return this.state.prescriptions
      .filter((rx) => rx.patient_id === patientId)
      .sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (a.status !== "active" && b.status === "active") return 1;
        return new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime();
      });
  }

  public updatePrescription(
    patientId: string,
    rxId: string,
    patch: { status?: Prescription["status"]; doctorSummary?: string }
  ): Prescription | null {
    const rx = this.state.prescriptions.find((r) => r.id === rxId && r.patient_id === patientId);
    if (!rx) return null;
    if (patch.status) rx.status = patch.status;
    if (patch.doctorSummary) rx.doctor_summary = patch.doctorSummary;
    return rx;
  }

  public addSymptomLog(log: SymptomLog): SymptomLog {
    this.state.symptomLogs.unshift(log);
    return log;
  }

  public getSymptomLogs(patientId: string): SymptomLog[] {
    return this.state.symptomLogs
      .filter((s) => s.patient_id === patientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addAiQaLog(entry: AiQaLogEntry): AiQaLogEntry {
    this.state.aiQaLogs.unshift(entry);
    return entry;
  }

  public getAiQaLogs(patientId: string): AiQaLogEntry[] {
    return this.state.aiQaLogs.filter((l) => l.patient_id === patientId);
  }

  public addWhatsAppLog(entry: WhatsAppNotificationLog): WhatsAppNotificationLog {
    this.state.whatsappLogs.unshift(entry);
    return entry;
  }

  public getWhatsAppLogs(patientId: string): WhatsAppNotificationLog[] {
    return this.state.whatsappLogs
      .filter((w) => w.patient_id === patientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getWhatsAppPrefs(patientId: string): WhatsAppPreferences {
    if (this.state.whatsappPrefs[patientId]) {
      return this.state.whatsappPrefs[patientId];
    }
    const patient = this.state.patients.find((p) => p.id === patientId);
    const guardian = this.state.familyMembers.find((f) => f.patient_id === patientId);
    const created: WhatsAppPreferences = {
      patient_id: patientId,
      patient_phone: patient?.whatsapp_number || "+91 98450 11223",
      guardian_name: guardian?.name || "Karan K.",
      guardian_phone: guardian?.phone || "+91 98450 12345",
      new_prescription_alerts: true,
      missed_medicine_reminders: true,
      critical_vital_alerts: true,
    };
    this.state.whatsappPrefs[patientId] = created;
    return created;
  }

  public updateWhatsAppPrefs(
    patientId: string,
    patch: Partial<WhatsAppPreferences>
  ): WhatsAppPreferences {
    const current = this.getWhatsAppPrefs(patientId);
    const next = { ...current, ...patch, patient_id: patientId };
    this.state.whatsappPrefs[patientId] = next;
    return next;
  }

  public saveWearableDevice(device: WearableDevice): WearableDevice {
    const idx = this.state.wearableDevices.findIndex(
      (d) => d.id === device.id || (d.patient_id === device.patient_id && d.provider === device.provider)
    );
    if (idx >= 0) {
      this.state.wearableDevices[idx] = { ...this.state.wearableDevices[idx], ...device };
      return this.state.wearableDevices[idx];
    }
    this.state.wearableDevices.unshift(device);
    return device;
  }

  public getWearableDevices(patientId: string): WearableDevice[] {
    return this.state.wearableDevices.filter((d) => d.patient_id === patientId);
  }

  public getFamilyFeed(patientId: string): FamilyFeedResponse | null {
    const patient = this.state.patients.find((p) => p.id === patientId);
    if (!patient) return null;

    const risk = this.state.riskScores[patientId] || { score: 10, band: "green" };
    const patientVitals = this.state.vitals
      .filter((v) => v.patient_id === patientId)
      .sort(
        (a, b) =>
          new Date(b.recorded_at || b.recordedAt || 0).getTime() -
          new Date(a.recorded_at || a.recordedAt || 0).getTime()
      );

    const latestSteps = patientVitals.find((v) => v.type === "steps")?.value_a ?? 2840;
    const latestBp = patientVitals.find((v) => v.type === "bp");
    const latestSpo2 = patientVitals.find((v) => v.type === "spo2")?.value_a ?? null;
    const latestHr = patientVitals.find((v) => v.type === "hr")?.value_a ?? null;
    const latestCalories = patientVitals.find((v) => v.type === "calories")?.value_a ?? 0;

    const todayDateStr = new Date().toDateString();
    const patientLogs = this.state.medLogs.filter((m) => m.patient_id === patientId);
    const todayLogs = patientLogs.filter((m) => {
      const raw = m.scheduled_at || m.scheduledAt;
      if (!raw) return false;
      const d = new Date(raw);
      return !isNaN(d.getTime()) && d.toDateString() === todayDateStr;
    });
    const medPool = todayLogs.length > 0 ? todayLogs : patientLogs.slice(0, 3);
    const takenToday = medPool.filter((m) => m.status === "taken").length;
    const totalToday = Math.max(medPool.length, 1);

    const alerts = [
      ...this.state.alerts.filter((a) => a.patient_id === patientId || a.patientId === patientId),
    ];

    const latestNote = this.state.doctorNotes.find(
      (n) => n.patient_id === patientId || (n as DoctorNote & { patientId?: string }).patientId === patientId
    );
    if (latestNote && !alerts.some((a) => a.level === "doctor_note")) {
      alerts.unshift({
        id: `feed-doc-${latestNote.id}`,
        patient_id: patientId,
        level: "doctor_note",
        audience: "family",
        message: "Dr. Meera Rao has updated the care plan.",
        created_at: latestNote.created_at,
        acknowledged_at: null,
      });
    }

    const activePrescriptions = this.getPrescriptions(patientId).filter((r) => r.status === "active");
    const latestDiagnosis = this.getDiagnosisReports(patientId)[0] || null;
    const goals = this.state.patientGoals.filter((g) => g.patient_id === patientId);
    const goalsCompleted = goals.filter((g) => Boolean(g.completed_at)).length;
    const activeRx = activePrescriptions[0];
    const stepsTarget =
      activeRx?.lifestyle_targets.find((t) => t.category === "steps")?.target_value || 4500;
    const caloriesTarget =
      activeRx?.lifestyle_targets.find((t) => t.category === "calories")?.target_value || 350;

    return {
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        conditions: patient.conditions,
        band: risk.band,
        score: risk.score,
        lastSeen: patientVitals[0]?.recorded_at || new Date().toISOString(),
      },
      today: {
        steps: Number(latestSteps),
        medicinesTaken: takenToday,
        medicinesTotal: totalToday,
        latestBp: latestBp ? `${latestBp.value_a}/${latestBp.value_b} mmHg` : undefined,
        statusBand: risk.band,
        adherencePct: Math.round((takenToday / totalToday) * 100),
        latestSteps: Number(latestSteps),
      },
      alerts,
      latestDiagnosis,
      activePrescriptions,
      lifestyleProgress: {
        stepsCurrent: Number(latestSteps),
        stepsTarget: Number(stepsTarget),
        caloriesCurrent: Number(latestCalories),
        caloriesTarget: Number(caloriesTarget),
        goalsCompleted,
        goalsTotal: goals.length,
      },
      wearableSummary: {
        spo2: latestSpo2 !== null ? Number(latestSpo2) : null,
        hr: latestHr !== null ? Number(latestHr) : null,
        bp: latestBp ? `${latestBp.value_a}/${latestBp.value_b}` : null,
        steps: Number(latestSteps),
        calories: Number(latestCalories),
      },
    };
  }

  public handleSimEvent(req: SimEventRequest): SimEventResponse {
    const { patientId, kind, params } = req;
    const patient = this.state.patients.find((p) => p.id === patientId);
    if (!patient) throw new Error("Patient not found");

    let alertMessage = "";

    if (kind === "miss_dose") {
      const medId = params?.medicineId || "m1";
      this.logMedicine(patientId, medId, "missed");
      alertMessage = `Simulation: Missed dose injected for ${patient.name}`;
    } else if (kind === "bp_spike") {
      const systolic = params?.systolic || 156;
      const diastolic = params?.diastolic || 98;
      this.logVital(patientId, "bp", systolic, diastolic, undefined, "simulator");
      alertMessage = `Simulation: BP Spike ${systolic}/${diastolic} mmHg injected for ${patient.name}`;
    } else if (kind === "steps_drop") {
      const steps = params?.steps || 1400;
      this.logVital(patientId, "steps", steps, null, undefined, "simulator");
      alertMessage = `Simulation: Activity drop to ${steps} steps injected for ${patient.name}`;
    } else if (kind === "spo2_drop") {
      const spo2 = params?.spo2 || 88;
      this.logVital(patientId, "spo2", spo2, null, undefined, "simulator");
      this.state.alerts.unshift({
        id: `alt-spo2-${Date.now()}`,
        patient_id: patientId,
        level: "wearable_anomaly",
        audience: "doctor",
        message: `CRITICAL SpO2 Drop: ${patient.name} blood oxygen dropped to ${spo2}% on smartwatch.`,
        created_at: new Date().toISOString(),
        acknowledged_at: null,
      });
      alertMessage = `Simulation: Critical SpO2 drop (${spo2}%) injected for ${patient.name}`;
    } else if (kind === "recover") {
      this.logMedicine(patientId, "m1", "taken");
      this.logVital(patientId, "bp", 124, 80, undefined, "simulator");
      this.logVital(patientId, "steps", 5500, null, undefined, "simulator");
      this.logVital(patientId, "spo2", 98, null, undefined, "simulator");
      this.logVital(patientId, "hr", 72, null, undefined, "simulator");
      alertMessage = `Simulation: Recovery baseline restored for ${patient.name}`;
    } else if (kind === "hr_spike") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const t2am = new Date(yesterday);
      t2am.setHours(2, 0, 0, 0);
      const t3am = new Date(yesterday);
      t3am.setHours(3, 0, 0, 0);
      const t4am = new Date(yesterday);
      t4am.setHours(4, 0, 0, 0);

      this.logVital(patientId, "hr", 109, null, t2am.toISOString(), "simulator");
      this.logVital(patientId, "hr", 114, null, t3am.toISOString(), "simulator");
      this.logVital(patientId, "hr", 112, null, t4am.toISOString(), "simulator");
      alertMessage = `Simulation: Nocturnal HR spike (109–114 bpm) injected for ${patient.name}`;
    }

    const newRisk = this.recomputePatientRisk(patientId);

    return {
      success: true,
      message: alertMessage,
      newRisk: {
        score: newRisk.score,
        band: newRisk.band,
        reasons: newRisk.reasons,
      },
      alertCreated: newRisk.alertCreated,
    };
  }

  public processEscalationTick(forceStage?: "reminder" | "family" | "doctor"): Alert[] {
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
    const deltaFamilyMs = isDemoMode ? 10 * 1000 : 30 * 60 * 1000;
    const deltaDoctorMs = isDemoMode ? 25 * 1000 : 2 * 60 * 60 * 1000;

    const fired: Alert[] = [];
    const now = Date.now();

    for (const esc of Object.values(this.state.missedDoseEscalations)) {
      const patient = this.state.patients.find((p) => p.id === esc.patientId);
      if (!patient) continue;

      const elapsed = now - esc.detectedAt;

      if (!esc.firedStages.has("reminder") || forceStage === "reminder") {
        const reminderAlert: Alert = {
          id: `alt-esc-rem-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          patient_id: esc.patientId,
          level: "reminder",
          audience: "patient",
          message: `Dose reminder: Please confirm your scheduled medication.`,
          created_at: new Date().toISOString(),
          acknowledged_at: null,
        };
        esc.firedStages.add("reminder");
        this.state.alerts.unshift(reminderAlert);
        fired.push(reminderAlert);
      }

      if ((elapsed >= deltaFamilyMs || forceStage === "family") && !esc.firedStages.has("family")) {
        const familyAlert: Alert = {
          id: `alt-esc-fam-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          patient_id: esc.patientId,
          level: "family",
          audience: "family",
          message: `Family Ping: ${patient.name} has not confirmed medication. Please check in with them.`,
          created_at: new Date().toISOString(),
          acknowledged_at: null,
        };
        esc.firedStages.add("family");
        this.state.alerts.unshift(familyAlert);
        fired.push(familyAlert);
      }

      if ((elapsed >= deltaDoctorMs || forceStage === "doctor") && !esc.firedStages.has("doctor")) {
        const doctorAlert: Alert = {
          id: `alt-esc-doc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          patient_id: esc.patientId,
          level: "doctor",
          audience: "doctor",
          message: `Urgent Escalation: ${patient.name} has missed medication despite reminders. Doctor attention requested.`,
          created_at: new Date().toISOString(),
          acknowledged_at: null,
        };
        esc.firedStages.add("doctor");
        this.state.alerts.unshift(doctorAlert);
        fired.push(doctorAlert);
        this.recomputePatientRisk(esc.patientId);
      }
    }

    return fired;
  }

  public recordDoctorAction(
    patientId: string,
    type: "call" | "message" | "teleconsult",
    note?: string
  ): DoctorActionResponse {
    const patient = this.state.patients.find((p) => p.id === patientId);
    const actionId = `act-${Date.now()}`;
    const timestamp = new Date().toISOString();

    this.state.doctorActions.unshift({
      id: actionId,
      patientId,
      type,
      note,
      timestamp,
    });

    this.appendAuditLog({
      patient_id: patientId,
      actor_type: "doctor",
      actor_id: "d1",
      actor: "Dr. Meera Rao",
      action: `DOCTOR_ACTION_${type.toUpperCase()}`,
      category: "communication",
      created_at: timestamp,
    });

    const alertMessage =
      type === "call"
        ? "Dr. Meera Rao placed a check-in call."
        : type === "message"
        ? `Message from Dr. Meera Rao: ${note || "Please verify your medication regimen."}`
        : "Teleconsultation booked with Dr. Meera Rao.";

    this.state.alerts.unshift({
      id: `alt-action-${Date.now()}`,
      patient_id: patientId,
      level: "reminder",
      audience: "patient",
      message: alertMessage,
      created_at: timestamp,
      acknowledged_at: null,
    });

    return {
      success: true,
      message: `Action '${type}' registered successfully for ${patient?.name || "patient"}.`,
      actionRecord: {
        id: actionId,
        patientId,
        type,
        timestamp,
      },
    };
  }

  public getAdminROI(): AdminROIResponse {
    const patientsMonitored = this.state.patients.length;
    const alertsActioned =
      this.state.doctorActions.length +
      this.state.alerts.filter((a) => a.acknowledged_at).length +
      14;

    const readmissionsPrevented = Math.round(alertsActioned * 0.18 + 3);
    const doctorHoursSaved = Math.round(alertsActioned * 1.5 + 8);

    const assumptions = [
      "18% of early risk interventions prevent acute hospital readmission (Apollo & NH post-op studies).",
      "Each prevented emergency readmission saves ~1.5 hours of emergency doctor triage time.",
      "Real-time patient telemetry reduces routine consult duration from 12 mins to 6 mins.",
    ];

    const alertsPerDay = [
      { date: "Day -6", count: 2 },
      { date: "Day -5", count: 3 },
      { date: "Day -4", count: 4 },
      { date: "Day -3", count: 6 },
      { date: "Day -2", count: 5 },
      { date: "Day -1", count: 8 },
      { date: "Today", count: alertsActioned },
    ];

    return {
      readmissionsPrevented,
      doctorHoursSaved,
      alertsActioned,
      patientsMonitored,
      assumptions,
      alertsPerDay,
    };
  }

  public addDoctorNote(
    patientId: string,
    doctorId: string,
    noteText: string,
    parsedInstructions: DoctorNote["parsed_instructions"]
  ): DoctorNote {
    const note: DoctorNote = {
      id: `dn-${Date.now()}`,
      patient_id: patientId,
      doctor_id: doctorId,
      note_text: noteText,
      parsed_instructions: parsedInstructions,
      created_at: new Date().toISOString(),
    };
    this.state.doctorNotes.unshift(note);

    if (parsedInstructions?.goals && Array.isArray(parsedInstructions.goals)) {
      for (const g of parsedInstructions.goals) {
        this.state.patientGoals.unshift({
          id: `pg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          patient_id: patientId,
          category: g.category || "other",
          target: g.target || "Health target",
          by_date: g.by || null,
          source_note_id: note.id,
          completed_at: null,
          created_at: new Date().toISOString(),
        });
      }
    }

    this.state.alerts.unshift({
      id: `alt-plan-${Date.now()}`,
      patient_id: patientId,
      level: "doctor_note",
      audience: "family",
      message: "Dr. Meera Rao has updated the care plan.",
      created_at: new Date().toISOString(),
      acknowledged_at: null,
    });

    return note;
  }

  public getPatientGoals(patientId: string): { goals: PatientGoal[]; latestNote: DoctorNote | null } {
    const goals = (this.state.patientGoals || [])
      .filter((g) => g.patient_id === patientId)
      .sort((a, b) => {
        if (!a.completed_at && b.completed_at) return -1;
        if (a.completed_at && !b.completed_at) return 1;
        return (a.by_date || "").localeCompare(b.by_date || "");
      });
    const latestNote =
      (this.state.doctorNotes || []).find((n) => n.patient_id === patientId) || null;
    return { goals, latestNote };
  }

  public completePatientGoal(patientId: string, goalId: string): { completedAt: string } | null {
    const goal = (this.state.patientGoals || []).find(
      (g) => g.id === goalId && g.patient_id === patientId
    );
    if (!goal) return null;
    const completedAt = new Date().toISOString();
    goal.completed_at = completedAt;
    return { completedAt };
  }

  public getAIAuditLogs() {
    return this.state.briefs.map((b) => {
      const patient = this.state.patients.find((p) => p.id === b.patient_id);
      const briefWithCitations = b as Brief & {
        citations?: Array<{ readingId: string; value: string; at: string }>;
      };
      const citations = Array.isArray(briefWithCitations.citations)
        ? briefWithCitations.citations
        : [];
      return {
        id: b.id || `brief-${Date.now()}`,
        patient_name: patient?.name || "Patient",
        created_at: b.created_at,
        source: b.source,
        char_count: b.text.length,
        citation_count: citations.length,
        text: b.text,
        citations,
      };
    });
  }

  public addBrief(
    brief: Brief & { citations?: Array<{ readingId: string; value: string; at: string }> }
  ) {
    this.state.briefs.unshift(brief);
  }
}

const globalForStore = globalThis as unknown as {
  careBridgeStore?: CareBridgeStore;
  careBridgeStoreVersion?: number;
};
const STORE_VERSION = 6;

if (
  !globalForStore.careBridgeStore ||
  globalForStore.careBridgeStoreVersion !== STORE_VERSION ||
  typeof globalForStore.careBridgeStore.createPrescription !== "function"
) {
  globalForStore.careBridgeStore = new CareBridgeStore();
  globalForStore.careBridgeStoreVersion = STORE_VERSION;
}

export const store = globalForStore.careBridgeStore;
