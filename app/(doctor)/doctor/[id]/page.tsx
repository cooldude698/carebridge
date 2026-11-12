"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles,
  FileText,
  History,
  ShieldCheck,
  RefreshCw,
  Sliders,
  FileCode2,
  Watch,
  ClipboardEdit,
  Loader2,
  AlertCircle,
  Activity,
  CheckCircle2,
  FileSignature,
  Pill,
  Mic,
  HeartPulse,
  Wind,
  Footprints,
  Flame,
  Droplets,
  XCircle,
} from "lucide-react";
import {
  PatientDetail,
  AuditLog,
  WearableContext,
  DiagnosisReport,
  Prescription,
  SymptomLog,
  Vital,
} from "@/lib/types";
import { MOCK_PATIENT_DETAILS, MOCK_AUDIT_LOGS } from "@/lib/mockData";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ReasonList } from "@/components/ui/ReasonList";
import { BriefPanel } from "@/components/ui/BriefPanel";
import { WearablePanel } from "@/components/ui/WearablePanel";
import { AuditRow } from "@/components/ui/AuditRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { ActionsBar } from "@/components/doctor/ActionsBar";
import { TrendCharts } from "@/components/doctor/TrendCharts";
import { MedicineLogTable } from "@/components/doctor/MedicineLogTable";
import { SharedDataPanel } from "@/components/doctor/SharedDataPanel";
import { DoctorNoteModal } from "@/components/doctor/DoctorNoteModal";
import { WhatIfSimulator } from "@/components/doctor/WhatIfSimulator";
import { FhirExportDrawer } from "@/components/doctor/FhirExportDrawer";
import { PrescriptionWriterModal } from "@/components/doctor/PrescriptionWriterModal";
import { resolveWearableContext } from "@/lib/wearable/resolve";
import { useBriefStream } from "@/lib/voice";

type CockpitTab =
  | "overview"
  | "wearable"
  | "diagnosis"
  | "prescriptions"
  | "meds"
  | "audit";

type ExtendedPatientDetail = PatientDetail & {
  wearable?: WearableContext | null;
  activePrescriptions?: Prescription[];
  latestDiagnosis?: DiagnosisReport | null;
  recentSymptoms?: SymptomLog[];
};

function latestVitalValue(vitals: Vital[], type: Vital["type"]): Vital | undefined {
  const list = vitals.filter((v) => v.type === type);
  return list[list.length - 1];
}

function getValA(v?: Vital): number | null {
  if (!v) return null;
  return v.value_a ?? v.valueA ?? null;
}

