/**
 * MedicineCard component (owner: Swapin)
 * ─────────────────────────────────────────────────────────
 * Displays a scheduled medication for the patient portal.
 *
 * Rules:
 *  - Font: Montserrat (name), DM Sans (dose, timing, instructions), Sora (time/status)
 *  - Large, easily-tappable "Taken" button (>= 48px height for elderly accessibility)
 *  - Status badge: pending (teal/neutral), taken (green), missed (amber/red)
 *  - No embedded data fetching — purely driven by props
 */

"use client";

import * as React from "react";
import { Pill, Check, Clock, AlertCircle } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";

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
      className={`bg-white rounded-[20px] border-2 border-ink-900 shadow-[3px_3px_0px_#121214] p-3.5 sm:p-4.5 transition-all duration-200 ${
        isTaken ? "bg-emerald-50/40 border-emerald-600 shadow-[2px_2px_0px_#15803D]" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Medicine details */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl border-2 border-ink-900 flex items-center justify-center shrink-0 ${
              isTaken
                ? "bg-[#DCFCE7] text-emerald-800 border-emerald-600"
                : isMissed
                ? "bg-[#FEF3C7] text-amber-800"
                : "bg-[#EDE9FE] text-ink-900"
            }`}
            aria-hidden="true"
          >
            {isTaken ? (
              <Check className="w-5 h-5 stroke-[2.5]" />
            ) : isMissed ? (
              <AlertCircle className="w-5 h-5 stroke-[2.2]" />
            ) : (
              <Pill className="w-5 h-5 stroke-[2.2]" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-display font-bold text-base sm:text-lg text-ink-900 leading-tight truncate">
                {name}
              </h3>
              <span className="font-data text-[11px] text-ink-700 bg-[#FAF8F5] border border-ink-300 px-2 py-0.5 rounded-full font-bold shrink-0">
                {dose}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-ink-600 font-body">
              <Clock className="w-3.5 h-3.5 text-ink-500 shrink-0" aria-hidden="true" />
              <span className="font-data font-bold text-ink-800">
                {time}
              </span>
              <span>•</span>
              <span className="truncate">{instructions}</span>
            </div>

            {isTaken && takenAt && (
              <p className="font-body text-[11px] text-emerald-700 font-bold mt-0.5">
                ✓ Logged at {takenAt}
              </p>
            )}

            {isMissed && (
              <p className="font-body text-[11px] text-amber-700 font-bold mt-0.5">
                ⚠️ Scheduled dose missed
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex items-center">
          {isTaken ? (
            <div className="flex items-center gap-1.5">
              <span className="font-data text-xs font-bold uppercase tracking-wider text-emerald-900 bg-[#DCFCE7] border border-emerald-600 px-3 py-1.5 rounded-xl shadow-[1px_1px_0px_#15803D]">
                Taken ✓
              </span>
              {onUndo && (
                <button
                  type="button"
                  onClick={onUndo}
                  className="font-body text-xs text-ink-500 hover:text-ink-900 underline ml-0.5 cursor-pointer"
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
              className="bg-[#D4F77C] hover:bg-[#CEF267] text-ink-900 font-display font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-2 min-h-[42px] rounded-xl border-2 border-ink-900 shadow-[2px_2px_0px_#121214] active:translate-y-0.5 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              aria-label={`Mark ${name} ${dose} as taken`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Taken</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
