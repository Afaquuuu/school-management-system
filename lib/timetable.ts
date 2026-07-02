import { getScopedItem, setScopedItem } from "@/lib/school-context";
import { getActiveSubjectNames } from "@/lib/school-subjects";

export const TIMETABLE_STORAGE_KEY = "weekly_timetable";
export const TIMETABLE_PERIOD_SETTINGS_KEY = "timetable_period_settings";
export const TIMETABLE_BELL_TIMES_KEY = "timetable_bell_times";
export const TIMETABLE_CLASS_PERIOD_SETTINGS_KEY = "timetable_class_period_settings";

export type PeriodSettings = {
  startTime: string;
  endTime: string;
  kind?: "lesson" | "break";
  breakLabel?: string;
};

export type BellTimeSettings = {
  startTime: string;
  endTime: string;
};

export type ClassPeriodSlotSettings = {
  kind?: "lesson" | "break";
  breakLabel?: string;
  startTime?: string;
  endTime?: string;
};

export type ClassPeriodSettings = Record<string, ClassPeriodSlotSettings>;
export type ClassPeriodSettingsByClass = Record<string, ClassPeriodSettings>;

/** @deprecated Use PeriodSettings */
export type PeriodTimeOverride = PeriodSettings;

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
  kind: "lesson" | "break";
  breakLabel?: string;
};

export const TIMETABLE_PERIODS: TimetablePeriod[] = [
  { id: "p1", label: "Period 1", startTime: "08:00", endTime: "08:45", kind: "lesson" },
  { id: "p2", label: "Period 2", startTime: "08:45", endTime: "09:30", kind: "lesson" },
  { id: "p3", label: "Period 3", startTime: "09:45", endTime: "10:30", kind: "lesson" },
  { id: "p4", label: "Period 4", startTime: "10:30", endTime: "11:15", kind: "lesson" },
  { id: "p5", label: "Period 5", startTime: "11:30", endTime: "12:15", kind: "lesson" },
  { id: "p6", label: "Period 6", startTime: "12:15", endTime: "13:00", kind: "lesson" },
];

const PERIOD_DURATION_MINUTES = 45;
const PERIOD_BREAK_MINUTES = 15;

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** Build enough daily period rows for a class (extends beyond the default 6 when needed). */
export function buildTimetablePeriods(
  minCount: number,
  bellTimes: Record<string, BellTimeSettings> = {},
  classSlots: ClassPeriodSettings = {},
): TimetablePeriod[] {
  const count = Math.max(minCount, TIMETABLE_PERIODS.length, 1);
  let periods: Array<{ id: string; label: string; startTime: string; endTime: string }>;

  if (count <= TIMETABLE_PERIODS.length) {
    periods = TIMETABLE_PERIODS.slice(0, count);
  } else {
    periods = [...TIMETABLE_PERIODS];
    let cursor = parseTimeToMinutes(periods[periods.length - 1].endTime);

    for (let index = periods.length; index < count; index += 1) {
      cursor += PERIOD_BREAK_MINUTES;
      const startTime = formatMinutesToTime(cursor);
      cursor += PERIOD_DURATION_MINUTES;
      const endTime = formatMinutesToTime(cursor);
      periods.push({
        id: `p${index + 1}`,
        label: `Period ${index + 1}`,
        startTime,
        endTime,
      });
    }
  }

  return periods.map((period) => {
    const times = bellTimes[period.id] ?? {
      startTime: period.startTime,
      endTime: period.endTime,
    };
    const slot = classSlots[period.id];
    return toTimetablePeriod(period.id, period.label, {
      startTime: times.startTime,
      endTime: times.endTime,
      kind: slot?.kind ?? "lesson",
      breakLabel: slot?.breakLabel,
    });
  });
}

function resolvePeriodSettings(
  period: { startTime: string; endTime: string },
  stored?: PeriodSettings,
): PeriodSettings {
  return {
    startTime: stored?.startTime ?? period.startTime,
    endTime: stored?.endTime ?? period.endTime,
    kind: stored?.kind ?? "lesson",
    breakLabel: stored?.breakLabel,
  };
}

