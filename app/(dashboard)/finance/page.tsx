"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  DollarSign, Receipt, CreditCard, TrendingUp, Search, 
  Plus, Download, Filter, CheckCircle, AlertCircle, Clock,
  FileText, Users, Calendar
} from "lucide-react";
import { CreateInvoiceModal, type InvoiceFormData } from "./components/create-invoice-modal";
import { RecordPaymentModal, type PaymentFormData } from "./components/record-payment-modal";
import { InvoiceDetailModal } from "./components/invoice-detail-modal";
import { ParentInvoicesView } from "./components/parent-invoices-view";
import { formatDate, getTodayIsoDate } from "@/lib/date-format";
import { exportTableData, exportKeyValueCsv, slugifyFileName } from "@/lib/export-data";
import { formatStudentClassLabel } from "@/lib/class-labels";
import type { UserRole } from "@/lib/auth";
import { isUserRole } from "@/lib/auth";
import { getScopedItem, useSchool } from "@/lib/school-context";
import { getLinkedStudentsForParentEmail } from "@/lib/parent-student-links";
import { getUserSession } from "@/lib/teacher-check-in";
import {
  buildStudentPaymentReport,
  filterInvoicesForLinkedStudents,
  filterInvoicesForReport,
  getFinanceClassOptions,
  getFinanceDefaultDateRange,
  loadFinanceInvoices,
  resolveInvoiceStatus,
  saveFinanceInvoices,
  withResolvedStatuses,
  type FinanceInvoice,
  type InvoiceStatus,
} from "@/lib/finance-invoices";
import { DateInput } from "@/components/ui/date-input";

type Invoice = FinanceInvoice;

