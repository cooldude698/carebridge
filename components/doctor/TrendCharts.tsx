"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Watch, Heart, Activity, Wind } from "lucide-react";
import { Vital } from "@/lib/types";
import { analyzeWearableTelemetry } from "@/lib/wearable/ingester";

interface TrendChartsProps {
  vitals: Vital[];
}

function getValA(v: Vital): number {
  return v.value_a ?? v.valueA ?? 0;
}

function getValB(v: Vital): number | null {
  return v.value_b ?? v.valueB ?? null;
}

function formatLabel(raw?: string): string {
  if (!raw) return "";
  if (!raw.includes("T")) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export const TrendCharts: React.FC<TrendChartsProps> = ({ vitals }) => {
  const [activeView, setActiveView] = useState<"cardio" | "spo2" | "wearable">("cardio");

  // Real vital rows from DB / API
  const bpVitals = vitals.filter((v) => v.type === "bp");
  const hrVitals = vitals.filter((v) => v.type === "hr");
  const spo2Vitals = vitals.filter((v) => v.type === "spo2");
  const stepsVitals = vitals.filter((v) => v.type === "steps");

  // Merge BP & real HR readings by index/timestamp label
  const maxCardioLen = Math.max(bpVitals.length, hrVitals.length);
  const cardioData = Array.from({ length: maxCardioLen }, (_, idx) => {
    const bp = bpVitals[idx];
    const hr = hrVitals[idx];
    return {
      name: formatLabel(bp?.recorded_at ?? bp?.recordedAt ?? hr?.recorded_at ?? hr?.recordedAt ?? `Pt ${idx + 1}`),
      systolic: bp ? getValA(bp) : undefined,
      diastolic: bp ? (getValB(bp) ?? 80) : undefined,
      hr: hr ? getValA(hr) : undefined,
    };
  });

  const spo2Data = spo2Vitals.map((v) => ({
    name: formatLabel(v.recorded_at ?? v.recordedAt),
    spo2: getValA(v),
  }));

  const stepsData = stepsVitals.map((v) => ({
    name: formatLabel(v.recorded_at ?? v.recordedAt),
    steps: getValA(v),
  }));

  const wearableAnalysis = analyzeWearableTelemetry(vitals);

  return (
    <div className="space-y-5">
      {/* Smartwatch Anomaly Strip */}
      {wearableAnalysis.anomalies.length > 0 && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Watch className="w-4 h-4 text-[#D97706]" />
              <h5 className="text-xs font-semibold uppercase tracking-wider text-[#92400E]">
                Smartwatch Biometric Anomalies Detected
              </h5>
            </div>
            <span className="text-[11px] font-medium text-[#78716C]">
              Watch Companion Sync
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {wearableAnalysis.anomalies.map((anom, idx) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-lg border border-[#FDE68A] text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[#0F172A]">{anom.title}</span>
                  <span
                    className={`font-semibold text-[10px] px-2 py-0.5 rounded-full ${
                      (anom.severity as string) === "CRITICAL" || anom.severity === "HIGH"
                        ? "bg-[#FEE2E2] text-[#DC2626]"
                        : "bg-[#FEF3C7] text-[#D97706]"
                    }`}
                  >
                    {anom.severity}
                  </span>
                </div>
                <p className="text-[#475569] leading-relaxed text-[11px]">
                  {anom.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chart Card */}
      <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="font-display font-semibold text-[#0F172A] text-base">
              Clinical Telemetry &amp; Sensor Streams
            </h4>
            <p className="text-xs text-[#64748B]">
              Real-time watch readings: BP, Heart Rate, SpO2, and Daily Steps
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveView("cardio")}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeView === "cardio"
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>BP &amp; HR</span>
            </button>
            <button
              onClick={() => setActiveView("spo2")}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeView === "spo2"
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <Wind className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>SpO2</span>
            </button>
            <button
              onClick={() => setActiveView("wearable")}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeView === "wearable"
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>Steps</span>
            </button>
          </div>
        </div>

        {/* View 1: Blood Pressure & Real Heart Rate */}
        {activeView === "cardio" && (
          <div>
            <div className="flex flex-wrap items-center justify-between text-xs mb-3 pb-2 border-b border-[#E2E8F0] gap-2">
              <div className="flex flex-wrap items-center gap-4 text-[#475569]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                  Systolic (mmHg)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
                  Diastolic (mmHg)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                  Heart Rate (bpm)
                </span>
              </div>
              <span className="text-[#DC2626] text-[11px] font-medium">
                Threshold: Systolic 140 mmHg · HR 100 bpm
              </span>
            </div>

            <div className="h-64 w-full">
              {cardioData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cardioData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis domain={[50, 180]} tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0",
                        fontSize: "12px",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    />
                    <ReferenceLine
                      y={140}
                      stroke="#DC2626"
                      strokeDasharray="4 4"
                      label={{ value: "Systolic 140", fill: "#DC2626", fontSize: 10 }}
                    />
                    <ReferenceLine
                      y={100}
                      stroke="#D97706"
                      strokeDasharray="3 3"
                      label={{ value: "HR 100", fill: "#D97706", fontSize: 10 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="systolic"
                      name="Systolic (mmHg)"
                      stroke="#0D9488"
                      strokeWidth={2.25}
                      dot={{ r: 3.5, fill: "#0D9488" }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      name="Diastolic (mmHg)"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#4F46E5" }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="hr"
                      name="Heart Rate (bpm)"
                      stroke="#D97706"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: "#D97706" }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                  Patient has not shared blood pressure or heart rate telemetry
                </div>
              )}
            </div>
          </div>
        )}

        {/* View 2: SpO2 Oxygenation */}
        {activeView === "spo2" && (
          <div>
            <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-[#E2E8F0]">
              <span className="flex items-center gap-1.5 text-[#475569]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                Blood Oxygen Saturation (SpO2 %)
              </span>
              <span className="text-[#DC2626] text-[11px] font-medium">
                Critical Hypoxemia Threshold: 92%
              </span>
            </div>

            <div className="h-64 w-full">
              {spo2Data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spo2Data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis domain={[82, 100]} tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0",
                        fontSize: "12px",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    />
                    <ReferenceLine
                      y={92}
                      stroke="#DC2626"
                      strokeDasharray="4 4"
                      label={{ value: "Critical 92%", fill: "#DC2626", fontSize: 10 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="spo2"
                      name="SpO2 (%)"
                      stroke="#0D9488"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: "#0D9488" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                  No SpO2 readings recorded yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* View 3: Smartwatch Pedometer */}
        {activeView === "wearable" && (
          <div>
            <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-[#E2E8F0]">
              <span className="flex items-center gap-1.5 text-[#475569]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5]" />
                Daily Walking Steps
              </span>
              <span className="text-[#64748B] text-[11px] font-medium">
                Target: 4,500 steps/day
              </span>
            </div>

            <div className="h-64 w-full">
              {stepsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stepsData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis domain={[0, 9000]} tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0",
                        fontSize: "12px",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    />
                    <ReferenceLine
                      y={4500}
                      stroke="#64748B"
                      strokeDasharray="3 3"
                      label={{ value: "Target 4,500", fill: "#64748B", fontSize: 10 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="steps"
                      name="Steps"
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: "#4F46E5" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                  Patient has not shared step count telemetry
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
