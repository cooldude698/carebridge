"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ShieldAlert, BarChart3, Users, Sliders } from "lucide-react";
import { PatientListItem } from "@/lib/types";

interface DoctorHeaderProps {
  urgentCount?: number;
}

export const DoctorHeader: React.FC<DoctorHeaderProps> = ({ urgentCount: initialUrgentCount }) => {
  const pathname = usePathname();
  const [urgentCount, setUrgentCount] = useState<number>(initialUrgentCount ?? 0);

  useEffect(() => {
    let active = true;
    const fetchUrgentCount = async () => {
      try {
        const res = await fetch("/api/patients");
        if (!res.ok) return;
        const patients: PatientListItem[] = await res.json();
        if (active && Array.isArray(patients)) {
          setUrgentCount(patients.filter((p) => p.band === "red").length);
        }
      } catch {
        // Keep last known count on transient network failure
      }
    };

    fetchUrgentCount();
    const interval = setInterval(fetchUrgentCount, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { href: "/doctor", label: "Patients", icon: Users, match: "/doctor" },
    { href: "/admin", label: "Admin ROI", icon: BarChart3, match: "/admin" },
    { href: "/sim", label: "Demo Sim", icon: Sliders, match: "/sim" },
  ];

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Clinic Info */}
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

        <div className="hidden md:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#334155]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            Dr. Meera Rao · Sunrise Clinic
          </span>
        </div>
      </div>

      {/* Urgent Alert Pill & Navigation */}
      <div className="flex items-center gap-3">
        {urgentCount > 0 && (
          <Link
            href="/doctor"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs font-semibold tabular-nums hover:bg-[#FEE2E2] transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626]" />
            <span>
              {urgentCount} Urgent {urgentCount === 1 ? "Patient" : "Patients"}
            </span>
          </Link>
        )}

        <nav className="flex items-center gap-1.5 text-xs font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/25 font-semibold"
                    : "text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className={item.href === "/doctor" ? "" : "hidden sm:inline"}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
