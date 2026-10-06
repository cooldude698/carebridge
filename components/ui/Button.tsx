/**
 * Button component (Daisy × Claud Tactile Neo-Brutalist Edition)
 * ─────────────────────────────────────────────────────────────
 * Features crisp 2px ink borders, tactile drop shadows, and responsive active press.
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
    "bg-[var(--accent-lime)] text-[var(--ink-900)] border-2 border-[var(--ink-900)] " +
    "shadow-[2px_2px_0px_var(--ink-900)] hover:shadow-[3px_3px_0px_var(--ink-900)] " +
    "hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0px_var(--ink-900)] " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-[var(--accent-lavender)] text-[var(--ink-900)] border-2 border-[var(--ink-900)] " +
    "shadow-[2px_2px_0px_var(--ink-900)] hover:shadow-[3px_3px_0px_var(--ink-900)] " +
    "hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0px_var(--ink-900)] " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "bg-white/80 text-[var(--ink-900)] border-2 border-[var(--ink-900)] " +
    "shadow-[2px_2px_0px_var(--ink-900)] hover:bg-[var(--surface-50)] hover:shadow-[3px_3px_0px_var(--ink-900)] " +
    "hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0px_var(--ink-900)] " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  outline:
    "bg-white/80 text-[var(--ink-900)] border-2 border-[var(--ink-900)] " +
    "shadow-[2px_2px_0px_var(--ink-900)] hover:bg-[var(--surface-50)] hover:shadow-[3px_3px_0px_var(--ink-900)] " +
    "hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0px_var(--ink-900)] " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  dark:
    "bg-[var(--ink-900)] text-white border-2 border-[var(--ink-900)] " +
    "shadow-[2px_2px_0px_var(--ink-900)] hover:bg-[var(--ink-800)] hover:shadow-[3px_3px_0px_var(--ink-900)] " +
    "hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0px_var(--ink-900)] " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-[var(--risk-red-bg)] text-[var(--risk-red)] border-2 border-[var(--risk-red)] " +
    "shadow-[2px_2px_0px_var(--risk-red)] hover:bg-red-100 " +
    "active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0px_var(--risk-red)] " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
  success:
    "bg-[var(--risk-green-bg)] text-[var(--risk-green)] border-2 border-[var(--risk-green)] " +
    "shadow-[2px_2px_0px_var(--risk-green)] hover:bg-green-100 " +
    "active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0px_var(--risk-green)] " +
    "disabled:opacity-50 disabled:cursor-not-allowed",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-3.5 text-xs font-display font-bold gap-1.5",
  md: "min-h-[44px] px-5 text-sm font-display font-bold gap-2",
  lg: "min-h-[52px] px-7 text-base font-display font-bold gap-2.5",
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
          "rounded-[var(--r-pill)]",
          "transition-all duration-100 ease-out",
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
