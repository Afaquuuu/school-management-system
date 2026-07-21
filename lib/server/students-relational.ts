import type { Gender, PrismaClient } from "@prisma/tenant-client";
import { Prisma } from "@prisma/tenant-client";

import { getTenantPrisma } from "@/lib/tenant-prisma";
import { getSchoolDatabaseName } from "@/lib/server/schools";

export const STUDENTS_STORAGE_KEY = "school_students";

export type StoredStudentJson = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | string;
  email?: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  class: string;
  section: string;
  rollNumber?: string;
  admissionDate?: string;
  status?: string;
  bloodGroup?: string;
  photo?: string;
};

function parseDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseGender(value?: string | null): Gender | undefined {
  if (value === "male" || value === "female" || value === "other") {
    return value;
  }
  return undefined;
}

function buildStudentEmail(student: StoredStudentJson): string {
  const email = student.email?.trim();
  if (email) return email.toLowerCase();
  return `student+${student.id}@school.local`;
}

function buildStudentName(student: StoredStudentJson): string {
  return `${student.firstName} ${student.lastName}`.trim();
}

function buildGuardianNotes(student: StoredStudentJson): string | undefined {
  const parts = [
    student.guardianName ? `Name: ${student.guardianName}` : "",
    student.guardianPhone ? `Phone: ${student.guardianPhone}` : "",
    student.guardianEmail ? `Email: ${student.guardianEmail}` : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : undefined;
}

function isActiveStatus(status?: string): boolean {
  return (status ?? "active").toLowerCase() === "active";
}

function matchesStudentRecord(a: StoredStudentJson, b: StoredStudentJson): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  if (a.studentId && b.studentId && a.studentId === b.studentId) return true;
  return buildStudentEmail(a) === buildStudentEmail(b);
}

function mergeStudentLists(
  existing: StoredStudentJson[],
  incoming: StoredStudentJson[],
): StoredStudentJson[] {
  const merged = [...existing];

  for (const incomingStudent of incoming) {
    const matchIndex = merged.findIndex((student) => matchesStudentRecord(student, incomingStudent));
    if (matchIndex >= 0) {
      merged[matchIndex] = {
        ...merged[matchIndex],
        ...incomingStudent,
        id: incomingStudent.id || merged[matchIndex].id,
      };
    } else {
      merged.push(incomingStudent);
    }
  }

  return merged;
}

function toStoredStudentJson(profile: {
  legacyId: string | null;
  admissionNo: string;
  rollNumber: string | null;
  classLabel: string;
  sectionLabel: string;
  dateOfBirth: Date | null;
  gender: Gender | null;
  guardianNotes: string | null;
  bloodGroup: string | null;
  address: string | null;
  photoUrl: string | null;
  studentStatus: string;
  admissionDate: Date;
  user: {
    email: string;
    phone: string | null;
    name: string;
  };
}): StoredStudentJson | null {
  const resolvedLegacyId = profile.legacyId ?? profile.admissionNo;
  if (!resolvedLegacyId) return null;

  const nameParts = profile.user.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  let guardianName: string | undefined;
  let guardianPhone: string | undefined;
  let guardianEmail: string | undefined;

  if (profile.guardianNotes) {
    for (const part of profile.guardianNotes.split(" | ")) {
      if (part.startsWith("Name: ")) guardianName = part.slice(6);
      if (part.startsWith("Phone: ")) guardianPhone = part.slice(7);
      if (part.startsWith("Email: ")) guardianEmail = part.slice(7);
    }
  }

  const email =
    profile.user.email.endsWith("@school.local") ? "" : profile.user.email;

  return {
    id: resolvedLegacyId,
    studentId: profile.admissionNo,
    firstName,
    lastName,
    dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10),
    gender: profile.gender ?? undefined,
    email,
    phone: profile.user.phone ?? "",
    address: profile.address ?? "",
    guardianName,
    guardianPhone,
    guardianEmail,
    class: profile.classLabel,
    section: profile.sectionLabel,
    rollNumber: profile.rollNumber ?? "",
    admissionDate: profile.admissionDate.toISOString().slice(0, 10),
    status: profile.studentStatus,
    bloodGroup: profile.bloodGroup ?? "",
    photo: profile.photoUrl ?? undefined,
  };
}

