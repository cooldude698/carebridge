import { NextRequest, NextResponse } from "next/server";
import { saveWearableDeviceDb } from "@/lib/supabase/db";
import { WearableDevice } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const statePatientId = searchParams.get("state") || searchParams.get("patientId") || "p1";
  const isDemo = searchParams.get("demo") === "true" || !process.env.GOOGLE_FIT_CLIENT_ID;

  const deviceId = `dev-fit-${statePatientId}`;
  const nowIso = new Date().toISOString();

  // If real Google OAuth credentials exist, we would exchange code here
  const connectedDevice: WearableDevice = {
    id: deviceId,
    patient_id: statePatientId,
    provider: "google_fit",
    device_name: isDemo
      ? "Google Fit Bridge (Simulated WearOS)"
      : "WearOS Smartwatch via Google Fit",
    is_active: true,
    last_synced_at: nowIso,
    created_at: nowIso,
  };

  await saveWearableDeviceDb(connectedDevice);

  // Redirect to patient watch dashboard
  const redirectUrl = new URL("/patient/watch", request.url);
  redirectUrl.searchParams.set("connected", "1");
  redirectUrl.searchParams.set("device", deviceId);

  return NextResponse.redirect(redirectUrl);
}
