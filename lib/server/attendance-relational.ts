import type { PrismaClient } from "@prisma/tenant-client";

import {
  buildDomainBridge,
  parseDate,
  syncLegacyRows,
  type StructuredDomainHandler,
} from "@/lib/server/domain-table-bridge";

export const ATTENDANCE_STORAGE_KEY = "attendance_records";

type AttendanceJson = {
  id: string;
  date: string;
  class: string;
  studentId: string;
  studentName: string;
  status: string;
  remarks: string;
  savedAt: string;
};

function toJson(row: {
  legacyId: string;
  sessionDate: string;
  classLabel: string;
  studentLegacyId: string;
  studentName: string;
  status: string;
  remarks: string;
  savedAt: Date;
}): AttendanceJson {
  return {
    id: row.legacyId,
    date: row.sessionDate,
    class: row.classLabel,
    studentId: row.studentLegacyId,
    studentName: row.studentName,
    status: row.status,
    remarks: row.remarks,
    savedAt: row.savedAt.toISOString(),
  };
}

async function listItems(tenant: PrismaClient): Promise<AttendanceJson[]> {
  const rows = await tenant.attendanceEntry.findMany({
    orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toJson);
}

async function saveItems(tenant: PrismaClient, items: AttendanceJson[]): Promise<void> {
  const existing = await tenant.attendanceEntry.findMany({
    select: { id: true, legacyId: true },
  });

  await syncLegacyRows(
    tenant,
    items,
    existing,
    async (item, existingId) => {
      const data = {
        sessionDate: item.date,
        classLabel: item.class,
        studentLegacyId: item.studentId,
        studentName: item.studentName,
        status: item.status,
        remarks: item.remarks ?? "",
        savedAt: parseDate(item.savedAt) ?? new Date(),
      };

      if (existingId) {
        await tenant.attendanceEntry.update({ where: { id: existingId }, data });
        return;
      }

      await tenant.attendanceEntry.create({
        data: { legacyId: item.id, ...data },
      });
    },
    async (id) => {
      await tenant.attendanceEntry.delete({ where: { id } });
    },
  );
}

export const attendanceDomain = buildDomainBridge<AttendanceJson>({
  storageKey: ATTENDANCE_STORAGE_KEY,
  hasStructuredData: (tenant) =>
    tenant.attendanceEntry.count().then((count) => count > 0),
  listItems,
  saveItems,
  deleteDomain: async (tenant) => {
    await tenant.attendanceEntry.deleteMany();
  },
});

export const {
  getJson: getRelationalAttendanceJson,
  setJson: setRelationalAttendanceJson,
  migrateIfNeeded: migrateLegacyAttendanceIfNeeded,
} = attendanceDomain;
