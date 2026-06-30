export const DATE_LOCALE = "en-GB";

export function parseDateInput(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Display date as DD/MM/YYYY */
export function formatDate(value: string | Date | null | undefined, fallback = "—"): string {
  const date = parseDateInput(value);
  if (!date) return fallback;

  return date.toLocaleDateString(DATE_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Display date as weekday, DD month YYYY */
export function formatDateLong(value: string | Date | null | undefined, fallback = "—"): string {
  const date = parseDateInput(value);
  if (!date) return fallback;

  return date.toLocaleDateString(DATE_LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Display date and time as DD/MM/YYYY, HH:MM */
export function formatDateTime(value: string | Date | null | undefined, fallback = "—"): string {
  const date = parseDateInput(value);
  if (!date) return fallback;

  return date.toLocaleString(DATE_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Display time as HH:MM */
export function formatTime(value: string | Date | null | undefined, fallback = "—"): string {
  const date = parseDateInput(value);
  if (!date) return fallback;

  return date.toLocaleTimeString(DATE_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Display short weekday label, e.g. Mon */
export function formatWeekdayShort(value: string | Date | null | undefined, fallback = ""): string {
  const date = parseDateInput(value);
  if (!date) return fallback;

  return date.toLocaleDateString(DATE_LOCALE, { weekday: "short" });
}

/** Display date as DD/MM for compact charts */
export function formatDayMonth(value: string | Date | null | undefined, fallback = "—"): string {
  const date = parseDateInput(value);
  if (!date) return fallback;

  return date.toLocaleDateString(DATE_LOCALE, {
    day: "2-digit",
    month: "2-digit",
  });
}

/** ISO date string for form inputs and storage (YYYY-MM-DD) */
export function getTodayIsoDate(date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/** Convert ISO date (YYYY-MM-DD) to DD/MM/YYYY for text inputs */
export function isoToDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return formatDate(iso, "");
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** Parse DD/MM/YYYY (also accepts D/M/YYYY and DD-MM-YYYY) to ISO YYYY-MM-DD */
export function displayDateToIso(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isIsoDateWithinRange(
  iso: string,
  min?: string,
  max?: string,
): boolean {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}

/** Shift an ISO date by a number of days. Returns null if the input is invalid. */
export function addDaysToIsoDate(iso: string, days: number): string | null {
  const parts = parseIsoDateParts(iso);
  if (!parts) return null;

  const date = new Date(parts.year, parts.month - 1, parts.day);
  date.setDate(date.getDate() + days);
  return buildIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** True when `iso` is strictly after `otherIso` (YYYY-MM-DD comparison). */
export function isIsoDateAfter(iso: string, otherIso: string): boolean {
  return iso > otherIso;
}

export function parseIsoDateParts(
  iso: string,
): { year: number; month: number; day: number } | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function buildIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getCalendarWeekdayLabels(): string[] {
  return WEEKDAY_LABELS;
}

/** Returns ISO date strings for each cell; empty string = blank cell */
export function getCalendarMonthDays(year: number, month: number): string[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: string[] = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push("");
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(buildIsoDate(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push("");
  }

  return cells;
}

export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(DATE_LOCALE, {
    month: "long",
    year: "numeric",
  });
}
