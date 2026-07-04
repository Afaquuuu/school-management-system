"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  GraduationCap,
  Receipt,
  Search,
  Wallet,
} from "lucide-react";
import { formatDate, getTodayIsoDate } from "@/lib/date-format";
import { formatStudentClassLabel } from "@/lib/class-labels";
import type { SchoolStudentRecord } from "@/lib/parent-student-links";
import type { FinanceInvoice, InvoiceStatus } from "@/lib/finance-invoices";

type ParentInvoicesViewProps = {
  schoolName: string;
  linkedStudents: SchoolStudentRecord[];
  invoices: FinanceInvoice[];
  filteredInvoices: FinanceInvoice[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: InvoiceStatus | "all";
  onStatusFilterChange: (value: InvoiceStatus | "all") => void;
  onViewInvoice: (invoice: FinanceInvoice) => void;
  stats: {
    totalPaid: number;
    balanceDue: number;
    overdueAmount: number;
    pendingCount: number;
    overdueCount: number;
  };
};

function formatMoney(amount: number): string {
  return `₵${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const statusConfig: Record<
  InvoiceStatus,
  { label: string; color: string; icon: typeof Receipt }
> = {
  draft: {
    label: "Draft",
    color: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700 dark:text-slate-200",
    icon: FileText,
  },
  issued: {
    label: "Payment Due",
    color: "bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-200",
    icon: Receipt,
  },
  partially_paid: {
    label: "Partially Paid",
    color: "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200",
    icon: Clock,
  },
  paid: {
    label: "Paid in Full",
    color: "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200",
    icon: CheckCircle,
  },
  overdue: {
    label: "Overdue",
    color: "bg-red-100 text-red-800 ring-red-200 dark:bg-red-900/30 dark:text-red-200",
    icon: AlertCircle,
  },
  void: {
    label: "Void",
    color: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700 dark:text-slate-200",
    icon: FileText,
  },
};

function getDaysUntilDue(dueAt: string): number {
  const today = new Date(getTodayIsoDate());
  const due = new Date(dueAt);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function ParentInvoicesView({
  schoolName,
  linkedStudents,
  invoices,
  filteredInvoices,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onViewInvoice,
  stats,
}: ParentInvoicesViewProps) {
  const nextDueInvoice = useMemo(() => {
    const today = getTodayIsoDate();
    return [...invoices]
      .filter((inv) => inv.totalAmount - inv.paidAmount > 0 && inv.dueAt >= today)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-lg dark:border-blue-900">
        <div className="px-6 py-5 md:px-8 md:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
                Parent Fee Portal
              </p>
              <h2 className="mt-1 text-2xl font-bold md:text-3xl">{schoolName}</h2>
              <p className="mt-2 max-w-xl text-sm text-blue-100">
                View official fee invoices, payment status, and download bills for your children.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/20 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                Linked Students
              </p>
              {linkedStudents.length === 0 ? (
                <p className="mt-1 text-sm text-blue-50">No children linked yet</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {linkedStudents.map((student) => (
                    <span
                      key={student.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white"
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                      {`${student.firstName} ${student.lastName}`.trim()} ·{" "}
                      {formatStudentClassLabel(student.class, student.section)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {linkedStudents.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
          No children are linked to this parent account yet. Ask the school admin to link your
          child in Admin → User Management.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/40 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Amount Paid</p>
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            {formatMoney(stats.totalPaid)}
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
            Total fees settled to date
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-900/40 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Balance Due</p>
            <Wallet className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            {formatMoney(stats.balanceDue)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {stats.pendingCount} unpaid invoice{stats.pendingCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-900/40 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Overdue</p>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            {formatMoney(stats.overdueAmount)}
          </p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {stats.overdueCount > 0
              ? `${stats.overdueCount} invoice${stats.overdueCount === 1 ? "" : "s"} past due date`
              : "All invoices are up to date"}
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-900/40 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Next Due Date</p>
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
            {nextDueInvoice ? formatDate(nextDueInvoice.dueAt) : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {nextDueInvoice
              ? `${nextDueInvoice.invoiceNo} · ${formatMoney(nextDueInvoice.totalAmount - nextDueInvoice.paidAmount)} due`
              : "No upcoming payments"}
          </p>
        </div>
      </div>

      {stats.balanceDue > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Payment reminder</p>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
            Please settle outstanding fees by the due date shown on each invoice. For payment
            methods, bank details, or fee queries, open the bill or contact the school accounts
            office.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, student, or class..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as InvoiceStatus | "all")}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
        >
          <option value="all">All Status</option>
          <option value="issued">Payment Due</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid in Full</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <Receipt className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            No invoices found
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {invoices.length === 0
              ? "No fee invoices have been generated for your linked children yet."
              : "Try adjusting your search or status filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredInvoices.map((invoice) => {
            const config = statusConfig[invoice.status];
            const StatusIcon = config.icon;
            const balance = invoice.totalAmount - invoice.paidAmount;
            const daysUntilDue = getDaysUntilDue(invoice.dueAt);
            const isOverdue = invoice.status === "overdue" || (balance > 0 && daysUntilDue < 0);
            const isDueSoon = balance > 0 && !isOverdue && daysUntilDue <= 7;

            return (
              <article
                key={invoice.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Fee Invoice
                      </p>
                      <h3 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50">
                        {invoice.invoiceNo}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${config.color}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {config.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {invoice.studentName}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{invoice.className}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Total
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">
                        {formatMoney(invoice.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Paid
                      </p>
                      <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        {formatMoney(invoice.paidAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Balance
                      </p>
                      <p
                        className={`mt-1 text-sm font-bold ${
                          balance > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {formatMoney(balance)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Due Date
                      </p>
                      <p
                        className={`mt-0.5 text-sm font-semibold ${
                          isOverdue
                            ? "text-red-600 dark:text-red-400"
                            : isDueSoon
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-900 dark:text-slate-50"
                        }`}
                      >
                        {formatDate(invoice.dueAt)}
                      </p>
                      {balance > 0 && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {isOverdue
                            ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"} overdue`
                            : daysUntilDue === 0
                              ? "Due today"
                              : `${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"} remaining`}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onViewInvoice(invoice)}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4" />
                      View Bill
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
