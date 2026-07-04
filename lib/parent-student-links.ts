import { getScopedItem, setScopedItem } from "@/lib/school-context";
import type { SystemUser } from "@/lib/system-users";

export type SchoolStudentRecord = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  class: string;
  section: string;
  rollNumber?: string;
  admissionDate?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  status?: string;
};

function formatStudentClassDepartment(className: string, section: string): string {
  const cls = className.trim();
  const sec = section.trim();
  if (!cls) return sec;
  if (!sec) return cls;
  if (cls.toLowerCase().endsWith(sec.toLowerCase())) return cls;
  return `${cls} ${sec}`;
}

export function loadSchoolStudentRecords(schoolId: string): SchoolStudentRecord[] {
  const stored = getScopedItem(schoolId, "school_students");
  if (!stored) return [];
  try {
    return JSON.parse(stored) as SchoolStudentRecord[];
  } catch {
    return [];
  }
}

export function saveSchoolStudentRecords(
  schoolId: string,
  students: SchoolStudentRecord[],
): void {
  setScopedItem(schoolId, "school_students", JSON.stringify(students));
}

export function formatStudentLinkLabel(student: SchoolStudentRecord): string {
  const name = `${student.firstName} ${student.lastName}`.trim();
  const classLabel = formatStudentClassDepartment(student.class, student.section);
  const idSuffix = student.studentId ? ` · ${student.studentId}` : "";
  return classLabel ? `${name} (${classLabel})${idSuffix}` : `${name}${idSuffix}`;
}

export function formatLinkedChildLabel(student: SchoolStudentRecord): string {
  return formatStudentLinkLabel(student).replace(/ · STU\d+$/i, "");
}

export function buildParentClassDepartment(students: SchoolStudentRecord[]): string {
  return students.map(formatLinkedChildLabel).join(", ");
}

export const PARENT_LINK_PAGE_SIZE = 20;
export const PARENT_LINK_BROWSE_THRESHOLD = 40;

export function getStudentClassFilterOptions(students: SchoolStudentRecord[]): string[] {
  const labels = new Set<string>();
  for (const student of students) {
    const label = formatStudentClassDepartment(student.class, student.section);
    if (label) labels.add(label);
  }
  return Array.from(labels).sort((a, b) => a.localeCompare(b));
}

export function filterStudentsForParentLink(
  students: SchoolStudentRecord[],
  options: { query?: string; classFilter?: string },
): SchoolStudentRecord[] {
  let result = students;

  if (options.classFilter && options.classFilter !== "all") {
    result = result.filter(
      (student) =>
        formatStudentClassDepartment(student.class, student.section) === options.classFilter,
    );
  }

  const query = options.query?.trim().toLowerCase();
  if (query) {
    result = result.filter((student) => {
      const label = formatStudentLinkLabel(student).toLowerCase();
      return (
        label.includes(query) ||
        student.studentId.toLowerCase().includes(query) ||
        student.firstName.toLowerCase().includes(query) ||
        student.lastName.toLowerCase().includes(query)
      );
    });
  }

  return [...result].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
  );
}

export function shouldRequireParentLinkSearch(
  totalStudents: number,
  query: string,
  classFilter: string,
): boolean {
  return (
    totalStudents > PARENT_LINK_BROWSE_THRESHOLD &&
    !query.trim() &&
    classFilter === "all"
  );
}

export function resolveLinkedStudentIds(
  schoolId: string,
  parent: Pick<SystemUser, "email" | "linkedStudentIds">,
): string[] {
  const students = loadSchoolStudentRecords(schoolId);
  const explicitIds =
    parent.linkedStudentIds?.filter((id) => students.some((student) => student.id === id)) ?? [];

  if (explicitIds.length > 0) {
    return explicitIds;
  }

  const parentEmail = parent.email.trim().toLowerCase();
  return students
    .filter((student) => student.guardianEmail?.trim().toLowerCase() === parentEmail)
    .map((student) => student.id);
}

export function getLinkedStudentsForParent(
  schoolId: string,
  parent: Pick<SystemUser, "email" | "linkedStudentIds">,
): SchoolStudentRecord[] {
  const linkedIds = new Set(resolveLinkedStudentIds(schoolId, parent));
  return loadSchoolStudentRecords(schoolId).filter((student) => linkedIds.has(student.id));
}

