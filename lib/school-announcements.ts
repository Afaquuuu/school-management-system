import { formatStudentClassLabel } from "@/lib/class-labels";
import { buildSchoolClassId } from "@/lib/school-classes-sync";
import { getLinkedStudentsForParentEmail } from "@/lib/parent-student-links";
import { getSchoolClasses, getScopedItem, persistScopedItem, setScopedItem } from "@/lib/school-context";
import { isClientDatabaseMode } from "@/lib/storage-mode";
import { getStudentClassContext } from "@/lib/school-messages";
import {
  getClassIdsForTeacher,
  getClassesWhereTeacherIsInCharge,
  loadClassAssignments,
} from "@/lib/timetable";
import type { UserSession } from "@/lib/teacher-check-in";

export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";
export type AnnouncementScope = "school" | "class";
export type AnnouncementAudience = "Students" | "Teachers" | "Parents" | "All Staff";

export const SCHOOL_WIDE_AUDIENCE_OPTIONS: AnnouncementAudience[] = [
  "Students",
  "Teachers",
  "Parents",
  "All Staff",
];

export const CLASS_AUDIENCE_OPTIONS: AnnouncementAudience[] = ["Students", "Parents"];

export type SchoolAnnouncement = {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  scope: AnnouncementScope;
  classId?: string;
  classLabel?: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  publishedAt: string;
  targetAudience: AnnouncementAudience[];
  views: number;
  isPinned: boolean;
};

export type TeacherClassOption = {
  id: string;
  label: string;
};

const STORAGE_KEY = "school_announcements";

const DEMO_ANNOUNCEMENT_IDS = new Set([
  "ann_seed_001",
  "ann_seed_002",
  "ann_seed_003",
  "ann_seed_004",
  "1",
  "2",
  "3",
  "4",
]);

const DEMO_ANNOUNCEMENT_TITLES = new Set([
  "Mid-Term Examination Schedule Released",
  "Parent-Teacher Meeting - May 15th",
  "Sports Day Registration Open",
  "Library Hours Extended",
]);

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function isDemoAnnouncement(announcement: SchoolAnnouncement): boolean {
  if (DEMO_ANNOUNCEMENT_IDS.has(announcement.id)) return true;
  if (announcement.authorId === "seed_admin") return true;
  return DEMO_ANNOUNCEMENT_TITLES.has(announcement.title);
}

export function removeDemoAnnouncements(
  announcements: SchoolAnnouncement[],
): SchoolAnnouncement[] {
  return announcements.filter((announcement) => !isDemoAnnouncement(announcement));
}

export function loadSchoolAnnouncements(schoolId: string): SchoolAnnouncement[] {
  const stored = parseJson<SchoolAnnouncement[]>(getScopedItem(schoolId, STORAGE_KEY), []);
  const cleaned = removeDemoAnnouncements(stored);
  if (cleaned.length !== stored.length) {
    saveSchoolAnnouncements(schoolId, cleaned);
  }
  return cleaned;
}

export function saveSchoolAnnouncements(
  schoolId: string,
  announcements: SchoolAnnouncement[],
): void {
  const payload = JSON.stringify(announcements);
  setScopedItem(schoolId, STORAGE_KEY, payload);
  if (isClientDatabaseMode()) {
    void persistScopedItem(schoolId, STORAGE_KEY, payload);
  }
}

export async function persistSchoolAnnouncements(
  schoolId: string,
  announcements: SchoolAnnouncement[],
): Promise<void> {
  const payload = JSON.stringify(announcements);
  if (isClientDatabaseMode()) {
    await persistScopedItem(schoolId, STORAGE_KEY, payload);
    return;
  }
  setScopedItem(schoolId, STORAGE_KEY, payload);
}

function announcementViewDedupeKey(
  schoolId: string,
  announcementId: string,
  viewerEmail: string,
): string {
  return `ann_view_${schoolId}_${announcementId}_${viewerEmail.trim().toLowerCase()}`;
}

export function hasRecordedAnnouncementView(
  schoolId: string,
  announcementId: string,
  viewerEmail: string,
): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(announcementViewDedupeKey(schoolId, announcementId, viewerEmail)));
}

