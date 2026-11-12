import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/supabase/localStore";
import {
  getWhatsAppPrefsDb,
  normalizePatientId,
  saveDiagnosisReportDb,
} from "@/lib/supabase/db";
import { synthesizeDiagnosisReport } from "@/lib/ai/diagnosisGenerator";
import { sendWhatsAppMessage } from "@/lib/notifications/whatsapp";
import { SimEventRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SimEventRequest;
    const { patientId: rawPatientId, kind, params } = body;

    if (
      !rawPatientId ||
      !kind ||
      !["miss_dose", "bp_spike", "steps_drop", "recover", "hr_spike", "spo2_drop"].includes(kind)
    ) {
      return NextResponse.json(
        {
          error:
            "patientId and valid kind ('miss_dose'|'bp_spike'|'steps_drop'|'recover'|'hr_spike'|'spo2_drop') are required.",
        },
        { status: 400 }
      );
    }

    const patientId = normalizePatientId(rawPatientId);
    const result = store.handleSimEvent({ patientId, kind, params });

    if (kind === "spo2_drop" || kind === "hr_spike" || result.newRisk.band === "red") {
      try {
        const draft = await synthesizeDiagnosisReport(patientId, null);
        await saveDiagnosisReportDb(draft);
      } catch {
        // Non-blocking fallback
      }

      const prefs = getWhatsAppPrefsDb(patientId);
      if (prefs.critical_vital_alerts) {
        await sendWhatsAppMessage({
          patientId,
          recipientPhone: prefs.guardian_phone,
          recipientRole: "family",
          eventType: `sim_${kind}`,
          message: `CareBridge Alert: ${result.message}. Risk score is ${result.newRisk.score}/100 (${result.newRisk.band.toUpperCase()}).`,
        });
      }
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process simulation event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
