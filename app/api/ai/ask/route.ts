import { NextRequest, NextResponse } from "next/server";
import { createNutritionQaStream } from "@/lib/ai/nutritionQa";
import { normalizePatientId } from "@/lib/supabase/db";
import { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawPatientId = body?.patientId || "p1";
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const rawLang = body?.language;
    const language: Locale =
      rawLang === "hi" || rawLang === "kn" || rawLang === "en" ? rawLang : "en";

    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const patientId = normalizePatientId(String(rawPatientId));
    const { stream, modelUsed, symptomLogged } = await createNutritionQaStream({
      patientId,
      question,
      language,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-CareBridge-Model": modelUsed,
        "X-CareBridge-Symptom-Logged": symptomLogged ? "1" : "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to answer question";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