export async function recordAnnouncementView(
  schoolId: string,
  announcementId: string,
  viewerEmail: string,
): Promise<number | null> {
  const announcements = loadSchoolAnnouncements(schoolId);
  const target = announcements.find((item) => item.id === announcementId);
  if (!target) return null;

  const dedupeKey = announcementViewDedupeKey(schoolId, announcementId, viewerEmail);
  if (typeof window !== "undefined" && localStorage.getItem(dedupeKey)) {
    return target.views ?? 0;
  }

  const nextViews = (target.views ?? 0) + 1;
  const updatedAnnouncements = announcements.map((item) =>
    item.id === announcementId ? { ...item, views: nextViews } : item,
  );

  await persistSchoolAnnouncements(schoolId, updatedAnnouncements);

  if (typeof window !== "undefined") {
    localStorage.setItem(dedupeKey, new Date().toISOString());
  }

  return nextViews;
}

export function ensureSchoolAnnouncements(schoolId: string): SchoolAnnouncement[] {
  return loadSchoolAnnouncements(schoolId);
}

export function getTeacherAnnouncementClasses(
  schoolId: string,
  teacherName: string,
): TeacherClassOption[] {
  if (!teacherName.trim()) return [];

  const assignments = loadClassAssignments(schoolId);
  const classes = getSchoolClasses(schoolId);
  const inChargeClasses = getClassesWhereTeacherIsInCharge(
    classes,
    assignments,
    teacherName,
  );

  return inChargeClasses
    .map((cls) => ({
      id: cls.id,
      label: cls.name,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function getParentClassIds(schoolId: string, parentEmail: string): string[] {
  const linkedStudents = getLinkedStudentsForParentEmail(schoolId, parentEmail);
  return [
    ...new Set(
      linkedStudents.map((student) => buildSchoolClassId(student.class, student.section)),
    ),
  ];
}

function schoolAnnouncementVisibleToRole(
  announcement: SchoolAnnouncement,
  role: string,
): boolean {
  const normalized = role.toLowerCase();
  if (normalized === "admin") return true;

  const audiences = announcement.targetAudience;
  const includesStaff = audiences.includes("All Staff");
  const includesTeachers = audiences.includes("Teachers");

  if (normalized === "teacher") {
    return includesTeachers || includesStaff;
  }

  if (normalized === "accountant") {
    return includesStaff;
  }

  if (normalized === "librarian") {
    return includesTeachers || includesStaff;
  }

  if (normalized === "student") {
    return audiences.includes("Students");
  }

  if (normalized === "parent") {
    return audiences.includes("Parents");
  }

  return false;
}

function classAnnouncementVisibleToSession(
  schoolId: string,
  announcement: SchoolAnnouncement,
  session: UserSession,
  teacherClassIds: string[],
  parentClassIds: string[],
  studentClassId: string | null,
): boolean {
  const classId = announcement.classId;
  if (!classId) return false;

  const role = session.role.toLowerCase();

  if (role === "admin") return true;

  if (role === "teacher") {
    return teacherClassIds.includes(classId);
  }

  if (role === "student") {
    return (
      studentClassId === classId && announcement.targetAudience.includes("Students")
    );
  }

  if (role === "parent") {
    return (
      parentClassIds.includes(classId) && announcement.targetAudience.includes("Parents")
    );
  }

  return false;
}

export function getVisibleAnnouncements(
  schoolId: string,
  session: UserSession,
): SchoolAnnouncement[] {
  const announcements = ensureSchoolAnnouncements(schoolId);
  const assignments = loadClassAssignments(schoolId);
  const teacherClassIds = getClassIdsForTeacher(assignments, session.name);
  const parentClassIds = getParentClassIds(schoolId, session.email);
  const studentContext = getStudentClassContext(schoolId, session);
  const studentClassId = studentContext?.classId ?? null;

  return announcements.filter((announcement) => {
    if (announcement.scope === "school") {
      return schoolAnnouncementVisibleToRole(announcement, session.role);
    }

    return classAnnouncementVisibleToSession(
      schoolId,
      announcement,
      session,
      teacherClassIds,
      parentClassIds,
      studentClassId,
    );
  });
}

export function canPublishSchoolAnnouncements(session: UserSession | null): boolean {
  return session?.role.toLowerCase() === "admin";
}

export function canPublishClassAnnouncements(
  schoolId: string,
  session: UserSession | null,
): boolean {
  if (!session || session.role.toLowerCase() !== "teacher") return false;
  return getTeacherAnnouncementClasses(schoolId, session.name).length > 0;
}

export function canPublishAnyAnnouncement(
  schoolId: string,
  session: UserSession | null,
): boolean {
  return (
    canPublishSchoolAnnouncements(session) ||
    canPublishClassAnnouncements(schoolId, session)
  );
}

export function canManageAnnouncement(
  session: UserSession,
  announcement: SchoolAnnouncement,
): boolean {
  const role = session.role.toLowerCase();

  if (role === "admin") return true;

  if (role === "teacher") {
    return (
      announcement.scope === "class" &&
      announcement.authorEmail.toLowerCase() === session.email.toLowerCase()
    );
  }

  return false;
}

export function teacherCanUseClass(
  schoolId: string,
  teacherName: string,
  classId: string,
): boolean {
  return getTeacherAnnouncementClasses(schoolId, teacherName).some(
    (option) => option.id === classId,
  );
}

export function createSchoolAnnouncement(input: {
  schoolId: string;
  session: UserSession;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  scope: AnnouncementScope;
  classId?: string;
  targetAudience: AnnouncementAudience[];
}): { success: true; announcement: SchoolAnnouncement } | { success: false; error: string } {
  const { schoolId, session, title, content, priority, scope, classId, targetAudience } = input;
  const role = session.role.toLowerCase();

  if (!title.trim() || !content.trim()) {
    return { success: false, error: "Title and content are required." };
  }

  if (targetAudience.length === 0) {
    return { success: false, error: "Select at least one audience." };
  }

  if (scope === "school") {
    if (role !== "admin") {
      return { success: false, error: "Only administrators can publish school-wide announcements." };
    }
  } else {
    if (role !== "teacher") {
      return { success: false, error: "Only teachers can publish class announcements." };
    }
    if (!classId) {
      return { success: false, error: "Select a class for this announcement." };
    }
    if (!teacherCanUseClass(schoolId, session.name, classId)) {
      return {
        success: false,
        error: "You can only publish to classes where you are the class teacher.",
      };
    }
    if (
      targetAudience.some(
        (audience) => audience === "Teachers" || audience === "All Staff",
      )
    ) {
      return { success: false, error: "Class announcements can only target students and parents." };
    }
    if (priority === "urgent") {
      return { success: false, error: "Only administrators can mark announcements as urgent." };
    }
  }

  const classes = getSchoolClasses(schoolId);
  const matchedClass = classId ? classes.find((cls) => cls.id === classId) : undefined;

  const announcement: SchoolAnnouncement = {
    id: `ann_${Date.now()}`,
    title: title.trim(),
    content: content.trim(),
    priority,
    scope,
    classId: scope === "class" ? classId : undefined,
    classLabel:
      scope === "class"
        ? matchedClass?.name ??
          formatStudentClassLabel(classId?.split("-")[0] ?? "", classId?.split("-")[1] ?? "")
        : undefined,
    authorId: session.id,
    authorName: session.name,
    authorEmail: session.email,
    publishedAt: new Date().toISOString().slice(0, 10),
    targetAudience,
    views: 0,
    isPinned: false,
  };

  const announcements = loadSchoolAnnouncements(schoolId);
  saveSchoolAnnouncements(schoolId, [announcement, ...announcements]);

  return { success: true, announcement };
}

export function deleteSchoolAnnouncement(
  schoolId: string,
  session: UserSession,
  announcementId: string,
): boolean {
  const announcements = loadSchoolAnnouncements(schoolId);
  const target = announcements.find((item) => item.id === announcementId);
  if (!target || !canManageAnnouncement(session, target)) return false;

  saveSchoolAnnouncements(
    schoolId,
    announcements.filter((item) => item.id !== announcementId),
  );
  return true;
}

export function toggleSchoolAnnouncementPin(
  schoolId: string,
  session: UserSession,
  announcementId: string,
): boolean {
  const announcements = loadSchoolAnnouncements(schoolId);
  const target = announcements.find((item) => item.id === announcementId);
  if (!target || !canManageAnnouncement(session, target)) return false;

  saveSchoolAnnouncements(
    schoolId,
    announcements.map((item) =>
      item.id === announcementId ? { ...item, isPinned: !item.isPinned } : item,
    ),
  );
  return true;
}

export function getAnnouncementScopeLabel(announcement: SchoolAnnouncement): string {
  if (announcement.scope === "school") return "School-wide";
  return announcement.classLabel ? `Class · ${announcement.classLabel}` : "Class";
}

export function getAnnouncementsPageDescription(session: UserSession | null): string {
  const role = session?.role.toLowerCase();

  if (role === "admin") {
    return "Publish school-wide announcements and manage all notices";
  }

  if (role === "teacher") {
    return "View official school notices and publish updates for classes you are in charge of";
  }

  return "View school-wide and class announcements relevant to you";
}
