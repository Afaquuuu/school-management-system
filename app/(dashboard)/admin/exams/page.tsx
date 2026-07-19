"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Edit, Trash2, Calendar, X, BookOpen, Award, Target, FileText, Users, Clock, CheckCircle, ChevronDown } from "lucide-react";
import { useSchool, getScopedItem, setScopedItem, getSchoolClasses, type SchoolClass } from "@/lib/school-context";
import { getExamSubjects } from "@/lib/school-subjects";
import { addDaysToIsoDate, formatDate, getTodayIsoDate, isIsoDateAfter } from "@/lib/date-format";
import { DateInput } from "@/components/ui/date-input";
import { getClassNameWithoutSection, normalizeClassLabel, normalizeSection } from "@/lib/class-labels";
import { getUserSession } from "@/lib/teacher-check-in";
import {
  getClassesWhereTeacherIsInCharge,
  isSameTeacherName,
  loadClassAssignments,
  loadSchoolResources,
  type ClassAssignment,
  type SchoolResource,
} from "@/lib/timetable";

function getTeacherInChargeClassSections(
  schoolClasses: SchoolClass[],
  assignmentsByClass: Record<string, ClassAssignment[]>,
  teacherName: string,
): Array<{ className: string; section: string }> {
  if (!teacherName.trim()) return [];

  const fromAssignments = getClassesWhereTeacherIsInCharge(
    schoolClasses,
    assignmentsByClass,
    teacherName,
  );

  const fromClassRecord = schoolClasses.filter((cls) => {
    const inCharge = (cls.inCharge ?? "").trim();
    if (!inCharge || /^not assigned$/i.test(inCharge)) return false;
    return isSameTeacherName(inCharge, teacherName);
  });

  const merged = new Map<string, { className: string; section: string }>();
  for (const cls of [...fromAssignments, ...fromClassRecord]) {
    const className = getClassNameWithoutSection(cls.name, cls.section);
    const section = normalizeSection(cls.section);
    if (!className || !section) continue;
    merged.set(`${normalizeClassLabel(className)}::${section}`, { className, section });
  }

  return Array.from(merged.values()).sort((a, b) =>
    `${a.className} ${a.section}`.localeCompare(`${b.className} ${b.section}`),
  );
}

function isTeacherInChargeOfClassSection(
  schoolClasses: SchoolClass[],
  assignmentsByClass: Record<string, ClassAssignment[]>,
  teacherName: string,
  className: string,
  section: string,
): boolean {
  return getTeacherInChargeClassSections(schoolClasses, assignmentsByClass, teacherName).some(
    (entry) =>
      normalizeClassLabel(entry.className) === normalizeClassLabel(className) &&
      normalizeSection(entry.section) === normalizeSection(section),
  );
}

type ExamCycle = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "upcoming";
  description: string;
};

type ExamCycleStatus = ExamCycle["status"];

function normalizeExamCycleStatus(status: string | undefined): ExamCycleStatus {
  const value = String(status ?? "upcoming").trim().toLowerCase();
  if (value === "active" || value === "completed" || value === "upcoming") {
    return value;
  }
  return "upcoming";
}

function getEffectiveExamCycleStatus(
  cycle: Pick<ExamCycle, "status" | "startDate" | "endDate">,
  today = getTodayIsoDate(),
): ExamCycleStatus {
  const stored = normalizeExamCycleStatus(cycle.status);
  if (stored === "completed") return "completed";
  if (cycle.endDate && cycle.endDate < today) return "completed";
  return stored;
}

function isExamCycleClosed(
  cycle: Pick<ExamCycle, "status" | "startDate" | "endDate">,
  today = getTodayIsoDate(),
): boolean {
  return getEffectiveExamCycleStatus(cycle, today) === "completed";
}

function normalizeExamCycles(cycles: ExamCycle[], today = getTodayIsoDate()): ExamCycle[] {
  return cycles.map((cycle) => ({
    ...cycle,
    status: getEffectiveExamCycleStatus(cycle, today),
  }));
}

type Subject = {
  id: string;
  name: string;
  code: string;
  classes: string[];
};

type ExamSchedule = {
  id: string;
  cycleId: string;
  className: string;
  subjectId: string;
  examDate: string;
  examTime: string;
  duration: number;
  maxMarks: number;
  venue: string;
};

function parseExamTimeToMinutes(time: string): number | null {
  const trimmed = time.trim();
  if (!trimmed) return null;

  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hours = Number.parseInt(ampm[1], 10);
    const minutes = Number.parseInt(ampm[2], 10);
    const period = ampm[3].toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const twentyFour = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    return Number.parseInt(twentyFour[1], 10) * 60 + Number.parseInt(twentyFour[2], 10);
  }

  return null;
}

function examSchedulesOverlap(
  first: Pick<ExamSchedule, "examDate" | "examTime" | "duration">,
  second: Pick<ExamSchedule, "examDate" | "examTime" | "duration">,
): boolean {
  if (first.examDate !== second.examDate) return false;

  const firstStart = parseExamTimeToMinutes(first.examTime);
  const secondStart = parseExamTimeToMinutes(second.examTime);

  if (firstStart == null || secondStart == null) {
    return first.examTime.trim() === second.examTime.trim();
  }

  const firstEnd = firstStart + Math.max(first.duration || 0, 1);
  const secondEnd = secondStart + Math.max(second.duration || 0, 1);
  return firstStart < secondEnd && secondStart < firstEnd;
}

function normalizeVenueLabel(venue: string): string {
  return venue.trim().toLowerCase();
}

