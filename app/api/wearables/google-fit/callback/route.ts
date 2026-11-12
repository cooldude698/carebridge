import { NextRequest, NextResponse } from "next/server";
import { normalizePatientId, saveWearableDeviceDb } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const patientId = normalizePatientId(searchParams.get("state") || "p1");
  const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET;
  const appUrl = clientId
    ? process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    : request.nextUrl.origin;

  let accessToken = `demo_fit_token_${Date.now()}`;
  let refreshToken: string | undefined;
  let expiresAt: string | undefined;

  if (code && code !== "demo_fit_auth_code" && clientId && clientSecret) {
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${appUrl}/api/wearables/google-fit/callback`,
          grant_type: "authorization_code",
        }),
      });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        accessToken = tokenData.access_token || accessToken;
        refreshToken = tokenData.refresh_token;
        if (tokenData.expires_in) {
          expiresAt = new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString();
        }
      }
    } catch {
      // Safe demo bridge fallback
    }
  }

  await saveWearableDeviceDb({
    id: `dev-fit-${patientId}`,
    patient_id: patientId,
    provider: "google_fit",
    device_name: "WearOS Smartwatch (Google Fit Bridge)",
    is_active: true,
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    accessToken,
    refreshToken,
    expiresAt,
  });

  return NextResponse.redirect(`${appUrl}/patient/watch?connected=1`);
}

