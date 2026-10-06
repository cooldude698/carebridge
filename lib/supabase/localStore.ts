import {
  Patient,
  Doctor,
  FamilyMember,
  Medicine,
  MedLog,
  Vital,
  RiskScore,
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
  GoalsResponse,
  DoctorNoteReminder,
} from "@/lib/types";
import { computeRisk } from "@/lib/risk/compute";

export interface CareBridgeState {
  patients: Patient[];
  doctors: Doctor[];
  familyMembers: FamilyMember[];
  medicines: Medicine[];
  medLogs: MedLog[];
  vitals: Vital[];
  riskScores: Record<string, { score: number; band: "green" | "yellow" | "red"; reasons: RiskReason[]; computedAt: string }>;
  alerts: Alert[];
  consents: Consent[];
  auditLogs: AuditLog[];
  briefs: Brief[];
  doctorActions: { id: string; patientId: string; type: "call" | "message" | "teleconsult"; note?: string; timestamp: string }[];
  missedDoseEscalations: Record<string, { logId: string; patientId: string; detectedAt: number; firedStages: Set<"reminder" | "family" | "doctor"> }>;
  doctorNotes: DoctorNote[];
  patientGoals: PatientGoal[];
}

// Helper to generate 14 days of realistic baseline data
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
    { id: "m1", patient_id: "p1", name: "Metformin", dose: "500mg", times: ["08:00", "20:00"] },
    { id: "m2", patient_id: "p1", name: "Amlodipine", dose: "5mg", times: ["08:00"] },
    { id: "m3", patient_id: "p2", name: "Telmisartan", dose: "40mg", times: ["09:00"] },
    { id: "m4", patient_id: "p2", name: "Hydrochlorothiazide", dose: "12.5mg", times: ["09:00"] },
    { id: "m5", patient_id: "p3", name: "Metformin", dose: "500mg", times: ["08:30"] },
  ];

  const consents: Consent[] = [
    { id: "c1", patient_id: "p1", category: "vitals", granted: true, updated_at: new Date().toISOString() },
    { id: "c2", patient_id: "p1", category: "medicines", granted: true, updated_at: new Date().toISOString() },
    { id: "c3", patient_id: "p1", category: "steps", granted: true, updated_at: new Date().toISOString() },
    { id: "c4", patient_id: "p1", category: "glucose", granted: true, updated_at: new Date().toISOString() },
    { id: "c5", patient_id: "p2", category: "vitals", granted: true, updated_at: new Date().toISOString() },
    { id: "c6", patient_id: "p2", category: "medicines", granted: true, updated_at: new Date().toISOString() },
    { id: "c7", patient_id: "p2", category: "steps", granted: true, updated_at: new Date().toISOString() },
    { id: "c8", patient_id: "p2", category: "glucose", granted: true, updated_at: new Date().toISOString() },
    { id: "c9", patient_id: "p3", category: "vitals", granted: true, updated_at: new Date().toISOString() },
    { id: "c10", patient_id: "p3", category: "medicines", granted: true, updated_at: new Date().toISOString() },
    { id: "c11", patient_id: "p3", category: "steps", granted: true, updated_at: new Date().toISOString() },
    { id: "c12", patient_id: "p3", category: "glucose", granted: true, updated_at: new Date().toISOString() },
  ];

  const medLogs: MedLog[] = [];
  const vitals: Vital[] = [];

  // Generate 14 days history for each patient
  for (let offset = 14; offset >= 1; offset--) {
    const dayDate = new Date(now - offset * dayMs);
    const dayIso = dayDate.toISOString();

    // 1. Ramesh K (p1)
    // Days 14 to 5: Consistent taken doses, normal BP, 5,200 steps
    // Days 4 to 1: Creeping up BP (140-144), steps dropping to 2,800, missed 1 dose
    const isP1Recent = offset <= 4;

    medLogs.push({
      id: `p1-m1-am-${offset}`,
      patient_id: "p1",
      medicine_id: "m1",
      medicine_name: "Metformin",
      dose: "500mg",
      scheduled_at: new Date(dayDate.setHours(8, 0, 0, 0)).toISOString(),
      taken_at: offset === 1 ? null : new Date(dayDate.setHours(8, 15, 0, 0)).toISOString(),
      status: offset === 1 ? "missed" : "taken",
    });

    medLogs.push({
      id: `p1-m2-${offset}`,
      patient_id: "p1",
      medicine_id: "m2",
      medicine_name: "Amlodipine",
      dose: "5mg",
      scheduled_at: new Date(dayDate.setHours(8, 0, 0, 0)).toISOString(),
      taken_at: new Date(dayDate.setHours(8, 16, 0, 0)).toISOString(),
      status: "taken",
    });

    medLogs.push({
      id: `p1-m1-pm-${offset}`,
      patient_id: "p1",
      medicine_id: "m1",
      medicine_name: "Metformin",
      dose: "500mg",
      scheduled_at: new Date(dayDate.setHours(20, 0, 0, 0)).toISOString(),
      taken_at: offset === 2 ? null : new Date(dayDate.setHours(20, 20, 0, 0)).toISOString(),
      status: offset === 2 ? "missed" : "taken",
    });

    vitals.push({
      id: `p1-bp-${offset}`,
      patient_id: "p1",
      type: "bp",
      value_a: isP1Recent ? 140 + (offset % 3) * 2 : 126 + (offset % 4),
      value_b: isP1Recent ? 88 + (offset % 2) * 2 : 82 + (offset % 3),
      recorded_at: new Date(dayDate.setHours(9, 0, 0, 0)).toISOString(),
    });

    vitals.push({
      id: `p1-steps-${offset}`,
      patient_id: "p1",
      type: "steps",
      value_a: isP1Recent ? 2750 + offset * 50 : 5400 + (offset % 5) * 100,
      value_b: null,
      recorded_at: new Date(dayDate.setHours(21, 0, 0, 0)).toISOString(),
    });

    vitals.push({
      id: `p1-glu-${offset}`,
      patient_id: "p1",
      type: "glucose",
      value_a: isP1Recent ? 152 + offset * 3 : 132 + (offset % 8),
      value_b: null,
      recorded_at: new Date(dayDate.setHours(7, 30, 0, 0)).toISOString(),
    });

    // 2. Anita S (p2)
    medLogs.push({
      id: `p2-m3-${offset}`,
      patient_id: "p2",
      medicine_id: "m3",
      medicine_name: "Telmisartan",
      dose: "40mg",
      scheduled_at: new Date(dayDate.setHours(9, 0, 0, 0)).toISOString(),
      taken_at: offset % 3 === 0 ? null : new Date(dayDate.setHours(9, 20, 0, 0)).toISOString(),
      status: offset % 3 === 0 ? "missed" : "taken",
    });

    vitals.push({
      id: `p2-bp-${offset}`,
      patient_id: "p2",
      type: "bp",
      value_a: 138 + (offset % 4),
      value_b: 88 + (offset % 3),
      recorded_at: new Date(dayDate.setHours(10, 0, 0, 0)).toISOString(),
    });

    vitals.push({
      id: `p2-steps-${offset}`,
      patient_id: "p2",
      type: "steps",
      value_a: 4200 + offset * 40,
      value_b: null,
      recorded_at: new Date(dayDate.setHours(21, 0, 0, 0)).toISOString(),
    });

    // 3. Suresh P (p3) - Healthy Green
    medLogs.push({
      id: `p3-m5-${offset}`,
      patient_id: "p3",
      medicine_id: "m5",
      medicine_name: "Metformin",
      dose: "500mg",
      scheduled_at: new Date(dayDate.setHours(8, 30, 0, 0)).toISOString(),
      taken_at: new Date(dayDate.setHours(8, 45, 0, 0)).toISOString(),
      status: "taken",
    });

    vitals.push({
      id: `p3-bp-${offset}`,
      patient_id: "p3",
      type: "bp",
      value_a: 120 + (offset % 3),
      value_b: 78 + (offset % 2),
      recorded_at: new Date(dayDate.setHours(9, 0, 0, 0)).toISOString(),
    });

    vitals.push({
      id: `p3-steps-${offset}`,
      patient_id: "p3",
      type: "steps",
      value_a: 6800 + (offset % 6) * 150,
      value_b: null,
      recorded_at: new Date(dayDate.setHours(21, 0, 0, 0)).toISOString(),
    });
  }

  // Today's pending log for Ramesh (for demo interaction)
  medLogs.push({
    id: `p1-today-am`,
    patient_id: "p1",
    medicine_id: "m1",
    medicine_name: "Metformin",
    dose: "500mg",
    scheduled_at: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
    taken_at: null,
    status: "pending",
  });

  const alerts: Alert[] = [
    {
      id: "alt-doc-1",
      patient_id: "p1",
      level: "doctor_note",
      audience: "family",
      message: "Dr. Rao has updated the care plan.",
      created_at: new Date(now - 30 * 60 * 1000).toISOString(),
      acknowledged_at: null,
    },
    {
      id: "alt-wearable-1",
      patient_id: "p1",
      level: "wearable_anomaly",
      audience: "family",
      message: "Ramesh ji's heart rate was a bit high during sleep.",
      created_at: new Date(now - 60 * 60 * 1000).toISOString(),
      acknowledged_at: null,
    },
    {
      id: "alt-1",
      patient_id: "p1",
      level: "reminder",
      audience: "patient",
      message: "Time for morning Metformin (500mg)",
      created_at: new Date(now - 90 * 60 * 1000).toISOString(),
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
      action: "VIEW_PROFILE",
      category: "all",
      created_at: new Date(now - 2 * dayMs).toISOString(),
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

  // Baseline normal HR readings for last 3 days at 02:00 (so initial state has no HR anomaly)
  for (let d = 1; d <= 3; d++) {
    const hrDay = new Date(now - d * dayMs);
    hrDay.setHours(2, 0, 0, 0);
    vitals.push({
      id: `p1-hr-${d}`,
      patient_id: "p1",
      type: "hr",
      value_a: 72,
      value_b: null,
      recorded_at: hrDay.toISOString(),
    });
  }

  const briefs: Brief[] = [];
  const doctorActions: CareBridgeState["doctorActions"] = [];
  const missedDoseEscalations: CareBridgeState["missedDoseEscalations"] = {};

  const doctorNotes: DoctorNote[] = [
    {
      id: "dn-1",
      patient_id: "p1",
      doctor_id: "d1",
      note_text: "Increase morning walk to 20 min. Check BP every 3 days. Review in 2 weeks.",
      parsed_instructions: {
        reminders: [
          { medicine: "Metformin 500mg", time: "08:00 AM", instruction: "Take with breakfast" },
          { medicine: "Amlodipine 5mg", time: "08:00 PM", instruction: "Take after dinner" },
        ],
        goals: [
          { category: "steps", target: "Walk 20 mins every morning", by: "Next Monday" },
          { category: "bp", target: "Check BP every 3 days before breakfast", by: "Ongoing" },
        ],
        followUpDate: "Oct 20, 2026",
      },
      created_at: new Date(now - 1 * dayMs).toISOString(),
    },
  ];

  const patientGoals: PatientGoal[] = [
    {
      id: "g-1",
      patient_id: "p1",
      category: "steps",
      target: "Walk 20 mins every morning",
      by_date: "Next Monday",
      source_note_id: "dn-1",
      completed_at: null,
      created_at: new Date(now - 1 * dayMs).toISOString(),
    },
    {
      id: "g-2",
      patient_id: "p1",
      category: "bp",
      target: "Check BP every 3 days before breakfast",
      by_date: "Ongoing",
      source_note_id: "dn-1",
      completed_at: null,
      created_at: new Date(now - 1 * dayMs).toISOString(),
    },
  ];

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
    briefs,
    doctorActions,
    missedDoseEscalations,
    doctorNotes,
    patientGoals,
  };

  // Compute baseline risk scores for all 3 patients
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
      computedAt: new Date().toISOString(),
    };
  }

  return state;
}

