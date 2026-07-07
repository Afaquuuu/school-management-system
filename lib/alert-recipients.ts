import { formatStudentClassLabel, normalizeClassLabel } from "@/lib/class-labels";
import {
  loadSchoolStudentRecords,
  type SchoolStudentRecord,
} from "@/lib/parent-student-links";
import type { ActiveAlert } from "@/lib/school-alerts";
import { loadSystemUsers } from "@/lib/system-users";

export type AlertRecipients = {
  emails: string[];
  phones: string[];
};

function normalizeEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

function normalizePhone(value?: string | null): string | null {
  const phone = value?.replace(/\s+/g, "").trim();
  if (!phone || phone.length < 8) return null;
  return phone;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])];
}

function getParentsForStudent(schoolId: string, studentId: string): AlertRecipients {
  const students = loadSchoolStudentRecords(schoolId);
  const student = students.find((item) => item.id === studentId);
  if (!student) return { emails: [], phones: [] };

  const parentUsers = loadSystemUsers(schoolId).filter(
    (user) =>
      user.role === "Parent" &&
      user.status === "Active" &&
      user.linkedStudentIds?.includes(studentId),
  );

  return {
    emails: uniqueStrings([
      normalizeEmail(student.guardianEmail),
      ...parentUsers.map((user) => normalizeEmail(user.email)),
    ]),
    phones: uniqueStrings([
      normalizePhone(student.guardianPhone),
      ...parentUsers.map((user) => normalizePhone(user.phone)),
    ]),
  };
}

function getStudentsInClass(schoolId: string, className: string): SchoolStudentRecord[] {
  const normalized = normalizeClassLabel(className);
  return loadSchoolStudentRecords(schoolId).filter(
    (student) =>
      normalizeClassLabel(formatStudentClassLabel(student.class, student.section)) ===
      normalized,
  );
}

function getClassRecipients(
  schoolId: string,
  className: string,
  includeStudents: boolean,
): AlertRecipients {
  const students = getStudentsInClass(schoolId, className);
  const emails: string[] = [];
  const phones: string[] = [];

  for (const student of students) {
    const parents = getParentsForStudent(schoolId, student.id);
    emails.push(...parents.emails);
    phones.push(...parents.phones);
    if (includeStudents) {
      const studentEmail = normalizeEmail(student.email);
      if (studentEmail) emails.push(studentEmail);
    }
  }

  return {
    emails: uniqueStrings(emails),
    phones: uniqueStrings(phones),
  };
}

function getParentsForStudentName(schoolId: string, studentName: string): AlertRecipients {
  const normalizedName = studentName.trim().toLowerCase();
  const student = loadSchoolStudentRecords(schoolId).find(
    (item) => `${item.firstName} ${item.lastName}`.trim().toLowerCase() === normalizedName,
  );
  if (!student) return { emails: [], phones: [] };
  return getParentsForStudent(schoolId, student.id);
}

export function resolveAlertRecipients(
  schoolId: string,
  alert: ActiveAlert,
): AlertRecipients {
  switch (alert.type) {
    case "attendance":
    case "performance":
      return alert.studentId
        ? getParentsForStudent(schoolId, alert.studentId)
        : { emails: [], phones: [] };
    case "fee":
      if (alert.studentId) return getParentsForStudent(schoolId, alert.studentId);
      return getParentsForStudentName(schoolId, alert.message.split(" owes")[0] ?? "");
    case "assignment":
      return alert.className
        ? getClassRecipients(schoolId, alert.className, false)
        : { emails: [], phones: [] };
    case "exam":
      return alert.className
        ? getClassRecipients(schoolId, alert.className, true)
        : { emails: [], phones: [] };
    default:
      return { emails: [], phones: [] };
  }
}
