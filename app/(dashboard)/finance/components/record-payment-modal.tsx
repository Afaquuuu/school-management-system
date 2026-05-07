"use client";

import { useState } from "react";
import { X, Search, CreditCard, Banknote, Building2, Smartphone } from "lucide-react";

type RecordPaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => void;
  invoices?: Array<{
    id: string;
    invoiceNo: string;
    studentName: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
  }>;
};

export type PaymentFormData = {
  invoiceId: string;
  amount: number;
  method: string;
  reference: string;
  notes: string;
  paidAt: string;
};

const sampleInvoices = [
  { id: "1", invoiceNo: "INV-2026-001", studentName: "Ama Johnson", totalAmount: 1500, paidAmount: 1500, balance: 0, status: "paid" },
  { id: "2", invoiceNo: "INV-2026-002", studentName: "Kofi Badu", totalAmount: 1500, paidAmount: 750, balance: 750, status: "partially_paid" },
  { id: "3", invoiceNo: "INV-2026-003", studentName: "Peter Owusu", totalAmount: 1500, paidAmount: 0, balance: 1500, status: "overdue" },
  { id: "4", invoiceNo: "INV-2026-004", studentName: "Hannah Lee", totalAmount: 1650, paidAmount: 0, balance: 1650, status: "issued" },
  { id: "5", invoiceNo: "INV-2026-005", studentName: "David Mensah", totalAmount: 1400, paidAmount: 700, balance: 700, status: "partially_paid" },
];

const paymentMethods = [
  { id: "cash", label: "Cash", icon: Banknote, color: "bg-green-100 text-green-700 border-green-200" },
  { id: "card", label: "Card", icon: CreditCard, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "bank_transfer", label: "Bank Transfer", icon: Building2, color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "mobile_money", label: "Mobile Money", icon: Smartphone, color: "bg-orange-100 text-orange-700 border-orange-200" },
];

export function RecordPaymentModal({ isOpen, onClose, onSubmit, invoices: propInvoices }: RecordPaymentModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<typeof sampleInvoices[0] | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  // Use provided invoices or fall back to sample data
  const invoiceList = propInvoices || sampleInvoices;
  const unpaidInvoices = invoiceList.filter(inv => {
    const balance = inv.totalAmount - inv.paidAmount;
    return balance > 0;
  });
  
  const filteredInvoices = unpaidInvoices.filter(
    (inv) =>
      inv.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

    // Reset form
    setSelectedInvoice(null);
    setSearchTerm("");
    setAmount("");
    setMethod("");
    setReference("");
    setNotes("");
    setPaidAt(new Date().toISOString().split('T')[0]);
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
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Record Payment</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Record a payment against an invoice
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
            {/* Invoice Selection */}
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
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                    {filteredInvoices.length > 0 ? (
                      filteredInvoices.map((invoice) => (
                        <button
                          key={invoice.id}
                          onClick={() => setSelectedInvoice({...invoice, balance: invoice.totalAmount - invoice.paidAmount})}
                          className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-200 dark:border-slate-700 last:border-0 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-50">{invoice.studentName}</p>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              invoice.status === "overdue" 
                                ? "bg-red-100 text-red-700" 
                                : "bg-yellow-100 text-yellow-700"
                            }`}>
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
                        No unpaid invoices found
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedInvoice.studentName}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{selectedInvoice.invoiceNo}</p>
                    </div>
                    <button
                      onClick={() => setSelectedInvoice(null)}
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
                      <p className="font-semibold text-red-600">₵{(selectedInvoice.totalAmount - selectedInvoice.paidAmount).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Payment Amount *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={selectedInvoice ? selectedInvoice.totalAmount - selectedInvoice.paidAmount : 0}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedInvoice && (
                  <button
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

            {/* Payment Method */}
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

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Payment Date *
              </label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Reference Number (Optional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction reference or receipt number"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Add any additional notes..."
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {amount && (
              <span>Recording: <span className="font-bold text-slate-900 dark:text-slate-50">₵{parseFloat(amount || "0").toFixed(2)}</span></span>
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
