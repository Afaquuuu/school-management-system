"use client";

import { clearOwnerRegistrationKey } from "@/lib/school-registration-access";
import { clearUserSession } from "@/lib/teacher-check-in";

export function performAppSignOut(options?: { clearSelectedSchool?: boolean }): void {
  clearUserSession();
  clearOwnerRegistrationKey();

  if (options?.clearSelectedSchool !== false && typeof window !== "undefined") {
    localStorage.removeItem("saas_current_school_id");
  }
}
