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
import { migrateGuardianProfilesIfNeeded } from "@/lib/server/guardians-relational";
import {
  deleteStructuredDomain,
  getStructuredDomainHandler,
  migrateAllStructuredDomainsIfNeeded,
  STRUCTURED_STORAGE_KEYS,
} from "@/lib/server/structured-domain-registry";
import { isStructuredStorageKey } from "@/lib/server/storage-keys";
import { getTenantPrisma } from "@/lib/tenant-prisma";

const CORE_RELATIONAL_KEYS = new Set([
  STUDENTS_STORAGE_KEY,
  CLASSES_STORAGE_KEY,
  STAFF_STORAGE_KEY,
  ACCOUNTS_STORAGE_KEY,
  ANNOUNCEMENTS_STORAGE_KEY,
  SUBJECTS_STORAGE_KEY,
]);

async function getTenantClientForSchool(schoolId: string) {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) {
    throw new Error(`No active database found for school ${schoolId}.`);
  }
  return getTenantPrisma(databaseName);
}

const migrationInflight = new Map<string, Promise<void>>();

async function runRelationalMigrations(schoolId: string): Promise<void> {
  await migrateLegacyStudentsIfNeeded(schoolId);
  await migrateLegacyClassesIfNeeded(schoolId);
  await migrateLegacyStaffIfNeeded(schoolId);
  await migrateLegacyAccountsIfNeeded(schoolId);
  await migrateGuardianProfilesIfNeeded(schoolId);
  await migrateLegacyAnnouncementsIfNeeded(schoolId);
  await migrateLegacySubjectsIfNeeded(schoolId);
  await migrateAllStructuredDomainsIfNeeded(schoolId);
}

async function ensureRelationalDataMigrated(schoolId: string): Promise<void> {
  let inflight = migrationInflight.get(schoolId);
  if (!inflight) {
    inflight = runRelationalMigrations(schoolId).finally(() => {
      migrationInflight.delete(schoolId);
    });
    migrationInflight.set(schoolId, inflight);
  }
  await inflight;
}

async function getCoreRelationalJson(schoolId: string, key: string): Promise<string | null> {
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

async function setCoreRelationalJson(schoolId: string, key: string, value: string): Promise<void> {
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
      throw new Error(`Unsupported core relational storage key: ${key}`);
  }
}

export async function getTenantStorageItem(
  schoolId: string,
  key: string,
): Promise<string | null> {
  if (!isServerDatabaseMode()) return null;

  if (isStructuredStorageKey(key)) {
    await ensureRelationalDataMigrated(schoolId);

    if (CORE_RELATIONAL_KEYS.has(key)) {
      return getCoreRelationalJson(schoolId, key);
    }

    const handler = getStructuredDomainHandler(key);
    if (handler) {
      return handler.getJson(schoolId);
    }
  }

  await migrateLegacyJsonKeyIfNeeded(schoolId, key);
  return getJsonStoreValue(schoolId, key);
}

export async function setTenantStorageItem(
  schoolId: string,
  key: string,
  value: string,
): Promise<void> {
  if (!isServerDatabaseMode()) return;

  if (CORE_RELATIONAL_KEYS.has(key)) {
    await setCoreRelationalJson(schoolId, key, value);
    return;
  }

  const handler = getStructuredDomainHandler(key);
  if (handler) {
    await handler.setJson(schoolId, value);
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
    const guardians = await tenant.guardianProfile.findMany({
      where: { legacyAccountId: { not: null } },
      select: { userId: true },
    });
    for (const guardian of guardians) {
      await tenant.user.delete({ where: { id: guardian.userId } });
    }
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

  if (getStructuredDomainHandler(key)) {
    await deleteStructuredDomain(schoolId, key);
    await removeJsonStoreValue(schoolId, key);
    return;
  }

  await removeJsonStoreValue(schoolId, key);
}

export async function getAllTenantStorage(schoolId: string): Promise<Record<string, string>> {
  if (!isServerDatabaseMode()) return {};

  await ensureRelationalDataMigrated(schoolId);

  const entries: Record<string, string> = {};
  const structuredKeys = [...STRUCTURED_STORAGE_KEYS];
  const structuredEntries = await Promise.all(
    structuredKeys.map(async (key) => {
      const value = await getTenantStorageItem(schoolId, key);
      return [key, value] as const;
    }),
  );

  for (const [key, value] of structuredEntries) {
    if (value) entries[key] = value;
  }

  const tenant = await getTenantClientForSchool(schoolId);
  const rows = await tenant.appStorage.findMany({
    select: { key: true, value: true },
  });
  for (const row of rows) {
    if (!entries[row.key]) entries[row.key] = row.value;
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
  await tenant.attendanceEntry.deleteMany();
  await tenant.examCycleRecord.deleteMany();
  await tenant.examScheduleRecord.deleteMany();
  await tenant.examMarkRecord.deleteMany();
  await tenant.financeInvoiceRecord.deleteMany();
  await tenant.schoolMessageRecord.deleteMany();
  await tenant.teacherCheckInRecord.deleteMany();
  await tenant.schoolResourceRecord.deleteMany();
  await tenant.studentDocumentRecord.deleteMany();
  await tenant.generatedReportRecord.deleteMany();
  await tenant.activeAlertRecord.deleteMany();
  await tenant.alertDispatchLogRecord.deleteMany();
  await tenant.timetableEntryRecord.deleteMany();
  await tenant.schoolAssignmentRecord.deleteMany();
  await tenant.schoolSettingRecord.deleteMany();
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
