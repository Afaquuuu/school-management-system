"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  TrendingUp, TrendingDown, Award, AlertTriangle, BookOpen, 
  Target, Calendar, Users, ChevronDown, Download,
  BarChart3, Activity, CheckCircle, XCircle
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Cell,
} from "recharts";
import { formatStudentClassLabel, getUniqueSchoolClassesByName, normalizeSection, studentMatchesClassSection } from "@/lib/class-labels";
import { exportTableData, slugifyFileName } from "@/lib/export-data";
import { useSchool, getScopedItem, getSchoolClasses, getUniqueClassNames } from "@/lib/school-context";
import { getUserSession } from "@/lib/teacher-check-in";

type EnrolledStudent = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  class: string;
  section: string;
};

function findEnrolledStudent(
  schoolId: string,
  session: ReturnType<typeof getUserSession>,
): EnrolledStudent | null {
  if (!session) return null;

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

type Subject = {
  id: string;
  name: string;
  currentScore: number;
  previousScore: number;
  classAverage: number;
  maxScore: number;
  grade: string;
  teacher: string;
  trend: "up" | "down" | "stable";
};

type Student = {
  id: string;
  name: string;
  admissionNo: string;
  className: string;
  section: string;
  overallScore: number;
  rank: number;
  totalStudents: number;
  attendanceRate: number;
  subjects: Subject[];
};

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

type ExamCycle = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  description: string;
};

type SubjectDef = {
  id: string;
  name: string;
  code: string;
  classes: string[];
};

