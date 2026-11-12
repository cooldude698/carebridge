'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Phone, Shield, Watch } from 'lucide-react';
import { Locale } from '@/lib/i18n';

export interface PatientHeaderProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  showBack?: boolean;
  backHref?: string;
  title?: string;
}

function ClinicalLogoMark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-lg py-1 pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
    >
      <span className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center shadow-xs shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 16c2.5-6 13.5-6 16 0" />
          <path d="M3 16h18" />
          <path d="M12 6v5" />
          <path d="M9.5 8.5h5" />
        </svg>
      </span>
      <span className="font-semibold tracking-tight text-base text-[#0F172A] leading-none">
        Care<span className="text-[#0D9488]">Bridge</span>
      </span>
    </Link>
  );
}

export function PatientHeader({
  locale,
  onLocaleChange,
  showBack = false,
  backHref = '/patient',
  title,
}: PatientHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {showBack ? (
            <Link
              href={backHref}
              aria-label="Go back"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 rounded-xl text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
          ) : (
            <ClinicalLogoMark />
          )}

          {title && (
            <h1 className="font-semibold text-base sm:text-lg text-[#0F172A] truncate">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Segmented Language Switcher */}
          <div
            className="inline-flex items-center bg-[#F1F5F9] p-1 rounded-full border border-[#E2E8F0]"
            role="group"
            aria-label="Language selection"
          >
            {(
              [
                { code: 'en', label: 'EN' },
                { code: 'hi', label: 'हिंदी' },
                { code: 'kn', label: 'ಕನ್ನಡ' },
              ] as const
            ).map((item) => {
              const active = locale === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => onLocaleChange(item.code)}
                  className={`min-h-[36px] px-2.5 sm:px-3 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0D9488] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Watch Bridge Shortcut */}
          <Link
            href="/patient/watch"
            title="Smartwatch Bridge & Sync"
            aria-label="Smartwatch Bridge & Sync"
            className="hidden sm:inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0D9488] transition-colors"
          >
            <Watch className="w-4 h-4" />
          </Link>

          {/* Privacy & WhatsApp Alerts */}
          <Link
            href="/patient/consent"
            title="Privacy, Consent & WhatsApp Alerts"
            aria-label="Privacy, Consent & WhatsApp Alerts"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors"
          >
            <Shield className="w-4 h-4" />
          </Link>

          {/* Clinic Quick Call */}
          <a
            href="tel:+918023456789"
            title="Call Sunrise Clinic"
            aria-label="Call Sunrise Clinic"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#0F766E] hover:bg-[#CCFBF1]/60 transition-colors"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
