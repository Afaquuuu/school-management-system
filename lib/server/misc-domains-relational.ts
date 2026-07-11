import type { PrismaClient } from "@prisma/tenant-client";

import {
  buildDomainBridge,
  parseDate,
  syncLegacyRows,
} from "@/lib/server/domain-table-bridge";

export const TEACHER_CHECKINS_STORAGE_KEY = "teacher_check_ins";
export const SCHOOL_RESOURCES_STORAGE_KEY = "school_resources";
export const STUDENT_DOCUMENTS_STORAGE_KEY = "student_documents";
export const GENERATED_REPORTS_STORAGE_KEY = "generated_reports";
export const ACTIVE_ALERTS_STORAGE_KEY = "active_alerts";
export const ALERT_DISPATCH_LOG_STORAGE_KEY = "alert_dispatch_log";
export const TIMETABLE_STORAGE_KEY = "weekly_timetable";
export const SCHOOL_ASSIGNMENTS_STORAGE_KEY = "school_assignments";

type TeacherCheckInJson = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  department: string;
  date: string;
  checkInAt: string;
  status: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
};

type SchoolResourceJson = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  type: string;
  available: boolean;
};

type StudentDocumentJson = {
  id: string;
  studentId: string;
  category: string;
  customLabel?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl?: string;
  cloudinaryPublicId?: string;
  cloudinaryResourceType?: string;
  dataUrl?: string;
  uploadedAt: string;
};

type GeneratedReportJson = {
  id: string;
  type: string;
  title: string;
  generatedAt: string;
  dateFrom: string;
  dateTo: string;
  format: string;
  sizeBytes: number;
  rowCount: number;
  fileName: string;
  mimeType: string;
  content: string;
};

type ActiveAlertJson = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  createdAt: string;
  read: boolean;
  dismissed: boolean;
  channels: string[];
  fingerprint: string;
  studentId?: string;
  className?: string;
};

type DispatchLogJson = {
  id: string;
  fingerprint: string;
  channel: string;
  dispatchedAt: string;
};

type TimetableEntryJson = {
  id: string;
  [key: string]: unknown;
};

type SchoolAssignmentJson = {
  id: string;
  title: string;
  className: string;
  dueDate: string;
  status: string;
};

function withStableIds<T extends Record<string, unknown>>(
  items: T[],
  buildId: (item: T, index: number) => string,
): Array<T & { id: string }> {
  return items.map((item, index) => ({
    ...item,
    id: typeof item.id === "string" && item.id.trim() ? item.id : buildId(item, index),
  }));
}

export const teacherCheckInsDomain = buildDomainBridge<TeacherCheckInJson>({
  storageKey: TEACHER_CHECKINS_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.teacherCheckInRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.teacherCheckInRecord.findMany({ orderBy: { checkInAt: "desc" } });
    return rows.map((row) => ({
      id: row.legacyId,
      teacherId: row.teacherLegacyId,
      teacherName: row.teacherName,
      teacherEmail: row.teacherEmail,
      department: row.department,
      date: row.checkDate,
      checkInAt: row.checkInAt.toISOString(),
      status: row.reviewStatus,
      reviewedBy: row.reviewedBy ?? undefined,
      reviewedByName: row.reviewedByName ?? undefined,
      reviewedAt: row.reviewedAt?.toISOString(),
      reviewNote: row.reviewNote ?? undefined,
    }));
  },
  saveItems: async (tenant, items) => {
    const existing = await tenant.teacherCheckInRecord.findMany({ select: { id: true, legacyId: true } });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        teacherLegacyId: item.teacherId,
        teacherName: item.teacherName,
        teacherEmail: item.teacherEmail,
        department: item.department ?? "",
        checkDate: item.date,
        checkInAt: parseDate(item.checkInAt) ?? new Date(),
        reviewStatus: item.status,
        reviewedBy: item.reviewedBy ?? null,
        reviewedByName: item.reviewedByName ?? null,
        reviewedAt: parseDate(item.reviewedAt) ?? null,
        reviewNote: item.reviewNote ?? null,
      };
      if (existingId) {
        await tenant.teacherCheckInRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.teacherCheckInRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.teacherCheckInRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.teacherCheckInRecord.deleteMany();
  },
});

