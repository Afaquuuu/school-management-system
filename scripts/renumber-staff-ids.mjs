import { config } from "dotenv";
import { PrismaClient as CatalogClient } from "@prisma/catalog-client";
import { PrismaClient as TenantClient } from "@prisma/tenant-client";

config();

function tenantUrl(databaseName) {
  const catalogUrl = process.env.CATALOG_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!catalogUrl) throw new Error("Missing CATALOG_DATABASE_URL");
  const url = new URL(catalogUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function employeeNoSortValue(employeeNo) {
  const match = employeeNo.match(/^STF(\d+)$/i);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

const catalog = new CatalogClient();
const school = await catalog.school.findFirst({
  where: { status: "active" },
  select: { id: true, name: true, databaseName: true },
});

if (!school) {
  throw new Error("No active school found.");
}

const tenant = new TenantClient({
  datasources: { db: { url: tenantUrl(school.databaseName) } },
});

const profiles = await tenant.staffProfile.findMany({
  include: { user: true },
  orderBy: { employeeNo: "asc" },
});

profiles.sort(
  (a, b) =>
    employeeNoSortValue(a.employeeNo) - employeeNoSortValue(b.employeeNo) ||
    a.user.name.localeCompare(b.user.name),
);

console.log(`Renumbering ${profiles.length} staff in ${school.name}`);

// Phase 1: move to temporary IDs to avoid unique collisions.
for (let index = 0; index < profiles.length; index += 1) {
  const profile = profiles[index];
  const tempId = `STF9${String(index + 1).padStart(3, "0")}`;
  await tenant.staffProfile.update({
    where: { id: profile.id },
    data: { employeeNo: tempId },
  });
  console.log(`${profile.user.name}: ${profile.employeeNo} -> ${tempId}`);
}

// Phase 2: assign final sequential IDs STF001..STF0NN.
for (let index = 0; index < profiles.length; index += 1) {
  const profile = profiles[index];
  const finalId = `STF${String(index + 1).padStart(3, "0")}`;
  await tenant.staffProfile.update({
    where: { id: profile.id },
    data: { employeeNo: finalId },
  });
  console.log(`${profile.user.name}: -> ${finalId}`);
}

const updated = await tenant.staffProfile.findMany({
  include: { user: true },
  orderBy: { employeeNo: "asc" },
});

console.log(
  "\nFinal staff IDs:",
  JSON.stringify(
    updated.map((row) => ({
      staffId: row.employeeNo,
      name: row.user.name,
      email: row.user.email,
    })),
    null,
    2,
  ),
);

await tenant.$disconnect();
await catalog.$disconnect();
