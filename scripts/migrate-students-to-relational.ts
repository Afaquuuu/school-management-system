import { catalogPrisma } from "@/lib/catalog-prisma";
import {
  migrateLegacyStudentsIfNeeded,
  STUDENTS_STORAGE_KEY,
} from "@/lib/server/students-relational";
import { deployTenantSchemasForAllSchools } from "@/lib/server/tenant-provisioning";

async function main() {
  await deployTenantSchemasForAllSchools();

  const schools = await catalogPrisma.school.findMany({
    where: { status: "active" },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  for (const school of schools) {
    const migrated = await migrateLegacyStudentsIfNeeded(school.id);
    console.log(
      migrated
        ? `Migrated students for ${school.name} into StudentProfile.`
        : `No legacy ${STUDENTS_STORAGE_KEY} migration needed for ${school.name}.`,
    );
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
