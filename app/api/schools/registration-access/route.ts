import { NextResponse } from "next/server";

import {
  canCreateSchool,
  getSchoolRegistrationSecret,
  isOwnerRegistrationKeyValid,
  isPublicSchoolRegistrationAllowed,
} from "@/lib/school-registration-policy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!getSchoolRegistrationSecret()) {
    return NextResponse.json(
      { ok: false, error: "Owner registration is not configured on this server." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as { key?: string };
    const valid = isOwnerRegistrationKeyValid(body.key);

    if (!valid) {
      return NextResponse.json({ ok: false, error: "Invalid owner key." }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    ownerRegistrationConfigured: Boolean(getSchoolRegistrationSecret()),
    publicRegistrationAllowed: isPublicSchoolRegistrationAllowed(),
  });
}
