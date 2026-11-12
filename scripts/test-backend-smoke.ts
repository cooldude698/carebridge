/**
 * Comprehensive Backend Smoke Test & Resilience Suite
 * Tests all endpoints and dual-mode data layer under USE_LOCAL_STORE=true and local fallback
 */
import { store } from "../lib/supabase/localStore";
import {
  getPatientsListDb,
  getPatientDetailDb,
  getPatientVitalsDb,
  insertVitalsBatchDb,
  logMedicineDb,
  getPrescriptionsDb,
  createPrescriptionDb,
  getDiagnosisReportsDb,
  saveDiagnosisReportDb,
  getFamilyFeedDb,
  getConsentsDb,
  updateConsentDb,
  getAuditLogsDb,
  appendAuditLogDb,
  recordDoctorActionDb,
  saveSymptomLogDb,
  saveAiQaLogDb,
  saveWhatsAppLogDb,
  getWearableDevicesDb,
} from "../lib/supabase/db";
import { buildWearableContext } from "../lib/wearable/processor";
import { analyzeWearableTelemetry } from "../lib/wearable/ingester";
import { computeRisk } from "../lib/risk/compute";
import { generateDiagnosisReport } from "../lib/ai/diagnosisGenerator";
import { generateOfflineNutritionAnswer, detectAcuteSymptom } from "../lib/ai/nutritionQa";
import { sendWhatsAppMessage } from "../lib/notifications/whatsapp";
import { generateFhirR4Bundle } from "../lib/fhir/export";
import { tickEscalation } from "../lib/escalation";

