import { NextRequest, NextResponse } from "next/server";
import { logMedicineDb, normalizePatientId } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const patientId = normalizePatientId(params.id);
    const body = await request.json();
    const { medicineId, status } = body;

    if (!medicineId || !status || (status !== "taken" && status !== "missed")) {
      return NextResponse.json(
        { error: "Valid medicineId and status ('taken' | 'missed') are required." },
        { status: 400 }
      );
    }

    const result = await logMedicineDb(patientId, medicineId, status);
    return NextResponse.json({
      success: true,
      log: result.log,
      risk: result.risk,
      compliancePct: result.compliancePct,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to log medication";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