function getValB(v?: Vital): number | null {
  if (!v) return null;
  return v.value_b ?? v.valueB ?? null;
}

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = (params?.id as string) || "p1";

  const [detail, setDetail] = useState<ExtendedPatientDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [diagnosisReports, setDiagnosisReports] = useState<DiagnosisReport[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<CockpitTab>("overview");

  // Modals & Drawers
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [isFhirOpen, setIsFhirOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);

  // Diagnosis synthesis & review states
  const [symptomContext, setSymptomContext] = useState("");
  const [synthesizingDiag, setSynthesizingDiag] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Brief Streaming via SSE
  const {
    streamText,
    citations,
    isStreaming,
    source: briefSource,
    error: briefError,
    startStream,
    reset: resetBrief,
  } = useBriefStream();

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  const showToast = useCallback(
    (msg: string, type: "success" | "error" | "info" = "success") => {
      setToastMsg(msg);
      setToastType(type);
      setTimeout(() => setToastMsg(null), 5000);
    },
    []
  );

  const fetchPatientDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}?actor=doctor`);
      if (res.ok) {
        const data: ExtendedPatientDetail = await res.json();
        setDetail(data);
        if (data.diagnosisReports) setDiagnosisReports(data.diagnosisReports);
        if (data.prescriptions || data.activePrescriptions) {
          setPrescriptions(data.prescriptions ?? data.activePrescriptions ?? []);
        }
      } else {
        const fallback = MOCK_PATIENT_DETAILS[patientId] || MOCK_PATIENT_DETAILS["p1"];
        setDetail(fallback);
        if (fallback.diagnosisReports) setDiagnosisReports(fallback.diagnosisReports);
        if (fallback.prescriptions) setPrescriptions(fallback.prescriptions);
      }
    } catch {
      const fallback = MOCK_PATIENT_DETAILS[patientId] || MOCK_PATIENT_DETAILS["p1"];
      setDetail(fallback);
      if (fallback.diagnosisReports) setDiagnosisReports(fallback.diagnosisReports);
      if (fallback.prescriptions) setPrescriptions(fallback.prescriptions);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/audit`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(Array.isArray(data) ? data : []);
      } else {
        setAuditLogs(MOCK_AUDIT_LOGS.filter((l) => l.patient_id === patientId));
      }
    } catch {
      setAuditLogs(MOCK_AUDIT_LOGS.filter((l) => l.patient_id === patientId));
    }
  }, [patientId]);

  const fetchDiagnosisReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/diagnosis`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDiagnosisReports(data);
      }
    } catch {
      // Keep existing state
    }
  }, [patientId]);

  const fetchPrescriptions = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/prescriptions`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setPrescriptions(data);
      }
    } catch {
      // Keep existing state
    }
  }, [patientId]);

  useEffect(() => {
    setLoading(true);
    fetchPatientDetail();
    fetchAuditLogs();
    fetchDiagnosisReports();
    fetchPrescriptions();
  }, [fetchPatientDetail, fetchAuditLogs, fetchDiagnosisReports, fetchPrescriptions]);

  const handleStartBrief = () => {
    setIsBriefOpen(true);
    startStream(patientId);
  };

  const handleSynthesizeDiagnosis = async () => {
    if (synthesizingDiag) return;
    setSynthesizingDiag(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/diagnosis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptomNote: symptomContext.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const report: DiagnosisReport = data.report ?? data;
        setDiagnosisReports((prev) => [report, ...prev]);
        setSymptomContext("");
        showToast("New AI diagnosis report synthesized for physician review.");
      } else {
        // Fallback synthesis if backend route is not yet deployed
        const fallbackReport: DiagnosisReport = {
          id: `diag-${Date.now()}`,
          patient_id: patientId,
          generated_at: new Date().toISOString(),
          ai_summary: `Automated telemetry synthesis for ${detail?.profile.name}: ${
            detail?.risk.reasons.map((r) => r.text).join("; ") ||
            "Review latest watch BP, SpO2, and medication adherence."
          }${symptomContext.trim() ? ` Patient context: "${symptomContext.trim()}".` : ""}`,
          risk_flags: [],
          urgency: detail?.risk.band === "red" ? "urgent" : "soon",
          recommended_specialties: ["Internal Medicine", "Cardiometabolic Care"],
          lifestyle_recommendations: [
            "Maintain 4,500+ daily steps",
            "Follow low-glycemic, low-sodium diet",
          ],
          symptom_input: symptomContext.trim() || null,
          reading_ids: detail?.vitals.slice(-3).map((v) => v.id) ?? [],
          model_version: "carebridge-clinical-fallback",
          reviewed_by_doctor: null,
          doctor_notes: null,
          reviewed_at: null,
        };
        setDiagnosisReports((prev) => [fallbackReport, ...prev]);
        setSymptomContext("");
        showToast("Diagnosis draft synthesized locally (awaiting physician sign-off).", "info");
      }
    } catch {
      showToast("Could not synthesize diagnosis report.", "error");
    } finally {
      setSynthesizingDiag(false);
    }
  };

  const handleVerifyDiagnosis = async (reportId: string) => {
    setVerifyingId(reportId);
    const notes = (reviewNotes[reportId] || "").trim() || "Verified against watch telemetry & patient symptoms.";
    try {
      const res = await fetch(`/api/patients/${patientId}/diagnosis/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorNotes: notes,
          verify: true,
          doctorId: "d1",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated: DiagnosisReport = data.report ?? data;
        setDiagnosisReports((prev) =>
          prev.map((r) => (r.id === reportId ? updated : r))
        );
      } else {
        setDiagnosisReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  reviewed_by_doctor: "Dr. Meera Rao",
                  doctor_notes: notes,
                  reviewed_at: new Date().toISOString(),
                }
              : r
          )
        );
      }
      showToast("Diagnosis report verified and signed off by Dr. Meera Rao.");
      fetchAuditLogs();
    } catch {
      showToast("Failed to verify diagnosis report.", "error");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleUpdatePrescriptionStatus = async (
    rxId: string,
    status: "completed" | "cancelled"
  ) => {
    try {
      const res = await fetch(`/api/patients/${patientId}/prescriptions/${rxId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated: Prescription = data.prescription ?? data;
        setPrescriptions((prev) => prev.map((rx) => (rx.id === rxId ? updated : rx)));
      } else {
        setPrescriptions((prev) =>
          prev.map((rx) => (rx.id === rxId ? { ...rx, status } : rx))
        );
      }
      showToast(`Prescription marked as ${status}.`);
    } catch {
      showToast("Failed to update prescription status.", "error");
    }
  };

  if (loading || !detail) {
    return (
      <div className="max-w-5xl mx-auto space-y-5">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const { profile, risk, vitals, medLogs, consents = [], recentSymptoms = [] } = detail;
  const wearableData = resolveWearableContext(patientId, detail.wearable);

  const criticalOrHighAnomalies = wearableData.anomalyFlags.filter(
    (f) => f.severity === "CRITICAL" || f.severity === "HIGH"
  );
  const isUrgent = risk.band === "red" || criticalOrHighAnomalies.length > 0;

  // Latest watch vitals for overview strip
  const latestHr = getValA(latestVitalValue(vitals, "hr")) ?? wearableData.heartRate.mean;
  const latestSpo2 =
    getValA(latestVitalValue(vitals, "spo2")) ?? wearableData.spo2?.latest ?? null;
  const latestBpVital = latestVitalValue(vitals, "bp");
  const latestBpSys = getValA(latestBpVital) ?? wearableData.bloodPressure.latestSystolic;
  const latestBpDia = getValB(latestBpVital) ?? wearableData.bloodPressure.latestDiastolic;
  const latestGlucose = getValA(latestVitalValue(vitals, "glucose")) ?? wearableData.glucose.latestFasting;
  const latestSteps = getValA(latestVitalValue(vitals, "steps")) ?? wearableData.steps.dailyMean;
  const latestCalories =
    getValA(latestVitalValue(vitals, "calories")) ?? wearableData.calories?.latest ?? null;

  const tabs: { key: CockpitTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: <Activity className="w-3.5 h-3.5" /> },
    {
      key: "wearable",
      label: "Watch Telemetry",
      icon: <Watch className="w-3.5 h-3.5" />,
      badge: criticalOrHighAnomalies.length > 0 ? criticalOrHighAnomalies.length : undefined,
    },
    {
      key: "diagnosis",
      label: "Diagnosis Reports",
      icon: <FileText className="w-3.5 h-3.5" />,
      badge: diagnosisReports.filter((d) => !d.reviewed_by_doctor).length || undefined,
    },
    {
      key: "prescriptions",
      label: "Prescriptions",
      icon: <Pill className="w-3.5 h-3.5" />,
      badge: prescriptions.filter((p) => p.status === "active").length || undefined,
    },
    { key: "meds", label: "Med Adherence", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { key: "audit", label: "Consent & Audit", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-14">
      {/* Toast */}
      {toastMsg && (
        <Toast
          message={toastMsg}
          type={toastType}
          onClose={() => setToastMsg(null)}
        />
      )}

      {/* Urgent Top Notification Banner */}
      {isUrgent && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DC2626] text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-semibold text-sm text-[#7F1D1D] block">
                {criticalOrHighAnomalies.length > 0
                  ? `${criticalOrHighAnomalies.length} Critical/High Wearable ${
                      criticalOrHighAnomalies.length === 1 ? "Anomaly" : "Anomalies"
                    } Detected`
                  : "Patient in Acute Red Risk Band (>= 70)"}
              </span>
              <p className="text-xs text-[#991B1B]">
                {criticalOrHighAnomalies[0]?.title ||
                  "Immediate clinical review recommended: inspect watch telemetry & issue digital prescription."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRxModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Write Digital Rx
            </button>
            <button
              onClick={handleStartBrief}
              className="px-3.5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pre-Consult Brief</span>
            </button>
          </div>
        </div>
      )}

      {/* Patient Profile Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-[#E2E8F0]">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F0FDFA] border border-[#99F6E4] text-[#0D9488] font-display font-bold text-xl flex items-center justify-center shrink-0">
              {profile.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display font-bold text-2xl text-[#0F172A]">
                  {profile.name}
                </h1>
                <RiskBadge band={risk.band} score={risk.score} size="md" />
              </div>
              <p className="text-xs text-[#64748B] mt-1 flex flex-wrap items-center gap-2">
                <span>
                  Age: <strong className="text-[#0F172A]">{profile.age}y</strong>
                </span>
                <span>·</span>
                <span>
                  Language: <strong className="text-[#0F172A]">{profile.language}</strong>
                </span>
                <span>·</span>
                <span>
                  ID: <strong className="text-[#0F172A] font-mono">{profile.id}</strong>
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {profile.conditions.map((condition) => (
                  <span
                    key={condition}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[#334155] font-medium"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Clinical Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsRxModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <FileSignature className="w-4 h-4" />
              <span>Write Digital Prescription</span>
            </button>

            <button
              onClick={() => {
                if (!streamText) handleStartBrief();
                else setIsBriefOpen(true);
              }}
              disabled={isStreaming}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isStreaming ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Pre-Consult Brief (SSE)</span>
            </button>

            <button
              onClick={() => setIsWhatIfOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] text-xs font-medium transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>What-If Drug Simulator</span>
            </button>

            <button
              onClick={() => setIsNoteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] text-xs font-medium transition-colors cursor-pointer"
            >
              <ClipboardEdit className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>Update Care Plan Note</span>
            </button>

            <button
              onClick={() => setIsFhirOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] text-xs font-medium transition-colors cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5 text-[#64748B]" />
              <span>FHIR R4 Export</span>
            </button>
          </div>
        </div>

        {/* Outreach ActionsBar */}
        <ActionsBar
          patientId={profile.id}
          patientName={profile.name}
          onActionTriggered={(_, msg) => showToast(msg)}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#E2E8F0]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                isActive
                  ? "border-[#0D9488] text-[#0D9488] bg-white"
                  : "border-transparent text-[#64748B] hover:text-[#0F172A] hover:bg-white/60"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#FEF2F2] text-[#DC2626] text-[10px] font-bold tabular-nums">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Latest Watch Vitals Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] font-medium">
                <HeartPulse className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>Heart Rate</span>
              </div>
              <div className="font-bold text-lg text-[#0F172A] mt-1 tabular-nums">
                {latestHr ?? "—"} <span className="text-[11px] font-normal text-[#64748B]">bpm</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] font-medium">
                <Wind className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>SpO2</span>
              </div>
              <div
                className={`font-bold text-lg mt-1 tabular-nums ${
                  latestSpo2 !== null && latestSpo2 < 92 ? "text-[#DC2626]" : "text-[#0F172A]"
                }`}
              >
                {latestSpo2 ?? "—"} <span className="text-[11px] font-normal text-[#64748B]">%</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] font-medium">
                <Activity className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Blood Pressure</span>
              </div>
              <div className="font-bold text-lg text-[#0F172A] mt-1 tabular-nums">
                {latestBpSys}/{latestBpDia}{" "}
                <span className="text-[11px] font-normal text-[#64748B]">mmHg</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] font-medium">
                <Droplets className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Glucose</span>
              </div>
              <div className="font-bold text-lg text-[#0F172A] mt-1 tabular-nums">
                {latestGlucose ?? "—"} <span className="text-[11px] font-normal text-[#64748B]">mg/dL</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] font-medium">
                <Footprints className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Steps</span>
              </div>
              <div className="font-bold text-lg text-[#0F172A] mt-1 tabular-nums">
                {latestSteps?.toLocaleString() ?? "—"}
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] font-medium">
                <Flame className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Calories</span>
              </div>
              <div className="font-bold text-lg text-[#0F172A] mt-1 tabular-nums">
                {latestCalories ?? "—"} <span className="text-[11px] font-normal text-[#64748B]">kcal</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deterministic Risk Breakdown */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm text-[#0F172A]">
                  Deterministic Risk Breakdown
                </h3>
                <span className="text-xs font-semibold tabular-nums text-[#64748B]">
                  Score: {risk.score} / 100
                </span>
              </div>
              <ReasonList reasons={risk.reasons} />
            </div>

            {/* Patient Voice-Reported Symptoms ("Word of Mouth") */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm text-[#0F172A] flex items-center gap-2">
                  <Mic className="w-4 h-4 text-[#4F46E5]" />
                  <span>Patient Voice-Reported Symptoms (&ldquo;Word of Mouth&rdquo;)</span>
                </h3>
                <span className="text-[11px] font-medium text-[#64748B]">
                  Voice Assistant Logs
                </span>
              </div>

              {recentSymptoms.length > 0 ? (
                <div className="space-y-2.5">
                  {recentSymptoms.map((sym) => (
                    <div
                      key={sym.id}
                      className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                            (sym.severity_hint ?? sym.severityHint) === "high"
                              ? "bg-[#FEE2E2] text-[#DC2626]"
                              : (sym.severity_hint ?? sym.severityHint) === "moderate"
                              ? "bg-[#FEF3C7] text-[#D97706]"
                              : "bg-[#F1F5F9] text-[#475569]"
                          }`}
                        >
                          {sym.severity_hint ?? sym.severityHint} severity
                        </span>
                        <span className="text-[11px] text-[#64748B]">
                          {new Date(sym.created_at ?? sym.createdAt ?? "").toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#0F172A] italic">
                        &ldquo;{sym.raw_text ?? sym.rawText}&rdquo;
                      </p>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {(sym.extracted_symptoms ?? sym.extractedSymptoms ?? []).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] text-[#475569]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-[#F8FAFC] border border-dashed border-[#CBD5E1] text-center text-xs text-[#64748B]">
                  No voice-reported symptoms logged in the last 7 days. Patient can speak symptoms anytime via Ask CareBridge.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WATCH TELEMETRY */}
      {activeTab === "wearable" && (
        <div className="space-y-6">
          <WearablePanel wearable={wearableData} />
          <TrendCharts vitals={vitals} />
        </div>
      )}

      {/* TAB 3: DIAGNOSIS REPORTS & DOCTOR VERIFICATION */}
      {activeTab === "diagnosis" && (
        <div className="space-y-5">
          {/* Synthesize New Report Bar */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-semibold text-sm text-[#0F172A]">
                  AI-Assisted Medical Diagnosis Reports
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  AI-assisted clinical decision support. Final diagnosis &amp; treatment decisions remain strictly with the physician.
                </p>
              </div>
              <button
                onClick={handleSynthesizeDiagnosis}
                disabled={synthesizingDiag}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {synthesizingDiag ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Synthesize New AI Diagnosis Report</span>
                  </>
                )}
              </button>
            </div>

            <input
              type="text"
              value={symptomContext}
              onChange={(e) => setSymptomContext(e.target.value)}
              placeholder="Optional clinical context or patient-reported symptom (e.g. mild dizziness on standing)..."
              className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#0D9488]"
            />
          </div>

          {synthesizingDiag && <Skeleton className="h-44 w-full rounded-2xl" />}

          {diagnosisReports.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center text-xs text-[#64748B]">
              No diagnosis reports generated yet. Click &ldquo;Synthesize New AI Diagnosis Report&rdquo; above.
            </div>
          ) : (
            <div className="space-y-4">
              {diagnosisReports.map((report) => {
                const isVerified = Boolean(report.reviewed_by_doctor ?? report.reviewedByDoctor);
                const summary = report.ai_summary ?? report.aiSummary ?? "";
                const recs =
                  report.lifestyle_recommendations ?? report.lifestyleRecommendations ?? [];
                return (
                  <div
                    key={report.id}
                    className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${
                            report.urgency === "emergency" || report.urgency === "urgent"
                              ? "bg-[#FEE2E2] text-[#DC2626]"
                              : report.urgency === "soon"
                              ? "bg-[#FEF3C7] text-[#D97706]"
                              : "bg-[#F0FDF4] text-[#059669]"
                          }`}
                        >
                          {report.urgency}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          Generated{" "}
                          {new Date(report.generated_at ?? report.generatedAt ?? "").toLocaleString()}
                        </span>
                      </div>

                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified by {report.reviewed_by_doctor ?? report.reviewedByDoctor}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-0.5 rounded-full">
                          Pending Physician Sign-Off
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-[#0F172A] leading-relaxed">{summary}</p>

                    {recs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {recs.map((rec, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155]"
                          >
                            {rec}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Inline Doctor Review & Verification Panel */}
                    {isVerified ? (
                      <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#334155]">
                        <span className="font-semibold text-[#0F172A]">Physician Sign-Off Notes: </span>
                        {report.doctor_notes ?? report.doctorNotes}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                        <label className="block text-xs font-semibold text-[#0F172A]">
                          Doctor Verification &amp; Clinical Notes
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Add clinical verification notes before signing off..."
                          value={reviewNotes[report.id] || ""}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({
                              ...prev,
                              [report.id]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-[#64748B]">
                            AI-assisted clinical decision support. Final diagnosis &amp; treatment decisions remain strictly with the physician.
                          </span>
                          <button
                            onClick={() => handleVerifyDiagnosis(report.id)}
                            disabled={verifyingId === report.id}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {verifyingId === report.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Verify &amp; Sign Off Report</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DIGITAL PRESCRIPTIONS */}
      {activeTab === "prescriptions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
            <div>
              <h3 className="font-display font-semibold text-sm text-[#0F172A]">
                Paperless Digital Prescriptions
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Synced directly to Patient App, Watch Companion targets, Guardian feed, and WhatsApp.
              </p>
            </div>
            <button
              onClick={() => setIsRxModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold shadow-sm cursor-pointer"
            >
              <FileSignature className="w-4 h-4" />
              <span>Issue New Prescription</span>
            </button>
          </div>

          {prescriptions.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center text-xs text-[#64748B]">
              No digital prescriptions issued yet. Click &ldquo;Issue New Prescription&rdquo; to create one.
            </div>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${
                            rx.status === "active"
                              ? "bg-[#F0FDF4] text-[#059669]"
                              : rx.status === "completed"
                              ? "bg-[#F1F5F9] text-[#475569]"
                              : "bg-[#FEF2F2] text-[#DC2626]"
                          }`}
                        >
                          {rx.status}
                        </span>
                        <span className="text-xs font-semibold text-[#0F172A]">
                          {rx.doctor_name ?? rx.doctorName}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          · Issued {new Date(rx.issued_at ?? rx.issuedAt ?? "").toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#475569] mt-1">
                        {rx.doctor_summary ?? rx.doctorSummary}
                      </p>
                    </div>

                    {rx.status === "active" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdatePrescriptionStatus(rx.id, "completed")}
                          className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-medium text-[#334155] cursor-pointer"
                        >
                          Mark Completed
                        </button>
                        <button
                          onClick={() => handleUpdatePrescriptionStatus(rx.id, "cancelled")}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#FECACA] hover:bg-[#FEF2F2] text-xs font-medium text-[#DC2626] cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Medicines */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {rx.medicines.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs"
                      >
                        <div className="font-semibold text-[#0F172A]">
                          {m.medicine_name ?? m.medicineName} · {m.dosage}
                        </div>
                        <div className="text-[#475569] mt-0.5">
                          {m.frequency} ({m.times.join(", ")}) · {m.duration}
                        </div>
                        <div className="text-[11px] text-[#64748B] mt-0.5">
                          {(m.with_food ?? m.withFood) ? "Take after food" : "Take before food"}
                          {m.instructions ? ` · ${m.instructions}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Lifestyle Targets */}
                  {(rx.lifestyle_targets ?? rx.lifestyleTargets ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(rx.lifestyle_targets ?? rx.lifestyleTargets ?? []).map((lt) => (
                        <span
                          key={lt.id}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-[#EEF2FF] text-[#4F46E5] font-medium"
                        >
                          {lt.category.toUpperCase()}: {lt.description}
                          {(lt.target_value ?? lt.targetValue)
                            ? ` (${lt.target_value ?? lt.targetValue} ${lt.unit || ""})`
                            : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MED ADHERENCE */}
      {activeTab === "meds" && <MedicineLogTable logs={medLogs} />}

      {/* TAB 6: CONSENT & AUDIT */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <SharedDataPanel consents={consents} />

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-display font-semibold text-sm text-[#0F172A] flex items-center gap-2">
              <History className="w-4 h-4 text-[#64748B]" />
              <span>DPDP Act Clinical Access Audit Log</span>
            </h3>
            <div className="divide-y divide-[#E2E8F0]">
              {auditLogs.map((log) => (
                <AuditRow key={log.id} log={log} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      {isBriefOpen && (
        <BriefPanel
          patientName={profile.name}
          streamText={streamText}
          citations={citations}
          isStreaming={isStreaming}
          source={briefSource}
          error={briefError}
          onClose={() => {
            setIsBriefOpen(false);
            resetBrief();
          }}
        />
      )}

      <WhatIfSimulator
        patientName={profile.name}
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
      />

      <DoctorNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        patientId={profile.id}
        patientName={profile.name}
        onSuccess={(msg) => {
          showToast(msg);
          fetchAuditLogs();
        }}
      />

      <FhirExportDrawer
        detail={detail}
        isOpen={isFhirOpen}
        onClose={() => setIsFhirOpen(false)}
      />

      <PrescriptionWriterModal
        isOpen={isRxModalOpen}
        onClose={() => setIsRxModalOpen(false)}
        patientId={profile.id}
        patientName={profile.name}
        patientConditions={profile.conditions}
        latestDiagnosis={diagnosisReports[0] ?? detail.latestDiagnosis ?? null}
        onIssued={(newRx) => {
          setPrescriptions((prev) => [newRx, ...prev]);
          showToast(
            "Digital prescription issued & synced across Patient, Watch Companion & Guardian."
          );
          fetchAuditLogs();
        }}
      />
    </div>
  );
}