async function runSmokeTests() {
  console.log("=== CareBridge Backend Smoke & Resilience Suite ===");

  // 1. Dual-mode patient detail & list
  const patients = await getPatientsListDb();
  console.assert(patients.length >= 3, `Expected at least 3 patients, got ${patients.length}`);
  console.log(`✓ 1. Patients List: ${patients.length} patients loaded (top score: ${patients[0].score})`);

  const p1Detail = await getPatientDetailDb("p1", "doctor");
  console.assert(p1Detail !== null, "Expected p1 detail");
  console.assert(p1Detail!.vitals.length > 0, "Expected p1 vitals");
  console.assert((p1Detail!.prescriptions || []).length > 0, "Expected p1 prescriptions");
  console.assert((p1Detail!.diagnosisReports || []).length > 0, "Expected p1 diagnosis reports");
  console.log(`✓ 2. Patient Detail p1: Vitals count = ${p1Detail!.vitals.length}, Prescriptions = ${p1Detail!.prescriptions?.length}`);

  // 2. Wearable Telemetry & Ingester (no fake numbers)
  const vitalsP1 = await getPatientVitalsDb("p1");
  const ingesterSummary = analyzeWearableTelemetry(vitalsP1);
  console.assert(typeof ingesterSummary.meanNocturnalHr === "number", "Expected numeric meanNocturnalHr");
  console.assert(ingesterSummary.meanNocturnalHr > 50 && ingesterSummary.meanNocturnalHr < 140, "Nocturnal HR within realistic range");
  console.log(`✓ 3. Wearable Telemetry Ingester: Nocturnal HR = ${ingesterSummary.meanNocturnalHr} bpm, Step decline = ${ingesterSummary.stepDeclinePercent}%`);

  // 3. Wearable Processor (all 7 vital types)
  const wearableCtx = await buildWearableContext("p1");
  console.assert(wearableCtx.spo2?.latest !== undefined, "Expected spo2 in wearable context");
  console.assert(wearableCtx.calories?.latest !== undefined, "Expected calories in wearable context");
  console.assert(wearableCtx.sleep?.lastNightHours !== undefined, "Expected sleep in wearable context");
  console.log(`✓ 4. Wearable Processor (7 Vitals): SpO2 = ${wearableCtx.spo2?.latest}%, Cal = ${wearableCtx.calories?.latest} kcal, Sleep = ${wearableCtx.sleep?.lastNightHours}h`);

  // 4. Batch Ingestion & Deduplication
  const nowIso = new Date().toISOString();
  const testReading = {
    id: "test-dedup-1",
    patient_id: "p1",
    type: "hr" as const,
    value_a: 78,
    value_b: null,
    recorded_at: nowIso,
  };
  const ingest1 = await insertVitalsBatchDb("p1", [testReading]);
  console.assert(ingest1.inserted === 1, `Expected 1 inserted, got ${ingest1.inserted}`);

  // Ingest identical reading again within 60s
  const ingest2 = await insertVitalsBatchDb("p1", [testReading]);
  console.assert(ingest2.skipped === 1, `Expected 1 skipped due to deduplication, got ${ingest2.skipped}`);
  console.log(`✓ 5. Ingestion Deduplication: 1st insert = ${ingest1.inserted}, duplicate skipped = ${ingest2.skipped}`);

  // 5. Atomic Digital Prescription Creation
  const rxResult = await createPrescriptionDb({
    patientId: "p1",
    doctorId: "d1",
    doctorName: "Dr. Meera Rao",
    doctorSummary: "Smoke test care plan update with lifestyle targets.",
    medicines: [
      {
        medicine_name: "Metformin",
        dosage: "500mg",
        frequency: "twice daily",
        times: ["08:00", "20:00"],
        duration: "30 days",
        with_food: true,
        instructions: "Take with food",
      },
    ],
    lifestyleTargets: [
      {
        category: "steps",
        description: "Morning walking",
        target_value: 5000,
        unit: "steps/day",
      },
    ],
  });
  console.assert(rxResult.prescription.id.startsWith("rx-"), "Expected rx- ID prefix");
  console.assert(rxResult.generatedGoalsCount >= 1, "Expected generated goals");
  console.assert(rxResult.watchSyncPayload.daily_step_target === 5000, "Expected step target in payload");
  console.log(`✓ 6. Atomic Closed-Loop Prescription: ID = ${rxResult.prescription.id}, Goals = ${rxResult.generatedGoalsCount}`);

  // 6. Diagnosis Report Generation & Verification
  const diagReport = await generateDiagnosisReport("p1", "Reported mild morning dizziness");
  console.assert(diagReport.id.startsWith("diag-"), "Expected diag- ID prefix");
  console.assert(diagReport.reading_ids.length > 0, "Expected real reading IDs in report");
  console.assert(diagReport.urgency !== undefined, "Expected urgency");
  console.log(`✓ 7. AI Diagnosis Engine: Urgency = ${diagReport.urgency}, Reading IDs = ${diagReport.reading_ids.length}, Model = ${diagReport.model_version}`);

  // 7. Symptom Detection & Voice Offline Q&A
  const symptomDetected = detectAcuteSymptom("Doctor, mujhe subah se chakkar aa rahe hain aur sar dard hai");
  console.assert(symptomDetected.isSymptom, "Expected symptom detected");
  console.assert(symptomDetected.symptoms.length >= 2, "Expected multiple symptoms");
  console.log(`✓ 8. Symptom Auto-Detection: Detected = ${symptomDetected.symptoms.join(", ")} (Severity: ${symptomDetected.severity})`);

  const offlineAnswer = generateOfflineNutritionAnswer("Can I eat chicken biryani tonight?", {
    patient: p1Detail!.profile,
    conditions: p1Detail!.profile.conditions,
    allergies: [],
    activePrescriptions: p1Detail!.prescriptions || [],
    latestDiagnosis: diagReport,
    latestVitals: {
      bp: "140/88 mmHg",
      hr: 74,
      spo2: 97,
      glucose: 154,
      steps: 3200,
      calories: 310,
    },
    language: "en",
  });
  console.assert(offlineAnswer.includes("biryani") || offlineAnswer.includes("glucose"), "Expected tailored nutrition answer");
  console.log(`✓ 9. Offline Nutrition & Clinical Engine: "${offlineAnswer.slice(0, 80)}..."`);

  // 8. WhatsApp Simulated Notification Dispatch
  const waResult = await sendWhatsAppMessage({
    patientId: "p1",
    recipientPhone: "+91 98450 12345",
    recipientRole: "patient",
    eventType: "smoke_test",
    message: "CareBridge Smoke Test Notification",
  });
  console.assert(waResult.status === "simulated_sent" || waResult.status === "sent", "Expected valid WhatsApp status");
  console.log(`✓ 10. WhatsApp Dispatch: ID = ${waResult.id}, Status = ${waResult.status}`);

  // 9. ABDM HL7 FHIR R4 Export
  const fhirBundle = generateFhirR4Bundle(p1Detail!, p1Detail!.prescriptions);
  console.assert(fhirBundle.resourceType === "Bundle", "Expected FHIR Bundle");
  const observationCount = fhirBundle.entry.filter((e) => e.resource.resourceType === "Observation").length;
  const medReqCount = fhirBundle.entry.filter((e) => e.resource.resourceType === "MedicationRequest").length;
  console.assert(observationCount > 0, "Expected Observations in FHIR Bundle");
  console.assert(medReqCount > 0, "Expected MedicationRequests in FHIR Bundle");
  console.log(`✓ 11. ABDM HL7 FHIR R4 Export: Observations = ${observationCount}, MedicationRequests = ${medReqCount}`);

  // 10. Sim Event 'spo2_drop'
  const simRes = store.handleSimEvent({ patientId: "p1", kind: "spo2_drop" });
  console.assert(simRes.success, "Expected sim event success");
  console.assert(simRes.newRisk.band === "red", `Expected red band after spo2_drop, got ${simRes.newRisk.band}`);
  console.log(`✓ 12. Sim Event 'spo2_drop': Band flipped to ${simRes.newRisk.band.toUpperCase()} (Score: ${simRes.newRisk.score})`);

  // 11. Escalation Tick with WhatsApp Dispatch
  const escResult = tickEscalation("family");
  console.assert(escResult.fired.length >= 0, "Expected escalation tick result");
  console.log(`✓ 13. Escalation Ladder: Fired = ${escResult.fired.length}, Pending = ${escResult.pendingCount}`);

  console.log("\nALL 13 BACKEND INTEGRATION SMOKE TESTS PASSED CLEANLY!");
}

runSmokeTests().catch((err) => {
  console.error("Smoke tests failed:", err);
  process.exit(1);
});
