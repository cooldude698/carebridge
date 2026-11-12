import { supabaseServer, isServerSupabaseConfigured } from "./server";
import { store, CreatePrescriptionInput, AiQaLogEntry } from "./localStore";
import { buildWearableContext } from "@/lib/wearable/processor";
import { computeRisk } from "@/lib/risk/compute";
import {
  AdminROIResponse,
  Alert,
  AuditLog,
  Consent,
  ConsentCategory,
  DiagnosisReport,
  FamilyFeedResponse,
  MedLog,
  Medicine,
  PatientDetail,
  PatientGoal,
  PatientListItem,
  PrescribedMedicine,
  Prescription,
  LifestyleTarget,
  RiskBand,
  RiskReason,
  SymptomLog,
  Vital,
  VitalType,
  WatchSyncPayload,
  WearableDevice,
  WhatsAppNotificationLog,
  WhatsAppPreferences,
  DoctorNote,
} from "@/lib/types";

interface DbPatientRow {
  id: string;
  name: string;
  age: number;
  conditions?: string[] | null;
  created_at: string;
}

interface DbRiskScoreRow {
  id: string;
  patient_id: string;
  score: number;
  band: RiskBand;
  computed_at: string;
  risk_reasons?: Array<{ text: string; weight: number }> | null;
}

interface DbVitalTimeRow {
  patient_id: string;
  recorded_at: string;
}

interface DbPrescriptionRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  doctors?: { name?: string } | null;
  diagnosis_report_id?: string | null;
  issued_at: string;
  follow_up_date?: string | null;
  status: Prescription["status"];
  doctor_summary: string;
  prescription_medicines?: PrescribedMedicine[] | null;
  lifestyle_targets?: LifestyleTarget[] | null;
  watch_sync_payload?: WatchSyncPayload | null;
}

export function isLocalOnlyMode(): boolean {
  return process.env.USE_LOCAL_STORE === "true" || !isServerSupabaseConfigured || !supabaseServer;
}

export function normalizePatientId(rawId: string): string {
  return rawId === "patient-ramesh" ? "p1" : rawId;
}

export async function getPatientsListDb(): Promise<PatientListItem[]> {
  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const { data: patients, error } = await supabaseServer
        .from("patients")
        .select("id, name, age, conditions, created_at");

      if (!error && Array.isArray(patients) && patients.length > 0) {
        const [{ data: scores }, { data: vitals }] = await Promise.all([
          supabaseServer
            .from("risk_scores")
            .select("id, patient_id, score, band, computed_at, risk_reasons(text, weight)")
            .order("computed_at", { ascending: false }),
          supabaseServer
            .from("vitals")
            .select("patient_id, recorded_at")
            .order("recorded_at", { ascending: false })
            .limit(50),
        ]);

        const list: PatientListItem[] = (patients as DbPatientRow[]).map((p) => {
          const latestScore = ((scores || []) as DbRiskScoreRow[]).find(
            (s) => s.patient_id === p.id
          );
          const reasons = Array.isArray(latestScore?.risk_reasons)
            ? [...latestScore.risk_reasons].sort((a, b) => b.weight - a.weight)
            : [];
          const latestVital = ((vitals || []) as DbVitalTimeRow[]).find(
            (v) => v.patient_id === p.id
          );

          return {
            id: p.id,
            name: p.name,
            age: p.age,
            score: latestScore?.score ?? 15,
            band: latestScore?.band ?? "green",
            topReason: reasons[0]?.text || "Telemetry stable within normal limits",
            lastSeen: latestVital?.recorded_at || p.created_at,
            conditions: p.conditions || [],
          };
        });

        return list.sort((a, b) => b.score - a.score);
      }
    } catch {
      // Fallback to localStore
    }
  }

  return store.getPatientsList();
}

