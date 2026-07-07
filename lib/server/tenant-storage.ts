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
