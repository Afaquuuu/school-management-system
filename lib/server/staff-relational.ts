import type { Gender, PrismaClient } from "@prisma/tenant-client";

import { getTenantPrisma } from "@/lib/tenant-prisma";
import { getSchoolDatabaseName } from "@/lib/server/schools";

export const STAFF_STORAGE_KEY = "school_staff";

export type StoredStaffJson = {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | string;
  email: string;
  phone: string;
  address?: string;
  role: "teacher" | "admin" | "librarian" | "accountant" | "support" | string;
  department: string;
  qualification?: string;
  experience?: string;
  joiningDate?: string;
  salary?: string;
  status?: "active" | "inactive" | "on_leave" | "terminated" | string;
  emergencyContact?: string;
  emergencyPhone?: string;
};

function parseDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseGender(value?: string | null): Gender | undefined {
  if (value === "male" || value === "female" || value === "other") return value;
  return undefined;
}

function buildStaffEmail(staff: StoredStaffJson): string {
  return staff.email.trim().toLowerCase();
}

function buildStaffName(staff: StoredStaffJson): string {
  return `${staff.firstName} ${staff.lastName}`.trim();
}

function isActiveStaff(status?: string): boolean {
  return (status ?? "active").toLowerCase() === "active";
}

function mapStaffUserRole(role: string): "admin" | "teacher" {
  return role === "admin" ? "admin" : "teacher";
}

function toStoredStaffJson(profile: {
  legacyId: string | null;
  employeeNo: string;
  department: string | null;
  staffRole: string;
  staffStatus: string;
  address: string | null;
  qualification: string | null;
  experience: string | null;
  salary: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  hireDate: Date;
  dateOfBirth: Date | null;
  gender: Gender | null;
  user: { email: string; phone: string | null; name: string };
}): StoredStaffJson | null {
  if (!profile.legacyId) return null;

  const nameParts = profile.user.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  return {
    id: profile.legacyId,
    staffId: profile.employeeNo,
    firstName,
    lastName,
    dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10) ?? "",
    gender: profile.gender ?? "other",
    email: profile.user.email,
    phone: profile.user.phone ?? "",
    address: profile.address ?? "",
    role: profile.staffRole,
    department: profile.department ?? "",
    qualification: profile.qualification ?? "",
    experience: profile.experience ?? "",
    joiningDate: profile.hireDate.toISOString().slice(0, 10),
    salary: profile.salary ?? "",
    status: profile.staffStatus,
    emergencyContact: profile.emergencyContact ?? "",
    emergencyPhone: profile.emergencyPhone ?? "",
  };
}

export async function listStaffFromRelationalStore(
  tenant: PrismaClient,
): Promise<StoredStaffJson[]> {
  const rows = await tenant.staffProfile.findMany({
    where: { legacyId: { not: null } },
    include: { user: true },
    orderBy: { employeeNo: "asc" },
  });

  return rows
    .map((row) => toStoredStaffJson(row))
    .filter((row): row is StoredStaffJson => row !== null);
}

export async function saveStaffToRelationalStore(
  tenant: PrismaClient,
  staffMembers: StoredStaffJson[],
): Promise<void> {
  const existing = await tenant.staffProfile.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true, userId: true },
  });

  const incomingIds = new Set(staffMembers.map((member) => member.id));
  for (const profile of existing) {
    if (profile.legacyId && !incomingIds.has(profile.legacyId)) {
      await tenant.user.delete({ where: { id: profile.userId } });
    }
  }

  for (const staff of staffMembers) {
    const email = buildStaffEmail(staff);
    const name = buildStaffName(staff);
    const existingProfile = await tenant.staffProfile.findUnique({
      where: { legacyId: staff.id },
      include: { user: true },
    });

    const profileData = {
      employeeNo: staff.staffId,
      jobTitle: staff.role,
      department: staff.department ?? "",
      staffRole: staff.role,
      staffStatus: staff.status ?? "active",
      address: staff.address ?? null,
      qualification: staff.qualification ?? null,
      experience: staff.experience ?? null,
      salary: staff.salary ?? null,
      emergencyContact: staff.emergencyContact ?? null,
      emergencyPhone: staff.emergencyPhone ?? null,
      hireDate: parseDate(staff.joiningDate) ?? new Date(),
      dateOfBirth: parseDate(staff.dateOfBirth) ?? null,
      gender: parseGender(staff.gender) ?? null,
      isActive: isActiveStaff(staff.status),
    };

    if (existingProfile) {
      await tenant.user.update({
        where: { id: existingProfile.userId },
        data: {
          name,
          email,
          phone: staff.phone ?? "",
          role: mapStaffUserRole(staff.role),
          isActive: isActiveStaff(staff.status),
        },
      });
      await tenant.staffProfile.update({
        where: { id: existingProfile.id },
        data: profileData,
      });
      continue;
    }

    await tenant.user.create({
      data: {
        clerkId: `legacy:staff:${staff.id}`,
        email,
        name,
        role: mapStaffUserRole(staff.role),
        phone: staff.phone ?? "",
        isActive: isActiveStaff(staff.status),
        staffProfile: {
          create: {
            legacyId: staff.id,
            ...profileData,
          },
        },
      },
    });
  }
}

export async function getRelationalStaffJson(schoolId: string): Promise<string | null> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return null;

  const tenant = getTenantPrisma(databaseName);
  const staffMembers = await listStaffFromRelationalStore(tenant);
  return JSON.stringify(staffMembers);
}

export async function setRelationalStaffJson(schoolId: string, rawValue: string): Promise<void> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) {
    throw new Error(`No active database found for school ${schoolId}.`);
  }

  let staffMembers: StoredStaffJson[];
  try {
    staffMembers = JSON.parse(rawValue) as StoredStaffJson[];
  } catch {
    throw new Error("Invalid staff payload.");
  }

  const tenant = getTenantPrisma(databaseName);
  await saveStaffToRelationalStore(tenant, staffMembers);
  await tenant.appStorage.deleteMany({ where: { key: STAFF_STORAGE_KEY } });
}

export async function migrateLegacyStaffIfNeeded(schoolId: string): Promise<boolean> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return false;

  const tenant = getTenantPrisma(databaseName);
  return migrateLegacyStaffIfNeededForTenant(tenant);
}

async function migrateLegacyStaffIfNeededForTenant(tenant: PrismaClient): Promise<boolean> {
  const existingCount = await tenant.staffProfile.count({
    where: { legacyId: { not: null } },
  });
  if (existingCount > 0) return false;

  const legacyRow = await tenant.appStorage.findUnique({
    where: { key: STAFF_STORAGE_KEY },
    select: { value: true },
  });
  if (!legacyRow?.value) return false;

  const staffMembers = JSON.parse(legacyRow.value) as StoredStaffJson[];
  await saveStaffToRelationalStore(tenant, staffMembers);
  await tenant.appStorage.deleteMany({ where: { key: STAFF_STORAGE_KEY } });
  return true;
}
