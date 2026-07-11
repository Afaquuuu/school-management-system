function readRegistrationFlag(raw: string | undefined): boolean | null {
  const value = raw?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

/** Public school self-registration (Register School tab + POST /api/schools). */
export function isPublicSchoolRegistrationAllowed(): boolean {
  const explicit =
    readRegistrationFlag(process.env.ALLOW_PUBLIC_SCHOOL_REGISTRATION) ??
    readRegistrationFlag(process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SCHOOL_REGISTRATION);

  if (explicit !== null) return explicit;
  return process.env.NODE_ENV !== "production";
}
