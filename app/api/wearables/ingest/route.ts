import { NextRequest, NextResponse } from "next/server";
import {
  getWhatsAppPrefsDb,
  insertVitalsBatchDb,
  normalizePatientId,
  saveDiagnosisReportDb,
} from "@/lib/supabase/db";
import { buildWearableContext } from "@/lib/wearable/processor";
import { synthesizeDiagnosisReport } from "@/lib/ai/diagnosisGenerator";
import { sendWhatsAppMessage } from "@/lib/notifications/whatsapp";
import { store } from "@/lib/supabase/localStore";
import { VitalType } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_TYPES: VitalType[] = ["bp", "steps", "glucose", "hr", "spo2", "calories", "sleep"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawPatientId = body?.patientId;
    const deviceId = body?.deviceId || null;
    const provider = body?.provider || "google_fit";
    const readings = body?.readings;

    if (!rawPatientId || !Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json(
        { error: "patientId and non-empty readings[] array are required." },
        { status: 400 }
      );
    }

    const patientId = normalizePatientId(String(rawPatientId));
    const normalizedReadings: Array<{
      type: VitalType;
      valueA: number;
      valueB?: number | null;
      recordedAt?: string;
    }> = [];

    for (const r of readings) {
      if (!r || !VALID_TYPES.includes(r.type) || typeof r.valueA !== "number" || isNaN(r.valueA)) {
        return NextResponse.json(
          { error: `Invalid reading entry: expected valid vital type and numeric valueA.` },
          { status: 400 }
        );
      }
      normalizedReadings.push({
        type: r.type,
        valueA: r.valueA,
        valueB: typeof r.valueB === "number" ? r.valueB : null,
        recordedAt: typeof r.recordedAt === "string" ? r.recordedAt : new Date().toISOString(),
      });
    }

    const ingestRes = await insertVitalsBatchDb(
      patientId,
      normalizedReadings,
      deviceId,
      provider
    );

    const wearable = await buildWearableContext(patientId);
    const hasCriticalOrHigh = wearable.anomalyFlags.some(
      (f) => f.severity === "CRITICAL" || f.severity === "HIGH"
    );

    let diagnosisTriggered = false;
    let diagnosisReportId: string | undefined;

    if (ingestRes.risk.band === "red" || hasCriticalOrHigh) {
      diagnosisTriggered = true;
      try {
        const draft = await synthesizeDiagnosisReport(patientId, null);
        const savedReport = await saveDiagnosisReportDb(draft);
        diagnosisReportId = savedReport.id;
      } catch {
        // Non-blocking fallback
      }

      const criticalFlag = wearable.anomalyFlags[0];
      store.getState().alerts.unshift({
        id: `alt-ingest-${Date.now()}`,
        patient_id: patientId,
        level: "wearable_anomaly",
        audience: "doctor",
        message: criticalFlag
          ? `Watch Alert (${criticalFlag.severity}): ${criticalFlag.detail}`
          : `Critical watch telemetry shift for ${patientId} (Risk ${ingestRes.risk.score}/100).`,
        created_at: new Date().toISOString(),
        acknowledged_at: null,
      });

      const prefs = getWhatsAppPrefsDb(patientId);
      if (prefs.critical_vital_alerts) {
        await sendWhatsAppMessage({
          patientId,
          recipientPhone: prefs.guardian_phone,
          recipientRole: "family",
          eventType: "critical_vital_alert",
          message: `CareBridge Urgent Watch Alert: ${
            criticalFlag ? criticalFlag.detail : "High-risk vital anomaly detected"
          }. Dr. Meera Rao has been notified automatically.`,
        });
      }
    }

    return NextResponse.json({
      inserted: ingestRes.inserted,
      skipped: ingestRes.skipped,
      anomalies: wearable.anomalyFlags,
      risk: ingestRes.risk,
      diagnosisTriggered,
      diagnosisReportId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to ingest wearable readings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
