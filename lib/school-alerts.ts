import { getScopedItem, setScopedItem } from "@/lib/school-context";
import { formatStudentClassLabel } from "@/lib/class-labels";
import { getTodayIsoDate } from "@/lib/date-format";
import type { UserRole } from "@/lib/auth";
import {
  getLinkedStudentsForParentEmail,
  resolvePersonalViewStudent,
} from "@/lib/parent-student-links";
import { loadSchoolSystemSettings } from "@/lib/school-settings";
import { isEmailDeliveryConfigured } from "@/lib/email-types";
import { isWhatsAppDeliveryConfigured } from "@/lib/whatsapp-types";

export type AlertChannelId = "email" | "whatsapp";

export type AlertTypeId =
  | "attendance"
  | "performance"
  | "assignment"
  | "exam"
  | "fee";

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertTypeConfig = {
  id: AlertTypeId;
  name: string;
  enabled: boolean;
  channels: AlertChannelId[];
};

export type AlertThreshold = {
  id: string;
  name: string;
  value: number;
  unit: string;
  description: string;
};

export type NotificationChannelConfig = {
  id: AlertChannelId;
  name: string;
  configured: boolean;
  details: string;
};

export type SchoolAlertSettings = {
  alertTypes: AlertTypeConfig[];
  thresholds: AlertThreshold[];
  channels: NotificationChannelConfig[];
  updatedAt: string;
};

export type ActiveAlert = {
  id: string;
  type: AlertTypeId;
  title: string;
  message: string;
  severity: AlertSeverity;
  createdAt: string;
  read: boolean;
  dismissed: boolean;
  channels: AlertChannelId[];
  fingerprint: string;
  studentId?: string;
  className?: string;
};

export type AlertViewerContext = {
  role: UserRole;
  email?: string;
};

const SETTINGS_KEY = "alert_settings";
const ACTIVE_ALERTS_KEY = "active_alerts";

const CHANNEL_LABELS: Record<AlertChannelId, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
};

export function getChannelLabel(channel: AlertChannelId): string {
  return CHANNEL_LABELS[channel];
}

export function sanitizeAlertChannels(channels: AlertChannelId[]): AlertChannelId[] {
  return sanitizeChannels(channels);
}

