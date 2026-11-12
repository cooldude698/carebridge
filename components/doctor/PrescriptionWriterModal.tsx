"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  FileSignature,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Pill,
  Utensils,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { DiagnosisReport, Prescription } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

export interface PrescriptionWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  patientConditions: string[];
  latestDiagnosis?: DiagnosisReport | null;
  onIssued: (rx: Prescription) => void;
}

interface MedicineDraft {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  times: string[];
  duration: string;
  withFood: boolean;
  instructions: string;
}

interface LifestyleDraft {
  id: string;
  category: "diet" | "steps" | "calories" | "sleep" | "bp" | "glucose";
  description: string;
  targetValue: string;
  unit: string;
}

interface SuggestedMedicine {
  medicineName: string;
  dosage: string;
  frequency: string;
  times: string[];
  duration: string;
  withFood: boolean;
  instructions?: string;
  rationale?: string;
}

interface SuggestedLifestyle {
  category: "diet" | "steps" | "calories" | "sleep" | "bp" | "glucose";
  description: string;
  targetValue?: number;
  unit?: string;
  rationale?: string;
}

const FREQUENCY_TIMES_MAP: Record<string, string[]> = {
  "Once morning": ["08:00"],
  "Twice daily": ["08:00", "20:00"],
  "Three times daily": ["08:00", "14:00", "20:00"],
  "At bedtime": ["22:00"],
  "As needed": ["09:00"],
};

const UNIT_DEFAULTS: Record<LifestyleDraft["category"], string> = {
  diet: "meals/day",
  steps: "steps/day",
  calories: "kcal/day",
  sleep: "hours/night",
  bp: "mmHg",
  glucose: "mg/dL",
};

function buildFallbackSuggestions(
  conditions: string[],
  latestDiagnosis?: DiagnosisReport | null
): {
  medicines: SuggestedMedicine[];
  lifestyle: SuggestedLifestyle[];
  disclaimer: string;
} {
  const condText = conditions.join(" ").toLowerCase();
  const hasDiabetes = condText.includes("diabetes");
  const hasHtn = condText.includes("hypertension") || condText.includes("bp");
  const hasCriticalSpO2 =
    latestDiagnosis?.risk_flags?.some((f) => f.type?.toLowerCase().includes("spo2")) ||
    latestDiagnosis?.ai_summary?.toLowerCase().includes("spo2");

  const medicines: SuggestedMedicine[] = [];
  if (hasDiabetes) {
    medicines.push({
      medicineName: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      times: ["08:00", "20:00"],
      duration: "30 days",
      withFood: true,
      instructions: "Take after breakfast and dinner",
      rationale: "Maintains baseline glycemic control for Type 2 Diabetes.",
    });
  }
  if (hasHtn) {
    medicines.push({
      medicineName: "Amlodipine",
      dosage: "5mg",
      frequency: "Once morning",
      times: ["08:00"],
      duration: "30 days",
      withFood: false,
      instructions: "Monitor morning BP before dose",
      rationale: "Calcium channel blocker for sustained systolic BP control.",
    });
  }
  if (hasCriticalSpO2) {
    medicines.push({
      medicineName: "Budesonide + Formoterol Inhaler",
      dosage: "200/6 mcg (2 puffs)",
      frequency: "Twice daily",
      times: ["08:00", "20:00"],
      duration: "14 days",
      withFood: false,
      instructions: "Rinse mouth after inhalation; recheck SpO2 after 30 mins",
      rationale: "Flagged SpO2 dip detected in recent watch telemetry.",
    });
  }
  if (medicines.length === 0) {
    medicines.push({
      medicineName: "Metformin",
      dosage: "500mg",
      frequency: "Once morning",
      times: ["08:00"],
      duration: "30 days",
      withFood: true,
      instructions: "Take after breakfast",
      rationale: "Standard preventive metabolic regimen.",
    });
  }

  const lifestyle: SuggestedLifestyle[] = [
    {
      category: "diet",
      description: "Low-oil, low-glycemic South Indian meals; limit white rice at dinner",
      rationale: "Reduces post-prandial glucose spikes and sodium load.",
    },
    {
      category: "steps",
      description: "Brisk morning or evening walk",
      targetValue: 4500,
      unit: "steps/day",
      rationale: "Improves insulin sensitivity and vascular tone.",
    },
    {
      category: "calories",
      description: "Active daily energy burn target via Watch Companion",
      targetValue: 350,
      unit: "kcal/day",
      rationale: "Structured daily expenditure goal synced to watch.",
    },
  ];

  return {
    medicines,
    lifestyle,
    disclaimer: "AI Draft — Physician must verify before prescribing",
  };
}

