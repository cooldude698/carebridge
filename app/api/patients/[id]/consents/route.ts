import { NextRequest, NextResponse } from "next/server";
import { getConsentsDb, updateConsentDb } from "@/lib/supabase/db";
import { INITIAL_CONSENTS } from "@/lib/mockData";
import { ConsentCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const consents = await getConsentsDb(params.id);
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
    const body = await request.json();
    const { category, granted } = body;

    if (
      !category ||
      !["vitals", "medicines", "steps", "glucose"].includes(category) ||
      typeof granted !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Valid category and boolean granted are required" },
        { status: 400 }
      );
    }

    const updated = await updateConsentDb(params.id, category as ConsentCategory, granted);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update consent" }, { status: 500 });
  }
}
