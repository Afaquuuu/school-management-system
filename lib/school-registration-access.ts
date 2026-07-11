"use client";

import { isPublicSchoolRegistrationAllowed } from "@/lib/school-registration-policy";

const OWNER_KEY_STORAGE = "school_owner_registration_key";

export function getStoredOwnerRegistrationKey(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(OWNER_KEY_STORAGE);
}

export function storeOwnerRegistrationKey(key: string): void {
  sessionStorage.setItem(OWNER_KEY_STORAGE, key.trim());
}

export function clearOwnerRegistrationKey(): void {
  sessionStorage.removeItem(OWNER_KEY_STORAGE);
}

export function hasOwnerRegistrationAccess(): boolean {
  return Boolean(getStoredOwnerRegistrationKey());
}

export function canAccessSchoolRegistration(): boolean {
  return isPublicSchoolRegistrationAllowed() || hasOwnerRegistrationAccess();
}

export async function verifyOwnerRegistrationKey(key: string): Promise<boolean> {
  const response = await fetch("/api/schools/registration-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: key.trim() }),
  });

  if (!response.ok) return false;

  const payload = (await response.json()) as { ok?: boolean };
  if (!payload.ok) return false;

  storeOwnerRegistrationKey(key);
  return true;
}

export function getOwnerRegistrationKeyForApi(): string | undefined {
  return getStoredOwnerRegistrationKey() ?? undefined;
}
