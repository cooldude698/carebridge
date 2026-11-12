'use client';

import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { DiagnosisReport } from '@/lib/types';
import { Locale, t } from '@/lib/i18n';

export interface PatientDiagnosisCardProps {
  report: DiagnosisReport;
  compact?: boolean;
  onInspect?: () => void;
  locale?: Locale;
}

const urgencyStyles: Record<
  DiagnosisReport['urgency'],
  { label: string; badge: string; icon: React.ElementType }
> = {
  routine: {
    label: 'Routine',
    badge: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    icon: CheckCircle2,
  },
  soon: {
    label: 'Follow-up Soon',
    badge: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
    icon: Clock,
  },
  urgent: {
    label: 'Urgent Review',
    badge: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
    icon: AlertTriangle,
  },
  emergency: {
    label: 'Immediate Attention',
    badge: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
    icon: AlertCircle,
  },
};

export function PatientDiagnosisCard({
  report,
  compact = false,
  onInspect,
  locale = 'en',
}: PatientDiagnosisCardProps) {
  const urgency = urgencyStyles[report.urgency] || urgencyStyles.routine;
  const UrgencyIcon = urgency.icon;
  const isVerified = Boolean(report.reviewed_by_doctor);

  const formattedDate = (() => {
    const d = new Date(report.generated_at);
    return isNaN(d.getTime())
      ? report.generated_at
      : d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  })();

  return (
    <article
      onClick={onInspect}
      role={onInspect ? 'button' : undefined}
      tabIndex={onInspect ? 0 : undefined}
      onKeyDown={
        onInspect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onInspect();
              }
            }
          : undefined
      }
      className={`bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] p-5 space-y-3.5 ${
        onInspect ? 'cursor-pointer hover:border-[#CBD5E1] hover:shadow-md transition-all' : ''
      }`}
    >
      {/* Top Status Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${urgency.badge}`}
          >
            <UrgencyIcon className="w-3.5 h-3.5" />
            <span>{urgency.label}</span>
          </span>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${
              isVerified
                ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>
              {isVerified ? t('reports.verified', locale) : t('reports.pending_review', locale)}
            </span>
          </span>
        </div>

        <span className="text-xs text-[#64748B] tabular-nums">{formattedDate}</span>
      </div>

      {/* AI Clinical Summary */}
      <p className="text-base text-[#0F172A] leading-relaxed">{report.ai_summary}</p>

      {/* Doctor Notes if present */}
      {report.doctor_notes && (
        <div className="bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl p-3.5 text-sm text-[#0F172A]">
          <span className="font-semibold text-[#0F766E] block text-xs uppercase tracking-wider mb-1">
            Doctor&apos;s Note ({report.reviewed_by_doctor || 'Dr. Meera Rao'})
          </span>
          <p>{report.doctor_notes}</p>
        </div>
      )}

      {/* Risk Flags & Recommendations (full view) */}
      {!compact && report.risk_flags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {report.risk_flags.map((flag, i) => (
            <span
              key={`${flag.type}-${i}`}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${
                flag.severity === 'critical' || flag.severity === 'high'
                  ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                  : 'bg-[#F8FAFC] text-[#334155] border-[#E2E8F0]'
              }`}
            >
              {flag.message}
            </span>
          ))}
        </div>
      )}

      {!compact && report.lifestyle_recommendations.length > 0 && (
        <ul className="space-y-1.5 text-sm text-[#334155] list-disc list-inside">
          {report.lifestyle_recommendations.slice(0, 3).map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      )}

      {/* Attribution Footer */}
      <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
        <span>AI decision support · Doctor decides</span>
        {onInspect && (
          <span className="inline-flex items-center gap-1 font-medium text-[#0D9488]">
            <span>View details</span>
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </div>
    </article>
  );
}

