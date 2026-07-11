import { PrismaClient as LegacyPrismaClient } from "@prisma/client";

import {
  buildCatalogDatabaseUrl,
  buildTenantDatabaseName,
  getDefaultCatalogDatabaseName,
} from "../lib/database-url";
import { provisionTenantDatabase, ensureCatalogDatabase } from "../lib/server/tenant-provisioning";
import { catalogPrisma } from "../lib/catalog-prisma";
import { getTenantPrisma } from "../lib/tenant-prisma";

type LegacySchool = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type LegacyTenantRow = {
  schoolId: string;
  key: string;
  value: string;
};

async function main() {
  const legacyUrl =
    process.env.LEGACY_DATABASE_URL ??
    process.env.DATABASE_URL?.replace(/school_catalog/g, "school_management") ??
    "";

  if (!legacyUrl) {
    throw new Error("Set LEGACY_DATABASE_URL to the old school_management database.");
  }

  console.log("Ensuring catalog database...");
  await ensureCatalogDatabase();

  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: legacyUrl } },
  });

  try {
    const legacySchools = await legacy.$queryRaw<LegacySchool[]>`
      SELECT id, name, address, phone, email, logo, "createdAt", "updatedAt"
      FROM "School"
      ORDER BY "createdAt" ASC
    `;

    console.log(`Found ${legacySchools.length} legacy school(s).`);

    for (const school of legacySchools) {
      const databaseName = buildTenantDatabaseName(school.id);
      const existing = await catalogPrisma.school.findUnique({
        where: { id: school.id },
        select: { id: true, status: true },
      });

      if (!existing) {
        await catalogPrisma.school.create({
          data: {
            id: school.id,
            name: school.name,
            address: school.address,
            phone: school.phone,
            email: school.email,
            logo: school.logo,
            databaseName,
            status: "provisioning",
            createdAt: school.createdAt,
            updatedAt: school.updatedAt,
          },
        });
      }

      console.log(`Provisioning tenant database ${databaseName}...`);
      await provisionTenantDatabase(school.id);

      const tenant = getTenantPrisma(databaseName);
      const rows = await legacy.$queryRaw<LegacyTenantRow[]>`
        SELECT "schoolId", key, value
        FROM "TenantStorage"
        WHERE "schoolId" = ${school.id}
      `;

      for (const row of rows) {
        await tenant.appStorage.upsert({
          where: { key: row.key },
          create: { key: row.key, value: row.value },
          update: { value: row.value },
        });
      }

      await catalogPrisma.school.update({
        where: { id: school.id },
        data: { status: "active", databaseName },
      });

      console.log(`Migrated ${rows.length} storage row(s) for ${school.name}.`);
    }

    console.log("Migration complete.");
    console.log(
      `Set CATALOG_DATABASE_URL=${buildCatalogDatabaseUrl(getDefaultCatalogDatabaseName())}`,
    );
  } finally {
    await legacy.$disconnect();
    await catalogPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
