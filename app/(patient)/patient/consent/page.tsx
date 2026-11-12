'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Footprints,
  Heart,
  History,
  Lock,
  MessageCircle,
  Pill,
  Send,
  Shield,
  Loader2,
} from 'lucide-react';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { BottomNav } from '@/components/patient/BottomNav';
import { PatientToast } from '@/components/patient/PatientToast';
import { usePatientLocale } from '@/components/patient/usePatientLocale';
import { t } from '@/lib/i18n';
import {
  AuditLog,
  ConsentCategory,
  WhatsAppNotificationLog,
  WhatsAppPreferences,
} from '@/lib/types';

const PATIENT_ID = 'p1';

const CONSENT_META: Record<
  ConsentCategory,
  { title: string; description: string; icon: React.ElementType }
> = {
  vitals: {
    title: 'Blood Pressure, Heart Rate & SpO2',
    description: 'Allow Dr. Meera Rao and guardian Karan K. to view your watch & BP readings.',
    icon: Heart,
  },
  medicines: {
    title: 'Digital Prescriptions & Dose Adherence',
    description: 'Share daily medication check-offs and missed-dose alerts with clinic and family.',
    icon: Pill,
  },
  steps: {
    title: 'Daily Steps, Calories & Sleep',
    description: 'Share smartwatch mobility and activity progress toward your daily targets.',
    icon: Footprints,
  },
  glucose: {
    title: 'Blood Sugar & Glucose Records',
    description: 'Share fasting and post-meal glucose measurements with your care team.',
    icon: Activity,
  },
};

