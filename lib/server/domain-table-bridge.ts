import type { PrismaClient } from "@prisma/tenant-client";

import {
  cleanupLegacyJsonStorage,
  readLegacyJsonArray,
} from "@/lib/server/legacy-json-reader";
import { getSchoolDatabaseName } from "@/lib/server/schools";
import { getTenantPrisma } from "@/lib/tenant-prisma";

export type StructuredDomainHandler = {
  storageKey: string;
  getJson: (schoolId: string) => Promise<string | null>;
  setJson: (schoolId: string, rawValue: string) => Promise<void>;
  migrateIfNeeded: (schoolId: string) => Promise<boolean>;
  deleteDomain: (tenant: PrismaClient) => Promise<void>;
};

export async function syncLegacyRows<TItem extends { id: string }>(
  tenant: PrismaClient,
  items: TItem[],
  existing: Array<{ id: string; legacyId: string | null }>,
  upsertItem: (item: TItem, existingId?: string) => Promise<void>,
  deleteRow: (id: string) => Promise<void>,
): Promise<void> {
  const incomingIds = new Set(items.map((item) => item.id));

  for (const row of existing) {
    if (row.legacyId && !incomingIds.has(row.legacyId)) {
      await deleteRow(row.id);
    }
  }

  for (const item of items) {
    const current = existing.find((row) => row.legacyId === item.id);
    await upsertItem(item, current?.id);
  }
}

export function parseDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function buildDomainBridge<TItem extends { id: string }>(config: {
  storageKey: string;
  hasStructuredData: (tenant: PrismaClient) => Promise<boolean>;
  listItems: (tenant: PrismaClient) => Promise<TItem[]>;
  saveItems: (tenant: PrismaClient, items: TItem[]) => Promise<void>;
  deleteDomain: (tenant: PrismaClient) => Promise<void>;
}): StructuredDomainHandler {
  const { storageKey } = config;

  async function getTenantForSchool(schoolId: string) {
    const databaseName = await getSchoolDatabaseName(schoolId);
    if (!databaseName) {
      throw new Error(`No active database found for school ${schoolId}.`);
    }
    return getTenantPrisma(databaseName);
  }

  return {
    storageKey,
    async getJson(schoolId) {
      const databaseName = await getSchoolDatabaseName(schoolId);
      if (!databaseName) return null;
      const tenant = getTenantPrisma(databaseName);
      const items = await config.listItems(tenant);
      return JSON.stringify(items);
    },
    async setJson(schoolId, rawValue) {
      let items: TItem[];
      try {
        items = JSON.parse(rawValue) as TItem[];
      } catch {
        throw new Error(`Invalid payload for ${storageKey}.`);
      }
      const tenant = await getTenantForSchool(schoolId);
      await config.saveItems(tenant, items);
      await cleanupLegacyJsonStorage(tenant, storageKey);
    },
    async migrateIfNeeded(schoolId) {
      const databaseName = await getSchoolDatabaseName(schoolId);
      if (!databaseName) return false;

      const tenant = getTenantPrisma(databaseName);
      const hasStructured = await config.hasStructuredData(tenant);
      const legacyItems = await readLegacyJsonArray(tenant, storageKey);
      if (!legacyItems || legacyItems.length === 0) {
        return false;
      }

      if (hasStructured) {
        await cleanupLegacyJsonStorage(tenant, storageKey);
        return false;
      }

      await config.saveItems(tenant, legacyItems as TItem[]);
      return true;
    },
    deleteDomain: config.deleteDomain,
  };
}
