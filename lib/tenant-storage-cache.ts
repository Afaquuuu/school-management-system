"use client";

const STUDENT_DOCUMENTS_STORAGE_KEY = "student_documents";

const schoolCaches = new Map<string, Map<string, string>>();
const pendingWrites = new Map<
  string,
  {
    timer: ReturnType<typeof setTimeout>;
    schoolId: string;
    key: string;
    value: string;
  }
>();
const hydrationPromises = new Map<string, Promise<void>>();

function writeKey(schoolId: string, key: string): string {
  return `${schoolId}::${key}`;
}

function getSchoolCache(schoolId: string): Map<string, string> {
  let cache = schoolCaches.get(schoolId);
  if (!cache) {
    cache = new Map();
    schoolCaches.set(schoolId, cache);
  }
  return cache;
}

async function persistToServer(
  schoolId: string,
  key: string,
  value: string,
  options?: { deletedStudentIds?: string[]; deletedStaffIds?: string[] },
): Promise<void> {
  const response = await fetch("/api/tenant-storage", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schoolId,
      key,
      value,
      deletedStudentIds: options?.deletedStudentIds,
      deletedStaffIds: options?.deletedStaffIds,
    }),
  });

  if (!response.ok) {
    let message = "Failed to persist tenant storage item.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
}

export async function persistScopedItemNow(
  schoolId: string,
  key: string,
  value: string,
  options?: { deletedStudentIds?: string[]; deletedStaffIds?: string[] },
): Promise<void> {
  getSchoolCache(schoolId).set(key, value);

  const pendingKey = writeKey(schoolId, key);
  const existing = pendingWrites.get(pendingKey);
  if (existing) {
    clearTimeout(existing.timer);
    pendingWrites.delete(pendingKey);
  }

  await persistToServer(schoolId, key, value, options);
}

export function getCachedScopedItem(schoolId: string, key: string): string | null {
  return getSchoolCache(schoolId).get(key) ?? null;
}

export function setCachedScopedItem(schoolId: string, key: string, value: string): void {
  getSchoolCache(schoolId).set(key, value);
  schedulePersist(schoolId, key, value);
}

/** Update in-memory cache only — used when the server already persisted the change. */
export function setCachedScopedItemLocalOnly(schoolId: string, key: string, value: string): void {
  getSchoolCache(schoolId).set(key, value);
}

function compactStudentDocumentsCacheValue(value: string): string {
  try {
    const documents = JSON.parse(value) as Array<{ fileUrl?: string; dataUrl?: string }>;
    if (!Array.isArray(documents)) return value;

    return JSON.stringify(
      documents.map((document) => {
        if (!document.fileUrl || !document.dataUrl) return document;
        const { dataUrl: _removed, ...rest } = document;
        return rest;
      }),
    );
  } catch {
    return value;
  }
}

export function removeCachedScopedItem(schoolId: string, key: string): void {
  getSchoolCache(schoolId).delete(key);

  void fetch("/api/tenant-storage", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schoolId, key }),
  }).catch((error) => {
    console.error("Failed to delete tenant storage item:", error);
  });
}

export function clearCachedSchoolStorage(schoolId: string): void {
  schoolCaches.delete(schoolId);
  hydrationPromises.delete(schoolId);
}

function schedulePersist(schoolId: string, key: string, value: string): void {
  const pendingKey = writeKey(schoolId, key);
  const existing = pendingWrites.get(pendingKey);
  if (existing) clearTimeout(existing.timer);

  pendingWrites.set(pendingKey, {
    schoolId,
    key,
    value,
    timer: setTimeout(() => {
      pendingWrites.delete(pendingKey);
      void persistToServer(schoolId, key, value).catch((error) => {
        console.error("Failed to persist tenant storage item:", error);
      });
    }, 250),
  });
}

const AUTH_STORAGE_KEYS = ["system_users", "school_system_settings"] as const;

export async function hydrateAuthStorageFromServer(schoolId: string): Promise<void> {
  const cache = getSchoolCache(schoolId);

  await Promise.all(
    AUTH_STORAGE_KEYS.map(async (key) => {
      const response = await fetch(
        `/api/tenant-storage?schoolId=${encodeURIComponent(schoolId)}&key=${encodeURIComponent(key)}`,
      );
      if (!response.ok) return;

      const payload = (await response.json()) as { value?: string | null };
      if (typeof payload.value === "string") {
        cache.set(key, payload.value);
      }
    }),
  );
}

function mergeSchoolSystemSettingsCacheValue(
  incoming: string,
  current: string | undefined,
): string {
  if (!current) return incoming;

  try {
    const next = JSON.parse(incoming) as {
      communication?: { smtpUser?: string; smtpPassword?: string; senderEmail?: string };
    };
    const prev = JSON.parse(current) as {
      communication?: { smtpUser?: string; smtpPassword?: string; senderEmail?: string };
    };

    if (!next.communication) return incoming;

    const nextPassword = next.communication.smtpPassword?.trim() ?? "";
    const prevPassword = prev.communication?.smtpPassword?.trim() ?? "";
    const nextUser = next.communication.smtpUser?.trim() ?? "";
    const prevUser = prev.communication?.smtpUser?.trim() ?? "";

    // Never let a blank/partial server snapshot wipe credentials already in memory.
    if ((!nextPassword && prevPassword) || (!nextUser && prevUser)) {
      next.communication = {
        ...next.communication,
        smtpPassword: nextPassword || prevPassword,
        smtpUser: nextUser || prevUser,
        senderEmail:
          next.communication.senderEmail?.trim() ||
          prev.communication?.senderEmail ||
          next.communication.senderEmail,
      };
      return JSON.stringify(next);
    }
  } catch {
    return incoming;
  }

  return incoming;
}

export async function hydrateSchoolStorageFromServer(schoolId: string): Promise<void> {
  const existing = hydrationPromises.get(schoolId);
  if (existing) return existing;

  const promise = (async () => {
    const response = await fetch(`/api/tenant-storage?schoolId=${encodeURIComponent(schoolId)}`);
    if (!response.ok) {
      throw new Error("Failed to load school data from server.");
    }

    const payload = (await response.json()) as { entries?: Record<string, string> };
    const cache = getSchoolCache(schoolId);
    const previousSettings = cache.get("school_system_settings");

    // Merge into existing cache — never clear auth/settings keys mid-session.
    // A full clear was wiping Brevo SMTP credentials, then later saves wrote blanks to the DB.
    for (const [key, value] of Object.entries(payload.entries ?? {})) {
      if (pendingWrites.has(writeKey(schoolId, key))) {
        continue;
      }

      if (key === "school_system_settings") {
        cache.set(key, mergeSchoolSystemSettingsCacheValue(value, previousSettings));
        continue;
      }

      cache.set(
        key,
        key === STUDENT_DOCUMENTS_STORAGE_KEY ? compactStudentDocumentsCacheValue(value) : value,
      );
    }
  })();

  hydrationPromises.set(schoolId, promise);

  try {
    await promise;
  } finally {
    hydrationPromises.delete(schoolId);
  }
}

export async function flushPendingStorageWrites(): Promise<void> {
  const writes = Array.from(pendingWrites.values());
  pendingWrites.clear();

  for (const write of writes) {
    clearTimeout(write.timer);
  }

  await Promise.all(
    writes.map((write) =>
      persistToServer(write.schoolId, write.key, write.value).catch((error) => {
        console.error("Failed to flush tenant storage item:", error);
      }),
    ),
  );
}
