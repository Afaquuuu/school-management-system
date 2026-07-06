import { formatDate } from "@/lib/date-format";
import type { FinanceInvoice } from "@/lib/finance-invoices";
import type { SchoolAnnouncement } from "@/lib/school-announcements";
import type { EmailMessage } from "@/lib/email-types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapEmailHtml(options: {
  schoolName: string;
  title: string;
  bodyHtml: string;
  footer?: string;
}): string {
  const { schoolName, title, bodyHtml, footer } = options;

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#1d4ed8;color:#ffffff;padding:20px 24px;">
                <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">${escapeHtml(schoolName)}</div>
                <div style="margin-top:8px;font-size:22px;font-weight:700;line-height:1.3;">${escapeHtml(title)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;font-size:15px;line-height:1.7;">${bodyHtml}</td>
            </tr>
            <tr>
              <td style="padding:16px 24px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
                ${escapeHtml(footer ?? "This is an automated message from your school management system.")}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildAnnouncementEmailMessages(input: {
  schoolName: string;
  announcement: Pick<
    SchoolAnnouncement,
    "title" | "content" | "priority" | "scope" | "classLabel" | "authorName" | "publishedAt"
  >;
  recipients: string[];
}): EmailMessage[] {
  const { schoolName, announcement, recipients } = input;
  const scopeLabel =
    announcement.scope === "class" && announcement.classLabel
      ? `${announcement.classLabel} announcement`
      : "School announcement";
  const priorityLabel =
    announcement.priority === "normal"
      ? "Announcement"
      : `${announcement.priority.charAt(0).toUpperCase()}${announcement.priority.slice(1)} priority`;

  const subject = `[${schoolName}] ${announcement.title}`;
  const text = [
    `${priorityLabel} — ${scopeLabel}`,
    `From: ${announcement.authorName}`,
    `Date: ${formatDate(announcement.publishedAt)}`,
    "",
    announcement.content,
    "",
    "This message was sent by your school.",
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 12px;color:#475569;font-size:13px;">
      <strong>${escapeHtml(priorityLabel)}</strong> · ${escapeHtml(scopeLabel)}<br/>
      From ${escapeHtml(announcement.authorName)} · ${escapeHtml(formatDate(announcement.publishedAt))}
    </p>
    <div style="white-space:pre-wrap;color:#0f172a;">${escapeHtml(announcement.content)}</div>
  `;

  const html = wrapEmailHtml({
    schoolName,
    title: announcement.title,
    bodyHtml,
  });

  return recipients.map((to) => ({ to, subject, html, text }));
}

export function buildFeeReminderEmailMessages(input: {
  schoolName: string;
  schoolPhone?: string;
  schoolEmail?: string;
  invoices: FinanceInvoice[];
  recipientMap: Map<string, FinanceInvoice[]>;
}): EmailMessage[] {
  const { schoolName, schoolPhone, schoolEmail, recipientMap } = input;
  const messages: EmailMessage[] = [];

  for (const [to, invoicesForRecipient] of recipientMap.entries()) {
    const invoiceLines = invoicesForRecipient
      .map((invoice) => {
        const balance = invoice.totalAmount - invoice.paidAmount;
        return `- ${invoice.invoiceNo}: ${invoice.studentName} (${invoice.className}) — balance ₵${balance.toFixed(2)}, due ${formatDate(invoice.dueAt)}`;
      })
      .join("\n");

    const subject =
      invoicesForRecipient.length === 1
        ? `[${schoolName}] Fee reminder — ${invoicesForRecipient[0].invoiceNo}`
        : `[${schoolName}] Fee payment reminder`;

    const text = [
      "Dear Parent/Guardian,",
      "",
      "This is a reminder that the following school fee invoice(s) require payment:",
      "",
      invoiceLines,
      "",
      "Please settle the outstanding balance by the due date at the school accounts office.",
      schoolPhone ? `Phone: ${schoolPhone}` : "",
      schoolEmail ? `Email: ${schoolEmail}` : "",
      "",
      "Thank you.",
      schoolName,
    ]
      .filter(Boolean)
      .join("\n");

    const rows = invoicesForRecipient
      .map((invoice) => {
        const balance = invoice.totalAmount - invoice.paidAmount;
        return `<tr>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(invoice.invoiceNo)}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(invoice.studentName)}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(invoice.className)}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(formatDate(invoice.dueAt))}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#dc2626;">₵${balance.toFixed(2)}</td>
        </tr>`;
      })
      .join("");

    const bodyHtml = `
      <p>Dear Parent/Guardian,</p>
      <p>This is a reminder that the following fee invoice(s) have an outstanding balance:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;margin:16px 0;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:left;">Invoice</th>
            <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:left;">Student</th>
            <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:left;">Class</th>
            <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:left;">Due</th>
            <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:right;">Balance</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Please pay at the school accounts office by the due date shown above.</p>
      ${
        schoolPhone || schoolEmail
          ? `<p style="color:#475569;">Contact: ${escapeHtml([schoolPhone, schoolEmail].filter(Boolean).join(" · "))}</p>`
          : ""
      }
    `;

    const html = wrapEmailHtml({
      schoolName,
      title: "Fee Payment Reminder",
      bodyHtml,
      footer: "Please ignore this email if payment has already been made.",
    });

    messages.push({ to, subject, html, text });
  }

  return messages;
}

export function buildAdminVerificationEmailMessage(input: {
  schoolName: string;
  adminName: string;
  code: string;
  to: string;
}): { to: string; subject: string; html: string; text: string } {
  const subject = `${input.code} is your ${input.schoolName} sign-in code`;
  const text = [
    `Hello ${input.adminName},`,
    "",
    `Your admin sign-in verification code is: ${input.code}`,
    "",
    "This code expires in 10 minutes.",
    "",
    "If you did not try to sign in, ignore this email.",
  ].join("\n");

  const html = `<p>Hello ${input.adminName},</p><p>Your admin sign-in verification code is:</p><p><strong style="font-size:24px;letter-spacing:4px;">${input.code}</strong></p><p>This code expires in 10 minutes.</p>`;

  return { to: input.to, subject, html, text };
}
