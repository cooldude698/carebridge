'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, Mic, Activity, FileText } from 'lucide-react';
import { Locale, t } from '@/lib/i18n';

export interface BottomNavProps {
  locale?: Locale;
}

export function BottomNav({ locale = 'en' }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/patient',
      label: t('nav_home', locale),
      icon: Home,
    },
    {
      href: '/patient/medicines',
      label: t('nav_medicines', locale),
      icon: Pill,
    },
    {
      href: '/patient/voice',
      label: t('nav_voice', locale),
      icon: Mic,
      isSpecial: true,
    },
    {
      href: '/patient/vitals',
      label: t('nav_vitals', locale),
      icon: Activity,
    },
    {
      href: '/patient/reports',
      label: t('nav_reports', locale),
      icon: FileText,
    },
  ];

  return (
    <nav
      aria-label="Patient portal navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] shadow-[0_-4px_20px_rgba(15,23,42,0.05)] select-none"
    >
      <div className="max-w-3xl mx-auto h-[72px] px-2 sm:px-6 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isSpecial) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4 group min-w-[64px]"
              >
                <div
                  className={`w-12 h-12 rounded-full bg-[#0D9488] hover:bg-[#0F766E] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(13,148,136,0.32)] transition-all ${
                    isActive ? 'ring-4 ring-[#CCFBF1]' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11px] mt-1 tracking-tight ${
                    isActive ? 'font-semibold text-[#0F766E]' : 'font-medium text-[#475569]'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 py-1 rounded-xl transition-colors ${
                isActive
                  ? 'text-[#0D9488]'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              <div
                className={`w-8 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isActive ? 'bg-[#F0FDFA] text-[#0D9488]' : ''
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
              </div>
              <span
                className={`text-[11px] tracking-tight mt-0.5 ${
                  isActive ? 'font-semibold text-[#0F766E]' : 'font-medium text-[#64748B]'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