function toTimetablePeriod(
  id: string,
  baseLabel: string,
  settings: PeriodSettings,
): TimetablePeriod {
  const isBreak = settings.kind === "break";
  const breakLabel = settings.breakLabel?.trim();

  return {
    id,
    label: isBreak ? breakLabel || "Break" : baseLabel,
    startTime: settings.startTime,
    endTime: settings.endTime,
    kind: isBreak ? "break" : "lesson",
    breakLabel: breakLabel || undefined,
  };
}

export function isInsertedBreakPeriodId(periodId: string): boolean {
  return periodId.startsWith("brk-");
}

export function createInsertedBreakPeriod(
  classId: string,
  classSlots: ClassPeriodSettings,
  anchorPeriod?: TimetablePeriod,
): { id: string; settings: ClassPeriodSlotSettings } {
  const id = `brk-${classId}-${Date.now()}`;
  const startMinutes = anchorPeriod
    ? parseTimeToMinutes(anchorPeriod.endTime) + PERIOD_BREAK_MINUTES
    : parseTimeToMinutes(TIMETABLE_PERIODS[TIMETABLE_PERIODS.length - 1].endTime) + PERIOD_BREAK_MINUTES;
  const endMinutes = startMinutes + 30;

  const existingBreakCount = Object.keys(classSlots).filter((key) => isInsertedBreakPeriodId(key)).length;

  return {
    id,
    settings: {
      startTime: formatMinutesToTime(startMinutes),
      endTime: formatMinutesToTime(endMinutes),
      kind: "break",
      breakLabel: existingBreakCount === 0 ? "Short Break" : "Lunch Break",
    },
  };
}

