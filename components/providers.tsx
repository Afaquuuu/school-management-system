"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { SchoolProvider } from "@/lib/school-context";
import { StorageReadyGate } from "@/components/storage-ready-gate";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SchoolProvider>
        <StorageReadyGate>{children}</StorageReadyGate>
      </SchoolProvider>
    </QueryClientProvider>
  );
}