type StudentProfileWithUser = {
  id: string;
  userId: string;
  legacyId: string | null;
  admissionNo: string;
  user: {
    email: string;
    phone: string | null;
    name: string;
  };
};

async function findExistingStudentProfile(
  tenant: PrismaClient,
  student: StoredStudentJson,
  email: string,
): Promise<StudentProfileWithUser | null> {
  const byLegacyId = await tenant.studentProfile.findUnique({
    where: { legacyId: student.id },
    include: { user: true },
  });
  if (byLegacyId) return byLegacyId;

  const byAdmissionNo = await tenant.studentProfile.findUnique({
    where: { admissionNo: student.studentId },
    include: { user: true },
  });
  if (byAdmissionNo) return byAdmissionNo;

  const userByEmail = await tenant.user.findUnique({
    where: { email },
    include: { studentProfile: true },
  });
  if (userByEmail?.studentProfile) {
    return {
      ...userByEmail.studentProfile,
      user: userByEmail,
    };
  }

  return null;
}

async function describeStudentEmailConflict(
  tenant: PrismaClient,
  email: string,
): Promise<string> {
  const user = await tenant.user.findUnique({
    where: { email },
    include: { studentProfile: true, staffProfile: true, guardianProfile: true },
  });

  if (!user) {
    return "A student with this email already exists in the school records.";
  }

  if (user.studentProfile) {
    const profile = user.studentProfile;
    return (
      `This email belongs to student ${user.name} (${profile.classLabel} Section ${profile.sectionLabel}, ID ${profile.admissionNo}). ` +
      "Clear class/section filters and search by name or email to find them."
    );
  }

  if (user.staffProfile) {
    return `This email is already used by staff member ${user.name}. Use a different email for the student.`;
  }

  if (user.guardianProfile) {
    return (
      `This email is already used by parent/guardian ${user.name}. ` +
      "Students must have their own email address, separate from the guardian email."
    );
  }

  return `This email is already registered for ${user.role} (${user.name}).`;
}

export async function listStudentsFromRelationalStore(
  tenant: PrismaClient,
): Promise<StoredStudentJson[]> {
  const rows = await tenant.studentProfile.findMany({
    include: { user: true },
    orderBy: { admissionNo: "asc" },
  });

  for (const row of rows) {
    if (!row.legacyId && row.admissionNo) {
      await tenant.studentProfile.update({
        where: { id: row.id },
        data: { legacyId: row.admissionNo },
      });
      row.legacyId = row.admissionNo;
    }
  }

  return rows
    .map((row) => toStoredStudentJson(row))
    .filter((row): row is StoredStudentJson => row !== null);
}

async function deleteStudentProfilesByLegacyIds(
  tenant: PrismaClient,
  deletedStudentIds: string[],
): Promise<void> {
  for (const deletedId of deletedStudentIds) {
    const profile = await tenant.studentProfile.findFirst({
      where: {
        OR: [{ legacyId: deletedId }, { admissionNo: deletedId }],
      },
      select: { userId: true },
    });

    if (profile) {
      await tenant.user.delete({ where: { id: profile.userId } });
    }
  }
}