export function getPeriodNumber(periodId: string): number {
  const match = periodId.match(/^p(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

export function isValidTimeValue(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function validatePeriodTimes(
  startTime: string,
  endTime: string,
): { ok: true } | { error: string } {
  if (!isValidTimeValue(startTime) || !isValidTimeValue(endTime)) {
    return { error: "Use a valid time in HH:MM format." };
  }

  if (parseTimeToMinutes(startTime) >= parseTimeToMinutes(endTime)) {
    return { error: "End time must be after start time." };
  }

  return { ok: true };
}

function migrateLegacyPeriodSettings(schoolId: string): {
  bellTimes: Record<string, BellTimeSettings>;
  classPeriodSettings: ClassPeriodSettingsByClass;
} {
  const stored = getScopedItem(schoolId, TIMETABLE_PERIOD_SETTINGS_KEY);
  if (!stored) {
    return { bellTimes: {}, classPeriodSettings: {} };
  }

  try {
    const legacy = JSON.parse(stored) as Record<string, PeriodSettings>;
    const bellTimes: Record<string, BellTimeSettings> = {};

    for (const [periodId, settings] of Object.entries(legacy)) {
      if (!isInsertedBreakPeriodId(periodId)) {
        bellTimes[periodId] = {
          startTime: settings.startTime,
          endTime: settings.endTime,
        };
      }
    }

    return { bellTimes, classPeriodSettings: {} };
  } catch {
    return { bellTimes: {}, classPeriodSettings: {} };
  }
}

export function loadBellTimes(schoolId: string): Record<string, BellTimeSettings> {
  const stored = getScopedItem(schoolId, TIMETABLE_BELL_TIMES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as Record<string, BellTimeSettings>;
    } catch {
      return {};
    }
  }

  const migrated = migrateLegacyPeriodSettings(schoolId);
  if (Object.keys(migrated.bellTimes).length > 0) {
    saveBellTimes(schoolId, migrated.bellTimes);
  }
  return migrated.bellTimes;
}

export function saveBellTimes(
  schoolId: string,
  bellTimes: Record<string, BellTimeSettings>,
): void {
  setScopedItem(schoolId, TIMETABLE_BELL_TIMES_KEY, JSON.stringify(bellTimes));
}

export function loadClassPeriodSettings(schoolId: string): ClassPeriodSettingsByClass {
  const stored = getScopedItem(schoolId, TIMETABLE_CLASS_PERIOD_SETTINGS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as ClassPeriodSettingsByClass;
    } catch {
      return {};
    }
  }

  return migrateLegacyPeriodSettings(schoolId).classPeriodSettings;
}

export function saveClassPeriodSettings(
  schoolId: string,
  settings: ClassPeriodSettingsByClass,
): void {
  setScopedItem(schoolId, TIMETABLE_CLASS_PERIOD_SETTINGS_KEY, JSON.stringify(settings));
}

export function loadPeriodOverrides(schoolId: string): Record<string, PeriodSettings> {
  const stored = getScopedItem(schoolId, TIMETABLE_PERIOD_SETTINGS_KEY);
  if (!stored) return {};

  try {
    return JSON.parse(stored) as Record<string, PeriodSettings>;
  } catch {
    return {};
  }
}

export const loadPeriodSettings = loadPeriodOverrides;

export function savePeriodOverrides(
  schoolId: string,
  settings: Record<string, PeriodSettings>,
): void {
  setScopedItem(schoolId, TIMETABLE_PERIOD_SETTINGS_KEY, JSON.stringify(settings));
}

export const savePeriodSettings = savePeriodOverrides;

export function getTimetablePeriodsForClass(
  schoolId: string,
  classId: string,
  input: {
    subjectCount: number;
    scheduledPeriodNumbers?: number[];
  },
  options?: {
    bellTimes?: Record<string, BellTimeSettings>;
    classSlotSettings?: ClassPeriodSettings;
  },
): TimetablePeriod[] {
  const resolvedBellTimes = options?.bellTimes ?? loadBellTimes(schoolId);
  const resolvedClassSlots =
    options?.classSlotSettings ?? loadClassPeriodSettings(schoolId)[classId] ?? {};
  const maxScheduled =
    input.scheduledPeriodNumbers?.reduce((max, value) => Math.max(max, value), 0) ?? 0;
  const lessonRows = buildTimetablePeriods(
    Math.max(input.subjectCount, maxScheduled),
    resolvedBellTimes,
    resolvedClassSlots,
  );

  const insertedBreakRows = Object.entries(resolvedClassSlots)
    .filter(([periodId]) => isInsertedBreakPeriodId(periodId))
    .map(([periodId, slotSettings]) =>
      toTimetablePeriod(periodId, "Break", {
        startTime: slotSettings.startTime ?? "12:00",
        endTime: slotSettings.endTime ?? "12:30",
        kind: "break",
        breakLabel: slotSettings.breakLabel,
      }),
    );

  return [...lessonRows, ...insertedBreakRows].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
}

export function syncEntriesWithPeriodTimes(
  entries: TimetableEntry[],
  periods: TimetablePeriod[],
): TimetableEntry[] {
  const periodById = new Map(periods.map((period) => [period.id, period]));

  return entries.map((entry) => {
    const period = periodById.get(entry.periodId);
    if (!period) return entry;
    return {
      ...entry,
      startTime: period.startTime,
      endTime: period.endTime,
    };
  });
}

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

export function getPeriodById(
  periodId: string,
  schoolId?: string,
  options?: {
    bellTimes?: Record<string, BellTimeSettings>;
    classSlotSettings?: ClassPeriodSettings;
  },
): TimetablePeriod | undefined {
  if (isInsertedBreakPeriodId(periodId)) {
    const slot = options?.classSlotSettings?.[periodId];
    if (!slot) return undefined;
    return toTimetablePeriod(periodId, "Break", {
      startTime: slot.startTime ?? "12:00",
      endTime: slot.endTime ?? "12:30",
      kind: "break",
      breakLabel: slot.breakLabel,
    });
  }

  const periodNumber = getPeriodNumber(periodId);
  if (periodNumber <= 0) return undefined;

  const resolvedBellTimes = options?.bellTimes ?? (schoolId ? loadBellTimes(schoolId) : {});
  const resolvedClassSlots = options?.classSlotSettings ?? {};
  return buildTimetablePeriods(periodNumber, resolvedBellTimes, resolvedClassSlots)[periodNumber - 1];
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
