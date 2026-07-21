import type { Gender, PrismaClient } from "@prisma/tenant-client";
import { Prisma } from "@prisma/tenant-client";

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

function matchesStaffRecord(a: StoredStaffJson, b: StoredStaffJson): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  if (a.staffId && b.staffId && a.staffId === b.staffId) return true;
  return buildStaffEmail(a) === buildStaffEmail(b);
}

function mergeStaffLists(
  existing: StoredStaffJson[],
  incoming: StoredStaffJson[],
): StoredStaffJson[] {
  const merged = [...existing];

  for (const incomingStaff of incoming) {
    const matchIndex = merged.findIndex((member) => matchesStaffRecord(member, incomingStaff));
    if (matchIndex >= 0) {
      merged[matchIndex] = {
        ...merged[matchIndex],
        ...incomingStaff,
        id: incomingStaff.id || merged[matchIndex].id,
      };
    } else {
      merged.push(incomingStaff);
    }
  }

  return merged;
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
  const resolvedLegacyId = profile.legacyId ?? profile.employeeNo;
  if (!resolvedLegacyId) return null;

  const nameParts = profile.user.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  return {
    id: resolvedLegacyId,
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

type StaffProfileWithUser = {
  id: string;
  userId: string;
  legacyId: string | null;
  employeeNo: string;
  user: {
    email: string;
    phone: string | null;
    name: string;
  };
};

async function findExistingStaffProfile(
  tenant: PrismaClient,
  staff: StoredStaffJson,
  email: string,
): Promise<StaffProfileWithUser | null> {
  const byLegacyId = await tenant.staffProfile.findUnique({
    where: { legacyId: staff.id },
    include: { user: true },
  });
  if (byLegacyId) return byLegacyId;

  const byEmployeeNo = await tenant.staffProfile.findUnique({
    where: { employeeNo: staff.staffId },
    include: { user: true },
  });
  if (byEmployeeNo) return byEmployeeNo;

  const userByEmail = await tenant.user.findUnique({
    where: { email },
    include: { staffProfile: true },
  });
  if (userByEmail?.staffProfile) {
    return {
      ...userByEmail.staffProfile,
      user: userByEmail,
    };
  }

  return null;
}

async function describeStaffConflict(
  tenant: PrismaClient,
  staff: StoredStaffJson,
): Promise<string> {
  const email = buildStaffEmail(staff);
  const user = await tenant.user.findUnique({
    where: { email },
    include: { staffProfile: true, studentProfile: true, guardianProfile: true },
  });

  if (user?.staffProfile) {
    return (
      `This email belongs to staff member ${user.name} (${user.staffProfile.employeeNo}, ${user.staffProfile.staffRole}). ` +
      "Clear filters and search by name or email to find them."
    );
  }

  if (user?.studentProfile) {
    return `This email is already used by student ${user.name}. Staff must use a different email address.`;
  }

  if (user?.guardianProfile) {
    return `This email is already used by parent/guardian ${user.name}. Staff must use a different email address.`;
  }

  const byEmployeeNo = await tenant.staffProfile.findUnique({
    where: { employeeNo: staff.staffId },
    include: { user: true },
  });
  if (byEmployeeNo) {
    return `Staff ID ${staff.staffId} is already assigned to ${byEmployeeNo.user.name} (${byEmployeeNo.user.email}). A new ID will be assigned automatically on retry.`;
  }

  return "A staff member with duplicate details already exists in the school records.";
}

async function deleteStaffProfilesByLegacyIds(
  tenant: PrismaClient,
  deletedStaffIds: string[],
): Promise<void> {
  for (const deletedId of deletedStaffIds) {
    const profile = await tenant.staffProfile.findFirst({
      where: {
        OR: [{ legacyId: deletedId }, { employeeNo: deletedId }],
      },
      select: { userId: true },
    });

    if (profile) {
      await tenant.user.delete({ where: { id: profile.userId } });
    }
  }
}

export async function listStaffFromRelationalStore(
  tenant: PrismaClient,
): Promise<StoredStaffJson[]> {
  const rows = await tenant.staffProfile.findMany({
    include: { user: true },
    orderBy: { employeeNo: "asc" },
  });

  for (const row of rows) {
    if (!row.legacyId && row.employeeNo) {
      await tenant.staffProfile.update({
        where: { id: row.id },
        data: { legacyId: row.employeeNo },
      });
      row.legacyId = row.employeeNo;
    }
  }

  return rows
    .map((row) => toStoredStaffJson(row))
    .filter((row): row is StoredStaffJson => row !== null);
}

export async function saveStaffToRelationalStore(
  tenant: PrismaClient,
  staffMembers: StoredStaffJson[],
  options?: { deletedStaffIds?: string[] },
): Promise<void> {
  if (options?.deletedStaffIds?.length) {
    await deleteStaffProfilesByLegacyIds(tenant, options.deletedStaffIds);
  }

  for (const staff of staffMembers) {
    const email = buildStaffEmail(staff);
    const name = buildStaffName(staff);

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
      legacyId: staff.id,
    };

    const existingProfile = await findExistingStaffProfile(tenant, staff, email);

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

    const conflictingUser = await tenant.user.findUnique({
      where: { email },
      include: { studentProfile: true, guardianProfile: true },
    });

    if (conflictingUser?.studentProfile) {
      throw new Error(
        `This email is already used by student ${conflictingUser.name}. Staff must use a different email address.`,
      );
    }

    if (conflictingUser?.guardianProfile) {
      throw new Error(
        `This email is already used by parent/guardian ${conflictingUser.name}. Staff must use a different email address.`,
      );
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
          create: profileData,
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

export async function setRelationalStaffJson(
  schoolId: string,
  rawValue: string,
  options?: { deletedStaffIds?: string[] },
): Promise<void> {
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
  const existing = await listStaffFromRelationalStore(tenant);
  const mergedStaff = mergeStaffLists(existing, staffMembers);

  try {
    await saveStaffToRelationalStore(tenant, mergedStaff, options);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : String(error.meta?.target ?? "email");
      const duplicateStaff = staffMembers.find((member) => member.email?.trim());
      if (duplicateStaff) {
        throw new Error(await describeStaffConflict(tenant, duplicateStaff));
      }
      throw new Error(`A staff record with duplicate ${target} already exists.`);
    }
    throw error;
  }
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
