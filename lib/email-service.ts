import nodemailer from "nodemailer";
import type { SendEmailRequest, SendEmailResult } from "@/lib/email-types";

type ResolvedSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function resolveSmtpConfig(request: SendEmailRequest): ResolvedSmtpConfig {
  const { smtp } = request;
  const port = Number(
    smtp.smtpPort.trim() || process.env.SMTP_PORT?.trim() || "587",
  );

  const user =
    smtp.smtpUser.trim() ||
    smtp.senderEmail.trim() ||
    process.env.SMTP_USER?.trim() ||
    "";

  const pass = smtp.smtpPassword.trim() || process.env.SMTP_PASS?.trim() || "";

  const from =
    smtp.senderEmail.trim() ||
    process.env.SMTP_FROM?.trim() ||
    user;

  const host =
    smtp.smtpServer.trim() || process.env.SMTP_HOST?.trim() || "";

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from,
  };
}

export async function sendEmailBatch(
  request: SendEmailRequest,
): Promise<SendEmailResult> {
  const config = resolveSmtpConfig(request);

  if (!config.host) {
    return { success: false, sent: 0, failed: [], error: "SMTP host is not configured." };
  }
  if (!config.user) {
    return { success: false, sent: 0, failed: [], error: "SMTP username is not configured." };
  }
  if (!config.pass) {
    return {
      success: false,
      sent: 0,
      failed: [],
      error: "SMTP password is not configured.",
    };
  }
  if (request.messages.length === 0) {
    return { success: false, sent: 0, failed: [], error: "No recipients to email." };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const failed: Array<{ to: string; error: string }> = [];
  let sent = 0;

  for (const message of request.messages) {
    const to = message.to.trim().toLowerCase();
    if (!to || !to.includes("@")) {
      failed.push({ to: message.to, error: "Invalid email address." });
      continue;
    }

    try {
      await transporter.sendMail({
        from: `"${request.schoolName}" <${config.from}>`,
        to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      sent += 1;
    } catch (error) {
      failed.push({
        to,
        error: error instanceof Error ? error.message : "Failed to send email.",
      });
    }
  }

  return {
    success: sent > 0 && failed.length === 0,
    sent,
    failed,
    error:
      sent === 0 && failed.length > 0
        ? failed[0]?.error ?? "All emails failed to send."
        : undefined,
  };
}
