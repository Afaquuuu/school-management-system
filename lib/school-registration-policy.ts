function readRegistrationFlag(raw: string | undefined): boolean | null {
  const value = raw?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

/** Open registration for everyone (usually false on production). */
export function isPublicSchoolRegistrationAllowed(): boolean {
  const explicit =
    readRegistrationFlag(process.env.ALLOW_PUBLIC_SCHOOL_REGISTRATION) ??
    readRegistrationFlag(process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SCHOOL_REGISTRATION);

  if (explicit !== null) return explicit;
  return process.env.NODE_ENV !== "production";
}

export function getSchoolRegistrationSecret(): string | null {
  const secret = process.env.SCHOOL_REGISTRATION_SECRET?.trim();
  return secret || null;
}

export function isOwnerRegistrationKeyValid(key: string | undefined | null): boolean {
  const secret = getSchoolRegistrationSecret();
  const provided = key?.trim();
  if (!secret || !provided) return false;
  return secret === provided;
}

export function canCreateSchool(registrationKey?: string | null): boolean {
  if (isPublicSchoolRegistrationAllowed()) return true;
  return isOwnerRegistrationKeyValid(registrationKey);
}
