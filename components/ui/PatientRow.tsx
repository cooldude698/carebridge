/**
 * PatientRow component (Minimal Clinical SaaS Edition)
 * ─────────────────────────────────────────────────────────────────
 * Doctor portal patient list row styled as a clean clinical list item.
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
      transition={{ duration: 0.2, ease: "easeOut" }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${name}, ${age} years old. ${band} risk. ${topReason}`}
      onClick={handleClick}
      onKeyDown={handleKey}
      className={[
        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 ease-out",
        "cursor-pointer select-none",
        isSelected
          ? "bg-[#F0FDFA] border-[#0D9488] shadow-xs"
          : "bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] shadow-2xs",
        props.className || "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Clean Avatar */}
      <div
        className="w-9 h-9 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] flex items-center justify-center font-display font-semibold text-xs shrink-0"
        aria-hidden="true"
      >
        {initials(name)}
      </div>

      {/* Name + reason */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-semibold text-sm text-[#0F172A] truncate">
            {name}
          </span>
          <span className="font-data text-[11px] text-[#64748B] tabular-nums shrink-0">
            {age}y
          </span>
        </div>
        <p className="font-body text-xs text-[#64748B] truncate mt-0.5">
          {topReason}
        </p>
      </div>

      {/* Badge + last seen */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <RiskBadge band={band} score={score} size="sm" />
        <div className="flex items-center gap-1 text-[#94A3B8] font-data text-[10px] tabular-nums">
          <Clock size={10} aria-hidden="true" />
          <span>{formatLastSeen(lastSeen)}</span>
        </div>
      </div>
    </motion.div>
  );
};

PatientRow.displayName = "PatientRow";
