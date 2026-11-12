import { PatientSnapshot } from "@/lib/types";

export interface RiskRuleConfig {
  id: string;
  label: string;
  weight: number;
  evaluate: (snapshot: PatientSnapshot) => { hit: boolean; text?: string };
}

const getVitalTime = (v: { recorded_at?: string; recordedAt?: string }) =>
  new Date(v.recorded_at || v.recordedAt || 0).getTime();

const getVitalValA = (v: { value_a?: number; valueA?: number }) =>
  v.value_a ?? v.valueA ?? 0;

const getVitalValB = (v: { value_b?: number | null; valueB?: number | null }) =>
  v.value_b ?? v.valueB ?? null;

const getMedLogTime = (l: { scheduled_at?: string; scheduledAt?: string }) =>
  new Date(l.scheduled_at || l.scheduledAt || 0).getTime();

export const RISK_RULES: RiskRuleConfig[] = [
  // 1. Medication Adherence Low (< 70% over last 7 days)
  {
    id: "MED_ADHERENCE_LOW",
    label: "Low Medication Adherence",
    weight: 25,
    evaluate: (snapshot) => {
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const logs7d = snapshot.medLogs.filter((l) => {
        const time = getMedLogTime(l);
        return now - time <= sevenDaysMs;
      });

      if (logs7d.length === 0) return { hit: false };

      const taken = logs7d.filter((l) => l.status === "taken").length;
      const total = logs7d.length;
      const rate = taken / total;

      if (rate < 0.7) {
        const pct = Math.round(rate * 100);
        const missed = total - taken;
        return {
          hit: true,
          text: `Medication adherence dropped to ${pct}% over past 7 days (${missed} missed of ${total} doses).`,
        };
      }
      return { hit: false };
    },
  },

  // 2. 2+ Consecutive Missed Doses
  {
    id: "MED_MISSED_STREAK",
    label: "Consecutive Missed Doses",
    weight: 15,
    evaluate: (snapshot) => {
      // Sort logs by scheduled time descending
      const sorted = [...snapshot.medLogs].sort(
        (a, b) => getMedLogTime(b) - getMedLogTime(a)
      );

      let streak = 0;
      for (const log of sorted) {
        if (log.status === "missed") {
          streak++;
        } else if (log.status === "taken") {
          break;
        }
      }

      if (streak >= 2) {
        return {
          hit: true,
          text: `${streak} consecutive medication doses missed without confirmation.`,
        };
      }
      return { hit: false };
    },
  },

  // 3. BP Trend Up (Avg systolic up > 8% vs previous 7 days)
  {
    id: "BP_TREND_UP",
    label: "Elevated Blood Pressure Trend",
    weight: 20,
    evaluate: (snapshot) => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const bpVitals = snapshot.vitals
        .filter((v) => v.type === "bp")
        .sort((a, b) => getVitalTime(b) - getVitalTime(a));

      if (bpVitals.length < 2) return { hit: false };

      const recent7d = bpVitals.filter(
        (v) => now - getVitalTime(v) <= 7 * oneDayMs
      );
      const prior7d = bpVitals.filter((v) => {
        const diff = now - getVitalTime(v);
        return diff > 7 * oneDayMs && diff <= 14 * oneDayMs;
      });

      if (recent7d.length === 0) return { hit: false };

      const avgRecent =
        recent7d.reduce((sum, v) => sum + getVitalValA(v), 0) / recent7d.length;

      // If no prior 7d vitals, compare recent vs baseline target of 125
      const baseline =
        prior7d.length > 0
          ? prior7d.reduce((sum, v) => sum + getVitalValA(v), 0) / prior7d.length
          : 125;

      const increasePct = ((avgRecent - baseline) / baseline) * 100;
      if (increasePct > 8) {
        return {
          hit: true,
          text: `Average systolic BP trended up +${increasePct.toFixed(1)}% vs previous period (now ${Math.round(avgRecent)} mmHg).`,
        };
      }
      return { hit: false };
    },
  },

  // 4. BP High Absolute (Systolic >= 150 or Diastolic >= 95)
  {
    id: "BP_HIGH_ABS",
    label: "Critical Blood Pressure Threshold",
    weight: 20,
    evaluate: (snapshot) => {
      const bpVitals = snapshot.vitals
        .filter((v) => v.type === "bp")
        .sort((a, b) => getVitalTime(b) - getVitalTime(a));

      if (bpVitals.length === 0) return { hit: false };
      const latest = bpVitals[0];
      const valA = getVitalValA(latest);
      const valB = getVitalValB(latest);

      if (valA >= 150 || (valB && valB >= 95)) {
        return {
          hit: true,
          text: `Latest BP recorded at ${valA}/${valB || 0} mmHg (exceeds safe threshold).`,
        };
      }
      return { hit: false };
    },
  },

  // 5. Steps Drop (> 40% vs prior 7 days)
  {
    id: "STEPS_DROP",
    label: "Sharp Drop in Physical Activity",
    weight: 10,
    evaluate: (snapshot) => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const stepVitals = snapshot.vitals
        .filter((v) => v.type === "steps")
        .sort((a, b) => getVitalTime(b) - getVitalTime(a));

      if (stepVitals.length === 0) return { hit: false };

      const recent7d = stepVitals.filter(
        (v) => now - getVitalTime(v) <= 7 * oneDayMs
      );
      const prior7d = stepVitals.filter((v) => {
        const diff = now - getVitalTime(v);
        return diff > 7 * oneDayMs && diff <= 14 * oneDayMs;
      });

      if (recent7d.length === 0) return { hit: false };

      const avgRecent =
        recent7d.reduce((sum, v) => sum + getVitalValA(v), 0) / recent7d.length;
      const baseline =
        prior7d.length > 0
          ? prior7d.reduce((sum, v) => sum + getVitalValA(v), 0) / prior7d.length
          : 5000;

      const dropPct = ((baseline - avgRecent) / baseline) * 100;
      if (dropPct >= 40) {
        return {
          hit: true,
          text: `Daily activity dropped by ${Math.round(dropPct)}% (average ${Math.round(avgRecent)} steps vs baseline ${Math.round(baseline)} steps).`,
        };
      }
      return { hit: false };
    },
  },

  // 6. Glucose High (Fasting >= 180 mg/dL)
  {
    id: "GLUCOSE_HIGH",
    label: "Elevated Blood Glucose",
    weight: 15,
    evaluate: (snapshot) => {
      const gluVitals = snapshot.vitals
        .filter((v) => v.type === "glucose")
        .sort((a, b) => getVitalTime(b) - getVitalTime(a));

      if (gluVitals.length === 0) return { hit: false };
      const latest = gluVitals[0];
      const valA = getVitalValA(latest);

      if (valA >= 180) {
        return {
          hit: true,
          text: `Latest blood glucose elevated at ${valA} mg/dL (target < 140 mg/dL).`,
        };
      }
      return { hit: false };
    },
  },

  // 7. Recent Discharge (discharged within last 14 days)
  {
    id: "RECENT_DISCHARGE",
    label: "Recent Hospital Discharge",
    weight: 10,
    evaluate: (snapshot) => {
      if (!snapshot.patient.discharged_at) return { hit: false };
      const dischargedTime = new Date(snapshot.patient.discharged_at).getTime();
      const diffDays = (Date.now() - dischargedTime) / (24 * 60 * 60 * 1000);

      if (diffDays >= 0 && diffDays <= 14) {
        return {
          hit: true,
          text: `Recent hospital discharge (${Math.round(diffDays)} days ago) - heightened readmission risk window.`,
        };
      }
      return { hit: false };
    },
  },

  // 8. No Data in 48 Hours
  {
    id: "NO_DATA_48H",
    label: "No Telemetry in 48 Hours",
    weight: 15,
    evaluate: (snapshot) => {
      const now = Date.now();
      const fortyEightHoursMs = 48 * 60 * 60 * 1000;

      const latestVital = snapshot.vitals.reduce((latest, v) => {
        const time = getVitalTime(v);
        return time > latest ? time : latest;
      }, 0);

      const latestLog = snapshot.medLogs.reduce((latest, l) => {
        const time = l.taken_at ? new Date(l.taken_at).getTime() : 0;
        return time > latest ? time : latest;
      }, 0);

      const latestActivity = Math.max(latestVital, latestLog);
      if (latestActivity > 0 && now - latestActivity > fortyEightHoursMs) {
        return {
          hit: true,
          text: `No vitals or medication intake logged in over 48 hours.`,
        };
      }
      return { hit: false };
    },
  },

  // 9. Critical SpO2 Drop (< 92%)
  {
    id: "SPO2_CRITICAL",
    label: "Low Blood Oxygen (SpO2)",
    weight: 30,
    evaluate: (snapshot) => {
      const spo2Vitals = snapshot.vitals
        .filter((v) => v.type === "spo2")
        .sort((a, b) => getVitalTime(b) - getVitalTime(a));

      if (spo2Vitals.length === 0) return { hit: false };
      const latest = spo2Vitals[0];
      const valA = getVitalValA(latest);

      if (valA > 0 && valA < 92) {
        return {
          hit: true,
          text: `Latest blood oxygen (SpO2) dropped to ${valA}% (safe range 95–100%). Immediate clinical review advised.`,
        };
      }
      return { hit: false };
    },
  },

  // 10. Nocturnal Heart Rate Elevation (> 100 bpm)
  {
    id: "HR_NOCTURNAL_HIGH",
    label: "Elevated Nocturnal Heart Rate",
    weight: 15,
    evaluate: (snapshot) => {
      const hrVitals = snapshot.vitals
        .filter((v) => v.type === "hr")
        .sort((a, b) => getVitalTime(b) - getVitalTime(a));

      if (hrVitals.length === 0) return { hit: false };

      const nocturnal = hrVitals.filter((v) => {
        const d = new Date(getVitalTime(v));
        const h = d.getHours();
        const utcH = d.getUTCHours();
        return h >= 23 || h < 5 || utcH >= 23 || utcH < 5;
      });

      const recentSet = (nocturnal.length > 0 ? nocturnal : hrVitals).slice(0, 3);
      const avgHr = Math.round(
        recentSet.reduce((sum, v) => sum + getVitalValA(v), 0) / recentSet.length
      );
      const latestHr = getVitalValA(hrVitals[0]);

      if (avgHr > 100 || latestHr > 100) {
        const displayHr = Math.max(avgHr, latestHr);
        return {
          hit: true,
          text: `Resting/nocturnal heart rate elevated at ${displayHr} bpm (threshold 100 bpm).`,
        };
      }
      return { hit: false };
    },
  },
];
