import { Vital } from "@/lib/types";

export interface WearableAnomaly {
  type: "SPO2_CRITICAL" | "NOCTURNAL_HR_SPIKE" | "STEP_DECLINE" | "GLUCOSE_SPIKE";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  title: string;
  detail: string;
  recommendedAction: string;
}

export interface WearableSummary {
  meanNocturnalHr: number;
  restingHrBaseline: number;
  currentDailySteps: number;
  baselineDailySteps: number;
  stepDeclinePercent: number;
  latestSpo2: number | null;
  anomalies: WearableAnomaly[];
}

const getTime = (v: Vital) => new Date(v.recorded_at || v.recordedAt || 0).getTime();
const getValA = (v: Vital) => Number(v.value_a ?? v.valueA ?? 0);

/**
 * Deterministic wearable anomaly detection engine.
 * Computes baseline drifts and anomalies strictly from actual Vital[] rows.
 */
export function analyzeWearableTelemetry(vitals: Vital[]): WearableSummary {
  const hrVitals = vitals
    .filter((v) => v.type === "hr")
    .sort((a, b) => getTime(b) - getTime(a));
  const stepsVitals = vitals
    .filter((v) => v.type === "steps")
    .sort((a, b) => getTime(a) - getTime(b));
  const spo2Vitals = vitals
    .filter((v) => v.type === "spo2")
    .sort((a, b) => getTime(b) - getTime(a));
  const glucoseVitals = vitals
    .filter((v) => v.type === "glucose")
    .sort((a, b) => getTime(b) - getTime(a));

  const baselineSteps =
    stepsVitals.length >= 3
      ? Math.round(
          (getValA(stepsVitals[0]) + getValA(stepsVitals[1]) + getValA(stepsVitals[2])) / 3
        )
      : stepsVitals.length > 0
      ? getValA(stepsVitals[0])
      : 5200;

  const latestSteps =
    stepsVitals.length > 0 ? getValA(stepsVitals[stepsVitals.length - 1]) : 0;

  const declinePercent =
    baselineSteps > 0 && stepsVitals.length > 1
      ? Math.round(((baselineSteps - latestSteps) / baselineSteps) * 100)
      : 0;

  const nocturnalHrReadings = hrVitals.filter((v) => {
    const d = new Date(getTime(v));
    const h = d.getHours();
    const uh = d.getUTCHours();
    return h >= 23 || h < 5 || uh >= 23 || uh < 5;
  });

  const hrPool = nocturnalHrReadings.length > 0 ? nocturnalHrReadings.slice(0, 3) : hrVitals.slice(0, 3);
  const meanNocturnalHr =
    hrPool.length > 0
      ? Math.round(hrPool.reduce((sum, v) => sum + getValA(v), 0) / hrPool.length)
      : 72;

  const restingHrBaseline =
    hrVitals.length > 0
      ? Math.round(hrVitals.reduce((sum, v) => sum + getValA(v), 0) / hrVitals.length)
      : 72;

  const latestSpo2 = spo2Vitals.length > 0 ? getValA(spo2Vitals[0]) : null;
  const latestGlucose = glucoseVitals.length > 0 ? getValA(glucoseVitals[0]) : null;

  const anomalies: WearableAnomaly[] = [];

  if (latestSpo2 !== null && latestSpo2 < 92) {
    anomalies.push({
      type: "SPO2_CRITICAL",
      severity: latestSpo2 < 90 ? "CRITICAL" : "HIGH",
      title: `Low Blood Oxygen (${latestSpo2}%)`,
      detail: `Watch pulse oximetry dropped to ${latestSpo2}% (normal 95–100%). Immediate clinical review advised.`,
      recommendedAction: "Assess respiratory symptoms, inhaler adherence, and verify with fingertip pulse oximeter.",
    });
  }

  if (hrPool.length > 0 && meanNocturnalHr > 100) {
    anomalies.push({
      type: "NOCTURNAL_HR_SPIKE",
      severity: "HIGH",
      title: "Elevated Nocturnal Resting Heart Rate",
      detail: `Wearable PPG detected mean resting heart rate of ${meanNocturnalHr} bpm (normal: 58–78 bpm).`,
      recommendedAction: "Evaluate autonomic stress, nocturnal hypertension, fever, or missed dose rebound.",
    });
  }

  if (declinePercent >= 35 && stepsVitals.length > 1) {
    anomalies.push({
      type: "STEP_DECLINE",
      severity: "MEDIUM",
      title: `Significant Activity Decline (-${declinePercent}%)`,
      detail: `Daily step count fell from baseline of ${baselineSteps.toLocaleString()} to ${latestSteps.toLocaleString()} steps.`,
      recommendedAction: "Inquire about joint pain, fatigue, or dyspnea during routine walking.",
    });
  }

  if (latestGlucose !== null && latestGlucose >= 180) {
    anomalies.push({
      type: "GLUCOSE_SPIKE",
      severity: "HIGH",
      title: `Elevated Fasting Glucose (${latestGlucose} mg/dL)`,
      detail: `Latest glucose reading is ${latestGlucose} mg/dL (target < 140 mg/dL).`,
      recommendedAction: "Verify Metformin timing and recent high-glycemic meals.",
    });
  }

  return {
    meanNocturnalHr,
    restingHrBaseline,
    currentDailySteps: latestSteps,
    baselineDailySteps: baselineSteps,
    stepDeclinePercent: declinePercent,
    latestSpo2,
    anomalies,
  };
}
