import { NextRequest, NextResponse } from "next/server";
import { generateBrief } from "@/lib/ai/brief";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const patientId = params.id;
    const brief = await generateBrief(patientId);
    return NextResponse.json(brief);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate pre-consult brief";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
