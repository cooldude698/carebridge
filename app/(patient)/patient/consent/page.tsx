'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Heart,
  Pill,
  Footprints,
  Activity,
  History,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Card, ConsentToggle } from '@/components/ui';
import { PatientHeader } from '@/components/patient/PatientHeader';
import { BottomNav } from '@/components/patient/BottomNav';
import { Locale } from '@/lib/i18n';
import { INITIAL_CONSENTS, INITIAL_AUDIT_LOGS, HERO_PATIENT } from '@/lib/mockData';

export default function PatientConsentPage() {
  const [locale, setLocale] = useState<Locale>('hi');
  const [consents, setConsents] = useState(INITIAL_CONSENTS);
  const [auditLogs] = useState(INITIAL_AUDIT_LOGS);
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

  const handleToggle = async (
    category: 'vitals' | 'medicines' | 'steps' | 'glucose',
    granted: boolean
  ) => {
    // Optimistic UI update
    setConsents((prev) =>
      prev.map((c) => (c.category === category ? { ...c, granted } : c))
    );

    try {
      await fetch(`/api/patients/${HERO_PATIENT.id}/consents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, granted }),
      });
    } catch {
      // fallback
    }

    setToastMessage(
      granted
        ? `Sharing enabled for ${category}`
        : `Sharing restricted for ${category}`
    );
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vitals':
        return <Heart className="w-5 h-5" />;
      case 'medicines':
        return <Pill className="w-5 h-5" />;
      case 'steps':
        return <Footprints className="w-5 h-5" />;
      case 'glucose':
        return <Activity className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] md:bg-[#EAE6DB] flex flex-col items-center">
      <div className="w-full max-w-md min-h-screen bg-[#FAF8F5] text-ink-900 flex flex-col relative md:border-x-2 md:border-ink-900 md:shadow-[0_10px_35px_rgba(0,0,0,0.08)] pb-28 sm:pb-32">
        <PatientHeader
          locale={locale}
          onLocaleChange={handleLocaleChange}
          showBack
          backHref="/patient"
          title="Privacy & Consent"
        />

        <main className="w-full px-3.5 sm:px-4 pt-3.5 space-y-4">
        {/* Intro Card */}
        <div className="bg-ink-900 text-white p-4.5 sm:p-5 rounded-[20px] border-2 border-ink-900 shadow-[4px_4px_0px_#121214] space-y-2">
          <div className="flex items-center gap-2 text-[#D4F77C] font-display font-bold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            <span>You Own Your Health Data</span>
          </div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
            Consent Controls
          </h2>
          <p className="font-body text-xs sm:text-sm text-[#EAE7DC] leading-relaxed">
            Choose what health categories Dr. Meera Rao (Clinic) and Karan K.
            (Family) can view. You can change these permissions anytime.
          </p>
        </div>

        {/* Consent Category Toggles */}
        <div className="space-y-2.5">
          <h3 className="font-display font-bold text-base sm:text-lg text-ink-900 px-0.5">
            Data Sharing Categories
          </h3>

          <div className="space-y-2.5">
            {consents.map((item) => (
              <ConsentToggle
                key={item.category}
                id={item.category}
                category={item.category}
                title={item.title}
                description={item.description}
                granted={item.granted}
                onToggle={handleToggle}
                icon={getCategoryIcon(item.category)}
              />
            ))}
          </div>
        </div>

        {/* Audit Log / Transparency Section */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center gap-2 px-0.5">
            <History className="w-4 h-4 text-ink-600" />
            <h3 className="font-display font-bold text-base sm:text-lg text-ink-900">
              Access Audit Log
            </h3>
          </div>

          <div className="p-3.5 sm:p-4 bg-white rounded-[20px] border-2 border-ink-900 shadow-[2px_2px_0px_#121214] space-y-3">
            <p className="font-body text-xs text-ink-500 font-medium">
              Every view by your clinic or family is logged immutably:
            </p>

            <div className="space-y-2.5 divide-y divide-ink-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="pt-2.5 first:pt-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-display font-bold text-ink-900">
                      {log.actor}
                    </span>
                    <span className="font-data text-ink-500 font-medium text-[11px]">
                      {log.at}
                    </span>
                  </div>
                  <p className="font-body text-xs text-ink-700 mt-0.5 font-medium">
                    {log.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legal & Decision Support Note */}
        <div className="p-3.5 rounded-[18px] bg-[#FEF3C7] border-2 border-ink-900 text-xs text-ink-900 space-y-1 font-body shadow-[2px_2px_0px_#121214]">
          <p className="font-bold">Patient Data Rights Notice:</p>
          <p className="text-ink-700 font-medium">
            Compliant with DPDP Act standards. All health data is encrypted at
            rest. Doctor decides all clinical protocols.
          </p>
        </div>
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
