/**
 * CareBridgeLogo component (Minimal Clinical SaaS Edition)
 * ─────────────────────────────────────────────────────────────
 * Minimal geometric medical-bridge mark + crisp wordmark.
 */

import * as React from "react";

export interface CareBridgeLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

export const CareBridgeLogo: React.FC<CareBridgeLogoProps> = ({
  className = "",
  size = "md",
  showWordmark = true,
}) => {
  const iconSize = size === "sm" ? 22 : size === "lg" ? 32 : 26;
  const textSize = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Geometric Medical Bridge Icon */}
      <div
        className="relative flex items-center justify-center rounded-lg bg-[#F0FDFA] border border-[#CCFBF1] text-[#0D9488] shadow-2xs shrink-0"
        style={{ width: iconSize + 10, height: iconSize + 10 }}
        aria-hidden="true"
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bridge Arch */}
          <path
            d="M3 17C4.5 13 8 10 12 10C16 10 19.5 13 21 17"
            stroke="#0D9488"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Bridge Deck */}
          <path
            d="M2 17H22"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Medical Cross in Core */}
          <path
            d="M12 5V9M10 7H14"
            stroke="#0D9488"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Support Pillars */}
          <path
            d="M7 17V19M17 17V19"
            stroke="#64748B"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showWordmark && (
        <span className={`font-display font-bold ${textSize} tracking-tight leading-none text-[#0F172A]`}>
          Care<span className="text-[#0D9488]">Bridge</span>
        </span>
      )}
    </div>
  );
};

CareBridgeLogo.displayName = "CareBridgeLogo";

