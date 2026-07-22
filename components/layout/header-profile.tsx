"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, LogOut, User } from "lucide-react";
import { performAppSignOut } from "@/lib/app-sign-out";
import {
  clearUserSession,
  getUserSession,
  redirectToLogin,
  type UserSession,
} from "@/lib/teacher-check-in";
import { cn } from "@/lib/utils";

function getRoleBadgeColor(role: string) {
  switch (role.toLowerCase()) {
    case "admin":
      return "bg-red-50 text-red-700";
    case "teacher":
      return "bg-emerald-50 text-emerald-700";
    case "student":
      return "bg-blue-50 text-blue-700";
    case "parent":
      return "bg-violet-50 text-violet-700";
    case "accountant":
      return "bg-amber-50 text-amber-700";
    case "librarian":
      return "bg-teal-50 text-teal-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function HeaderProfile() {
  const [userSession, setUserSession] = useState<UserSession | null>(() =>
    typeof window !== "undefined" ? getUserSession() : null,
  );
  const [open, setOpen] = useState(false);

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
    setOpen(false);
    performAppSignOut({ clearSelectedSchool: false });
    setUserSession(null);
    redirectToLogin();
  };

  if (!userSession) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <User className="h-4 w-4 text-slate-400" />
        <span className="hidden text-sm text-slate-500 sm:inline">Not signed in</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white pl-1 pr-2 shadow-sm transition-colors hover:bg-slate-50 sm:gap-2.5 sm:py-1.5 sm:pl-1.5 sm:pr-3"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-[11px] font-bold text-white shadow-sm sm:h-9 sm:w-9 sm:text-xs">
          {getInitials(userSession.name)}
        </div>
        <div className="hidden text-left sm:block">
          <p className="max-w-[140px] truncate text-sm font-semibold text-slate-900">
            {userSession.name}
          </p>
          <p className="text-xs capitalize text-slate-500">
            {userSession.role === "admin" ? "Admin" : userSession.role}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform sm:h-4 sm:w-4",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close profile menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-900">{userSession.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{userSession.email}</p>
              <span
                className={cn(
                  "mt-2 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  getRoleBadgeColor(userSession.role),
                )}
              >
                {userSession.role}
              </span>
            </div>
            <div className="p-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
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
