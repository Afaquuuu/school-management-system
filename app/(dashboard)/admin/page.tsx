"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AdminControlBanner,
  AdminKpiCard,
  AdminModuleCard,
  AdminSectionTitle,
  type AdminKpiCardData,
} from "@/components/admin/admin-premium-ui";
import { useSchool, getScopedItem } from "@/lib/school-context";
import { loadFinanceInvoices } from "@/lib/finance-invoices";
import { loadSystemUsers } from "@/lib/system-users";
import { getPendingCheckIns, getTodayDateString, loadTeacherCheckIns } from "@/lib/teacher-check-in";
import { getTodayIsoDate } from "@/lib/date-format";

const primaryModules = [
  {
    title: "Users",
    description:
      "Issue Gmail/login email and password credentials to teachers, students, and parents",
    href: "/admin/users",
    badgeKey: "users" as const,
  },
  {
    title: "Teacher Check-ins",
    description: "Approve or reject daily teacher attendance submissions",
    href: "/admin/teacher-attendance",
    badgeKey: "checkins" as const,
  },
  {
    title: "Exams",
    description: "Create exam cycles, exam types, and manage marks entry",
    href: "/admin/exams",
    badgeKey: "exams" as const,
  },
];

const quickActions = [
  { title: "View Attendance", href: "/attendance?view=records" },
  { title: "Enter Exam Marks", href: "/admin/exams?tab=marks" },
  { title: "Generate Invoice", href: "/finance?action=create-invoice" },
  { title: "Record Payment", href: "/finance?action=record-payment" },
  { title: "View Reports", href: "/admin/reports" },
  { title: "Manage Classes", href: "/admin/academics" },
];

function parseStored<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default function AdminDashboard() {
  const { currentSchool } = useSchool();
  const [selectedView, setSelectedView] = useState<"overview" | "actions">("overview");
  const [pendingCheckIns, setPendingCheckIns] = useState(0);

  useEffect(() => {
    if (!currentSchool) return;
    const records = loadTeacherCheckIns(currentSchool.id);
    setPendingCheckIns(getPendingCheckIns(records, getTodayDateString()).length);
  }, [currentSchool]);

  const metrics = useMemo(() => {
    if (!currentSchool) {
      return {
        totalUsers: 0,
        students: 0,
        staff: 0,
        admins: 0,
        activeExams: 0,
        totalCycles: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        pendingTotal: 0,
        attendanceRate: "0.0",
        markedToday: 0,
        totalStudents: 0,
        upcomingExams: 0,
        inactiveUsers: 0,
      };
    }

    const users = loadSystemUsers(currentSchool.id);
    const students = parseStored<Array<{ id: string; status?: string }>>(
      getScopedItem(currentSchool.id, "school_students"),
      [],
    );
    const activeStudents = students.filter((student) => student.status === "active" || !student.status);
    const staff = parseStored<unknown[]>(getScopedItem(currentSchool.id, "school_staff"), []);
    const examCycles = parseStored<Array<{ status?: string }>>(
      getScopedItem(currentSchool.id, "exam_cycles"),
      [],
    );
    const activeExams = examCycles.filter((cycle) => cycle.status === "active").length;
    const upcomingExams = examCycles.filter((cycle) => cycle.status !== "completed").length;
    const invoices = loadFinanceInvoices(currentSchool.id);
    const pendingInvoices = invoices.filter(
      (invoice) => invoice.status !== "paid" && invoice.status !== "void",
    );
    const today = getTodayIsoDate();
    const overdueInvoices = pendingInvoices.filter(
      (invoice) => invoice.dueAt && invoice.dueAt < today,
    ).length;
    const pendingTotal = pendingInvoices.reduce(
      (sum, invoice) => sum + Math.max(invoice.totalAmount - invoice.paidAmount, 0),
      0,
    );

    const todayRecords = parseStored<Array<{ date: string; status: string }>>(
      getScopedItem(currentSchool.id, "attendance_records"),
      [],
    ).filter((record) => record.date === today);
    const presentToday = todayRecords.filter(
      (record) => record.status === "present" || record.status === "late",
    ).length;
    const attendanceRate =
      todayRecords.length > 0 ? ((presentToday / todayRecords.length) * 100).toFixed(1) : "0.0";

    const admins = users.filter((user) => user.role.toLowerCase() === "admin").length;
    const teachers = users.filter((user) => user.role.toLowerCase() === "teacher").length;
    const inactiveUsers = users.filter((user) => user.status !== "Active").length;

    return {
      totalUsers: users.length,
      students: activeStudents.length,
      staff: staff.length || teachers,
      admins,
      activeExams,
      totalCycles: examCycles.length,
      pendingInvoices: pendingInvoices.length,
      overdueInvoices,
      pendingTotal,
      attendanceRate,
      markedToday: todayRecords.length,
      totalStudents: activeStudents.length,
      upcomingExams,
      inactiveUsers,
    };
  }, [currentSchool]);

  const kpiCards: AdminKpiCardData[] = [
    {
      key: "users",
      label: "Total Users",
      value: String(metrics.totalUsers),
      tone: "mint",
      showTrend: metrics.totalUsers > 0,
      lines: [
        `${metrics.students} enrolled students / ${metrics.staff} staff / ${metrics.admins} admin`,
      ],
    },
    {
      key: "exams",
      label: "Active Exams",
      value: String(metrics.activeExams),
      tone: "sky",
      lines: [`${metrics.activeExams} of ${metrics.totalCycles} cycles in progress`],
      action: { label: "View details", href: "/admin/exams" },
    },
    {
      key: "invoices",
      label: "Pending Invoices",
      value: String(metrics.pendingInvoices),
      tone: "gray",
      lines: [
        `$${metrics.pendingTotal.toLocaleString()} outstanding / ${metrics.overdueInvoices} overdue invoice${metrics.overdueInvoices === 1 ? "" : "s"}`,
      ],
      button: { label: "Process payment", href: "/finance?action=record-payment" },
    },
    {
      key: "attendance",
      label: "Today's Attendance",
      value: `${metrics.attendanceRate}%`,
      tone: "coral",
      lines: [
        `${metrics.markedToday}/${metrics.totalStudents || metrics.students} marked / ${metrics.markedToday === 0 ? "100% data needed" : "Live attendance snapshot"}`,
      ],
    },
  ];

  const moduleBadges = {
    users: `Pending requests: ${metrics.inactiveUsers}`,
    checkins: `Pending approvals: ${pendingCheckIns}`,
    exams: `Upcoming: ${metrics.upcomingExams}`,
  };

  return (
    <div className="admin-stack">
      <AdminControlBanner selectedView={selectedView} onSelectView={setSelectedView} />

      <div className="admin-kpi-grid">
        {kpiCards.map((card) => (
          <AdminKpiCard key={card.label} card={card} />
        ))}
      </div>

      {selectedView === "actions" ? (
        <section className="rounded-[22px] border border-slate-200/70 bg-white p-6 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.22)]">
          <AdminSectionTitle>Quick Actions</AdminSectionTitle>
          <p className="mt-1 text-sm text-slate-500">
            Perform common administrative tasks with one click
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-800 transition hover:border-teal-200 hover:bg-white hover:shadow-sm"
              >
                {action.title}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <AdminSectionTitle>Management Sections</AdminSectionTitle>
          <div className="admin-module-grid mt-5">
            {primaryModules.map((section) => (
              <AdminModuleCard
                key={section.href}
                title={section.title}
                description={section.description}
                href={section.href}
                badge={moduleBadges[section.badgeKey]}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