export async function getPatientDetailDb(
  rawId: string,
  actorType: "doctor" | "patient" | "family" = "doctor"
): Promise<PatientDetail | null> {
  const patientId = normalizePatientId(rawId);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const { data: patient, error } = await supabaseServer
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

      if (!error && patient) {
        const [
          { data: medicines },
          { data: vitalsRaw },
          { data: medLogsRaw },
          { data: consents },
          { data: alerts },
          { data: riskRows },
          { data: devices },
          { data: symptoms },
          prescriptions,
          reports,
        ] = await Promise.all([
          supabaseServer.from("medicines").select("*").eq("patient_id", patientId),
          supabaseServer
            .from("vitals")
            .select("*")
            .eq("patient_id", patientId)
            .order("recorded_at", { ascending: false })
            .limit(200),
          supabaseServer
            .from("med_logs")
            .select("*")
            .eq("patient_id", patientId)
            .order("scheduled_at", { ascending: false })
            .limit(100),
          supabaseServer.from("consents").select("*").eq("patient_id", patientId),
          supabaseServer
            .from("alerts")
            .select("*")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })
            .limit(40),
          supabaseServer
            .from("risk_scores")
            .select("*, risk_reasons(*)")
            .eq("patient_id", patientId)
            .order("computed_at", { ascending: false })
            .limit(1),
          supabaseServer
            .from("wearable_devices")
            .select("*")
            .eq("patient_id", patientId)
            .order("last_synced_at", { ascending: false }),
          supabaseServer
            .from("symptom_logs")
            .select("*")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })
            .limit(5),
          getPrescriptionsDb(patientId),
          getDiagnosisReportsDb(patientId),
        ]);

        const consentMap: Record<string, boolean> = {};
        for (const c of consents || []) {
          consentMap[c.category] = c.granted;
        }

        let vitals: Vital[] = (vitalsRaw || []) as Vital[];
        const typedMedicines = (medicines || []) as Medicine[];
        let medLogs: MedLog[] = ((medLogsRaw || []) as MedLog[]).map((l) => {
          const med = typedMedicines.find((m) => m.id === l.medicine_id);
          return {
            ...l,
            medicine_name: med?.name || l.medicine_name || "Medication",
            dose: med?.dose || l.dose || "",
          };
        });

        if (actorType === "doctor") {
          await appendAuditLogDb({
            patient_id: patientId,
            actor_type: "doctor",
            actor_id: "d1",
            actor: "Dr. Meera Rao",
            action: "VIEW_PATIENT_CHART",
            category: "all",
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

        const latestRisk = riskRows?.[0];
        const wearable = await buildWearableContext(patientId, supabaseServer, vitals).catch(() => null);
        const actionable = medLogs.filter((l) => l.status === "taken" || l.status === "missed");
        const takenCount = actionable.filter((l) => l.status === "taken").length;

        return {
          profile: patient,
          medicines: medicines || [],
          vitals,
          medLogs,
          risk: latestRisk
            ? {
                score: latestRisk.score,
                band: latestRisk.band,
                reasons: latestRisk.risk_reasons || [],
              }
            : computeRisk({ patient, medLogs, vitals }),
          alerts: alerts || [],
          consents: (consents || []) as Consent[],
          wearable,
          activePrescriptions: prescriptions.filter((rx) => rx.status === "active"),
          latestDiagnosis: reports[0] || null,
          recentSymptoms: (symptoms || []) as SymptomLog[],
          wearableDevice: (devices?.[0] as WearableDevice) || null,
          medCompliancePct:
            actionable.length > 0 ? Math.round((takenCount / actionable.length) * 100) : 100,
        };
      }
    } catch {
      // Fallback to localStore
    }
  }

  const detail = store.getPatientDetail(patientId, actorType);
  if (!detail) return null;
  const wearable = await buildWearableContext(patientId, null, detail.vitals).catch(() => null);
  return {
    ...detail,
    wearable,
  };
}