const defaultSubjects: SubjectDef[] = [
  { id: "1", name: "Mathematics", code: "MATH", classes: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"] },
  { id: "2", name: "English", code: "ENG", classes: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"] },
  { id: "3", name: "Science", code: "SCI", classes: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"] },
  { id: "4", name: "Social Studies", code: "SS", classes: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"] },
  { id: "5", name: "Computer Science", code: "CS", classes: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"] },
];

type ClassAnalyticsData = {
  className: string;
  section: string;
  studentCount: number;
  classAverage: number;
  passRate: number;
  subjectAverages: { subjectId: string; name: string; average: number; maxScore: number }[];
  leaderboard: { rank: number; studentId: string; name: string; score: number; isCurrentStudent: boolean }[];
};

type TrendPoint = {
  cycleId: string;
  cycleName: string;
  overallScore: number;
  subjects: { name: string; percentage: number; score: number; maxScore: number }[];
};

function getSubjectName(subjectId: string): string {
  return defaultSubjects.find((s) => s.id === subjectId)?.name ?? "Unknown";
}

function getMaxScoreForMark(mark: Mark, schedules: any[]): number {
  const schedule = schedules.find(
    (s) =>
      s.cycleId === mark.cycleId &&
      s.className === mark.className &&
      s.subjectId === mark.subjectId,
  );
  return schedule?.maxMarks || 100;
}

function computeOverallScoreFromMarks(studentMarks: Mark[], schedules: any[]): number {
  if (studentMarks.length === 0) return 0;
  let total = 0;
  let maxTotal = 0;
  for (const mark of studentMarks) {
    const maxScore = getMaxScoreForMark(mark, schedules);
    total += mark.marksObtained;
    maxTotal += maxScore;
  }
  return maxTotal > 0 ? (total / maxTotal) * 100 : 0;
}

function getGradeFromPercentage(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C+";
  if (percentage >= 40) return "C";
  if (percentage >= 33) return "D";
  return "F";
}

export default function StudentPerformanceAnalyticsPage() {
  const { currentSchool } = useSchool();
  const searchParams = useSearchParams();
  const performanceView =
    searchParams.get("view") === "class"
      ? "class"
      : searchParams.get("view") === "trends"
        ? "trends"
        : "student";

  const pageTitles = {
    student: "Student Performance",
    class: "Class Analytics",
    trends: "Trends & Reports",
  } as const;

  const pageDescriptions = {
    student: "Individual student academic performance and subject breakdown",
    class: "Class-level performance insights and comparisons",
    trends: "Performance trends and reporting overview",
  } as const;
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [cycles, setCycles] = useState<ExamCycle[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ReturnType<typeof getSchoolClasses>>([]);
  
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("teacher");
  const [enrolledStudent, setEnrolledStudent] = useState<EnrolledStudent | null>(null);

  const isStudentView = userRole === "student";
  const activeView = performanceView;
  const enrolledClassLabel = enrolledStudent
    ? formatStudentClassLabel(enrolledStudent.class, enrolledStudent.section)
    : "";

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
    if (!isStudentView || !enrolledStudent) return;
    setSelectedClass(enrolledStudent.class);
    setSelectedSection(enrolledStudent.section);
    setSelectedStudentId(enrolledStudent.id);
  }, [isStudentView, enrolledStudent]);

  // Load manually created classes
  useEffect(() => {
    if (currentSchool) {
      const classes = getUniqueSchoolClassesByName(getSchoolClasses(currentSchool.id));
      setAvailableClasses(classes);
    }
  }, [currentSchool]);

  // Load data from scoped localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && currentSchool) {
      const storedStudents = getScopedItem(currentSchool.id, 'school_students');
      const storedMarks = getScopedItem(currentSchool.id, 'exam_marks');
      const storedCycles = getScopedItem(currentSchool.id, 'exam_cycles');
      const storedSchedules = getScopedItem(currentSchool.id, 'exam_schedules');
      const storedAttendance = getScopedItem(currentSchool.id, 'attendance_records');
      
      if (storedStudents) {
        const parsedStudents = JSON.parse(storedStudents);
        setStudents(parsedStudents);
      }
      if (storedMarks) setMarks(JSON.parse(storedMarks));
      if (storedCycles) {
        const parsedCycles = JSON.parse(storedCycles);
        setCycles(parsedCycles);
        if (parsedCycles.length > 0 && !selectedCycleId) {
          setSelectedCycleId(parsedCycles[0].id);
        }
      }
      if (storedSchedules) setSchedules(JSON.parse(storedSchedules));
      if (storedAttendance) setAttendanceRecords(JSON.parse(storedAttendance));
    }
  }, [currentSchool]);

  // Get unique classes and sections from manually created classes
  const uniqueClasses = getUniqueClassNames(availableClasses);
  
  const uniqueSections = useMemo(() => {
    if (!selectedClass) return [];

    const fromClasses = availableClasses
      .filter((c) => {
        const className = c.name.split(" ").slice(0, -1).join(" ");
        return className === selectedClass;
      })
      .map((c) => normalizeSection(c.section));

    const fromStudents = students
      .filter((student) => studentMatchesClassSection(student, selectedClass))
      .map((student) => normalizeSection(student.section))
      .filter(Boolean);

    return [...new Set([...fromClasses, ...fromStudents])].sort();
  }, [availableClasses, selectedClass, students]);

  // Filter students by class and section
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (selectedClass && !studentMatchesClassSection(student, selectedClass, selectedSection)) {
        return false;
      }
      return true;
    });
  }, [students, selectedClass, selectedSection]);

  const sectionsWithStudents = useMemo(
    () =>
      uniqueSections.filter((section) =>
        students.some((student) => studentMatchesClassSection(student, selectedClass, section)),
      ),
    [uniqueSections, students, selectedClass],
  );

  useEffect(() => {
    if (isStudentView || !selectedClass) return;

    setSelectedSection((current) => {
      const normalizedCurrent = current ? normalizeSection(current) : "";
      const isValidForClass =
        normalizedCurrent !== "" &&
        uniqueSections.some((section) => normalizeSection(section) === normalizedCurrent);

      if (isValidForClass) return current;
      if (sectionsWithStudents.length > 0) return sectionsWithStudents[0];
      if (uniqueSections.length > 0) return uniqueSections[0];
      return "";
    });
    setSelectedStudentId("");
  }, [selectedClass, uniqueSections, sectionsWithStudents, isStudentView]);

  useEffect(() => {
    if (isStudentView) return;

    if (filteredStudents.length === 0) {
      if (selectedStudentId) setSelectedStudentId("");
      return;
    }

    if (selectedStudentId && filteredStudents.some((student) => student.id === selectedStudentId)) {
      return;
    }
    if (activeView === "student" || activeView === "trends") {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedStudentId, isStudentView, activeView]);

  // Helper function to calculate grade
  const getGrade = getGradeFromPercentage;

  const scopedClassName = isStudentView ? enrolledStudent?.class ?? "" : selectedClass;
  const scopedSection = isStudentView ? enrolledStudent?.section ?? "" : selectedSection;
  const scopedStudentId = isStudentView ? enrolledStudent?.id ?? "" : selectedStudentId;

  // Calculate student performance data
  const selectedStudent = useMemo((): Student | null => {
    if (!selectedStudentId || !selectedCycleId || students.length === 0) return null;
    
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return null;

    // Get marks for this student in the selected cycle
    const studentMarks = marks.filter(m => 
      m.studentId === selectedStudentId && 
      m.cycleId === selectedCycleId
    );

    if (studentMarks.length === 0) return null;

    // Calculate subject performance
    const subjects: Subject[] = studentMarks.map(mark => {
      const schedule = schedules.find(s => 
        s.cycleId === mark.cycleId && 
        s.className === mark.className && 
        s.subjectId === mark.subjectId
      );
      
      const subject = defaultSubjects.find(s => s.id === mark.subjectId);
      const maxScore = schedule?.maxMarks || 100;
      const percentage = (mark.marksObtained / maxScore) * 100;
      
      // Calculate class average for this subject
      const classMarks = marks.filter(m => 
        m.cycleId === mark.cycleId && 
        m.className === mark.className && 
        m.section === mark.section &&
        m.subjectId === mark.subjectId
      );
      const classAverage = classMarks.length > 0
        ? classMarks.reduce((sum, m) => sum + m.marksObtained, 0) / classMarks.length
        : 0;

      return {
        id: mark.subjectId,
        name: subject?.name || 'Unknown',
        currentScore: mark.marksObtained,
        previousScore: mark.marksObtained, // TODO: Get from previous cycle
        classAverage: Math.round(classAverage),
        maxScore,
        grade: getGrade(percentage),
        teacher: 'N/A',
        trend: 'stable' as const,
      };
    });

    // Calculate overall score
    const totalMarks = subjects.reduce((sum, s) => sum + s.currentScore, 0);
    const totalMaxMarks = subjects.reduce((sum, s) => sum + s.maxScore, 0);
    const overallScore = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

    // Calculate rank
    const classStudents = students.filter((s) =>
      studentMatchesClassSection(s, student.class, student.section),
    );
    const studentScores = classStudents.map(s => {
      const sMarks = marks.filter(m => 
        m.studentId === s.id && 
        m.cycleId === selectedCycleId &&
        m.className === student.class &&
        m.section === student.section
      );
      const sTotal = sMarks.reduce((sum, m) => sum + m.marksObtained, 0);
      const sMaxTotal = sMarks.length * 100; // Assuming 100 max marks
      return { studentId: s.id, score: sMaxTotal > 0 ? (sTotal / sMaxTotal) * 100 : 0 };
    }).sort((a, b) => b.score - a.score);
    
    const rank = studentScores.findIndex(s => s.studentId === selectedStudentId) + 1;

    // Calculate attendance rate
    const studentAttendance = attendanceRecords.filter(r => r.studentId === selectedStudentId);
    const presentCount = studentAttendance.filter(r => r.status === 'present' || r.status === 'late').length;
    const attendanceRate = studentAttendance.length > 0 
      ? (presentCount / studentAttendance.length) * 100 
      : 0;

    return {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNo: student.studentId,
      className: student.class,
      section: student.section,
      overallScore: Math.round(overallScore * 10) / 10,
      rank,
      totalStudents: classStudents.length,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      subjects,
    };
  }, [selectedStudentId, selectedCycleId, students, marks, schedules, attendanceRecords]);

  const classAnalytics = useMemo((): ClassAnalyticsData | null => {
    if (!selectedCycleId || !scopedClassName || !scopedSection) return null;

    const classStudents = students.filter((s) =>
      studentMatchesClassSection(s, scopedClassName, scopedSection),
    );
    if (classStudents.length === 0) return null;

    const cycleMarks = marks.filter(
      (m) =>
        m.cycleId === selectedCycleId &&
        m.className === scopedClassName &&
        m.section === scopedSection,
    );
    if (cycleMarks.length === 0) return null;

    const subjectIds = [...new Set(cycleMarks.map((m) => m.subjectId))];
    const subjectAverages = subjectIds.map((subjectId) => {
      const subjectMarks = cycleMarks.filter((m) => m.subjectId === subjectId);
      const maxScore = getMaxScoreForMark(subjectMarks[0], schedules);
      const average =
        subjectMarks.reduce((sum, m) => sum + m.marksObtained, 0) / subjectMarks.length;
      return {
        subjectId,
        name: getSubjectName(subjectId),
        average: Math.round(average * 10) / 10,
        maxScore,
      };
    });

    const leaderboard = classStudents
      .map((student) => {
        const studentMarks = cycleMarks.filter((m) => m.studentId === student.id);
        return {
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`,
          score: Math.round(computeOverallScoreFromMarks(studentMarks, schedules) * 10) / 10,
          isCurrentStudent: student.id === scopedStudentId,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const allScores = leaderboard.map((entry) => entry.score);
    const classAverage =
      allScores.length > 0
        ? Math.round((allScores.reduce((sum, score) => sum + score, 0) / allScores.length) * 10) / 10
        : 0;
    const passRate =
      allScores.length > 0
        ? Math.round((allScores.filter((score) => score >= 40).length / allScores.length) * 1000) / 10
        : 0;

    return {
      className: scopedClassName,
      section: scopedSection,
      studentCount: classStudents.length,
      classAverage,
      passRate,
      subjectAverages,
      leaderboard,
    };
  }, [selectedCycleId, scopedClassName, scopedSection, scopedStudentId, students, marks, schedules]);

  const trendData = useMemo((): TrendPoint[] => {
    if (!scopedStudentId) return [];

    const studentMarks = marks.filter((m) => m.studentId === scopedStudentId);
    if (studentMarks.length === 0) return [];

    return cycles
      .filter((cycle) => studentMarks.some((m) => m.cycleId === cycle.id))
      .map((cycle) => {
        const cycleMarks = studentMarks.filter((m) => m.cycleId === cycle.id);
        const subjects = cycleMarks.map((mark) => {
          const maxScore = getMaxScoreForMark(mark, schedules);
          const percentage = maxScore > 0 ? (mark.marksObtained / maxScore) * 100 : 0;
          return {
            name: getSubjectName(mark.subjectId),
            percentage: Math.round(percentage * 10) / 10,
            score: mark.marksObtained,
            maxScore,
          };
        });

        return {
          cycleId: cycle.id,
          cycleName: cycle.name,
          overallScore: Math.round(computeOverallScoreFromMarks(cycleMarks, schedules) * 10) / 10,
          subjects,
        };
      })
      .sort(
        (a, b) =>
          new Date(cycles.find((c) => c.id === a.cycleId)?.startDate ?? 0).getTime() -
          new Date(cycles.find((c) => c.id === b.cycleId)?.startDate ?? 0).getTime(),
      );
  }, [scopedStudentId, marks, cycles, schedules]);

  const hasViewData =
    activeView === "student"
      ? !!selectedStudent
      : activeView === "class"
        ? !!classAnalytics
        : trendData.length > 0;

  const performanceInsights = useMemo(() => {
    if (!selectedStudent) return { improving: 0, declining: 0, aboveAverage: 0, topPerformer: 0 };
    
    const improving = selectedStudent.subjects.filter(s => s.trend === "up").length;
    const declining = selectedStudent.subjects.filter(s => s.trend === "down").length;
    const aboveAverage = selectedStudent.subjects.filter(s => s.currentScore > s.classAverage).length;
    const topPerformer = selectedStudent.subjects.filter(s => s.currentScore >= 90).length;
    
    return { improving, declining, aboveAverage, topPerformer };
  }, [selectedStudent]);

  const studentPageTitles = {
    student: "My Performance",
    class: "My Class Analytics",
    trends: "My Trends & Reports",
  } as const;

  const studentPageDescriptions = {
    student: "Your academic performance and subject breakdown",
    class: "How your class is performing this term",
    trends: "Your performance across exam terms",
  } as const;

  const pageTitle = isStudentView ? studentPageTitles[activeView] : pageTitles[activeView];
  const pageDescription = isStudentView
    ? studentPageDescriptions[activeView]
    : pageDescriptions[activeView];

  const renderFilters = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className={`grid grid-cols-1 gap-4 ${isStudentView ? "md:grid-cols-2" : "md:grid-cols-4"}`}>
        {activeView !== "trends" && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-2" />
            Academic Term
          </label>
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {!selectedCycleId && <option value="">Select a cycle</option>}
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
        </div>
        )}

        {activeView === "trends" && !isStudentView && (
        <div className="md:col-span-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Trends are shown across all exam terms where marks have been entered.
          </p>
        </div>
        )}

        {isStudentView ? (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Class
              </label>
              <div className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-50">
                {enrolledClassLabel || "Your class"}
              </div>
            </div>
            {enrolledStudent && activeView !== "class" && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Student
                </label>
                <div className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-50">
                  {enrolledStudent.firstName} {enrolledStudent.lastName}
                  {enrolledStudent.studentId ? ` • ${enrolledStudent.studentId}` : ""}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection("");
                  setSelectedStudentId("");
                }}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Classes</option>
                {uniqueClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Section
              </label>
              <select
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value);
                  setSelectedStudentId("");
                }}
                disabled={!selectedClass}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">All Sections</option>
                {uniqueSections.map((section) => {
                  const studentCount = students.filter((student) =>
                    studentMatchesClassSection(student, selectedClass, section),
                  ).length;
                  return (
                    <option key={section} value={section}>
                      Section {section}
                      {studentCount === 0 ? " (no students)" : ` (${studentCount})`}
                    </option>
                  );
                })}
              </select>
            </div>

            {students.length > 0 && (activeView === "student" || activeView === "trends") && !isStudentView && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a student</option>
                  {filteredStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} - {student.studentId}
                    </option>
                  ))}
                </select>
                {filteredStudents.length === 0 && selectedClass && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {sectionsWithStudents.length > 0
                      ? `No students in ${formatStudentClassLabel(selectedClass, selectedSection || "—")}. Students are enrolled in section${sectionsWithStudents.length > 1 ? "s" : ""} ${sectionsWithStudents.join(", ")}.`
                      : `No students enrolled in ${selectedClass}. Add students under Students → Add Student.`}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {isStudentView && !enrolledStudent && (
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-4">
          We could not match your login to a student record. Please contact your school administrator.
        </p>
      )}
    </div>
  );

  const handleExportReport = () => {
    const cycleName = cycles.find((cycle) => cycle.id === selectedCycleId)?.name ?? "term";

    if (activeView === "student" && selectedStudent) {
      const exported = exportTableData(
        `student-performance-${slugifyFileName(selectedStudent.name)}-${slugifyFileName(cycleName)}`,
        [
          { header: "Student", value: () => selectedStudent.name },
          { header: "Class", value: () => formatStudentClassLabel(selectedStudent.className, selectedStudent.section) },
          { header: "Term", value: () => cycleName },
          { header: "Subject", value: (subject) => subject.name },
          { header: "Marks Obtained", value: (subject) => subject.currentScore },
          { header: "Max Marks", value: (subject) => subject.maxScore },
          { header: "Class Average", value: (subject) => subject.classAverage },
          { header: "Grade", value: (subject) => subject.grade },
        ],
        selectedStudent.subjects,
      );
      if (!exported) alert("No performance data to export.");
      return;
    }

    if (activeView === "class" && classAnalytics) {
      const exported = exportTableData(
        `class-analytics-${slugifyFileName(classAnalytics.className)}-${slugifyFileName(cycleName)}`,
        [
          { header: "Class", value: () => formatStudentClassLabel(classAnalytics.className, classAnalytics.section) },
          { header: "Term", value: () => cycleName },
          { header: "Rank", value: (entry) => entry.rank },
          { header: "Student", value: (entry) => entry.name },
          { header: "Score %", value: (entry) => entry.score },
        ],
        classAnalytics.leaderboard,
      );
      if (!exported) alert("No class analytics to export.");
      return;
    }

    if (activeView === "trends" && trendData.length > 0) {
      const rows = trendData.flatMap((point) =>
        point.subjects.length > 0
          ? point.subjects.map((subject) => ({
              term: point.cycleName,
              overallScore: point.overallScore,
              subject: subject.name,
              subjectScore: subject.score,
              maxScore: subject.maxScore,
              percentage: subject.percentage,
            }))
          : [{
              term: point.cycleName,
              overallScore: point.overallScore,
              subject: "Overall",
              subjectScore: point.overallScore,
              maxScore: 100,
              percentage: point.overallScore,
            }],
      );

      const exported = exportTableData(
        `performance-trends-${slugifyFileName(scopedClassName || "student")}`,
        [
          { header: "Term", value: (row) => row.term },
          { header: "Overall Score %", value: (row) => row.overallScore },
          { header: "Subject", value: (row) => row.subject },
          { header: "Marks", value: (row) => row.subjectScore },
          { header: "Max Marks", value: (row) => row.maxScore },
          { header: "Percentage", value: (row) => row.percentage },
        ],
        rows,
      );
      if (!exported) alert("No trend data to export.");
      return;
    }

    alert("No data available to export for the current view.");
  };

  const getEmptyStateMessage = () => {
    if (isStudentView && !enrolledStudent) {
      return "Your student profile could not be found. Please contact your school administrator.";
    }
    if (students.length === 0) {
      return "No students found. Please add students first.";
    }
    if (cycles.length === 0) {
      return "No exam cycles found. Please create exam cycles and enter marks.";
    }
    if (marks.length === 0) {
      return "No marks entered yet. Please go to Admin → Exams → Marks to enter student marks.";
    }

    if (activeView === "class") {
      if (!scopedClassName || !scopedSection) {
        return isStudentView
          ? "Your class could not be determined."
          : "Select a class and section above to view class analytics.";
      }
      return isStudentView
        ? "No class marks have been recorded for your class in the selected term yet."
        : "No marks found for the selected class in this cycle.";
    }

    if (activeView === "trends") {
      if (!scopedStudentId) {
        return isStudentView
          ? "Select a term above to view your trends."
          : "Select a student above to view performance trends.";
      }
      return isStudentView
        ? "No marks have been recorded for you yet. Trends will appear once exam marks are entered."
        : "No marks found for the selected student across any exam cycle.";
    }

    if (selectedStudentId && selectedCycleId) {
      return isStudentView
        ? "No marks have been recorded for you in the selected term yet."
        : "No marks found for the selected student in the selected cycle. Please enter marks in Admin → Exams → Marks.";
    }

    return isStudentView
      ? "Select a term above to view your performance."
      : "Select a student and cycle above to view performance analytics.";
  };

  // Show loading or no data state
  if (!hasViewData) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              {pageTitle}
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              {pageDescription}
            </p>
          </div>
        </div>

        {(students.length > 0 || cycles.length > 0 || isStudentView) && renderFilters()}

        {!isStudentView && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <details className="cursor-pointer">
            <summary className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
              Debug Info (Click to expand)
            </summary>
            <div className="space-y-2 text-xs font-mono text-amber-900 dark:text-amber-100">
              <p>• Students loaded: {students.length}</p>
              <p>• Cycles loaded: {cycles.length}</p>
              <p>• Marks loaded: {marks.length}</p>
              <p>• Schedules loaded: {schedules.length}</p>
              <p>• Selected Student ID: {selectedStudentId || 'none'}</p>
              <p>• Selected Cycle ID: {selectedCycleId || 'none'}</p>
              {selectedStudentId && selectedCycleId && (
                <>
                  <p>• Marks for this student in this cycle: {marks.filter(m => m.studentId === selectedStudentId && m.cycleId === selectedCycleId).length}</p>
                  <p>• All marks for this student: {marks.filter(m => m.studentId === selectedStudentId).length}</p>
                  <p>• All marks for this cycle: {marks.filter(m => m.cycleId === selectedCycleId).length}</p>
                </>
              )}
            </div>
          </details>
        </div>
        )}
        
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No Performance Data Available</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {getEmptyStateMessage()}
          </p>
        </div>
      </div>
    );
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (grade.startsWith("B")) return "text-blue-700 bg-blue-50 border-blue-200";
    if (grade.startsWith("C")) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            {pageTitle}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {pageDescription}
          </p>
        </div>
        {!isStudentView && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
        )}
      </div>

      {renderFilters()}

      {activeView === "student" && selectedStudent && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Overall Score</span>
                <Award className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-4xl font-bold">{selectedStudent.overallScore}%</p>
              <p className="text-sm opacity-75 mt-1">
                Class Average: {classAnalytics?.classAverage ?? "—"}%
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Class Rank</span>
                <Target className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-4xl font-bold">#{selectedStudent.rank}</p>
              <p className="text-sm opacity-75 mt-1">of {selectedStudent.totalStudents} students</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Attendance</span>
                <CheckCircle className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-4xl font-bold">{selectedStudent.attendanceRate}%</p>
              <p className="text-sm opacity-75 mt-1">Attendance record</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Subjects</span>
                <BookOpen className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-4xl font-bold">{selectedStudent.subjects.length}</p>
              <p className="text-sm opacity-75 mt-1">{performanceInsights.topPerformer} with A+ grade</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{performanceInsights.improving}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Improving</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{performanceInsights.declining}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Declining</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{performanceInsights.aboveAverage}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Above Class Avg</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{performanceInsights.declining}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Need Attention</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Subject Performance</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {selectedStudent.name} • {formatStudentClassLabel(selectedStudent.className, selectedStudent.section)} • {cycles.find(c => c.id === selectedCycleId)?.name}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Subject</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Marks Obtained</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Max Marks</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Percentage</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Class Avg</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {selectedStudent.subjects.map((subject) => {
                    const percentage = (subject.currentScore / subject.maxScore) * 100;
                    return (
                      <tr key={subject.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <BookOpen className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-slate-50">{subject.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">{subject.currentScore}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-600 dark:text-slate-400">{subject.maxScore}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">{percentage.toFixed(1)}%</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 dark:text-slate-400">{subject.classAverage}</span>
                            {subject.currentScore > subject.classAverage && (
                              <span className="text-xs text-emerald-600 font-medium">+{(subject.currentScore - subject.classAverage).toFixed(1)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getGradeColor(subject.grade)}`}>
                            {subject.grade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeView === "class" && classAnalytics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Class Average</span>
                <BarChart3 className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-4xl font-bold">{classAnalytics.classAverage}%</p>
              <p className="text-sm opacity-75 mt-1">
                {formatStudentClassLabel(classAnalytics.className, classAnalytics.section)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Students</span>
                <Users className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-4xl font-bold">{classAnalytics.studentCount}</p>
              <p className="text-sm opacity-75 mt-1">In this class</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Pass Rate</span>
                <CheckCircle className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-4xl font-bold">{classAnalytics.passRate}%</p>
              <p className="text-sm opacity-75 mt-1">Scored 40% or above</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Subjects</span>
                <BookOpen className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-4xl font-bold">{classAnalytics.subjectAverages.length}</p>
              <p className="text-sm opacity-75 mt-1">{cycles.find(c => c.id === selectedCycleId)?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1">Subject Averages</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Class-wide average marks by subject</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classAnalytics.subjectAverages}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="average" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Class Leaderboard</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Rankings for {cycles.find(c => c.id === selectedCycleId)?.name}
                </p>
              </div>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {classAnalytics.leaderboard.map((entry) => (
                      <tr
                        key={entry.studentId}
                        className={entry.isCurrentStudent ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                      >
                        <td className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-50">#{entry.rank}</td>
                        <td className="px-6 py-3 text-slate-900 dark:text-slate-50">
                          {entry.name}
                          {entry.isCurrentStudent && (
                            <span className="ml-2 text-xs font-medium text-blue-600">You</span>
                          )}
                        </td>
                        <td className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-50">{entry.score}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {activeView === "trends" && trendData.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Latest Score</span>
                <Award className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-4xl font-bold">{trendData[trendData.length - 1].overallScore}%</p>
              <p className="text-sm opacity-75 mt-1">{trendData[trendData.length - 1].cycleName}</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Best Term</span>
                <Target className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-4xl font-bold">
                {Math.max(...trendData.map((point) => point.overallScore)).toFixed(1)}%
              </p>
              <p className="text-sm opacity-75 mt-1">
                {trendData.reduce((best, point) => (point.overallScore > best.overallScore ? point : best)).cycleName}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Terms Tracked</span>
                <Calendar className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-4xl font-bold">{trendData.length}</p>
              <p className="text-sm opacity-75 mt-1">Exam cycles with marks</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Change</span>
                <Activity className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-4xl font-bold">
                {trendData.length >= 2
                  ? `${trendData[trendData.length - 1].overallScore - trendData[0].overallScore >= 0 ? "+" : ""}${(trendData[trendData.length - 1].overallScore - trendData[0].overallScore).toFixed(1)}%`
                  : "—"}
              </p>
              <p className="text-sm opacity-75 mt-1">First term to latest</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1">Overall Score Trend</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {isStudentView ? "Your performance across exam terms" : "Student performance across exam terms"}
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cycleName" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="overallScore" name="Overall Score %" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Term-by-Term Breakdown</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Subject scores across each exam cycle</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Term</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Overall</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Subjects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {trendData.map((point) => (
                    <tr key={point.cycleId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-50">{point.cycleName}</td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-blue-600">{point.overallScore}%</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {point.subjects.map((subject) => (
                            <span
                              key={`${point.cycleId}-${subject.name}`}
                              className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-300"
                            >
                              {subject.name}: {subject.percentage}%
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
