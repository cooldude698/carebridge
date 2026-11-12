import { LifestyleTarget } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import {
  createPrescriptionDb,
  getPrescriptionsDb,
  getWhatsAppPrefsDb,
  normalizePatientId,
} from "@/lib/supabase/db";
import { sendWhatsAppMessage } from "@/lib/notifications/whatsapp";

export const dynamic = "force-dynamic";

const ALLOWED_TARGET_CATEGORIES = new Set<LifestyleTarget["category"]>([
  "diet",
  "steps",
  "calories",
  "sleep",
  "bp",
  "glucose",
  "other",
]);

function normalizeTargetCategory(raw: unknown): LifestyleTarget["category"] {
  if (typeof raw === "string" && ALLOWED_TARGET_CATEGORIES.has(raw as LifestyleTarget["category"])) {
    return raw as LifestyleTarget["category"];
  }
  return "other";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const prescriptions = await getPrescriptionsDb(params.id);
    return NextResponse.json(prescriptions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch prescriptions";
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

    const {
      doctorId = "d1",
      diagnosisReportId = null,
      doctorSummary,
      followUpDate = null,
      medicines,
      lifestyleTargets = [],
    } = body;

    if (typeof doctorSummary !== "string" || doctorSummary.trim().length < 5) {
      return NextResponse.json(
        { error: "doctorSummary (>= 5 characters) is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(medicines) || medicines.length === 0) {
      return NextResponse.json(
        { error: "At least one prescribed medicine is required." },
        { status: 400 }
      );
    }

    const sanitizedMeds = (medicines as Array<Record<string, unknown>>).map((m) => ({
      medicineName: String(m.medicineName || "").trim(),
      dosage: String(m.dosage || "").trim(),
      frequency: String(m.frequency || "Once daily").trim(),
      times: Array.isArray(m.times) && m.times.length > 0 ? m.times.map(String) : ["08:00"],
      duration: String(m.duration || "30 days").trim(),
      withFood: m.withFood !== false,
      instructions: m.instructions ? String(m.instructions) : undefined,
    }));

    if (sanitizedMeds.some((m) => !m.medicineName || !m.dosage)) {
      return NextResponse.json(
        { error: "Each medicine must include medicineName and dosage." },
        { status: 400 }
      );
    }

    const sanitizedTargets = Array.isArray(lifestyleTargets)
      ? (lifestyleTargets as Array<Record<string, unknown>>).map((t) => ({
          category: normalizeTargetCategory(t.category),
          description: String(t.description || "").trim(),
          targetValue: typeof t.targetValue === "number" ? t.targetValue : null,
          unit: t.unit ? String(t.unit) : null,
        }))
      : [];

    const result = await createPrescriptionDb({
      patientId,
      doctorId,
      diagnosisReportId,
      doctorSummary: doctorSummary.trim(),
      followUpDate,
      medicines: sanitizedMeds,
      lifestyleTargets: sanitizedTargets.filter((t) => Boolean(t.description)),
    });

    const prefs = getWhatsAppPrefsDb(patientId);
    let whatsappStatus = "skipped";
    if (prefs.new_prescription_alerts) {
      const waLog = await sendWhatsAppMessage({
        patientId,
        recipientPhone: prefs.guardian_phone,
        recipientRole: "family",
        eventType: "prescription_issued",
        message: `CareBridge: ${result.prescription.doctor_name} issued a new digital prescription (${sanitizedMeds
          .map((m) => `${m.medicineName} ${m.dosage}`)
          .join(", ")}) with ${result.watchSyncPayload.daily_step_target.toLocaleString()} steps/day target.`,
      });
      whatsappStatus = waLog.status;
    }

    return NextResponse.json(
      {
        prescription: result.prescription,
        generatedGoalsCount: result.generatedGoalsCount,
        watchSyncPayload: result.watchSyncPayload,
        whatsappStatus,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to issue digital prescription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
