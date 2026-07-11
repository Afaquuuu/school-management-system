import type { PrismaClient } from "@prisma/tenant-client";

import { getTenantPrisma } from "@/lib/tenant-prisma";
import { getSchoolDatabaseName } from "@/lib/server/schools";
import type { SystemUser } from "@/lib/system-users";

export const ACCOUNTS_STORAGE_KEY = "system_users";

function toSystemUser(row: {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  classDepartment: string;
  linkedStudentIds: unknown;
  status: string;
  password: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  credentialsIssuedAt: Date | null;
}): SystemUser {
  return {
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
  };
}

export async function listAccountsFromRelationalStore(
  tenant: PrismaClient,
): Promise<SystemUser[]> {
  const rows = await tenant.systemAccount.findMany({
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => toSystemUser(row));
}

export async function saveAccountsToRelationalStore(
  tenant: PrismaClient,
  users: SystemUser[],
): Promise<void> {
  const existing = await tenant.systemAccount.findMany({
    select: { id: true },
  });
  const incomingIds = new Set(users.map((user) => user.id));

  for (const row of existing) {
    if (!incomingIds.has(row.id)) {
      await tenant.systemAccount.delete({ where: { id: row.id } });
    }
  }

  for (const user of users) {
    const data = {
      name: user.name,
      email: user.email.trim().toLowerCase(),
      phone: user.phone ?? "",
      role: user.role,
      classDepartment: user.classDepartment ?? "",
      linkedStudentIds: user.linkedStudentIds ?? [],
      status: user.status,
      password: user.password,
      createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      lastLoginAt: user.lastLogin ? new Date(user.lastLogin) : null,
      credentialsIssuedAt: user.credentialsIssuedAt
        ? new Date(user.credentialsIssuedAt)
        : null,
    };

    await tenant.systemAccount.upsert({
      where: { id: user.id },
      create: { id: user.id, ...data },
      update: data,
    });
  }
}

export async function getRelationalAccountsJson(schoolId: string): Promise<string | null> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return null;

  const tenant = getTenantPrisma(databaseName);
  const users = await listAccountsFromRelationalStore(tenant);
  return JSON.stringify(users);
}

export async function setRelationalAccountsJson(schoolId: string, rawValue: string): Promise<void> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) {
    throw new Error(`No active database found for school ${schoolId}.`);
  }

  let users: SystemUser[];
  try {
    users = JSON.parse(rawValue) as SystemUser[];
  } catch {
    throw new Error("Invalid system users payload.");
  }

  const tenant = getTenantPrisma(databaseName);
  await saveAccountsToRelationalStore(tenant, users);
  await tenant.appStorage.deleteMany({ where: { key: ACCOUNTS_STORAGE_KEY } });
}

export async function migrateLegacyAccountsIfNeeded(schoolId: string): Promise<boolean> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return false;

  const tenant = getTenantPrisma(databaseName);
  return migrateLegacyAccountsIfNeededForTenant(tenant);
}

async function migrateLegacyAccountsIfNeededForTenant(tenant: PrismaClient): Promise<boolean> {
  const existingCount = await tenant.systemAccount.count();
  if (existingCount > 0) return false;

  const legacyRow = await tenant.appStorage.findUnique({
    where: { key: ACCOUNTS_STORAGE_KEY },
    select: { value: true },
  });
  if (!legacyRow?.value) return false;

  const users = JSON.parse(legacyRow.value) as SystemUser[];
  await saveAccountsToRelationalStore(tenant, users);
  await tenant.appStorage.deleteMany({ where: { key: ACCOUNTS_STORAGE_KEY } });
  return true;
}
