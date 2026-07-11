import type { PrismaClient } from "@prisma/tenant-client";

import { attendanceDomain } from "@/lib/server/attendance-relational";
import {
  examCyclesDomain,
  examMarksDomain,
  examSchedulesDomain,
} from "@/lib/server/exams-relational";
import { financeInvoicesDomain } from "@/lib/server/finance-relational";
import { messagesDomain } from "@/lib/server/messages-relational";
import {
  activeAlertsDomain,
  alertDispatchLogDomain,
  generatedReportsDomain,
  schoolAssignmentsDomain,
  schoolResourcesDomain,
  studentDocumentsDomain,
  teacherCheckInsDomain,
  timetableDomain,
} from "@/lib/server/misc-domains-relational";
import {
  ACCOUNTS_STORAGE_KEY,
} from "@/lib/server/accounts-relational";
import {
  ANNOUNCEMENTS_STORAGE_KEY,
} from "@/lib/server/announcements-relational";
import {
  CLASSES_STORAGE_KEY,
} from "@/lib/server/classes-relational";
import {
  STAFF_STORAGE_KEY,
} from "@/lib/server/staff-relational";
import {
  STUDENTS_STORAGE_KEY,
} from "@/lib/server/students-relational";
import {
  SUBJECTS_STORAGE_KEY,
} from "@/lib/server/subjects-relational";
import type { SettingDomainHandler } from "@/lib/server/settings-relational";
import { buildSettingDomainBridge } from "@/lib/server/settings-relational";

export type DomainHandler = {
  storageKey: string;
  getJson: (schoolId: string) => Promise<string | null>;
  setJson: (schoolId: string, rawValue: string) => Promise<void>;
  migrateIfNeeded: (schoolId: string) => Promise<boolean>;
  deleteDomain: (tenant: PrismaClient) => Promise<void>;
};

const ARRAY_DOMAINS: DomainHandler[] = [
  attendanceDomain,
  examCyclesDomain,
  examSchedulesDomain,
  examMarksDomain,
  financeInvoicesDomain,
  messagesDomain,
  teacherCheckInsDomain,
  schoolResourcesDomain,
  studentDocumentsDomain,
  generatedReportsDomain,
  activeAlertsDomain,
  alertDispatchLogDomain,
  timetableDomain,
  schoolAssignmentsDomain,
];

const SETTING_KEYS = [
  "school_system_settings",
  "alert_settings",
  "class_assignments",
  "timetable_period_settings",
  "timetable_bell_times",
  "timetable_class_period_settings",
  "server_backup_meta",
  "security_login_attempts",
  "school_automatic_backup",
  "security_last_backup_at",
  "whatsapp_queue_dismissed_jobs",
] as const;

const SETTING_DOMAINS: SettingDomainHandler[] = SETTING_KEYS.map((key) =>
  buildSettingDomainBridge(key),
);

export const STRUCTURED_DOMAIN_HANDLERS: DomainHandler[] = [
  ...ARRAY_DOMAINS,
  ...SETTING_DOMAINS,
];

export const STRUCTURED_STORAGE_KEYS = new Set<string>([
  STUDENTS_STORAGE_KEY,
  CLASSES_STORAGE_KEY,
  STAFF_STORAGE_KEY,
  ACCOUNTS_STORAGE_KEY,
  ANNOUNCEMENTS_STORAGE_KEY,
  SUBJECTS_STORAGE_KEY,
  ...STRUCTURED_DOMAIN_HANDLERS.map((handler) => handler.storageKey),
]);

const HANDLER_BY_KEY = new Map(
  STRUCTURED_DOMAIN_HANDLERS.map((handler) => [handler.storageKey, handler]),
);

export function getStructuredDomainHandler(key: string): DomainHandler | undefined {
  return HANDLER_BY_KEY.get(key);
}

export function isStructuredStorageKey(key: string): boolean {
  return STRUCTURED_STORAGE_KEYS.has(key);
}

export async function migrateAllStructuredDomainsIfNeeded(schoolId: string): Promise<string[]> {
  const migrated: string[] = [];
  for (const handler of STRUCTURED_DOMAIN_HANDLERS) {
    const didMigrate = await handler.migrateIfNeeded(schoolId);
    if (didMigrate) migrated.push(handler.storageKey);
  }
  return migrated;
}

export async function deleteStructuredDomain(
  schoolId: string,
  key: string,
): Promise<void> {
  const handler = getStructuredDomainHandler(key);
  if (!handler) return;

  const { getSchoolDatabaseName } = await import("@/lib/server/schools");
  const { getTenantPrisma } = await import("@/lib/tenant-prisma");
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return;
  const tenant = getTenantPrisma(databaseName);
  await handler.deleteDomain(tenant);
}
