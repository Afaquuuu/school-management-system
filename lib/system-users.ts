import { getScopedItem, setScopedItem, persistScopedItem } from "@/lib/school-context";
import { formatLinkedChildLabel } from "@/lib/parent-student-links";

export type SystemUserRole =
  | "Student"
  | "Teacher"
  | "Parent"
  | "Admin"
  | "Accountant"
  | "Librarian";
export type SystemUserStatus = "Active" | "Inactive" | "On Leave" | "Suspended";

export type SystemUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: SystemUserRole;
  classDepartment: string;
  linkedStudentIds?: string[];
  status: SystemUserStatus;
  password: string;
  createdAt: string;
  lastLogin?: string | null;
  credentialsIssuedAt?: string;
};

const STORAGE_KEY = "system_users";

const LEGACY_DUMMY_ADMIN_EMAILS = ["gulsharaf@gmail.com"];
export const PRIMARY_ADMIN_EMAIL = "harrycosmetics02@gmail.com";

function isLegacyDummyAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return LEGACY_DUMMY_ADMIN_EMAILS.some((legacy) => legacy.toLowerCase() === normalized);
}

export function migrateDummyAdminEmail(schoolId: string): boolean {
  if (typeof window === "undefined") return false;

  const replacement = PRIMARY_ADMIN_EMAIL.toLowerCase();
  const users = loadSystemUsers(schoolId);
  let changed = false;

  const updatedUsers = users.map((user) => {
    if (user.role === "Admin" && isLegacyDummyAdminEmail(user.email)) {
      changed = true;
      return { ...user, email: replacement };
    }
    return user;
  });

  if (changed) {
    saveSystemUsers(schoolId, updatedUsers);
  }

  const sessionRaw = localStorage.getItem("user_session");
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw) as { schoolId?: string; email?: string };
      if (
        session.schoolId === schoolId &&
        session.email &&
        isLegacyDummyAdminEmail(session.email)
      ) {
        session.email = replacement;
        localStorage.setItem("user_session", JSON.stringify(session));
        changed = true;
      }
    } catch {
      // ignore invalid session payload
    }
  }

  const pendingRaw = localStorage.getItem("pending_admin_2fa");
  if (pendingRaw) {
    try {
      const pending = JSON.parse(pendingRaw) as {
        schoolId?: string;
        user?: { email?: string };
      };
      if (
        pending.schoolId === schoolId &&
        pending.user?.email &&
        isLegacyDummyAdminEmail(pending.user.email)
      ) {
        pending.user.email = replacement;
        localStorage.setItem("pending_admin_2fa", JSON.stringify(pending));
        changed = true;
      }
    } catch {
      // ignore invalid pending 2FA payload
    }
  }

  return changed;
}

export function loadSystemUsers(schoolId: string): SystemUser[] {
  const stored = getScopedItem(schoolId, STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as SystemUser[];
  } catch {
    return [];
  }
}

export function saveSystemUsers(schoolId: string, users: SystemUser[]): void {
  setScopedItem(schoolId, STORAGE_KEY, JSON.stringify(users));
}

export async function saveSystemUsersPersisted(
  schoolId: string,
  users: SystemUser[],
): Promise<void> {
  await persistScopedItem(schoolId, STORAGE_KEY, JSON.stringify(users));
}

export function hasSystemUsers(schoolId: string): boolean {
  return loadSystemUsers(schoolId).length > 0;
}

