import { NextRequest, NextResponse } from "next/server";
import { getGoalsDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const patientId = params.id;

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }

    const { goals, latestNote } = await getGoalsDb(patientId);

    return NextResponse.json({
      goals: goals.map((g) => ({
        id: g.id,
        patient_id: g.patient_id,
        category: g.category,
        target: g.target,
        by_date: g.by_date,
        completed_at: g.completed_at,
        source_note_id: g.source_note_id,
        created_at: g.created_at,
      })),
      latestNote,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve patient goals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
