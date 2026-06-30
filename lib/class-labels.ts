import type { SchoolClass } from "@/lib/school-context";

/** Collapse whitespace and trim so visually identical class names dedupe correctly. */
export function normalizeClassLabel(label: string): string {
  return label.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** Build a display label from student class + section without doubling the section. */
export function formatStudentClassLabel(className: string, section: string): string {
  const cls = normalizeClassLabel(className);
  const sec = normalizeClassLabel(section);

  if (!cls) return sec;
  if (!sec) return cls;

  const clsLower = cls.toLowerCase();
  const secLower = sec.toLowerCase();

  if (clsLower.endsWith(` ${secLower}`) || clsLower.endsWith(secLower)) {
    return cls;
  }

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
