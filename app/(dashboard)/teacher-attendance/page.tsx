"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

type AttendanceRecord = {
  id: string;
  name: string;
  roll: string;
  status: "present" | "absent" | "late" | "excused";
  remarks: string;
};

type AttendanceSession = {
  date: string;
  className: string;
  takenBy: string;
  summary: string;
  rows: AttendanceRecord[];
};

const statusStyles: Record<string, string> = {
  present: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  absent: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  late: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  excused: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
};

const attendanceHistory: AttendanceSession[] = [
  {
    date: "2026-05-05",
    className: "Grade 8A",
    takenBy: "Supervisor A. Mensah",
    summary: "3 present, 1 absent, 1 late, 1 excused",
    rows: [
      { id: "stu_1", name: "Ama Johnson", roll: "01", status: "present", remarks: "On time" },
      { id: "stu_2", name: "Kofi Badu", roll: "02", status: "late", remarks: "Arrived 10 minutes late" },
      { id: "stu_3", name: "Nia Thompson", roll: "03", status: "present", remarks: "" },
      { id: "stu_4", name: "Peter Owusu", roll: "04", status: "absent", remarks: "Sick leave" },
      { id: "stu_5", name: "Hannah Lee", roll: "05", status: "excused", remarks: "Approved appointment" },
      { id: "stu_6", name: "David Mensah", roll: "06", status: "present", remarks: "" },
    ],
  },
  {
    date: "2026-05-04",
    className: "Grade 8A",
    takenBy: "Supervisor A. Mensah",
    summary: "4 present, 2 absent",
    rows: [
      { id: "a1", name: "Ama Johnson", roll: "01", status: "present", remarks: "On time" },
      { id: "a2", name: "Kofi Badu", roll: "02", status: "absent", remarks: "Absent" },
      { id: "a3", name: "Nia Thompson", roll: "03", status: "present", remarks: "" },
      { id: "a4", name: "Peter Owusu", roll: "04", status: "absent", remarks: "Absent" },
      { id: "a5", name: "Hannah Lee", roll: "05", status: "present", remarks: "" },
      { id: "a6", name: "David Mensah", roll: "06", status: "present", remarks: "" },
    ],
  },
  {
    date: "2026-05-03",
    className: "Grade 8A",
    takenBy: "Supervisor A. Mensah",
    summary: "5 present, 1 absent",
    rows: [
      { id: "b1", name: "Ama Johnson", roll: "01", status: "present", remarks: "" },
      { id: "b2", name: "Kofi Badu", roll: "02", status: "present", remarks: "" },
      { id: "b3", name: "Nia Thompson", roll: "03", status: "present", remarks: "" },
      { id: "b4", name: "Peter Owusu", roll: "04", status: "absent", remarks: "Sick leave" },
      { id: "b5", name: "Hannah Lee", roll: "05", status: "present", remarks: "" },
      { id: "b6", name: "David Mensah", roll: "06", status: "present", remarks: "" },
    ],
  },
];

export default function TeacherAttendancePage() {
  const [selectedDate, setSelectedDate] = useState("2026-05-05");
  const [selectedClass, setSelectedClass] = useState("Grade 8A");

  const sessionData = attendanceHistory.find(
    (entry) => entry.date === selectedDate && entry.className === selectedClass,
  );

  const presentCount = sessionData?.rows.filter((r) => r.status === "present").length || 0;
  const absentCount = sessionData?.rows.filter((r) => r.status === "absent").length || 0;
  const lateCount = sessionData?.rows.filter((r) => r.status === "late").length || 0;
  const excusedCount = sessionData?.rows.filter((r) => r.status === "excused").length || 0;
  const totalStudents = sessionData?.rows.length || 0;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
            <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Class Attendance Register</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              View daily attendance records for your classes. Records are entered by the supervisor and available for your review.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm text-slate-600 dark:text-slate-400">
            Select Date
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
            />
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-400">
            Select Class
            <select
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
            >
              <option>Grade 8A</option>
              <option>Grade 7B</option>
              <option>Grade 6A</option>
            </select>
          </label>
        </div>
      </div>

      {/* Summary Cards */}
      {sessionData && (
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">Attendance Rate</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">{attendanceRate}%</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/20">
            <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">Present</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{presentCount}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/20">
            <p className="text-xs font-semibold uppercase text-red-700 dark:text-red-400">Absent</p>
            <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-400">{absentCount}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/20">
            <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">Late</p>
            <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-400">{lateCount}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/20">
            <p className="text-xs font-semibold uppercase text-blue-700 dark:text-blue-400">Excused</p>
            <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">{excusedCount}</p>
          </div>
        </div>
      )}

      {/* Attendance Register */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {sessionData ? (
          <div className="overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{sessionData.className}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {sessionData.date} · Taken by {sessionData.takenBy}
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{sessionData.summary}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-50">Student Name</th>
                    <th className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-50">Roll</th>
                    <th className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-50">Status</th>
                    <th className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-50">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {sessionData.rows.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 dark:text-slate-50">{student.name}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{student.roll}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[student.status]}`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{student.remarks || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center px-6 py-16">
            <p className="text-slate-600 dark:text-slate-400">No attendance record found for this date and class.</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/20">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          <strong>Note:</strong> Attendance is marked once per school day by the supervisor. You can view historical records here for reference and follow-up. To report issues or mark special attendance exceptions, contact the supervisor or admin.
        </p>
      </div>
    </div>
  );
}
