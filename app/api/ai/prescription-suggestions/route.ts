import { NextRequest, NextResponse } from "next/server";
import { getPatientDetailDb, getDiagnosisReportsDb, getPatientVitalsDb } from "@/lib/supabase/db";
import { queryLlm } from "@/lib/ai/llmClient";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { patientId = "p1", diagnosisReportId } = body;

    const patientDetail = await getPatientDetailDb(patientId, "doctor");
    if (!patientDetail) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const [diagnosisReports, vitals] = await Promise.all([
      getDiagnosisReportsDb(patientId),
      getPatientVitalsDb(patientId),
    ]);

    const activeDiagnosis =
      (diagnosisReportId ? diagnosisReports.find((r) => r.id === diagnosisReportId) : null) ||
      diagnosisReports[0] ||
      null;

    const conditions = patientDetail.profile.conditions || [];
    const allergies = patientDetail.profile.allergies || [];
    const latestBp = vitals.find((v) => v.type === "bp");
    const latestGlu = vitals.find((v) => v.type === "glucose");
    const latestSpo2 = vitals.find((v) => v.type === "spo2");

    // Try Local LLM Ollama first
    const systemPrompt = `You are an AI clinical pharmacology assistant for CareBridge.
Suggest an evidence-based draft prescription and lifestyle regimen based on patient conditions, allergies, and vitals.
Format strictly as JSON with this exact schema:
{
  "medicines": [
    {
      "medicine_name": "string",
      "dosage": "string",
      "frequency": "string",
      "times": ["08:00"],
      "duration": "30 days",
      "with_food": true,
      "instructions": "string"
    }
  ],
  "lifestyle": [
    {
      "category": "steps" | "calories" | "diet" | "sleep" | "bp" | "glucose" | "other",
      "description": "string",
      "target_value": number | null,
      "unit": "string | null"
    }
  ]
}
No extra text or markdown.`;

    const userPrompt = `Patient: ${patientDetail.profile.name}, Age: ${patientDetail.profile.age}
Conditions: ${conditions.join(", ")}
Allergies: ${allergies.length > 0 ? allergies.join(", ") : "None known"}
Current Vitals:
- BP: ${latestBp?.value_a ?? 130}/${latestBp?.value_b ?? 84} mmHg
- Glucose: ${latestGlu?.value_a ?? 140} mg/dL
- SpO2: ${latestSpo2?.value_a ?? 98}%
AI Diagnosis Urgency: ${activeDiagnosis?.urgency || "routine"}
AI Diagnosis Summary: ${activeDiagnosis?.ai_summary || "Routine review"}`;

    let medicines: any[] = [];
    let lifestyle: any[] = [];
    let source: "llm" | "fallback" = "fallback";

    try {
      const llmResult = await queryLlm({
        systemPrompt,
        userPrompt,
        temperature: 0.1,
        timeoutMs: 4000,
      });

      if (llmResult) {
        const cleaned = llmResult.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed.medicines) && parsed.medicines.length > 0) {
          medicines = parsed.medicines;
          lifestyle = parsed.lifestyle || [];
          source = "llm";
        }
      }
    } catch {
      // LLM failed, proceed to clinical rules fallback
    }

    // Deterministic Clinical Fallback
    if (medicines.length === 0) {
      const isDiabetic = conditions.some((c) => c.toLowerCase().includes("diabet"));
      const isHypertensive = conditions.some((c) => c.toLowerCase().includes("hyperten"));

      if (isDiabetic) {
        medicines.push({
          medicine_name: "Metformin Hydrochloride",
          dosage: "500mg",
          frequency: "twice daily",
          times: ["08:00", "20:00"],
          duration: "30 days",
          with_food: true,
          instructions: "Take with breakfast and dinner to minimize GI disturbance",
        });
      }

      if (isHypertensive) {
        medicines.push({
          medicine_name: "Amlodipine Besylate",
          dosage: "5mg",
          frequency: "once daily in morning",
          times: ["08:00"],
          duration: "30 days",
          with_food: false,
          instructions: "Take morning with water; monitor for pedal edema",
        });
      }

      if (medicines.length === 0) {
        medicines.push({
          medicine_name: "Multivitamin & Mineral Complex",
          dosage: "1 tablet",
          frequency: "once daily",
          times: ["09:00"],
          duration: "30 days",
          with_food: true,
          instructions: "Take with morning meal",
        });
      }

      lifestyle = [
        {
          category: "steps",
          description: "Daily brisk morning walk",
          target_value: 4500,
          unit: "steps/day",
        },
        {
          category: "calories",
          description: "Active physical energy expenditure",
          target_value: 350,
          unit: "kcal/day",
        },
        {
          category: "diet",
          description: "Low-sodium (<2g), low-oil, high-fiber home cooked diet",
          target_value: null,
          unit: null,
        },
      ];
      source = "fallback";
    }

    return NextResponse.json({
      medicines,
      lifestyle,
      source,
      disclaimer: "AI draft suggestions only. Treating physician must verify before issuing.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate prescription suggestions" },
      { status: 500 }
    );
  }
}
