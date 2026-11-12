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
      return <Heart className="w-4 h-4 text-[#0D9488] shrink-0" />;
    }
    if (cat.includes('step') || cat.includes('walk') || cat.includes('activity')) {
      return <Activity className="w-4 h-4 text-[#0D9488] shrink-0" />;
    }
    if (cat.includes('med') || cat.includes('pill') || cat.includes('drug')) {
      return <Pill className="w-4 h-4 text-[#0D9488] shrink-0" />;
    }
    if (cat.includes('sugar') || cat.includes('glucose')) {
      return <Droplets className="w-4 h-4 text-[#0D9488] shrink-0" />;
    }
    return <Sparkles className="w-4 h-4 text-[#0D9488] shrink-0" />;
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
      className={`group flex items-center justify-between p-3.5 min-h-[52px] rounded-xl border border-l-2 border-l-[#0D9488] transition-all select-none ${
        isCompleted
          ? 'bg-[#F0FDF4] border-[#BBF7D0] border-l-[#15803D] cursor-default'
          : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] shadow-card cursor-pointer active:scale-[0.99]'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div
          className={`p-2 rounded-lg shrink-0 border ${
            isCompleted
              ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
              : 'bg-[#F0FDFA] text-[#0D9488] border-[#CCFBF1]'
          }`}
        >
          {getCategoryIcon()}
        </div>

        <div className="min-w-0">
          <p
            className={`font-body font-medium text-sm sm:text-base leading-snug tracking-tight ${
              isCompleted
                ? 'line-through text-[#94A3B8]'
                : 'text-[#0F172A]'
            }`}
          >
            {target}
          </p>
          {by && (
            <p className="font-body text-xs text-[#64748B] mt-0.5">
              By {by}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 pl-2">
        {isCompleted ? (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] font-data text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
            <span>Done</span>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border border-[#CBD5E1] group-hover:border-[#0D9488] flex items-center justify-center transition-colors">
            <Circle className="w-2.5 h-2.5 text-transparent group-hover:text-[#0D9488] fill-current transition-colors" />
          </div>
        )}
      </div>
    </div>
  );
};
