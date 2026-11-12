'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { Locale } from '@/lib/i18n';

const STORAGE_KEY = 'carebridge_locale';
const LOCALE_EVENT = 'carebridge-locale-change';

function subscribeLocale(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onStoreChange();
  window.addEventListener('storage', handler);
  window.addEventListener(LOCALE_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(LOCALE_EVENT, handler);
  };
}

function readStoredLocale(defaultLocale: Locale): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === 'en' || saved === 'hi' || saved === 'kn') {
      return saved;
    }
  } catch {
    // ignore storage restrictions
  }
  return defaultLocale;
}

export function usePatientLocale(defaultLocale: Locale = 'en') {
  const locale = useSyncExternalStore(
    subscribeLocale,
    () => readStoredLocale(defaultLocale),
    () => defaultLocale
  );

  const changeLocale = useCallback((nextLocale: Locale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
      window.dispatchEvent(new Event(LOCALE_EVENT));
    } catch {
      // ignore storage restrictions
    }
  }, []);

  return { locale, changeLocale };
}
