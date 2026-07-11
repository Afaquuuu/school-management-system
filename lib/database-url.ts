const DEFAULT_CATALOG_DB = "school_catalog";

export function getCatalogDatabaseUrl(): string {
  return (
    process.env.CATALOG_DATABASE_URL ??
    process.env.DATABASE_URL ??
    ""
  );
}

export function getBootstrapAdminUrl(): string {
  if (process.env.POSTGRES_ADMIN_URL) {
    return process.env.POSTGRES_ADMIN_URL;
  }

  const catalogUrl = getCatalogDatabaseUrl();
  if (!catalogUrl) {
    throw new Error("CATALOG_DATABASE_URL or DATABASE_URL is required.");
  }

  const url = new URL(catalogUrl);
  url.pathname = "/postgres";
  return url.toString();
}

export function buildTenantDatabaseName(schoolId: string): string {
  const sanitized = schoolId.replace(/[^a-zA-Z0-9_]/g, "_");
  const name = `sms_${sanitized}`;
  return name.slice(0, 63);
}

export function buildTenantDatabaseUrl(databaseName: string): string {
  const catalogUrl = getCatalogDatabaseUrl();
  if (!catalogUrl) {
    throw new Error("CATALOG_DATABASE_URL or DATABASE_URL is not configured.");
  }

  const url = new URL(catalogUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export function getDefaultCatalogDatabaseName(): string {
  const catalogUrl = getCatalogDatabaseUrl();
  if (!catalogUrl) return DEFAULT_CATALOG_DB;

  const pathname = new URL(catalogUrl).pathname.replace(/^\//, "");
  return pathname || DEFAULT_CATALOG_DB;
}

export function buildCatalogDatabaseUrl(databaseName: string): string {
  const catalogUrl = getCatalogDatabaseUrl();
  if (!catalogUrl) {
    throw new Error("CATALOG_DATABASE_URL or DATABASE_URL is not configured.");
  }

  const url = new URL(catalogUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}
