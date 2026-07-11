import { catalogPrisma } from "@/lib/catalog-prisma";
import { isServerDatabaseMode } from "@/lib/storage-mode";
import { getSchoolDatabaseName } from "@/lib/server/schools";
import {
  ACCOUNTS_STORAGE_KEY,
  getRelationalAccountsJson,
  migrateLegacyAccountsIfNeeded,
  setRelationalAccountsJson,
} from "@/lib/server/accounts-relational";
import {
  ANNOUNCEMENTS_STORAGE_KEY,
  getRelationalAnnouncementsJson,
  migrateLegacyAnnouncementsIfNeeded,
  setRelationalAnnouncementsJson,
} from "@/lib/server/announcements-relational";
import {
  CLASSES_STORAGE_KEY,
  getRelationalClassesJson,
  migrateLegacyClassesIfNeeded,
  setRelationalClassesJson,
} from "@/lib/server/classes-relational";
import {
  getJsonStoreValue,
  listJsonStoreKeysForSchool,
  migrateAllLegacyJsonKeysIfNeeded,
  migrateLegacyJsonKeyIfNeeded,
  removeJsonStoreValue,
  setJsonStoreValue,
} from "@/lib/server/json-store-relational";
import {
  getRelationalStaffJson,
  migrateLegacyStaffIfNeeded,
  setRelationalStaffJson,
  STAFF_STORAGE_KEY,
} from "@/lib/server/staff-relational";
import {
  getRelationalStudentsJson,
  migrateLegacyStudentsIfNeeded,
  setRelationalStudentsJson,
  STUDENTS_STORAGE_KEY,
} from "@/lib/server/students-relational";
import {
  getRelationalSubjectsJson,
  migrateLegacySubjectsIfNeeded,
  setRelationalSubjectsJson,
  SUBJECTS_STORAGE_KEY,
} from "@/lib/server/subjects-relational";
import { isStructuredStorageKey, STRUCTURED_STORAGE_KEYS } from "@/lib/server/storage-keys";
import { getTenantPrisma } from "@/lib/tenant-prisma";

const RELATIONAL_KEYS = STRUCTURED_STORAGE_KEYS;

async function getTenantClientForSchool(schoolId: string) {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) {
    throw new Error(`No active database found for school ${schoolId}.`);
  }
  return getTenantPrisma(databaseName);
}

async function ensureRelationalDataMigrated(schoolId: string): Promise<void> {
  await migrateLegacyStudentsIfNeeded(schoolId);
  await migrateLegacyClassesIfNeeded(schoolId);
  await migrateLegacyStaffIfNeeded(schoolId);
  await migrateLegacyAccountsIfNeeded(schoolId);
  await migrateLegacyAnnouncementsIfNeeded(schoolId);
  await migrateLegacySubjectsIfNeeded(schoolId);
  await migrateAllLegacyJsonKeysIfNeeded(schoolId);
}

async function getRelationalJson(schoolId: string, key: string): Promise<string | null> {
  switch (key) {
    case STUDENTS_STORAGE_KEY:
      return getRelationalStudentsJson(schoolId);
    case CLASSES_STORAGE_KEY:
      return getRelationalClassesJson(schoolId);
    case STAFF_STORAGE_KEY:
      return getRelationalStaffJson(schoolId);
    case ACCOUNTS_STORAGE_KEY:
      return getRelationalAccountsJson(schoolId);
    case ANNOUNCEMENTS_STORAGE_KEY:
      return getRelationalAnnouncementsJson(schoolId);
    case SUBJECTS_STORAGE_KEY:
      return getRelationalSubjectsJson(schoolId);
    default:
      return null;
  }
}

async function setRelationalJson(schoolId: string, key: string, value: string): Promise<void> {
  switch (key) {
    case STUDENTS_STORAGE_KEY:
      await setRelationalStudentsJson(schoolId, value);
      return;
    case CLASSES_STORAGE_KEY:
      await setRelationalClassesJson(schoolId, value);
      return;
    case STAFF_STORAGE_KEY:
      await setRelationalStaffJson(schoolId, value);
      return;
    case ACCOUNTS_STORAGE_KEY:
      await setRelationalAccountsJson(schoolId, value);
      return;
    case ANNOUNCEMENTS_STORAGE_KEY:
      await setRelationalAnnouncementsJson(schoolId, value);
      return;
    case SUBJECTS_STORAGE_KEY:
      await setRelationalSubjectsJson(schoolId, value);
      return;
    default:
      throw new Error(`Unsupported relational storage key: ${key}`);
  }
}

export async function getTenantStorageItem(
  schoolId: string,
  key: string,
): Promise<string | null> {
  if (!isServerDatabaseMode()) return null;

  if (RELATIONAL_KEYS.has(key)) {
    await ensureRelationalDataMigrated(schoolId);
    return getRelationalJson(schoolId, key);
  }

  await migrateLegacyJsonKeyIfNeeded(schoolId, key);
  const jsonStoreValue = await getJsonStoreValue(schoolId, key);
  if (jsonStoreValue !== null) return jsonStoreValue;

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

  if (RELATIONAL_KEYS.has(key)) {
    await setRelationalJson(schoolId, key, value);
    return;
  }

  await setJsonStoreValue(schoolId, key, value);
}

