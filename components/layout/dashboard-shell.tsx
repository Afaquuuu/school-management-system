"use client";

import { useState, useEffect, useRef, Suspense, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Menu,
  Search,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth";
import { isUserRole } from "@/lib/auth";
import { useSchool } from "@/lib/school-context";
import {
  getUnreadAlertCountForViewer,
  getVisibleAlertsForViewer,
  markAlertRead,
  markAllAlertsRead,
  type ActiveAlert,
} from "@/lib/school-alerts";
import { refreshAndDispatchSchoolAlerts } from "@/lib/alert-dispatch";
import { runSchoolBackupIfDue } from "@/lib/backup-client";
import { getUserSession, redirectToLogin } from "@/lib/teacher-check-in";
import {
  isSessionExpired,
  touchUserSession,
} from "@/lib/school-security";
import { getActivePageContext } from "@/lib/navigation";
import { UserSession } from "./user-session";
import { HeaderProfile } from "./header-profile";
import { SchoolBrand } from "./school-brand";
import { SidebarNav } from "./sidebar-nav";
import { WhatsAppQueueStatus } from "@/components/whatsapp-queue-status";
import { DashboardMeshBackground } from "@/components/dashboard/dashboard-mesh-background";

function HeaderContext({
  userRole,
}: {
  userRole: UserRole;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  const { groupLabel, pageLabel } = getActivePageContext(
    userRole,
    pathname,
    search,
    hash,
  );

  return (
    <div className="hidden min-w-0 md:block">
      <div className="dashboard-breadcrumb">
        <span className="dashboard-breadcrumb-group">{groupLabel}</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="dashboard-breadcrumb-page">{pageLabel}</span>
      </div>
    </div>
  );
}

export function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const { currentSchool } = useSchool();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("student");
  const [emailSetupNotice, setEmailSetupNotice] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("user_role") as UserRole;
      if (isUserRole(role)) {
        setUserRole(role);
      }
    }
  }, []);

  useEffect(() => {
    const notice = sessionStorage.getItem("admin_email_setup_required");
    if (notice) {
      setEmailSetupNotice(notice);
      sessionStorage.removeItem("admin_email_setup_required");
    }
  }, []);

  useEffect(() => {
    if (!currentSchool) return;

    const enforceSession = () => {
      const session = getUserSession();
      if (!session || session.schoolId !== currentSchool.id) return;
      if (isSessionExpired(currentSchool.id, session)) {
        redirectToLogin();
        return;
      }
      touchUserSession(session);
    };

    enforceSession();

    const intervalId = window.setInterval(enforceSession, 60_000);
    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    let lastTouch = 0;

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastTouch < 30_000) return;
      lastTouch = now;
      const session = getUserSession();
      if (!session || session.schoolId !== currentSchool.id) return;
      if (!isSessionExpired(currentSchool.id, session)) {
        touchUserSession(session);
      }
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    return () => {
      window.clearInterval(intervalId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [currentSchool]);

  useEffect(() => {
    if (!currentSchool || userRole !== "admin") return;
    void runSchoolBackupIfDue(currentSchool.id).catch(() => undefined);
  }, [currentSchool, userRole]);

  useEffect(() => {
    if (!currentSchool) return;

    let cancelled = false;

    const syncAlerts = async () => {
      await refreshAndDispatchSchoolAlerts(currentSchool.id, currentSchool.name);
      if (cancelled) return;

      const session = getUserSession();
      const viewer = { role: userRole, email: session?.email };
      setAlerts(getVisibleAlertsForViewer(currentSchool.id, viewer));
      setUnreadCount(getUnreadAlertCountForViewer(currentSchool.id, viewer));
    };

    void syncAlerts();

    return () => {
      cancelled = true;
    };
  }, [currentSchool, userRole]);

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

    const session = getUserSession();
    const viewer = { role: userRole, email: session?.email };
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) {
      setAlerts(getVisibleAlertsForViewer(currentSchool.id, viewer));
      setUnreadCount(getUnreadAlertCountForViewer(currentSchool.id, viewer));
    }
  };

  const handleMarkAllRead = () => {
    if (!currentSchool) return;
    markAllAlertsRead(currentSchool.id);
    const session = getUserSession();
    const viewer = { role: userRole, email: session?.email };
    setAlerts(getVisibleAlertsForViewer(currentSchool.id, viewer));
    setUnreadCount(0);
  };

  const handleMarkRead = (alertId: string) => {
    if (!currentSchool) return;
    markAlertRead(currentSchool.id, alertId);
    const session = getUserSession();
    const viewer = { role: userRole, email: session?.email };
    setAlerts(getVisibleAlertsForViewer(currentSchool.id, viewer));
    setUnreadCount(getUnreadAlertCountForViewer(currentSchool.id, viewer));
  };

  return (
    <div className="min-h-screen bg-background text-slate-900">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-slate-900/40 bg-sidebar text-sidebar-foreground shadow-[4px_0_24px_-12px_rgba(0,0,0,0.35)] transition-transform duration-300",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
          <div className="flex h-full flex-col px-4 py-5">
            <div className="mb-6 flex items-center gap-3 px-1">
              <SchoolBrand />
              <button
                type="button"
                className="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 md:hidden"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <Suspense
              fallback={
                <div className="sidebar-scroll mt-4 flex-1 space-y-2 px-1">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-11 animate-pulse rounded-xl bg-slate-100"
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

            <div className="mt-4 border-t border-slate-800/80 pt-4">
              <div className="sidebar-profile-card">
                <UserSession />
              </div>
            </div>
          </div>
        </aside>

        {mobileNavOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm md:hidden"
            aria-label="Dismiss navigation overlay"
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}

      <div className="flex min-h-screen min-w-0 flex-col md:pl-[280px]">
          <header className="dashboard-header-bar">
            <div className="dashboard-header-grid">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
                onClick={() => setMobileNavOpen((open) => !open)}
                aria-label="Toggle navigation"
              >
                <Menu className="h-5 w-5" />
              </button>

              <Suspense fallback={<div className="hidden md:block" />}>
                <HeaderContext userRole={userRole} />
              </Suspense>

              <div className="dashboard-header-search lg:col-start-2">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-slate-400"
                  placeholder="Search students, invoices, attendance..."
                  aria-label="Search school data"
                />
              </div>

              <div className="dashboard-header-actions">
                <div className="relative" ref={notificationsRef}>
                  <button
                    type="button"
                    onClick={handleOpenNotifications}
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                    )}
                  </button>

                  {notificationsOpen && (
                    <div
                      className={cn(
                        "absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg",
                        "max-md:fixed max-md:inset-x-4 max-md:top-[4.25rem] max-md:mt-0 max-md:w-auto",
                      )}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">Notifications</p>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="text-xs font-medium text-teal-700 hover:underline"
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
                                !alert.read && "bg-teal-50/80",
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
                            className="text-sm font-medium text-teal-700 hover:underline"
                          >
                            Manage alerts
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <HeaderProfile />
              </div>
            </div>
          </header>

          <main className="dashboard-main-surface">
            <DashboardMeshBackground />
            <div className="main-content-enter relative z-10 w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 xl:mx-auto">
              {emailSetupNotice && userRole === "admin" && (
                <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p>{emailSetupNotice}</p>
                  <button
                    type="button"
                    onClick={() => setEmailSetupNotice("")}
                    className="shrink-0 text-amber-700 hover:text-amber-900"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <WhatsAppQueueStatus />
              {children}
            </div>
          </main>
        </div>
    </div>
  );
}
