/**
 * RiskBadge component (Daisy × Claud Tactile Edition)
 * ───────────────────────────────────────────────────
 * Always shows icon + text label with crisp borders and Sora/Space Mono font.
 */

import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

export type RiskBand = "green" | "amber" | "yellow" | "red";

export interface RiskBadgeProps {
  band: RiskBand;
  score?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const bandConfig = {
  red: {
    label: "HIGH RISK",
    icon: AlertCircle,
    textColor: "text-[var(--risk-red)]",
    bgColor: "bg-[var(--risk-red-bg)]",
    borderColor: "border-[var(--risk-red)]",
    ariaLabel: "High risk — urgent attention needed",
  },
  amber: {
    label: "MODERATE",
    icon: AlertTriangle,
    textColor: "text-[var(--risk-amber)]",
    bgColor: "bg-[var(--risk-amber-bg)]",
    borderColor: "border-[var(--risk-amber)]",
    ariaLabel: "Moderate risk — monitor closely",
  },
  green: {
    label: "LOW RISK",
    icon: CheckCircle2,
    textColor: "text-[var(--risk-green)]",
    bgColor: "bg-[var(--risk-green-bg)]",
    borderColor: "border-[var(--risk-green)]",
    ariaLabel: "Low risk — stable",
  },
};

const sizeConfig = {
  sm: {
    iconSize: 12,
    textClass: "text-[10px] tracking-[0.05em]",
    padding: "px-2 py-0.5 gap-1",
  },
  md: {
    iconSize: 14,
    textClass: "text-[11px] tracking-[0.04em]",
    padding: "px-2.5 py-1 gap-1.5",
  },
  lg: {
    iconSize: 16,
    textClass: "text-[12px] tracking-[0.04em]",
    padding: "px-3.5 py-1.5 gap-2",
  },
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  band,
  score,
  size = "md",
  className = "",
}) => {
  const normalizedBand = (band === "yellow" ? "amber" : band) || "green";
  const config = bandConfig[normalizedBand as "red" | "amber" | "green"] || bandConfig.green;
  const { iconSize, textClass, padding } = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      role="status"
      aria-label={`${config.ariaLabel}${score !== undefined ? `, score ${score}` : ""}`}
      className={[
        "inline-flex items-center rounded-full border-2",
        "font-data font-bold uppercase select-none shadow-[1.5px_1.5px_0px_rgba(18,18,20,0.8)]",
        config.bgColor,
        config.textColor,
        config.borderColor,
        padding,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon
        size={iconSize}
        aria-hidden="true"
        className="shrink-0"
        strokeWidth={2.5}
      />
      <span className={textClass}>{config.label}</span>
      {score !== undefined && (
        <span
          className={[textClass, "font-bold opacity-80 border-l border-current pl-1 ml-0.5"].join(" ")}
          aria-hidden="true"
        >
          {score}
        </span>
      )}
    </span>
  );
};

RiskBadge.displayName = "RiskBadge";
