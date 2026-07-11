import { catalogPrisma } from "@/lib/catalog-prisma";
import { buildTenantDatabaseName } from "@/lib/database-url";
import { isServerDatabaseMode } from "@/lib/storage-mode";
import {
  deprovisionTenantDatabase,
  provisionTenantDatabase,
} from "@/lib/server/tenant-provisioning";

export type SchoolRecord = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  createdAt: string;
};

function toSchoolRecord(row: {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo: string | null;
  createdAt: Date;
}): SchoolRecord {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    logo: row.logo ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getSchoolDatabaseName(schoolId: string): Promise<string | null> {
  if (!isServerDatabaseMode()) return null;

  const school = await catalogPrisma.school.findUnique({
    where: { id: schoolId },
    select: { databaseName: true, status: true },
  });

  if (!school || school.status !== "active") return null;
  return school.databaseName;
}

export async function listSchools(): Promise<SchoolRecord[]> {
  if (!isServerDatabaseMode()) return [];

  const rows = await catalogPrisma.school.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
  });

  return rows.map(toSchoolRecord);
}

export async function createSchool(input: {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
}): Promise<SchoolRecord> {
  const id = input.id?.trim() || `school_${Date.now()}`;

  if (!isServerDatabaseMode()) {
    return {
      id,
      ...input,
      createdAt: new Date().toISOString(),
    };
  }

  const databaseName = buildTenantDatabaseName(id);

  const row = await catalogPrisma.school.create({
    data: {
      id,
      name: input.name,
      address: input.address,
      phone: input.phone,
      email: input.email,
      logo: input.logo,
      databaseName,
      status: "provisioning",
    },
  });

  try {
    await provisionTenantDatabase(id);
    const active = await catalogPrisma.school.update({
      where: { id },
      data: { status: "active" },
    });
    return toSchoolRecord(active);
  } catch (error) {
    await catalogPrisma.school.delete({ where: { id } }).catch(() => undefined);
    await deprovisionTenantDatabase(databaseName).catch(() => undefined);
    throw error;
  }
}

export async function updateSchool(
  id: string,
  updates: Partial<Omit<SchoolRecord, "id" | "createdAt">>,
): Promise<SchoolRecord | null> {
  if (!isServerDatabaseMode()) return null;

  try {
    const row = await catalogPrisma.school.update({
      where: { id },
      data: {
        name: updates.name,
        address: updates.address,
        phone: updates.phone,
        email: updates.email,
        logo: updates.logo,
      },
    });
    return toSchoolRecord(row);
  } catch {
    return null;
  }
}

export async function deleteSchool(id: string): Promise<boolean> {
  if (!isServerDatabaseMode()) return false;

  try {
    const school = await catalogPrisma.school.findUnique({
      where: { id },
      select: { databaseName: true },
    });
    if (!school) return false;

    await catalogPrisma.school.delete({ where: { id } });
    await deprovisionTenantDatabase(school.databaseName);
    return true;
  } catch {
    return false;
  }
}
