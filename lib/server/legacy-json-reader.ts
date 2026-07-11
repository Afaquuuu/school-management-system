import type { PrismaClient } from "@prisma/tenant-client";

export async function readTransientJsonSingleton(
  tenant: PrismaClient,
  storageKey: string,
): Promise<string | null> {
  const singleton = await tenant.storedJsonSingleton.findUnique({
    where: { storageKey },
    select: { payload: true },
  });
  if (singleton) {
    if (typeof singleton.payload === "string") return singleton.payload;
    return JSON.stringify(singleton.payload);
  }

  const legacyRow = await tenant.appStorage.findUnique({
    where: { key: storageKey },
    select: { value: true },
  });
  return legacyRow?.value ?? null;
}

export async function readLegacyJsonSingleton(
  tenant: PrismaClient,
  storageKey: string,
): Promise<string | null> {
  const setting = await tenant.schoolSettingRecord.findUnique({
    where: { settingKey: storageKey },
    select: { payload: true },
  });
  if (setting) {
    if (typeof setting.payload === "string") return setting.payload;
    return JSON.stringify(setting.payload);
  }

  return readTransientJsonSingleton(tenant, storageKey);
}

export async function cleanupLegacyJsonStorage(
  tenant: PrismaClient,
  storageKey: string,
): Promise<void> {
  await tenant.storedJsonItem.deleteMany({ where: { storageKey } });
  await tenant.storedJsonSingleton.deleteMany({ where: { storageKey } });
  await tenant.appStorage.deleteMany({ where: { key: storageKey } });
}

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

  const rawSingleton = await readLegacyJsonSingleton(tenant, storageKey);
  if (rawSingleton) {
    try {
      const parsed = JSON.parse(rawSingleton) as unknown;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return null;
    }
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
