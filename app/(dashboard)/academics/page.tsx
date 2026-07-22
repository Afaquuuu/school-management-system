"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BookOpen, CalendarRange, Layers, UserCheck } from "lucide-react";

import { TimetableManager } from "@/components/academics/timetable-manager";
import { SubjectsClassesManager } from "@/components/academics/subjects-classes-manager";
import { SectionPage } from "@/components/layout/section-page";
import { StatCard } from "@/components/ui/stat-card";
import { getUserSession } from "@/lib/teacher-check-in";
import { getSchoolClasses, getScopedItem, useSchool } from "@/lib/school-context";
import {
  filterAssignmentsForTeacher,
  getClassIdsForTeacher,
  getClassesWhereTeacherIsInCharge,
  loadClassAssignments,
} from "@/lib/timetable";

const sectionConfig = {
  overview: {
    title: "Academics Overview",
    description: "Overview of timetables, subjects, class allocations, and academic workflows.",
    icon: BookOpen,
    body: "Use the sidebar to open Timetable or Subjects & Classes for focused academic management.",
  },
  timetable: {
    title: "Timetable",
    description: "Plan and review class schedules, periods, and room assignments.",
    icon: CalendarRange,
    body: "",
  },
  subjects: {
    title: "Subjects & Classes",
    description: "Manage subjects, class allocations, and curriculum structure.",
    icon: Layers,
    body: "",
  },
} as const;

function findStudentClassId(
  schoolId: string,
  session: ReturnType<typeof getUserSession>,
): string {
  if (!session) return "";

  const storedStudents = getScopedItem(schoolId, "school_students");
  const storedClasses = getScopedItem(schoolId, "school_classes");

  if (storedStudents && storedClasses) {
    try {
      const students = JSON.parse(storedStudents) as Array<{
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        class: string;
        section: string;
      }>;
      const classes = JSON.parse(storedClasses) as Array<{ id: string; name: string; section: string }>;

      const matched = students.find(
        (student) =>
          student.email?.toLowerCase() === session.email.toLowerCase() ||
          student.id === session.id ||
          `${student.firstName} ${student.lastName}`.toLowerCase() === session.name.toLowerCase(),
      );

      if (matched) {
        const classKey = `${matched.class}-${matched.section}`.toLowerCase().replace(/\s+/g, "-");
        const classRecord =
          classes.find((cls) => cls.id === classKey) ??
          classes.find(
            (cls) =>
              cls.name.startsWith(matched.class) &&
              cls.section.toUpperCase() === matched.section.toUpperCase(),
          );
        if (classRecord) return classRecord.id;
      }
    } catch {
      // fall through
    }
  }

  if (session.classDepartment) {
    const classMatch = session.classDepartment.match(/^(Grade \d+)\s*([A-Z])$/i);
    if (classMatch && storedClasses) {
      try {
        const classes = JSON.parse(storedClasses) as Array<{ id: string; name: string; section: string }>;
        const classRecord = classes.find(
          (cls) =>
            cls.name.startsWith(classMatch[1]) &&
            cls.section.toUpperCase() === classMatch[2].toUpperCase(),
        );
        if (classRecord) return classRecord.id;
      } catch {
        return "";
      }
    }
  }

  return "";
}