/** Resolve all student records linked to a logged-in parent account. */
export function getLinkedStudentsForParentEmail(
  schoolId: string,
  parentEmail: string,
): SchoolStudentRecord[] {
  const normalizedEmail = parentEmail.trim().toLowerCase();
  if (!normalizedEmail) return [];

  const storedUsers = getScopedItem(schoolId, "system_users");
  if (storedUsers) {
    try {
      const users = JSON.parse(storedUsers) as SystemUser[];
      const parentUser = users.find(
        (user) => user.role === "Parent" && user.email.toLowerCase() === normalizedEmail,
      );
      if (parentUser) {
        return getLinkedStudentsForParent(schoolId, parentUser);
      }
    } catch {
      // fall through to guardian email match
    }
  }

  return loadSchoolStudentRecords(schoolId).filter(
    (student) => student.guardianEmail?.trim().toLowerCase() === normalizedEmail,
  );
}

export type LinkedStudentIdentity = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  class: string;
  section: string;
};

export function toLinkedStudentIdentity(
  student: SchoolStudentRecord,
  fallbackEmail?: string,
): LinkedStudentIdentity {
  return {
    id: student.id,
    studentId: student.studentId,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.guardianEmail || fallbackEmail,
    class: student.class,
    section: student.section,
  };
}

/** Resolve the student record a parent or student personal view should be scoped to. */
export function resolvePersonalViewStudent(
  schoolId: string,
  session: { email: string; id?: string; name?: string; classDepartment?: string } | null,
  role: string | null,
  preferredStudentId?: string,
): LinkedStudentIdentity | null {
  if (!session) return null;

  if (role === "parent") {
    const linkedChildren = getLinkedStudentsForParentEmail(schoolId, session.email);
    if (linkedChildren.length === 0) return null;

    const selected =
      linkedChildren.find((child) => child.id === preferredStudentId) ?? linkedChildren[0];
    return toLinkedStudentIdentity(selected, session.email);
  }

  if (role === "student") {
    const sessionName = session.name?.trim() ?? "";
    const students = loadSchoolStudentRecords(schoolId);
    const matched = students.find(
      (student) =>
        student.guardianEmail?.toLowerCase() === session.email.toLowerCase() ||
        student.id === session.id ||
        (sessionName &&
          `${student.firstName} ${student.lastName}`.toLowerCase() === sessionName.toLowerCase()) ||
        (sessionName && student.firstName.toLowerCase() === sessionName.toLowerCase()),
    );
    if (matched) {
      return toLinkedStudentIdentity(matched, session.email);
    }

    if (session.classDepartment) {
      const classMatch = session.classDepartment.match(/^(Grade \d+)\s*([A-Z])$/i);
      if (classMatch) {
        const nameParts = sessionName.split(/\s+/).filter(Boolean);
        return {
          id: session.id ?? session.email,
          studentId: session.id ?? session.email,
          firstName: nameParts[0] || sessionName || "Student",
          lastName: nameParts.slice(1).join(" ") || "",
          email: session.email,
          class: classMatch[1],
          section: classMatch[2].toUpperCase(),
        };
      }
    }
  }

  return null;
}

/** Write guardian details on selected students so parent accounts stay in sync. */
export function linkStudentsToParentAccount(
  schoolId: string,
  studentIds: string[],
  parent: { name: string; email: string; phone?: string },
): SchoolStudentRecord[] {
  const students = loadSchoolStudentRecords(schoolId);
  const selectedIds = new Set(studentIds);
  const parentEmail = parent.email.trim().toLowerCase();

  const updatedStudents = students.map((student) =>
    selectedIds.has(student.id)
      ? {
          ...student,
          guardianName: parent.name.trim(),
          guardianEmail: parentEmail,
          guardianPhone: parent.phone?.trim() || student.guardianPhone || "",
        }
      : student,
  );

  saveSchoolStudentRecords(schoolId, updatedStudents);
  return updatedStudents;
}

export function unlinkStudentsFromParentEmail(
  schoolId: string,
  studentIds: string[],
  parentEmail: string,
): SchoolStudentRecord[] {
  const students = loadSchoolStudentRecords(schoolId);
  const selectedIds = new Set(studentIds);
  const normalizedEmail = parentEmail.trim().toLowerCase();

  const updatedStudents = students.map((student) => {
    if (!selectedIds.has(student.id)) return student;
    if (student.guardianEmail?.trim().toLowerCase() !== normalizedEmail) return student;
    return {
      ...student,
      guardianName: "",
      guardianEmail: "",
      guardianPhone: "",
    };
  });

  saveSchoolStudentRecords(schoolId, updatedStudents);
  return updatedStudents;
}
