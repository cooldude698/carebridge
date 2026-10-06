/**
 * BriefPanel Component (Phase 2 — CareBridge Clinical Design System)
 * ─────────────────────────────────────────────────────────────────
 * Pre-consult Brief slide-over drawer for doctors with:
 *  - Real-time SSE streaming / chunked text display
 *  - Structured sections: Since last visit, Key concerns, Suggested checks
 *  - Citation chips linking to real vitals readings (#abc123 · 108 bpm · Oct 3, 2am)
 *  - AI Generated vs Template source pill badge
 *  - Framer-motion slide-in drawer with backdrop dismiss
 *  - Strict typography: Montserrat (headings), DM Sans (body), Sora (citations/numbers)
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  FileText,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  Info,
} from "lucide-react";
import { Button } from "./Button";

export interface CitationItem {
  readingId: string;
  value: string;
  at: string;
}

export interface BriefData {
  sinceLastVisit?: string;
  concerns?: string[] | string;
  suggestedChecks?: string[] | string;
  source?: "llm" | "fallback" | null;
  text?: string;
  citations?: CitationItem[];
  generatedAt?: string;
}

export interface BriefPanelProps {
  patientId?: string;
  isOpen?: boolean;
  onClose?: () => void;
  streamText?: string;
  isStreaming?: boolean;
  citations?: CitationItem[];
  source?: "llm" | "fallback" | null;
  error?: string | null;
  onRefresh?: () => void;
  // Backward compatibility with existing usage:
  data?: BriefData | null;
  patientName?: string;
  loading?: boolean;
  className?: string;
}

/** Formats dates like "2026-10-03T02:00:00Z" to "Oct 3, 2am" */
function formatCitationDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate();
    const hours = d.getHours();
    const ampm = hours >= 12 ? "pm" : "am";
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${month} ${day}, ${h12}${ampm}`;
  } catch {
    return dateStr;
  }
}

/** Robust parser extracting the three clinical brief sections from continuous text */
function parseBriefSections(text: string) {
  if (!text) return null;

  const sinceMarker = "Since last visit:";
  const concernsMarker = "Concerns:";
  const checksMarker = "Suggested checks:";

  const sinceIdx = text.indexOf(sinceMarker);
  const concernsIdx = text.indexOf(concernsMarker);
  const checksIdx = text.indexOf(checksMarker);

  if (sinceIdx === -1 && concernsIdx === -1 && checksIdx === -1) {
    return {
      sinceLastVisit: text,
      concerns: "",
      suggestedChecks: "",
    };
  }

  let sinceLastVisit = "";
  let concerns = "";
  let suggestedChecks = "";

  if (sinceIdx !== -1) {
    const end = concernsIdx !== -1 ? concernsIdx : checksIdx !== -1 ? checksIdx : text.length;
    sinceLastVisit = text.substring(sinceIdx + sinceMarker.length, end).trim();
  }

  if (concernsIdx !== -1) {
    const end = checksIdx !== -1 ? checksIdx : text.length;
    concerns = text.substring(concernsIdx + concernsMarker.length, end).trim();
  }

  if (checksIdx !== -1) {
    suggestedChecks = text.substring(checksIdx + checksMarker.length).trim();
  }

  return { sinceLastVisit, concerns, suggestedChecks };
}

export function BriefPanel({
  patientId,
  isOpen,
  onClose,
  streamText,
  isStreaming = false,
  citations = [],
  source,
  error = null,
  onRefresh,
  data,
  patientName = "Patient",
  loading = false,
  className = "",
}: BriefPanelProps) {
  // Determine effective values from either direct props or legacy `data` object
  const effectiveSource = source ?? data?.source ?? null;
  const isAi = effectiveSource === "llm";
  const isFallback = effectiveSource === "fallback";

  const rawText = streamText ?? data?.text ?? "";
  const parsedFromText = rawText ? parseBriefSections(rawText) : null;

  const sinceLastVisit =
    data?.sinceLastVisit ??
    parsedFromText?.sinceLastVisit ??
    "";

  const concernsRaw = data?.concerns ?? parsedFromText?.concerns ?? "";
  const suggestedChecksRaw = data?.suggestedChecks ?? parsedFromText?.suggestedChecks ?? "";

  const effectiveCitations = citations.length > 0 ? citations : data?.citations ?? [];
  const isLoading = loading || (isStreaming && !rawText);

  // Close on Escape key when drawer is open
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Content body rendering
  const renderContent = () => {
    // 1. Error State
    if (error) {
      return (
        <div className="p-6 text-center space-y-4 my-auto">
          <div className="w-12 h-12 rounded-full bg-red-100 border-2 border-red-700 flex items-center justify-center text-red-700 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display font-bold text-base text-ink-900">
              Brief Unavailable
            </h4>
            <p className="font-body text-xs text-ink-600 mt-1 max-w-xs mx-auto">
              {error}
            </p>
          </div>
          {onRefresh && (
            <Button variant="secondary" size="sm" onClick={onRefresh} className="mt-2">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Try Again
            </Button>
          )}
        </div>
      );
    }

    // 2. Loading Skeleton State
    if (isLoading) {
      return (
        <div className="p-6 space-y-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-3.5 bg-ink-200 rounded w-28" />
            <div className="h-14 bg-ink-100 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 bg-ink-200 rounded w-24" />
            <div className="h-20 bg-ink-100 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 bg-ink-200 rounded w-32" />
            <div className="h-16 bg-ink-100 rounded-xl" />
          </div>
        </div>
      );
    }

    // 3. Populated / Streaming Content
    if (rawText || sinceLastVisit || concernsRaw || suggestedChecksRaw) {
      return (
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Section 1: Since last visit */}
          {sinceLastVisit && (
            <div className="space-y-1.5">
              <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-ink-700">
                Since last visit:
              </h4>
              <p className="font-body text-[15px] text-ink-900 leading-relaxed bg-[#FAF8F5] p-3.5 rounded-xl border border-ink-300">
                {sinceLastVisit}
                {isStreaming && !concernsRaw && (
                  <span className="inline-block w-0.5 h-4 bg-brand-teal ml-1 animate-pulse align-middle" />
                )}
              </p>
            </div>
          )}

          {/* Section 2: Concerns */}
          {concernsRaw && (
            <div className="space-y-1.5">
              <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                Concerns:
              </h4>
              <div className="font-body text-[15px] text-ink-900 leading-relaxed bg-red-50/60 p-3.5 rounded-xl border border-red-200">
                {Array.isArray(concernsRaw) ? (
                  <ul className="space-y-1.5">
                    {concernsRaw.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{concernsRaw}</p>
                )}
                {isStreaming && !suggestedChecksRaw && (
                  <span className="inline-block w-0.5 h-4 bg-brand-teal ml-1 animate-pulse align-middle" />
                )}
              </div>
            </div>
          )}

          {/* Section 3: Suggested checks */}
          {suggestedChecksRaw && (
            <div className="space-y-1.5">
              <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-brand-teal flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-brand-teal" />
                Suggested checks:
              </h4>
              <div className="font-body text-[15px] text-ink-900 leading-relaxed bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
                {Array.isArray(suggestedChecksRaw) ? (
                  <ul className="space-y-1.5">
                    {suggestedChecksRaw.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-brand-teal font-bold">→</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{suggestedChecksRaw}</p>
                )}
                {isStreaming && (
                  <span className="inline-block w-0.5 h-4 bg-brand-teal ml-1 animate-pulse align-middle" />
                )}
              </div>
            </div>
          )}

          {/* Fallback unstructured render if sections were unparseable */}
          {!sinceLastVisit && !concernsRaw && !suggestedChecksRaw && rawText && (
            <div className="font-body text-[15px] text-ink-900 leading-relaxed bg-[#FAF8F5] p-4 rounded-xl border border-ink-300">
              <p>{rawText}</p>
              {isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-brand-teal ml-1 animate-pulse align-middle" />
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────
              Citations Strip (Shown when citations exist and !isStreaming)
          ───────────────────────────────────────────────────────── */}
          {effectiveCitations.length > 0 && !isStreaming && (
            <div className="pt-3 border-t border-ink-200 space-y-2">
              <span className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider">
                Based on:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {effectiveCitations.map((c, idx) => (
                  <div
                    key={`${c.readingId}-${idx}`}
                    className="font-data text-[11px] font-semibold bg-[var(--surface-100)] text-ink-800 border border-ink-300 rounded-full px-2.5 py-1 shadow-sm flex items-center gap-1.5"
                    title={`Reading ID: ${c.readingId}`}
                  >
                    <span className="text-brand-teal font-bold">#</span>
                    <span>{c.readingId.slice(0, 6)}</span>
                    <span className="text-ink-300">•</span>
                    <span>{c.value}</span>
                    <span className="text-ink-300">•</span>
                    <span className="text-ink-500 font-normal">
                      {formatCitationDate(c.at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 4. Empty State
    return (
      <div className="p-8 text-center space-y-4 my-auto">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-100)] border-2 border-ink-900 flex items-center justify-center text-ink-600 mx-auto shadow-[2px_2px_0px_#121214]">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-display font-bold text-base text-ink-900">
            No Brief Generated
          </h4>
          <p className="font-body text-xs text-ink-500 mt-1 max-w-xs mx-auto">
            Synthesize 14 days of glucose, BP, and missed doses into an actionable clinical pre-consult brief.
          </p>
        </div>
        {onRefresh && (
          <Button variant="primary" size="sm" onClick={onRefresh} className="mt-2">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Generate Pre-consult Brief
          </Button>
        )}
      </div>
    );
  };

  // Inner card markup (used for both drawer view and inline standalone preview)
  const panelCard = (
    <div
      className={`bg-white border-2 border-ink-900 shadow-[var(--shadow-brutal)] flex flex-col h-full overflow-hidden ${className}`}
    >
      {/* ── Top Header ───────────────────────────────────────────── */}
      <div className="p-5 border-b-2 border-ink-900 bg-[#FAF8F5] flex items-start justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-lg border-2 border-ink-900 bg-white flex items-center justify-center text-brand-teal shadow-[1px_1px_0px_#121214]">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink-900 tracking-tight leading-none">
              Pre-consult Brief
            </h3>
            {/* Source Pill Chip */}
            {isAi && (
              <span className="font-data text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3 h-3 text-teal-600" />
                AI Generated
              </span>
            )}
            {isFallback && (
              <span className="font-data text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <FileText className="w-3 h-3 text-amber-600" />
                Template
              </span>
            )}
          </div>
          <p className="font-body text-xs text-ink-500 mt-1">
            Dr. Rao • Decision support only
          </p>
        </div>

        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg border border-ink-300 hover:border-ink-900 hover:bg-white flex items-center justify-center text-ink-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Regenerate brief"
              aria-label="Regenerate brief"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 -mr-2 rounded-lg flex items-center justify-center text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition-colors cursor-pointer"
              aria-label="Close brief panel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto flex flex-col">{renderContent()}</div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="p-3.5 border-t-2 border-ink-900 bg-[#FAF8F5] text-center shrink-0">
        <p className="font-body text-xs text-ink-500 font-medium leading-none">
          Decision support only. Doctor decides.
        </p>
        <p className="font-body text-[11px] text-ink-400 mt-1 leading-none">
          Simulated data
        </p>
      </div>
    </div>
  );

  // If `isOpen` is defined, render as a sliding drawer with backdrop
  if (isOpen !== undefined) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
              className="fixed inset-0 bg-[#121214]"
              aria-hidden="true"
            />

            {/* Sliding Drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
              className="relative z-50 w-full max-w-full md:w-[380px] h-full shadow-2xl flex flex-col"
              aria-label="Pre-consult Brief Drawer"
            >
              {panelCard}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    );
  }

  // Otherwise, render as inline card (for design preview & embedded layouts)
  return panelCard;
}
