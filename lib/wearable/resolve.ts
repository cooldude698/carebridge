import { WearableContext } from "@/lib/types";

export function resolveWearableContext(
  patientId: string,
  apiWearable?: WearableContext | null
): WearableContext {
  if (apiWearable) return apiWearable;

  const isRamesh = patientId === "p1" || patientId === "patient-ramesh";
  if (isRamesh) {
    return {
      patientId,
      windowDays: 14,
      heartRate: {
        mean: 78,
        nocturnalMean: 104, // > 100 bpm nocturnal spike
        max: 124,
        readings: [],
      },
      bloodPressure: {
        latestSystolic: 155,
        latestDiastolic: 95,
        avgSystolic7d: 146,
        prevAvgSystolic7d: 132,
        trend: "rising",
      },
      steps: {
        dailyMean: 2120,
        baseline14d: 4850,
        pctChangeFromBaseline: -56.3, // > -30% frailty drop
      },
      glucose: {
        latestFasting: 184, // >= 180 fasting spike
        mean: 168,
      },
      anomalyFlags: [
        {
          ruleId: "HR_NOCTURNAL_HIGH",
          severity: "HIGH",
          title: "Elevated Nocturnal Heart Rate",
          detail: "Mean nocturnal HR 104 bpm between 23:00–05:00 (threshold: 100 bpm).",
          readingId: "v-hr-spike-01",
        },
        {
          ruleId: "STEPS_FRAILTY_DROP",
          severity: "HIGH",
          title: "Critical Step Count Drop",
          detail: "Daily steps down 56.3% from 14-day baseline (threshold: > 30% drop).",
          readingId: "v-step-drop-02",
        },
        {
          ruleId: "GLUCOSE_FASTING_SPIKE",
          severity: "HIGH",
          title: "Fasting Blood Glucose Spike",
          detail: "Fasting glucose reading 184 mg/dL exceeds safety threshold (180 mg/dL).",
          readingId: "v-glu-spike-03",
        },
      ],
      lastUpdated: "Today, 06:30 AM",
    };
  }

  // Baseline stable wearable context
  return {
    patientId,
    windowDays: 14,
    heartRate: {
      mean: 72,
      nocturnalMean: 64,
      max: 98,
      readings: [],
    },
    bloodPressure: {
      latestSystolic: 122,
      latestDiastolic: 78,
      avgSystolic7d: 120,
      prevAvgSystolic7d: 122,
      trend: "stable",
    },
    steps: {
      dailyMean: 5400,
      baseline14d: 5200,
      pctChangeFromBaseline: 3.8,
    },
    glucose: {
      latestFasting: 108,
      mean: 114,
    },
    anomalyFlags: [],
    lastUpdated: "Today, 07:00 AM",
  };
}
