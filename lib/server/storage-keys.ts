export {
  STRUCTURED_STORAGE_KEYS,
  isStructuredStorageKey,
} from "@/lib/server/structured-domain-registry";

/** Remaining keys may still use generic JSON store during transition. */
export const ARRAY_JSON_STORAGE_KEYS = new Set<string>();
export const SINGLETON_JSON_STORAGE_KEYS = new Set<string>();

export function isArrayJsonStorageKey(_key: string): boolean {
  return false;
}

export function isSingletonJsonStorageKey(_key: string): boolean {
  return false;
}

export function isManagedJsonStorageKey(_key: string): boolean {
  return false;
}
