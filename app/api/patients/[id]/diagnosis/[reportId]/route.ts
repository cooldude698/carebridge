import { NextRequest, NextResponse } from "next/server";
import { updateDiagnosisReportDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;
    const reportId = params.reportId;

    const body = await request.json().catch(() => ({}));
    const { doctorNotes, verify, doctorId } = body;

    const nowIso = new Date().toISOString();
    const patchPayload: Record<string, any> = {};

    if (doctorNotes !== undefined) {
      patchPayload.doctor_notes = doctorNotes;
    }
    if (verify !== false) {
      patchPayload.reviewed_by_doctor = doctorId || "d1";
      patchPayload.reviewed_at = nowIso;
    }

    const updated = await updateDiagnosisReportDb(patientId, reportId, patchPayload);
    if (!updated) {
      return NextResponse.json(
        { error: "Diagnosis report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ report: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update diagnosis report" },
      { status: 500 }
    );
  }
}
