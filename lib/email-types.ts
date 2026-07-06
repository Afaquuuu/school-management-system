import type { CommunicationSettings } from "@/lib/school-settings";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailRequest = {
  smtp: Pick<
    CommunicationSettings,
    "smtpServer" | "smtpPort" | "senderEmail" | "smtpUser" | "smtpPassword"
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

  return null;
}
