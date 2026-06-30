"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  FileText,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useSchool } from "@/lib/school-context";
import { getUserSession, type UserSession } from "@/lib/teacher-check-in";
import {
  downloadGeneratedReport,
  formatReportSize,
  generateSchoolReport,
  getAvailableClasses,
  getAvailableSubjects,
  getDefaultDateRange,
  loadGeneratedReports,
  type GeneratedReport,
  type ReportFormat,
  type ReportType,
} from "@/lib/school-reports";
import { formatDateTime, getTodayIsoDate } from "@/lib/date-format";
import { DateInput } from "@/components/ui/date-input";

const reportTypes: Array<{
  id: ReportType;
  title: string;
  description: string;
  icon: string;
  formats: ReportFormat[];
}> = [
  {
    id: "attendance",
    title: "Attendance Report",
    description: "Class-wise and student-wise attendance records",
    icon: "📊",
    formats: ["csv", "excel", "pdf"],
  },
  {
    id: "performance",
    title: "Performance Report",
    description: "Subject-wise performance, grades, and rankings",
    icon: "📈",
    formats: ["csv", "excel", "pdf"],
  },
  {
    id: "finance",
    title: "Finance Report",
    description: "Invoice, payment, and ledger summaries",
    icon: "💰",
    formats: ["csv", "excel", "pdf"],
  },
  {
    id: "exam",
    title: "Exam Results Report",
    description: "Marks, grades, and performance analysis",
    icon: "📝",
    formats: ["csv", "excel", "pdf"],
  },
  {
    id: "staff",
    title: "Staff Report",
    description: "Staff roster and teacher check-in activity",
    icon: "👥",
    formats: ["csv", "excel", "pdf"],
  },
  {
    id: "system",
    title: "System Report",
    description: "User statistics and school data summary",
    icon: "⚙️",
    formats: ["csv", "excel", "pdf"],
  },
];

export default function ReportsPage() {
  const { currentSchool } = useSchool();
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>("csv");
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const loadData = useCallback(() => {
    if (!currentSchool) return;
    setSession(getUserSession());
    setGeneratedReports(loadGeneratedReports(currentSchool.id));
    setLoading(false);
  }, [currentSchool]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const classes = useMemo(
    () => (currentSchool ? getAvailableClasses(currentSchool.id) : []),
    [currentSchool, generatedReports],
  );

  const subjects = useMemo(
    () => (currentSchool ? getAvailableSubjects(currentSchool.id) : []),
    [currentSchool, generatedReports],
  );

  const selectedReportConfig = reportTypes.find((report) => report.id === selectedReport);
  const showClassFilter =
    selectedReport === "attendance" ||
    selectedReport === "performance" ||
    selectedReport === "finance" ||
    selectedReport === "exam";
  const showSubjectFilter =
    selectedReport === "performance" || selectedReport === "exam";

  const handleGenerate = async () => {
    if (!currentSchool || !selectedReport) return;

    if (dateRange.from > dateRange.to) {
      setMessage({ type: "error", text: "The start date must be before the end date." });
      return;
    }

    setGenerating(true);
    setMessage(null);

    try {
      const report = generateSchoolReport({
        schoolId: currentSchool.id,
        type: selectedReport,
        format: selectedFormat,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        filters: {
          className: classFilter,
          subjectId: subjectFilter,
        },
      });

      setGeneratedReports(loadGeneratedReports(currentSchool.id));
      downloadGeneratedReport(report);
      setMessage({
        type: "success",
        text: `${report.title} generated with ${report.rowCount} data row${report.rowCount === 1 ? "" : "s"}.`,
      });
    } catch {
      setMessage({ type: "error", text: "Failed to generate report. Please try again." });
    } finally {
      setGenerating(false);
    }
  };

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
          Only administrators can generate and download school reports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="section-label mb-1">Admin</p>
        <h1 className="page-title">Reports & Analytics</h1>
        <p className="page-subtitle mt-1">
          Generate downloadable reports from live school data stored in this system.
        </p>
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

      <div className="surface-card p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">
          Generate New Report
        </h2>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-900 dark:text-slate-50">
              Select Report Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {reportTypes.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => {
                    setSelectedReport(report.id);
                    setSelectedFormat(report.formats[0]);
                  }}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    selectedReport === report.id
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  <p className="mb-1 text-xl">{report.icon}</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {report.title}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-slate-900 dark:text-slate-50">
              Date Range
            </label>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                  From
                </label>
                <DateInput
                  value={dateRange.from}
                  onChange={(from) => setDateRange({ ...dateRange, from })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                  To
                </label>
                <DateInput
                  value={dateRange.to}
                  max={getTodayIsoDate()}
                  onChange={(to) => setDateRange({ ...dateRange, to })}
                  className="input-field"
                />
              </div>
            </div>

            {selectedReportConfig && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-50">
                  Export Format
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedReportConfig.formats.map((format) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => setSelectedFormat(format)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        selectedFormat === format
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {format === "pdf" ? "PDF (HTML)" : format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedReport && (
          <div className="mb-6 rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
            <div className="mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Additional Filters (Optional)
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {showClassFilter ? (
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="all">All Classes</option>
                  {classes.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 dark:border-slate-600">
                  No class filter for this report type
                </div>
              )}

              {showSubjectFilter ? (
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 dark:border-slate-600">
                  No subject filter for this report type
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!selectedReport || generating}
          onClick={handleGenerate}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold transition-colors ${
            selectedReport && !generating
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
          }`}
        >
          <FileText className="h-4 w-4" />
          {generating ? "Generating..." : "Generate Report"}
        </button>
      </div>

      <div className="surface-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            Recently Generated
          </h2>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {generatedReports.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-slate-600 dark:text-slate-400">
              No reports generated yet. Choose a report type above to create your first export.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {generatedReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-50">{report.title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {formatDateTime(report.generatedAt)} •{" "}
                    {formatReportSize(report.sizeBytes)} • {report.format.toUpperCase()} •{" "}
                    {report.rowCount} row{report.rowCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadGeneratedReport(report)}
                  className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-slate-200 dark:text-blue-400 dark:hover:bg-slate-600"
                  title="Download again"
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-700 dark:bg-emerald-900/20">
        <h3 className="mb-2 font-semibold text-emerald-900 dark:text-emerald-200">
          Report data sources
        </h3>
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          Reports pull from attendance records, students, staff, exam marks, teacher check-ins, and
          system users saved for the current school. Finance reports include stored invoices when
          available. PDF exports download as printable HTML files you can save as PDF from your
          browser.
        </p>
      </div>
    </div>
  );
}
