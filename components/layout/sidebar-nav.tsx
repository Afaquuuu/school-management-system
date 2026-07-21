"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

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
    <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto pr-0.5">
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
  const activeChild = getActiveNavigationChild(group, pathname, search, currentHash);

  return (
    <div
      className={cn(
        "sidebar-nav-group",
        isGroupActive && "sidebar-nav-group-active",
        isOpen && "sidebar-nav-group-open",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="sidebar-nav-group-btn"
        aria-expanded={isOpen}
      >
        <Icon className="sidebar-nav-icon" strokeWidth={1.75} />
        <span className="sidebar-nav-label">{group.label}</span>
        <ChevronRight
          className={cn("sidebar-nav-chevron", isOpen && "sidebar-nav-chevron-open")}
        />
      </button>

      {isOpen ? (
        <ul className="sidebar-nav-sublist">
          {group.children.map((child) => {
            const isActive =
              activeChild?.href === child.href && activeChild?.label === child.label;

            return (
              <li key={`${group.id}-${child.href}-${child.label}`}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  className={cn("sidebar-nav-subitem", isActive && "sidebar-nav-subitem-active")}
                >
                  <span className="sidebar-nav-subitem-dot" />
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
