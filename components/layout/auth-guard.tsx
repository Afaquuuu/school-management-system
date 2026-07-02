"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { School } from "lucide-react";
import { getUserSession } from "@/lib/teacher-check-in";

type UserSession = {
  id: string;
  name: string;
  email: string;
  role: string;
  classDepartment: string;
  schoolId: string;
  loginTime: string;
};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/school-auth', '/unauthorized'];

  const syncSession = useCallback(() => {
    setUserSession(getUserSession());
    setIsLoading(false);
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
    if (!isLoading) {
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
      
      if (!userSession && !isPublicRoute) {
        // No session and trying to access protected route
        router.push('/login');
      } else if (userSession && pathname === '/login') {
        // Has session but on login page, redirect based on role
        const role = userSession.role.toLowerCase();
        if (role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [isLoading, userSession, pathname, router]);

  if (isLoading) {
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

  // Show children for public routes or when user is authenticated
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  if (isPublicRoute || userSession) {
    return <>{children}</>;
  }

  // This shouldn't happen due to the redirect above, but just in case
  return null;
}