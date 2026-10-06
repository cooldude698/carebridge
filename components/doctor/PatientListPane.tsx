"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, RefreshCw, Filter } from "lucide-react";
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

  // Fetch / Polling simulation
  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/patients");
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch {
      setPatients(MOCK_PATIENT_LIST);
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
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter and search
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

  return (
    <div className="w-full md:w-[380px] shrink-0 border-r-2 border-ink-900 bg-white flex flex-col h-full shadow-[2px_0px_0px_#121214]">
      {/* Top Controls: Search & Refresh */}
      <div className="p-4 border-b-2 border-ink-900 space-y-3 bg-[#FAF8F5]">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-ink-900 text-sm flex items-center gap-1.5">
            <span>Risk-Ranked Action List</span>
            <span className="font-data text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EDE9FE] border border-ink-900 text-ink-900">
              {filteredPatients.length}
            </span>
          </h3>
          <button
            onClick={handleManualRefresh}
            className="p-1.5 rounded-full border border-ink-900 bg-white hover:bg-[#FBF9F4] text-ink-900 shadow-[1.5px_1.5px_0px_#121214] active:translate-y-0.5 transition cursor-pointer"
            title="Refresh patient risk scores"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`}
            />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            placeholder="Search patient, condition, flag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border-2 border-ink-900 rounded-xl text-xs font-body text-ink-900 placeholder:text-ink-400 focus:outline-none focus:bg-[#FAF8F5] shadow-[2px_2px_0px_#121214]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 text-xs font-data">
          <Filter className="w-3 h-3 text-ink-500 mr-0.5 shrink-0" />
          {(["all", "red", "yellow", "green"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setFilter(b)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize transition border-2 border-ink-900 cursor-pointer ${
                filter === b
                  ? "bg-ink-900 text-white shadow-[1.5px_1.5px_0px_#121214]"
                  : "bg-white text-ink-700 hover:bg-[#FAF8F5]"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Rows List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#FBF9F4]">
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center text-xs font-body text-ink-500">
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
    </div>
  );
};
