import {
  Patient,
  PatientDetail,
  PatientListItem,
  Vital,
  MedLog,
  Consent,
  AuditLog,
  FamilyFeedResponse,
  DoctorActionResponse,
  DiagnosisReport,
  Prescription,
  PrescribedMedicine,
  LifestyleTarget,
  WearableDevice,
  SymptomLog,
  WhatsAppNotificationLog,
  SimEventRequest,
  SimEventResponse,
  AdminROIResponse,
  Alert,
} from "@/lib/types";
import { store } from "@/lib/supabase/localStore";
import { isServerSupabaseConfigured, createClient } from "@/lib/supabase/server";

export function isLocalOnly(): boolean {
  return process.env.USE_LOCAL_STORE === "true" || !isServerSupabaseConfigured;
}
export const useLocalOnly = isLocalOnly;

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

export async function getPatientsListDb(): Promise<PatientListItem[]> {
  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("id, name, age, conditions, created_at");

        if (!error && data && data.length > 0) {
          // Fetch risk scores
          const { data: scores } = await supabase
            .from("risk_scores")
            .select("patient_id, score, band, computed_at")
            .order("computed_at", { ascending: false });

          const scoreMap: Record<string, { score: number; band: any }> = {};
          if (scores) {
            for (const s of scores) {
              if (!scoreMap[s.patient_id]) {
                scoreMap[s.patient_id] = { score: s.score, band: s.band };
              }
            }
          }

          const list: PatientListItem[] = data.map((p: any) => {
            const sc = scoreMap[p.id] || { score: 10, band: "green" };
            return {
              id: p.id,
              name: p.name,
              age: p.age,
              score: sc.score,
              band: sc.band,
              topReason: sc.band === "green" ? "Telemetry stable within normal limits" : "Telemetry shift detected",
              lastSeen: p.created_at || new Date().toISOString(),
              conditions: p.conditions || [],
            };
          });

          return list.sort((a, b) => b.score - a.score);
        }
      } catch (err) {
        console.warn("[db.ts] Supabase getPatientsList failed, falling back to localStore", err);
      }
    }
  }

  return store.getPatientsList();
}

export async function getPatientDetailDb(
  patientId: string,
  actorType?: "doctor" | "patient" | "family"
): Promise<PatientDetail | null> {
  // Always query localStore first to have full state or fallback
  const localDetail = store.getPatientDetail(patientId, actorType);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data: patient, error: pError } = await supabase
          .from("patients")
          .select("*")
          .eq("id", patientId)
          .single();

        if (!pError && patient) {
          const [vitalsRes, medsRes, logsRes, consentsRes, alertsRes, rxRes, diagRes, devRes] =
            await Promise.all([
              supabase.from("vitals").select("*").eq("patient_id", patientId).order("recorded_at", { ascending: false }).limit(200),
              supabase.from("medicines").select("*").eq("patient_id", patientId),
              supabase.from("med_logs").select("*").eq("patient_id", patientId).order("scheduled_at", { ascending: false }).limit(100),
              supabase.from("consents").select("*").eq("patient_id", patientId),
              supabase.from("alerts").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(50),
              supabase.from("prescriptions").select("*, prescription_medicines(*), lifestyle_targets(*)").eq("patient_id", patientId).order("issued_at", { ascending: false }),
              supabase.from("diagnosis_reports").select("*").eq("patient_id", patientId).order("generated_at", { ascending: false }),
              supabase.from("wearable_devices").select("*").eq("patient_id", patientId),
            ]);

          const vitals = vitalsRes.data || localDetail?.vitals || [];
          const medicines = medsRes.data || localDetail?.medicines || [];
          const medLogs = logsRes.data || localDetail?.medLogs || [];
          const consents = consentsRes.data || localDetail?.consents || [];
          const alerts = alertsRes.data || localDetail?.alerts || [];

          // Format prescriptions
          const prescriptions: Prescription[] = (rxRes.data || []).map((rx: any) => ({
            id: rx.id,
            patient_id: rx.patient_id,
            doctor_id: rx.doctor_id,
            doctor_name: rx.doctor_name || "Dr. Meera Rao",
            diagnosis_report_id: rx.diagnosis_report_id,
            issued_at: rx.issued_at,
            follow_up_date: rx.follow_up_date,
            status: rx.status,
            doctor_summary: rx.doctor_summary,
            medicines: rx.prescription_medicines || [],
            lifestyle_targets: rx.lifestyle_targets || [],
            watch_sync_payload: rx.watch_sync_payload,
          }));

          const diagnosisReports: DiagnosisReport[] = diagRes.data || localDetail?.diagnosisReports || [];
          const wearableDevices: WearableDevice[] = devRes.data || localDetail?.wearableDevices || [];

          return {
            profile: {
              id: patient.id,
              name: patient.name,
              age: patient.age,
              gender: patient.gender,
              whatsapp_number: patient.whatsapp_number,
              blood_group: patient.blood_group,
              allergies: patient.allergies || [],
              language: patient.language,
              conditions: patient.conditions || [],
              doctor_id: patient.doctor_id,
              family_id: patient.family_id,
              discharged_at: patient.discharged_at,
              created_at: patient.created_at,
            },
            medicines,
            vitals,
            medLogs,
            risk: localDetail?.risk || { score: 10, band: "green", reasons: [] },
            alerts,
            consents,
            prescriptions: prescriptions.length > 0 ? prescriptions : localDetail?.prescriptions,
            diagnosisReports: diagnosisReports.length > 0 ? diagnosisReports : localDetail?.diagnosisReports,
            wearableDevices: wearableDevices.length > 0 ? wearableDevices : localDetail?.wearableDevices,
          };
        }
      } catch (err) {
        console.warn("[db.ts] Supabase getPatientDetail failed, falling back to localStore", err);
      }
    }
  }

  return localDetail;
}

