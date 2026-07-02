import { getScopedItem, setScopedItem } from "@/lib/school-context";

export type TeacherCheckInStatus = "pending" | "approved" | "rejected";

export type TeacherCheckInRecord = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  department: string;
  date: string;
  checkInAt: string;
  status: TeacherCheckInStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
};

export type UserSession = {
  id: string;
  name: string;
  email: string;
  role: string;
  classDepartment?: string;
  schoolId: string;
  loginTime: string;
};

export type SystemUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  classDepartment?: string;
  status: string;
};

const STORAGE_KEY = "teacher_check_ins";

export function getTodayDateString(date = new Date()): string {
  return date.toISOString().split("T")[0];
}

export function loadTeacherCheckIns(schoolId: string): TeacherCheckInRecord[] {
  const stored = getScopedItem(schoolId, STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as TeacherCheckInRecord[];
  } catch {
    return [];
  }
}

export function saveTeacherCheckIns(
  schoolId: string,
  records: TeacherCheckInRecord[],
): void {
  setScopedItem(schoolId, STORAGE_KEY, JSON.stringify(records));
}

export function getTeacherCheckInForDate(
  records: TeacherCheckInRecord[],
  teacherId: string,
  date: string,
): TeacherCheckInRecord | undefined {
  return records.find((r) => r.teacherId === teacherId && r.date === date);
}

export function getTodayCheckIns(
  records: TeacherCheckInRecord[],
  date = getTodayDateString(),
): TeacherCheckInRecord[] {
  return records.filter((r) => r.date === date);
}

export function getPendingCheckIns(
  records: TeacherCheckInRecord[],
  date = getTodayDateString(),
): TeacherCheckInRecord[] {
  return getTodayCheckIns(records, date).filter((r) => r.status === "pending");
}

export function loadSystemUsers(schoolId: string): SystemUser[] {
  const stored = getScopedItem(schoolId, "system_users");
  if (!stored) return [];
  try {
    return JSON.parse(stored) as SystemUser[];
  } catch {
    return [];
  }
}

export function getActiveTeachers(schoolId: string): SystemUser[] {
  return loadSystemUsers(schoolId).filter(
    (u) => u.role.toLowerCase() === "teacher" && u.status === "Active",
  );
}

export function getUserSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("user_session");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as UserSession;
  } catch {
    return null;
  }
}

export function establishUserSession(
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    classDepartment?: string;
  },
  schoolId: string,
): UserSession {
  const userSession: UserSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase(),
    classDepartment: user.classDepartment,
    schoolId,
    loginTime: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("user_session", JSON.stringify(userSession));
    localStorage.setItem("user_role", user.role.toLowerCase());
    window.dispatchEvent(new Event("user-session-changed"));
  }

  return userSession;
}

export function clearUserSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("user_session");
  localStorage.removeItem("user_role");
  window.dispatchEvent(new Event("user-session-changed"));
}

export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  clearUserSession();
  window.location.href = "/login";
}

export function createTeacherCheckIn(input: {
  schoolId: string;
  teacher: Pick<UserSession, "id" | "name" | "email" | "classDepartment">;
}): { success: true; record: TeacherCheckInRecord } | { success: false; error: string } {
  const today = getTodayDateString();
  const records = loadTeacherCheckIns(input.schoolId);
  const existing = getTeacherCheckInForDate(records, input.teacher.id, today);

  if (existing && (existing.status === "pending" || existing.status === "approved")) {
    return {
      success: false,
      error:
        existing.status === "approved"
          ? "Your check-in for today has already been approved."
          : "You have already checked in today. Awaiting admin approval.",
    };
  }

  const record: TeacherCheckInRecord = {
    id: existing?.id ?? `tci_${Date.now()}`,
    teacherId: input.teacher.id,
    teacherName: input.teacher.name,
    teacherEmail: input.teacher.email,
    department: input.teacher.classDepartment ?? "General",
    date: today,
    checkInAt: new Date().toISOString(),
    status: "pending",
    reviewedBy: undefined,
    reviewedByName: undefined,
    reviewedAt: undefined,
    reviewNote: undefined,
  };

  const updated = existing
    ? records.map((r) => (r.id === existing.id ? record : r))
    : [...records, record];

  saveTeacherCheckIns(input.schoolId, updated);
  return { success: true, record };
}

export function reviewTeacherCheckIn(input: {
  schoolId: string;
  recordId: string;
  status: "approved" | "rejected";
  reviewer: Pick<UserSession, "id" | "name">;
  reviewNote?: string;
}): TeacherCheckInRecord | null {
  const records = loadTeacherCheckIns(input.schoolId);
  const index = records.findIndex((r) => r.id === input.recordId);
  if (index === -1) return null;

  const updated: TeacherCheckInRecord = {
    ...records[index],
    status: input.status,
    reviewedBy: input.reviewer.id,
    reviewedByName: input.reviewer.name,
    reviewedAt: new Date().toISOString(),
    reviewNote: input.reviewNote?.trim() || undefined,
  };

  records[index] = updated;
  saveTeacherCheckIns(input.schoolId, records);
  return updated;
}

export const checkInStatusConfig: Record<
  TeacherCheckInStatus,
  { label: string; badge: string; description: string }
> = {
  pending: {
    label: "Pending Approval",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Your check-in is waiting for admin review.",
  },
  approved: {
    label: "Approved",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Your attendance for today has been approved.",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-100 text-red-800 border-red-200",
    description: "Your check-in was rejected. You may submit again.",
  },
};
