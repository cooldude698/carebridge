'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Activity,
  Droplets,
  Footprints,
  Heart,
  History,
  Loader2,
  Moon,
  Wind,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { BottomNav } from '@/components/patient/BottomNav';
import { PatientToast } from '@/components/patient/PatientToast';
import { usePatientLocale } from '@/components/patient/usePatientLocale';
import { t } from '@/lib/i18n';
import { Vital } from '@/lib/types';

const PATIENT_ID = 'p1';

type VitalTab = 'spo2' | 'hr' | 'bp' | 'glucose' | 'steps' | 'sleep';
const VALID_TABS = new Set<VitalTab>(['spo2', 'hr', 'bp', 'glucose', 'steps', 'sleep']);

function VitalsContent() {
  const searchParams = useSearchParams();
  const { locale, changeLocale } = usePatientLocale('en');

  const queryTab = searchParams.get('tab') as VitalTab | null;
  const [selectedTab, setSelectedTab] = useState<VitalTab | null>(null);
  const activeTab: VitalTab =
    selectedTab ?? (queryTab && VALID_TABS.has(queryTab) ? queryTab : 'spo2');
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);

  const [systolic, setSystolic] = useState('136');
  const [diastolic, setDiastolic] = useState('86');
  const [pulse, setPulse] = useState('72');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const fetchVitals = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${PATIENT_ID}/vitals?type=all`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setVitals(Array.isArray(data?.vitals) ? data.vitals : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVitals();
  }, [fetchVitals]);

  const sysNum = parseInt(systolic, 10);
  const diaNum = parseInt(diastolic, 10);

  const getBpCategory = () => {
    if (isNaN(sysNum) || isNaN(diaNum)) return null;
    if (sysNum >= 140 || diaNum >= 90) {
      return {
        label: 'Stage 2 Hypertension (Elevated — Share with Dr. Rao)',
        classes: 'text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]',
      };
    }
    if (sysNum >= 130 || diaNum >= 80) {
      return {
        label: 'Stage 1 Elevated Blood Pressure',
        classes: 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]',
      };
    }
    if (sysNum >= 120 && diaNum < 80) {
      return {
        label: 'Slightly Elevated Pressure',
        classes: 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]',
      };
    }
    return {
      label: 'Normal (<120 / <80 mmHg)',
      classes: 'text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0]',
    };
  };

  const bpCategory = getBpCategory();

  const handleSaveBp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sysNum || !diaNum) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/patients/${PATIENT_ID}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bp',
          valueA: sysNum,
          valueB: diaNum,
          source: 'manual',
        }),
      });

      const pulseNum = parseInt(pulse, 10);
      if (!isNaN(pulseNum) && pulseNum >= 40 && pulseNum <= 200) {
        await fetch(`/api/patients/${PATIENT_ID}/vitals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'hr',
            valueA: pulseNum,
            source: 'manual',
          }),
        });
      }

      if (res.ok) {
        showToast(t('reading_saved', locale));
        await fetchVitals();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabMeta: Array<{ id: VitalTab; label: string; icon: React.ElementType; unit: string }> = [
    { id: 'spo2', label: t('vitals.spo2', locale), icon: Wind, unit: '%' },
    { id: 'hr', label: t('vitals.hr', locale), icon: Activity, unit: 'bpm' },
    { id: 'bp', label: t('vitals.bp', locale), icon: Heart, unit: 'mmHg' },
    { id: 'glucose', label: t('vitals.glucose', locale), icon: Droplets, unit: 'mg/dL' },
    { id: 'steps', label: t('vitals.steps_calories', locale), icon: Footprints, unit: 'steps' },
    { id: 'sleep', label: t('vitals.sleep', locale), icon: Moon, unit: 'hrs' },
  ];

  const currentTabMeta = tabMeta.find((item) => item.id === activeTab) || tabMeta[0];

  const filtered = vitals
    .filter((v) => v.type === activeTab)
    .sort(
      (a, b) =>
        new Date(a.recorded_at || a.recordedAt || 0).getTime() -
        new Date(b.recorded_at || b.recordedAt || 0).getTime()
    );

  const calorieByDay = new Map<string, number>();
  if (activeTab === 'steps') {
    vitals
      .filter((v) => v.type === 'calories')
      .forEach((v) => {
        const d = new Date(v.recorded_at || v.recordedAt || 0);
        if (!isNaN(d.getTime())) {
          calorieByDay.set(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), Number(v.value_a ?? v.valueA ?? 0));
        }
      });
  }

  const chartData = filtered.map((v) => {
    const d = new Date(v.recorded_at || v.recordedAt || 0);
    const label = isNaN(d.getTime())
      ? v.recorded_at || ''
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const valA = Number(v.value_a ?? v.valueA ?? 0);
    const valB = v.value_b ?? v.valueB ?? null;
    return {
      date: label,
      value: valA,
      secondary: valB !== null ? Number(valB) : calorieByDay.get(label),
    };
  });

  const numericValues = filtered.map((v) => Number(v.value_a ?? v.valueA ?? 0));
  const latestVal = numericValues.length > 0 ? numericValues[numericValues.length - 1] : null;
  const avgVal =
    numericValues.length > 0
      ? Number((numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(1))
      : null;
  const minVal = numericValues.length > 0 ? Math.min(...numericValues) : null;
  const maxVal = numericValues.length > 0 ? Math.max(...numericValues) : null;

  const recentBpHistory = vitals
    .filter((v) => v.type === 'bp')
    .sort(
      (a, b) =>
        new Date(b.recorded_at || b.recordedAt || 0).getTime() -
        new Date(a.recorded_at || a.recordedAt || 0).getTime()
    )
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-28">
      <PatientHeader
        locale={locale}
        onLocaleChange={changeLocale}
        showBack
        backHref="/patient"
        title={t('log_bp_title', locale)}
      />

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-6">
        {/* Vital Category Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabMeta.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={`inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full text-sm font-medium border whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-xs'
                    : 'bg-white text-[#334155] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Summary KPI Strip + Recharts Trend Card */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A]">
                {currentTabMeta.label} Trend
              </h2>
              <p className="text-sm text-[#64748B]">
                Live watch &amp; clinic telemetry ({filtered.length} readings)
              </p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]">
              Unit: {currentTabMeta.unit}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Latest', val: latestVal },
              { label: 'Average', val: avgVal },
              { label: 'Min', val: minVal },
              { label: 'Max', val: maxVal },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
              >
                <p className="text-xs text-[#64748B]">{stat.label}</p>
                <p className="text-xl font-semibold text-[#0F172A] mt-0.5 tabular-nums">
                  {stat.val !== null ? stat.val.toLocaleString() : '—'}
                </p>
              </div>
            ))}
          </div>

          <div className="h-60 w-full">
            {loading ? (
              <div className="h-full bg-[#F1F5F9] rounded-xl animate-pulse" />
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-[#64748B]">
                No readings recorded for {currentTabMeta.label} yet.
              </div>
            ) : activeTab === 'bp' ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <ReferenceLine y={140} stroke="#DC2626" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Systolic"
                    stroke="#0D9488"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#0D9488' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="secondary"
                    name="Diastolic"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#4F46E5' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="vitalAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  {activeTab === 'spo2' && (
                    <ReferenceLine y={92} stroke="#DC2626" strokeDasharray="4 4" />
                  )}
                  {activeTab === 'hr' && (
                    <ReferenceLine y={100} stroke="#D97706" strokeDasharray="4 4" />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    name={currentTabMeta.label}
                    stroke="#0D9488"
                    strokeWidth={2.5}
                    fill="url(#vitalAreaFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Manual Cuff Blood Pressure Logger */}
        <form
          onSubmit={handleSaveBp}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] space-y-4"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">
                Log Cuff Blood Pressure
              </h3>
              <p className="text-sm text-[#64748B]">
                Measured sitting quietly with cuff on left arm
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1.5">
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
                  className="w-full min-h-[48px] px-3.5 pr-14 rounded-xl border border-[#CBD5E1] text-lg font-semibold text-[#0F172A] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">
                  mmHg
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1.5">
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
                  className="w-full min-h-[48px] px-3.5 pr-14 rounded-xl border border-[#CBD5E1] text-lg font-semibold text-[#0F172A] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">
                  mmHg
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1.5">
                {t('pulse', locale)}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  min={40}
                  max={200}
                  className="w-full min-h-[48px] px-3.5 pr-12 rounded-xl border border-[#CBD5E1] text-lg font-semibold text-[#0F172A] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">
                  bpm
                </span>
              </div>
            </div>
          </div>

          {bpCategory && (
            <div className={`p-3 rounded-xl border text-sm font-medium ${bpCategory.classes}`}>
              {bpCategory.label}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-base font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? t('saving', locale) : t('save_reading', locale)}</span>
          </button>
        </form>

        {/* Recent Cuff Readings */}
        {recentBpHistory.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#64748B]" />
              <h3 className="text-base font-semibold text-[#0F172A]">
                Recent Blood Pressure Readings
              </h3>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl divide-y divide-[#F1F5F9]">
              {recentBpHistory.map((item) => {
                const dateStr = (() => {
                  const d = new Date(item.recorded_at || item.recordedAt || 0);
                  return isNaN(d.getTime())
                    ? item.recorded_at || ''
                    : d.toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                })();

                return (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-base font-semibold text-[#0F172A] tabular-nums">
                        {item.value_a ?? item.valueA} / {item.value_b ?? item.valueB}{' '}
                        <span className="text-xs font-normal text-[#64748B]">mmHg</span>
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">{dateStr}</p>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155]">
                      {item.source === 'simulator' ? 'Sim' : 'Recorded'}
                    </span>
                  </div>
                );
              })}
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

export default function PatientVitalsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-sm text-[#64748B]">
          Loading vitals charts...
        </div>
      }
    >
      <VitalsContent />
    </Suspense>
  );
}
