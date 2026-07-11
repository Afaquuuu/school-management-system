import { downloadTextFile } from "@/lib/export-data";
import { BACKUP_FREQUENCIES } from "@/lib/backup-frequency";
import { getScopedItem, getScopedKey, setScopedItem } from "@/lib/school-context";
import {
  defaultSchoolSystemSettings,
  loadSchoolSystemSettings,
  type SecuritySettings,
} from "@/lib/school-settings";
import { isEmailDeliveryConfigured } from "@/lib/email-types";
import type { UserSession } from "@/lib/teacher-check-in";

const LOGIN_ATTEMPTS_KEY = "security_login_attempts";
const LAST_BACKUP_KEY = "security_last_backup_at";
const AUTOMATIC_BACKUP_KEY = "school_automatic_backup";
const PENDING_2FA_KEY = "pending_admin_2fa";

type LoginAttemptRecord = {
  count: number;
  lockedUntil?: string;
};

type PendingAdminTwoFactor = {
  schoolId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    classDepartment?: string;
  };
  code: string;
  expiresAt: string;
};

function parseBoundedInt(
  value: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function getSecuritySettings(schoolId: string): SecuritySettings {
  return loadSchoolSystemSettings(schoolId).security;
}

export function getPasswordMinLength(schoolId: string): number {
  return parseBoundedInt(
    getSecuritySettings(schoolId).passwordMinLength,
    Number(defaultSchoolSystemSettings().security.passwordMinLength),
    6,
    32,
  );
}

export function getSessionTimeoutMinutes(schoolId: string): number {
  return parseBoundedInt(
    getSecuritySettings(schoolId).sessionTimeoutMinutes,
    Number(defaultSchoolSystemSettings().security.sessionTimeoutMinutes),
    5,
    480,
  );
}

export function getLoginAttemptLimit(schoolId: string): number {
  return parseBoundedInt(
    getSecuritySettings(schoolId).loginAttemptLimit,
    Number(defaultSchoolSystemSettings().security.loginAttemptLimit),
    3,
    20,
  );
}

export function isAdminTwoFactorRequired(schoolId: string, role: string): boolean {
  return (
    getSecuritySettings(schoolId).require2faForAdmins &&
    role.toLowerCase() === "admin"
  );
}

/** 2FA only runs when enabled and SMTP is configured — avoids login lockout. */
export function shouldEnforceAdminTwoFactor(schoolId: string, role: string): boolean {
  if (!isAdminTwoFactorRequired(schoolId, role)) return false;
  const communication = loadSchoolSystemSettings(schoolId).communication;
  return isEmailDeliveryConfigured(communication);
}

export function validateSecuritySettingsInput(
  security: SecuritySettings,
): string | null {
  const sessionTimeout = Number(security.sessionTimeoutMinutes);
  const passwordMinLength = Number(security.passwordMinLength);
  const loginAttemptLimit = Number(security.loginAttemptLimit);

  if (
    Number.isNaN(sessionTimeout) ||
    sessionTimeout < 5 ||
    sessionTimeout > 480
  ) {
    return "Session timeout must be between 5 and 480 minutes.";
  }

  if (
    Number.isNaN(passwordMinLength) ||
    passwordMinLength < 6 ||
    passwordMinLength > 32
  ) {
    return "Password minimum length must be between 6 and 32 characters.";
  }

  if (
    Number.isNaN(loginAttemptLimit) ||
    loginAttemptLimit < 3 ||
    loginAttemptLimit > 20
  ) {
    return "Login attempt limit must be between 3 and 20.";
  }

  if (!(BACKUP_FREQUENCIES as readonly string[]).includes(security.backupFrequency)) {
    return "Select a valid backup frequency.";
  }

  return null;
}

export function validatePasswordPolicy(
  schoolId: string,
  password: string,
): { valid: true } | { valid: false; error: string } {
  const minLength = getPasswordMinLength(schoolId);
  if (password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters.`,
    };
  }
  return { valid: true };
}

function loadLoginAttempts(schoolId: string): Record<string, LoginAttemptRecord> {
  const stored = getScopedItem(schoolId, LOGIN_ATTEMPTS_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored) as Record<string, LoginAttemptRecord>;
  } catch {
    return {};
  }
}

function saveLoginAttempts(
  schoolId: string,
  attempts: Record<string, LoginAttemptRecord>,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getScopedKey(schoolId, LOGIN_ATTEMPTS_KEY),
    JSON.stringify(attempts),
  );
}

export function getLoginLockMessage(schoolId: string, email: string): string | null {
  const key = email.trim().toLowerCase();
  const record = loadLoginAttempts(schoolId)[key];
  if (!record?.lockedUntil) return null;

  const lockedUntil = new Date(record.lockedUntil);
  if (lockedUntil.getTime() <= Date.now()) {
    return null;
  }

  const minutesLeft = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000));
  return `Too many failed login attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`;
}

export function recordFailedLogin(schoolId: string, email: string): string | null {
  const key = email.trim().toLowerCase();
  const attempts = loadLoginAttempts(schoolId);
  const limit = getLoginAttemptLimit(schoolId);
  const current = attempts[key] ?? { count: 0 };

  if (current.lockedUntil && new Date(current.lockedUntil).getTime() > Date.now()) {
    return getLoginLockMessage(schoolId, email);
  }

  const nextCount = (current.lockedUntil ? 0 : current.count) + 1;
  if (nextCount >= limit) {
    attempts[key] = {
      count: nextCount,
      lockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    saveLoginAttempts(schoolId, attempts);
    return `Too many failed login attempts. Account locked for 15 minutes.`;
  }

  attempts[key] = { count: nextCount };
  saveLoginAttempts(schoolId, attempts);

  const remaining = limit - nextCount;
  return `Invalid password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`;
}

export function clearLoginAttempts(schoolId: string, email: string): void {
  const key = email.trim().toLowerCase();
  const attempts = loadLoginAttempts(schoolId);
  if (!attempts[key]) return;
  delete attempts[key];
  saveLoginAttempts(schoolId, attempts);
}

export function touchUserSession(session: UserSession): UserSession {
  const updated: UserSession = {
    ...session,
    lastActivityAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("user_session", JSON.stringify(updated));
  }

  return updated;
}

export function isSessionExpired(
  schoolId: string,
  session: UserSession | null,
): boolean {
  if (!session) return true;

  const timeoutMinutes = getSessionTimeoutMinutes(schoolId);
  const lastActivity = session.lastActivityAt ?? session.loginTime;
  const expiresAt = new Date(lastActivity).getTime() + timeoutMinutes * 60 * 1000;
  return Date.now() >= expiresAt;
}

function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createPendingAdminTwoFactor(input: {
  schoolId: string;
  user: PendingAdminTwoFactor["user"];
}): PendingAdminTwoFactor {
  const pending: PendingAdminTwoFactor = {
    schoolId: input.schoolId,
    user: input.user,
    code: generateVerificationCode(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(PENDING_2FA_KEY, JSON.stringify(pending));
  }

  return pending;
}

export function getPendingAdminTwoFactor(): PendingAdminTwoFactor | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(PENDING_2FA_KEY);
  if (!stored) return null;

  try {
    const pending = JSON.parse(stored) as PendingAdminTwoFactor;
    if (new Date(pending.expiresAt).getTime() <= Date.now()) {
      clearPendingAdminTwoFactor();
      return null;
    }
    return pending;
  } catch {
    return null;
  }
}

export function clearPendingAdminTwoFactor(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_2FA_KEY);
}

export function verifyPendingAdminTwoFactor(code: string): PendingAdminTwoFactor | null {
  const pending = getPendingAdminTwoFactor();
  if (!pending) return null;
  if (pending.code.trim() !== code.trim()) return null;
  clearPendingAdminTwoFactor();
  return pending;
}

function getBackupIntervalMs(frequency: string): number {
  switch (frequency) {
    case "Weekly":
      return 7 * 24 * 60 * 60 * 1000;
    case "Monthly":
      return 30 * 24 * 60 * 60 * 1000;
    case "Yearly":
      return 365 * 24 * 60 * 60 * 1000;
    case "Daily":
    default:
      return 24 * 60 * 60 * 1000;
  }
}

export function getLastBackupTimestamp(schoolId: string): string | null {
  return getScopedItem(schoolId, LAST_BACKUP_KEY);
}

function setLastBackupTimestamp(schoolId: string, timestamp: string): void {
  setScopedItem(schoolId, LAST_BACKUP_KEY, timestamp);
}

export function collectSchoolBackupData(schoolId: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    schoolId,
    exportedAt: new Date().toISOString(),
    data: {} as Record<string, string | null>,
  };

  if (typeof window === "undefined") return payload;

  const prefix = `${schoolId}_`;
  const data: Record<string, string | null> = {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    data[key.slice(prefix.length)] = localStorage.getItem(key);
  }

  const schoolsRaw = localStorage.getItem("saas_schools");
  if (schoolsRaw) {
    try {
      const schools = JSON.parse(schoolsRaw) as Array<{ id: string }>;
      payload.school = schools.find((school) => school.id === schoolId) ?? null;
    } catch {
      payload.school = null;
    }
  }

  payload.data = data;
  return payload;
}

export function downloadSchoolBackup(
  schoolId: string,
  schoolName: string,
): void {
  const payload = collectSchoolBackupData(schoolId);
  const safeName = schoolName.trim().replace(/[^\w\-]+/g, "-").toLowerCase() || "school";
  downloadTextFile(
    `${safeName}-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8",
  );
  setLastBackupTimestamp(schoolId, new Date().toISOString());
}

export function isBackupDue(schoolId: string): boolean {
  const frequency = getSecuritySettings(schoolId).backupFrequency;
  const lastBackup = getLastBackupTimestamp(schoolId);
  if (!lastBackup) return true;

  const elapsed = Date.now() - new Date(lastBackup).getTime();
  return elapsed >= getBackupIntervalMs(frequency);
}

export function getBackupStatusLabel(schoolId: string): string {
  const frequency = getSecuritySettings(schoolId).backupFrequency;
  const lastBackup = getLastBackupTimestamp(schoolId);
  if (!lastBackup) {
    return `Automatic ${frequency.toLowerCase()} backups are enabled. No backup has run yet.`;
  }

  return `Automatic ${frequency.toLowerCase()} backups enabled. Last backup: ${new Date(lastBackup).toLocaleString()}.`;
}

export function runScheduledBackupIfDue(
  schoolId: string,
  _schoolName: string,
): boolean {
  if (!isBackupDue(schoolId)) return false;

  const payload = collectSchoolBackupData(schoolId);
  setScopedItem(schoolId, AUTOMATIC_BACKUP_KEY, JSON.stringify(payload));
  setLastBackupTimestamp(schoolId, new Date().toISOString());
  return true;
}
