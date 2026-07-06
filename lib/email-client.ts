import {
  buildAnnouncementEmailMessages,
  buildFeeReminderEmailMessages,
} from "@/lib/email-content";
import { resolveAnnouncementRecipients, resolveFeeReminderEmails } from "@/lib/email-recipients";
import type { SendEmailResult } from "@/lib/email-types";
import { validateEmailSettings } from "@/lib/email-types";
import type { FinanceInvoice } from "@/lib/finance-invoices";
import type { SchoolAnnouncement } from "@/lib/school-announcements";
import {
  loadSchoolSystemSettings,
  type CommunicationSettings,
} from "@/lib/school-settings";

async function postEmailRequest(payload: {
  smtp: CommunicationSettings;
  schoolName: string;
  messages: Array<{ to: string; subject: string; html: string; text: string }>;
}): Promise<SendEmailResult> {
  const response = await fetch("/api/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      smtp: {
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

export function formatEmailResultMessage(result: SendEmailResult): string {
  if (result.error && result.sent === 0) {
    return result.error;
  }

  if (result.failed.length > 0) {
    return `Sent ${result.sent} email(s). ${result.failed.length} failed: ${result.failed
      .slice(0, 3)
      .map((item) => `${item.to} (${item.error})`)
      .join("; ")}`;
  }

  return `Successfully sent ${result.sent} email(s).`;
}
