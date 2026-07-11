import { deployTenantSchemasForAllSchools } from "../lib/server/tenant-provisioning";

async function main() {
  await deployTenantSchemasForAllSchools();
  console.log("Tenant schema deploy complete for all active schools.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
