"use client";

import { useRouter } from "next/navigation";
import { Users, Calendar, CheckCircle } from "lucide-react";
import { useSchool, getScopedItem, setScopedItem, removeScopedItem } from "@/lib/school-context";

export default function TestDataPage() {
  const router = useRouter();
  const { currentSchool } = useSchool();

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
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-50 mb-3">Testing Instructions</h3>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <li><strong>1.</strong> Click "Add Test Students" to add 5 students to Grade 7B</li>
            <li><strong>2.</strong> Go to Students page to verify they were added</li>
            <li><strong>3.</strong> Go to Attendance page and select "Grade 7B"</li>
            <li><strong>4.</strong> Mark attendance for the students</li>
            <li><strong>5.</strong> Click "Save Attendance"</li>
            <li><strong>6.</strong> Click "View History" on any student to see saved records</li>
            <li><strong>7.</strong> Change the date and save again to build history</li>
            <li><strong>8.</strong> Use "Debug Storage" page to inspect data</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
