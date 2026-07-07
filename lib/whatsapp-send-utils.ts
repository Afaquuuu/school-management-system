import { normalizeWhatsAppPhone } from "@/lib/whatsapp-phone";

export const WHATSAPP_MESSAGE_DELAY_MS = 1_500;
export const WHATSAPP_BATCH_SIZE = 5;
export const WHATSAPP_BATCH_PAUSE_MS = 3_000;
export const WHATSAPP_REGISTRATION_CHECK_BATCH = 20;
export const WHATSAPP_API_CHUNK_SIZE = 10;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function dedupeWhatsAppMessages<T extends { to: string; text: string }>(
  messages: T[],
  countryCode: string,
): {
  uniqueMessages: T[];
  invalid: Array<{ to: string; error: string }>;
} {
  const invalid: Array<{ to: string; error: string }> = [];
  const seen = new Map<string, T>();

  for (const message of messages) {
    const normalized = normalizeWhatsAppPhone(message.to, countryCode);
    if (!normalized) {
      invalid.push({ to: message.to, error: "Invalid phone number." });
      continue;
    }
    if (!seen.has(normalized)) {
      seen.set(normalized, message);
    }
  }

  return {
    uniqueMessages: [...seen.values()],
    invalid,
  };
}
