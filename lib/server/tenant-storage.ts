import { prisma } from "@/lib/prisma";
import { isServerDatabaseMode } from "@/lib/storage-mode";

export async function getTenantStorageItem(
  schoolId: string,
  key: string,
): Promise<string | null> {
  if (!isServerDatabaseMode()) return null;

  const row = await prisma.tenantStorage.findUnique({
    where: {
      schoolId_key: { schoolId, key },
    },
    select: { value: true },
  });

  return row?.value ?? null;
}

export async function setTenantStorageItem(
  schoolId: string,
  key: string,
  value: string,
): Promise<void> {
  if (!isServerDatabaseMode()) return;

  await prisma.tenantStorage.upsert({
    where: {
      schoolId_key: { schoolId, key },
    },
    create: { schoolId, key, value },
    update: { value },
  });
}

export async function removeTenantStorageItem(schoolId: string, key: string): Promise<void> {
  if (!isServerDatabaseMode()) return;

  await prisma.tenantStorage.deleteMany({
    where: { schoolId, key },
  });
}

export async function getAllTenantStorage(schoolId: string): Promise<Record<string, string>> {
  if (!isServerDatabaseMode()) return {};

  const rows = await prisma.tenantStorage.findMany({
    where: { schoolId },
    select: { key: true, value: true },
  });

  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function removeAllTenantStorage(schoolId: string): Promise<void> {
  if (!isServerDatabaseMode()) return;

  await prisma.tenantStorage.deleteMany({
    where: { schoolId },
  });
}

export async function migrateTenantStorageSchool(
  fromSchoolId: string,
  toSchoolId: string,
): Promise<void> {
  if (!isServerDatabaseMode() || fromSchoolId === toSchoolId) return;

  const rows = await prisma.tenantStorage.findMany({
    where: { schoolId: fromSchoolId },
  });

  for (const row of rows) {
    await prisma.tenantStorage.upsert({
      where: {
        schoolId_key: { schoolId: toSchoolId, key: row.key },
      },
      create: { schoolId: toSchoolId, key: row.key, value: row.value },
      update: { value: row.value },
    });
  }

  await prisma.tenantStorage.deleteMany({
    where: { schoolId: fromSchoolId },
  });
}

/** Move admin/users saved under a stale client id onto the registered school row. */
export async function repairOrphanTenantStorageForSchool(
  targetSchoolId: string,
): Promise<boolean> {
  if (!isServerDatabaseMode()) return false;

  const school = await prisma.school.findUnique({
    where: { id: targetSchoolId },
    select: { id: true },
  });
  if (!school) return false;

  const existingUsers = await getTenantStorageItem(targetSchoolId, "system_users");
  if (existingUsers) return false;

  const registeredSchoolIds = new Set(
    (await prisma.school.findMany({ select: { id: true } })).map((row) => row.id),
  );

  const orphanSchoolIds = await prisma.tenantStorage.findMany({
    where: { schoolId: { notIn: Array.from(registeredSchoolIds) } },
    distinct: ["schoolId"],
    select: { schoolId: true },
  });

  for (const { schoolId: orphanId } of orphanSchoolIds) {
    const users = await getTenantStorageItem(orphanId, "system_users");
    if (!users) continue;

    await migrateTenantStorageSchool(orphanId, targetSchoolId);
    return true;
  }

  return false;
}
