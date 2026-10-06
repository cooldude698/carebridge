'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Phone,
  Bell,
  Heart,
  Pill,
  Footprints,
  ShieldAlert,
  ChevronLeft,
  RefreshCw,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Card, RiskBadge, AlertItem } from '@/components/ui';
import { BottomNav } from '@/components/patient/BottomNav';
import { Locale, t } from '@/lib/i18n';
import { INITIAL_FAMILY_FEED, HERO_PATIENT } from '@/lib/mockData';
import { FamilyFeedResponse, Alert } from '@/lib/types';

// Priority sorting order: doctor / doctor_note > wearable_anomaly > family > reminder
const LEVEL_PRIORITY: Record<string, number> = {
  urgent: 1,
  critical: 1,
  doctor: 2,
  doctor_note: 2,
  wearable_anomaly: 3,
  family: 4,
  warning: 4,
  reminder: 5,
  info: 6,
};

function formatRelativeTime(seconds: number, loc: Locale): string {
  if (seconds < 60) {
    if (loc === 'hi') return 'अभी-अभी';
    if (loc === 'kn') return 'ಈಗಷ್ಟೇ';
    return 'Just now';
  }
  let timeStr = '';
  if (seconds < 3600) {
    const mins = Math.max(1, Math.floor(seconds / 60));
    timeStr = loc === 'hi' ? `${mins} मिनट` : loc === 'kn' ? `${mins} ನಿಮಿಷ` : `${mins} min`;
  } else {
    const hours = Math.floor(seconds / 3600);
    timeStr = loc === 'hi' ? `${hours} घंटे` : loc === 'kn' ? `${hours} ಗಂಟೆ` : `${hours} hours`;
  }
  const tmpl = t('family.last_updated', loc);
  return tmpl.includes('{time}') ? tmpl.replace('{time}', timeStr) : `Updated ${timeStr} ago`;
}

function getLocalizedAlertMessage(alert: Alert, loc: Locale): string {
  if (alert.level === 'doctor_note') {
    return t('family.doctor_note', loc);
  }
  if (alert.level === 'wearable_anomaly') {
    const msg = alert.message.toLowerCase();
    if (
      msg.includes('heart') ||
      msg.includes('hr') ||
      msg.includes('sleep') ||
      msg.includes('हृदय') ||
      msg.includes('ಹೃದಯ')
    ) {
      return t('family.wearable_anomaly_hr', loc);
    }
    if (
      msg.includes('step') ||
      msg.includes('walk') ||
      msg.includes('active') ||
      msg.includes('सक्रिय') ||
      msg.includes('ಕಡಿಮೆ')
    ) {
      return t('family.wearable_anomaly_steps', loc);
    }
  }
  return alert.message;
}

