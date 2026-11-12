import { NextRequest, NextResponse } from "next/server";
import { tickEscalation } from "@/lib/escalation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let forceStage: "reminder" | "family" | "doctor" | undefined;
    try {
      const body = await request.json();
      if (body?.forceStage && ["reminder", "family", "doctor"].includes(body.forceStage)) {
        forceStage = body.forceStage;
      }
    } catch {
      // Body is optional
    }

    const result = await tickEscalation(forceStage);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process escalation tick";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
