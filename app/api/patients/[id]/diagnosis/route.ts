import { NextRequest, NextResponse } from "next/server";
import {
  getDiagnosisReportsDb,
  saveDiagnosisReportDb,
  saveSymptomLogDb,
} from "@/lib/supabase/db";
import { generateDiagnosisReport } from "@/lib/ai/diagnosisGenerator";
import { store } from "@/lib/supabase/localStore";
import { Alert, SymptomLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;

    const reports = await getDiagnosisReportsDb(patientId);
    return NextResponse.json(reports);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch diagnosis reports" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;

    const body = await request.json().catch(() => ({}));
    const { symptomNote } = body;

    // If symptom note provided, save to symptom_logs first
    if (symptomNote && typeof symptomNote === "string" && symptomNote.trim().length > 0) {
      const sympLog: SymptomLog = {
        id: `symp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patient_id: patientId,
        raw_text: symptomNote.trim(),
        language: "English",
        extracted_symptoms: [symptomNote.trim()],
        severity_hint: "moderate",
        created_at: new Date().toISOString(),
      };
      await saveSymptomLogDb(sympLog);
    }

    const report = await generateDiagnosisReport(patientId, symptomNote);
    await saveDiagnosisReportDb(report);

    // If urgency is urgent or emergency, create doctor alert
    if (report.urgency === "urgent" || report.urgency === "emergency") {
      const alert: Alert = {
        id: `alt-diag-${Date.now()}`,
        patient_id: patientId,
        level: "doctor",
        audience: "doctor",
        message: `Clinical Synthesis: ${report.urgency.toUpperCase()} review needed for patient. ${report.ai_summary.slice(0, 100)}...`,
        created_at: new Date().toISOString(),
        acknowledged_at: null,
      };
      store.getState().alerts.unshift(alert);
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate diagnosis report" },
      { status: 500 }
    );
  }
}