export function getDefaultAlertSettings(): SchoolAlertSettings {
  return {
    alertTypes: [
      {
        id: "attendance",
        name: "Attendance Alerts",
        enabled: true,
        channels: ["email", "whatsapp"],
      },
      {
        id: "performance",
        name: "Performance Alerts",
        enabled: true,
        channels: ["email"],
      },
      {
        id: "assignment",
        name: "Assignment Alerts",
        enabled: true,
        channels: ["email", "whatsapp"],
      },
      {
        id: "exam",
        name: "Exam Alerts",
        enabled: false,
        channels: ["email", "whatsapp"],
      },
      {
        id: "fee",
        name: "Fee Payment Alerts",
        enabled: true,
        channels: ["email"],
      },
    ],
    thresholds: [
      {
        id: "attendance",
        name: "Attendance Threshold",
        value: 3,
        unit: "consecutive days",
        description: "Trigger alert after X consecutive absences",
      },
      {
        id: "performance",
        name: "Grade Average Drop",
        value: 10,
        unit: "%",
        description: "Alert when grade average drops by X percent",
      },
      {
        id: "assignment",
        name: "Assignment Due",
        value: 1,
        unit: "days before",
        description: "Reminder X days before deadline",
      },
      {
        id: "fee",
        name: "Fee Overdue",
        value: 7,
        unit: "days",
        description: "Alert X days after due date",
      },
    ],
    channels: [
      {
        id: "email",
        name: "Email",
        configured: false,
        details: "Configure SMTP in Admin → Communication Settings",
      },
      {
        id: "whatsapp",
        name: "WhatsApp",
        configured: false,
        details: "Link WhatsApp in Admin → Communication Settings",
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function enrichAlertSettingsWithChannelStatus(
  schoolId: string,
  settings: SchoolAlertSettings,
): SchoolAlertSettings {
  const communication = loadSchoolSystemSettings(schoolId).communication;
  const emailConfigured = isEmailDeliveryConfigured(communication);
  const whatsappConfigured = isWhatsAppDeliveryConfigured(communication);

  return {
    ...settings,
    channels: settings.channels.map((channel) => {
      if (channel.id === "email") {
        return {
          ...channel,
          configured: emailConfigured,
          details: emailConfigured
            ? `SMTP: ${communication.smtpServer}:${communication.smtpPort}`
            : "Configure SMTP in Admin → Communication Settings",
        };
      }
      if (channel.id === "whatsapp") {
        return {
          ...channel,
          configured: whatsappConfigured,
          details: whatsappConfigured
            ? `Linked number: +${communication.whatsappLinkedPhone}`
            : communication.whatsappNotifications
              ? "Connect WhatsApp in Communication Settings"
              : "Enable WhatsApp in Admin → Communication Settings",
        };
      }
      return channel;
    }),
  };
}

export function loadAlertSettings(schoolId: string): SchoolAlertSettings {
  const stored = getScopedItem(schoolId, SETTINGS_KEY);
  if (!stored) return enrichAlertSettingsWithChannelStatus(schoolId, getDefaultAlertSettings());

  const defaults = getDefaultAlertSettings();
  const parsed = parseJson<Partial<SchoolAlertSettings>>(stored, {});

  return enrichAlertSettingsWithChannelStatus(schoolId, {
    alertTypes: mergeAlertTypes(defaults.alertTypes, parsed.alertTypes),
    thresholds: mergeThresholds(defaults.thresholds, parsed.thresholds),
    channels: mergeChannels(defaults.channels, parsed.channels),
    updatedAt: parsed.updatedAt ?? defaults.updatedAt,
  });
}

function sanitizeChannels(channels: Array<AlertChannelId | "sms">): AlertChannelId[] {
  return channels
    .map((channel) => (channel === "sms" ? "whatsapp" : channel))
    .filter((channel): channel is AlertChannelId => channel === "email" || channel === "whatsapp");
}

function mergeAlertTypes(
  defaults: AlertTypeConfig[],
  stored?: AlertTypeConfig[],
): AlertTypeConfig[] {
  if (!stored?.length) return defaults;
  return defaults.map((item) => {
    const match = stored.find((s) => s.id === item.id);
    return match
      ? { ...item, enabled: match.enabled, channels: sanitizeChannels(match.channels) }
      : item;
  });
}

function mergeThresholds(
  defaults: AlertThreshold[],
  stored?: AlertThreshold[],
): AlertThreshold[] {
  if (!stored?.length) return defaults;
  return defaults.map((item) => {
    const match = stored.find((s) => s.id === item.id);
    return match ? { ...item, value: match.value } : item;
  });
}

function mergeChannels(
  defaults: NotificationChannelConfig[],
  stored?: NotificationChannelConfig[],
): NotificationChannelConfig[] {
  if (!stored?.length) return defaults;
  return defaults.map((item) => {
    const match = stored.find(
      (storedChannel) =>
        storedChannel.id === item.id ||
        (item.id === "whatsapp" && (storedChannel.id as string) === "sms"),
    );
    return match ? { ...item, ...match, id: item.id, name: item.name } : item;
  });
}

export function saveAlertSettings(schoolId: string, settings: SchoolAlertSettings): void {
  setScopedItem(
    schoolId,
    SETTINGS_KEY,
    JSON.stringify({ ...settings, updatedAt: new Date().toISOString() }),
  );
}

export function loadActiveAlerts(schoolId: string): ActiveAlert[] {
  return parseJson<ActiveAlert[]>(getScopedItem(schoolId, ACTIVE_ALERTS_KEY), []);
}

export function saveActiveAlerts(schoolId: string, alerts: ActiveAlert[]): void {
  setScopedItem(schoolId, ACTIVE_ALERTS_KEY, JSON.stringify(alerts));
}

export function getThresholdValue(settings: SchoolAlertSettings, id: string): number {
  return settings.thresholds.find((t) => t.id === id)?.value ?? 0;
}

export function getAlertTypeDescription(
  typeId: AlertTypeId,
  settings: SchoolAlertSettings,
): string {
  const attendanceDays = getThresholdValue(settings, "attendance");
  const gradeDrop = getThresholdValue(settings, "performance");
  const assignmentDays = getThresholdValue(settings, "assignment");
  const feeDays = getThresholdValue(settings, "fee");

  switch (typeId) {
    case "attendance":
      return `Notify parents on ${attendanceDays}+ consecutive absences`;
    case "performance":
      return `Alert on grade average drop > ${gradeDrop}% from previous cycle`;
    case "assignment":
      return `Notify on overdue assignments (${assignmentDays} day reminder before due)`;
    case "exam":
      return `Remind students of upcoming exams (${assignmentDays} days before)`;
    case "fee":
      return `Alert on overdue invoices (${feeDays} days after due date)`;
    default:
      return "";
  }
}

export function getUnreadAlertCount(schoolId: string, viewer?: AlertViewerContext): number {
  return getVisibleAlertsForViewer(schoolId, viewer).filter((a) => !a.read).length;
}

export function markAlertRead(schoolId: string, alertId: string): void {
  const alerts = loadActiveAlerts(schoolId).map((alert) =>
    alert.id === alertId ? { ...alert, read: true } : alert,
  );
  saveActiveAlerts(schoolId, alerts);
}

export function dismissAlert(schoolId: string, alertId: string): void {
  const alerts = loadActiveAlerts(schoolId).map((alert) =>
    alert.id === alertId ? { ...alert, dismissed: true, read: true } : alert,
  );
  saveActiveAlerts(schoolId, alerts);
}

export function markAllAlertsRead(schoolId: string): void {
  const alerts = loadActiveAlerts(schoolId).map((alert) => ({ ...alert, read: true }));
  saveActiveAlerts(schoolId, alerts);
}

type AttendanceRecord = {
  id: string;
  date: string;
  class: string;
  studentId: string;
  studentName: string;
  status: string;
};

type StudentRecord = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  class: string;
  section: string;
  parentEmail?: string;
  parentPhone?: string;
};

type ExamMark = {
  studentId: string;
  cycleId: string;
  marksObtained: number;
};

type ExamCycle = {
  id: string;
  name: string;
  endDate: string;
  status: string;
};

type ExamSchedule = {
  id: string;
  cycleId: string;
  className: string;
  subjectId: string;
  examDate: string;
};

type FinanceInvoice = {
  id: string;
  invoiceNo: string;
  studentId?: string;
  studentName: string;
  className?: string;
  status: string;
  dueAt: string;
  totalAmount: number;
  paidAmount: number;
};

type AssignmentRecord = {
  id: string;
  title: string;
  className: string;
  dueDate: string;
  status: "pending" | "overdue" | "submitted";
};

function loadAttendanceRecords(schoolId: string): AttendanceRecord[] {
  return parseJson(getScopedItem(schoolId, "attendance_records"), []);
}

function loadStudents(schoolId: string): StudentRecord[] {
  return parseJson(getScopedItem(schoolId, "school_students"), []);
}

function loadExamMarks(schoolId: string): ExamMark[] {
  return parseJson(getScopedItem(schoolId, "exam_marks"), []);
}

function loadExamCycles(schoolId: string): ExamCycle[] {
  return parseJson(getScopedItem(schoolId, "exam_cycles"), []);
}

function loadExamSchedules(schoolId: string): ExamSchedule[] {
  return parseJson(getScopedItem(schoolId, "exam_schedules"), []);
}

function loadFinanceInvoices(schoolId: string): FinanceInvoice[] {
  return parseJson(getScopedItem(schoolId, "finance_invoices"), []);
}

function loadAssignments(schoolId: string): AssignmentRecord[] {
  return parseJson(getScopedItem(schoolId, "school_assignments"), []);
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getConsecutiveAbsences(records: AttendanceRecord[], studentId: string): number {
  const studentRecords = records
    .filter((record) => record.studentId === studentId)
    .sort((a, b) => b.date.localeCompare(a.date));

  let count = 0;
  for (const record of studentRecords) {
    if (record.status === "absent") count += 1;
    else break;
  }
  return count;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildAlert(
  type: AlertTypeConfig,
  fingerprint: string,
  title: string,
  message: string,
  severity: AlertSeverity,
  scope?: { studentId?: string; className?: string },
): ActiveAlert {
  return {
    id: `${type.id}-${fingerprint}`,
    type: type.id,
    title,
    message,
    severity,
    createdAt: new Date().toISOString(),
    read: false,
    dismissed: false,
    channels: type.channels,
    fingerprint,
    studentId: scope?.studentId,
    className: scope?.className,
  };
}

function evaluateAttendanceAlerts(
  schoolId: string,
  type: AlertTypeConfig,
  threshold: number,
): ActiveAlert[] {
  const records = loadAttendanceRecords(schoolId);
  const students = loadStudents(schoolId);
  const alerts: ActiveAlert[] = [];

  for (const student of students) {
    const absences = getConsecutiveAbsences(records, student.id);
    if (absences < threshold) continue;

    const classLabel = formatStudentClassLabel(student.class, student.section);
    alerts.push(
      buildAlert(
        type,
        `attendance-${student.id}-${absences}`,
        `${student.firstName} ${student.lastName} — ${absences} consecutive absences`,
        `${classLabel} student has been absent for ${absences} consecutive school days. Consider contacting guardians.`,
        absences >= threshold + 2 ? "critical" : "warning",
        { studentId: student.id, className: classLabel },
      ),
    );
  }

  return alerts;
}

function evaluatePerformanceAlerts(
  schoolId: string,
  type: AlertTypeConfig,
  threshold: number,
): ActiveAlert[] {
  const cycles = loadExamCycles(schoolId)
    .filter((cycle) => cycle.status === "completed" || cycle.status === "active")
    .sort((a, b) => a.endDate.localeCompare(b.endDate));

  if (cycles.length < 2) return [];

  const [previousCycle, currentCycle] = cycles.slice(-2);
  const marks = loadExamMarks(schoolId);
  const students = loadStudents(schoolId);
  const alerts: ActiveAlert[] = [];

  for (const student of students) {
    const previousMarks = marks.filter(
      (mark) => mark.studentId === student.id && mark.cycleId === previousCycle.id,
    );
    const currentMarks = marks.filter(
      (mark) => mark.studentId === student.id && mark.cycleId === currentCycle.id,
    );

    if (previousMarks.length === 0 || currentMarks.length === 0) continue;

    const previousAverage = average(previousMarks.map((mark) => mark.marksObtained));
    const currentAverage = average(currentMarks.map((mark) => mark.marksObtained));
    if (previousAverage <= 0) continue;

    const dropPercent = ((previousAverage - currentAverage) / previousAverage) * 100;
    if (dropPercent <= threshold) continue;

    alerts.push(
      buildAlert(
        type,
        `performance-${student.id}-${currentCycle.id}`,
        `${student.firstName} ${student.lastName} — grades dropped ${dropPercent.toFixed(1)}%`,
        `Average fell from ${previousAverage.toFixed(1)} (${previousCycle.name}) to ${currentAverage.toFixed(1)} (${currentCycle.name}).`,
        dropPercent >= threshold * 1.5 ? "critical" : "warning",
        {
          studentId: student.id,
          className: formatStudentClassLabel(student.class, student.section),
        },
      ),
    );
  }

  return alerts;
}

function evaluateAssignmentAlerts(
  schoolId: string,
  type: AlertTypeConfig,
  reminderDays: number,
): ActiveAlert[] {
  const today = getTodayIsoDate();
  const assignments = loadAssignments(schoolId);
  const alerts: ActiveAlert[] = [];

  for (const assignment of assignments) {
    const daysUntilDue = daysBetween(today, assignment.dueDate);
    const isOverdue = assignment.status === "overdue" || daysUntilDue < 0;
    const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= reminderDays;

    if (!isOverdue && !isDueSoon) continue;

    alerts.push(
      buildAlert(
        type,
        `assignment-${assignment.id}`,
        isOverdue ? `Overdue assignment: ${assignment.title}` : `Assignment due soon: ${assignment.title}`,
        isOverdue
          ? `${assignment.className} assignment was due on ${assignment.dueDate}. Follow up with students.`
          : `${assignment.className} assignment is due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}.`,
        isOverdue ? "critical" : "warning",
        { className: assignment.className },
      ),
    );
  }

  return alerts;
}

function evaluateExamAlerts(
  schoolId: string,
  type: AlertTypeConfig,
  reminderDays: number,
): ActiveAlert[] {
  const today = getTodayIsoDate();
  const schedules = loadExamSchedules(schoolId);
  const alerts: ActiveAlert[] = [];

  for (const schedule of schedules) {
    const daysUntilExam = daysBetween(today, schedule.examDate);
    if (daysUntilExam < 0 || daysUntilExam > reminderDays) continue;

    alerts.push(
      buildAlert(
        type,
        `exam-${schedule.id}`,
        `Upcoming exam for ${schedule.className}`,
        `${schedule.subjectId} exam on ${schedule.examDate} (${daysUntilExam === 0 ? "today" : `in ${daysUntilExam} day${daysUntilExam === 1 ? "" : "s"}`}).`,
        daysUntilExam <= 1 ? "warning" : "info",
        { className: schedule.className },
      ),
    );
  }

  return alerts;
}

function evaluateFeeAlerts(
  schoolId: string,
  type: AlertTypeConfig,
  overdueDays: number,
): ActiveAlert[] {
  const today = getTodayIsoDate();
  const invoices = loadFinanceInvoices(schoolId);
  const students = loadStudents(schoolId);
  const alerts: ActiveAlert[] = [];

  for (const invoice of invoices) {
    if (invoice.status === "paid" || invoice.status === "void") continue;

    const daysPastDue = daysBetween(invoice.dueAt, today);
    const isMarkedOverdue = invoice.status === "overdue";
    const isOverdueByThreshold = daysPastDue >= overdueDays && invoice.paidAmount < invoice.totalAmount;

    if (!isMarkedOverdue && !isOverdueByThreshold) continue;

    const matchedStudent = students.find(
      (student) =>
        student.id === invoice.studentId ||
        `${student.firstName} ${student.lastName}`.trim() === invoice.studentName.trim(),
    );

    alerts.push(
      buildAlert(
        type,
        `fee-${invoice.id}`,
        `Overdue invoice ${invoice.invoiceNo}`,
        `${invoice.studentName} owes ₵${(invoice.totalAmount - invoice.paidAmount).toLocaleString()} (${daysPastDue} days past due).`,
        daysPastDue >= overdueDays * 2 ? "critical" : "warning",
        {
          studentId: invoice.studentId ?? matchedStudent?.id,
          className:
            invoice.className ??
            (matchedStudent
              ? formatStudentClassLabel(matchedStudent.class, matchedStudent.section)
              : undefined),
        },
      ),
    );
  }

  return alerts;
}

export function evaluateSchoolAlerts(
  schoolId: string,
  settings: SchoolAlertSettings = loadAlertSettings(schoolId),
): ActiveAlert[] {
  const generated: ActiveAlert[] = [];

  for (const type of settings.alertTypes) {
    if (!type.enabled) continue;

    switch (type.id) {
      case "attendance":
        generated.push(
          ...evaluateAttendanceAlerts(
            schoolId,
            type,
            getThresholdValue(settings, "attendance"),
          ),
        );
        break;
      case "performance":
        generated.push(
          ...evaluatePerformanceAlerts(
            schoolId,
            type,
            getThresholdValue(settings, "performance"),
          ),
        );
        break;
      case "assignment":
        generated.push(
          ...evaluateAssignmentAlerts(
            schoolId,
            type,
            getThresholdValue(settings, "assignment"),
          ),
        );
        break;
      case "exam":
        generated.push(
          ...evaluateExamAlerts(
            schoolId,
            type,
            getThresholdValue(settings, "assignment"),
          ),
        );
        break;
      case "fee":
        generated.push(
          ...evaluateFeeAlerts(schoolId, type, getThresholdValue(settings, "fee")),
        );
        break;
    }
  }

  return generated;
}

export type RefreshSchoolAlertsResult = {
  alerts: ActiveAlert[];
  newAlerts: ActiveAlert[];
};

export function refreshSchoolAlerts(schoolId: string): RefreshSchoolAlertsResult {
  const settings = loadAlertSettings(schoolId);
  const existing = loadActiveAlerts(schoolId);
  const evaluated = evaluateSchoolAlerts(schoolId, settings);

  const preserved = existing.filter((alert) => alert.dismissed);
  const merged: ActiveAlert[] = [];
  const newAlerts: ActiveAlert[] = [];

  for (const alert of evaluated) {
    const previous = existing.find((item) => item.fingerprint === alert.fingerprint);
    const wasDismissed = existing.some(
      (item) => item.fingerprint === alert.fingerprint && item.dismissed,
    );

    if (wasDismissed) continue;

    if (previous && !previous.dismissed) {
      merged.push(previous);
    } else {
      merged.push(alert);
      if (!previous) {
        newAlerts.push(alert);
      }
    }
  }

  const sorted = merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  saveActiveAlerts(schoolId, [...sorted, ...preserved]);
  return { alerts: sorted, newAlerts };
}

export function getVisibleAlerts(schoolId: string): ActiveAlert[] {
  return loadActiveAlerts(schoolId)
    .filter((alert) => !alert.dismissed)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function normalizeClassLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function alertMatchesLinkedClasses(alert: ActiveAlert, linkedClassLabels: Set<string>): boolean {
  if (!alert.className) return false;
  return linkedClassLabels.has(normalizeClassLabel(alert.className));
}

export function filterAlertsForViewer(
  alerts: ActiveAlert[],
  schoolId: string,
  viewer?: AlertViewerContext,
): ActiveAlert[] {
  if (!viewer || viewer.role === "admin" || viewer.role === "teacher") {
    return alerts;
  }

  if (viewer.role === "parent") {
    const linkedChildren = getLinkedStudentsForParentEmail(schoolId, viewer.email ?? "");
    if (linkedChildren.length === 0) return [];

    const linkedIds = new Set(linkedChildren.map((child) => child.id));
    const linkedClassLabels = new Set(
      linkedChildren.map((child) =>
        normalizeClassLabel(formatStudentClassLabel(child.class, child.section)),
      ),
    );

    return alerts.filter((alert) => {
      if (alert.studentId) {
        return linkedIds.has(alert.studentId);
      }
      if (alert.type === "fee") {
        return linkedChildren.some((child) =>
          alert.message.includes(`${child.firstName} ${child.lastName}`.trim()),
        );
      }
      if (alert.type === "assignment" || alert.type === "exam") {
        return alertMatchesLinkedClasses(alert, linkedClassLabels);
      }
      return false;
    });
  }

  if (viewer.role === "student") {
    const student = resolvePersonalViewStudent(schoolId, { email: viewer.email ?? "" }, "student");
    if (!student) return [];

    const studentClass = normalizeClassLabel(
      formatStudentClassLabel(student.class, student.section),
    );

    return alerts.filter((alert) => {
      if (alert.studentId) {
        return alert.studentId === student.id;
      }
      if (alert.type === "assignment" || alert.type === "exam") {
        return alert.className ? normalizeClassLabel(alert.className) === studentClass : false;
      }
      return false;
    });
  }

  return alerts;
}

export function getVisibleAlertsForViewer(
  schoolId: string,
  viewer?: AlertViewerContext,
): ActiveAlert[] {
  return filterAlertsForViewer(getVisibleAlerts(schoolId), schoolId, viewer);
}

export function getUnreadAlertCountForViewer(
  schoolId: string,
  viewer?: AlertViewerContext,
): number {
  return getVisibleAlertsForViewer(schoolId, viewer).filter((alert) => !alert.read).length;
}
