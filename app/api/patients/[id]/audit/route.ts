import { NextRequest, NextResponse } from "next/server";
import { getAuditLogsDb } from "@/lib/supabase/db";
import { MOCK_AUDIT_LOGS } from "@/lib/mockData";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const auditLogs = await getAuditLogsDb(params.id);
    if (auditLogs && auditLogs.length > 0) {
      return NextResponse.json(auditLogs);
    }
    return NextResponse.json(MOCK_AUDIT_LOGS);
  } catch {
    return NextResponse.json(MOCK_AUDIT_LOGS);
  }
}
