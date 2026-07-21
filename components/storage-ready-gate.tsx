"use client";

import { usePathname } from "next/navigation";
import { useSchool } from "@/lib/school-context";
import { isClientDatabaseMode } from "@/lib/storage-mode";
import { AppLoadingScreen } from "@/components/layout/app-loading-screen";

const PUBLIC_ENTRY_PATHS = ["/", "/school-auth", "/login", "/unauthorized"];

function isPublicEntryPath(pathname: string): boolean {
  return PUBLIC_ENTRY_PATHS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function StorageReadyGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading, isStorageReady, currentSchool } = useSchool();
  const publicEntry = isPublicEntryPath(pathname);

  if (!isClientDatabaseMode()) {
    return <>{children}</>;
  }

  if (isLoading && !publicEntry) {
    return <AppLoadingScreen message="Loading schools..." />;
  }

  if (currentSchool && !isStorageReady && !publicEntry) {
    return <AppLoadingScreen message="Loading school data..." />;
  }

  return <>{children}</>;
}
