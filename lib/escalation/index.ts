import { store } from "@/lib/supabase/localStore";
import { Alert } from "@/lib/types";

export interface EscalationResult {
  fired: Alert[];
  pendingCount: number;
}

export function tickEscalation(forceStage?: "reminder" | "family" | "doctor"): EscalationResult {
  const fired = store.processEscalationTick(forceStage);
  const pendingCount = Object.keys(store.getState().missedDoseEscalations).length;

  for (const alert of fired) {
    if (alert.audience === "family") {
      store.addWhatsAppLog({
        id: `wa-esc-fam-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        patient_id: alert.patient_id || "p1",
        recipient_phone: "+91 98450 12345",
        recipient_role: "family",
        event_type: "missed_dose_escalation_family",
        message: alert.message,
        status: "simulated_sent",
        created_at: new Date().toISOString(),
      });
    } else if (alert.audience === "doctor") {
      store.addWhatsAppLog({
        id: `wa-esc-doc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        patient_id: alert.patient_id || "p1",
        recipient_phone: "+91 98450 99999",
        recipient_role: "doctor",
        event_type: "missed_dose_escalation_doctor",
        message: alert.message,
        status: "simulated_sent",
        created_at: new Date().toISOString(),
      });
    }
  }

  return {
    fired,
    pendingCount,
  };
}
