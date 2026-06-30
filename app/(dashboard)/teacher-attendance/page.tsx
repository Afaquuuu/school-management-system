"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  LogIn,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useSchool } from "@/lib/school-context";
import {
  checkInStatusConfig,
  createTeacherCheckIn,
  getTeacherCheckInForDate,
  getTodayDateString,
  getUserSession,
  loadTeacherCheckIns,
  type TeacherCheckInRecord,
  type UserSession,
} from "@/lib/teacher-check-in";
import { formatDate, formatDateLong, formatDateTime, formatTime } from "@/lib/date-format";

export default function TeacherCheckInPage() {
  const { currentSchool } = useSchool();
  const [session, setSession] = useState<UserSession | null>(null);
  const [todayRecord, setTodayRecord] = useState<TeacherCheckInRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<TeacherCheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const today = getTodayDateString();

  const loadData = useCallback(() => {
    if (!currentSchool) return;

    const userSession = getUserSession();
    setSession(userSession);

    if (!userSession) {
      setLoading(false);
      return;
    }

    const records = loadTeacherCheckIns(currentSchool.id);
    const mine = records.filter((r) => r.teacherId === userSession.id);
    setTodayRecord(getTeacherCheckInForDate(mine, userSession.id, today) ?? null);
    setRecentRecords(
      mine
        .filter((r) => r.date !== today)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7),
    );
    setLoading(false);
  }, [currentSchool, today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canCheckIn = useMemo(() => {
    if (!todayRecord) return true;
    return todayRecord.status === "rejected";
  }, [todayRecord]);

  const handleCheckIn = async () => {
    if (!currentSchool || !session) return;

    setSubmitting(true);
    setMessage(null);

    const result = createTeacherCheckIn({
      schoolId: currentSchool.id,
      teacher: session,
    });

    if (!result.success) {
      setMessage({ type: "error", text: result.error });
      setSubmitting(false);
      return;
    }

    setTodayRecord(result.record);
    setMessage({
      type: "success",
      text: "Check-in submitted successfully. Awaiting admin approval.",
    });
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="surface-card p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h1 className="page-title">Session Required</h1>
        <p className="page-subtitle mt-2">Please log in to check in for today.</p>
      </div>
    );
  }

  if (session.role !== "teacher") {
    return (
      <div className="surface-card p-8 text-center">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-blue-600" />
        <h1 className="page-title">Teachers Only</h1>
        <p className="page-subtitle mt-2">
          Daily teacher check-in is available for teacher accounts only.
        </p>
      </div>
    );
  }

  const statusInfo = todayRecord ? checkInStatusConfig[todayRecord.status] : null;

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="section-label mb-1">Attendance</p>
          <h1 className="page-title">Teacher Check-in</h1>
          <p className="page-subtitle mt-1">
            Submit your daily attendance for today. Admin will approve or reject your check-in.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Today</p>
          <p className="text-lg font-semibold text-slate-900">
            {formatDateLong(new Date())}
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface-card p-6 lg:col-span-2">
          <div className="mb-6 flex items-start gap-4">
            <div className="rounded-xl bg-blue-50 p-3">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{session.name}</h2>
              <p className="text-sm text-slate-500">{session.email}</p>
              <p className="mt-1 text-sm text-slate-600">
                Department: {session.classDepartment || "General"}
              </p>
            </div>
          </div>

          {!todayRecord ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Clock className="mx-auto mb-3 h-10 w-10 text-slate-400" />
              <p className="font-medium text-slate-900">You have not checked in today</p>
              <p className="mt-1 text-sm text-slate-500">
                Check in once each school day before admin approval.
              </p>
              <button
                onClick={handleCheckIn}
                disabled={submitting || !canCheckIn}
                className="btn-primary mt-6 inline-flex items-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                {submitting ? "Submitting..." : "Check In Now"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo?.badge}`}
                >
                  {statusInfo?.label}
                </span>
                <span className="text-sm text-slate-500">
                  Checked in at{" "}
                  {formatTime(todayRecord.checkInAt)}
                </span>
              </div>

              <p className="text-sm text-slate-600">{statusInfo?.description}</p>

              {todayRecord.reviewedByName && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">
                    Reviewed by {todayRecord.reviewedByName}
                  </p>
                  {todayRecord.reviewedAt && (
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(todayRecord.reviewedAt)}
                    </p>
                  )}
                  {todayRecord.reviewNote && (
                    <p className="mt-2 text-sm text-slate-600">{todayRecord.reviewNote}</p>
                  )}
                </div>
              )}

              {todayRecord.status === "rejected" && (
                <button
                  onClick={handleCheckIn}
                  disabled={submitting}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {submitting ? "Submitting..." : "Check In Again"}
                </button>
              )}

              {todayRecord.status === "approved" && (
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">You are marked present for today.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="surface-card p-6">
          <h3 className="text-lg font-semibold text-slate-900">How it works</h3>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                1
              </span>
              Log in each school day with your teacher account.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                2
              </span>
              Submit one check-in for today only.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                3
              </span>
              Wait for the principal or admin to approve or reject it.
            </li>
          </ol>
        </div>
      </div>

      {recentRecords.length > 0 && (
        <div className="surface-card p-6">
          <h2 className="text-xl font-semibold text-slate-900">Recent Check-ins</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold text-slate-900">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">Time</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">Reviewed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentRecords.map((record) => {
                  const config = checkInStatusConfig[record.status];
                  return (
                    <tr key={record.id}>
                      <td className="px-4 py-3 text-slate-700">{formatDate(record.date)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatTime(record.checkInAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.badge}`}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {record.reviewedByName || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
