import {
  buildAdminVerificationEmailMessage,
  buildAlertEmailMessages,
  buildAnnouncementEmailMessages,
  buildFeeReminderEmailMessages,
} from "@/lib/email-content";
import { resolveAnnouncementRecipients, resolveFeeReminderEmails } from "@/lib/email-recipients";
import type { SendEmailResult } from "@/lib/email-types";
import { validateEmailSettings } from "@/lib/email-types";
import type { FinanceInvoice } from "@/lib/finance-invoices";
import type { SchoolAnnouncement } from "@/lib/school-announcements";
import type { ActiveAlert } from "@/lib/school-alerts";
import {
  loadSchoolSystemSettings,
  type CommunicationSettings,
} from "@/lib/school-settings";

async function postEmailRequest(payload: {
  smtp: CommunicationSettings;
  schoolName: string;
  messages: Array<{
    to: string;
    subject: string;
    html: string;
    text: string;
    textOnly?: boolean;
  }>;
}): Promise<SendEmailResult> {
  const response = await fetch("/api/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      smtp: {
        emailProvider: payload.smtp.emailProvider,
        smtpServer: payload.smtp.smtpServer,
        smtpPort: payload.smtp.smtpPort,
        senderEmail: payload.smtp.senderEmail,
        smtpUser: payload.smtp.smtpUser,
        smtpPassword: payload.smtp.smtpPassword,
      },
      schoolName: payload.schoolName,
      messages: payload.messages,
    }),
  });

  const result = (await response.json()) as SendEmailResult;
  if (!response.ok && !result.error) {
    result.error = "Email service request failed.";
  }
  return result;
}

export async function sendAnnouncementEmails(input: {
  schoolId: string;
  schoolName: string;
  announcement: SchoolAnnouncement;
}): Promise<SendEmailResult> {
  const settings = loadSchoolSystemSettings(input.schoolId);
  const validationError = validateEmailSettings(settings.communication);
  if (validationError) {
    return { success: false, sent: 0, failed: [], error: validationError };
  }

  const recipients = resolveAnnouncementRecipients({
    schoolId: input.schoolId,
    targetAudience: input.announcement.targetAudience,
    classId: input.announcement.classId,
  });

  if (recipients.length === 0) {
    return {
      success: false,
      sent: 0,
      failed: [],
      error: "No recipient email addresses were found for the selected audience.",
    };
  }

  const messages = buildAnnouncementEmailMessages({
    schoolName: input.schoolName,
    announcement: input.announcement,
    recipients,
  });

  return postEmailRequest({
    smtp: settings.communication,
    schoolName: input.schoolName,
    messages,
  });
}

export async function sendFeeReminderEmails(input: {
  schoolId: string;
  schoolName: string;
  schoolPhone?: string;
  schoolEmail?: string;
  invoices: FinanceInvoice[];
}): Promise<SendEmailResult> {
  const settings = loadSchoolSystemSettings(input.schoolId);
  const validationError = validateEmailSettings(settings.communication);
  if (validationError) {
    return { success: false, sent: 0, failed: [], error: validationError };
  }

  const recipientMap = new Map<string, FinanceInvoice[]>();

  for (const invoice of input.invoices) {
    const recipients = resolveFeeReminderEmails(input.schoolId, invoice);
    if (recipients.length === 0) continue;

    for (const email of recipients) {
      const existing = recipientMap.get(email) ?? [];
      existing.push(invoice);
      recipientMap.set(email, existing);
    }
  }

  if (recipientMap.size === 0) {
    return {
      success: false,
      sent: 0,
      failed: [],
      error:
        "No guardian or parent email addresses were found for the selected invoice(s). Add guardian emails on student records or parent accounts.",
    };
  }

  const messages = buildFeeReminderEmailMessages({
    schoolName: input.schoolName,
    schoolPhone: input.schoolPhone,
    schoolEmail: input.schoolEmail,
    invoices: input.invoices,
    recipientMap,
  });

  return postEmailRequest({
    smtp: settings.communication,
    schoolName: input.schoolName,
    messages,
  });
}