export async function removeTenantStorageItem(schoolId: string, key: string): Promise<void> {
  if (!isServerDatabaseMode()) return;

  const tenant = await getTenantClientForSchool(schoolId);

  if (key === STUDENTS_STORAGE_KEY) {
    await tenant.studentProfile.deleteMany({ where: { legacyId: { not: null } } });
    await tenant.appStorage.deleteMany({ where: { key: STUDENTS_STORAGE_KEY } });
    return;
  }

  if (key === CLASSES_STORAGE_KEY) {
    await tenant.schoolClass.deleteMany({ where: { legacyId: { not: null } } });
    await tenant.appStorage.deleteMany({ where: { key: CLASSES_STORAGE_KEY } });
    return;
  }

  if (key === STAFF_STORAGE_KEY) {
    const profiles = await tenant.staffProfile.findMany({
      where: { legacyId: { not: null } },
      select: { userId: true },
    });
    for (const profile of profiles) {
      await tenant.user.delete({ where: { id: profile.userId } });
    }
    await tenant.appStorage.deleteMany({ where: { key: STAFF_STORAGE_KEY } });
    return;
  }

  if (key === ACCOUNTS_STORAGE_KEY) {
    await tenant.systemAccount.deleteMany();
    await tenant.appStorage.deleteMany({ where: { key: ACCOUNTS_STORAGE_KEY } });
    return;
  }

  if (key === ANNOUNCEMENTS_STORAGE_KEY) {
    await tenant.announcement.deleteMany({ where: { legacyId: { not: null } } });
    await removeJsonStoreValue(schoolId, key);
    return;
  }

  if (key === SUBJECTS_STORAGE_KEY) {
    await tenant.subject.deleteMany({ where: { legacyId: { not: null } } });
    await removeJsonStoreValue(schoolId, key);
    return;
  }

  await removeJsonStoreValue(schoolId, key);
}

export async function getAllTenantStorage(schoolId: string): Promise<Record<string, string>> {
  if (!isServerDatabaseMode()) return {};

  await ensureRelationalDataMigrated(schoolId);

  const entries: Record<string, string> = {};

  for (const key of RELATIONAL_KEYS) {
    const value = await getRelationalJson(schoolId, key);
    if (value) entries[key] = value;
  }

  const jsonKeys = await listJsonStoreKeysForSchool(schoolId);
  for (const key of jsonKeys) {
    if (isStructuredStorageKey(key)) continue;
    const value = await getJsonStoreValue(schoolId, key);
    if (value) entries[key] = value;
  }

  const tenant = await getTenantClientForSchool(schoolId);
  const rows = await tenant.appStorage.findMany({
    select: { key: true, value: true },
  });
  for (const row of rows) {
    if (!entries[row.key]) {
      entries[row.key] = row.value;
    }
  }

  return entries;
}

export async function removeAllTenantStorage(schoolId: string): Promise<void> {
  if (!isServerDatabaseMode()) return;

  const tenant = await getTenantClientForSchool(schoolId);
  await tenant.studentProfile.deleteMany({ where: { legacyId: { not: null } } });
  await tenant.schoolClass.deleteMany({ where: { legacyId: { not: null } } });

  const staffProfiles = await tenant.staffProfile.findMany({
    where: { legacyId: { not: null } },
    select: { userId: true },
  });
  for (const profile of staffProfiles) {
    await tenant.user.delete({ where: { id: profile.userId } });
  }

  await tenant.systemAccount.deleteMany();
  await tenant.announcement.deleteMany({ where: { legacyId: { not: null } } });
  await tenant.subject.deleteMany({ where: { legacyId: { not: null } } });
  await tenant.storedJsonItem.deleteMany();
  await tenant.storedJsonSingleton.deleteMany();
  await tenant.appStorage.deleteMany();
}

export async function migrateTenantStorageSchool(
  fromSchoolId: string,
  toSchoolId: string,
): Promise<void> {
  if (!isServerDatabaseMode() || fromSchoolId === toSchoolId) return;

  const fromEntries = await getAllTenantStorage(fromSchoolId);
  for (const [key, value] of Object.entries(fromEntries)) {
    await setTenantStorageItem(toSchoolId, key, value);
  }

  await removeAllTenantStorage(fromSchoolId);
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

  const existingUsers = await getTenantStorageItem(targetSchoolId, ACCOUNTS_STORAGE_KEY);
  if (existingUsers) return false;

  const registeredSchoolIds = new Set(
    (await catalogPrisma.school.findMany({ select: { id: true } })).map((row) => row.id),
  );

  for (const orphanId of registeredSchoolIds) {
    if (orphanId === targetSchoolId) continue;
    const users = await getTenantStorageItem(orphanId, ACCOUNTS_STORAGE_KEY);
    if (!users) continue;
    await migrateTenantStorageSchool(orphanId, targetSchoolId);
    return true;
  }

  return false;
}
