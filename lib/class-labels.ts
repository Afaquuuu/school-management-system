import type { SchoolClass } from "@/lib/school-context";

/** Collapse whitespace and trim so visually identical class names dedupe correctly. */
export function normalizeClassLabel(label: string): string {
  return label.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** Strip a trailing section letter/code from a class label (e.g. "Grade 7 B" → "Grade 7"). */
export function getClassNameWithoutSection(className: string, section = ""): string {
  const cls = normalizeClassLabel(className);
  if (!cls) return "";

  const gradeWithSection = cls.match(/^(Grade\s+\d+)\s*([A-Za-z0-9]+)$/i);
  if (gradeWithSection) {
    return normalizeClassLabel(gradeWithSection[1]);
  }

  const sec = normalizeSection(section);
  if (sec) {
    const clsLower = cls.toLowerCase();
    const secLower = sec.toLowerCase();
    if (clsLower.endsWith(` ${secLower}`)) {
      return normalizeClassLabel(cls.slice(0, -(sec.length + 1)));
    }
    if (clsLower.endsWith(secLower) && cls.length > sec.length) {
      return normalizeClassLabel(cls.slice(0, -sec.length));
    }
  }

  return cls;
}

/** Build a display label from student class + section without doubling the section. */
export function formatStudentClassLabel(className: string, section: string): string {
  const cls = getClassNameWithoutSection(className, section);
  const embeddedSection = normalizeClassLabel(className).match(
    /^(Grade\s+\d+)\s*([A-Za-z0-9]+)$/i,
  )?.[2];
  const sec = normalizeSection(section || embeddedSection || "");

  if (!cls) return sec;
  if (!sec) return cls;

  return `${cls} ${sec}`;
}

/** Normalize section values like "a", "A", or "Section A" to a single letter/code. */
export function normalizeSection(section: string): string {
  const value = normalizeClassLabel(section).replace(/^section\s+/i, "").trim();
  return value.toUpperCase();
}

/** Match a student record against optional class and section filters. */
export function studentMatchesClassSection(
  student: { class: string; section: string },
  className: string,
  section = "",
): boolean {
  const filterClass = normalizeClassLabel(className);
  const filterSection = section ? normalizeSection(section) : "";

  const studentClass = normalizeClassLabel(student.class);
  const studentSection = normalizeSection(student.section);

  const classWithSection = studentClass.match(/^(Grade \d+)\s*([A-Z])$/i);
  const resolvedClass = classWithSection ? normalizeClassLabel(classWithSection[1]) : studentClass;
  const resolvedSection = classWithSection
    ? normalizeSection(classWithSection[2])
    : studentSection;

  if (filterClass && resolvedClass !== filterClass) {
    const compositeMatches = [
      formatStudentClassLabel(student.class, student.section),
      `${student.class} ${student.section}`,
      `${student.class}${student.section}`,
      student.class,
    ].some((label) => normalizeClassLabel(label).toLowerCase().startsWith(filterClass.toLowerCase()));

    if (!compositeMatches) return false;
  }

  if (!filterSection) return true;

  if (resolvedSection === filterSection) return true;

  const studentLabel = normalizeClassLabel(
    formatStudentClassLabel(student.class, student.section),
  ).toLowerCase();
  const filterLabel = normalizeClassLabel(`${filterClass} ${filterSection}`).toLowerCase();

  return (
    studentLabel === filterLabel ||
    studentLabel.endsWith(` ${filterSection.toLowerCase()}`) ||
    studentLabel.endsWith(filterSection.toLowerCase())
  );
}

/** Normalize roll numbers so values like "01" and "1" are treated as duplicates. */
export function normalizeRollNumber(rollNumber: string): string {
  const trimmed = normalizeClassLabel(rollNumber);
  if (!trimmed) return "";
  if (/^\d+$/.test(trimmed)) {
    return String(Number.parseInt(trimmed, 10));
  }
  return trimmed.toLowerCase();
}

export function findStudentWithRollNumberInClassSection<
  T extends {
    id?: string;
    class: string;
    section: string;
    rollNumber: string;
    firstName?: string;
    lastName?: string;
  },
>(
  students: T[],
  input: { class: string; section: string; rollNumber: string; excludeId?: string },
): T | undefined {
  const normalizedRoll = normalizeRollNumber(input.rollNumber);
  if (!normalizedRoll || !input.class.trim()) return undefined;

  return students.find((student) => {
    if (input.excludeId && student.id === input.excludeId) return false;
    if (normalizeRollNumber(student.rollNumber) !== normalizedRoll) return false;
    return studentMatchesClassSection(student, input.class, input.section);
  });
}

export function formatRollNumberConflictMessage(
  rollNumber: string,
  className: string,
  section: string,
  existingStudent: { firstName?: string; lastName?: string },
): string {
  const name = `${existingStudent.firstName ?? ""} ${existingStudent.lastName ?? ""}`.trim();
  const classLabel = formatStudentClassLabel(className, section);
  return `Roll number ${rollNumber} is already assigned to ${name || "another student"} in ${classLabel}. Each student in the same class and section must have a unique roll number.`;
}

/** Return unique class labels, preserving the first spelling of each normalized name. */
export function getUniqueClassLabels(labels: string[]): string[] {
  const byNormalized = new Map<string, string>();

  for (const label of labels) {
    const normalized = normalizeClassLabel(label);
    if (!normalized) continue;
    if (!byNormalized.has(normalized.toLowerCase())) {
      byNormalized.set(normalized.toLowerCase(), normalized);
    }
  }

  return [...byNormalized.values()].sort((a, b) => a.localeCompare(b));
}

/** Keep one school class per display name (duplicate config entries share the same label). */
export function getUniqueSchoolClassesByName(classes: SchoolClass[]): SchoolClass[] {
  const byNormalized = new Map<string, SchoolClass>();

  for (const cls of classes) {
    const key = normalizeClassLabel(cls.name).toLowerCase();
    if (!key) continue;
    if (!byNormalized.has(key)) {
      byNormalized.set(key, cls);
    }
  }

  return [...byNormalized.values()].sort((a, b) => a.name.localeCompare(b.name));
}
