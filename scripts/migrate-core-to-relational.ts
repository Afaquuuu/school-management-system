import { catalogPrisma } from "@/lib/catalog-prisma";
import {
  ACCOUNTS_STORAGE_KEY,
  migrateLegacyAccountsIfNeeded,
} from "@/lib/server/accounts-relational";
import {
  CLASSES_STORAGE_KEY,
  migrateLegacyClassesIfNeeded,
} from "@/lib/server/classes-relational";
import { migrateAllLegacyJsonKeysForTenant } from "@/lib/server/json-store-relational";
import {
  migrateLegacyStaffIfNeeded,
  STAFF_STORAGE_KEY,
} from "@/lib/server/staff-relational";
import {
  migrateLegacyStudentsIfNeeded,
  STUDENTS_STORAGE_KEY,
} from "@/lib/server/students-relational";
import { deployTenantSchemasForAllSchools } from "@/lib/server/tenant-provisioning";
import { getSchoolDatabaseName } from "@/lib/server/schools";
import { getTenantPrisma } from "@/lib/tenant-prisma";

async function main() {
  await deployTenantSchemasForAllSchools();

  const schools = await catalogPrisma.school.findMany({
    where: { status: "active" },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  for (const school of schools) {
    const studentMigrated = await migrateLegacyStudentsIfNeeded(school.id);
    const classMigrated = await migrateLegacyClassesIfNeeded(school.id);
    const staffMigrated = await migrateLegacyStaffIfNeeded(school.id);
    const accountMigrated = await migrateLegacyAccountsIfNeeded(school.id);

    console.log(
      studentMigrated
        ? `Migrated students for ${school.name} into StudentProfile.`
        : `No legacy ${STUDENTS_STORAGE_KEY} migration needed for ${school.name}.`,
    );
    console.log(
      classMigrated
        ? `Migrated classes for ${school.name} into SchoolClass.`
        : `No legacy ${CLASSES_STORAGE_KEY} migration needed for ${school.name}.`,
    );
    console.log(
      staffMigrated
        ? `Migrated staff for ${school.name} into StaffProfile.`
        : `No legacy ${STAFF_STORAGE_KEY} migration needed for ${school.name}.`,
    );
    console.log(
      accountMigrated
        ? `Migrated users for ${school.name} into SystemAccount (parents/admins/teachers).`
        : `No legacy ${ACCOUNTS_STORAGE_KEY} migration needed for ${school.name}.`,
    );

    const databaseName = await getSchoolDatabaseName(school.id);
    if (databaseName) {
      const tenant = getTenantPrisma(databaseName);
      const jsonMigrated = await migrateAllLegacyJsonKeysForTenant(tenant);
      if (jsonMigrated.length > 0) {
        console.log(
          `Migrated ${jsonMigrated.length} JSON store key(s) for ${school.name}: ${jsonMigrated.join(", ")}`,
        );
      } else {
        console.log(`No remaining AppStorage JSON keys to migrate for ${school.name}.`);
      }
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await catalogPrisma.$disconnect();
  });
