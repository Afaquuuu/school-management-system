import { getScopedItem, setScopedItem } from "@/lib/school-context";
import { getActiveSubjectNames } from "@/lib/school-subjects";

export const TIMETABLE_STORAGE_KEY = "weekly_timetable";

export const TIMETABLE_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export type TimetableDay = (typeof TIMETABLE_DAYS)[number];

export type TimetablePeriod = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
};

export const TIMETABLE_PERIODS: TimetablePeriod[] = [
  { id: "p1", label: "Period 1", startTime: "08:00", endTime: "08:45" },
  { id: "p2", label: "Period 2", startTime: "08:45", endTime: "09:30" },
  { id: "p3", label: "Period 3", startTime: "09:45", endTime: "10:30" },
  { id: "p4", label: "Period 4", startTime: "10:30", endTime: "11:15" },
  { id: "p5", label: "Period 5", startTime: "11:30", endTime: "12:15" },
  { id: "p6", label: "Period 6", startTime: "12:15", endTime: "13:00" },
];

export type TimetableEntry = {
  id: string;
  classId: string;
  classLabel: string;
  day: TimetableDay;
  periodId: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  roomId: string;
  roomCode: string;
};

export type TimetableConflict = {
  id: string;
  severity: "high" | "medium";
  roomCode: string;
  day: TimetableDay;
  timeLabel: string;
  message: string;
  resolution: string;
  entryIds: string[];
};

export type SchoolResource = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  type: string;
  available: boolean;
};

export type ClassAssignment = {
  subject: string;
  teacher: string;
  periodsPerWeek: number;
  leadTeacher: boolean;
};

export const CLASS_ASSIGNMENTS_KEY = "class_assignments";

/** @deprecated Use getActiveSubjectNames(schoolId) instead. */
export function getSubjectOptions(schoolId: string): string[] {
  return getActiveSubjectNames(schoolId);
}

export function loadClassAssignments(
  schoolId: string,
): Record<string, ClassAssignment[]> {
  const stored = getScopedItem(schoolId, CLASS_ASSIGNMENTS_KEY);
  if (!stored) return {};

  try {
    return JSON.parse(stored) as Record<string, ClassAssignment[]>;
  } catch {
    return {};
  }
}

