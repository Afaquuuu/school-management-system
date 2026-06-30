import {
  formatStudentClassLabel,
  getUniqueClassLabels,
} from "@/lib/class-labels";
import { getScopedItem, getSchoolClasses, setScopedItem } from "@/lib/school-context";
import { loadTeacherCheckIns } from "@/lib/teacher-check-in";
import { formatDate, formatDateTime } from "@/lib/date-format";

export type ReportType =
  | "attendance"
  | "performance"
  | "finance"
  | "exam"
  | "staff"
  | "system";

export type ReportFormat = "csv" | "excel" | "pdf";

export type GeneratedReport = {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  dateFrom: string;
  dateTo: string;
  format: ReportFormat;
  sizeBytes: number;
  rowCount: number;
  fileName: string;
  mimeType: string;
  content: string;
};

export type ReportFilters = {
  className?: string;
  subjectId?: string;
};

const STORAGE_KEY = "generated_reports";

const SUBJECT_NAMES: Record<string, string> = {
  "1": "Mathematics",
  "2": "English",
  "3": "Science",
  "4": "Social Studies",
  "5": "Computer Science",
};

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isWithinRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

function escapeCsv(value: string | number): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatReportSize(bytes: number): string {
  return formatBytes(bytes);
}

function getSubjectName(subjectId: string): string {
  return SUBJECT_NAMES[subjectId] ?? subjectId;
}

function loadAttendanceRecords(schoolId: string) {
  return parseJson<
    Array<{
      id: string;
      date: string;
      class: string;
      studentId: string;
      studentName: string;
      status: string;
      remarks?: string;
      savedAt?: string;
    }>
  >(getScopedItem(schoolId, "attendance_records"), []);
}

function loadStudents(schoolId: string) {
  return parseJson<
    Array<{
      id: string;
      studentId: string;
      firstName: string;
      lastName: string;
      class: string;
      section: string;
      email?: string;
    }>
  >(getScopedItem(schoolId, "school_students"), []);
}

function loadStaff(schoolId: string) {
  return parseJson<
    Array<{
      id: string;
      staffId: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      department: string;
      status: string;
      joiningDate?: string;
    }>
  >(getScopedItem(schoolId, "school_staff"), []);
}

function loadSystemUsers(schoolId: string) {
  return parseJson<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
    }>
  >(getScopedItem(schoolId, "system_users"), []);
}

function loadExamMarks(schoolId: string) {
  return parseJson<
    Array<{
      id: string;
      studentId: string;
      cycleId: string;
      className: string;
      section: string;
      subjectId: string;
      marksObtained: number;
      remarks?: string;
      enteredAt?: string;
    }>
  >(getScopedItem(schoolId, "exam_marks"), []);
}

function loadExamCycles(schoolId: string) {
  return parseJson<
    Array<{
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      status: string;
    }>
  >(getScopedItem(schoolId, "exam_cycles"), []);
}

function loadFinanceInvoices(schoolId: string) {
  return parseJson<
    Array<{
      id: string;
      invoiceNo: string;
      studentName: string;
      className: string;
      totalAmount: number;
      paidAmount: number;
      status: string;
      issuedAt: string;
      dueAt: string;
    }>
  >(getScopedItem(schoolId, "finance_invoices"), []);
}

export function getAvailableClasses(schoolId: string): string[] {
  const labels: string[] = [];

  for (const student of loadStudents(schoolId)) {
    labels.push(formatStudentClassLabel(student.class, student.section));
  }

  for (const record of loadAttendanceRecords(schoolId)) {
    if (record.class) labels.push(record.class);
  }

  for (const schoolClass of getSchoolClasses(schoolId)) {
    labels.push(schoolClass.name);
  }

  return getUniqueClassLabels(labels);
}

export function getAvailableSubjects(schoolId: string): Array<{ id: string; name: string }> {
  const marks = loadExamMarks(schoolId);
  const ids = [...new Set(marks.map((m) => m.subjectId))];
  if (ids.length === 0) {
    return Object.entries(SUBJECT_NAMES).map(([id, name]) => ({ id, name }));
  }
  return ids.map((id) => ({ id, name: getSubjectName(id) }));
}

