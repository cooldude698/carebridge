"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, RefreshCw } from "lucide-react";
import { PatientListItem, RiskBand } from "@/lib/types";
import { PatientRow } from "@/components/ui/PatientRow";
import { MOCK_PATIENT_LIST } from "@/lib/mockData";

export const PatientListPane: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const activeId = params?.id as string | undefined;

  const [patients, setPatients] = useState<PatientListItem[]>(MOCK_PATIENT_LIST);
  const [filter, setFilter] = useState<"all" | RiskBand>("all");
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/patients");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPatients(data);
        }
      }
    } catch {
      // Keep current list on transient network failure
    }
  };

  useEffect(() => {
    fetchPatients();
    const interval = setInterval(fetchPatients, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchPatients();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const filteredPatients = patients
    .filter((p) => {
      if (filter !== "all" && p.band !== filter) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          (p.conditions?.some((c) => c.toLowerCase().includes(query)) ?? false) ||
          (p.topReason?.toLowerCase().includes(query) ?? false)
        );
      }
      return true;
    })
    .sort((a, b) => b.score - a.score);

  const filterOptions: { key: "all" | RiskBand; label: string }[] = [
    { key: "all", label: "All" },
    { key: "red", label: "High" },
    { key: "yellow", label: "Watch" },
    { key: "green", label: "Stable" },
  ];

  return (
    <aside className="w-full md:w-[340px] shrink-0 border-r border-[#E2E8F0] bg-white flex flex-col h-full">
      {/* Top Controls: Search & Filters */}
      <div className="p-4 border-b border-[#E2E8F0] space-y-3 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-[#0F172A] text-sm">
              Triage Queue
            </h3>
            <span className="text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569]">
              {filteredPatients.length}
            </span>
          </div>
          <button
            onClick={handleManualRefresh}
            className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
            title="Refresh patient risk scores"
            aria-label="Refresh patient risk scores"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#0D9488]" : ""}`}
            />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search patient, condition, flag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#0D9488] transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          {filterOptions.map((opt) => {
            const active = filter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-[#0D9488] text-white"
                    : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient Rows List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#F8FAFC]">
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            No patients match current filter
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <PatientRow
              key={patient.id}
              patient={patient}
              isSelected={activeId === patient.id}
              onClick={() => router.push(`/doctor/${patient.id}`)}
            />
          ))
        )}
      </div>
    </aside>
  );
};
