/**
 * AlertItem component (owner: Swapin)
 * ─────────────────────────────────────────────────────────
 * Displays an alert notification in the doctor portal, family feed, or patient notifications.
 *
 * Rules:
 *  - Font: DM Sans (message), Sora (timestamp, level tag), Montserrat (actions/headings)
 *  - Clear hierarchy with distinct icons for reminder, family, doctor, and urgent alerts
 *  - Supports optional acknowledgement or primary CTA
 */

"use client";

import * as React from "react";
import { Bell, Users, Stethoscope, AlertTriangle, Check, Activity } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";

export type AlertLevel = "reminder" | "family" | "doctor" | "urgent" | "info" | "warning" | "critical" | "wearable_anomaly" | "doctor_note";

export interface AlertItemProps {
  id?: string;
  level: AlertLevel | string;
  audience?: string;
  message: string;
  time?: string;
  createdAt?: string;
  acknowledgedAt?: string | null;
  patientName?: string;
  acknowledged?: boolean;
  onAcknowledge?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const levelConfig: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeColor: string;
  }
> = {
  reminder: {
    label: "REMINDER",
    icon: Bell,
    iconBg: "bg-[var(--surface-100)]",
    iconColor: "text-[var(--ink-700)]",
    badgeBg: "bg-[var(--surface-100)]",
    badgeColor: "text-[var(--ink-700)]",
  },
  info: {
    label: "INFO",
    icon: Bell,
    iconBg: "bg-[var(--surface-100)]",
    iconColor: "text-[var(--ink-700)]",
    badgeBg: "bg-[var(--surface-100)]",
    badgeColor: "text-[var(--ink-700)]",
  },
  family: {
    label: "FAMILY NOTIFIED",
    icon: Users,
    iconBg: "bg-[var(--surface-100)]",
    iconColor: "text-[var(--brand-indigo)]",
    badgeBg: "bg-[var(--surface-100)]",
    badgeColor: "text-[var(--brand-indigo)]",
  },
  doctor: {
    label: "CLINICAL FLAG",
    icon: Stethoscope,
    iconBg: "bg-[var(--risk-amber-bg)]",
    iconColor: "text-[var(--risk-amber)]",
    badgeBg: "bg-[var(--risk-amber-bg)]",
    badgeColor: "text-[var(--risk-amber)]",
  },
  wearable_anomaly: {
    label: "WEARABLE ALERT",
    icon: Activity,
    iconBg: "bg-[var(--risk-amber-bg)]",
    iconColor: "text-[var(--risk-amber)]",
    badgeBg: "bg-[var(--risk-amber-bg)]",
    badgeColor: "text-[var(--risk-amber)]",
  },
  doctor_note: {
    label: "CARE PLAN",
    icon: Stethoscope,
    iconBg: "bg-[var(--surface-teal)]",
    iconColor: "text-[var(--brand-teal)]",
    badgeBg: "bg-[var(--surface-teal)]",
    badgeColor: "text-[var(--brand-teal)]",
  },
  warning: {
    label: "WARNING",
    icon: Stethoscope,
    iconBg: "bg-[var(--risk-amber-bg)]",
    iconColor: "text-[var(--risk-amber)]",
    badgeBg: "bg-[var(--risk-amber-bg)]",
    badgeColor: "text-[var(--risk-amber)]",
  },
  urgent: {
    label: "URGENT ESCALATION",
    icon: AlertTriangle,
    iconBg: "bg-[var(--risk-red-bg)]",
    iconColor: "text-[var(--risk-red)]",
    badgeBg: "bg-[var(--risk-red-bg)]",
    badgeColor: "text-[var(--risk-red)]",
  },
  critical: {
    label: "CRITICAL",
    icon: AlertTriangle,
    iconBg: "bg-[var(--risk-red-bg)]",
    iconColor: "text-[var(--risk-red)]",
    badgeBg: "bg-[var(--risk-red-bg)]",
    badgeColor: "text-[var(--risk-red)]",
  },
};

export function AlertItem({
  level,
  audience,
  message,
  time,
  createdAt,
  acknowledgedAt,
  patientName,
  acknowledged = false,
  onAcknowledge,
  actionLabel,
  onAction,
  className = "",
}: AlertItemProps) {
  const isAck = acknowledged || Boolean(acknowledgedAt);
  let displayTime = time || "";
  if (!displayTime && createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      displayTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      displayTime = createdAt;
    }
  }
  const config = levelConfig[level] || levelConfig.reminder;
  const Icon = config.icon;

  return (
    <Card
      variant={isAck ? "flat" : "default"}
      className={`p-4 transition-all duration-200 ${
        isAck ? "opacity-75" : ""
      } ${className}`}
    >
      <div className="flex items-start gap-3.5">
        {/* Level Icon */}
        <div
          className={`w-10 h-10 rounded-[var(--r-md)] flex items-center justify-center shrink-0 ${config.iconBg} ${config.iconColor}`}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={`font-data text-[11px] font-bold tracking-wider px-2 py-0.5 rounded-[var(--r-pill)] uppercase ${config.badgeBg} ${config.badgeColor}`}
              >
                {config.label}
              </span>
              {audience && (
                <span className="font-data text-[11px] px-2 py-0.5 rounded-[var(--r-pill)] bg-[var(--surface-100)] text-[var(--ink-500)] uppercase">
                  {audience}
                </span>
              )}
              {patientName && (
                <span className="font-display font-semibold text-sm text-[var(--ink-900)]">
                  {patientName}
                </span>
              )}
            </div>

            {displayTime && (
              <span className="font-data text-xs text-[var(--ink-500)] shrink-0">
                {displayTime}
              </span>
            )}
          </div>

          <p className="font-body text-sm text-[var(--ink-700)] leading-relaxed mt-1">
            {message}
          </p>

          {/* Action buttons if any */}
          {(onAcknowledge || onAction) && (
            <div className="flex items-center gap-2.5 mt-3 pt-2 border-t border-[var(--surface-100)]">
              {onAction && actionLabel && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onAction}
                  className="!min-h-[36px] text-xs py-1 px-3"
                >
                  {actionLabel}
                </Button>
              )}
              {onAcknowledge && !isAck && (
                <button
                  type="button"
                  onClick={onAcknowledge}
                  className="font-body text-xs text-[var(--ink-500)] hover:text-[var(--ink-900)] flex items-center gap-1 py-1 px-2 rounded hover:bg-[var(--surface-100)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-teal)]"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark read
                </button>
              )}
              {isAck && (
                <span className="font-body text-xs text-[var(--ink-500)] italic">
                  Acknowledged
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