export function saveClassAssignments(
  schoolId: string,
  assignments: Record<string, ClassAssignment[]>,
): void {
  setScopedItem(schoolId, CLASS_ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

export function getClassInChargeTeacher(
  classId: string,
  assignmentsByClass: Record<string, ClassAssignment[]>,
): string | null {
  const leadAssignment = (assignmentsByClass[classId] ?? []).find((row) => row.leadTeacher);
  return leadAssignment?.teacher ?? null;
}

export function syncClassesInCharge<T extends { id: string; inCharge: string }>(
  classes: T[],
  assignmentsByClass: Record<string, ClassAssignment[]>,
): T[] {
  return classes.map((cls) => ({
    ...cls,
    inCharge: getClassInChargeTeacher(cls.id, assignmentsByClass) ?? "Not assigned",
  }));
}

export function loadActiveTeacherNames(schoolId: string): string[] {
  const stored = getScopedItem(schoolId, "school_staff");
  if (!stored) {
    return ["Mr. Smith", "Ms. Adjoa", "Mrs. Mensah"];
  }

  try {
    const staff = JSON.parse(stored) as Array<{
      firstName: string;
      lastName: string;
      role: string;
      status: string;
    }>;
    return staff
      .filter((member) => member.role === "teacher" && member.status === "active")
      .map((member) => `${member.firstName} ${member.lastName}`)
      .sort();
  } catch {
    return [];
  }
}

function normalizeTeacherName(name: string): string {
  return name.trim().toLowerCase();
}

export function findClassWhereTeacherIsInCharge(
  classes: Array<{ id: string; name: string }>,
  assignmentsByClass: Record<string, ClassAssignment[]>,
  teacherName: string,
  excludeClassId?: string,
): { id: string; name: string } | undefined {
  const target = normalizeTeacherName(teacherName);
  return classes.find((cls) => {
    if (cls.id === excludeClassId) return false;
    const inChargeTeacher = getClassInChargeTeacher(cls.id, assignmentsByClass);
    return inChargeTeacher !== null && normalizeTeacherName(inChargeTeacher) === target;
  });
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime}-${endTime}`;
}

export function getPeriodById(periodId: string): TimetablePeriod | undefined {
  return TIMETABLE_PERIODS.find((period) => period.id === periodId);
}

export function loadTimetableEntries(schoolId: string): TimetableEntry[] {
  const stored = getScopedItem(schoolId, TIMETABLE_STORAGE_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as TimetableEntry[];
  } catch {
    return [];
  }
}

export function saveTimetableEntries(schoolId: string, entries: TimetableEntry[]): void {
  setScopedItem(schoolId, TIMETABLE_STORAGE_KEY, JSON.stringify(entries));
}

export function loadSchoolResources(schoolId: string): SchoolResource[] {
  const stored = getScopedItem(schoolId, "school_resources");
  if (!stored) return [];

  try {
    return JSON.parse(stored) as SchoolResource[];
  } catch {
    return [];
  }
}

export function getEntryKey(
  classId: string,
  day: TimetableDay,
  periodId: string,
): string {
  return `${classId}|${day}|${periodId}`;
}

export function findEntryForSlot(
  entries: TimetableEntry[],
  classId: string,
  day: TimetableDay,
  periodId: string,
): TimetableEntry | undefined {
  return entries.find(
    (entry) =>
      entry.classId === classId && entry.day === day && entry.periodId === periodId,
  );
}

export function detectTimetableConflicts(entries: TimetableEntry[]): TimetableConflict[] {
  const conflicts: TimetableConflict[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const first = entries[i];
      const second = entries[j];

      if (
        first.roomId !== second.roomId ||
        first.day !== second.day ||
        first.periodId !== second.periodId
      ) {
        continue;
      }

      const conflictKey = [first.roomId, first.day, first.periodId].join("|");
      if (seen.has(conflictKey)) continue;
      seen.add(conflictKey);

      const period = getPeriodById(first.periodId);
      const timeLabel = period
        ? formatTimeRange(period.startTime, period.endTime)
        : formatTimeRange(first.startTime, first.endTime);

      conflicts.push({
        id: conflictKey,
        severity: "high",
        roomCode: first.roomCode,
        day: first.day,
        timeLabel,
        message: `${first.roomCode} is double-booked on ${first.day} ${timeLabel} for ${first.classLabel} and ${second.classLabel}.`,
        resolution: `Move ${second.classLabel} to another room or reschedule the period.`,
        entryIds: [first.id, second.id],
      });
    }
  }

  return conflicts;
}

export function groupEntriesByDay(entries: TimetableEntry[]): Record<TimetableDay, TimetableEntry[]> {
  const grouped = Object.fromEntries(
    TIMETABLE_DAYS.map((day) => [day, [] as TimetableEntry[]]),
  ) as Record<TimetableDay, TimetableEntry[]>;

  for (const entry of entries) {
    grouped[entry.day].push(entry);
  }

  for (const day of TIMETABLE_DAYS) {
    grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return grouped;
}

export function groupEntriesByRoom(entries: TimetableEntry[]): Record<string, TimetableEntry[]> {
  const grouped: Record<string, TimetableEntry[]> = {};

  for (const entry of entries) {
    if (!grouped[entry.roomCode]) {
      grouped[entry.roomCode] = [];
    }
    grouped[entry.roomCode].push(entry);
  }

  for (const roomCode of Object.keys(grouped)) {
    grouped[roomCode].sort((a, b) => {
      const dayDiff = TIMETABLE_DAYS.indexOf(a.day) - TIMETABLE_DAYS.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  return grouped;
}
