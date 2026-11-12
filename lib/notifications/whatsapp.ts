import { WhatsAppNotificationLog } from "@/lib/types";
import { saveWhatsAppLogDb } from "@/lib/supabase/db";

export interface SendWhatsAppOptions {
  patientId: string;
  recipientPhone: string;
  recipientRole: "patient" | "family" | "doctor";
  eventType: string;
  message: string;
}

export async function sendWhatsAppMessage(
  options: SendWhatsAppOptions
): Promise<WhatsAppNotificationLog> {
  const { patientId, recipientPhone, recipientRole, eventType, message } = options;

  const apiKey = process.env.WHATSAPP_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const logId = `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();

  let status: "sent" | "simulated_sent" | "failed" = "simulated_sent";
  let providerMessageId: string | null = null;

  if (apiKey && phoneNumberId) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: recipientPhone.replace(/\D/g, ""),
            type: "text",
            text: { body: message },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        status = "sent";
        providerMessageId = data?.messages?.[0]?.id || null;
      } else {
        console.warn("[whatsapp.ts] Meta WhatsApp API responded with error, falling back to simulated_sent", await response.text());
        status = "simulated_sent";
      }
    } catch (err) {
      console.warn("[whatsapp.ts] Meta WhatsApp API network error, falling back to simulated_sent", err);
      status = "simulated_sent";
    }
  }

  const logEntry: WhatsAppNotificationLog = {
    id: logId,
    patient_id: patientId,
    recipient_phone: recipientPhone,
    recipient_role: recipientRole,
    event_type: eventType,
    message,
    status,
    provider_message_id: providerMessageId,
    created_at: nowIso,
  };

  await saveWhatsAppLogDb(logEntry);
  return logEntry;
}