export const schoolResourcesDomain = buildDomainBridge<SchoolResourceJson>({
  storageKey: SCHOOL_RESOURCES_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.schoolResourceRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.schoolResourceRecord.findMany({ orderBy: { name: "asc" } });
    return rows.map((row) => ({
      id: row.legacyId,
      code: row.code,
      name: row.name,
      capacity: row.capacity,
      type: row.resourceType,
      available: row.isAvailable,
    }));
  },
  saveItems: async (tenant, items) => {
    const existing = await tenant.schoolResourceRecord.findMany({ select: { id: true, legacyId: true } });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        code: item.code,
        name: item.name,
        capacity: item.capacity,
        resourceType: item.type,
        isAvailable: item.available,
      };
      if (existingId) {
        await tenant.schoolResourceRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.schoolResourceRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.schoolResourceRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.schoolResourceRecord.deleteMany();
  },
});

export const studentDocumentsDomain = buildDomainBridge<StudentDocumentJson>({
  storageKey: STUDENT_DOCUMENTS_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.studentDocumentRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.studentDocumentRecord.findMany({ orderBy: { uploadedAt: "desc" } });
    return rows.map((row) => ({
      id: row.legacyId,
      studentId: row.studentLegacyId,
      category: row.category,
      customLabel: row.customLabel ?? undefined,
      fileName: row.fileName,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      fileUrl: row.fileUrl ?? undefined,
      cloudinaryPublicId: row.cloudinaryPublicId ?? undefined,
      cloudinaryResourceType: row.cloudinaryResourceType ?? undefined,
      dataUrl: row.dataUrl ?? undefined,
      uploadedAt: row.uploadedAt.toISOString(),
    }));
  },
  saveItems: async (tenant, items) => {
    const existing = await tenant.studentDocumentRecord.findMany({ select: { id: true, legacyId: true } });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        studentLegacyId: item.studentId,
        category: item.category,
        customLabel: item.customLabel ?? null,
        fileName: item.fileName,
        mimeType: item.mimeType,
        fileSize: item.fileSize,
        fileUrl: item.fileUrl ?? null,
        cloudinaryPublicId: item.cloudinaryPublicId ?? null,
        cloudinaryResourceType: item.cloudinaryResourceType ?? null,
        dataUrl: item.dataUrl ?? null,
        uploadedAt: parseDate(item.uploadedAt) ?? new Date(),
      };
      if (existingId) {
        await tenant.studentDocumentRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.studentDocumentRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.studentDocumentRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.studentDocumentRecord.deleteMany();
  },
});

export const generatedReportsDomain = buildDomainBridge<GeneratedReportJson>({
  storageKey: GENERATED_REPORTS_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.generatedReportRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.generatedReportRecord.findMany({ orderBy: { generatedAt: "desc" } });
    return rows.map((row) => ({
      id: row.legacyId,
      type: row.reportType,
      title: row.title,
      generatedAt: row.generatedAt.toISOString(),
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      format: row.format,
      sizeBytes: row.sizeBytes,
      rowCount: row.rowCount,
      fileName: row.fileName,
      mimeType: row.mimeType,
      content: row.content,
    }));
  },
  saveItems: async (tenant, items) => {
    const existing = await tenant.generatedReportRecord.findMany({ select: { id: true, legacyId: true } });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        reportType: item.type,
        title: item.title,
        generatedAt: parseDate(item.generatedAt) ?? new Date(),
        dateFrom: item.dateFrom,
        dateTo: item.dateTo,
        format: item.format,
        sizeBytes: item.sizeBytes,
        rowCount: item.rowCount,
        fileName: item.fileName,
        mimeType: item.mimeType,
        content: item.content,
      };
      if (existingId) {
        await tenant.generatedReportRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.generatedReportRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.generatedReportRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.generatedReportRecord.deleteMany();
  },
});

