"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export default function DebugStoragePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("Grade 7B");
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const loadData = () => {
    const logs: string[] = [];
    
    if (typeof window !== 'undefined') {
      // Load students
      const stored = localStorage.getItem('school_students');
      logs.push(`localStorage key 'school_students' exists: ${!!stored}`);
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          logs.push(`Parsed ${parsed.length} students from localStorage`);
          setStudents(parsed);
          
          // Log each student's class and section
          parsed.forEach((s: any, i: number) => {
            logs.push(`Student ${i + 1}: "${s.firstName} ${s.lastName}" - class: "${s.class}" (type: ${typeof s.class}), section: "${s.section}" (type: ${typeof s.section})`);
          });
        } catch (e) {
          logs.push(`Error parsing JSON: ${e}`);
        }
      } else {
        logs.push('No data in localStorage');
      }

      // Load exam cycles
      const storedCycles = localStorage.getItem('exam_cycles');
      if (storedCycles) {
        const parsedCycles = JSON.parse(storedCycles);
        setCycles(parsedCycles);
        logs.push(`\nExam Cycles: ${parsedCycles.length}`);
        parsedCycles.forEach((c: any) => {
          logs.push(`  - ${c.name} (${c.status})`);
        });
      } else {
        logs.push('\nNo exam cycles found');
      }

      // Load exam schedules
      const storedSchedules = localStorage.getItem('exam_schedules');
      if (storedSchedules) {
        const parsedSchedules = JSON.parse(storedSchedules);
        setSchedules(parsedSchedules);
        logs.push(`\nExam Schedules: ${parsedSchedules.length}`);
        parsedSchedules.forEach((s: any) => {
          logs.push(`  - Class: "${s.className}", Subject: ${s.subjectId}, Cycle: ${s.cycleId}`);
        });
      } else {
        logs.push('\nNo exam schedules found');
      }

      // Load marks
      const storedMarks = localStorage.getItem('exam_marks');
      if (storedMarks) {
        const parsedMarks = JSON.parse(storedMarks);
        setMarks(parsedMarks);
        logs.push(`\nMarks Entries: ${parsedMarks.length}`);
      } else {
        logs.push('\nNo marks found');
      }
    }
    
    setDebugInfo(logs);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const logs: string[] = [...debugInfo];
    
    // Parse the selected class (e.g., "Grade 7B" -> class: "Grade 7", section: "B")
    const classMatch = selectedClass.match(/^(Grade \d+)\s*([A-Z])$/i);
    
    let filtered;
    if (classMatch) {
      const [, className, section] = classMatch;
      logs.push(`\nFiltering for: class="${className}", section="${section}"`);
      
      // Filter by exact class and section match
      filtered = students.filter((s: any) => {
        const classMatches = s.class === className;
        const sectionMatches = s.section === section;
        const bothMatch = classMatches && sectionMatches;
        
        logs.push(`  "${s.firstName} ${s.lastName}": class match=${classMatches}, section match=${sectionMatches}, included=${bothMatch}`);
        
        return bothMatch;
      });
      
      logs.push(`\nResult: ${filtered.length} students matched`);
    } else {
      logs.push(`\nCould not parse class "${selectedClass}"`);
      filtered = [];
    }
    
    setFilteredStudents(filtered);
    setDebugInfo(logs);
  }, [students, selectedClass]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Debug Storage</h1>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Reload Data
        </button>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Select Class</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="Grade 7A">Grade 7A</option>
          <option value="Grade 7B">Grade 7B</option>
          <option value="Grade 7C">Grade 7C</option>
          <option value="Grade 8A">Grade 8A</option>
          <option value="Grade 8B">Grade 8B</option>
          <option value="Grade 8C">Grade 8C</option>
        </select>
      </div>

      {/* Debug Logs */}
      <div className="bg-slate-900 text-green-400 rounded-xl p-4 font-mono text-sm overflow-auto max-h-96">
        <h3 className="text-white font-bold mb-2">Debug Logs:</h3>
        {debugInfo.map((log, i) => (
          <div key={i} className="whitespace-pre-wrap">{log}</div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border p-6">
        <h2 className="text-xl font-bold mb-4">All Students in localStorage ({students.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Class</th>
                <th className="text-left p-2">Section</th>
                <th className="text-left p-2">Roll Number</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-red-600">
                    No students in localStorage! Go to /test-data to add test students.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-2">{s.studentId}</td>
                    <td className="p-2">{s.firstName} {s.lastName}</td>
                    <td className="p-2 font-mono bg-yellow-100 dark:bg-yellow-900">"{s.class}"</td>
                    <td className="p-2 font-mono bg-blue-100 dark:bg-blue-900">"{s.section}"</td>
                    <td className="p-2">{s.rollNumber}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border p-6">
        <h2 className="text-xl font-bold mb-4">Filtered Students for {selectedClass} ({filteredStudents.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Class</th>
                <th className="text-left p-2">Section</th>
                <th className="text-left p-2">Roll Number</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-red-600">
                    No students found for {selectedClass}. Check the debug logs above to see why.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="border-b bg-green-50 dark:bg-green-900/20">
                    <td className="p-2">{s.studentId}</td>
                    <td className="p-2">{s.firstName} {s.lastName}</td>
                    <td className="p-2">{s.class}</td>
                    <td className="p-2">{s.section}</td>
                    <td className="p-2">{s.rollNumber}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4">
        <h3 className="font-bold mb-2">Exam Data Summary:</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold">Cycles ({cycles.length}):</h4>
            <pre className="text-xs overflow-auto">{JSON.stringify(cycles, null, 2)}</pre>
          </div>
          <div>
            <h4 className="font-semibold">Schedules ({schedules.length}):</h4>
            <pre className="text-xs overflow-auto">{JSON.stringify(schedules, null, 2)}</pre>
          </div>
          <div>
            <h4 className="font-semibold">Marks ({marks.length}):</h4>
            <pre className="text-xs overflow-auto">{JSON.stringify(marks, null, 2)}</pre>
          </div>
        </div>
      </div>

      <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4">
        <h3 className="font-bold mb-2">Raw localStorage data:</h3>
        <pre className="text-xs overflow-auto max-h-96">
          {JSON.stringify(students, null, 2)}
        </pre>
      </div>
    </div>
  );
}
