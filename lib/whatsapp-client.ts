import { resolveAnnouncementPhoneRecipients } from "@/lib/email-recipients";
import type { ActiveAlert } from "@/lib/school-alerts";
import type { SchoolAnnouncement } from "@/lib/school-announcements";
import { loadSchoolSystemSettings, saveSchoolSystemSettings } from "@/lib/school-settings";
import { WHATSAPP_API_CHUNK_SIZE, sleep } from "@/lib/whatsapp-send-utils";
import type {
  SendWhatsAppResult,
  WhatsAppQueueEnqueueResult,
  WhatsAppQueueJobSummary,
  WhatsAppSessionStatus,
} from "@/lib/whatsapp-types";
import { validateWhatsAppSettings } from "@/lib/whatsapp-types";

async function postWhatsAppSend(payload: {
  schoolId: string;
  defaultCountryCode?: string;
  messages: Array<{
    to: string;
    schoolName: string;
    title: string;
    message: string;
  }>;
}): Promise<SendWhatsAppResult> {
  if (payload.messages.length <= WHATSAPP_API_CHUNK_SIZE) {
    return postWhatsAppSendChunk(payload);
  }

  const aggregated: SendWhatsAppResult = {
    success: false,
    sent: 0,
    skipped: 0,
    failed: [],
  };

  for (let index = 0; index < payload.messages.length; index += WHATSAPP_API_CHUNK_SIZE) {
    const chunk = payload.messages.slice(index, index + WHATSAPP_API_CHUNK_SIZE);
    const result = await postWhatsAppSendChunk({
      ...payload,
      messages: chunk,
    });

    aggregated.sent += result.sent;
    aggregated.skipped += result.skipped;
    aggregated.failed.push(...result.failed);

    if (index + WHATSAPP_API_CHUNK_SIZE < payload.messages.length) {
      await sleep(2_000);
    }
  }

  aggregated.success = aggregated.sent > 0;
  if (!aggregated.success && aggregated.failed.length > 0) {
    aggregated.error = aggregated.failed[0]?.error;
  }

  return aggregated;
}

async function postWhatsAppSendChunk(payload: {
  schoolId: string;
  defaultCountryCode?: string;
  messages: Array<{
    to: string;
    schoolName: string;
    title: string;
    message: string;
  }>;
}): Promise<SendWhatsAppResult> {
  const response = await fetch("/api/whatsapp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as SendWhatsAppResult;
  if (!response.ok && !result.error) {
    result.error = "WhatsApp service request failed.";
  }
  if (typeof result.skipped !== "number") {
    result.skipped = 0;
  }
  return result;
}

export async function fetchWhatsAppSessionStatus(
  schoolId: string,
): Promise<WhatsAppSessionStatus> {
  const response = await fetch(`/api/whatsapp/session?schoolId=${encodeURIComponent(schoolId)}`);
  return (await response.json()) as WhatsAppSessionStatus;
}

export async function connectWhatsAppSession(schoolId: string): Promise<WhatsAppSessionStatus> {
  const response = await fetch("/api/whatsapp/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schoolId, action: "connect" }),
  });
  return (await response.json()) as WhatsAppSessionStatus;
}

export async function disconnectWhatsAppSession(schoolId: string): Promise<WhatsAppSessionStatus> {
  const response = await fetch("/api/whatsapp/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schoolId, action: "disconnect" }),
  });
  return (await response.json()) as WhatsAppSessionStatus;
}

export function persistWhatsAppLinkedPhone(
  schoolId: string,
  linkedPhone?: string,
): void {
  const settings = loadSchoolSystemSettings(schoolId);
  saveSchoolSystemSettings(schoolId, {
    ...settings,
    communication: {
      ...settings.communication,
      whatsappLinkedPhone: linkedPhone?.trim() ?? "",
    },
  });
}

export async function sendAnnouncementWhatsAppMessages(input: {
  schoolId: string;
  schoolName: string;
  announcement: SchoolAnnouncement;
}): Promise<WhatsAppQueueEnqueueResult> {
  const settings = loadSchoolSystemSettings(input.schoolId);
  const validationError = validateWhatsAppSettings(settings.communication);
  if (validationError) {
    return { total: 0, error: validationError };
  }

  const recipients = resolveAnnouncementPhoneRecipients({
    schoolId: input.schoolId,
    targetAudience: input.announcement.targetAudience,
    classId: input.announcement.classId,
    defaultCountryCode: settings.communication.whatsappDefaultCountryCode,
  });

  if (recipients.length === 0) {
    return {
      total: 0,
      error: "No recipient phone numbers were found for the selected audience.",
    };
  }

  return enqueueWhatsAppMessages({
    schoolId: input.schoolId,
    schoolName: input.schoolName,
    title: input.announcement.title,
    defaultCountryCode: settings.communication.whatsappDefaultCountryCode,
    messages: recipients.map((to) => ({
      to,
      schoolName: input.schoolName,
      title: input.announcement.title,
      message: input.announcement.content,
    })),
  });
}

