export function normalizeWhatsAppPhone(
  phone: string,
  defaultCountryCode = "233",
): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;

  const countryCode = defaultCountryCode.replace(/\D/g, "");
  if (!countryCode) return digits;

  let national = digits;
  if (digits.startsWith(countryCode) && digits.length > countryCode.length + 8) {
    return digits;
  }
  if (digits.startsWith("0")) {
    national = digits.slice(1);
  }

  // Pakistan mobiles are 10 digits starting with 3 (3XX XXXXXXX).
  if (countryCode === "92") {
    if (national.length === 10 && national.startsWith("3")) {
      return `92${national}`;
    }
    if (national.length === 11 && national.startsWith("3")) {
      return `92${national.slice(0, 10)}`;
    }
    return null;
  }

  if (national.length >= 9 && national.length <= 10) {
    return `${countryCode}${national}`;
  }

  if (digits.length >= 11) {
    return digits;
  }

  return `${countryCode}${national}`;
}

export function extractWhatsAppPhoneDigits(value: string): string {
  return value.split("@")[0]?.split(":")[0]?.replace(/\D/g, "") ?? "";
}

export function whatsAppPhonesMatch(left: string, right: string): boolean {
  const a = left.replace(/\D/g, "");
  const b = right.replace(/\D/g, "");
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
}

export function isWhatsAppUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  if (
    message.includes("not registered") ||
    message.includes("not on whatsapp") ||
    message.includes("phone number is not") ||
    message.includes("invalid jid") ||
    message.includes("does not exist")
  ) {
    return true;
  }

  const boom = error as { output?: { statusCode?: number; payload?: { message?: string } } };
  if (boom.output?.statusCode === 404) return true;

  const payloadMessage = boom.output?.payload?.message?.toLowerCase() ?? "";
  return (
    payloadMessage.includes("not registered") ||
    payloadMessage.includes("not on whatsapp")
  );
}
