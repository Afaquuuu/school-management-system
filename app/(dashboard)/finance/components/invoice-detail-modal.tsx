"use client";

import { X, Download, Printer, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/date-format";
import { exportKeyValueCsv, printHtml } from "@/lib/export-data";

type Invoice = {
  id: string;
  invoiceNo: string;
  studentName: string;
  className: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  issuedAt: string;
  dueAt: string;
};

type InvoiceDetailModalProps = {
  invoice: Invoice | null;
  onClose: () => void;
};

export function InvoiceDetailModal({ invoice, onClose }: InvoiceDetailModalProps) {
  if (!invoice) return null;

  const balance = invoice.totalAmount - invoice.paidAmount;
  const paymentProgress = (invoice.paidAmount / invoice.totalAmount) * 100;

  const getStatusConfig = () => {
    switch (invoice.status) {
      case 'paid':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Paid in Full' };
      case 'partially_paid':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Partially Paid' };
      case 'overdue':
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Overdue' };
      default:
        return { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Issued' };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const handleDownloadInvoice = () => {
    exportKeyValueCsv(`invoice-${invoice.invoiceNo}`, [
      { label: "Invoice No", value: invoice.invoiceNo },
      { label: "Student", value: invoice.studentName },
      { label: "Class", value: invoice.className },
      { label: "Issued Date", value: formatDate(invoice.issuedAt) },
      { label: "Due Date", value: formatDate(invoice.dueAt) },
      { label: "Total Amount", value: invoice.totalAmount },
      { label: "Paid Amount", value: invoice.paidAmount },
      { label: "Balance Due", value: balance },
      { label: "Status", value: statusConfig.label },
    ]);
  };

  const handlePrintInvoice = () => {
    printHtml(
      `Invoice ${invoice.invoiceNo}`,
      `<table>
        <tr><th>Invoice No</th><td>${invoice.invoiceNo}</td></tr>
        <tr><th>Student</th><td>${invoice.studentName}</td></tr>
        <tr><th>Class</th><td>${invoice.className}</td></tr>
        <tr><th>Issued</th><td>${formatDate(invoice.issuedAt)}</td></tr>
        <tr><th>Due</th><td>${formatDate(invoice.dueAt)}</td></tr>
        <tr><th>Total</th><td>₵${invoice.totalAmount.toFixed(2)}</td></tr>
        <tr><th>Paid</th><td>₵${invoice.paidAmount.toFixed(2)}</td></tr>
        <tr><th>Balance</th><td>₵${balance.toFixed(2)}</td></tr>
        <tr><th>Status</th><td>${statusConfig.label}</td></tr>
      </table>`,
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Invoice Details</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {invoice.invoiceNo}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintInvoice}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Print"
            >
              <Printer className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button
              type="button"
              onClick={handleDownloadInvoice}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Status Banner */}
            <div className={`${statusConfig.bg} border-2 ${statusConfig.color.replace('text-', 'border-')} rounded-xl p-4`}>
              <div className="flex items-center gap-3">
                <StatusIcon className={`w-8 h-8 ${statusConfig.color}`} />
                <div className="flex-1">
                  <p className={`text-lg font-bold ${statusConfig.color}`}>{statusConfig.label}</p>
                  {balance > 0 && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Balance Due: <span className="font-bold text-red-600">₵{balance.toFixed(2)}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Student & Invoice Info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Bill To</h4>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-50">{invoice.studentName}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{invoice.className}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Invoice Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Invoice No:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-50">{invoice.invoiceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Issued Date:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-50">{formatDate(invoice.issuedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Due Date:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-50">{formatDate(invoice.dueAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Payment Progress</h4>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  {paymentProgress.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    paymentProgress === 100 ? 'bg-green-500' : 
                    paymentProgress > 0 ? 'bg-yellow-500' : 'bg-slate-300'
                  }`}
                  style={{ width: `${paymentProgress}%` }}
                />
              </div>
            </div>

            {/* Amount Breakdown */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-900 px-6 py-3 border-b border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-slate-900 dark:text-slate-50">Amount Breakdown</h4>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Total Amount</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-50">₵{invoice.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Amount Paid</span>
                  <span className="text-xl font-bold text-green-600">₵{invoice.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">Balance Due</span>
                  <span className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₵{balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Fee Items (Sample) */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-900 px-6 py-3 border-b border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-slate-900 dark:text-slate-50">Fee Items</h4>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Tuition Fee</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">₵1,200.00</span>
                </div>
                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Laboratory Fee</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">₵150.00</span>
                </div>
                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Library Fee</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">₵100.00</span>
                </div>
                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Sports Fee</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">₵80.00</span>
                </div>
                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Examination Fee</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">₵120.00</span>
                </div>
              </div>
            </div>

            {/* Payment History (if any payments made) */}
            {invoice.paidAmount > 0 && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-900 px-6 py-3 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-50">Payment History</h4>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">Payment Received</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(new Date())} • Cash
                      </p>
                    </div>
                    <span className="text-lg font-bold text-green-600">₵{invoice.paidAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Generated on {formatDate(new Date())}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
