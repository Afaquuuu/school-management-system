"use client";

import { CheckCircle2, ChevronUp, Clock3, TrendingUp } from "lucide-react";

type SubjectMark = {
  subject: string;
  mark: number;
  classAverage: number;
};

type TrendPoint = {
  term: string;
  score: number;
  classAverage: number;
};

type PerformanceSummaryProps = {
  studentName: string;
  className: string;
  attendanceRate: number;
  overallScore: number;
  previousScore: number;
  subjectMarks: SubjectMark[];
  trend: TrendPoint[];
};

export function PerformanceSummary({
  studentName,
  className,
  attendanceRate,
  overallScore,
  previousScore,
  subjectMarks,
  trend,
}: PerformanceSummaryProps) {
  const change = overallScore - previousScore;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Student performance summary</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{studentName}</h2>
          <p className="mt-1 text-sm text-slate-600">{className}</p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Overall score</p>
          <p className="mt-1 text-3xl font-semibold">{overallScore}%</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Attendance rate</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-950">{attendanceRate}%</p>
              <p className="text-sm text-slate-600">Daily presence in class</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Change from previous term</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-950">
                {change >= 0 ? "+" : ""}{change}%
              </p>
              <p className="text-sm text-slate-600">Compared with last term</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Trend window</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-950">{trend.length} weeks</p>
              <p className="text-sm text-slate-600">Performance movement tracked</p>
            </div>
          </div>
        </article>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Subject marks</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">Marks against class average</h3>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {subjectMarks.length} subjects
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {subjectMarks.map((item) => {
              const gap = item.mark - item.classAverage;

              return (
                <div key={item.subject} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{item.subject}</p>
                      <p className="text-xs text-slate-500">Class average {item.classAverage}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-950">{item.mark}%</p>
                      <p className={`text-xs font-medium ${gap >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {gap >= 0 ? "+" : ""}{gap}% vs class
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-950" style={{ width: `${item.mark}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Attendance notes</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Attendance status</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{attendanceRate}%</p>
              <p className="mt-1 text-sm text-slate-600">This student is consistently present in class.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Action point</p>
              <p className="mt-2 text-sm text-slate-700">
                Use this summary to guide teacher comments, parent follow-up, and intervention planning.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Performance signal</p>
              <p className="mt-2 text-sm text-slate-300">
                {overallScore >= previousScore ? "Improving" : "Needs attention"} based on current term progress.
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <div className="flex items-center gap-2 font-medium text-slate-950">
          <ChevronUp className="h-4 w-4" />
          Visual note
        </div>
        <p className="mt-2">
          This widget is designed for school dashboards: marks, class averages, attendance, and term trend all appear in one clean summary.
        </p>
      </div>
    </section>
  );
}
