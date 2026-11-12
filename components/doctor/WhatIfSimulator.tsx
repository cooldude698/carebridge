"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldCheck, TrendingDown, Sliders } from "lucide-react";
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

interface WhatIfSimulatorProps {
  patientName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  patientName,
  isOpen,
  onClose,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<
    "add_sglt2" | "increase_metformin" | "add_telmisartan"
  >("add_sglt2");

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const scenarios = {
    add_sglt2: {
      title: "Add SGLT2i (Dapagliflozin 10mg OD)",
      description:
        "Combines with current Metformin 500mg. Enhances glycemic control and offers mild systolic BP reduction.",
      hba1cDelta: "-1.1%",
      bpDelta: "-14 mmHg",
      interactionRisk: "Low (Safe combination; monitor hydration and renal eGFR)",
      projectedData: [
        { week: "Wk 0", bp: 154, hba1c: 8.4 },
        { week: "Wk 2", bp: 148, hba1c: 8.2 },
        { week: "Wk 4", bp: 142, hba1c: 7.9 },
        { week: "Wk 8", bp: 136, hba1c: 7.5 },
        { week: "Wk 12", bp: 132, hba1c: 7.3 },
      ],
    },
    increase_metformin: {
      title: "Uptitrate Metformin to 1000mg BID",
      description:
        "Doubles current dosage to target insulin resistance. Minimal direct acute effect on blood pressure.",
      hba1cDelta: "-0.7%",
      bpDelta: "-4 mmHg",
      interactionRisk: "None (Same agent; watch for GI tolerance issues)",
      projectedData: [
        { week: "Wk 0", bp: 154, hba1c: 8.4 },
        { week: "Wk 2", bp: 152, hba1c: 8.3 },
        { week: "Wk 4", bp: 150, hba1c: 8.1 },
        { week: "Wk 8", bp: 148, hba1c: 7.8 },
        { week: "Wk 12", bp: 146, hba1c: 7.7 },
      ],
    },
    add_telmisartan: {
      title: "Add ARB (Telmisartan 40mg OD)",
      description:
        "Aggressive blood pressure optimization combined with existing Amlodipine regimen.",
      hba1cDelta: "-0.2%",
      bpDelta: "-22 mmHg",
      interactionRisk:
        "Low (Dual antihypertensive therapy; verify serum potassium & creatinine)",
      projectedData: [
        { week: "Wk 0", bp: 154, hba1c: 8.4 },
        { week: "Wk 2", bp: 144, hba1c: 8.4 },
        { week: "Wk 4", bp: 136, hba1c: 8.3 },
        { week: "Wk 8", bp: 130, hba1c: 8.2 },
        { week: "Wk 12", bp: 126, hba1c: 8.2 },
      ],
    },
  };

  const current = scenarios[selectedScenario];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-xl bg-white shadow-2xl h-full flex flex-col border-l border-[#E2E8F0]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-[#0F172A] text-base">
                What-If Medication Simulator
              </h3>
              <p className="text-xs text-[#64748B]">
                12-week clinical projection &amp; interaction check for {patientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#E2E8F0]/60 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
            aria-label="Close simulator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
              Candidate Clinical Intervention
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {(["add_sglt2", "increase_metformin", "add_telmisartan"] as const).map(
                (key) => {
                  const sc = scenarios[key];
                  const isSelected = selectedScenario === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedScenario(key)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-[#F0FDFA] border-[#0D9488] ring-1 ring-[#0D9488]"
                          : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1]"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm text-[#0F172A]">
                          {sc.title}
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5">
                          {sc.description}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-[11px] font-semibold text-[#0D9488] px-2 py-0.5 rounded-full bg-[#0D9488]/10 shrink-0">
                          Active
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B]">12-Week Projected HbA1c</span>
              <div className="font-bold text-2xl text-[#0D9488] mt-1 flex items-center gap-1.5 tabular-nums">
                <TrendingDown className="w-5 h-5" />
                <span>{current.hba1cDelta}</span>
              </div>
              <span className="text-[11px] text-[#64748B]">UKPDS clinical model</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B]">Projected Systolic BP</span>
              <div className="font-bold text-2xl text-[#4F46E5] mt-1 flex items-center gap-1.5 tabular-nums">
                <TrendingDown className="w-5 h-5" />
                <span>{current.bpDelta}</span>
              </div>
              <span className="text-[11px] text-[#64748B] tabular-nums">
                154 → {current.projectedData[4].bp} mmHg
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-[#0F172A]">
                12-Week Projected Recovery Trajectory
              </h4>
              <span className="text-xs text-[#0D9488] font-medium">
                Deterministic Model
              </span>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={current.projectedData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis domain={[120, 165]} tick={{ fontSize: 11, fill: "#64748B" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "8px",
                      border: "1px solid #E2E8F0",
                      fontSize: "12px",
                    }}
                  />
                  <ReferenceLine
                    y={130}
                    stroke="#0D9488"
                    strokeDasharray="3 3"
                    label={{ value: "Target (<130)", fill: "#0D9488", fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bp"
                    name="Systolic BP"
                    stroke="#4F46E5"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: "#4F46E5" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              <h5 className="font-semibold text-xs uppercase tracking-wider text-[#0F172A]">
                RxNav Drug-Drug Interaction Check
              </h5>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              {current.interactionRisk}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <p className="text-xs text-[#64748B]">
            Decision support only. Doctor decides.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
