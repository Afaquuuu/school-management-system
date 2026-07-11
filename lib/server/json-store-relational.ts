import type { PrismaClient } from "@prisma/tenant-client";

import { getSchoolDatabaseName } from "@/lib/server/schools";
import {
  isArrayJsonStorageKey,
  isManagedJsonStorageKey,
  isSingletonJsonStorageKey,
  isStructuredStorageKey,
} from "@/lib/server/storage-keys";
import { getTenantPrisma } from "@/lib/tenant-prisma";

function extractItemId(item: unknown, index: number): string {
  if (item && typeof item === "object" && item !== null && "id" in item) {
    const id = (item as { id: unknown }).id;
    if (typeof id === "string" && id.trim()) return id;
    if (typeof id === "number") return String(id);
  }
  return `row_${index}`;
}

function parseLegacyPayload(rawValue: string): unknown {
  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return rawValue;
  }
}

async function listArrayJson(tenant: PrismaClient, storageKey: string): Promise<string | null> {
  const rows = await tenant.storedJsonItem.findMany({
    where: { storageKey },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (rows.length === 0) return null;
  return JSON.stringify(rows.map((row) => row.payload));
}

async function saveArrayJson(
  tenant: PrismaClient,
  storageKey: string,
  rawValue: string,
): Promise<void> {
  let items: unknown[];
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Expected JSON array.");
    }
    items = parsed;
  } catch {
    throw new Error(`Invalid array payload for ${storageKey}.`);
  }

  const existing = await tenant.storedJsonItem.findMany({
    where: { storageKey },
    select: { id: true, legacyId: true },
  });

  const incomingIds = new Set<string>();
  for (let index = 0; index < items.length; index += 1) {
    const legacyId = extractItemId(items[index], index);
    incomingIds.add(legacyId);

    const data = {
      storageKey,
      legacyId,
      sortOrder: index,
      payload: items[index] as never,
    };

    const current = existing.find((row) => row.legacyId === legacyId);
    if (current) {
      await tenant.storedJsonItem.update({
        where: { id: current.id },
        data,
      });
      continue;
    }

    await tenant.storedJsonItem.create({ data });
  }

  for (const row of existing) {
    if (!incomingIds.has(row.legacyId)) {
      await tenant.storedJsonItem.delete({ where: { id: row.id } });
    }
  }

  await tenant.appStorage.deleteMany({ where: { key: storageKey } });
}

async function getSingletonJson(tenant: PrismaClient, storageKey: string): Promise<string | null> {
  const row = await tenant.storedJsonSingleton.findUnique({
    where: { storageKey },
    select: { payload: true },
  });
  if (!row) return null;

  const payload = row.payload;
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
}

async function saveSingletonJson(
  tenant: PrismaClient,
  storageKey: string,
  rawValue: string,
): Promise<void> {
  const payload = parseLegacyPayload(rawValue);

  await tenant.storedJsonSingleton.upsert({
    where: { storageKey },
    create: { storageKey, payload: payload as never },
    update: { payload: payload as never },
  });

  await tenant.appStorage.deleteMany({ where: { key: storageKey } });
}

async function migrateLegacyJsonKey(tenant: PrismaClient, storageKey: string): Promise<boolean> {
  if (isStructuredStorageKey(storageKey)) return false;

  const hasArrayRows = await tenant.storedJsonItem.count({ where: { storageKey } });
  const hasSingleton = await tenant.storedJsonSingleton.findUnique({
    where: { storageKey },
    select: { storageKey: true },
  });
  if (hasArrayRows > 0 || hasSingleton) return false;

  const legacyRow = await tenant.appStorage.findUnique({
    where: { key: storageKey },
    select: { value: true },
  });
  if (!legacyRow?.value) return false;

  const parsed = parseLegacyPayload(legacyRow.value);
  const useArrayStore =
    isArrayJsonStorageKey(storageKey) ||
    (!isSingletonJsonStorageKey(storageKey) && Array.isArray(parsed));

  if (useArrayStore && Array.isArray(parsed)) {
    await saveArrayJson(tenant, storageKey, JSON.stringify(parsed));
    return true;
  }

  await saveSingletonJson(tenant, storageKey, legacyRow.value);
  return true;
}

