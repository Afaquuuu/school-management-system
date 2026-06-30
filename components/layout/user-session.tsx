"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ChevronDown } from "lucide-react";

type UserSession = {
  id: string;
  name: string;
  email: string;
  role: string;
  classDepartment: string;
  schoolId: string;
  loginTime: string;
};

export function UserSession() {
  const router = useRouter();
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const session = localStorage.getItem("user_session");
      if (session) {
        try {
          setUserSession(JSON.parse(session));
        } catch (error) {
          console.error("Error parsing user session:", error);
        }
      }
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user_session");
      localStorage.removeItem("user_role");
    }
    router.push("/login");
  };

  if (!userSession) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <User className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500">Not logged in</span>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "bg-red-50 text-red-700 ring-1 ring-red-100";
      case "teacher":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
      case "student":
        return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";
      case "parent":
        return "bg-violet-50 text-violet-700 ring-1 ring-violet-100";
      default:
        return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-all hover:border-slate-300 hover:shadow-sm"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-semibold text-white">
          {userSession.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-slate-900">
            {userSession.name}
          </p>
          <span
            className={`mt-0.5 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getRoleBadgeColor(userSession.role)}`}
          >
            {userSession.role}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${showDropdown ? "rotate-180" : ""}`}
        />
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated">
            <div className="border-b border-slate-100 p-3">
              <p className="text-sm font-semibold text-slate-900">{userSession.name}</p>
              <p className="text-xs text-slate-500">{userSession.email}</p>
              <p className="mt-0.5 text-xs text-slate-400">{userSession.classDepartment}</p>
            </div>
            <div className="p-2">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
