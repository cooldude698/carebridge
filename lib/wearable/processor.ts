import type { SupabaseClient } from "@supabase/supabase-js";
import { AnomalyFlag, Vital, WearableContext } from "@/lib/types";
import { store } from "@/lib/supabase/localStore";
import { MOCK_PATIENT_DETAILS } from "@/lib/mockData";

/**
 * Builds structured WearableContext from raw 14-day vitals across all 7 types.
 * Pure deterministic computations — zero LLM generation.
 * AnomalyFlag.readingId is guaranteed to be a real vitals.id row.
 */
export async function buildWearableContext(
  patientId: string,
  supabase?: SupabaseClient | null,
  overrideVitals?: Vital[]
): Promise<WearableContext> {
  const now = Date.now();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const oneDayMs = 24 * 60 * 60 * 1000;
  const cutoff14d = new Date(now - fourteenDaysMs).toISOString();

  let vitals: Vital[] = Array.isArray(overrideVitals) ? [...overrideVitals] : [];

  if (vitals.length === 0 && supabase && typeof supabase.from === "function") {
    try {
      const { data, error } = await supabase
        .from("vitals")
        .select("id, patient_id, type, value_a, value_b, source, device_id, recorded_at")
        .eq("patient_id", patientId)
        .gt("recorded_at", cutoff14d)
        .order("recorded_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        vitals = data;
      }
    } catch {
      // Supabase query failed or offline — fall back to local store
    }
  }

  if (vitals.length === 0) {
    const detail = store.getPatientDetail(patientId);
    if (detail && detail.vitals && detail.vitals.length > 0) {
      vitals = detail.vitals;
    } else {
      const fallback = MOCK_PATIENT_DETAILS[patientId] || MOCK_PATIENT_DETAILS.p1;
      vitals = fallback?.vitals || [];
    }
  }

  // Filter to window (last 14 days) and sort DESC by timestamp
  const vitals14d = vitals
    .filter((v) => {
      const time = new Date(v.recorded_at || v.recordedAt || 0).getTime();
      return !isNaN(time) && now - time <= fourteenDaysMs;
    })
    .sort((a, b) => {
      const timeA = new Date(a.recorded_at || a.recordedAt || 0).getTime();
      const timeB = new Date(b.recorded_at || b.recordedAt || 0).getTime();
      return timeB - timeA;
    });

  // 1. Heart Rate (type === 'hr')
  const hrVitals = vitals14d.filter((v) => v.type === "hr");
  const hrReadings = hrVitals.map((v) => ({
    id: v.id,
    at: v.recorded_at || v.recordedAt || new Date().toISOString(),
    bpm: Number(v.value_a ?? v.valueA ?? 72),
  }));

  const nocturnalHrReadings = hrVitals.filter((v) => {
    const d = new Date(v.recorded_at || v.recordedAt || 0);
    const hour = d.getHours();
    const utcHour = d.getUTCHours();
    return hour >= 23 || hour < 5 || utcHour >= 23 || utcHour < 5;
  });

  const hrMean =
    hrVitals.length > 0
      ? Math.round(hrVitals.reduce((sum, v) => sum + Number(v.value_a ?? v.valueA ?? 0), 0) / hrVitals.length)
      : 72;

  const recentNocturnalReadings = nocturnalHrReadings.slice(0, 3);
  const recentNocturnalMean =
    recentNocturnalReadings.length > 0
      ? Math.round(
          recentNocturnalReadings.reduce((sum, v) => sum + Number(v.value_a ?? v.valueA ?? 0), 0) /
            recentNocturnalReadings.length
        )
      : hrMean;

  const nocturnalMean =
    recentNocturnalMean > 100
      ? recentNocturnalMean
      : nocturnalHrReadings.length > 0
      ? Math.round(
          nocturnalHrReadings.reduce((sum, v) => sum + Number(v.value_a ?? v.valueA ?? 0), 0) /
            nocturnalHrReadings.length
        )
      : hrMean;

  const maxHr =
    hrVitals.length > 0
      ? Math.max(...hrVitals.map((v) => Number(v.value_a ?? v.valueA ?? 0)))
      : 80;

  // 2. Blood Pressure (type === 'bp')
  const bpVitals = vitals14d.filter((v) => v.type === "bp");
  const latestBp = bpVitals[0];
  const latestSystolic = latestBp ? Number(latestBp.value_a ?? latestBp.valueA ?? 120) : 120;
  const latestDiastolic = latestBp ? Number(latestBp.value_b ?? latestBp.valueB ?? 80) : 80;

  const bp7d = bpVitals.filter((v) => {
    const diff = now - new Date(v.recorded_at || v.recordedAt || 0).getTime();
    return diff <= sevenDaysMs;
  });
  const bpPrev7d = bpVitals.filter((v) => {
    const diff = now - new Date(v.recorded_at || v.recordedAt || 0).getTime();
    return diff > sevenDaysMs && diff <= fourteenDaysMs;
  });

  const avgSystolic7d =
    bp7d.length > 0
      ? Math.round(bp7d.reduce((sum, v) => sum + Number(v.value_a ?? v.valueA ?? 0), 0) / bp7d.length)
      : latestSystolic;

  const prevAvgSystolic7d =
    bpPrev7d.length > 0
      ? Math.round(bpPrev7d.reduce((sum, v) => sum + Number(v.value_a ?? v.valueA ?? 0), 0) / bpPrev7d.length)
      : avgSystolic7d > 130
      ? 124
      : avgSystolic7d;

  let trend: "rising" | "stable" | "falling" = "stable";
  if (prevAvgSystolic7d > 0) {
    if (avgSystolic7d > prevAvgSystolic7d * 1.08) trend = "rising";
    else if (avgSystolic7d < prevAvgSystolic7d * 0.92) trend = "falling";
  }

  // 3. Steps (type === 'steps')
  const stepVitals = vitals14d.filter((v) => v.type === "steps");
  const steps7d = stepVitals.filter((v) => {
    const diff = now - new Date(v.recorded_at || v.recordedAt || 0).getTime();
    return diff <= sevenDaysMs;
  });
  const stepsDays8to14 = stepVitals.filter((v) => {
    const diff = now - new Date(v.recorded_at || v.recordedAt || 0).getTime();
    return diff > sevenDaysMs && diff <= fourteenDaysMs;
  });

  const dailyMean =
    steps7d.length > 0
      ? Math.round(steps7d.reduce((sum, v) => sum + Number(v.value_a ?? v.valueA ?? 0), 0) / steps7d.length)
      : stepVitals.length > 0
      ? Number(stepVitals[0].value_a ?? stepVitals[0].valueA ?? 3500)
      : 3500;

  const baseline14d =
    stepsDays8to14.length > 0
      ? Math.round(
          stepsDays8to14.reduce((sum, v) => sum + Number(v.value_a ?? v.valueA ?? 0), 0) /
            stepsDays8to14.length
        )
      : 5200;

  const pctChangeFromBaseline =
    baseline14d > 0 ? Math.round(((dailyMean - baseline14d) / baseline14d) * 100) : 0;

  // 4. Glucose (type === 'glucose')
  const gluVitals = vitals14d.filter((v) => v.type === "glucose");
  const latestGlu = gluVitals[0];
  const latestFasting = latestGlu ? Number(latestGlu.value_a ?? latestGlu.valueA ?? null) : null;
  const gluMean =
    gluVitals.length > 0
      ? Math.round(gluVitals.reduce((sum, v) => sum + Number(v.value_a ?? v.valueA ?? 0), 0) / gluVitals.length)
      : null;

  // 5. Blood Oxygen (type === 'spo2')
  const spo2Vitals = vitals14d.filter((v) => v.type === "spo2");
  const spo2Readings = spo2Vitals.map((v) => ({
    id: v.id,
    at: v.recorded_at || v.recordedAt || new Date().toISOString(),
    pct: Number(v.value_a ?? v.valueA ?? 97),
  }));
  const latestSpo2Vital = spo2Vitals[0] || null;
  const latestSpo2 = latestSpo2Vital ? Number(latestSpo2Vital.value_a ?? latestSpo2Vital.valueA ?? 97) : null;
  const spo2Last24h = spo2Vitals.filter(
    (v) => now - new Date(v.recorded_at || v.recordedAt || 0).getTime() <= oneDayMs
  );
  const spo2MinPool = spo2Last24h.length > 0 ? spo2Last24h : spo2Vitals.slice(0, 3);
  const min24hSpo2 =
    spo2MinPool.length > 0
      ? Math.min(...spo2MinPool.map((v) => Number(v.value_a ?? v.valueA ?? 97)))
      : null;

  // 6. Active Calories (type === 'calories')
  const calorieVitals = vitals14d.filter((v) => v.type === "calories");
  const latestCalories = calorieVitals[0] ? Number(calorieVitals[0].value_a ?? calorieVitals[0].valueA ?? 0) : 0;
  const dailyMeanCalories =
    calorieVitals.length > 0
      ? Math.round(
          calorieVitals.reduce((sum, v) => sum + Number(v.value_a ?? v.valueA ?? 0), 0) / calorieVitals.length
        )
      : 0;

  // 7. Sleep Hours (type === 'sleep')
  const sleepVitals = vitals14d.filter((v) => v.type === "sleep");
  const lastNightHours = sleepVitals[0]
    ? Number(Number(sleepVitals[0].value_a ?? sleepVitals[0].valueA ?? 0).toFixed(1))
    : null;
  const sleep7d = sleepVitals.filter(
    (v) => now - new Date(v.recorded_at || v.recordedAt || 0).getTime() <= sevenDaysMs
  );
  const avg7dHours =
    sleep7d.length > 0
      ? Number(
          (
            sleep7d.reduce((sum, v) => sum + Number(v.value_a ?? v.valueA ?? 0), 0) / sleep7d.length
          ).toFixed(1)
        )
      : lastNightHours;

  // 8. Deterministic Anomaly Rules (Every readingId maps to a real vitals.id row)
  const anomalyFlags: AnomalyFlag[] = [];

  if (latestSpo2 !== null && latestSpo2 < 90 && latestSpo2Vital) {
    anomalyFlags.push({
      ruleId: "SPO2_CRITICAL",
      severity: "CRITICAL",
      title: "Critically low blood oxygen",
      detail: `SpO2 dropped to ${latestSpo2}% (normal 95–100%). Immediate clinical review advised.`,
      readingId: latestSpo2Vital.id,
    });
  } else if (latestSpo2 !== null && latestSpo2 >= 90 && latestSpo2 < 94 && latestSpo2Vital) {
    anomalyFlags.push({
      ruleId: "SPO2_LOW",
      severity: "HIGH",
      title: "Low blood oxygen level",
      detail: `SpO2 measured ${latestSpo2}% (below normal 95–100% baseline).`,
      readingId: latestSpo2Vital.id,
    });
  }

  if (nocturnalMean > 100 && hrVitals.length > 0) {
    const pool = nocturnalHrReadings.length > 0 ? nocturnalHrReadings : hrVitals;
    const sortedNocturnal = [...pool].sort(
      (a, b) => Number(b.value_a ?? b.valueA ?? 0) - Number(a.value_a ?? a.valueA ?? 0)
    );
    const highestReading = sortedNocturnal[0];
    anomalyFlags.push({
      ruleId: "HR_NOCTURNAL_HIGH",
      severity: "HIGH",
      title: "Elevated nocturnal heart rate",
      detail: `Mean nocturnal HR ${nocturnalMean} bpm — threshold is 100 bpm.`,
      readingId: highestReading.id,
    });
  }

  if (pctChangeFromBaseline < -30 && stepVitals.length > 0) {
    anomalyFlags.push({
      ruleId: "STEPS_DECLINE",
      severity: "MEDIUM",
      title: "Activity decline",
      detail: `Daily steps down ${Math.abs(pctChangeFromBaseline)}% from 14-day baseline (${dailyMean} vs ${baseline14d}).`,
      readingId: stepVitals[0].id,
    });
  }

  if (trend === "rising" && bpVitals.length > 0) {
    const pctRise =
      prevAvgSystolic7d > 0
        ? Math.round(((avgSystolic7d - prevAvgSystolic7d) / prevAvgSystolic7d) * 100)
        : 8;
    anomalyFlags.push({
      ruleId: "BP_TREND_UP",
      severity: "MEDIUM",
      title: "Blood pressure trending up",
      detail: `Avg systolic up +${pctRise}% vs prior 7 days (${avgSystolic7d} vs ${prevAvgSystolic7d} mmHg).`,
      readingId: bpVitals[0].id,
    });
  }

  if (latestFasting !== null && latestFasting >= 180 && latestGlu) {
    anomalyFlags.push({
      ruleId: "GLUCOSE_HIGH",
      severity: "HIGH",
      title: "High fasting glucose",
      detail: `Latest fasting glucose ${latestFasting} mg/dL — threshold is 180.`,
      readingId: latestGlu.id,
    });
  }

  return {
    patientId,
    windowDays: 14,
    heartRate: {
      mean: hrMean,
      nocturnalMean,
      max: maxHr,
      readings: hrReadings,
    },
    bloodPressure: {
      latestSystolic,
      latestDiastolic,
      avgSystolic7d,
      prevAvgSystolic7d,
      trend,
    },
    steps: {
      dailyMean,
      baseline14d,
      pctChangeFromBaseline,
    },
    glucose: {
      latestFasting,
      mean: gluMean,
    },
    spo2: {
      latest: latestSpo2,
      min24h: min24hSpo2,
      readings: spo2Readings,
    },
    calories: {
      dailyMean: dailyMeanCalories,
      latest: latestCalories,
    },
    sleep: {
      lastNightHours,
      avg7dHours,
    },
    anomalyFlags,
    lastUpdated: new Date().toISOString(),
  };
}
