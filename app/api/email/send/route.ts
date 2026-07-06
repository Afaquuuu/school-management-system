import { NextResponse } from "next/server";
import { sendEmailBatch } from "@/lib/email-service";
import type { SendEmailRequest } from "@/lib/email-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendEmailRequest;

    if (!body?.smtp || !Array.isArray(body.messages) || !body.schoolName?.trim()) {
      return NextResponse.json(
        { success: false, sent: 0, failed: [], error: "Invalid email request." },
        { status: 400 },
      );
    }

    const result = await sendEmailBatch(body);
    const status = result.sent > 0 ? 200 : 502;

    return NextResponse.json(result, { status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        sent: 0,
        failed: [],
        error: error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
