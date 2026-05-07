"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Calendar, Users, CheckCircle, XCircle, Clock, AlertCircle,
  Save, Download, Search, Filter, Eye, TrendingUp, ChevronRight, RefreshCw
} from "lucide-react";
import { useSchool, getScopedItem, setScopedItem, removeScopedItem, getSchoolClasses, type SchoolClass } from "@/lib/school-context";

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

// Sample data - Replace with actual database queries
const sampleStudents: Student[] = [
  { id: "1", admissionNo: "ADM-0001", name: "Ama Johnson", rollNumber: "01", status: "present", remarks: "", attendanceRate: 96.5 },
  { id: "2", admissionNo: "ADM-0002", name: "Kofi Badu", rollNumber: "02", status: "present", remarks: "", attendanceRate: 92.3 },
  { id: "3", admissionNo: "ADM-0003", name: "Nia Thompson", rollNumber: "03", status: "present", remarks: "", attendanceRate: 98.1 },
  { id: "4", admissionNo: "ADM-0004", name: "Peter Owusu", rollNumber: "04", status: "present", remarks: "", attendanceRate: 88.7 },
  { id: "5", admissionNo: "ADM-0005", name: "Hannah Lee", rollNumber: "05", status: "present", remarks: "", attendanceRate: 94.2 },
  { id: "6", admissionNo: "ADM-0006", name: "David Mensah", rollNumber: "06", status: "present", remarks: "", attendanceRate: 91.5 },
  { id: "7", admissionNo: "ADM-0007", name: "Sarah Osei", rollNumber: "07", status: "present", remarks: "", attendanceRate: 97.8 },
  { id: "8", admissionNo: "ADM-0008", name: "Michael Asante", rollNumber: "08", status: "present", remarks: "", attendanceRate: 89.4 },
  { id: "9", admissionNo: "ADM-0009", name: "Grace Addo", rollNumber: "09", status: "present", remarks: "", attendanceRate: 95.6 },
  { id: "10", admissionNo: "ADM-0010", name: "Emmanuel Boateng", rollNumber: "10", status: "present", remarks: "", attendanceRate: 93.2 },
];

