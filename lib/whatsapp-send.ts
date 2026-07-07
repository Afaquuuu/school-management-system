import type { WASocket } from "@whiskeysockets/baileys";
import {
  isWhatsAppUnavailableError,
  normalizeWhatsAppPhone,
} from "@/lib/whatsapp-phone";
import {
  WHATSAPP_BATCH_PAUSE_MS,
  WHATSAPP_BATCH_SIZE,
  WHATSAPP_MESSAGE_DELAY_MS,
  dedupeWhatsAppMessages,
  sleep,
} from "@/lib/whatsapp-send-utils";

export {
  WHATSAPP_API_CHUNK_SIZE,
  WHATSAPP_BATCH_PAUSE_MS,
  WHATSAPP_BATCH_SIZE,
  WHATSAPP_MESSAGE_DELAY_MS,
  dedupeWhatsAppMessages,
  sleep,
} from "@/lib/whatsapp-send-utils";

function buildJid(phone: string): string {
  return `${phone}@s.whatsapp.net`;
}

export async function deliverWhatsAppMessages(input: {
  socket: WASocket;
  messages: Array<{ to: string; text: string }>;
  countryCode: string;
}): Promise<{
  sent: number;
  skipped: number;
  failed: Array<{ to: string; error: string }>;
}> {
  const countryCode = input.countryCode.replace(/\D/g, "") || "233";
  const { uniqueMessages, invalid } = dedupeWhatsAppMessages(input.messages, countryCode);
  const failed = [...invalid];
  let sent = 0;
  let skipped = 0;

  for (let index = 0; index < uniqueMessages.length; index += 1) {
    const message = uniqueMessages[index];
    const normalized = normalizeWhatsAppPhone(message.to, countryCode);

    if (!normalized) {
      failed.push({ to: message.to, error: "Invalid phone number format." });
      continue;
    }

    try {
      await input.socket.sendMessage(buildJid(normalized), { text: message.text });
      sent += 1;
    } catch (error) {
      if (isWhatsAppUnavailableError(error)) {
        skipped += 1;
        continue;
      }

      failed.push({
        to: message.to,
        error: error instanceof Error ? error.message : "Failed to send WhatsApp message.",
      });
    }

    if (index < uniqueMessages.length - 1) {
      await sleep(WHATSAPP_MESSAGE_DELAY_MS);
      if ((index + 1) % WHATSAPP_BATCH_SIZE === 0) {
        await sleep(WHATSAPP_BATCH_PAUSE_MS);
      }
    }
  }

  return {
    sent,
    skipped,
    failed,
  };
}
