import type { WASocket } from "@whiskeysockets/baileys";
import {
  isWhatsAppUnavailableError,
  normalizeWhatsAppPhone,
} from "@/lib/whatsapp-phone";
import type { WhatsAppDeliveryMessageStatus } from "@/lib/whatsapp-types";
import {
  WHATSAPP_BATCH_PAUSE_MS,
  WHATSAPP_BATCH_SIZE,
  WHATSAPP_MESSAGE_DELAY_MS,
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

export type WhatsAppMessageDeliveryResult = {
  to: string;
  label?: string;
  status: WhatsAppDeliveryMessageStatus;
  deliveredTo?: string;
  error?: string;
};

function uniqueRawPhones(phones: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const phone of phones) {
    const trimmed = phone?.replace(/\s+/g, "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }

  return unique;
}

async function tryDeliverToCandidates(input: {
  socket: WASocket;
  phones: string[];
  countryCode: string;
  text: string;
  alreadySent: Set<string>;
}): Promise<{
  status: WhatsAppDeliveryMessageStatus;
  deliveredTo?: string;
  error?: string;
}> {
  const candidates: Array<{ raw: string; normalized: string }> = [];

  for (const raw of input.phones) {
    const normalized = normalizeWhatsAppPhone(raw, input.countryCode);
    if (!normalized) continue;
    if (candidates.some((item) => item.normalized === normalized)) continue;
    candidates.push({ raw, normalized });
  }

  if (candidates.length === 0) {
    return { status: "failed", error: "Invalid phone number format." };
  }

  for (const candidate of candidates) {
    if (input.alreadySent.has(candidate.normalized)) {
      return { status: "sent", deliveredTo: candidate.normalized };
    }
  }

  let sawUnavailable = false;

  for (const candidate of candidates) {
    if (input.alreadySent.has(candidate.normalized)) {
      return { status: "sent", deliveredTo: candidate.normalized };
    }

    try {
      await input.socket.sendMessage(buildJid(candidate.normalized), { text: input.text });
      input.alreadySent.add(candidate.normalized);
      return { status: "sent", deliveredTo: candidate.normalized };
    } catch (error) {
      if (isWhatsAppUnavailableError(error)) {
        sawUnavailable = true;
        continue;
      }

      return {
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to send WhatsApp message.",
      };
    }
  }

  if (sawUnavailable) {
    return { status: "skipped", error: "Number not registered on WhatsApp." };
  }

  return { status: "failed", error: "Could not deliver WhatsApp message." };
}

export async function deliverWhatsAppMessages(input: {
  socket: WASocket;
  messages: Array<{ to: string; text: string; alternates?: string[]; label?: string }>;
  countryCode: string;
}): Promise<{
  sent: number;
  skipped: number;
  failed: Array<{ to: string; error: string }>;
  results: WhatsAppMessageDeliveryResult[];
}> {
  const countryCode = input.countryCode.replace(/\D/g, "") || "233";
  const failed: Array<{ to: string; error: string }> = [];
  const results: WhatsAppMessageDeliveryResult[] = [];
  const alreadySent = new Set<string>();
  let sent = 0;
  let skipped = 0;

  for (let index = 0; index < input.messages.length; index += 1) {
    const message = input.messages[index];
    const phones = uniqueRawPhones([message.to, ...(message.alternates ?? [])]);
    const delivery = await tryDeliverToCandidates({
      socket: input.socket,
      phones,
      countryCode,
      text: message.text,
      alreadySent,
    });

    results.push({
      to: message.to,
      label: message.label,
      status: delivery.status,
      deliveredTo: delivery.deliveredTo,
      error: delivery.error,
    });

    if (delivery.status === "sent") {
      sent += 1;
    } else if (delivery.status === "skipped") {
      skipped += 1;
    } else {
      failed.push({
        to: message.label || message.to,
        error: delivery.error ?? "Failed to send WhatsApp message.",
      });
    }

    if (index < input.messages.length - 1) {
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
    results,
  };
}
