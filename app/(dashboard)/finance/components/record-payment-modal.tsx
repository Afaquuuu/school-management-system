"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Search, CreditCard, Banknote, Building2, Smartphone } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { getTodayIsoDate } from "@/lib/date-format";

type PaymentInvoice = {
  id: string;
  invoiceNo: string;
  studentName: string;
  className: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
};

type SelectedInvoice = PaymentInvoice & {
  balance: number;
};

type RecordPaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => void;
  invoices?: PaymentInvoice[];
};

export type PaymentFormData = {
  invoiceId: string;
  amount: number;
  method: string;
  reference: string;
  notes: string;
  paidAt: string;
};

const paymentMethods = [
  { id: "cash", label: "Cash", icon: Banknote, color: "bg-green-100 text-green-700 border-green-200" },
  { id: "card", label: "Card", icon: CreditCard, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "bank_transfer", label: "Bank Transfer", icon: Building2, color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "mobile_money", label: "Mobile Money", icon: Smartphone, color: "bg-orange-100 text-orange-700 border-orange-200" },
];

export function RecordPaymentModal({ isOpen, onClose, onSubmit, invoices = [] }: RecordPaymentModalProps) {
  const [selectedClassName, setSelectedClassName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<SelectedInvoice | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState(getTodayIsoDate());

  useEffect(() => {
    if (!isOpen) return;

    setSelectedClassName("");
    setSearchTerm("");
    setSelectedInvoice(null);
    setAmount("");
    setMethod("");
    setReference("");
    setNotes("");
    setPaidAt(getTodayIsoDate());
  }, [isOpen]);

  const unpaidInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.totalAmount - invoice.paidAmount > 0),
    [invoices],
  );

  const classOptions = useMemo(() => {
    const byClass = new Map<string, number>();

    for (const invoice of unpaidInvoices) {
      const label = invoice.className || "Unknown Class";
      byClass.set(label, (byClass.get(label) ?? 0) + 1);
    }

    return [...byClass.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [unpaidInvoices]);

  const classInvoices = useMemo(
    () => unpaidInvoices.filter((invoice) => invoice.className === selectedClassName),
    [unpaidInvoices, selectedClassName],
  );

  const filteredInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return classInvoices;

    return classInvoices.filter(
      (invoice) =>
        invoice.studentName.toLowerCase().includes(term) ||
        invoice.invoiceNo.toLowerCase().includes(term),
    );
  }, [classInvoices, searchTerm]);

  if (!isOpen) return null;

  const handleClassChange = (className: string) => {
    setSelectedClassName(className);
    setSearchTerm("");
    setSelectedInvoice(null);
    setAmount("");
  };

  const handleSubmit = () => {
    if (!selectedInvoice || !amount || !method || !paidAt) {
      alert("Please fill in all required fields");
      return;
    }

    const balance = selectedInvoice.totalAmount - selectedInvoice.paidAmount;
    const paymentAmount = parseFloat(amount);

    if (paymentAmount <= 0 || paymentAmount > balance) {
      alert(`Payment amount must be between ₵0 and ₵${balance.toFixed(2)}`);
      return;
    }

    onSubmit({
      invoiceId: selectedInvoice.id,
      amount: paymentAmount,
      method,
      reference,
      notes,
      paidAt,
    });

    onClose();
  };

  const setFullPayment = () => {
    if (selectedInvoice) {
      const balance = selectedInvoice.totalAmount - selectedInvoice.paidAmount;
      setAmount(balance.toString());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Record Payment</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Select a class and invoice to record a payment
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
                value={selectedClassName}
                onChange={(event) => handleClassChange(event.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a class</option>
                {classOptions.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label} ({option.count} unpaid invoice{option.count !== 1 ? "s" : ""})
                  </option>
                ))}
              </select>
              {unpaidInvoices.length === 0 && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  No unpaid invoices found. Create invoices first under Finance → Invoices.
                </p>
              )}
            </div>

            {selectedClassName && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select Invoice *
                </label>
                {!selectedInvoice ? (
                  <>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by student name or invoice number..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                      {filteredInvoices.length > 0 ? (
                        filteredInvoices.map((invoice) => (
                          <button
                            key={invoice.id}
                            type="button"
                            onClick={() =>
                              setSelectedInvoice({
                                ...invoice,
                                balance: invoice.totalAmount - invoice.paidAmount,
                              })
                            }
                            className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-200 dark:border-slate-700 last:border-0 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-slate-900 dark:text-slate-50">{invoice.studentName}</p>
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  invoice.status === "overdue"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {invoice.status === "overdue" ? "Overdue" : "Pending"}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{invoice.invoiceNo}</p>
                            <div className="flex items-center justify-between mt-2 text-sm">
                              <span className="text-slate-600 dark:text-slate-400">
                                Paid: ₵{invoice.paidAmount} / ₵{invoice.totalAmount}
                              </span>
                              <span className="font-bold text-red-600 dark:text-red-400">
                                Balance: ₵{(invoice.totalAmount - invoice.paidAmount).toFixed(2)}
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                          No unpaid invoices found for this class
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedInvoice.studentName}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {selectedInvoice.invoiceNo} • {selectedInvoice.className}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInvoice(null);
                          setAmount("");
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        Change
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Total</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">₵{selectedInvoice.totalAmount}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Paid</p>
                        <p className="font-semibold text-green-600">₵{selectedInvoice.paidAmount}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Balance</p>
                        <p className="font-semibold text-red-600">
                          ₵{(selectedInvoice.totalAmount - selectedInvoice.paidAmount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Payment Amount *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={selectedInvoice ? selectedInvoice.totalAmount - selectedInvoice.paidAmount : 0}
                  disabled={!selectedInvoice}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                {selectedInvoice && (
                  <button
                    type="button"
                    onClick={setFullPayment}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Full Payment
                  </button>
                )}
              </div>
              {selectedInvoice && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Maximum: ₵{(selectedInvoice.totalAmount - selectedInvoice.paidAmount).toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Payment Method *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setMethod(pm.id)}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        method === pm.id
                          ? pm.color + " border-current"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <Icon className="w-6 h-6 mb-2 mx-auto" />
                      <p className="text-sm font-semibold text-center">{pm.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Payment Date *
              </label>
              <DateInput value={paidAt} onChange={setPaidAt} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Reference Number (Optional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Transaction reference or receipt number"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                placeholder="Add any additional notes..."
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {amount && (
              <span>
                Recording:{" "}
                <span className="font-bold text-slate-900 dark:text-slate-50">
                  ₵{parseFloat(amount || "0").toFixed(2)}
                </span>
              </span>
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
              disabled={!selectedInvoice || !amount || !method || !paidAt}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
            >
              Record Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
