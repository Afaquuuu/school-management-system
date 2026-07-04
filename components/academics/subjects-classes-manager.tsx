"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Layers, UserCheck } from "lucide-react";
import {
  filterAssignmentsForTeacher,
  getClassIdsForTeacher,
  getClassInChargeTeacher,
  getClassesWhereTeacherIsInCharge,
  isTeacherInChargeOfClass,
  loadClassAssignments,
  syncClassesInCharge,
} from "@/lib/timetable";
import { ensureSchoolClassesFromStudents } from "@/lib/school-classes-sync";
import { getScopedItem, getSchoolClasses, useSchool } from "@/lib/school-context";

type ClassOption = {
  id: string;
  name: string;
  section: string;
  students: number;
  inCharge: string;
};

export function SubjectsClassesManager({
  lockToClassId = "",
  isAdminView = false,
  filterToTeacherName = "",
}: {
  lockToClassId?: string;
  isAdminView?: boolean;
  filterToTeacherName?: string;
}) {
  const { currentSchool } = useSchool();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assignmentsByClass, setAssignmentsByClass] = useState<
    Record<string, Array<{ subject: string; teacher: string; periodsPerWeek: number; leadTeacher: boolean }>>
  >({});

  useEffect(() => {
    if (!currentSchool) return;

    ensureSchoolClassesFromStudents(currentSchool.id);

    const assignments = loadClassAssignments(currentSchool.id);
    setAssignmentsByClass(assignments);

    const schoolClasses = getSchoolClasses(currentSchool.id);
    const storedStudents = getScopedItem(currentSchool.id, "school_students");
    let studentCounts = new Map<string, number>();

    if (storedStudents) {
      try {
        const students = JSON.parse(storedStudents) as Array<{
          class: string;
          section: string;
        }>;
        for (const student of students) {
          const key = `${student.class}-${student.section}`.toLowerCase().replace(/\s+/g, "-");
          studentCounts.set(key, (studentCounts.get(key) ?? 0) + 1);
        }
      } catch {
        studentCounts = new Map();
      }
    }

    let nextClasses = syncClassesInCharge(
      schoolClasses.map((cls) => ({
        id: cls.id,
        name: cls.name,
        section: cls.section,
        students: studentCounts.get(cls.id) ?? cls.students ?? 0,
        inCharge: cls.inCharge,
      })),
      assignments,
    ).sort((a, b) => a.name.localeCompare(b.name));

    if (filterToTeacherName) {
      const teacherClassIds = new Set(getClassIdsForTeacher(assignments, filterToTeacherName));
      for (const cls of nextClasses) {
        if (isTeacherInChargeOfClass(cls.id, assignments, filterToTeacherName)) {
          teacherClassIds.add(cls.id);
        }
      }
      nextClasses = nextClasses.filter((cls) => teacherClassIds.has(cls.id));
    }

    setClasses(nextClasses);
    setSelectedClassId((current) => {
      if (lockToClassId && nextClasses.some((cls) => cls.id === lockToClassId)) {
        return lockToClassId;
      }
      if (current && nextClasses.some((cls) => cls.id === current)) return current;
      return nextClasses[0]?.id ?? "";
    });
  }, [currentSchool, lockToClassId, filterToTeacherName]);

  const selectedClass = useMemo(
    () => classes.find((cls) => cls.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const isTeacherScopedView = Boolean(filterToTeacherName);
  const assignments = useMemo(() => {
    const classAssignments = assignmentsByClass[selectedClassId] ?? [];
    if (!filterToTeacherName) return classAssignments;
    return filterAssignmentsForTeacher(classAssignments, filterToTeacherName);
  }, [assignmentsByClass, selectedClassId, filterToTeacherName]);
  const totalPeriods = assignments.reduce((sum, row) => sum + row.periodsPerWeek, 0);
  const effectiveInCharge =
    getClassInChargeTeacher(selectedClassId, assignmentsByClass) ?? "Not assigned";
  const isTeacherInCharge =
    isTeacherScopedView && isTeacherInChargeOfClass(selectedClassId, assignmentsByClass, filterToTeacherName);
  const inChargeClasses = useMemo(() => {
    if (!isTeacherScopedView) return [];
    return getClassesWhereTeacherIsInCharge(classes, assignmentsByClass, filterToTeacherName);
  }, [assignmentsByClass, classes, filterToTeacherName, isTeacherScopedView]);
  const isClassLocked = Boolean(lockToClassId);

  if (!currentSchool) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
        <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-600 dark:text-slate-400">Select a school to view subjects and classes.</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
        <Layers className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          {isTeacherScopedView ? "No subject assignments yet" : "No classes yet"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          {isAdminView
            ? "Add subjects under Admin → Academics → Manage Subjects, then assign them under Classes & Assignments."
            : isTeacherScopedView
              ? "You do not have any subject assignments yet. Contact your school administrator if this looks incorrect."
              : "No classes have been set up yet. Contact your school administrator to configure classes and subject assignments."}
        </p>
        {isAdminView && (
          <Link
            href="/admin/academics"
            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Open Academics Config
          </Link>
        )}
      </div>
    );
  }

  if (!selectedClass) return null;

  return (
    <div className="space-y-6">
      {isTeacherScopedView && inChargeClasses.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-2 dark:bg-blue-900/40">
              <UserCheck className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-950 dark:text-blue-100">
                Class in-charge
              </h3>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                You are the class in-charge for{" "}
                {inChargeClasses.map((cls, index) => (
                  <span key={cls.id}>
                    {index > 0 && (index === inChargeClasses.length - 1 ? " and " : ", ")}
                    <button
                      type="button"
                      onClick={() => setSelectedClassId(cls.id)}
                      className="font-semibold underline decoration-blue-400 underline-offset-2 hover:no-underline"
                    >
                      {cls.name}
                    </button>
                  </span>
                ))}
                .
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-[240px] flex-1">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Select Class
            </label>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              disabled={isClassLocked}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
            >
              {classes.map((cls) => {
                const classInCharge = isTeacherScopedView
                  && isTeacherInChargeOfClass(cls.id, assignmentsByClass, filterToTeacherName);
                return (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.students} student{cls.students !== 1 ? "s" : ""}
                    {classInCharge ? ", In-charge" : ""})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
            <span>
              <span className="font-semibold text-slate-900 dark:text-slate-50">{assignments.length}</span>{" "}
              subjects
            </span>
            <span>
              <span className="font-semibold text-slate-900 dark:text-slate-50">{totalPeriods}</span>{" "}
              periods/week
            </span>
            {!isTeacherScopedView && (
              <span>
                In-charge:{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-50">{effectiveInCharge}</span>
              </span>
            )}
            {isTeacherScopedView && isTeacherInCharge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                <UserCheck className="h-3.5 w-3.5" />
                Class in-charge
              </span>
            )}
            {isTeacherScopedView && !isTeacherInCharge && (
              <span>Not class in-charge</span>
            )}
          </div>
        </div>

        {!isClassLocked && isAdminView && (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            To assign or change subjects, go to{" "}
            <Link href="/admin/academics" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              Admin → Academics Config
            </Link>
            .
          </p>
        )}
        {!isClassLocked && !isAdminView && !isTeacherScopedView && (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Subject assignments are read-only here. Contact your school administrator to make changes.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          {isTeacherScopedView ? "My subject assignments" : "Subject assignments"}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {isTeacherScopedView ? (
            <>
              {selectedClass.name} · Your assigned subjects
              {isTeacherInCharge && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                  <UserCheck className="h-3 w-3" />
                  Class in-charge
                </span>
              )}
            </>
          ) : (
            `${selectedClass.name} · Class in-charge: ${effectiveInCharge}`
          )}
        </p>

        {assignments.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-600">
            <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No subjects assigned</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isTeacherScopedView
                ? "You are not assigned to any subjects in this class."
                : "Subjects for this class have not been configured yet."}
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                  <th className="pb-3 pr-4 font-semibold">Subject</th>
                  {!isTeacherScopedView && <th className="pb-3 pr-4 font-semibold">Teacher</th>}
                  <th className="pb-3 pr-4 font-semibold">Periods</th>
                  {!isTeacherScopedView ? (
                    <th className="pb-3 font-semibold">Role</th>
                  ) : (
                    <th className="pb-3 font-semibold">Class role</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr
                    key={assignment.subject}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-700"
                  >
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-50">
                      {assignment.subject}
                    </td>
                    {!isTeacherScopedView && (
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{assignment.teacher}</td>
                    )}
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                      {assignment.periodsPerWeek}/wk
                    </td>
                    <td className="py-3">
                      {assignment.leadTeacher ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                          <UserCheck className="h-3 w-3" />
                          In-charge
                        </span>
                      ) : (
                        <span className="text-slate-400">{isTeacherScopedView ? "Subject teacher" : "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
