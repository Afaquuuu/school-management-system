import { catalogPrisma } from "@/lib/catalog-prisma";
import { isServerDatabaseMode } from "@/lib/storage-mode";
import { getSchoolDatabaseName } from "@/lib/server/schools";
import { getTenantPrisma } from "@/lib/tenant-prisma";

async function getTenantClientForSchool(schoolId: string) {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) {
    throw new Error(`No active database found for school ${schoolId}.`);
  }
  return getTenantPrisma(databaseName);
}

export async function getTenantStorageItem(
  schoolId: string,
  key: string,
): Promise<string | null> {
  if (!isServerDatabaseMode()) return null;

  const tenant = await getTenantClientForSchool(schoolId);
  const row = await tenant.appStorage.findUnique({
    where: { key },
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

  const tenant = await getTenantClientForSchool(schoolId);
  await tenant.appStorage.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function removeTenantStorageItem(schoolId: string, key: string): Promise<void> {
  if (!isServerDatabaseMode()) return;

  const tenant = await getTenantClientForSchool(schoolId);
  await tenant.appStorage.deleteMany({
    where: { key },
  });
}

export async function getAllTenantStorage(schoolId: string): Promise<Record<string, string>> {
  if (!isServerDatabaseMode()) return {};

  const tenant = await getTenantClientForSchool(schoolId);
  const rows = await tenant.appStorage.findMany({
    select: { key: true, value: true },
  });

  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function removeAllTenantStorage(schoolId: string): Promise<void> {
  if (!isServerDatabaseMode()) return;

  const tenant = await getTenantClientForSchool(schoolId);
  await tenant.appStorage.deleteMany();
}

export async function migrateTenantStorageSchool(
  fromSchoolId: string,
  toSchoolId: string,
): Promise<void> {
  if (!isServerDatabaseMode() || fromSchoolId === toSchoolId) return;

  const fromTenant = await getTenantClientForSchool(fromSchoolId);
  const toTenant = await getTenantClientForSchool(toSchoolId);
  const rows = await fromTenant.appStorage.findMany();

  for (const row of rows) {
    await toTenant.appStorage.upsert({
      where: { key: row.key },
      create: { key: row.key, value: row.value },
      update: { value: row.value },
    });
  }

  await fromTenant.appStorage.deleteMany();
}

/** Move admin/users saved under a stale client id onto the registered school row. */
export async function repairOrphanTenantStorageForSchool(
  targetSchoolId: string,
): Promise<boolean> {
  if (!isServerDatabaseMode()) return false;

  const school = await catalogPrisma.school.findUnique({
    where: { id: targetSchoolId },
    select: { id: true },
  });
  if (!school) return false;

  const existingUsers = await getTenantStorageItem(targetSchoolId, "system_users");
  if (existingUsers) return false;

  const registeredSchoolIds = new Set(
    (await catalogPrisma.school.findMany({ select: { id: true } })).map((row) => row.id),
  );

  for (const orphanId of registeredSchoolIds) {
    if (orphanId === targetSchoolId) continue;
    const users = await getTenantStorageItem(orphanId, "system_users");
    if (!users) continue;
    await migrateTenantStorageSchool(orphanId, targetSchoolId);
    return true;
  }

  return false;
}
