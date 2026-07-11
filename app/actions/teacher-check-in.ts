"use server";

import { auth } from "@clerk/nextjs/server";

import { getSchoolDatabaseName } from "@/lib/server/schools";
import { getTenantPrisma } from "@/lib/tenant-prisma";

export async function teacherCheckIn(input: {
  schoolId: string;
  classroomId?: string;
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
}) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthenticated teacher.");
  }

  const databaseName = await getSchoolDatabaseName(input.schoolId);
  if (!databaseName) {
    throw new Error("School database is not available.");
  }

  const tenant = getTenantPrisma(databaseName);
  const staff = await tenant.staffProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!staff) {
    throw new Error("Teacher profile not found.");
  }

  return tenant.teacherCheckIn.create({
    data: {
      teacherId: staff.id,
      classroomId: input.classroomId ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      ipAddress: input.ipAddress,
      checkInAt: new Date(),
    },
  });
}
