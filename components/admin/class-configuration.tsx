"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AlertCircle,
  BookOpen,
  Plus,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { useSchool, getScopedItem, setScopedItem } from "@/lib/school-context";
import { getActiveSubjectNames } from "@/lib/school-subjects";
import { ensureSchoolClassesFromStudents } from "@/lib/school-classes-sync";

type AssignmentRow = {
  subject: string;
  teacher: string;
  periodsPerWeek: number;
  leadTeacher: boolean;
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  class: string;
  section: string;
};

type Staff = {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
};

type ClassData = {
  id: string;
  name: string;
  section: string;
  inCharge: string;
  students: number;
  isManual?: boolean;
};

const ASSIGNMENTS_KEY = "class_assignments";

function normalizeTeacherName(name: string): string {
  return name.trim().toLowerCase();
}

function findClassWhereTeacherIsInCharge(
  classes: ClassData[],
  assignmentsByClass: Record<string, AssignmentRow[]>,
  teacherName: string,
  excludeClassId?: string,
): ClassData | undefined {
  const target = normalizeTeacherName(teacherName);
  return classes.find((cls) => {
    if (cls.id === excludeClassId) return false;
    const inChargeTeacher = getClassInChargeTeacher(cls.id, assignmentsByClass);
    return inChargeTeacher !== null && normalizeTeacherName(inChargeTeacher) === target;
  });
}

function getClassInChargeTeacher(
  classId: string,
  assignmentsByClass: Record<string, AssignmentRow[]>,
): string | null {
  const leadAssignment = (assignmentsByClass[classId] ?? []).find((row) => row.leadTeacher);
  return leadAssignment?.teacher ?? null;
}

function syncClassesInCharge(
  classes: ClassData[],
  assignmentsByClass: Record<string, AssignmentRow[]>,
): ClassData[] {
  return classes.map((cls) => ({
    ...cls,
    inCharge: getClassInChargeTeacher(cls.id, assignmentsByClass) ?? "Not assigned",
  }));
}