function venuesMatch(left: string, right: string): boolean {
  const a = normalizeVenueLabel(left);
  const b = normalizeVenueLabel(right);
  if (!a || !b) return false;
  if (a === b) return true;

  const aCode = a.split("—")[0]?.trim() || a.split("-")[0]?.trim() || a;
  const bCode = b.split("—")[0]?.trim() || b.split("-")[0]?.trim() || b;
  return Boolean(aCode && bCode && aCode === bCode);
}

function formatResourceVenueLabel(resource: { code: string; name: string }): string {
  return `${resource.code} — ${resource.name}`;
}

function findVenueConflict(
  candidate: Pick<ExamSchedule, "examDate" | "examTime" | "duration" | "venue">,
  schedules: ExamSchedule[],
  excludeId?: string,
): ExamSchedule | undefined {
  if (!candidate.venue.trim() || !candidate.examDate || !candidate.examTime) return undefined;

  return schedules.find(
    (schedule) =>
      schedule.id !== excludeId &&
      venuesMatch(schedule.venue, candidate.venue) &&
      examSchedulesOverlap(candidate, schedule),
  );
}

type Mark = {
  id: string;
  studentId: string;
  cycleId: string;
  className: string;
  section: string;
  subjectId: string;
  marksObtained: number;
  remarks: string;
  enteredBy: string;
  enteredAt: string;
};

const defaultSubjects: Subject[] = [];

