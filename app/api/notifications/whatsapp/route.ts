import { NextRequest, NextResponse } from "next/server";
import {
  getWhatsAppLogsDb,
  getWhatsAppPrefsDb,
  normalizePatientId,
  updateWhatsAppPrefsDb,
} from "@/lib/supabase/db";
import { sendWhatsAppMessage } from "@/lib/notifications/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = normalizePatientId(searchParams.get("patientId") || "p1");
    const [logs, preferences] = await Promise.all([
      getWhatsAppLogsDb(patientId),
      Promise.resolve(getWhatsAppPrefsDb(patientId)),
    ]);

    return NextResponse.json({ logs, preferences });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load WhatsApp logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const patientId = normalizePatientId(String(body?.patientId || "p1"));

    // Preference update mode
    if (body?.action === "update_prefs" && body?.preferences) {
      const updated = updateWhatsAppPrefsDb(patientId, body.preferences);
      return NextResponse.json({ success: true, preferences: updated });
    }

    const prefs = getWhatsAppPrefsDb(patientId);
    const eventType = String(body?.eventType || "test_ping");
    const recipientRole: "patient" | "family" | "doctor" =
      body?.recipientRole === "patient" || body?.recipientRole === "doctor"
        ? body.recipientRole
        : "family";
    const recipientPhone =
      body?.recipientPhone ||
      (recipientRole === "patient" ? prefs.patient_phone : prefs.guardian_phone);

    const previewMessage =
      body?.message ||
      (eventType === "test_ping"
        ? `CareBridge Test Alert: WhatsApp care updates are active for Ramesh K. and linked supervisor ${prefs.guardian_name}.`
        : `CareBridge Care Update: Status notification (${eventType}) for Ramesh K.`);

    const log = await sendWhatsAppMessage({
      patientId,
      recipientPhone,
      recipientRole,
      eventType,
      message: previewMessage,
    });

    return NextResponse.json({
      sent: true,
      provider: log.status === "sent" ? "meta_cloud" : "simulated",
      logId: log.id,
      preview: log.message,
      log,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send WhatsApp message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
