"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { School } from "lucide-react";
import { getUserSession, type UserSession } from "@/lib/teacher-check-in";

const PUBLIC_ROUTES = ["/login", "/school-auth", "/unauthorized"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const publicRoute = isPublicPath(pathname);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [checked, setChecked] = useState(publicRoute);

  const syncSession = useCallback(() => {
    setUserSession(getUserSession());
    setChecked(true);
  }, []);

  useEffect(() => {
    if (publicRoute) {
      setChecked(true);
      return;
    }

    syncSession();
    window.addEventListener("user-session-changed", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("user-session-changed", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [publicRoute, syncSession]);

  useEffect(() => {
    if (!checked || publicRoute) return;

    if (!userSession) {
      router.replace("/login");
      return;
    }

    if (pathname === "/login") {
      const role = userSession.role.toLowerCase();
      router.replace(role === "admin" ? "/admin" : "/dashboard");
    }
  }, [checked, userSession, pathname, router, publicRoute]);

  if (publicRoute) {
    return <>{children}</>;
  }

  if (!checked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <School className="w-8 h-8 text-white" />
          </div>
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (userSession) {
    return <>{children}</>;
  }

  return null;
}