// ---------------------------------------------------------------------------
// Vitals
// ---------------------------------------------------------------------------

export async function getPatientVitalsDb(
  patientId: string,
  filters?: { type?: string; from?: string; to?: string }
): Promise<Vital[]> {
  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        let q = supabase
          .from("vitals")
          .select("*")
          .eq("patient_id", patientId)
          .order("recorded_at", { ascending: false });

        if (filters?.type && filters.type !== "all") {
          q = q.eq("type", filters.type);
        }
        if (filters?.from) {
          q = q.gte("recorded_at", filters.from);
        }
        if (filters?.to) {
          q = q.lte("recorded_at", filters.to);
        }

        const { data, error } = await q.limit(500);
        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn("[db.ts] Supabase getPatientVitals failed, falling back to localStore", err);
      }
    }
  }

  let vitals = store.getState().vitals.filter(
    (v) => v.patient_id === patientId || (v as any).patientId === patientId
  );

  if (filters?.type && filters.type !== "all") {
    vitals = vitals.filter((v) => v.type === filters.type);
  }
  if (filters?.from) {
    const fromTime = new Date(filters.from).getTime();
    vitals = vitals.filter((v) => new Date(v.recorded_at || "").getTime() >= fromTime);
  }
  if (filters?.to) {
    const toTime = new Date(filters.to).getTime();
    vitals = vitals.filter((v) => new Date(v.recorded_at || "").getTime() <= toTime);
  }

  return vitals.sort(
    (a, b) => new Date(b.recorded_at || "").getTime() - new Date(a.recorded_at || "").getTime()
  );
}

export async function insertVitalsBatchDb(
  patientId: string,
  readings: Vital[],
  deviceId?: string | null
): Promise<{ inserted: number; skipped: number; vitalsInserted: Vital[] }> {
  // Always update localStore
  const localResult = store.ingestVitalsBatch(patientId, readings, deviceId);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase && localResult.vitalsInserted.length > 0) {
      try {
        const rows = localResult.vitalsInserted.map((v) => ({
          id: v.id,
          patient_id: patientId,
          type: v.type,
          value_a: v.value_a,
          value_b: v.value_b ?? null,
          recorded_at: v.recorded_at,
          source: v.source || "wearable",
          device_id: deviceId || v.device_id || null,
        }));

        await supabase.from("vitals").upsert(rows, { onConflict: "id" });
      } catch (err) {
        console.warn("[db.ts] Supabase insertVitalsBatch failed to persist to Postgres", err);
      }
    }
  }

  return localResult;
}

// ---------------------------------------------------------------------------
// Medicines & Logs
// ---------------------------------------------------------------------------

