'use client';

import React from 'react';
import { Stethoscope, CalendarCheck, Clock, Sparkles } from 'lucide-react';
import { GoalItem } from './GoalItem';
import { Locale, t } from '@/lib/i18n';

export interface DoctorNoteReminder {
  medicine: string;
  time: string;
  instruction: string;
}

export interface DoctorNoteGoal {
  id: string;
  category: string;
  target: string;
  by?: string;
  isCompleted?: boolean;
}

export interface DoctorNoteCardProps {
  noteDate: string;
  reminders?: DoctorNoteReminder[];
  goals?: DoctorNoteGoal[];
  followUpDate?: string | null;
  isLoading?: boolean;
  onGoalComplete?: (goalId: string) => void;
  locale?: Locale;
  className?: string;
}

export const DoctorNoteCard: React.FC<DoctorNoteCardProps> = ({
  noteDate,
  reminders = [],
  goals = [],
  followUpDate,
  isLoading = false,
  onGoalComplete,
  locale = 'hi',
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-[#E2E8F0] border-l-4 border-l-[#0D9488] shadow-card p-4 sm:p-5 space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] shrink-0">
            <Stethoscope className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-base text-[#0F172A] leading-tight">
                {t('doctor_note.from_doctor', locale)}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-body font-medium bg-[#F0FDFA] text-[#0D9488] px-2 py-0.5 rounded-full border border-[#CCFBF1]">
                <Sparkles className="w-3 h-3 text-[#0D9488]" />
                {t('doctor_note.new_plan', locale)}
              </span>
            </div>
            <p className="font-body text-xs text-[#64748B] mt-0.5">
              {noteDate}
            </p>
          </div>
        </div>
      </div>

      {/* Reminders section */}
      {reminders.length > 0 && (
        <div className="space-y-2">
          <p className="font-body font-semibold text-xs text-[#64748B] uppercase tracking-wider">
            {t('doctor_note.reminders_title', locale)}
          </p>
          <div className="space-y-2">
            {reminders.map((reminder, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] gap-1.5"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-data font-semibold text-xs sm:text-sm text-[#0F172A]">
                    {reminder.medicine}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0FDFA] text-[#0D9488] font-data text-[11px] font-medium border border-[#CCFBF1]">
                    <Clock className="w-3 h-3 text-[#0D9488]" />
                    {reminder.time}
                  </span>
                </div>
                <p className="font-body text-xs sm:text-sm text-[#334155] leading-snug">
                  {reminder.instruction}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals section */}
      {goals.length > 0 && (
        <div className="space-y-2">
          <p className="font-body font-semibold text-xs text-[#64748B] uppercase tracking-wider">
            {t('doctor_note.goals_title', locale)}
          </p>
          <div className="space-y-2">
            {goals.map((goal) => (
              <GoalItem
                key={goal.id}
                id={goal.id}
                category={goal.category}
                target={goal.target}
                by={goal.by}
                isCompleted={goal.isCompleted}
                onComplete={onGoalComplete}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Date */}
      {followUpDate && (
        <div className="pt-2 border-t border-[#E2E8F0] flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] shrink-0">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <p className="font-body text-xs sm:text-sm text-[#334155]">
            <span className="font-semibold text-[#0F172A]">
              {t('doctor_note.follow_up', locale)}:
            </span>{' '}
            {followUpDate}
          </p>
        </div>
      )}
    </div>
  );
};
