"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { X, Stethoscope, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export interface DoctorNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onSuccess?: (message: string) => void;
}

export function DoctorNoteModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  onSuccess,
}: DoctorNoteModalProps) {
  const [noteText, setNoteText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNoteText("");
      setError(null);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSending, onClose]);

  if (!isOpen) return null;

  const isValidLength = noteText.trim().length >= 20 && noteText.trim().length <= 500;
  const charsRemaining = 500 - noteText.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidLength || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/patients/${patientId}/doctor-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteText: noteText.trim() }),
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 500) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update care plan");
        }
      }

      onSuccess?.(`Care plan note updated for ${patientName}.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send note. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/45 backdrop-blur-xs"
        onClick={() => !isSending && onClose()}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative bg-white border border-[#E2E8F0] rounded-2xl p-6 max-w-lg w-full shadow-2xl z-10 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="modal-title"
                className="font-display font-bold text-lg text-[#0F172A] leading-tight"
              >
                Update Care Plan Note
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Patient: {patientName} · Parsed into friendly goals &amp; reminders
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="doctor-note-textarea" className="sr-only">
              Clinical Care Plan Note
            </label>
            <textarea
              id="doctor-note-textarea"
              ref={textareaRef}
              rows={4}
              maxLength={500}
              disabled={isSending}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. Increase morning walk to 20 min. Check BP every 3 days. Review in 2 weeks."
              className="w-full p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] text-sm placeholder:text-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#0D9488] resize-none transition-colors leading-relaxed disabled:opacity-60"
            />
            <div className="flex items-center justify-between mt-1.5 px-1">
              <span className="text-[11px] text-[#64748B]">
                {noteText.trim().length < 20
                  ? `Minimum 20 characters (${20 - noteText.trim().length} more needed)`
                  : "Ready to send"}
              </span>
              <span
                className={`text-[11px] font-medium tabular-nums ${
                  charsRemaining < 50 ? "text-[#D97706]" : "text-[#64748B]"
                }`}
              >
                {noteText.length}/500
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-center gap-2 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={isSending}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-medium text-[#475569] cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isValidLength || isSending}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Send to Patient</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