export async function logMedicineDb(
  patientId: string,
  medicineId: string,
  status: "taken" | "missed"
): Promise<{ log: MedLog; risk: any }> {
  const result = store.logMedicine(patientId, medicineId, status);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from("med_logs").upsert(
          {
            id: result.log.id,
            patient_id: patientId,
            medicine_id: medicineId,
            medicine_name: result.log.medicine_name,
            dose: result.log.dose,
            scheduled_at: result.log.scheduled_at,
            taken_at: result.log.taken_at,
            status: result.log.status,
          },
          { onConflict: "id" }
        );
      } catch (err) {
        console.warn("[db.ts] Supabase logMedicine failed to persist to Postgres", err);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Prescriptions
// ---------------------------------------------------------------------------

export async function getPrescriptionsDb(patientId: string): Promise<Prescription[]> {
  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("prescriptions")
          .select("*, prescription_medicines(*), lifestyle_targets(*)")
          .eq("patient_id", patientId)
          .order("issued_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((rx: any) => ({
            id: rx.id,
            patient_id: rx.patient_id,
            doctor_id: rx.doctor_id,
            doctor_name: rx.doctor_name || "Dr. Meera Rao",
            diagnosis_report_id: rx.diagnosis_report_id,
            issued_at: rx.issued_at,
            follow_up_date: rx.follow_up_date,
            status: rx.status,
            doctor_summary: rx.doctor_summary,
            medicines: rx.prescription_medicines || [],
            lifestyle_targets: rx.lifestyle_targets || [],
            watch_sync_payload: rx.watch_sync_payload,
          }));
        }
      } catch (err) {
        console.warn("[db.ts] Supabase getPrescriptions failed, falling back to localStore", err);
      }
    }
  }

  return store.getPrescriptions(patientId);
}

export async function createPrescriptionDb(input: {
  patientId: string;
  doctorId?: string;
  doctorName?: string;
  doctorSummary: string;
  medicines: Omit<PrescribedMedicine, "id" | "prescription_id">[];
  lifestyleTargets: Omit<LifestyleTarget, "id" | "prescription_id" | "patient_id">[];
  followUpDate?: string | null;
  diagnosisReportId?: string | null;
}): Promise<{
  prescription: Prescription;
  generatedGoalsCount: number;
  watchSyncPayload: any;
  whatsappStatus: "sent" | "simulated_sent" | "failed";
}> {
  const result = store.createPrescription(input);

  // Dispatch auditable WhatsApp notification through unified notification service
  try {
    const { sendWhatsAppMessage } = await import("@/lib/notifications/whatsapp");
    const patientDetail = await getPatientDetailDb(input.patientId);
    const phone = patientDetail?.profile.whatsapp_number || "+91 98450 12345";
    const waLog = await sendWhatsAppMessage({
      patientId: input.patientId,
      recipientPhone: phone,
      recipientRole: "patient",
      eventType: "prescription_issued",
      message: `CareBridge: New prescription issued by ${result.prescription.doctor_name}. Follow up by ${result.prescription.follow_up_date || "2 weeks"}.`,
    });
    result.whatsappStatus = waLog.status;
  } catch {
    // Non-blocking: localStore already recorded the simulated fallback
  }

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        const rx = result.prescription;
        await supabase.from("prescriptions").insert({
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
          await supabase.from("prescription_medicines").insert(
            rx.medicines.map((m) => ({
              id: m.id,
              prescription_id: rx.id,
              medicine_name: m.medicine_name,
              dosage: m.dosage,
              frequency: m.frequency,
              times: m.times,
              duration: m.duration,
              with_food: m.with_food,
              instructions: m.instructions,
            }))
          );
        }

        if (rx.lifestyle_targets.length > 0) {
          await supabase.from("lifestyle_targets").insert(
            rx.lifestyle_targets.map((lt) => ({
              id: lt.id,
              prescription_id: rx.id,
              patient_id: rx.patient_id,
              category: lt.category,
              description: lt.description,
              target_value: lt.target_value,
              unit: lt.unit,
            }))
          );
        }
      } catch (err) {
        console.warn("[db.ts] Supabase createPrescription failed to persist to Postgres", err);
      }
    }
  }

  return result;
}

