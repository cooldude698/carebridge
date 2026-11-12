import { NextRequest, NextResponse } from "next/server";
import { getAuditLogsDb, appendAuditLogDb } from "@/lib/supabase/db";
import { MOCK_AUDIT_LOGS } from "@/lib/mockData";
import { AuditLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;

    const auditLogs = await getAuditLogsDb(patientId);
    if (auditLogs && auditLogs.length > 0) {
      return NextResponse.json(auditLogs);
    }
    const filtered = MOCK_AUDIT_LOGS.filter(
      (l) => l.patient_id === patientId || (l as any).patientId === patientId || patientId === "p1"
    );
    return NextResponse.json(filtered.length > 0 ? filtered : MOCK_AUDIT_LOGS);
  } catch {
    return NextResponse.json(MOCK_AUDIT_LOGS);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const rawId = params.id;
    const patientId = rawId === "patient-ramesh" ? "p1" : rawId;
    const body = await request.json().catch(() => ({}));

    const entry: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      patient_id: patientId,
      actor_type: body.actor_type || "doctor",
      actor_id: body.actor_id || "d1",
      action: body.action || "VIEW_PATIENT_CHART",
      category: body.category || "vitals",
      created_at: new Date().toISOString(),
    };

    const saved = await appendAuditLogDb(entry);
    return NextResponse.json(saved, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to log audit entry" },
      { status: 500 }
    );
  }
}
