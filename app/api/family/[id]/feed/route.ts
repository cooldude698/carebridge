import { NextRequest, NextResponse } from "next/server";
import { getFamilyFeedDb } from "@/lib/supabase/db";
import { INITIAL_FAMILY_FEED } from "@/lib/mockData";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const feed = await getFamilyFeedDb(params.id);
    if (!feed) {
      return NextResponse.json(INITIAL_FAMILY_FEED);
    }
    return NextResponse.json(feed);
  } catch {
    return NextResponse.json(INITIAL_FAMILY_FEED);
  }
}
