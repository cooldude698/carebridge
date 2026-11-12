import { NextResponse } from "next/server";
import { getPatientsListDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await getPatientsListDb();
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
}
