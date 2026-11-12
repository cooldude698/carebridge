import { NextRequest, NextResponse } from "next/server";
import { completeGoalDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; goalId: string }> }
) {
  try {
    const params = await context.params;
    const { id: patientId, goalId } = params;

    if (!goalId) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    const res = await completeGoalDb(patientId, goalId);
    return NextResponse.json(res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to mark goal complete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
