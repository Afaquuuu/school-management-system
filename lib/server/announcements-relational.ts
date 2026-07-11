import type { AnnouncementPriority, PrismaClient } from "@prisma/tenant-client";

import {
  cleanupLegacyJsonStorage,
  readLegacyJsonArray,
} from "@/lib/server/legacy-json-reader";
import { getSchoolDatabaseName } from "@/lib/server/schools";
import type {
  AnnouncementAudience,
  AnnouncementPriority as AppAnnouncementPriority,
  SchoolAnnouncement,
} from "@/lib/school-announcements";
import { getTenantPrisma } from "@/lib/tenant-prisma";

export const ANNOUNCEMENTS_STORAGE_KEY = "school_announcements";

function parseDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toPrismaPriority(priority: AppAnnouncementPriority): AnnouncementPriority {
  if (priority === "low" || priority === "normal" || priority === "high" || priority === "urgent") {
    return priority;
  }
  return "normal";
}

function toSchoolAnnouncementJson(row: {
  legacyId: string | null;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  scope: string;
  classLegacyId: string | null;
  classLabel: string | null;
  authorLegacyId: string;
  authorName: string;
  authorEmail: string;
  publishedAt: Date | null;
  targetAudience: unknown;
  views: number;
  isPinned: boolean;
}): SchoolAnnouncement | null {
  if (!row.legacyId) return null;

  return {
    id: row.legacyId,
    title: row.title,
    content: row.content,
    priority: row.priority,
    scope: row.scope === "class" ? "class" : "school",
    classId: row.classLegacyId ?? undefined,
    classLabel: row.classLabel ?? undefined,
    authorId: row.authorLegacyId,
    authorName: row.authorName,
    authorEmail: row.authorEmail,
    publishedAt: row.publishedAt?.toISOString() ?? new Date().toISOString(),
    targetAudience: Array.isArray(row.targetAudience)
      ? (row.targetAudience as AnnouncementAudience[])
      : [],
    views: row.views,
    isPinned: row.isPinned,
  };
}

export async function listAnnouncementsFromRelationalStore(
  tenant: PrismaClient,
): Promise<SchoolAnnouncement[]> {
  const rows = await tenant.announcement.findMany({
    where: { legacyId: { not: null } },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
  });

  return rows
    .map((row) => toSchoolAnnouncementJson(row))
    .filter((row): row is SchoolAnnouncement => row !== null);
}

export async function saveAnnouncementsToRelationalStore(
  tenant: PrismaClient,
  announcements: SchoolAnnouncement[],
): Promise<void> {
  const existing = await tenant.announcement.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });

  const incomingIds = new Set(announcements.map((item) => item.id));
  for (const row of existing) {
    if (row.legacyId && !incomingIds.has(row.legacyId)) {
      await tenant.announcement.delete({ where: { id: row.id } });
    }
  }

  for (const announcement of announcements) {
    const data = {
      title: announcement.title,
      content: announcement.content,
      priority: toPrismaPriority(announcement.priority),
      scope: announcement.scope,
      classLegacyId: announcement.classId ?? null,
      classLabel: announcement.classLabel ?? null,
      authorLegacyId: announcement.authorId,
      authorName: announcement.authorName,
      authorEmail: announcement.authorEmail,
      publishedAt: parseDate(announcement.publishedAt) ?? new Date(),
      targetAudience: announcement.targetAudience,
      views: announcement.views ?? 0,
      isPinned: announcement.isPinned ?? false,
    };

    const current = await tenant.announcement.findUnique({
      where: { legacyId: announcement.id },
    });

    if (current) {
      await tenant.announcement.update({
        where: { id: current.id },
        data,
      });
      continue;
    }

    await tenant.announcement.create({
      data: {
        legacyId: announcement.id,
        ...data,
      },
    });
  }

  await cleanupLegacyJsonStorage(tenant, ANNOUNCEMENTS_STORAGE_KEY);
}

export async function getRelationalAnnouncementsJson(schoolId: string): Promise<string | null> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return null;

  const tenant = getTenantPrisma(databaseName);
  const announcements = await listAnnouncementsFromRelationalStore(tenant);
  return JSON.stringify(announcements);
}

export async function setRelationalAnnouncementsJson(
  schoolId: string,
  rawValue: string,
): Promise<void> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) {
    throw new Error(`No active database found for school ${schoolId}.`);
  }

  let announcements: SchoolAnnouncement[];
  try {
    announcements = JSON.parse(rawValue) as SchoolAnnouncement[];
  } catch {
    throw new Error("Invalid announcements payload.");
  }

  const tenant = getTenantPrisma(databaseName);
  await saveAnnouncementsToRelationalStore(tenant, announcements);
}

export async function migrateLegacyAnnouncementsIfNeeded(schoolId: string): Promise<boolean> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return false;

  const tenant = getTenantPrisma(databaseName);
  const structuredCount = await tenant.announcement.count({
    where: { legacyId: { not: null } },
  });

  const legacyItems = await readLegacyJsonArray(tenant, ANNOUNCEMENTS_STORAGE_KEY);
  if (!legacyItems || legacyItems.length === 0) {
    return false;
  }

  if (structuredCount > 0) {
    await cleanupLegacyJsonStorage(tenant, ANNOUNCEMENTS_STORAGE_KEY);
    return false;
  }

  await saveAnnouncementsToRelationalStore(
    tenant,
    legacyItems as SchoolAnnouncement[],
  );
  return true;
}
