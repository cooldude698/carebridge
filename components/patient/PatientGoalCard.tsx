'use client';

import React from 'react';
import {
  Activity,
  CheckCircle2,
  Circle,
  Droplets,
  Flame,
  Heart,
  Pill,
  Sparkles,
  Utensils,
} from 'lucide-react';

export interface PatientGoalCardProps {
  id: string;
  category: string;
  target: string;
  by?: string | null;
  isCompleted?: boolean;
  onComplete?: (id: string) => void;
  disabled?: boolean;
}

function getGoalIcon(category: string) {
  const cat = category.toLowerCase();
  if (cat.includes('bp') || cat.includes('heart')) return <Heart className="w-5 h-5 text-[#0D9488]" />;
  if (cat.includes('step') || cat.includes('walk')) return <Activity className="w-5 h-5 text-[#0D9488]" />;
  if (cat.includes('cal')) return <Flame className="w-5 h-5 text-[#D97706]" />;
  if (cat.includes('diet') || cat.includes('food')) return <Utensils className="w-5 h-5 text-[#0D9488]" />;
  if (cat.includes('med')) return <Pill className="w-5 h-5 text-[#0D9488]" />;
  if (cat.includes('glu') || cat.includes('sugar')) return <Droplets className="w-5 h-5 text-[#0D9488]" />;
  return <Sparkles className="w-5 h-5 text-[#0D9488]" />;
}

export function PatientGoalCard({
  id,
  category,
  target,
  by,
  isCompleted = false,
  onComplete,
  disabled = false,
}: PatientGoalCardProps) {
  return (
    <button
      type="button"
      disabled={disabled || isCompleted}
      onClick={() => onComplete?.(id)}
      aria-pressed={isCompleted}
      className={`w-full text-left flex items-center justify-between gap-3 p-4 min-h-[56px] rounded-xl border border-l-4 transition-all ${
        isCompleted
          ? 'bg-[#F0FDF4]/60 border-[#BBF7D0] border-l-[#15803D] cursor-default'
          : 'bg-white border-[#E2E8F0] border-l-[#0D9488] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="p-2 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] shrink-0">
          {getGoalIcon(category)}
        </span>
        <div className="min-w-0">
          <p
            className={`text-base font-medium leading-snug ${
              isCompleted ? 'line-through text-[#64748B]' : 'text-[#0F172A]'
            }`}
          >
            {target}
          </p>
          {by && <p className="text-xs text-[#64748B] mt-0.5">Target: {by}</p>}
        </div>
      </div>

      <span className="shrink-0">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Done</span>
          </span>
        ) : (
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#CBD5E1] text-[#94A3B8]">
            <Circle className="w-4 h-4" />
          </span>
        )}
      </span>
    </button>
  );
}

