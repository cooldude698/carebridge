import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/supabase/localStore";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const patientId = params.id;

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }

    // Try Supabase first if available
    try {
      const supabase = await createClient();
      if (supabase && typeof supabase.from === "function") {
        const { data: dbGoals } = await supabase
          .from("patient_goals")
          .select("id, category, target, by_date, completed_at, source_note_id")
          .eq("patient_id", patientId)
          .order("completed_at", { ascending: true, nullsFirst: true })
          .order("by_date", { ascending: true });

        const { data: dbNotes } = await supabase
          .from("doctor_notes")
          .select("id, created_at, note_text")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (dbGoals || dbNotes) {
          return NextResponse.json({
            goals: dbGoals || [],
            latestNote: dbNotes && dbNotes.length > 0 ? dbNotes[0] : null,
          });
        }
      }
    } catch {
      // Local fallback
    }

    // Local store fallback
    const { goals, latestNote } = store.getPatientGoals(patientId);

    return NextResponse.json({
      goals: goals.map((g) => ({
        id: g.id,
        category: g.category,
        target: g.target,
        by_date: g.by_date,
        completed_at: g.completed_at,
        source_note_id: g.source_note_id,
      })),
      latestNote: latestNote
        ? {
            id: latestNote.id,
            created_at: latestNote.created_at,
            note_text: latestNote.note_text,
          }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve patient goals" },
      { status: 500 }
    );
  }
}
