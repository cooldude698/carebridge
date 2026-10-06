/**
 * Doctor Portal — Patient Detail Page (Phase 3 Upgrade)
 * ─────────────────────────────────────────────────────
 * Features:
 *  - Prominent "Wearable Data" Tab (2nd tab — CareBridge USP)
 *  - Anomaly indicator badge on Wearable tab if HIGH anomaly exists
 *  - Real-time pre-consult brief drawer with citation chips
 *  - "Update Care Plan" modal for clinical notes & patient goal dispatch
 *  - Urgent top-bar notification if risk is RED or HIGH anomalies detected
 *  - Full DPDP audit trail and ABDM / FHIR R4 interoperability
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles,
  FileText,
  AlertTriangle,
  History,
  ShieldCheck,
  User,
  Clock,
  Bell,
  RefreshCw,
  Sliders,
  FileCode2,
  Watch,
  ClipboardEdit,
  Loader2,
  AlertCircle,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { PatientDetail, AuditLog, WearableContext, AnomalyFlag } from "@/lib/types";
import { MOCK_PATIENT_DETAILS, MOCK_AUDIT_LOGS } from "@/lib/mockData";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ReasonList } from "@/components/ui/ReasonList";
import { Button } from "@/components/ui/Button";
import { ActionsBar } from "@/components/doctor/ActionsBar";
import { TrendCharts } from "@/components/doctor/TrendCharts";
import { MedicineLogTable } from "@/components/doctor/MedicineLogTable";
import { SharedDataPanel } from "@/components/doctor/SharedDataPanel";
import { BriefPanel, CitationItem } from "@/components/ui/BriefPanel";
import { WearablePanel } from "@/components/ui/WearablePanel";
import { DoctorNoteModal } from "@/components/doctor/DoctorNoteModal";
import { WhatIfSimulator } from "@/components/doctor/WhatIfSimulator";
import { FhirExportDrawer } from "@/components/doctor/FhirExportDrawer";
import { AuditRow } from "@/components/ui/AuditRow";
import { resolveWearableContext } from "@/lib/wearable/resolve";
import { useBriefStream } from "@/lib/voice";

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = (params?.id as string) || "p1";

  // Data State
  const [detail, setDetail] = useState<(PatientDetail & { wearable?: WearableContext | null }) | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: Overview | Wearable (2nd tab - USP) | Medicine Log | Alerts | 8-Rule Engine | Consent Log
  const [activeTab, setActiveTab] = useState<"overview" | "wearable" | "meds" | "alerts" | "rules" | "audit">("overview");

  // Modals & Drawers
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [isFhirOpen, setIsFhirOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  // Brief Streaming via SSE (Phase 5a)
  const {
    streamText,
    citations,
    isStreaming,
    source: briefSource,
    error: briefError,
    startStream,
    reset: resetBrief,
  } = useBriefStream();

  // Global Toast for Doctor Actions
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchPatientDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
      } else {
        setDetail(MOCK_PATIENT_DETAILS[patientId] || MOCK_PATIENT_DETAILS["p1"]);
      }
    } catch {
      setDetail(MOCK_PATIENT_DETAILS[patientId] || MOCK_PATIENT_DETAILS["p1"]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/audit`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      } else {
        setAuditLogs(MOCK_AUDIT_LOGS.filter((l) => l.patient_id === patientId));
      }
    } catch {
      setAuditLogs(MOCK_AUDIT_LOGS.filter((l) => l.patient_id === patientId));
    }
  }, [patientId]);

  useEffect(() => {
    setLoading(true);
    fetchPatientDetail();
    fetchAuditLogs();
  }, [fetchPatientDetail, fetchAuditLogs]);

  // Brief Wire-up trigger
  const handleStartBrief = () => {
    setIsBriefOpen(true);
    startStream(patientId);
  };

  const handleCarePlanSuccess = (msg: string) => {
    setToastMsg(msg);
    fetchAuditLogs();
    setTimeout(() => setToastMsg(null), 5000);
  };

  if (loading || !detail) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-ink-500 gap-2 font-display">
        <RefreshCw className="w-5 h-5 animate-spin text-brand-teal" />
        <span>Loading patient telemetry, wearables, and risk data...</span>
      </div>
    );
  }

  const { profile, risk, vitals, medLogs, alerts, consents = [] } = detail;
  const wearableData = resolveWearableContext(patientId, detail.wearable);

  // Check for HIGH severity wearable anomalies or RED band
  const highAnomalyCount = wearableData.anomalyFlags.filter((f) => f.severity === "HIGH").length;
  const isUrgent = risk.band === "red" || highAnomalyCount > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-14">
      {/* ── Urgent Top Notification Banner ───────────────────────── */}
      {isUrgent && (
        <div className="bg-red-50 border-2 border-red-700 rounded-2xl p-4 shadow-[3px_3px_0px_#121214] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 animate-pulse">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-bold text-sm text-red-950 block">
                {highAnomalyCount > 0
                  ? `${highAnomalyCount} High-Severity Wearable Anomalies Detected`
                  : "Patient in Acute Red Risk Band (>= 70)"}
              </span>
              <p className="font-body text-xs text-red-800">
                Action required: review nocturnal HR spike &amp; 14-day mobility baseline drop.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleStartBrief}
            className="bg-red-700 text-white border-2 border-ink-900 shadow-[2px_2px_0px_#121214] hover:bg-red-800 text-xs shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Synthesize Pre-consult Brief
          </Button>
        </div>
      )}

      {/* ── Success Toast Notice ─────────────────────────────────── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121214] text-white px-5 py-3.5 rounded-2xl border-2 border-brand-teal shadow-[4px_4px_0px_#14B8A6] flex items-center gap-3 font-body text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Patient Profile Header Card ──────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-ink-900 shadow-[5px_5px_0px_#121214]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b-2 border-ink-900">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FEE159] border-2 border-ink-900 text-ink-900 font-display font-black text-xl flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#121214]">
              {profile.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display font-black text-2xl sm:text-3xl text-ink-900 leading-tight">
                  {profile.name}
                </h2>
                <RiskBadge band={risk.band} score={risk.score} size="md" />
              </div>
              <p className="font-body text-xs text-ink-500 mt-1.5 flex flex-wrap items-center gap-2">
                <span>Age: <strong className="text-ink-900 font-semibold">{profile.age}</strong></span>
                <span>•</span>
                <span>Language: <strong className="text-ink-900 font-semibold">{profile.language}</strong></span>
                <span>•</span>
                <span>ID: <strong className="text-ink-900 font-semibold">{profile.id}</strong></span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {profile.conditions.map((condition) => (
                  <span
                    key={condition}
                    className="font-data text-[11px] px-2.5 py-0.5 rounded-full bg-[#EDE9FE] border border-ink-900 text-ink-900 font-bold"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pre-Consult Brief Button */}
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                if (!streamText) {
                  handleStartBrief();
                } else {
                  setIsBriefOpen(true);
                }
              }}
              disabled={isStreaming}
              className="gap-2 bg-[#D4F77C] text-ink-900 border-2 border-ink-900 shadow-[2px_2px_0px_#121214] hover:bg-[#c3ea5d] cursor-pointer"
            >
              {isStreaming ? (
                <>
                  <Loader2 className="w-4 h-4 text-ink-900 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : streamText ? (
                <>
                  <RefreshCw className="w-4 h-4 text-ink-900" />
                  <span>Pre-consult Brief ({citations.length} cited)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-ink-900" />
                  <span>Pre-Consult Brief</span>
                </>
              )}
            </Button>

            {/* Update Care Plan Button (USP 2) */}
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsNoteModalOpen(true)}
              className="gap-2 bg-brand-teal text-white border-2 border-ink-900 shadow-[2px_2px_0px_#121214] hover:bg-brand-teal/90 cursor-pointer"
            >
              <ClipboardEdit className="w-4 h-4 text-white" />
              <span>Update Care Plan</span>
            </Button>

            {/* What-If Simulator Trigger */}
            <Button
              variant="ghost"
              size="md"
              onClick={() => setIsWhatIfOpen(true)}
              className="gap-2 bg-white text-ink-900 border-2 border-ink-900 shadow-[2px_2px_0px_#121214] cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-ink-900" />
              <span className="hidden sm:inline">&ldquo;What-If&rdquo; Simulator</span>
            </Button>
          </div>
        </div>

        {/* Clinical Interventions Bar */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="font-body font-bold text-xs uppercase text-ink-700 tracking-wider">
            Patient Communication:
          </span>
          <ActionsBar
            patientId={profile.id}
            patientName={profile.name}
            onActionTriggered={() => fetchAuditLogs()}
          />
        </div>
      </div>

      {/* ── 5 Tabs Navigation (Wearable is the 2nd tab — USP) ───── */}
      <div className="flex flex-wrap items-center gap-2 font-body text-xs font-bold">
        {/* Tab 1: Overview */}
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-full border-2 border-ink-900 flex items-center gap-2 transition cursor-pointer ${
            activeTab === "overview"
              ? "bg-[#D4F77C] text-ink-900 shadow-[2px_2px_0px_#121214]"
              : "bg-white text-ink-700 hover:bg-[#FAF8F5]"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Overview</span>
        </button>

        {/* Tab 2: Wearable Data (2nd Tab — Core USP) */}
        <button
          onClick={() => setActiveTab("wearable")}
          className={`relative px-4 py-2 rounded-full border-2 border-ink-900 flex items-center gap-2 transition cursor-pointer ${
            activeTab === "wearable"
              ? "bg-[#D4F77C] text-ink-900 shadow-[2px_2px_0px_#121214]"
              : "bg-white text-ink-700 hover:bg-[#FAF8F5]"
          }`}
        >
          <Watch className="w-4 h-4 text-brand-teal" />
          <span>Wearable Data</span>
          {/* Anomaly Indicator Red Dot */}
          {highAnomalyCount > 0 && (
            <span
              className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping -mr-1"
              title={`${highAnomalyCount} High Anomaly Flags`}
            />
          )}
          {wearableData.anomalyFlags.length > 0 && (
            <span className="font-data text-[10px] px-1.5 py-0.5 rounded-full bg-ink-900 text-white font-bold ml-0.5">
              {wearableData.anomalyFlags.length}
            </span>
          )}
        </button>

        {/* Tab 3: Medicine Log */}
        <button
          onClick={() => setActiveTab("meds")}
          className={`px-4 py-2 rounded-full border-2 border-ink-900 flex items-center gap-2 transition cursor-pointer ${
            activeTab === "meds"
              ? "bg-[#D4F77C] text-ink-900 shadow-[2px_2px_0px_#121214]"
              : "bg-white text-ink-700 hover:bg-[#FAF8F5]"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Medicine Log ({medLogs.length})</span>
        </button>

        {/* Tab 4: Escalations & Alerts */}
        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-4 py-2 rounded-full border-2 border-ink-900 flex items-center gap-2 transition cursor-pointer ${
            activeTab === "alerts"
              ? "bg-[#D4F77C] text-ink-900 shadow-[2px_2px_0px_#121214]"
              : "bg-white text-ink-700 hover:bg-[#FAF8F5]"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Alerts ({alerts.length})</span>
        </button>

        {/* Tab 5: DPDP Consent & Audit */}
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 rounded-full border-2 border-ink-900 flex items-center gap-2 transition cursor-pointer ${
            activeTab === "rules"
              ? "bg-[#D4F77C] text-ink-900 shadow-[2px_2px_0px_#121214]"
              : "bg-white text-ink-700 hover:bg-[#FAF8F5]"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>8-Rule Engine</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-ink-900 text-white">
            {risk.reasons.length} / 8 active
          </span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 rounded-full border-2 border-ink-900 flex items-center gap-2 transition cursor-pointer ${
            activeTab === "audit"
              ? "bg-[#D4F77C] text-ink-900 shadow-[2px_2px_0px_#121214]"
              : "bg-white text-ink-700 hover:bg-[#FAF8F5]"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Consent &amp; Audit ({auditLogs.length})</span>
        </button>
      </div>

      {/* ── Tab Content Panels ───────────────────────────────────── */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Why Flagged Clinical Rationale */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-ink-900 shadow-[5px_5px_0px_#121214]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-ink-900">
              <div>
                <h3 className="font-display font-black text-ink-900 text-xl flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Clinical Risk Rationale (&ldquo;Why Flagged&rdquo;)</span>
                </h3>
                <p className="font-body text-xs text-ink-500 mt-0.5">
                  Deterministic transparent rule triggers calculated from telemetry
                </p>
              </div>
              <div className="font-data text-xs text-ink-600 font-bold">
                Total Risk Score: <strong className="text-ink-900 text-sm">{risk.score}/100</strong>
              </div>
            </div>
            <ReasonList reasons={risk.reasons} />
          </div>

          {/* Telemetry Charts: BP & Steps Trends */}
          <TrendCharts vitals={vitals} />
        </div>
      )}

      {/* TAB 2: WEARABLE DATA (Core USP — WearablePanel) */}
      {activeTab === "wearable" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-ink-900 shadow-[5px_5px_0px_#121214]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-ink-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border-2 border-ink-900 flex items-center justify-center text-brand-teal shadow-[2px_2px_0px_#121214]">
                  <Watch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-ink-900 leading-tight">
                    14-Day Wearable Physiological Telemetry
                  </h3>
                  <p className="font-body text-xs text-ink-500 mt-0.5">
                    Continuous Apple Watch / Fitbit ingest with rule-based nocturnal anomaly tracking
                  </p>
                </div>
              </div>
              <span className="font-data text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Live Feed
              </span>
            </div>

            {/* Embedded WearablePanel Component */}
            <WearablePanel wearable={wearableData} isLoading={false} />
          </div>
        </div>
      )}

      {/* Tab: 8-Rule Engine Status */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-ink-900 shadow-[5px_5px_0px_#121214]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-ink-900 gap-3">
              <div>
                <h3 className="font-serif font-black text-ink-900 text-xl flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-700" />
                  <span>Deterministic 8-Rule Clinical Evaluation</span>
                </h3>
                <p className="font-mono text-xs text-ink-500 mt-0.5">
                  Live evaluation of {profile.name}&apos;s continuous telemetry against the 8 transparent clinical heuristics.
                </p>
              </div>
              <div className="font-mono text-xs bg-[#FAF8F5] border-2 border-ink-900 rounded-2xl px-4 py-2 flex items-center gap-2 font-bold shadow-[2px_2px_0px_#121214]">
                <span>Triage Score:</span>
                <span className="text-base text-ink-900 font-serif font-black">{risk.score}/100</span>
                <span className="uppercase text-[10px] px-2 py-0.5 rounded-full bg-ink-900 text-white">{risk.band}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {[
                {
                  id: "MED_ADHERENCE_LOW",
                  label: "Low Medication Adherence (< 70%)",
                  weight: 25,
                  ruleThreshold: "Taken doses < 70% over rolling 7 days",
                },
                {
                  id: "MED_MISSED_STREAK",
                  label: "Consecutive Missed Doses (>= 2)",
                  weight: 15,
                  ruleThreshold: "2 or more consecutive missed doses",
                },
                {
                  id: "BP_TREND_UP",
                  label: "Elevated Blood Pressure Trend (> 8%)",
                  weight: 20,
                  ruleThreshold: "Avg systolic BP up > 8% vs prior 7 days",
                },
                {
                  id: "BP_HIGH_ABS",
                  label: "Critical Blood Pressure Threshold",
                  weight: 20,
                  ruleThreshold: "Latest Systolic >= 150 or Diastolic >= 95 mmHg",
                },
                {
                  id: "STEPS_DROP",
                  label: "Sharp Drop in Physical Activity (> 40%)",
                  weight: 10,
                  ruleThreshold: "Daily steps down > 40% vs 14d baseline",
                },
                {
                  id: "GLUCOSE_HIGH",
                  label: "Elevated Fasting Glucose (>= 180)",
                  weight: 15,
                  ruleThreshold: "Latest fasting blood glucose >= 180 mg/dL",
                },
                {
                  id: "RECENT_DISCHARGE",
                  label: "Recent Hospital Discharge (<= 14 days)",
                  weight: 10,
                  ruleThreshold: "Discharged within last 14 days (vulnerability window)",
                },
                {
                  id: "NO_DATA_48H",
                  label: "No Telemetry in 48 Hours",
                  weight: 15,
                  ruleThreshold: "No vitals or medicine logs for > 48 hours",
                },
              ].map((rule, idx) => {
                const triggeredReason = risk.reasons.find((r) => (r.rule_id || r.ruleId) === rule.id);
                const isTriggered = Boolean(triggeredReason);

                return (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-2xl border-2 border-ink-900 transition-all ${
                      isTriggered
                        ? "bg-[#FFF0F5] shadow-[3px_3px_0px_#E11D48]"
                        : "bg-[#FBF9F4] shadow-[2px_2px_0px_#121214]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black w-6 h-6 rounded-full bg-ink-900 text-white flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="font-mono text-xs font-bold text-ink-900">
                          {rule.label}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-ink-900 ${
                          isTriggered
                            ? "bg-rose-500 text-white"
                            : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        {isTriggered ? `ACTIVE (+${triggeredReason?.weight ?? rule.weight} pts)` : "NORMAL (0 pts)"}
                      </span>
                    </div>

                    <p className="font-mono text-[11px] text-ink-500 mb-2">
                      Threshold: {rule.ruleThreshold}
                    </p>

                    {isTriggered ? (
                      <div className="bg-white border border-rose-300 rounded-xl p-2.5 font-sans text-xs text-rose-900 font-medium">
                        ⚠️ {triggeredReason?.text}
                      </div>
                    ) : (
                      <div className="bg-white border border-emerald-300 rounded-xl p-2.5 font-mono text-[11px] text-emerald-800">
                        ✓ Telemetry within safe physiological baseline
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MEDICINE LOG */}
      {activeTab === "meds" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-ink-900 shadow-[5px_5px_0px_#121214]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-ink-900">
            <div>
              <h4 className="font-display font-black text-ink-900 text-lg">
                Prescription &amp; Adherence History
              </h4>
              <p className="font-body text-xs text-ink-500 mt-0.5">
                Dose confirmations captured via patient voice logging &amp; family confirmation
              </p>
            </div>
          </div>
          <MedicineLogTable logs={medLogs} />
        </div>
      )}

      {/* TAB 4: ESCALATIONS & ALERTS */}
      {activeTab === "alerts" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-ink-900 shadow-[5px_5px_0px_#121214]">
          <h4 className="font-display font-black text-ink-900 text-lg mb-3 flex items-center gap-2 pb-3 border-b-2 border-ink-900">
            <Bell className="w-4 h-4 text-ink-700" />
            <span>Escalation Ladder Alerts History ({alerts.length})</span>
          </h4>
          <div className="space-y-2.5">
            {alerts.length === 0 ? (
              <p className="text-center py-8 font-body text-xs text-ink-500">
                No escalation alerts recorded for this patient.
              </p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-xl bg-[#FAF8F5] border-2 border-ink-900 shadow-[2px_2px_0px_#121214] flex items-start justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-data font-bold uppercase px-2 py-0.5 rounded border border-ink-900 text-[10px] ${
                          alert.level === "doctor"
                            ? "bg-red-100 text-red-800"
                            : alert.level === "family"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-white text-ink-700"
                        }`}
                      >
                        {alert.level} alert
                      </span>
                      <span className="font-body text-ink-500">
                        Target: {alert.audience}
                      </span>
                    </div>
                    <p className="font-body font-medium text-ink-900 text-sm">
                      {alert.message}
                    </p>
                  </div>
                  <span className="font-data text-ink-500 shrink-0">
                    {alert.created_at}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DPDP CONSENT & ACCESS AUDIT LOG */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <SharedDataPanel consents={consents} />

          {/* ABDM / FHIR Interoperability Card */}
          <div className="bg-white rounded-2xl p-5 border-2 border-ink-900 shadow-[3px_3px_0px_#121214] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-display font-bold text-ink-900 text-sm flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-brand-indigo" />
                <span>Ayushman Bharat Digital Mission (ABDM) / FHIR R4 Bundle</span>
              </h4>
              <p className="font-body text-xs text-ink-500 mt-0.5">
                Standardized interoperability collection with LOINC and SNOMED CT coded telemetry
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFhirOpen(true)}
              className="gap-2 shrink-0 text-xs border-2 border-brand-indigo text-brand-indigo hover:bg-brand-indigo/5"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Preview &amp; Export FHIR R4</span>
            </Button>
          </div>

          <div className="bg-white rounded-3xl p-6 border-2 border-ink-900 shadow-[4px_4px_0px_#121214]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-ink-900">
              <div>
                <h4 className="font-display font-bold text-ink-900 text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-brand-teal" />
                  <span>Clinical Access Audit Trail</span>
                </h4>
                <p className="font-body text-xs text-ink-500">
                  Immutable record of patient telemetric data views by clinic staff
                </p>
              </div>
              <span className="font-data text-xs text-ink-500 font-semibold">
                DPDP Section 6 Compliance
              </span>
            </div>

            <div className="space-y-2.5">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs font-body text-ink-500">
                  No audit entries recorded yet
                </div>
              ) : (
                auditLogs.map((log) => <AuditRow key={log.id} log={log} />)
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Slide-over Brief Drawer (Upgraded in Phase 2) ─────────── */}
      <BriefPanel
        patientId={profile.id}
        patientName={profile.name}
        isOpen={isBriefOpen}
        onClose={() => setIsBriefOpen(false)}
        streamText={streamText}
        isStreaming={isStreaming}
        citations={citations}
        source={briefSource}
        error={briefError}
        onRefresh={handleStartBrief}
      />

      {/* ── Doctor Care Plan Update Modal (USP 2) ─────────────────── */}
      <DoctorNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        patientId={profile.id}
        patientName={profile.name}
        onSuccess={handleCarePlanSuccess}
      />

      {/* ── What-If Clinical Drug Simulator Drawer ────────────────── */}
      <WhatIfSimulator
        patientName={profile.name}
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
      />

      {/* ── ABDM / HL7 FHIR R4 Bundle Export Drawer ───────────────── */}
      <FhirExportDrawer
        detail={detail}
        isOpen={isFhirOpen}
        onClose={() => setIsFhirOpen(false)}
      />
    </div>
  );
}
