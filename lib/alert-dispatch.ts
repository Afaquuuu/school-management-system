import { getScopedItem, setScopedItem } from "@/lib/school-context";
import { resolveAlertRecipients } from "@/lib/alert-recipients";
import { sendAlertNotificationEmails } from "@/lib/email-client";
import { sendAlertWhatsAppMessages } from "@/lib/whatsapp-client";
import type { ActiveAlert, AlertChannelId } from "@/lib/school-alerts";
import {
  refreshSchoolAlerts,
  sanitizeAlertChannels,
} from "@/lib/school-alerts";
import { loadSchoolSystemSettings } from "@/lib/school-settings";
import { validateEmailSettings } from "@/lib/email-types";
import { isWhatsAppDeliveryConfigured } from "@/lib/whatsapp-types";

const DISPATCH_LOG_KEY = "alert_dispatch_log";

type DispatchRecord = {
  fingerprint: string;
  channel: AlertChannelId | "sms";
  dispatchedAt: string;
};

export type AlertDispatchResult = {
  emailsSent: number;
  whatsappSent: number;
  skipped: number;
  errors: string[];
};

function loadDispatchLog(schoolId: string): DispatchRecord[] {
  const stored = getScopedItem(schoolId, DISPATCH_LOG_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as DispatchRecord[];
  } catch {
    return [];
  }
}

function saveDispatchLog(schoolId: string, records: DispatchRecord[]): void {
  setScopedItem(schoolId, DISPATCH_LOG_KEY, JSON.stringify(records));
}

function wasDispatched(
  schoolId: string,
  fingerprint: string,
  channel: AlertChannelId,
): boolean {
  return loadDispatchLog(schoolId).some(
    (record) =>
      record.fingerprint === fingerprint &&
      (record.channel === channel || (record.channel === "sms" && channel === "whatsapp")),
  );
}

function markDispatched(
  schoolId: string,
  fingerprint: string,
  channel: AlertChannelId,
): void {
  const records = loadDispatchLog(schoolId);
  records.push({
    fingerprint,
    channel,
    dispatchedAt: new Date().toISOString(),
  });
  saveDispatchLog(schoolId, records);
}

function isEmailChannelReady(schoolId: string): boolean {
  const communication = loadSchoolSystemSettings(schoolId).communication;
  return validateEmailSettings(communication) === null;
}

function isWhatsAppChannelReady(schoolId: string): boolean {
  const communication = loadSchoolSystemSettings(schoolId).communication;
  return isWhatsAppDeliveryConfigured(communication);
}

export async function dispatchAlertNotifications(
  schoolId: string,
  schoolName: string,
  newAlerts: ActiveAlert[],
): Promise<AlertDispatchResult> {
  const result: AlertDispatchResult = {
    emailsSent: 0,
    whatsappSent: 0,
    skipped: 0,
    errors: [],
  };

  if (newAlerts.length === 0) return result;

  const emailReady = isEmailChannelReady(schoolId);
  const whatsappReady = isWhatsAppChannelReady(schoolId);

  for (const alert of newAlerts) {
    const channels = sanitizeAlertChannels(alert.channels);
    const recipients = resolveAlertRecipients(schoolId, alert);

    for (const channel of channels) {
      if (wasDispatched(schoolId, alert.fingerprint, channel)) {
        result.skipped += 1;
        continue;
      }

      if (channel === "email") {
        if (!emailReady) {
          result.skipped += 1;
          continue;
        }
        if (recipients.emails.length === 0) {
          result.errors.push(`No email recipients found for "${alert.title}".`);
          result.skipped += 1;
          continue;
        }

        const sendResult = await sendAlertNotificationEmails({
          schoolId,
          schoolName,
          alert,
          recipients: recipients.emails,
        });

        if (sendResult.sent > 0) {
          result.emailsSent += sendResult.sent;
          markDispatched(schoolId, alert.fingerprint, channel);
        } else {
          result.errors.push(
            sendResult.error ?? `Failed to email recipients for "${alert.title}".`,
          );
        }
        continue;
      }

      if (channel === "whatsapp") {
        if (!whatsappReady) {
          result.skipped += 1;
          continue;
        }
        if (recipients.phones.length === 0) {
          result.errors.push(`No WhatsApp phone numbers found for "${alert.title}".`);
          result.skipped += 1;
          continue;
        }

        const sendResult = await sendAlertWhatsAppMessages({
          schoolId,
          schoolName,
          alert,
          recipients: recipients.phones,
        });

        if (sendResult.sent > 0) {
          result.whatsappSent += sendResult.sent;
          markDispatched(schoolId, alert.fingerprint, channel);
        } else {
          result.errors.push(
            sendResult.error ?? `Failed to send WhatsApp messages for "${alert.title}".`,
          );
        }
      }
    }
  }

  return result;
}

export function formatAlertDispatchSummary(result: AlertDispatchResult): string {
  const parts: string[] = [];

  if (result.emailsSent > 0) {
    parts.push(`${result.emailsSent} email${result.emailsSent === 1 ? "" : "s"} sent`);
  }
  if (result.whatsappSent > 0) {
    parts.push(`${result.whatsappSent} WhatsApp message${result.whatsappSent === 1 ? "" : "s"} sent`);
  }
  if (parts.length === 0 && result.errors.length === 0) {
    return "Alerts refreshed. No new notifications to send.";
  }
  if (parts.length === 0 && result.errors.length > 0) {
    return result.errors[0] ?? "Alerts refreshed with delivery issues.";
  }

  let summary = `Alerts refreshed. ${parts.join(", ")}.`;
  if (result.errors.length > 0) {
    summary += ` ${result.errors.slice(0, 2).join(" ")}`;
  }
  return summary;
}

export async function refreshAndDispatchSchoolAlerts(
  schoolId: string,
  schoolName: string,
): Promise<{ alerts: ActiveAlert[]; dispatch: AlertDispatchResult }> {
  const { alerts, newAlerts } = refreshSchoolAlerts(schoolId);
  const dispatch = await dispatchAlertNotifications(schoolId, schoolName, newAlerts);
  return { alerts, dispatch };
}
