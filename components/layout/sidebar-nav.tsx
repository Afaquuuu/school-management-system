"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getVisibleNavigationGroups,
  getActiveNavigationChild,
  groupContainsActiveRoute,
  type NavigationGroup,
} from "@/lib/navigation";
import type { UserRole } from "@/lib/auth";

function getActiveGroupId(
  groups: NavigationGroup[],
  pathname: string,
  search: string,
  hash: string,
) {
  return (
    groups.find((group) =>
      groupContainsActiveRoute(pathname, search, group, hash),
    )?.id ?? null
  );
}

export function SidebarNav({
  userRole,
  onNavigate,
}: {
  userRole: UserRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  const visibleGroups = useMemo(
    () => getVisibleNavigationGroups(userRole),
    [userRole],
  );

  const routeActiveGroupId = useMemo(
    () => getActiveGroupId(visibleGroups, pathname, search, currentHash),
    [visibleGroups, pathname, search, currentHash],
  );

  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (routeActiveGroupId) {
      setOpenGroupId(routeActiveGroupId);
    }
  }, [routeActiveGroupId]);

  const handleToggleGroup = (groupId: string) => {
    setOpenGroupId((current) => (current === groupId ? null : groupId));
  };

  return (
    <nav className="sidebar-scroll mt-2 flex-1 space-y-0.5 overflow-y-auto pr-1">
      {visibleGroups.map((group) => {
        const isOpen = openGroupId === group.id;
        const isGroupActive = group.id === routeActiveGroupId;

        return (
          <NavigationGroupSection
            key={group.id}
            group={group}
            pathname={pathname}
            search={search}
            currentHash={currentHash}
            isOpen={isOpen}
            isGroupActive={isGroupActive}
            onToggle={() => handleToggleGroup(group.id)}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}

function NavigationGroupSection({
  group,
  pathname,
  search,
  currentHash,
  isOpen,
  isGroupActive,
  onToggle,
  onNavigate,
}: {
  group: NavigationGroup;
  pathname: string;
  search: string;
  currentHash: string;
  isOpen: boolean;
  isGroupActive: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const Icon = group.icon;

  return (
    <div
      className={cn(
        "rounded-lg transition-colors",
        isOpen && "bg-slate-800/60",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
          isOpen || isGroupActive
            ? "text-white"
            : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200",
        )}
        aria-expanded={isOpen}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            isOpen || isGroupActive
              ? "bg-teal-600 text-white shadow-sm"
              : "bg-slate-800 text-slate-500",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-[11px] font-semibold uppercase tracking-[0.14em]",
              isOpen || isGroupActive ? "text-slate-200" : "text-slate-500",
            )}
          >
            {group.label}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      {isOpen ? (
        <ul className="space-y-0.5 px-1.5 pb-2 pt-0.5">
          {(() => {
            const activeChild = getActiveNavigationChild(
              group,
              pathname,
              search,
              currentHash,
            );

            return group.children.map((child) => {
              const isActive =
                activeChild?.href === child.href &&
                activeChild?.label === child.label;

              return (
                <li key={`${group.id}-${child.href}-${child.label}`}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-2 rounded-xl py-2 pl-9 pr-3 text-[13px] font-medium transition-all",
                      isActive
                        ? "bg-teal-600/90 text-white shadow-sm"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1 w-1 shrink-0 rounded-full transition-colors",
                        isActive
                          ? "bg-white"
                          : "bg-slate-600 group-hover:bg-teal-400",
                      )}
                    />
                    <span>{child.label}</span>
                  </Link>
                </li>
              );
            });
          })()}
        </ul>
      ) : null}
    </div>
  );
}
