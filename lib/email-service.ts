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

function isGmailProvider(config: ResolvedSmtpConfig, request: SendEmailRequest): boolean {
  return (
    request.smtp.emailProvider === "gmail" ||
    config.host.toLowerCase().includes("gmail.com")
  );
}

function buildFromAddress(config: ResolvedSmtpConfig, request: SendEmailRequest): string {
  if (isGmailProvider(config, request)) {
    return config.user;
  }
  return `"${request.schoolName}" <${config.from}>`;
}

function createSmtpTransporter(config: ResolvedSmtpConfig) {
  const auth = {
    user: config.user,
    pass: config.pass,
  };

  if (config.host.toLowerCase().includes("gmail.com")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth,
    });
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth,
  });
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

  const transporter = createSmtpTransporter(config);

  try {
    await transporter.verify();
  } catch (error) {
    return {
      success: false,
      sent: 0,
      failed: [],
      error:
        error instanceof Error
          ? `SMTP connection failed: ${error.message}`
          : "SMTP connection failed.",
    };
  }

  const failed: Array<{ to: string; error: string }> = [];
  let sent = 0;

  for (const message of request.messages) {
    const to = message.to.trim().toLowerCase();
    if (!to || !to.includes("@")) {
      failed.push({ to: message.to, error: "Invalid email address." });
      continue;
    }

    try {
      const gmail = isGmailProvider(config, request);
      const usePlainText = message.textOnly || gmail;

      await transporter.sendMail({
        from: buildFromAddress(config, request),
        to,
        subject: message.subject,
        text: message.text,
        ...(usePlainText ? {} : { html: message.html }),
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
