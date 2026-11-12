import React from "react";
import Link from "next/link";
import { Activity, Users, ArrowLeft, Sliders } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* 64px Top Header */}
      <header className="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#0D9488] flex items-center justify-center text-white shadow-sm group-hover:bg-[#0F766E] transition-colors">
              <Activity className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-lg text-[#0F172A] tracking-tight">
              CareBridge
            </span>
          </Link>

          <div className="hidden sm:block h-5 w-px bg-[#E2E8F0]" />

          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-sm text-[#0F172A]">
              Hospital Admin &amp; AI Safety Audit
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] font-medium">
              Sunrise Clinic
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            href="/doctor"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] transition-colors flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Doctor Cockpit</span>
          </Link>
          <Link
            href="/sim"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span className="hidden sm:inline">Demo Sim</span>
          </Link>
          <Link
            href="/"
            className="px-2.5 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#0F172A] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="h-10 bg-white border-t border-[#E2E8F0] px-6 flex items-center justify-between text-xs text-[#64748B]">
        <span>Clinical operations &amp; AI citation audit · Sunrise Clinic</span>
        <span>DPDP Act Compliant</span>
      </footer>
    </div>
  );
}
