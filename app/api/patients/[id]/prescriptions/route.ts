import { NextRequest, NextResponse } from "next/server";
import { getPrescriptionsDb, createPrescriptionDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;

    const prescriptions = await getPrescriptionsDb(patientId);
    return NextResponse.json(prescriptions);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch prescriptions" },
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

    const body = await request.json().catch(() => ({}));
    const {
      doctorSummary,
      medicines,
      lifestyleTargets = [],
      followUpDate,
      diagnosisReportId,
      doctorId = "d1",
      doctorName = "Dr. Meera Rao",
    } = body;

    // Validate doctor summary
    if (!doctorSummary || typeof doctorSummary !== "string" || doctorSummary.trim().length < 5) {
      return NextResponse.json(
        { error: "doctorSummary must be a string of at least 5 characters" },
        { status: 400 }
      );
    }

    // Validate medicines
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return NextResponse.json(
        { error: "medicines must be a non-empty array" },
        { status: 400 }
      );
    }

    const normalizedMedicines = medicines.map((m: any) => ({
      medicine_name: m.medicine_name || m.medicineName || "Prescribed Medicine",
      dosage: m.dosage || m.dose || "Standard dose",
      frequency: m.frequency || "daily",
      times: Array.isArray(m.times) && m.times.length > 0 ? m.times : ["08:00"],
      duration: m.duration || "30 days",
      with_food: Boolean(m.with_food ?? m.withFood),
      instructions: m.instructions || null,
      medicine_id: m.medicine_id || m.medicineId || undefined,
    }));

    const normalizedLifestyleTargets = (Array.isArray(lifestyleTargets) ? lifestyleTargets : []).map(
      (lt: any) => ({
        category: lt.category || "other",
        description: lt.description || "Health Target",
        target_value: lt.target_value ?? lt.targetValue ?? null,
        unit: lt.unit || null,
      })
    );

    const result = await createPrescriptionDb({
      patientId,
      doctorId,
      doctorName,
      doctorSummary: doctorSummary.trim(),
      medicines: normalizedMedicines,
      lifestyleTargets: normalizedLifestyleTargets,
      followUpDate: followUpDate || null,
      diagnosisReportId: diagnosisReportId || null,
    });

    return NextResponse.json(
      {
        success: true,
        prescription: result.prescription,
        generatedGoalsCount: result.generatedGoalsCount,
        watchSyncPayload: result.watchSyncPayload,
        whatsappStatus: result.whatsappStatus,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create digital prescription" },
      { status: 500 }
    );
  }
}