export function loadGeneratedReports(schoolId: string): GeneratedReport[] {
  const reports = parseJson<GeneratedReport[]>(getScopedItem(schoolId, STORAGE_KEY), []);
  return reports.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

function saveGeneratedReports(schoolId: string, reports: GeneratedReport[]) {
  setScopedItem(schoolId, STORAGE_KEY, JSON.stringify(reports.slice(0, 25)));
}

export const reportTypeLabels: Record<ReportType, string> = {
  attendance: "Attendance Report",
  performance: "Performance Report",
  finance: "Finance Report",
  exam: "Exam Results Report",
  staff: "Staff Report",
  system: "System Report",
};

function buildAttendanceReport(
  schoolId: string,
  from: string,
  to: string,
  filters: ReportFilters,
): string[][] {
  let records = loadAttendanceRecords(schoolId).filter((r) =>
    isWithinRange(r.date, from, to),
  );

  if (filters.className && filters.className !== "all") {
    records = records.filter((r) => r.class === filters.className);
  }

  const rows: string[][] = [
    ["Date", "Class", "Student ID", "Student Name", "Status", "Remarks"],
  ];

  for (const record of records.sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([
      formatDate(record.date),
      record.class,
      record.studentId,
      record.studentName,
      record.status,
      record.remarks ?? "",
    ]);
  }

  if (rows.length === 1) {
    rows.push(["No attendance records found for the selected range.", "", "", "", "", ""]);
  }

  return rows;
}

function buildPerformanceReport(
  schoolId: string,
  from: string,
  to: string,
  filters: ReportFilters,
): string[][] {
  const students = loadStudents(schoolId);
  const studentMap = new Map(students.map((s) => [s.id, s]));
  let marks = loadExamMarks(schoolId).filter((m) => {
    const enteredAt = m.enteredAt?.slice(0, 10) ?? "";
    return !enteredAt || isWithinRange(enteredAt, from, to);
  });

  if (filters.className && filters.className !== "all") {
    marks = marks.filter(
      (m) => `${m.className} ${m.section}`.trim() === filters.className,
    );
  }

  if (filters.subjectId && filters.subjectId !== "all") {
    marks = marks.filter((m) => m.subjectId === filters.subjectId);
  }

  const rows: string[][] = [
    [
      "Student ID",
      "Student Name",
      "Class",
      "Subject",
      "Marks Obtained",
      "Remarks",
      "Entered At",
    ],
  ];

  for (const mark of marks) {
    const student = studentMap.get(mark.studentId);
    rows.push([
      mark.studentId,
      student ? `${student.firstName} ${student.lastName}`.trim() : mark.studentId,
      `${mark.className} ${mark.section}`.trim(),
      getSubjectName(mark.subjectId),
      String(mark.marksObtained),
      mark.remarks ?? "",
      mark.enteredAt ? formatDateTime(mark.enteredAt) : "",
    ]);
  }

  if (rows.length === 1) {
    rows.push(["No performance records found for the selected range.", "", "", "", "", "", ""]);
  }

  return rows;
}

function buildFinanceReport(
  schoolId: string,
  from: string,
  to: string,
  filters: ReportFilters,
): string[][] {
  let invoices = loadFinanceInvoices(schoolId).filter((inv) =>
    isWithinRange(inv.issuedAt, from, to),
  );

  if (filters.className && filters.className !== "all") {
    invoices = invoices.filter((inv) => inv.className === filters.className);
  }

  const rows: string[][] = [
    [
      "Invoice No",
      "Student",
      "Class",
      "Total Amount",
      "Paid Amount",
      "Outstanding",
      "Status",
      "Issued At",
      "Due At",
    ],
  ];

  for (const invoice of invoices) {
    rows.push([
      invoice.invoiceNo,
      invoice.studentName,
      invoice.className,
      String(invoice.totalAmount),
      String(invoice.paidAmount),
      String(invoice.totalAmount - invoice.paidAmount),
      invoice.status,
      formatDate(invoice.issuedAt),
      formatDate(invoice.dueAt),
    ]);
  }

  if (rows.length === 1) {
    rows.push([
      "No finance invoices stored yet. Create invoices in Finance to populate this report.",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  }

  return rows;
}

function buildExamReport(
  schoolId: string,
  from: string,
  to: string,
  filters: ReportFilters,
): string[][] {
  const cycles = loadExamCycles(schoolId);
  const cycleMap = new Map(cycles.map((c) => [c.id, c.name]));
  let marks = loadExamMarks(schoolId).filter((m) => {
    const enteredAt = m.enteredAt?.slice(0, 10) ?? "";
    return !enteredAt || isWithinRange(enteredAt, from, to);
  });

  if (filters.className && filters.className !== "all") {
    marks = marks.filter(
      (m) => `${m.className} ${m.section}`.trim() === filters.className,
    );
  }

  if (filters.subjectId && filters.subjectId !== "all") {
    marks = marks.filter((m) => m.subjectId === filters.subjectId);
  }

  const rows: string[][] = [
    [
      "Exam Cycle",
      "Class",
      "Subject",
      "Student ID",
      "Marks Obtained",
      "Remarks",
      "Entered At",
    ],
  ];

  for (const mark of marks) {
    rows.push([
      cycleMap.get(mark.cycleId) ?? mark.cycleId,
      `${mark.className} ${mark.section}`.trim(),
      getSubjectName(mark.subjectId),
      mark.studentId,
      String(mark.marksObtained),
      mark.remarks ?? "",
      mark.enteredAt ? formatDateTime(mark.enteredAt) : "",
    ]);
  }

  if (rows.length === 1) {
    rows.push(["No exam marks found for the selected range.", "", "", "", "", "", ""]);
  }

  return rows;
}

function buildStaffReport(
  schoolId: string,
  from: string,
  to: string,
  filters: ReportFilters,
): string[][] {
  const staff = loadStaff(schoolId);
  const checkIns = loadTeacherCheckIns(schoolId).filter((r) =>
    isWithinRange(r.date, from, to),
  );

  const rows: string[][] = [
    ["Staff ID", "Name", "Email", "Role", "Department", "Status", "Joining Date"],
  ];

  for (const member of staff) {
    rows.push([
      member.staffId,
      `${member.firstName} ${member.lastName}`.trim(),
      member.email,
      member.role,
      member.department,
      member.status,
      member.joiningDate ? formatDate(member.joiningDate) : "",
    ]);
  }

  rows.push([]);
  rows.push(["Teacher Check-ins (selected date range)"]);
  rows.push(["Date", "Teacher", "Email", "Department", "Status", "Check-in Time"]);

  for (const record of checkIns) {
    rows.push([
      formatDate(record.date),
      record.teacherName,
      record.teacherEmail,
      record.department,
      record.status,
      formatDateTime(record.checkInAt),
    ]);
  }

  if (staff.length === 0 && checkIns.length === 0) {
    rows.push(["No staff or teacher check-in records found.", "", "", "", "", ""]);
  }

  return rows;
}

function buildSystemReport(schoolId: string, from: string, to: string): string[][] {
  const students = loadStudents(schoolId);
  const staff = loadStaff(schoolId);
  const users = loadSystemUsers(schoolId);
  const attendance = loadAttendanceRecords(schoolId).filter((r) =>
    isWithinRange(r.date, from, to),
  );
  const marks = loadExamMarks(schoolId);
  const checkIns = loadTeacherCheckIns(schoolId).filter((r) =>
    isWithinRange(r.date, from, to),
  );

  const usersByRole = users.reduce<Record<string, number>>((acc, user) => {
    acc[user.role] = (acc[user.role] ?? 0) + 1;
    return acc;
  }, {});

  const presentCount = attendance.filter((r) => r.status === "present").length;
  const attendanceRate =
    attendance.length > 0
      ? `${((presentCount / attendance.length) * 100).toFixed(1)}%`
      : "N/A";

  const rows: string[][] = [
    ["Metric", "Value"],
    ["Report Period From", formatDate(from)],
    ["Report Period To", formatDate(to)],
    ["Total Students", String(students.length)],
    ["Total Staff", String(staff.length)],
    ["Total System Users", String(users.length)],
    ["Attendance Records (range)", String(attendance.length)],
    ["Attendance Rate (range)", attendanceRate],
    ["Exam Mark Entries", String(marks.length)],
    ["Teacher Check-ins (range)", String(checkIns.length)],
  ];

  for (const [role, count] of Object.entries(usersByRole)) {
    rows.push([`Users - ${role}`, String(count)]);
  }

  return rows;
}

function buildReportRows(
  type: ReportType,
  schoolId: string,
  from: string,
  to: string,
  filters: ReportFilters,
): string[][] {
  switch (type) {
    case "attendance":
      return buildAttendanceReport(schoolId, from, to, filters);
    case "performance":
      return buildPerformanceReport(schoolId, from, to, filters);
    case "finance":
      return buildFinanceReport(schoolId, from, to, filters);
    case "exam":
      return buildExamReport(schoolId, from, to, filters);
    case "staff":
      return buildStaffReport(schoolId, from, to, filters);
    case "system":
      return buildSystemReport(schoolId, from, to);
    default:
      return [["Unsupported report type"]];
  }
}

function rowsToHtml(title: string, rows: string[][]): string {
  const bodyRows = rows
    .map(
      (row, index) =>
        `<tr>${row
          .map(
            (cell) =>
              `<${index === 0 ? "th" : "td"}>${String(cell)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</${index === 0 ? "th" : "td"}>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p { color: #475569; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 13px; }
    th { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated on ${formatDateTime(new Date())}</p>
  <table>${bodyRows}</table>
</body>
</html>`;
}

function getFileMeta(type: ReportType, format: ReportFormat, from: string, to: string) {
  const slug = type.replace(/_/g, "-");
  const range = `${from}_to_${to}`;

  if (format === "pdf") {
    return {
      fileName: `${slug}-report-${range}.html`,
      mimeType: "text/html",
    };
  }

  return {
    fileName: `${slug}-report-${range}.${format === "excel" ? "csv" : "csv"}`,
    mimeType: "text/csv",
  };
}

export function generateSchoolReport(input: {
  schoolId: string;
  type: ReportType;
  format: ReportFormat;
  dateFrom: string;
  dateTo: string;
  filters?: ReportFilters;
}): GeneratedReport {
  const filters = input.filters ?? {};
  const rows = buildReportRows(
    input.type,
    input.schoolId,
    input.dateFrom,
    input.dateTo,
    filters,
  );
  const rowCount = Math.max(rows.length - 1, 0);
  const title = `${reportTypeLabels[input.type]} (${formatDate(input.dateFrom)} to ${formatDate(input.dateTo)})`;

  let content: string;
  if (input.format === "pdf") {
    content = rowsToHtml(title, rows);
  } else {
    const csv = rowsToCsv(rows);
    content = input.format === "excel" ? `\uFEFF${csv}` : csv;
  }

  const { fileName, mimeType } = getFileMeta(
    input.type,
    input.format,
    input.dateFrom,
    input.dateTo,
  );

  const report: GeneratedReport = {
    id: `report_${Date.now()}`,
    type: input.type,
    title,
    generatedAt: new Date().toISOString(),
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    format: input.format,
    sizeBytes: new Blob([content]).size,
    rowCount,
    fileName,
    mimeType,
    content,
  };

  const existing = loadGeneratedReports(input.schoolId);
  saveGeneratedReports(input.schoolId, [report, ...existing]);

  return report;
}

export function downloadGeneratedReport(report: GeneratedReport) {
  if (typeof window === "undefined") return;

  const blob = new Blob([report.content], { type: report.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = report.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getDefaultDateRange() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: from.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  };
}
