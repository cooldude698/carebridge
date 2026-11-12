'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, Mic, Pill, RefreshCw } from 'lucide-react';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { BottomNav } from '@/components/patient/BottomNav';
import { PatientPrescriptionCard } from '@/components/patient/PatientPrescriptionCard';
import { PatientGoalCard } from '@/components/patient/PatientGoalCard';
import { PatientToast } from '@/components/patient/PatientToast';
import { usePatientLocale } from '@/components/patient/usePatientLocale';
import { t } from '@/lib/i18n';
import { GoalsResponse, MedLog, PatientDetail, Prescription } from '@/lib/types';

const PATIENT_ID = 'p1';

export default function PatientMedicinesPage() {
  const { locale, changeLocale } = usePatientLocale('en');

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medLogs, setMedLogs] = useState<MedLog[]>([]);
  const [goalsData, setGoalsData] = useState<GoalsResponse>({ goals: [], latestNote: null });
  const [compliancePct, setCompliancePct] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [loadingMedId, setLoadingMedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const fetchData = useCallback(async () => {
    try {
      const [rxRes, detailRes, goalsRes] = await Promise.all([
        fetch(`/api/patients/${PATIENT_ID}/prescriptions`, { cache: 'no-store' }),
        fetch(`/api/patients/${PATIENT_ID}?actor=patient`, { cache: 'no-store' }),
        fetch(`/api/patients/${PATIENT_ID}/goals`, { cache: 'no-store' }),
      ]);

      if (rxRes.ok) {
        const rxData = (await rxRes.json()) as Prescription[];
        setPrescriptions(Array.isArray(rxData) ? rxData : []);
      }

      if (detailRes.ok) {
        const detail = (await detailRes.json()) as PatientDetail;
        const todayDateStr = new Date().toDateString();
        const logs = detail.medLogs || [];
        const todayOnly = logs.filter((l) => {
          const raw = l.scheduled_at || l.scheduledAt;
          if (!raw) return false;
          const d = new Date(raw);
          return !isNaN(d.getTime()) && d.toDateString() === todayDateStr;
        });
        setMedLogs(todayOnly.length > 0 ? todayOnly : logs.slice(0, 4));
        if (typeof detail.medCompliancePct === 'number') {
          setCompliancePct(detail.medCompliancePct);
        }
      }

      if (goalsRes.ok) {
        const gData = (await goalsRes.json()) as GoalsResponse;
        setGoalsData(gData);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkTaken = async (medicineId: string) => {
    setLoadingMedId(medicineId);

    // Optimistic update on matching log
    setMedLogs((prev) => {
      const exists = prev.some((l) => (l.medicine_id || l.medicineId) === medicineId);
      if (exists) {
        return prev.map((l) =>
          (l.medicine_id || l.medicineId) === medicineId
            ? { ...l, status: 'taken', taken_at: new Date().toISOString() }
            : l
        );
      }
      return [
        {
          id: `opt-${Date.now()}`,
          patient_id: PATIENT_ID,
          medicine_id: medicineId,
          status: 'taken',
          scheduled_at: new Date().toISOString(),
          taken_at: new Date().toISOString(),
        },
        ...prev,
      ];
    });

    try {
      const res = await fetch(`/api/patients/${PATIENT_ID}/med-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineId, status: 'taken' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.compliancePct === 'number') {
          setCompliancePct(data.compliancePct);
        }
      }
      showToast(t('med_logged', locale));
      await fetchData();
    } catch {
      showToast('Could not sync medication status');
    } finally {
      setLoadingMedId(null);
    }
  };

  const handleGoalComplete = async (goalId: string) => {
    setGoalsData((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId ? { ...g, completed_at: new Date().toISOString() } : g
      ),
    }));
    showToast(t('doctor_note.goal_completed', locale));

    try {
      await fetch(`/api/patients/${PATIENT_ID}/goals/${goalId}/complete`, {
        method: 'POST',
      });
    } catch {
      // ignore
    }
  };

  const activePrescriptions = prescriptions.filter((rx) => rx.status === 'active');
  const displayPrescriptions =
    activePrescriptions.length > 0 ? activePrescriptions : prescriptions;

  const uniqueMedCount = Math.max(
    medLogs.length,
    displayPrescriptions.reduce((sum, rx) => sum + rx.medicines.length, 0)
  );
  const takenTodayCount = medLogs.filter((l) => l.status === 'taken').length;
  const pct = uniqueMedCount > 0 ? Math.min(100, Math.round((takenTodayCount / uniqueMedCount) * 100)) : compliancePct;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-28">
      <PatientHeader
        locale={locale}
        onLocaleChange={changeLocale}
        showBack
        backHref="/patient"
        title={t('rx.title', locale)}
      />

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-6">
        {/* Today's Adherence Summary Card */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
                Today&apos;s Adherence
              </p>
              <h2 className="text-2xl font-semibold text-[#0F172A] mt-1 tabular-nums">
                {takenTodayCount} of {uniqueMedCount} doses taken ({pct}%)
              </h2>
              <p className="text-sm text-[#475569] mt-0.5">{t('rx.subtitle', locale)}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="w-11 h-11 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#0D9488] flex items-center justify-center">
                <Pill className="w-5 h-5" />
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] tabular-nums">
                7d avg {compliancePct}%
              </span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0D9488] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>

        {/* Quick Voice Check-off Link */}
        <Link
          href="/patient/voice"
          className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] hover:bg-[#CCFBF1]/40 transition-colors min-h-[56px]"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-[#0D9488] text-white flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm sm:text-base font-semibold text-[#0F172A]">
                Prefer speaking? Say &quot;Maine dawai le li&quot;
              </p>
              <p className="text-xs sm:text-sm text-[#475569]">
                Log medicines or ask nutrition questions in Hindi, Kannada, or English
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[#0D9488] shrink-0" />
        </Link>

        {/* Active Paperless Prescriptions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#0F172A]">
              Active Digital Prescriptions
            </h3>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] min-h-[40px] px-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-3 animate-pulse">
              <div className="h-5 bg-[#E2E8F0] rounded w-48" />
              <div className="h-20 bg-[#F1F5F9] rounded-xl" />
              <div className="h-20 bg-[#F1F5F9] rounded-xl" />
            </div>
          ) : displayPrescriptions.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center text-[#64748B]">
              {t('rx.empty', locale)}
            </div>
          ) : (
            <div className="space-y-4">
              {displayPrescriptions.map((rx) => (
                <PatientPrescriptionCard
                  key={rx.id}
                  prescription={rx}
                  medLogs={medLogs}
                  loadingMedId={loadingMedId}
                  onToggleMedicine={handleMarkTaken}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </section>

        {/* Daily Lifestyle & Diet Goals */}
        {goalsData.goals.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-[#0F172A]">
              {t('rx.lifestyle_title', locale)}
            </h3>
            <div className="space-y-2.5">
              {goalsData.goals.map((g) => (
                <PatientGoalCard
                  key={g.id}
                  id={g.id}
                  category={g.category}
                  target={g.target}
                  by={g.by_date}
                  isCompleted={Boolean(g.completed_at)}
                  onComplete={handleGoalComplete}
                />
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-[#64748B] text-center">
          {t('decision_support_note', locale)}
        </p>
      </main>

      <PatientToast message={toast} />
      <BottomNav locale={locale} />
    </div>
  );
}
