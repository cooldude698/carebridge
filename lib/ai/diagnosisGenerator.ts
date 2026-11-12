import { DiagnosisReport, RiskFlag, PatientDetail } from "@/lib/types";
import { buildWearableContext } from "@/lib/wearable/processor";
import { callLlmChat, extractJsonObject } from "./llmClient";
import { getPatientDetailDb, getSymptomLogsDb } from "@/lib/supabase/db";

const DIAGNOSIS_SYSTEM_PROMPT = `You are a clinical decision-support system assisting physicians with outpatient smartwatch telemetry.
Analyze the patient's wearable vitals, risk flags, active medicines, and voice-reported symptoms.
Return ONLY valid JSON matching this exact structure (no markdown fences):
{
  "aiSummary": "Concise 2-3 sentence clinical synthesis grounded ONLY in provided numbers.",
  "urgency": "routine | soon | urgent | emergency",
  "recommendedSpecialties": ["Specialty 1"],
  "lifestyleRecommendations": ["Actionable lifestyle or diet target 1", "Actionable target 2"]
}`;

export async function synthesizeDiagnosisReport(
  patientId: string,
  symptomNote?: string | null
): Promise<DiagnosisReport> {
  const detail: PatientDetail | null = await getPatientDetailDb(patientId, "doctor");
  if (!detail) {
    throw new Error(`Patient ${patientId} not found`);
  }

  const wearable = detail.wearable || (await buildWearableContext(patientId, null, detail.vitals));
  const symptoms = await getSymptomLogsDb(patientId);

  const riskFlags: RiskFlag[] = [];
  const readingIds: string[] = [];

  for (const flag of wearable.anomalyFlags) {
    if (flag.readingId) readingIds.push(flag.readingId);
    const sevMap: Record<string, RiskFlag["severity"]> = {
      CRITICAL: "critical",
      HIGH: "high",
      MEDIUM: "medium",
      LOW: "low",
    };
    riskFlags.push({
      type: flag.ruleId.toLowerCase(),
      severity: sevMap[flag.severity] || "medium",
      value: flag.title,
      normalRange:
        flag.ruleId.includes("SPO2")
          ? "95–100%"
          : flag.ruleId.includes("HR")
          ? "60–100 bpm"
          : flag.ruleId.includes("BP")
          ? "<130/80 mmHg"
          : flag.ruleId.includes("GLUCOSE")
          ? "<140 mg/dL"
          : ">=4,500 steps/day",
      message: flag.detail,
      readingId: flag.readingId,
    });
  }

  // Bind latest vital IDs so reading_ids is always grounded in real rows
  for (const v of detail.vitals.slice(0, 6)) {
    if (!readingIds.includes(v.id)) {
      readingIds.push(v.id);
    }
  }

  const hasCritical = wearable.anomalyFlags.some((f) => f.severity === "CRITICAL");
  const hasHigh = wearable.anomalyFlags.some((f) => f.severity === "HIGH");
  const defaultUrgency: DiagnosisReport["urgency"] = hasCritical
    ? "emergency"
    : detail.risk.band === "red" || hasHigh
    ? "urgent"
    : detail.risk.band === "yellow"
    ? "soon"
    : "routine";

  const contextPayload = {
    patient: {
      name: detail.profile.name,
      age: detail.profile.age,
      conditions: detail.profile.conditions,
    },
    risk: detail.risk,
    wearableSummary: {
      spo2Latest: wearable.spo2.latest,
      nocturnalHrMean: wearable.heartRate.nocturnalMean,
      bpLatest: `${wearable.bloodPressure.latestSystolic}/${wearable.bloodPressure.latestDiastolic}`,
      stepsMean: wearable.steps.dailyMean,
      caloriesMean: wearable.calories.dailyMean,
      sleepAvgHours: wearable.sleep.avg7dHours,
      glucoseLatest: wearable.glucose.latestFasting,
    },
    anomalyFlags: wearable.anomalyFlags,
    recentSymptoms: [
      ...(symptomNote ? [symptomNote] : []),
      ...symptoms.slice(0, 3).map((s) => s.raw_text),
    ],
  };

  let aiSummary = "";
  let urgency: DiagnosisReport["urgency"] = defaultUrgency;
  let recommendedSpecialties = ["General Medicine"];
  let lifestyleRecommendations: string[] = [];
  let modelVersion = "deterministic-cdss-fallback";

  const llmResponse = await callLlmChat({
    messages: [
      { role: "system", content: DIAGNOSIS_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(contextPayload) },
    ],
    timeoutMs: 4500,
    temperature: 0.15,
  });

  if (llmResponse) {
    const parsed = extractJsonObject(llmResponse.text);
    if (parsed) {
      if (typeof parsed.aiSummary === "string" && parsed.aiSummary.trim().length >= 10) {
        aiSummary = parsed.aiSummary.trim();
        modelVersion = llmResponse.model;
      }
      if (
        typeof parsed.urgency === "string" &&
        ["routine", "soon", "urgent", "emergency"].includes(parsed.urgency)
      ) {
        urgency = parsed.urgency as DiagnosisReport["urgency"];
      }
      if (Array.isArray(parsed.recommendedSpecialties) && parsed.recommendedSpecialties.length > 0) {
        const cleanedSpecs = parsed.recommendedSpecialties
          .map((s) => String(s || "").trim())
          .filter(Boolean)
          .slice(0, 4);
        if (cleanedSpecs.length > 0) recommendedSpecialties = cleanedSpecs;
      }
      if (Array.isArray(parsed.lifestyleRecommendations) && parsed.lifestyleRecommendations.length > 0) {
        const cleanedRecs = parsed.lifestyleRecommendations
          .map((s) => String(s || "").trim())
          .filter(Boolean)
          .slice(0, 5);
        if (cleanedRecs.length > 0) lifestyleRecommendations = cleanedRecs;
      }
    }
  }

  if (!aiSummary) {
    const parts: string[] = [];
    if (wearable.spo2.latest !== null && wearable.spo2.latest < 94) {
      parts.push(
        `Watch pulse oximetry shows low blood oxygen (${wearable.spo2.latest}% SpO2, normal 95–100%).`
      );
    }
    if (wearable.heartRate.nocturnalMean > 100) {
      parts.push(
        `Nocturnal heart rate averaged ${wearable.heartRate.nocturnalMean} bpm (>100 bpm threshold).`
      );
    }
    parts.push(
      `Latest BP is ${wearable.bloodPressure.latestSystolic}/${wearable.bloodPressure.latestDiastolic} mmHg (${wearable.bloodPressure.trend} trend) with ${wearable.steps.dailyMean.toLocaleString()} avg daily steps.`
    );
    if (symptomNote) {
      parts.push(`Patient reported symptom note: "${symptomNote}".`);
    }
    aiSummary = parts.join(" ");
  }

  if (recommendedSpecialties.length === 1 && recommendedSpecialties[0] === "General Medicine") {
    if (wearable.spo2.latest !== null && wearable.spo2.latest < 94) {
      recommendedSpecialties.push("Pulmonology");
    }
    if (detail.profile.conditions.some((c) => c.toLowerCase().includes("diab"))) {
      recommendedSpecialties.push("Diabetology");
    }
    if (wearable.heartRate.nocturnalMean > 100 || wearable.bloodPressure.latestSystolic >= 145) {
      recommendedSpecialties.push("Cardiology");
    }
  }

  if (lifestyleRecommendations.length === 0) {
    lifestyleRecommendations = [
      wearable.spo2.latest !== null && wearable.spo2.latest < 94
        ? "Rest comfortably upright, avoid exertion, and verify blood oxygen with clinic immediately"
        : "Aim for 4,500 gentle steps/day split into morning and evening walks",
      "Target ~350 active kcal daily burn within physician-approved limits",
      "Eat low-oil, low-glycemic Indian meals with reduced salt and high fiber vegetables",
    ];
  }

  return {
    id: `diag-${Date.now()}`,
    patient_id: patientId,
    generated_at: new Date().toISOString(),
    ai_summary: aiSummary,
    risk_flags: riskFlags,
    urgency,
    recommended_specialties: Array.from(new Set(recommendedSpecialties)),
    lifestyle_recommendations: lifestyleRecommendations,
    symptom_input: symptomNote || null,
    reading_ids: readingIds,
    model_version: modelVersion,
    reviewed_by_doctor: null,
    doctor_notes: null,
    reviewed_at: null,
  };
}

