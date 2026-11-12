import { store } from "@/lib/supabase/localStore";
import { Alert } from "@/lib/types";
import { sendWhatsAppMessage } from "@/lib/notifications/whatsapp";

export interface EscalationResult {
  fired: Alert[];
  pendingCount: number;
}

export async function tickEscalation(forceStage?: "reminder" | "family" | "doctor"): Promise<EscalationResult> {
  const fired = store.processEscalationTick(forceStage);
  const pendingCount = Object.keys(store.getState().missedDoseEscalations).length;

  for (const alert of fired) {
    if (alert.audience === "family") {
      await sendWhatsAppMessage({
        patientId: alert.patient_id || "p1",
        recipientPhone: "+91 98450 12345",
        recipientRole: "family",
        eventType: "missed_dose_escalation_family",
        message: alert.message,
      });
    } else if (alert.audience === "doctor") {
      await sendWhatsAppMessage({
        patientId: alert.patient_id || "p1",
        recipientPhone: "+91 98450 99999",
        recipientRole: "doctor",
        eventType: "missed_dose_escalation_doctor",
        message: alert.message,
      });
    }
  }

  return {
    fired,
    pendingCount,
  };
}
