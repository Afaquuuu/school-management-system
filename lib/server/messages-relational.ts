import type { PrismaClient } from "@prisma/tenant-client";

import {
  buildDomainBridge,
  parseDate,
  syncLegacyRows,
} from "@/lib/server/domain-table-bridge";

export const MESSAGES_STORAGE_KEY = "school_messages";

type SchoolMessageJson = {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  preview: string;
  createdAt: string;
  timestamp: string;
  isRead: boolean;
  hasAttachment: boolean;
  replyToId?: string;
};

export const messagesDomain = buildDomainBridge<SchoolMessageJson>({
  storageKey: MESSAGES_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.schoolMessageRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.schoolMessageRecord.findMany({
      orderBy: { messageCreatedAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.legacyId,
      senderId: row.senderLegacyId,
      senderName: row.senderName,
      senderEmail: row.senderEmail,
      recipientId: row.recipientLegacyId,
      recipientName: row.recipientName,
      recipientEmail: row.recipientEmail,
      subject: row.subject,
      body: row.body,
      preview: row.preview,
      createdAt: row.messageCreatedAt.toISOString(),
      timestamp: row.timestampLabel,
      isRead: row.isRead,
      hasAttachment: row.hasAttachment,
      replyToId: row.replyToLegacyId ?? undefined,
    }));
  },
  saveItems: async (tenant, items) => {
    const existing = await tenant.schoolMessageRecord.findMany({
      select: { id: true, legacyId: true },
    });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        senderLegacyId: item.senderId,
        senderName: item.senderName,
        senderEmail: item.senderEmail,
        recipientLegacyId: item.recipientId,
        recipientName: item.recipientName,
        recipientEmail: item.recipientEmail,
        subject: item.subject,
        body: item.body,
        preview: item.preview ?? "",
        messageCreatedAt: parseDate(item.createdAt) ?? new Date(),
        timestampLabel: item.timestamp ?? "",
        isRead: item.isRead ?? false,
        hasAttachment: item.hasAttachment ?? false,
        replyToLegacyId: item.replyToId ?? null,
      };
      if (existingId) {
        await tenant.schoolMessageRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.schoolMessageRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.schoolMessageRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.schoolMessageRecord.deleteMany();
  },
});
