'use client';

import React, { useState, useEffect } from 'react';
import { Heart, Activity, CheckCircle2, History } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { BottomNav } from '@/components/patient/BottomNav';
import { Locale, t } from '@/lib/i18n';
import { HERO_PATIENT, INITIAL_VITALS } from '@/lib/mockData';
import { Vital } from '@/lib/types';

export default function PatientVitalsPage() {
  const [locale, setLocale] = useState<Locale>('hi');
  const [systolic, setSystolic] = useState<string>('130');
  const [diastolic, setDiastolic] = useState<string>('85');
  const [pulse, setPulse] = useState<string>('72');
  const [vitalsHistory, setVitalsHistory] = useState<Vital[]>(INITIAL_VITALS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    try {
      localStorage.setItem('carebridge_locale', newLocale);
    } catch {
      // ignore
    }
  };

  // Classify BP reading
  const sysNum = parseInt(systolic, 10);
  const diaNum = parseInt(diastolic, 10);

  const getBpCategory = () => {
    if (isNaN(sysNum) || isNaN(diaNum)) return null;
    if (sysNum >= 140 || diaNum >= 90) {
      return {
        label: 'Stage 2 Hypertension (High)',
        color: 'text-risk-red bg-rose-50 border-rose-200',
      };
    }
    if (sysNum >= 130 || diaNum >= 80) {
      return {
        label: 'Stage 1 Hypertension (Moderate)',
        color: 'text-risk-yellow bg-amber-50 border-amber-200',
      };
    }
    if (sysNum >= 120 && diaNum < 80) {
      return {
        label: 'Elevated Pressure',
        color: 'text-amber-600 bg-amber-50 border-amber-200',
      };
    }
    return {
      label: 'Normal (<120 / <80)',
      color: 'text-risk-green bg-emerald-50 border-emerald-200',
    };
  };

  const category = getBpCategory();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sysNum || !diaNum) return;

    setIsSubmitting(true);

    const newVital: Vital = {
      id: `vital-${Date.now()}`,
      patientId: HERO_PATIENT.id,
      type: 'bp',
      valueA: sysNum,
      valueB: diaNum,
      recordedAt: 'Just now',
    };

    // Optimistic UI update
    setVitalsHistory([newVital, ...vitalsHistory]);

    try {
      await fetch(`/api/patients/${HERO_PATIENT.id}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bp',
          valueA: sysNum,
          valueB: diaNum,
        }),
      });
    } catch {
      // local fallback
    }

    setIsSubmitting(false);
    setToastMessage(t('reading_saved', locale));
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] md:bg-[#EAE6DB] flex flex-col items-center">
      <div className="w-full max-w-md min-h-screen bg-[#FAF8F5] text-ink-900 flex flex-col relative md:border-x-2 md:border-ink-900 md:shadow-[0_10px_35px_rgba(0,0,0,0.08)] pb-28 sm:pb-32">
        <PatientHeader
          locale={locale}
          onLocaleChange={handleLocaleChange}
          showBack
          backHref="/patient"
          title={t('log_bp_title', locale)}
        />

        <main className="w-full px-3.5 sm:px-4 pt-3.5 space-y-4">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-white rounded-[20px] border-2 border-ink-900 shadow-[3px_3px_0px_#121214] p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-[#FF5C98] text-white rounded-xl border border-ink-900">
                <Heart className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg sm:text-xl text-ink-900">
                  {t('log_bp_title', locale)}
                </h2>
                <p className="font-body text-xs text-ink-500">
                  Measured with cuff on left arm
                </p>
              </div>
            </div>

            {/* Inputs: Systolic & Diastolic */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-body text-xs sm:text-sm font-bold text-ink-700 mb-1">
                  {t('systolic', locale)}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    min={70}
                    max={250}
                    required
                    className="w-full font-data font-bold text-xl sm:text-2xl text-ink-900 px-3.5 py-2.5 rounded-xl border-2 border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 min-h-[48px]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-ink-400">
                    mmHg
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-body text-xs sm:text-sm font-bold text-ink-700 mb-1">
                  {t('diastolic', locale)}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    min={40}
                    max={150}
                    required
                    className="w-full font-data font-bold text-xl sm:text-2xl text-ink-900 px-3.5 py-2.5 rounded-xl border-2 border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 min-h-[48px]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-ink-400">
                    mmHg
                  </span>
                </div>
              </div>
            </div>

            {/* Pulse Rate */}
            <div className="mt-3">
              <label className="block font-body text-xs sm:text-sm font-bold text-ink-700 mb-1">
                {t('pulse', locale)} (BPM)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  min={40}
                  max={200}
                  className="w-full font-data font-bold text-lg text-ink-900 px-3.5 py-2.5 rounded-xl border-2 border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 min-h-[44px]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-ink-400">
                  bpm
                </span>
              </div>
            </div>

            {/* Live Indicator */}
            {category && (
              <div className={`mt-4 p-3 rounded-xl border-2 border-ink-900 flex items-center gap-2 ${category.color}`}>
                <Activity className="w-4 h-4 shrink-0" />
                <span className="font-body text-xs sm:text-sm font-bold">
                  {category.label}
                </span>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#D4F77C] hover:bg-[#CEF267] text-ink-900 font-display font-bold text-base min-h-[48px] rounded-xl border-2 border-ink-900 shadow-[2px_2px_0px_#121214] active:translate-y-0.5 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>{t('save_reading', locale)}</span>
              </button>
            </div>
          </div>
        </form>

        {/* History List */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 px-0.5">
            <History className="w-4 h-4 text-ink-600" />
            <h3 className="font-display font-bold text-base sm:text-lg text-ink-900">
              Recent Readings
            </h3>
          </div>

          <div className="space-y-2">
            {vitalsHistory
              .filter((v) => v.type === 'bp')
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-[18px] border-2 border-ink-900 p-3.5 shadow-[2px_2px_0px_#121214] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#FF5C98] text-white border border-ink-900 rounded-xl">
                      <Heart className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <p className="font-data font-bold text-base sm:text-lg text-ink-900">
                        {item.valueA ?? item.value_a} / {item.valueB ?? item.value_b}{' '}
                        <span className="text-xs text-ink-500 font-normal">mmHg</span>
                      </p>
                      <p className="font-body text-xs text-ink-500">
                        {item.recordedAt ?? item.recorded_at}
                      </p>
                    </div>
                  </div>

                  <span className="font-body text-xs font-bold px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-ink-900 text-ink-900">
                    Recorded
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="font-body text-xs text-ink-500 text-center pt-2">
          {t('decision_support_note', locale)}
        </p>
      </main>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-ink-900 text-white px-5 py-3 rounded-full border-2 border-ink-900 shadow-[3px_3px_0px_#121214] flex items-center gap-2 font-display text-sm font-semibold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#D4F77C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <BottomNav locale={locale} />
      </div>
    </div>
  );
}
