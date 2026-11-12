"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  RotateCcw,
  FastForward,
  TrendingDown,
  HeartPulse,
  Pill,
  CheckCircle2,
  ExternalLink,
  Sliders,
  Wind,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Toast } from "@/components/ui/Toast";
import { PatientListItem } from "@/lib/types";

type SimKind =
  | "spo2_drop"
  | "hr_spike"
  | "bp_spike"
  | "miss_dose"
  | "steps_drop"
  | "recover";

interface AlertLogItem {
  id: string;
  time: string;
  level: "reminder" | "family" | "doctor" | "wearable_anomaly";
  message: string;
}

export default function SimulatorPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("p1");
  const [logs, setLogs] = useState<AlertLogItem[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [autoTick, setAutoTick] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/patients");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setPatients(data);
      }
    } catch {
      // Ignore transient network errors
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!autoTick) return;
    const tickInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/escalation/tick", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.fired && data.fired.length > 0) {
            const newEntries: AlertLogItem[] = data.fired.map((a: any) => ({
              id: a.id || `tick-${Date.now()}`,
              time: new Date().toLocaleTimeString(),
              level: a.level || "reminder",
              message: a.message,
            }));
            setLogs((prev) => [...newEntries, ...prev].slice(0, 30));
            fetchStatus();
          }
        }
      } catch {
        // Ignore background polling errors
      }
    }, 5000);

    return () => clearInterval(tickInterval);
  }, [autoTick]);

  const triggerEvent = async (kind: SimKind) => {
    setLoadingAction(kind);
    try {
      const res = await fetch("/api/sim/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedId, kind }),
      });
      const data = await res.json();
      if (res.ok) {
        setLogs((prev) => [
          {
            id: `log-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            level: data.newRisk?.band === "red" ? "doctor" : "reminder",
            message: data.message,
          },
          ...prev,
        ]);
        await fetchStatus();
        showToast(data.message);
      } else {
        setLogs((prev) => [
          {
            id: `err-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            level: "reminder",
            message: data.error || `Event ${kind} rejected by backend`,
          },
          ...prev,
        ]);
      }
    } catch {
      showToast("Failed to trigger simulation event.");
    } finally {
      setLoadingAction(null);
    }
  };

  const fastForwardEscalation = async () => {
    setLoadingAction("ff");
    try {
      const res = await fetch("/api/escalation/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceStage: "doctor" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fired && data.fired.length > 0) {
          const newEntries: AlertLogItem[] = data.fired.map((a: any) => ({
            id: a.id || `ff-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            level: a.level || "doctor",
            message: `[FAST-FORWARD] ${a.message}`,
          }));
          setLogs((prev) => [...newEntries, ...prev]);
        } else {
          setLogs((prev) => [
            {
              id: `ff-${Date.now()}`,
              time: new Date().toLocaleTimeString(),
              level: "doctor",
              message: "[FAST-FORWARD] Escalation tick checked — no pending timers.",
            },
            ...prev,
          ]);
        }
        await fetchStatus();
      }
    } catch {
      showToast("Failed to fast-forward escalation.");
    } finally {
      setLoadingAction(null);
    }
  };

  const resetDemo = async () => {
    setLoadingAction("reset");
    try {
      const res = await fetch("/api/sim/reset", { method: "POST" });
      if (res.ok) {
        setLogs((prev) => [
          {
            id: `reset-${Date.now()}`,
            time: new Date().toLocaleTimeString(),
            level: "reminder",
            message: "Demo reset to clean baseline seed state.",
          },
          ...prev,
        ]);
        await fetchStatus();
        showToast("Demo reset to clean baseline.");
      }
    } catch {
      showToast("Failed to reset demo.");
    } finally {
      setLoadingAction(null);
    }
  };

  const selectedPatient = patients.find((p) => p.id === selectedId) || patients[0];

  const eventButtons: {
    kind: SimKind;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    accent: string;
  }[] = [
    {
      kind: "spo2_drop",
      title: "SpO2 Critical Drop (88%)",
      subtitle: "Primary stage trigger · hypoxemia alert",
      icon: <Wind className="w-4 h-4 text-[#DC2626]" />,
      accent: "border-[#FECACA] bg-[#FEF2F2]/60 hover:bg-[#FEE2E2]/70",
    },
    {
      kind: "hr_spike",
      title: "Nocturnal HR Spike (112 bpm)",
      subtitle: "Watch PPG tachycardia anomaly",
      icon: <Activity className="w-4 h-4 text-[#D97706]" />,
      accent: "border-[#FDE68A] bg-[#FFFBEB]/60 hover:bg-[#FEF3C7]/70",
    },
    {
      kind: "bp_spike",
      title: "BP Spike (156/98 mmHg)",
      subtitle: "Stage 2 hypertension threshold",
      icon: <HeartPulse className="w-4 h-4 text-[#DC2626]" />,
      accent: "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]",
    },
    {
      kind: "miss_dose",
      title: "Miss Medication Dose",
      subtitle: "Starts 3-tier escalation timer",
      icon: <Pill className="w-4 h-4 text-[#4F46E5]" />,
      accent: "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]",
    },
    {
      kind: "steps_drop",
      title: "Mobility / Steps Drop (-52%)",
      subtitle: "Sudden sedentary decline",
      icon: <TrendingDown className="w-4 h-4 text-[#D97706]" />,
      accent: "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]",
    },
    {
      kind: "recover",
      title: "Patient Recover (Baseline)",
      subtitle: "Restore normal vitals & adherence",
      icon: <CheckCircle2 className="w-4 h-4 text-[#059669]" />,
      accent: "border-[#BBF7D0] bg-[#F0FDF4]/60 hover:bg-[#DCFCE7]/70",
    },
  ];

  const portalLinks = [
    { href: `/doctor/${selectedId}`, label: "Doctor Cockpit" },
    { href: "/patient", label: "Patient Home" },
    { href: "/patient/watch", label: "Watch Companion" },
    { href: "/patient/voice", label: "Voice AI" },
    { href: "/family", label: "Guardian Portal" },
    { href: "/admin", label: "Admin ROI" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {toastMsg && (
        <Toast message={toastMsg} type="success" onClose={() => setToastMsg(null)} />
      )}

      {/* Header */}
      <header className="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#0F172A]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <div className="h-5 w-px bg-[#E2E8F0]" />
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#0D9488]" />
            <span className="font-display font-bold text-sm text-[#0F172A]">
              BuilderCon Live Demo Simulator
            </span>
          </div>
        </div>

        <button
          onClick={resetDemo}
          disabled={loadingAction === "reset"}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>
            {loadingAction === "reset" ? "Resetting..." : "Reset Demo to Clean Baseline"}
          </span>
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Patient Selector Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {patients.map((p) => {
              const isSelected = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#0D9488] text-white border-[#0D9488] shadow-sm"
                      : "bg-white text-[#334155] border-[#E2E8F0] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span>{p.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] tabular-nums ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : p.band === "red"
                        ? "bg-[#FEE2E2] text-[#DC2626]"
                        : p.band === "yellow"
                        ? "bg-[#FEF3C7] text-[#D97706]"
                        : "bg-[#DCFCE7] text-[#059669]"
                    }`}
                  >
                    {p.score} pts · {p.band.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 1-Click Portal Jump Links */}
          <div className="flex flex-wrap items-center gap-1.5">
            {portalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target="_blank"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#0D9488] text-[11px] font-medium text-[#334155] transition-colors"
              >
                <span>{link.label}</span>
                <ExternalLink className="w-3 h-3 text-[#94A3B8]" />
              </Link>
            ))}
          </div>
        </div>

        {/* Split 2-Column Evaluation Console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Patient Live Status + Event Triggers */}
          <div className="lg:col-span-7 space-y-6">
            {selectedPatient && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Target Simulated Patient
                  </span>
                  <h2 className="font-display font-bold text-xl text-[#0F172A] mt-0.5">
                    {selectedPatient.name} ({selectedPatient.age}y)
                  </h2>
                  <p className="text-xs text-[#475569] mt-1">
                    {selectedPatient.topReason}
                  </p>
                </div>
                <RiskBadge band={selectedPatient.band} score={selectedPatient.score} size="lg" />
              </div>
            )}

            {/* One-Tap Telemetry & Clinical Event Triggers */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm text-[#0F172A]">
                  One-Tap Telemetry &amp; Clinical Event Triggers
                </h3>
                <span className="text-[11px] text-[#64748B]">
                  POST /api/sim/event
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {eventButtons.map((btn) => (
                  <button
                    key={btn.kind}
                    onClick={() => triggerEvent(btn.kind)}
                    disabled={loadingAction !== null}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer disabled:opacity-50 ${btn.accent}`}
                  >
                    <div className="mt-0.5 shrink-0">{btn.icon}</div>
                    <div>
                      <div className="font-semibold text-xs text-[#0F172A]">
                        {loadingAction === btn.kind ? "Injecting..." : btn.title}
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        {btn.subtitle}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Escalation Controls + Live Chronological Feed */}
          <div className="lg:col-span-5 space-y-6">
            {/* Escalation Controls */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm text-[#0F172A] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#4F46E5]" />
                  <span>3-Tier Escalation Engine</span>
                </h3>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#334155] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoTick}
                    onChange={(e) => setAutoTick(e.target.checked)}
                    className="rounded border-[#CBD5E1] text-[#0D9488] focus:ring-[#0D9488]"
                  />
                  <span>Auto-Tick (5s)</span>
                </label>
              </div>

              <p className="text-xs text-[#64748B]">
                Transitions pending reminders across Patient Reminder → Family WhatsApp → Doctor Alert.
              </p>

              <button
                onClick={fastForwardEscalation}
                disabled={loadingAction !== null}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <FastForward className="w-4 h-4" />
                <span>
                  {loadingAction === "ff"
                    ? "Fast-Forwarding..."
                    : "Fast-Forward Escalation"}
                </span>
              </button>
            </div>

            {/* Live Chronological Event Feed */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm text-[#0F172A]">
                  Live Event &amp; Escalation Feed
                </h3>
                <span className="text-[11px] font-medium text-[#64748B] tabular-nums">
                  {logs.length} events
                </span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#F8FAFC] border border-dashed border-[#CBD5E1] text-center text-xs text-[#64748B]">
                    Trigger an event on the left to watch real-time risk recomputation and escalation alerts.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                            log.level === "doctor" || log.level === "wearable_anomaly"
                              ? "bg-[#FEE2E2] text-[#DC2626]"
                              : log.level === "family"
                              ? "bg-[#FEF3C7] text-[#D97706]"
                              : "bg-[#EEF2FF] text-[#4F46E5]"
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="text-[10px] text-[#64748B] tabular-nums">
                          {log.time}
                        </span>
                      </div>
                      <p className="text-[#0F172A] leading-relaxed">{log.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