export const PrescriptionWriterModal: React.FC<PrescriptionWriterModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  patientConditions,
  latestDiagnosis,
  onIssued,
}) => {
  const [medicines, setMedicines] = useState<MedicineDraft[]>([
    {
      id: "med-row-1",
      medicineName: "",
      dosage: "",
      frequency: "Twice daily",
      times: ["08:00", "20:00"],
      duration: "30 days",
      withFood: true,
      instructions: "",
    },
  ]);

  const [lifestyleTargets, setLifestyleTargets] = useState<LifestyleDraft[]>([
    {
      id: "life-row-1",
      category: "steps",
      description: "Daily walking goal synced to smartwatch",
      targetValue: "4500",
      unit: "steps/day",
    },
  ]);

  const [doctorSummary, setDoctorSummary] = useState("");
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });

  const [newTimeInput, setNewTimeInput] = useState<Record<string, string>>({});
  const [confirmStep, setConfirmStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Non-blocking AI suggestions state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMedicines, setAiMedicines] = useState<SuggestedMedicine[]>([]);
  const [aiLifestyle, setAiLifestyle] = useState<SuggestedLifestyle[]>([]);
  const [aiDisclaimer, setAiDisclaimer] = useState(
    "AI Draft — Physician must verify before prescribing"
  );

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset & fetch non-blocking AI suggestions when opened
  useEffect(() => {
    if (!isOpen) return;

    setConfirmStep(false);
    setError(null);
    setTimeout(() => firstInputRef.current?.focus(), 80);

    let active = true;
    setAiLoading(true);

    fetch("/api/ai/prescription-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        diagnosisReportId: latestDiagnosis?.id,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Fallback");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setAiMedicines(Array.isArray(data.medicines) ? data.medicines : []);
        setAiLifestyle(Array.isArray(data.lifestyle) ? data.lifestyle : []);
        if (data.disclaimer) setAiDisclaimer(data.disclaimer);
      })
      .catch(() => {
        if (!active) return;
        const fb = buildFallbackSuggestions(patientConditions, latestDiagnosis);
        setAiMedicines(fb.medicines);
        setAiLifestyle(fb.lifestyle);
        setAiDisclaimer(fb.disclaimer);
      })
      .finally(() => {
        if (active) setAiLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, patientId, latestDiagnosis, patientConditions]);

  // Escape key handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        if (confirmStep) {
          setConfirmStep(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isSubmitting, confirmStep, onClose]);

  if (!isOpen) return null;

  const addMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      {
        id: `med-row-${Date.now()}-${prev.length}`,
        medicineName: "",
        dosage: "",
        frequency: "Once morning",
        times: ["08:00"],
        duration: "30 days",
        withFood: true,
        instructions: "",
      },
    ]);
  };

  const removeMedicineRow = (id: string) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMedicine = (id: string, patch: Partial<MedicineDraft>) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, ...patch };
        if (patch.frequency && FREQUENCY_TIMES_MAP[patch.frequency]) {
          next.times = [...FREQUENCY_TIMES_MAP[patch.frequency]];
        }
        return next;
      })
    );
  };

  const addTimeChip = (medId: string) => {
    const t = (newTimeInput[medId] || "").trim();
    if (!t) return;
    setMedicines((prev) =>
      prev.map((m) =>
        m.id === medId && !m.times.includes(t)
          ? { ...m, times: [...m.times, t] }
          : m
      )
    );
    setNewTimeInput((prev) => ({ ...prev, [medId]: "" }));
  };

  const removeTimeChip = (medId: string, timeToRemove: string) => {
    setMedicines((prev) =>
      prev.map((m) =>
        m.id === medId
          ? { ...m, times: m.times.filter((t) => t !== timeToRemove) }
          : m
      )
    );
  };

  const addLifestyleRow = () => {
    setLifestyleTargets((prev) => [
      ...prev,
      {
        id: `life-row-${Date.now()}-${prev.length}`,
        category: "diet",
        description: "",
        targetValue: "",
        unit: "meals/day",
      },
    ]);
  };

  const removeLifestyleRow = (id: string) => {
    setLifestyleTargets((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLifestyle = (id: string, patch: Partial<LifestyleDraft>) => {
    setLifestyleTargets((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        if (patch.category && !patch.unit) {
          next.unit = UNIT_DEFAULTS[patch.category];
        }
        return next;
      })
    );
  };

  const applySuggestedMedicine = (sug: SuggestedMedicine) => {
    setMedicines((prev) => {
      // Replace single blank row if untouched
      const isSingleEmpty =
        prev.length === 1 && !prev[0].medicineName.trim() && !prev[0].dosage.trim();
      const newRow: MedicineDraft = {
        id: `med-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        medicineName: sug.medicineName,
        dosage: sug.dosage,
        frequency: sug.frequency || "Twice daily",
        times: sug.times?.length ? sug.times : ["08:00"],
        duration: sug.duration || "30 days",
        withFood: sug.withFood ?? true,
        instructions: sug.instructions || "",
      };
      return isSingleEmpty ? [newRow] : [...prev, newRow];
    });
  };

  const applySuggestedLifestyle = (sug: SuggestedLifestyle) => {
    setLifestyleTargets((prev) => [
      ...prev,
      {
        id: `life-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category: sug.category,
        description: sug.description,
        targetValue: sug.targetValue !== undefined ? String(sug.targetValue) : "",
        unit: sug.unit || UNIT_DEFAULTS[sug.category],
      },
    ]);
  };

  const validateBeforeConfirm = (): boolean => {
    const validMeds = medicines.filter((m) => m.medicineName.trim() && m.dosage.trim());
    if (validMeds.length === 0) {
      setError("Add at least one medicine with name and dosage before issuing.");
      return false;
    }
    if (!doctorSummary.trim()) {
      setError("Please enter a brief clinical summary explaining this prescription.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleIssuePrescription = async () => {
    if (!validateBeforeConfirm() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const payload = {
      doctorId: "d1",
      diagnosisReportId: latestDiagnosis?.id,
      doctorSummary: doctorSummary.trim(),
      followUpDate: followUpDate || undefined,
      medicines: medicines
        .filter((m) => m.medicineName.trim() && m.dosage.trim())
        .map((m) => ({
          medicineName: m.medicineName.trim(),
          dosage: m.dosage.trim(),
          frequency: m.frequency,
          times: m.times.length > 0 ? m.times : ["08:00"],
          duration: m.duration,
          withFood: m.withFood,
          instructions: m.instructions.trim() || undefined,
        })),
      lifestyleTargets: lifestyleTargets
        .filter((l) => l.description.trim())
        .map((l) => ({
          category: l.category,
          description: l.description.trim(),
          targetValue: l.targetValue ? Number(l.targetValue) : undefined,
          unit: l.unit.trim() || undefined,
        })),
    };

    try {
      const res = await fetch(`/api/patients/${patientId}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 404) {
          // Graceful local fallback if backend route hasn't been deployed yet
          const fallbackRx: Prescription = {
            id: `rx-${Date.now()}`,
            patient_id: patientId,
            doctor_id: "d1",
            doctor_name: "Dr. Meera Rao",
            diagnosis_report_id: latestDiagnosis?.id ?? null,
            issued_at: new Date().toISOString(),
            follow_up_date: followUpDate || null,
            status: "active",
            doctor_summary: payload.doctorSummary,
            medicines: payload.medicines.map((m, idx) => ({
              id: `pm-${Date.now()}-${idx}`,
              prescription_id: `rx-${Date.now()}`,
              medicine_name: m.medicineName,
              dosage: m.dosage,
              frequency: m.frequency,
              times: m.times,
              duration: m.duration,
              with_food: m.withFood,
              instructions: m.instructions ?? null,
            })),
            lifestyle_targets: payload.lifestyleTargets.map((l, idx) => ({
              id: `lt-${Date.now()}-${idx}`,
              prescription_id: `rx-${Date.now()}`,
              patient_id: patientId,
              category: l.category,
              description: l.description,
              target_value: l.targetValue ?? null,
              unit: l.unit ?? null,
            })),
          };
          onIssued(fallbackRx);
          onClose();
          return;
        }
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to issue digital prescription");
      }

      const data = await res.json();
      const createdRx: Prescription = data.prescription ?? data;
      onIssued(createdRx);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to issue digital prescription."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/45 backdrop-blur-xs"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rx-writer-title"
        className="relative z-10 w-full max-w-5xl bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D9488] text-white flex items-center justify-center shrink-0">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="rx-writer-title"
                className="font-display font-bold text-lg text-[#0F172A]"
              >
                Paperless Digital Prescription &amp; Lifestyle Writer
              </h2>
              <p className="text-xs text-[#64748B]">
                Patient: <strong className="text-[#0F172A]">{patientName}</strong> · Syncs to Patient App, Watch Companion, Guardian &amp; WhatsApp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]/60 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close prescription writer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0]">
          {/* Left Column: Structured Form */}
          <div className="lg:col-span-7 p-6 space-y-6">
            {/* Medicines Builder */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#334155] flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-[#0D9488]" />
                  <span>Medications ({medicines.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={addMedicineRow}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488] hover:text-[#0F766E] px-2.5 py-1 rounded-lg bg-[#0D9488]/10 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Medicine</span>
                </button>
              </div>

              <div className="space-y-3">
                {medicines.map((med, idx) => (
                  <div
                    key={med.id}
                    className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[#64748B]">
                        Medicine #{idx + 1}
                      </span>
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicineRow(med.id)}
                          className="text-xs text-[#DC2626] hover:text-[#B91C1C] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        ref={idx === 0 ? firstInputRef : undefined}
                        type="text"
                        placeholder="Medicine Name (e.g. Metformin)"
                        value={med.medicineName}
                        onChange={(e) =>
                          updateMedicine(med.id, { medicineName: e.target.value })
                        }
                        className="px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 500mg, 2 puffs)"
                        value={med.dosage}
                        onChange={(e) =>
                          updateMedicine(med.id, { dosage: e.target.value })
                        }
                        className="px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <select
                        value={med.frequency}
                        onChange={(e) =>
                          updateMedicine(med.id, { frequency: e.target.value })
                        }
                        className="px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                      >
                        <option value="Once morning">Once morning</option>
                        <option value="Twice daily">Twice daily</option>
                        <option value="Three times daily">Three times daily</option>
                        <option value="At bedtime">At bedtime</option>
                        <option value="As needed">As needed</option>
                      </select>

                      <select
                        value={med.duration}
                        onChange={(e) =>
                          updateMedicine(med.id, { duration: e.target.value })
                        }
                        className="px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                      >
                        <option value="7 days">7 days</option>
                        <option value="14 days">14 days</option>
                        <option value="30 days">30 days</option>
                        <option value="Ongoing">Ongoing</option>
                      </select>
                    </div>

                    {/* Editable Schedule Time Chips */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-medium text-[#64748B] block">
                        Schedule Times (Watch &amp; App Reminders)
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {med.times.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#E2E8F0] text-xs font-medium text-[#0F172A] tabular-nums"
                          >
                            {t}
                            <button
                              type="button"
                              onClick={() => removeTimeChip(med.id, t)}
                              className="text-[#94A3B8] hover:text-[#DC2626] cursor-pointer"
                              aria-label={`Remove time ${t}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="time"
                            value={newTimeInput[med.id] || ""}
                            onChange={(e) =>
                              setNewTimeInput((prev) => ({
                                ...prev,
                                [med.id]: e.target.value,
                              }))
                            }
                            className="px-2 py-0.5 bg-white border border-[#E2E8F0] rounded-md text-xs text-[#0F172A]"
                          />
                          <button
                            type="button"
                            onClick={() => addTimeChip(med.id)}
                            className="px-2 py-0.5 rounded-md bg-[#E2E8F0] hover:bg-[#CBD5E1] text-[11px] font-semibold text-[#0F172A] cursor-pointer"
                          >
                            + Time
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <label className="inline-flex items-center gap-2 text-xs text-[#334155] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={med.withFood}
                          onChange={(e) =>
                            updateMedicine(med.id, { withFood: e.target.checked })
                          }
                          className="rounded border-[#CBD5E1] text-[#0D9488] focus:ring-[#0D9488]"
                        />
                        <span>{med.withFood ? "Take after food" : "Take before food"}</span>
                      </label>

                      <input
                        type="text"
                        placeholder="Optional instructions..."
                        value={med.instructions}
                        onChange={(e) =>
                          updateMedicine(med.id, { instructions: e.target.value })
                        }
                        className="flex-1 sm:max-w-[240px] px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Lifestyle, Food & Activity Targets */}
            <section className="space-y-3 pt-2 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#334155] flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-[#4F46E5]" />
                  <span>Lifestyle, Diet &amp; Watch Targets ({lifestyleTargets.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={addLifestyleRow}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] px-2.5 py-1 rounded-lg bg-[#4F46E5]/10 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Target</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {lifestyleTargets.map((target) => (
                  <div
                    key={target.id}
                    className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={target.category}
                        onChange={(e) =>
                          updateLifestyle(target.id, {
                            category: e.target.value as LifestyleDraft["category"],
                          })
                        }
                        className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A]"
                      >
                        <option value="diet">Diet / Food</option>
                        <option value="steps">Steps</option>
                        <option value="calories">Calories</option>
                        <option value="sleep">Sleep</option>
                        <option value="bp">Blood Pressure</option>
                        <option value="glucose">Glucose</option>
                      </select>

                      <input
                        type="number"
                        placeholder="Target"
                        value={target.targetValue}
                        onChange={(e) =>
                          updateLifestyle(target.id, { targetValue: e.target.value })
                        }
                        className="w-24 px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] tabular-nums"
                      />

                      <input
                        type="text"
                        placeholder="Unit"
                        value={target.unit}
                        onChange={(e) =>
                          updateLifestyle(target.id, { unit: e.target.value })
                        }
                        className="w-24 px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A]"
                      />

                      <button
                        type="button"
                        onClick={() => removeLifestyleRow(target.id)}
                        className="ml-auto p-1 text-[#94A3B8] hover:text-[#DC2626] cursor-pointer"
                        aria-label="Remove lifestyle target"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Description (e.g. Low-oil, low-glycemic South Indian meals)"
                      value={target.description}
                      onChange={(e) =>
                        updateLifestyle(target.id, { description: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Doctor Summary & Follow-up Date */}
            <section className="space-y-3 pt-2 border-t border-[#E2E8F0]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Clinical Summary for Patient &amp; Guardian
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explain why this digital prescription was issued or adjusted..."
                    value={doctorSummary}
                    onChange={(e) => setDoctorSummary(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Follow-up Date</span>
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Non-Blocking AI Prescription Assistant */}
          <div className="lg:col-span-5 p-6 bg-[#F8FAFC] space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#0D9488]" />
                  <span>AI Prescription Assistant</span>
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {aiDisclaimer}
                </p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] shrink-0">
                Verify Before Rx
              </span>
            </div>

            {aiLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Suggested Medicines */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider block">
                    Suggested Medicines
                  </span>
                  {aiMedicines.map((sug, i) => (
                    <div
                      key={`${sug.medicineName}-${i}`}
                      className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-xs text-[#0F172A]">
                            {sug.medicineName} · {sug.dosage}
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            {sug.frequency} ({sug.times?.join(", ")}) · {sug.duration}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => applySuggestedMedicine(sug)}
                          className="px-2.5 py-1 rounded-lg bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[#0D9488] text-[11px] font-semibold shrink-0 transition-colors cursor-pointer"
                        >
                          + Apply to Rx
                        </button>
                      </div>
                      {sug.rationale && (
                        <p className="text-[11px] text-[#475569] leading-relaxed">
                          {sug.rationale}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Suggested Lifestyle */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider block">
                    Suggested Lifestyle &amp; Watch Targets
                  </span>
                  {aiLifestyle.map((sug, i) => (
                    <div
                      key={`${sug.category}-${i}`}
                      className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#EEF2FF] text-[#4F46E5] mb-1">
                            {sug.category}
                          </span>
                          <div className="text-xs font-medium text-[#0F172A]">
                            {sug.description}
                            {sug.targetValue ? ` (${sug.targetValue} ${sug.unit || ""})` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => applySuggestedLifestyle(sug)}
                          className="px-2.5 py-1 rounded-lg bg-[#4F46E5]/10 hover:bg-[#4F46E5]/20 text-[#4F46E5] text-[11px] font-semibold shrink-0 transition-colors cursor-pointer"
                        >
                          + Apply to Rx
                        </button>
                      </div>
                      {sug.rationale && (
                        <p className="text-[11px] text-[#64748B]">
                          {sug.rationale}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer / Confirmation Step */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-white space-y-3">
          {error && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {confirmStep ? (
            <div className="p-4 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                <p className="text-xs text-[#134E4A]">
                  Issue paperless prescription to <strong>{patientName}</strong>? This immediately updates their medicine checklist, watch companion targets, guardian feed, and sends a WhatsApp notification.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmStep(false)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] hover:text-[#0F172A] cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleIssuePrescription}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Issuing &amp; Syncing...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm &amp; Sync Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-[#64748B]">
                Physician sign-off required. Replaces physical paper prescription.
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] hover:text-[#0F172A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateBeforeConfirm()) setConfirmStep(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <FileSignature className="w-4 h-4" />
                  <span>Issue Digital Prescription</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

