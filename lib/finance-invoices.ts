import { formatStudentClassLabel } from "@/lib/class-labels";
import { getScopedItem, setScopedItem } from "@/lib/school-context";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void";

export type InvoiceLineItem = {
  description: string;
  amount: number;
};

export type FinanceInvoice = {
  id: string;
  invoiceNo: string;
  studentId?: string;
  studentName: string;
  className: string;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  lineItems?: InvoiceLineItem[];
  notes?: string;
};

export type FinanceReportFilters = {
  from: string;
  to: string;
  className: string;
};

export type StudentPaymentRow = {
  studentName: string;
  admissionNo: string;
  className: string;
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  balance: number;
  status: string;
};

type StoredStudent = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  class: string;
  section: string;
  status?: string;
};

const STORAGE_KEY = "finance_invoices";

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function isWithinDateRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export function loadFinanceInvoices(schoolId: string): FinanceInvoice[] {
  return parseJson<FinanceInvoice[]>(getScopedItem(schoolId, STORAGE_KEY), []);
}

export function saveFinanceInvoices(schoolId: string, invoices: FinanceInvoice[]): void {
  setScopedItem(schoolId, STORAGE_KEY, JSON.stringify(invoices));
}

export function loadActiveStudents(schoolId: string): StoredStudent[] {
  const stored = getScopedItem(schoolId, "school_students");
  if (!stored) return [];

  try {
    const students = JSON.parse(stored) as StoredStudent[];
    return students.filter((student) => !student.status || student.status === "active");
  } catch {
    return [];
  }
}

export function resolveInvoiceStatus(invoice: FinanceInvoice, today: string): InvoiceStatus {
  const balance = invoice.totalAmount - invoice.paidAmount;
  if (balance <= 0) return "paid";
  if (invoice.dueAt < today && balance > 0) return "overdue";
  if (invoice.paidAmount > 0) return "partially_paid";
  if (invoice.status === "draft" || invoice.status === "void") return invoice.status;
  return "issued";
}

export function withResolvedStatuses(
  invoices: FinanceInvoice[],
  today: string,
): FinanceInvoice[] {
  return invoices.map((invoice) => ({
    ...invoice,
    status: resolveInvoiceStatus(invoice, today),
  }));
}

export function filterInvoicesForReport(
  invoices: FinanceInvoice[],
  filters: FinanceReportFilters,
): FinanceInvoice[] {
  return invoices.filter((invoice) => {
    if (!isWithinDateRange(invoice.issuedAt, filters.from, filters.to)) return false;
    if (filters.className !== "all" && invoice.className !== filters.className) return false;
    return true;
  });
}

export function buildStudentPaymentReport(
  schoolId: string,
  invoices: FinanceInvoice[],
  filters: FinanceReportFilters,
): StudentPaymentRow[] {
  const filteredInvoices = filterInvoicesForReport(invoices, filters);

  let students = loadActiveStudents(schoolId).map((student) => ({
    id: student.id,
    name: `${student.firstName} ${student.lastName}`.trim(),
    admissionNo: student.studentId,
    className: formatStudentClassLabel(student.class, student.section),
  }));

  if (filters.className !== "all") {
    students = students.filter((student) => student.className === filters.className);
  }

  return students
    .map((student) => {
      const studentInvoices = filteredInvoices.filter(
        (invoice) =>
          invoice.studentId === student.id || invoice.studentName === student.name,
      );

      if (studentInvoices.length === 0) {
        return {
          studentName: student.name,
          admissionNo: student.admissionNo,
          className: student.className,
          invoiceCount: 0,
          totalBilled: 0,
          totalPaid: 0,
          balance: 0,
          status: "No Invoice",
        };
      }

      const totalBilled = studentInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const totalPaid = studentInvoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
      const balance = totalBilled - totalPaid;

      let status = "Issued";
      if (balance === 0) status = "Paid";
      else if (studentInvoices.some((invoice) => invoice.status === "overdue")) status = "Overdue";
      else if (totalPaid > 0) status = "Partially Paid";

      return {
        studentName: student.name,
        admissionNo: student.admissionNo,
        className: student.className,
        invoiceCount: studentInvoices.length,
        totalBilled,
        totalPaid,
        balance,
        status,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export function getFinanceDefaultDateRange() {
  const today = new Date();
  const from = new Date(today.getFullYear(), 0, 1);
  return {
    from: from.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  };
}

export function filterInvoicesForLinkedStudents(
  invoices: FinanceInvoice[],
  linkedStudents: Array<{ id: string; firstName: string; lastName: string }>,
): FinanceInvoice[] {
  if (linkedStudents.length === 0) return [];

  const linkedIds = new Set(linkedStudents.map((student) => student.id));
  const linkedNames = new Set(
    linkedStudents.map((student) =>
      `${student.firstName} ${student.lastName}`.trim().toLowerCase(),
    ),
  );

  return invoices.filter(
    (invoice) =>
      (invoice.studentId && linkedIds.has(invoice.studentId)) ||
      linkedNames.has(invoice.studentName.trim().toLowerCase()),
  );
}

export function getFinanceClassOptions(schoolId: string, invoices: FinanceInvoice[]): string[] {
  const labels = new Set<string>();

  for (const student of loadActiveStudents(schoolId)) {
    labels.add(formatStudentClassLabel(student.class, student.section));
  }

  for (const invoice of invoices) {
    if (invoice.className) labels.add(invoice.className);
  }

  return [...labels].sort((a, b) => a.localeCompare(b));
}

export function getInvoiceLineItems(invoice: FinanceInvoice): InvoiceLineItem[] {
  if (invoice.lineItems && invoice.lineItems.length > 0) {
    return invoice.lineItems;
  }

  return [
    {
      description: "Tuition & School Fees",
      amount: invoice.totalAmount,
    },
  ];
}
