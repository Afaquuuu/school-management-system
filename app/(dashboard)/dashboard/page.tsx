"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle,
  ClipboardList,
  Clock,
  GraduationCap,
  PieChart,
  Receipt,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Users2,
} from "lucide-react";
import { useSchool, getScopedItem } from "@/lib/school-context";
import type { UserRole } from "@/lib/auth";
import { getUserSession, type UserSession } from "@/lib/teacher-check-in";
import {
  formatLinkedChildLabel,
  getLinkedStudentsForParentEmail,
  type SchoolStudentRecord,
} from "@/lib/parent-student-links";
import {
  formatDate,
  formatDateLong,
  formatDayMonth,
  formatTime,
  formatWeekdayShort,
  getTodayIsoDate,
} from "@/lib/date-format";

type Student = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  class: string;
  section: string;
  rollNumber?: string;
  status: string;
  admissionDate?: string;
  guardianName?: string;
};

type AttendanceRecord = {
  id: string;
  date: string;
  class: string;
  studentId: string;
  status: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dashboardView =
    searchParams.get("view") === "actions"
      ? "actions"
      : searchParams.get("view") === "activity"
        ? "activity"
        : "overview";

  const pageTitles = {
    overview: "Dashboard Overview",
    actions: "Quick Actions",
    activity: "Recent Activity",
  } as const;

  const pageDescriptions = {
    overview: "Key metrics, attendance trends, and system status at a glance",
    actions: "Shortcuts to common tasks across the school platform",
    activity: "Latest attendance updates and student activity for today",
  } as const;

  const { currentSchool } = useSchool();
  const [userRole, setUserRole] = useState<UserRole>("teacher");
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  // Load data from scoped localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem("user_role");
      if (role === "admin" || role === "teacher" || role === "student" || role === "parent") {
        setUserRole(role);
      }
      setUserSession(getUserSession());
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentSchool) {
      const storedStudents = getScopedItem(currentSchool.id, 'school_students');
      const storedAttendance = getScopedItem(currentSchool.id, 'attendance_records');
      
      if (storedStudents) {
        setStudents(JSON.parse(storedStudents));
      }
      
      if (storedAttendance) {
        setAttendanceRecords(JSON.parse(storedAttendance));
      }
    }

    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [currentSchool]);

  const isStudentView = userRole === "student";
  const isParentView = userRole === "parent";

  const linkedChildren = useMemo(() => {
    if (!isParentView || !currentSchool || !userSession?.email) return [];
    return getLinkedStudentsForParentEmail(currentSchool.id, userSession.email);
  }, [isParentView, currentSchool, userSession?.email]);

  useEffect(() => {
    if (linkedChildren.length === 0) {
      setSelectedChildId("");
      return;
    }

    if (!linkedChildren.some((child) => child.id === selectedChildId)) {
      setSelectedChildId(linkedChildren[0].id);
    }
  }, [linkedChildren, selectedChildId]);

  const selectedChild = useMemo(
    () => linkedChildren.find((child) => child.id === selectedChildId) ?? linkedChildren[0] ?? null,
    [linkedChildren, selectedChildId],
  );

  const currentStudent = useMemo(() => {
    if (!userSession || !isStudentView) return null;

    return (
      students.find(
        (student) =>
          student.email?.toLowerCase() === userSession.email.toLowerCase() ||
          student.id === userSession.id ||
          `${student.firstName} ${student.lastName}`.toLowerCase() ===
            userSession.name.toLowerCase() ||
          student.firstName.toLowerCase() === userSession.name.toLowerCase(),
      ) ?? null
    );
  }, [students, userSession, isStudentView]);

  const focusStudent = isParentView ? selectedChild : currentStudent;

  const studentRecords = useMemo(() => {
    if (!focusStudent) return [];
    return attendanceRecords.filter((record) => record.studentId === focusStudent.id);
  }, [attendanceRecords, focusStudent]);

  const studentMetrics = useMemo(() => {
    if (!focusStudent) {
      return {
        todayStatus: null as string | null,
        presentDays: 0,
        absentDays: 0,
        attendanceRate: "0.0",
        totalRecords: 0,
      };
    }

    const today = getTodayIsoDate();
    const todayRecord = studentRecords.find((record) => record.date === today);
    const counted = studentRecords.filter(
      (record) => record.status === "present" || record.status === "late" || record.status === "absent",
    );
    const presentDays = studentRecords.filter(
      (record) => record.status === "present" || record.status === "late",
    ).length;
    const absentDays = studentRecords.filter((record) => record.status === "absent").length;
    const attendanceRate =
      counted.length > 0 ? ((presentDays / counted.length) * 100).toFixed(1) : "0.0";

    return {
      todayStatus: todayRecord?.status ?? null,
      presentDays,
      absentDays,
      attendanceRate,
      totalRecords: studentRecords.length,
    };
  }, [focusStudent, studentRecords]);

  const studentAttendanceTrend = useMemo(() => {
    if (!focusStudent) return [];

    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const record = studentRecords.find((entry) => entry.date === dateStr);
      const rate =
        record?.status === "present" || record?.status === "late"
          ? 100
          : record?.status === "excused"
            ? 75
            : record?.status === "absent"
              ? 0
              : 0;

      trend.push({
        date: dateStr,
        day: formatWeekdayShort(date),
        rate,
        status: record?.status ?? "none",
      });
    }
    return trend;
  }, [focusStudent, studentRecords]);

  const studentRecentAttendance = useMemo(() => {
    return [...studentRecords]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
  }, [studentRecords]);

  const parentSummary = useMemo(() => {
    if (!isParentView || linkedChildren.length === 0) {
      return {
        childCount: 0,
        absentToday: 0,
        presentToday: 0,
        averageAttendanceRate: "0.0",
      };
    }

    const today = getTodayIsoDate();
    let absentToday = 0;
    let presentToday = 0;
    let rateTotal = 0;
    let rateCount = 0;

    for (const child of linkedChildren) {
      const records = attendanceRecords.filter((record) => record.studentId === child.id);
      const todayRecord = records.find((record) => record.date === today);
      if (todayRecord?.status === "absent") absentToday += 1;
      if (todayRecord?.status === "present" || todayRecord?.status === "late") presentToday += 1;

      const counted = records.filter(
        (record) =>
          record.status === "present" || record.status === "late" || record.status === "absent",
      );
      const presentDays = records.filter(
        (record) => record.status === "present" || record.status === "late",
      ).length;
      if (counted.length > 0) {
        rateTotal += (presentDays / counted.length) * 100;
        rateCount += 1;
      }
    }

    return {
      childCount: linkedChildren.length,
      absentToday,
      presentToday,
      averageAttendanceRate:
        rateCount > 0 ? (rateTotal / rateCount).toFixed(1) : "0.0",
    };
  }, [attendanceRecords, isParentView, linkedChildren]);

  const parentRecentActivity = useMemo(() => {
    if (!isParentView || linkedChildren.length === 0) return [];

    const childIds = new Set(linkedChildren.map((child) => child.id));
    return attendanceRecords
      .filter((record) => childIds.has(record.studentId))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 8)
      .map((record) => {
        const child = linkedChildren.find((student) => student.id === record.studentId);
        return {
          ...record,
          studentName: child ? `${child.firstName} ${child.lastName}` : "Unknown",
          className: child ? `${child.class} ${child.section}` : "Unknown",
        };
      });
  }, [attendanceRecords, isParentView, linkedChildren]);

  const isPersonalView = isStudentView || isParentView;
  const overviewTitle = isStudentView
    ? "My Overview"
    : isParentView
      ? "Parent Dashboard"
      : pageTitles.overview;
  const overviewDescription = isStudentView
    ? "Your profile, class details, and personal attendance summary"
    : isParentView
      ? "Your linked child(ren)'s attendance, class details, and recent school activity"
      : pageDescriptions.overview;

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'active').length;
    
    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(r => r.date === today);
    const presentToday = todayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const attendanceRate = todayRecords.length > 0 
      ? ((presentToday / todayRecords.length) * 100).toFixed(1)
      : '0.0';
    
    // Calculate alerts
    const absentStudents = todayRecords.filter(r => r.status === 'absent').length;
    
    // Get classes
    const uniqueClasses = new Set(students.map(s => `${s.class} ${s.section}`));
    
    return {
      totalStudents,
      activeStudents,
      attendanceRate,
      absentStudents,
      totalClasses: uniqueClasses.size,
      todayRecords: todayRecords.length,
    };
  }, [students, attendanceRecords]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords
      .filter(r => r.date === today)
      .slice(-5)
      .reverse();
    
    return todayRecords.map(record => {
      const student = students.find(s => s.id === record.studentId);
      return {
        ...record,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        className: student ? `${student.class} ${student.section}` : 'Unknown',
      };
    });
  }, [students, attendanceRecords]);

  // Class breakdown
  const classBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    students.forEach(s => {
      const className = `${s.class} ${s.section}`;
      breakdown[className] = (breakdown[className] || 0) + 1;
    });
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [students]);

  // Attendance trend (last 7 days)
  const attendanceTrend = useMemo(() => {
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRecords = attendanceRecords.filter(r => r.date === dateStr);
      const present = dayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const rate = dayRecords.length > 0 ? (present / dayRecords.length) * 100 : 0;
      
      trend.push({
        date: dateStr,
        day: formatWeekdayShort(date),
        rate: Math.round(rate),
      });
    }
    return trend;
  }, [attendanceRecords]);

  const statusConfig = {
    present: { color: 'bg-emerald-500', label: 'Present', icon: CheckCircle },
    absent: { color: 'bg-red-500', label: 'Absent', icon: AlertCircle },
    late: { color: 'bg-amber-500', label: 'Late', icon: Clock },
    excused: { color: 'bg-blue-500', label: 'Excused', icon: CheckCircle },
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="surface-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-label mb-1">Dashboard</p>
            <h1 className="page-title">
              {dashboardView === "overview" ? overviewTitle : pageTitles[dashboardView]}
            </h1>
            <p className="page-subtitle mt-1">
              {dashboardView === "overview" ? overviewDescription : pageDescriptions[dashboardView]}
            </p>
            {dashboardView === "overview" && (
              <p className="mt-2 text-sm text-slate-500">
                {formatDateLong(currentTime)}
              </p>
            )}
          </div>
          {dashboardView === "overview" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              <p className="text-xs font-medium text-slate-500">Current Time</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatTime(currentTime)}
              </p>
            </div>
          )}
        </div>

        {dashboardView === "overview" && isPersonalView && (
          <>
            {isParentView && linkedChildren.length === 0 ? (
              <div className="surface-card p-8 text-center">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
                <h2 className="text-xl font-semibold text-slate-900">No Linked Children Found</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Your account is not linked to any student records yet. Please contact the school
                  office to connect your parent login with your child.
                </p>
              </div>
            ) : isStudentView && !currentStudent ? (
              <div className="surface-card p-8 text-center">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
                <h2 className="text-xl font-semibold text-slate-900">Student Profile Not Found</h2>
                <p className="mt-2 text-sm text-slate-500">
                  We could not match your account to a student record. Please contact the school office.
                </p>
              </div>
            ) : focusStudent ? (
              <>
                {isParentView && linkedChildren.length > 1 ? (
                  <div className="surface-card p-4">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Select Child
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {linkedChildren.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => setSelectedChildId(child.id)}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                            selectedChildId === child.id
                              ? "border-purple-300 bg-purple-50 text-purple-800"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {formatLinkedChildLabel(child as SchoolStudentRecord)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {isParentView ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="surface-card p-6">
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        My Children
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        {parentSummary.childCount}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">Linked student account(s)</p>
                    </div>
                    <div className="surface-card p-6">
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Child&apos;s Status Today
                      </p>
                      <p className="mt-2 text-3xl font-bold capitalize text-slate-900">
                        {studentMetrics.todayStatus ?? "Not marked"}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {focusStudent.firstName}&apos;s attendance today
                      </p>
                    </div>
                    <div className="surface-card p-6">
                      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                        Average Attendance
                      </p>
                      <p className="mt-2 text-3xl font-bold text-emerald-700">
                        {parentSummary.averageAttendanceRate}%
                      </p>
                      <p className="mt-2 text-sm text-slate-500">Across linked children</p>
                    </div>
                    <div className="surface-card p-6">
                      <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
                        Absent Today
                      </p>
                      <p className="mt-2 text-3xl font-bold text-red-700">
                        {parentSummary.absentToday}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {parentSummary.absentToday === 0 ? "All present or not marked" : "Needs attention"}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="surface-card p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-xl p-3 ${isParentView ? "bg-purple-50" : "bg-blue-50"}`}>
                        <GraduationCap className={`h-6 w-6 ${isParentView ? "text-purple-600" : "text-blue-600"}`} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold text-slate-900">
                          {focusStudent.firstName} {focusStudent.lastName}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Student ID: {focusStudent.studentId}
                          {focusStudent.rollNumber ? ` · Roll ${focusStudent.rollNumber}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Class: {focusStudent.class} {focusStudent.section}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
                      {focusStudent.status}
                    </span>
                  </div>
                </div>

                {!isParentView ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="surface-card p-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Today&apos;s Status
                    </p>
                    <p className="mt-2 text-3xl font-bold capitalize text-slate-900">
                      {studentMetrics.todayStatus ?? "Not marked"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Your attendance for today</p>
                  </div>

                  <div className="surface-card p-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      My Attendance Rate
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {studentMetrics.attendanceRate}%
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Based on your records</p>
                  </div>

                  <div className="surface-card p-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                      Present Days
                    </p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">
                      {studentMetrics.presentDays}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Including late arrivals</p>
                  </div>

                  <div className="surface-card p-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
                      Absent Days
                    </p>
                    <p className="mt-2 text-3xl font-bold text-red-700">
                      {studentMetrics.absentDays}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Recorded absences only</p>
                  </div>
                </div>
                ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="surface-card p-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Attendance Rate
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {studentMetrics.attendanceRate}%
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {focusStudent.firstName}&apos;s overall attendance
                    </p>
                  </div>
                  <div className="surface-card p-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                      Present Days
                    </p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">
                      {studentMetrics.presentDays}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Including late arrivals</p>
                  </div>
                  <div className="surface-card p-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
                      Absent Days
                    </p>
                    <p className="mt-2 text-3xl font-bold text-red-700">
                      {studentMetrics.absentDays}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Recorded absences only</p>
                  </div>
                  <div className="surface-card p-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Records Tracked
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {studentMetrics.totalRecords}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">Attendance entries on file</p>
                  </div>
                </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="surface-card p-6 lg:col-span-2">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                          {isParentView ? "Child's Attendance Trend" : "My Attendance Trend"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {isParentView ? `${focusStudent.firstName}'s last 7 days` : "Your last 7 days"}
                        </p>
                      </div>
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>

                    <div className="space-y-3">
                      {studentAttendanceTrend.map((day) => (
                        <div key={day.date} className="flex items-center gap-4">
                          <div className="w-12 text-sm font-medium text-slate-500">{day.day}</div>
                          <div className="flex-1">
                            <div className="relative h-10 overflow-hidden rounded-lg bg-slate-100">
                              <div
                                className={`h-full rounded-lg transition-all duration-500 ${
                                  day.status === "present" || day.status === "late"
                                    ? "bg-emerald-500"
                                    : day.status === "excused"
                                      ? "bg-blue-500"
                                      : day.status === "absent"
                                        ? "bg-red-500"
                                        : "bg-slate-300"
                                }`}
                                style={{ width: `${day.rate}%` }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-semibold text-slate-900">
                                  {day.status === "none"
                                    ? "No record"
                                    : day.status.charAt(0).toUpperCase() + day.status.slice(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="w-20 text-right text-sm text-slate-500">
                            {formatDayMonth(day.date)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="surface-card p-6">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {isParentView ? "Child Details" : "My Details"}
                    </h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <div>
                        <p className="text-slate-500">Class</p>
                        <p className="font-medium text-slate-900">
                          {focusStudent.class} {focusStudent.section}
                        </p>
                      </div>
                      {focusStudent.admissionDate && (
                        <div>
                          <p className="text-slate-500">Admission Date</p>
                          <p className="font-medium text-slate-900">{formatDate(focusStudent.admissionDate)}</p>
                        </div>
                      )}
                      {isParentView && focusStudent.guardianName ? (
                        <div>
                          <p className="text-slate-500">Guardian</p>
                          <p className="font-medium text-slate-900">{focusStudent.guardianName}</p>
                        </div>
                      ) : null}
                      {!isParentView && focusStudent.guardianName ? (
                        <div>
                          <p className="text-slate-500">Guardian</p>
                          <p className="font-medium text-slate-900">{focusStudent.guardianName}</p>
                        </div>
                      ) : null}
                      {userSession?.email && (
                        <div>
                          <p className="text-slate-500">{isParentView ? "Parent Email" : "Email"}</p>
                          <p className="font-medium text-slate-900">{userSession.email}</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => router.push("/attendance?view=records")}
                      className="btn-primary mt-6 w-full"
                    >
                      {isParentView ? "View Child's Attendance" : "View My Attendance"}
                    </button>
                  </div>
                </div>

                <div className="surface-card p-6">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {isParentView ? "Recent Attendance" : "Recent Attendance"}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {studentRecentAttendance.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-500">
                        {isParentView
                          ? `No attendance records found for ${focusStudent.firstName} yet.`
                          : "No attendance records found for your account yet."}
                      </p>
                    ) : (
                      studentRecentAttendance.map((record) => {
                        const config = statusConfig[record.status as keyof typeof statusConfig];
                        const StatusIcon = config?.icon || CheckCircle;

                        return (
                          <div
                            key={record.id}
                            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full ${config?.color || "bg-slate-500"}`}
                            >
                              <StatusIcon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{formatDate(record.date)}</p>
                              <p className="text-sm text-slate-500">
                                {focusStudent.class} {focusStudent.section}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${config?.color || "bg-slate-500"}`}
                            >
                              {config?.label || record.status}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}

        {dashboardView === "overview" && !isPersonalView && (
          <>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
               onClick={() => router.push('/students')}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <Users2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Students</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mt-2">{metrics.totalStudents}</p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">
              {metrics.activeStudents} active
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
               onClick={() => router.push('/attendance')}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Attendance Rate</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mt-2">{metrics.attendanceRate}%</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {metrics.todayRecords} records today
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Classes</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mt-2">{metrics.totalClasses}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Active sections
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              {metrics.absentStudents > 0 ? (
                <TrendingDown className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Absent Today</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mt-2">{metrics.absentStudents}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {metrics.absentStudents === 0 ? 'All present!' : 'Needs attention'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="surface-card p-6 lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Attendance Trend</h2>
                <p className="mt-1 text-sm text-slate-500">Last 7 days performance</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
            </div>

            <div className="space-y-3">
              {attendanceTrend.map((day, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-12 text-sm font-medium text-slate-500">{day.day}</div>
                  <div className="flex-1">
                    <div className="relative h-10 overflow-hidden rounded-lg bg-slate-100">
                      <div
                        className={`h-full rounded-lg transition-all duration-500 ${
                          day.rate >= 95
                            ? "bg-emerald-500"
                            : day.rate >= 85
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${day.rate}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-semibold text-slate-900">{day.rate}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm text-slate-500">
                    {formatDayMonth(day.date)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Class Distribution</h3>
              <PieChart className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {classBreakdown.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">No students yet</p>
              ) : (
                classBreakdown.map(([className, count], index) => (
                  <div key={className} className="flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        index === 0
                          ? "bg-blue-500"
                          : index === 1
                            ? "bg-emerald-500"
                            : index === 2
                              ? "bg-purple-500"
                              : index === 3
                                ? "bg-amber-500"
                                : index === 4
                                  ? "bg-red-500"
                                  : "bg-slate-500"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{className}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="surface-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">System Alerts</h2>
              <p className="mt-1 text-sm text-slate-500">Important notifications</p>
            </div>
          </div>
          <div className="space-y-3">
            {metrics.absentStudents > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">
                      {metrics.absentStudents} student{metrics.absentStudents > 1 ? "s" : ""} absent today
                    </p>
                    <p className="mt-1 text-sm text-red-700">
                      Review attendance and contact guardians if needed
                    </p>
                  </div>
                </div>
              </div>
            )}
            {metrics.totalStudents === 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">No students enrolled yet</p>
                    <p className="mt-1 text-sm text-blue-700">Start by adding students to the system</p>
                    <button
                      onClick={() => router.push("/students?action=add")}
                      className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                    >
                      Add students →
                    </button>
                  </div>
                </div>
              </div>
            )}
            {metrics.totalStudents > 0 && metrics.todayRecords === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-900">No attendance taken today</p>
                    <p className="mt-1 text-sm text-amber-700">Take attendance to track student presence</p>
                  </div>
                </div>
              </div>
            )}
            {metrics.totalStudents > 0 && metrics.todayRecords > 0 && metrics.absentStudents === 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-900">All systems operational</p>
                    <p className="mt-1 text-sm text-emerald-700">No critical alerts at this time</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
          </>
        )}

        {dashboardView === "actions" && isParentView && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              {
                title: "Child's Attendance",
                description: "View attendance records for your linked child(ren)",
                href: "/attendance?view=records",
                icon: CalendarCheck,
                color: "bg-emerald-50 text-emerald-700",
              },
              {
                title: "Messages",
                description: "Read notices and updates from the school",
                href: "/communication",
                icon: Activity,
                color: "bg-blue-50 text-blue-700",
              },
              {
                title: "Performance",
                description: "Review your child's academic performance",
                href: "/analytics/student-performance",
                icon: BarChart3,
                color: "bg-purple-50 text-purple-700",
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  onClick={() => router.push(action.href)}
                  className="surface-card group flex items-start gap-4 p-5 text-left transition-all hover:border-purple-200 hover:shadow-md"
                >
                  <div className={`rounded-xl p-3 ${action.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 group-hover:text-purple-700">{action.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-purple-600" />
                </button>
              );
            })}
          </div>
        )}

        {dashboardView === "actions" && !isPersonalView && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              {
                title: "Take Attendance",
                description: "Mark daily attendance for any class",
                href: "/attendance?view=mark",
                icon: CalendarCheck,
                color: "bg-emerald-50 text-emerald-700",
                roles: ["teacher"] as UserRole[],
              },
              {
                title: "Teacher Check-in",
                description: "Submit your daily attendance for approval",
                href: "/teacher-attendance",
                icon: UserCheck,
                color: "bg-indigo-50 text-indigo-700",
                roles: ["teacher"] as UserRole[],
              },
              {
                title: "Add Student",
                description: "Register a new student profile",
                href: "/students?action=add",
                icon: Users2,
                color: "bg-blue-50 text-blue-700",
                roles: ["admin", "teacher"] as UserRole[],
              },
              {
                title: "Create Invoice",
                description: "Generate a new fee invoice",
                href: "/finance?tab=invoices",
                icon: Receipt,
                color: "bg-violet-50 text-violet-700",
                roles: ["admin"] as UserRole[],
              },
              {
                title: "Enter Exam Marks",
                description: "Record student exam scores",
                href: "/admin/exams",
                icon: ClipboardList,
                color: "bg-purple-50 text-purple-700",
                roles: ["admin"] as UserRole[],
              },
              {
                title: "Manage Staff",
                description: "View and update staff records",
                href: "/staff",
                icon: GraduationCap,
                color: "bg-orange-50 text-orange-700",
                roles: ["admin"] as UserRole[],
              },
              {
                title: "View Reports",
                description: "Open admin reports and analytics",
                href: "/admin/reports",
                icon: BarChart3,
                color: "bg-cyan-50 text-cyan-700",
                roles: ["admin"] as UserRole[],
              },
            ]
              .filter((action) => action.roles.includes(userRole))
              .map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  onClick={() => router.push(action.href)}
                  className="surface-card group flex items-start gap-4 p-5 text-left transition-all hover:border-blue-200 hover:shadow-md"
                >
                  <div className={`rounded-xl p-3 ${action.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 group-hover:text-blue-700">{action.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
                </button>
              );
            })}
          </div>
        )}

        {dashboardView === "activity" && isParentView && (
          <div className="surface-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Children&apos;s Activity</h2>
                <p className="mt-1 text-sm text-slate-500">Recent attendance for your linked child(ren)</p>
              </div>
              <Activity className="h-5 w-5 text-slate-400" />
            </div>

            <div className="space-y-3">
              {parentRecentActivity.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                  <p className="text-slate-500">No attendance records found for your linked children yet</p>
                </div>
              ) : (
                parentRecentActivity.map((activity) => {
                  const config = statusConfig[activity.status as keyof typeof statusConfig];
                  const StatusIcon = config?.icon || CheckCircle;

                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${config?.color || "bg-slate-500"}`}
                      >
                        <StatusIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{activity.studentName}</p>
                        <p className="text-sm text-slate-500">
                          {activity.className} · {formatDate(activity.date)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${config?.color || "bg-slate-500"}`}
                      >
                        {config?.label || activity.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {dashboardView === "activity" && !isPersonalView && (
          <div className="surface-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Today&apos;s Activity</h2>
                <p className="mt-1 text-sm text-slate-500">Latest attendance records</p>
              </div>
              <Activity className="h-5 w-5 text-slate-400" />
            </div>

            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                  <p className="text-slate-500">No attendance records yet today</p>
                  {userRole === "teacher" && (
                  <button
                    onClick={() => router.push("/attendance?view=mark")}
                    className="btn-primary mt-4"
                  >
                    Take Attendance
                  </button>
                  )}
                </div>
              ) : (
                recentActivity.map((activity) => {
                  const config = statusConfig[activity.status as keyof typeof statusConfig];
                  const StatusIcon = config?.icon || CheckCircle;

                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${config?.color || "bg-slate-500"}`}
                      >
                        <StatusIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{activity.studentName}</p>
                        <p className="text-sm text-slate-500">{activity.className}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${config?.color || "bg-slate-500"}`}
                      >
                        {config?.label || activity.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
    </div>
  );
}
