"use client";

import { useMemo } from "react";
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
import { exportKeyValueCsv, printHtml } from "@/lib/export-data";
import {
  getInvoiceLineItems,
  type FinanceInvoice,
  type InvoiceLineItem,
} from "@/lib/finance-invoices";
import { getScopedItem, useSchool } from "@/lib/school-context";

type InvoiceDetailModalProps = {
  invoice: FinanceInvoice | null;
  onClose: () => void;
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

  return `<div style="font-family:Georgia,'Times New Roman',serif;color:#0f172a;max-width:820px;margin:0 auto;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1d4ed8;padding-bottom:18px;margin-bottom:22px;">
      <div>
        <div style="font-size:24px;font-weight:700;color:#1e3a8a;">${schoolName}</div>
        <div style="margin-top:6px;font-size:13px;color:#475569;line-height:1.6;">
          ${schoolAddress}<br/>
          Phone: ${schoolPhone || "—"} · Email: ${schoolEmail || "—"}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="display:inline-block;background:#1d4ed8;color:#fff;padding:8px 16px;font-size:12px;font-weight:700;letter-spacing:0.12em;">FEE INVOICE</div>
        <div style="margin-top:10px;font-size:13px;color:#475569;">Academic Year ${academicYear}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:16px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#64748b;margin-bottom:8px;">BILL TO</div>
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

export function InvoiceDetailModal({ invoice, onClose }: InvoiceDetailModalProps) {
  const { currentSchool } = useSchool();

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

  const schoolName = currentSchool?.name ?? "School Management System";
  const schoolAddress = currentSchool?.address ?? "School Address";
  const schoolPhone = currentSchool?.phone ?? "";
  const schoolEmail = currentSchool?.email ?? "";

  const handleDownloadInvoice = () => {
    exportKeyValueCsv(`invoice-${invoice.invoiceNo}`, [
      { label: "School", value: schoolName },
      { label: "Invoice No", value: invoice.invoiceNo },
      { label: "Student", value: invoice.studentName },
      { label: "Class", value: invoice.className },
      { label: "Admission No", value: admissionNo || "—" },
      { label: "Issued Date", value: formatDate(invoice.issuedAt) },
      { label: "Due Date", value: formatDate(invoice.dueAt) },
      { label: "Total Amount", value: invoice.totalAmount },
      { label: "Paid Amount", value: invoice.paidAmount },
      { label: "Balance Due", value: balance },
      { label: "Status", value: statusConfig.label },
      ...lineItems.map((item, index) => ({
        label: `Fee ${index + 1}`,
        value: `${item.description}: ${formatMoney(item.amount)}`,
      })),
    ]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Official Fee Invoice</p>
          <div className="flex items-center gap-1">
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
              className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800"
              title="Download invoice"
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
        <div className="overflow-y-auto bg-[#faf9f6] p-6 dark:bg-slate-900">
          <div className="relative mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            {/* Letterhead */}
            <div className="border-b-[3px] border-blue-800 pb-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-800 text-white shadow-md">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="font-serif text-2xl font-bold tracking-tight text-blue-900 dark:text-blue-100">
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

                <div className="text-left md:text-right">
                  <span className="inline-block bg-blue-800 px-4 py-2 text-xs font-bold tracking-[0.18em] text-white">
                    FEE INVOICE
                  </span>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Academic Year {academicYear}
                  </p>
                  <span
                    className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusConfig.badgeClass}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Bill to + invoice meta */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Bill To
                </p>
                <p className="mt-2 font-serif text-xl font-bold text-slate-900 dark:text-slate-50">
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

              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
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

            {/* Fee table */}
            <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
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
            <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-4 text-sm leading-relaxed text-slate-600 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Payment Instructions</p>
              <p className="mt-2">
                Please pay the balance due by the date shown above at the school accounts office
                during working hours (Mon–Fri, 8:00 AM – 2:00 PM). Retain this invoice as proof of
                billing. For payment queries, contact the school finance office
                {schoolPhone ? ` at ${schoolPhone}` : ""}.
              </p>
            </div>

            {/* Footer signature */}
            <div className="mt-10 flex flex-col items-start justify-between gap-6 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400 md:flex-row md:items-end">
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
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-950">
          <button
            type="button"
            onClick={handlePrintInvoice}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            <Printer className="h-4 w-4" />
            Print Bill
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
