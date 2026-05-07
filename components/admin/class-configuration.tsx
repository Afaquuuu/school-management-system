"use client";

import { useMemo, useState, useEffect } from "react";
import { BookOpen, Plus, Save, School, UserCheck, Users, Edit, Trash2, CheckCircle, AlertCircle, Calendar, Clock } from "lucide-react";
import { useSchool, getScopedItem, setScopedItem } from "@/lib/school-context";

type AssignmentRow = {
  subject: string;
  teacher: string;
  periodsPerWeek: number;
  leadTeacher: boolean;
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  class: string;
  section: string;
};

type Staff = {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
};

type ClassData = {
  id: string;
  name: string;
  section: string;
  inCharge: string;
  students: number;
  isManual?: boolean;
};

const subjectOptions = ["Mathematics", "English Language", "Science", "Social Studies", "ICT", "Creative Arts", "French"];

const initialAssignments: Record<string, AssignmentRow[]> = {
  "grade-10a": [
    { subject: "Mathematics", teacher: "Mr. Smith", periodsPerWeek: 5, leadTeacher: true },
    { subject: "Science", teacher: "Mr. Kojo", periodsPerWeek: 4, leadTeacher: false },
    { subject: "English Language", teacher: "Ms. Adjoa", periodsPerWeek: 5, leadTeacher: false },
  ],
  "grade-9b": [
    { subject: "Mathematics", teacher: "Mrs. Mensah", periodsPerWeek: 5, leadTeacher: true },
    { subject: "ICT", teacher: "Mr. Daniel", periodsPerWeek: 3, leadTeacher: false },
    { subject: "Creative Arts", teacher: "Ms. Amina", periodsPerWeek: 2, leadTeacher: false },
  ],
  "grade-8a": [
    { subject: "English Language", teacher: "Ms. Adjoa", periodsPerWeek: 5, leadTeacher: true },
    { subject: "Social Studies", teacher: "Mr. Kojo", periodsPerWeek: 3, leadTeacher: false },
    { subject: "Science", teacher: "Mrs. Mensah", periodsPerWeek: 4, leadTeacher: false },
  ],
};

