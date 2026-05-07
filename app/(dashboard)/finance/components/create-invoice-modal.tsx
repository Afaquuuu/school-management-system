"use client";

import { useState } from "react";
import { X, Search, Plus, Trash2 } from "lucide-react";

type FeeItem = {
  id: string;
  description: string;
  amount: number;
};

type CreateInvoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => void;
};

export type InvoiceFormData = {
  studentIds: string[];
  classId: string;
  dueDate: string;
  items: FeeItem[];
  notes: string;
};

const sampleStudents = [
  { id: "1", name: "Ama Johnson", admissionNo: "ADM-0001", className: "Grade 8A", classId: "class1" },
  { id: "2", name: "Kofi Badu", admissionNo: "ADM-0002", className: "Grade 8A", classId: "class1" },
  { id: "3", name: "Peter Owusu", admissionNo: "ADM-0004", className: "Grade 8A", classId: "class1" },
  { id: "4", name: "Hannah Lee", admissionNo: "ADM-0005", className: "Grade 9B", classId: "class2" },
  { id: "5", name: "David Mensah", admissionNo: "ADM-0006", className: "Grade 7A", classId: "class3" },
];

const feeTemplates = [
  { id: "tuition", description: "Tuition Fee", amount: 1200 },
  { id: "lab", description: "Laboratory Fee", amount: 150 },
  { id: "library", description: "Library Fee", amount: 100 },
  { id: "sports", description: "Sports Fee", amount: 80 },
  { id: "exam", description: "Examination Fee", amount: 120 },
];

export function CreateInvoiceModal({ isOpen, onClose, onSubmit }: CreateInvoiceModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<typeof sampleStudents>([]);
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<FeeItem[]>([]);
  const [notes, setNotes] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  if (!isOpen) return null;

  const filteredStudents = sampleStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStudent = (student: typeof sampleStudents[0]) => {
    const isSelected = selectedStudents.some(s => s.id === student.id);
    if (isSelected) {
      setSelectedStudents(selectedStudents.filter(s => s.id !== student.id));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  const selectAllStudents = () => {
    setSelectedStudents([...filteredStudents]);
  };

  const clearAllStudents = () => {
    setSelectedStudents([]);
  };

  const isStudentSelected = (studentId: string) => {
    return selectedStudents.some(s => s.id === studentId);
  };

  const addFeeItem = (description: string, amount: number) => {
    const newItem: FeeItem = {
      id: Date.now().toString(),
      description,
      amount,
    };
    setItems([...items, newItem]);
  };

  const removeFeeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const addCustomItem = () => {
    if (customDescription && customAmount) {
      addFeeItem(customDescription, parseFloat(customAmount));
      setCustomDescription("");
      setCustomAmount("");
    }
  };

  const addAllFees = () => {
    // Add all fee templates that aren't already added
    const existingDescriptions = items.map(item => item.description);
    const newItems = feeTemplates
      .filter(template => !existingDescriptions.includes(template.description))
      .map(template => ({
        id: Date.now().toString() + Math.random(),
        description: template.description,
        amount: template.amount,
      }));
    setItems([...items, ...newItems]);
  };

  const clearAllFees = () => {
    setItems([]);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = () => {
    if (selectedStudents.length === 0 || items.length === 0 || !dueDate) {
      alert("Please fill in all required fields");
      return;
    }

    onSubmit({
      studentIds: selectedStudents.map(s => s.id),
      classId: selectedStudents[0].classId,
      dueDate,
      items,
      notes,
    });

    // Reset form
    setSelectedStudents([]);
    setSearchTerm("");
    setDueDate("");
    setItems([]);
    setNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Create New Invoice</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Generate fee invoice for a student
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Student Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Select Students *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllStudents}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    Select All
                  </button>
                  {selectedStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllStudents}
                      className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-1 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {selectedStudents.length === 0 ? (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name or admission number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                    {filteredStudents.map((student) => {
                      const isSelected = isStudentSelected(student.id);
                      return (
                        <button
                          key={student.id}
                          onClick={() => toggleStudent(student)}
                          className={`w-full p-3 text-left border-b border-slate-200 dark:border-slate-700 last:border-0 transition-colors ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              : "hover:bg-slate-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? "bg-blue-600 border-blue-600"
                                : "border-slate-300 dark:border-slate-600"
                            }`}>
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
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search to add more students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Selected Students Display */}
                  <div className="mb-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''} Selected
                      </p>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{student.name}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {student.admissionNo} • {student.className}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleStudent(student)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add More Students */}
                  {searchTerm && (
                    <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                      {filteredStudents
                        .filter(s => !isStudentSelected(s.id))
                        .map((student) => (
                          <button
                            key={student.id}
                            onClick={() => toggleStudent(student)}
                            className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-200 dark:border-slate-700 last:border-0 transition-colors"
                          >
                            <p className="font-semibold text-slate-900 dark:text-slate-50">{student.name}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {student.admissionNo} • {student.className}
                            </p>
                          </button>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Fee Items */}
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
              
              {/* Quick Add Templates */}
              <div className="mb-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Quick Add:</p>
                <div className="flex flex-wrap gap-2">
                  {feeTemplates.map((template) => {
                    const isAdded = items.some(item => item.description === template.description);
                    return (
                      <button
                        key={template.id}
                        onClick={() => addFeeItem(template.description, template.amount)}
                        disabled={isAdded}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isAdded
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 cursor-not-allowed"
                            : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {isAdded ? "✓ " : ""}{template.description} (₵{template.amount})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Item */}
              <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Add Custom Item:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-32 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addCustomItem}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Added Items */}
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
                              onClick={() => removeFeeItem(item.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 dark:bg-slate-900 font-bold">
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-50">Total</td>
                        <td className="px-4 py-3 text-right text-lg text-slate-900 dark:text-slate-50">
                          ₵{totalAmount.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any additional notes or instructions..."
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {selectedStudents.length > 0 && items.length > 0 && (
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-50">{selectedStudents.length}</span> student{selectedStudents.length !== 1 ? 's' : ''} × 
                <span className="font-bold text-slate-900 dark:text-slate-50"> ₵{totalAmount.toFixed(2)}</span> = 
                <span className="font-bold text-lg text-blue-600 dark:text-blue-400"> ₵{(selectedStudents.length * totalAmount).toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedStudents.length === 0 || items.length === 0 || !dueDate}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
            >
              Create {selectedStudents.length > 1 ? `${selectedStudents.length} ` : ''}Invoice{selectedStudents.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
