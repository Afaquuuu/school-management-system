import { buildSchoolClassId } from "@/lib/school-classes-sync";
import {
  loadSchoolStudentRecords,
  type SchoolStudentRecord,
} from "@/lib/parent-student-links";
import type { AnnouncementAudience } from "@/lib/school-announcements";
import { loadSystemUsers } from "@/lib/system-users";
import type { FinanceInvoice } from "@/lib/finance-invoices";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-phone";

function normalizeEmail(value: string | undefined | null): string | null {
  const email = value?.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

function normalizePhone(value: string | undefined | null): string | null {
  const phone = value?.replace(/\s+/g, "").trim();
  if (!phone || phone.length < 8) return null;
  return phone;
}

function uniqueEmails(emails: Array<string | null | undefined>): string[] {
  return [...new Set(emails.filter(Boolean) as string[])];
}

function uniqueNormalizedPhones(phones: string[], defaultCountryCode = "233"): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const phone of phones) {
    const normalized = normalizeWhatsAppPhone(phone, defaultCountryCode);
    const key = normalized ?? phone.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(phone);
  }

  return unique;
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

function getStudentPhones(students: SchoolStudentRecord[]): string[] {
  return uniqueEmails(
    students.flatMap((student) => [
      normalizePhone(student.phone),
      normalizePhone(student.guardianPhone),
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

function getParentPhones(schoolId: string, students: SchoolStudentRecord[]): string[] {
  const studentIds = new Set(students.map((student) => student.id));
  const users = loadSystemUsers(schoolId);

  const linkedParentPhones = users
    .filter(
      (user) =>
        user.role === "Parent" &&
        user.status === "Active" &&
        user.linkedStudentIds?.some((id) => studentIds.has(id)),
    )
    .map((user) => normalizePhone(user.phone));

  const guardianPhones = students.map((student) =>
    normalizePhone(student.guardianPhone),
  );

  return uniqueEmails([...linkedParentPhones, ...guardianPhones]);
}

function getTeacherEmails(schoolId: string): string[] {
  return uniqueEmails(
    loadSystemUsers(schoolId)
      .filter((user) => user.role === "Teacher" && user.status === "Active")
      .map((user) => normalizeEmail(user.email)),
  );
}

function getTeacherPhones(schoolId: string): string[] {
  return uniqueEmails(
    loadSystemUsers(schoolId)
      .filter((user) => user.role === "Teacher" && user.status === "Active")
      .map((user) => normalizePhone(user.phone)),
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

function getStaffPhones(schoolId: string): string[] {
  return uniqueEmails(
    loadSystemUsers(schoolId)
      .filter(
        (user) =>
          user.status === "Active" &&
          ["Admin", "Teacher", "Accountant", "Librarian"].includes(user.role),
      )
      .map((user) => normalizePhone(user.phone)),
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

export function resolveAnnouncementPhoneRecipients(input: {
  schoolId: string;
  targetAudience: AnnouncementAudience[];
  classId?: string;
  defaultCountryCode?: string;
}): string[] {
  const { schoolId, targetAudience, classId, defaultCountryCode = "233" } = input;
  const students = getScopedStudents(schoolId, classId);
  const phones: string[] = [];

  if (targetAudience.includes("Students")) {
    phones.push(...getStudentPhones(students));
  }
  if (targetAudience.includes("Parents")) {
    phones.push(...getParentPhones(schoolId, students));
  }
  if (targetAudience.includes("Teachers")) {
    phones.push(...getTeacherPhones(schoolId));
  }
  if (targetAudience.includes("All Staff")) {
    phones.push(...getStaffPhones(schoolId));
  }

  return uniqueNormalizedPhones(phones, defaultCountryCode);
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
