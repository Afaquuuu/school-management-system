"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect, type ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { navigationItems } from "@/lib/navigation";
import type { UserRole } from "@/lib/auth";
import { UserSession } from "./user-session";
import { SchoolSwitcher } from "./school-switcher";

export function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("student");

  // Load user role from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('user_role') as UserRole;
      if (role) {
        setUserRole(role);
      }
    }
  }, []);

  const visibleNavigation = useMemo(
    () => navigationItems.filter((item) => item.roles.includes(userRole)),
    [userRole],
  );

  return (
    <div className="min-h-screen bg-transparent text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
            className={cn(
              "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200/80 bg-white/90 backdrop-blur-xl transition-transform duration-300 md:static md:translate-x-0",
              mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            )}
          >
            <div className="flex h-full flex-col px-4 py-5">
              {/* School Switcher */}
              <div className="mb-4">
                <SchoolSwitcher />
              </div>

              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">School OS</p>
                  <h2 className="mt-1 text-lg font-semibold">Management Suite</h2>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 md:hidden"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

            <nav className="mt-6 flex-1 space-y-1 overflow-y-auto pr-1">
              {visibleNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-slate-950 text-white shadow-soft"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    )}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Session */}
            <div className="mb-4">
              <UserSession />
            </div>

            <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-soft">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Today</p>
              <p className="mt-2 text-sm font-medium">Attendance, billing, and exams are live.</p>
              <p className="mt-1 text-xs text-slate-300">Use role-aware navigation to keep access clean.</p>
            </div>
            </div>
          </aside>

        {mobileNavOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
            aria-label="Dismiss navigation overlay"
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 md:hidden"
                onClick={() => setMobileNavOpen((open) => !open)}
                aria-label="Toggle navigation"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 md:flex">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="Search students, invoices, attendance, and more"
                  aria-label="Search school data"
                />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2.5 pr-2 text-left"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                    SM
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium">School Admin</p>
                    <p className="text-xs text-slate-500 capitalize">{userRole}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-slate-200/70 bg-white/85 p-4 shadow-soft sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}