export function createInitialAdminUser(
  schoolId: string,
  input: { name: string; email: string; password: string; phone?: string },
): SystemUser {
  const admin: SystemUser = {
    id: `user_admin_${Date.now()}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || "",
    role: "Admin",
    classDepartment: "Administration",
    status: "Active",
    password: input.password,
    createdAt: new Date().toISOString().split("T")[0],
    credentialsIssuedAt: new Date().toISOString(),
    lastLogin: null,
  };

  saveSystemUsers(schoolId, [admin]);
  return admin;
}

type StaffRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  status?: string;
};

function mapStaffRoleToSystemRole(staffRole: string): SystemUserRole {
  switch (staffRole) {
    case "admin":
      return "Admin";
    case "accountant":
      return "Accountant";
    case "librarian":
      return "Librarian";
    case "teacher":
    case "support":
    default:
      return "Teacher";
  }
}

function mapStaffStatusToSystemStatus(staffStatus?: string): SystemUserStatus {
  switch (staffStatus) {
    case "active":
      return "Active";
    case "on_leave":
      return "On Leave";
    case "inactive":
      return "Inactive";
    case "terminated":
      return "Suspended";
    default:
      return "Active";
  }
}

/** Keep User Management in sync with Staff records (add/update/remove login entries). */
export function syncStaffToSystemUsers(schoolId: string): SystemUser[] {
  const storedStaff = getScopedItem(schoolId, "school_staff");
  const existingUsers = loadSystemUsers(schoolId);

  if (!storedStaff) return existingUsers;

  let staffMembers: StaffRecord[];
  try {
    staffMembers = JSON.parse(storedStaff) as StaffRecord[];
  } catch {
    return existingUsers;
  }

  const staffEmails = new Set(
    staffMembers
      .map((member) => member.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email && isValidLoginEmail(email))),
  );

  const updatedUsers = existingUsers.filter((user) => {
    if (!user.id.startsWith("user_staff_")) return true;
    return staffEmails.has(user.email.toLowerCase());
  });

  for (const member of staffMembers) {
    const email = member.email?.trim().toLowerCase();
    if (!email || !isValidLoginEmail(email)) continue;

    const name = `${member.firstName} ${member.lastName}`.trim();
    const existingIndex = updatedUsers.findIndex(
      (user) => user.email.toLowerCase() === email,
    );

    const syncedFields = {
      name,
      email,
      phone: member.phone || "",
      role: mapStaffRoleToSystemRole(member.role),
      classDepartment: member.department || "",
      status: mapStaffStatusToSystemStatus(member.status),
    };

    if (existingIndex >= 0) {
      updatedUsers[existingIndex] = {
        ...updatedUsers[existingIndex],
        ...syncedFields,
      };
    } else {
      updatedUsers.push({
        id: `user_staff_${member.id}`,
        ...syncedFields,
        password: generateLoginPassword(),
        createdAt: new Date().toISOString().split("T")[0],
        credentialsIssuedAt: new Date().toISOString(),
      });
    }
  }

  saveSystemUsers(schoolId, updatedUsers);
  return updatedUsers;
}

export async function syncStaffToSystemUsersPersisted(schoolId: string): Promise<SystemUser[]> {
  const users = syncStaffToSystemUsers(schoolId);
  await saveSystemUsersPersisted(schoolId, users);
  return users;
}

type StudentRecord = {
  id: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  class: string;
  section: string;
  status?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
};

function mapStudentStatusToSystemStatus(status?: string): SystemUserStatus {
  switch (status) {
    case "active":
      return "Active";
    case "inactive":
    case "graduated":
    case "transferred":
      return "Inactive";
    default:
      return "Active";
  }
}

function formatStudentClassDepartment(className: string, section: string): string {
  const cls = className.trim();
  const sec = section.trim();
  if (!cls) return sec;
  if (!sec) return cls;
  if (cls.toLowerCase().endsWith(sec.toLowerCase())) return cls;
  return `${cls} ${sec}`;
}

/** Keep User Management in sync with Student records (student + parent login entries). */
export function syncStudentsToSystemUsers(schoolId: string): {
  users: SystemUser[];
  newlyIssued: SystemUser[];
} {
  const storedStudents = getScopedItem(schoolId, "school_students");
  const existingUsers = loadSystemUsers(schoolId);
  const newlyIssued: SystemUser[] = [];

  if (!storedStudents) {
    return { users: existingUsers, newlyIssued };
  }

  let studentRecords: StudentRecord[];
  try {
    studentRecords = JSON.parse(storedStudents) as StudentRecord[];
  } catch {
    return { users: existingUsers, newlyIssued };
  }

  const guardianEmails = new Set(
    studentRecords
      .map((student) => student.guardianEmail?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email && isValidLoginEmail(email))),
  );

  const existingStudentUsers = new Map<string, SystemUser>();
  for (const user of existingUsers) {
    if (user.id.startsWith("user_student_")) {
      existingStudentUsers.set(user.id.replace("user_student_", ""), user);
    }
  }

  const updatedUsers = existingUsers.filter((user) => {
    if (user.id.startsWith("user_student_")) {
      return false;
    }
    if (user.id.startsWith("user_parent_")) {
      return guardianEmails.has(user.email.toLowerCase());
    }
    return true;
  });

  for (const student of studentRecords) {
    const studentEmail = student.email?.trim().toLowerCase();
    if (studentEmail && isValidLoginEmail(studentEmail)) {
      const studentName = `${student.firstName} ${student.lastName}`.trim();
      const studentUserId = `user_student_${student.id}`;
      const existing = existingStudentUsers.get(student.id);
      const syncedFields = {
        name: studentName,
        email: studentEmail,
        phone: student.phone || "",
        role: "Student" as SystemUserRole,
        classDepartment: formatStudentClassDepartment(student.class, student.section),
        status: mapStudentStatusToSystemStatus(student.status),
      };

      if (existing) {
        updatedUsers.push({
          ...existing,
          ...syncedFields,
          id: studentUserId,
        });
      } else {
        const created: SystemUser = {
          id: studentUserId,
          ...syncedFields,
          password: generateLoginPassword(),
          createdAt: new Date().toISOString().split("T")[0],
          credentialsIssuedAt: new Date().toISOString(),
        };
        updatedUsers.push(created);
        newlyIssued.push(created);
      }
    }
  }

  const canonicalStudentUserIds = new Set(
    studentRecords
      .filter((student) => student.email && isValidLoginEmail(student.email))
      .map((student) => `user_student_${student.id}`),
  );
  const currentStudentEmails = new Set(
    studentRecords
      .map((student) => student.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );

  const cleanedUsers = updatedUsers.filter((user) => {
    if (user.role !== "Student") return true;
    if (canonicalStudentUserIds.has(user.id)) return true;

    const email = user.email.toLowerCase();
    const owningStudent = studentRecords.find(
      (student) => student.email?.trim().toLowerCase() === email,
    );
    if (owningStudent && user.id !== `user_student_${owningStudent.id}`) {
      return false;
    }
    if (user.id.startsWith("user_student_") && !currentStudentEmails.has(email)) {
      return false;
    }
    return true;
  });

  updatedUsers.length = 0;
  updatedUsers.push(...cleanedUsers);

  const parentsByEmail = new Map<
    string,
    { students: StudentRecord[]; guardianName: string; guardianPhone: string }
  >();

  for (const student of studentRecords) {
    const guardianEmail = student.guardianEmail?.trim().toLowerCase();
    if (!guardianEmail || !isValidLoginEmail(guardianEmail)) continue;

    const group = parentsByEmail.get(guardianEmail) ?? {
      students: [],
      guardianName: student.guardianName?.trim() || "Parent",
      guardianPhone: student.guardianPhone || "",
    };
    group.students.push(student);
    if (student.guardianName?.trim()) {
      group.guardianName = student.guardianName.trim();
    }
    if (student.guardianPhone?.trim()) {
      group.guardianPhone = student.guardianPhone.trim();
    }
    parentsByEmail.set(guardianEmail, group);
  }

  for (const [guardianEmail, group] of parentsByEmail) {
    const linkedStudentIds = group.students.map((student) => student.id);
    const linkedChildren = group.students.map((student) =>
      formatLinkedChildLabel({
        id: student.id,
        studentId: student.studentId ?? student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        class: student.class,
        section: student.section,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        guardianEmail: student.guardianEmail,
        status: student.status,
      }),
    );
    const existingParentIndex = updatedUsers.findIndex(
      (user) => user.role === "Parent" && user.email.toLowerCase() === guardianEmail,
    );
    const parentFields = {
      name: group.guardianName,
      email: guardianEmail,
      phone: group.guardianPhone,
      role: "Parent" as SystemUserRole,
      classDepartment: linkedChildren.join(", "),
      linkedStudentIds,
      status: mapStudentStatusToSystemStatus(group.students[0]?.status),
    };

    if (existingParentIndex >= 0) {
      updatedUsers[existingParentIndex] = {
        ...updatedUsers[existingParentIndex],
        ...parentFields,
      };
    } else {
      const created: SystemUser = {
        id: `user_parent_${group.students[0]?.id ?? Date.now()}`,
        ...parentFields,
        password: generateLoginPassword(),
        createdAt: new Date().toISOString().split("T")[0],
        credentialsIssuedAt: new Date().toISOString(),
      };
      updatedUsers.push(created);
      newlyIssued.push(created);
    }
  }

  saveSystemUsers(schoolId, updatedUsers);
  return { users: updatedUsers, newlyIssued };
}

export async function syncStudentsToSystemUsersPersisted(schoolId: string): Promise<{
  users: SystemUser[];
  newlyIssued: SystemUser[];
}> {
  const result = syncStudentsToSystemUsers(schoolId);
  await saveSystemUsersPersisted(schoolId, result.users);
  return result;
}

export function isValidLoginEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function generateLoginPassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function getClassDepartmentLabel(role: SystemUserRole): string {
  switch (role) {
    case "Student":
      return "Class (e.g. Grade 7B)";
    case "Teacher":
      return "Department (e.g. Mathematics)";
    case "Parent":
      return "Linked Student / Child";
    case "Accountant":
      return "Department (e.g. Accounts Office)";
    case "Librarian":
      return "Department (e.g. Library)";
    default:
      return "Department";
  }
}

export const credentialRoles: SystemUserRole[] = [
  "Teacher",
  "Student",
  "Parent",
  "Accountant",
  "Librarian",
];

export const userRoleFilterOptions = [
  { value: "all", label: "All Roles" },
  { value: "teacher", label: "Teachers" },
  { value: "student", label: "Students" },
  { value: "parent", label: "Parents" },
  { value: "accountant", label: "Accountants" },
  { value: "librarian", label: "Librarians" },
  { value: "admin", label: "Admins" },
] as const;

export const assignableSystemRoles: SystemUserRole[] = [
  "Teacher",
  "Student",
  "Parent",
  "Admin",
  "Accountant",
  "Librarian",
];

export function formatCredentialsText(user: SystemUser, schoolName?: string): string {
  return [
    schoolName ? `${schoolName} — Login Credentials` : "School Login Credentials",
    "",
    `Name: ${user.name}`,
    `Role: ${user.role}`,
    `Login Email: ${user.email}`,
    `Password: ${user.password}`,
    "",
    "Use these details on the school login page.",
  ].join("\n");
}
