/**
 * Button component (Minimal Clinical SaaS Edition)
 * ─────────────────────────────────────────────────────────────
 * Clean, accessible medical-grade buttons with subtle borders and soft elevation.
 */

"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "outline"
  | "dark";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  isLoading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#0D9488] text-white hover:bg-[#0F766E] border border-transparent shadow-sm " +
    "focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] shadow-xs " +
    "focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  outline:
    "bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] shadow-xs " +
    "focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A] " +
    "focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  dark:
    "bg-[#0F172A] text-white hover:bg-[#1E293B] border border-transparent shadow-sm " +
    "focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:bg-[#FEE2E2] " +
    "focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  success:
    "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] hover:bg-[#DCFCE7] " +
    "focus-visible:ring-2 focus-visible:ring-[#15803D] focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-3.5 text-xs font-display font-medium rounded-lg gap-1.5",
  md: "min-h-[44px] px-4.5 text-sm font-display font-medium rounded-lg gap-2",
  lg: "min-h-[50px] px-6 text-base font-display font-medium rounded-xl gap-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      isLoading = false,
      fullWidth = false,
      iconLeft,
      iconRight,
      children,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const isBusy = loading || isLoading;
    const isDisabled = disabled || isBusy;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isBusy}
        className={[
          "inline-flex items-center justify-center",
          "transition-all duration-150 ease-out",
          "select-none whitespace-nowrap cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? "w-full" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {isBusy ? (
          <Loader2
            className="animate-spin shrink-0"
            size={size === "sm" ? 14 : size === "lg" ? 20 : 16}
            aria-hidden="true"
          />
        ) : (
          iconLeft && (
            <span className="shrink-0" aria-hidden="true">
              {iconLeft}
            </span>
          )
        )}
        {children && <span>{children}</span>}
        {!isBusy && iconRight && (
          <span className="shrink-0" aria-hidden="true">
            {iconRight}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
