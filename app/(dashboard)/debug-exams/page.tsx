"use client";

import { useEffect, useState } from "react";

export default function DebugExamsPage() {
  const [data, setData] = useState<any>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cycles = localStorage.getItem('exam_cycles');
      const schedules = localStorage.getItem('exam_schedules');
      const students = localStorage.getItem('school_students');
      const marks = localStorage.getItem('exam_marks');

      setData({
        cycles: cycles ? JSON.parse(cycles) : [],
        schedules: schedules ? JSON.parse(schedules) : [],
        students: students ? JSON.parse(students) : [],
        marks: marks ? JSON.parse(marks) : [],
      });
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Debug Exam Data</h1>
      
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Exam Cycles ({data.cycles?.length || 0})</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify(data.cycles, null, 2)}</pre>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Exam Schedules ({data.schedules?.length || 0})</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify(data.schedules, null, 2)}</pre>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Students ({data.students?.length || 0})</h2>
          <div className="space-y-2">
            <p className="text-sm">Classes and Sections:</p>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(
                data.students?.reduce((acc: any, s: any) => {
                  const key = `${s.class} - Section ${s.section}`;
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {}),
                null,
                2
              )}
            </pre>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Marks ({data.marks?.length || 0})</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify(data.marks, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