// Global in-memory singleton
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

  // Recomputes risk for a specific patient, updating cache and emitting alert if band worsened
  public recomputePatientRisk(patientId: string): { score: number; band: "green" | "yellow" | "red"; reasons: RiskReason[]; alertCreated?: Alert } {
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

    // Check if band worsened (green -> yellow, or yellow/green -> red)
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
      const patientVitals = this.state.vitals.filter((v) => v.patient_id === patient.id);
      const lastVital = patientVitals[patientVitals.length - 1];

      return {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        score: risk.score,
        band: risk.band,
        topReason: risk.reasons[0]?.text || "Telemetry stable within normal limits",
        lastSeen: (lastVital ? (lastVital.recorded_at || lastVital.recordedAt) : patient.created_at) || new Date().toISOString(),
        conditions: patient.conditions,
      };
    });

    // Sort descending by score per FR6 & API contract
    return list.sort((a, b) => b.score - a.score);
  }

  public getPatientDetail(patientId: string, actorType?: "doctor" | "patient" | "family"): PatientDetail | null {
    const patient = this.state.patients.find((p) => p.id === patientId);
    if (!patient) return null;

    const patientConsents = this.state.consents.filter((c) => c.patient_id === patientId);
    const consentMap: Record<string, boolean> = {};
    for (const c of patientConsents) {
      consentMap[c.category] = c.granted;
    }

    // Filter vitals and logs if accessed by doctor and patient denied consent
    let vitals = this.state.vitals.filter((v) => v.patient_id === patientId);
    let medLogs = this.state.medLogs.filter((m) => m.patient_id === patientId);

    if (actorType === "doctor") {
      // DPDP Act: Write audit row for doctor access
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

      // Filter based on consents
      vitals = vitals.filter((v) => {
        if (v.type === "steps" && consentMap["steps"] === false) return false;
        if (v.type === "bp" && consentMap["vitals"] === false) return false;
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
    };
  }

  public logMedicine(patientId: string, medicineId: string, status: "taken" | "missed"): { log: MedLog; risk: any } {
    const med = this.state.medicines.find((m) => m.id === medicineId);
    const newLog: MedLog = {
      id: `log-${Date.now()}`,
      patient_id: patientId,
      medicine_id: medicineId,
      medicine_name: med?.name || "Medication",
      dose: med?.dose || "",
      scheduled_at: new Date().toISOString(),
      taken_at: status === "taken" ? new Date().toISOString() : null,
      status,
    };

    // Replace pending log if exists, else append
    const pendingIdx = this.state.medLogs.findIndex(
      (m) => m.patient_id === patientId && m.medicine_id === medicineId && m.status === "pending"
    );
    if (pendingIdx >= 0) {
      this.state.medLogs[pendingIdx] = newLog;
    } else {
      this.state.medLogs.unshift(newLog);
    }

    // If missed, register for escalation ladder tracking
    if (status === "missed") {
      this.state.missedDoseEscalations[newLog.id] = {
        logId: newLog.id,
        patientId,
        detectedAt: Date.now(),
        firedStages: new Set<"reminder" | "family" | "doctor">(),
      };
    }

    // Recompute risk
    const risk = this.recomputePatientRisk(patientId);

    return { log: newLog, risk };
  }

  public logVital(patientId: string, type: "bp" | "steps" | "glucose" | "hr", valueA: number, valueB: number | null = null, recordedAt?: string): { vital: Vital; risk: any } {
    const newVital: Vital = {
      id: `vital-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      patient_id: patientId,
      type,
      value_a: valueA,
      value_b: valueB,
      recorded_at: recordedAt || new Date().toISOString(),
    };

    this.state.vitals.unshift(newVital);
    const risk = this.recomputePatientRisk(patientId);

    return { vital: newVital, risk };
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

  public getFamilyFeed(patientId: string): FamilyFeedResponse | null {
    const patient = this.state.patients.find((p) => p.id === patientId);
    if (!patient) return null;

    const risk = this.state.riskScores[patientId] || { score: 10, band: "green" };
    const patientVitals = this.state.vitals.filter((v) => v.patient_id === patientId);
    const todaySteps = patientVitals
      .filter((v) => v.type === "steps")
      .slice(0, 1)[0]?.value_a || 2800;

    const latestBp = patientVitals
      .filter((v) => v.type === "bp")
      .slice(0, 1)[0];

    const patientLogs = this.state.medLogs.filter((m) => m.patient_id === patientId);
    const takenToday = patientLogs.filter((m) => m.status === "taken").length;
    const totalToday = Math.max(takenToday, 2);

    const alerts = [
      ...this.state.alerts.filter((a) => a.patient_id === patientId || (a as any).patientId === patientId),
    ];

    // Ensure doctor note alert is represented in feed if latest note exists
    const latestNote = this.state.doctorNotes.find((n) => n.patient_id === patientId || (n as any).patientId === patientId);
    if (latestNote && !alerts.some((a) => a.level === "doctor_note")) {
      alerts.unshift({
        id: `feed-doc-${latestNote.id}`,
        patient_id: patientId,
        level: "doctor_note",
        audience: "family",
        message: "Dr. Rao has updated the care plan.",
        created_at: latestNote.created_at,
        acknowledged_at: null,
      });
    }

    // Check for wearable anomaly flags (e.g. nocturnal HR spike or steps drop)
    const hasHrSpike = this.state.vitals.some(
      (v) => (v.patient_id === patientId || (v as any).patientId === patientId) && v.type === "hr" && (v.value_a || 0) > 95
    );
    if (hasHrSpike && !alerts.some((a) => a.level === "wearable_anomaly")) {
      alerts.unshift({
        id: `feed-wearable-hr-${Date.now()}`,
        patient_id: patientId,
        level: "wearable_anomaly",
        audience: "family",
        message: "Ramesh ji's heart rate was a bit high during sleep.",
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        acknowledged_at: null,
      });
    }

    return {
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        conditions: patient.conditions,
        band: risk.band,
        score: risk.score,
      },
      today: {
        steps: Number(todaySteps),
        medicinesTaken: takenToday,
        medicinesTotal: totalToday,
        latestBp: latestBp ? `${latestBp.value_a}/${latestBp.value_b} mmHg` : undefined,
        statusBand: risk.band,
        adherencePct: totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 100,
        latestSteps: Number(todaySteps),
      },
      alerts,
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
      this.logVital(patientId, "bp", systolic, diastolic);
      alertMessage = `Simulation: BP Spike ${systolic}/${diastolic} mmHg injected for ${patient.name}`;
    } else if (kind === "steps_drop") {
      const steps = params?.steps || 1400;
      this.logVital(patientId, "steps", steps, null);
      alertMessage = `Simulation: Activity drop to ${steps} steps injected for ${patient.name}`;
    } else if (kind === "recover") {
      this.logMedicine(patientId, "m1", "taken");
      this.logVital(patientId, "bp", 124, 80);
      this.logVital(patientId, "steps", 5500, null);
      alertMessage = `Simulation: Recovery event registered for ${patient.name}`;
    } else if (kind === "hr_spike") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const t2am = new Date(yesterday);
      t2am.setHours(2, 0, 0, 0);
      const t3am = new Date(yesterday);
      t3am.setHours(3, 0, 0, 0);
      const t4am = new Date(yesterday);
      t4am.setHours(4, 0, 0, 0);

      this.logVital(patientId, "hr", 109, null, t2am.toISOString());
      this.logVital(patientId, "hr", 114, null, t3am.toISOString());
      this.logVital(patientId, "hr", 112, null, t4am.toISOString());
      alertMessage = `Simulation: Nocturnal HR spike (109-114 bpm) injected for ${patient.name}`;
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

  // Escalation ladder processing: T+0 reminder -> T+10s family -> T+25s doctor
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

      // Stage 1: T+0 Reminder
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

      // Stage 2: T+Delta1 Family Alert
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

      // Stage 3: T+Delta2 Doctor Red Alert
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

        // Recompute risk with streak
        this.recomputePatientRisk(esc.patientId);
      }
    }

    return fired;
  }

  public recordDoctorAction(patientId: string, type: "call" | "message" | "teleconsult", note?: string): DoctorActionResponse {
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

    // Write audit log
    this.state.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      patient_id: patientId,
      actor_type: "doctor",
      actor_id: "d1",
      actor: "Dr. Meera Rao",
      action: `DOCTOR_ACTION_${type.toUpperCase()}`,
      category: "communication",
      created_at: timestamp,
    });

    // Create a patient-facing alert notifying that doctor reached out
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
    const alertsActioned = this.state.doctorActions.length + this.state.alerts.filter((a) => a.acknowledged_at).length + 14;

    // Documented assumptions per ARCHITECTURE section 7 & PRD section 5
    // Each actioned alert on a yellow/red patient prevents a ~12% readmission probability
    // Average clinic savings: ~2.4 doctor-hours per early teleconsultation intervention vs emergency readmission
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

  public addDoctorNote(patientId: string, doctorId: string, noteText: string, parsedInstructions: any): DoctorNote {
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
      message: "Dr. Rao has updated the care plan.",
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
    const latestNote = (this.state.doctorNotes || []).find((n) => n.patient_id === patientId) || null;
    return { goals, latestNote };
  }

  public completePatientGoal(patientId: string, goalId: string): { completedAt: string } | null {
    const goal = (this.state.patientGoals || []).find((g) => g.id === goalId && g.patient_id === patientId);
    if (!goal) return null;
    const completedAt = new Date().toISOString();
    goal.completed_at = completedAt;
    return { completedAt };
  }

  public getAIAuditLogs() {
    return this.state.briefs.map((b) => {
      const patient = this.state.patients.find((p) => p.id === b.patient_id);
      return {
        id: b.id || `brief-${Date.now()}`,
        patient_name: patient?.name || "Patient",
        created_at: b.created_at,
        source: b.source,
        char_count: b.text.length,
        citation_count: Array.isArray((b as any).citations) ? (b as any).citations.length : 0,
        text: b.text,
        citations: (b as any).citations || [],
      };
    });
  }

  public addBrief(brief: Brief & { citations?: any[] }) {
    this.state.briefs.unshift(brief);
  }
}

// Global variable so state persists across hot module reloads in Next.js development
const globalForStore = globalThis as unknown as { careBridgeStore?: CareBridgeStore; careBridgeStoreVersion?: number };
const STORE_VERSION = 4;

if (
  !globalForStore.careBridgeStore ||
  globalForStore.careBridgeStoreVersion !== STORE_VERSION ||
  typeof (globalForStore.careBridgeStore as any).getPatientGoals !== "function"
) {
  globalForStore.careBridgeStore = new CareBridgeStore();
  globalForStore.careBridgeStoreVersion = STORE_VERSION;
}

export const store = globalForStore.careBridgeStore;