export async function sendAdminVerificationEmail(input: {
  schoolId: string;
  schoolName: string;
  adminName: string;
  adminEmail: string;
  code: string;
}): Promise<SendEmailResult> {
  const settings = loadSchoolSystemSettings(input.schoolId);
  const validationError = validateEmailSettings(settings.communication);
  if (validationError) {
    return { success: false, sent: 0, failed: [], error: validationError };
  }

  return postEmailRequest({
    smtp: settings.communication,
    schoolName: input.schoolName,
    messages: [
      {
        ...buildAdminVerificationEmailMessage({
          schoolName: input.schoolName,
          adminName: input.adminName,
          code: input.code,
          to: input.adminEmail,
        }),
        textOnly: true,
      },
    ],
  });
}

export async function sendAlertNotificationEmails(input: {
  schoolId: string;
  schoolName: string;
  alert: ActiveAlert;
  recipients: string[];
}): Promise<SendEmailResult> {
  const settings = loadSchoolSystemSettings(input.schoolId);
  const validationError = validateEmailSettings(settings.communication);
  if (validationError) {
    return { success: false, sent: 0, failed: [], error: validationError };
  }

  if (input.recipients.length === 0) {
    return {
      success: false,
      sent: 0,
      failed: [],
      error: "No recipient email addresses were found for this alert.",
    };
  }

  const messages = buildAlertEmailMessages({
    schoolName: input.schoolName,
    alert: input.alert,
    recipients: input.recipients,
  });

  return postEmailRequest({
    smtp: settings.communication,
    schoolName: input.schoolName,
    messages,
  });
}

export async function sendTestEmail(input: {
  schoolId: string;
  schoolName: string;
  to: string;
}): Promise<SendEmailResult> {
  const settings = loadSchoolSystemSettings(input.schoolId);
  const validationError = validateEmailSettings(settings.communication);
  if (validationError) {
    return { success: false, sent: 0, failed: [], error: validationError };
  }

  const to = input.to.trim().toLowerCase();
  const subject = `${input.schoolName} — email test`;
  const text = [
    "Hello,",
    "",
    "This is a test message from your school management system.",
    "If you are reading this in your inbox, email delivery is working.",
    "",
    "You can ignore this message.",
  ].join("\n");
  const html = `<p>Hello,</p><p>This is a test message from <strong>${input.schoolName}</strong>.</p><p>If you are reading this in your inbox, email delivery is working.</p>`;
  const usePlainText = settings.communication.emailProvider === "gmail";

  return postEmailRequest({
    smtp: settings.communication,
    schoolName: input.schoolName,
    messages: [{ to, subject, text, html, textOnly: usePlainText }],
  });
}

export const GMAIL_PERSONAL_BLOCK_WARNING =
  "Google accepted the send but blocked delivery (check the webdev Gmail inbox for a \"Message blocked\" bounce from mailer-daemon@googlemail.com). Personal Gmail cannot send automated mail reliably — switch to Brevo and keep webdev.team002@gmail.com as your verified sender.";

export const GMAIL_DAILY_LIMIT_HINT =
  "Personal Gmail allows roughly 100–500 emails per day (often lower for app/SMTP sends). Test emails, 2FA codes, and announcements all count toward the same limit. Use Brevo (300/day free) for school notifications.";

function simplifyEmailError(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes("535") || lower.includes("authentication failed") || lower.includes("invalid login")) {
    return "Brevo rejected the login — use your SMTP login (xxx@smtp-brevo.com) as Username and an SMTP key (xsmtpsib-...) as Password, not your Brevo account password or API key.";
  }
  if (lower.includes("daily user sending limit") || lower.includes("550-5.4.5")) {
    return "Gmail daily sending limit reached — wait 24 hours or switch to Brevo.";
  }
  if (lower.includes("message blocked") || lower.includes("550-5.7.1")) {
    return "Gmail blocked automated delivery — use Brevo instead.";
  }
  if (error.length > 120) {
    return `${error.slice(0, 117)}...`;
  }
  return error;
}

export function formatEmailResultMessage(result: SendEmailResult): string {
  if (result.error && result.sent === 0) {
    return simplifyEmailError(result.error);
  }

  if (result.failed.length > 0) {
    const limitHit = result.failed.some((item) =>
      item.error.toLowerCase().includes("daily user sending limit"),
    );
    const summary = `Sent ${result.sent} email(s). ${result.failed.length} failed: ${result.failed
      .slice(0, 3)
      .map((item) => `${item.to} (${simplifyEmailError(item.error)})`)
      .join("; ")}`;
    return limitHit ? `${summary} ${GMAIL_DAILY_LIMIT_HINT}` : summary;
  }

  return `Successfully sent ${result.sent} email(s).`;
}
