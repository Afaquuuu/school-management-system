import { catalogPrisma } from "@/lib/catalog-prisma";
import { migrateLegacyStudentDocumentsIfNeeded } from "@/lib/server/student-documents-migration";
import { deployTenantSchemasForAllSchools } from "@/lib/server/tenant-provisioning";

async function main() {
  await deployTenantSchemasForAllSchools();

  const schools = await catalogPrisma.school.findMany({
    where: { status: "active" },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  let totalUploaded = 0;
  let totalCleared = 0;
  let totalFailed = 0;

  for (const school of schools) {
    const result = await migrateLegacyStudentDocumentsIfNeeded(school.id);

    totalUploaded += result.uploaded;
    totalCleared += result.cleared;
    totalFailed += result.failed;

    if (result.uploaded + result.cleared + result.failed === 0) {
      console.log(`No legacy student document blobs for ${school.name}.`);
      continue;
    }

    console.log(
      `${school.name}: uploaded ${result.uploaded}, cleared ${result.cleared}, failed ${result.failed}.`,
    );
  }

  console.log(
    `Done. Uploaded ${totalUploaded}, cleared ${totalCleared}, failed ${totalFailed} across ${schools.length} school(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await catalogPrisma.$disconnect();
  });
