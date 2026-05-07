import {
  BadgeDollarSign,
  BookOpen,
  BarChart3,
  CalendarRange,
  LayoutDashboard,
  Megaphone,
  ShieldCheck,
  Users,
  ClipboardCheck,
  School,
  Eye,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/lib/auth";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export const navigationItems: NavigationItem[] = [
  // Dashboard - Everyone can see their own dashboard
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student", "parent"] },
  
  // Students - Admin and Teachers can manage, Students and Parents can view limited info
  { label: "Students", href: "/students", icon: Users, roles: ["admin", "teacher"] },
  
  // Staff - Only Admin and Teachers can view staff information
  { label: "Staff", href: "/staff", icon: School, roles: ["admin", "teacher"] },
  
  // Attendance - Admin and Teachers can manage, Students and Parents can view their own
  { label: "Attendance", href: "/attendance", icon: ClipboardCheck, roles: ["admin", "teacher"] },
  { label: "My Attendance", href: "/attendance", icon: ClipboardCheck, roles: ["student"] },
  { label: "Child's Attendance", href: "/attendance", icon: ClipboardCheck, roles: ["parent"] },
  
  // Teacher Attendance - Only for Teachers to check in/out
  { label: "Teacher Check-in", href: "/teacher-attendance", icon: Eye, roles: ["teacher"] },
  
  // Academics - Admin, Teachers, and Students can access
  { label: "Academics", href: "/academics", icon: BookOpen, roles: ["admin", "teacher", "student"] },
  
  // Performance Analytics - Everyone can view (filtered by role)
  { label: "Performance", href: "/analytics/student-performance", icon: BarChart3, roles: ["admin", "teacher", "student", "parent"] },
  
  // Finance - ONLY Admin should have access
  { label: "Finance", href: "/finance", icon: BadgeDollarSign, roles: ["admin"] },
  
  // Communication - Everyone can access messages
  { label: "Communication", href: "/communication", icon: Megaphone, roles: ["admin", "teacher", "student", "parent"] },
  
  // Admin Section - ONLY Admin should have access
  { label: "Admin", href: "/admin", icon: ShieldCheck, roles: ["admin"] },
];

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