'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Flame,
  Footprints,
  Link2,
  Pill,
  RefreshCw,
  ShieldCheck,
  Utensils,
  Watch,
  HeartPulse,
  Wind,
} from 'lucide-react';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { BottomNav } from '@/components/patient/BottomNav';
import { WatchSyncPill } from '@/components/patient/WatchSyncPill';
import { PatientToast } from '@/components/patient/PatientToast';
import { usePatientLocale } from '@/components/patient/usePatientLocale';
import { t } from '@/lib/i18n';
import { PatientDetail, Prescription } from '@/lib/types';

const PATIENT_ID = 'p1';

function WatchContent() {
  const searchParams = useSearchParams();
  const { locale, changeLocale } = usePatientLocale('en');

  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchWatchState = useCallback(async () => {
    try {
      const [pRes, rxRes] = await Promise.all([
        fetch(`/api/patients/${PATIENT_ID}?actor=patient`, { cache: 'no-store' }),
        fetch(`/api/patients/${PATIENT_ID}/prescriptions`, { cache: 'no-store' }),
      ]);
      if (pRes.ok) {
        const pJson = (await pRes.json()) as PatientDetail;
        setDetail(pJson);
      }
      if (rxRes.ok) {
        const rxJson = (await rxRes.json()) as Prescription[];
        setPrescriptions(Array.isArray(rxJson) ? rxJson : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const justConnected = searchParams.get('connected') === '1';

  useEffect(() => {
    const kickOff = setTimeout(() => {
      void fetchWatchState();
    }, 0);
    const timer = setInterval(() => {
      void fetchWatchState();
    }, 6000);
    return () => {
      clearTimeout(kickOff);
      clearInterval(timer);
    };
  }, [fetchWatchState]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/wearables/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: PATIENT_ID }),
      });
      if (res.ok) {
        showToast(t('watch.synced_toast', locale));
        await fetchWatchState();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const activeRx = prescriptions.find((rx) => rx.status === 'active') || prescriptions[0] || null;
  const payload = activeRx?.watch_sync_payload;
  const wearable = detail?.wearable;
  const currentSteps = wearable?.steps?.dailyMean ?? 2840;
  const targetSteps = payload?.daily_step_target ?? 4500;
  const currentCalories = wearable?.calories?.latest ?? wearable?.calories?.dailyMean ?? 310;
  const targetCalories = payload?.daily_calorie_target ?? 350;
  const stepPct = Math.min(100, Math.round((currentSteps / Math.max(1, targetSteps)) * 100));
  const calPct = Math.min(100, Math.round((currentCalories / Math.max(1, targetCalories)) * 100));

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-28">
      <PatientHeader
        locale={locale}
        onLocaleChange={changeLocale}
        showBack
        backHref="/patient"
        title={t('watch.title', locale)}
      />

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-6">
        {justConnected && (
          <div className="rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] px-4 py-3 text-sm font-medium text-[#15803D] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t('watch.connected_toast', locale)}</span>
          </div>
        )}

        {/* Architecture Explainer Banner */}
        <section className="bg-[#F0FDFA] border border-[#CCFBF1] rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Watch Firmware Modification Required</span>
          </div>
          <h2 className="text-xl font-semibold text-[#0F172A]">
            {t('watch.title', locale)}
          </h2>
          <p className="text-sm sm:text-base text-[#334155] leading-relaxed">
            {t('watch.subtitle', locale)}. CareBridge reads your authorized Google Fit / Health Connect vitals and pushes concise medication, step, calorie, and diet updates straight to your companion feed.
          </p>
        </section>

        {/* Connected Wearable Source Card */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
                <Watch className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-[#0F172A]">
                  {detail?.wearableDevice?.device_name || 'WearOS Smartwatch (Google Fit Bridge)'}
                </h3>
                <p className="text-sm text-[#475569]">
                  Authorized read-only sensor sync · HR, SpO2, BP, Steps, Calories, Sleep
                </p>
              </div>
            </div>

            <WatchSyncPill
              status={isSyncing ? 'syncing' : 'connected'}
              lastSyncedAt={detail?.wearableDevice?.last_synced_at || wearable?.lastUpdated}
              href=""
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#F1F5F9]">
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-[#0D9488]" /> SpO2
              </span>
              <p className="text-lg font-semibold text-[#0F172A] mt-1 tabular-nums">
                {wearable?.spo2?.latest ?? 97}%
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-[#4F46E5]" /> Heart Rate
              </span>
              <p className="text-lg font-semibold text-[#0F172A] mt-1 tabular-nums">
                {wearable?.heartRate?.mean ?? 72} bpm
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-[#0D9488]" /> Steps
              </span>
              <p className="text-lg font-semibold text-[#0F172A] mt-1 tabular-nums">
                {currentSteps.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[#D97706]" /> Calories
              </span>
              <p className="text-lg font-semibold text-[#0F172A] mt-1 tabular-nums">
                {currentCalories} kcal
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <a
              href={`/api/wearables/google-fit/connect?patientId=${PATIENT_ID}`}
              className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] text-sm font-semibold transition-colors"
            >
              <Link2 className="w-4 h-4 text-[#0D9488]" />
              <span>{t('watch.connect_google_fit', locale)}</span>
            </a>

            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncNow}
              className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing ? t('watch.syncing', locale) : t('watch.sync_now', locale)}
              </span>
            </button>
          </div>
        </section>

        {/* Watch Companion Sync Preview (Prescription -> Watch Push) */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">
                {t('watch.companion_preview', locale)}
              </h3>
              <p className="text-sm text-[#475569]">
                Auto-updated from {activeRx?.doctor_name || 'Dr. Meera Rao'}&apos;s latest digital prescription
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                payload?.active_alert_level === 'urgent'
                  ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                  : payload?.active_alert_level === 'watch'
                  ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                  : 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
              }`}
            >
              Watch Alert Tier: {(payload?.active_alert_level || 'watch').toUpperCase()}
            </span>
          </div>

          {loading ? (
            <div className="h-44 rounded-2xl bg-[#F1F5F9] animate-pulse" />
          ) : (
            <div className="bg-[#0F172A] text-white rounded-3xl p-5 sm:p-6 space-y-4 border border-[#1E293B]">
              <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#5EEAD4]">
                  <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
                  CareBridge Watch Companion
                </span>
                <span className="tabular-nums">
                  {payload?.synced_at
                    ? new Date(payload.synced_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Live'}
                </span>
              </div>

              {/* Next Medicine Alert */}
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-[#0D9488] text-white flex items-center justify-center shrink-0">
                  <Pill className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
                    {t('watch.next_dose', locale)}
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-white truncate">
                    {payload?.next_dose_summary || 'Metformin 500mg · 8:00 PM (After food)'}
                  </p>
                </div>
              </div>

              {/* Step & Calorie Rings/Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#CBD5E1] inline-flex items-center gap-1">
                      <Footprints className="w-3.5 h-3.5 text-[#5EEAD4]" />
                      {t('watch.step_target', locale)}
                    </span>
                    <span className="font-semibold text-white tabular-nums">
                      {currentSteps.toLocaleString()} / {targetSteps.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#14B8A6] rounded-full transition-all"
                      style={{ width: `${stepPct}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#CBD5E1] inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-[#FBBF24]" />
                      {t('watch.calorie_target', locale)}
                    </span>
                    <span className="font-semibold text-white tabular-nums">
                      {currentCalories} / {targetCalories} kcal
                    </span>
                  </div>
                  <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F59E0B] rounded-full transition-all"
                      style={{ width: `${calPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Diet Rule */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <Utensils className="w-4 h-4 text-[#5EEAD4] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
                    {t('watch.diet_rule', locale)}
                  </p>
                  <p className="text-sm text-[#E2E8F0] mt-0.5">
                    {payload?.diet_rule_short || 'Low-oil, low-GI meals; limit white rice at dinner'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm pt-1">
            <Link
              href="/patient/medicines"
              className="font-medium text-[#0D9488] hover:text-[#0F766E]"
            >
              Open Full Prescription →
            </Link>
            <span className="text-xs text-[#64748B] inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
              Auto-sync active
            </span>
          </div>
        </section>
      </main>

      <PatientToast message={toast} />
      <BottomNav locale={locale} />
    </div>
  );
}

export default function PatientWatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-sm text-[#64748B]">
          Loading smartwatch bridge...
        </div>
      }
    >
      <WatchContent />
    </Suspense>
  );
}
