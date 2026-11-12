import { store } from "@/lib/supabase/localStore";
import { getWhatsAppPrefsDb } from "@/lib/supabase/db";
import { sendWhatsAppMessage } from "@/lib/notifications/whatsapp";
import { Alert } from "@/lib/types";

export interface EscalationResult {
  fired: Alert[];
  pendingCount: number;
}

export async function tickEscalation(
  forceStage?: "reminder" | "family" | "doctor"
): Promise<EscalationResult> {
  const fired = store.processEscalationTick(forceStage);
  const pendingCount = Object.keys(store.getState().missedDoseEscalations).length;

  for (const alert of fired) {
    if (alert.level === "family" || alert.level === "doctor") {
      const pid = alert.patient_id || alert.patientId || "p1";
      const prefs = getWhatsAppPrefsDb(pid);
      if (prefs.missed_medicine_reminders) {
        await sendWhatsAppMessage({
          patientId: pid,
          recipientPhone: prefs.guardian_phone,
          recipientRole: alert.level === "doctor" ? "doctor" : "family",
          eventType: `escalation_${alert.level}`,
          message: `CareBridge Escalation: ${alert.message}`,
        });
      }
    }
  }

  return {
    fired,
    pendingCount,
  };
}
