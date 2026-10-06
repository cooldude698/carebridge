'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Footprints,
  Pill,
  Heart,
  Activity,
  Droplets,
  ArrowRight,
  CheckCircle2,
  Mic,
  Loader2,
} from 'lucide-react';
import {
  StatTile,
  MedicineCard,
  Card,
  DoctorNoteCard,
} from '@/components/ui';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { BottomNav } from '@/components/patient/BottomNav';
import { Locale, t } from '@/lib/i18n';
import {
  HERO_PATIENT,
  SEED_MEDICINES,
  INITIAL_MED_LOGS,
  INITIAL_VITALS,
} from '@/lib/mockData';
import {
  Medicine,
  MedLog,
  Vital,
  WearableContext,
  GoalsResponse,
} from '@/lib/types';
import { resolveWearableContext } from '@/lib/wearable/resolve';

export default function PatientHomePage() {
  const [locale, setLocale] = useState<Locale>('hi'); // Default Hindi for Ramesh hero scenario
  const [medicines] = useState<Medicine[]>(SEED_MEDICINES);
  const [medLogs, setMedLogs] = useState<MedLog[]>(INITIAL_MED_LOGS);
  const [vitals] = useState<Vital[]>(INITIAL_VITALS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Wearable & Doctor Notes State (Phase 4)
  const [wearable, setWearable] = useState<WearableContext | null>(null);
  const [goalsData, setGoalsData] = useState<GoalsResponse>({
    goals: [],
    latestNote: null,
  });
  const [acknowledgedFlags, setAcknowledgedFlags] = useState<Record<string, boolean>>({});
  const [isSendingFlag, setIsSendingFlag] = useState<Record<string, boolean>>({});

  // Load language preference from localStorage
  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem('carebridge_locale') as Locale;
      if (savedLocale && ['en', 'hi', 'kn'].includes(savedLocale)) {
        setLocale(savedLocale);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch patient wearable & goals
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      // 1. Fetch patient detail & wearable
      try {
        const pRes = await fetch(`/api/patients/${HERO_PATIENT.id}?actor=patient`);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (mounted) {
            setWearable(resolveWearableContext(HERO_PATIENT.id, pData?.wearable));
          }
        } else {
          if (mounted) {
            setWearable(resolveWearableContext(HERO_PATIENT.id, null));
          }
        }
      } catch {
        if (mounted) {
          setWearable(resolveWearableContext(HERO_PATIENT.id, null));
        }
      }

      // 2. Fetch goals & latest doctor note
      try {
        const gRes = await fetch(`/api/patients/${HERO_PATIENT.id}/goals`);
        if (gRes.ok) {
          const gData = await gRes.json();
          if (mounted) {
            setGoalsData(gData);
          }
        }
      } catch {
        // Fallback handled gracefully
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    try {
      localStorage.setItem('carebridge_locale', newLocale);
    } catch {
      // ignore
    }
  };

  // Determine greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting_morning', locale);
    if (hour < 17) return t('greeting_afternoon', locale);
    return t('greeting_evening', locale);
  };

  // Find next pending medicine
  const pendingLogs = medLogs.filter((l) => l.status === 'pending');
  const nextLog = pendingLogs[0];
  const nextMedicine = nextLog
    ? medicines.find((m) => m.id === nextLog.medicineId)
    : null;

  // Handle Mark as Taken
  const handleMarkTaken = async (medicineId: string) => {
    setIsLoading(true);
    // Optimistic update
    setMedLogs((prev) =>
      prev.map((log) =>
        log.medicineId === medicineId
          ? {
              ...log,
              status: 'taken',
              takenAt: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            }
          : log
      )
    );

    try {
      await fetch(`/api/patients/${HERO_PATIENT.id}/med-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineId, status: 'taken' }),
      });
    } catch {
      // graceful fallback for local prototype
    }

    setIsLoading(false);
    setToastMessage(t('med_logged', locale));
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle Share Wearable Flag with Doctor
  const handleShareWithDoctor = async (ruleId: string) => {
    setIsSendingFlag((prev) => ({ ...prev, [ruleId]: true }));
    try {
      await fetch(`/api/patients/${HERO_PATIENT.id}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'flag_acknowledged', valueA: 1 }),
      });
      setAcknowledgedFlags((prev) => ({ ...prev, [ruleId]: true }));
      setToastMessage(t('wearable.sent', locale));
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      setToastMessage('Could not share flag');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsSendingFlag((prev) => ({ ...prev, [ruleId]: false }));
    }
  };

  // Handle Goal Completion (Optimistic)
  const handleGoalComplete = async (goalId: string) => {
    // Optimistic update
    setGoalsData((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId
          ? { ...g, completed_at: new Date().toISOString() }
          : g
      ),
    }));
    setToastMessage(t('doctor_note.goal_completed', locale));
    setTimeout(() => setToastMessage(null), 3000);

    try {
      const res = await fetch(
        `/api/patients/${HERO_PATIENT.id}/goals/${goalId}/complete`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error('Goal completion failed');
    } catch {
      // Rollback
      setGoalsData((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === goalId ? { ...g, completed_at: null } : g
        ),
      }));
      setToastMessage('Could not save goal completion');
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Compute stat values
  const takenCount = medLogs.filter((l) => l.status === 'taken').length;
  const totalMeds = medLogs.length;
  const latestBp = vitals.find((v) => v.type === 'bp');
  const latestSteps = vitals.find((v) => v.type === 'steps');

  // Filter HIGH flags only on patient screen — don't show LOW/MEDIUM
  const highAnomalyFlags = (wearable?.anomalyFlags || []).filter(
    (f) => f.severity === 'HIGH'
  );

  // Helper to get gentle i18n message for anomaly flag
  const getFlagMessage = (ruleId: string, defaultDetail: string) => {
    const id = ruleId.toUpperCase();
    if (id.includes('HR') || id.includes('NOCTURNAL')) {
      return t('wearable.hr_nocturnal_high', locale);
    }
    if (id.includes('STEP') || id.includes('WALK') || id.includes('FRAILTY')) {
      return t('wearable.steps_decline', locale);
    }
    if (id.includes('GLUCOSE') || id.includes('SUGAR') || id.includes('FASTING')) {
      return t('wearable.glucose_high', locale);
    }
    return defaultDetail;
  };

  // Helper to get flag icon (all --brand-teal, never red)
  const getFlagIcon = (ruleId: string) => {
    const id = ruleId.toUpperCase();
    if (id.includes('HR') || id.includes('HEART')) {
      return <Heart className="w-6 h-6 text-teal-600 shrink-0" />;
    }
    if (id.includes('STEP') || id.includes('WALK') || id.includes('ACTIVITY')) {
      return <Activity className="w-6 h-6 text-teal-600 shrink-0" />;
    }
    if (id.includes('GLUCOSE') || id.includes('SUGAR')) {
      return <Droplets className="w-6 h-6 text-teal-600 shrink-0" />;
    }
    return <Activity className="w-6 h-6 text-teal-600 shrink-0" />;
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] md:bg-[#EAE6DB] flex flex-col items-center">
      <div className="w-full max-w-md min-h-screen bg-[#FAF8F5] text-ink-900 flex flex-col relative md:border-x-2 md:border-ink-900 md:shadow-[0_10px_35px_rgba(0,0,0,0.08)] pb-28 sm:pb-32">
        {/* Patient Header with Language Switcher */}
        <PatientHeader locale={locale} onLocaleChange={handleLocaleChange} />

        <main className="w-full px-3.5 sm:px-4 pt-3.5 space-y-4 sm:space-y-5">
          {/* Simulated Data & Decision Support Banner */}
          <div className="bg-[#FEF3C7] border-2 border-ink-900 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-ink-900 font-body font-semibold shadow-[2px_2px_0px_#121214]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>{t('decision_support_note', locale)}</span>
            </span>
          </div>

          {/* Greeting Hero Section */}
          <section
            style={{ backgroundColor: '#121214', color: '#FFFFFF' }}
            className="bg-[#121214] text-white rounded-[22px] p-5 sm:p-6 border-2 border-[#121214] shadow-[4px_4px_0px_#121214] relative overflow-hidden"
          >
            <div className="relative z-10">
              <span className="font-body text-[#D4F77C] text-sm sm:text-base font-bold tracking-wide block">
                {getGreeting()},
              </span>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight mt-0.5">
                {HERO_PATIENT.name} {t('ji', locale)}
              </h2>
              <p className="font-body text-[#EAE7DC] text-sm sm:text-base mt-1 font-medium">
                {pendingLogs.length > 0
                  ? `${pendingLogs.length} dose${pendingLogs.length > 1 ? 's' : ''} left for today.`
                  : t('all_caught_up', locale)}
              </p>
            </div>

            {/* Quick Voice Log Prompt Pill */}
            <Link
              href="/patient/voice"
              className="mt-4 pt-3.5 border-t border-white/15 flex items-center justify-between bg-white/10 hover:bg-white/15 rounded-xl px-3 py-2 transition-all group"
            >
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-200">
                <span className="p-1.5 rounded-full bg-[#FF5C98] text-white shrink-0 shadow-[1px_1px_0px_#000]">
                  <Mic className="w-3.5 h-3.5" />
                </span>
                <span className="font-body font-medium text-white/90">{t('voice_hint', locale)}</span>
              </div>
              <span className="text-xs font-display font-bold text-[#D4F77C] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform shrink-0">
                <span>Try voice</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </section>

          {/* Next Medicine Dose Card */}
          <section className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="font-display font-bold text-lg sm:text-xl text-ink-900">
                {t('next_dose', locale)}
              </h3>
              <Link
                href="/patient/medicines"
                className="font-body text-xs sm:text-sm font-bold text-ink-700 hover:text-ink-900 underline"
              >
                View all ({totalMeds})
              </Link>
            </div>

            {nextMedicine && nextLog ? (
              <MedicineCard
                id={nextMedicine.id}
                name={nextMedicine.name}
                dose={nextMedicine.dose}
                time={nextLog.scheduledAt || nextLog.scheduled_at || '08:00 AM'}
                instructions={nextMedicine.instructions}
                status="pending"
                isLoading={isLoading}
                onMarkTaken={handleMarkTaken}
              />
            ) : (
              <Card className="text-center py-6 bg-white border-2 border-ink-900 shadow-[3px_3px_0px_#121214] rounded-[20px]">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-display font-bold text-lg text-ink-900">
                  {t('all_caught_up', locale)}
                </h4>
                <p className="font-body text-sm text-ink-500 mt-1 max-w-xs mx-auto">
                  All scheduled medicines for today have been completed.
                </p>
              </Card>
            )}
          </section>

          {/* 3 StatTiles: Steps, Medicines, BP */}
          <section className="space-y-2">
            <h3 className="font-display font-bold text-lg sm:text-xl text-ink-900 px-0.5">
              {t('today_summary', locale)}
            </h3>

            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 items-stretch">
              {/* Steps Tile */}
              <StatTile
                label={locale === 'hi' ? 'कदम' : locale === 'kn' ? 'ಹೆಜ್ಜೆ' : 'Steps'}
                value={
                  latestSteps
                    ? (latestSteps.valueA ?? latestSteps.value_a ?? 4210).toLocaleString()
                    : '4,210'
                }
                unit=""
                target="Goal: 6k"
                icon={<Footprints className="w-4 h-4 text-ink-900" />}
                trendText="On track"
                trend="neutral"
                className="h-full"
              />

              {/* Medicines Taken Tile */}
              <StatTile
                label={locale === 'hi' ? 'दवाएं' : locale === 'kn' ? 'ಔಷಧಿ' : 'Meds'}
                value={`${takenCount}/${totalMeds}`}
                unit=""
                target={takenCount === totalMeds ? '100%' : 'Eve pending'}
                icon={<Pill className="w-4 h-4 text-ink-900" />}
                trend="up"
                trendText={takenCount > 0 ? 'Logged' : 'Pending'}
                className="h-full"
              />

              {/* Blood Pressure Tile */}
              <StatTile
                label={locale === 'hi' ? 'रक्तचाप' : locale === 'kn' ? 'ರಕ್ತದೊತ್ತಡ' : 'BP'}
                value={
                  latestBp
                    ? `${latestBp.valueA ?? latestBp.value_a}/${
                        latestBp.valueB ?? latestBp.value_b
                      }`
                    : '138/88'
                }
                unit="mmHg"
                target="<130/80"
                icon={<Heart className="w-4 h-4 text-ink-900" />}
                trend="up"
                trendText="Elevated"
                className="h-full"
              />
            </div>
          </section>

        {/* Phase 4A: Wearable Insight Section ("Your Health Today") */}
        {wearable && (
          <section className="space-y-2.5 pt-1">
            <h3 className="font-display font-bold text-lg sm:text-xl text-ink-900 px-0.5">
              {t('wearable.section_title', locale)}
            </h3>

            {highAnomalyFlags.length === 0 ? (
              <div className="bg-white rounded-[20px] border-2 border-ink-900 shadow-[3px_3px_0px_#121214] border-l-[6px] border-l-emerald-600 p-4 sm:p-5 flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="font-body font-semibold text-base sm:text-lg text-ink-900 leading-snug">
                  {t('wearable.all_good', locale)}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {highAnomalyFlags.map((flag) => {
                  const isAcknowledged = acknowledgedFlags[flag.ruleId];
                  const isSending = isSendingFlag[flag.ruleId];

                  return (
                    <div
                      key={flag.ruleId}
                      className="bg-white rounded-[20px] border-2 border-ink-900 shadow-[3px_3px_0px_#121214] border-l-[6px] border-l-[#0D9488] p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-teal-50 text-teal-700 shrink-0 mt-0.5 border border-teal-200">
                          {getFlagIcon(flag.ruleId)}
                        </div>
                        <p className="font-body font-semibold text-base sm:text-lg text-ink-900 leading-snug">
                          {getFlagMessage(flag.ruleId, flag.detail)}
                        </p>
                      </div>

                      <div className="pt-1 flex justify-end">
                        {isAcknowledged ? (
                          <button
                            type="button"
                            disabled
                            className="bg-emerald-50 border-2 border-emerald-600 text-emerald-800 min-h-[44px] px-4 py-2 rounded-xl font-body font-bold text-sm flex items-center gap-2 cursor-default select-none shadow-[2px_2px_0px_#15803D]"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>{t('wearable.sent', locale)}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isSending}
                            onClick={() => handleShareWithDoctor(flag.ruleId)}
                            className="bg-white hover:bg-[#FAF8F5] border-2 border-ink-900 text-ink-900 font-display font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-[2px_2px_0px_#121214] active:translate-y-0.5 min-h-[44px] flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            {isSending && (
                              <Loader2 className="w-4 h-4 animate-spin text-ink-900" />
                            )}
                            <span>{t('wearable.tell_doctor', locale)}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Phase 4B: Doctor Note Card */}
        {goalsData.latestNote && (
          <section className="space-y-2 pt-1">
            <DoctorNoteCard
              noteDate={
                goalsData.latestNote.created_at
                  ? new Date(goalsData.latestNote.created_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Recent'
              }
              reminders={goalsData.latestNote.parsed_instructions?.reminders ?? []}
              goals={goalsData.goals.map((g) => ({
                id: g.id,
                category: g.category,
                target: g.target,
                by: g.by_date ?? undefined,
                isCompleted: !!g.completed_at,
              }))}
              followUpDate={
                goalsData.latestNote.parsed_instructions?.followUpDate ?? null
              }
              onGoalComplete={handleGoalComplete}
              locale={locale}
            />
          </section>
        )}

        {/* Quick Action: Log BP reading */}
        <section className="pt-1">
          <Link href="/patient/vitals">
            <div className="flex items-center justify-between p-3.5 sm:p-4 bg-white rounded-[20px] border-2 border-ink-900 shadow-[2px_2px_0px_#121214] hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#FF5C98] text-white rounded-xl border border-ink-900">
                  <Heart className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base sm:text-lg text-ink-900">
                    {t('log_bp_title', locale)}
                  </h4>
                  <p className="font-body text-xs sm:text-sm text-ink-500">
                    Record your morning or evening pressure
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-ink-900" />
            </div>
          </Link>
        </section>

        {/* Clinic & Doctor Info Footer Card */}
        <section className="pt-1">
          <div className="bg-white rounded-[20px] border-2 border-ink-900 shadow-[2px_2px_0px_#121214] p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-[11px] text-ink-500 uppercase tracking-wider font-bold">
                  Primary Physician
                </p>
                <p className="font-display font-bold text-ink-900 text-base mt-0.5">
                  {t('doctor_name', locale)}
                </p>
                <p className="font-body text-xs text-ink-500">
                  {t('clinic_name', locale)} • Bengaluru
                </p>
              </div>
              <a
                href="tel:+918023456789"
                className="px-3.5 py-2 bg-[#D4F77C] hover:bg-[#CEF267] border-2 border-ink-900 rounded-full font-display font-bold text-xs text-ink-900 shadow-[1.5px_1.5px_0px_#121214] active:translate-y-0.5 flex items-center gap-1.5 transition-all"
              >
                <span>Call Clinic</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-ink-900 text-white px-5 py-3 rounded-full border-2 border-ink-900 shadow-[3px_3px_0px_#121214] flex items-center gap-2 font-display text-sm font-semibold animate-bounce select-none">
          <CheckCircle2 className="w-5 h-5 text-[#D4F77C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Bottom Tab Bar (68px, fixed bottom) */}
      <BottomNav locale={locale} />
      </div>
    </div>
  );
}