export async function getPatientVitalsDb(
  rawId: string,
  filters: { type?: string | null; from?: string | null; to?: string | null } = {}
) {
  const patientId = normalizePatientId(rawId);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      let query = supabaseServer
        .from("vitals")
        .select("*")
        .eq("patient_id", patientId)
        .order("recorded_at", { ascending: false })
        .limit(300);

      if (filters.type && filters.type !== "all") {
        query = query.eq("type", filters.type);
      }
      if (filters.from) {
        query = query.gte("recorded_at", filters.from);
      }
      if (filters.to) {
        query = query.lte("recorded_at", filters.to);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const nums = (data as Array<{ value_a?: number | null }>)
          .map((v) => Number(v.value_a ?? 0))
          .filter((n) => !isNaN(n));
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
          vitals: data as Vital[],
          summary: { count, latest, avg, min, max, trend },
        };
      }
    } catch {
      // Fallback to localStore
    }
  }

  return store.getVitalsFiltered(patientId, filters);
}

export async function logVitalDb(
  rawId: string,
  type: VitalType,
  valueA: number,
  valueB: number | null = null,
  recordedAt?: string,
  source: Vital["source"] = "manual",
  deviceId: string | null = null
) {
  const patientId = normalizePatientId(rawId);
  const localRes = store.logVital(patientId, type, valueA, valueB, recordedAt, source, deviceId);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      await supabaseServer.from("vitals").insert({
        id: localRes.vital.id,
        patient_id: patientId,
        type,
        value_a: valueA,
        value_b: valueB,
        source,
        device_id: deviceId,
        recorded_at: localRes.vital.recorded_at,
      });

      await persistRiskSnapshotDb(patientId, localRes.risk);
    } catch {
      // Mirror failure non-fatal
    }
  }

  return localRes;
}

export async function insertVitalsBatchDb(
  rawId: string,
  readings: Array<{ type: VitalType; valueA: number; valueB?: number | null; recordedAt?: string }>,
  deviceId?: string | null,
  provider?: string
) {
  const patientId = normalizePatientId(rawId);
  const batchRes = store.ingestVitalsBatch(patientId, readings, deviceId, provider);
  const risk = store.recomputePatientRisk(patientId);

  if (!isLocalOnlyMode() && supabaseServer && batchRes.vitalsInserted.length > 0) {
    try {
      await supabaseServer.from("vitals").insert(
        batchRes.vitalsInserted.map((v) => ({
          id: v.id,
          patient_id: patientId,
          type: v.type,
          value_a: v.value_a,
          value_b: v.value_b ?? null,
          source: v.source || "wearable",
          device_id: v.device_id ?? null,
          recorded_at: v.recorded_at,
        }))
      );

      if (deviceId) {
        await supabaseServer
          .from("wearable_devices")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", deviceId);
      }

      await persistRiskSnapshotDb(patientId, risk);
    } catch {
      // Non-fatal fallback
    }
  }

  return { ...batchRes, risk };
}

