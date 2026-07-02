import { formatStudentClassLabel, normalizeClassLabel, normalizeSection } from "@/lib/class-labels";
import { getSchoolClasses, getScopedItem, setScopedItem, type SchoolClass } from "@/lib/school-context";
import { loadClassAssignments, syncClassesInCharge } from "@/lib/timetable";

export type EnsureSchoolClassesResult = {
  created: SchoolClass[];
  total: SchoolClass[];
};

/** Match the id format used across attendance, class config, and student counts. */
export function buildSchoolClassId(className: string, section: string): string {
  return `${className}-${section}`.toLowerCase().replace(/\s+/g, "-");
}

function countStudentsForClass(
  students: Array<{ class: string; section: string }>,
  classId: string,
): number {
  return students.filter(
    (student) => buildSchoolClassId(student.class, student.section) === classId,
  ).length;
}

function loadStudentsForSchool(schoolId: string): Array<{ class: string; section: string }> {
  const storedStudents = getScopedItem(schoolId, "school_students");
  if (!storedStudents) return [];

  try {
    return JSON.parse(storedStudents) as Array<{ class: string; section: string }>;
  } catch {
    return [];
  }
}

function persistSchoolClasses(schoolId: string, classes: SchoolClass[]): SchoolClass[] {
  const assignments = loadClassAssignments(schoolId);
  const synced = syncClassesInCharge(classes, assignments).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  setScopedItem(schoolId, "school_classes", JSON.stringify(synced));
  return synced;
}

function buildSchoolClassRecord(className: string, section: string): SchoolClass | null {
  const cls = normalizeClassLabel(className);
  const sec = normalizeClassLabel(section);
  if (!cls || !sec) return null;

  const id = buildSchoolClassId(cls, sec);
  if (!id) return null;

  return {
    id,
    name: formatStudentClassLabel(cls, normalizeSection(sec)),
    section: normalizeSection(sec),
    inCharge: "Not assigned",
    students: 0,
    isManual: false,
  };
}

export function ensureSchoolClassesForPairs(
  schoolId: string,
  pairs: Array<{ class: string; section: string }>,
): EnsureSchoolClassesResult {
  const existing = getSchoolClasses(schoolId);
  const existingIds = new Set(existing.map((cls) => cls.id));
  const students = loadStudentsForSchool(schoolId);
  const created: SchoolClass[] = [];

  const uniquePairs = new Map<string, { class: string; section: string }>();
  for (const pair of pairs) {
    const cls = normalizeClassLabel(pair.class);
    const sec = normalizeClassLabel(pair.section);
    if (!cls || !sec) continue;

    const id = buildSchoolClassId(cls, sec);
    if (!uniquePairs.has(id)) {
      uniquePairs.set(id, { class: cls, section: sec });
    }
  }

  const nextClasses = [...existing];

  for (const [, pair] of uniquePairs) {
    const id = buildSchoolClassId(pair.class, pair.section);
    if (existingIds.has(id)) continue;

    const record = buildSchoolClassRecord(pair.class, pair.section);
    if (!record) continue;

    created.push(record);
    nextClasses.push(record);
    existingIds.add(id);
  }

  const withCounts = nextClasses.map((cls) => ({
    ...cls,
    students: countStudentsForClass(students, cls.id),
  }));

  if (created.length > 0) {
    const total = persistSchoolClasses(schoolId, withCounts);
    return { created, total };
  }

  return { created, total: existing };
}

export function ensureSchoolClassesFromStudents(schoolId: string): EnsureSchoolClassesResult {
  const students = loadStudentsForSchool(schoolId);
  if (students.length === 0) {
    return { created: [], total: getSchoolClasses(schoolId) };
  }

  const result = ensureSchoolClassesForPairs(
    schoolId,
    students.map((student) => ({ class: student.class, section: student.section })),
  );

  const total = refreshSchoolClassStudentCounts(schoolId);
  return { created: result.created, total };
}

export function refreshSchoolClassStudentCounts(schoolId: string): SchoolClass[] {
  const classes = getSchoolClasses(schoolId);
  if (classes.length === 0) return classes;

  const students = loadStudentsForSchool(schoolId);
  const updated = classes.map((cls) => ({
    ...cls,
    students: countStudentsForClass(students, cls.id),
  }));

  return persistSchoolClasses(schoolId, updated);
}
