"use client";

import { 
  BarChart3, Users, BookOpen, Layout, Settings, FileText, Bell,
  CheckSquare, DollarSign, ClipboardList, TrendingUp, Calendar,
  UserCheck, Receipt, GraduationCap, AlertCircle, Clock
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { useSchool, getScopedItem } from "@/lib/school-context";
import { loadFinanceInvoices } from "@/lib/finance-invoices";
import { loadSystemUsers } from "@/lib/system-users";
import { getPendingCheckIns, getTodayDateString, loadTeacherCheckIns } from "@/lib/teacher-check-in";
import { getTodayIsoDate } from "@/lib/date-format";

const adminSections = [
  {
    title: "Users",
    description: "Issue Gmail/login email and password credentials to teachers, students, and parents",
    href: "/admin/users",
    icon: Users,
    color: "bg-blue-500",
  },
  {
    title: "Teacher Check-ins",
    description: "Approve or reject daily teacher attendance submissions",
    href: "/admin/teacher-attendance",
    icon: UserCheck,
    color: "bg-indigo-500",
  },
  {
    title: "Exams",
    description: "Create exam cycles, exam types, and manage marks entry",
    href: "/admin/exams",
    icon: BarChart3,
    color: "bg-purple-500",
  },
  {
    title: "Academics",
    description: "Manage classes, subjects, and class-subject assignments",
    href: "/admin/academics",
    icon: BookOpen,
    color: "bg-emerald-500",
  },
  {
    title: "Resources",
    description: "Manage classrooms, labs, and detect scheduling conflicts",
    href: "/admin/resources",
    icon: Layout,
    color: "bg-orange-500",
  },
  {
    title: "Alerts & Notifications",
    description: "Configure alert thresholds and notification preferences",
    href: "/admin/alerts",
    icon: Bell,
    color: "bg-red-500",
  },
  {
    title: "Reports",
    description: "Generate comprehensive school reports",
    href: "/admin/reports",
    icon: FileText,
    color: "bg-cyan-500",
  },
  {
    title: "System Settings",
    description: "Global configuration, school info, academic calendar",
    href: "/admin/settings",
    icon: Settings,
    color: "bg-slate-500",
  },
];

const quickActions = [
  {
    title: "View Attendance",
    description: "Review saved attendance records across classes",
    href: "/attendance?view=records",
    icon: UserCheck,
    color: "bg-emerald-600",
    hoverColor: "hover:bg-emerald-700",
  },
  {
    title: "Enter Exam Marks",
    description: "Record student exam scores and grades",
    href: "/admin/exams?tab=marks",
    icon: ClipboardList,
    color: "bg-purple-600",
    hoverColor: "hover:bg-purple-700",
  },
  {
    title: "Generate Invoice",
    description: "Create fee invoices for students",
    href: "/finance?action=create-invoice",
    icon: Receipt,
    color: "bg-blue-600",
    hoverColor: "hover:bg-blue-700",
  },
  {
    title: "Record Payment",
    description: "Process and record fee payments",
    href: "/finance?action=record-payment",
    icon: DollarSign,
    color: "bg-green-600",
    hoverColor: "hover:bg-green-700",
  },
  {
    title: "View Reports",
    description: "Access analytics and performance reports",
    href: "/admin/reports",
    icon: TrendingUp,
    color: "bg-cyan-600",
    hoverColor: "hover:bg-cyan-700",
  },
  {
    title: "Manage Classes",
    description: "Configure classes and assign teachers",
    href: "/admin/academics",
    icon: GraduationCap,
    color: "bg-orange-600",
    hoverColor: "hover:bg-orange-700",
  },
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

  const adminStats = useMemo(() => {
    if (!currentSchool) {
      return [
        { label: "Total Users", value: "0", change: "No school selected", icon: Users, color: "text-blue-600" },
        { label: "Active Exams", value: "0", change: "No cycles yet", icon: ClipboardList, color: "text-purple-600" },
        { label: "Pending Invoices", value: "0", change: "₵0 outstanding", icon: Receipt, color: "text-orange-600" },
        { label: "Today's Attendance", value: "0%", change: "0/0 present", icon: CheckSquare, color: "text-emerald-600" },
      ];
    }

    const users = loadSystemUsers(currentSchool.id);
    const students = parseStored<Array<{ id: string; status?: string }>>(
      getScopedItem(currentSchool.id, "school_students"),
      [],
    );
    const activeStudents = students.filter((student) => student.status === "active" || !student.status).length;
    const examCycles = parseStored<Array<{ status?: string }>>(
      getScopedItem(currentSchool.id, "exam_cycles"),
      [],
    );
    const activeExams = examCycles.filter((cycle) => cycle.status === "active").length;
    const invoices = loadFinanceInvoices(currentSchool.id);
    const pendingInvoices = invoices.filter(
      (invoice) => invoice.status !== "paid" && invoice.status !== "void",
    );
    const pendingInvoiceTotal = pendingInvoices.reduce(
      (sum, invoice) => sum + Math.max(invoice.totalAmount - invoice.paidAmount, 0),
      0,
    );

    const today = getTodayIsoDate();
    const todayRecords = parseStored<Array<{ date: string; status: string; studentId: string }>>(
      getScopedItem(currentSchool.id, "attendance_records"),
      [],
    ).filter((record) => record.date === today);
    const presentToday = todayRecords.filter(
      (record) => record.status === "present" || record.status === "late",
    ).length;
    const attendanceRate =
      todayRecords.length > 0 ? ((presentToday / todayRecords.length) * 100).toFixed(1) : "0.0";

    return [
      {
        label: "Total Users",
        value: String(users.length),
        change: `${activeStudents} enrolled student${activeStudents === 1 ? "" : "s"}`,
        icon: Users,
        color: "text-blue-600",
      },
      {
        label: "Active Exams",
        value: String(activeExams),
        change: `${examCycles.length} total cycle${examCycles.length === 1 ? "" : "s"}`,
        icon: ClipboardList,
        color: "text-purple-600",
      },
      {
        label: "Pending Invoices",
        value: String(pendingInvoices.length),
        change: `₵${pendingInvoiceTotal.toLocaleString()} outstanding`,
        icon: Receipt,
        color: "text-orange-600",
      },
      {
        label: "Today's Attendance",
        value: `${attendanceRate}%`,
        change: `${presentToday}/${todayRecords.length || activeStudents} marked today`,
        icon: CheckSquare,
        color: "text-emerald-600",
      },
    ];
  }, [currentSchool]);

  const recentActivity = useMemo(() => {
    if (!currentSchool) return [];

    const items: Array<{
      action: string;
      user: string;
      time: string;
      icon: typeof Users;
      color: string;
    }> = [];

    const students = parseStored<
      Array<{ firstName: string; lastName: string; admissionDate?: string }>
    >(getScopedItem(currentSchool.id, "school_students"), []);
    const latestStudent = [...students].sort((a, b) =>
      (b.admissionDate ?? "").localeCompare(a.admissionDate ?? ""),
    )[0];
    if (latestStudent) {
      items.push({
        action: "Latest student record",
        user: `${latestStudent.firstName} ${latestStudent.lastName}`.trim(),
        time: latestStudent.admissionDate ? `Added ${latestStudent.admissionDate}` : "Recently added",
        icon: Users,
        color: "text-blue-600",
      });
    }

    const todayRecords = parseStored<
      Array<{ date: string; class?: string; status: string; studentId: string }>
    >(getScopedItem(currentSchool.id, "attendance_records"), [])
      .filter((record) => record.date === getTodayIsoDate())
      .slice(-3)
      .reverse();

    for (const record of todayRecords) {
      items.push({
        action: `Attendance marked: ${record.status}`,
        user: record.class || "Class attendance",
        time: "Today",
        icon: UserCheck,
        color: "text-emerald-600",
      });
    }

    if (items.length === 0) {
      items.push({
        action: "School setup started",
        user: currentSchool.name,
        time: "Add students, staff, and classes to begin",
        icon: AlertCircle,
        color: "text-slate-600",
      });
    }

    return items.slice(0, 5);
  }, [currentSchool]);

  const pendingTasks = useMemo(() => {
    const tasks: Array<{
      task: string;
      priority: "high" | "medium";
      icon: typeof Users;
      href: string;
    }> = [
      ...(pendingCheckIns > 0
        ? [
            {
              task: `Review ${pendingCheckIns} pending teacher check-in${pendingCheckIns > 1 ? "s" : ""}`,
              priority: "high" as const,
              icon: UserCheck,
              href: "/admin/teacher-attendance",
            },
          ]
        : []),
    ];

    if (!currentSchool) return tasks;

    const students = parseStored<unknown[]>(
      getScopedItem(currentSchool.id, "school_students"),
      [],
    );
    const classes = parseStored<unknown[]>(
      getScopedItem(currentSchool.id, "school_classes"),
      [],
    );

    if (students.length === 0) {
      tasks.push({
        task: "Add your first students",
        priority: "high",
        icon: Users,
        href: "/students?action=add",
      });
    }

    if (classes.length === 0) {
      tasks.push({
        task: "Create classes and subject assignments",
        priority: "medium",
        icon: GraduationCap,
        href: "/admin/academics",
      });
    }

    const users = loadSystemUsers(currentSchool.id);
    if (users.filter((user) => user.role === "Teacher").length === 0) {
      tasks.push({
        task: "Add staff and issue teacher logins",
        priority: "medium",
        icon: UserCheck,
        href: "/admin/users",
      });
    }

    return tasks;
  }, [currentSchool, pendingCheckIns]);

  return (
    <div className="page-stack">
      <PageHeader
        badge="Administration"
        title="Admin Control Panel"
        description="Complete control center for all school management activities"
        actions={
          <div className="tab-group">
            <button
              type="button"
              onClick={() => setSelectedView("overview")}
              className={selectedView === "overview" ? "tab-group-item tab-group-item-active" : "tab-group-item"}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setSelectedView("actions")}
              className={selectedView === "actions" ? "tab-group-item tab-group-item-active" : "tab-group-item"}
            >
              Quick Actions
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {adminStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              hint={stat.change}
              icon={Icon}
              tone="info"
            />
          );
        })}
      </div>

      {selectedView === "actions" ? (
        <>
          <div>
            <h2 className="section-heading">Quick Actions</h2>
            <p className="section-description mt-1 mb-5">
              Perform common administrative tasks with one click
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <div className={`${action.color} ${action.hoverColor} rounded-2xl p-6 text-white shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated`}>
                      <Icon className="mb-3 h-8 w-8" />
                      <h3 className="mb-1 text-lg font-bold">{action.title}</h3>
                      <p className="text-sm text-white/90">{action.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="content-panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="section-heading">Pending Tasks</h2>
              <span className="badge-neutral">{pendingTasks.length} items</span>
            </div>
            <div className="space-y-3">
              {pendingTasks.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link key={index} href={item.href}>
                    <div className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4 transition-colors hover:border-teal-200 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-slate-600" />
                        <span className="font-semibold text-slate-900">{item.task}</span>
                      </div>
                      <span
                        className={
                          item.priority === "high"
                            ? "badge-danger"
                            : item.priority === "medium"
                              ? "badge-warning"
                              : "badge-neutral"
                        }
                      >
                        {item.priority}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <h2 className="section-heading mb-5">Management Sections</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {adminSections.map((section) => {
                const Icon = section.icon;
                return (
                  <Link key={section.href} href={section.href}>
                    <div className="module-card">
                      <div className="mb-4 flex items-start justify-between">
                        <div className={`module-card-icon ${section.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-slate-300">→</span>
                      </div>
                      <h3 className="mb-2 text-lg font-bold text-slate-900">{section.title}</h3>
                      <p className="section-description">{section.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="content-panel">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="section-heading">Recent Activity</h2>
                <Clock className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                    >
                      <Icon className={`mt-0.5 h-5 w-5 ${activity.color}`} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{activity.action}</p>
                        <p className="text-xs text-slate-500">{activity.user}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-400">{activity.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="content-panel">
              <h2 className="section-heading mb-4">System Status</h2>
              <div className="space-y-3 text-sm">
                <div className="status-row-success">
                  <span className="font-medium">Database Connected</span>
                  <span className="badge-success">Healthy</span>
                </div>
                <div className="status-row-success">
                  <span className="font-medium">Authentication Active</span>
                  <span className="badge-success">Online</span>
                </div>
                <div className="status-row-success">
                  <span className="font-medium">File Uploads Enabled</span>
                  <span className="badge-success">Ready</span>
                </div>
                <div className="status-row-warning">
                  <span className="font-medium">Email Service</span>
                  <span className="badge-warning">Not configured</span>
                </div>
                <div className="status-row-info">
                  <span className="font-medium">System Uptime</span>
                  <span className="badge-info">98.7%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}