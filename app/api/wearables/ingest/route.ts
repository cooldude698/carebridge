import { NextRequest, NextResponse } from "next/server";
import { insertVitalsBatchDb, saveDiagnosisReportDb, getPatientDetailDb } from "@/lib/supabase/db";
import { buildWearableContext } from "@/lib/wearable/processor";
import { store } from "@/lib/supabase/localStore";
import { generateDiagnosisReport } from "@/lib/ai/diagnosisGenerator";
import { sendWhatsAppMessage } from "@/lib/notifications/whatsapp";
import { Alert, Vital } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, deviceId, provider, readings } = body;

    if (!patientId || typeof patientId !== "string") {
      return NextResponse.json(
        { error: "patientId is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json(
        { error: "readings must be a non-empty array of Vital objects" },
        { status: 400 }
      );
    }

    // Validate reading items
    const validReadings: Vital[] = [];
    for (const r of readings) {
      if (!r.type || (typeof r.value_a !== "number" && typeof r.valueA !== "number")) {
        continue;
      }
      validReadings.push({
        id: r.id || `vital-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        patient_id: patientId,
        type: r.type,
        value_a: r.value_a !== undefined ? r.value_a : r.valueA,
        value_b: r.value_b !== undefined ? r.value_b : r.valueB ?? null,
        recorded_at: r.recorded_at || r.recordedAt || new Date().toISOString(),
        source: r.source || "wearable",
        device_id: deviceId || r.device_id || null,
      });
    }

    if (validReadings.length === 0) {
      return NextResponse.json(
        { error: "No valid Vital readings found in request." },
        { status: 400 }
      );
    }

    // Insert batch with deduplication
    const { inserted, skipped, vitalsInserted } = await insertVitalsBatchDb(
      patientId,
      validReadings,
      deviceId
    );

    // Compute updated context & anomalies
    const wearableContext = await buildWearableContext(patientId);
    const riskResult = store.getState().riskScores[patientId] || { score: 10, band: "green", reasons: [] };

    let diagnosisTriggered = false;
    let diagnosisReportId: string | null = null;

    const hasHighOrCriticalAnomaly = wearableContext.anomalyFlags.some(
      (a) => a.severity === "CRITICAL" || a.severity === "HIGH"
    );

    if (riskResult.band === "red" || hasHighOrCriticalAnomaly) {
      diagnosisTriggered = true;
      try {
        const report = await generateDiagnosisReport(patientId);
        await saveDiagnosisReportDb(report);
        diagnosisReportId = report.id;

        // Dispatch critical alert
        const topAnomaly = wearableContext.anomalyFlags[0];
        const alertMsg = topAnomaly
          ? `${topAnomaly.title}: ${topAnomaly.detail}`
          : `High telemetry risk alert: score ${riskResult.score}/100 (RED).`;

        const critAlert: Alert = {
          id: `alt-wearable-crit-${Date.now()}`,
          patient_id: patientId,
          level: "doctor",
          audience: "doctor",
          message: alertMsg,
          created_at: new Date().toISOString(),
          acknowledged_at: null,
        };
        store.getState().alerts.unshift(critAlert);

        // Send WhatsApp notification
        const patientDetail = await getPatientDetailDb(patientId);
        const phone = patientDetail?.profile.whatsapp_number || "+91 98450 12345";
        await sendWhatsAppMessage({
          patientId,
          recipientPhone: phone,
          recipientRole: "patient",
          eventType: "telemetry_critical_alert",
          message: `CareBridge Health Alert: An anomalous telemetry reading was detected. Your medical team has received an automated clinical brief.`,
        });
      } catch (diagErr) {
        console.warn("[wearables/ingest] Auto-diagnosis generation failed", diagErr);
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      anomalies: wearableContext.anomalyFlags,
      risk: riskResult,
      diagnosisTriggered,
      diagnosisReportId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to ingest wearable telemetry" },
      { status: 500 }
    );
  }
}
