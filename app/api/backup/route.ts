import { NextResponse } from "next/server";
import fs from "node:fs";

import {
  createSchoolDatabaseBackup,
  formatSchoolBackupStatus,
  getSchoolBackupFilePath,
  getSchoolBackupStatus,
  runScheduledSchoolBackupIfDue,
} from "@/lib/server/school-backup";
import { catalogPrisma } from "@/lib/catalog-prisma";
import { isServerDatabaseMode } from "@/lib/storage-mode";

export const runtime = "nodejs";

async function resolveSchool(schoolId: string) {
  return catalogPrisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, status: true },
  });
}

export async function GET(request: Request) {
  if (!isServerDatabaseMode()) {
    return NextResponse.json({ error: "Database mode is disabled." }, { status: 503 });
  }

  const url = new URL(request.url);
  const schoolId = url.searchParams.get("schoolId")?.trim();
  const filename = url.searchParams.get("file")?.trim();

  if (!schoolId) {
    return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
  }

  const school = await resolveSchool(schoolId);
  if (!school || school.status !== "active") {
    return NextResponse.json({ error: "School not found." }, { status: 404 });
  }

  if (filename) {
    const filepath = getSchoolBackupFilePath(schoolId, filename);
    if (!filepath) {
      return NextResponse.json({ error: "Backup file not found." }, { status: 404 });
    }

    const buffer = fs.readFileSync(filepath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const status = await getSchoolBackupStatus(schoolId);
  return NextResponse.json({
    statusLabel: formatSchoolBackupStatus(status.meta),
    ...status,
  });
}

export async function POST(request: Request) {
  if (!isServerDatabaseMode()) {
    return NextResponse.json({ error: "Database mode is disabled." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      schoolId?: string;
      action?: "createNow" | "runIfDue";
    };

    const schoolId = body.schoolId?.trim();
    const action = body.action ?? "createNow";

    if (!schoolId) {
      return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
    }

    const school = await resolveSchool(schoolId);
    if (!school || school.status !== "active") {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    const created =
      action === "runIfDue"
        ? await runScheduledSchoolBackupIfDue(school.id, school.name)
        : await createSchoolDatabaseBackup(school.id, school.name);

    const status = await getSchoolBackupStatus(schoolId);
    return NextResponse.json({
      ok: true,
      created: Boolean(created),
      backup: created,
      statusLabel: formatSchoolBackupStatus(status.meta),
      ...status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create school backup.",
      },
      { status: 500 },
    );
  }
}
