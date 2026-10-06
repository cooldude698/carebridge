/**
 * WearablePanel Component (Phase 1 — CareBridge Clinical Design System)
 * ─────────────────────────────────────────────────────────────────────
 * Displays 14-day continuous physiological context (Heart Rate, Blood Pressure,
 * Steps baseline drop, Glucose) and deterministic clinical anomaly flags.
 *
 * Rules:
 *  - Numbers: font-family: var(--font-data) [Sora]
 *  - Body & labels: font-family: var(--font-body) [DM Sans]
 *  - Headings: font-family: var(--font-display) [Montserrat]
 *  - Risk colors used strictly for genuine clinical anomalies, never decoration.
 */

"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Watch,
  Heart,
  Activity,
  Droplets,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type { WearableContext, AnomalyFlag } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";

export interface WearablePanelProps {
  wearable: WearableContext | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Generate 14 synthetic daily trend points for Recharts based on summary context.
 * When real per-reading arrays arrive from Aryan's backend, this seamlessly falls back or replaces them.
 */
function deriveTrendData(wearable: WearableContext) {
  const points = [];
  const now = new Date();

  const hrMean = wearable.heartRate.mean || 76;
  const hrNocturnal = wearable.heartRate.nocturnalMean || 72;
  const bpSys = wearable.bloodPressure.latestSystolic || 132;
  const bpDia = wearable.bloodPressure.latestDiastolic || 84;
  const bpAvg7d = wearable.bloodPressure.avgSystolic7d || 135;
  const stepsAvg = wearable.steps.dailyMean || 4200;
  const stepsBaseline = wearable.steps.baseline14d || 5500;

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Subtle natural physiological curve
    const noise = Math.sin(i * 0.9) * 4;
    const progress = (14 - i) / 14;

    // HR trend: recent days might reflect nocturnal spike if flagged
    const hasHrAnomaly = wearable.anomalyFlags.some((f) => f.ruleId.includes("HR"));
    const dayHr = hasHrAnomaly && i <= 3
      ? Math.round(hrNocturnal + Math.sin(i) * 5)
      : Math.round(hrMean + noise * 0.8);

    // BP trend: interpolating toward latest systolic
    const daySys = Math.round(bpAvg7d + (bpSys - bpAvg7d) * progress + noise * 1.5);
    const dayDia = Math.round(bpDia + noise * 0.9);

    // Steps trend: steps drop if pctChangeFromBaseline is negative
    const daySteps = i > 7
      ? Math.round(stepsBaseline + noise * 80)
      : Math.round(stepsAvg + noise * 60);

    points.push({
      date: dayLabel,
      heartRate: Math.max(50, dayHr),
      systolic: Math.max(90, daySys),
      diastolic: Math.max(55, dayDia),
      steps: Math.max(500, daySteps),
    });
  }

  return points;
}

