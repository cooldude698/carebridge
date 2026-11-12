import { NextRequest, NextResponse } from "next/server";
import { recordDoctorActionDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, type, note } = body;

    if (!patientId || !type || !["call", "message", "teleconsult"].includes(type)) {
      return NextResponse.json(
        { error: "patientId and valid type ('call' | 'message' | 'teleconsult') are required." },
        { status: 400 }
      );
    }

    const response = await recordDoctorActionDb(patientId, type, note);
    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process doctor action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