export default function PatientConsentPage() {
  const { locale, changeLocale } = usePatientLocale('en');

  const [consentMap, setConsentMap] = useState<Record<ConsentCategory, boolean>>({
    vitals: true,
    medicines: true,
    steps: true,
    glucose: true,
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [waPrefs, setWaPrefs] = useState<WhatsAppPreferences>({
    patient_id: PATIENT_ID,
    patient_phone: '+91 98450 11223',
    guardian_name: 'Karan K.',
    guardian_phone: '+91 98450 12345',
    new_prescription_alerts: true,
    missed_medicine_reminders: true,
    critical_vital_alerts: true,
  });
  const [waLogs, setWaLogs] = useState<WhatsAppNotificationLog[]>([]);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const loadData = useCallback(async () => {
    try {
      const [cRes, aRes, waRes] = await Promise.all([
        fetch(`/api/patients/${PATIENT_ID}/consents`, { cache: 'no-store' }),
        fetch(`/api/patients/${PATIENT_ID}/audit`, { cache: 'no-store' }),
        fetch(`/api/notifications/whatsapp?patientId=${PATIENT_ID}`, { cache: 'no-store' }),
      ]);

      if (cRes.ok) {
        const cList = await cRes.json();
        if (Array.isArray(cList)) {
          setConsentMap((prev) => {
            const next = { ...prev };
            for (const item of cList) {
              if (item.category in next) {
                next[item.category as ConsentCategory] = Boolean(item.granted);
              }
            }
            return next;
          });
        }
      }

      if (aRes.ok) {
        const aList = await aRes.json();
        if (Array.isArray(aList)) setAuditLogs(aList);
      }

      if (waRes.ok) {
        const waData = await waRes.json();
        if (waData?.preferences) setWaPrefs(waData.preferences);
        if (Array.isArray(waData?.logs)) setWaLogs(waData.logs);
      }
    } catch {
      // fallback gracefully
    }
  }, []);

  useEffect(() => {
    const kickOff = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(kickOff);
  }, [loadData]);

  const handleConsentToggle = async (category: ConsentCategory) => {
    const nextVal = !consentMap[category];
    setConsentMap((prev) => ({ ...prev, [category]: nextVal }));

    try {
      await fetch(`/api/patients/${PATIENT_ID}/consents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, granted: nextVal }),
      });
    } catch {
      // ignore
    }

    showToast(nextVal ? `Sharing enabled for ${category}` : `Sharing paused for ${category}`);
  };

  const handleWaPrefToggle = async (
    key: 'new_prescription_alerts' | 'missed_medicine_reminders' | 'critical_vital_alerts'
  ) => {
    const updated = { ...waPrefs, [key]: !waPrefs[key] };
    setWaPrefs(updated);

    try {
      await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: PATIENT_ID,
          action: 'update_prefs',
          preferences: updated,
        }),
      });
      showToast('WhatsApp preference updated');
    } catch {
      // ignore
    }
  };

  const handleSendTestWhatsApp = async () => {
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: PATIENT_ID,
          eventType: 'test_ping',
        }),
      });
      if (res.ok) {
        showToast(t('alerts.test_sent', locale));
        await loadData();
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-28">
      <PatientHeader
        locale={locale}
        onLocaleChange={changeLocale}
        showBack
        backHref="/patient"
        title="Privacy & Alerts"
      />

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-6">
        {/* DPDP Intro Card */}
        <section className="bg-[#0F172A] text-white rounded-2xl p-5 sm:p-6 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5EEAD4]">
            <Lock className="w-3.5 h-3.5" />
            <span>DPDP Act Consent Controls</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold">You Control Your Health Data</h2>
          <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
            Choose exactly which health categories Dr. Meera Rao (Sunrise Clinic) and Karan K. (Family Guardian) can access. Every view is logged immutably below.
          </p>
        </section>

        {/* Data Sharing Switches */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0D9488]" />
            <span>Data Sharing Categories</span>
          </h3>

          <div className="space-y-2.5">
            {(Object.keys(CONSENT_META) as ConsentCategory[]).map((category) => {
              const meta = CONSENT_META[category];
              const Icon = meta.icon;
              const enabled = consentMap[category];

              return (
                <div
                  key={category}
                  className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        enabled
                          ? 'bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]'
                          : 'bg-[#F1F5F9] text-[#64748B]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="text-base font-semibold text-[#0F172A]">{meta.title}</h4>
                      <p className="text-sm text-[#475569] mt-0.5">{meta.description}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Toggle ${meta.title}`}
                    onClick={() => handleConsentToggle(category)}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      enabled ? 'bg-[#0D9488]' : 'bg-[#CBD5E1]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-sm transition duration-200 ${
                        enabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* WhatsApp Care Alerts Card */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">
                {t('alerts.whatsapp_title', locale)}
              </h3>
              <p className="text-sm text-[#475569] mt-0.5">
                {t('alerts.whatsapp_desc', locale)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 text-sm">
            <div>
              <span className="text-xs text-[#64748B] block">Patient WhatsApp</span>
              <span className="font-semibold text-[#0F172A] tabular-nums">
                {waPrefs.patient_phone}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#64748B] block">
                Linked Guardian ({waPrefs.guardian_name})
              </span>
              <span className="font-semibold text-[#0F172A] tabular-nums">
                {waPrefs.guardian_phone}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {(
              [
                {
                  key: 'new_prescription_alerts',
                  label: t('alerts.new_rx', locale),
                },
                {
                  key: 'missed_medicine_reminders',
                  label: t('alerts.missed_med', locale),
                },
                {
                  key: 'critical_vital_alerts',
                  label: t('alerts.critical_vitals', locale),
                },
              ] as const
            ).map((item) => {
              const checked = waPrefs[item.key];
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 py-2 border-b border-[#F1F5F9] last:border-b-0"
                >
                  <span className="text-sm sm:text-base font-medium text-[#0F172A]">
                    {item.label}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    onClick={() => handleWaPrefToggle(item.key)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      checked ? 'bg-[#0D9488]' : 'bg-[#CBD5E1]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-xs transition ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={isSendingTest}
            onClick={handleSendTestWhatsApp}
            className="w-full min-h-[48px] rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSendingTest ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{t('alerts.send_test', locale)}</span>
          </button>

          {waLogs.length > 0 && (
            <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Recent WhatsApp Dispatch Log
              </p>
              {waLogs.slice(0, 3).map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#0F172A]">
                      {entry.recipient_role.toUpperCase()} · {entry.recipient_phone}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803D] font-medium">
                      {entry.status === 'sent' ? 'Sent' : 'Audited (Sim)'}
                    </span>
                  </div>
                  <p className="text-[#475569]">{entry.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Access Audit Log */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#64748B]" />
            <h3 className="text-lg font-semibold text-[#0F172A]">Access Audit Log</h3>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl divide-y divide-[#F1F5F9]">
            {auditLogs.length === 0 ? (
              <p className="p-5 text-sm text-[#64748B]">No recent views logged yet.</p>
            ) : (
              auditLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {log.actor || log.actor_id}
                    </p>
                    <p className="text-xs text-[#475569] mt-0.5">
                      {log.action} · {log.category}
                    </p>
                  </div>
                  <span className="text-xs text-[#64748B] tabular-nums shrink-0">
                    {log.at ||
                      (log.created_at
                        ? new Date(log.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '')}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <p className="text-xs text-[#64748B] text-center">
          Compliant with DPDP Act standards. {t('decision_support_note', locale)}
        </p>
      </main>

      <PatientToast message={toast} />
      <BottomNav locale={locale} />
    </div>
  );
}
