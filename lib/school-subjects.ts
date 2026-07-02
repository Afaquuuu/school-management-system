import {
  getScopedItem,
  getSchoolClasses,
  getUniqueClassNames,
  setScopedItem,
} from "@/lib/school-context";

const CLASS_ASSIGNMENTS_KEY = "class_assignments";

export type SchoolSubject = {
  id: string;
  name: string;
  code: string;
  status: "active" | "inactive";
  createdAt: string;
};

export type ExamSubject = {
  id: string;
  name: string;
  code: string;
  classes: string[];
};

const STORAGE_KEY = "school_subjects";

const LEGACY_SUBJECT_NAMES: Record<string, string> = {
  "1": "Mathematics",
  "2": "English",
  "3": "Science",
  "4": "Social Studies",
  "5": "Computer Science",
};

export const DEFAULT_SCHOOL_SUBJECTS: Array<{ name: string; code: string }> = [
  { name: "Mathematics", code: "MATH" },
  { name: "English Language", code: "ENG" },
  { name: "Science", code: "SCI" },
  { name: "Social Studies", code: "SS" },
  { name: "ICT", code: "ICT" },
  { name: "Creative Arts", code: "ART" },
  { name: "French", code: "FR" },
];

export function loadSchoolSubjects(schoolId: string): SchoolSubject[] {
  const stored = getScopedItem(schoolId, STORAGE_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as SchoolSubject[];
  } catch {
    return [];
  }
}

export function saveSchoolSubjects(schoolId: string, subjects: SchoolSubject[]): void {
  setScopedItem(schoolId, STORAGE_KEY, JSON.stringify(subjects));
}

export function ensureSchoolSubjects(schoolId: string): SchoolSubject[] {
  const existing = loadSchoolSubjects(schoolId);
  if (existing.length > 0) return existing;

  const seeded = DEFAULT_SCHOOL_SUBJECTS.map((item, index) => ({
    id: `subject_${index + 1}`,
    name: item.name,
    code: item.code,
    status: "active" as const,
    createdAt: new Date().toISOString().split("T")[0],
  }));

  saveSchoolSubjects(schoolId, seeded);
  return seeded;
}

export function getActiveSubjectNames(schoolId: string): string[] {
  return ensureSchoolSubjects(schoolId)
    .filter((subject) => subject.status === "active")
    .map((subject) => subject.name)
    .sort((a, b) => a.localeCompare(b));
}

export function getSubjectNameById(schoolId: string, subjectId: string): string {
  const matched = ensureSchoolSubjects(schoolId).find((subject) => subject.id === subjectId);
  if (matched) return matched.name;

  if (LEGACY_SUBJECT_NAMES[subjectId]) {
    return LEGACY_SUBJECT_NAMES[subjectId];
  }

  return subjectId;
}

export function generateSubjectCode(name: string, existingCodes: string[]): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const base =
    words.length > 1
      ? words.map((word) => word[0]?.toUpperCase() ?? "").join("")
      : name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();

  let code = (base || "SUB").slice(0, 6);
  let counter = 1;

  while (existingCodes.includes(code)) {
    code = `${(base || "SUB").slice(0, 4)}${counter}`;
    counter += 1;
  }

  return code;
}

function normalizeSubjectName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function isSubjectNameTaken(
  subjects: SchoolSubject[],
  name: string,
  excludeId?: string,
): boolean {
  const normalized = normalizeSubjectName(name).toLowerCase();
  return subjects.some(
    (subject) =>
      subject.id !== excludeId &&
      normalizeSubjectName(subject.name).toLowerCase() === normalized,
  );
}

export function isSubjectInUse(schoolId: string, subjectName: string): boolean {
  const normalized = normalizeSubjectName(subjectName).toLowerCase();
  const stored = getScopedItem(schoolId, CLASS_ASSIGNMENTS_KEY);
  if (!stored) return false;

  let assignments: Record<string, Array<{ subject: string }>>;
  try {
    assignments = JSON.parse(stored) as Record<string, Array<{ subject: string }>>;
  } catch {
    return false;
  }

  return Object.values(assignments).some((rows) =>
    rows.some((row) => normalizeSubjectName(row.subject).toLowerCase() === normalized),
  );
}

