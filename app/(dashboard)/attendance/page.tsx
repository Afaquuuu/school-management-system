"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Calendar, Users, CheckCircle, XCircle, Clock, AlertCircle,
  Save, Download, Search, Filter, Eye, TrendingUp, ChevronRight, RefreshCw
} from "lucide-react";
import { getUniqueSchoolClassesByName } from "@/lib/class-labels";
import { useSchool, getScopedItem, setScopedItem, removeScopedItem, getSchoolClasses, type SchoolClass } from "@/lib/school-context";
import { getUserSession } from "@/lib/teacher-check-in";
import { getLinkedStudentsForParentEmail } from "@/lib/parent-student-links";
import type { UserRole } from "@/lib/auth";
import { formatDate, formatDateLong, getTodayIsoDate } from "@/lib/date-format";
import { exportTableData, slugifyFileName } from "@/lib/export-data";
import { DateInput } from "@/components/ui/date-input";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type Student = {
  id: string;
  admissionNo: string;
  name: string;
  rollNumber: string;
  status: AttendanceStatus;
  remarks: string;
  attendanceRate: number;
};

type AttendanceRecord = {
  id: string;
  date: string;
  class: string;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  remarks: string;
  savedAt: string;
};

type StudentAttendanceHistory = {
  date: string;
  status: AttendanceStatus;
  remarks: string;
};