export default function ExamsPage() {
  const { currentSchool } = useSchool();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ReturnType<typeof getUserSession>>(null);
  const [selectedTab, setSelectedTab] = useState<"cycles" | "schedule" | "marks">("cycles");
  const [cycles, setCycles] = useState<ExamCycle[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>(defaultSubjects);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [resources, setResources] = useState<SchoolResource[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [classAssignments, setClassAssignments] = useState<Record<string, ClassAssignment[]>>({});
  
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingCycle, setEditingCycle] = useState<ExamCycle | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ExamSchedule | null>(null);
  
  const [cycleForm, setCycleForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    status: "upcoming" as "active" | "completed" | "upcoming",
    description: "",
  });
  
  const [scheduleForm, setScheduleForm] = useState({
    cycleId: "",
    className: "",
    subjectId: "",
    examDate: "",
    examTime: "",
    duration: 60,
    maxMarks: 100,
    venue: "",
  });

  // Marks filter state
  const [marksFilter, setMarksFilter] = useState({
    cycleId: "",
    className: "",
    section: "",
    subjectId: "",
  });
  const [expandedScheduleGroups, setExpandedScheduleGroups] = useState<Record<string, boolean>>({});

  const toggleScheduleGroup = (cycleId: string, className: string) => {
    const key = `${cycleId}::${className}`;
    setExpandedScheduleGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    const userSession = getUserSession();
    setSession(userSession);

    const tabParam = searchParams.get("tab");
    if (tabParam === "cycles" || tabParam === "schedule" || tabParam === "marks") {
      setSelectedTab(tabParam);
    } else if (userSession?.role === "teacher") {
      setSelectedTab("marks");
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentSchool) {
      setSubjects(getExamSubjects(currentSchool.id));

      const storedCycles = getScopedItem(currentSchool.id, 'exam_cycles');
      const storedSchedules = getScopedItem(currentSchool.id, 'exam_schedules');
      const storedStudents = getScopedItem(currentSchool.id, 'school_students');
      const storedMarks = getScopedItem(currentSchool.id, 'exam_marks');
      
      if (storedCycles) {
        const parsed: ExamCycle[] = JSON.parse(storedCycles);
        const normalized = normalizeExamCycles(parsed);
        const changed = normalized.some(
          (cycle, index) => cycle.status !== getEffectiveExamCycleStatus(parsed[index]),
        );
        setCycles(normalized);
        if (changed) {
          setScopedItem(currentSchool.id, "exam_cycles", JSON.stringify(normalized));
        }
      }
      if (storedSchedules) setSchedules(JSON.parse(storedSchedules));
      if (storedStudents) setStudents(JSON.parse(storedStudents));
      if (storedMarks) setMarks(JSON.parse(storedMarks));
      setResources(loadSchoolResources(currentSchool.id));
      setSchoolClasses(getSchoolClasses(currentSchool.id));
      setClassAssignments(loadClassAssignments(currentSchool.id));
    }
  }, [currentSchool]);

  const isAdmin = session?.role === "admin";
  const isTeacher = session?.role === "teacher";
  const canManageExamSetup = isAdmin;
  const teacherName = session?.name?.trim() ?? "";

  const teacherInChargeClassSections = useMemo(
    () =>
      isTeacher
        ? getTeacherInChargeClassSections(schoolClasses, classAssignments, teacherName)
        : [],
    [isTeacher, schoolClasses, classAssignments, teacherName],
  );

  const saveCycles = (newCycles: ExamCycle[]) => {
    if (!currentSchool || !canManageExamSetup) return;
    const normalized = normalizeExamCycles(newCycles);
    setCycles(normalized);
    setScopedItem(currentSchool.id, "exam_cycles", JSON.stringify(normalized));
  };

  const saveSchedules = (newSchedules: ExamSchedule[]) => {
    if (!currentSchool || !canManageExamSetup) return;
    setSchedules(newSchedules);
    setScopedItem(currentSchool.id, 'exam_schedules', JSON.stringify(newSchedules));
  };

  const saveMarks = (newMarks: Mark[]) => {
    if (!currentSchool) return;
    setMarks(newMarks);
    setScopedItem(currentSchool.id, 'exam_marks', JSON.stringify(newMarks));
  };

  // Helper function to calculate grade from percentage
  const getGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
  };

  // Cycles available for scheduling and marks entry (exclude completed / past end date)
  const openCycles = useMemo(
    () => cycles.filter((cycle) => !isExamCycleClosed(cycle)),
    [cycles],
  );

  useEffect(() => {
    const selectedMarksCycle = cycles.find((cycle) => cycle.id === marksFilter.cycleId);
    if (selectedMarksCycle && isExamCycleClosed(selectedMarksCycle)) {
      setMarksFilter((prev) => ({
        ...prev,
        cycleId: "",
        className: "",
        section: "",
        subjectId: "",
      }));
    }
  }, [cycles, marksFilter.cycleId]);

  // Get unique sections from students
  const uniqueSections = useMemo(() => {
    if (!marksFilter.className) return [];
    const sections = new Set(
      students
        .filter(s => s.class === marksFilter.className)
        .map(s => s.section)
    );
    let list = Array.from(sections).sort();
    if (isTeacher) {
      const allowed = new Set(
        teacherInChargeClassSections
          .filter((entry) => normalizeClassLabel(entry.className) === normalizeClassLabel(marksFilter.className))
          .map((entry) => normalizeSection(entry.section)),
      );
      list = list.filter((section) => allowed.has(normalizeSection(section)));
    }
    return list;
  }, [students, marksFilter.className, isTeacher, teacherInChargeClassSections]);

  const canEditMarks = useMemo(() => {
    if (!isTeacher || !teacherName) return false;
    if (!marksFilter.className || !marksFilter.section) return false;
    return isTeacherInChargeOfClassSection(
      schoolClasses,
      classAssignments,
      teacherName,
      marksFilter.className,
      marksFilter.section,
    );
  }, [
    isTeacher,
    teacherName,
    marksFilter.className,
    marksFilter.section,
    schoolClasses,
    classAssignments,
  ]);

  // Get available subjects for marks entry (only scheduled subjects)
  const availableSubjectsForMarks = useMemo(() => {
    if (!marksFilter.cycleId || !marksFilter.className) return [];
    
    const scheduledSubjectIds = schedules
      .filter(s => s.cycleId === marksFilter.cycleId && s.className === marksFilter.className)
      .map(s => s.subjectId);
    
    return subjects.filter(s => scheduledSubjectIds.includes(s.id));
  }, [schedules, subjects, marksFilter.cycleId, marksFilter.className]);

  // Get filtered students for marks entry
  const filteredStudentsForMarks = useMemo(() => {
    if (!marksFilter.className || !marksFilter.section) return [];
    
    return students
      .filter(s => s.class === marksFilter.className && s.section === marksFilter.section)
      .sort((a, b) => {
        const rollA = a.rollNumber || '';
        const rollB = b.rollNumber || '';
        return rollA.localeCompare(rollB);
      });
  }, [students, marksFilter.className, marksFilter.section]);

  // Get selected schedule for max marks
  const selectedSchedule = useMemo(() => {
    if (!marksFilter.cycleId || !marksFilter.className || !marksFilter.subjectId) return null;
    
    return schedules.find(
      s => s.cycleId === marksFilter.cycleId && 
           s.className === marksFilter.className && 
           s.subjectId === marksFilter.subjectId
    );
  }, [schedules, marksFilter.cycleId, marksFilter.className, marksFilter.subjectId]);

  // Get student marks for current filter
  const studentMarks = useMemo(() => {
    if (!marksFilter.cycleId || !marksFilter.className || !marksFilter.section || !marksFilter.subjectId) {
      return [];
    }
    
    return marks.filter(
      m => m.cycleId === marksFilter.cycleId && 
           m.className === marksFilter.className && 
           m.section === marksFilter.section && 
           m.subjectId === marksFilter.subjectId
    );
  }, [marks, marksFilter]);

  // Update student marks
  const updateStudentMarks = (studentId: string, field: 'marksObtained' | 'remarks', value: number | string) => {
    if (!canEditMarks) return;

    const existingMarkIndex = marks.findIndex(
      m => m.studentId === studentId && 
           m.cycleId === marksFilter.cycleId && 
           m.className === marksFilter.className && 
           m.section === marksFilter.section && 
           m.subjectId === marksFilter.subjectId
    );

    const newMarks = [...marks];
    
    if (existingMarkIndex >= 0) {
      // Update existing mark
      newMarks[existingMarkIndex] = {
        ...newMarks[existingMarkIndex],
        [field]: value,
        enteredBy: teacherName || newMarks[existingMarkIndex].enteredBy,
        enteredAt: new Date().toISOString(),
      };
    } else {
      // Create new mark entry
      const newMark: Mark = {
        id: Date.now().toString() + '-' + studentId,
        studentId,
        cycleId: marksFilter.cycleId,
        className: marksFilter.className,
        section: marksFilter.section,
        subjectId: marksFilter.subjectId,
        marksObtained: field === 'marksObtained' ? (value as number) : 0,
        remarks: field === 'remarks' ? (value as string) : '',
        enteredBy: teacherName || 'Class In-charge',
        enteredAt: new Date().toISOString(),
      };
      newMarks.push(newMark);
    }
    
    saveMarks(newMarks);
  };

  // Save all marks
  const handleSaveMarks = () => {
    if (!canEditMarks) {
      alert('Only the class in-charge teacher can enter or update exam marks.');
      return;
    }
    alert('All marks have been saved successfully!');
  };

  const handleSaveCycle = () => {
    if (!cycleForm.name || !cycleForm.startDate || !cycleForm.endDate) {
      alert("Please fill in all required fields");
      return;
    }

    if (!isIsoDateAfter(cycleForm.endDate, cycleForm.startDate)) {
      alert("End date must be after the start date.");
      return;
    }

    if (editingCycle) {
      saveCycles(cycles.map(c => c.id === editingCycle.id ? { ...editingCycle, ...cycleForm, status: normalizeExamCycleStatus(cycleForm.status) } : c));
    } else {
      const newCycle: ExamCycle = {
        id: Date.now().toString(),
        ...cycleForm,
        status: normalizeExamCycleStatus(cycleForm.status),
      };
      saveCycles([...cycles, newCycle]);
    }

    setShowCycleModal(false);
    setEditingCycle(null);
    setCycleForm({ name: "", startDate: "", endDate: "", status: "upcoming", description: "" });
  };

  const handleDeleteCycle = (id: string) => {
    if (confirm("Delete this cycle? All exam schedules will also be deleted.")) {
      saveCycles(cycles.filter(c => c.id !== id));
      saveSchedules(schedules.filter(s => s.cycleId !== id));
    }
  };

  const handleEditCycle = (cycle: ExamCycle) => {
    setEditingCycle(cycle);
    setCycleForm({
      name: cycle.name,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      status: cycle.status,
      description: cycle.description,
    });
    setShowCycleModal(true);
  };

  const handleSaveSchedule = () => {
    if (!scheduleForm.cycleId || !scheduleForm.className || !scheduleForm.subjectId || !scheduleForm.examDate) {
      alert("Please fill in all required fields");
      return;
    }

    // Check for duplicate subject in same cycle and class (only when creating new)
    if (!editingSchedule) {
      const duplicate = schedules.find(
        s => s.cycleId === scheduleForm.cycleId && 
             s.className === scheduleForm.className && 
             s.subjectId === scheduleForm.subjectId
      );
      if (duplicate) {
        const subject = subjects.find(s => s.id === scheduleForm.subjectId);
        alert(`${subject?.name || 'This subject'} is already scheduled for ${scheduleForm.className} in this cycle.`);
        return;
      }
    }

    // Validate exam date is within cycle date range
    const selectedCycle = cycles.find(c => c.id === scheduleForm.cycleId);
    if (selectedCycle && isExamCycleClosed(selectedCycle)) {
      alert("Cannot schedule exams for a completed cycle.");
      return;
    }

    if (selectedCycle) {
      const examDate = new Date(scheduleForm.examDate);
      const startDate = new Date(selectedCycle.startDate);
      const endDate = new Date(selectedCycle.endDate);
      
      if (examDate < startDate || examDate > endDate) {
        alert(`Exam date must be between ${formatDate(selectedCycle.startDate)} and ${formatDate(selectedCycle.endDate)} for ${selectedCycle.name}`);
        return;
      }
    }

    if (!scheduleForm.venue.trim()) {
      alert("Please select a venue (room) from Resources.");
      return;
    }

    if (!scheduleForm.examTime.trim()) {
      alert("Please select an exam time before assigning a venue.");
      return;
    }

    const venueConflict = findVenueConflict(
      scheduleForm,
      schedules,
      editingSchedule?.id,
    );
    if (venueConflict) {
      const conflictSubject = subjects.find((subject) => subject.id === venueConflict.subjectId);
      alert(
        `${scheduleForm.venue} is already booked for ${venueConflict.className}` +
          `${conflictSubject ? ` (${conflictSubject.name})` : ""} on ${formatDate(venueConflict.examDate)} at ${venueConflict.examTime}. Choose another room or time.`,
      );
      return;
    }

    if (editingSchedule) {
      saveSchedules(schedules.map(s => s.id === editingSchedule.id ? { ...editingSchedule, ...scheduleForm } : s));
    } else {
      const newSchedule: ExamSchedule = {
        id: Date.now().toString(),
        ...scheduleForm,
      };
      saveSchedules([...schedules, newSchedule]);
    }

    setShowScheduleModal(false);
    setEditingSchedule(null);
    setScheduleForm({ cycleId: "", className: "", subjectId: "", examDate: "", examTime: "", duration: 60, maxMarks: 100, venue: "" });
  };

  const handleDeleteSchedule = (id: string) => {
    if (confirm("Delete this exam schedule?")) {
      saveSchedules(schedules.filter(s => s.id !== id));
    }
  };

  const handleEditSchedule = (schedule: ExamSchedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      cycleId: schedule.cycleId,
      className: schedule.className,
      subjectId: schedule.subjectId,
      examDate: schedule.examDate,
      examTime: schedule.examTime,
      duration: schedule.duration,
      maxMarks: schedule.maxMarks,
      venue: schedule.venue,
    });
    setShowScheduleModal(true);
  };

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.class));
    return Array.from(classes).sort();
  }, [students]);

  const venueRoomOptions = useMemo(() => {
    const typedRooms = resources.filter(
      (resource) =>
        resource.available !== false &&
        /classroom|lab|facility|room|hall/i.test(resource.type || ""),
    );
    const pool =
      typedRooms.length > 0
        ? typedRooms
        : resources.filter((resource) => resource.available !== false);

    return [...pool].sort((a, b) => a.code.localeCompare(b.code));
  }, [resources]);

  const availableVenueOptions = useMemo(() => {
    if (!scheduleForm.examDate || !scheduleForm.examTime) {
      return venueRoomOptions;
    }

    return venueRoomOptions.filter((resource) => {
      const label = formatResourceVenueLabel(resource);
      const conflict = findVenueConflict(
        {
          examDate: scheduleForm.examDate,
          examTime: scheduleForm.examTime,
          duration: scheduleForm.duration || 60,
          venue: label,
        },
        schedules,
        editingSchedule?.id,
      );
      return !conflict;
    });
  }, [
    venueRoomOptions,
    scheduleForm.examDate,
    scheduleForm.examTime,
    scheduleForm.duration,
    schedules,
    editingSchedule?.id,
  ]);

  const venueSelectOptions = useMemo(() => {
    const options = availableVenueOptions.map((resource) => formatResourceVenueLabel(resource));
    if (
      scheduleForm.venue &&
      !options.some((option) => venuesMatch(option, scheduleForm.venue))
    ) {
      return [scheduleForm.venue, ...options];
    }
    return options;
  }, [availableVenueOptions, scheduleForm.venue]);

  useEffect(() => {
    if (!scheduleForm.venue || !scheduleForm.examDate || !scheduleForm.examTime) return;

    const stillAvailable = availableVenueOptions.some((resource) =>
      venuesMatch(formatResourceVenueLabel(resource), scheduleForm.venue),
    );
    if (!stillAvailable && !editingSchedule) {
      setScheduleForm((current) => ({ ...current, venue: "" }));
    }
  }, [
    availableVenueOptions,
    scheduleForm.venue,
    scheduleForm.examDate,
    scheduleForm.examTime,
    editingSchedule,
  ]);

  // Get classes that have scheduled exams for the selected cycle (for marks entry)
  const classesForMarksEntry = useMemo(() => {
    if (!marksFilter.cycleId) return [];
    
    const scheduledClasses = new Set(
      schedules
        .filter(s => s.cycleId === marksFilter.cycleId)
        .map(s => s.className)
    );
    
    let list = Array.from(scheduledClasses).sort();
    if (isTeacher) {
      const allowed = new Set(
        teacherInChargeClassSections.map((entry) => normalizeClassLabel(entry.className)),
      );
      list = list.filter((className) => allowed.has(normalizeClassLabel(className)));
    }
    return list;
  }, [schedules, marksFilter.cycleId, isTeacher, teacherInChargeClassSections]);

  useEffect(() => {
    if (!isTeacher || teacherInChargeClassSections.length === 0) return;
    if (marksFilter.className && marksFilter.section) return;

    const preferred = teacherInChargeClassSections[0];
    setMarksFilter((prev) => ({
      ...prev,
      className: prev.className || preferred.className,
      section: prev.section || preferred.section,
    }));
  }, [isTeacher, teacherInChargeClassSections, marksFilter.className, marksFilter.section]);

  const stats = useMemo(() => ({
    totalCycles: cycles.length,
    activeCycles: cycles.filter(c => c.status === 'active').length,
    totalSchedules: schedules.length,
    upcomingExams: schedules.filter(s => new Date(s.examDate) > new Date()).length,
  }), [cycles, schedules]);

  const groupedSchedules = useMemo(() => {
    const grouped: Record<string, ExamSchedule[]> = {};
    schedules.forEach(schedule => {
      const key = schedule.cycleId + '-' + schedule.className;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(schedule);
    });
    return grouped;
  }, [schedules]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 -m-6 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Exam Management</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 ml-14">
            {isAdmin
              ? "Create exam cycles, schedule exams, and view marks entered by class in-charge teachers"
              : "Enter exam marks for your in-charge class, or view scheduled exams"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase">Total Cycles</span>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.totalCycles}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase">Active Cycles</span>
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.activeCycles}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase">Scheduled Exams</span>
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.totalSchedules}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase">Upcoming</span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.upcomingExams}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2">
          <div className="flex gap-2">
            {(["cycles", "schedule", "marks"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={'flex-1 px-4 py-3 font-semibold rounded-xl transition-all ' + (
                  selectedTab === tab
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {selectedTab === "cycles" && (
          <div className="space-y-4">
            {canManageExamSetup && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setEditingCycle(null);
                  setCycleForm({ name: "", startDate: "", endDate: "", status: "upcoming", description: "" });
                  setShowCycleModal(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl transition-all font-medium shadow-lg shadow-blue-500/30"
              >
                <Plus className="w-4 h-4" />
                New Term / Assessment
              </button>
            </div>
            )}

            {cycles.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No exam cycles yet</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">Create your first term or assessment cycle</p>
                {canManageExamSetup && (
                <button
                  onClick={() => setShowCycleModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Cycle
                </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {cycles.map((cycle) => {
                  const cycleStatus = getEffectiveExamCycleStatus(cycle);
                  return (
                  <div
                    key={cycle.id}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">{cycle.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(cycle.startDate)} → {formatDate(cycle.endDate)}
                        </div>
                        {cycle.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{cycle.description}</p>
                        )}
                      </div>
                      <span
                        className={'px-4 py-1.5 rounded-full text-xs font-bold ' + (
                          cycleStatus === "active"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : cycleStatus === "upcoming"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {cycleStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {schedules.filter(s => s.cycleId === cycle.id).length} exams scheduled
                      </p>
                      {canManageExamSetup && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCycle(cycle)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteCycle(cycle.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedTab === "schedule" && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ℹ️ Schedule exams by selecting a cycle, class, subject, date and time. Each subject can have multiple exams.
              </p>
            </div>

            {canManageExamSetup && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (cycles.length === 0) {
                    alert("Please create an exam cycle first");
                    return;
                  }
                  if (uniqueClasses.length === 0) {
                    alert("No classes found. Please add students first.");
                    return;
                  }
                  setEditingSchedule(null);
                  setScheduleForm({ cycleId: "", className: "", subjectId: "", examDate: "", examTime: "", duration: 60, maxMarks: 100, venue: "" });
                  setShowScheduleModal(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-5 py-2.5 rounded-xl transition-all font-medium shadow-lg shadow-emerald-500/30"
              >
                <Plus className="w-4 h-4" />
                Schedule Exam
              </button>
            </div>
            )}

            {schedules.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No exams scheduled yet</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">Schedule exams for your classes</p>
                {cycles.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">Please create an exam cycle first</p>
                ) : uniqueClasses.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">Please add students first</p>
                ) : canManageExamSetup ? (
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Schedule Exam
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-6">
                {cycles.map(cycle => {
                  const cycleSchedules = schedules.filter(s => s.cycleId === cycle.id);
                  if (cycleSchedules.length === 0) return null;

                  return (
                    <div key={cycle.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">{cycle.name}</h3>
                      
                      {uniqueClasses.map(className => {
                        const classSchedules = cycleSchedules.filter(s => s.className === className);
                        if (classSchedules.length === 0) return null;

                        return (
                          <div key={className} className="mb-4 last:mb-0">
                            <button
                              type="button"
                              onClick={() => toggleScheduleGroup(cycle.id, className)}
                              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700/50 dark:hover:bg-slate-700"
                            >
                              <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-purple-600" />
                                <h4 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                                  {className}
                                </h4>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  ({classSchedules.length} exam{classSchedules.length === 1 ? "" : "s"})
                                </span>
                              </div>
                              <ChevronDown
                                className={`h-5 w-5 text-slate-500 transition-transform ${
                                  expandedScheduleGroups[`${cycle.id}::${className}`]
                                    ? "rotate-180"
                                    : ""
                                }`}
                              />
                            </button>

                            {expandedScheduleGroups[`${cycle.id}::${className}`] && (
                            <div className="mt-3 grid gap-3">
                              {classSchedules.map(schedule => {
                                const subject = subjects.find(s => s.id === schedule.subjectId);
                                const examDate = new Date(schedule.examDate);
                                const isPast = examDate < new Date();
                                
                                return (
                                  <div key={schedule.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-bold">
                                          {subject?.name || 'Unknown Subject'}
                                        </span>
                                        {isPast && (
                                          <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded text-xs font-semibold">
                                            COMPLETED
                                          </span>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                        <div>
                                          <p className="text-slate-500 dark:text-slate-400">Date</p>
                                          <p className="font-semibold text-slate-900 dark:text-slate-50">
                                            {formatDate(examDate)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500 dark:text-slate-400">Time</p>
                                          <p className="font-semibold text-slate-900 dark:text-slate-50">
                                            {schedule.examTime || 'Not set'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500 dark:text-slate-400">Duration</p>
                                          <p className="font-semibold text-slate-900 dark:text-slate-50">
                                            {schedule.duration} min
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500 dark:text-slate-400">Max Marks</p>
                                          <p className="font-semibold text-slate-900 dark:text-slate-50">
                                            {schedule.maxMarks}
                                          </p>
                                        </div>
                                      </div>
                                      {schedule.venue && (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                                          Venue: {schedule.venue}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                      {canManageExamSetup && (
                                        <>
                                      <button
                                        onClick={() => handleEditSchedule(schedule)}
                                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                      >
                                        <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSchedule(schedule.id)}
                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                      </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedTab === "marks" && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {isAdmin
                  ? "View-only: exam marks are entered by the class in-charge teacher. Select cycle, class, section, and subject to review results."
                  : canEditMarks
                    ? "You are the class in-charge for this selection. Enter marks for students — changes save automatically."
                    : isTeacher && teacherInChargeClassSections.length === 0
                      ? "You are not assigned as class in-charge for any class. Ask the principal to set you as lead teacher for your class before entering marks."
                      : "Select your in-charge class, section, and subject to enter marks. Only class in-charge teachers can edit marks."}
              </p>
            </div>

            {/* Debug Info */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
              <details className="cursor-pointer">
                <summary className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  Debug Info (Click to expand)
                </summary>
                <div className="space-y-2 text-xs font-mono text-amber-900 dark:text-amber-100">
                  <p>• Cycles: {cycles.length} - {cycles.map(c => c.name).join(', ')}</p>
                  <p>• Students: {students.length}</p>
                  <p>• Schedules: {schedules.length}</p>
                  <p>• Marks: {marks.length}</p>
                  {marksFilter.cycleId && (
                    <p>• Classes with exams in selected cycle: [{classesForMarksEntry.join(', ') || 'none'}]</p>
                  )}
                  {marksFilter.className && (
                    <>
                      <p>• Sections for {marksFilter.className}: [{uniqueSections.join(', ') || 'none found'}]</p>
                      <p>• Students in {marksFilter.className}: {students.filter(s => s.class === marksFilter.className).length}</p>
                      <p>• Student sections: {JSON.stringify(
                        students
                          .filter(s => s.class === marksFilter.className)
                          .map(s => `${s.firstName} ${s.lastName}: section="${s.section}"`)
                      )}</p>
                    </>
                  )}
                  {marksFilter.cycleId && marksFilter.className && (
                    <p>• Available Subjects: {availableSubjectsForMarks.map(s => s.name).join(', ') || 'none'}</p>
                  )}
                </div>
              </details>
            </div>

            {/* Selection Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Select Exam Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Exam Cycle</label>
                  <select
                    value={marksFilter.cycleId}
                    onChange={(e) => setMarksFilter({...marksFilter, cycleId: e.target.value, className: "", section: "", subjectId: ""})}
                    className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
                  >
                    <option value="">Select Cycle</option>
                    {openCycles.map(cycle => (
                      <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Class</label>
                  <select
                    value={marksFilter.className}
                    onChange={(e) => setMarksFilter({...marksFilter, className: e.target.value, section: "", subjectId: ""})}
                    disabled={!marksFilter.cycleId}
                    className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 disabled:opacity-50"
                  >
                    <option value="">Select Class</option>
                    {classesForMarksEntry.map(className => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                  {marksFilter.cycleId && classesForMarksEntry.length === 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      No classes have scheduled exams in this cycle
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Section</label>
                  <select
                    value={marksFilter.section}
                    onChange={(e) => setMarksFilter({...marksFilter, section: e.target.value, subjectId: ""})}
                    disabled={!marksFilter.className}
                    className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 disabled:opacity-50"
                  >
                    <option value="">Select Section</option>
                    {uniqueSections.map(section => (
                      <option key={section} value={section}>Section {section}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Subject</label>
                  <select
                    value={marksFilter.subjectId}
                    onChange={(e) => setMarksFilter({...marksFilter, subjectId: e.target.value})}
                    disabled={!marksFilter.section}
                    className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 disabled:opacity-50"
                  >
                    <option value="">Select Subject</option>
                    {availableSubjectsForMarks.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Marks Entry Table */}
            {marksFilter.cycleId && marksFilter.className && marksFilter.section && marksFilter.subjectId ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                        {subjects.find(s => s.id === marksFilter.subjectId)?.name} - {marksFilter.className} Section {marksFilter.section}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {cycles.find(c => c.id === marksFilter.cycleId)?.name} • Max Marks: {selectedSchedule?.maxMarks || 100}
                        {isAdmin ? " • View only" : canEditMarks ? " • Editable by class in-charge" : " • View only"}
                      </p>
                    </div>
                    {canEditMarks && (
                    <button
                      onClick={handleSaveMarks}
                      className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-5 py-2.5 rounded-xl transition-all font-medium shadow-lg shadow-green-500/30"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Save All Marks
                    </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Roll No</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Student Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Marks Obtained</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Grade</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredStudentsForMarks.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-600 dark:text-slate-400">No students found in {marksFilter.className} Section {marksFilter.section}</p>
                          </td>
                        </tr>
                      ) : (
                        filteredStudentsForMarks.map((student, index) => {
                          const studentMark = studentMarks.find(m => m.studentId === student.id);
                          const marksObtained = studentMark?.marksObtained || 0;
                          const maxMarks = selectedSchedule?.maxMarks || 100;
                          const percentage = maxMarks > 0 ? (marksObtained / maxMarks) * 100 : 0;
                          const grade = getGrade(percentage);
                          
                          return (
                            <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  {student.rollNumber || String(index + 1).padStart(2, '0')}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {student.firstName[0]}{student.lastName[0]}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 dark:text-slate-50">
                                      {student.firstName} {student.lastName}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{student.studentId}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {canEditMarks ? (
                                    <input
                                      type="number"
                                      value={marksObtained}
                                      onChange={(e) => updateStudentMarks(student.id, 'marksObtained', parseFloat(e.target.value) || 0)}
                                      min="0"
                                      max={maxMarks}
                                      className="w-24 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 font-semibold text-center"
                                    />
                                  ) : (
                                    <span className="w-24 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-900 dark:text-slate-50 font-semibold text-center inline-block">
                                      {marksObtained}
                                    </span>
                                  )}
                                  <span className="text-slate-600 dark:text-slate-400">/ {maxMarks}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={'px-3 py-1 rounded-full text-xs font-bold ' + (
                                  grade === 'A+' || grade === 'A' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                  grade === 'B+' || grade === 'B' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                  grade === 'C+' || grade === 'C' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                )}>
                                  {grade} ({percentage.toFixed(1)}%)
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {canEditMarks ? (
                                  <input
                                    type="text"
                                    value={studentMark?.remarks || ''}
                                    onChange={(e) => updateStudentMarks(student.id, 'remarks', e.target.value)}
                                    placeholder="Optional remarks"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 text-sm"
                                  />
                                ) : (
                                  <span className="text-sm text-slate-700 dark:text-slate-300">
                                    {studentMark?.remarks?.trim() ? studentMark.remarks : "—"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredStudentsForMarks.length > 0 && (
                  <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Students</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{filteredStudentsForMarks.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Average Marks</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {(studentMarks.reduce((sum, m) => sum + m.marksObtained, 0) / Math.max(studentMarks.length, 1)).toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Highest</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {Math.max(...studentMarks.map(m => m.marksObtained), 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Lowest</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {studentMarks.length > 0 ? Math.min(...studentMarks.map(m => m.marksObtained)) : 0}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">Select Exam Details</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {isAdmin
                    ? "Choose cycle, class, section, and subject to view marks"
                    : "Choose cycle, class, section, and subject to enter marks"}
                </p>
              </div>
            )}
          </div>
        )}

        {showCycleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {editingCycle ? 'Edit Cycle' : 'New Exam Cycle'}
                </h3>
                <button onClick={() => setShowCycleModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={cycleForm.name}
                    onChange={(e) => setCycleForm({...cycleForm, name: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
                    placeholder="e.g., First Term 2025/2026"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Start Date *</label>
                    <DateInput
                      value={cycleForm.startDate}
                      onChange={(startDate) =>
                        setCycleForm((prev) => ({
                          ...prev,
                          startDate,
                          endDate:
                            prev.endDate && !isIsoDateAfter(prev.endDate, startDate)
                              ? ""
                              : prev.endDate,
                        }))
                      }
                      max={
                        cycleForm.endDate
                          ? addDaysToIsoDate(cycleForm.endDate, -1) ?? undefined
                          : undefined
                      }
                      className="rounded-xl border-2 border-slate-200 px-4 py-3 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">End Date *</label>
                    <DateInput
                      value={cycleForm.endDate}
                      onChange={(endDate) => setCycleForm({ ...cycleForm, endDate })}
                      min={
                        cycleForm.startDate
                          ? addDaysToIsoDate(cycleForm.startDate, 1) ?? undefined
                          : undefined
                      }
                      className="rounded-xl border-2 border-slate-200 px-4 py-3 dark:border-slate-600"
                    />
                    {cycleForm.startDate && (
                      <p className="mt-1 text-xs text-slate-500">
                        Must be after {formatDate(cycleForm.startDate)}.
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Status</label>
                  <select
                    value={cycleForm.status}
                    onChange={(e) => setCycleForm({...cycleForm, status: e.target.value as any})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={cycleForm.description}
                    onChange={(e) => setCycleForm({...cycleForm, description: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                <button
                  onClick={handleSaveCycle}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold"
                >
                  {editingCycle ? 'Update' : 'Create'} Cycle
                </button>
                <button
                  onClick={() => setShowCycleModal(false)}
                  className="px-6 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {editingSchedule ? 'Edit Exam Schedule' : 'Schedule New Exam'}
                </h3>
                <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Exam Cycle *</label>
                  <select
                    value={scheduleForm.cycleId}
                    onChange={(e) => setScheduleForm({...scheduleForm, cycleId: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
                  >
                    <option value="">Select Cycle</option>
                    {openCycles.map(cycle => (
                      <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Class *</label>
                  <select
                    value={scheduleForm.className}
                    onChange={(e) => setScheduleForm({...scheduleForm, className: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
                  >
                    <option value="">Select Class</option>
                    {uniqueClasses.map(className => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Subject *</label>
                  <select
                    value={scheduleForm.subjectId}
                    onChange={(e) => setScheduleForm({...scheduleForm, subjectId: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
                  >
                    <option value="">Select Subject</option>
                    {subjects
                      .filter(s => !scheduleForm.className || s.classes.includes(scheduleForm.className))
                      .filter(subject => {
                        // When editing, allow the current subject
                        if (editingSchedule && editingSchedule.subjectId === subject.id) {
                          return true;
                        }
                        // Filter out subjects already scheduled for this cycle and class
                        const alreadyScheduled = schedules.some(
                          schedule => 
                            schedule.cycleId === scheduleForm.cycleId && 
                            schedule.className === scheduleForm.className && 
                            schedule.subjectId === subject.id
                        );
                        return !alreadyScheduled;
                      })
                      .map(subject => (
                        <option key={subject.id} value={subject.id}>{subject.name} ({subject.code})</option>
                      ))}
                  </select>
                  {scheduleForm.cycleId && scheduleForm.className && subjects
                    .filter(s => s.classes.includes(scheduleForm.className))
                    .filter(subject => {
                      if (editingSchedule && editingSchedule.subjectId === subject.id) return false;
                      return schedules.some(
                        schedule => 
                          schedule.cycleId === scheduleForm.cycleId && 
                          schedule.className === scheduleForm.className && 
                          schedule.subjectId === subject.id
                      );
                    }).length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {subjects
                        .filter(s => s.classes.includes(scheduleForm.className))
                        .filter(subject => {
                          if (editingSchedule && editingSchedule.subjectId === subject.id) return false;
                          return schedules.some(
                            schedule => 
                              schedule.cycleId === scheduleForm.cycleId && 
                              schedule.className === scheduleForm.className && 
                              schedule.subjectId === subject.id
                          );
                        }).length} subject(s) already scheduled for this class
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Exam Date *</label>
                    <DateInput
                      value={scheduleForm.examDate}
                      onChange={(examDate) => setScheduleForm({ ...scheduleForm, examDate })}
                      min={
                        scheduleForm.cycleId
                          ? cycles.find((c) => c.id === scheduleForm.cycleId)?.startDate
                          : undefined
                      }
                      max={
                        scheduleForm.cycleId
                          ? cycles.find((c) => c.id === scheduleForm.cycleId)?.endDate
                          : undefined
                      }
                      disabled={!scheduleForm.cycleId}
                      className="rounded-xl border-2 border-slate-200 px-4 py-3 dark:border-slate-600 disabled:opacity-60"
                    />
                    {scheduleForm.cycleId && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Must be between {formatDate(cycles.find(c => c.id === scheduleForm.cycleId)?.startDate)} and {formatDate(cycles.find(c => c.id === scheduleForm.cycleId)?.endDate)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Exam Time</label>
                    <input
                      type="time"
                      value={scheduleForm.examTime}
                      onChange={(e) => setScheduleForm({...scheduleForm, examTime: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      value={scheduleForm.duration}
                      onChange={(e) => setScheduleForm({...scheduleForm, duration: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
                      min="15"
                      step="15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Max Marks</label>
                    <input
                      type="number"
                      value={scheduleForm.maxMarks}
                      onChange={(e) => setScheduleForm({...scheduleForm, maxMarks: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Venue *
                  </label>
                  <select
                    value={scheduleForm.venue}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, venue: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
                    disabled={!scheduleForm.examDate || !scheduleForm.examTime}
                  >
                    <option value="">
                      {!scheduleForm.examDate || !scheduleForm.examTime
                        ? "Select exam date and time first"
                        : venueSelectOptions.length === 0
                          ? "No free rooms for this time"
                          : "Select a room from Resources"}
                    </option>
                    {venueSelectOptions.map((venue) => (
                      <option key={venue} value={venue}>
                        {venue}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Rooms already booked for an overlapping exam time are hidden. Manage rooms in
                    Admin → Resources.
                  </p>
                  {scheduleForm.examDate &&
                  scheduleForm.examTime &&
                  venueRoomOptions.length > 0 &&
                  availableVenueOptions.length === 0 ? (
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                      All rooms are booked at this time. Pick another time or free a room.
                    </p>
                  ) : null}
                  {resources.length === 0 ? (
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                      No rooms found. Add classrooms/labs under Admin → Resources first.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 sticky bottom-0 bg-white dark:bg-slate-800">
                <button
                  onClick={handleSaveSchedule}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-bold"
                >
                  {editingSchedule ? 'Update' : 'Schedule'} Exam
                </button>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-6 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
