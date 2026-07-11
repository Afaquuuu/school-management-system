import type { PrismaClient } from "@prisma/tenant-client";

import {
  cleanupLegacyJsonStorage,
  readLegacyJsonSingleton,
  readTransientJsonSingleton,
} from "@/lib/server/legacy-json-reader";
import { getSchoolDatabaseName } from "@/lib/server/schools";
import { getTenantPrisma } from "@/lib/tenant-prisma";

export type SettingDomainHandler = {
  storageKey: string;
  getJson: (schoolId: string) => Promise<string | null>;
  setJson: (schoolId: string, rawValue: string) => Promise<void>;
  migrateIfNeeded: (schoolId: string) => Promise<boolean>;
  deleteDomain: (tenant: PrismaClient) => Promise<void>;
};

function parsePayload(rawValue: string): unknown {
  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return rawValue;
  }
}

export function buildSettingDomainBridge(storageKey: string): SettingDomainHandler {
  return {
    storageKey,
    async getJson(schoolId) {
      const databaseName = await getSchoolDatabaseName(schoolId);
      if (!databaseName) return null;
      const tenant = getTenantPrisma(databaseName);
      return readLegacyJsonSingleton(tenant, storageKey);
    },
    async setJson(schoolId, rawValue) {
      const databaseName = await getSchoolDatabaseName(schoolId);
      if (!databaseName) {
        throw new Error(`No active database found for school ${schoolId}.`);
      }
      const tenant = getTenantPrisma(databaseName);
      const payload = parsePayload(rawValue);

      await tenant.schoolSettingRecord.upsert({
        where: { settingKey: storageKey },
        create: { settingKey: storageKey, payload: payload as never },
        update: { payload: payload as never },
      });
      await cleanupLegacyJsonStorage(tenant, storageKey);
    },
    async migrateIfNeeded(schoolId) {
      const databaseName = await getSchoolDatabaseName(schoolId);
      if (!databaseName) return false;

      const tenant = getTenantPrisma(databaseName);
      const existing = await tenant.schoolSettingRecord.findUnique({
        where: { settingKey: storageKey },
      });
      if (existing) {
        await cleanupLegacyJsonStorage(tenant, storageKey);
        return false;
      }

      const raw = await readTransientJsonSingleton(tenant, storageKey);
      if (!raw) return false;

      await tenant.schoolSettingRecord.create({
        data: {
          settingKey: storageKey,
          payload: parsePayload(raw) as never,
        },
      });
      await cleanupLegacyJsonStorage(tenant, storageKey);
      return true;
    },
    deleteDomain: async (tenant) => {
      await tenant.schoolSettingRecord.deleteMany({ where: { settingKey: storageKey } });
    },
  };
}
