import { NextResponse } from "next/server";
import { sendWhatsAppBatch } from "@/lib/whatsapp-service";
import type { SendWhatsAppRequest } from "@/lib/whatsapp-types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendWhatsAppRequest;

    if (!body?.schoolId?.trim() || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { success: false, sent: 0, skipped: 0, failed: [], error: "Invalid WhatsApp request." },
        { status: 400 },
      );
    }

    const result = await sendWhatsAppBatch(body);
    const status = result.sent > 0 ? 200 : 502;

    return NextResponse.json(result, { status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        sent: 0,
        skipped: 0,
        failed: [],
        error: error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
