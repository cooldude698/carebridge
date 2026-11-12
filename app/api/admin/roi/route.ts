import { NextResponse } from "next/server";
import { getAdminRoiDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const roi = await getAdminRoiDb();
    return NextResponse.json(roi);
  } catch {
    return NextResponse.json({ error: "Failed to compute admin ROI" }, { status: 500 });
  }
}
