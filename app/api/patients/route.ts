import { NextResponse } from "next/server";
import { getPatientsListDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await getPatientsListDb();
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch patients" },
      { status: 500 }
    );
  }
}
