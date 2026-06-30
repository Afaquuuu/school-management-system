"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Search, Plus, Trash2, Users } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { formatStudentClassLabel } from "@/lib/class-labels";
import { getScopedItem, getSchoolClasses, useSchool } from "@/lib/school-context";

type FeeItem = {
  id: string;
  description: string;
  amount: number;
};

type InvoiceStudent = {
  id: string;
  name: string;
  admissionNo: string;
  className: string;
  classKey: string;
  classId: string;
};

type CreateInvoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => void;
};

export type InvoiceFormData = {
  studentIds: string[];
  classId: string;
  classLabel: string;
  dueDate: string;
  items: FeeItem[];
  notes: string;
};

const feeTemplates = [
  { id: "tuition", description: "Tuition Fee", amount: 1200 },
  { id: "lab", description: "Laboratory Fee", amount: 150 },
  { id: "library", description: "Library Fee", amount: 100 },
  { id: "sports", description: "Sports Fee", amount: 80 },
  { id: "exam", description: "Examination Fee", amount: 120 },
];

function buildClassKey(className: string, section: string): string {
  return `${className.trim()}|${section.trim()}`;
}

function loadInvoiceStudents(schoolId: string): InvoiceStudent[] {
  const storedStudents = getScopedItem(schoolId, "school_students");
  const schoolClasses = getSchoolClasses(schoolId);

  if (!storedStudents) return [];

  try {
    const students = JSON.parse(storedStudents) as Array<{
      id: string;
      studentId: string;
      firstName: string;
      lastName: string;
      class: string;
      section: string;
      status?: string;
    }>;

    return students
      .filter((student) => !student.status || student.status === "active")
      .map((student) => {
        const classKey = buildClassKey(student.class, student.section);
        const matchedClass = schoolClasses.find(
          (cls) =>
            buildClassKey(
              cls.name.split(" ").slice(0, -1).join(" ") || cls.name,
              cls.section,
            ) === classKey ||
            cls.name === formatStudentClassLabel(student.class, student.section),
        );

        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          admissionNo: student.studentId,
          className: formatStudentClassLabel(student.class, student.section),
          classKey,
          classId: matchedClass?.id ?? classKey,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function CreateInvoiceModal({ isOpen, onClose, onSubmit }: CreateInvoiceModalProps) {
  const { currentSchool } = useSchool();
  const [students, setStudents] = useState<InvoiceStudent[]>([]);
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<FeeItem[]>([]);
  const [notes, setNotes] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    if (!isOpen || !currentSchool) return;
    setStudents(loadInvoiceStudents(currentSchool.id));
    setSelectedClassKey("");
    setSelectedStudentIds([]);
    setSearchTerm("");
    setDueDate("");
    setItems([]);
    setNotes("");
  }, [isOpen, currentSchool]);

  const classOptions = useMemo(() => {
    const byKey = new Map<string, { classKey: string; label: string; classId: string; count: number }>();

    for (const student of students) {
      const existing = byKey.get(student.classKey);
      if (existing) {
        existing.count += 1;
      } else {
        byKey.set(student.classKey, {
          classKey: student.classKey,
          label: student.className,
          classId: student.classId,
          count: 1,
        });
      }
    }

    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [students]);

  const classStudents = useMemo(
    () => students.filter((student) => student.classKey === selectedClassKey),
    [students, selectedClassKey],
  );

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return classStudents;

    return classStudents.filter(
      (student) =>
        student.name.toLowerCase().includes(term) ||
        student.admissionNo.toLowerCase().includes(term),
    );
  }, [classStudents, searchTerm]);

  const selectedStudents = useMemo(
    () => students.filter((student) => selectedStudentIds.includes(student.id)),
    [students, selectedStudentIds],
  );

  const selectedClass = classOptions.find((option) => option.classKey === selectedClassKey);

  if (!isOpen) return null;

  const handleClassChange = (classKey: string) => {
    setSelectedClassKey(classKey);
    setSearchTerm("");

    if (!classKey) {
      setSelectedStudentIds([]);
      return;
    }

    const idsInClass = students
      .filter((student) => student.classKey === classKey)
      .map((student) => student.id);
    setSelectedStudentIds(idsInClass);
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  };

  const selectAllInClass = () => {
    setSelectedStudentIds(classStudents.map((student) => student.id));
  };

  const clearSelectedStudents = () => {
    setSelectedStudentIds([]);
  };

  const addFeeItem = (description: string, amount: number) => {
    setItems((current) => [
      ...current,
      { id: Date.now().toString(), description, amount },
    ]);
  };

  const removeFeeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const addCustomItem = () => {
    if (customDescription && customAmount) {
      addFeeItem(customDescription, parseFloat(customAmount));
      setCustomDescription("");
      setCustomAmount("");
    }
  };

  const addAllFees = () => {
    const existingDescriptions = items.map((item) => item.description);
    const newItems = feeTemplates
      .filter((template) => !existingDescriptions.includes(template.description))
      .map((template) => ({
        id: `${Date.now()}-${template.id}`,
        description: template.description,
        amount: template.amount,
      }));
    setItems((current) => [...current, ...newItems]);
  };

  const clearAllFees = () => {
    setItems([]);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = () => {
    if (!selectedClassKey || selectedStudentIds.length === 0 || items.length === 0 || !dueDate) {
      alert("Please select a class, at least one student, fee items, and a due date.");
      return;
    }

    onSubmit({
      studentIds: selectedStudentIds,
      classId: selectedClass?.classId ?? selectedClassKey,
      classLabel: selectedClass?.label ?? selectedClassKey,
      dueDate,
      items,
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Create New Invoice</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Select a class, choose students, and generate fee invoices
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Class *
              </label>
              <select
                value={selectedClassKey}
                onChange={(event) => handleClassChange(event.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a class</option>
                {classOptions.map((option) => (
                  <option key={option.classKey} value={option.classKey}>
                    {option.label} ({option.count} student{option.count !== 1 ? "s" : ""})
                  </option>
                ))}
              </select>
              {students.length === 0 && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  No active students found. Add students under Students → Add Student first.
                </p>
              )}
            </div>

            {selectedClassKey && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Students in {selectedClass?.label} *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllInClass}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      Select All
                    </button>
                    {selectedStudentIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearSelectedStudents}
                        className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-1 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>
                      {selectedStudentIds.length} of {classStudents.length} student
                      {classStudents.length !== 1 ? "s" : ""} selected for invoicing
                    </span>
                  </div>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search students in this class..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                  {filteredStudents.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">No students match your search.</p>
                  ) : (
                    filteredStudents.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.id);
                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => toggleStudent(student.id)}
                          className={`w-full p-3 text-left border-b border-slate-200 dark:border-slate-700 last:border-0 transition-colors ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              : "hover:bg-slate-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? "bg-blue-600 border-blue-600"
                                  : "border-slate-300 dark:border-slate-600"
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 dark:text-slate-50">{student.name}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {student.admissionNo} • {student.className}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Due Date *
              </label>
              <DateInput value={dueDate} onChange={setDueDate} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Fee Items *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addAllFees}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    Select All
                  </button>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFees}
                      className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-1 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Quick Add:</p>
                <div className="flex flex-wrap gap-2">
                  {feeTemplates.map((template) => {
                    const isAdded = items.some((item) => item.description === template.description);
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => addFeeItem(template.description, template.amount)}
                        disabled={isAdded}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isAdded
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 cursor-not-allowed"
                            : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {isAdded ? "✓ " : ""}
                        {template.description} (₵{template.amount})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Add Custom Item:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={customDescription}
                    onChange={(event) => setCustomDescription(event.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    className="w-32 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addCustomItem}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Description</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">Amount</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-slate-900 dark:text-slate-50">{item.description}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-900 dark:text-slate-50">
                            ₵{item.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeFeeItem(item.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 dark:bg-slate-900 font-bold">
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-50">Total per student</td>
                        <td className="px-4 py-3 text-right text-lg text-slate-900 dark:text-slate-50">
                          ₵{totalAmount.toFixed(2)}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Add any additional notes or instructions..."
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {selectedStudents.length > 0 && items.length > 0 && (
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-50">{selectedStudents.length}</span> student
                {selectedStudents.length !== 1 ? "s" : ""} ×
                <span className="font-bold text-slate-900 dark:text-slate-50"> ₵{totalAmount.toFixed(2)}</span> =
                <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                  {" "}
                  ₵{(selectedStudents.length * totalAmount).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedClassKey || selectedStudentIds.length === 0 || items.length === 0 || !dueDate}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
            >
              Create {selectedStudentIds.length > 1 ? `${selectedStudentIds.length} ` : ""}Invoice
              {selectedStudentIds.length > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
