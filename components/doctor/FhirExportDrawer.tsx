"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Copy, FileCode2, ShieldCheck, Download, Loader2 } from "lucide-react";
import { PatientDetail } from "@/lib/types";
import { generateFhirR4Bundle } from "@/lib/fhir/export";

interface FhirExportDrawerProps {
  detail: PatientDetail;
  isOpen: boolean;
  onClose: () => void;
}

export const FhirExportDrawer: React.FC<FhirExportDrawerProps> = ({
  detail,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [bundle, setBundle] = useState<any>(() => generateFhirR4Bundle(detail));
  const [loading, setLoading] = useState(false);
  const [sourceLabel, setSourceLabel] = useState<"Live Server Bundle" | "Client Fallback">(
    "Client Fallback"
  );

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    fetch(`/api/patients/${detail.profile.id}/fhir`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Fallback");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setBundle(data);
        setSourceLabel("Live Server Bundle");
      })
      .catch(() => {
        if (!active) return;
        setBundle(generateFhirR4Bundle(detail));
        setSourceLabel("Client Fallback");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      active = false;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, detail, onClose]);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(bundle, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/fhir+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carebridge-${detail.profile.id}-fhir-r4.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const entryCount = Array.isArray(bundle?.entry) ? bundle.entry.length : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col border-l border-[#E2E8F0]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-[#0F172A] text-base">
                ABDM / HL7 FHIR R4 Bundle
              </h3>
              <p className="text-xs text-[#64748B]">
                Interoperability export for {detail.profile.name} (LOINC &amp; SNOMED CT)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#E2E8F0]/60 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
            aria-label="Close FHIR export"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] text-xs">
            <div className="flex items-center gap-2 text-[#0D9488] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Ayushman Bharat Digital Mission (ABDM) Compatible</span>
            </div>
            <div className="flex items-center gap-2 text-[#475569]">
              <span className="bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0] font-medium">
                {sourceLabel}
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0] font-medium tabular-nums">
                {entryCount} Resources
              </span>
            </div>
          </div>

          {loading ? (
            <div className="h-64 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center gap-2 text-xs text-[#64748B]">
              <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
              <span>Fetching live FHIR R4 Bundle...</span>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-[#E2E8F0]">
              <div className="flex items-center justify-between bg-[#0F172A] text-white px-4 py-2.5 text-xs">
                <span className="font-mono">fhir-r4-bundle.json</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-[#CBD5E1] hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#34D399]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? "Copied!" : "Copy JSON"}</span>
                </button>
              </div>
              <pre className="p-4 bg-[#1E293B] text-[#E2E8F0] font-mono text-xs overflow-x-auto max-h-[460px] leading-relaxed select-all">
                {jsonString}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <span className="text-xs text-[#64748B]">
            HL7 FHIR v4.0.1 Collection Bundle
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-xs font-medium text-[#334155] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .json</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
