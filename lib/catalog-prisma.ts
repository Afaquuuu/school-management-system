import { PrismaClient } from "@prisma/catalog-client";

const globalForCatalog = globalThis as unknown as {
  catalogPrisma?: PrismaClient;
};

export const catalogPrisma =
  globalForCatalog.catalogPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForCatalog.catalogPrisma = catalogPrisma;
}
