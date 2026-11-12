import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/notifications/whatsapp";
import { store } from "@/lib/supabase/localStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId") || undefined;
    const logs = store.getWhatsAppLogs(patientId);
    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to retrieve WhatsApp notification logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      patientId = "p1",
      recipientPhone = "+91 98450 12345",
      recipientRole = "patient",
      eventType = "manual_test_alert",
      message,
    } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "A non-empty message string is required." },
        { status: 400 }
      );
    }

    const log = await sendWhatsAppMessage({
      patientId,
      recipientPhone,
      recipientRole,
      eventType,
      message: message.trim(),
    });

    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to dispatch WhatsApp message" },
      { status: 500 }
    );
  }
}