export async function updatePrescriptionDb(
  patientId: string,
  rxId: string,
  patch: Partial<Prescription>
): Promise<Prescription | null> {
  const result = store.updatePrescription(patientId, rxId, patch);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        const updatePayload: Record<string, any> = {};
        if (patch.status) updatePayload.status = patch.status;
        if (patch.doctor_summary) updatePayload.doctor_summary = patch.doctor_summary;
        if (patch.follow_up_date) updatePayload.follow_up_date = patch.follow_up_date;

        await supabase.from("prescriptions").update(updatePayload).eq("id", rxId);
      } catch (err) {
        console.warn("[db.ts] Supabase updatePrescription failed to persist to Postgres", err);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Diagnosis Reports
// ---------------------------------------------------------------------------

export async function getDiagnosisReportsDb(patientId: string): Promise<DiagnosisReport[]> {
  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("diagnosis_reports")
          .select("*")
          .eq("patient_id", patientId)
          .order("generated_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn("[db.ts] Supabase getDiagnosisReports failed, falling back to localStore", err);
      }
    }
  }

  return store.getDiagnosisReports(patientId);
}

export async function saveDiagnosisReportDb(report: DiagnosisReport): Promise<DiagnosisReport> {
  const result = store.addDiagnosisReport(report);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from("diagnosis_reports").upsert(
          {
            id: report.id,
            patient_id: report.patient_id,
            generated_at: report.generated_at,
            ai_summary: report.ai_summary,
            risk_flags: report.risk_flags,
            urgency: report.urgency,
            recommended_specialties: report.recommended_specialties,
            lifestyle_recommendations: report.lifestyle_recommendations,
            symptom_input: report.symptom_input,
            reading_ids: report.reading_ids,
            model_version: report.model_version,
            reviewed_by_doctor: report.reviewed_by_doctor,
            doctor_notes: report.doctor_notes,
            reviewed_at: report.reviewed_at,
          },
          { onConflict: "id" }
        );
      } catch (err) {
        console.warn("[db.ts] Supabase saveDiagnosisReport failed to persist to Postgres", err);
      }
    }
  }

  return result;
}

export async function updateDiagnosisReportDb(
  patientId: string,
  reportId: string,
  patch: Partial<DiagnosisReport>
): Promise<DiagnosisReport | null> {
  const result = store.updateDiagnosisReport(patientId, reportId, patch);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        const updatePayload: Record<string, any> = {};
        if (patch.doctor_notes !== undefined) updatePayload.doctor_notes = patch.doctor_notes;
        if (patch.reviewed_by_doctor !== undefined) updatePayload.reviewed_by_doctor = patch.reviewed_by_doctor;
        if (patch.reviewed_at !== undefined) updatePayload.reviewed_at = patch.reviewed_at;
        if (patch.urgency !== undefined) updatePayload.urgency = patch.urgency;

        await supabase.from("diagnosis_reports").update(updatePayload).eq("id", reportId);
      } catch (err) {
        console.warn("[db.ts] Supabase updateDiagnosisReport failed to persist to Postgres", err);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Family Feed
// ---------------------------------------------------------------------------

export async function getFamilyFeedDb(patientId: string): Promise<FamilyFeedResponse | null> {
  // Use store.getFamilyFeed which aggregates current patient risk, vitals, active Rx, and alerts
  return store.getFamilyFeed(patientId);
}

// ---------------------------------------------------------------------------
// Consents & Audits
// ---------------------------------------------------------------------------

export async function getConsentsDb(patientId: string): Promise<Consent[]> {
  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("consents")
          .select("*")
          .eq("patient_id", patientId);

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn("[db.ts] Supabase getConsents failed, falling back to localStore", err);
      }
    }
  }

  return store.getConsents(patientId);
}

export async function updateConsentDb(
  patientId: string,
  category: Consent["category"],
  granted: boolean
): Promise<Consent> {
  const result = store.updateConsent(patientId, category, granted);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from("consents").upsert(
          {
            patient_id: patientId,
            category,
            granted,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "patient_id, category" }
        );
      } catch (err) {
        console.warn("[db.ts] Supabase updateConsent failed to persist to Postgres", err);
      }
    }
  }

  return result;
}

