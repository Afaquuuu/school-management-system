import { NextResponse } from "next/server";

import { catalogPrisma } from "@/lib/catalog-prisma";
import { isServerDatabaseMode } from "@/lib/storage-mode";
import { listActiveTenantDatabaseNames } from "@/lib/server/tenant-provisioning";

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
    await catalogPrisma.$queryRaw`SELECT 1`;
    const schools = await catalogPrisma.school.count({
      where: { status: "active" },
    });
    const tenantDatabases = await listActiveTenantDatabaseNames();

    return NextResponse.json({
      ok: true,
      mode: "postgresql-multi-db",
      database: "connected",
      catalogSchools: schools,
      tenantDatabases,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: "postgresql-multi-db",
        database: "error",
        error: error instanceof Error ? error.message : "Database connection failed.",
      },
      { status: 503 },
    );
  }
}
