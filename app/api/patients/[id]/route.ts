import { NextRequest, NextResponse } from "next/server";
import {
  getPatientDetailDb,
  getPrescriptionsDb,
  getDiagnosisReportsDb,
  getSymptomLogsDb,
} from "@/lib/supabase/db";
import { buildWearableContext } from "@/lib/wearable/processor";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;
    const url = new URL(request.url);
    const actor = url.searchParams.get("actor") === "patient" ? "patient" : "doctor";

    const detail = await getPatientDetailDb(patientId, actor);
    if (!detail) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    let supabase: any = null;
    try {
      supabase = createClient();
    } catch {
      // offline or local
    }

    const [wearable, prescriptions, diagnosisReports, recentSymptoms] = await Promise.all([
      buildWearableContext(patientId, supabase).catch(() => null),
      getPrescriptionsDb(patientId).catch(() => []),
      getDiagnosisReportsDb(patientId).catch(() => []),
      getSymptomLogsDb(patientId).catch(() => []),
    ]);

    const activePrescriptions = prescriptions.filter((rx) => rx.status === "active");
    const latestDiagnosis = diagnosisReports[0] || null;

    return NextResponse.json({
      ...detail,
      wearable,
      prescriptions,
      activePrescriptions,
      latestDiagnosis,
      recentSymptoms,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch patient details" },
      { status: 500 }
    );
  }
}
