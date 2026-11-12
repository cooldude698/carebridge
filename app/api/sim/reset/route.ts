import { NextResponse } from "next/server";
import { resetDemoStateDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const res = await resetDemoStateDb();
    return NextResponse.json(res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reset simulation state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