async function enqueueWhatsAppMessages(input: {
  schoolId: string;
  schoolName: string;
  title: string;
  defaultCountryCode?: string;
  messages: Array<{
    to: string;
    schoolName: string;
    title: string;
    message: string;
  }>;
}): Promise<WhatsAppQueueEnqueueResult> {
  const response = await fetch("/api/whatsapp/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const result = (await response.json()) as WhatsAppQueueEnqueueResult;
  if (!response.ok && !result.error) {
    result.error = "Failed to queue WhatsApp messages.";
  }
  return result;
}

export async function fetchWhatsAppQueueJobs(
  schoolId: string,
): Promise<WhatsAppQueueJobSummary[]> {
  const response = await fetch(`/api/whatsapp/queue?schoolId=${encodeURIComponent(schoolId)}`);
  if (!response.ok) return [];

  const payload = (await response.json()) as { jobs?: WhatsAppQueueJobSummary[] };
  return payload.jobs ?? [];
}

export function formatWhatsAppQueueMessage(result: WhatsAppQueueEnqueueResult): string {
  if (result.error) return result.error;
  return `WhatsApp delivery queued for ${result.total} recipient(s). Sending continues in the background even if you leave this page.`;
}

export function formatWhatsAppQueueStatus(job: WhatsAppQueueJobSummary): string {
  if (job.status === "queued") {
    return `WhatsApp queue: "${job.title}" waiting to send (${job.total} recipients).`;
  }
  if (job.status === "processing") {
    return `WhatsApp queue: "${job.title}" sending ${job.processed}/${job.total} (${job.sent} sent so far).`;
  }
  if (job.status === "completed") {
    const parts = [`${job.sent} sent`];
    if (job.skipped > 0) parts.push(`${job.skipped} skipped`);
    if (job.failedCount > 0) parts.push(`${job.failedCount} failed`);
    return `WhatsApp queue finished for "${job.title}": ${parts.join(", ")}.`;
  }
  return `WhatsApp queue failed for "${job.title}": ${job.error ?? "Unknown error"}.`;
}

export async function sendAlertWhatsAppMessages(input: {
  schoolId: string;
  schoolName: string;
  alert: ActiveAlert;
  recipients: string[];
}): Promise<SendWhatsAppResult> {
  const settings = loadSchoolSystemSettings(input.schoolId);
  const validationError = validateWhatsAppSettings(settings.communication);
  if (validationError) {
    return { success: false, sent: 0, skipped: 0, failed: [], error: validationError };
  }

  if (input.recipients.length === 0) {
    return {
      success: false,
      sent: 0,
      skipped: 0,
      failed: [],
      error: "No guardian phone numbers were found for this alert.",
    };
  }

  return postWhatsAppSend({
    schoolId: input.schoolId,
    defaultCountryCode: settings.communication.whatsappDefaultCountryCode,
    messages: input.recipients.map((to) => ({
      to,
      schoolName: input.schoolName,
      title: input.alert.title,
      message: input.alert.message,
    })),
  });
}

export async function sendTestWhatsApp(input: {
  schoolId: string;
  schoolName: string;
  to: string;
}): Promise<SendWhatsAppResult> {
  const settings = loadSchoolSystemSettings(input.schoolId);
  const validationError = validateWhatsAppSettings(settings.communication);
  if (validationError) {
    return { success: false, sent: 0, skipped: 0, failed: [], error: validationError };
  }

  return postWhatsAppSend({
    schoolId: input.schoolId,
    defaultCountryCode: settings.communication.whatsappDefaultCountryCode,
    messages: [
      {
        to: input.to.trim(),
        schoolName: input.schoolName,
        title: "WhatsApp test message",
        message: "If you received this, WhatsApp alert delivery is working.",
      },
    ],
  });
}

export function formatWhatsAppResultMessage(result: SendWhatsAppResult): string {
  if (result.error && result.sent === 0 && result.skipped === 0 && result.failed.length === 0) {
    return result.error;
  }

  const parts: string[] = [];
  if (result.sent > 0) {
    parts.push(`Sent ${result.sent} WhatsApp message${result.sent === 1 ? "" : "s"}`);
  }
  if (result.skipped > 0) {
    parts.push(
      `skipped ${result.skipped} number${result.skipped === 1 ? "" : "s"} not on WhatsApp`,
    );
  }

  const invalidOrFailed = result.failed.filter(
    (item) => !item.error.includes("not registered on WhatsApp"),
  );
  if (invalidOrFailed.length > 0) {
    parts.push(
      `${invalidOrFailed.length} could not be sent: ${invalidOrFailed
        .slice(0, 3)
        .map((item) => `${item.to} (${item.error})`)
        .join("; ")}`,
    );
  }

  if (parts.length === 0) {
    return result.error ?? "No WhatsApp messages were sent.";
  }

  return `${parts.join(". ")}.`;
}
