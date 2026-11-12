/**
 * StatTile component (Minimal Clinical SaaS Edition)
 * ─────────────────────────────────────────────────────────
 * Displays a health metric tile: big Sora tabular number, DM Sans label,
 * optional unit, optional trend arrow.
 * 1px subtle border, soft card elevation.
 */

import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type TrendDirection = "up" | "down" | "neutral";

export interface StatTileProps {
  value: string | number;
  label: string;
  unit?: string;
  subValue?: string;
  trend?: TrendDirection;
  trendLabel?: string;
  trendText?: string;
  target?: string;
  upIsGood?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const trendIcon: Record<TrendDirection, React.ElementType> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const valueSize = {
  sm: "text-base sm:text-xl",
  md: "text-xl sm:text-2xl",
  lg: "text-2xl sm:text-3xl",
};

const labelSize = {
  sm: "text-[11px] sm:text-xs",
  md: "text-xs sm:text-[13px]",
  lg: "text-sm sm:text-base",
};

export const StatTile: React.FC<StatTileProps> = ({
  value,
  label,
  unit,
  subValue,
  trend,
  trendLabel,
  trendText,
  target,
  upIsGood = true,
  icon,
  size = "md",
  className = "",
}) => {
  const TrendIcon = trend ? trendIcon[trend] : null;
  const activeTrendLabel = trendText || trendLabel;
  const displayUnit = unit || subValue;

  const trendColor =
    trend === "neutral"
      ? "text-[#64748B]"
      : trend === "up"
      ? upIsGood
        ? "text-[#0D9488]"
        : "text-[#DC2626]"
      : upIsGood
      ? "text-[#DC2626]"
      : "text-[#0D9488]";

  const valString = String(value);
  const responsiveValueSize =
    valString.length >= 7
      ? "text-xs sm:text-sm tracking-tight"
      : valString.length >= 6
      ? "text-[13px] sm:text-[15px] tracking-tight"
      : valString.length >= 5
      ? "text-base sm:text-lg tracking-tight"
      : valueSize[size];

  return (
    <div
      className={[
        "bg-white rounded-xl border border-[#E2E8F0] shadow-card",
        "p-3 sm:p-4 flex flex-col justify-between h-full min-h-[130px] overflow-hidden transition-all duration-150 hover:border-[#CBD5E1] hover:shadow-hover",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0">
        {/* Top Header: Icon + Metric Name */}
        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
          {icon && (
            <span className="p-1 rounded-md bg-[#F1F5F9] inline-flex items-center justify-center text-[#0F172A] shrink-0">
              {icon}
            </span>
          )}
          <span className={["font-display font-medium text-[#475569] truncate leading-tight tracking-tight", labelSize[size]].join(" ")}>
            {label}
          </span>
        </div>

        {/* Big Value Row */}
        <div className="flex items-baseline gap-1 mt-1 min-w-0 max-w-full">
          <span
            className={["font-data font-bold text-[#0F172A] tabular-nums leading-none whitespace-nowrap", responsiveValueSize].join(" ")}
            aria-label={`${label}: ${value}`}
          >
            {value}
          </span>
          {displayUnit && displayUnit.toLowerCase() !== label.toLowerCase() && (
            <span className="font-data text-[#64748B] text-[10px] sm:text-xs font-medium shrink-0">{displayUnit}</span>
          )}
        </div>
      </div>

      {/* Bottom Footer Row */}
      <div className="pt-2 border-t border-[#F1F5F9] mt-2 flex flex-col justify-end min-h-[30px] gap-0.5">
        {target && (
          <span className="font-body text-[11px] text-[#64748B] font-medium block truncate">
            {target}
          </span>
        )}
        {activeTrendLabel && (
          <div className={["flex items-center gap-1 font-medium text-[11px]", trendColor].join(" ")}>
            {TrendIcon && <TrendIcon size={12} className="shrink-0" aria-hidden="true" />}
            <span className="font-body font-medium truncate">{activeTrendLabel}</span>
          </div>
        )}
        {!target && !activeTrendLabel && (
          <span className="font-body text-[11px] text-[#94A3B8] block truncate">—</span>
        )}
      </div>
    </div>
  );
};

StatTile.displayName = "StatTile";
