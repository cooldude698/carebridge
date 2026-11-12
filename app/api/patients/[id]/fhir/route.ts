import { NextRequest, NextResponse } from "next/server";
import { getPatientDetailDb, getPrescriptionsDb } from "@/lib/supabase/db";
import { generateFhirR4Bundle } from "@/lib/fhir/export";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const detail = await getPatientDetailDb(params.id, "doctor");

  if (!detail) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const prescriptions = await getPrescriptionsDb(params.id);
  const bundle = generateFhirR4Bundle(detail, prescriptions);
  return NextResponse.json(bundle);
}
