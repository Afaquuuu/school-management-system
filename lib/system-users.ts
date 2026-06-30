import { getScopedItem, setScopedItem } from "@/lib/school-context";

export type SystemUserRole = "Student" | "Teacher" | "Parent" | "Admin";
export type SystemUserStatus = "Active" | "Inactive" | "On Leave" | "Suspended";

export type SystemUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: SystemUserRole;
  classDepartment: string;
  status: SystemUserStatus;
  password: string;
  createdAt: string;
  lastLogin?: string | null;
  credentialsIssuedAt?: string;
};

const STORAGE_KEY = "system_users";

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
  if (staffRole === "admin") return "Admin";
  return "Teacher";
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
    default:
      return "Department";
  }
}

export const credentialRoles: SystemUserRole[] = ["Teacher", "Student", "Parent"];

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