export async function getAuditLogsDb(patientId: string): Promise<AuditLog[]> {
  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn("[db.ts] Supabase getAuditLogs failed, falling back to localStore", err);
      }
    }
  }

  return store.getAuditLog(patientId);
}

export async function appendAuditLogDb(entry: AuditLog): Promise<AuditLog> {
  store.getState().auditLogs.unshift(entry);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from("audit_logs").insert({
          id: entry.id,
          patient_id: entry.patient_id,
          actor_type: entry.actor_type,
          actor_id: entry.actor_id,
          action: entry.action,
          category: entry.category,
          created_at: entry.created_at || new Date().toISOString(),
        });
      } catch (err) {
        console.warn("[db.ts] Supabase appendAuditLog failed to persist to Postgres", err);
      }
    }
  }

  return entry;
}

// ---------------------------------------------------------------------------
// Doctor Actions
// ---------------------------------------------------------------------------

export async function recordDoctorActionDb(
  patientId: string,
  type: "call" | "message" | "teleconsult",
  note?: string
): Promise<DoctorActionResponse> {
  const result = store.recordDoctorAction(patientId, type, note);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from("doctor_actions").insert({
          id: result.actionRecord.id,
          patient_id: patientId,
          doctor_id: "d1",
          type,
          note: note || null,
          created_at: result.actionRecord.timestamp,
        });
      } catch (err) {
        console.warn("[db.ts] Supabase recordDoctorAction failed to persist to Postgres", err);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Symptoms, AI QA & WhatsApp Logs
// ---------------------------------------------------------------------------

export async function saveSymptomLogDb(log: SymptomLog): Promise<SymptomLog> {
  const result = store.addSymptomLog(log);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from("symptom_logs").insert({
          id: log.id,
          patient_id: log.patient_id,
          raw_text: log.raw_text,
          language: log.language,
          extracted_symptoms: log.extracted_symptoms,
          severity_hint: log.severity_hint,
          created_at: log.created_at,
        });
      } catch (err) {
        console.warn("[db.ts] Supabase saveSymptomLog failed to persist to Postgres", err);
      }
    }
  }

  return result;
}

export async function getSymptomLogsDb(patientId: string): Promise<SymptomLog[]> {
  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("symptom_logs")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn("[db.ts] Supabase getSymptomLogs failed, falling back to localStore", err);
      }
    }
  }

  return store.getSymptomLogs(patientId);
}

export async function saveAiQaLogDb(entry: {
  id?: string;
  patient_id: string;
  question: string;
  answer: string;
  model_used: string;
  created_at?: string;
}) {
  const result = store.addAiQaLog(entry);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from("ai_qa_logs").insert({
          id: result.id,
          patient_id: result.patient_id,
          question: result.question,
          answer: result.answer,
          model_used: result.model_used,
          created_at: result.created_at,
        });
      } catch (err) {
        console.warn("[db.ts] Supabase saveAiQaLog failed to persist to Postgres", err);
      }
    }
  }

  return result;
}

export async function saveWhatsAppLogDb(entry: WhatsAppNotificationLog): Promise<WhatsAppNotificationLog> {
  const result = store.addWhatsAppLog(entry);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from("whatsapp_notifications").insert({
          id: entry.id,
          patient_id: entry.patient_id,
          recipient_phone: entry.recipient_phone,
          recipient_role: entry.recipient_role,
          event_type: entry.event_type,
          message: entry.message,
          status: entry.status,
          provider_message_id: entry.provider_message_id || null,
          created_at: entry.created_at,
        });
      } catch (err) {
        console.warn("[db.ts] Supabase saveWhatsAppLog failed to persist to Postgres", err);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Wearable Devices
// ---------------------------------------------------------------------------

export async function saveWearableDeviceDb(device: WearableDevice): Promise<WearableDevice> {
  const result = store.saveWearableDevice(device);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from("wearable_devices").upsert(
          {
            id: device.id,
            patient_id: device.patient_id,
            provider: device.provider,
            device_name: device.device_name,
            is_active: device.is_active,
            last_synced_at: device.last_synced_at,
            created_at: device.created_at,
          },
          { onConflict: "id" }
        );
      } catch (err) {
        console.warn("[db.ts] Supabase saveWearableDevice failed to persist to Postgres", err);
      }
    }
  }

  return result;
}

