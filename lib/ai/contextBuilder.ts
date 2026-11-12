import { store } from "@/lib/supabase/localStore";
import { MOCK_PATIENT_DETAILS } from "@/lib/mockData";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildWearableContext } from "@/lib/wearable/processor";
import { AnomalyFlag, PatientDetail, WearableContext } from "@/lib/types";

export interface BriefReadingItem {
  value: string;
  at: string;
}

export interface BriefContext {
  patient: {
    id: string;
    name: string;
    age: number;
    conditions: string[];
  };
  adherence: {
    pct7d: number;
    missedStreak: number;
    reasons: string[];
  };
  wearable: {
    anomalyFlags: AnomalyFlag[];
    heartRate: {
      nocturnalMean: number;
      mean: number;
      max: number;
    };
    bloodPressure: {
      latestSystolic: number;
      latestDiastolic: number;
      avgSystolic7d: number;
      prevAvgSystolic7d: number;
      trend: "rising" | "stable" | "falling";
    };
    steps: {
      dailyMean: number;
      baseline14d: number;
      pctChangeFromBaseline: number;
    };
    glucose: {
      latestFasting: number | null;
      mean: number | null;
    };
  };
  riskScore: {
    score: number;
    band: string;
    reasons: string[];
  };
  readingIndex: Record<string, BriefReadingItem>;
}

export async function buildBriefContext(
  patientId: string,
  supabase?: SupabaseClient | null
): Promise<{ context: BriefContext; wearable: WearableContext; detail: PatientDetail }> {
  let detail = store.getPatientDetail(patientId);
  if (!detail) {
    const fallback = MOCK_PATIENT_DETAILS[patientId] || MOCK_PATIENT_DETAILS.p1;
    if (!fallback) throw new Error(`Patient ${patientId} not found`);
    detail = fallback as PatientDetail;
  }

  const wearable = await buildWearableContext(patientId, supabase, detail.vitals);

  // Calculate adherence & streak
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const recentLogs = detail.medLogs.filter((l) => {
    const time = new Date(l.scheduled_at || l.scheduledAt || 0).getTime();
    return now - time <= sevenDaysMs;
  });

  const totalLogs = recentLogs.length;
  const takenLogs = recentLogs.filter((l) => l.status === "taken").length;
  const pct7d = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 100;

  // Streak
  const sortedLogs = [...detail.medLogs].sort(
    (a, b) =>
      new Date(b.scheduled_at || b.scheduledAt || 0).getTime() -
      new Date(a.scheduled_at || a.scheduledAt || 0).getTime()
  );
  let missedStreak = 0;
  for (const log of sortedLogs) {
    if (log.status === "missed") missedStreak++;
    else if (log.status === "taken") break;
  }

  // Build readingIndex map for all vitals in the last 14 days
  const readingIndex: Record<string, BriefReadingItem> = {};
  for (const v of detail.vitals) {
    const time = v.recorded_at || v.recordedAt || new Date().toISOString();
    const valA = v.value_a ?? v.valueA ?? 0;
    const valB = v.value_b ?? v.valueB ?? null;

    let formattedValue = `${valA}`;
    if (v.type === "bp") {
      formattedValue = `${valA}/${valB || 80} mmHg`;
    } else if (v.type === "hr") {
      formattedValue = `${valA} bpm`;
    } else if (v.type === "spo2") {
      formattedValue = `${valA}% SpO2`;
    } else if (v.type === "steps") {
      formattedValue = `${valA} steps`;
    } else if (v.type === "calories") {
      formattedValue = `${valA} kcal`;
    } else if (v.type === "sleep") {
      formattedValue = `${valA} hrs`;
    } else if (v.type === "glucose") {
      formattedValue = `${valA} mg/dL`;
    }

    readingIndex[v.id] = {
      value: formattedValue,
      at: time,
    };
  }

  // Also include HR readings from wearable context
  for (const hr of wearable.heartRate.readings) {
    if (!readingIndex[hr.id]) {
      readingIndex[hr.id] = {
        value: `${hr.bpm} bpm`,
        at: hr.at,
      };
    }
  }

  const context: BriefContext = {
    patient: {
      id: detail.profile.id,
      name: detail.profile.name,
      age: detail.profile.age,
      conditions: detail.profile.conditions,
    },
    adherence: {
      pct7d,
      missedStreak,
      reasons: detail.risk.reasons.map((r) => r.text),
    },
    wearable: {
      anomalyFlags: wearable.anomalyFlags,
      heartRate: {
        nocturnalMean: wearable.heartRate.nocturnalMean,
        mean: wearable.heartRate.mean,
        max: wearable.heartRate.max,
      },
      bloodPressure: {
        latestSystolic: wearable.bloodPressure.latestSystolic,
        latestDiastolic: wearable.bloodPressure.latestDiastolic,
        avgSystolic7d: wearable.bloodPressure.avgSystolic7d,
        prevAvgSystolic7d: wearable.bloodPressure.prevAvgSystolic7d,
        trend: wearable.bloodPressure.trend,
      },
      steps: {
        dailyMean: wearable.steps.dailyMean,
        baseline14d: wearable.steps.baseline14d,
        pctChangeFromBaseline: wearable.steps.pctChangeFromBaseline,
      },
      glucose: {
        latestFasting: wearable.glucose.latestFasting,
        mean: wearable.glucose.mean,
      },
    },
    riskScore: {
      score: detail.risk.score,
      band: detail.risk.band,
      reasons: detail.risk.reasons.map((r) => r.text),
    },
    readingIndex,
  };

  return { context, wearable, detail };
}

export function parseBriefOutput(
  rawText: string,
  readingIndex: Record<string, BriefReadingItem>
): {
  sections: { sinceLastVisit: string; concerns: string; suggestedChecks: string };
  citations: { readingId: string; value: string; at: string }[];
} {
  const citationMatches = Array.from(rawText.matchAll(/Reading:([a-zA-Z0-9\-_]+)/g));
  const citations: { readingId: string; value: string; at: string }[] = [];
  const seen = new Set<string>();

  for (const match of citationMatches) {
    const readingId = match[1];
    if (readingIndex[readingId] && !seen.has(readingId)) {
      seen.add(readingId);
      citations.push({
        readingId,
        value: readingIndex[readingId].value,
        at: readingIndex[readingId].at,
      });
    }
  }

  let sinceLastVisit = "";
  let concerns = "";
  let suggestedChecks = "";

  const sinceMarker = "Since last visit:";
  const concernsMarker = "Concerns:";
  const checksMarker = "Suggested checks:";

  const sinceIdx = rawText.indexOf(sinceMarker);
  const concernsIdx = rawText.indexOf(concernsMarker);
  const checksIdx = rawText.indexOf(checksMarker);

  if (sinceIdx !== -1 && concernsIdx !== -1 && checksIdx !== -1) {
    sinceLastVisit = rawText.slice(sinceIdx + sinceMarker.length, concernsIdx).trim();
    concerns = rawText.slice(concernsIdx + concernsMarker.length, checksIdx).trim();
    suggestedChecks = rawText.slice(checksIdx + checksMarker.length).trim();
  } else {
    sinceLastVisit = rawText.slice(0, Math.min(rawText.length, 120)).trim();
    concerns = "Review patient telemetry trend and flagged anomalies.";
    suggestedChecks = "Doctor decides.";
  }

  return {
    sections: {
      sinceLastVisit,
      concerns,
      suggestedChecks,
    },
    citations,
  };
}
