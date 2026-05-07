"use client";

import { useState, useMemo, useEffect } from "react";
import {
  TrendingUp, TrendingDown, Award, AlertTriangle, BookOpen, 
  Target, Calendar, Users, ChevronDown, Download, Filter,
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
import { useSchool, getScopedItem, getSchoolClasses, getUniqueClassNames, getUniqueSections } from "@/lib/school-context";

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

export default function StudentPerformanceAnalyticsPage() {
  const { currentSchool } = useSchool();
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
  const [viewMode, setViewMode] = useState<"overview" | "detailed">("overview");

  // Load manually created classes
  useEffect(() => {
    if (currentSchool) {
      const classes = getSchoolClasses(currentSchool.id);
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
    return availableClasses
      .filter(c => {
        const className = c.name.split(' ').slice(0, -1).join(' ');
        return className === selectedClass;
      })
      .map(c => c.section)
      .sort();
  }, [availableClasses, selectedClass]);

  // Filter students by class and section
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedClass && s.class !== selectedClass) return false;
      if (selectedSection && s.section !== selectedSection) return false;
      return true;
    });
  }, [students, selectedClass, selectedSection]);

  // Helper function to calculate grade
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
    const classStudents = students.filter(s => 
      s.class === student.class && s.section === student.section
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

  const performanceInsights = useMemo(() => {
    if (!selectedStudent) return { improving: 0, declining: 0, aboveAverage: 0, topPerformer: 0 };
    
    const improving = selectedStudent.subjects.filter(s => s.trend === "up").length;
    const declining = selectedStudent.subjects.filter(s => s.trend === "down").length;
    const aboveAverage = selectedStudent.subjects.filter(s => s.currentScore > s.classAverage).length;
    const topPerformer = selectedStudent.subjects.filter(s => s.currentScore >= 90).length;
    
    return { improving, declining, aboveAverage, topPerformer };
  }, [selectedStudent]);

  // Show loading or no data state
  if (!selectedStudent) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Performance Analytics</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Comprehensive academic performance tracking and insights
            </p>
          </div>
        </div>

        {/* Student Selection & Term */}
        {(students.length > 0 || cycles.length > 0) && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <option value="">Select a cycle</option>
                  {cycles.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                  ))}
                </select>
              </div>

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
                  {uniqueClasses.map(className => (
                    <option key={className} value={className}>{className}</option>
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
                  {uniqueSections.map(section => (
                    <option key={section} value={section}>Section {section}</option>
                  ))}
                </select>
              </div>

              {students.length > 0 && (
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
                    {filteredStudents.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.firstName} {student.lastName} - {student.studentId}
                      </option>
                    ))}
                  </select>
                  {filteredStudents.length === 0 && (selectedClass || selectedSection) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      No students in selected class/section
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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
        
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No Performance Data Available</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {students.length === 0 
              ? "No students found. Please add students first."
              : cycles.length === 0
              ? "No exam cycles found. Please create exam cycles and enter marks."
              : marks.length === 0
              ? "No marks entered yet. Please go to Admin → Exams → Marks to enter student marks."
              : selectedStudentId && selectedCycleId
              ? `No marks found for the selected student in the selected cycle. Please enter marks in Admin → Exams → Marks.`
              : "Select a student and cycle above to view performance analytics."}
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Performance Analytics</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Comprehensive academic performance tracking and insights
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Student Selection & Term */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              {cycles.map(cycle => (
                <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
              ))}
            </select>
          </div>

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
              {uniqueClasses.map(className => (
                <option key={className} value={className}>{className}</option>
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
              {uniqueSections.map(section => (
                <option key={section} value={section}>Section {section}</option>
              ))}
            </select>
          </div>

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
              {filteredStudents.map(student => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName} - {student.studentId}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">Overall Score</span>
            <Award className="w-5 h-5 opacity-75" />
          </div>
          <p className="text-4xl font-bold">{selectedStudent.overallScore}%</p>
          <p className="text-sm opacity-75 mt-1">Class Average: 77.2%</p>
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
          <p className="text-sm opacity-75 mt-1">Excellent record</p>
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

      {/* Performance Insights */}
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
              <p className="text-sm text-slate-600 dark:text-slate-400">Above Average</p>
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

      {/* Performance Trend Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Performance Overview</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {selectedStudent.className} Section {selectedStudent.section} • {cycles.find(c => c.id === selectedCycleId)?.name}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Subjects</p>
            <p className="text-3xl font-bold text-blue-600">{selectedStudent.subjects.length}</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Above Average</p>
            <p className="text-3xl font-bold text-green-600">{performanceInsights.aboveAverage}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">A+ Grades</p>
            <p className="text-3xl font-bold text-purple-600">{performanceInsights.topPerformer}</p>
          </div>
          <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Average Score</p>
            <p className="text-3xl font-bold text-amber-600">{selectedStudent.overallScore.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Subject Performance Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Subject Performance</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Detailed breakdown by subject</p>
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
    </div>
  );
}
