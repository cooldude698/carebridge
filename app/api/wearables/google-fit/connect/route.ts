import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_FIT_SCOPES = [
  "https://www.googleapis.com/auth/fitness.heart_rate.read",
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.blood_pressure.read",
  "https://www.googleapis.com/auth/fitness.blood_glucose.read",
  "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
  "https://www.googleapis.com/auth/fitness.sleep.read",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId") || "p1";

  const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_FIT_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/wearables/google-fit/callback`;

  // Demo mode fallback when credentials are not configured
  if (!clientId) {
    const demoCallbackUrl = new URL(
      "/api/wearables/google-fit/callback",
      request.url
    );
    demoCallbackUrl.searchParams.set("demo", "true");
    demoCallbackUrl.searchParams.set("patientId", patientId);
    return NextResponse.redirect(demoCallbackUrl);
  }

  // Construct Google OAuth2 URL
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_FIT_SCOPES.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", patientId);

  return NextResponse.redirect(authUrl);
}
