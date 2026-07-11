import type { PrismaClient } from "@prisma/tenant-client";

import { getTenantPrisma } from "@/lib/tenant-prisma";
import { getSchoolDatabaseName } from "@/lib/server/schools";
import { buildSchoolClassId } from "@/lib/school-classes-sync";
import type { SchoolClass } from "@/lib/school-context";

export const CLASSES_STORAGE_KEY = "school_classes";

async function getOrCreateDefaultAcademicYear(tenant: PrismaClient) {
  const existing = await tenant.academicYear.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return tenant.academicYear.create({
    data: {
      label: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      startsAt: new Date(`${new Date().getFullYear()}-09-01`),
      endsAt: new Date(`${new Date().getFullYear() + 1}-06-30`),
      isActive: true,
    },
  });
}

function toSchoolClassJson(row: {
  legacyId: string | null;
  name: string;
  section: string | null;
  inChargeName: string;
  studentCount: number;
  isManual: boolean;
}): SchoolClass | null {
  if (!row.legacyId) return null;
  return {
    id: row.legacyId,
    name: row.name,
    section: row.section ?? "",
    inCharge: row.inChargeName,
    students: row.studentCount,
    isManual: row.isManual,
  };
}

export async function listClassesFromRelationalStore(
  tenant: PrismaClient,
): Promise<SchoolClass[]> {
  const rows = await tenant.schoolClass.findMany({
    where: { legacyId: { not: null } },
    orderBy: { name: "asc" },
  });

  return rows
    .map((row) => toSchoolClassJson(row))
    .filter((row): row is SchoolClass => row !== null);
}

export async function saveClassesToRelationalStore(
  tenant: PrismaClient,
  classes: SchoolClass[],
): Promise<void> {
  const academicYear = await getOrCreateDefaultAcademicYear(tenant);
  const existing = await tenant.schoolClass.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });

  const incomingIds = new Set(classes.map((item) => item.id));
  for (const row of existing) {
    if (row.legacyId && !incomingIds.has(row.legacyId)) {
      await tenant.schoolClass.delete({ where: { id: row.id } });
    }
  }

  for (const schoolClass of classes) {
    const section = schoolClass.section?.trim() || null;
    const data = {
      academicYearId: academicYear.id,
      name: schoolClass.name,
      gradeLevel: schoolClass.name,
      section,
      inChargeName: schoolClass.inCharge ?? "",
      studentCount: schoolClass.students ?? 0,
      isManual: schoolClass.isManual ?? false,
    };

    const existingClass = await tenant.schoolClass.findUnique({
      where: { legacyId: schoolClass.id },
    });

    if (existingClass) {
      await tenant.schoolClass.update({
        where: { id: existingClass.id },
        data,
      });
      continue;
    }

    await tenant.schoolClass.create({
      data: {
        legacyId: schoolClass.id,
        ...data,
      },
    });
  }

  await linkStudentsToClassRecords(tenant);
}

export async function linkStudentsToClassRecords(tenant: PrismaClient): Promise<void> {
  const classes = await tenant.schoolClass.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  const classByLegacyId = new Map(
    classes
      .filter((row) => row.legacyId)
      .map((row) => [row.legacyId as string, row.id]),
  );

  const students = await tenant.studentProfile.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true, classLabel: true, sectionLabel: true },
  });

  for (const student of students) {
    if (!student.legacyId) continue;
    const classLegacyId = buildSchoolClassId(student.classLabel, student.sectionLabel);
    const classId = classByLegacyId.get(classLegacyId) ?? null;
    await tenant.studentProfile.update({
      where: { id: student.id },
      data: { classId },
    });
  }
}

export async function getRelationalClassesJson(schoolId: string): Promise<string | null> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return null;

  const tenant = getTenantPrisma(databaseName);
  const classes = await listClassesFromRelationalStore(tenant);
  return JSON.stringify(classes);
}

export async function setRelationalClassesJson(
  schoolId: string,
  rawValue: string,
): Promise<void> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) {
    throw new Error(`No active database found for school ${schoolId}.`);
  }

  let classes: SchoolClass[];
  try {
    classes = JSON.parse(rawValue) as SchoolClass[];
  } catch {
    throw new Error("Invalid classes payload.");
  }

  const tenant = getTenantPrisma(databaseName);
  await saveClassesToRelationalStore(tenant, classes);
  await tenant.appStorage.deleteMany({ where: { key: CLASSES_STORAGE_KEY } });
}

export async function migrateLegacyClassesIfNeeded(schoolId: string): Promise<boolean> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return false;

  const tenant = getTenantPrisma(databaseName);
  return migrateLegacyClassesIfNeededForTenant(tenant);
}

async function migrateLegacyClassesIfNeededForTenant(tenant: PrismaClient): Promise<boolean> {
  const existingCount = await tenant.schoolClass.count({
    where: { legacyId: { not: null } },
  });
  if (existingCount > 0) return false;

  const legacyRow = await tenant.appStorage.findUnique({
    where: { key: CLASSES_STORAGE_KEY },
    select: { value: true },
  });
  if (!legacyRow?.value) return false;

  const classes = JSON.parse(legacyRow.value) as SchoolClass[];
  await saveClassesToRelationalStore(tenant, classes);
  await tenant.appStorage.deleteMany({ where: { key: CLASSES_STORAGE_KEY } });
  return true;
}
