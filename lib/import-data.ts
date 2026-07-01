export type CsvImportResult = {
  importedCount: number;
  skippedCount: number;
  errors: string[];
};

function normalizeHeaderKey(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseCsvContent(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim())) {
        rows.push(row);
      }
      row = [];
      if (char === "\r") {
        index += 1;
      }
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim())) {
      rows.push(row);
    }
  }

  return rows;
}

export function parseCsvRecords(content: string): Array<Record<string, string>> {
  const rows = parseCsvContent(content);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());

  return rows
    .slice(1)
    .map((values) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = (values[index] ?? "").trim();
      });
      return record;
    })
    .filter((record) => Object.values(record).some((value) => value));
}

export function getCsvValue(record: Record<string, string>, ...labels: string[]): string {
  const normalizedRecord = new Map<string, string>();
  for (const [key, value] of Object.entries(record)) {
    normalizedRecord.set(normalizeHeaderKey(key), value);
  }

  for (const label of labels) {
    const value = normalizedRecord.get(normalizeHeaderKey(label));
    if (value) return value;
  }

  return "";
}

export function pickCsvFile(accept = ".csv,text/csv"): Promise<string | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === "string" ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

const STUDENT_STATUSES = new Set(["active", "inactive", "graduated", "transferred"]);
const STAFF_STATUSES = new Set(["active", "inactive", "on_leave", "terminated"]);
const STAFF_ROLES = new Set(["teacher", "admin", "librarian", "accountant", "support"]);

export function parseStudentStatus(value: string): "active" | "inactive" | "graduated" | "transferred" {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized === "onleave") return "inactive";
  if (STUDENT_STATUSES.has(normalized)) {
    return normalized as "active" | "inactive" | "graduated" | "transferred";
  }
  return "active";
}

export function parseStaffStatus(value: string): "active" | "inactive" | "on_leave" | "terminated" {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (STAFF_STATUSES.has(normalized)) {
    return normalized as "active" | "inactive" | "on_leave" | "terminated";
  }
  if (normalized === "onleave") return "on_leave";
  return "active";
}

export function parseStaffRole(value: string): "teacher" | "admin" | "librarian" | "accountant" | "support" {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (STAFF_ROLES.has(normalized)) {
    return normalized as "teacher" | "admin" | "librarian" | "accountant" | "support";
  }
  return "teacher";
}

export function nextSequentialId(prefix: string, existingIds: string[]): string {
  let max = 0;
  const pattern = new RegExp(`^${prefix}(\\d+)$`, "i");
  for (const id of existingIds) {
    const match = id.match(pattern);
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function formatImportSummary(result: CsvImportResult, entityLabel: string): string {
  if (result.importedCount === 0) {
    return `No new ${entityLabel} were imported.${result.skippedCount ? ` ${result.skippedCount} row(s) skipped.` : ""}${
      result.errors.length ? `\n\n${result.errors.slice(0, 5).join("\n")}` : ""
    }`;
  }

  return `Imported ${result.importedCount} ${entityLabel}.${result.skippedCount ? ` ${result.skippedCount} row(s) skipped.` : ""}${
    result.errors.length ? `\n\nNotes:\n${result.errors.slice(0, 5).join("\n")}` : ""
  }`;
}