export default function FamilyFeedPage() {
  const [locale, setLocale] = useState<Locale>('en');
  const [feedData, setFeedData] = useState<FamilyFeedResponse>(INITIAL_FAMILY_FEED);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number>(0);

  // Poll feed every 3 seconds as specified in ARCHITECTURE.md section 8
  useEffect(() => {
    let isMounted = true;

    const fetchFeed = async () => {
      try {
        const res = await fetch(`/api/family/${HERO_PATIENT.id}/feed`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setFeedData(data);
            setLastUpdatedTime(new Date());
          }
        }
      } catch {
        // use local feedData on error
      }
    };

    fetchFeed();
    const interval = setInterval(fetchFeed, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Update seconds counter for relative time footer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdatedTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdatedTime]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/family/${HERO_PATIENT.id}/feed`);
      if (res.ok) {
        const data = await res.json();
        setFeedData(data);
        setLastUpdatedTime(new Date());
      }
    } catch {
      // fallback
    }
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleSendReminder = () => {
    const newAlert: Alert = {
      id: `alert-${Date.now()}`,
      patientId: HERO_PATIENT.id,
      level: 'reminder',
      audience: 'patient',
      message: 'Karan sent a gentle reminder: "Papa, please check if your evening dose is taken."',
      createdAt: 'Just now',
      acknowledgedAt: null,
    };

    setFeedData((prev) => ({
      ...prev,
      alerts: [newAlert, ...prev.alerts],
    }));

    setToastMessage('Reminder sent to father’s phone!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sort alerts: doctor / doctor_note > wearable_anomaly > family > reminder
  const sortedAlerts = useMemo(() => {
    return [...feedData.alerts].sort((a, b) => {
      const pA = LEVEL_PRIORITY[a.level] ?? 10;
      const pB = LEVEL_PRIORITY[b.level] ?? 10;
      if (pA !== pB) return pA - pB;
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
  }, [feedData.alerts]);

  return (
    <div className="min-h-screen bg-[#F4F1EA] md:bg-[#EAE6DB] flex flex-col items-center">
      <div className="w-full max-w-md min-h-screen bg-[#FAF8F5] text-[var(--ink-900)] flex flex-col relative md:border-x-2 md:border-ink-900 md:shadow-[0_10px_35px_rgba(0,0,0,0.08)] pb-28 sm:pb-32">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-ink-900 px-4 py-3">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/patient"
                className="p-2 -ml-2 rounded-xl text-[var(--ink-900)] hover:bg-[var(--surface-100)] min-h-[44px] min-w-[44px] flex items-center"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </Link>
              <div>
                <h1 className="font-display font-bold text-lg text-[var(--ink-900)] leading-tight">
                  {t('family_feed_title', locale)}
                </h1>
                <p className="font-body text-xs text-[var(--ink-500)]">
                  Karan K. • Bengaluru
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleManualRefresh}
                className={`p-2 rounded-full text-[var(--ink-700)] hover:bg-[var(--surface-100)] min-h-[40px] min-w-[40px] flex items-center justify-center transition-transform ${
                  isRefreshing ? 'animate-spin text-[var(--brand-teal)]' : ''
                }`}
                title="Refresh live status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <div className="flex bg-[var(--surface-100)] p-0.5 rounded-full border border-[var(--surface-200)] text-xs">
                {(['en', 'hi', 'kn'] as const).map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={`px-2 py-0.5 rounded-full font-bold uppercase transition-colors ${
                      locale === loc ? 'bg-[var(--brand-teal)] text-white' : 'text-[var(--ink-500)] hover:text-[var(--ink-700)]'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <main className="w-full px-4 pt-4 space-y-5">
        {/* Patient Status Overview Card (F1) */}
        <Card className="p-6 border-indigo-100 shadow-card bg-gradient-to-b from-white to-indigo-50/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[var(--r-md)] bg-[var(--brand-teal)] text-white font-display font-bold text-xl flex items-center justify-center shadow-sm">
                RK
              </div>
              <div>
                <h2 className="font-display font-bold text-2xl text-[var(--ink-900)] leading-tight">
                  {feedData.patient.name}
                </h2>
                <p className="font-body text-xs text-[var(--ink-500)] flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--risk-green)] inline-block animate-ping" />
                  Active {feedData.patient.lastSeen} • 62 yrs
                </p>
              </div>
            </div>

            {/* Risk Badge with band and score */}
            <RiskBadge
              band={feedData.patient.band}
              score={feedData.patient.score}
              size="md"
            />
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-[var(--surface-200)] text-center">
            <div className="bg-white p-2.5 rounded-[var(--r-md)] border border-[var(--surface-200)] shadow-sm">
              <div className="flex items-center justify-center gap-1 text-[var(--brand-teal)] mb-0.5">
                <Pill className="w-4 h-4" />
                <span className="font-body text-[11px] font-semibold text-[var(--ink-500)]">Meds</span>
              </div>
              <p className="font-data font-bold text-lg text-[var(--ink-900)]">
                {feedData.today.medicinesTaken}/{feedData.today.medicinesTotal}
              </p>
            </div>

            <div className="bg-white p-2.5 rounded-[var(--r-md)] border border-[var(--surface-200)] shadow-sm">
              <div className="flex items-center justify-center gap-1 text-[var(--risk-amber)] mb-0.5">
                <Heart className="w-4 h-4" />
                <span className="font-body text-[11px] font-semibold text-[var(--ink-500)]">BP</span>
              </div>
              <p className="font-data font-bold text-sm text-[var(--ink-900)] truncate">
                {feedData.today.latestBp ? feedData.today.latestBp.split(' ')[0] : '138/88'}
              </p>
            </div>

            <div className="bg-white p-2.5 rounded-[var(--r-md)] border border-[var(--surface-200)] shadow-sm">
              <div className="flex items-center justify-center gap-1 text-[var(--brand-indigo)] mb-0.5">
                <Footprints className="w-4 h-4" />
                <span className="font-body text-[11px] font-semibold text-[var(--ink-500)]">Steps</span>
              </div>
              <p className="font-data font-bold text-lg text-[var(--ink-900)]">
                {feedData.today.latestSteps.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Direct Communication Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <a
              href="tel:+919876543210"
              className="min-h-[48px] px-4 py-2.5 rounded-[var(--r-pill)] bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-dark)] text-white font-display font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Phone className="w-4 h-4" />
              <span>{t('call_father', locale)}</span>
            </a>

            <button
              onClick={handleSendReminder}
              className="min-h-[48px] px-4 py-2.5 rounded-[var(--r-pill)] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-display font-bold text-sm flex items-center justify-center gap-2 border border-indigo-200 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{t('send_nudge', locale)}</span>
            </button>
          </div>
        </Card>

        {/* Escalation Ladder & Alert Feed (F2) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[var(--brand-teal)]" />
              <h3 className="font-display font-bold text-lg text-[var(--ink-900)]">
                Care Timeline & Escalation
              </h3>
            </div>
            <span className="font-data text-xs text-[var(--ink-400)]">
              Auto-syncs 3s
            </span>
          </div>

          {/* Visual 3-Stage Escalation Ladder */}
          <Card className="p-4 bg-white border-[var(--surface-200)] shadow-sm">
            <p className="font-body text-xs font-semibold text-[var(--ink-500)] uppercase tracking-wider mb-3">
              Escalation Protocol Progress
            </p>
            <div className="grid grid-cols-3 gap-2 text-center relative">
              {/* Step 1: Patient */}
              <div className="p-2.5 rounded-[var(--r-md)] bg-blue-50 border border-blue-200">
                <span className="font-data text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                  Stage 1 (T+0)
                </span>
                <span className="font-display font-bold text-xs text-[var(--ink-900)] block mt-0.5">
                  Patient Ping
                </span>
                <span className="text-[10px] text-[var(--ink-500)] font-body block mt-0.5">
                  Gentle reminder
                </span>
              </div>

              {/* Step 2: Family */}
              <div className="p-2.5 rounded-[var(--r-md)] bg-amber-50 border border-amber-200 ring-2 ring-amber-400/50">
                <span className="font-data text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  Stage 2 (Active)
                </span>
                <span className="font-display font-bold text-xs text-[var(--ink-900)] block mt-0.5">
                  Family Loop
                </span>
                <span className="text-[10px] text-[var(--ink-500)] font-body block mt-0.5">
                  Karan notified
                </span>
              </div>

              {/* Step 3: Doctor */}
              <div className="p-2.5 rounded-[var(--r-md)] bg-[var(--surface-100)] border border-[var(--surface-200)] opacity-70">
                <span className="font-data text-[10px] font-bold uppercase tracking-wider text-[var(--ink-500)] block">
                  Stage 3 (+25s)
                </span>
                <span className="font-display font-bold text-xs text-[var(--ink-900)] block mt-0.5">
                  Clinic Alert
                </span>
                <span className="text-[10px] text-[var(--ink-500)] font-body block mt-0.5">
                  Dr. Rao briefed
                </span>
              </div>
            </div>
          </Card>

          {/* Alert Feed Items */}
          <div className="space-y-3">
            {sortedAlerts.length > 0 ? (
              sortedAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  id={alert.id}
                  level={alert.level}
                  audience={alert.audience}
                  message={getLocalizedAlertMessage(alert, locale)}
                  createdAt={alert.createdAt || (alert as any).created_at}
                  acknowledgedAt={alert.acknowledgedAt || (alert as any).acknowledged_at}
                />
              ))
            ) : (
              <Card className="text-center py-6 text-[var(--ink-500)]">
                <CheckCircle2 className="w-8 h-8 text-[var(--risk-green)] mx-auto mb-1.5" />
                <p className="font-body text-sm font-medium">
                  {t('all_normal', locale)}
                </p>
              </Card>
            )}
          </div>
        </section>

        {/* Clinic Escalation Protocol Note */}
        <Card className="bg-[var(--risk-amber-bg)] border-[var(--risk-amber)]/30 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[var(--risk-amber)] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--ink-700)] leading-relaxed font-body">
              <span className="font-bold text-[var(--ink-900)]">Escalation Protocol Active:</span> If
              evening medicines or abnormal vitals are unattended, family gets
              notified first, followed by pre-consult briefing to Dr. Meera Rao
              at Sunrise Clinic.
            </div>
          </div>
        </Card>

        {/* Medical Disclaimer */}
        <p className="font-body text-xs text-[var(--ink-400)] text-center">
          {t('decision_support_note', locale)}
        </p>

        {/* Last Updated Footer */}
        <div className="text-center pt-2 pb-6">
          <p className="font-body text-xs text-[var(--ink-300)]">
            {formatRelativeTime(secondsSinceUpdate, locale)}
          </p>
        </div>
      </main>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[var(--ink-900)] text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 font-display text-sm font-semibold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[var(--brand-teal)]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav locale={locale} />
      </div>
    </div>
  );
}
