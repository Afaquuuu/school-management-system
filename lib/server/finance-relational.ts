import type { PrismaClient } from "@prisma/tenant-client";

import {
  buildDomainBridge,
  syncLegacyRows,
} from "@/lib/server/domain-table-bridge";

export const FINANCE_INVOICES_STORAGE_KEY = "finance_invoices";

type FinanceInvoiceJson = {
  id: string;
  invoiceNo: string;
  studentId?: string;
  studentName: string;
  className: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  issuedAt: string;
  dueAt: string;
  lineItems?: unknown[];
  notes?: string;
};

export const financeInvoicesDomain = buildDomainBridge<FinanceInvoiceJson>({
  storageKey: FINANCE_INVOICES_STORAGE_KEY,
  hasStructuredData: (tenant) => tenant.financeInvoiceRecord.count().then((c) => c > 0),
  listItems: async (tenant) => {
    const rows = await tenant.financeInvoiceRecord.findMany({ orderBy: { issuedAt: "desc" } });
    return rows.map((row) => ({
      id: row.legacyId,
      invoiceNo: row.invoiceNo,
      studentId: row.studentLegacyId ?? undefined,
      studentName: row.studentName,
      className: row.className,
      totalAmount: row.totalAmount,
      paidAmount: row.paidAmount,
      status: row.invoiceStatus,
      issuedAt: row.issuedAt,
      dueAt: row.dueAt,
      lineItems: Array.isArray(row.lineItems) ? (row.lineItems as unknown[]) : undefined,
      notes: row.notes ?? undefined,
    }));
  },
  saveItems: async (tenant, items) => {
    const existing = await tenant.financeInvoiceRecord.findMany({
      select: { id: true, legacyId: true },
    });
    await syncLegacyRows(tenant, items, existing, async (item, existingId) => {
      const data = {
        invoiceNo: item.invoiceNo,
        studentLegacyId: item.studentId ?? null,
        studentName: item.studentName,
        className: item.className,
        totalAmount: item.totalAmount,
        paidAmount: item.paidAmount,
        invoiceStatus: item.status,
        issuedAt: item.issuedAt,
        dueAt: item.dueAt,
        lineItems: (item.lineItems ?? []) as never,
        notes: item.notes ?? null,
      };
      if (existingId) {
        await tenant.financeInvoiceRecord.update({ where: { id: existingId }, data });
        return;
      }
      await tenant.financeInvoiceRecord.create({ data: { legacyId: item.id, ...data } });
    }, async (id) => {
      await tenant.financeInvoiceRecord.delete({ where: { id } });
    });
  },
  deleteDomain: async (tenant) => {
    await tenant.financeInvoiceRecord.deleteMany();
  },
});
