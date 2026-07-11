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

/** Domains with dedicated relational tables (not generic JSON store). */
export const STRUCTURED_STORAGE_KEYS = new Set([
  STUDENTS_STORAGE_KEY,
  CLASSES_STORAGE_KEY,
  STAFF_STORAGE_KEY,
  ACCOUNTS_STORAGE_KEY,
  ANNOUNCEMENTS_STORAGE_KEY,
  SUBJECTS_STORAGE_KEY,
]);

/** App keys stored as one row per JSON array item in StoredJsonItem. */
export const ARRAY_JSON_STORAGE_KEYS = new Set([
  "attendance_records",
  "exam_cycles",
  "exam_schedules",
  "exam_marks",
  "finance_invoices",
  "school_messages",
  "teacher_check_ins",
  "school_resources",
  "student_documents",
  "generated_reports",
  "active_alerts",
  "alert_dispatch_log",
  "weekly_timetable",
  "school_assignments",
]);

/** App keys stored as a single JSON document in StoredJsonSingleton. */
export const SINGLETON_JSON_STORAGE_KEYS = new Set([
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
]);

export function isStructuredStorageKey(key: string): boolean {
  return STRUCTURED_STORAGE_KEYS.has(key);
}

export function isArrayJsonStorageKey(key: string): boolean {
  return ARRAY_JSON_STORAGE_KEYS.has(key);
}

export function isSingletonJsonStorageKey(key: string): boolean {
  return SINGLETON_JSON_STORAGE_KEYS.has(key);
}

export function isManagedJsonStorageKey(key: string): boolean {
  return isArrayJsonStorageKey(key) || isSingletonJsonStorageKey(key);
}
