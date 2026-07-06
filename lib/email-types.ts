import type { CommunicationSettings } from "@/lib/school-settings";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Plain-text only improves Gmail delivery for verification codes. */
  textOnly?: boolean;
};

export type SendEmailRequest = {
  smtp: Pick<
    CommunicationSettings,
    | "emailProvider"
    | "smtpServer"
    | "smtpPort"
    | "senderEmail"
    | "smtpUser"
    | "smtpPassword"
  >;
  schoolName: string;
  messages: EmailMessage[];
};

export type SendEmailResult = {
  success: boolean;
  sent: number;
  failed: Array<{ to: string; error: string }>;
  error?: string;
};

export function validateEmailSettings(
  communication: CommunicationSettings,
): string | null {
  if (!communication.emailNotifications) {
    return "Email notifications are disabled in Communication Settings.";
  }

  const host = communication.smtpServer.trim();
  const port = communication.smtpPort.trim();
  const from = communication.senderEmail.trim();

  if (!host) return "SMTP server is required in Communication Settings.";
  if (!port || Number.isNaN(Number(port))) {
    return "A valid SMTP port is required in Communication Settings.";
  }
  if (!from || !from.includes("@")) {
    return "A valid sender email is required in Communication Settings.";
  }

  if (!communication.smtpPassword.trim()) {
    return "SMTP password is required in Communication Settings.";
  }

  if (communication.emailProvider === "gmail") {
    const sender = communication.senderEmail.trim().toLowerCase();
    const user = (communication.smtpUser.trim() || sender).toLowerCase();
    if (sender !== user) {
      return "For Gmail, Sender Email and SMTP Username must be the same address.";
    }
  }

  if (communication.emailProvider === "brevo") {
    const pass = communication.smtpPassword.trim();
    if (pass.startsWith("xkeysib-")) {
      return "That looks like a Brevo API key. Use an SMTP key (starts with xsmtpsib-) from Settings → SMTP & API → SMTP tab.";
    }
    if (!communication.smtpUser.trim()) {
      return "SMTP Username is required — copy your SMTP login from Brevo (Settings → SMTP & API → SMTP tab).";
    }
  }

  return null;
}

export function isEmailDeliveryConfigured(
  communication: CommunicationSettings,
): boolean {
  return validateEmailSettings(communication) === null;
}
