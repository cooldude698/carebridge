/**
 * MedicineCard component (Minimal Clinical SaaS Edition)
 * ─────────────────────────────────────────────────────────
 * Displays a scheduled medication for the patient portal.
 * Clean, accessible, senior-friendly clinical styling.
 */

"use client";

import * as React from "react";
import { Pill, Check, Clock, AlertCircle } from "lucide-react";

export type MedicineStatus = "pending" | "taken" | "missed";

export interface MedicineCardProps {
  id?: string;
  name: string;
  dose: string;
  time: string;
  instructions?: string;
  status?: MedicineStatus;
  takenAt?: string;
  loading?: boolean;
  isLoading?: boolean;
  onTake?: () => void;
  onMarkTaken?: (id: string) => void;
  onUndo?: () => void;
  className?: string;
}

export function MedicineCard({
  id = "",
  name,
  dose,
  time,
  instructions = "With water",
  status = "pending",
  takenAt,
  loading = false,
  isLoading = false,
  onTake,
  onMarkTaken,
  onUndo,
  className = "",
}: MedicineCardProps) {
  const isTaken = status === "taken";
  const isMissed = status === "missed";
  const isBusy = loading || isLoading;

  const handleTake = () => {
    if (onTake) onTake();
    if (onMarkTaken) onMarkTaken(id);
  };

  return (
    <div
      className={`bg-white rounded-xl border p-4 transition-all duration-150 ${
        isTaken
          ? "border-[#BBF7D0] bg-[#F0FDF4]/50 shadow-xs"
          : isMissed
          ? "border-[#FDE68A] bg-[#FFFBEB]/50 shadow-xs"
          : "border-[#E2E8F0] hover:border-[#CBD5E1] shadow-card"
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Medicine details */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
              isTaken
                ? "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]"
                : isMissed
                ? "bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]"
                : "bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]"
            }`}
            aria-hidden="true"
          >
            {isTaken ? (
              <Check className="w-5 h-5 stroke-[2]" />
            ) : isMissed ? (
              <AlertCircle className="w-5 h-5 stroke-[2]" />
            ) : (
              <Pill className="w-5 h-5 stroke-[2]" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-base sm:text-lg text-[#0F172A] leading-tight truncate">
                {name}
              </h3>
              <span className="font-data text-xs text-[#334155] bg-[#F1F5F9] border border-[#E2E8F0] px-2 py-0.5 rounded-full font-medium shrink-0">
                {dose}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#64748B] font-body">
              <Clock className="w-3.5 h-3.5 text-[#64748B] shrink-0" aria-hidden="true" />
              <span className="font-data font-semibold text-[#0F172A]">
                {time}
              </span>
              <span>•</span>
              <span className="truncate">{instructions}</span>
            </div>

            {isTaken && takenAt && (
              <p className="font-body text-xs text-[#15803D] font-medium mt-1">
                ✓ Logged at {takenAt}
              </p>
            )}

            {isMissed && (
              <p className="font-body text-xs text-[#D97706] font-medium mt-1">
                Scheduled dose missed
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex items-center">
          {isTaken ? (
            <div className="flex items-center gap-2">
              <span className="font-data text-xs font-semibold text-[#15803D] bg-[#DCFCE7] border border-[#BBF7D0] px-3 py-1.5 rounded-lg shadow-2xs">
                Taken ✓
              </span>
              {onUndo && (
                <button
                  type="button"
                  onClick={onUndo}
                  className="font-body text-xs text-[#64748B] hover:text-[#0F172A] underline cursor-pointer"
                >
                  Undo
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleTake}
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white font-display font-medium text-xs sm:text-sm px-4 py-2 min-h-[44px] rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              aria-label={`Mark ${name} ${dose} as taken`}
            >
              <Check className="w-4 h-4 stroke-[2]" />
              <span>Mark Taken</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
