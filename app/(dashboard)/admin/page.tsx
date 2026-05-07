"use client";

import { 
  BarChart3, Users, BookOpen, Layout, Settings, FileText, Bell,
  CheckSquare, DollarSign, ClipboardList, TrendingUp, Calendar,
  UserCheck, Receipt, GraduationCap, AlertCircle, Clock
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const adminSections = [
  {
    title: "Users",
    description: "Manage students, teachers, parents, and admin accounts",
    href: "/admin/users",
    icon: Users,
    color: "bg-blue-500",
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
    title: "Mark Attendance",
    description: "Take daily attendance for any class",
    href: "/attendance",
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

const adminStats = [
  { label: "Total Users", value: "1,248", change: "+6.2%", icon: Users, color: "text-blue-600" },
  { label: "Active Exams", value: "18", change: "this month", icon: ClipboardList, color: "text-purple-600" },
  { label: "Pending Invoices", value: "42", change: "₵12,450", icon: Receipt, color: "text-orange-600" },
  { label: "Today's Attendance", value: "94.2%", change: "1,175/1,248", icon: CheckSquare, color: "text-emerald-600" },
];

const recentActivity = [
  { action: "New student enrolled", user: "Ama Johnson", time: "5 mins ago", icon: Users, color: "text-blue-600" },
  { action: "Exam marks entered", user: "Teacher A. Mensah", time: "12 mins ago", icon: ClipboardList, color: "text-purple-600" },
  { action: "Payment received", user: "Kofi Badu", time: "23 mins ago", icon: DollarSign, color: "text-green-600" },
  { action: "Attendance marked", user: "Grade 8A", time: "1 hour ago", icon: UserCheck, color: "text-emerald-600" },
  { action: "Invoice generated", user: "Grade 9B - 32 students", time: "2 hours ago", icon: Receipt, color: "text-orange-600" },
];

const pendingTasks = [
  { task: "Review 8 pending leave requests", priority: "high", icon: AlertCircle, href: "/admin/staff-leave" },
  { task: "Approve 12 exam mark entries", priority: "medium", icon: ClipboardList, href: "/admin/exams" },
  { task: "Process 5 overdue invoices", priority: "high", icon: Receipt, href: "/finance" },
  { task: "Update academic calendar", priority: "low", icon: Calendar, href: "/admin/settings" },
];

export default function AdminDashboard() {
  const [selectedView, setSelectedView] = useState<"overview" | "actions">("overview");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">Admin Control Panel</h1>
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Complete control center for all school management activities
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setSelectedView("overview")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            selectedView === "overview"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setSelectedView("actions")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            selectedView === "actions"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Quick Actions
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.label}</p>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {selectedView === "actions" ? (
        <>
          {/* Quick Actions Grid */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">Quick Actions</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Perform common administrative tasks with one click
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <div className={`${action.color} ${action.hoverColor} rounded-lg p-6 text-white shadow-md hover:shadow-lg transition-all cursor-pointer`}>
                      <Icon className="w-8 h-8 mb-3" />
                      <h3 className="text-lg font-bold mb-1">{action.title}</h3>
                      <p className="text-sm text-white/90">{action.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Pending Tasks */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Pending Tasks</h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">{pendingTasks.length} items</span>
            </div>
            <div className="space-y-3">
              {pendingTasks.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link key={index} href={item.href}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        <span className="text-slate-900 dark:text-slate-50 font-medium">{item.task}</span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          item.priority === "high"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                            : item.priority === "medium"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        }`}
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
          {/* Admin Sections Grid */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">Management Sections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminSections.map((section) => {
                const Icon = section.icon;
                return (
                  <Link key={section.href} href={section.href}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`${section.color} p-3 rounded-lg text-white`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-slate-400 dark:text-slate-500">→</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">{section.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{section.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Activity & System Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Recent Activity</h2>
                <Clock className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={index} className="flex items-start gap-3 pb-4 border-b border-slate-200 dark:border-slate-700 last:border-0 last:pb-0">
                      <Icon className={`w-5 h-5 mt-0.5 ${activity.color}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{activity.action}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{activity.user}</p>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-500">{activity.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Overview */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">System Status</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <span className="text-green-900 dark:text-green-200">✓ Database Connected</span>
                  <span className="text-xs text-green-700 dark:text-green-300">Healthy</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <span className="text-green-900 dark:text-green-200">✓ Authentication Active</span>
                  <span className="text-xs text-green-700 dark:text-green-300">Online</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <span className="text-green-900 dark:text-green-200">✓ File Uploads Enabled</span>
                  <span className="text-xs text-green-700 dark:text-green-300">Ready</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                  <span className="text-yellow-900 dark:text-yellow-200">⚠️ Email Service</span>
                  <span className="text-xs text-yellow-700 dark:text-yellow-300">Not configured</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <span className="text-blue-900 dark:text-blue-200">ℹ️ System Uptime</span>
                  <span className="text-xs text-blue-700 dark:text-blue-300">98.7%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}