export async function saveStudentsToRelationalStore(
  tenant: PrismaClient,
  students: StoredStudentJson[],
  options?: { deletedStudentIds?: string[] },
): Promise<void> {
  if (options?.deletedStudentIds?.length) {
    await deleteStudentProfilesByLegacyIds(tenant, options.deletedStudentIds);
  }

  for (const student of students) {
    const email = buildStudentEmail(student);
    const name = buildStudentName(student);

    const profileData = {
      admissionNo: student.studentId,
      rollNumber: student.rollNumber ?? null,
      classLabel: student.class ?? "",
      sectionLabel: student.section ?? "",
      dateOfBirth: parseDate(student.dateOfBirth) ?? null,
      gender: parseGender(student.gender) ?? null,
      guardianNotes: buildGuardianNotes(student) ?? null,
      bloodGroup: student.bloodGroup ?? null,
      address: student.address ?? null,
      photoUrl: student.photo ?? null,
      studentStatus: student.status ?? "active",
      admissionDate: parseDate(student.admissionDate) ?? new Date(),
      isActive: isActiveStatus(student.status),
      legacyId: student.id,
    };

    const existingProfile = await findExistingStudentProfile(tenant, student, email);

    if (existingProfile) {
      await tenant.user.update({
        where: { id: existingProfile.userId },
        data: {
          name,
          email,
          phone: student.phone ?? "",
          role: "student",
          isActive: isActiveStatus(student.status),
        },
      });

      await tenant.studentProfile.update({
        where: { id: existingProfile.id },
        data: profileData,
      });
      continue;
    }

    const conflictingUser = await tenant.user.findUnique({
      where: { email },
      include: { staffProfile: true, guardianProfile: true },
    });

    if (conflictingUser?.staffProfile) {
      throw new Error(
        `This email is already used by staff member ${conflictingUser.name}. Use a different email for the student.`,
      );
    }

    if (conflictingUser?.guardianProfile) {
      throw new Error(
        `This email is already used by parent/guardian ${conflictingUser.name}. Students must have their own email address, separate from the guardian email.`,
      );
    }

    await tenant.user.create({
      data: {
        clerkId: `legacy:${student.id}`,
        email,
        name,
        role: "student",
        phone: student.phone ?? "",
        isActive: isActiveStatus(student.status),
        studentProfile: {
          create: profileData,
        },
      },
    });
  }
}

export async function getRelationalStudentsJson(schoolId: string): Promise<string | null> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return null;

  const tenant = getTenantPrisma(databaseName);
  const students = await listStudentsFromRelationalStore(tenant);
  return JSON.stringify(students);
}

export async function setRelationalStudentsJson(
  schoolId: string,
  rawValue: string,
  options?: { deletedStudentIds?: string[] },
): Promise<void> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) {
    throw new Error(`No active database found for school ${schoolId}.`);
  }

  let students: StoredStudentJson[];
  try {
    students = JSON.parse(rawValue) as StoredStudentJson[];
  } catch {
    throw new Error("Invalid students payload.");
  }

  const tenant = getTenantPrisma(databaseName);
  const existing = await listStudentsFromRelationalStore(tenant);
  const mergedStudents = mergeStudentLists(existing, students);

  try {
    await saveStudentsToRelationalStore(tenant, mergedStudents, options);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : String(error.meta?.target ?? "email");
      if (target.includes("email")) {
        const duplicateEmail = students.find((student) => student.email?.trim())?.email?.trim().toLowerCase();
        if (duplicateEmail) {
          throw new Error(await describeStudentEmailConflict(tenant, duplicateEmail));
        }
      }
      throw new Error("A student record with duplicate details already exists.");
    }
    throw error;
  }

  await tenant.appStorage.deleteMany({
    where: { key: STUDENTS_STORAGE_KEY },
  });
}

export async function migrateLegacyStudentsIfNeeded(schoolId: string): Promise<boolean> {
  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return false;

  const tenant = getTenantPrisma(databaseName);
  const existingCount = await tenant.studentProfile.count({
    where: { legacyId: { not: null } },
  });
  if (existingCount > 0) return false;

  const legacyRow = await tenant.appStorage.findUnique({
    where: { key: STUDENTS_STORAGE_KEY },
    select: { value: true },
  });
  if (!legacyRow?.value) return false;

  let students: StoredStudentJson[];
  try {
    students = JSON.parse(legacyRow.value) as StoredStudentJson[];
  } catch {
    return false;
  }

  await saveStudentsToRelationalStore(tenant, students);
  await tenant.appStorage.deleteMany({ where: { key: STUDENTS_STORAGE_KEY } });
  return true;
}
