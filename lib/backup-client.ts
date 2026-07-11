import type { SchoolBackupFile } from "@/lib/server/school-backup";

export type SchoolBackupStatusResponse = {
  statusLabel: string;
  meta: {
    lastAt: string | null;
    lastFile: string | null;
    frequency: string;
    lastSizeBytes: number | null;
  };
  files: SchoolBackupFile[];
  nextDueAt: string | null;
};

export async function fetchSchoolBackupStatus(
  schoolId: string,
): Promise<SchoolBackupStatusResponse> {
  const response = await fetch(`/api/backup?schoolId=${encodeURIComponent(schoolId)}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as SchoolBackupStatusResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load backup status.");
  }
  return payload;
}

export async function createSchoolBackupNow(
  schoolId: string,
): Promise<SchoolBackupStatusResponse> {
  const response = await fetch("/api/backup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schoolId, action: "createNow" }),
  });
  const payload = (await response.json()) as SchoolBackupStatusResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to create backup.");
  }
  return payload;
}

export async function runSchoolBackupIfDue(
  schoolId: string,
): Promise<SchoolBackupStatusResponse | null> {
  const response = await fetch("/api/backup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schoolId, action: "runIfDue" }),
  });
  const payload = (await response.json()) as SchoolBackupStatusResponse & {
    created?: boolean;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to check scheduled backup.");
  }
  return payload.created ? payload : null;
}

export function downloadSchoolBackupFile(schoolId: string, filename: string): void {
  const url = `/api/backup?schoolId=${encodeURIComponent(schoolId)}&file=${encodeURIComponent(filename)}`;
  window.location.assign(url);
}
