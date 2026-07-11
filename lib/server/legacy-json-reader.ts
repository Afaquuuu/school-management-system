import type { PrismaClient } from "@prisma/tenant-client";

export async function readLegacyJsonArray(
  tenant: PrismaClient,
  storageKey: string,
): Promise<unknown[] | null> {
  const items = await tenant.storedJsonItem.findMany({
    where: { storageKey },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (items.length > 0) {
    return items.map((row) => row.payload);
  }

  const singleton = await tenant.storedJsonSingleton.findUnique({
    where: { storageKey },
    select: { payload: true },
  });
  if (singleton && Array.isArray(singleton.payload)) {
    return singleton.payload as unknown[];
  }

  const legacyRow = await tenant.appStorage.findUnique({
    where: { key: storageKey },
    select: { value: true },
  });
  if (!legacyRow?.value) return null;

  try {
    const parsed = JSON.parse(legacyRow.value) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function cleanupLegacyJsonStorage(
  tenant: PrismaClient,
  storageKey: string,
): Promise<void> {
  await tenant.storedJsonItem.deleteMany({ where: { storageKey } });
  await tenant.storedJsonSingleton.deleteMany({ where: { storageKey } });
  await tenant.appStorage.deleteMany({ where: { key: storageKey } });
}
