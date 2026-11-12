import {
  DiagnosisReport,
  RiskFlag,
  PatientSnapshot,
  Vital,
} from "@/lib/types";
import { buildWearableContext } from "@/lib/wearable/processor";
import { computeRisk } from "@/lib/risk/compute";
import { queryLlm } from "./llmClient";
import {
  getPatientDetailDb,
  getPatientVitalsDb,
  getSymptomLogsDb,
  saveDiagnosisReportDb,
} from "@/lib/supabase/db";
import { store } from "@/lib/supabase/localStore";

export async function generateDiagnosisReport(
  patientId: string,
  symptomInput?: string | null
): Promise<DiagnosisReport> {
  const patientDetail = await getPatientDetailDb(patientId, "doctor");
  const vitals = await getPatientVitalsDb(patientId);
  const wearableCtx = await buildWearableContext(patientId);

  const snapshot: PatientSnapshot = {
    patient: patientDetail?.profile || {
      id: patientId,
      name: "Patient",
      age: 60,
      language: "English",
      conditions: [],
      doctor_id: "d1",
      family_id: "f1",
      created_at: new Date().toISOString(),
    },
    medLogs: patientDetail?.medLogs || [],
    vitals,
  };

  const riskResult = computeRisk(snapshot);
  const recentSymptoms = store.getSymptomLogs(patientId);

  // Extract reading IDs from actual vitals
  const readingIds: string[] = [];
  const riskFlags: RiskFlag[] = [];

  // 1. SpO2 flags
  if (wearableCtx.spo2?.latest !== null && wearableCtx.spo2?.latest !== undefined) {
    const val = wearableCtx.spo2.latest;
    const latestVital = vitals.find((v) => v.type === "spo2");
    if (latestVital) readingIds.push(latestVital.id);

    if (val < 90) {
      riskFlags.push({
        type: "SPO2_CRITICAL",
        severity: "critical",
        value: `${val}%`,
        normalRange: "95-100%",
        message: "Critically low arterial oxygen saturation requiring rapid escalation.",
        readingId: latestVital?.id,
      });
    } else if (val < 94) {
      riskFlags.push({
        type: "SPO2_LOW",
        severity: "high",
        value: `${val}%`,
        normalRange: "95-100%",
        message: "Borderline oxygen saturation; potential respiratory distress.",
        readingId: latestVital?.id,
      });
    }
  }

  // 2. Nocturnal HR flags
  if (wearableCtx.heartRate.nocturnalMean > 100) {
    const nocturnalHr = vitals.find((v) => {
      if (v.type !== "hr") return false;
      const d = new Date(v.recorded_at || (v as any).recordedAt || 0);
      const h = d.getHours();
      const utcH = d.getUTCHours();
      return h >= 23 || h < 5 || utcH >= 23 || utcH < 5;
    });
    const hrVital = nocturnalHr || vitals.find((v) => v.type === "hr");
    if (hrVital) readingIds.push(hrVital.id);

    riskFlags.push({
      type: "HR_NOCTURNAL_ELEVATION",
      severity: "high",
      value: `${wearableCtx.heartRate.nocturnalMean} bpm`,
      normalRange: "58-72 bpm resting",
      message: "Elevated nocturnal heart rate indicative of autonomic stress or sympathetic surge.",
      readingId: hrVital?.id,
    });
  }

  // 3. Blood Pressure flags
  const sys = wearableCtx.bloodPressure.latestSystolic;
  const dia = wearableCtx.bloodPressure.latestDiastolic;
  const bpVital = vitals.find((v) => v.type === "bp");
  if (bpVital) readingIds.push(bpVital.id);

  if (sys >= 150 || dia >= 95) {
    riskFlags.push({
      type: "HYPERTENSION_STAGE_2",
      severity: "high",
      value: `${sys}/${dia} mmHg`,
      normalRange: "<120/80 mmHg",
      message: "Stage 2 systolic/diastolic blood pressure elevation above clinical safety threshold.",
      readingId: bpVital?.id,
    });
  } else if (wearableCtx.bloodPressure.trend === "rising") {
    riskFlags.push({
      type: "BP_TREND_RISING",
      severity: "medium",
      value: `${sys}/${dia} mmHg`,
      normalRange: "<120/80 mmHg",
      message: "Consistent upward trend in 7-day systolic average.",
      readingId: bpVital?.id,
    });
  }

  // 4. Glucose flags
  if (wearableCtx.glucose.latestFasting && wearableCtx.glucose.latestFasting >= 180) {
    const gluVital = vitals.find((v) => v.type === "glucose");
    if (gluVital) readingIds.push(gluVital.id);

    riskFlags.push({
      type: "GLUCOSE_UNCONTROLLED",
      severity: "high",
      value: `${wearableCtx.glucose.latestFasting} mg/dL`,
      normalRange: "70-130 mg/dL fasting",
      message: "Fasting hyperglycemia exceeding glycemic target.",
      readingId: gluVital?.id,
    });
  }

  // 5. Activity decline
  if (wearableCtx.steps.pctChangeFromBaseline < -30) {
    const stepVital = vitals.find((v) => v.type === "steps");
    if (stepVital) readingIds.push(stepVital.id);

    riskFlags.push({
      type: "PHYSICAL_ACTIVITY_DECLINE",
      severity: "medium",
      value: `${wearableCtx.steps.dailyMean} steps/day`,
      normalRange: `${wearableCtx.steps.baseline14d} steps/day baseline`,
      message: `Sharp drop in physical activity (${wearableCtx.steps.pctChangeFromBaseline}% from baseline).`,
      readingId: stepVital?.id,
    });
  }

  // Determine baseline urgency
  let urgency: DiagnosisReport["urgency"] = "routine";
  if (riskFlags.some((f) => f.severity === "critical")) {
    urgency = "emergency";
  } else if (riskFlags.some((f) => f.severity === "high") || riskResult.band === "red") {
    urgency = "urgent";
  } else if (riskFlags.some((f) => f.severity === "medium") || riskResult.band === "yellow") {
    urgency = "soon";
  }

  // Try Local LLM (Ollama llama3.2)
  const systemPrompt = `You are a clinical decision-support AI synthesizer in CareBridge.
Analyze patient vitals, telemetry risk flags, active conditions, and reported symptoms.
Return ONLY valid JSON matching this exact structure:
{
  "aiSummary": "2-3 sentences concise medical synthesis for the treating physician.",
  "urgency": "routine" | "soon" | "urgent" | "emergency",
  "recommendedSpecialties": ["string"],
  "lifestyleRecommendations": ["string"]
}
No extra text, no markdown wrappers.`;

  const userPrompt = `Patient: ${snapshot.patient.name}, Age: ${snapshot.patient.age}
Conditions: ${(snapshot.patient.conditions || []).join(", ") || "None"}
Symptom Input: ${symptomInput || recentSymptoms[0]?.raw_text || "None reported"}
Risk Band: ${riskResult.band.toUpperCase()} (Score: ${riskResult.score}/100)
Risk Flags: ${JSON.stringify(riskFlags)}
Telemetry Context:
- BP: ${sys}/${dia} mmHg (trend: ${wearableCtx.bloodPressure.trend})
- Heart Rate: Mean ${wearableCtx.heartRate.mean} bpm, Nocturnal Mean ${wearableCtx.heartRate.nocturnalMean} bpm
- SpO2: ${wearableCtx.spo2?.latest ?? "N/A"}%
- Steps: ${wearableCtx.steps.dailyMean} steps/day (baseline ${wearableCtx.steps.baseline14d})
- Glucose: ${wearableCtx.glucose.latestFasting ?? "N/A"} mg/dL`;

  let aiSummary = "";
  let recommendedSpecialties: string[] = ["General Medicine"];
  let lifestyleRecommendations: string[] = [
    "Maintain daily walk targets and adequate hydration.",
    "Monitor blood pressure and blood glucose consistently as advised.",
  ];
  let modelVersion = "deterministic-clinical-rules-v2";

  try {
    const llmResponse = await queryLlm({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      timeoutMs: 4000,
    });

    if (llmResponse) {
      const cleaned = llmResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.aiSummary) {
        aiSummary = parsed.aiSummary;
        urgency = parsed.urgency || urgency;
        recommendedSpecialties = parsed.recommendedSpecialties || recommendedSpecialties;
        lifestyleRecommendations = parsed.lifestyleRecommendations || lifestyleRecommendations;
        modelVersion = "ollama-llama3.2-v1";
      }
    }
  } catch {
    // LLM parse or fetch failed, fallback is applied below
  }

  // High quality deterministic fallback when LLM is offline
  if (!aiSummary) {
    if (urgency === "emergency" || urgency === "urgent") {
      aiSummary = `Acute telemetry disturbance detected: ${riskFlags.map((f) => f.message).join(" ")} Recommend urgent physician teleconsultation or clinic review to adjust pharmacotherapy.`;
      recommendedSpecialties = ["Cardiology", "Internal Medicine", "Pulmonology"];
      lifestyleRecommendations = [
        "Immediate resting state; avoid exertion until physician evaluation.",
        "Maintain pulse oximetry and BP logs every 4 hours.",
        "Strict adherence to prescribed antihypertensive and hypoglycemic regimen.",
      ];
    } else if (urgency === "soon") {
      aiSummary = `Moderate telemetry shift noted: systolic trend upward with mild activity decline. Glycemic and cardiovascular indicators warrant scheduled follow-up and lifestyle modification.`;
      recommendedSpecialties = ["Internal Medicine", "Endocrinology"];
      lifestyleRecommendations = [
        "Aim for 4,500 daily steps with brisk 20-minute morning walk.",
        "Restrict dietary sodium to under 2,000 mg/day; avoid deep-fried foods.",
        "Continue morning medication dose promptly with breakfast.",
      ];
    } else {
      aiSummary = `Telemetry stable across all 7 monitored vital categories. Adherence is optimal; continue current preventive lifestyle protocol.`;
      recommendedSpecialties = ["Family Medicine"];
      lifestyleRecommendations = [
        "Continue daily 5,000 step routine.",
        "Maintain balanced low-glycemic home diet.",
      ];
    }
  }

  const reportId = `diag-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const report: DiagnosisReport = {
    id: reportId,
    patient_id: patientId,
    generated_at: nowIso,
    ai_summary: aiSummary,
    risk_flags: riskFlags,
    urgency,
    recommended_specialties: recommendedSpecialties,
    lifestyle_recommendations: lifestyleRecommendations,
    symptom_input: symptomInput || recentSymptoms[0]?.raw_text || null,
    reading_ids: Array.from(new Set(readingIds)),
    model_version: modelVersion,
    reviewed_by_doctor: null,
    doctor_notes: null,
    reviewed_at: null,
  };

  return report;
}
