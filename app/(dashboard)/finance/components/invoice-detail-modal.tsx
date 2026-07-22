"use client";

import { useMemo, useState } from "react";
import {
  X,
  Download,
  Printer,
  CheckCircle,
  Clock,
  AlertCircle,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { formatDate } from "@/lib/date-format";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { printHtml } from "@/lib/export-data";
import {
  getInvoiceLineItems,
  type FinanceInvoice,
  type InvoiceLineItem,
} from "@/lib/finance-invoices";
import { getScopedItem, useSchool } from "@/lib/school-context";

type InvoiceDetailModalProps = {
  invoice: FinanceInvoice | null;
  onClose: () => void;
  canSendReminder?: boolean;
  onSendReminder?: (invoice: FinanceInvoice) => Promise<void>;
  isSendingReminder?: boolean;
};

function formatMoney(amount: number): string {
  return `₵${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "paid":
      return {
        icon: CheckCircle,
        label: "Paid in Full",
        badgeClass: "bg-emerald-100 text-emerald-800 ring-emerald-200",
        stampClass: "text-emerald-600 border-emerald-300",
      };
    case "partially_paid":
      return {
        icon: Clock,
        label: "Partially Paid",
        badgeClass: "bg-amber-100 text-amber-800 ring-amber-200",
        stampClass: "text-amber-600 border-amber-300",
      };
    case "overdue":
      return {
        icon: AlertCircle,
        label: "Overdue",
        badgeClass: "bg-red-100 text-red-800 ring-red-200",
        stampClass: "text-red-600 border-red-300",
      };
    default:
      return {
        icon: Clock,
        label: "Fee Invoice Issued",
        badgeClass: "bg-blue-100 text-blue-800 ring-blue-200",
        stampClass: "text-blue-600 border-blue-300",
      };
  }
}

function buildPrintHtml(options: {
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  invoice: FinanceInvoice;
  lineItems: InvoiceLineItem[];
  statusLabel: string;
  admissionNo: string;
  academicYear: string;
}) {
  const { invoice, lineItems, schoolName, schoolAddress, schoolPhone, schoolEmail, statusLabel, admissionNo, academicYear } =
    options;
  const balance = invoice.totalAmount - invoice.paidAmount;
  const rows = lineItems
    .map(
      (item, index) =>
        `<tr>
          <td style="padding:10px 12px;border:1px solid #cbd5e1;text-align:center;">${index + 1}</td>
          <td style="padding:10px 12px;border:1px solid #cbd5e1;">${item.description}</td>
          <td style="padding:10px 12px;border:1px solid #cbd5e1;text-align:right;font-weight:600;">${formatMoney(item.amount)}</td>
        </tr>`,
    )
    .join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:820px;margin:0 auto;word-spacing:normal;letter-spacing:normal;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1d4ed8;padding-bottom:18px;margin-bottom:22px;">
      <div>
        <div style="font-size:24px;font-weight:700;color:#1e3a8a;">${schoolName}</div>
        <div style="margin-top:6px;font-size:13px;color:#475569;line-height:1.6;">
          ${schoolAddress}<br/>
          Phone: ${schoolPhone || "—"} · Email: ${schoolEmail || "—"}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="display:inline-block;background:#1d4ed8;color:#fff;padding:8px 16px;font-size:12px;font-weight:700;">FEE INVOICE</div>
        <div style="margin-top:10px;font-size:13px;color:#475569;">Academic Year ${academicYear}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:16px;">
          <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px;">BILL TO</div>
          <div style="font-size:18px;font-weight:700;">${invoice.studentName}</div>
          <div style="margin-top:4px;color:#475569;">Class: ${invoice.className}</div>
          ${admissionNo ? `<div style="margin-top:2px;color:#475569;">Admission No: ${admissionNo}</div>` : ""}
        </td>
        <td style="width:50%;vertical-align:top;">
          <table style="width:100%;border:1px solid #cbd5e1;border-collapse:collapse;font-size:13px;">
            <tr><td style="padding:8px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Invoice No.</td><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;">${invoice.invoiceNo}</td></tr>
            <tr><td style="padding:8px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Issue Date</td><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${formatDate(invoice.issuedAt)}</td></tr>
            <tr><td style="padding:8px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">Due Date</td><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${formatDate(invoice.dueAt)}</td></tr>
            <tr><td style="padding:8px 10px;background:#f8fafc;">Status</td><td style="padding:8px 10px;font-weight:700;">${statusLabel}</td></tr>
          </table>
        </td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px;">
      <thead>
        <tr style="background:#1e3a8a;color:#fff;">
          <th style="padding:10px 12px;border:1px solid #1e3a8a;width:48px;">#</th>
          <th style="padding:10px 12px;border:1px solid #1e3a8a;text-align:left;">Fee Description</th>
          <th style="padding:10px 12px;border:1px solid #1e3a8a;text-align:right;width:140px;">Amount (₵)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="2" style="padding:10px 12px;border:1px solid #cbd5e1;text-align:right;font-weight:700;background:#f8fafc;">Total Amount</td><td style="padding:10px 12px;border:1px solid #cbd5e1;text-align:right;font-weight:700;background:#f8fafc;">${formatMoney(invoice.totalAmount)}</td></tr>
        <tr><td colspan="2" style="padding:10px 12px;border:1px solid #cbd5e1;text-align:right;color:#047857;">Amount Paid</td><td style="padding:10px 12px;border:1px solid #cbd5e1;text-align:right;color:#047857;font-weight:700;">${formatMoney(invoice.paidAmount)}</td></tr>
        <tr><td colspan="2" style="padding:10px 12px;border:1px solid #cbd5e1;text-align:right;font-weight:700;">Balance Due</td><td style="padding:10px 12px;border:1px solid #cbd5e1;text-align:right;font-weight:700;color:${balance > 0 ? "#dc2626" : "#047857"};">${formatMoney(balance)}</td></tr>
      </tfoot>
    </table>
    <div style="border:1px solid #cbd5e1;background:#f8fafc;padding:14px 16px;font-size:12px;line-height:1.7;color:#475569;margin-bottom:24px;">
      <strong style="color:#0f172a;">Payment Instructions:</strong> Please pay the balance due by the date shown above at the school accounts office during working hours (Mon–Fri, 8:00 AM – 2:00 PM). Retain this invoice as proof of billing. For payment queries, contact the school finance office.
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:36px;font-size:12px;color:#64748b;">
      <div>Generated on ${formatDate(new Date())}</div>
      <div style="text-align:center;min-width:220px;">
        <div style="border-top:1px solid #94a3b8;padding-top:8px;">Authorized Signature</div>
        <div style="margin-top:4px;font-weight:600;color:#334155;">School Accounts Office</div>
      </div>
    </div>
  </div>`;
}

export function InvoiceDetailModal({
  invoice,
  onClose,
  canSendReminder = false,
  onSendReminder,
  isSendingReminder = false,
}: InvoiceDetailModalProps) {
  const { currentSchool } = useSchool();
  const [isDownloading, setIsDownloading] = useState(false);

  const admissionNo = useMemo(() => {
    if (!invoice?.studentId || !currentSchool) return "";
    const stored = getScopedItem(currentSchool.id, "school_students");
    if (!stored) return "";
    try {
      const students = JSON.parse(stored) as Array<{ id: string; studentId: string }>;
      return students.find((student) => student.id === invoice.studentId)?.studentId ?? "";
    } catch {
      return "";
    }
  }, [invoice, currentSchool]);

  if (!invoice) return null;

  const lineItems = getInvoiceLineItems(invoice);
  const balance = invoice.totalAmount - invoice.paidAmount;
  const paymentProgress =
    invoice.totalAmount > 0 ? (invoice.paidAmount / invoice.totalAmount) * 100 : 0;
  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;
  const academicYear = `${new Date(invoice.issuedAt).getFullYear()}–${new Date(invoice.issuedAt).getFullYear() + 1}`;
  const showSendReminder =
    canSendReminder &&
    onSendReminder &&
    invoice.status !== "paid" &&
    invoice.status !== "void" &&
    invoice.status !== "draft" &&
    balance > 0;

  const schoolName = currentSchool?.name ?? "School Management System";
  const schoolAddress = currentSchool?.address ?? "School Address";
  const schoolPhone = currentSchool?.phone ?? "";
  const schoolEmail = currentSchool?.email ?? "";

  const handleDownloadInvoice = async () => {
    setIsDownloading(true);
    try {
      await downloadInvoicePdf({
        fileName: `invoice-${invoice.invoiceNo}`,
        schoolName,
        schoolAddress,
        schoolPhone,
        schoolEmail,
        invoice,
        lineItems,
        statusLabel: statusConfig.label,
        admissionNo,
        academicYear,
      });
    } catch (error) {
      console.error("Failed to download invoice PDF:", error);
      alert("Could not download the invoice PDF. Please try Print Bill and save as PDF instead.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintInvoice = () => {
    printHtml(
      `Fee Invoice ${invoice.invoiceNo} — ${schoolName}`,
      buildPrintHtml({
        schoolName,
        schoolAddress,
        schoolPhone,
        schoolEmail,
        invoice,
        lineItems,
        statusLabel: statusConfig.label,
        admissionNo,
        academicYear,
      }),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm md:items-center md:p-4">
      <div className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:max-h-[94vh] md:rounded-2xl">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 md:px-5 md:py-3">
          <p className="truncate pr-2 text-xs font-medium text-slate-600 dark:text-slate-300 md:text-sm">
            Official Fee Invoice
          </p>
          <div className="flex shrink-0 items-center gap-0.5 md:gap-1">
            <button
              type="button"
              onClick={handlePrintInvoice}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800"
              title="Print invoice"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDownloadInvoice}
              disabled={isDownloading}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              title={isDownloading ? "Preparing PDF..." : "Download invoice PDF"}
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bill document */}
        <div className="min-w-0 overflow-x-hidden overflow-y-auto bg-[#faf9f6] p-3 dark:bg-slate-900 md:p-6">
          <div className="relative mx-auto min-w-0 max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950 md:p-8">
            {/* Letterhead */}
            <div className="border-b-[3px] border-blue-800 pb-4 md:pb-6">
              <div className="flex flex-col gap-4 md:gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-3 md:gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-800 text-white shadow-md md:h-14 md:w-14">
                    <GraduationCap className="h-6 w-6 md:h-7 md:w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-serif text-lg font-bold leading-snug tracking-tight text-blue-900 dark:text-blue-100 md:text-2xl">
                      {schoolName}
                    </h2>
                    <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {schoolAddress}
                      </p>
                      {schoolPhone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          {schoolPhone}
                        </p>
                      )}
                      {schoolEmail && (
                        <p className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {schoolEmail}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 text-left md:text-right">
                  <span className="inline-block bg-blue-800 px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] text-white md:px-4 md:py-2 md:text-xs md:tracking-[0.18em]">
                    FEE INVOICE
                  </span>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 md:mt-3 md:text-sm">
                    Academic Year {academicYear}
                  </p>
                  <span
                    className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 md:mt-3 md:px-3 md:text-xs ${statusConfig.badgeClass}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Bill to + invoice meta */}
            <div className="mt-4 grid gap-4 md:mt-6 md:gap-6 md:grid-cols-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Bill To
                </p>
                <p className="mt-2 break-words font-serif text-lg font-bold text-slate-900 dark:text-slate-50 md:text-xl">
                  {invoice.studentName}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Class: {invoice.className}
                </p>
                {admissionNo && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Admission No: {admissionNo}
                  </p>
                )}
              </div>

              {/* Mobile: stacked invoice meta */}
              <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700 md:hidden">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">Invoice No.</span>
                  <span className="break-all text-right text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {invoice.invoiceNo}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Issue Date</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {formatDate(invoice.issuedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Due Date</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {formatDate(invoice.dueAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Balance Due</span>
                  <span
                    className={`text-base font-bold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {formatMoney(balance)}
                  </span>
                </div>
              </div>

              {/* Desktop: invoice meta table */}
              <div className="hidden overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 md:block">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="bg-slate-50 px-3 py-2.5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        Invoice No.
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-slate-50">
                        {invoice.invoiceNo}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="bg-slate-50 px-3 py-2.5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        Issue Date
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                        {formatDate(invoice.issuedAt)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="bg-slate-50 px-3 py-2.5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        Due Date
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                        {formatDate(invoice.dueAt)}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-50 px-3 py-2.5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        Balance Due
                      </td>
                      <td
                        className={`px-3 py-2.5 text-lg font-bold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}
                      >
                        {formatMoney(balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile: fee line items */}
            <div className="mt-5 space-y-2 md:hidden">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Fee Breakdown
              </p>
              {lineItems.map((item, index) => (
                <div
                  key={`${item.description}-mobile-${index}`}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-400">#{index + 1}</p>
                      <p className="mt-0.5 break-words text-sm text-slate-800 dark:text-slate-200">
                        {item.description}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {formatMoney(item.amount)}
                    </p>
                  </div>
                </div>
              ))}
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Total Amount</span>
                  <span className="font-bold text-slate-900 dark:text-slate-50">
                    {formatMoney(invoice.totalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-emerald-700 dark:text-emerald-400">Amount Paid</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatMoney(invoice.paidAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-700">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-50">Balance Due</span>
                  <span
                    className={`text-base font-bold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {formatMoney(balance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop: fee table */}
            <div className="mt-8 hidden overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="w-12 px-3 py-3 text-center font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Fee Description</th>
                    <th className="w-36 px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr
                      key={`${item.description}-${index}`}
                      className="border-t border-slate-200 dark:border-slate-700"
                    >
                      <td className="px-3 py-3 text-center text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-50">
                        {formatMoney(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                    <td colSpan={2} className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                      Total Amount
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-slate-900 dark:text-slate-50">
                      {formatMoney(invoice.totalAmount)}
                    </td>
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td colSpan={2} className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">
                      Amount Paid
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatMoney(invoice.paidAmount)}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
                    <td colSpan={2} className="px-4 py-3 text-right text-base font-bold text-slate-900 dark:text-slate-50">
                      Balance Due
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-xl font-bold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {formatMoney(balance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payment progress */}
            {invoice.paidAmount > 0 && invoice.paidAmount < invoice.totalAmount && (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Payment received
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                    {paymentProgress.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${paymentProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <span className="font-semibold text-slate-800 dark:text-slate-100">Note: </span>
                {invoice.notes}
              </div>
            )}

            {/* Payment instructions */}
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-3 text-xs leading-relaxed text-slate-600 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-slate-300 md:mt-6 md:px-4 md:py-4 md:text-sm">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Payment Instructions</p>
              <p className="mt-2">
                Please pay the balance due by the date shown above at the school accounts office
                during working hours (Mon–Fri, 8:00 AM – 2:00 PM). Retain this invoice as proof of
                billing. For payment queries, contact the school finance office
                {schoolPhone ? ` at ${schoolPhone}` : ""}.
              </p>
            </div>

            {/* Footer signature */}
            <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400 md:mt-10 md:gap-6 md:pt-6 md:text-sm md:flex-row md:items-end">
              <p>Document generated on {formatDate(new Date())}</p>
              <div className="text-center md:min-w-[220px]">
                <div className="border-t border-slate-400 pt-2 dark:border-slate-600">
                  Authorized Signature
                </div>
                <p className="mt-1 font-semibold text-slate-700 dark:text-slate-300">
                  School Accounts Office
                </p>
              </div>
            </div>

            {/* Paid stamp */}
            {invoice.status === "paid" && (
              <div className="pointer-events-none absolute right-10 top-32 hidden rotate-[-12deg] rounded-lg border-4 border-emerald-500 px-6 py-2 text-2xl font-black uppercase tracking-widest text-emerald-600 opacity-20 md:block">
                Paid
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 md:flex-row md:items-center md:justify-end md:gap-3 md:px-5 md:py-4">
          {showSendReminder && (
            <button
              type="button"
              onClick={() => onSendReminder?.(invoice)}
              disabled={isSendingReminder}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 md:w-auto md:py-2"
            >
              <Mail className="h-4 w-4" />
              {isSendingReminder ? "Sending..." : "Email Reminder"}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
            <button
              type="button"
              onClick={handlePrintInvoice}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 md:w-auto md:px-4 md:py-2"
            >
              <Printer className="h-4 w-4" />
              Print Bill
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 md:w-auto md:px-5 md:py-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