export function addSchoolSubject(
  schoolId: string,
  input: { name: string; code?: string },
): { subject: SchoolSubject } | { error: string } {
  const name = normalizeSubjectName(input.name);
  if (!name) {
    return { error: "Subject name is required." };
  }

  const subjects = ensureSchoolSubjects(schoolId);
  if (isSubjectNameTaken(subjects, name)) {
    return { error: "A subject with this name already exists." };
  }

  const existingCodes = subjects.map((subject) => subject.code.toUpperCase());
  const code = input.code?.trim().toUpperCase() || generateSubjectCode(name, existingCodes);

  if (existingCodes.includes(code)) {
    return { error: "This subject code is already in use." };
  }

  const subject: SchoolSubject = {
    id: `subject_${Date.now()}`,
    name,
    code,
    status: "active",
    createdAt: new Date().toISOString().split("T")[0],
  };

  saveSchoolSubjects(schoolId, [...subjects, subject]);
  return { subject };
}

export function updateSchoolSubject(
  schoolId: string,
  subjectId: string,
  input: { name?: string; code?: string; status?: SchoolSubject["status"] },
): { subject: SchoolSubject } | { error: string } {
  const subjects = ensureSchoolSubjects(schoolId);
  const index = subjects.findIndex((subject) => subject.id === subjectId);
  if (index < 0) {
    return { error: "Subject not found." };
  }

  const current = subjects[index];
  const nextName = input.name !== undefined ? normalizeSubjectName(input.name) : current.name;
  const nextCode = input.code !== undefined ? input.code.trim().toUpperCase() : current.code;
  const nextStatus = input.status ?? current.status;

  if (!nextName) {
    return { error: "Subject name is required." };
  }

  if (isSubjectNameTaken(subjects, nextName, subjectId)) {
    return { error: "A subject with this name already exists." };
  }

  const existingCodes = subjects
    .filter((subject) => subject.id !== subjectId)
    .map((subject) => subject.code.toUpperCase());

  if (existingCodes.includes(nextCode)) {
    return { error: "This subject code is already in use." };
  }

  const updated: SchoolSubject = {
    ...current,
    name: nextName,
    code: nextCode,
    status: nextStatus,
  };

  const nextSubjects = [...subjects];
  nextSubjects[index] = updated;
  saveSchoolSubjects(schoolId, nextSubjects);
  return { subject: updated };
}

export function deleteSchoolSubject(
  schoolId: string,
  subjectId: string,
): { success: true } | { error: string } {
  const subjects = ensureSchoolSubjects(schoolId);
  const subject = subjects.find((item) => item.id === subjectId);
  if (!subject) {
    return { error: "Subject not found." };
  }

  if (isSubjectInUse(schoolId, subject.name)) {
    return {
      error: `${subject.name} is assigned to a class. Remove those assignments before deleting it.`,
    };
  }

  saveSchoolSubjects(
    schoolId,
    subjects.filter((item) => item.id !== subjectId),
  );
  return { success: true };
}

export function getExamSubjects(schoolId: string): ExamSubject[] {
  const classNames = getUniqueClassNames(getSchoolClasses(schoolId));
  const classes =
    classNames.length > 0 ? classNames : ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];

  return ensureSchoolSubjects(schoolId)
    .filter((subject) => subject.status === "active")
    .map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      classes,
    }));
}

export function getAvailableSubjectsForReports(
  schoolId: string,
): Array<{ id: string; name: string }> {
  return ensureSchoolSubjects(schoolId)
    .filter((subject) => subject.status === "active")
    .map((subject) => ({ id: subject.id, name: subject.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
