import { WhatsAppNotificationLog } from "@/lib/types";
import { saveWhatsAppLogDb } from "@/lib/supabase/db";

export interface SendWhatsAppParams {
  patientId: string;
  recipientPhone: string;
  recipientRole: "patient" | "family" | "doctor";
  eventType: string;
  message: string;
}

export async function sendWhatsAppMessage(
  params: SendWhatsAppParams
): Promise<WhatsAppNotificationLog> {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const createdAt = new Date().toISOString();
  const logId = `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  let status: WhatsAppNotificationLog["status"] = "simulated_sent";
  let providerMessageId: string | null = `sim-${Date.now()}`;

  if (apiKey && phoneNumberId && params.recipientPhone) {
    try {
      const cleanPhone = params.recipientPhone.replace(/[^\d]/g, "");
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: params.message },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        status = "sent";
        providerMessageId = data?.messages?.[0]?.id || `meta-${Date.now()}`;
      } else {
        status = "simulated_sent";
      }
    } catch {
      status = "simulated_sent";
    }
  }

  const entry: WhatsAppNotificationLog = {
    id: logId,
    patient_id: params.patientId,
    recipient_phone: params.recipientPhone,
    recipient_role: params.recipientRole,
    event_type: params.eventType,
    message: params.message,
    status,
    provider_message_id: providerMessageId,
    created_at: createdAt,
  };

  await saveWhatsAppLogDb(entry);
  return entry;
}

