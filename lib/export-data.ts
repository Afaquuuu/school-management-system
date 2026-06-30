export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCsvValue(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsvContent(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];
  return `\uFEFF${lines.join("\n")}`;
}

export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType = "text/csv;charset=utf-8",
): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTableData<T>(
  fileName: string,
  columns: ExportColumn<T>[],
  data: T[],
): boolean {
  if (data.length === 0) return false;

  const headers = columns.map((column) => column.header);
  const rows = data.map((row) => columns.map((column) => column.value(row)));
  downloadTextFile(fileName, rowsToCsvContent(headers, rows));
  return true;
}

export function exportKeyValueCsv(
  fileName: string,
  rows: Array<{ label: string; value: string | number }>,
): void {
  downloadTextFile(
    fileName,
    rowsToCsvContent(
      ["Field", "Value"],
      rows.map((row) => [row.label, row.value]),
    ),
  );
}

export function downloadHtmlFile(fileName: string, title: string, bodyHtml: string): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
    h1 { margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
    th { background: #f3f4f6; }
    .meta { color: #6b7280; margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Exported on ${new Date().toLocaleString()}</p>
  ${bodyHtml}
</body>
</html>`;

  downloadTextFile(
    fileName.endsWith(".html") ? fileName : `${fileName}.html`,
    html,
    "text/html;charset=utf-8",
  );
}

export function printHtml(title: string, bodyHtml: string): void {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
    h1 { margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
    th { background: #f3f4f6; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${bodyHtml}
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function slugifyFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
