import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["patient", "doctor", "family", "admin"] as const;

export async function GET(request: NextRequest) {
  const role = request.cookies.get("cb_role")?.value || "patient";
  const patientId = request.cookies.get("cb_patient_id")?.value || "p1";
  const userId = request.cookies.get("cb_user_id")?.value || "p1";
  return NextResponse.json({ role, patientId, userId });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const role = body?.role;
    const patientId = typeof body?.patientId === "string" ? body.patientId : "p1";
    const userId =
      typeof body?.userId === "string"
        ? body.userId
        : role === "doctor"
        ? "d1"
        : role === "family"
        ? "f1"
        : patientId;

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Valid role ('patient'|'doctor'|'family'|'admin') is required." },
        { status: 400 }
      );
    }

    const res = NextResponse.json({ success: true, role, patientId, userId });
    res.cookies.set("cb_role", role, { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });
    res.cookies.set("cb_patient_id", patientId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    res.cookies.set("cb_user_id", userId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Failed to set role session" }, { status: 500 });
  }
}

