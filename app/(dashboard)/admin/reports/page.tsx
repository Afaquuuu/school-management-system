"use client";

import { Download, Calendar, Filter, FileText } from "lucide-react";
import { useState } from "react";

const reportTypes = [
  {
    id: "attendance",
    title: "Attendance Report",
    description: "Class-wise and student-wise attendance records",
    icon: "📊",
    formats: ["PDF", "Excel"],
  },
  {
    id: "performance",
    title: "Performance Report",
    description: "Subject-wise performance, grades, and rankings",
    icon: "📈",
    formats: ["PDF", "Excel"],
  },
  {
    id: "finance",
    title: "Finance Report",
    description: "Invoice, payment, and ledger summaries",
    icon: "💰",
    formats: ["PDF", "Excel"],
  },
  {
    id: "exam",
    title: "Exam Results Report",
    description: "Marks, grades, and performance analysis",
    icon: "📝",
    formats: ["PDF", "Excel"],
  },
  {
    id: "staff",
    title: "Staff Report",
    description: "Teacher allocations, leave, and performance",
    icon: "👥",
    formats: ["PDF", "Excel"],
  },
  {
    id: "system",
    title: "System Report",
    description: "User statistics, audit logs, and system health",
    icon: "⚙️",
    formats: ["PDF", "CSV"],
  },
];

const generatedReports = [
  { name: "Attendance Report - May 2026", date: "May 5, 2026", size: "2.4 MB", type: "PDF", downloadUrl: "#" },
  { name: "Performance Analysis Q2", date: "Apr 28, 2026", size: "5.1 MB", type: "Excel", downloadUrl: "#" },
  { name: "Monthly Finance Summary", date: "Apr 25, 2026", size: "1.8 MB", type: "PDF", downloadUrl: "#" },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: "2026-05-01", to: "2026-05-05" });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Reports & Analytics</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Generate and download comprehensive school reports</p>
      </div>

      {/* Report Generator */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">Generate New Report</h2>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Report Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-3">Select Report Type</label>
            <div className="grid grid-cols-2 gap-2">
              {reportTypes.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`p-3 text-left rounded-lg border-2 transition-all ${
                    selectedReport === report.id
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  <p className="text-xl mb-1">{report.icon}</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{report.title}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-3">Date Range</label>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">From</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">To</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {selectedReport && (
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Additional Filters (Optional)</p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <select className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Classes</option>
                <option>Grade 6A</option>
                <option>Grade 7B</option>
                <option>Grade 8A</option>
              </select>
              <select className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Subjects</option>
                <option>Mathematics</option>
                <option>English</option>
                <option>Science</option>
              </select>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          disabled={!selectedReport}
          className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
            selectedReport
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
          }`}
        >
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* Previously Generated Reports */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">Recently Generated</h2>

        <div className="space-y-3">
          {generatedReports.map((report, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-slate-50">{report.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {report.date} • {report.size} • {report.type}
                </p>
              </div>
              <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors text-blue-600 dark:text-blue-400">
                <Download className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Report Templates Info */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-6">
        <h3 className="font-semibold text-emerald-900 dark:text-emerald-200 mb-2">💡 Pro Tip</h3>
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          You can schedule automated reports to be generated and emailed to stakeholders daily, weekly, or monthly. Configure this in System Settings.
        </p>
      </div>
    </div>
  );
}
