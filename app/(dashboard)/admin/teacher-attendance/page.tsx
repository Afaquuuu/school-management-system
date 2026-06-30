"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useSchool } from "@/lib/school-context";
import {
  checkInStatusConfig,
  getActiveTeachers,
  getPendingCheckIns,
  getTodayCheckIns,
  getTodayDateString,
  getUserSession,
  loadTeacherCheckIns,
  reviewTeacherCheckIn,
  type TeacherCheckInRecord,
  type TeacherCheckInStatus,
  type UserSession,
} from "@/lib/teacher-check-in";
import { formatDate, formatDateTime, formatTime } from "@/lib/date-format";

type FilterTab = "pending" | "approved" | "rejected" | "all" | "missing";

export default function AdminTeacherAttendancePage() {
  const { currentSchool } = useSchool();
  const [session, setSession] = useState<UserSession | null>(null);
  const [records, setRecords] = useState<TeacherCheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<TeacherCheckInRecord | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const today = getTodayDateString();

  const loadData = useCallback(() => {
    if (!currentSchool) return;
    setSession(getUserSession());
    setRecords(loadTeacherCheckIns(currentSchool.id));
    setLoading(false);
  }, [currentSchool]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayRecords = useMemo(() => getTodayCheckIns(records, today), [records, today]);
  const activeTeachers = useMemo(
    () => (currentSchool ? getActiveTeachers(currentSchool.id) : []),
    [currentSchool],
  );

  const checkedInTeacherIds = useMemo(
    () => new Set(todayRecords.map((r) => r.teacherId)),
    [todayRecords],
  );

  const missingTeachers = useMemo(
    () => activeTeachers.filter((t) => !checkedInTeacherIds.has(t.id)),
    [activeTeachers, checkedInTeacherIds],
  );

  const stats = useMemo(
    () => ({
      pending: getPendingCheckIns(records, today).length,
      approved: todayRecords.filter((r) => r.status === "approved").length,
      rejected: todayRecords.filter((r) => r.status === "rejected").length,
      missing: missingTeachers.length,
      total: activeTeachers.length,
    }),
    [records, today, todayRecords, missingTeachers, activeTeachers],
  );

  const filteredRecords = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (filter === "missing") {
      return [];
    }

    let list = todayRecords;

    if (filter !== "all") {
      list = list.filter((r) => r.status === filter);
    }

    if (search) {
      list = list.filter(
        (r) =>
          r.teacherName.toLowerCase().includes(search) ||
          r.teacherEmail.toLowerCase().includes(search) ||
          r.department.toLowerCase().includes(search),
      );
    }

    return list.sort((a, b) => b.checkInAt.localeCompare(a.checkInAt));
  }, [todayRecords, filter, searchTerm]);

  const filteredMissing = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return missingTeachers;
    return missingTeachers.filter(
      (t) =>
        t.name.toLowerCase().includes(search) ||
        t.email.toLowerCase().includes(search) ||
        (t.classDepartment ?? "").toLowerCase().includes(search),
    );
  }, [missingTeachers, searchTerm]);

  const handleReview = (status: "approved" | "rejected") => {
    if (!currentSchool || !session || !selectedRecord) return;

    setProcessing(true);
    setMessage(null);

    const updated = reviewTeacherCheckIn({
      schoolId: currentSchool.id,
      recordId: selectedRecord.id,
      status,
      reviewer: session,
      reviewNote,
    });

    if (!updated) {
      setMessage({ type: "error", text: "Could not update check-in. Please try again." });
      setProcessing(false);
      return;
    }

    setRecords(loadTeacherCheckIns(currentSchool.id));
    setSelectedRecord(null);
    setReviewNote("");
    setMessage({
      type: "success",
      text: `${updated.teacherName}'s check-in was ${status}.`,
    });
    setProcessing(false);
  };

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: "pending", label: "Pending", count: stats.pending },
    { id: "approved", label: "Approved", count: stats.approved },
    { id: "rejected", label: "Rejected", count: stats.rejected },
    { id: "missing", label: "Not Checked In", count: stats.missing },
    { id: "all", label: "All Today", count: todayRecords.length },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (session?.role !== "admin") {
    return (
      <div className="surface-card p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h1 className="page-title">Admin Access Required</h1>
        <p className="page-subtitle mt-2">
          Only administrators can approve or reject teacher check-ins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="section-label mb-1">Admin</p>
          <h1 className="page-title">Teacher Check-in Approval</h1>
          <p className="page-subtitle mt-1">
            Review daily teacher attendance submissions and approve or reject them.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Today</p>
          <p className="text-lg font-semibold text-slate-900">{formatDate(today)}</p>
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

      <div className="grid gap-4 md:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Active Teachers</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-amber-600">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{stats.pending}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-emerald-600">Approved</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.approved}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-red-600">Not Checked In</p>
          <p className="mt-2 text-3xl font-bold text-red-700">{stats.missing}</p>
        </div>
      </div>

      <div className="surface-card p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  filter === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
                {tab.count !== undefined ? ` (${tab.count})` : ""}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search teacher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        {filter === "missing" ? (
          filteredMissing.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
              <p className="text-slate-600">All active teachers have checked in today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 font-semibold text-slate-900">Teacher</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Email</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Department</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredMissing.map((teacher) => (
                    <tr key={teacher.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{teacher.name}</td>
                      <td className="px-4 py-3 text-slate-600">{teacher.email}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {teacher.classDepartment || "General"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          Not checked in
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center">
            <UserCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-slate-600">No check-ins found for this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold text-slate-900">Teacher</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">Department</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">Check-in Time</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.map((record) => {
                  const config = checkInStatusConfig[record.status as TeacherCheckInStatus];
                  return (
                    <tr key={record.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{record.teacherName}</p>
                        <p className="text-xs text-slate-500">{record.teacherEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{record.department}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(record.checkInAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.badge}`}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {record.status === "pending" ? (
                          <button
                            onClick={() => {
                              setSelectedRecord(record);
                              setReviewNote("");
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            Review
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {record.reviewedByName || "Reviewed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="surface-card w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900">Review Check-in</h2>
            <p className="mt-1 text-sm text-slate-500">
              {selectedRecord.teacherName} · {selectedRecord.department}
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Checked in at{" "}
                {formatDateTime(selectedRecord.checkInAt)}
              </p>
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Note (optional)
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                placeholder="Add a reason or comment..."
                className="input-field mt-2 resize-none"
              />
            </label>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setSelectedRecord(null);
                  setReviewNote("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview("rejected")}
                disabled={processing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
              <button
                onClick={() => handleReview("approved")}
                disabled={processing}
                className="btn-primary inline-flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
