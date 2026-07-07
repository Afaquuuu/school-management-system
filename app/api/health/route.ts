import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isServerDatabaseMode } from "@/lib/storage-mode";

export const runtime = "nodejs";

export async function GET() {
  const databaseEnabled = isServerDatabaseMode();

  if (!databaseEnabled) {
    return NextResponse.json({
      ok: true,
      mode: "localStorage",
      database: "disabled",
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      mode: "postgresql",
      database: "connected",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: "postgresql",
        database: "error",
        error: error instanceof Error ? error.message : "Database connection failed.",
      },
      { status: 503 },
    );
  }
}
