import { NextResponse } from "next/server";
import { store } from "@/lib/supabase/localStore";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Try Supabase query
    try {
      const supabase = await createClient();
      if (supabase && typeof supabase.from === "function") {
        const { data, error } = await supabase
          .from("briefs")
          .select("id, patient_id, created_at, source, text, citations, patients(name)")
          .order("created_at", { ascending: false })
          .limit(50);

        if (!error && Array.isArray(data) && data.length > 0) {
          const rows = data as Array<{
            id: string;
            created_at: string;
            source: string;
            text?: string | null;
            citations?: unknown[] | null;
            patients?: { name?: string } | null;
          }>;
          const formatted = rows.map((b) => ({
            id: b.id,
            patient_name: b.patients?.name || "Patient",
            created_at: b.created_at,
            source: b.source,
            char_count: (b.text || "").length,
            citation_count: Array.isArray(b.citations) ? b.citations.length : 0,
            text: b.text,
            citations: b.citations || [],
          }));
          return NextResponse.json(formatted);
        }
      }
    } catch {
      // Fall through to local store
    }

    // 2. Local store fallback
    const localAudits = store.getAIAuditLogs();
    return NextResponse.json(localAudits);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch AI audit trail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
