"use client";

import React, { useState } from "react";
import { Phone, MessageSquare, Video, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ActionsBarProps {
  patientId: string;
  patientName: string;
  onActionTriggered?: (actionType: "call" | "message" | "teleconsult", note: string) => void;
}

export const ActionsBar: React.FC<ActionsBarProps> = ({
  patientId,
  patientName,
  onActionTriggered,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const handleAction = async (type: "call" | "message" | "teleconsult") => {
    setLoadingAction(type);
    try {
      const res = await fetch("/api/doctor/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          type,
          note: `Triggered from Doctor Cockpit for ${patientName}`,
        }),
      });

      if (!res.ok) throw new Error("Action failed");
      const data = await res.json();

      setToastType("success");
      setToastMessage(data.message);
      if (onActionTriggered) {
        onActionTriggered(type, data.message);
      }
    } catch {
      setToastType("error");
      setToastMessage("Failed to initiate action. Please try again.");
    } finally {
      setLoadingAction(null);
      setTimeout(() => {
        setToastMessage(null);
      }, 4500);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => handleAction("call")}
          disabled={loadingAction !== null}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingAction === "call" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Phone className="w-3.5 h-3.5" />
          )}
          <span>Call Patient</span>
        </button>

        <button
          onClick={() => handleAction("message")}
          disabled={loadingAction !== null}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingAction === "message" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5 text-[#4F46E5]" />
          )}
          <span>Send Message</span>
        </button>

        <button
          onClick={() => handleAction("teleconsult")}
          disabled={loadingAction !== null}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F0FDFA] border border-[#0D9488]/30 text-[#0D9488] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingAction === "teleconsult" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Video className="w-3.5 h-3.5" />
          )}
          <span>Book Teleconsult</span>
        </button>
      </div>

      {toastMessage && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-xs border ${
            toastType === "success"
              ? "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]"
              : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
          }`}
        >
          {toastType === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
