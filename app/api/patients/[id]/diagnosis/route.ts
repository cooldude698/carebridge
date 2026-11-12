import { NextRequest, NextResponse } from "next/server";
import {
  getDiagnosisReportsDb,
  normalizePatientId,
  saveDiagnosisReportDb,
  saveSymptomLogDb,
} from "@/lib/supabase/db";
import { store } from "@/lib/supabase/localStore";
import { synthesizeDiagnosisReport } from "@/lib/ai/diagnosisGenerator";
import { detectSymptomsFromText } from "@/lib/ai/nutritionQa";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const reports = await getDiagnosisReportsDb(params.id);
    return NextResponse.json(reports);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch diagnosis reports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const patientId = normalizePatientId(params.id);
    const body = await request.json().catch(() => ({}));
    const symptomNote = typeof body?.symptomNote === "string" ? body.symptomNote.trim() : null;

    if (symptomNote) {
      const { symptoms, severityHint } = detectSymptomsFromText(symptomNote);
      await saveSymptomLogDb({
        id: `sym-${Date.now()}`,
        patient_id: patientId,
        raw_text: symptomNote,
        language: "en",
        extracted_symptoms: symptoms.length > 0 ? symptoms : [symptomNote],
        severity_hint: severityHint,
        created_at: new Date().toISOString(),
      });
    }

    const draft = await synthesizeDiagnosisReport(patientId, symptomNote);
    const report = await saveDiagnosisReportDb(draft);

    let alertCreated = null;
    if (report.urgency === "urgent" || report.urgency === "emergency") {
      alertCreated = {
        id: `alt-diag-${Date.now()}`,
        patient_id: patientId,
        level: "doctor" as const,
        audience: "doctor" as const,
        message: `AI Diagnosis Report (${report.urgency.toUpperCase()}): ${report.ai_summary.slice(0, 140)}`,
        created_at: new Date().toISOString(),
        acknowledged_at: null,
      };
      store.getState().alerts.unshift(alertCreated);
    }

    return NextResponse.json({ report, alertCreated }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate diagnosis report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
