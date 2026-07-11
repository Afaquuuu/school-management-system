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

async function persistToServer(schoolId: string, key: string, value: string): Promise<void> {
  const response = await fetch("/api/tenant-storage", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schoolId, key, value }),
  });

  if (!response.ok) {
    throw new Error("Failed to persist tenant storage item.");
  }
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
    cache.clear();

    for (const [key, value] of Object.entries(payload.entries ?? {})) {
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
