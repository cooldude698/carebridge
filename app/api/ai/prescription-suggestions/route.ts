import { NextRequest, NextResponse } from "next/server";
import { getDiagnosisReportsDb, getPatientDetailDb, normalizePatientId } from "@/lib/supabase/db";
import { callLlmChat, extractJsonObject } from "@/lib/ai/llmClient";
import { LifestyleTarget } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES = new Set<LifestyleTarget["category"]>([
  "diet",
  "steps",
  "calories",
  "sleep",
  "bp",
  "glucose",
  "other",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const patientId = normalizePatientId(String(body?.patientId || "p1"));
    const diagnosisReportId = body?.diagnosisReportId ? String(body.diagnosisReportId) : null;

    const detail = await getPatientDetailDb(patientId, "doctor");
    if (!detail) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const reports = await getDiagnosisReportsDb(patientId);
    const report =
      (diagnosisReportId && reports.find((r) => r.id === diagnosisReportId)) || reports[0] || null;

    const spo2Latest = detail.wearable?.spo2.latest ?? 97;
    const bpSys = detail.wearable?.bloodPressure.latestSystolic ?? 140;
    const hrNocturnal = detail.wearable?.heartRate.nocturnalMean ?? 72;

    const systemPrompt = `You are a clinical prescribing draft assistant for Indian outpatient care.
Return ONLY valid JSON:
{
  "medicines": [{ "medicineName": "string", "dosage": "string", "frequency": "string", "times": ["08:00"], "duration": "string", "withFood": true, "rationale": "string" }],
  "lifestyle": [{ "category": "diet|steps|calories|sleep|bp|glucose", "description": "string", "targetValue": 4500, "unit": "steps/day", "rationale": "string" }]
}`;

    const llmRes = await callLlmChat({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            conditions: detail.profile.conditions,
            allergies: detail.profile.allergies || [],
            spo2Latest,
            bpLatest: `${bpSys}/${detail.wearable?.bloodPressure.latestDiastolic ?? 88}`,
            hrNocturnal,
            diagnosisSummary: report?.ai_summary || null,
          }),
        },
      ],
      timeoutMs: 4500,
    });

    if (llmRes) {
      const parsed = extractJsonObject(llmRes.text);
      if (parsed && Array.isArray(parsed.medicines) && Array.isArray(parsed.lifestyle)) {
        const sanitizedMeds = parsed.medicines
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map((m) => ({
            medicineName: String(m.medicineName || "").trim(),
            dosage: String(m.dosage || "").trim(),
            frequency: String(m.frequency || "Once daily").trim(),
            times:
              Array.isArray(m.times) && m.times.length > 0
                ? m.times.map(String).slice(0, 4)
                : ["08:00"],
            duration: String(m.duration || "30 days").trim(),
            withFood: m.withFood !== false,
            rationale: String(m.rationale || "Physician review recommended").trim(),
          }))
          .filter((m) => Boolean(m.medicineName && m.dosage));

        const sanitizedLifestyle = parsed.lifestyle
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map((l) => {
            const rawCat = String(l.category || "other").toLowerCase() as LifestyleTarget["category"];
            return {
              category: ALLOWED_CATEGORIES.has(rawCat) ? rawCat : ("other" as const),
              description: String(l.description || "").trim(),
              targetValue: typeof l.targetValue === "number" ? l.targetValue : null,
              unit: l.unit ? String(l.unit) : null,
              rationale: String(l.rationale || "Supports post-discharge recovery").trim(),
            };
          })
          .filter((l) => Boolean(l.description));

        if (sanitizedMeds.length > 0) {
          return NextResponse.json({
            medicines: sanitizedMeds,
            lifestyle: sanitizedLifestyle,
            source: "llm",
            disclaimer: "AI draft suggestions only. Treating physician must verify before issuing.",
          });
        }
      }
    }

    const medicines = [
      {
        medicineName: "Metformin",
        dosage: "500mg",
        frequency: "Twice daily",
        times: ["08:00", "20:00"],
        duration: "30 days",
        withFood: true,
        rationale: "Glycemic maintenance for Type 2 Diabetes",
      },
      {
        medicineName: "Amlodipine",
        dosage: bpSys >= 145 ? "10mg" : "5mg",
        frequency: "Once morning",
        times: ["08:00"],
        duration: "30 days",
        withFood: true,
        rationale: `BP control (latest systolic ${bpSys} mmHg)`,
      },
    ];

    if (spo2Latest < 94) {
      medicines.push({
        medicineName: "Salbutamol Inhaler",
        dosage: "2 puffs",
        frequency: "As needed",
        times: ["08:00"],
        duration: "14 days",
        withFood: false,
        rationale: `Bronchodilator support for SpO2 drop (${spo2Latest}%)`,
      });
    }

    const lifestyle = [
      {
        category: "steps",
        description:
          spo2Latest < 94
            ? "Light indoor pacing 2,500 steps/day with seated breathing breaks"
            : "Walk 4,500 steps/day split across morning and evening",
        targetValue: spo2Latest < 94 ? 2500 : 4500,
        unit: "steps/day",
        rationale: "Improves insulin sensitivity and vascular tone",
      },
      {
        category: "calories",
        description: "Maintain 350 active kcal daily burn",
        targetValue: 350,
        unit: "kcal/day",
        rationale: "Supports metabolic & lipid control",
      },
      {
        category: "diet",
        description:
          "Low-oil, low-GI South Indian meals; replace white rice at dinner with multigrain roti or millet",
        targetValue: null,
        unit: null,
        rationale: "Reduces post-prandial glucose & saturated fat load",
      },
    ];

    return NextResponse.json({
      medicines,
      lifestyle,
      source: "fallback",
      disclaimer: "AI draft suggestions only. Treating physician must verify before issuing.",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to generate prescription suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
