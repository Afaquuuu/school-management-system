import { formatDate } from "@/lib/date-format";
import type { FinanceInvoice, InvoiceLineItem } from "@/lib/finance-invoices";

const PAGE_WIDTH = 210;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  blue: [30, 58, 138] as const,
  blueBright: [29, 78, 216] as const,
  slate: [71, 85, 105] as const,
  slateLight: [100, 116, 139] as const,
  ink: [15, 23, 42] as const,
  border: [203, 213, 225] as const,
  surface: [248, 250, 252] as const,
  green: [4, 120, 87] as const,
  red: [220, 38, 38] as const,
  white: [255, 255, 255] as const,
};

type InvoicePdfInput = {
  fileName: string;
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  invoice: FinanceInvoice;
  lineItems: InvoiceLineItem[];
  statusLabel: string;
  admissionNo: string;
  academicYear: string;
};

function formatMoney(amount: number): string {
  return `PKR ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type JsPdfDoc = InstanceType<Awaited<typeof import("jspdf")>["jsPDF"]>;

function setColor(doc: JsPdfDoc, [r, g, b]: readonly [number, number, number]): void {
  doc.setTextColor(r, g, b);
}

function drawWrappedText(
  doc: JsPdfDoc,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 4.8,
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function drawKeyValueBox(
  doc: JsPdfDoc,
  x: number,
  y: number,
  width: number,
  rows: Array<{ label: string; value: string; bold?: boolean; valueColor?: readonly [number, number, number] }>,
): number {
  const rowHeight = 8;
  const labelWidth = width * 0.44;

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);

  rows.forEach((row, index) => {
    const rowTop = y + index * rowHeight;

    doc.setFillColor(...COLORS.surface);
    doc.rect(x, rowTop, labelWidth, rowHeight, "FD");
    doc.rect(x + labelWidth, rowTop, width - labelWidth, rowHeight, "D");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(doc, COLORS.slateLight);
    doc.text(row.label, x + 2.5, rowTop + 5.4);

    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    setColor(doc, row.valueColor ?? COLORS.ink);
    doc.text(row.value, x + labelWidth + 2.5, rowTop + 5.4);
  });

  return y + rows.length * rowHeight;
}

function drawFeeTable(
  doc: JsPdfDoc,
  y: number,
  lineItems: InvoiceLineItem[],
  invoice: FinanceInvoice,
): number {
  const indexWidth = 12;
  const amountWidth = 34;
  const descriptionWidth = CONTENT_WIDTH - indexWidth - amountWidth;
  const rowHeight = 8;
  const headerHeight = 9;

  doc.setFillColor(...COLORS.blue);
  doc.rect(MARGIN, y, CONTENT_WIDTH, headerHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(doc, COLORS.white);
  doc.text("#", MARGIN + 4, y + 6);
  doc.text("Fee Description", MARGIN + indexWidth + 2, y + 6);
  doc.text("Amount", MARGIN + indexWidth + descriptionWidth + amountWidth - 2, y + 6, {
    align: "right",
  });

  y += headerHeight;
  doc.setDrawColor(...COLORS.border);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  lineItems.forEach((item, index) => {
    const rowTop = y + index * rowHeight;
    doc.rect(MARGIN, rowTop, CONTENT_WIDTH, rowHeight, "D");
    doc.line(MARGIN + indexWidth, rowTop, MARGIN + indexWidth, rowTop + rowHeight);
    doc.line(
      MARGIN + indexWidth + descriptionWidth,
      rowTop,
      MARGIN + indexWidth + descriptionWidth,
      rowTop + rowHeight,
    );

    setColor(doc, COLORS.slateLight);
    doc.text(String(index + 1), MARGIN + 4, rowTop + 5.5);
    setColor(doc, COLORS.ink);
    doc.text(item.description, MARGIN + indexWidth + 2.5, rowTop + 5.5);
    doc.setFont("helvetica", "bold");
    doc.text(
      formatMoney(item.amount),
      MARGIN + CONTENT_WIDTH - 2.5,
      rowTop + 5.5,
      { align: "right" },
    );
    doc.setFont("helvetica", "normal");
  });

  y += lineItems.length * rowHeight;
  const balance = invoice.totalAmount - invoice.paidAmount;

  const summaryRows: Array<{
    label: string;
    value: string;
    bold?: boolean;
    valueColor?: readonly [number, number, number];
    fill?: boolean;
  }> = [
    { label: "Total Amount", value: formatMoney(invoice.totalAmount), bold: true, fill: true },
    { label: "Amount Paid", value: formatMoney(invoice.paidAmount), valueColor: COLORS.green },
    {
      label: "Balance Due",
      value: formatMoney(balance),
      bold: true,
      valueColor: balance > 0 ? COLORS.red : COLORS.green,
      fill: true,
    },
  ];

  summaryRows.forEach((row) => {
    const rowTop = y;
    if (row.fill) {
      doc.setFillColor(...COLORS.surface);
      doc.rect(MARGIN, rowTop, CONTENT_WIDTH, rowHeight, "FD");
    } else {
      doc.rect(MARGIN, rowTop, CONTENT_WIDTH, rowHeight, "D");
    }

    doc.line(
      MARGIN + indexWidth + descriptionWidth,
      rowTop,
      MARGIN + indexWidth + descriptionWidth,
      rowTop + rowHeight,
    );

    setColor(doc, COLORS.ink);
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.text(row.label, MARGIN + indexWidth + descriptionWidth - 2.5, rowTop + 5.5, {
      align: "right",
    });

    setColor(doc, row.valueColor ?? COLORS.ink);
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.text(row.value, MARGIN + CONTENT_WIDTH - 2.5, rowTop + 5.5, { align: "right" });

    y += rowHeight;
  });

  return y + 2;
}

export async function downloadInvoicePdf(input: InvoicePdfInput): Promise<void> {
  if (typeof window === "undefined") return;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setColor(doc, COLORS.blue);
  doc.text(input.schoolName, MARGIN, y);

  const badgeText = "FEE INVOICE";
  doc.setFontSize(8.5);
  const badgeWidth = doc.getTextWidth(badgeText) + 10;
  const badgeX = PAGE_WIDTH - MARGIN - badgeWidth;
  doc.setFillColor(...COLORS.blueBright);
  doc.rect(badgeX, y - 5.5, badgeWidth, 7.5, "F");
  setColor(doc, COLORS.white);
  doc.text(badgeText, badgeX + 5, y - 0.5);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, COLORS.slate);

  if (input.schoolAddress.trim()) {
    y = drawWrappedText(doc, input.schoolAddress, MARGIN, y, CONTENT_WIDTH * 0.62) + 1;
  }

  const contactParts = [
    input.schoolPhone ? `Phone: ${input.schoolPhone}` : "",
    input.schoolEmail ? `Email: ${input.schoolEmail}` : "",
  ].filter(Boolean);

  if (contactParts.length > 0) {
    doc.text(contactParts.join("   ·   "), MARGIN, y);
    y += 5;
  }

  doc.text(`Academic Year ${input.academicYear}`, PAGE_WIDTH - MARGIN, y, { align: "right" });
  y += 4;

  doc.setDrawColor(...COLORS.blueBright);
  doc.setLineWidth(0.9);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 10;

  const leftWidth = CONTENT_WIDTH * 0.52;
  const rightWidth = CONTENT_WIDTH - leftWidth - 4;
  const rightX = MARGIN + leftWidth + 4;
  const sectionTop = y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, COLORS.slateLight);
  doc.text("BILL TO", MARGIN, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setColor(doc, COLORS.ink);
  doc.text(input.invoice.studentName, MARGIN, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setColor(doc, COLORS.slate);
  doc.text(`Class: ${input.invoice.className}`, MARGIN, y);
  y += 5;
  if (input.admissionNo) {
    doc.text(`Admission No: ${input.admissionNo}`, MARGIN, y);
    y += 5;
  }

  drawKeyValueBox(doc, rightX, sectionTop, rightWidth, [
    { label: "Invoice No.", value: input.invoice.invoiceNo, bold: true },
    { label: "Issue Date", value: formatDate(input.invoice.issuedAt) },
    { label: "Due Date", value: formatDate(input.invoice.dueAt) },
    { label: "Status", value: input.statusLabel, bold: true },
  ]);

  y = Math.max(y, sectionTop + 32) + 8;

  y = drawFeeTable(doc, y, input.lineItems, input.invoice);

  const instructionsTop = y + 2;
  const instructionText = [
    "Please pay the balance due by the date shown above at the school accounts office during working hours (Mon-Fri, 8:00 AM - 2:00 PM).",
    "Retain this invoice as proof of billing.",
    input.schoolPhone
      ? `For payment queries, contact the school finance office at ${input.schoolPhone}.`
      : "For payment queries, contact the school finance office.",
  ].join(" ");

  const instructionLines = doc.splitTextToSize(instructionText, CONTENT_WIDTH - 6);
  const instructionHeight = 10 + instructionLines.length * 4.5;
  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(...COLORS.surface);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN, instructionsTop, CONTENT_WIDTH, instructionHeight, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setColor(doc, COLORS.ink);
  doc.text("Payment Instructions", MARGIN + 3, instructionsTop + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, COLORS.slate);
  doc.text(instructionLines, MARGIN + 3, instructionsTop + 10.5);
  y = instructionsTop + instructionHeight + 4;

  if (input.invoice.notes?.trim()) {
    doc.setDrawColor(...COLORS.border);
    doc.rect(MARGIN, y, CONTENT_WIDTH, 14, "D");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setColor(doc, COLORS.ink);
    doc.text("Note:", MARGIN + 3, y + 5.5);
    doc.setFont("helvetica", "normal");
    setColor(doc, COLORS.slate);
    y = drawWrappedText(doc, input.invoice.notes.trim(), MARGIN + 14, y + 5.5, CONTENT_WIDTH - 17, 4.5) + 4;
  }

  const footerY = Math.max(y + 8, 262);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, COLORS.slateLight);
  doc.text(`Generated on ${formatDate(new Date())}`, MARGIN, footerY);

  const signatureX = PAGE_WIDTH - MARGIN - 52;
  doc.text("Authorized Signature", signatureX + 26, footerY, { align: "center" });
  doc.setDrawColor(...COLORS.slateLight);
  doc.line(signatureX, footerY + 2, PAGE_WIDTH - MARGIN, footerY + 2);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.slate);
  doc.text("School Accounts Office", signatureX + 26, footerY + 8, { align: "center" });

  if (input.invoice.status === "paid") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(16, 185, 129);
    doc.text("PAID", PAGE_WIDTH - MARGIN - 28, sectionTop + 26, { angle: -18 });
  }

  const resolvedName = input.fileName.endsWith(".pdf") ? input.fileName : `${input.fileName}.pdf`;
  doc.save(resolvedName);
}
