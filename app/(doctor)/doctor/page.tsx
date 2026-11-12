"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Activity,
  Sparkles,
  FileSignature,
  Watch,
} from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";
import { Skeleton } from "@/components/ui/Skeleton";
import { AdminROIResponse, PatientListItem } from "@/lib/types";

export default function DoctorOverviewPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [roi, setRoi] = useState<AdminROIResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const [patientsRes, roiRes] = await Promise.all([
          fetch("/api/patients"),
          fetch("/api/admin/roi"),
        ]);

        if (active && patientsRes.ok) {
          const pData: PatientListItem[] = await patientsRes.json();
          setPatients(Array.isArray(pData) ? pData : []);
        }
        if (active && roiRes.ok) {
          const rData: AdminROIResponse = await roiRes.json();
          setRoi(rData);
        }
      } catch {
        // Keep empty/last known state on transient failure
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const sortedPatients = [...patients].sort((a, b) => b.score - a.score);
  const redPatients = sortedPatients.filter((p) => p.band === "red");
  const yellowPatients = sortedPatients.filter((p) => p.band === "yellow");
  const topPriorityPatient = redPatients[0] || yellowPatients[0] || sortedPatients[0] || null;

  const activeCohortCount = roi?.patientsMonitored ?? patients.length;
  const urgentCount = redPatients.length;
  const alertsActionedCount = roi?.alertsActioned ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Priority Clinical Alert Banner */}
      {loading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : topPriorityPatient ? (
        <div
          className={`rounded-2xl p-6 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
            topPriorityPatient.band === "red"
              ? "bg-[#FEF2F2] border-[#FECACA]"
              : topPriorityPatient.band === "yellow"
              ? "bg-[#FFFBEB] border-[#FDE68A]"
              : "bg-[#F0FDF4] border-[#BBF7D0]"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white ${
                topPriorityPatient.band === "red"
                  ? "bg-[#DC2626]"
                  : topPriorityPatient.band === "yellow"
                  ? "bg-[#D97706]"
                  : "bg-[#059669]"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    topPriorityPatient.band === "red"
                      ? "bg-[#DC2626] text-white"
                      : topPriorityPatient.band === "yellow"
                      ? "bg-[#D97706] text-white"
                      : "bg-[#059669] text-white"
                  }`}
                >
                  {topPriorityPatient.band === "red"
                    ? "Urgent Action Required"
                    : topPriorityPatient.band === "yellow"
                    ? "Watchlist Priority"
                    : "Cohort Stable"}
                </span>
                <span className="text-xs font-semibold tabular-nums text-[#334155]">
                  Risk Score: {topPriorityPatient.score} / 100
                </span>
              </div>
              <h2 className="font-display font-bold text-xl text-[#0F172A] mt-1.5">
                {topPriorityPatient.name} ({topPriorityPatient.age}y)
              </h2>
              <p className="text-sm text-[#475569] mt-0.5">
                {topPriorityPatient.topReason}
              </p>
            </div>
          </div>

          <Link
            href={`/doctor/${topPriorityPatient.id}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold transition-colors shrink-0 shadow-sm"
          >
            <span>Open Clinical Cockpit</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : null}

      {/* Live Clinical Telemetry KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile
          label="Active Monitored Patients"
          value={loading ? "—" : activeCohortCount}
          subValue="patients"
          trend="neutral"
          trendText="Sunrise Clinic live roster"
          className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
        />

        <StatTile
          label="Urgent / Red Queue"
          value={loading ? "—" : urgentCount}
          subValue={urgentCount === 1 ? "patient" : "patients"}
          trend={urgentCount > 0 ? "up" : "down"}
          trendText={
            urgentCount > 0
              ? `${redPatients[0]?.name} requires review`
              : "Zero critical escalations"
          }
          className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
        />

        <StatTile
          label="Alerts Actioned"
          value={loading ? "—" : alertsActionedCount}
          subValue="events"
          trend="up"
          trendText={
            roi
              ? `${roi.readmissionsPrevented} readmissions averted`
              : "Continuous closed-loop"
          }
          className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
        />
      </div>

      {/* Clinical Workflow Orientation Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-lg text-[#0F172A] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#0D9488]" />
              <span>CareBridge Clinical Decision Support</span>
            </h3>
            <p className="text-sm text-[#475569] leading-relaxed mt-1.5">
              CareBridge ingests continuous smartwatch telemetry (SpO2, nocturnal heart rate, blood pressure, glucose, steps, and calories) alongside patient voice-reported symptoms. Select a patient from the triage queue to inspect trends, review AI diagnosis reports, and issue paperless digital prescriptions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0]">
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-[#0D9488] font-semibold text-xs mb-1.5">
              <Watch className="w-4 h-4" />
              <span>Wearable Anomaly Triage</span>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Deterministic rules flag SpO2 drops (&lt;92%), nocturnal tachycardia (&gt;100 bpm), and BP spikes with cited reading IDs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-[#4F46E5] font-semibold text-xs mb-1.5">
              <FileSignature className="w-4 h-4" />
              <span>Paperless Digital Rx</span>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Issue structured medication schedules and diet/step/calorie targets that sync straight to patient, watch, and guardian.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-[#059669] font-semibold text-xs mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>DPDP Act &amp; Citation Audit</span>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Every AI brief and diagnosis report is grounded in real DB vitals with full consent enforcement and audit logging.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#64748B] pt-1">
          <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
          <span>
            AI-assisted clinical decision support. Final diagnosis &amp; treatment decisions remain strictly with the physician.
          </span>
        </div>
      </div>
    </div>
  );
}
