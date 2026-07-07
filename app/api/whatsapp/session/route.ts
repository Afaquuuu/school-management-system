import { NextResponse } from "next/server";
import {
  connectWhatsAppSession,
  disconnectWhatsAppSession,
  getWhatsAppSessionSnapshot,
} from "@/lib/whatsapp-web-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const schoolId = new URL(request.url).searchParams.get("schoolId")?.trim();
  if (!schoolId) {
    return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
  }

  const snapshot = await getWhatsAppSessionSnapshot(schoolId);
  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      schoolId?: string;
      action?: "connect" | "disconnect";
    };

    const schoolId = body.schoolId?.trim();
    if (!schoolId) {
      return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
    }

    if (body.action === "disconnect") {
      await disconnectWhatsAppSession(schoolId);
      return NextResponse.json(await getWhatsAppSessionSnapshot(schoolId));
    }

    const snapshot = await connectWhatsAppSession(schoolId);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        status: "disconnected",
        error: error instanceof Error ? error.message : "Failed to update WhatsApp session.",
      },
      { status: 500 },
    );
  }
}
