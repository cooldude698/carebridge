'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { BottomNav } from '@/components/patient/BottomNav';
import { PatientDiagnosisCard } from '@/components/patient/PatientDiagnosisCard';
import { usePatientLocale } from '@/components/patient/usePatientLocale';
import { t } from '@/lib/i18n';
import { DiagnosisReport } from '@/lib/types';

const PATIENT_ID = 'p1';

export default function PatientReportsPage() {
  const { locale, changeLocale } = usePatientLocale('en');
  const [reports, setReports] = useState<DiagnosisReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DiagnosisReport | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${PATIENT_ID}/diagnosis`, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as DiagnosisReport[];
        setReports(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReport(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-28">
      <PatientHeader
        locale={locale}
        onLocaleChange={changeLocale}
        showBack
        backHref="/patient"
        title={t('reports.title', locale)}
      />

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-[#0F172A]">
                {t('reports.title', locale)}
              </h2>
              <p className="text-sm text-[#475569]">{t('reports.subtitle', locale)}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadReports}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-sm font-medium text-[#334155] cursor-pointer shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </section>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-3 animate-pulse"
              >
                <div className="h-5 bg-[#E2E8F0] rounded w-48" />
                <div className="h-16 bg-[#F1F5F9] rounded-xl" />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center space-y-2">
            <FileText className="w-10 h-10 text-[#94A3B8] mx-auto" />
            <h3 className="text-lg font-semibold text-[#0F172A]">No reports yet</h3>
            <p className="text-sm text-[#64748B]">{t('reports.empty', locale)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <PatientDiagnosisCard
                key={report.id}
                report={report}
                onInspect={() => setSelectedReport(report)}
                locale={locale}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-[#64748B] text-center bg-white border border-[#E2E8F0] rounded-xl p-3">
          {t('reports.disclaimer', locale)}
        </p>
      </main>

      {/* Accessible Detail Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedReport(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Diagnosis report detail"
        >
          <div
            className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl border border-[#E2E8F0] shadow-xl max-h-[85vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#0F172A]">
                  Clinical Watch Diagnosis Summary
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
                  Generated {new Date(selectedReport.generated_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                aria-label="Close report details"
                className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-[#F1F5F9] flex items-center justify-center text-[#475569] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-base text-[#0F172A] leading-relaxed">
                {selectedReport.ai_summary}
              </p>

              {selectedReport.doctor_notes && (
                <div className="bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verified Doctor Note ({selectedReport.reviewed_by_doctor || 'Dr. Meera Rao'})</span>
                  </div>
                  <p className="text-sm sm:text-base text-[#0F172A]">
                    {selectedReport.doctor_notes}
                  </p>
                </div>
              )}

              {selectedReport.risk_flags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Detected Watch Indicators
                  </h4>
                  <div className="space-y-2">
                    {selectedReport.risk_flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm space-y-0.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#0F172A]">{flag.value}</span>
                          <span className="text-xs text-[#64748B]">
                            Normal: {flag.normalRange}
                          </span>
                        </div>
                        <p className="text-[#334155]">{flag.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.lifestyle_recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Recommended Care Steps
                  </h4>
                  <ul className="space-y-2">
                    {selectedReport.lifestyle_recommendations.map((rec, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-[#0F172A]"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedReport.reading_ids.length > 0 && (
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <p className="text-xs text-[#64748B] mb-1.5">Cited Telemetry Readings</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedReport.reading_ids.map((rid) => (
                      <span
                        key={rid}
                        className="text-xs px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] font-mono"
                      >
                        #{rid}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
              <span className="text-xs text-[#64748B]">
                AI decision support · Doctor decides
              </span>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="min-h-[44px] px-5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav locale={locale} />
    </div>
  );
}

