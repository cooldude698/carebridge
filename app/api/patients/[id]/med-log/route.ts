import { NextRequest, NextResponse } from "next/server";
import { logMedicineDb, getPatientDetailDb } from "@/lib/supabase/db";
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
    const { medicineId, status } = body;

    if (!medicineId || !status || (status !== "taken" && status !== "missed")) {
      return NextResponse.json(
        { error: "Valid medicineId and status ('taken' | 'missed') are required." },
        { status: 400 }
      );
    }

    const result = await logMedicineDb(patientId, medicineId, status);

    // If marked taken, clear any pending missed dose escalation for this patient
    if (status === "taken") {
      const escalations = store.getState().missedDoseEscalations;
      for (const [key, esc] of Object.entries(escalations)) {
        if (esc.patientId === patientId) {
          delete escalations[key];
        }
      }
    }

    // Compute compliance percentage over past 7 days and today
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const medLogs = store.getState().medLogs.filter(
      (m) => m.patient_id === patientId || (m as any).patientId === patientId
    );

    const logs7d = medLogs.filter((m) => {
      const time = new Date(m.scheduled_at || (m as any).scheduledAt || 0).getTime();
      return now - time <= sevenDaysMs;
    });

    const taken7d = logs7d.filter((m) => m.status === "taken").length;
    const total7d = logs7d.length;
    const compliancePct = total7d > 0 ? Math.round((taken7d / total7d) * 100) : 100;

    const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();
    const logsToday = medLogs.filter((m) =>
      isSameDay(new Date(m.scheduled_at || (m as any).scheduledAt || 0), new Date())
    );
    const takenToday = logsToday.filter((m) => m.status === "taken").length;
    const compliancePctToday = logsToday.length > 0 ? Math.round((takenToday / logsToday.length) * 100) : 100;

    return NextResponse.json({
      success: true,
      log: result.log,
      risk: result.risk,
      compliancePct,
      compliancePctToday,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to log medication" },
      { status: 500 }
    );
  }
}