export const activeAlertsDomain = buildDomainBridge<ActiveAlertJson>({
  storageKey: ACTIVE_ALERTS_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.activeAlertRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.activeAlertRecord.findMany({ orderBy: { alertCreatedAt: "desc" } });
    return rows.map((row) => ({
      id: row.legacyId,
      type: row.alertType,
      title: row.title,
      message: row.message,
      severity: row.severity,
      createdAt: row.alertCreatedAt.toISOString(),
      read: row.isRead,
      dismissed: row.isDismissed,
      channels: Array.isArray(row.channels) ? (row.channels as string[]) : [],
      fingerprint: row.fingerprint,
      studentId: row.studentLegacyId ?? undefined,
      className: row.className ?? undefined,
    }));
  },
  saveItems: async (tenant, items) => {
    const existing = await tenant.activeAlertRecord.findMany({ select: { id: true, legacyId: true } });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        alertType: item.type,
        title: item.title,
        message: item.message,
        severity: item.severity,
        alertCreatedAt: parseDate(item.createdAt) ?? new Date(),
        isRead: item.read ?? false,
        isDismissed: item.dismissed ?? false,
        channels: item.channels ?? [],
        fingerprint: item.fingerprint ?? "",
        studentLegacyId: item.studentId ?? null,
        className: item.className ?? null,
      };
      if (existingId) {
        await tenant.activeAlertRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.activeAlertRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.activeAlertRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.activeAlertRecord.deleteMany();
  },
});

export const alertDispatchLogDomain = buildDomainBridge<DispatchLogJson>({
  storageKey: ALERT_DISPATCH_LOG_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.alertDispatchLogRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.alertDispatchLogRecord.findMany({ orderBy: { dispatchedAt: "desc" } });
    return rows.map((row) => ({
      id: row.legacyId,
      fingerprint: row.fingerprint,
      channel: row.channel,
      dispatchedAt: row.dispatchedAt.toISOString(),
    }));
  },
  saveItems: async (tenant, rawItems) => {
    const items = withStableIds(
      rawItems as Array<Omit<DispatchLogJson, "id"> & { id?: string }>,
      (item, index) =>
        `${item.fingerprint}_${item.channel}_${item.dispatchedAt ?? index}`,
    ) as DispatchLogJson[];
    const existing = await tenant.alertDispatchLogRecord.findMany({ select: { id: true, legacyId: true } });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        fingerprint: item.fingerprint,
        channel: item.channel,
        dispatchedAt: parseDate(item.dispatchedAt) ?? new Date(),
      };
      if (existingId) {
        await tenant.alertDispatchLogRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.alertDispatchLogRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.alertDispatchLogRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.alertDispatchLogRecord.deleteMany();
  },
});

export const timetableDomain = buildDomainBridge<TimetableEntryJson>({
  storageKey: TIMETABLE_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.timetableEntryRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.timetableEntryRecord.findMany({ orderBy: { sortOrder: "asc" } });
    return rows.map((row) => row.payload as TimetableEntryJson);
  },
  saveItems: async (tenant, items) => {
    const existing = await tenant.timetableEntryRecord.findMany({ select: { id: true, legacyId: true } });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        sortOrder: items.findIndex((entry) => entry.id === item.id),
        payload: item as never,
      };
      if (existingId) {
        await tenant.timetableEntryRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.timetableEntryRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.timetableEntryRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.timetableEntryRecord.deleteMany();
  },
});

export const schoolAssignmentsDomain = buildDomainBridge<SchoolAssignmentJson>({
  storageKey: SCHOOL_ASSIGNMENTS_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.schoolAssignmentRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.schoolAssignmentRecord.findMany({ orderBy: { dueDate: "asc" } });
    return rows.map((row) => ({
      id: row.legacyId,
      title: row.title,
      className: row.className,
      dueDate: row.dueDate,
      status: row.status,
    }));
  },
  saveItems: async (tenant, items) => {
    const existing = await tenant.schoolAssignmentRecord.findMany({ select: { id: true, legacyId: true } });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        title: item.title,
        className: item.className,
        dueDate: item.dueDate,
        status: item.status,
      };
      if (existingId) {
        await tenant.schoolAssignmentRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.schoolAssignmentRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.schoolAssignmentRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.schoolAssignmentRecord.deleteMany();
  },
});
