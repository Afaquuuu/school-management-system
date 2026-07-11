import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

import {
  formatBackupFrequencyLabel,
  isBackupDue,
  isBackupFrequency,
  type BackupFrequency,
} from "@/lib/backup-frequency";
import { buildTenantDatabaseUrl } from "@/lib/database-url";
import { catalogPrisma } from "@/lib/catalog-prisma";
import { getSchoolDatabaseName } from "@/lib/server/schools";
import {
  getTenantStorageItem,
  setTenantStorageItem,
} from "@/lib/server/tenant-storage";
import { isServerDatabaseMode } from "@/lib/storage-mode";

const BACKUP_META_KEY = "server_backup_meta";
const MAX_BACKUPS_PER_SCHOOL = 12;

export type SchoolBackupMeta = {
  lastAt: string | null;
  lastFile: string | null;
  frequency: BackupFrequency;
  lastSizeBytes: number | null;
};

export type SchoolBackupFile = {
  filename: string;
  createdAt: string;
  sizeBytes: number;
};

function getBackupRoot(): string {
  return path.join(process.cwd(), ".backups");
}

function getSchoolBackupDir(schoolId: string): string {
  return path.join(getBackupRoot(), schoolId);
}

function slugifySchoolName(name: string): string {
  return name.trim().replace(/[^\w\-]+/g, "-").toLowerCase() || "school";
}

function parseDatabaseUrl(databaseUrl: string): {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
} {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
}

export async function loadSchoolBackupFrequency(schoolId: string): Promise<BackupFrequency> {
  const raw = await getTenantStorageItem(schoolId, "school_system_settings");
  if (!raw) return "Daily";

  try {
    const settings = JSON.parse(raw) as {
      security?: { backupFrequency?: string };
    };
    const frequency = settings.security?.backupFrequency ?? "Daily";
    return isBackupFrequency(frequency) ? frequency : "Daily";
  } catch {
    return "Daily";
  }
}

