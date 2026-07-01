"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Edit, Plus, Trash2, X } from "lucide-react";
import { useSchool } from "@/lib/school-context";
import {
  addSchoolSubject,
  deleteSchoolSubject,
  ensureSchoolSubjects,
  generateSubjectCode,
  updateSchoolSubject,
  type SchoolSubject,
} from "@/lib/school-subjects";

export function SubjectsManager() {
  const { currentSchool } = useSchool();
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingSubject, setEditingSubject] = useState<SchoolSubject | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editStatus, setEditStatus] = useState<SchoolSubject["status"]>("active");

  const refreshSubjects = () => {
    if (!currentSchool) {
      setSubjects([]);
      return;
    }
    setSubjects(ensureSchoolSubjects(currentSchool.id));
  };

  useEffect(() => {
    refreshSubjects();
  }, [currentSchool]);

  const activeCount = useMemo(
    () => subjects.filter((subject) => subject.status === "active").length,
    [subjects],
  );

  const showNotice = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleAddSubject = () => {
    if (!currentSchool) return;

    const result = addSchoolSubject(currentSchool.id, {
      name,
      code: code.trim() || undefined,
    });

    if ("error" in result) {
      showNotice("error", result.error);
      return;
    }

    setName("");
    setCode("");
    refreshSubjects();
    showNotice("success", `${result.subject.name} added to your school subjects.`);
  };

  const openEditModal = (subject: SchoolSubject) => {
    setEditingSubject(subject);
    setEditName(subject.name);
    setEditCode(subject.code);
    setEditStatus(subject.status);
  };

  const handleSaveEdit = () => {
    if (!currentSchool || !editingSubject) return;

    const result = updateSchoolSubject(currentSchool.id, editingSubject.id, {
      name: editName,
      code: editCode,
      status: editStatus,
    });

    if ("error" in result) {
      showNotice("error", result.error);
      return;
    }

    setEditingSubject(null);
    refreshSubjects();
    showNotice("success", `${result.subject.name} updated.`);
  };

  const handleDeleteSubject = (subject: SchoolSubject) => {
    if (!currentSchool) return;
    if (!confirm(`Delete ${subject.name}? This cannot be undone.`)) return;

    const result = deleteSchoolSubject(currentSchool.id, subject.id);
    if ("error" in result) {
      showNotice("error", result.error);
      return;
    }

    refreshSubjects();
    showNotice("success", `${subject.name} removed.`);
  };

  if (!currentSchool) {
    return (
      <div className="surface-card flex min-h-[30vh] flex-col items-center justify-center p-8 text-center">
        <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-600">Select a school to manage subjects.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="surface-card p-6">
        <p className="section-label mb-1">Academics</p>
        <h1 className="page-title">Manage Subjects</h1>
        <p className="page-subtitle mt-1">
          Define the subjects your school teaches. These appear in class assignments, exams, timetables, and reports.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="surface-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">Add Subject</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Subject Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!code.trim()) {
                    setCode(
                      generateSubjectCode(
                        event.target.value,
                        subjects.map((subject) => subject.code),
                      ),
                    );
                  }
                }}
                placeholder="e.g. Physics"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Subject Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Auto-generated"
                className="input-field uppercase"
              />
            </div>
            <button
              type="button"
              onClick={handleAddSubject}
              className="btn-primary inline-flex w-full items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Subject
            </button>
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">School Subjects</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {activeCount} active · {subjects.length} total
              </p>
            </div>
          </div>

          {subjects.length === 0 ? (
            <div className="p-10 text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No subjects yet. Add your first subject on the left.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td className="px-5 py-4 font-medium text-slate-900 dark:text-slate-50">
                        {subject.name}
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{subject.code}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            subject.status === "active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {subject.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(subject)}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            aria-label={`Edit ${subject.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubject(subject)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            aria-label={`Delete ${subject.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Edit Subject</h3>
              <button
                type="button"
                onClick={() => setEditingSubject(null)}
                className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Subject Code
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(event) => setEditCode(event.target.value.toUpperCase())}
                  className="input-field uppercase"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(event) =>
                    setEditStatus(event.target.value as SchoolSubject["status"])
                  }
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setEditingSubject(null)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="btn-primary flex-1 justify-center"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