export function ClassConfigurationPage({ embedded = false }: { embedded?: boolean }) {
  const { currentSchool } = useSchool();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [periodsPerWeek, setPeriodsPerWeek] = useState(4);
  const [leadTeacher, setLeadTeacher] = useState(false);
  const [assignmentsByClass, setAssignmentsByClass] = useState<Record<string, AssignmentRow[]>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showClassForm, setShowClassForm] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassSection, setNewClassSection] = useState("");

  useEffect(() => {
    if (!currentSchool) {
      setSubjectOptions([]);
      setSubject("");
      return;
    }

    const names = getActiveSubjectNames(currentSchool.id);
    setSubjectOptions(names);
    setSubject((current) => (current && names.includes(current) ? current : names[0] ?? ""));
  }, [currentSchool]);

  useEffect(() => {
    if (!currentSchool) return;

    const storedStaff = getScopedItem(currentSchool.id, "school_staff");
    if (storedStaff) {
      const staff: Staff[] = JSON.parse(storedStaff);
      const teacherNames = staff
        .filter((s) => s.role === "teacher" && s.status === "active")
        .map((s) => `${s.firstName} ${s.lastName}`)
        .sort();
      setTeachers(teacherNames);
      setTeacher((current) => current || teacherNames[0] || "");
    } else {
      const defaultTeachers = ["Mr. Smith", "Ms. Adjoa", "Mrs. Mensah"];
      setTeachers(defaultTeachers);
      setTeacher((current) => current || defaultTeachers[0]);
    }
  }, [currentSchool]);

  useEffect(() => {
    if (!currentSchool) return;

    ensureSchoolClassesFromStudents(currentSchool.id);

    let assignments: Record<string, AssignmentRow[]> = {};
    const storedAssignments = getScopedItem(currentSchool.id, ASSIGNMENTS_KEY);
    if (storedAssignments) {
      try {
        assignments = JSON.parse(storedAssignments);
      } catch {
        assignments = {};
      }
    }
    setAssignmentsByClass(assignments);

    const storedClasses = getScopedItem(currentSchool.id, "school_classes");
    if (!storedClasses) {
      setClasses([]);
      return;
    }

    const manualClasses: ClassData[] = JSON.parse(storedClasses);
    const storedStudents = getScopedItem(currentSchool.id, "school_students");
    if (storedStudents) {
      const students: Student[] = JSON.parse(storedStudents);
      manualClasses.forEach((cls) => {
        cls.students = students.filter(
          (s) =>
            `${s.class}-${s.section}`.toLowerCase().replace(/\s+/g, "-") === cls.id,
        ).length;
      });
    }

    const syncedClasses = syncClassesInCharge(manualClasses, assignments).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const inChargeChanged = syncedClasses.some((cls) => {
      const original = manualClasses.find((item) => item.id === cls.id);
      return original?.inCharge !== cls.inCharge;
    });
    if (inChargeChanged) {
      setScopedItem(currentSchool.id, "school_classes", JSON.stringify(syncedClasses));
    }

    setClasses(syncedClasses);
    setSelectedClassId((current) => current || syncedClasses[0]?.id || "");
  }, [currentSchool]);

  const selectedClass = useMemo(() => {
    return classes.find((item) => item.id === selectedClassId) ?? classes[0] ?? null;
  }, [selectedClassId, classes]);

  const assignments = assignmentsByClass[selectedClassId] ?? [];
  const totalPeriods = assignments.reduce((sum, a) => sum + a.periodsPerWeek, 0);
  const effectiveInCharge =
    getClassInChargeTeacher(selectedClassId, assignmentsByClass) ?? "Not assigned";
  const classAlreadyHasInCharge = effectiveInCharge !== "Not assigned";

  const assignedSubjects = useMemo(
    () => new Set(assignments.map((row) => row.subject)),
    [assignments],
  );

  const availableSubjects = useMemo(
    () => subjectOptions.filter((item) => !assignedSubjects.has(item)),
    [assignedSubjects, subjectOptions],
  );

  const inChargeConflict = useMemo(() => {
    if (!teacher || !selectedClassId || classAlreadyHasInCharge) return null;
    return (
      findClassWhereTeacherIsInCharge(
        classes,
        assignmentsByClass,
        teacher,
        selectedClassId,
      ) ?? null
    );
  }, [teacher, selectedClassId, classes, assignmentsByClass, classAlreadyHasInCharge]);

  const canMarkAsInCharge = !classAlreadyHasInCharge && !inChargeConflict;

  const inChargeCheckboxHint = useMemo(() => {
    if (classAlreadyHasInCharge) return null;
    if (inChargeConflict) {
      return `${teacher} already leads ${inChargeConflict.name}. A teacher can only be in-charge of one class.`;
    }
    return null;
  }, [inChargeConflict, classAlreadyHasInCharge, teacher]);

  useEffect(() => {
    if (availableSubjects.length === 0) return;
    if (!availableSubjects.includes(subject)) {
      setSubject(availableSubjects[0]);
    }
  }, [availableSubjects, subject, selectedClassId]);

  useEffect(() => {
    if (!canMarkAsInCharge) {
      setLeadTeacher(false);
    }
  }, [canMarkAsInCharge, teacher, selectedClassId]);

  const saveClasses = (nextClasses: ClassData[]) => {
    if (!currentSchool) return;
    const sorted = [...nextClasses].sort((a, b) => a.name.localeCompare(b.name));
    setClasses(sorted);
    setScopedItem(currentSchool.id, "school_classes", JSON.stringify(sorted));
  };

  const saveAssignments = (next: Record<string, AssignmentRow[]>) => {
    if (!currentSchool) return;
    setAssignmentsByClass(next);
    setScopedItem(currentSchool.id, ASSIGNMENTS_KEY, JSON.stringify(next));
    setClasses((currentClasses) => {
      const synced = syncClassesInCharge(currentClasses, next);
      setScopedItem(currentSchool.id, "school_classes", JSON.stringify(synced));
      return synced;
    });
  };

  const showSuccess = (text: string) => {
    setMessage({ type: "success", text });
    setTimeout(() => setMessage(null), 3000);
  };

  const addAssignment = () => {
    if (!selectedClassId || !selectedClass) return;

    if (!subject) {
      setMessage({
        type: "error",
        text: "Add school subjects first under Manage Subjects.",
      });
      return;
    }

    const existingAssignment = assignments.find((a) => a.subject === subject);
    if (existingAssignment) {
      setMessage({
        type: "error",
        text: `${subject} is already assigned to ${existingAssignment.teacher}.`,
      });
      return;
    }

    if (leadTeacher) {
      if (classAlreadyHasInCharge) {
        setMessage({
          type: "error",
          text: `${effectiveInCharge} is already the in-charge for ${selectedClass.name}.`,
        });
        return;
      }

      if (inChargeConflict) {
        setMessage({
          type: "error",
          text: `${teacher} is already in-charge of ${inChargeConflict.name}. A teacher can only lead one class.`,
        });
        return;
      }
    }

    const classAssignments = (assignmentsByClass[selectedClassId] ?? []).map((row) => ({
      ...row,
      leadTeacher: leadTeacher ? false : row.leadTeacher,
    }));

    const nextAssignments = {
      ...assignmentsByClass,
      [selectedClassId]: [
        ...classAssignments,
        { subject, teacher, periodsPerWeek, leadTeacher },
      ],
    };

    saveAssignments(nextAssignments);

    if (leadTeacher) {
      showSuccess(`${teacher} is now in-charge of ${selectedClass.name}.`);
    } else {
      showSuccess(`${subject} assigned to ${selectedClass.name}.`);
    }

    setSubject(availableSubjects[0] ?? subjectOptions[0] ?? "");
    if (teachers.length > 0) setTeacher(teachers[0]);
    setPeriodsPerWeek(4);
    setLeadTeacher(false);
  };

  const removeAssignment = (subjectToRemove: string) => {
    if (!selectedClass) return;
    if (!confirm(`Remove ${subjectToRemove} from ${selectedClass.name}?`)) return;

    const nextClassAssignments = (assignmentsByClass[selectedClassId] ?? []).filter(
      (a) => a.subject !== subjectToRemove,
    );

    saveAssignments({
      ...assignmentsByClass,
      [selectedClassId]: nextClassAssignments,
    });
  };

  const addNewClass = () => {
    if (!currentSchool) return;

    if (!newClassName.trim() || !newClassSection.trim()) {
      setMessage({ type: "error", text: "Enter both class name and section." });
      return;
    }

    const classId = `${newClassName}-${newClassSection}`.toLowerCase().replace(/\s+/g, "-");
    if (classes.some((c) => c.id === classId)) {
      setMessage({ type: "error", text: `Class ${newClassName} ${newClassSection} already exists.` });
      return;
    }

    const newClass: ClassData = {
      id: classId,
      name: `${newClassName} ${newClassSection}`,
      section: newClassSection,
      inCharge: "Not assigned",
      students: 0,
      isManual: true,
    };

    const updatedClasses = [...classes, newClass].sort((a, b) => a.name.localeCompare(b.name));
    saveClasses(updatedClasses);
    showSuccess(`Class ${newClass.name} created.`);
    setNewClassName("");
    setNewClassSection("");
    setShowClassForm(false);
    setSelectedClassId(classId);
  };

  const deleteClass = (classId: string) => {
    if (!currentSchool) return;

    const classToDelete = classes.find((c) => c.id === classId);
    if (!classToDelete) return;

    if (classToDelete.students > 0) {
      setMessage({
        type: "error",
        text: "Remove all students from this class before deleting it.",
      });
      return;
    }

    if (!confirm(`Delete ${classToDelete.name}?`)) return;

    const updatedClasses = classes.filter((c) => c.id !== classId);
    saveClasses(updatedClasses);

    if (selectedClassId === classId && updatedClasses.length > 0) {
      setSelectedClassId(updatedClasses[0].id);
    }
  };

  if (!currentSchool) {
    return (
      <div className="surface-card flex min-h-[40vh] flex-col items-center justify-center p-8 text-center">
        <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
        <h2 className="text-lg font-semibold text-slate-900">No school selected</h2>
        <p className="mt-1 text-sm text-slate-500">Select a school to configure classes.</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-6">
        {!embedded && <PageHeader />}
        <div className="surface-card p-8 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900">No classes yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Create a class below, or add students and they will appear here automatically.
          </p>

          <div className="mx-auto mt-6 max-w-lg rounded-lg border border-slate-200 p-5 text-left">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Create first class</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Class name" value={newClassName} onChange={setNewClassName} placeholder="Grade 7" />
              <Field label="Section" value={newClassSection} onChange={setNewClassSection} placeholder="B" />
            </div>
            <button
              onClick={addNewClass}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create class
            </button>
          </div>
        </div>

        {teachers.length === 0 && <NoTeachersNotice />}
      </div>
    );
  }

  if (!selectedClass) return null;

  return (
    <div className="space-y-6">
      {!embedded && <PageHeader />}

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="surface-card p-3 md:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 sm:min-w-[220px]">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="input-field w-full"
              >
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.students} students)
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowClassForm((open) => !open)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              {showClassForm ? "Cancel" : "Add class"}
            </button>
            {selectedClass.students === 0 && (
              <button
                onClick={() => deleteClass(selectedClass.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 sm:w-auto"
              >
                <Trash2 className="h-4 w-4" />
                Delete class
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 sm:flex sm:flex-wrap sm:gap-x-5 sm:text-sm">
            <span>
              <span className="font-medium text-slate-900">{assignments.length}</span> subjects
            </span>
            <span>
              <span className="font-medium text-slate-900">{totalPeriods}</span> periods/week
            </span>
            <span>
              In-charge: <span className="font-medium text-slate-900">{effectiveInCharge}</span>
            </span>
          </div>
        </div>

        {showClassForm && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="Class name" value={newClassName} onChange={setNewClassName} placeholder="Grade 8" />
              <Field label="Section" value={newClassSection} onChange={setNewClassSection} placeholder="A" />
              <div className="flex items-end">
                <button
                  onClick={addNewClass}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid min-w-0 gap-4 md:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface-card min-w-0 overflow-hidden p-4 md:p-5">
          <div className="mb-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">Subject assignments</h2>
              <p className="mt-1 break-words text-sm text-slate-500">
                {selectedClass.name} · Class in-charge:{" "}
                <span className="font-medium text-slate-700">{effectiveInCharge}</span>
              </p>
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No subjects assigned</p>
              <p className="mt-1 text-sm text-slate-500">Use the form to assign a teacher to each subject.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 md:hidden">
                {assignments.map((assignment) => (
                  <div key={assignment.subject} className="space-y-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold text-slate-900">{assignment.subject}</p>
                        <p className="mt-1 break-words text-sm text-slate-600">{assignment.teacher}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAssignment(assignment.subject)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        title="Remove assignment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                        {assignment.periodsPerWeek}/wk
                      </span>
                      {assignment.leadTeacher ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-800">
                          <UserCheck className="h-3 w-3" />
                          Class in-charge
                        </span>
                      ) : (
                        <span className="text-slate-400">Subject teacher</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-3 pr-4 font-medium">Subject</th>
                    <th className="pb-3 pr-4 font-medium">Teacher</th>
                    <th className="pb-3 pr-4 font-medium">Periods</th>
                    <th className="pb-3 pr-4 font-medium">Role</th>
                    <th className="pb-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.subject} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-slate-900">{assignment.subject}</td>
                      <td className="py-3 pr-4 text-slate-600">{assignment.teacher}</td>
                      <td className="py-3 pr-4 text-slate-600">{assignment.periodsPerWeek}/wk</td>
                      <td className="py-3 pr-4">
                        {assignment.leadTeacher ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            <UserCheck className="h-3 w-3" />
                            In-charge
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => removeAssignment(assignment.subject)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>

        <div className="surface-card min-w-0 p-4 md:p-5">
          <h2 className="text-base font-semibold text-slate-900">Assign subject</h2>
          <p className="mb-3 text-sm text-slate-500">Add a subject and teacher for this class.</p>

          <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm">
            <span className="text-blue-700">Class in-charge for {selectedClass.name}:</span>{" "}
            <span className="font-semibold text-blue-900">{effectiveInCharge}</span>
          </div>

          {subjectOptions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-6 text-center text-sm text-amber-900">
              No school subjects yet. Open the <strong>Manage Subjects</strong> tab and add subjects first.
            </div>
          ) : availableSubjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
              All subjects are already assigned for this class.
            </div>
          ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field w-full">
                {availableSubjects.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Teacher</label>
              <select value={teacher} onChange={(e) => setTeacher(e.target.value)} className="input-field w-full">
                {teachers.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Teachers can be assigned to subjects in any class. In-charge is separate.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Periods per week</label>
              <input
                type="number"
                min={1}
                max={12}
                value={periodsPerWeek}
                onChange={(e) => setPeriodsPerWeek(Number(e.target.value))}
                className="input-field w-full"
              />
            </div>

            {classAlreadyHasInCharge ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                {effectiveInCharge} is already class in-charge. Remove that assignment to assign a
                different in-charge.
              </p>
            ) : (
              <>
                <label
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                    canMarkAsInCharge
                      ? "border-slate-200 text-slate-700"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={leadTeacher}
                    disabled={!canMarkAsInCharge}
                    onChange={(e) => setLeadTeacher(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 disabled:opacity-50"
                  />
                  Mark as class in-charge
                </label>
                {!canMarkAsInCharge && inChargeCheckboxHint && (
                  <p className="text-xs text-slate-500">{inChargeCheckboxHint}</p>
                )}
              </>
            )}

            <button
              type="button"
              onClick={addAssignment}
              disabled={availableSubjects.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Assign subject
            </button>
          </div>
          )}

          {teachers.length === 0 && (
            <div className="mt-4">
              <NoTeachersNotice compact />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <p className="section-label mb-1">Admin</p>
      <h1 className="page-title">Academics Config</h1>
      <p className="page-subtitle mt-1">
        Manage classes and assign subjects to teachers.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field w-full"
      />
    </div>
  );
}

function NoTeachersNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 ${
        compact ? "text-sm" : ""
      }`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p className="text-amber-900">
        No teachers found.{" "}
        <a href="/staff" className="font-medium underline hover:no-underline">
          Add staff
        </a>{" "}
        with the Teacher role first.
      </p>
    </div>
  );
}
