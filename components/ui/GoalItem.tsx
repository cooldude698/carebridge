'use client';

import React from 'react';
import { Heart, Activity, Pill, Droplets, Sparkles, CheckCircle2, Circle } from 'lucide-react';

export interface GoalItemProps {
  id: string;
  category: 'steps' | 'medicine' | 'bp' | 'glucose' | 'other' | string;
  target: string;
  by?: string;
  isCompleted?: boolean;
  onComplete?: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

export const GoalItem: React.FC<GoalItemProps> = ({
  id,
  category,
  target,
  by,
  isCompleted = false,
  onComplete,
  disabled = false,
  className = '',
}) => {
  const getCategoryIcon = () => {
    const cat = category.toLowerCase();
    if (cat.includes('bp') || cat.includes('blood pressure') || cat.includes('heart')) {
      return <Heart className="w-5 h-5 text-teal-600 shrink-0" />;
    }
    if (cat.includes('step') || cat.includes('walk') || cat.includes('activity')) {
      return <Activity className="w-5 h-5 text-teal-600 shrink-0" />;
    }
    if (cat.includes('med') || cat.includes('pill') || cat.includes('drug')) {
      return <Pill className="w-5 h-5 text-teal-600 shrink-0" />;
    }
    if (cat.includes('sugar') || cat.includes('glucose')) {
      return <Droplets className="w-5 h-5 text-teal-600 shrink-0" />;
    }
    return <Sparkles className="w-5 h-5 text-teal-600 shrink-0" />;
  };

  const handleClick = () => {
    if (disabled || isCompleted) return;
    onComplete?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isCompleted) {
      e.preventDefault();
      onComplete?.(id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={isCompleted}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group flex items-center justify-between p-3 sm:p-3.5 min-h-[54px] rounded-xl border-2 border-ink-900 transition-all select-none ${
        isCompleted
          ? 'bg-emerald-50 border-emerald-600 shadow-[1px_1px_0px_#15803D] cursor-default'
          : 'bg-white shadow-[2px_2px_0px_#121214] hover:bg-[#FAF8F5] cursor-pointer active:translate-y-0.5'
      } ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div
          className={`p-2 rounded-lg shrink-0 transition-colors border border-ink-900 ${
            isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-[#D4F77C] text-ink-900'
          }`}
        >
          {getCategoryIcon()}
        </div>

        <div className="min-w-0">
          <p
            className={`font-body font-bold text-sm sm:text-base leading-snug tracking-tight transition-colors ${
              isCompleted
                ? 'line-through text-ink-400 font-medium'
                : 'text-ink-900'
            }`}
          >
            {target}
          </p>
          {by && (
            <p className="font-body text-xs text-ink-500 mt-0.5 font-medium">
              By {by}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 pl-2">
        {isCompleted ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-600 font-data text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Done</span>
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-ink-900 group-hover:bg-[#D4F77C] flex items-center justify-center transition-colors">
            <Circle className="w-3 h-3 text-transparent group-hover:text-ink-900 fill-current transition-colors" />
          </div>
        )}
      </div>
    </div>
  );
};