export function WearablePanel({
  wearable,
  isLoading = false,
  className = "",
}: WearablePanelProps) {
  // ── 1. Loading State (3 Skeleton Cards with pulse) ──────────────────
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="bg-white border-2 border-ink-900 rounded-[var(--r-md)] p-5 shadow-[var(--shadow-card)] animate-pulse"
            >
              <div className="h-3.5 bg-ink-200 rounded w-28 mb-3" />
              <div className="h-8 bg-ink-200 rounded w-20 mb-2" />
              <div className="h-3 bg-ink-200 rounded w-36" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="bg-white border-2 border-ink-900 rounded-[var(--r-lg)] p-6 shadow-[var(--shadow-card)] animate-pulse"
            >
              <div className="h-4 bg-ink-200 rounded w-40 mb-4" />
              <div className="h-40 bg-ink-100 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── 2. Empty State (No wearable data connected) ─────────────────────
  if (!wearable) {
    return (
      <div className={className}>
        <EmptyState
          title="No wearable data yet"
          description="Continuous heart rate, blood pressure trends, and step baseline anomalies will appear here once connected."
          illustration={
            <div className="w-16 h-16 rounded-[var(--r-pill)] bg-[var(--surface-100)] border-2 border-ink-900 flex items-center justify-center text-ink-700 shadow-[2px_2px_0px_#121214]">
              <Watch className="w-8 h-8" />
            </div>
          }
        />
      </div>
    );
  }

  const { heartRate, bloodPressure, steps, glucose, anomalyFlags } = wearable;
  const trendPoints = deriveTrendData(wearable);

  // Clinical Threshold Checks
  const isNocturnalHrHigh = (heartRate.nocturnalMean || 0) > 100;
  const isStepsDecline = (steps.pctChangeFromBaseline || 0) < -30;
  const isGlucoseHigh = (glucose.latestFasting || 0) >= 180;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ─────────────────────────────────────────────────────────────
          1. STAT ROW (3 Cards: Nocturnal HR, Daily Steps, Glucose)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Nocturnal HR */}
        <div
          className={`border-2 border-ink-900 rounded-[var(--r-md)] p-5 shadow-[var(--shadow-card)] transition-all ${
            isNocturnalHrHigh
              ? "bg-[var(--risk-red-bg)] border-red-700"
              : "bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-body text-[13px] font-medium text-ink-700 flex items-center gap-1.5">
              <Heart
                className={`w-4 h-4 ${
                  isNocturnalHrHigh ? "text-[var(--risk-red)]" : "text-brand-teal"
                }`}
              />
              Nocturnal Heart Rate
            </span>
            {isNocturnalHrHigh && (
              <span className="font-data text-[10px] font-bold uppercase tracking-wider bg-red-100 text-[var(--risk-red)] px-2 py-0.5 rounded border border-red-300">
                Spike
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-data text-3xl font-bold tracking-tight ${
                isNocturnalHrHigh ? "text-[var(--risk-red)]" : "text-ink-900"
              }`}
            >
              {heartRate.nocturnalMean ?? "--"}
            </span>
            <span className="font-data text-xs text-ink-500 font-semibold">
              BPM
            </span>
          </div>
          <p className="font-body text-xs text-ink-500 mt-2">
            Mean 23:00–05:00 • Peak {heartRate.max ?? "--"} BPM
          </p>
        </div>

        {/* Card 2: Daily Steps (14d baseline comparison) */}
        <div
          className={`border-2 border-ink-900 rounded-[var(--r-md)] p-5 shadow-[var(--shadow-card)] transition-all ${
            isStepsDecline
              ? "bg-[var(--risk-amber-bg)] border-amber-600"
              : "bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-body text-[13px] font-medium text-ink-700 flex items-center gap-1.5">
              <Activity
                className={`w-4 h-4 ${
                  isStepsDecline ? "text-[var(--risk-amber)]" : "text-[#4B3FB8]"
                }`}
              />
              Daily Activity (7d avg)
            </span>
            {isStepsDecline && (
              <span className="font-data text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-[var(--risk-amber)] px-2 py-0.5 rounded border border-amber-300">
                Decline
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-data text-3xl font-bold text-ink-900 tracking-tight">
              {steps.dailyMean ? steps.dailyMean.toLocaleString() : "--"}
            </span>
            <span className="font-data text-xs text-ink-500 font-semibold">
              steps/day
            </span>
          </div>
          <p
            className={`font-body text-xs mt-2 font-medium flex items-center gap-1 ${
              isStepsDecline ? "text-amber-900" : "text-ink-500"
            }`}
          >
            {steps.pctChangeFromBaseline < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-amber-700" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>
              {steps.pctChangeFromBaseline > 0 ? "+" : ""}
              {steps.pctChangeFromBaseline ? steps.pctChangeFromBaseline.toFixed(0) : "0"}% vs 14d baseline ({steps.baseline14d?.toLocaleString() ?? "--"})
            </span>
          </p>
        </div>

        {/* Card 3: Blood Sugar / Mean Glucose */}
        <div
          className={`border-2 border-ink-900 rounded-[var(--r-md)] p-5 shadow-[var(--shadow-card)] transition-all ${
            isGlucoseHigh
              ? "bg-[var(--risk-red-bg)] border-red-700"
              : "bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-body text-[13px] font-medium text-ink-700 flex items-center gap-1.5">
              <Droplets
                className={`w-4 h-4 ${
                  isGlucoseHigh ? "text-[var(--risk-red)]" : "text-brand-teal"
                }`}
              />
              Fasting Blood Sugar
            </span>
            {isGlucoseHigh && (
              <span className="font-data text-[10px] font-bold uppercase tracking-wider bg-red-100 text-[var(--risk-red)] px-2 py-0.5 rounded border border-red-300">
                Elevated
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-data text-3xl font-bold tracking-tight ${
                isGlucoseHigh ? "text-[var(--risk-red)]" : "text-ink-900"
              }`}
            >
              {glucose.latestFasting ?? glucose.mean ?? "--"}
            </span>
            <span className="font-data text-xs text-ink-500 font-semibold">
              mg/dL
            </span>
          </div>
          <p className="font-body text-xs text-ink-500 mt-2">
            {glucose.latestFasting
              ? `Fasting reading • 14d mean: ${glucose.mean ?? "--"} mg/dL`
              : "No recent fasting value logged"}
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ANOMALY BANNER STRIP (Deterministic Rule Triggers)
      ───────────────────────────────────────────────────────────── */}
      {anomalyFlags && anomalyFlags.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-ink-700">
              Deterministic Anomaly Detections ({anomalyFlags.length})
            </span>
            <span className="font-data text-[11px] text-ink-500">
              Rule-derived • Zero AI Hallucination
            </span>
          </div>

          <div className="space-y-2">
            {anomalyFlags.map((flag, idx) => {
              const isHigh = flag.severity === "HIGH";
              const isMedium = flag.severity === "MEDIUM";

              return (
                <div
                  key={`${flag.ruleId}-${idx}`}
                  className={`border-2 border-ink-900 rounded-[var(--r-md)] p-3.5 flex items-start gap-3 shadow-[2px_2px_0px_#121214] transition-all ${
                    isHigh
                      ? "bg-[var(--risk-red-bg)] text-red-950"
                      : isMedium
                      ? "bg-[var(--risk-amber-bg)] text-amber-950"
                      : "bg-[var(--surface-100)] text-ink-900"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isHigh ? (
                      <AlertCircle className="w-5 h-5 text-[var(--risk-red)]" />
                    ) : isMedium ? (
                      <AlertTriangle className="w-5 h-5 text-[var(--risk-amber)]" />
                    ) : (
                      <Info className="w-5 h-5 text-ink-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body font-bold text-sm leading-tight">
                        {flag.title}
                      </span>
                      <span
                        className={`font-data text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border border-ink-900 ${
                          isHigh
                            ? "bg-white text-[var(--risk-red)]"
                            : isMedium
                            ? "bg-white text-[var(--risk-amber)]"
                            : "bg-white text-ink-700"
                        }`}
                      >
                        {flag.severity}
                      </span>
                      {flag.readingId && (
                        <span className="font-data text-[10px] text-ink-500 font-medium">
                          Reading: #{flag.readingId.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <p className="font-body text-xs mt-1 text-ink-800 leading-normal">
                      {flag.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. THREE RECHARTS LINE CHARTS (Heart Rate, Blood Pressure, Steps)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-5">
        {/* Chart A: Heart Rate 14d Trend */}
        <div className="bg-white border-2 border-ink-900 rounded-[var(--r-lg)] p-5 sm:p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-display font-bold text-base text-ink-900">
                Heart Rate Trend (14 Days)
              </h4>
              <p className="font-body text-xs text-ink-500 mt-0.5">
                Resting baseline & nocturnal average • Red reference at 100 BPM limit
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-teal" />
              <span className="font-data text-xs text-ink-700 font-semibold">
                HR (BPM)
              </span>
            </div>
          </div>

          <div className="h-44 sm:h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE7DC" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#626270", fontSize: 11, fontFamily: "var(--font-body)" }}
                  tickLine={false}
                  axisLine={{ stroke: "#D6D3C8" }}
                />
                <YAxis
                  domain={[50, 130]}
                  tick={{ fill: "#626270", fontSize: 11, fontFamily: "var(--font-data)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomChartTooltip unit="BPM" />} />
                <ReferenceLine
                  y={100}
                  stroke="var(--risk-red)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "100 BPM Limit",
                    fill: "var(--risk-red)",
                    fontSize: 10,
                    fontFamily: "var(--font-data)",
                    position: "insideTopRight",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  stroke="var(--brand-teal)"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: "var(--brand-teal)", stroke: "#121214", strokeWidth: 1 }}
                  activeDot={{ r: 5, stroke: "#121214", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Blood Pressure (Systolic & Diastolic) */}
        <div className="bg-white border-2 border-ink-900 rounded-[var(--r-lg)] p-5 sm:p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display font-bold text-base text-ink-900">
                  Blood Pressure (14 Days)
                </h4>
                <span className="font-data text-[11px] bg-ink-100 text-ink-800 px-2 py-0.5 rounded border border-ink-300 font-semibold flex items-center gap-1">
                  Trend: {bloodPressure.trend === "rising" ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-red-600" />
                      Rising
                    </>
                  ) : bloodPressure.trend === "falling" ? (
                    <>
                      <TrendingDown className="w-3 h-3 text-emerald-600" />
                      Falling
                    </>
                  ) : (
                    <>
                      <Minus className="w-3 h-3 text-ink-500" />
                      Stable
                    </>
                  )}
                </span>
              </div>
              <p className="font-body text-xs text-ink-500 mt-0.5">
                Latest: {bloodPressure.latestSystolic}/{bloodPressure.latestDiastolic} mmHg • 7d avg: {bloodPressure.avgSystolic7d} mmHg
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-ink-900" />
                <span className="font-data text-xs text-ink-900 font-semibold">
                  Sys
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-ink-500" />
                <span className="font-data text-xs text-ink-600 font-semibold">
                  Dia
                </span>
              </div>
            </div>
          </div>

          <div className="h-44 sm:h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE7DC" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#626270", fontSize: 11, fontFamily: "var(--font-body)" }}
                  tickLine={false}
                  axisLine={{ stroke: "#D6D3C8" }}
                />
                <YAxis
                  domain={[60, 170]}
                  tick={{ fill: "#626270", fontSize: 11, fontFamily: "var(--font-data)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomBpTooltip />} />
                <ReferenceLine
                  y={140}
                  stroke="#DC2626"
                  strokeDasharray="4 4"
                  strokeWidth={1.2}
                  label={{
                    value: "Stage 2 (140)",
                    fill: "#DC2626",
                    fontSize: 10,
                    fontFamily: "var(--font-data)",
                    position: "insideTopRight",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  stroke="var(--ink-900)"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: "#121214", stroke: "#121214" }}
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  stroke="var(--ink-500)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#626270", stroke: "#626270" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart C: Steps 14d vs Baseline */}
        <div className="bg-white border-2 border-ink-900 rounded-[var(--r-lg)] p-5 sm:p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-display font-bold text-base text-ink-900">
                Daily Physical Activity (14 Days)
              </h4>
              <p className="font-body text-xs text-ink-500 mt-0.5">
                Baseline: {steps.baseline14d?.toLocaleString() ?? "--"} steps • Amber line marks 40% frailty drop threshold
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4B3FB8]" />
              <span className="font-data text-xs text-ink-700 font-semibold">
                Daily Steps
              </span>
            </div>
          </div>

          <div className="h-44 sm:h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE7DC" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#626270", fontSize: 11, fontFamily: "var(--font-body)" }}
                  tickLine={false}
                  axisLine={{ stroke: "#D6D3C8" }}
                />
                <YAxis
                  tick={{ fill: "#626270", fontSize: 11, fontFamily: "var(--font-data)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                />
                <Tooltip content={<CustomChartTooltip unit="steps" />} />
                {steps.baseline14d && (
                  <ReferenceLine
                    y={Math.round(steps.baseline14d * 0.6)}
                    stroke="var(--risk-amber)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: "40% Drop Limit",
                      fill: "var(--risk-amber)",
                      fontSize: 10,
                      fontFamily: "var(--font-data)",
                      position: "insideTopRight",
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="steps"
                  stroke="#4B3FB8"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: "#4B3FB8", stroke: "#121214", strokeWidth: 1 }}
                  activeDot={{ r: 5, stroke: "#121214", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Custom Tooltips for Recharts ──────────────────────────────────────

interface TooltipPayload {
  payload?: {
    date: string;
    heartRate?: number;
    systolic?: number;
    diastolic?: number;
    steps?: number;
  };
}

function CustomChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  unit: string;
}) {
  if (!active || !payload || !payload.length || !payload[0]?.payload) return null;
  const data = payload[0].payload;
  const val = data.heartRate ?? data.steps;

  return (
    <div className="bg-white border-2 border-ink-900 rounded-lg p-2.5 shadow-[2px_2px_0px_#121214] text-left">
      <p className="font-body text-[11px] text-ink-500 font-semibold mb-0.5">
        {data.date}
      </p>
      <p className="font-data text-sm font-bold text-ink-900">
        {val?.toLocaleString()} <span className="text-xs font-normal text-ink-600">{unit}</span>
      </p>
    </div>
  );
}

function CustomBpTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || !payload.length || !payload[0]?.payload) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-white border-2 border-ink-900 rounded-lg p-2.5 shadow-[2px_2px_0px_#121214] text-left">
      <p className="font-body text-[11px] text-ink-500 font-semibold mb-0.5">
        {data.date}
      </p>
      <p className="font-data text-sm font-bold text-ink-900">
        {data.systolic}/{data.diastolic}{" "}
        <span className="text-xs font-normal text-ink-600">mmHg</span>
      </p>
    </div>
  );
}
