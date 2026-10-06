'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, Mic, Activity, Users } from 'lucide-react';
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
      href: '/family',
      label: t('nav_family', locale),
      icon: Users,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-50 bg-white border-t-2 md:border-x-2 border-ink-900 shadow-[0px_-2px_0px_#121214] h-[68px] pb-1 select-none">
      <div className="w-full h-full px-2 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isSpecial) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 group"
              >
                <div
                  className={`w-12 h-12 rounded-full bg-[#FF5C98] border-2 border-ink-900 flex items-center justify-center shadow-[2px_2px_0px_#121214] group-active:translate-y-0.5 group-hover:scale-105 transition-all ${
                    isActive ? 'ring-2 ring-ink-900 ring-offset-2' : ''
                  }`}
                >
                  <Icon className="w-6 h-6 text-white stroke-[2.5]" />
                </div>
                <span className="font-body text-[11px] font-bold text-ink-900 mt-1 tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[52px] px-1 py-1 rounded-xl transition-all ${
                isActive ? 'text-ink-900' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#D4F77C] border border-ink-900 shadow-[1px_1px_0px_#121214]'
                    : ''
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-ink-900 stroke-[2.5]' : 'text-ink-500 stroke-[2]'
                  }`}
                />
              </div>
              <span
                className={`font-body text-[10px] tracking-tight mt-0.5 ${
                  isActive ? 'font-bold text-ink-900' : 'font-medium text-ink-500'
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
