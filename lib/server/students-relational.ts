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
  if (!profile.legacyId) return null;

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
    id: profile.legacyId,
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

export async function listStudentsFromRelationalStore(
  tenant: PrismaClient,
): Promise<StoredStudentJson[]> {
  const rows = await tenant.studentProfile.findMany({
    where: { legacyId: { not: null } },
    include: { user: true },
    orderBy: { admissionNo: "asc" },
  });

  return rows
    .map((row) => toStoredStudentJson(row))
    .filter((row): row is StoredStudentJson => row !== null);
}

export async function saveStudentsToRelationalStore(
  tenant: PrismaClient,
  students: StoredStudentJson[],
): Promise<void> {
  const existing = await tenant.studentProfile.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true, userId: true },
  });

  const incomingIds = new Set(students.map((student) => student.id));

  for (const profile of existing) {
    if (profile.legacyId && !incomingIds.has(profile.legacyId)) {
      await tenant.user.delete({ where: { id: profile.userId } });
    }
  }

  for (const student of students) {
    const email = buildStudentEmail(student);
    const name = buildStudentName(student);
    const existingProfile = await tenant.studentProfile.findUnique({
      where: { legacyId: student.id },
      include: { user: true },
    });

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
    };

    if (existingProfile) {
      await tenant.user.update({
        where: { id: existingProfile.userId },
        data: {
          name,
          email,
          phone: student.phone ?? "",
          isActive: isActiveStatus(student.status),
        },
      });

      await tenant.studentProfile.update({
        where: { id: existingProfile.id },
        data: profileData,
      });
      continue;
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
          create: {
            legacyId: student.id,
            ...profileData,
          },
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
  try {
    await saveStudentsToRelationalStore(tenant, students);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A student with this email already exists in the school records.");
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
