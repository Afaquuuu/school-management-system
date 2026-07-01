"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import {
  filterStudentsForParentLink,
  formatStudentLinkLabel,
  getStudentClassFilterOptions,
  PARENT_LINK_PAGE_SIZE,
  shouldRequireParentLinkSearch,
  type SchoolStudentRecord,
} from "@/lib/parent-student-links";

type ParentStudentLinkerProps = {
  students: SchoolStudentRecord[];
  linkedStudentIds: string[];
  onLinkedStudentIdsChange: (studentIds: string[]) => void;
  pageSize?: number;
};

export function ParentStudentLinker({
  students,
  linkedStudentIds,
  onLinkedStudentIdsChange,
  pageSize = PARENT_LINK_PAGE_SIZE,
}: ParentStudentLinkerProps) {
  const [studentLinkSearch, setStudentLinkSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [page, setPage] = useState(1);

  const classOptions = useMemo(() => getStudentClassFilterOptions(students), [students]);

  const selectedStudents = useMemo(
    () =>
      linkedStudentIds
        .map((id) => students.find((student) => student.id === id))
        .filter((student): student is SchoolStudentRecord => Boolean(student)),
    [linkedStudentIds, students],
  );

  const filteredStudents = useMemo(
    () =>
      filterStudentsForParentLink(students, {
        query: studentLinkSearch,
        classFilter,
      }),
    [students, studentLinkSearch, classFilter],
  );

  const browseLocked = shouldRequireParentLinkSearch(
    students.length,
    studentLinkSearch,
    classFilter,
  );

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleStudents = browseLocked
    ? []
    : filteredStudents.slice(pageStart, pageStart + pageSize);

  const toggleLinkedStudent = (studentId: string) => {
    onLinkedStudentIdsChange(
      linkedStudentIds.includes(studentId)
        ? linkedStudentIds.filter((id) => id !== studentId)
        : [...linkedStudentIds, studentId],
    );
  };

  const removeLinkedStudent = (studentId: string) => {
    onLinkedStudentIdsChange(linkedStudentIds.filter((id) => id !== studentId));
  };

  const handleSearchChange = (value: string) => {
    setStudentLinkSearch(value);
    setPage(1);
  };

  const handleClassFilterChange = (value: string) => {
    setClassFilter(value);
    setPage(1);
  };

  return (
    <div className="md:col-span-2">
      <label className="mb-2 block text-sm font-bold text-slate-700">
        Linked Student / Child *
      </label>
      <p className="mb-3 text-sm text-slate-500">
        Select the student record(s) this parent should access. Search or filter by class when
        you have many students.
      </p>

      {selectedStudents.length > 0 ? (
        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-700">
            Selected ({selectedStudents.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedStudents.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => removeLinkedStudent(student.id)}
                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-sm font-medium text-blue-800 hover:bg-blue-100"
              >
                {formatStudentLinkLabel(student)}
                <X className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filter by class
          </label>
          <select
            value={classFilter}
            onChange={(e) => handleClassFilterChange(e.target.value)}
            className="input-field"
          >
            <option value="all">All classes ({students.length} students)</option>
            {classOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={studentLinkSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Name, class, or student ID"
              className="input-field pl-10"
            />
          </div>
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
        {students.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            No students found. Add students first, then link them here.
          </p>
        ) : browseLocked ? (
          <p className="p-4 text-sm text-slate-500">
            {students.length} students enrolled. Search by name or student ID, or choose a class
            above to load results.
          </p>
        ) : visibleStudents.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No students match your filters.</p>
        ) : (
          visibleStudents.map((student) => (
            <label
              key={student.id}
              className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={linkedStudentIds.includes(student.id)}
                onChange={() => toggleLinkedStudent(student.id)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-slate-900">
                  {formatStudentLinkLabel(student)}
                </span>
                {student.guardianEmail ? (
                  <span className="block text-xs text-slate-500">
                    Current guardian email: {student.guardianEmail}
                  </span>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>

      {!browseLocked && filteredStudents.length > pageSize ? (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <span>
            Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filteredStudents.length)} of{" "}
            {filteredStudents.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="font-medium text-slate-700">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {linkedStudentIds.length > 0 ? (
        <p className="mt-2 text-sm font-medium text-blue-700">
          {linkedStudentIds.length} student{linkedStudentIds.length === 1 ? "" : "s"} linked
        </p>
      ) : null}
    </div>
  );
}
