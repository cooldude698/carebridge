/**
 * PatientRow component (Daisy × Claud Tactile Neo-Brutalist Edition)
 * ─────────────────────────────────────────────────────────────────
 * Doctor portal patient list row styled as tactile physical cards.
 */

import * as React from "react";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";
import { RiskBadge, type RiskBand } from "./RiskBadge";

export interface PatientRowData {
  id: string;
  name: string;
  age: number;
  score?: number;
  riskScore?: number;
  band?: RiskBand;
  riskBand?: RiskBand;
  topReason?: string;
  lastSeen?: string;
}

export type PatientRowProps =
  | {
      patient: PatientRowData;
      id?: never;
      name?: never;
      age?: never;
      score?: never;
      riskScore?: never;
      band?: never;
      riskBand?: never;
      topReason?: never;
      lastSeen?: never;
      isSelected?: boolean;
      onClick?: (id: string) => void;
      className?: string;
    }
  | {
      patient?: never;
      id: string;
      name: string;
      age: number;
      score?: number;
      riskScore?: number;
      band?: RiskBand;
      riskBand?: RiskBand;
      topReason?: string;
      lastSeen?: string;
      isSelected?: boolean;
      onClick?: (id: string) => void;
      className?: string;
    };

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function formatLastSeen(val?: string): string {
  if (!val) return "recently";
  if (val.includes("ago") || val.includes("just now")) return val;
  const diff = Date.now() - new Date(val).getTime();
  if (isNaN(diff)) return val;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const PatientRow: React.FC<PatientRowProps> = (props) => {
  const patientData = props.patient || {
    id: props.id!,
    name: props.name!,
    age: props.age!,
    score: props.score ?? props.riskScore,
    band: props.band ?? props.riskBand ?? "green",
    topReason: props.topReason,
    lastSeen: props.lastSeen,
  };

  const id = patientData.id;
  const name = patientData.name;
  const age = patientData.age;
  const band = patientData.band ?? patientData.riskBand ?? "green";
  const score = patientData.score ?? patientData.riskScore;
  const topReason = patientData.topReason || "No active flags";
  const lastSeen = patientData.lastSeen;
  const isSelected = props.isSelected || false;
  const onClick = props.onClick;

  const handleClick = () => onClick?.(id);
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(id);
    }
  };

  return (
    <motion.div
      layout
      layoutId={`patient-row-${id}`}
      transition={{ duration: 0.22, ease: "easeOut" }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${name}, ${age} years old. ${band} risk. ${topReason}`}
      onClick={handleClick}
      onKeyDown={handleKey}
      className={[
        "flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-[var(--ink-900)]",
        "cursor-pointer select-none transition-colors duration-150 ease-out",
        isSelected
          ? "bg-[#D4F77C] shadow-[3px_3px_0px_#121214] -translate-y-0.5"
          : "bg-white hover:bg-[#FAF8F5] shadow-[2px_2px_0px_#121214] hover:shadow-[3px_3px_0px_#121214]",
        props.className || "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Avatar with 2px border */}
      <div
        className="w-10 h-10 rounded-full border-2 border-[var(--ink-900)] bg-white flex items-center justify-center font-display font-bold text-xs shrink-0 shadow-[1.5px_1.5px_0px_#121214]"
        aria-hidden="true"
      >
        {initials(name)}
      </div>

      {/* Name + reason */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold text-sm text-[var(--ink-900)] truncate">
            {name}
          </span>
          <span className="font-data text-[11px] text-[var(--ink-500)] font-bold shrink-0">
            {age}y
          </span>
        </div>
        <p className="font-body text-xs text-[var(--ink-700)] truncate mt-0.5">
          {topReason}
        </p>
      </div>

      {/* Badge + last seen */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <RiskBadge band={band} score={score} size="sm" />
        <div className="flex items-center gap-1 text-[var(--ink-500)] font-data text-[10px]">
          <Clock size={10} aria-hidden="true" />
          <span>{formatLastSeen(lastSeen)}</span>
        </div>
      </div>
    </motion.div>
  );
};

PatientRow.displayName = "PatientRow";
