export function isServerDatabaseMode(): boolean {
  return process.env.USE_DATABASE === "true" && Boolean(process.env.DATABASE_URL);
}

export function isClientDatabaseMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_DATABASE === "true";
}
