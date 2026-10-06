'use client';

import React from 'react';
import { Stethoscope, CalendarCheck, Clock, Sparkles } from 'lucide-react';
import { Card } from './Card';
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
      className={`bg-white rounded-[20px] border-2 border-ink-900 shadow-[3px_3px_0px_#121214] border-l-[6px] border-l-[#0D9488] p-4 sm:p-5 space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-ink-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-bold text-base sm:text-lg text-ink-900 leading-tight">
                {t('doctor_note.from_doctor', locale)}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-body font-bold bg-[#E6F9F7] text-teal-800 px-2 py-0.5 rounded-full border border-teal-300">
                <Sparkles className="w-3 h-3 text-teal-600" />
                {t('doctor_note.new_plan', locale)}
              </span>
            </div>
            <p className="font-body text-xs text-ink-500 mt-0.5 font-medium">
              {noteDate}
            </p>
          </div>
        </div>
      </div>

      {/* Reminders section */}
      {reminders.length > 0 && (
        <div className="space-y-2">
          <p className="font-body font-bold text-xs text-ink-500 uppercase tracking-wider">
            {t('doctor_note.reminders_title', locale)}
          </p>
          <div className="space-y-2">
            {reminders.map((reminder, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#FAF8F5] rounded-xl border border-ink-300 gap-1.5"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-data font-bold text-xs sm:text-sm text-ink-900">
                    {reminder.medicine}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E6F9F7] text-teal-900 font-data text-[10px] sm:text-[11px] font-bold">
                    <Clock className="w-3 h-3 text-teal-700" />
                    {reminder.time}
                  </span>
                </div>
                <p className="font-body text-sm sm:text-base text-ink-800 font-medium leading-snug">
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
          <p className="font-body font-bold text-xs text-ink-500 uppercase tracking-wider">
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
        <div className="pt-2 border-t-2 border-ink-100 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <p className="font-body text-xs sm:text-sm text-ink-800 leading-snug">
            <span className="font-bold text-ink-900">
              {t('doctor_note.follow_up', locale)}:
            </span>{' '}
            {followUpDate}
          </p>
        </div>
      )}
    </div>
  );
};