async function persistRiskSnapshotDb(
  patientId: string,
  risk: { score: number; band: RiskBand; reasons: RiskReason[]; alertCreated?: Alert }
) {
  if (isLocalOnlyMode() || !supabaseServer) return;
  try {
    const scoreId = `rs-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    await supabaseServer.from("risk_scores").insert({
      id: scoreId,
      patient_id: patientId,
      score: risk.score,
      band: risk.band,
      computed_at: new Date().toISOString(),
    });
    if (risk.reasons.length > 0) {
      await supabaseServer.from("risk_reasons").insert(
        risk.reasons.map((r, i) => ({
          id: `rr-${Date.now()}-${i}`,
          risk_score_id: scoreId,
          rule_id: r.rule_id || r.ruleId || "RULE",
          text: r.text,
          weight: r.weight,
        }))
      );
    }
    if (risk.alertCreated) {
      await supabaseServer.from("alerts").insert({
        id: risk.alertCreated.id,
        patient_id: patientId,
        level: risk.alertCreated.level,
        audience: risk.alertCreated.audience,
        message: risk.alertCreated.message,
        created_at: risk.alertCreated.created_at,
      });
    }
  } catch {
    // Non-fatal
  }
}

export async function logMedicineDb(
  rawId: string,
  medicineId: string,
  status: "taken" | "missed"
) {
  const patientId = normalizePatientId(rawId);
  const res = store.logMedicine(patientId, medicineId, status);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      await supabaseServer.from("med_logs").upsert({
        id: res.log.id,
        patient_id: patientId,
        medicine_id: medicineId,
        scheduled_at: res.log.scheduled_at,
        taken_at: res.log.taken_at,
        status: res.log.status,
      });
      await persistRiskSnapshotDb(patientId, res.risk);
    } catch {
      // Fallback preserved
    }
  }

  return res;
}

export async function getPrescriptionsDb(rawId: string): Promise<Prescription[]> {
  const patientId = normalizePatientId(rawId);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const { data: rxRows, error } = await supabaseServer
        .from("prescriptions")
        .select("*, doctors(name), prescription_medicines(*), lifestyle_targets(*)")
        .eq("patient_id", patientId)
        .order("issued_at", { ascending: false });

      if (!error && Array.isArray(rxRows) && rxRows.length > 0) {
        return (rxRows as DbPrescriptionRow[]).map((rx) => ({
          id: rx.id,
          patient_id: rx.patient_id,
          doctor_id: rx.doctor_id,
          doctor_name: rx.doctors?.name || "Dr. Meera Rao",
          diagnosis_report_id: rx.diagnosis_report_id,
          issued_at: rx.issued_at,
          follow_up_date: rx.follow_up_date,
          status: rx.status,
          doctor_summary: rx.doctor_summary,
          medicines: rx.prescription_medicines || [],
          lifestyle_targets: rx.lifestyle_targets || [],
          watch_sync_payload: rx.watch_sync_payload || null,
        }));
      }
    } catch {
      // Fallback to localStore
    }
  }

  return store.getPrescriptions(patientId);
}

export async function createPrescriptionDb(input: CreatePrescriptionInput) {
  const patientId = normalizePatientId(input.patientId);
  const local = store.createPrescription({ ...input, patientId });

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const rx = local.prescription;
      await supabaseServer.from("prescriptions").insert({
        id: rx.id,
        patient_id: rx.patient_id,
        doctor_id: rx.doctor_id,
        diagnosis_report_id: rx.diagnosis_report_id,
        issued_at: rx.issued_at,
        follow_up_date: rx.follow_up_date,
        status: rx.status,
        doctor_summary: rx.doctor_summary,
        watch_sync_payload: rx.watch_sync_payload,
      });

      if (rx.medicines.length > 0) {
        for (const m of rx.medicines) {
          if (m.medicine_id) {
            await supabaseServer.from("medicines").upsert({
              id: m.medicine_id,
              patient_id: patientId,
              name: m.medicine_name,
              dose: m.dosage,
              times: m.times,
              instructions: m.instructions || (m.with_food ? "Take after food" : "Take before food"),
            });
          }
        }
        await supabaseServer.from("prescription_medicines").insert(rx.medicines);
      }

      if (rx.lifestyle_targets.length > 0) {
        await supabaseServer.from("lifestyle_targets").insert(rx.lifestyle_targets);
        await supabaseServer.from("patient_goals").insert(
          rx.lifestyle_targets.map((t) => ({
            id: `pg-${t.id}`,
            patient_id: patientId,
            category: t.category,
            target: t.description,
            by_date: "Today",
            completed_at: null,
          }))
        );
      }

      await supabaseServer.from("alerts").insert([
        {
          id: `alt-rx-p-${Date.now()}`,
          patient_id: patientId,
          level: "doctor_note",
          audience: "patient",
          message: `${rx.doctor_name} issued your updated digital prescription.`,
        },
        {
          id: `alt-rx-f-${Date.now() + 1}`,
          patient_id: patientId,
          level: "doctor_note",
          audience: "family",
          message: `${rx.doctor_name} issued a new digital prescription & lifestyle plan.`,
        },
      ]);
    } catch {
      // Non-fatal fallback
    }
  }

  return local;
}

export async function updatePrescriptionDb(
  rawId: string,
  rxId: string,
  patch: { status?: Prescription["status"]; doctorSummary?: string }
): Promise<Prescription | null> {
  const patientId = normalizePatientId(rawId);
  const updated = store.updatePrescription(patientId, rxId, patch);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const dbPatch: Record<string, unknown> = {};
      if (patch.status) dbPatch.status = patch.status;
      if (patch.doctorSummary) dbPatch.doctor_summary = patch.doctorSummary;
      if (Object.keys(dbPatch).length > 0) {
        await supabaseServer
          .from("prescriptions")
          .update(dbPatch)
          .eq("id", rxId)
          .eq("patient_id", patientId);
      }
    } catch {
      // Non-fatal
    }
  }

  return updated;
}

export async function getDiagnosisReportsDb(rawId: string): Promise<DiagnosisReport[]> {
  const patientId = normalizePatientId(rawId);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from("diagnosis_reports")
        .select("*, doctors(name)")
        .eq("patient_id", patientId)
        .order("generated_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return (data as Array<DiagnosisReport & { doctors?: { name?: string } | null }>).map(
          (row) => ({
            ...row,
            reviewed_by_doctor: row.doctors?.name || row.reviewed_by_doctor || null,
          })
        );
      }
    } catch {
      // Fallback
    }
  }

  return store.getDiagnosisReports(patientId);
}

export async function saveDiagnosisReportDb(report: DiagnosisReport): Promise<DiagnosisReport> {
  const saved = store.addDiagnosisReport(report);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      await supabaseServer.from("diagnosis_reports").insert({
        id: report.id,
        patient_id: report.patient_id,
        generated_at: report.generated_at,
        ai_summary: report.ai_summary,
        risk_flags: report.risk_flags,
        urgency: report.urgency,
        recommended_specialties: report.recommended_specialties,
        lifestyle_recommendations: report.lifestyle_recommendations,
        symptom_input: report.symptom_input ?? null,
        reading_ids: report.reading_ids,
        model_version: report.model_version,
        reviewed_by_doctor: report.reviewed_by_doctor ? "d1" : null,
        doctor_notes: report.doctor_notes ?? null,
        reviewed_at: report.reviewed_at ?? null,
      });
    } catch {
      // Non-fatal
    }
  }

  return saved;
}

export async function updateDiagnosisReportDb(
  rawId: string,
  reportId: string,
  patch: { doctorNotes?: string; verify?: boolean; doctorId?: string }
): Promise<DiagnosisReport | null> {
  const patientId = normalizePatientId(rawId);
  const updated = store.updateDiagnosisReport(patientId, reportId, patch);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const dbPatch: Record<string, unknown> = {};
      if (typeof patch.doctorNotes === "string") dbPatch.doctor_notes = patch.doctorNotes;
      if (patch.verify) {
        dbPatch.reviewed_by_doctor = patch.doctorId || "d1";
        dbPatch.reviewed_at = new Date().toISOString();
      }
      if (Object.keys(dbPatch).length > 0) {
        await supabaseServer
          .from("diagnosis_reports")
          .update(dbPatch)
          .eq("id", reportId)
          .eq("patient_id", patientId);
      }
    } catch {
      // Non-fatal
    }
  }

  return updated;
}

export async function getGoalsDb(
  rawId: string
): Promise<{ goals: PatientGoal[]; latestNote: DoctorNote | null }> {
  const patientId = normalizePatientId(rawId);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const [{ data: dbGoals }, { data: dbNotes }] = await Promise.all([
        supabaseServer
          .from("patient_goals")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
        supabaseServer
          .from("doctor_notes")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (Array.isArray(dbGoals) && dbGoals.length > 0) {
        return {
          goals: dbGoals as PatientGoal[],
          latestNote: (dbNotes?.[0] as DoctorNote) || null,
        };
      }
    } catch {
      // Fallback
    }
  }

  return store.getPatientGoals(patientId);
}

export async function completeGoalDb(rawId: string, goalId: string) {
  const patientId = normalizePatientId(rawId);
  const localRes = store.completePatientGoal(patientId, goalId);
  const completedAt = localRes?.completedAt || new Date().toISOString();

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      await supabaseServer
        .from("patient_goals")
        .update({ completed_at: completedAt })
        .eq("id", goalId)
        .eq("patient_id", patientId);
    } catch {
      // Non-fatal
    }
  }

  return { completedAt };
}

export async function getConsentsDb(rawId: string): Promise<Consent[]> {
  const patientId = normalizePatientId(rawId);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from("consents")
        .select("*")
        .eq("patient_id", patientId);
      if (!error && Array.isArray(data) && data.length > 0) {
        return data as Consent[];
      }
    } catch {
      // Fallback
    }
  }

  return store.getConsents(patientId);
}

export async function updateConsentDb(
  rawId: string,
  category: ConsentCategory,
  granted: boolean
): Promise<Consent> {
  const patientId = normalizePatientId(rawId);
  const updated = store.updateConsent(patientId, category, granted);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      await supabaseServer.from("consents").upsert(
        {
          id: updated.id || `c-${patientId}-${category}`,
          patient_id: patientId,
          category,
          granted,
          updated_at: updated.updated_at,
        },
        { onConflict: "patient_id,category" }
      );
    } catch {
      // Non-fatal
    }
  }

  return updated;
}

export async function getAuditLogsDb(rawId: string): Promise<AuditLog[]> {
  const patientId = normalizePatientId(rawId);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from("audit_log")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (!error && Array.isArray(data) && data.length > 0) {
        return data as AuditLog[];
      }
    } catch {
      // Fallback
    }
  }

  return store.getAuditLog(patientId);
}

export async function appendAuditLogDb(
  entry: Omit<AuditLog, "id" | "created_at"> & { id?: string; created_at?: string }
): Promise<AuditLog> {
  const saved = store.appendAuditLog(entry);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      await supabaseServer.from("audit_log").insert({
        id: saved.id,
        patient_id: saved.patient_id,
        actor_type: saved.actor_type,
        actor_id: saved.actor_id,
        action: saved.action,
        category: saved.category,
        created_at: saved.created_at,
      });
    } catch {
      // Non-fatal
    }
  }

  return saved;
}

export async function saveSymptomLogDb(log: SymptomLog): Promise<SymptomLog> {
  const saved = store.addSymptomLog(log);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      await supabaseServer.from("symptom_logs").insert({
        id: log.id,
        patient_id: log.patient_id,
        raw_text: log.raw_text,
        language: log.language,
        extracted_symptoms: log.extracted_symptoms,
        severity_hint: log.severity_hint,
        created_at: log.created_at,
      });
    } catch {
      // Non-fatal
    }
  }

  return saved;
}

export async function getSymptomLogsDb(rawId: string): Promise<SymptomLog[]> {
  const patientId = normalizePatientId(rawId);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from("symptom_logs")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && Array.isArray(data) && data.length > 0) {
        return data as SymptomLog[];
      }
    } catch {
      // Fallback
    }
  }

  return store.getSymptomLogs(patientId);
}

export async function saveAiQaLogDb(entry: AiQaLogEntry): Promise<AiQaLogEntry> {
  const saved = store.addAiQaLog(entry);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      await supabaseServer.from("ai_qa_logs").insert({
        id: entry.id,
        patient_id: entry.patient_id,
        question: entry.question,
        answer: entry.answer,
        model_used: entry.model_used,
        created_at: entry.created_at,
      });
    } catch {
      // Non-fatal
    }
  }

  return saved;
}

export async function saveWhatsAppLogDb(
  entry: WhatsAppNotificationLog
): Promise<WhatsAppNotificationLog> {
  const saved = store.addWhatsAppLog(entry);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      await supabaseServer.from("whatsapp_notifications").insert({
        id: entry.id,
        patient_id: entry.patient_id,
        recipient_phone: entry.recipient_phone,
        recipient_role: entry.recipient_role,
        event_type: entry.event_type,
        message: entry.message,
        status: entry.status,
        provider_message_id: entry.provider_message_id ?? null,
        created_at: entry.created_at,
      });
    } catch {
      // Non-fatal
    }
  }

  return saved;
}

export async function getWhatsAppLogsDb(rawId: string): Promise<WhatsAppNotificationLog[]> {
  const patientId = normalizePatientId(rawId);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from("whatsapp_notifications")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!error && Array.isArray(data) && data.length > 0) {
        return data as WhatsAppNotificationLog[];
      }
    } catch {
      // Fallback
    }
  }

  return store.getWhatsAppLogs(patientId);
}

export function getWhatsAppPrefsDb(rawId: string): WhatsAppPreferences {
  return store.getWhatsAppPrefs(normalizePatientId(rawId));
}

export function updateWhatsAppPrefsDb(
  rawId: string,
  patch: Partial<WhatsAppPreferences>
): WhatsAppPreferences {
  return store.updateWhatsAppPrefs(normalizePatientId(rawId), patch);
}

export async function saveWearableDeviceDb(
  device: WearableDevice & { accessToken?: string; refreshToken?: string; expiresAt?: string }
): Promise<WearableDevice> {
  const saved = store.saveWearableDevice(device);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      await supabaseServer.from("wearable_devices").upsert({
        id: saved.id,
        patient_id: saved.patient_id,
        provider: saved.provider,
        device_name: saved.device_name,
        access_token_encrypted: device.accessToken || null,
        refresh_token_encrypted: device.refreshToken || null,
        token_expires_at: device.expiresAt || null,
        last_synced_at: saved.last_synced_at,
        is_active: saved.is_active,
        created_at: saved.created_at,
      });
    } catch {
      // Non-fatal
    }
  }

  return saved;
}

export async function getWearableDevicesDb(rawId: string): Promise<WearableDevice[]> {
  const patientId = normalizePatientId(rawId);

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from("wearable_devices")
        .select("id, patient_id, provider, device_name, is_active, last_synced_at, created_at")
        .eq("patient_id", patientId)
        .order("last_synced_at", { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data as WearableDevice[];
      }
    } catch {
      // Fallback
    }
  }

  return store.getWearableDevices(patientId);
}

export async function getFamilyFeedDb(rawId: string): Promise<FamilyFeedResponse | null> {
  const familyMember = store.getState().familyMembers.find((f) => f.id === rawId);
  const patientId = normalizePatientId(familyMember?.patient_id || rawId || "p1");
  return store.getFamilyFeed(patientId);
}

export async function recordDoctorActionDb(
  rawId: string,
  type: "call" | "message" | "teleconsult",
  note?: string
) {
  const patientId = normalizePatientId(rawId);
  const res = store.recordDoctorAction(patientId, type, note);
  await appendAuditLogDb({
    patient_id: patientId,
    actor_type: "doctor",
    actor_id: "d1",
    actor: "Dr. Meera Rao",
    action: `DOCTOR_ACTION_${type.toUpperCase()}`,
    category: "communication",
  });
  return res;
}

export async function getAdminRoiDb(): Promise<AdminROIResponse> {
  return store.getAdminROI();
}

export async function resetDemoStateDb() {
  store.reset();

  if (!isLocalOnlyMode() && supabaseServer) {
    try {
      const seedIds = ["p1", "p2", "p3"];
      await Promise.all([
        supabaseServer.from("doctor_notes").delete().in("patient_id", seedIds).neq("id", "dn-1"),
        supabaseServer.from("briefs").delete().in("patient_id", seedIds),
        supabaseServer.from("symptom_logs").delete().in("patient_id", seedIds),
        supabaseServer.from("ai_qa_logs").delete().in("patient_id", seedIds),
        supabaseServer.from("whatsapp_notifications").delete().in("patient_id", seedIds),
        supabaseServer.from("diagnosis_reports").delete().in("patient_id", seedIds).neq("id", "diag-seed-1"),
        supabaseServer.from("prescriptions").delete().in("patient_id", seedIds).neq("id", "rx-seed-1"),
      ]);
    } catch {
      // Non-fatal
    }
  }

  return {
    success: true,
    message: "CareBridge state reset successfully to baseline demo seed.",
  };
}
