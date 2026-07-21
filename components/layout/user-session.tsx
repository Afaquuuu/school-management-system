"use client";

import { useState, useEffect, useCallback } from "react";
import { User, LogOut } from "lucide-react";
import { performAppSignOut } from "@/lib/app-sign-out";
import { getUserSession, redirectToLogin, type UserSession } from "@/lib/teacher-check-in";

export function UserSession() {
  const [userSession, setUserSession] = useState<UserSession | null>(() =>
    typeof window !== "undefined" ? getUserSession() : null,
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const syncSession = useCallback(() => {
    setUserSession(getUserSession());
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

  const handleLogout = () => {
    setShowDropdown(false);
    performAppSignOut({ clearSelectedSchool: false });
    setUserSession(null);
    redirectToLogin();
  };

  if (!userSession) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <User className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500">Not logged in</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex w-full items-center gap-3 rounded-xl px-1 py-1 transition-all hover:opacity-90"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-semibold text-white">
          {userSession.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-slate-900">
            {userSession.name}
          </p>
          <span className="sidebar-profile-badge">{userSession.role}</span>
        </div>
      </button>

      {showDropdown ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close profile menu"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated">
            <div className="border-b border-slate-100 p-3">
              <p className="text-sm font-semibold text-slate-900">{userSession.name}</p>
              <p className="text-xs text-slate-500">{userSession.email}</p>
              <p className="mt-0.5 text-xs text-slate-400">{userSession.classDepartment}</p>
            </div>
            <div className="p-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