export function ClassConfigurationPage() {
  const { currentSchool } = useSchool();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [subject, setSubject] = useState(subjectOptions[0]);
  const [teacher, setTeacher] = useState("");
  const [periodsPerWeek, setPeriodsPerWeek] = useState(4);
  const [leadTeacher, setLeadTeacher] = useState(false);
  const [assignmentsByClass, setAssignmentsByClass] = useState(initialAssignments);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // New class form state
  const [showClassForm, setShowClassForm] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassSection, setNewClassSection] = useState("");
  const [classSuccessMessage, setClassSuccessMessage] = useState("");

  // Load teachers from staff data
  useEffect(() => {
    if (!currentSchool) return;

    const storedStaff = getScopedItem(currentSchool.id, 'school_staff');
    if (storedStaff) {
      const staff: Staff[] = JSON.parse(storedStaff);
      
      // Filter active teachers and format names
      const teacherNames = staff
        .filter(s => s.role === 'teacher' && s.status === 'active')
        .map(s => `${s.firstName} ${s.lastName}`)
        .sort();
      
      setTeachers(teacherNames);
      
      // Set initial teacher selection
      if (teacherNames.length > 0 && !teacher) {
        setTeacher(teacherNames[0]);
      }
    } else {
      // Fallback to default teachers if no staff data
      const defaultTeachers = ["Mr. Smith", "Ms. Adjoa", "Mrs. Mensah"];
      setTeachers(defaultTeachers);
      if (!teacher) {
        setTeacher(defaultTeachers[0]);
      }
    }
  }, [currentSchool]);

  // Load classes from manual entries only
  useEffect(() => {
    if (!currentSchool) return;

    // Load manually created classes
    const storedClasses = getScopedItem(currentSchool.id, 'school_classes');
    if (storedClasses) {
      const manualClasses: ClassData[] = JSON.parse(storedClasses);
      
      // Load students to update student counts
      const storedStudents = getScopedItem(currentSchool.id, 'school_students');
      if (storedStudents) {
        const students: Student[] = JSON.parse(storedStudents);
        
        // Update student counts for each class
        manualClasses.forEach(cls => {
          const classStudents = students.filter(s => 
            `${s.class}-${s.section}`.toLowerCase().replace(/\s+/g, '-') === cls.id
          );
          cls.students = classStudents.length;
        });
      }
      
      const sortedClasses = manualClasses.sort((a, b) => a.name.localeCompare(b.name));
      setClasses(sortedClasses);
      
      // Set initial selected class
      if (sortedClasses.length > 0 && !selectedClassId) {
        setSelectedClassId(sortedClasses[0].id);
      }
    } else {
      setClasses([]);
    }
  }, [currentSchool, teachers]);

  const selectedClass = useMemo(() => {
    const found = classes.find((item) => item.id === selectedClassId);
    return found ?? (classes.length > 0 ? classes[0] : null);
  }, [selectedClassId, classes]);
  
  const assignments = assignmentsByClass[selectedClassId] ?? [];
  const completionRate = Math.min(100, Math.round((assignments.length / subjectOptions.length) * 100));
  const totalPeriods = assignments.reduce((sum, a) => sum + a.periodsPerWeek, 0);

  const addAssignment = () => {
    // Check if subject already assigned
    const existingAssignment = assignments.find(a => a.subject === subject);
    if (existingAssignment) {
      alert(`${subject} is already assigned to ${existingAssignment.teacher}. Please edit or remove the existing assignment first.`);
      return;
    }

    setAssignmentsByClass((current) => ({
      ...current,
      [selectedClassId]: [
        ...(current[selectedClassId] ?? []),
        { subject, teacher, periodsPerWeek, leadTeacher },
      ],
    }));

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    
    // Reset form
    setSubject(subjectOptions[0]);
    if (teachers.length > 0) {
      setTeacher(teachers[0]);
    }
    setPeriodsPerWeek(4);
    setLeadTeacher(false);
  };

  const removeAssignment = (subjectToRemove: string) => {
    if (!selectedClass) return;
    if (confirm(`Remove ${subjectToRemove} from ${selectedClass.name}?`)) {
      setAssignmentsByClass((current) => ({
        ...current,
        [selectedClassId]: (current[selectedClassId] ?? []).filter(a => a.subject !== subjectToRemove),
      }));
    }
  };

  const addNewClass = () => {
    if (!currentSchool) return;
    
    if (!newClassName.trim() || !newClassSection.trim()) {
      alert("Please enter both class name and section");
      return;
    }

    const classId = `${newClassName}-${newClassSection}`.toLowerCase().replace(/\s+/g, '-');
    
    // Check if class already exists
    if (classes.some(c => c.id === classId)) {
      alert(`Class ${newClassName} ${newClassSection} already exists`);
      return;
    }

    const newClass: ClassData = {
      id: classId,
      name: `${newClassName} ${newClassSection}`,
      section: newClassSection,
      inCharge: teachers.length > 0 ? teachers[0] : "Not Assigned",
      students: 0,
      isManual: true
    };

    // Update state
    const updatedClasses = [...classes, newClass].sort((a, b) => a.name.localeCompare(b.name));
    setClasses(updatedClasses);

    // Save to localStorage
    setScopedItem(currentSchool.id, 'school_classes', JSON.stringify(updatedClasses));

    // Show success message
    setClassSuccessMessage(`Class ${newClass.name} created successfully!`);
    setTimeout(() => setClassSuccessMessage(""), 3000);

    // Reset form
    setNewClassName("");
    setNewClassSection("");
    setShowClassForm(false);

    // Select the new class
    setSelectedClassId(classId);
  };

  const deleteClass = (classId: string) => {
    if (!currentSchool) return;
    
    const classToDelete = classes.find(c => c.id === classId);
    if (!classToDelete) return;

    // Check if class has students
    if (classToDelete.students > 0) {
      alert("Cannot delete classes with enrolled students. Remove all students first.");
      return;
    }

    if (!confirm(`Delete class ${classToDelete.name}?`)) {
      return;
    }

    // Update state
    const updatedClasses = classes.filter(c => c.id !== classId);
    setClasses(updatedClasses);

    // Save to localStorage
    setScopedItem(currentSchool.id, 'school_classes', JSON.stringify(updatedClasses));

    // Select another class if the deleted one was selected
    if (selectedClassId === classId && updatedClasses.length > 0) {
      setSelectedClassId(updatedClasses[0].id);
    }
  };

  // Show loading or empty state if no classes
  if (!currentSchool) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 -m-6 p-6 flex items-center justify-center">
        <div className="text-center">
          <School className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No School Selected</h3>
          <p className="text-slate-600 dark:text-slate-400">Please select a school to configure classes</p>
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 -m-6 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <School className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Class Configuration</h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 ml-14">
              Assign subjects and teachers to a class, define the class in-charge, and keep the school timetable ready for daily operations.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12">
            <div className="text-center mb-8">
              <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No Classes Found</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Create classes manually or add students to generate classes automatically
              </p>
            </div>

            {/* Create New Class Form */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-6 mb-6">
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create Your First Class
                </h4>
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Class Name
                    </label>
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="e.g., Grade 7, Class 10"
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Section
                    </label>
                    <input
                      type="text"
                      value={newClassSection}
                      onChange={(e) => setNewClassSection(e.target.value)}
                      placeholder="e.g., A, B, C"
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={addNewClass}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30"
                >
                  <Plus className="w-5 h-5" />
                  Create Class
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Or add students to generate classes automatically</p>
                <a
                  href="/students"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-50 rounded-xl font-semibold transition-all"
                >
                  <Users className="w-5 h-5" />
                  Go to Students
                </a>
              </div>
            </div>
          </div>

          {teachers.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-center gap-3 mt-4">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-50">No Teachers Found</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Add staff members with "Teacher" role to assign them to classes.{" "}
                  <a href="/staff" className="underline hover:no-underline">Go to Staff</a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!selectedClass) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 -m-6 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <School className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Class Configuration</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 ml-14">
            Assign subjects and teachers to a class, define the class in-charge, and keep the school timetable ready for daily operations.
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-50">Assignment Successful</p>
              <p className="text-sm text-green-700 dark:text-green-300">Subject has been assigned to {selectedClass.name}</p>
            </div>
          </div>
        )}

        {/* Class Success Message */}
        {classSuccessMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-50">Class Created</p>
              <p className="text-sm text-green-700 dark:text-green-300">{classSuccessMessage}</p>
            </div>
          </div>
        )}

        {/* Create New Class Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Manage Classes</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Create new classes and sections</p>
            </div>
            <button
              onClick={() => setShowClassForm(!showClassForm)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30"
            >
              <Plus className="w-5 h-5" />
              {showClassForm ? "Cancel" : "Add New Class"}
            </button>
          </div>

          {showClassForm && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Class Name
                  </label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g., Grade 7, Class 10"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Section
                  </label>
                  <input
                    type="text"
                    value={newClassSection}
                    onChange={(e) => setNewClassSection(e.target.value)}
                    placeholder="e.g., A, B, C"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={addNewClass}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Create Class
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Existing Classes List */}
          {classes.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">All Classes ({classes.length})</h3>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className={`group flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      selectedClassId === cls.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500"
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-50">{cls.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {cls.students} student{cls.students !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {cls.students === 0 && (
                      <button
                        onClick={() => deleteClass(cls.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="Delete class"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Current Class</span>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1">{selectedClass.name}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Section {selectedClass.section}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Class In-Charge</span>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1">{selectedClass.inCharge}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Lead teacher assigned</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Subjects</span>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1">{assignments.length}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">of {subjectOptions.length} available</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Completion</span>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1">{completionRate}%</h2>
            <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Assigned Subjects */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Assigned Subjects</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedClass.name} • {totalPeriods} total periods/week</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                <BookOpen className="h-4 w-4" />
                View Mapping
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No subjects assigned yet</h3>
                <p className="text-slate-600 dark:text-slate-400">Use the form to assign subjects and teachers to this class</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div key={`${assignment.subject}-${assignment.teacher}`} className="group rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg">{assignment.subject}</h3>
                          {assignment.leadTeacher && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              <UserCheck className="h-3 w-3" />
                              Class In-Charge
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-4 w-4" />
                            {assignment.teacher}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {assignment.periodsPerWeek} periods/week
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => removeAssignment(assignment.subject)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove assignment"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment Form */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Assignment Form</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Map subject to teacher</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {subjectOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Teacher
                </label>
                <select
                  value={teacher}
                  onChange={(event) => setTeacher(event.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {teachers.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Periods per week
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={periodsPerWeek}
                  onChange={(event) => setPeriodsPerWeek(Number(event.target.value))}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={leadTeacher}
                  onChange={(event) => setLeadTeacher(event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                Mark as class in-charge for this subject group
              </label>

              <button
                type="button"
                onClick={addAssignment}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-4 font-bold text-white shadow-lg shadow-blue-500/30 transition-all"
              >
                <Plus className="h-5 w-5" />
                Assign Subject
              </button>
            </div>

            {/* Class Info */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 px-4 py-3">
                <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{selectedClass.students} Students</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Currently enrolled</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 px-4 py-3">
                <Clock className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{totalPeriods} Total Periods</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Per week</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
