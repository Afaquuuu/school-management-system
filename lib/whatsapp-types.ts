import type { CommunicationSettings } from "@/lib/school-settings";

export type WhatsAppRecipientUnit = {
  to: string;
  alternates?: string[];
  label?: string;
};

export type WhatsAppMessage = WhatsAppRecipientUnit & {
  schoolName: string;
  title: string;
  message: string;
};

export type WhatsAppDeliveryMessageStatus = "pending" | "sent" | "skipped" | "failed";

export type WhatsAppQueueRecipientStatus = {
  label: string;
  to: string;
  status: WhatsAppDeliveryMessageStatus;
  deliveredTo?: string;
  error?: string;
};

export type SendWhatsAppRequest = {
  schoolId: string;
  defaultCountryCode?: string;
  messages: WhatsAppMessage[];
};

export type SendWhatsAppResult = {
  success: boolean;
  sent: number;
  skipped: number;
  failed: Array<{ to: string; error: string }>;
  error?: string;
};

export type WhatsAppSessionStatus = {
  status: "disconnected" | "connecting" | "qr" | "connected";
  qrDataUrl?: string;
  linkedPhone?: string;
  error?: string;
};

export type WhatsAppQueueJobStatus = "queued" | "processing" | "completed" | "failed";

export type WhatsAppQueueJobSummary = {
  id: string;
  title: string;
  status: WhatsAppQueueJobStatus;
  total: number;
  processed: number;
  sent: number;
  skipped: number;
  failedCount: number;
  updatedAt: string;
  error?: string;
  recipients: WhatsAppQueueRecipientStatus[];
};

export type WhatsAppQueueEnqueueResult = {
  jobId?: string;
  total: number;
  status?: WhatsAppQueueJobStatus;
  title?: string;
  error?: string;
};

export function validateWhatsAppSettings(
  communication: CommunicationSettings,
): string | null {
  if (!communication.whatsappNotifications) {
    return "WhatsApp notifications are disabled in Communication Settings.";
  }

  if (!communication.whatsappLinkedPhone?.trim()) {
    return "Link your school WhatsApp account in Communication Settings first.";
  }

  return null;
}

export function isWhatsAppDeliveryConfigured(
  communication: CommunicationSettings,
): boolean {
  return (
    communication.whatsappNotifications && Boolean(communication.whatsappLinkedPhone?.trim())
  );
}
