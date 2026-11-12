import { NextRequest, NextResponse } from "next/server";
import { getPatientDetailDb, getPrescriptionsDb } from "@/lib/supabase/db";
import { generateFhirR4Bundle } from "@/lib/fhir/export";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;

    const detail = await getPatientDetailDb(patientId, "doctor");
    if (!detail) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const prescriptions = await getPrescriptionsDb(patientId);
    const bundle = generateFhirR4Bundle(detail, prescriptions);

    return NextResponse.json(bundle);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate FHIR R4 Bundle" },
      { status: 500 }
    );
  }
}
