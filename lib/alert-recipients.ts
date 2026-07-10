import { formatStudentClassLabel, normalizeClassLabel } from "@/lib/class-labels";
import {
  loadSchoolStudentRecords,
  type SchoolStudentRecord,
} from "@/lib/parent-student-links";
import type { ActiveAlert } from "@/lib/school-alerts";
import { loadSystemUsers } from "@/lib/system-users";
import type { WhatsAppRecipientUnit } from "@/lib/whatsapp-types";

export type AlertRecipients = {
  emails: string[];
  phones: string[];
  phoneUnits: WhatsAppRecipientUnit[];
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

function uniquePhoneList(phones: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const phone of phones) {
    const cleaned = normalizePhone(phone);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    unique.push(cleaned);
  }

  return unique;
}

function buildPhoneUnit(label: string, phones: string[]): WhatsAppRecipientUnit | null {
  const uniquePhones = uniquePhoneList(phones);
  if (uniquePhones.length === 0) return null;

  return {
    to: uniquePhones[0],
    alternates: uniquePhones.slice(1),
    label,
  };
}

function getParentsForStudent(schoolId: string, studentId: string): AlertRecipients {
  const students = loadSchoolStudentRecords(schoolId);
  const student = students.find((item) => item.id === studentId);
  if (!student) return { emails: [], phones: [], phoneUnits: [] };

  const parentUsers = loadSystemUsers(schoolId).filter(
    (user) =>
      user.role === "Parent" &&
      user.status === "Active" &&
      user.linkedStudentIds?.includes(studentId),
  );

  const phones = uniquePhoneList([
    normalizePhone(student.guardianPhone),
    normalizePhone(student.phone),
    ...parentUsers.map((user) => normalizePhone(user.phone)),
  ]);

  const label = `${student.firstName} ${student.lastName}`.trim() || student.studentId;
  const phoneUnit = buildPhoneUnit(label, phones);

  return {
    emails: uniqueStrings([
      normalizeEmail(student.guardianEmail),
      ...parentUsers.map((user) => normalizeEmail(user.email)),
    ]),
    phones,
    phoneUnits: phoneUnit ? [phoneUnit] : [],
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
  const phoneUnits: WhatsAppRecipientUnit[] = [];
  const seenStudentIds = new Set<string>();

  for (const student of students) {
    const parents = getParentsForStudent(schoolId, student.id);
    emails.push(...parents.emails);
    phones.push(...parents.phones);
    phoneUnits.push(...parents.phoneUnits);

    if (includeStudents) {
      const studentEmail = normalizeEmail(student.email);
      if (studentEmail) emails.push(studentEmail);

      if (!seenStudentIds.has(student.id)) {
        const studentUnit = buildPhoneUnit(
          `${student.firstName} ${student.lastName}`.trim() || student.studentId,
          uniquePhoneList([student.phone, student.guardianPhone]),
        );
        if (studentUnit) {
          phoneUnits.push(studentUnit);
        }
        seenStudentIds.add(student.id);
      }
    }
  }

  return {
    emails: uniqueStrings(emails),
    phones: uniqueStrings(phones),
    phoneUnits,
  };
}

function getParentsForStudentName(schoolId: string, studentName: string): AlertRecipients {
  const normalizedName = studentName.trim().toLowerCase();
  const student = loadSchoolStudentRecords(schoolId).find(
    (item) => `${item.firstName} ${item.lastName}`.trim().toLowerCase() === normalizedName,
  );
  if (!student) return { emails: [], phones: [], phoneUnits: [] };
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
        : { emails: [], phones: [], phoneUnits: [] };
    case "fee":
      if (alert.studentId) return getParentsForStudent(schoolId, alert.studentId);
      return getParentsForStudentName(schoolId, alert.message.split(" owes")[0] ?? "");
    case "assignment":
      return alert.className
        ? getClassRecipients(schoolId, alert.className, false)
        : { emails: [], phones: [], phoneUnits: [] };
    case "exam":
      return alert.className
        ? getClassRecipients(schoolId, alert.className, true)
        : { emails: [], phones: [], phoneUnits: [] };
    default:
      return { emails: [], phones: [], phoneUnits: [] };
  }
}
