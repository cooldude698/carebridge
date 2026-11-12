'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Droplets,
  Flame,
  Footprints,
  Heart,
  Loader2,
  Mic,
  Phone,
  Pill,
  RefreshCw,
  Stethoscope,
  Watch,
  Wind,
} from 'lucide-react';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { BottomNav } from '@/components/patient/BottomNav';
import { WatchSyncPill } from '@/components/patient/WatchSyncPill';
import { PatientDiagnosisCard } from '@/components/patient/PatientDiagnosisCard';
import { PatientGoalCard } from '@/components/patient/PatientGoalCard';
import { PatientToast } from '@/components/patient/PatientToast';
import { usePatientLocale } from '@/components/patient/usePatientLocale';
import { t } from '@/lib/i18n';
import {
  DiagnosisReport,
  GoalsResponse,
  MedLog,
  PatientDetail,
  Prescription,
} from '@/lib/types';

const PATIENT_ID = 'p1';

export default function PatientHomePage() {
  const { locale, changeLocale } = usePatientLocale('en');

  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [reports, setReports] = useState<DiagnosisReport[]>([]);
  const [goalsData, setGoalsData] = useState<GoalsResponse>({
    goals: [],
    latestNote: null,
  });

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoggingMed, setIsLoggingMed] = useState(false);
  const [acknowledgedFlags, setAcknowledgedFlags] = useState<Record<string, boolean>>({});
  const [isSendingFlag, setIsSendingFlag] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [pRes, rxRes, diagRes, gRes] = await Promise.all([
        fetch(`/api/patients/${PATIENT_ID}?actor=patient`, { cache: 'no-store' }),
        fetch(`/api/patients/${PATIENT_ID}/prescriptions`, { cache: 'no-store' }),
        fetch(`/api/patients/${PATIENT_ID}/diagnosis`, { cache: 'no-store' }),
        fetch(`/api/patients/${PATIENT_ID}/goals`, { cache: 'no-store' }),
      ]);

      if (!pRes.ok) throw new Error('Unable to load patient telemetry');
      setLoadError(null);
      const pJson = (await pRes.json()) as PatientDetail;
      setDetail(pJson);

      if (rxRes.ok) {
        const rxJson = (await rxRes.json()) as Prescription[];
        setPrescriptions(Array.isArray(rxJson) ? rxJson : []);
      } else if (pJson.activePrescriptions) {
        setPrescriptions(pJson.activePrescriptions);
      }

      if (diagRes.ok) {
        const dJson = (await diagRes.json()) as DiagnosisReport[];
        setReports(Array.isArray(dJson) ? dJson : []);
      } else if (pJson.latestDiagnosis) {
        setReports([pJson.latestDiagnosis]);
      }

      if (gRes.ok) {
        const gJson = (await gRes.json()) as GoalsResponse;
        setGoalsData(gJson);
      }
    } catch {
      setLoadError('Could not refresh live clinic data. Tap Retry to try again.');
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const kickOff = setTimeout(() => {
      void loadAll();
    }, 0);
    const timer = setInterval(() => {
      void loadAll();
    }, 8000);
    return () => {
      clearTimeout(kickOff);
      clearInterval(timer);
    };
  }, [loadAll]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting_morning', locale);
    if (hour < 17) return t('greeting_afternoon', locale);
    return t('greeting_evening', locale);
  };

  const nowDateStr = new Date().toDateString();
  const allMedLogs = detail?.medLogs || [];
  const todayLogs: MedLog[] = (() => {
    const filtered = allMedLogs.filter((l) => {
      const raw = l.scheduled_at || l.scheduledAt;
      if (!raw) return false;
      const d = new Date(raw);
      return !isNaN(d.getTime()) && d.toDateString() === nowDateStr;
    });
    return filtered.length > 0 ? filtered : allMedLogs.slice(0, 3);
  })();

  const pendingLogs = todayLogs.filter((l) => l.status === 'pending');
  const nextLog = pendingLogs[0] || null;
  const activeMedicines = detail?.medicines || [];
  const nextMed = nextLog
    ? activeMedicines.find((m) => m.id === (nextLog.medicine_id || nextLog.medicineId))
    : null;

  const activeRx = prescriptions.find((rx) => rx.status === 'active') || prescriptions[0] || null;
  const latestReport = reports[0] || detail?.latestDiagnosis || null;

  const handleMarkTaken = async (medicineId: string) => {
    if (!medicineId) return;
    setIsLoggingMed(true);

    try {
      const res = await fetch(`/api/patients/${PATIENT_ID}/med-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineId, status: 'taken' }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast(t('med_logged', locale));
      await loadAll();
    } catch {
      showToast('Could not save dose log. Please try again.', 'error');
    } finally {
      setIsLoggingMed(false);
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
      const res = await fetch(`/api/patients/${PATIENT_ID}/goals/${goalId}/complete`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed');
    } catch {
      setGoalsData((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === goalId ? { ...g, completed_at: null } : g)),
      }));
      showToast('Could not save goal status', 'error');
    }
  };

  const handleShareFlag = async (ruleId: string) => {
    setIsSendingFlag((prev) => ({ ...prev, [ruleId]: true }));
    try {
      const res = await fetch(`/api/patients/${PATIENT_ID}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'flag_acknowledged', valueA: 1 }),
      });
      if (!res.ok) throw new Error('Failed');
      setAcknowledgedFlags((prev) => ({ ...prev, [ruleId]: true }));
      showToast(t('wearable.sent', locale));
    } catch {
      showToast('Could not share alert with doctor', 'error');
    } finally {
      setIsSendingFlag((prev) => ({ ...prev, [ruleId]: false }));
    }
  };

  const wearable = detail?.wearable;
  const spo2Val = wearable?.spo2?.latest ?? 97;
  const hrVal = wearable?.heartRate?.mean ?? 72;
  const bpVal = wearable
    ? `${wearable.bloodPressure.latestSystolic}/${wearable.bloodPressure.latestDiastolic}`
    : '140/88';
  const stepsVal = wearable?.steps?.dailyMean ?? 2840;
  const caloriesVal = wearable?.calories?.latest ?? wearable?.calories?.dailyMean ?? 310;

  const urgentFlags = (wearable?.anomalyFlags || []).filter(
    (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
  );

  const getFlagMessage = (ruleId: string, fallbackDetail: string) => {
    const id = ruleId.toUpperCase();
    if (id.includes('SPO2')) return t('wearable.spo2_low', locale);
    if (id.includes('HR') || id.includes('NOCTURNAL')) {
      return t('wearable.hr_nocturnal_high', locale);
    }
    if (id.includes('STEP')) return t('wearable.steps_decline', locale);
    if (id.includes('GLUCOSE')) return t('wearable.glucose_high', locale);
    return fallbackDetail;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-28">
      <PatientHeader locale={locale} onLocaleChange={changeLocale} />

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-6">
        {loadError && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[#DC2626] font-medium">{loadError}</p>
            <button
              type="button"
              onClick={loadAll}
              className="inline-flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-xl bg-white border border-[#FECACA] text-sm font-semibold text-[#DC2626] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* 1. Greeting & Watch Sync Hero Card */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#0D9488]">{getGreeting()},</p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0F172A] mt-0.5">
                {detail?.profile?.name || 'Ramesh K.'} {t('ji', locale)}
              </h2>
              <p className="text-base text-[#475569] mt-1">
                {isInitialLoading
                  ? 'Syncing your daily care schedule...'
                  : pendingLogs.length > 0
                  ? `${pendingLogs.length} scheduled medicine${pendingLogs.length > 1 ? 's' : ''} remaining today`
                  : t('all_caught_up', locale)}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <WatchSyncPill
                provider={
                  detail?.wearableDevice?.provider === 'google_fit'
                    ? 'Google Fit Bridge'
                    : detail?.wearableDevice?.device_name || 'Google Fit Bridge'
                }
                lastSyncedAt={detail?.wearableDevice?.last_synced_at || wearable?.lastUpdated}
                status={detail?.wearableDevice?.is_active === false ? 'offline' : 'connected'}
              />
              <Link
                href="/patient/watch"
                className="text-sm font-medium text-[#0D9488] hover:text-[#0F766E] inline-flex items-center gap-1"
              >
                <Watch className="w-4 h-4" />
                <span>View Watch Sync →</span>
              </Link>
            </div>
          </div>

          {/* Voice Local LLM Prompt Bar */}
          <Link
            href="/patient/voice"
            className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] hover:bg-[#CCFBF1]/40 transition-colors min-h-[54px]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-full bg-[#0D9488] text-white flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" />
              </span>
              <span className="text-sm sm:text-base font-medium text-[#0F172A] truncate">
                {t('voice_hint', locale)}
              </span>
            </div>
            <span className="text-sm font-semibold text-[#0F766E] inline-flex items-center gap-1 shrink-0">
              <span>Ask AI</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </section>

        {/* 2. 4 Live Watch Telemetry Summary Tiles */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#0F172A]">
              {t('today_summary', locale)}
            </h3>
            <Link
              href="/patient/vitals"
              className="text-sm font-medium text-[#0D9488] hover:text-[#0F766E]"
            >
              View trends →
            </Link>
          </div>

          {isInitialLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white border border-[#E2E8F0] rounded-2xl p-4 h-28 animate-pulse"
                >
                  <div className="h-3 bg-[#E2E8F0] rounded w-20 mb-3" />
                  <div className="h-7 bg-[#E2E8F0] rounded w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Blood Oxygen */}
              <Link
                href="/patient/vitals?tab=spo2"
                className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all"
              >
                <div className="flex items-center gap-1.5 text-sm font-medium text-[#64748B]">
                  <Wind className="w-4 h-4 text-[#0D9488]" />
                  <span>Blood Oxygen</span>
                </div>
                <p className="text-2xl font-semibold text-[#0F172A] mt-2 tabular-nums">
                  {spo2Val}
                  <span className="text-sm font-normal text-[#64748B] ml-1">%</span>
                </p>
                <p
                  className={`text-xs font-medium mt-1 ${
                    spo2Val < 92 ? 'text-[#DC2626]' : 'text-[#15803D]'
                  }`}
                >
                  {spo2Val < 92 ? 'Check with clinic' : 'Normal range'}
                </p>
              </Link>

              {/* Heart Rate */}
              <Link
                href="/patient/vitals?tab=hr"
                className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all"
              >
                <div className="flex items-center gap-1.5 text-sm font-medium text-[#64748B]">
                  <Activity className="w-4 h-4 text-[#4F46E5]" />
                  <span>Heart Rate</span>
                </div>
                <p className="text-2xl font-semibold text-[#0F172A] mt-2 tabular-nums">
                  {hrVal}
                  <span className="text-sm font-normal text-[#64748B] ml-1">bpm</span>
                </p>
                <p className="text-xs text-[#64748B] mt-1 tabular-nums">
                  Resting avg · max {wearable?.heartRate?.max ?? 88}
                </p>
              </Link>

              {/* Blood Pressure */}
              <Link
                href="/patient/vitals?tab=bp"
                className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all"
              >
                <div className="flex items-center gap-1.5 text-sm font-medium text-[#64748B]">
                  <Heart className="w-4 h-4 text-[#D97706]" />
                  <span>Blood Pressure</span>
                </div>
                <p className="text-2xl font-semibold text-[#0F172A] mt-2 tabular-nums">
                  {bpVal}
                </p>
                <p className="text-xs text-[#64748B] mt-1">mmHg · target &lt;130/80</p>
              </Link>

              {/* Steps & Calories */}
              <Link
                href="/patient/vitals?tab=steps"
                className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all"
              >
                <div className="flex items-center gap-1.5 text-sm font-medium text-[#64748B]">
                  <Footprints className="w-4 h-4 text-[#0D9488]" />
                  <span>Activity</span>
                </div>
                <p className="text-2xl font-semibold text-[#0F172A] mt-2 tabular-nums">
                  {stepsVal.toLocaleString()}
                </p>
                <p className="text-xs text-[#64748B] mt-1 inline-flex items-center gap-1 tabular-nums">
                  <Flame className="w-3 h-3 text-[#D97706]" />
                  <span>{caloriesVal} kcal today</span>
                </p>
              </Link>
            </div>
          )}
        </section>

        {/* 3. Next Dose & Quick Medicine Check-off */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#0F172A]">
              {t('next_dose', locale)}
            </h3>
            <Link
              href="/patient/medicines"
              className="text-sm font-medium text-[#0D9488] hover:text-[#0F766E]"
            >
              Full Digital Rx →
            </Link>
          </div>

          {nextLog ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="w-11 h-11 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
                  <Pill className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-lg font-semibold text-[#0F172A]">
                      {nextMed?.name || nextLog.medicine_name || 'Metformin'}
                    </h4>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#334155]">
                      {nextMed?.dose || nextLog.dose || '500mg'}
                    </span>
                  </div>
                  <p className="text-sm text-[#475569] mt-0.5">
                    {nextMed?.instructions || 'Take after dinner with water'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isLoggingMed}
                onClick={() => handleMarkTaken(nextLog.medicine_id || nextLog.medicineId || 'm1')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-base font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoggingMed ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                <span>{t('mark_taken', locale)} ✓</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#BBF7D0] bg-[#F0FDF4]/50 rounded-2xl p-5 flex items-center gap-3.5">
              <CheckCircle2 className="w-8 h-8 text-[#15803D] shrink-0" />
              <div>
                <h4 className="text-base font-semibold text-[#0F172A]">
                  {t('all_caught_up', locale)}
                </h4>
                <p className="text-sm text-[#475569]">
                  {detail?.medCompliancePct ?? 100}% 7-day adherence on Dr. Meera Rao&apos;s plan.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* 4. Gentle Wearable Insight Banner (if HIGH/CRITICAL flags exist) */}
        {wearable && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-[#0F172A]">
              {t('wearable.section_title', locale)}
            </h3>

            {urgentFlags.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] border-l-4 border-l-[#15803D] rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#15803D] shrink-0" />
                <p className="text-base font-medium text-[#0F172A]">
                  {t('wearable.all_good', locale)}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentFlags.map((flag) => {
                  const isAck = acknowledgedFlags[flag.ruleId];
                  const isSending = isSendingFlag[flag.ruleId];

                  return (
                    <div
                      key={flag.ruleId}
                      className="bg-white border border-[#E2E8F0] border-l-4 border-l-[#0D9488] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="p-2 rounded-xl bg-[#F0FDFA] text-[#0D9488] shrink-0">
                          {flag.ruleId.includes('GLUCOSE') ? (
                            <Droplets className="w-5 h-5" />
                          ) : (
                            <Activity className="w-5 h-5" />
                          )}
                        </span>
                        <p className="text-base font-medium text-[#0F172A] leading-snug">
                          {getFlagMessage(flag.ruleId, flag.detail)}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isAck || isSending}
                        onClick={() => handleShareFlag(flag.ruleId)}
                        className={`shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-semibold border transition-colors ${
                          isAck
                            ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D] cursor-default'
                            : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] cursor-pointer'
                        }`}
                      >
                        {isSending
                          ? 'Sharing...'
                          : isAck
                          ? t('wearable.sent', locale)
                          : t('wearable.tell_doctor', locale)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 5. Active Lifestyle & Diet Targets */}
        {(goalsData.goals.length > 0 || (activeRx && activeRx.lifestyle_targets.length > 0)) && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#0F172A]">
                {t('doctor_note.goals_title', locale)}
              </h3>
              <span className="text-xs font-medium text-[#64748B]">
                From Dr. Meera Rao&apos;s Digital Rx
              </span>
            </div>

            <div className="space-y-2.5">
              {goalsData.goals.length > 0
                ? goalsData.goals.slice(0, 4).map((g) => (
                    <PatientGoalCard
                      key={g.id}
                      id={g.id}
                      category={g.category}
                      target={g.target}
                      by={g.by_date}
                      isCompleted={Boolean(g.completed_at)}
                      onComplete={handleGoalComplete}
                    />
                  ))
                : activeRx?.lifestyle_targets.map((lt) => (
                    <PatientGoalCard
                      key={lt.id}
                      id={lt.id}
                      category={lt.category}
                      target={lt.description}
                      by={lt.target_value ? `${lt.target_value} ${lt.unit || ''}` : 'Daily'}
                      isCompleted={false}
                    />
                  ))}
            </div>
          </section>
        )}

        {/* 6. Latest Medical Diagnosis Summary */}
        {latestReport && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#0F172A]">
                {t('reports.title', locale)}
              </h3>
              <Link
                href="/patient/reports"
                className="text-sm font-medium text-[#0D9488] hover:text-[#0F766E]"
              >
                Read Full Report →
              </Link>
            </div>

            <PatientDiagnosisCard report={latestReport} compact locale={locale} />
          </section>
        )}

        {/* 7. Primary Physician Info Card */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-xl bg-[#F1F5F9] text-[#334155] flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Primary Treating Physician
              </p>
              <p className="text-base font-semibold text-[#0F172A] mt-0.5">
                {t('doctor_name', locale)}
              </p>
              <p className="text-sm text-[#64748B]">{t('clinic_name', locale)} · Indiranagar</p>
            </div>
          </div>

          <a
            href="tel:+918023456789"
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-semibold transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>{t('contact_doctor', locale)}</span>
          </a>
        </section>

        <p className="text-xs text-[#64748B] text-center pb-2">
          {t('decision_support_note', locale)}
        </p>
      </main>

      <PatientToast message={toast?.message || null} type={toast?.type} />
      <BottomNav locale={locale} />
    </div>
  );
}
