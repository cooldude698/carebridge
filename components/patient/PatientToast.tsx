'use client';

import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface PatientToastProps {
  message: string | null;
  type?: 'success' | 'error';
}

export function PatientToast({ message, type = 'success' }: PatientToastProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-max max-w-[90vw] px-4 py-3 rounded-xl bg-[#0F172A] text-white shadow-lg border border-[#334155] flex items-center gap-2.5 text-sm font-medium"
    >
      {type === 'error' ? (
        <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

