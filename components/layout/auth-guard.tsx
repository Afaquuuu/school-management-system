"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AppLoadingScreen } from "@/components/layout/app-loading-screen";
import { getUserSession, type UserSession } from "@/lib/teacher-check-in";

const PUBLIC_ROUTES = ["/", "/login", "/school-auth", "/unauthorized"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === "/") {
      return pathname === "/";
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

function getDashboardPath(role: string): string {
  return role.toLowerCase() === "admin" ? "/admin" : "/dashboard";
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const publicRoute = isPublicPath(pathname);
  const [ready, setReady] = useState(false);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  const syncSession = useCallback(() => {
    setUserSession(getUserSession());
    setReady(true);
  }, []);

  useEffect(() => {
    syncSession();
    window.addEventListener("user-session-changed", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("user-session-changed", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [syncSession]);

  useEffect(() => {
    syncSession();
  }, [pathname, syncSession]);

  useEffect(() => {
    if (!ready) return;

    if (publicRoute) {
      if (userSession && pathname === "/login") {
        router.replace(getDashboardPath(userSession.role));
      }
      return;
    }

    if (!userSession) {
      router.replace("/login");
    }
  }, [ready, userSession, pathname, router, publicRoute]);

  if (publicRoute) {
    return <>{children}</>;
  }

  if (!ready || !userSession) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
}
