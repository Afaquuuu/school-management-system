"use client";

import { usePathname } from "next/navigation";
import { useSchool } from "@/lib/school-context";
import { isClientDatabaseMode } from "@/lib/storage-mode";

const PUBLIC_ENTRY_PATHS = ["/", "/school-auth", "/login", "/unauthorized"];

function isPublicEntryPath(pathname: string): boolean {
  return PUBLIC_ENTRY_PATHS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">{message}</p>
      </div>
    </div>
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
    return <LoadingScreen message="Loading schools..." />;
  }

  if (currentSchool && !isStorageReady && !publicEntry) {
    return <LoadingScreen message="Loading school data..." />;
  }

  return <>{children}</>;
}