const statusConfig = {
  present: { label: "Present", color: "bg-emerald-500", textColor: "text-emerald-700", bgLight: "bg-emerald-50", icon: CheckCircle },
  absent: { label: "Absent", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50", icon: XCircle },
  late: { label: "Late", color: "bg-amber-500", textColor: "text-amber-700", bgLight: "bg-amber-50", icon: Clock },
  excused: { label: "Excused", color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50", icon: AlertCircle },
};

// Function to load students from Student Management
function loadStudentsFromManagement(selectedClass: string, schoolId: string): Student[] {
  if (typeof window === 'undefined') return sampleStudents;
  
  try {
    const storedStudents = getScopedItem(schoolId, 'school_students');
    if (storedStudents) {
      const allStudents = JSON.parse(storedStudents);
      
      // Parse the selected class (e.g., "Grade 7B" -> class: "Grade 7", section: "B")
      const classMatch = selectedClass.match(/^(Grade \d+)\s*([A-Z])$/i);
      
      let classStudents;
      if (classMatch) {
        const [, className, section] = classMatch;
        // Filter by exact class and section match
        classStudents = allStudents.filter((s: any) => 
          s.class === className && s.section === section
        );
      } else {
        // Fallback: try to match the full string
        classStudents = allStudents.filter((s: any) => 
          `${s.class} ${s.section}` === selectedClass ||
          `${s.class}${s.section}` === selectedClass ||
          s.class === selectedClass
        );
      }
      
      // Convert to attendance format
      if (classStudents.length > 0) {
        return classStudents.map((s: any, index: number) => ({
          id: s.id,
          admissionNo: s.studentId,
          name: `${s.firstName} ${s.lastName}`,
          rollNumber: s.rollNumber || String(index + 1).padStart(2, '0'),
          status: "present" as AttendanceStatus,
          remarks: "",
          attendanceRate: 95.0,
        }));
      }
    }
  } catch (error) {
    console.error('Error loading students:', error);
  }
  
  return sampleStudents;
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
    const newRecords: AttendanceRecord[] = students.map(student => ({
      id: `${date}-${className}-${student.id}`,
      date,
      class: className,
      studentId: student.id,
      studentName: student.name,
      status: student.status,
      remarks: student.remarks,
      savedAt: new Date().toISOString(),
    }));
    
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
    
    // Convert back to Student format
    return classRecords.map(record => ({
      id: record.studentId,
      admissionNo: '',
      name: record.studentName,
      rollNumber: '',
      status: record.status,
      remarks: record.remarks,
      attendanceRate: 95.0,
    }));
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

export default function AttendancePage() {
  const { currentSchool } = useSchool();
  
  // Load manually created classes
  const [availableClasses, setAvailableClasses] = useState<SchoolClass[]>([]);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Get today's date for max date restriction
  const today = new Date().toISOString().split('T')[0];

  // Load manually created classes
  useEffect(() => {
    if (currentSchool) {
      const classes = getSchoolClasses(currentSchool.id);
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
    
    // First, try to load saved attendance for this date and class
    const savedAttendance = loadSavedAttendance(selectedDate, selectedClass, currentSchool.id);
    
    if (savedAttendance) {
      // Load saved attendance
      setStudents(savedAttendance);
      setHasSavedAttendance(true);
      setIsLoadedFromStorage(true);
      setShowAttendanceEntry(false); // Collapse entry form when viewing saved attendance
      
      // Load saved notes
      const notesKey = `attendance_notes_${selectedDate}_${selectedClass}`;
      const savedNotes = getScopedItem(currentSchool.id, notesKey);
      if (savedNotes) {
        setNotes(savedNotes);
      }
    } else {
      // Load fresh student list
      const loadedStudents = loadStudentsFromManagement(selectedClass, currentSchool.id);
      const studentsWithRates = loadedStudents.map(s => ({
        ...s,
        attendanceRate: calculateAttendanceRate(s.id, s.name, currentSchool.id),
      }));
      setStudents(studentsWithRates);
      setHasSavedAttendance(false);
      setShowAttendanceEntry(true); // Show entry form for new attendance
      setNotes("");
      
      // Check if students were loaded from localStorage
      if (typeof window !== 'undefined') {
        const stored = getScopedItem(currentSchool.id, 'school_students');
        setIsLoadedFromStorage(!!stored && loadedStudents !== sampleStudents);
      }
    }

    // Load list of saved attendance records
    loadSavedAttendanceList();
  }, [selectedClass, selectedDate, currentSchool]);

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
      setIsLoadedFromStorage(!!stored && loadedStudents !== sampleStudents);
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
    if (!searchTerm) return students;
    return students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber.includes(searchTerm)
    );
  }, [students, searchTerm]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId ? { ...student, status } : student
    ));
    setIsSaved(false);
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId ? { ...student, remarks } : student
    ));
    setIsSaved(false);
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(student => ({ ...student, status: "present" as AttendanceStatus })));
    setIsSaved(false);
  };

  const handleSave = () => {
    if (!currentSchool) {
      alert('No school selected');
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
    setSelectedDate(date);
    setSelectedClass(className);
    setShowAttendanceEntry(true);
  };

  const handleDeleteSavedAttendance = (date: string, className: string) => {
    if (!currentSchool) return;
    if (!confirm(`Delete attendance for ${className} on ${date}?`)) return;
    
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Attendance Management</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Mark and track student attendance for {selectedClass}
          </p>
          {isLoadedFromStorage && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Showing {students.length} student{students.length !== 1 ? 's' : ''} from Student Management
            </p>
          )}
          {hasSavedAttendance && (
            <p className="mt-1 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Viewing saved attendance for {selectedDate}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshStudents}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh student list"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button 
            onClick={() => {/* TODO: Export */}}
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
        </div>
      </div>

      {/* Date and Class Selection */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Statistics Cards */}
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

      {/* Search Bar */}
      {showAttendanceEntry && (
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
      {showAttendanceEntry && (
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
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredStudents.map((student) => {
                const config = statusConfig[student.status];
                const StatusIcon = config.icon;
                
                return (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                        {student.rollNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{student.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{student.admissionNo}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={student.remarks}
                        onChange={(e) => updateRemarks(student.id, e.target.value)}
                        placeholder="Add remarks..."
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
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
                      <button
                        onClick={() => handleViewHistory(student)}
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View History
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Session Notes */}
      {showAttendanceEntry && (
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
      {!showAttendanceEntry && savedAttendanceList.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Saved Attendance Records
            </h3>
            <button
              onClick={() => setShowAttendanceEntry(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Take New Attendance
            </button>
          </div>
          <div className="space-y-3">
            {savedAttendanceList.map((record, index) => (
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
                      {new Date(record.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-semibold">
                    {record.count} students
                  </span>
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Notes */}
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
                              {new Date(record.date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
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