export async function migrateAllLegacyJsonKeysForTenant(
  tenant: PrismaClient,
): Promise<string[]> {
  const migrated: string[] = [];
  const legacyRows = await tenant.appStorage.findMany({
    select: { key: true },
    orderBy: { key: "asc" },
  });

  for (const row of legacyRows) {
    if (isStructuredStorageKey(row.key)) continue;
    const didMigrate = await migrateLegacyJsonKey(tenant, row.key);
    if (didMigrate) migrated.push(row.key);
  }

  return migrated;
}

export async function migrateLegacyJsonKeyIfNeeded(
  schoolId: string,
  storageKey: string,
): Promise<boolean> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName || isStructuredStorageKey(storageKey)) return false;

  const tenant = getTenantPrisma(databaseName);
  return migrateLegacyJsonKey(tenant, storageKey);
}

export async function migrateAllLegacyJsonKeysIfNeeded(schoolId: string): Promise<string[]> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return [];

  const tenant = getTenantPrisma(databaseName);
  return migrateAllLegacyJsonKeysForTenant(tenant);
}

export async function getJsonStoreValue(schoolId: string, storageKey: string): Promise<string | null> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName || isStructuredStorageKey(storageKey)) return null;

  await migrateLegacyJsonKeyIfNeeded(schoolId, storageKey);

  const tenant = getTenantPrisma(databaseName);
  if (isArrayJsonStorageKey(storageKey)) {
    const arrayValue = await listArrayJson(tenant, storageKey);
    if (arrayValue) return arrayValue;

    const singletonValue = await getSingletonJson(tenant, storageKey);
    if (singletonValue) {
      try {
        const parsed = JSON.parse(singletonValue) as unknown;
        if (Array.isArray(parsed)) return singletonValue;
      } catch {
        // ignore invalid singleton payloads
      }
    }
    return null;
  }

  if (isSingletonJsonStorageKey(storageKey)) {
    return getSingletonJson(tenant, storageKey);
  }

  const arrayValue = await listArrayJson(tenant, storageKey);
  if (arrayValue) return arrayValue;
  return getSingletonJson(tenant, storageKey);
}

export async function setJsonStoreValue(
  schoolId: string,
  storageKey: string,
  rawValue: string,
): Promise<void> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) {
    throw new Error(`No active database found for school ${schoolId}.`);
  }
  if (isStructuredStorageKey(storageKey)) {
    throw new Error(`Storage key ${storageKey} uses structured relational tables.`);
  }

  const tenant = getTenantPrisma(databaseName);

  if (isArrayJsonStorageKey(storageKey)) {
    await saveArrayJson(tenant, storageKey, rawValue);
    return;
  }

  if (isSingletonJsonStorageKey(storageKey)) {
    await saveSingletonJson(tenant, storageKey, rawValue);
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue) as unknown;
  } catch {
    await saveSingletonJson(tenant, storageKey, rawValue);
    return;
  }

  if (Array.isArray(parsed)) {
    await saveArrayJson(tenant, storageKey, rawValue);
    return;
  }

  await saveSingletonJson(tenant, storageKey, rawValue);
}

export async function removeJsonStoreValue(schoolId: string, storageKey: string): Promise<void> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return;

  const tenant = getTenantPrisma(databaseName);
  await tenant.storedJsonItem.deleteMany({ where: { storageKey } });
  await tenant.storedJsonSingleton.deleteMany({ where: { storageKey } });
  await tenant.appStorage.deleteMany({ where: { key: storageKey } });
}

export async function listJsonStoreKeysForSchool(schoolId: string): Promise<string[]> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return [];

  const tenant = getTenantPrisma(databaseName);
  const itemKeys = await tenant.storedJsonItem.findMany({
    distinct: ["storageKey"],
    select: { storageKey: true },
  });
  const singletonKeys = await tenant.storedJsonSingleton.findMany({
    select: { storageKey: true },
  });

  return [...new Set([
    ...itemKeys.map((row) => row.storageKey),
    ...singletonKeys.map((row) => row.storageKey),
  ])];
}

export function isJsonBackedStorageKey(key: string): boolean {
  return !isStructuredStorageKey(key);
}
