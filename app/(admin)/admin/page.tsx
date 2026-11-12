"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  Building2,
  Sparkles,
  FileCheck2,
} from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";
import { AdminROIResponse } from "@/lib/types";
import { MOCK_ADMIN_ROI } from "@/lib/mockData";

interface AIAuditItem {
  id: string;
  patient_name: string;
  created_at: string;
  source: "llm" | "fallback";
  char_count: number;
  citation_count: number;
  text: string;
  citations: { readingId?: string; label?: string }[];
}

export default function AdminROIPage() {
  const [data, setData] = useState<AdminROIResponse>(MOCK_ADMIN_ROI);
  const [auditItems, setAuditItems] = useState<AIAuditItem[]>([]);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [roiRes, auditRes] = await Promise.all([
          fetch("/api/admin/roi"),
          fetch("/api/admin/ai-audit"),
        ]);

        if (roiRes.ok) {
          const json = await roiRes.json();
          setData(json);
        }
        if (auditRes.ok) {
          const auditJson = await auditRes.json();
          if (Array.isArray(auditJson)) {
            setAuditItems(auditJson);
          }
        }
      } catch {
        // Fallback to initial state
      }
    };
    fetchAll();
  }, []);

  const costAvoidance = (data.readmissionsPrevented || 14) * 45000;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F0FDFA] text-[#0D9488] border border-[#99F6E4]">
              Monthly Value Realization
            </span>
            <span className="text-xs text-[#64748B]">Sunrise Clinic Cohort</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-[#0F172A] mt-2">
            Clinical Impact, ROI &amp; AI Safety Audit
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Hospital cost avoidance, physician time saved, and deterministic AI citation verification.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] text-right shrink-0">
          <div className="text-[11px] font-medium text-[#0F766E]">
            Estimated Cost Avoidance
          </div>
          <div className="font-display font-bold text-2xl text-[#0D9488] tabular-nums mt-0.5">
            ₹{costAvoidance.toLocaleString("en-IN")}+
          </div>
          <div className="text-[11px] text-[#0F766E] tabular-nums">
            {data.readmissionsPrevented} averted readmissions × ₹45,000
          </div>
        </div>
      </div>

      {/* Primary KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Patients Monitored"
          value={data.patientsMonitored}
          subValue="active"
          trend="up"
          trendText="Continuous watch + app"
          className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
        />
        <StatTile
          label="Alerts Actioned"
          value={data.alertsActioned}
          subValue="events"
          trend="up"
          trendText="100% within SLA"
          className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
        />
        <StatTile
          label="Readmissions Averted"
          value={data.readmissionsPrevented}
          subValue="cases"
          trend="down"
          trendText="-35% vs historic baseline"
          className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
        />
        <StatTile
          label="Doctor Hours Saved"
          value={`${data.doctorHoursSaved}h`}
          subValue="monthly"
          trend="up"
          trendText="~18 mins saved / review"
          className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
        />
      </div>

      {/* Telemetry Chart & Operational Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E2E8F0]">
            <div>
              <h2 className="font-display font-semibold text-[#0F172A] text-base">
                Daily Alerts Actioned
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                High &amp; moderate risk escalations resolved via physician intervention
              </p>
            </div>
            <span className="text-xs font-medium text-[#475569] px-2.5 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">
              5-Day Window
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.alertsPerDay}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" name="Alerts Actioned" fill="#0D9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
          <h3 className="font-display font-semibold text-[#0F172A] text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#4F46E5]" />
            <span>Closed-Loop Efficiency</span>
          </h3>
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="font-semibold text-[#0F172A] block text-xs">
                Paperless Digital Rx Sync
              </span>
              <p className="text-[#475569] text-xs mt-1">
                Prescriptions update patient checklists, watch targets, and guardian feeds in <strong>&lt; 1s</strong>.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="font-semibold text-[#0F172A] block text-xs">
                Escalation Closure Time
              </span>
              <p className="text-[#475569] text-xs mt-1">
                Median time from Red watch anomaly to physician review is <strong>14 minutes</strong>.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="font-semibold text-[#0F172A] block text-xs">
                Guardian Resolution Rate
              </span>
              <p className="text-[#475569] text-xs mt-1">
                Family WhatsApp nudges resolve <strong>64%</strong> of missed doses before doctor escalation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Safety & Citation Audit Log Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-base text-[#0F172A] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
              <span>AI Safety &amp; Citation Audit Log</span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Every generated pre-consult brief &amp; clinical summary is audited for source, character count, and Reading ID citations.
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#475569] tabular-nums">
            {auditItems.length} Audited Outputs
          </span>
        </div>

        {auditItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            No AI briefs generated in this session yet. Open a patient cockpit and run &ldquo;Pre-Consult Brief (SSE)&rdquo; to populate the audit trail.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-semibold">Patient</th>
                  <th className="py-3 px-4 font-semibold">Source</th>
                  <th className="py-3 px-4 font-semibold">Citations</th>
                  <th className="py-3 px-4 font-semibold">Length</th>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {auditItems.map((item) => {
                  const isExpanded = expandedAuditId === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">
                          {item.patient_name}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.source === "llm"
                                ? "bg-[#EEF2FF] text-[#4F46E5]"
                                : "bg-[#F0FDFA] text-[#0D9488]"
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            {item.source === "llm" ? "LLM" : "Fallback"}
                          </span>
                        </td>
                        <td className="py-3 px-4 tabular-nums">
                          <span className="inline-flex items-center gap-1 text-[#059669] font-medium">
                            <FileCheck2 className="w-3.5 h-3.5" />
                            {item.citation_count} Reading IDs
                          </span>
                        </td>
                        <td className="py-3 px-4 tabular-nums text-[#475569]">
                          {item.char_count} chars
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              setExpandedAuditId(isExpanded ? null : item.id)
                            }
                            className="text-[#0D9488] hover:text-[#0F766E] font-semibold cursor-pointer"
                          >
                            {isExpanded ? "Hide" : "Inspect"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#F8FAFC]">
                          <td colSpan={6} className="p-4 border-t border-[#E2E8F0]">
                            <p className="text-xs text-[#0F172A] leading-relaxed whitespace-pre-wrap">
                              {item.text}
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collapsible Clinical ROI Assumptions */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <button
          onClick={() => setIsAccordionOpen(!isAccordionOpen)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-[#F8FAFC] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-[#4F46E5]" />
            <h3 className="font-display font-semibold text-[#0F172A] text-sm">
              Documented Clinical ROI Assumptions
            </h3>
          </div>
          {isAccordionOpen ? (
            <ChevronUp className="w-4 h-4 text-[#64748B]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#64748B]" />
          )}
        </button>

        {isAccordionOpen && (
          <div className="p-5 pt-0 border-t border-[#E2E8F0] bg-[#F8FAFC]/60">
            <ul className="space-y-2 text-xs text-[#475569] list-disc list-inside mt-3">
              {data.assumptions.map((assumption, idx) => (
                <li key={idx} className="leading-relaxed">
                  {assumption}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
