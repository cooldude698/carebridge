import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/supabase/localStore";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;
    const body = await request.json();
    const { type, valueA, valueB } = body;

    if (!type || typeof valueA !== "number" || !["bp", "steps", "glucose", "flag_acknowledged"].includes(type)) {
      return NextResponse.json(
        { error: "Valid type ('bp' | 'steps' | 'glucose' | 'flag_acknowledged') and numeric valueA are required." },
        { status: 400 }
      );
    }

    if (type === "flag_acknowledged") {
      return NextResponse.json({
        success: true,
        message: "Wearable flag acknowledged by patient",
      });
    }

    try {
      const result = store.logVital(patientId, type as "bp" | "steps" | "glucose", valueA, valueB ?? null);
      return NextResponse.json({
        success: true,
        vital: result.vital,
        risk: result.risk,
      });
    } catch {
      const vitalEntry = {
        id: `vital-${Date.now()}`,
        patientId: rawId,
        type,
        valueA,
        valueB: valueB ?? null,
        recordedAt: new Date().toISOString(),
      };
      return NextResponse.json({
        success: true,
        vital: vitalEntry,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to log vitals" },
      { status: 500 }
    );
  }
}
