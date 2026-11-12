import { NextRequest, NextResponse } from "next/server";
import { getConsentsDb, updateConsentDb } from "@/lib/supabase/db";
import { INITIAL_CONSENTS } from "@/lib/mockData";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;

    const consents = await getConsentsDb(patientId);
    if (consents && consents.length > 0) {
      return NextResponse.json(consents);
    }
    return NextResponse.json(INITIAL_CONSENTS);
  } catch {
    return NextResponse.json(INITIAL_CONSENTS);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;
    const body = await request.json();
    const { category, granted } = body;

    if (!category || typeof granted !== "boolean") {
      return NextResponse.json(
        { error: "category and boolean granted are required" },
        { status: 400 }
      );
    }

    const updated = await updateConsentDb(patientId, category, granted);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update consent" },
      { status: 500 }
    );
  }
}
