import { buildSchoolClassId } from "@/lib/school-classes-sync";
import {
  loadSchoolStudentRecords,
  type SchoolStudentRecord,
} from "@/lib/parent-student-links";
import type { AnnouncementAudience } from "@/lib/school-announcements";
import { loadSystemUsers } from "@/lib/system-users";
import type { FinanceInvoice } from "@/lib/finance-invoices";

function normalizeEmail(value: string | undefined | null): string | null {
  const email = value?.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

function uniqueEmails(emails: Array<string | null | undefined>): string[] {
  return [...new Set(emails.filter(Boolean) as string[])];
}

function studentMatchesClass(student: SchoolStudentRecord, classId?: string): boolean {
  if (!classId) return true;
  return buildSchoolClassId(student.class, student.section) === classId;
}

function getScopedStudents(
  schoolId: string,
  classId?: string,
): SchoolStudentRecord[] {
  return loadSchoolStudentRecords(schoolId).filter((student) =>
    studentMatchesClass(student, classId),
  );
}

function getStudentEmails(students: SchoolStudentRecord[]): string[] {
  return uniqueEmails(
    students.flatMap((student) => [
      normalizeEmail(student.email),
      normalizeEmail(student.guardianEmail),
    ]),
  );
}

function getParentEmails(schoolId: string, students: SchoolStudentRecord[]): string[] {
  const studentIds = new Set(students.map((student) => student.id));
  const users = loadSystemUsers(schoolId);

  const linkedParentEmails = users
    .filter(
      (user) =>
        user.role === "Parent" &&
        user.status === "Active" &&
        user.linkedStudentIds?.some((id) => studentIds.has(id)),
    )
    .map((user) => normalizeEmail(user.email));

  const guardianEmails = students.map((student) =>
    normalizeEmail(student.guardianEmail),
  );

  return uniqueEmails([...linkedParentEmails, ...guardianEmails]);
}

function getTeacherEmails(schoolId: string): string[] {
  return uniqueEmails(
    loadSystemUsers(schoolId)
      .filter((user) => user.role === "Teacher" && user.status === "Active")
      .map((user) => normalizeEmail(user.email)),
  );
}

function getStaffEmails(schoolId: string): string[] {
  return uniqueEmails(
    loadSystemUsers(schoolId)
      .filter(
        (user) =>
          user.status === "Active" &&
          ["Admin", "Teacher", "Accountant", "Librarian"].includes(user.role),
      )
      .map((user) => normalizeEmail(user.email)),
  );
}

export function resolveAnnouncementRecipients(input: {
  schoolId: string;
  targetAudience: AnnouncementAudience[];
  classId?: string;
}): string[] {
  const { schoolId, targetAudience, classId } = input;
  const students = getScopedStudents(schoolId, classId);
  const emails: string[] = [];

  if (targetAudience.includes("Students")) {
    emails.push(...getStudentEmails(students));
  }
  if (targetAudience.includes("Parents")) {
    emails.push(...getParentEmails(schoolId, students));
  }
  if (targetAudience.includes("Teachers")) {
    emails.push(...getTeacherEmails(schoolId));
  }
  if (targetAudience.includes("All Staff")) {
    emails.push(...getStaffEmails(schoolId));
  }

  return uniqueEmails(emails);
}

export function resolveFeeReminderEmails(
  schoolId: string,
  invoice: FinanceInvoice,
): string[] {
  const students = loadSchoolStudentRecords(schoolId);
  const matchedStudent = invoice.studentId
    ? students.find((student) => student.id === invoice.studentId)
    : students.find(
        (student) =>
          `${student.firstName} ${student.lastName}`.trim().toLowerCase() ===
          invoice.studentName.trim().toLowerCase(),
      );

  if (!matchedStudent) {
    return [];
  }

  return getParentEmails(schoolId, [matchedStudent]);
}
