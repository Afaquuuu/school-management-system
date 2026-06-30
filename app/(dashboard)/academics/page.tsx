"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, CalendarRange, Layers } from "lucide-react";

import { TimetableManager } from "@/components/academics/timetable-manager";
import { SubjectsClassesManager } from "@/components/academics/subjects-classes-manager";
import { SectionPage } from "@/components/layout/section-page";
import { getUserSession } from "@/lib/teacher-check-in";
import { getScopedItem, useSchool } from "@/lib/school-context";

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
  const Icon = section.icon;
  const isStudentView = userRole === "student";

  if (view === "timetable") {
    return (
      <div className="space-y-6">
        <SectionPage
          title={isStudentView ? "My Timetable" : section.title}
          description={
            isStudentView
              ? "Your weekly class schedule and room assignments"
              : section.description
          }
        />
        <TimetableManager readOnly={isStudentView} initialClassId={studentClassId} />
      </div>
    );
  }

  if (view === "subjects") {
    return (
      <div className="space-y-6">
        <SectionPage
          title={isStudentView ? "My Subjects" : section.title}
          description={
            isStudentView
              ? "Subjects and teachers assigned to your class"
              : "View subject and teacher assignments by class"
          }
        />
        <SubjectsClassesManager
          lockToClassId={isStudentView ? studentClassId : ""}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionPage title={section.title} description={section.description} />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-700">
            <Icon className="h-6 w-6 text-slate-700 dark:text-slate-200" />
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{section.body}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
