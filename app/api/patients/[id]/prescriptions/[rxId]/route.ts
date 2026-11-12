import { NextRequest, NextResponse } from "next/server";
import { updatePrescriptionDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; rxId: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;
    const rxId = params.rxId;

    const body = await request.json().catch(() => ({}));
    const { status, doctorSummary, followUpDate } = body;

    const patch: Record<string, any> = {};
    if (status && ["active", "completed", "cancelled"].includes(status)) {
      patch.status = status;
    }
    if (doctorSummary && typeof doctorSummary === "string") {
      patch.doctor_summary = doctorSummary;
    }
    if (followUpDate) {
      patch.follow_up_date = followUpDate;
    }

    const updated = await updatePrescriptionDb(patientId, rxId, patch);
    if (!updated) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, prescription: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update prescription" },
      { status: 500 }
    );
  }
}
