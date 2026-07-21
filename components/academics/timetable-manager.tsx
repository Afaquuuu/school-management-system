"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  CalendarClock,
  CheckCircle,
  Clock,
  Coffee,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  createInsertedBreakPeriod,
  detectTimetableConflicts,
  findEntryForSlot,
  formatTimeRange,
  getPeriodNumber,
  getTimetablePeriodsForClass,
  isInsertedBreakPeriodId,
  loadBellTimes,
  loadClassAssignments,
  loadClassPeriodSettings,
  saveBellTimes,
  saveClassPeriodSettings,
  syncEntriesWithPeriodTimes,
  validatePeriodTimes,
  type BellTimeSettings,
  type ClassPeriodSettings,
  type ClassPeriodSettingsByClass,
  type ClassPeriodSlotSettings,
  loadSchoolResources,
  loadTimetableEntries,
  saveTimetableEntries,
  getClassIdsForTeacher,
  filterAssignmentsForTeacher,
  isSameTeacherName,
  isTeacherInChargeOfClass,
  TIMETABLE_DAYS,
  type ClassAssignment,
  type SchoolResource,
  type TimetableDay,
  type TimetableEntry,
  type TimetablePeriod,
} from "@/lib/timetable";
import { getSchoolClasses, useSchool, type SchoolClass } from "@/lib/school-context";
import {
  recordFormFieldInput,
  recordFormFieldInputAccent,
  recordFormFieldLabel,
} from "@/components/ui/record-form-layout";

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
  filterToTeacherName = "",
}: {
  readOnly?: boolean;
  initialClassId?: string;
  filterToTeacherName?: string;
}) {
  const { currentSchool } = useSchool();
  const isTeacherView = Boolean(filterToTeacherName.trim());
  const lockClassPicker = readOnly && Boolean(initialClassId);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [resources, setResources] = useState<SchoolResource[]>([]);
  const [assignmentsByClass, setAssignmentsByClass] = useState<Record<string, ClassAssignment[]>>({});
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [bellTimes, setBellTimes] = useState<Record<string, BellTimeSettings>>({});
  const [classPeriodSettings, setClassPeriodSettings] = useState<ClassPeriodSettingsByClass>({});
  const [selectedClassId, setSelectedClassId] = useState("");
  const [editor, setEditor] = useState<SlotEditorState | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!currentSchool) return;
    let schoolClasses = getSchoolClasses(currentSchool.id).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const assignments = loadClassAssignments(currentSchool.id);

    if (filterToTeacherName) {
      const teacherClassIds = new Set(getClassIdsForTeacher(assignments, filterToTeacherName));
      for (const cls of schoolClasses) {
        if (isTeacherInChargeOfClass(cls.id, assignments, filterToTeacherName)) {
          teacherClassIds.add(cls.id);
        }
      }
      schoolClasses = schoolClasses.filter((cls) => teacherClassIds.has(cls.id));
    } else if (readOnly && initialClassId) {
      schoolClasses = schoolClasses.filter((cls) => cls.id === initialClassId);
    }

    setClasses(schoolClasses);
    setResources(loadSchoolResources(currentSchool.id));
    setAssignmentsByClass(assignments);
    setEntries(loadTimetableEntries(currentSchool.id));
    setBellTimes(loadBellTimes(currentSchool.id));
    setClassPeriodSettings(loadClassPeriodSettings(currentSchool.id));
    if (schoolClasses.length > 0) {
      setSelectedClassId((current) => {
        if (lockClassPicker && initialClassId && schoolClasses.some((cls) => cls.id === initialClassId)) {
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
  }, [currentSchool, filterToTeacherName, initialClassId, lockClassPicker, readOnly]);

  const selectedClass = classes.find((cls) => cls.id === selectedClassId) ?? null;
  const classEntries = useMemo(() => {
    const entriesForClass = entries.filter((entry) => entry.classId === selectedClassId);
    if (!filterToTeacherName) return entriesForClass;
    return entriesForClass.filter((entry) =>
      isSameTeacherName(entry.teacher, filterToTeacherName),
    );
  }, [entries, filterToTeacherName, selectedClassId]);
  const classAssignments = assignmentsByClass[selectedClassId] ?? [];
  const visibleClassAssignments = useMemo(() => {
    if (!filterToTeacherName) return classAssignments;
    return filterAssignmentsForTeacher(classAssignments, filterToTeacherName);
  }, [classAssignments, filterToTeacherName]);
  const selectedClassSlots = classPeriodSettings[selectedClassId];
  const visiblePeriods = useMemo(
    () => {
      if (!currentSchool || !selectedClassId) return [];
      return getTimetablePeriodsForClass(
        currentSchool.id,
        selectedClassId,
        {
          subjectCount: classAssignments.length,
          scheduledPeriodNumbers: classEntries.map((entry) => getPeriodNumber(entry.periodId)),
        },
        {
          bellTimes,
          classSlotSettings: selectedClassSlots,
        },
      );
    },
    [
      currentSchool,
      selectedClassId,
      classAssignments.length,
      classEntries,
      bellTimes,
      selectedClassSlots,
    ],
  );
  const lessonPeriodCount = useMemo(
    () => visiblePeriods.filter((period) => period.kind === "lesson").length,
    [visiblePeriods],
  );
  const breakPeriodCount = useMemo(
    () => visiblePeriods.filter((period) => period.kind === "break").length,
    [visiblePeriods],
  );
  const weeklyPeriodTarget = useMemo(
    () => visibleClassAssignments.reduce((sum, assignment) => sum + assignment.periodsPerWeek, 0),
    [visibleClassAssignments],
  );
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

  const persistBellTimes = (
    nextBellTimes: Record<string, BellTimeSettings>,
    nextEntries = entries,
  ) => {
    if (!currentSchool) return;
    saveBellTimes(currentSchool.id, nextBellTimes);
    setBellTimes(nextBellTimes);

    const syncedEntries = nextEntries.map((entry) => {
      const classSlots = classPeriodSettings[entry.classId];
      const periods = getTimetablePeriodsForClass(
        currentSchool.id,
        entry.classId,
        {
          subjectCount: (assignmentsByClass[entry.classId] ?? []).length,
          scheduledPeriodNumbers: [getPeriodNumber(entry.periodId)],
        },
        { bellTimes: nextBellTimes, classSlotSettings: classSlots },
      );
      const period = periods.find((item) => item.id === entry.periodId);
      if (!period) return entry;
      return {
        ...entry,
        startTime: period.startTime,
        endTime: period.endTime,
      };
    });

    persistEntries(syncedEntries);
  };

  const persistClassSlots = (
    nextClassPeriodSettings: ClassPeriodSettingsByClass,
    nextEntries = entries,
  ) => {
    if (!currentSchool || !selectedClassId) return;
    saveClassPeriodSettings(currentSchool.id, nextClassPeriodSettings);
    setClassPeriodSettings(nextClassPeriodSettings);

    const classSlots = nextClassPeriodSettings[selectedClassId] ?? {};
    const updatedPeriods = getTimetablePeriodsForClass(
      currentSchool.id,
      selectedClassId,
      {
        subjectCount: classAssignments.length,
        scheduledPeriodNumbers: classEntries.map((entry) => getPeriodNumber(entry.periodId)),
      },
      { bellTimes, classSlotSettings: classSlots },
    );

    const otherEntries = nextEntries.filter((entry) => entry.classId !== selectedClassId);
    const syncedClassEntries = syncEntriesWithPeriodTimes(
      nextEntries.filter((entry) => entry.classId === selectedClassId),
      updatedPeriods,
    );
    persistEntries([...otherEntries, ...syncedClassEntries]);
  };

  const mergeClassSlotSettings = (
    periodId: string,
    patch: Partial<ClassPeriodSlotSettings>,
    currentPeriod?: TimetablePeriod,
  ): ClassPeriodSlotSettings => {
    const stored = selectedClassSlots?.[periodId];
    return {
      kind: patch.kind ?? stored?.kind ?? currentPeriod?.kind ?? "lesson",
      breakLabel: patch.breakLabel ?? stored?.breakLabel ?? currentPeriod?.breakLabel,
      startTime:
        patch.startTime ??
        stored?.startTime ??
        (isInsertedBreakPeriodId(periodId) ? currentPeriod?.startTime : undefined),
      endTime:
        patch.endTime ??
        stored?.endTime ??
        (isInsertedBreakPeriodId(periodId) ? currentPeriod?.endTime : undefined),
    };
  };

  const updateSelectedClassSlots = (
    updater: (current: ClassPeriodSettings) => ClassPeriodSettings,
    nextEntries = entries,
  ) => {
    const currentSlots = classPeriodSettings[selectedClassId] ?? {};
    persistClassSlots(
      {
        ...classPeriodSettings,
        [selectedClassId]: updater(currentSlots),
      },
      nextEntries,
    );
  };

  const updatePeriodTime = (
    periodId: string,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    if (!currentSchool || readOnly) return;

    const currentPeriod = visiblePeriods.find((period) => period.id === periodId);
    if (!currentPeriod) return;

    const nextStart = field === "startTime" ? value : currentPeriod.startTime;
    const nextEnd = field === "endTime" ? value : currentPeriod.endTime;

    if (nextStart === currentPeriod.startTime && nextEnd === currentPeriod.endTime) {
      return;
    }

    const validation = validatePeriodTimes(nextStart, nextEnd);

    if ("error" in validation) {
      showMessage("error", validation.error);
      return;
    }

    if (isInsertedBreakPeriodId(periodId)) {
      updateSelectedClassSlots((current) => ({
        ...current,
        [periodId]: mergeClassSlotSettings(
          periodId,
          { startTime: nextStart, endTime: nextEnd },
          currentPeriod,
        ),
      }));
      return;
    }

    persistBellTimes({
      ...bellTimes,
      [periodId]: { startTime: nextStart, endTime: nextEnd },
    });
  };

  const updatePeriodKind = (periodId: string, kind: "lesson" | "break") => {
    if (!currentSchool || readOnly || !selectedClassId) return;

    const currentPeriod = visiblePeriods.find((period) => period.id === periodId);
    if (!currentPeriod) return;

    const clearedEntries =
      kind === "break"
        ? entries.filter(
            (entry) => !(entry.classId === selectedClassId && entry.periodId === periodId),
          )
        : entries;

    updateSelectedClassSlots(
      (current) => ({
        ...current,
        [periodId]: mergeClassSlotSettings(
          periodId,
          {
            kind,
            breakLabel:
              kind === "break"
                ? (classPeriodSettings[selectedClassId]?.[periodId]?.breakLabel ??
                  currentPeriod.breakLabel ??
                  "Break")
                : undefined,
          },
          currentPeriod,
        ),
      }),
      clearedEntries,
    );

    if (kind === "break") {
      showMessage("success", "Period marked as break for this class only.");
    }
  };

  const updateBreakLabel = (periodId: string, breakLabel: string) => {
    if (!currentSchool || readOnly || !selectedClassId) return;

    const currentPeriod = visiblePeriods.find((period) => period.id === periodId);
    if (!currentPeriod) return;

    updateSelectedClassSlots((current) => ({
      ...current,
      [periodId]: mergeClassSlotSettings(periodId, { breakLabel, kind: "break" }, currentPeriod),
    }));
  };

  const addBreakRow = () => {
    if (!currentSchool || readOnly || !selectedClassId) return;

    const anchorPeriod = visiblePeriods[visiblePeriods.length - 1];
    const inserted = createInsertedBreakPeriod(
      selectedClassId,
      classPeriodSettings[selectedClassId] ?? {},
      anchorPeriod,
    );
    updateSelectedClassSlots((current) => ({
      ...current,
      [inserted.id]: inserted.settings,
    }));
    showMessage("success", "Break slot added for this class. Adjust its time in the first column.");
  };

  const removeBreakRow = (periodId: string) => {
    if (!currentSchool || readOnly || !selectedClassId || !isInsertedBreakPeriodId(periodId)) {
      return;
    }

    const clearedEntries = entries.filter(
      (entry) => !(entry.classId === selectedClassId && entry.periodId === periodId),
    );
    updateSelectedClassSlots((current) => {
      const next = { ...current };
      delete next[periodId];
      return next;
    }, clearedEntries);
    showMessage("success", "Break slot removed for this class.");
  };

  const openEditor = (day: TimetableDay, periodId: string) => {
    if (readOnly || !selectedClass) return;

    const period = visiblePeriods.find((item) => item.id === periodId);
    if (!period || period.kind === "break") return;

    const existing = findEntryForSlot(entries, selectedClass.id, day, periodId);

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

    const period = visiblePeriods.find((item) => item.id === editor.periodId);
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          {isTeacherView ? "No classes assigned yet" : "No classes yet"}
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          {isTeacherView
            ? "Your administrator has not assigned you to any classes yet. Contact the school office if this looks incorrect."
            : "Create classes in Admin → Academics Config before building a timetable."}
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
    <div className="space-y-4">
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

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
        <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600" />

        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Timetable
                </p>
                <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  {isTeacherView ? "My teaching schedule" : "Class schedule builder"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  {isTeacherView
                    ? "View your assigned periods, subjects, and room timings across your classes."
                    : "Assign subjects to each period and adjust your school bell times."}
                </p>
              </div>
            </div>

            <div className="w-full max-w-[220px]">
              <label className={recordFormFieldLabel}>
                {lockClassPicker ? "Your Class" : isTeacherView ? "Your Classes" : "Select Class"}
              </label>
              {lockClassPicker && selectedClass ? (
                <div className="rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50">
                  {selectedClass.name}
                </div>
              ) : (
                <select
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <StatChip label="Subjects" value={visibleClassAssignments.length} accent="blue" />
            <StatChip label="Lesson slots" value={lessonPeriodCount} accent="emerald" />
            <StatChip label="Breaks" value={breakPeriodCount} accent="amber" />
            <StatChip
              label="Scheduled"
              value={classEntries.length}
              suffix={weeklyPeriodTarget > 0 ? `/ ${weeklyPeriodTarget}` : undefined}
              accent="blue"
            />
            <StatChip label="Rooms" value={resources.length} accent="slate" />
          </div>

          {!readOnly && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addBreakRow}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm transition hover:border-amber-300 dark:border-amber-800 dark:from-amber-950/40 dark:to-orange-950/20 dark:text-amber-100"
              >
                <Coffee className="h-3.5 w-3.5" />
                Add break slot
              </button>
            </div>
          )}
        </div>

        {classAssignments.length === 0 && !readOnly && (
          <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            No subjects assigned to this class yet. Add subject-teacher assignments in Admin → Academics Config.
          </div>
        )}

        {classConflicts.length > 0 && (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {classConflicts.length} room conflict(s) involve this class. Check Admin → Resources → Conflicts.
          </div>
        )}

        {!readOnly && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 px-3 py-2 dark:border-blue-900/40 dark:from-blue-950/30 dark:to-indigo-950/20">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-blue-100 dark:bg-slate-900 dark:ring-blue-900/50">
              <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs leading-snug text-slate-600 dark:text-slate-300">
              Bell times apply to all classes. Lesson/break type is saved per class, so one class can
              have lunch while another keeps teaching in the same slot.
            </p>
          </div>
        )}

        <div className="mt-3 px-3 pb-3">
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100/50 shadow-inner dark:border-slate-700 dark:bg-slate-950/40">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-30 w-[220px] min-w-[220px] border-b border-r border-slate-200 bg-slate-100 px-2 py-2 text-left dark:border-slate-700 dark:bg-slate-900">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        Period & Time
                      </span>
                    </th>
                    {TIMETABLE_DAYS.map((day, dayIndex) => (
                      <th
                        key={day}
                        className="min-w-[118px] border-b border-slate-200 bg-slate-100 px-1.5 py-2 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="flex items-center justify-center">
                          <span
                            className={`inline-flex min-w-[68px] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                              dayIndex === 0
                                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                                : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600"
                            }`}
                          >
                            {day.slice(0, 3)}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visiblePeriods.map((period) => (
                    <tr key={period.id} className="group/row">
                      <td className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 align-top shadow-[4px_0_12px_-8px_rgba(15,23,42,0.25)] dark:border-slate-700 dark:bg-slate-900">
                        <PeriodTimeCell
                          period={period}
                          readOnly={readOnly}
                          onUpdate={updatePeriodTime}
                          onKindChange={updatePeriodKind}
                          onBreakLabelChange={updateBreakLabel}
                          onRemoveBreak={removeBreakRow}
                        />
                      </td>
                      {TIMETABLE_DAYS.map((day) => {
                        const slotEntry = findEntryForSlot(entries, selectedClassId, day, period.id);
                        const entry =
                          slotEntry &&
                          filterToTeacherName &&
                          !isSameTeacherName(slotEntry.teacher, filterToTeacherName)
                            ? undefined
                            : slotEntry;
                        return (
                          <td
                            key={`${day}-${period.id}`}
                            className={`border-b border-slate-200 px-1.5 py-1.5 align-top dark:border-slate-800 ${
                              period.kind === "break"
                                ? "bg-amber-50/40 dark:bg-amber-950/10"
                                : "bg-white dark:bg-slate-900/60"
                            }`}
                          >
                            {period.kind === "break" ? (
                              <BreakSlotCell label={period.label} />
                            ) : (
                              <ScheduleSlotCell
                                entry={entry}
                                readOnly={readOnly}
                                onClick={() => openEditor(day, period.id)}
                              />
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
        </div>
      </div>

      {editor && (
        <AssignPeriodModal
          editor={editor}
          classAssignments={classAssignments}
          resources={resources}
          visiblePeriods={visiblePeriods}
          onClose={closeEditor}
          onSave={saveSlot}
          onRemove={removeSlot}
          onSubjectChange={handleSubjectChange}
          onTeacherChange={(teacher) => setEditor((current) => (current ? { ...current, teacher } : current))}
          onRoomChange={(roomId) => setEditor((current) => (current ? { ...current, roomId } : current))}
        />
      )}

      {!readOnly && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          <div className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <p>
              Saved schedules sync automatically to <strong>Admin → Resources → Schedule</strong> and
              conflict checks run when rooms overlap.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDisplayTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function getPeriodDurationLabel(startTime: string, endTime: string): string {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const minutes = endH * 60 + endM - (startH * 60 + startM);
  if (minutes <= 0) return "";
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
}

function StatChip({
  label,
  value,
  suffix,
  accent = "blue",
}: {
  label: string;
  value: number;
  suffix?: string;
  accent?: "blue" | "amber" | "emerald" | "slate";
}) {
  const accentClass = {
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    slate: "bg-slate-400",
  }[accent];

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className={`absolute inset-y-0 left-0 w-1 ${accentClass}`} />
      <p className="pl-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 pl-1.5 text-base font-semibold tabular-nums text-slate-900 dark:text-slate-50">
        {value}
        {suffix && <span className="ml-1 text-xs font-medium text-slate-400">{suffix}</span>}
      </p>
    </div>
  );
}

function PeriodTimeCell({
  period,
  readOnly,
  onUpdate,
  onKindChange,
  onBreakLabelChange,
  onRemoveBreak,
}: {
  period: TimetablePeriod;
  readOnly: boolean;
  onUpdate: (periodId: string, field: "startTime" | "endTime", value: string) => void;
  onKindChange: (periodId: string, kind: "lesson" | "break") => void;
  onBreakLabelChange: (periodId: string, breakLabel: string) => void;
  onRemoveBreak: (periodId: string) => void;
}) {
  const periodNumber = getPeriodNumber(period.id);
  const isBreak = period.kind === "break";
  const isInsertedBreak = isInsertedBreakPeriodId(period.id);
  const duration = getPeriodDurationLabel(period.startTime, period.endTime);

  const cardClass = isBreak
    ? "border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/30 dark:border-amber-800/60 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/20"
    : "border-slate-200/90 bg-gradient-to-br from-white via-slate-50/40 to-blue-50/20 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20";

  if (readOnly) {
    return (
      <div className={`rounded-lg border p-2 shadow-sm ${cardClass}`}>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-sm ${
              isBreak ? "bg-amber-500" : "bg-blue-600"
            }`}
          >
            {isBreak ? <Coffee className="h-3 w-3" /> : periodNumber}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-50">{period.label}</p>
            {duration && (
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{duration}</p>
            )}
          </div>
        </div>
        <p className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md bg-white/80 px-2 py-1 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-800/80 dark:text-slate-200 dark:ring-slate-600">
          <Clock className="h-3 w-3 text-slate-400" />
          {formatDisplayTime(period.startTime)} – {formatDisplayTime(period.endTime)}
        </p>
      </div>
    );
  }

  const timeInputClass =
    "w-full rounded-md border border-slate-200 bg-white py-1 pl-7 pr-1 text-[11px] font-semibold tabular-nums text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-40 hover:[&::-webkit-calendar-picker-indicator]:opacity-70";

  return (
    <div className={`rounded-lg border p-2 shadow-sm ${cardClass}`}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-sm ${
              isBreak ? "bg-amber-500" : "bg-blue-600"
            }`}
          >
            {isBreak ? <Coffee className="h-3 w-3" /> : periodNumber || "•"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-50">{period.label}</p>
            {duration && (
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{duration}</p>
            )}
          </div>
        </div>
        {isInsertedBreak && (
          <button
            type="button"
            onClick={() => onRemoveBreak(period.id)}
            className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            aria-label="Remove break slot"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-0.5 rounded-lg border border-slate-200/80 bg-slate-100/90 p-0.5 dark:border-slate-600 dark:bg-slate-800/80">
        <button
          type="button"
          onClick={() => onKindChange(period.id, "lesson")}
          className={`rounded-md px-1.5 py-1 text-[10px] font-semibold transition ${
            !isBreak
              ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-blue-300 dark:ring-slate-600"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Lesson
        </button>
        <button
          type="button"
          onClick={() => onKindChange(period.id, "break")}
          className={`rounded-md px-1.5 py-1 text-[10px] font-semibold transition ${
            isBreak
              ? "bg-white text-amber-800 shadow-sm ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/60"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Break
        </button>
      </div>

      {isBreak && (
        <div className="mt-2">
          <input
            type="text"
            defaultValue={period.breakLabel ?? period.label}
            key={`${period.id}-label-${period.breakLabel ?? period.label}`}
            onBlur={(event) => onBreakLabelChange(period.id, event.target.value)}
            placeholder="Break name"
            className="w-full rounded-md border border-amber-200/80 bg-white/90 px-2 py-1 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 dark:border-amber-800 dark:bg-amber-950/20 dark:text-slate-50"
          />
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div>
          <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
            Start
          </label>
          <div className="relative">
            <Clock className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            <input
              type="time"
              defaultValue={period.startTime}
              key={`${period.id}-start-${period.startTime}`}
              onBlur={(event) => onUpdate(period.id, "startTime", event.target.value)}
              className={timeInputClass}
              aria-label={`${period.label} start time`}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
            End
          </label>
          <div className="relative">
            <Clock className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            <input
              type="time"
              defaultValue={period.endTime}
              key={`${period.id}-end-${period.endTime}`}
              onBlur={(event) => onUpdate(period.id, "endTime", event.target.value)}
              className={timeInputClass}
              aria-label={`${period.label} end time`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakSlotCell({ label }: { label: string }) {
  return (
    <div className="relative flex min-h-[72px] w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-dashed border-amber-300/70 bg-[repeating-linear-gradient(-45deg,transparent,transparent_6px,rgba(251,191,36,0.06)_6px,rgba(251,191,36,0.06)_12px)] px-2 py-2 dark:border-amber-800/50 dark:bg-amber-950/10">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-900/50 dark:text-amber-200 dark:ring-amber-800">
        <Coffee className="h-3 w-3" />
      </span>
      <span className="text-center text-[10px] font-semibold leading-tight text-amber-900 dark:text-amber-100">{label}</span>
    </div>
  );
}

function ScheduleSlotCell({
  entry,
  readOnly,
  onClick,
}: {
  entry: TimetableEntry | undefined;
  readOnly: boolean;
  onClick: () => void;
}) {
  if (entry) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={readOnly}
        className={`group relative w-full overflow-hidden rounded-lg border border-slate-200/90 bg-white p-2 text-left shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900 ${
          readOnly
            ? "cursor-default"
            : "hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:hover:border-blue-600"
        }`}
      >
        <div className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-gradient-to-b from-blue-500 to-indigo-600" />
        <p className="pl-2 text-xs font-semibold leading-snug text-slate-900 dark:text-slate-50">
          {entry.subject}
        </p>
        <p className="mt-0.5 pl-2 text-[10px] text-slate-500 dark:text-slate-400">{entry.teacher}</p>
        <p className="mt-1.5 inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
          <MapPin className="h-2.5 w-2.5" />
          {entry.roomCode}
        </p>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={readOnly}
      className={`group flex min-h-[72px] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-2 py-2 transition-all ${
        readOnly
          ? "cursor-default border-slate-200 bg-slate-50/50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/20"
          : "border-slate-200/90 bg-white text-slate-500 hover:border-blue-400 hover:bg-blue-50/80 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
      }`}
    >
      {readOnly ? (
        <span className="text-[10px] font-medium">Free</span>
      ) : (
        <>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-slate-200/80 transition group-hover:bg-blue-600 group-hover:text-white group-hover:ring-blue-500 dark:bg-slate-800 dark:ring-slate-600">
            <Plus className="h-3.5 w-3.5" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.06em]">Assign</span>
        </>
      )}
    </button>
  );
}

function AssignPeriodModal({
  editor,
  classAssignments,
  resources,
  visiblePeriods,
  onClose,
  onSave,
  onRemove,
  onSubjectChange,
  onTeacherChange,
  onRoomChange,
}: {
  editor: SlotEditorState;
  classAssignments: ClassAssignment[];
  resources: SchoolResource[];
  visiblePeriods: TimetablePeriod[];
  onClose: () => void;
  onSave: () => void;
  onRemove: () => void;
  onSubjectChange: (subject: string) => void;
  onTeacherChange: (teacher: string) => void;
  onRoomChange: (roomId: string) => void;
}) {
  const period = visiblePeriods.find((item) => item.id === editor.periodId);
  const fieldClass = `${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600" />

        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <CalendarRange className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Timetable
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Assign period
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {editor.classLabel} · {editor.day}
              </p>
              {period && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTimeRange(period.startTime, period.endTime)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto bg-slate-50/70 p-6 dark:bg-slate-950/40">
          <div>
            <label className={recordFormFieldLabel}>Subject *</label>
            <select
              value={editor.subject}
              onChange={(event) => onSubjectChange(event.target.value)}
              className={fieldClass}
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
            <label className={recordFormFieldLabel}>Teacher</label>
            <input
              type="text"
              value={editor.teacher}
              onChange={(event) => onTeacherChange(event.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={recordFormFieldLabel}>Room *</label>
            <select
              value={editor.roomId}
              onChange={(event) => onRoomChange(event.target.value)}
              className={fieldClass}
            >
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.code} — {resource.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900">
          {editor.entryId ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
              Remove slot
            </button>
          ) : (
            <span className="hidden sm:block" />
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
            >
              Save assignment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
