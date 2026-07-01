"use client";

import { useState } from "react";
import { BookOpen, Layers } from "lucide-react";
import { ClassConfigurationPage } from "@/components/admin/class-configuration";
import { SubjectsManager } from "@/components/admin/subjects-manager";

export default function AcademicsPage() {
  const [tab, setTab] = useState<"subjects" | "classes">("classes");

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