const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200", icon: FileText },
  issued: { label: "Issued", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200", icon: Receipt },
  partially_paid: { label: "Partially Paid", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200", icon: Clock },
  paid: { label: "Paid", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200", icon: CheckCircle },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200", icon: AlertCircle },
  void: { label: "Void", color: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200", icon: FileText },
};

export default function FinancePage() {
  const { currentSchool } = useSchool();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const isSectionView =
    tabFromUrl === "invoices" ||
    tabFromUrl === "payments" ||
    tabFromUrl === "reports";

  const sectionTitles = {
    invoices: "Invoices",
    payments: "Payments",
    reports: "Financial Reports",
  } as const;

  const [selectedTab, setSelectedTab] = useState<"invoices" | "payments" | "reports">("invoices");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoaded, setInvoicesLoaded] = useState(false);
  const [reportFilters, setReportFilters] = useState(getFinanceDefaultDateRange());
  const [reportClassFilter, setReportClassFilter] = useState("all");
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<Invoice | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (typeof window === "undefined") return "admin";
    const role = localStorage.getItem("user_role");
    return isUserRole(role) ? role : "admin";
  });

  const isParentView = userRole === "parent";
  const isAccountantView = userRole === "accountant";
  const isFinanceReadOnly = userRole === "admin";

  const sectionDescriptions = {
    invoices: isFinanceReadOnly
      ? "View issued fee invoices, collected amounts, and outstanding balances"
      : "Create, track, and manage student fee invoices",
    payments: isFinanceReadOnly
      ? "Review recorded payments and remaining balances"
      : "Record and review payment transactions",
    reports: isFinanceReadOnly
      ? "Review financial summaries and collection reports"
      : "Generate financial summaries and collection reports",
  } as const;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = localStorage.getItem("user_role");
    if (isUserRole(role)) {
      setUserRole(role);
    }
  }, []);

  useEffect(() => {
    if (isParentView && selectedTab !== "invoices") {
      setSelectedTab("invoices");
    }
  }, [isParentView, selectedTab]);

  useEffect(() => {
    if (!currentSchool) return;

    const stored = loadFinanceInvoices(currentSchool.id);
    const today = getTodayIsoDate();
    setInvoices(withResolvedStatuses(stored, today));
    setInvoicesLoaded(true);
  }, [currentSchool, isParentView]);

  useEffect(() => {
    if (!currentSchool || !invoicesLoaded || isParentView) return;
    saveFinanceInvoices(currentSchool.id, invoices);
  }, [invoices, currentSchool, invoicesLoaded, isParentView]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "invoices" || tab === "payments" || tab === "reports") {
      setSelectedTab(tab);
    }
  }, [searchParams]);

  const reportScope = useMemo(
    () => ({
      from: reportFilters.from,
      to: reportFilters.to,
      className: reportClassFilter,
    }),
    [reportFilters, reportClassFilter],
  );

  const reportInvoices = useMemo(
    () => filterInvoicesForReport(invoices, reportScope),
    [invoices, reportScope],
  );

  const reportClassOptions = useMemo(
    () => (currentSchool ? getFinanceClassOptions(currentSchool.id, invoices) : []),
    [currentSchool, invoices],
  );

  const parentLinkedStudents = useMemo(() => {
    if (!isParentView || !currentSchool) return [];
    const session = getUserSession();
    if (!session?.email) return [];
    return getLinkedStudentsForParentEmail(currentSchool.id, session.email);
  }, [isParentView, currentSchool, invoicesLoaded]);

  const visibleInvoices = useMemo(() => {
    if (!isParentView) return invoices;
    return filterInvoicesForLinkedStudents(invoices, parentLinkedStudents);
  }, [invoices, isParentView, parentLinkedStudents]);

  const paymentRecords = useMemo(
    () =>
      visibleInvoices
        .filter((invoice) => invoice.paidAmount > 0)
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    [visibleInvoices],
  );

  const filteredInvoices = useMemo(() => {
    return visibleInvoices.filter((invoice) => {
      const matchesSearch = 
        invoice.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.className.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [visibleInvoices, searchTerm, statusFilter]);

  const financialStats = useMemo(() => {
    const totalRevenue = visibleInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOutstanding = visibleInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);
    const overdueInvoices = visibleInvoices.filter((inv) => inv.status === "overdue");
    const overdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
      0,
    );
    const paidInvoices = visibleInvoices.filter((inv) => inv.status === "paid").length;
    const pendingCount = visibleInvoices.filter(
      (inv) => inv.totalAmount - inv.paidAmount > 0,
    ).length;

    return {
      totalRevenue,
      totalOutstanding,
      overdueAmount,
      paidInvoices,
      pendingCount,
      overdueCount: overdueInvoices.length,
    };
  }, [visibleInvoices]);

  const handleCreateInvoice = async (data: InvoiceFormData) => {
    const studentLookup = new Map<string, { name: string; className: string }>();

    if (currentSchool) {
      const storedStudents = getScopedItem(currentSchool.id, "school_students");
      if (storedStudents) {
        try {
          const parsed = JSON.parse(storedStudents) as Array<{
            id: string;
            firstName: string;
            lastName: string;
            class: string;
            section: string;
          }>;
          parsed.forEach((student) => {
            studentLookup.set(student.id, {
              name: `${student.firstName} ${student.lastName}`.trim(),
              className: formatStudentClassLabel(student.class, student.section),
            });
          });
        } catch {
          // fall through with empty lookup
        }
      }
    }

    const newInvoices: Invoice[] = data.studentIds.map((studentId, index) => {
      const student = studentLookup.get(studentId);
      const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
      const invoiceNo = `INV-2026-${String(invoices.length + index + 1).padStart(3, "0")}`;

      return {
        id: Date.now().toString() + index,
        invoiceNo,
        studentId,
        studentName: student?.name || "Unknown Student",
        className: student?.className || data.classLabel,
        totalAmount,
        paidAmount: 0,
        status: "issued" as InvoiceStatus,
        issuedAt: getTodayIsoDate(),
        dueAt: data.dueDate,
        lineItems: data.items.map((item) => ({
          description: item.description,
          amount: item.amount,
        })),
        notes: data.notes.trim() || undefined,
      };
    });

    setInvoices([...invoices, ...newInvoices]);
    alert(`${newInvoices.length} invoice(s) created for ${data.classLabel}.`);
  };

  const handleRecordPayment = async (data: PaymentFormData) => {
    setInvoices((prevInvoices) =>
      prevInvoices.map((invoice) => {
        if (invoice.id !== data.invoiceId) return invoice;

        const updated: Invoice = {
          ...invoice,
          paidAmount: invoice.paidAmount + data.amount,
        };

        return {
          ...updated,
          status: resolveInvoiceStatus(updated, getTodayIsoDate()),
        };
      }),
    );

    alert(`Payment of ₵${data.amount.toFixed(2)} recorded successfully!`);
  };

  const handleExportInvoices = () => {
    const exported = exportTableData(
      `invoices-${slugifyFileName(selectedTab)}`,
      [
        { header: "Invoice No", value: (invoice) => invoice.invoiceNo },
        { header: "Student", value: (invoice) => invoice.studentName },
        { header: "Class", value: (invoice) => invoice.className },
        { header: "Total Amount", value: (invoice) => invoice.totalAmount },
        { header: "Paid Amount", value: (invoice) => invoice.paidAmount },
        { header: "Balance", value: (invoice) => invoice.totalAmount - invoice.paidAmount },
        { header: "Issued Date", value: (invoice) => invoice.issuedAt },
        { header: "Due Date", value: (invoice) => invoice.dueAt },
        { header: "Status", value: (invoice) => statusConfig[invoice.status].label },
      ],
      filteredInvoices,
    );

    if (!exported) {
      alert("No invoices to export for the current filters.");
    }
  };

  const handleFinancialSummaryReport = () => {
    const totalBilled = reportInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalCollected = reportInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOutstanding = reportInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
      0,
    );
    const overdueInvoices = reportInvoices.filter((inv) => inv.status === "overdue");
    const overdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
      0,
    );

    exportKeyValueCsv("financial-summary-report", [
      { label: "Report Period From", value: reportScope.from },
      { label: "Report Period To", value: reportScope.to },
      { label: "Class Filter", value: reportScope.className === "all" ? "All Classes" : reportScope.className },
      { label: "Report Date", value: getTodayIsoDate() },
      { label: "Invoices in Period", value: reportInvoices.length },
      { label: "Total Billed (₵)", value: totalBilled.toFixed(2) },
      { label: "Total Collected (₵)", value: totalCollected.toFixed(2) },
      { label: "Total Outstanding (₵)", value: totalOutstanding.toFixed(2) },
      { label: "Overdue Invoices", value: overdueInvoices.length },
      { label: "Overdue Amount (₵)", value: overdueAmount.toFixed(2) },
      { label: "Paid Invoices", value: reportInvoices.filter((inv) => inv.status === "paid").length },
      {
        label: "Partially Paid Invoices",
        value: reportInvoices.filter((inv) => inv.status === "partially_paid").length,
      },
      { label: "Issued Invoices", value: reportInvoices.filter((inv) => inv.status === "issued").length },
    ]);
  };

  const handleStudentPaymentReport = () => {
    if (!currentSchool) {
      alert("Select a school before generating reports.");
      return;
    }

    const rows = buildStudentPaymentReport(currentSchool.id, invoices, reportScope);

    const exported = exportTableData(
      `student-payment-report-${reportScope.from}-to-${reportScope.to}`,
      [
        { header: "Student", value: (row) => row.studentName },
        { header: "Admission No", value: (row) => row.admissionNo },
        { header: "Class", value: (row) => row.className },
        { header: "Invoices in Period", value: (row) => row.invoiceCount },
        { header: "Total Billed (₵)", value: (row) => row.totalBilled.toFixed(2) },
        { header: "Total Paid (₵)", value: (row) => row.totalPaid.toFixed(2) },
        { header: "Balance (₵)", value: (row) => row.balance.toFixed(2) },
        { header: "Status", value: (row) => row.status },
      ],
      rows,
    );

    if (!exported) {
      alert("No students found for the selected class filter.");
    }
  };

  const handleMonthlyCollectionReport = () => {
    const byMonth = new Map<
      string,
      { month: string; invoiceCount: number; billed: number; collected: number; outstanding: number }
    >();

    for (const invoice of reportInvoices) {
      const monthKey = invoice.issuedAt.slice(0, 7);
      const issuedDate = new Date(invoice.issuedAt);
      const monthLabel = issuedDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      const existing = byMonth.get(monthKey) ?? {
        month: monthLabel,
        invoiceCount: 0,
        billed: 0,
        collected: 0,
        outstanding: 0,
      };

      existing.invoiceCount += 1;
      existing.billed += invoice.totalAmount;
      existing.collected += invoice.paidAmount;
      existing.outstanding += invoice.totalAmount - invoice.paidAmount;
      byMonth.set(monthKey, existing);
    }

    const rows = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, row]) => row);

    const exported = exportTableData(
      `monthly-collection-report-${reportScope.from}-to-${reportScope.to}`,
      [
        { header: "Month", value: (row) => row.month },
        { header: "Invoices", value: (row) => row.invoiceCount },
        { header: "Total Billed (₵)", value: (row) => row.billed.toFixed(2) },
        { header: "Total Collected (₵)", value: (row) => row.collected.toFixed(2) },
        { header: "Outstanding (₵)", value: (row) => row.outstanding.toFixed(2) },
      ],
      rows,
    );

    if (!exported) {
      alert("No invoice data in the selected date range and class filter.");
    }
  };

  const handleOverdueInvoicesReport = () => {
    const today = getTodayIsoDate();
    const overdueInvoices = reportInvoices.filter(
      (inv) =>
        inv.totalAmount - inv.paidAmount > 0 &&
        (inv.status === "overdue" || inv.dueAt < today),
    );

    const exported = exportTableData(
      `overdue-invoices-report-${reportScope.from}-to-${reportScope.to}`,
      [
        { header: "Invoice No", value: (invoice) => invoice.invoiceNo },
        { header: "Student", value: (invoice) => invoice.studentName },
        { header: "Class", value: (invoice) => invoice.className },
        { header: "Total Amount (₵)", value: (invoice) => invoice.totalAmount.toFixed(2) },
        { header: "Paid Amount (₵)", value: (invoice) => invoice.paidAmount.toFixed(2) },
        {
          header: "Balance Due (₵)",
          value: (invoice) => (invoice.totalAmount - invoice.paidAmount).toFixed(2),
        },
        { header: "Due Date", value: (invoice) => invoice.dueAt },
        {
          header: "Days Overdue",
          value: (invoice) => {
            const due = new Date(invoice.dueAt);
            const todayDate = new Date(today);
            const diff = Math.floor((todayDate.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
            return Math.max(diff, 0);
          },
        },
      ],
      overdueInvoices,
    );

    if (!exported) {
      alert("No overdue invoices in the selected date range and class filter.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">
            Finance
          </p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            {isParentView
              ? "My Invoices"
              : isSectionView
                ? sectionTitles[selectedTab]
                : "Finance Management"}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {isParentView
              ? "Official fee invoices and payment status for your children"
              : isSectionView
                ? sectionDescriptions[selectedTab]
                : isFinanceReadOnly
                  ? "Monitor invoices, payments, and outstanding balances"
                  : "Manage invoices, payments, and financial records"}
          </p>
        </div>
        {isAccountantView && selectedTab === "invoices" && (
        <div className="flex gap-2">
          <button 
            onClick={() => setShowCreateInvoice(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
        )}
        {isAccountantView && selectedTab === "payments" && (
        <div className="flex gap-2">
          <button 
            onClick={() => setShowRecordPayment(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Record Payment
          </button>
        </div>
        )}
      </div>

      {isFinanceReadOnly && !isParentView && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100">
          View-only finance overview. Invoices and payments are managed by the accounts office.
        </div>
      )}

      {/* Financial Stats */}
      {!isParentView && (!isSectionView || selectedTab === "invoices") && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Revenue</p>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">₵{financialStats.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">+12.5% from last month</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Outstanding</p>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">₵{financialStats.totalOutstanding.toLocaleString()}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {visibleInvoices.length - financialStats.paidInvoices} pending invoice
            {visibleInvoices.length - financialStats.paidInvoices === 1 ? "" : "s"}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Overdue</p>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">₵{financialStats.overdueAmount.toLocaleString()}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Requires immediate attention</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Collection Rate</p>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            {financialStats.totalRevenue + financialStats.totalOutstanding > 0
              ? Math.round(
                  (financialStats.totalRevenue /
                    (financialStats.totalRevenue + financialStats.totalOutstanding)) *
                    100,
                )
              : 0}
            %
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This academic year</p>
        </div>
      </div>
      )}

      {/* Tabs */}
      {!isSectionView && !isParentView && (
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
        {(["invoices", "payments", "reports"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors capitalize ${
              selectedTab === tab
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      )}

      {/* Invoices Tab */}
      {selectedTab === "invoices" && isParentView && (
        <ParentInvoicesView
          schoolName={currentSchool?.name ?? "School"}
          linkedStudents={parentLinkedStudents}
          invoices={visibleInvoices}
          filteredInvoices={filteredInvoices}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onViewInvoice={setSelectedInvoiceForView}
          stats={{
            totalPaid: financialStats.totalRevenue,
            balanceDue: financialStats.totalOutstanding,
            overdueAmount: financialStats.overdueAmount,
            pendingCount: financialStats.pendingCount,
            overdueCount: financialStats.overdueCount,
          }}
        />
      )}

      {selectedTab === "invoices" && !isParentView && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name, invoice number, or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | "all")}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="issued">Issued</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="draft">Draft</option>
            </select>
            <button
              onClick={handleExportInvoices}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Invoices Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {filteredInvoices.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                No invoices match your search filters.
              </div>
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Invoice No.</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Student</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Class</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Amount</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Paid</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Due Date</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Status</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-900 dark:text-slate-50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredInvoices.map((invoice) => {
                  const config = statusConfig[invoice.status];
                  const StatusIcon = config.icon;
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <td className="px-6 py-4 text-slate-900 dark:text-slate-50 font-medium">{invoice.invoiceNo}</td>
                      <td className="px-6 py-4 text-slate-900 dark:text-slate-50">{invoice.studentName}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{invoice.className}</td>
                      <td className="px-6 py-4 text-slate-900 dark:text-slate-50 font-semibold">₵{invoice.totalAmount}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">₵{invoice.paidAmount}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatDate(invoice.dueAt)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedInvoiceForView(invoice)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {!isParentView && selectedTab === "payments" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
            {paymentRecords.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                No payments have been recorded yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Invoice No.</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Student</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Class</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Amount Paid</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Balance Remaining</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Status</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-900 dark:text-slate-50">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {paymentRecords.map((invoice) => {
                    const config = statusConfig[invoice.status];
                    const StatusIcon = config.icon;
                    const balance = invoice.totalAmount - invoice.paidAmount;

                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-50">{invoice.invoiceNo}</td>
                        <td className="px-6 py-4 text-slate-900 dark:text-slate-50">{invoice.studentName}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{invoice.className}</td>
                        <td className="px-6 py-4 font-semibold text-emerald-700 dark:text-emerald-400">₵{invoice.paidAmount.toLocaleString()}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-50">₵{balance.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForView(invoice)}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                          >
                            View Invoice
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {!isParentView && selectedTab === "reports" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-slate-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Report Filters</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Reports only include invoices issued within the selected date range. The student payment report lists all active students for the selected class.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  From Date
                </label>
                <DateInput
                  value={reportFilters.from}
                  onChange={(value) => setReportFilters((current) => ({ ...current, from: value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  To Date
                </label>
                <DateInput
                  value={reportFilters.to}
                  onChange={(value) => setReportFilters((current) => ({ ...current, to: value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Class
                </label>
                <select
                  value={reportClassFilter}
                  onChange={(event) => setReportClassFilter(event.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Classes</option>
                  {reportClassOptions.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {reportInvoices.length} invoice(s) match the current filters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <FileText className="w-8 h-8 text-purple-600 mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Financial Summary Report</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Comprehensive overview of revenue, expenses, and outstanding amounts
            </p>
            <button
              type="button"
              onClick={handleFinancialSummaryReport}
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium cursor-pointer"
            >
              Generate Report →
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <Users className="w-8 h-8 text-emerald-600 mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Student Payment Report</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              All active students with payment totals for the selected period. Students without invoices show as &quot;No Invoice&quot;.
            </p>
            <button
              type="button"
              onClick={handleStudentPaymentReport}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
            >
              Generate Report →
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <Calendar className="w-8 h-8 text-orange-600 mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Monthly Collection Report</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Month-by-month breakdown of fee collection and trends
            </p>
            <button
              type="button"
              onClick={handleMonthlyCollectionReport}
              className="text-orange-600 dark:text-orange-400 hover:underline font-medium cursor-pointer"
            >
              Generate Report →
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <AlertCircle className="w-8 h-8 text-red-600 mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Overdue Invoices Report</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              List of all overdue payments requiring follow-up action
            </p>
            <button
              type="button"
              onClick={handleOverdueInvoicesReport}
              className="text-red-600 dark:text-red-400 hover:underline font-medium cursor-pointer"
            >
              Generate Report →
            </button>
          </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isAccountantView && (
        <>
          <CreateInvoiceModal
            isOpen={showCreateInvoice}
            onClose={() => setShowCreateInvoice(false)}
            onSubmit={handleCreateInvoice}
          />

          <RecordPaymentModal
            isOpen={showRecordPayment}
            onClose={() => setShowRecordPayment(false)}
            onSubmit={handleRecordPayment}
            invoices={invoices}
          />
        </>
      )}

      <InvoiceDetailModal
        invoice={selectedInvoiceForView}
        onClose={() => setSelectedInvoiceForView(null)}
      />
    </div>
  );
}