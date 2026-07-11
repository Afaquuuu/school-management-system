import type { PrismaClient } from "@prisma/tenant-client";

import {
  buildDomainBridge,
  parseDate,
  syncLegacyRows,
} from "@/lib/server/domain-table-bridge";

export const EXAM_CYCLES_STORAGE_KEY = "exam_cycles";
export const EXAM_SCHEDULES_STORAGE_KEY = "exam_schedules";
export const EXAM_MARKS_STORAGE_KEY = "exam_marks";

type ExamCycleJson = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  description: string;
};

type ExamScheduleJson = {
  id: string;
  cycleId: string;
  className: string;
  subjectId: string;
  examDate: string;
  examTime: string;
  duration: number;
  maxMarks: number;
  venue: string;
};

type ExamMarkJson = {
  id: string;
  studentId: string;
  cycleId: string;
  className: string;
  section: string;
  subjectId: string;
  marksObtained: number;
  remarks: string;
  enteredBy: string;
  enteredAt: string;
};

export const examCyclesDomain = buildDomainBridge<ExamCycleJson>({
  storageKey: EXAM_CYCLES_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.examCycleRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.examCycleRecord.findMany({ orderBy: { startDate: "asc" } });
    return rows.map((row) => ({
      id: row.legacyId,
      name: row.name,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.cycleStatus,
      description: row.description,
    }));
  },
  saveItems: async (tenant, items) => {
    const existing = await tenant.examCycleRecord.findMany({ select: { id: true, legacyId: true } });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        name: item.name,
        startDate: item.startDate,
        endDate: item.endDate,
        cycleStatus: item.status,
        description: item.description ?? "",
      };
      if (existingId) {
        await tenant.examCycleRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.examCycleRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.examCycleRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.examCycleRecord.deleteMany();
  },
});

export const examSchedulesDomain = buildDomainBridge<ExamScheduleJson>({
  storageKey: EXAM_SCHEDULES_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.examScheduleRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.examScheduleRecord.findMany({ orderBy: { examDate: "asc" } });
    return rows.map((row) => ({
      id: row.legacyId,
      cycleId: row.cycleLegacyId,
      className: row.className,
      subjectId: row.subjectLegacyId,
      examDate: row.examDate,
      examTime: row.examTime,
      duration: row.duration,
      maxMarks: row.maxMarks,
      venue: row.venue,
    }));
  },
  saveItems: async (tenant, items) => {
    const existing = await tenant.examScheduleRecord.findMany({ select: { id: true, legacyId: true } });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        cycleLegacyId: item.cycleId,
        className: item.className,
        subjectLegacyId: item.subjectId,
        examDate: item.examDate,
        examTime: item.examTime,
        duration: item.duration,
        maxMarks: item.maxMarks,
        venue: item.venue ?? "",
      };
      if (existingId) {
        await tenant.examScheduleRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.examScheduleRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.examScheduleRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.examScheduleRecord.deleteMany();
  },
});

export const examMarksDomain = buildDomainBridge<ExamMarkJson>({
  storageKey: EXAM_MARKS_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.examMarkRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.examMarkRecord.findMany({ orderBy: { enteredAt: "desc" } });
    return rows.map((row) => ({
      id: row.legacyId,
      studentId: row.studentLegacyId,
      cycleId: row.cycleLegacyId,
      className: row.className,
      section: row.section,
      subjectId: row.subjectLegacyId,
      marksObtained: row.marksObtained,
      remarks: row.remarks,
      enteredBy: row.enteredBy,
      enteredAt: row.enteredAt.toISOString(),
    }));
  },
  saveItems: async (tenant, items) => {
    const existing = await tenant.examMarkRecord.findMany({ select: { id: true, legacyId: true } });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        studentLegacyId: item.studentId,
        cycleLegacyId: item.cycleId,
        className: item.className,
        section: item.section ?? "",
        subjectLegacyId: item.subjectId,
        marksObtained: item.marksObtained,
        remarks: item.remarks ?? "",
        enteredBy: item.enteredBy ?? "",
        enteredAt: parseDate(item.enteredAt) ?? new Date(),
      };
      if (existingId) {
        await tenant.examMarkRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.examMarkRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.examMarkRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.examMarkRecord.deleteMany();
  },
});
