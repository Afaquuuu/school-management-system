"use client";

import { useState, useMemo } from "react";
import { 
  DollarSign, Receipt, CreditCard, TrendingUp, Search, 
  Plus, Download, Filter, CheckCircle, AlertCircle, Clock,
  FileText, Users, Calendar
} from "lucide-react";
import { CreateInvoiceModal, type InvoiceFormData } from "./components/create-invoice-modal";
import { RecordPaymentModal, type PaymentFormData } from "./components/record-payment-modal";
import { InvoiceDetailModal } from "./components/invoice-detail-modal";

type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "void";

type Invoice = {
  id: string;
  invoiceNo: string;
  studentName: string;
  className: string;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
};

const sampleInvoices: Invoice[] = [
  { id: "1", invoiceNo: "INV-2026-001", studentName: "Ama Johnson", className: "Grade 8A", totalAmount: 1500, paidAmount: 1500, status: "paid", issuedAt: "2026-04-01", dueAt: "2026-04-15" },
  { id: "2", invoiceNo: "INV-2026-002", studentName: "Kofi Badu", className: "Grade 8A", totalAmount: 1500, paidAmount: 750, status: "partially_paid", issuedAt: "2026-04-01", dueAt: "2026-04-15" },
  { id: "3", invoiceNo: "INV-2026-003", studentName: "Peter Owusu", className: "Grade 8A", totalAmount: 1500, paidAmount: 0, status: "overdue", issuedAt: "2026-03-15", dueAt: "2026-03-30" },
  { id: "4", invoiceNo: "INV-2026-004", studentName: "Hannah Lee", className: "Grade 9B", totalAmount: 1650, paidAmount: 0, status: "issued", issuedAt: "2026-04-05", dueAt: "2026-04-20" },
  { id: "5", invoiceNo: "INV-2026-005", studentName: "David Mensah", className: "Grade 7A", totalAmount: 1400, paidAmount: 1400, status: "paid", issuedAt: "2026-04-01", dueAt: "2026-04-15" },
];

const sampleStudents = [
  { id: "1", name: "Ama Johnson", className: "Grade 8A" },
  { id: "2", name: "Kofi Badu", className: "Grade 8A" },
  { id: "3", name: "Peter Owusu", className: "Grade 8A" },
  { id: "4", name: "Hannah Lee", className: "Grade 9B" },
  { id: "5", name: "David Mensah", className: "Grade 7A" },
];

const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200", icon: FileText },
  issued: { label: "Issued", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200", icon: Receipt },
  partially_paid: { label: "Partially Paid", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200", icon: Clock },
  paid: { label: "Paid", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200", icon: CheckCircle },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200", icon: AlertCircle },
  void: { label: "Void", color: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200", icon: FileText },
};

export default function FinancePage() {
  const [selectedTab, setSelectedTab] = useState<"invoices" | "payments" | "reports">("invoices");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>(sampleInvoices);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<Invoice | null>(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch = 
        invoice.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.className.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const financialStats = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);
    const overdueAmount = invoices
      .filter(inv => inv.status === "overdue")
      .reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);
    const paidInvoices = invoices.filter(inv => inv.status === "paid").length;
    
    return { totalRevenue, totalOutstanding, overdueAmount, paidInvoices };
  }, [invoices]);

  const handleCreateInvoice = async (data: InvoiceFormData) => {
    console.log("Creating invoice:", data);
    
    // Create invoices for each selected student
    const newInvoices: Invoice[] = data.studentIds.map((studentId, index) => {
      const student = sampleStudents.find(s => s.id === studentId);
      const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
      const invoiceNo = `INV-2026-${String(invoices.length + index + 1).padStart(3, '0')}`;
      
      return {
        id: Date.now().toString() + index,
        invoiceNo,
        studentName: student?.name || '',
        className: student?.className || '',
        totalAmount,
        paidAmount: 0,
        status: 'issued' as InvoiceStatus,
        issuedAt: new Date().toISOString().split('T')[0],
        dueAt: data.dueDate,
      };
    });

    setInvoices([...invoices, ...newInvoices]);
    alert(`${newInvoices.length} invoice(s) created successfully!`);
  };

  const handleRecordPayment = async (data: PaymentFormData) => {
    console.log("Recording payment:", data);
    
    // Update the invoice with the payment
    setInvoices(prevInvoices => 
      prevInvoices.map(invoice => {
        if (invoice.id === data.invoiceId) {
          const newPaidAmount = invoice.paidAmount + data.amount;
          const balance = invoice.totalAmount - newPaidAmount;
          
          let newStatus: InvoiceStatus;
          if (balance === 0) {
            newStatus = 'paid';
          } else if (newPaidAmount > 0) {
            newStatus = 'partially_paid';
          } else {
            newStatus = invoice.status;
          }
          
          return {
            ...invoice,
            paidAmount: newPaidAmount,
            status: newStatus,
          };
        }
        return invoice;
      })
    );
    
    alert(`Payment of ₵${data.amount.toFixed(2)} recorded successfully!`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Finance Management</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage invoices, payments, and financial records
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowRecordPayment(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Record Payment
          </button>
          <button 
            onClick={() => setShowCreateInvoice(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Financial Stats */}
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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sampleInvoices.length - financialStats.paidInvoices} pending invoices</p>
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
            {Math.round((financialStats.totalRevenue / (financialStats.totalRevenue + financialStats.totalOutstanding)) * 100)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This academic year</p>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Invoices Tab */}
      {selectedTab === "invoices" && (
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
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Invoices Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
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
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{invoice.dueAt}</td>
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
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {selectedTab === "payments" && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-8 text-center">
          <CreditCard className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Payment History</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            View all payment transactions, methods, and receipts
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
            View Payment Records
          </button>
        </div>
      )}

      {/* Reports Tab */}
      {selectedTab === "reports" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <FileText className="w-8 h-8 text-purple-600 mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Financial Summary Report</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Comprehensive overview of revenue, expenses, and outstanding amounts
            </p>
            <button className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
              Generate Report →
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <Users className="w-8 h-8 text-emerald-600 mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Student Payment Report</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Individual student payment history and outstanding balances
            </p>
            <button className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
              Generate Report →
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <Calendar className="w-8 h-8 text-orange-600 mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Monthly Collection Report</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Month-by-month breakdown of fee collection and trends
            </p>
            <button className="text-orange-600 dark:text-orange-400 hover:underline font-medium">
              Generate Report →
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <AlertCircle className="w-8 h-8 text-red-600 mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Overdue Invoices Report</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              List of all overdue payments requiring follow-up action
            </p>
            <button className="text-red-600 dark:text-red-400 hover:underline font-medium">
              Generate Report →
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateInvoiceModal
        isOpen={showCreateInvoice}
        onClose={() => setShowCreateInvoice(false)}
        onSubmit={handleCreateInvoice}
      />

      <RecordPaymentModal
        isOpen={showRecordPayment}
        onClose={() => setShowRecordPayment(false)}
        onSubmit={handleRecordPayment}
      />

      <InvoiceDetailModal
        invoice={selectedInvoiceForView}
        onClose={() => setSelectedInvoiceForView(null)}
      />
    </div>
  );
}