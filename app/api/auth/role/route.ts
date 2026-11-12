import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const VALID_ROLES = ["patient", "doctor", "family", "admin"] as const;
type Role = (typeof VALID_ROLES)[number];

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const role = (cookieStore.get("cb_role")?.value as Role) || "doctor";
  const patientId = cookieStore.get("cb_patient_id")?.value || "p1";

  return NextResponse.json({
    role,
    patientId,
    validRoles: VALID_ROLES,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, patientId } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const assignedPatientId = patientId || "p1";

    const response = NextResponse.json({
      success: true,
      role,
      patientId: assignedPatientId,
    });

    // Set demo session cookies valid for 7 days
    response.cookies.set("cb_role", role, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    response.cookies.set("cb_patient_id", assignedPatientId, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid JSON request body", details: err?.message },
      { status: 400 }
    );
  }
}