export async function loadSchoolBackupMeta(schoolId: string): Promise<SchoolBackupMeta> {
  const frequency = await loadSchoolBackupFrequency(schoolId);
  const raw = await getTenantStorageItem(schoolId, BACKUP_META_KEY);

  if (!raw) {
    return {
      lastAt: null,
      lastFile: null,
      frequency,
      lastSizeBytes: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SchoolBackupMeta>;
    return {
      lastAt: parsed.lastAt ?? null,
      lastFile: parsed.lastFile ?? null,
      frequency: isBackupFrequency(parsed.frequency ?? "")
        ? (parsed.frequency as BackupFrequency)
        : frequency,
      lastSizeBytes: parsed.lastSizeBytes ?? null,
    };
  } catch {
    return {
      lastAt: null,
      lastFile: null,
      frequency,
      lastSizeBytes: null,
    };
  }
}

async function saveSchoolBackupMeta(
  schoolId: string,
  meta: SchoolBackupMeta,
): Promise<void> {
  await setTenantStorageItem(schoolId, BACKUP_META_KEY, JSON.stringify(meta));
}

function listBackupFiles(schoolId: string): SchoolBackupFile[] {
  const dir = getSchoolBackupDir(schoolId);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".sql.gz"))
    .map((filename) => {
      const stats = fs.statSync(path.join(dir, filename));
      return {
        filename,
        createdAt: stats.mtime.toISOString(),
        sizeBytes: stats.size,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function trimOldBackups(schoolId: string): void {
  const files = listBackupFiles(schoolId);
  if (files.length <= MAX_BACKUPS_PER_SCHOOL) return;

  const dir = getSchoolBackupDir(schoolId);
  for (const file of files.slice(MAX_BACKUPS_PER_SCHOOL)) {
    fs.unlinkSync(path.join(dir, file.filename));
  }
}

export async function createSchoolDatabaseBackup(
  schoolId: string,
  schoolName: string,
): Promise<SchoolBackupFile> {
  if (!isServerDatabaseMode()) {
    throw new Error("Database mode is disabled.");
  }

  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) {
    throw new Error("School database is not available.");
  }

  const tenantUrl = buildTenantDatabaseUrl(databaseName);
  const connection = parseDatabaseUrl(tenantUrl);
  const backupDir = getSchoolBackupDir(schoolId);
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${slugifySchoolName(schoolName)}-${timestamp}.sql.gz`;
  const filepath = path.join(backupDir, filename);

  let dump: Buffer;
  try {
    dump = execFileSync(
      "pg_dump",
      [
        "-h",
        connection.host,
        "-p",
        connection.port,
        "-U",
        connection.user,
        "-d",
        connection.database,
        "--no-owner",
        "--no-acl",
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: connection.password,
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "pg_dump failed to export the school database.";
    throw new Error(message);
  }

  fs.writeFileSync(filepath, gzipSync(dump));

  const stats = fs.statSync(filepath);
  const frequency = await loadSchoolBackupFrequency(schoolId);
  await saveSchoolBackupMeta(schoolId, {
    lastAt: stats.mtime.toISOString(),
    lastFile: filename,
    frequency,
    lastSizeBytes: stats.size,
  });

  trimOldBackups(schoolId);

  return {
    filename,
    createdAt: stats.mtime.toISOString(),
    sizeBytes: stats.size,
  };
}

export async function runScheduledSchoolBackupIfDue(
  schoolId: string,
  schoolName: string,
): Promise<SchoolBackupFile | null> {
  const frequency = await loadSchoolBackupFrequency(schoolId);
  const meta = await loadSchoolBackupMeta(schoolId);

  if (!isBackupDue(meta.lastAt, frequency)) {
    return null;
  }

  return createSchoolDatabaseBackup(schoolId, schoolName);
}

export async function runScheduledBackupsForAllSchools(): Promise<
  Array<{ schoolId: string; schoolName: string; created: boolean; filename?: string }>
> {
  const schools = await catalogPrisma.school.findMany({
    where: { status: "active" },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const results = [];
  for (const school of schools) {
    const created = await runScheduledSchoolBackupIfDue(school.id, school.name);
    results.push({
      schoolId: school.id,
      schoolName: school.name,
      created: Boolean(created),
      filename: created?.filename,
    });
  }

  return results;
}

export async function getSchoolBackupStatus(schoolId: string): Promise<{
  meta: SchoolBackupMeta;
  files: SchoolBackupFile[];
  nextDueAt: string | null;
}> {
  const meta = await loadSchoolBackupMeta(schoolId);
  const files = listBackupFiles(schoolId);
  const frequency = meta.frequency;
  const nextDueAt = meta.lastAt
    ? new Date(
        (() => {
          const last = new Date(meta.lastAt!);
          switch (frequency) {
            case "Daily":
              last.setDate(last.getDate() + 1);
              break;
            case "Weekly":
              last.setDate(last.getDate() + 7);
              break;
            case "Monthly":
              last.setMonth(last.getMonth() + 1);
              break;
            case "Yearly":
              last.setFullYear(last.getFullYear() + 1);
              break;
          }
          return last;
        })(),
      ).toISOString()
    : new Date().toISOString();

  return { meta, files, nextDueAt };
}

export function getSchoolBackupFilePath(
  schoolId: string,
  filename: string,
): string | null {
  if (!filename.endsWith(".sql.gz") || filename.includes("..") || filename.includes("/")) {
    return null;
  }

  const filepath = path.join(getSchoolBackupDir(schoolId), filename);
  if (!fs.existsSync(filepath)) return null;
  return filepath;
}

export function formatSchoolBackupStatus(meta: SchoolBackupMeta): string {
  const schedule = formatBackupFrequencyLabel(meta.frequency);
  if (!meta.lastAt) {
    return `Server backups are scheduled ${schedule}. No PostgreSQL backup has been saved yet.`;
  }

  const when = new Date(meta.lastAt).toLocaleString();
  const size =
    meta.lastSizeBytes != null
      ? ` (${Math.max(1, Math.round(meta.lastSizeBytes / 1024))} KB)`
      : "";

  return `Server backups run ${schedule}. Last PostgreSQL backup: ${when}${size}.`;
}
