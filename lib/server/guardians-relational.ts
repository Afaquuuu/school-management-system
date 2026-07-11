import type { PrismaClient } from "@prisma/tenant-client";

import type { SystemUser } from "@/lib/system-users";

function isParentAccount(user: Pick<SystemUser, "role">): boolean {
  return user.role === "Parent";
}

function isActiveAccount(user: Pick<SystemUser, "status">): boolean {
  return (user.status ?? "Active") !== "Inactive";
}

function buildParentEmail(account: Pick<SystemUser, "id" | "email">): string {
  const email = account.email.trim().toLowerCase();
  if (email) return email;
  return `parent+${account.id}@school.local`;
}

async function deleteGuardianForAccount(tenant: PrismaClient, accountId: string): Promise<void> {
  const profile = await tenant.guardianProfile.findUnique({
    where: { legacyAccountId: accountId },
    select: { userId: true },
  });
  if (!profile) return;
  await tenant.user.delete({ where: { id: profile.userId } });
}

export async function syncGuardianProfilesFromAccounts(
  tenant: PrismaClient,
  users: SystemUser[],
): Promise<void> {
  const parentAccounts = users.filter(isParentAccount);
  const parentAccountIds = new Set(parentAccounts.map((account) => account.id));

  const existingProfiles = await tenant.guardianProfile.findMany({
    where: { legacyAccountId: { not: null } },
    select: { id: true, legacyAccountId: true, userId: true },
  });

  for (const profile of existingProfiles) {
    if (profile.legacyAccountId && !parentAccountIds.has(profile.legacyAccountId)) {
      await tenant.user.delete({ where: { id: profile.userId } });
    }
  }

  const studentsByLegacyId = new Map(
    (
      await tenant.studentProfile.findMany({
        where: { legacyId: { not: null } },
        select: { id: true, legacyId: true },
      })
    )
      .filter((row) => row.legacyId)
      .map((row) => [row.legacyId as string, row.id]),
  );

  for (const account of parentAccounts) {
    const email = buildParentEmail(account);
    const existingProfile = await tenant.guardianProfile.findUnique({
      where: { legacyAccountId: account.id },
      include: { user: true },
    });

    let guardianProfileId: string;

    if (existingProfile) {
      await tenant.user.update({
        where: { id: existingProfile.userId },
        data: {
          name: account.name,
          email,
          phone: account.phone ?? "",
          role: "parent",
          isActive: isActiveAccount(account),
        },
      });
      guardianProfileId = existingProfile.id;
    } else {
      const created = await tenant.user.create({
        data: {
          clerkId: `legacy:parent:${account.id}`,
          email,
          name: account.name,
          role: "parent",
          phone: account.phone ?? "",
          isActive: isActiveAccount(account),
          guardianProfile: {
            create: {
              legacyAccountId: account.id,
              relationship: null,
              occupation: account.classDepartment || null,
            },
          },
        },
        include: { guardianProfile: true },
      });
      if (!created.guardianProfile) {
        throw new Error(`Failed to create guardian profile for parent account ${account.id}.`);
      }
      guardianProfileId = created.guardianProfile.id;
    }

    const linkedStudentLegacyIds = account.linkedStudentIds ?? [];
    const desiredStudentIds = linkedStudentLegacyIds
      .map((legacyId) => studentsByLegacyId.get(legacyId))
      .filter((studentId): studentId is string => Boolean(studentId));

    const existingLinks = await tenant.studentGuardian.findMany({
      where: { guardianId: guardianProfileId },
      select: { id: true, studentId: true },
    });

    const desiredStudentIdSet = new Set(desiredStudentIds);
    for (const link of existingLinks) {
      if (!desiredStudentIdSet.has(link.studentId)) {
        await tenant.studentGuardian.delete({ where: { id: link.id } });
      }
    }

    for (let index = 0; index < desiredStudentIds.length; index += 1) {
      const studentId = desiredStudentIds[index];
      await tenant.studentGuardian.upsert({
        where: {
          studentId_guardianId: {
            studentId,
            guardianId: guardianProfileId,
          },
        },
        create: {
          studentId,
          guardianId: guardianProfileId,
          isPrimary: index === 0,
        },
        update: {
          isPrimary: index === 0,
        },
      });
    }
  }
}

export async function syncGuardianProfilesFromStoredAccounts(
  tenant: PrismaClient,
): Promise<void> {
  const accounts = await tenant.systemAccount.findMany({
    orderBy: { createdAt: "asc" },
  });

  const users: SystemUser[] = accounts.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role as SystemUser["role"],
    classDepartment: row.classDepartment,
    linkedStudentIds: Array.isArray(row.linkedStudentIds)
      ? (row.linkedStudentIds as string[])
      : undefined,
    status: row.status as SystemUser["status"],
    password: row.password,
    createdAt: row.createdAt.toISOString(),
    lastLogin: row.lastLoginAt?.toISOString() ?? null,
    credentialsIssuedAt: row.credentialsIssuedAt?.toISOString(),
  }));

  await syncGuardianProfilesFromAccounts(tenant, users);
}

export async function migrateGuardianProfilesIfNeeded(schoolId: string): Promise<boolean> {
  const { getSchoolDatabaseName } = await import("@/lib/server/schools");
  const { getTenantPrisma } = await import("@/lib/tenant-prisma");

  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return false;

  const tenant = getTenantPrisma(databaseName);
  const parentCount = await tenant.systemAccount.count({
    where: { role: "Parent" },
  });
  if (parentCount === 0) return false;

  const guardianCount = await tenant.guardianProfile.count({
    where: { legacyAccountId: { not: null } },
  });
  if (guardianCount >= parentCount) {
    await syncGuardianProfilesFromStoredAccounts(tenant);
    return false;
  }

  await syncGuardianProfilesFromStoredAccounts(tenant);
  return true;
}

export { deleteGuardianForAccount };
