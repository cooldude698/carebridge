import { NextRequest, NextResponse } from "next/server";
import { updatePrescriptionDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; rxId: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json().catch(() => ({}));
    const { status, doctorSummary } = body;

    if (status && !["active", "completed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid prescription status" }, { status: 400 });
    }

    const updated = await updatePrescriptionDb(params.id, params.rxId, {
      status,
      doctorSummary: typeof doctorSummary === "string" ? doctorSummary : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    return NextResponse.json({ prescription: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update prescription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
