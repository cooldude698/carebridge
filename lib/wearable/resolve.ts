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
        mean: 74,
        nocturnalMean: 72,
        max: 96,
        readings: [],
      },
      bloodPressure: {
        latestSystolic: 140,
        latestDiastolic: 88,
        avgSystolic7d: 140,
        prevAvgSystolic7d: 127,
        trend: "rising",
      },
      steps: {
        dailyMean: 2800,
        baseline14d: 5400,
        pctChangeFromBaseline: -48,
      },
      glucose: {
        latestFasting: 155,
        mean: 144,
      },
      spo2: {
        latest: 97,
        min24h: 96,
        readings: [],
      },
      calories: {
        dailyMean: 325,
        latest: 310,
      },
      sleep: {
        lastNightHours: 6.8,
        avg7dHours: 6.7,
      },
      anomalyFlags: [
        {
          ruleId: "STEPS_DECLINE",
          severity: "MEDIUM",
          title: "Activity decline",
          detail: "Daily steps down 48% from 14-day baseline (2,800 vs 5,400).",
          readingId: "p1-steps-1",
        },
        {
          ruleId: "BP_TREND_UP",
          severity: "MEDIUM",
          title: "Blood pressure trending up",
          detail: "Avg systolic up +10% vs prior 7 days (140 vs 127 mmHg).",
          readingId: "p1-bp-1",
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

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
    spo2: {
      latest: 98,
      min24h: 97,
      readings: [],
    },
    calories: {
      dailyMean: 390,
      latest: 410,
    },
    sleep: {
      lastNightHours: 7.2,
      avg7dHours: 7.1,
    },
    anomalyFlags: [],
    lastUpdated: new Date().toISOString(),
  };
}
