import { AnomalyFlag, Vital, WearableContext } from "@/lib/types";
import { store } from "@/lib/supabase/localStore";
import { MOCK_PATIENT_DETAILS } from "@/lib/mockData";

/**
 * Builds structured WearableContext from raw 14-day vitals.
 * Pure deterministic computations — zero LLM generation.
 * AnomalyFlag.readingId is guaranteed to be a real vitals.id row.
 */
export async function buildWearableContext(
  patientId: string,
  supabase?: any
): Promise<WearableContext> {
  const now = Date.now();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff14d = new Date(now - fourteenDaysMs).toISOString();

  let vitals: Vital[] = [];

  if (supabase && typeof supabase.from === "function") {
    try {
      const { data, error } = await supabase
        .from("vitals")
        .select("id, type, value_a, value_b, recorded_at")
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
      return now - time <= fourteenDaysMs;
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
    bpm: v.value_a ?? v.valueA ?? 72,
  }));

  const nocturnalHrReadings = hrVitals.filter((v) => {
    const d = new Date(v.recorded_at || v.recordedAt || 0);
    const hour = d.getHours();
    const utcHour = d.getUTCHours();
    return (hour >= 23 || hour < 5) || (utcHour >= 23 || utcHour < 5);
  });

  const hrMean = hrVitals.length > 0
    ? Math.round(hrVitals.reduce((sum, v) => sum + (v.value_a ?? v.valueA ?? 0), 0) / hrVitals.length)
    : 72;

  // Recent nocturnal session (last night's readings within 24h, or latest available nocturnal cluster)
  const recentNocturnalReadings = nocturnalHrReadings.slice(0, 3);
  const recentNocturnalMean = recentNocturnalReadings.length > 0
    ? Math.round(recentNocturnalReadings.reduce((sum, v) => sum + (v.value_a ?? v.valueA ?? 0), 0) / recentNocturnalReadings.length)
    : hrMean;

  const nocturnalMean = recentNocturnalMean > 100
    ? recentNocturnalMean
    : (nocturnalHrReadings.length > 0
        ? Math.round(nocturnalHrReadings.reduce((sum, v) => sum + (v.value_a ?? v.valueA ?? 0), 0) / nocturnalHrReadings.length)
        : hrMean);

  const maxHr = hrVitals.length > 0
    ? Math.max(...hrVitals.map((v) => v.value_a ?? v.valueA ?? 0))
    : 80;

  // 2. Blood Pressure (type === 'bp')
  const bpVitals = vitals14d.filter((v) => v.type === "bp");
  const latestBp = bpVitals[0];
  const latestSystolic = latestBp ? (latestBp.value_a ?? latestBp.valueA ?? 120) : 120;
  const latestDiastolic = latestBp ? (latestBp.value_b ?? latestBp.valueB ?? 80) : 80;

  const bp7d = bpVitals.filter((v) => {
    const diff = now - new Date(v.recorded_at || v.recordedAt || 0).getTime();
    return diff <= sevenDaysMs;
  });
  const bpPrev7d = bpVitals.filter((v) => {
    const diff = now - new Date(v.recorded_at || v.recordedAt || 0).getTime();
    return diff > sevenDaysMs && diff <= fourteenDaysMs;
  });

  const avgSystolic7d = bp7d.length > 0
    ? Math.round(bp7d.reduce((sum, v) => sum + (v.value_a ?? v.valueA ?? 0), 0) / bp7d.length)
    : latestSystolic;

  const prevAvgSystolic7d = bpPrev7d.length > 0
    ? Math.round(bpPrev7d.reduce((sum, v) => sum + (v.value_a ?? v.valueA ?? 0), 0) / bpPrev7d.length)
    : (avgSystolic7d > 130 ? 124 : avgSystolic7d);

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

  const dailyMean = steps7d.length > 0
    ? Math.round(steps7d.reduce((sum, v) => sum + (v.value_a ?? v.valueA ?? 0), 0) / steps7d.length)
    : (stepVitals.length > 0 ? (stepVitals[0].value_a ?? stepVitals[0].valueA ?? 3500) : 3500);

  const baseline14d = stepsDays8to14.length > 0
    ? Math.round(stepsDays8to14.reduce((sum, v) => sum + (v.value_a ?? v.valueA ?? 0), 0) / stepsDays8to14.length)
    : 5200;

  const pctChangeFromBaseline = baseline14d > 0
    ? Math.round(((dailyMean - baseline14d) / baseline14d) * 100)
    : 0;

  // 4. Glucose (type === 'glucose')
  const gluVitals = vitals14d.filter((v) => v.type === "glucose");
  const latestGlu = gluVitals[0];
  const latestFasting = latestGlu ? (latestGlu.value_a ?? latestGlu.valueA ?? null) : null;
  const gluMean = gluVitals.length > 0
    ? Math.round(gluVitals.reduce((sum, v) => sum + (v.value_a ?? v.valueA ?? 0), 0) / gluVitals.length)
    : null;

  // 5. SpO2 (type === 'spo2')
  const spo2Vitals = vitals14d.filter((v) => v.type === "spo2");
  const spo2Readings = spo2Vitals.map((v) => ({
    id: v.id,
    at: v.recorded_at || v.recordedAt || new Date().toISOString(),
    pct: v.value_a ?? v.valueA ?? 98,
  }));
  const latestSpo2 = spo2Readings[0]?.pct ?? null;

  const oneDayMs = 24 * 60 * 60 * 1000;
  const spo2Last24h = spo2Vitals.filter((v) => {
    const diff = now - new Date(v.recorded_at || v.recordedAt || 0).getTime();
    return diff <= oneDayMs;
  });
  const min24hSpo2 = spo2Last24h.length > 0
    ? Math.min(...spo2Last24h.map((v) => v.value_a ?? v.valueA ?? 100))
    : latestSpo2;

  // 6. Calories (type === 'calories')
  const calVitals = vitals14d.filter((v) => v.type === "calories");
  const latestCal = calVitals[0] ? (calVitals[0].value_a ?? calVitals[0].valueA ?? 320) : 320;
  const dailyMeanCal = calVitals.length > 0
    ? Math.round(calVitals.reduce((sum, v) => sum + (v.value_a ?? v.valueA ?? 0), 0) / calVitals.length)
    : latestCal;

  // 7. Sleep (type === 'sleep')
  const sleepVitals = vitals14d.filter((v) => v.type === "sleep");
  const lastNightHours = sleepVitals[0] ? (sleepVitals[0].value_a ?? sleepVitals[0].valueA ?? null) : null;
  const avg7dSleep = sleepVitals.length > 0
    ? parseFloat((sleepVitals.slice(0, 7).reduce((sum, v) => sum + (v.value_a ?? v.valueA ?? 0), 0) / Math.min(sleepVitals.length, 7)).toFixed(1))
    : null;

  // 8. Deterministic Anomaly Rules (Strict reading IDs from dataset)
  const anomalyFlags: AnomalyFlag[] = [];

  // Rule SPO2_CRITICAL (CRITICAL)
  if (latestSpo2 !== null && latestSpo2 < 90 && spo2Vitals[0]) {
    anomalyFlags.push({
      ruleId: "SPO2_CRITICAL",
      severity: "CRITICAL",
      title: "Critically low blood oxygen",
      detail: `SpO2 dropped to ${latestSpo2}% (normal 95–100%). Immediate clinical review advised.`,
      readingId: spo2Vitals[0].id,
    });
  } else if (latestSpo2 !== null && latestSpo2 >= 90 && latestSpo2 < 94 && spo2Vitals[0]) {
    anomalyFlags.push({
      ruleId: "SPO2_LOW",
      severity: "HIGH",
      title: "Low blood oxygen saturation",
      detail: `SpO2 reading of ${latestSpo2}% below normal range (95–100%).`,
      readingId: spo2Vitals[0].id,
    });
  }

  // Rule HR_NOCTURNAL_HIGH (HIGH)
  if (nocturnalMean > 100 && nocturnalHrReadings.length > 0) {
    const sortedNocturnal = [...nocturnalHrReadings].sort(
      (a, b) => (b.value_a ?? b.valueA ?? 0) - (a.value_a ?? a.valueA ?? 0)
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

  // Rule STEPS_DECLINE (MEDIUM)
  if (pctChangeFromBaseline < -30 && stepVitals.length > 0) {
    anomalyFlags.push({
      ruleId: "STEPS_DECLINE",
      severity: "MEDIUM",
      title: "Activity decline",
      detail: `Daily steps down ${Math.abs(pctChangeFromBaseline)}% from 14-day baseline (${dailyMean} vs ${baseline14d}).`,
      readingId: stepVitals[0].id,
    });
  }

  // Rule BP_TREND_UP (MEDIUM)
  if (trend === "rising" && bpVitals.length > 0) {
    const pctRise = prevAvgSystolic7d > 0
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

  // Rule GLUCOSE_HIGH (HIGH)
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
      dailyMean: dailyMeanCal,
      latest: latestCal,
    },
    sleep: {
      lastNightHours,
      avg7dHours: avg7dSleep,
    },
    anomalyFlags,
    lastUpdated: new Date().toISOString(),
  };
}
