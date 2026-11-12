import { NextRequest, NextResponse } from "next/server";
import { getPatientDetailDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const url = new URL(request.url);
  const rawActor = url.searchParams.get("actor");
  const actor: "doctor" | "patient" | "family" =
    rawActor === "patient" ? "patient" : rawActor === "family" ? "family" : "doctor";

  const detail = await getPatientDetailDb(params.id, actor);
  if (!detail) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
