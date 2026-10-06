'use client';

import React, { useState, useEffect } from 'react';
import { Pill, CheckCircle2, Mic } from 'lucide-react';
import { MedicineCard, Card } from '@/components/ui';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { BottomNav } from '@/components/patient/BottomNav';
import { Locale, t } from '@/lib/i18n';
import { HERO_PATIENT, SEED_MEDICINES, INITIAL_MED_LOGS } from '@/lib/mockData';
import { Medicine, MedLog } from '@/lib/types';

export default function PatientMedicinesPage() {
  const [locale, setLocale] = useState<Locale>('hi');
  const [medicines] = useState<Medicine[]>(SEED_MEDICINES);
  const [medLogs, setMedLogs] = useState<MedLog[]>(INITIAL_MED_LOGS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

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

  const handleMarkTaken = async (medicineId: string) => {
    setLoadingId(medicineId);

    // Optimistic UI update
    setMedLogs((prev) =>
      prev.map((log) =>
        log.medicineId === medicineId
          ? { ...log, status: 'taken', takenAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
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
      // fallback
    }

    setLoadingId(null);
    setToastMessage(t('med_logged', locale));
    setTimeout(() => setToastMessage(null), 3000);
  };

  const takenCount = medLogs.filter((l) => l.status === 'taken').length;
  const totalCount = medLogs.length;

  return (
    <div className="min-h-screen bg-[#F4F1EA] md:bg-[#EAE6DB] flex flex-col items-center">
      <div className="w-full max-w-md min-h-screen bg-[#FAF8F5] text-ink-900 flex flex-col relative md:border-x-2 md:border-ink-900 md:shadow-[0_10px_35px_rgba(0,0,0,0.08)] pb-28 sm:pb-32">
        <PatientHeader
          locale={locale}
          onLocaleChange={handleLocaleChange}
          showBack
          backHref="/patient"
          title={t('nav_medicines', locale)}
        />

        <main className="w-full px-3.5 sm:px-4 pt-3.5 space-y-4">
        {/* Progress Tracker Card */}
        <div className="bg-ink-900 text-white p-4.5 sm:p-5 rounded-[20px] border-2 border-ink-900 shadow-[4px_4px_0px_#121214]">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-xs text-[#D4F77C] uppercase tracking-wider font-bold">
                Today&apos;s Adherence
              </p>
              <h2 className="font-display font-bold text-2xl text-white mt-0.5">
                {takenCount} of {totalCount} Taken
              </h2>
            </div>
            <div className="p-2.5 bg-[#FF5C98] rounded-xl border border-ink-900">
              <Pill className="w-7 h-7 text-white stroke-[2.5]" />
            </div>
          </div>

          <div className="w-full bg-white/20 h-2.5 rounded-full mt-3.5 overflow-hidden border border-white/10">
            <div
              className="bg-[#D4F77C] h-full rounded-full transition-all duration-500"
              style={{ width: `${(takenCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Voice Logging Hint */}
        <div className="bg-[#E6F9F7] border-2 border-ink-900 rounded-[18px] p-3.5 shadow-[2px_2px_0px_#121214] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#D4F77C] text-ink-900 border border-ink-900 rounded-xl">
              <Mic className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-display font-bold text-sm text-ink-900">
                Log with your voice
              </p>
              <p className="font-body text-xs text-ink-600 font-medium">
                {t('voice_hint', locale)}
              </p>
            </div>
          </div>
        </div>

        {/* Medicines List */}
        <div className="space-y-2.5">
          <h3 className="font-display font-bold text-lg text-ink-900 px-0.5">
            Daily Schedule
          </h3>

          {medLogs.map((log) => {
            const med = medicines.find((m) => m.id === log.medicineId);
            if (!med) return null;

            return (
              <MedicineCard
                key={log.id}
                id={med.id}
                name={med.name}
                dose={med.dose}
                time={log.scheduledAt || log.scheduled_at || "08:00 AM"}
                instructions={med.instructions}
                status={log.status}
                isLoading={loadingId === med.id}
                onMarkTaken={handleMarkTaken}
              />
            );
          })}
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
