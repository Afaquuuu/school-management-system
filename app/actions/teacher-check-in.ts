"use server";

import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export async function teacherCheckIn(input: {
  classroomId?: string;
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
}) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthenticated teacher.");
  }

  const staff = await prisma.staffProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!staff) {
    throw new Error("Teacher profile not found.");
  }

  return prisma.teacherCheckIn.create({
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