import { prisma } from "@/lib/prisma";
import { isServerDatabaseMode } from "@/lib/storage-mode";

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

export async function listSchools(): Promise<SchoolRecord[]> {
  if (!isServerDatabaseMode()) return [];

  const rows = await prisma.school.findMany({
    orderBy: { createdAt: "asc" },
  });

  return rows.map(toSchoolRecord);
}

export async function createSchool(input: {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
}): Promise<SchoolRecord> {
  const id = `school_${Date.now()}`;

  if (!isServerDatabaseMode()) {
    return {
      id,
      ...input,
      createdAt: new Date().toISOString(),
    };
  }

  const row = await prisma.school.create({
    data: {
      id,
      name: input.name,
      address: input.address,
      phone: input.phone,
      email: input.email,
      logo: input.logo,
    },
  });

  return toSchoolRecord(row);
}

export async function updateSchool(
  id: string,
  updates: Partial<Omit<SchoolRecord, "id" | "createdAt">>,
): Promise<SchoolRecord | null> {
  if (!isServerDatabaseMode()) return null;

  try {
    const row = await prisma.school.update({
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
    await prisma.school.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
