import { NextResponse } from "next/server";
import { resetDemoStateDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await resetDemoStateDb();

    return NextResponse.json({
      success: true,
      message: "CareBridge state reset successfully to baseline demo seed across all tables.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to reset simulation state" },
      { status: 500 }
    );
  }
}