export default function AcademicsPage() {
  const searchParams = useSearchParams();
  const { currentSchool } = useSchool();
  const view = searchParams.get("view");
  const [userRole, setUserRole] = useState("teacher");
  const [studentClassId, setStudentClassId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = localStorage.getItem("user_role");
    if (role) setUserRole(role);
    if (currentSchool) {
      setStudentClassId(findStudentClassId(currentSchool.id, getUserSession()));
    }
  }, [currentSchool]);

  const section =
    view === "timetable"
      ? sectionConfig.timetable
      : view === "subjects"
        ? sectionConfig.subjects
        : sectionConfig.overview;
  const isStudentView = userRole === "student";
  const isTeacherView = userRole === "teacher";
  const isPersonalAcademicsView = isStudentView || isTeacherView;
  const teacherName = isTeacherView ? getUserSession()?.name ?? "" : "";

  const teacherOverviewStats = useMemo(() => {
    if (!currentSchool || !isTeacherView || !teacherName.trim()) return null;

    const assignments = loadClassAssignments(currentSchool.id);
    const classIds = getClassIdsForTeacher(assignments, teacherName);
    const classes = getSchoolClasses(currentSchool.id);
    const inChargeClasses = getClassesWhereTeacherIsInCharge(classes, assignments, teacherName);

    let subjectCount = 0;
    for (const classId of classIds) {
      subjectCount += filterAssignmentsForTeacher(assignments[classId] ?? [], teacherName).length;
    }

    return {
      classCount: classIds.length,
      subjectCount,
      inChargeCount: inChargeClasses.length,
    };
  }, [currentSchool, isTeacherView, teacherName]);

  if (view === "timetable") {
    return (
      <div className="space-y-6">
        <SectionPage
          title={isStudentView || isTeacherView ? "My Timetable" : section.title}
          description={
            isStudentView
              ? "Your weekly class schedule and room assignments"
              : isTeacherView
                ? "View your assigned classes, periods, and room timings"
                : section.description
          }
        />
        <TimetableManager
          readOnly={isStudentView || isTeacherView}
          initialClassId={isStudentView ? studentClassId : ""}
          filterToTeacherName={teacherName}
        />
      </div>
    );
  }

  if (view === "subjects") {
    return (
      <div className="space-y-6">
        <SectionPage
          title={isStudentView || isTeacherView ? "My Subjects" : section.title}
          description={
            isStudentView
              ? "Subjects and teachers assigned to your class"
              : isTeacherView
                ? "Subjects and classes assigned to you"
                : "View subject and teacher assignments by class"
          }
        />
        <SubjectsClassesManager
          lockToClassId={isStudentView ? studentClassId : ""}
          isAdminView={userRole === "admin"}
          filterToTeacherName={teacherName}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionPage
        title={isPersonalAcademicsView ? "My Academics" : section.title}
        description={
          isTeacherView
            ? "Your assigned classes, weekly timetable, and subject allocations."
            : isStudentView
              ? "Your class timetable, subjects, and teachers."
              : section.description
        }
      />

      {isPersonalAcademicsView && (
        <>
          {isTeacherView && teacherOverviewStats && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Assigned Classes"
                value={String(teacherOverviewStats.classCount)}
                icon={Layers}
                tone="info"
              />
              <StatCard
                label="Subjects"
                value={String(teacherOverviewStats.subjectCount)}
                icon={BookOpen}
                tone="success"
              />
              <StatCard
                label="Class In-Charge"
                value={String(teacherOverviewStats.inChargeCount)}
                icon={UserCheck}
                tone="brand"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link
              href="/academics?view=timetable"
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-900/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/30">
                  <CalendarRange className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-50">
                {isTeacherView || isStudentView ? "My Timetable" : "Timetable"}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {isTeacherView
                  ? "View your weekly periods, rooms, and class timings."
                  : isStudentView
                    ? "View your weekly class schedule and room assignments."
                    : "Plan and review class schedules, periods, and room assignments."}
              </p>
            </Link>

            <Link
              href="/academics?view=subjects"
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-emerald-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-900/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/30">
                  <Layers className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-50">
                {isTeacherView || isStudentView ? "My Subjects" : "Subjects & Classes"}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {isTeacherView
                  ? "See subjects and classes assigned to you."
                  : isStudentView
                    ? "See subjects and teachers for your class."
                    : "Manage subjects, class allocations, and curriculum structure."}
              </p>
            </Link>
          </div>
        </>
      )}

      {!isPersonalAcademicsView && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/academics?view=timetable"
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/30">
                <CalendarRange className="h-5 w-5 text-blue-700 dark:text-blue-300" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-50">Timetable</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Open the full timetable view for all classes.
            </p>
          </Link>

          <Link
            href="/academics?view=subjects"
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-emerald-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/30">
                <Layers className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-50">Subjects & Classes</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Open subject allocations and class assignments.
            </p>
          </Link>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {isTeacherView || isStudentView ? "My Timetable" : "Timetable Preview"}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {isTeacherView
              ? "Your assigned periods across the week."
              : isStudentView
                ? "Your class schedule for the week."
                : "Review class schedules and period timings."}
          </p>
        </div>
        <TimetableManager
          readOnly={isStudentView || isTeacherView}
          initialClassId={isStudentView ? studentClassId : ""}
          filterToTeacherName={teacherName}
        />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {isTeacherView || isStudentView ? "My Subjects" : "Subjects & Classes"}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {isTeacherView
              ? "Subjects and classes currently assigned to you."
              : isStudentView
                ? "Subjects and teachers for your class."
                : "Subject allocations by class."}
          </p>
        </div>
        <SubjectsClassesManager
          lockToClassId={isStudentView ? studentClassId : ""}
          isAdminView={userRole === "admin"}
          filterToTeacherName={teacherName}
        />
      </div>
    </div>
  );
}
