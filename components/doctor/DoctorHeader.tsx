"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ShieldAlert, BarChart3, Users, Home, Sliders } from "lucide-react";
import { DoodleDaisy } from "@/components/ui/Doodles";

interface DoctorHeaderProps {
  urgentCount?: number;
}

export const DoctorHeader: React.FC<DoctorHeaderProps> = ({ urgentCount = 1 }) => {
  const pathname = usePathname();

  return (
    <header className="h-16 bg-white border-b-2 border-ink-900 px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0px_2px_0px_#121214]">
      {/* Brand & Clinic Info */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full border-2 border-ink-900 bg-white flex items-center justify-center shadow-[2px_2px_0px_#121214] group-hover:rotate-12 transition-transform">
            <DoodleDaisy size={18} color="#121214" centerColor="#FEE159" />
          </div>
          <span className="font-display font-bold text-xl text-ink-900 tracking-tight">
            carebridge
          </span>
        </Link>

        <div className="hidden sm:block h-6 w-[2px] bg-ink-900" />

        <div className="hidden md:flex flex-col">
          <span className="font-display font-bold text-sm text-ink-900 leading-tight">
            Dr. Meera Rao
          </span>
          <span className="font-body text-[11px] text-ink-500">
            Sunrise Clinic • Chronic Care Decision Support
          </span>
        </div>
      </div>

      {/* Urgent Alert Banner & Navigation */}
      <div className="flex items-center gap-3">
        {urgentCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEE2E2] border-2 border-red-600 text-red-900 text-xs font-data font-bold shadow-[2px_2px_0px_#DC2626]">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>{urgentCount} URGENT PATIENT FLAGGED</span>
          </div>
        )}

        <nav className="flex items-center gap-2 font-display text-xs font-bold">
          <Link
            href="/doctor"
            className={`px-3 py-1.5 rounded-full border-2 border-ink-900 transition flex items-center gap-1.5 ${
              pathname.startsWith("/doctor")
                ? "bg-[#D4F77C] text-ink-900 shadow-[2px_2px_0px_#121214]"
                : "bg-white text-ink-700 hover:bg-[#FAF8F5]"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Patients</span>
          </Link>

          <Link
            href="/sim"
            className={`px-3 py-1.5 rounded-full border-2 border-ink-900 transition flex items-center gap-1.5 ${
              pathname.startsWith("/sim")
                ? "bg-[#FEE159] text-ink-900 shadow-[2px_2px_0px_#121214]"
                : "bg-white text-ink-700 hover:bg-[#FAF8F5]"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sim</span>
          </Link>

          <Link
            href="/admin"
            className={`px-3 py-1.5 rounded-full border-2 border-ink-900 transition flex items-center gap-1.5 ${
              pathname.startsWith("/admin")
                ? "bg-[#EDE9FE] text-ink-900 shadow-[2px_2px_0px_#121214]"
                : "bg-white text-ink-700 hover:bg-[#FAF8F5]"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};
