import { execFileSync } from "node:child_process";
import path from "node:path";

import { PrismaClient } from "@prisma/catalog-client";

import {
  buildCatalogDatabaseUrl,
  buildTenantDatabaseName,
  buildTenantDatabaseUrl,
  getBootstrapAdminUrl,
  getCatalogDatabaseUrl,
  getDefaultCatalogDatabaseName,
} from "@/lib/database-url";
import { catalogPrisma } from "@/lib/catalog-prisma";
import { disconnectTenantPrisma } from "@/lib/tenant-prisma";

const TENANT_SCHEMA_PATH = path.join(process.cwd(), "prisma", "tenant", "schema.prisma");

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function getAdminPrismaClient(): PrismaClient {
  if (process.env.POSTGRES_ADMIN_URL) {
    return new PrismaClient({
      datasources: { db: { url: process.env.POSTGRES_ADMIN_URL } },
    });
  }

  const catalogUrl = getCatalogDatabaseUrl();
  if (!catalogUrl) {
    throw new Error("CATALOG_DATABASE_URL or DATABASE_URL is required.");
  }

  return new PrismaClient({
    datasources: { db: { url: catalogUrl } },
  });
}

async function databaseExists(admin: PrismaClient, databaseName: string): Promise<boolean> {
  const rows = await admin.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS(
      SELECT 1 FROM pg_database WHERE datname = ${databaseName}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function createDatabase(admin: PrismaClient, databaseName: string): Promise<void> {
  const exists = await databaseExists(admin, databaseName);
  if (exists) return;

  await admin.$executeRawUnsafe(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
}

async function dropDatabase(admin: PrismaClient, databaseName: string): Promise<void> {
  const exists = await databaseExists(admin, databaseName);
  if (!exists) return;

  await admin.$executeRawUnsafe(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${databaseName.replace(/'/g, "''")}' AND pid <> pg_backend_pid()`,
  ).catch(() => undefined);

  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);
}

function runTenantSchemaPush(databaseName: string): void {
  const tenantUrl = buildTenantDatabaseUrl(databaseName);
  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "db", "push", "--schema", TENANT_SCHEMA_PATH, "--accept-data-loss"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TENANT_DATABASE_URL: tenantUrl,
      },
      stdio: "pipe",
    },
  );
}

export async function ensureCatalogDatabase(): Promise<void> {
  const catalogUrl = getCatalogDatabaseUrl();
  if (!catalogUrl) {
    throw new Error("CATALOG_DATABASE_URL or DATABASE_URL is required.");
  }

  const catalogDbName = getDefaultCatalogDatabaseName();
  const admin = new PrismaClient({
    datasources: { db: { url: getBootstrapAdminUrl() } },
  });

  try {
    await createDatabase(admin, catalogDbName);
    execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      [
        "prisma",
        "migrate",
        "deploy",
        "--schema",
        path.join(process.cwd(), "prisma", "catalog", "schema.prisma"),
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          CATALOG_DATABASE_URL: buildCatalogDatabaseUrl(catalogDbName),
        },
        stdio: "pipe",
      },
    );
  } finally {
    await admin.$disconnect();
  }
}

export async function provisionTenantDatabase(schoolId: string): Promise<string> {
  const databaseName = buildTenantDatabaseName(schoolId);
  const admin = getAdminPrismaClient();

  try {
    await createDatabase(admin, databaseName);
  } finally {
    await admin.$disconnect();
  }

  runTenantSchemaPush(databaseName);
  return databaseName;
}

export async function deprovisionTenantDatabase(databaseName: string): Promise<void> {
  await disconnectTenantPrisma(databaseName);

  const admin = getAdminPrismaClient();

  try {
    await dropDatabase(admin, databaseName);
  } finally {
    await admin.$disconnect();
  }
}

export async function listActiveTenantDatabaseNames(): Promise<string[]> {
  const schools = await catalogPrisma.school.findMany({
    where: { status: "active" },
    select: { databaseName: true },
    orderBy: { createdAt: "asc" },
  });

  return schools.map((school) => school.databaseName);
}

export async function deployTenantSchemasForAllSchools(): Promise<void> {
  const databaseNames = await listActiveTenantDatabaseNames();
  for (const databaseName of databaseNames) {
    runTenantSchemaPush(databaseName);
  }
}
