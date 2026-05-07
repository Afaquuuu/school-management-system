export type UserRole = "admin" | "teacher" | "student" | "parent";

const roleSet = new Set<UserRole>(["admin", "teacher", "student", "parent"]);

type SessionClaims = {
  role?: unknown;
  metadata?: { role?: unknown };
  publicMetadata?: { role?: unknown };
  privateMetadata?: { role?: unknown };
  unsafeMetadata?: { role?: unknown };
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && roleSet.has(value as UserRole);
}

export function getRoleFromClaims(sessionClaims: unknown): UserRole {
  const claims = sessionClaims as SessionClaims | undefined;
  const candidates = [
    claims?.role,
    claims?.metadata?.role,
    claims?.publicMetadata?.role,
    claims?.privateMetadata?.role,
    claims?.unsafeMetadata?.role,
  ];

  const resolvedRole = candidates.find(isUserRole);
  return resolvedRole ?? "student";
}

export function hasRoleAccess(role: UserRole, allowedRoles: UserRole[]) {
  return allowedRoles.includes(role);
}