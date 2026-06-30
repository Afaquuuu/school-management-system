"use client";

import { useRouter } from "next/navigation";
import { Users, Calendar, CheckCircle } from "lucide-react";
import { useSchool, getScopedItem, setScopedItem, removeScopedItem } from "@/lib/school-context";

export default function TestDataPage() {
  const router = useRouter();
  const { currentSchool } = useSchool();

  const addDefaultClasses = () => {
    if (!currentSchool) {
      alert("No school selected!");
      return;
    }

    const defaultClasses = [
      { id: "grade-6-a", name: "Grade 6 A", section: "A", inCharge: "Not Assigned", students: 0, isManual: true },
      { id: "grade-6-b", name: "Grade 6 B", section: "B", inCharge: "Not Assigned", students: 0, isManual: true },
      { id: "grade-7-a", name: "Grade 7 A", section: "A", inCharge: "Not Assigned", students: 0, isManual: true },
      { id: "grade-7-b", name: "Grade 7 B", section: "B", inCharge: "Not Assigned", students: 0, isManual: true },
      { id: "grade-8-a", name: "Grade 8 A", section: "A", inCharge: "Not Assigned", students: 0, isManual: true },
      { id: "grade-8-b", name: "Grade 8 B", section: "B", inCharge: "Not Assigned", students: 0, isManual: true },
    ];

    setScopedItem(currentSchool.id, 'school_classes', JSON.stringify(defaultClasses));
    alert(`Added ${defaultClasses.length} classes for ${currentSchool.name}!\n\nClasses created:\n- Grade 6 A\n- Grade 6 B\n- Grade 7 A\n- Grade 7 B\n- Grade 8 A\n- Grade 8 B`);
  };

  const addSystemUsers = () => {
    if (!currentSchool) {
      alert("No school selected!");
      return;
    }
    
    const systemUsers = [
      {
        id: "user_admin_001",
        name: "Principal Administrator",
        email: "principal@school.edu",
        phone: "+233 24 000 0001",
        role: "Admin",
        classDepartment: "Administration",
        status: "Active",
        password: "admin123",
        createdAt: new Date().toISOString(),
        lastLogin: null
      },
      {
        id: "user_teacher_001",
        name: "A. Mensah",
        email: "a.mensah@school.edu",
        phone: "+233 24 000 0002",
        role: "Teacher",
        classDepartment: "Mathematics",
        status: "Active",
        password: "password123",
        createdAt: new Date().toISOString(),
        lastLogin: null
      },
      {
        id: "user_teacher_002",
        name: "S. Okafor",
        email: "s.okafor@school.edu",
        phone: "+233 24 000 0003",
        role: "Teacher",
        classDepartment: "Science",
        status: "Active",
        password: "password123",
        createdAt: new Date().toISOString(),
        lastLogin: null
      },
      {
        id: "user_student_001",
        name: "Ama",
        email: "ama@school.edu",
        phone: "+233 24 000 0004",
        role: "Student",
        classDepartment: "Grade 7B",
        status: "Active",
        password: "password123",
        createdAt: new Date().toISOString(),
        lastLogin: null
      },
      {
        id: "user_parent_001",
        name: "Mr. Parent",
        email: "parent@school.edu",
        phone: "+233 24 000 0005",
        role: "Parent",
        classDepartment: "Guardian",
        status: "Active",
        password: "password123",
        createdAt: new Date().toISOString(),
        lastLogin: null
      }
    ];

    setScopedItem(currentSchool.id, 'system_users', JSON.stringify(systemUsers));
    alert(`Added ${systemUsers.length} system users for ${currentSchool.name}!\n\nYou can now login with:\n- principal@school.edu / admin123\n- a.mensah@school.edu / password123\n- ama@school.edu / password123`);
  };

  const addTestStudents = () => {
    if (!currentSchool) {
      alert("No school selected!");
      return;
    }
    
    const testStudents = [
      {
        id: "test1",
        studentId: "STU001",
        firstName: "Syed",
        lastName: "Shah",
        dateOfBirth: "2010-05-15",
        gender: "male",
        email: "syed.shah@student.school.com",
        phone: "+233 24 123 4567",
        address: "123 Accra Street, Accra",
        guardianName: "Mr. Shah",
        guardianPhone: "+233 24 765 4321",
        guardianEmail: "shah@email.com",
        class: "Grade 7",
        section: "B",
        rollNumber: "07B001",
        admissionDate: "2023-09-01",
        status: "active",
        bloodGroup: "O+",
      },
      {
        id: "test2",
        studentId: "STU002",
        firstName: "Ahmed",
        lastName: "Ali",
        dateOfBirth: "2010-08-22",
        gender: "male",
        email: "ahmed.ali@student.school.com",
        phone: "+233 24 234 5678",
        address: "456 Kumasi Road, Kumasi",
        guardianName: "Mrs. Ali",
        guardianPhone: "+233 24 876 5432",
        guardianEmail: "ali@email.com",
        class: "Grade 7",
        section: "B",
        rollNumber: "07B002",
        admissionDate: "2023-09-01",
        status: "active",
        bloodGroup: "A+",
      },
      {
        id: "test3",
        studentId: "STU003",
        firstName: "Fatima",
        lastName: "Khan",
        dateOfBirth: "2010-03-10",
        gender: "female",
        email: "fatima.khan@student.school.com",
        phone: "+233 24 345 6789",
        address: "789 Tema Avenue, Tema",
        guardianName: "Mr. Khan",
        guardianPhone: "+233 24 987 6543",
        guardianEmail: "khan@email.com",
        class: "Grade 7",
        section: "B",
        rollNumber: "07B003",
        admissionDate: "2023-09-01",
        status: "active",
        bloodGroup: "B+",
      },
      {
        id: "test4",
        studentId: "STU004",
        firstName: "Zainab",
        lastName: "Hassan",
        dateOfBirth: "2010-11-05",
        gender: "female",
        email: "zainab.hassan@student.school.com",
        phone: "+233 24 456 7890",
        address: "321 Cape Coast Street, Cape Coast",
        guardianName: "Mrs. Hassan",
        guardianPhone: "+233 24 098 7654",
        guardianEmail: "hassan@email.com",
        class: "Grade 7",
        section: "B",
        rollNumber: "07B004",
        admissionDate: "2023-09-01",
        status: "active",
        bloodGroup: "AB+",
      },
      {
        id: "test5",
        studentId: "STU005",
        firstName: "Omar",
        lastName: "Ibrahim",
        dateOfBirth: "2010-06-18",
        gender: "male",
        email: "omar.ibrahim@student.school.com",
        phone: "+233 24 567 8901",
        address: "555 Takoradi Road, Takoradi",
        guardianName: "Mr. Ibrahim",
        guardianPhone: "+233 24 109 8765",
        guardianEmail: "ibrahim@email.com",
        class: "Grade 7",
        section: "B",
        rollNumber: "07B005",
        admissionDate: "2023-09-01",
        status: "active",
        bloodGroup: "O-",
      },
    ];

    setScopedItem(currentSchool.id, 'school_students', JSON.stringify(testStudents));
    alert(`Added ${testStudents.length} test students to Grade 7B for ${currentSchool.name}!`);
  };

  const clearAllData = () => {
    if (!currentSchool) {
      alert("No school selected!");
      return;
    }
    
    if (confirm("Are you sure you want to clear ALL data for this school? This cannot be undone!")) {
      removeScopedItem(currentSchool.id, 'school_students');
      removeScopedItem(currentSchool.id, 'attendance_records');
      removeScopedItem(currentSchool.id, 'exam_cycles');
      removeScopedItem(currentSchool.id, 'exam_schedules');
      removeScopedItem(currentSchool.id, 'exam_marks');
      
      // Clear all attendance notes for this school
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(`${currentSchool.id}_attendance_notes_`)) {
            localStorage.removeItem(key);
          }
        });
      }
      
      alert("All data cleared for this school!");
    }
  };

  const viewData = () => {
    if (!currentSchool) {
      alert("No school selected!");
      return;
    }
    
    const students = getScopedItem(currentSchool.id, 'school_students');
    const attendance = getScopedItem(currentSchool.id, 'attendance_records');
    const cycles = getScopedItem(currentSchool.id, 'exam_cycles');
    const schedules = getScopedItem(currentSchool.id, 'exam_schedules');
    const marks = getScopedItem(currentSchool.id, 'exam_marks');
    
    console.log(`=== DATA FOR ${currentSchool.name} ===`);
    console.log('=== STUDENTS ===');
    console.log(students ? JSON.parse(students) : 'No students');
    console.log('=== ATTENDANCE ===');
    console.log(attendance ? JSON.parse(attendance) : 'No attendance records');
    console.log('=== EXAM CYCLES ===');
    console.log(cycles ? JSON.parse(cycles) : 'No exam cycles');
    console.log('=== EXAM SCHEDULES ===');
    console.log(schedules ? JSON.parse(schedules) : 'No exam schedules');
    console.log('=== EXAM MARKS ===');
    console.log(marks ? JSON.parse(marks) : 'No exam marks');
    
    alert("Data logged to console. Press F12 to view.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 -m-6 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">Test Data Manager</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Quickly add test students or clear all data for testing purposes
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Add System Users */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-purple-200 dark:border-purple-700 p-6 hover:shadow-lg transition-all md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Add System Users (Required First!)</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              ⭐ <strong>Start Here!</strong> Adds system users required for login authentication
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 mb-4 space-y-1">
              <li>• <strong>Admin:</strong> principal@school.edu / admin123</li>
              <li>• <strong>Teacher:</strong> a.mensah@school.edu / password123</li>
              <li>• <strong>Teacher:</strong> s.okafor@school.edu / password123</li>
              <li>• <strong>Student:</strong> ama@school.edu / password123</li>
              <li>• <strong>Parent:</strong> parent@school.edu / password123</li>
            </ul>
            <button
              onClick={addSystemUsers}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl transition-all font-bold shadow-lg shadow-purple-500/30"
            >
              Add System Users
            </button>
          </div>

          {/* Add Default Classes */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-indigo-200 dark:border-indigo-700 p-6 hover:shadow-lg transition-all md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Add Default Classes</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              📚 Creates 6 classes ready for use (Grade 6-8, Sections A & B)
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 mb-4 grid grid-cols-2 gap-1">
              <li>• Grade 6 A</li>
              <li>• Grade 6 B</li>
              <li>• Grade 7 A</li>
              <li>• Grade 7 B</li>
              <li>• Grade 8 A</li>
              <li>• Grade 8 B</li>
            </ul>
            <button
              onClick={addDefaultClasses}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl transition-all font-bold shadow-lg shadow-indigo-500/30"
            >
              Add Default Classes
            </button>
          </div>

          {/* Add Test Students */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Add Test Students</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Adds 5 test students to Grade 7B for testing the attendance system
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 mb-4 space-y-1">
              <li>• Syed Shah</li>
              <li>• Ahmed Ali</li>
              <li>• Fatima Khan</li>
              <li>• Zainab Hassan</li>
              <li>• Omar Ibrahim</li>
            </ul>
            <button
              onClick={addTestStudents}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-all font-bold shadow-lg shadow-green-500/30"
            >
              Add Test Students
            </button>
          </div>

          {/* View Data */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">View Data</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              View all stored data in the browser console for debugging
            </p>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Opens browser console with:
              </p>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• All students</li>
                <li>• All attendance records</li>
              </ul>
            </div>
            <button
              onClick={viewData}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all font-bold shadow-lg shadow-blue-500/30"
            >
              View in Console
            </button>
          </div>

          {/* Clear All Data */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-700 p-6 hover:shadow-lg transition-all md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <Calendar className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Clear All Data</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              ⚠️ <strong>Warning:</strong> This will permanently delete all students, attendance records, and session notes from localStorage. This action cannot be undone!
            </p>
            <button
              onClick={clearAllData}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl transition-all font-bold shadow-lg shadow-red-500/30"
            >
              Clear All Data
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => router.push('/students')}
              className="px-4 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium text-slate-700 dark:text-slate-200"
            >
              Students
            </button>
            <button
              onClick={() => router.push('/attendance')}
              className="px-4 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium text-slate-700 dark:text-slate-200"
            >
              Attendance
            </button>
            <button
              onClick={() => router.push('/debug-storage')}
              className="px-4 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium text-slate-700 dark:text-slate-200"
            >
              Debug Storage
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium text-slate-700 dark:text-slate-200"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-700 p-6">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-50 mb-3">Quick Setup Instructions</h3>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <li><strong>1.</strong> <strong className="text-purple-600 dark:text-purple-300">Click "Add System Users"</strong> - Required to login</li>
            <li><strong>2.</strong> <strong className="text-indigo-600 dark:text-indigo-300">Click "Add Default Classes"</strong> - Creates 6 classes (Grade 6-8)</li>
            <li><strong>3.</strong> Login with: principal@school.edu / admin123</li>
            <li><strong>4.</strong> Click "Add Test Students" for sample data</li>
            <li><strong>5.</strong> Navigate to Admin → Academics to configure classes</li>
            <li><strong>6.</strong> Assign subjects and teachers to each class</li>
            <li><strong>7.</strong> Go to Attendance to mark student attendance</li>
            <li><strong>8.</strong> Explore other features like Exams, Finance, etc.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
