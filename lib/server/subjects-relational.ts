import type { PrismaClient } from "@prisma/tenant-client";

import {
  cleanupLegacyJsonStorage,
  readLegacyJsonArray,
} from "@/lib/server/legacy-json-reader";
import { getSchoolDatabaseName } from "@/lib/server/schools";
import type { SchoolSubject } from "@/lib/school-subjects";
import { getTenantPrisma } from "@/lib/tenant-prisma";

export const SUBJECTS_STORAGE_KEY = "school_subjects";

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

function toSchoolSubjectJson(row: {
  legacyId: string | null;
  code: string;
  name: string;
  subjectStatus: string;
  createdAt: Date;
}): SchoolSubject | null {
  if (!row.legacyId) return null;

  return {
    id: row.legacyId,
    name: row.name,
    code: row.code,
    status: row.subjectStatus === "inactive" ? "inactive" : "active",
    createdAt: row.createdAt.toISOString().split("T")[0],
  };
}

export async function listSubjectsFromRelationalStore(
  tenant: PrismaClient,
): Promise<SchoolSubject[]> {
  const rows = await tenant.subject.findMany({
    where: { legacyId: { not: null } },
    orderBy: { name: "asc" },
  });

  return rows
    .map((row) => toSchoolSubjectJson(row))
    .filter((row): row is SchoolSubject => row !== null);
}

export async function saveSubjectsToRelationalStore(
  tenant: PrismaClient,
  subjects: SchoolSubject[],
): Promise<void> {
  const academicYear = await getOrCreateDefaultAcademicYear(tenant);
  const existing = await tenant.subject.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });

  const incomingIds = new Set(subjects.map((subject) => subject.id));
  for (const row of existing) {
    if (row.legacyId && !incomingIds.has(row.legacyId)) {
      await tenant.subject.delete({ where: { id: row.id } });
    }
  }

  for (const subject of subjects) {
    const data = {
      academicYearId: academicYear.id,
      code: subject.code,
      name: subject.name,
      subjectStatus: subject.status,
      isCore: true,
    };

    const current = await tenant.subject.findUnique({
      where: { legacyId: subject.id },
    });

    if (current) {
      await tenant.subject.update({
        where: { id: current.id },
        data,
      });
      continue;
    }

    await tenant.subject.create({
      data: {
        legacyId: subject.id,
        ...data,
      },
    });
  }

  await cleanupLegacyJsonStorage(tenant, SUBJECTS_STORAGE_KEY);
}

export async function getRelationalSubjectsJson(schoolId: string): Promise<string | null> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return null;

  const tenant = getTenantPrisma(databaseName);
  const subjects = await listSubjectsFromRelationalStore(tenant);
  return JSON.stringify(subjects);
}

export async function setRelationalSubjectsJson(schoolId: string, rawValue: string): Promise<void> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) {
    throw new Error(`No active database found for school ${schoolId}.`);
  }

  let subjects: SchoolSubject[];
  try {
    subjects = JSON.parse(rawValue) as SchoolSubject[];
  } catch {
    throw new Error("Invalid subjects payload.");
  }

  const tenant = getTenantPrisma(databaseName);
  await saveSubjectsToRelationalStore(tenant, subjects);
}

export async function migrateLegacySubjectsIfNeeded(schoolId: string): Promise<boolean> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return false;

  const tenant = getTenantPrisma(databaseName);
  const structuredCount = await tenant.subject.count({
    where: { legacyId: { not: null } },
  });

  const legacyItems = await readLegacyJsonArray(tenant, SUBJECTS_STORAGE_KEY);
  if (!legacyItems || legacyItems.length === 0) {
    return false;
  }

  if (structuredCount > 0) {
    await cleanupLegacyJsonStorage(tenant, SUBJECTS_STORAGE_KEY);
    return false;
  }

  await saveSubjectsToRelationalStore(tenant, legacyItems as SchoolSubject[]);
  return true;
}
