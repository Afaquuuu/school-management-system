import type { WhatsAppMessage, SendWhatsAppRequest, SendWhatsAppResult } from "@/lib/whatsapp-types";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-phone";
import { sendWhatsAppTextMessages } from "@/lib/whatsapp-web-session";

function buildAlertText(message: WhatsAppMessage): string {
  return [
    `*${message.title}*`,
    message.message,
    "",
    `— ${message.schoolName}`,
  ].join("\n");
}

export const buildWhatsAppText = buildAlertText;

export async function sendWhatsAppBatch(
  request: SendWhatsAppRequest,
): Promise<SendWhatsAppResult> {
  if (!request.schoolId?.trim()) {
    return { success: false, sent: 0, skipped: 0, failed: [], error: "School id is required." };
  }

  if (request.messages.length === 0) {
    return { success: false, sent: 0, skipped: 0, failed: [], error: "No WhatsApp recipients to message." };
  }

  const result = await sendWhatsAppTextMessages({
    schoolId: request.schoolId,
    defaultCountryCode: request.defaultCountryCode,
    messages: request.messages.map((message) => ({
      to: message.to,
      text: buildAlertText(message),
    })),
  });

  return {
    success: result.sent > 0,
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
    error: result.error,
  };
}

export { normalizeWhatsAppPhone };
