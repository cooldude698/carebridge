import { NextRequest, NextResponse } from "next/server";
import { appendAuditLogDb, getPatientVitalsDb, logVitalDb, normalizePatientId } from "@/lib/supabase/db";
import { VitalType } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_VITAL_TYPES: VitalType[] = [
  "bp",
  "steps",
  "glucose",
  "hr",
  "spo2",
  "calories",
  "sleep",
];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const patientId = normalizePatientId(params.id);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const data = await getPatientVitalsDb(patientId, { type, from, to });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch vitals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const patientId = normalizePatientId(params.id);
    const body = await request.json();
    const { type, valueA, valueB, recordedAt, source } = body;

    if (
      !type ||
      typeof valueA !== "number" ||
      (type !== "flag_acknowledged" && !ALLOWED_VITAL_TYPES.includes(type))
    ) {
      return NextResponse.json(
        {
          error:
            "Valid type ('bp'|'steps'|'glucose'|'hr'|'spo2'|'calories'|'sleep'|'flag_acknowledged') and numeric valueA are required.",
        },
        { status: 400 }
      );
    }

    if (type === "flag_acknowledged") {
      await appendAuditLogDb({
        patient_id: patientId,
        actor_type: "patient",
        actor_id: patientId,
        actor: "Patient",
        action: "PATIENT_ACKNOWLEDGED_FLAG",
        category: "vitals",
      });
      return NextResponse.json({
        success: true,
        message: "Wearable flag acknowledged by patient",
      });
    }

    const result = await logVitalDb(
      patientId,
      type as VitalType,
      valueA,
      valueB ?? null,
      recordedAt,
      source || "manual"
    );

    return NextResponse.json({
      success: true,
      vital: result.vital,
      risk: result.risk,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to log vitals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
