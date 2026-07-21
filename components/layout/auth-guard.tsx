"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
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

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="login-brand-icon mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="" className="login-brand-icon-image" />
        </div>
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    </div>
  );
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
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
