import {
  BadgeDollarSign,
  BookOpen,
  BarChart3,
  LayoutDashboard,
  Megaphone,
  ShieldCheck,
  Users,
  ClipboardCheck,
  School,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/lib/auth";

export type NavigationSubItem = {
  label: string;
  href: string;
  roles?: UserRole[];
};

export type NavigationGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  children: NavigationSubItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "teacher", "student", "parent", "accountant", "librarian"],
    children: [
      { label: "Overview", href: "/dashboard" },
      { label: "Quick Actions", href: "/dashboard?view=actions", roles: ["admin", "teacher"] },
      { label: "Recent Activity", href: "/dashboard?view=activity", roles: ["admin", "teacher"] },
    ],
  },
  {
    id: "students",
    label: "Students",
    icon: Users,
    roles: ["admin", "teacher"],
    children: [
      { label: "All Students", href: "/students" },
      { label: "Add Student", href: "/students?action=add" },
    ],
  },
  {
    id: "staff",
    label: "Staff",
    icon: School,
    roles: ["admin"],
    children: [
      { label: "All Staff", href: "/staff" },
      { label: "Add Staff Member", href: "/staff?action=add" },
    ],
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: ClipboardCheck,
    roles: ["admin", "teacher", "student", "parent", "librarian"],
    children: [
      { label: "Mark Attendance", href: "/attendance?view=mark", roles: ["teacher"] },
      { label: "View Attendance", href: "/attendance?view=records", roles: ["admin", "teacher"] },
      { label: "Teacher Check-in", href: "/teacher-attendance", roles: ["teacher"] },
      { label: "My Attendance", href: "/attendance?view=records", roles: ["student"] },
      { label: "Child's Attendance", href: "/attendance?view=records", roles: ["parent"] },
    ],
  },
  {
    id: "academics",
    label: "Academics",
    icon: BookOpen,
    roles: ["admin", "teacher", "student", "librarian"],
    children: [
      { label: "Overview", href: "/academics" },
      { label: "Timetable", href: "/academics?view=timetable" },
      { label: "Subjects & Classes", href: "/academics?view=subjects" },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: BarChart3,
    roles: ["admin", "teacher", "student", "parent", "librarian"],
    children: [
      { label: "Student Performance", href: "/analytics/student-performance" },
      { label: "Class Analytics", href: "/analytics/student-performance?view=class" },
      { label: "Trends & Reports", href: "/analytics/student-performance?view=trends" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: BadgeDollarSign,
    roles: ["admin", "parent", "accountant"],
    children: [
      { label: "Invoices", href: "/finance?tab=invoices", roles: ["admin", "accountant"] },
      { label: "Payments", href: "/finance?tab=payments", roles: ["admin", "accountant"] },
      { label: "Financial Reports", href: "/finance?tab=reports", roles: ["admin", "accountant"] },
      { label: "My Invoices", href: "/finance?tab=invoices", roles: ["parent"] },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: Megaphone,
    roles: ["admin", "teacher", "student", "parent", "librarian"],
    children: [
      { label: "Announcements", href: "/communication?tab=announcements" },
      { label: "Messages", href: "/communication?tab=messages" },
      { label: "Compose", href: "/communication?tab=compose" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    icon: ShieldCheck,
    roles: ["admin"],
    children: [
      { label: "Overview", href: "/admin" },
      { label: "Approve Check-ins", href: "/admin/teacher-attendance" },
      { label: "User Management", href: "/admin/users" },
      { label: "Exams", href: "/admin/exams" },
      { label: "Academics Config", href: "/admin/academics" },
      { label: "Resources", href: "/admin/resources" },
      { label: "Alerts & Notifications", href: "/admin/alerts" },
      { label: "Reports", href: "/admin/reports" },
      { label: "System Settings", href: "/admin/settings" },
    ],
  },
];

export function getVisibleNavigationGroups(role: UserRole) {
  return navigationGroups
    .filter((group) => group.roles.includes(role))
    .map((group) => ({
      ...group,
      children: group.children.filter(
        (child) => !child.roles || child.roles.includes(role),
      ),
    }))
    .filter((group) => group.children.length > 0);
}

export function isNavigationHrefActive(
  pathname: string,
  search: string,
  href: string,
  hash = "",
) {
  const hashIndex = href.indexOf("#");
  const targetHash = hashIndex >= 0 ? href.slice(hashIndex + 1) : "";
  const hrefWithoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const [path, query = ""] = hrefWithoutHash.split("?");

  if (pathname !== path) {
    return false;
  }

  const queryString = search.startsWith("?") ? search.slice(1) : search;
  const currentParams = new URLSearchParams(queryString);

  if (targetHash) {
    return hash === `#${targetHash}`;
  }

  if (query) {
    const hrefParams = new URLSearchParams(query);
    for (const [key, value] of hrefParams.entries()) {
      if (currentParams.get(key) !== value) {
        return false;
      }
    }
    return true;
  }

  if (path === "/dashboard" && hash) {
    return false;
  }

  const routesWithSubParams: Record<string, string[]> = {
    "/dashboard": ["view"],
    "/students": ["action"],
    "/staff": ["action"],
    "/attendance": ["view"],
    "/finance": ["tab"],
    "/communication": ["tab"],
    "/academics": ["view"],
    "/analytics/student-performance": ["view"],
  };

  const conflictingKeys = routesWithSubParams[path];
  if (conflictingKeys) {
    for (const key of conflictingKeys) {
      if (currentParams.get(key)) {
        return false;
      }
    }
  }

  return true;
}

export function getActiveNavigationChild(
  group: NavigationGroup,
  pathname: string,
  search: string,
  hash = "",
) {
  return (
    group.children.find((child) =>
      isNavigationHrefActive(pathname, search, child.href, hash),
    ) ?? null
  );
}

export function groupContainsActiveRoute(
  pathname: string,
  search: string,
  group: NavigationGroup,
  hash = "",
) {
  return group.children.some((child) =>
    isNavigationHrefActive(pathname, search, child.href, hash),
  );
}

export function getActivePageContext(
  role: UserRole,
  pathname: string,
  search: string,
  hash = "",
) {
  const groups = getVisibleNavigationGroups(role);

  for (const group of groups) {
    const child = getActiveNavigationChild(group, pathname, search, hash);
    if (child) {
      return {
        groupLabel: group.label,
        pageLabel: child.label,
      };
    }
  }

  return {
    groupLabel: "School OS",
    pageLabel: "Dashboard",
  };
}

/** @deprecated Use navigationGroups instead */
export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export const routeGroups = [
  "/dashboard(.*)",
  "/students(.*)",
  "/staff(.*)",
  "/attendance(.*)",
  "/teacher-attendance(.*)",
  "/academics(.*)",
  "/analytics(.*)",
  "/finance(.*)",
  "/communication(.*)",
  "/admin(.*)",
];
