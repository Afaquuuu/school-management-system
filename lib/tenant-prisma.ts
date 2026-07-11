import { PrismaClient } from "@prisma/tenant-client";

import { buildTenantDatabaseUrl } from "@/lib/database-url";

const globalForTenants = globalThis as unknown as {
  tenantPrismaClients?: Map<string, PrismaClient>;
};

function getTenantClientCache(): Map<string, PrismaClient> {
  if (!globalForTenants.tenantPrismaClients) {
    globalForTenants.tenantPrismaClients = new Map();
  }
  return globalForTenants.tenantPrismaClients;
}

export function getTenantPrisma(databaseName: string): PrismaClient {
  const cache = getTenantClientCache();
  const existing = cache.get(databaseName);
  if (existing) return existing;

  const client = new PrismaClient({
    datasources: {
      db: {
        url: buildTenantDatabaseUrl(databaseName),
      },
    },
  });

  cache.set(databaseName, client);
  return client;
}

export async function disconnectTenantPrisma(databaseName: string): Promise<void> {
  const cache = getTenantClientCache();
  const client = cache.get(databaseName);
  if (!client) return;

  await client.$disconnect();
  cache.delete(databaseName);
}

export async function disconnectAllTenantPrisma(): Promise<void> {
  const cache = getTenantClientCache();
  await Promise.all(
    Array.from(cache.values()).map((client) => client.$disconnect()),
  );
  cache.clear();
}
