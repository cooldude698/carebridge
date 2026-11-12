import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/supabase/localStore";
import { SimEventRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_SIM_KINDS = [
  "miss_dose",
  "bp_spike",
  "steps_drop",
  "recover",
  "hr_spike",
  "spo2_drop",
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SimEventRequest;
    const { patientId, kind, params } = body;

    if (!patientId || !kind || !VALID_SIM_KINDS.includes(kind as any)) {
      return NextResponse.json(
        {
          error: `patientId and valid kind (${VALID_SIM_KINDS.join(", ")}) are required.`,
        },
        { status: 400 }
      );
    }

    const result = store.handleSimEvent({ patientId, kind, params });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process simulation event" },
      { status: 500 }
    );
  }
}
