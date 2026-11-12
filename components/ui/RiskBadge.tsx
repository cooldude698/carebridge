/**
 * RiskBadge component (Minimal Clinical SaaS Edition)
 * ───────────────────────────────────────────────────
 * Accessible semantic status pill with icon + label + tabular score.
 * 1px clean border, soft tint background, zero offset brutalist shadows.
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
    textColor: "text-[#DC2626]",
    bgColor: "bg-[#FEF2F2]",
    borderColor: "border-[#FECACA]",
    ariaLabel: "High risk — urgent attention needed",
  },
  amber: {
    label: "MODERATE",
    icon: AlertTriangle,
    textColor: "text-[#D97706]",
    bgColor: "bg-[#FFFBEB]",
    borderColor: "border-[#FDE68A]",
    ariaLabel: "Moderate risk — monitor closely",
  },
  green: {
    label: "LOW RISK",
    icon: CheckCircle2,
    textColor: "text-[#15803D]",
    bgColor: "bg-[#F0FDF4]",
    borderColor: "border-[#BBF7D0]",
    ariaLabel: "Low risk — stable",
  },
};

const sizeConfig = {
  sm: {
    iconSize: 12,
    textClass: "text-[10px] tracking-wide font-semibold",
    padding: "px-2 py-0.5 gap-1",
  },
  md: {
    iconSize: 13,
    textClass: "text-[11px] tracking-wide font-semibold",
    padding: "px-2.5 py-1 gap-1.5",
  },
  lg: {
    iconSize: 15,
    textClass: "text-[12px] tracking-wide font-semibold",
    padding: "px-3 py-1.5 gap-2",
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
        "inline-flex items-center rounded-full border shadow-xs",
        "font-data select-none",
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
        strokeWidth={2}
      />
      <span className={textClass}>{config.label}</span>
      {score !== undefined && (
        <span
          className={[textClass, "font-bold tabular-nums opacity-85 border-l border-current/30 pl-1.5 ml-0.5"].join(" ")}
          aria-hidden="true"
        >
          {score}
        </span>
      )}
    </span>
  );
};

RiskBadge.displayName = "RiskBadge";
