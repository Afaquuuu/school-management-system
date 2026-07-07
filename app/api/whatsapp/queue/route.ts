import { NextResponse } from "next/server";
import {
  bootstrapWhatsAppQueue,
  enqueueWhatsAppMessages,
  getWhatsAppQueueJob,
  getWhatsAppQueueJobs,
} from "@/lib/whatsapp-queue";
import type { WhatsAppMessage } from "@/lib/whatsapp-types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  bootstrapWhatsAppQueue();

  const url = new URL(request.url);
  const schoolId = url.searchParams.get("schoolId")?.trim();
  const jobId = url.searchParams.get("jobId")?.trim();

  if (!schoolId) {
    return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
  }

  if (jobId) {
    const job = getWhatsAppQueueJob(schoolId, jobId);
    if (!job) {
      return NextResponse.json({ error: "Queue job not found." }, { status: 404 });
    }
    return NextResponse.json({ job });
  }

  return NextResponse.json({ jobs: getWhatsAppQueueJobs(schoolId) });
}

export async function POST(request: Request) {
  bootstrapWhatsAppQueue();

  try {
    const body = (await request.json()) as {
      schoolId?: string;
      schoolName?: string;
      title?: string;
      defaultCountryCode?: string;
      messages?: WhatsAppMessage[];
    };

    const schoolId = body.schoolId?.trim();
    if (!schoolId || !body.title?.trim() || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: "Invalid WhatsApp queue request." }, { status: 400 });
    }

    if (body.messages.length === 0) {
      return NextResponse.json({ error: "No WhatsApp recipients to queue." }, { status: 400 });
    }

    const job = enqueueWhatsAppMessages({
      schoolId,
      schoolName: body.schoolName?.trim() || "School",
      title: body.title.trim(),
      defaultCountryCode: body.defaultCountryCode,
      messages: body.messages,
    });

    return NextResponse.json({
      jobId: job.id,
      total: job.messages.length,
      status: job.status,
      title: job.title,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to queue WhatsApp messages.",
      },
      { status: 500 },
    );
  }
}
