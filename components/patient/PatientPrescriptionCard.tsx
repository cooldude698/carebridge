'use client';

import React from 'react';
import {
  Check,
  Clock,
  Pill,
  Stethoscope,
  Calendar,
  Footprints,
  Flame,
  Utensils,
  Moon,
  HeartPulse,
  Loader2,
} from 'lucide-react';
import { MedLog, Prescription } from '@/lib/types';
import { Locale, t } from '@/lib/i18n';

export interface PatientPrescriptionCardProps {
  prescription: Prescription;
  medLogs?: MedLog[];
  readonly?: boolean;
  loadingMedId?: string | null;
  onToggleMedicine?: (medicineId: string) => void;
  locale?: Locale;
}

function getTargetIcon(category: string) {
  switch (category) {
    case 'steps':
      return <Footprints className="w-4 h-4 text-[#0D9488]" />;
    case 'calories':
      return <Flame className="w-4 h-4 text-[#D97706]" />;
    case 'diet':
      return <Utensils className="w-4 h-4 text-[#0D9488]" />;
    case 'sleep':
      return <Moon className="w-4 h-4 text-[#4F46E5]" />;
    default:
      return <HeartPulse className="w-4 h-4 text-[#0D9488]" />;
  }
}

export function PatientPrescriptionCard({
  prescription,
  medLogs = [],
  readonly = false,
  loadingMedId = null,
  onToggleMedicine,
  locale = 'en',
}: PatientPrescriptionCardProps) {
  const issuedDate = (() => {
    const d = new Date(prescription.issued_at);
    return isNaN(d.getTime())
      ? prescription.issued_at
      : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  })();

  return (
    <article className="bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base text-[#0F172A]">
                {prescription.doctor_name}
              </h3>
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                  prescription.status === 'active'
                    ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                    : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                }`}
              >
                {prescription.status === 'active' ? 'Active Digital Rx' : prescription.status}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              {t('rx.doctor_issued', locale)}: {issuedDate}
            </p>
          </div>
        </div>

        {prescription.follow_up_date && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-medium text-[#334155]">
            <Calendar className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>
              {t('rx.follow_up', locale)}: {prescription.follow_up_date}
            </span>
          </div>
        )}
      </div>

      {/* Doctor Clinical Summary */}
      <div className="p-5 space-y-5">
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] border-l-4 border-l-[#0D9488] rounded-xl p-3.5">
          <p className="text-sm sm:text-base text-[#1E293B] leading-relaxed">
            {prescription.doctor_summary}
          </p>
        </div>

        {/* Medicines */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Prescribed Medicines ({prescription.medicines.length})
          </h4>
          <div className="space-y-3">
            {prescription.medicines.map((med) => {
              const realMedId = med.medicine_id || med.id;
              const logsForMed = medLogs.filter(
                (l) => (l.medicine_id || l.medicineId) === realMedId
              );
              const pendingLog = logsForMed.find((l) => l.status === 'pending');
              const takenLog = logsForMed.find((l) => l.status === 'taken');
              const matchingLog = pendingLog || takenLog || logsForMed[0];
              const isTaken = !pendingLog && matchingLog?.status === 'taken';
              const pendingCount = logsForMed.filter((l) => l.status === 'pending').length;
              const isBusy = loadingMedId === realMedId;

              return (
                <div
                  key={med.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isTaken
                      ? 'bg-[#F0FDF4]/60 border-[#BBF7D0]'
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Pill className="w-4 h-4 text-[#0D9488] shrink-0" />
                        <span className="font-semibold text-base sm:text-lg text-[#0F172A]">
                          {med.medicine_name}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#334155] tabular-nums">
                          {med.dosage}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]">
                          {med.with_food ? t('rx.with_food', locale) : t('rx.before_food', locale)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-sm text-[#475569]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                          {med.frequency}
                        </span>
                        {med.times.map((tm) => (
                          <span
                            key={tm}
                            className="text-xs px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] tabular-nums"
                          >
                            {tm}
                          </span>
                        ))}
                        <span className="text-xs text-[#64748B]">• {med.duration}</span>
                      </div>

                      {med.instructions && (
                        <p className="text-sm text-[#475569]">{med.instructions}</p>
                      )}
                    </div>

                    {!readonly && onToggleMedicine && (
                      <div className="shrink-0">
                        {isTaken ? (
                          <span className="inline-flex items-center justify-center gap-1.5 min-h-[48px] px-4 rounded-xl bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] text-sm font-semibold">
                            <Check className="w-4 h-4" />
                            <span>{t('taken', locale)} ✓</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onToggleMedicine(realMedId)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isBusy ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            <span>
                              {pendingCount > 1
                                ? `${t('mark_taken', locale)} (${pendingCount} left)`
                                : t('mark_taken', locale)}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lifestyle Targets */}
        {prescription.lifestyle_targets.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              {t('rx.lifestyle_title', locale)}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {prescription.lifestyle_targets.map((target) => (
                <div
                  key={target.id}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                >
                  <span className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] shrink-0 mt-0.5">
                    {getTargetIcon(target.category)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] leading-snug">
                      {target.description}
                    </p>
                    {target.target_value && (
                      <p className="text-xs font-semibold text-[#0D9488] mt-0.5 tabular-nums">
                        {target.target_value.toLocaleString()} {target.unit || ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

