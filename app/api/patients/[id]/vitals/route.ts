import { NextRequest, NextResponse } from "next/server";
import { getPatientVitalsDb, insertVitalsBatchDb, getPatientRiskDb } from "@/lib/supabase/db";
import { Vital } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_VITAL_TYPES = [
  "bp",
  "steps",
  "glucose",
  "hr",
  "spo2",
  "calories",
  "sleep",
] as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const vitals = await getPatientVitalsDb(patientId, { type, from, to });

    // Calculate summary statistics
    const count = vitals.length;
    const valuesA = vitals
      .map((v) => v.value_a ?? (v as any).valueA)
      .filter((v): v is number => typeof v === "number");

    const latest = vitals[0] ? vitals[0].value_a ?? (vitals[0] as any).valueA ?? null : null;
    const avg =
      valuesA.length > 0
        ? parseFloat((valuesA.reduce((sum, v) => sum + v, 0) / valuesA.length).toFixed(1))
        : null;
    const min = valuesA.length > 0 ? Math.min(...valuesA) : null;
    const max = valuesA.length > 0 ? Math.max(...valuesA) : null;

    let trend: "rising" | "falling" | "stable" = "stable";
    if (valuesA.length >= 4) {
      const half = Math.floor(valuesA.length / 2);
      const recentAvg = valuesA.slice(0, half).reduce((sum, v) => sum + v, 0) / half;
      const olderAvg = valuesA.slice(half).reduce((sum, v) => sum + v, 0) / (valuesA.length - half);
      if (recentAvg > olderAvg * 1.05) trend = "rising";
      else if (recentAvg < olderAvg * 0.95) trend = "falling";
    }

    return NextResponse.json({
      vitals,
      summary: {
        count,
        latest,
        avg,
        min,
        max,
        trend,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch patient vitals" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;
    const body = await request.json();
    const type = body.type;
    const valueA = typeof body.valueA === "number" ? body.valueA : typeof body.value_a === "number" ? body.value_a : undefined;
    const valueB = typeof body.valueB === "number" ? body.valueB : typeof body.value_b === "number" ? body.value_b : null;
    const recordedAt = body.recordedAt || body.recorded_at;
    const source = body.source;
    const deviceId = body.deviceId || body.device_id;

    if (type === "flag_acknowledged") {
      return NextResponse.json({
        success: true,
        message: "Wearable flag acknowledged by patient",
      });
    }

    if (
      !type ||
      typeof valueA !== "number" ||
      !VALID_VITAL_TYPES.includes(type as any)
    ) {
      return NextResponse.json(
        {
          error: `Valid vital type (${VALID_VITAL_TYPES.join(", ")}, flag_acknowledged) and numeric valueA are required.`,
        },
        { status: 400 }
      );
    }

    const vitalReading: Vital = {
      id: `vital-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      patient_id: patientId,
      type: type as Vital["type"],
      value_a: valueA,
      value_b: valueB,
      recorded_at: recordedAt || new Date().toISOString(),
      source: source || "wearable",
      device_id: deviceId || null,
    };

    const res = await insertVitalsBatchDb(patientId, [vitalReading], deviceId);
    const risk = await getPatientRiskDb(patientId);

    return NextResponse.json({
      success: true,
      vital: res.vitalsInserted[0] || vitalReading,
      risk,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to log vitals" },
      { status: 500 }
    );
  }
}