export async function getWearableDevicesDb(patientId: string): Promise<WearableDevice[]> {
  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("wearable_devices")
          .select("*")
          .eq("patient_id", patientId);

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn("[db.ts] Supabase getWearableDevices failed, falling back to localStore", err);
      }
    }
  }

  return store.getWearableDevices(patientId);
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export async function resetDemoStateDb(): Promise<void> {
  store.reset();

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        // Clear all operational tables in order
        const tables = [
          "whatsapp_notifications",
          "ai_qa_logs",
          "symptom_logs",
          "lifestyle_targets",
          "prescription_medicines",
          "prescriptions",
          "diagnosis_reports",
          "wearable_devices",
          "doctor_actions",
          "alerts",
          "med_logs",
          "vitals",
        ];
        for (const t of tables) {
          await supabase.from(t).delete().neq("id", "___never_match___");
        }
      } catch (err) {
        console.warn("[db.ts] Supabase resetDemoState failed to clear Postgres tables", err);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Simulation, ROI, Notifications & Alerts
// ---------------------------------------------------------------------------

export async function handleSimEventDb(req: SimEventRequest): Promise<SimEventResponse> {
  const result = store.handleSimEvent(req);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        const pVitals = store.getState().vitals.filter((v) => v.patient_id === req.patientId).slice(0, 5);
        if (pVitals.length > 0) {
          await supabase.from("vitals").upsert(
            pVitals.map((v) => ({
              id: v.id,
              patient_id: v.patient_id,
              type: v.type,
              value_a: v.value_a,
              value_b: v.value_b ?? null,
              recorded_at: v.recorded_at,
              source: v.source || "simulator",
              device_id: v.device_id || null,
            })),
            { onConflict: "id" }
          );
        }

        const pAlerts = store.getState().alerts.filter((a) => a.patient_id === req.patientId).slice(0, 3);
        if (pAlerts.length > 0) {
          await supabase.from("alerts").upsert(
            pAlerts.map((a) => ({
              id: a.id,
              patient_id: a.patient_id,
              level: a.level,
              audience: a.audience,
              message: a.message,
              created_at: a.created_at,
              acknowledged_at: a.acknowledged_at,
            })),
            { onConflict: "id" }
          );
        }
      } catch (err) {
        console.warn("[db.ts] Supabase handleSimEvent failed to mirror to Postgres", err);
      }
    }
  }

  return result;
}

export async function getAdminRoiDb(): Promise<AdminROIResponse> {
  return store.getAdminROI();
}

export async function getWhatsAppLogsDb(patientId?: string): Promise<WhatsAppNotificationLog[]> {
  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        let query = supabase
          .from("whatsapp_notifications")
          .select("*")
          .order("created_at", { ascending: false });
        if (patientId) {
          query = query.eq("patient_id", patientId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn("[db.ts] Supabase getWhatsAppLogs failed, falling back to localStore", err);
      }
    }
  }

  return store.getWhatsAppLogs(patientId);
}

export async function getAiQaLogsDb(patientId?: string): Promise<any[]> {
  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        let query = supabase
          .from("ai_qa_logs")
          .select("*")
          .order("created_at", { ascending: false });
        if (patientId) {
          query = query.eq("patient_id", patientId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn("[db.ts] Supabase getAiQaLogs failed, falling back to localStore", err);
      }
    }
  }

  const logs = store.getState().aiQaLogs || [];
  return patientId ? logs.filter((l) => l.patient_id === patientId) : logs;
}

export async function createAlertDb(alert: Alert): Promise<Alert> {
  store.getState().alerts.unshift(alert);

  if (!isLocalOnly()) {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from("alerts").insert({
          id: alert.id,
          patient_id: alert.patient_id,
          level: alert.level,
          audience: alert.audience,
          message: alert.message,
          created_at: alert.created_at,
          acknowledged_at: alert.acknowledged_at,
        });
      } catch (err) {
        console.warn("[db.ts] Supabase createAlert failed to persist to Postgres", err);
      }
    }
  }

  return alert;
}

export async function getPatientRiskDb(patientId: string): Promise<any> {
  const patientDetail = await getPatientDetailDb(patientId);
  return patientDetail?.risk || store.getState().riskScores[patientId] || { score: 10, band: "green", reasons: [] };
}
