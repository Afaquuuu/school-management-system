"use client";

import { useState } from "react";
import { AlertCircle, BookOpen, Layers } from "lucide-react";
import { ClassConfigurationPage } from "@/components/admin/class-configuration";
import { SubjectsManager } from "@/components/admin/subjects-manager";
import { getUserSession } from "@/lib/teacher-check-in";

export default function AcademicsPage() {
  const [tab, setTab] = useState<"subjects" | "classes">("classes");
  const session = getUserSession();
  const isAdmin = session?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="surface-card p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h1 className="page-title">Admin Access Required</h1>
        <p className="page-subtitle mt-2">
          Only administrators can configure subjects, classes, and teacher assignments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="surface-card p-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("subjects")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === "subjects"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Manage Subjects
          </button>
          <button
            type="button"
            onClick={() => setTab("classes")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === "classes"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            Classes & Assignments
          </button>
        </div>
      </div>

      {tab === "subjects" ? <SubjectsManager /> : <ClassConfigurationPage embedded />}
    </div>
  );
}
