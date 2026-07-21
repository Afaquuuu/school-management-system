"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSchool } from "@/lib/school-context";
import { AppLoadingScreen } from "@/components/layout/app-loading-screen";

export function SchoolAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentSchool } = useSchool();

  useEffect(() => {
    if (!currentSchool) {
      router.push("/school-auth");
    }
  }, [currentSchool, router]);

  if (!currentSchool) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
}
