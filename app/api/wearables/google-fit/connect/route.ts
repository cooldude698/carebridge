import { NextRequest, NextResponse } from "next/server";
import { normalizePatientId } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patientId = normalizePatientId(searchParams.get("patientId") || "p1");
  const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
  const appUrl = clientId
    ? process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    : request.nextUrl.origin;
  const redirectUri = `${appUrl}/api/wearables/google-fit/callback`;

  if (!clientId) {
    // Demo mode OAuth bridge — redirects straight to callback with simulated code
    const demoCallbackUrl = `${appUrl}/api/wearables/google-fit/callback?code=demo_fit_auth_code&state=${encodeURIComponent(
      patientId
    )}`;
    return NextResponse.redirect(demoCallbackUrl);
  }

  const scopes = [
    "https://www.googleapis.com/auth/fitness.heart_rate.read",
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.blood_pressure.read",
    "https://www.googleapis.com/auth/fitness.blood_glucose.read",
    "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
    "https://www.googleapis.com/auth/fitness.sleep.read",
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", patientId);

  return NextResponse.redirect(authUrl.toString());
}

