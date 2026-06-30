"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  CheckCircle,
  MapPin,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  detectTimetableConflicts,
  findEntryForSlot,
  formatTimeRange,
  getPeriodById,
  loadClassAssignments,
  loadSchoolResources,
  loadTimetableEntries,
  saveTimetableEntries,
  TIMETABLE_DAYS,
  TIMETABLE_PERIODS,
  type ClassAssignment,
  type SchoolResource,
  type TimetableDay,
  type TimetableEntry,
} from "@/lib/timetable";
import { getSchoolClasses, useSchool, type SchoolClass } from "@/lib/school-context";

type SlotEditorState = {
  classId: string;
  classLabel: string;
  day: TimetableDay;
  periodId: string;
  entryId?: string;
  subject: string;
  teacher: string;
  roomId: string;
};

export function TimetableManager({
  readOnly = false,
  initialClassId = "",
}: {
  readOnly?: boolean;
  initialClassId?: string;
}) {
  const { currentSchool } = useSchool();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [resources, setResources] = useState<SchoolResource[]>([]);
  const [assignmentsByClass, setAssignmentsByClass] = useState<Record<string, ClassAssignment[]>>({});
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [editor, setEditor] = useState<SlotEditorState | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!currentSchool) return;
    let schoolClasses = getSchoolClasses(currentSchool.id).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    if (readOnly && initialClassId) {
      schoolClasses = schoolClasses.filter((cls) => cls.id === initialClassId);
    }

    setClasses(schoolClasses);
    setResources(loadSchoolResources(currentSchool.id));
    setAssignmentsByClass(loadClassAssignments(currentSchool.id));
    setEntries(loadTimetableEntries(currentSchool.id));
    if (schoolClasses.length > 0) {
      setSelectedClassId((current) => {
        if (readOnly && initialClassId && schoolClasses.some((cls) => cls.id === initialClassId)) {
          return initialClassId;
        }
        if (current && schoolClasses.some((cls) => cls.id === current)) return current;
        if (initialClassId && schoolClasses.some((cls) => cls.id === initialClassId)) {
          return initialClassId;
        }
        return schoolClasses[0].id;
      });
    } else {
      setSelectedClassId("");
    }
  }, [currentSchool, initialClassId, readOnly]);

  const selectedClass = classes.find((cls) => cls.id === selectedClassId) ?? null;
  const classEntries = useMemo(
    () => entries.filter((entry) => entry.classId === selectedClassId),
    [entries, selectedClassId],
  );
  const classAssignments = assignmentsByClass[selectedClassId] ?? [];
  const conflicts = useMemo(() => detectTimetableConflicts(entries), [entries]);
  const classConflicts = useMemo(
    () =>
      conflicts.filter((conflict) =>
        conflict.entryIds.some((entryId) =>
          entries.some((entry) => entry.id === entryId && entry.classId === selectedClassId),
        ),
      ),
    [conflicts, entries, selectedClassId],
  );

  const persistEntries = (nextEntries: TimetableEntry[]) => {
    if (!currentSchool) return;
    setEntries(nextEntries);
    saveTimetableEntries(currentSchool.id, nextEntries);
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const openEditor = (day: TimetableDay, periodId: string) => {
    if (readOnly || !selectedClass) return;

    const existing = findEntryForSlot(entries, selectedClass.id, day, periodId);
    const period = getPeriodById(periodId);
    if (!period) return;

    setEditor({
      classId: selectedClass.id,
      classLabel: selectedClass.name,
      day,
      periodId,
      entryId: existing?.id,
      subject: existing?.subject ?? classAssignments[0]?.subject ?? "",
      teacher:
        existing?.teacher ??
        classAssignments.find((assignment) => assignment.subject === existing?.subject)?.teacher ??
        classAssignments[0]?.teacher ??
        "",
      roomId: existing?.roomId ?? resources[0]?.id ?? "",
    });
  };

  const closeEditor = () => setEditor(null);

  const handleSubjectChange = (subject: string) => {
    if (!editor) return;
    const assignment = classAssignments.find((row) => row.subject === subject);
    setEditor({
      ...editor,
      subject,
      teacher: assignment?.teacher ?? editor.teacher,
    });
  };

  const saveSlot = () => {
    if (!editor || !currentSchool) return;

    if (!editor.subject.trim()) {
      showMessage("error", "Select a subject for this period.");
      return;
    }

    if (!editor.roomId) {
      showMessage("error", "Select a room for this period.");
      return;
    }

    const room = resources.find((resource) => resource.id === editor.roomId);
    if (!room) {
      showMessage("error", "Selected room was not found.");
      return;
    }

    const period = getPeriodById(editor.periodId);
    if (!period) return;

    const nextEntry: TimetableEntry = {
      id: editor.entryId ?? `tt_${Date.now()}`,
      classId: editor.classId,
      classLabel: editor.classLabel,
      day: editor.day,
      periodId: editor.periodId,
      startTime: period.startTime,
      endTime: period.endTime,
      subject: editor.subject,
      teacher: editor.teacher,
      roomId: room.id,
      roomCode: room.code,
    };

    const withoutCurrent = entries.filter(
      (entry) =>
        !(
          entry.classId === editor.classId &&
          entry.day === editor.day &&
          entry.periodId === editor.periodId
        ),
    );

    persistEntries([...withoutCurrent, nextEntry]);
    closeEditor();
    showMessage("success", `${editor.classLabel} scheduled in ${room.code} on ${editor.day}.`);
  };

  const removeSlot = () => {
    if (!editor?.entryId) return;
    persistEntries(entries.filter((entry) => entry.id !== editor.entryId));
    closeEditor();
    showMessage("success", "Period removed from timetable.");
  };

  if (!currentSchool) {
    return (
      <div className="surface-card flex min-h-[40vh] flex-col items-center justify-center p-8 text-center">
        <CalendarRange className="mb-3 h-10 w-10 text-slate-300" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">No school selected</h2>
        <p className="mt-1 text-sm text-slate-500">Select a school to manage timetables.</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <CalendarRange className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">No classes yet</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Create classes in Admin → Academics Config before building a timetable.
        </p>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <MapPin className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">No rooms available</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Add classrooms and labs in Admin → Resources before assigning them to the timetable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-xl border p-4 ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100"
              : "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-sm flex-1">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {readOnly ? "Your Class" : "Class"}
            </label>
            {readOnly && selectedClass ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50">
                {selectedClass.name}
              </div>
            ) : (
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span>
              Assigned periods:{" "}
              <strong className="text-slate-900 dark:text-slate-50">{classEntries.length}</strong>
            </span>
            <span>
              Rooms available:{" "}
              <strong className="text-slate-900 dark:text-slate-50">{resources.length}</strong>
            </span>
          </div>
        </div>

        {classAssignments.length === 0 && !readOnly && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            No subjects assigned to this class yet. Add subject-teacher assignments in Admin → Academics Config.
          </p>
        )}

        {classConflicts.length > 0 && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {classConflicts.length} room conflict(s) involve this class. Check Admin → Resources → Conflicts.
          </div>
        )}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                  Period
                </th>
                {TIMETABLE_DAYS.map((day) => (
                  <th
                    key={day}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIMETABLE_PERIODS.map((period) => (
                <tr key={period.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 align-top">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {period.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatTimeRange(period.startTime, period.endTime)}
                    </p>
                  </td>
                  {TIMETABLE_DAYS.map((day) => {
                    const entry = findEntryForSlot(entries, selectedClassId, day, period.id);
                    return (
                      <td key={`${day}-${period.id}`} className="px-3 py-3 align-top">
                        {entry ? (
                          <button
                            type="button"
                            onClick={() => openEditor(day, period.id)}
                            disabled={readOnly}
                            className={`w-full rounded-xl border p-3 text-left transition-colors ${
                              readOnly
                                ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40"
                                : "border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                            }`}
                          >
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                              {entry.subject}
                            </p>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                              {entry.teacher}
                            </p>
                            <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-blue-700 dark:bg-slate-800 dark:text-blue-300">
                              <MapPin className="h-3 w-3" />
                              {entry.roomCode}
                            </p>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditor(day, period.id)}
                            disabled={readOnly}
                            className={`flex min-h-[88px] w-full items-center justify-center rounded-xl border border-dashed px-3 py-4 text-sm transition-colors ${
                              readOnly
                                ? "border-slate-200 text-slate-400 dark:border-slate-700"
                                : "border-slate-300 text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                            }`}
                          >
                            {readOnly ? "Free" : (
                              <span className="inline-flex items-center gap-1">
                                <Plus className="h-4 w-4" />
                                Assign
                              </span>
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  Assign Period
                </h3>
                <p className="text-sm text-slate-500">
                  {editor.classLabel} • {editor.day} •{" "}
                  {formatTimeRange(
                    getPeriodById(editor.periodId)?.startTime ?? "",
                    getPeriodById(editor.periodId)?.endTime ?? "",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Subject
                </label>
                <select
                  value={editor.subject}
                  onChange={(event) => handleSubjectChange(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
                >
                  <option value="">Select subject</option>
                  {classAssignments.map((assignment) => (
                    <option key={assignment.subject} value={assignment.subject}>
                      {assignment.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Teacher
                </label>
                <input
                  type="text"
                  value={editor.teacher}
                  onChange={(event) => setEditor({ ...editor, teacher: event.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Room
                </label>
                <select
                  value={editor.roomId}
                  onChange={(event) => setEditor({ ...editor, roomId: event.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
                >
                  {resources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.code} — {resource.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
              {editor.entryId ? (
                <button
                  type="button"
                  onClick={removeSlot}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSlot}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Click any period cell to assign a subject, teacher, and room. Saved schedules appear
              automatically under Admin → Resources → Schedule.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
