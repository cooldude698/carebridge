/**
 * StatTile component (owner: Swapnil)
 * ─────────────────────────────────────────────────────────
 * Displays a health metric tile: big Sora number, DM Sans label,
 * optional unit, optional trend arrow.
 *
 * Used on: Patient home (steps, medicines, BP), Admin ROI panel.
 *
 * Rules:
 *  - Stat number: Sora 700 (font-data)
 *  - Label: DM Sans 500 (font-body)
 *  - Trend arrow: only up/down/neutral — no risk colors
 *  - Trend coloring: brand-teal for positive, ink-500 for neutral,
 *    ink-700 for negative (risk colors reserved for RiskBadge only)
 *  - No hardcoded patient data — props only
 */

import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type TrendDirection = "up" | "down" | "neutral";

export interface StatTileProps {
  /** Primary statistic value */
  value: string | number;
  /** Descriptive label shown below the value */
  label: string;
  /** Unit shown after value (e.g. "steps", "mmHg", "/10") */
  unit?: string;
  subValue?: string;
  /** Optional trend direction */
  trend?: TrendDirection;
  /** Short description of the trend (e.g. "+12% vs last week") */
  trendLabel?: string;
  trendText?: string;
  target?: string;
  /**
   * Whether the "up" trend is positive (e.g. steps = good when up)
   * or negative (e.g. BP = bad when up). Affects icon color.
   * Defaults to true (up is positive).
   */
  upIsGood?: boolean;
  /** Icon to show in the top-left corner */
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
  md: "text-xl sm:text-3xl",
  lg: "text-2xl sm:text-4xl",
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

  // Trend color logic — uses brand/ink tokens, never risk tokens
  const trendColor =
    trend === "neutral"
      ? "text-[var(--ink-500)]"
      : trend === "up"
      ? upIsGood
      ? "text-[var(--brand-teal)]"
      : "text-[var(--ink-700)]"
      : upIsGood
      ? "text-[var(--ink-700)]"
      : "text-[var(--brand-teal)]";

  // Dynamic font sizing: values like "142/88" (6+ chars) need compact sizing so they fit cleanly without ellipsis
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
        "bg-white rounded-[20px] border-2 border-[var(--ink-900)] shadow-[2.5px_2.5px_0px_var(--ink-900)]",
        "p-2.5 sm:p-3.5 flex flex-col justify-between h-full min-h-[140px] overflow-hidden transition-all",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0">
        {/* Top Header: Icon + Metric Name */}
        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
          {icon && (
            <span className="p-1 rounded-lg bg-[var(--surface-100)] inline-flex items-center justify-center text-[var(--ink-900)] shrink-0">
              {icon}
            </span>
          )}
          <span className={["font-display font-bold text-[var(--ink-800)] truncate leading-tight tracking-tight", labelSize[size]].join(" ")}>
            {label}
          </span>
        </div>

        {/* Big Value Row */}
        <div className="flex items-baseline gap-0.5 mt-1 min-w-0 max-w-full">
          <span
            className={["font-data font-bold text-[var(--ink-900)] leading-none whitespace-nowrap", responsiveValueSize].join(" ")}
            aria-label={`${label}: ${value}`}
          >
            {value}
          </span>
          {displayUnit && displayUnit.toLowerCase() !== label.toLowerCase() && (
            <span className="font-data text-[var(--ink-500)] text-[9px] sm:text-[10px] font-semibold shrink-0">{displayUnit}</span>
          )}
        </div>
      </div>

      {/* Bottom Footer Row */}
      <div className="pt-2 border-t border-[var(--ink-200)] mt-2 flex flex-col justify-end min-h-[36px] gap-0.5">
        {target && (
          <span className="font-body text-[10px] sm:text-[11px] text-[var(--ink-600)] font-semibold block truncate">
            {target}
          </span>
        )}
        {activeTrendLabel && (
          <div className={["flex items-center gap-1 font-medium", trendColor].join(" ")}>
            {TrendIcon && <TrendIcon size={11} className="shrink-0" aria-hidden="true" />}
            <span className="font-body text-[10px] sm:text-[11px] font-semibold truncate">{activeTrendLabel}</span>
          </div>
        )}
        {!target && !activeTrendLabel && (
          <span className="font-body text-[11px] text-[var(--ink-400)] block truncate">—</span>
        )}
      </div>
    </div>
  );
};

StatTile.displayName = "StatTile";
