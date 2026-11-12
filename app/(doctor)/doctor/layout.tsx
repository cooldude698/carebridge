import React from "react";
import { DoctorHeader } from "@/components/doctor/DoctorHeader";
import { PatientListPane } from "@/components/doctor/PatientListPane";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* 64px Top Header */}
      <DoctorHeader />

      {/* Two-Pane Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-[1600px] w-full mx-auto">
        <PatientListPane />
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 md:p-8">
          {children}
        </main>
      </div>

      {/* Mandatory Safety & Compliance Footer */}
      <footer className="h-10 bg-white border-t border-[#E2E8F0] px-6 flex items-center justify-between text-xs text-[#64748B]">
        <span className="font-medium">
          AI-assisted clinical decision support. Final diagnosis &amp; treatment decisions remain strictly with the physician.
        </span>
        <span className="hidden sm:inline bg-[#F1F5F9] text-[#475569] px-2.5 py-0.5 rounded-full text-[11px] font-medium">
          DPDP Act Compliant
        </span>
      </footer>
    </div>
  );
}