const statusConfig = {
  present: { label: "Present", color: "bg-emerald-500", textColor: "text-emerald-700", bgLight: "bg-emerald-50", icon: CheckCircle },
  absent: { label: "Absent", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50", icon: XCircle },
  late: { label: "Late", color: "bg-amber-500", textColor: "text-amber-700", bgLight: "bg-amber-50", icon: Clock },
  excused: { label: "Excused", color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50", icon: AlertCircle },
};

// Function to load students from Student Management
function loadStudentsFromManagement(selectedClass: string, schoolId: string): Student[] {
  if (typeof window === "undefined") return [];

  try {
    const storedStudents = getScopedItem(schoolId, "school_students");
    if (storedStudents) {
      const allStudents = JSON.parse(storedStudents);

      // Parse the selected class (e.g., "Grade 7B" -> class: "Grade 7", section: "B")
      const classMatch = selectedClass.match(/^(Grade \d+)\s*([A-Z])$/i);

      let classStudents;
      if (classMatch) {
        const [, className, section] = classMatch;
        // Filter by exact class and section match
        classStudents = allStudents.filter(
          (s: { class: string; section: string }) =>
            s.class === className && s.section === section,
        );
      } else {
        // Fallback: try to match the full string
        classStudents = allStudents.filter(
          (s: { class: string; section: string }) =>
            `${s.class} ${s.section}` === selectedClass ||
            `${s.class}${s.section}` === selectedClass ||
            s.class === selectedClass,
        );
      }

      // Convert to attendance format
      if (classStudents.length > 0) {
        return classStudents.map((s: SchoolStudentRecord & { class: string; section: string }, index: number) => ({
          id: s.id,
          admissionNo: s.studentId,
          name: `${s.firstName} ${s.lastName}`,
          rollNumber: s.rollNumber || String(index + 1).padStart(2, "0"),
          status: "present" as AttendanceStatus,
          remarks: "",
          attendanceRate: 95.0,
        }));
      }
    }
  } catch (error) {
    console.error("Error loading students:", error);
  }

  return [];
}

type SchoolStudentRecord = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  rollNumber?: string;
};

function loadSchoolStudentMap(schoolId: string): Map<string, SchoolStudentRecord> {
  const map = new Map<string, SchoolStudentRecord>();
  if (typeof window === "undefined") return map;

  try {
    const storedStudents = getScopedItem(schoolId, "school_students");
    if (!storedStudents) return map;

    (JSON.parse(storedStudents) as SchoolStudentRecord[]).forEach((student) => {
      map.set(student.id, student);
    });
  } catch (error) {
    console.error("Error loading student registry:", error);
  }

  return map;
}

function getStudentDisplayName(student: SchoolStudentRecord): string {
  return `${student.firstName} ${student.lastName}`.trim();
}

function mapRecordToStudent(
  record: AttendanceRecord,
  studentMap: Map<string, SchoolStudentRecord>,
  schoolId: string,
): Student {
  const registryStudent = studentMap.get(record.studentId);
  const name = registryStudent
    ? getStudentDisplayName(registryStudent)
    : record.studentName;

  return {
    id: record.studentId,
    admissionNo: registryStudent?.studentId ?? "",
    name,
    rollNumber: registryStudent?.rollNumber ?? "",
    status: record.status,
    remarks: record.remarks,
    attendanceRate: calculateAttendanceRate(record.studentId, name, schoolId),
  };
}

// Function to save attendance records
function saveAttendanceRecords(date: string, className: string, students: Student[], notes: string, schoolId: string) {
  if (typeof window === 'undefined') return;
  
  try {
    // Get existing records
    const existingRecords = getScopedItem(schoolId, 'attendance_records');
    const records: AttendanceRecord[] = existingRecords ? JSON.parse(existingRecords) : [];
    
    // Remove old records for the same date and class
    const filteredRecords = records.filter(r => !(r.date === date && r.class === className));
    
    // Add new records
    const studentMap = loadSchoolStudentMap(schoolId);
    const newRecords: AttendanceRecord[] = students.map((student) => {
      const registryStudent = studentMap.get(student.id);
      const studentName = registryStudent
        ? getStudentDisplayName(registryStudent)
        : student.name;

      return {
        id: `${date}-${className}-${student.id}`,
        date,
        class: className,
        studentId: student.id,
        studentName,
        status: student.status,
        remarks: student.remarks,
        savedAt: new Date().toISOString(),
      };
    });
    
    const updatedRecords = [...filteredRecords, ...newRecords];
    setScopedItem(schoolId, 'attendance_records', JSON.stringify(updatedRecords));
    
    // Save session notes
    if (notes) {
      const notesKey = `attendance_notes_${date}_${className}`;
      setScopedItem(schoolId, notesKey, notes);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving attendance:', error);
    return false;
  }
}

// Function to load saved attendance for a specific date and class
function loadSavedAttendance(date: string, className: string, schoolId: string): Student[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const existingRecords = getScopedItem(schoolId, 'attendance_records');
    if (!existingRecords) return null;
    
    const records: AttendanceRecord[] = JSON.parse(existingRecords);
    const classRecords = records.filter(r => r.date === date && r.class === className);
    
    if (classRecords.length === 0) return null;

    const studentMap = loadSchoolStudentMap(schoolId);

    // Use current student details from Student Management when available
    return classRecords.map((record) => mapRecordToStudent(record, studentMap, schoolId));
  } catch (error) {
    console.error('Error loading saved attendance:', error);
    return null;
  }
}

// Function to get attendance history for a student
function getStudentAttendanceHistory(studentId: string, studentName: string, schoolId: string): StudentAttendanceHistory[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const existingRecords = getScopedItem(schoolId, 'attendance_records');
    if (!existingRecords) return [];
    
    const records: AttendanceRecord[] = JSON.parse(existingRecords);
    const studentRecords = records.filter(r => 
      r.studentId === studentId || r.studentName === studentName
    );
    
    // Sort by date descending
    return studentRecords
      .map(r => ({
        date: r.date,
        status: r.status,
        remarks: r.remarks,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error loading student history:', error);
    return [];
  }
}

// Function to calculate attendance rate
function calculateAttendanceRate(studentId: string, studentName: string, schoolId: string): number {
  const history = getStudentAttendanceHistory(studentId, studentName, schoolId);
  if (history.length === 0) return 95.0;
  
  const presentCount = history.filter(h => 
    h.status === 'present' || h.status === 'late' || h.status === 'excused'
  ).length;
  
  return Math.round((presentCount / history.length) * 100 * 10) / 10;
}

type EnrolledStudent = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  class: string;
  section: string;
};

function normalizeClassValue(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function getEnrolledClassLabel(student: EnrolledStudent): string {
  return `${student.class} ${student.section}`.replace(/\s+/g, " ").trim();
}

function matchesEnrolledClass(recordClass: string, student: EnrolledStudent): boolean {
  const variants = [
    getEnrolledClassLabel(student),
    `${student.class}${student.section}`,
    `${student.class} ${student.section}`,
    student.class,
  ];
  const normalizedRecord = normalizeClassValue(recordClass);
  return variants.some((variant) => normalizeClassValue(variant) === normalizedRecord);
}

function matchesEnrolledStudentIdentity(
  studentId: string,
  studentName: string,
  enrolled: EnrolledStudent,
): boolean {
  const enrolledFullName = `${enrolled.firstName} ${enrolled.lastName}`.trim().toLowerCase();
  return (
    studentId === enrolled.id ||
    studentName.trim().toLowerCase() === enrolledFullName ||
    studentName.trim().toLowerCase() === enrolled.firstName.trim().toLowerCase()
  );
}

function matchesStudentRow(student: Student, enrolled: EnrolledStudent): boolean {
  return matchesEnrolledStudentIdentity(student.id, student.name, enrolled);
}

type StudentAttendanceSummary = {
  date: string;
  class: string;
  status: AttendanceStatus;
  remarks: string;
};

function getStudentPersonalAttendanceList(
  schoolId: string,
  enrolled: EnrolledStudent,
): StudentAttendanceSummary[] {
  if (typeof window === "undefined") return [];

  try {
    const existingRecords = getScopedItem(schoolId, "attendance_records");
    if (!existingRecords) return [];

    const records: AttendanceRecord[] = JSON.parse(existingRecords);
    return records
      .filter(
        (record) =>
          matchesEnrolledStudentIdentity(record.studentId, record.studentName, enrolled) &&
          matchesEnrolledClass(record.class, enrolled),
      )
      .map((record) => ({
        date: record.date,
        class: record.class,
        status: record.status,
        remarks: record.remarks,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

function findEnrolledStudent(schoolId: string, session: ReturnType<typeof getUserSession>): EnrolledStudent | null {
  if (!session) return null;

  const role = typeof window !== "undefined" ? localStorage.getItem("user_role") : null;

  if (role === "parent") {
    const linkedChildren = getLinkedStudentsForParentEmail(schoolId, session.email);
    const child = linkedChildren[0];
    if (child) {
      return {
        id: child.id,
        studentId: child.studentId,
        firstName: child.firstName,
        lastName: child.lastName,
        email: child.guardianEmail || session.email,
        class: child.class,
        section: child.section,
      };
    }
  }

  const storedStudents = getScopedItem(schoolId, "school_students");
  if (storedStudents) {
    try {
      const allStudents = JSON.parse(storedStudents) as EnrolledStudent[];
      const matched = allStudents.find(
        (student) =>
          student.email?.toLowerCase() === session.email.toLowerCase() ||
          student.id === session.id ||
          `${student.firstName} ${student.lastName}`.toLowerCase() === session.name.toLowerCase() ||
          student.firstName.toLowerCase() === session.name.toLowerCase(),
      );
      if (matched) return matched;
    } catch {
      // fall through to session classDepartment
    }
  }

  if (session.classDepartment) {
    const classMatch = session.classDepartment.match(/^(Grade \d+)\s*([A-Z])$/i);
    if (classMatch) {
      return {
        id: session.id,
        studentId: session.id,
        firstName: session.name.split(" ")[0] || session.name,
        lastName: session.name.split(" ").slice(1).join(" ") || "",
        email: session.email,
        class: classMatch[1],
        section: classMatch[2].toUpperCase(),
      };
    }
  }

  return null;
}

export default function AttendancePage() {
  const router = useRouter();
  const { currentSchool } = useSchool();
  const searchParams = useSearchParams();
  const attendanceView = searchParams.get("view") === "records" ? "records" : "mark";
  
  // Load manually created classes
  const [availableClasses, setAvailableClasses] = useState<SchoolClass[]>([]);
  
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate());
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [showStudentHistory, setShowStudentHistory] = useState<string | null>(null);
  const [studentHistory, setStudentHistory] = useState<StudentAttendanceHistory[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const [hasSavedAttendance, setHasSavedAttendance] = useState(false);
  const [showAttendanceEntry, setShowAttendanceEntry] = useState(true);
  const [savedAttendanceList, setSavedAttendanceList] = useState<{date: string, class: string, count: number}[]>([]);
  const [userRole, setUserRole] = useState<UserRole>("teacher");
  const [enrolledStudent, setEnrolledStudent] = useState<EnrolledStudent | null>(null);
  const [readOnlyMode, setReadOnlyMode] = useState(false);

  const isStudentView = userRole === "student";
  const isParentView = userRole === "parent";
  const isPersonalAttendanceView = isStudentView || isParentView;
  const isAdminView = userRole === "admin";
  const canMarkAttendance = userRole === "teacher";
  const enrolledClassLabel = enrolledStudent ? getEnrolledClassLabel(enrolledStudent) : "";
  const isViewingAttendanceEntry =
    showAttendanceEntry &&
    (isPersonalAttendanceView || isAdminView
      ? attendanceView === "records" && readOnlyMode
      : attendanceView === "mark" || attendanceView === "records");
  const isEditingFromRecords =
    canMarkAttendance && attendanceView === "records" && showAttendanceEntry && !readOnlyMode;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = localStorage.getItem("user_role");
    if (role === "admin" || role === "teacher" || role === "student" || role === "parent") {
      setUserRole(role);
    }
    if (currentSchool) {
      setEnrolledStudent(findEnrolledStudent(currentSchool.id, getUserSession()));
    }
  }, [currentSchool]);

  useEffect(() => {
    if ((isPersonalAttendanceView || isAdminView) && attendanceView === "mark") {
      router.replace("/attendance?view=records");
    }
  }, [isPersonalAttendanceView, isAdminView, attendanceView, router]);

  useEffect(() => {
    if (isPersonalAttendanceView || isAdminView) {
      setReadOnlyMode(true);
    }
  }, [isPersonalAttendanceView, isAdminView]);

  const visibleSavedAttendanceList = useMemo(() => {
    if (!isPersonalAttendanceView || !enrolledStudent) return savedAttendanceList;
    return savedAttendanceList.filter((record) =>
      matchesEnrolledClass(record.class, enrolledStudent),
    );
  }, [savedAttendanceList, isPersonalAttendanceView, enrolledStudent]);

  const studentPersonalAttendanceList = useMemo(() => {
    if (!isPersonalAttendanceView || !enrolledStudent || !currentSchool) return [];
    return getStudentPersonalAttendanceList(currentSchool.id, enrolledStudent);
  }, [isPersonalAttendanceView, enrolledStudent, currentSchool, savedAttendanceList]);

  useEffect(() => {
    if (attendanceView === "mark") {
      if (!isAdminView && !isPersonalAttendanceView) {
        setShowAttendanceEntry(true);
        setReadOnlyMode(false);
      }
    } else if (attendanceView === "records") {
      setShowAttendanceEntry(false);
      if (!isPersonalAttendanceView && !isAdminView) {
        setReadOnlyMode(false);
      }
      loadSavedAttendanceList();
    }
  }, [attendanceView, isPersonalAttendanceView, isAdminView]);

  // Get today's date for max date restriction
  const today = getTodayIsoDate();

  // Load manually created classes
  useEffect(() => {
    if (currentSchool) {
      const classes = getUniqueSchoolClassesByName(getSchoolClasses(currentSchool.id));
      setAvailableClasses(classes);
      
      // Set initial selected class if not set
      if (!selectedClass && classes.length > 0) {
        setSelectedClass(classes[0].name);
      }
    }
  }, [currentSchool]);

  // Load students when class or date changes
  useEffect(() => {
    if (!currentSchool || !selectedClass) return;

    if (isStudentView) {
      loadSavedAttendanceList();
      if (!showAttendanceEntry || !enrolledStudent) return;
    }

    if (isAdminView && attendanceView === "mark") return;
    
    // First, try to load saved attendance for this date and class
    const savedAttendance = loadSavedAttendance(selectedDate, selectedClass, currentSchool.id);
    
    if (savedAttendance) {
      let records = savedAttendance;
      if (isStudentView && enrolledStudent) {
        records = records.filter((student) => matchesStudentRow(student, enrolledStudent));
      }

      setStudents(records);
      setHasSavedAttendance(records.length > 0);
      setIsLoadedFromStorage(true);
      if (attendanceView === "mark" && !readOnlyMode && !isStudentView) {
        setShowAttendanceEntry(false);
      }
      
      // Load saved notes
      const notesKey = `attendance_notes_${selectedDate}_${selectedClass}`;
      const savedNotes = getScopedItem(currentSchool.id, notesKey);
      if (savedNotes) {
        setNotes(savedNotes);
      }
    } else {
      if (isStudentView) return;

      // Load fresh student list
      const loadedStudents = loadStudentsFromManagement(selectedClass, currentSchool.id);
      const studentsWithRates = loadedStudents.map(s => ({
        ...s,
        attendanceRate: calculateAttendanceRate(s.id, s.name, currentSchool.id),
      }));
      setStudents(studentsWithRates);
      setHasSavedAttendance(false);
      setShowAttendanceEntry(attendanceView === "mark");
      setNotes("");
      
      // Check if students were loaded from localStorage
      if (typeof window !== 'undefined') {
        const stored = getScopedItem(currentSchool.id, 'school_students');
        setIsLoadedFromStorage(!!stored && loadedStudents.length > 0);
      }
    }

    // Load list of saved attendance records
    loadSavedAttendanceList();
  }, [
    selectedClass,
    selectedDate,
    currentSchool,
    attendanceView,
    readOnlyMode,
    isStudentView,
    showAttendanceEntry,
    enrolledStudent,
  ]);

  // Function to load list of all saved attendance records
  const loadSavedAttendanceList = () => {
    if (typeof window === 'undefined' || !currentSchool) return;
    
    try {
      const existingRecords = getScopedItem(currentSchool.id, 'attendance_records');
      if (!existingRecords) {
        setSavedAttendanceList([]);
        return;
      }
      
      const records: AttendanceRecord[] = JSON.parse(existingRecords);
      
      // Group by date and class
      const grouped = records.reduce((acc, record) => {
        const key = `${record.date}-${record.class}`;
        if (!acc[key]) {
          acc[key] = {
            date: record.date,
            class: record.class,
            count: 0,
          };
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, {date: string, class: string, count: number}>);
      
      // Convert to array and sort by date descending
      const list = Object.values(grouped).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setSavedAttendanceList(list);
    } catch (error) {
      console.error('Error loading saved attendance list:', error);
      setSavedAttendanceList([]);
    }
  };

  // Function to manually refresh students
  const refreshStudents = () => {
    if (!currentSchool) return;
    
    const loadedStudents = loadStudentsFromManagement(selectedClass, currentSchool.id);
    const studentsWithRates = loadedStudents.map(s => ({
      ...s,
      attendanceRate: calculateAttendanceRate(s.id, s.name, currentSchool.id),
    }));
    setStudents(studentsWithRates);
    setHasSavedAttendance(false);
    setNotes("");
    
    if (typeof window !== 'undefined') {
      const stored = getScopedItem(currentSchool.id, 'school_students');
        setIsLoadedFromStorage(!!stored && loadedStudents.length > 0);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const present = students.filter(s => s.status === "present").length;
    const absent = students.filter(s => s.status === "absent").length;
    const late = students.filter(s => s.status === "late").length;
    const excused = students.filter(s => s.status === "excused").length;
    const total = students.length;
    const attendanceRate = total > 0 ? ((present + late + excused) / total * 100).toFixed(1) : "0";
    
    return { present, absent, late, excused, total, attendanceRate };
  }, [students]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    let list = students;

    if (isStudentView && enrolledStudent) {
      list = list.filter((student) => matchesStudentRow(student, enrolledStudent));
    }

    if (!searchTerm) return list;
    return list.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber.includes(searchTerm)
    );
  }, [students, searchTerm, isStudentView, enrolledStudent]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    if (readOnlyMode || isStudentView || isAdminView) return;
    setStudents(prev => prev.map(student => 
      student.id === studentId ? { ...student, status } : student
    ));
    setIsSaved(false);
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    if (readOnlyMode || isStudentView || isAdminView) return;
    setStudents(prev => prev.map(student => 
      student.id === studentId ? { ...student, remarks } : student
    ));
    setIsSaved(false);
  };

  const markAllPresent = () => {
    if (readOnlyMode || isStudentView || isAdminView) return;
    setStudents(prev => prev.map(student => ({ ...student, status: "present" as AttendanceStatus })));
    setIsSaved(false);
  };

  const handleSave = () => {
    if (readOnlyMode || isStudentView || isAdminView) return;
    if (!currentSchool) {
      alert('No school selected');
      return;
    }
    
    // Validate date - prevent saving attendance for future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day
    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    
    if (selectedDateObj > today) {
      alert('Cannot save attendance for future dates. Please select today or a past date.');
      return;
    }
    
    const success = saveAttendanceRecords(selectedDate, selectedClass, students, notes, currentSchool.id);
    if (success) {
      setIsSaved(true);
      setHasSavedAttendance(true);
      setShowAttendanceEntry(false); // Collapse the entry form after saving
      loadSavedAttendanceList(); // Refresh the saved attendance list
      setTimeout(() => setIsSaved(false), 3000);
      alert('Attendance saved successfully!');
    } else {
      alert('Failed to save attendance. Please try again.');
    }
  };

  const handleEditSavedAttendance = (date: string, className: string) => {
    if (isStudentView || isAdminView || !currentSchool) return;
    setSelectedDate(date);
    setSelectedClass(className);
    setReadOnlyMode(false);
    setShowAttendanceEntry(true);

    const savedAttendance = loadSavedAttendance(date, className, currentSchool.id);
    if (savedAttendance) {
      setStudents(savedAttendance);
      setHasSavedAttendance(true);
      setIsLoadedFromStorage(true);

      const notesKey = `attendance_notes_${date}_${className}`;
      const savedNotes = getScopedItem(currentSchool.id, notesKey);
      setNotes(savedNotes || "");
    }
  };

  const closeAttendanceEntry = () => {
    setShowAttendanceEntry(false);
    setReadOnlyMode(isStudentView || isAdminView);
  };

  const handleViewSavedAttendanceReadOnly = (date: string, className: string) => {
    if (!currentSchool) return;
    setSelectedDate(date);
    setSelectedClass(className);
    setReadOnlyMode(true);

    if (isAdminView) {
      const savedAttendance = loadSavedAttendance(date, className, currentSchool.id);
      if (savedAttendance) {
        setStudents(savedAttendance);
        setHasSavedAttendance(true);
      } else {
        setStudents([]);
        setHasSavedAttendance(false);
      }
      setShowAttendanceEntry(true);
      return;
    }

    if (!enrolledStudent) return;

    const savedAttendance = loadSavedAttendance(date, className, currentSchool.id);
    const personalRecord = savedAttendance?.filter((student) =>
      matchesStudentRow(student, enrolledStudent),
    );

    if (personalRecord && personalRecord.length > 0) {
      setStudents(personalRecord);
      setHasSavedAttendance(true);
    } else {
      const personalEntry = studentPersonalAttendanceList.find(
        (record) => record.date === date && record.class === className,
      );
      if (personalEntry) {
        setStudents([
          {
            id: enrolledStudent.id,
            admissionNo: enrolledStudent.studentId,
            name: `${enrolledStudent.firstName} ${enrolledStudent.lastName}`.trim(),
            rollNumber: "",
            status: personalEntry.status,
            remarks: personalEntry.remarks,
            attendanceRate: calculateAttendanceRate(
              enrolledStudent.id,
              `${enrolledStudent.firstName} ${enrolledStudent.lastName}`.trim(),
              currentSchool.id,
            ),
          },
        ]);
        setHasSavedAttendance(true);
      } else {
        setStudents([]);
        setHasSavedAttendance(false);
      }
    }

    setShowAttendanceEntry(true);
  };

  const handleDeleteSavedAttendance = (date: string, className: string) => {
    if (isStudentView || isAdminView) return;
    if (!currentSchool) return;
    if (!confirm(`Delete attendance for ${className} on ${formatDate(date)}?`)) return;
    
    try {
      const existingRecords = getScopedItem(currentSchool.id, 'attendance_records');
      if (!existingRecords) return;
      
      const records: AttendanceRecord[] = JSON.parse(existingRecords);
      const filteredRecords = records.filter(r => !(r.date === date && r.class === className));
      
      setScopedItem(currentSchool.id, 'attendance_records', JSON.stringify(filteredRecords));
      
      // Delete notes too
      const notesKey = `attendance_notes_${date}_${className}`;
      removeScopedItem(currentSchool.id, notesKey);
      
      loadSavedAttendanceList();
      alert('Attendance deleted successfully!');
    } catch (error) {
      console.error('Error deleting attendance:', error);
      alert('Failed to delete attendance.');
    }
  };

  const handleExportAttendance = () => {
    if (!currentSchool) return;

    if (attendanceView === "mark" && students.length > 0) {
      const exported = exportTableData(
        `attendance-${selectedDate}-${slugifyFileName(selectedClass || "class")}`,
        [
          { header: "Date", value: () => selectedDate },
          { header: "Class", value: () => selectedClass },
          { header: "Roll No", value: (student) => student.rollNumber },
          { header: "Student ID", value: (student) => student.admissionNo || student.id },
          { header: "Name", value: (student) => student.name },
          { header: "Status", value: (student) => student.status },
          { header: "Remarks", value: (student) => student.remarks },
          { header: "Attendance Rate %", value: (student) => student.attendanceRate },
        ],
        students,
      );
      if (!exported) alert("No attendance rows to export.");
      return;
    }

    if (isStudentView) {
      const exported = exportTableData(
        `my-attendance-${slugifyFileName(enrolledStudent?.firstName ?? "student")}`,
        [
          { header: "Date", value: (record) => record.date },
          { header: "Class", value: (record) => record.class },
          { header: "Status", value: (record) => record.status },
          { header: "Remarks", value: (record) => record.remarks },
        ],
        studentPersonalAttendanceList,
      );
      if (!exported) alert("No attendance records to export.");
      return;
    }

    const stored = getScopedItem(currentSchool.id, "attendance_records");
    if (!stored) {
      alert("No attendance records to export.");
      return;
    }

    try {
      const records: AttendanceRecord[] = JSON.parse(stored);
      const exported = exportTableData(
        `attendance-records-${slugifyFileName(currentSchool.name)}`,
        [
          { header: "Date", value: (record) => record.date },
          { header: "Class", value: (record) => record.class },
          { header: "Student ID", value: (record) => record.studentId },
          { header: "Student Name", value: (record) => record.studentName },
          { header: "Status", value: (record) => record.status },
          { header: "Remarks", value: (record) => record.remarks },
        ],
        records,
      );
      if (!exported) alert("No attendance records to export.");
    } catch {
      alert("Failed to export attendance records.");
    }
  };

  const handleViewHistory = (student: Student) => {
    if (!currentSchool) return;
    const history = getStudentAttendanceHistory(student.id, student.name, currentSchool.id);
    setStudentHistory(history);
    setShowStudentHistory(student.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            {isStudentView
              ? "My Attendance"
              : isAdminView
                ? "View Attendance"
                : attendanceView === "records"
                  ? "View Attendance"
                  : "Mark Attendance"}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {isStudentView
              ? enrolledClassLabel
                ? `View-only attendance records for ${enrolledClassLabel}`
                : "View-only attendance for your enrolled class"
              : isAdminView
                ? "Review saved attendance records across classes (view only)"
                : attendanceView === "records"
                  ? "Browse and manage saved attendance records"
                  : `Mark and track student attendance for ${selectedClass}`}
          </p>
          {!isStudentView && isLoadedFromStorage && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Showing {students.length} student{students.length !== 1 ? 's' : ''} from Student Management
            </p>
          )}
          {hasSavedAttendance && !isStudentView && (
            <p className="mt-1 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Viewing saved attendance for {formatDate(selectedDate)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {(attendanceView === "mark" || isEditingFromRecords) && canMarkAttendance && (
            <>
          <button 
            onClick={refreshStudents}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh student list"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button 
            onClick={handleExportAttendance}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-colors ${
              isSaved 
                ? "bg-green-600 text-white" 
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaved ? "Saved!" : "Save Attendance"}
          </button>
            </>
          )}
        </div>
      </div>

      {/* Date and Class Selection */}
      {attendanceView === "mark" && canMarkAttendance && (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date
            </label>
            <DateInput
              value={selectedDate}
              onChange={(newDate) => {
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                const selectedDateObj = new Date(`${newDate}T00:00:00`);

                if (selectedDateObj <= todayDate) {
                  setSelectedDate(newDate);
                } else {
                  alert("Cannot select future dates for attendance");
                }
              }}
              max={today}
              className="w-full"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Can only select today or past dates
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={availableClasses.length === 0}
            >
              <option value="">Select Class</option>
              {availableClasses.map(cls => (
                <option key={cls.id} value={cls.name}>{cls.name}</option>
              ))}
            </select>
            {availableClasses.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                No classes available. <a href="/admin/academics" className="underline">Create classes first</a>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Quick Actions
            </label>
            <button
              onClick={markAllPresent}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              Mark All Present
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Statistics Cards */}
      {isViewingAttendanceEntry && !isStudentView && (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total</span>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.total}</p>
        </div>
        
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Present</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-50">{stats.present}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700 dark:text-red-300">Absent</span>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900 dark:text-red-50">{stats.absent}</p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Late</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-amber-900 dark:text-amber-50">{stats.late}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Rate</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-50">{stats.attendanceRate}%</p>
        </div>
      </div>
      )}

      {/* Search Bar */}
      {isViewingAttendanceEntry && !readOnlyMode && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, admission number, or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Students Table */}
      {isViewingAttendanceEntry && (
        <>
          {isStudentView && (
            <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                Your attendance for <strong>{selectedClass}</strong> on{" "}
                <strong>{formatDate(selectedDate)}</strong>. This view is read-only.
              </p>
              <button
                onClick={closeAttendanceEntry}
                className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                Back to list
              </button>
            </div>
          )}
          {isEditingFromRecords && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                Editing attendance for <strong>{selectedClass}</strong> on{" "}
                <strong>{formatDate(selectedDate)}</strong>.
              </p>
              <button
                onClick={closeAttendanceEntry}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Back to list
              </button>
            </div>
          )}
          {isAdminView && readOnlyMode && showAttendanceEntry && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                View-only attendance for <strong>{selectedClass}</strong> on{" "}
                <strong>{formatDate(selectedDate)}</strong>. Principals cannot mark or edit attendance.
              </p>
              <button
                onClick={closeAttendanceEntry}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Back to list
              </button>
            </div>
          )}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Roll
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Student Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Attendance Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Remarks
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Overall Rate
                </th>
                {!isStudentView && (
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredStudents.length === 0 && isStudentView ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No attendance record found for you on this date.
                  </td>
                </tr>
              ) : (
              filteredStudents.map((student) => {
                const config = statusConfig[student.status];
                
                return (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                        {student.rollNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">
                          {student.name}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{student.admissionNo}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {readOnlyMode || isStudentView ? (
                        <span
                          className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${config.color}`}
                        >
                          {config.label}
                        </span>
                      ) : (
                      <div className="flex gap-2">
                        {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => {
                          const isSelected = student.status === status;
                          const btnConfig = statusConfig[status];
                          
                          return (
                            <button
                              key={status}
                              onClick={() => updateStatus(student.id, status)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                isSelected
                                  ? `${btnConfig.color} text-white shadow-md`
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                              }`}
                            >
                              {btnConfig.label}
                            </button>
                          );
                        })}
                      </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {readOnlyMode || isStudentView ? (
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {student.remarks || "—"}
                        </span>
                      ) : (
                      <input
                        type="text"
                        value={student.remarks}
                        onChange={(e) => updateRemarks(student.id, e.target.value)}
                        placeholder="Add remarks..."
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              student.attendanceRate >= 95 ? "bg-emerald-500" :
                              student.attendanceRate >= 85 ? "bg-amber-500" :
                              "bg-red-500"
                            }`}
                            style={{ width: `${student.attendanceRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50 min-w-[3rem]">
                          {student.attendanceRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!readOnlyMode && !isStudentView && (
                      <button
                        onClick={() => handleViewHistory(student)}
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View History
                      </button>
                      )}
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Session Notes */}
      {isViewingAttendanceEntry && !readOnlyMode && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">
            Session Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about today's attendance session..."
            rows={3}
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Saved Attendance Records */}
      {attendanceView === "records" && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {isStudentView ? "My Attendance Records" : "Saved Attendance Records"}
            </h3>
            <div className="flex items-center gap-2">
              {isStudentView && enrolledClassLabel && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {enrolledClassLabel}
                </span>
              )}
              <button
                type="button"
                onClick={handleExportAttendance}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
          {isStudentView && !enrolledStudent && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              We could not determine your enrolled class. Please contact the school office.
            </div>
          )}
          {(isStudentView ? studentPersonalAttendanceList : visibleSavedAttendanceList).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-600">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-600 dark:text-slate-400">
                {isStudentView
                  ? "No attendance records found for you yet"
                  : "No saved attendance records yet"}
              </p>
            </div>
          ) : (
          <div className="space-y-3">
            {(isStudentView ? studentPersonalAttendanceList : visibleSavedAttendanceList).map((record, index) => {
              const studentRecord = isStudentView
                ? (record as StudentAttendanceSummary)
                : null;
              const adminRecord = !isStudentView
                ? (record as { date: string; class: string; count: number })
                : null;
              const statusBadge = studentRecord
                ? statusConfig[studentRecord.status]
                : null;

              return (
              <div 
                key={index}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-50">
                      {record.class}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDateLong(record.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isStudentView && statusBadge ? (
                    <span
                      className={`rounded-lg px-3 py-1 text-sm font-semibold text-white ${statusBadge.color}`}
                    >
                      {statusBadge.label}
                    </span>
                  ) : (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-semibold">
                    {adminRecord?.count} students
                  </span>
                  )}
                  {isStudentView || isAdminView ? (
                    <button
                      onClick={() => handleViewSavedAttendanceReadOnly(record.date, record.class)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      View
                    </button>
                  ) : (
                    <>
                  <button
                    onClick={() => handleEditSavedAttendance(record.date, record.class)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    View/Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSavedAttendance(record.date, record.class)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                    </>
                  )}
                </div>
              </div>
            )})}
          </div>
          )}
        </div>
      )}

      {/* Student History Modal */}
      {showStudentHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  Attendance History
                </h3>
                <button
                  onClick={() => setShowStudentHistory(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {students.find(s => s.id === showStudentHistory)?.name}
              </p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {studentHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No attendance records found</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                    Attendance history will appear here once you save attendance records
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentHistory.map((record, index) => {
                    const config = statusConfig[record.status];
                    const StatusIcon = config.icon;
                    
                    return (
                      <div 
                        key={index}
                        className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                      >
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full ${config.bgLight} flex items-center justify-center`}>
                            <StatusIcon className={`w-6 h-6 ${config.textColor}`} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-50">
                              {formatDateLong(record.date)}
                            </p>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.color} text-white`}>
                              {config.label}
                            </span>
                          </div>
                          {record.remarks && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              <span className="font-medium">Remarks:</span> {record.remarks}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Records</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{studentHistory.length}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Attendance Rate</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {students.find(s => s.id === showStudentHistory)?.attendanceRate || 0}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Present Days</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {studentHistory.filter(h => h.status === 'present' || h.status === 'late' || h.status === 'excused').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
