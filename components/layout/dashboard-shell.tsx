"use client";

import { useState, useEffect, useRef, Suspense, type ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  X,
  GraduationCap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth";
import { useSchool } from "@/lib/school-context";
import {
  getUnreadAlertCount,
  getVisibleAlerts,
  markAlertRead,
  markAllAlertsRead,
  refreshSchoolAlerts,
  type ActiveAlert,
} from "@/lib/school-alerts";
import { UserSession } from "./user-session";
import { SchoolSwitcher } from "./school-switcher";
import { SidebarNav } from "./sidebar-nav";

export function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const { currentSchool } = useSchool();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("student");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("user_role") as UserRole;
      if (role) {
        setUserRole(role);
      }
    }
  }, []);

  useEffect(() => {
    if (!currentSchool) return;
    refreshSchoolAlerts(currentSchool.id);
    setAlerts(getVisibleAlerts(currentSchool.id));
    setUnreadCount(getUnreadAlertCount(currentSchool.id));
  }, [currentSchool]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenNotifications = () => {
    if (!currentSchool) {
      setNotificationsOpen((open) => !open);
      return;
    }

    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) {
      setAlerts(getVisibleAlerts(currentSchool.id));
      setUnreadCount(getUnreadAlertCount(currentSchool.id));
    }
  };

  const handleMarkAllRead = () => {
    if (!currentSchool) return;
    markAllAlertsRead(currentSchool.id);
    setAlerts(getVisibleAlerts(currentSchool.id));
    setUnreadCount(0);
  };

  const handleMarkRead = (alertId: string) => {
    if (!currentSchool) return;
    markAlertRead(currentSchool.id, alertId);
    setAlerts(getVisibleAlerts(currentSchool.id));
    setUnreadCount(getUnreadAlertCount(currentSchool.id));
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-slate-200/80 bg-white shadow-sidebar transition-transform duration-300 md:static md:translate-x-0",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          )}
        >
          <div className="flex h-full flex-col px-4 py-5">
            <div className="mb-5 flex items-center gap-3 px-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="section-label">School OS</p>
                <h2 className="text-base font-semibold tracking-tight text-slate-900">
                  Management Suite
                </h2>
              </div>
              <button
                type="button"
                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 md:hidden"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4">
              <SchoolSwitcher />
            </div>

            <Suspense
              fallback={
                <div className="sidebar-scroll mt-4 flex-1 space-y-2 px-1">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-11 animate-pulse rounded-lg bg-slate-100"
                    />
                  ))}
                </div>
              }
            >
              <SidebarNav
                userRole={userRole}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </Suspense>

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <UserSession />
              <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-sm">
                <p className="section-label text-slate-400">Today</p>
                <p className="mt-2 text-sm font-medium leading-relaxed">
                  Attendance, billing, and exams are live.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {mobileNavOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[2px] md:hidden"
            aria-label="Dismiss navigation overlay"
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
            <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
                onClick={() => setMobileNavOpen((open) => !open)}
                aria-label="Toggle navigation"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden min-w-0 flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2 md:flex">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="Search students, invoices, attendance..."
                  aria-label="Search school data"
                />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="relative" ref={notificationsRef}>
                  <button
                    type="button"
                    onClick={handleOpenNotifications}
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">Notifications</p>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        {alerts.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-slate-500">
                            No active alerts right now.
                          </div>
                        ) : (
                          alerts.slice(0, 8).map((alert) => (
                            <button
                              key={alert.id}
                              type="button"
                              onClick={() => handleMarkRead(alert.id)}
                              className={cn(
                                "block w-full border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                                !alert.read && "bg-blue-50/60",
                              )}
                            >
                              <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                                {alert.message}
                              </p>
                            </button>
                          ))
                        )}
                      </div>

                      {userRole === "admin" && (
                        <div className="border-t border-slate-100 px-4 py-3">
                          <Link
                            href="/admin/alerts"
                            onClick={() => setNotificationsOpen(false)}
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            Manage alerts
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-blue-700 text-xs font-semibold text-white">
                    SM
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-medium text-slate-900">School Admin</p>
                    <p className="text-xs capitalize text-slate-500">{userRole}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
