/**
 * Card component (Minimal Clinical SaaS Edition)
 * ─────────────────────────────────────────────────────────────
 * Clean white or calm subtle surface with 1px border and soft elevation.
 */

import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "flat" | "bordered" | "lavender" | "yellow" | "lime";
  interactive?: boolean;
  hoverEffect?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const variantStyles: Record<NonNullable<CardProps["variant"]>, string> = {
  default:  "bg-white border border-[#E2E8F0] shadow-card",
  flat:     "bg-[#F8FAFC] border border-[#E2E8F0]",
  bordered: "bg-white border border-[#CBD5E1] shadow-card",
  lavender: "bg-[#F8FAFC] border border-[#E2E8F0]",
  yellow:   "bg-[#FFFBEB] border border-[#FDE68A]",
  lime:     "bg-[#F0FDFA] border border-[#CCFBF1]",
};

const paddingStyles: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "p-0",
  sm:   "p-3.5",
  md:   "p-5",
  lg:   "p-6",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      interactive = false,
      hoverEffect = false,
      padding = "md",
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const isInteractive = interactive || hoverEffect;

    return (
      <div
        ref={ref}
        className={[
          "rounded-xl transition-all duration-150",
          variantStyles[variant],
          paddingStyles[padding],
          isInteractive &&
            "cursor-pointer hover:border-[#CBD5E1] hover:shadow-hover active:scale-[0.99]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...(isInteractive ? { role: "button", tabIndex: 0 } : {})}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export type CardSectionProps = React.HTMLAttributes<HTMLDivElement>;

export const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={["border-b border-[#E2E8F0] pb-3 mb-4", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  )
);
CardHeader.displayName = "CardHeader";

export const CardBody = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, className = "", ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  )
);
CardBody.displayName = "CardBody";

export const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={["border-t border-[#E2E8F0] pt-3 mt-4", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = "CardFooter";
