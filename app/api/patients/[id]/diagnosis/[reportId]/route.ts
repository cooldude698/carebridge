import { NextRequest, NextResponse } from "next/server";
import { updateDiagnosisReportDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json().catch(() => ({}));
    const { doctorNotes, verify, doctorId } = body;

    const updated = await updateDiagnosisReportDb(params.id, params.reportId, {
      doctorNotes: typeof doctorNotes === "string" ? doctorNotes : undefined,
      verify: Boolean(verify),
      doctorId: typeof doctorId === "string" ? doctorId : "d1",
    });

    if (!updated) {
      return NextResponse.json({ error: "Diagnosis report not found" }, { status: 404 });
    }

    return NextResponse.json({ report: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update diagnosis report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
