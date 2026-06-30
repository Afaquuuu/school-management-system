"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  displayDateToIso,
  DATE_LOCALE,
  getCalendarMonthDays,
  getCalendarWeekdayLabels,
  getTodayIsoDate,
  isoToDisplayDate,
  isIsoDateWithinRange,
  parseIsoDateParts,
} from "@/lib/date-format";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Date(2000, index, 1).toLocaleDateString(DATE_LOCALE, { month: "long" }),
}));

function getYearOptions(min?: string, max?: string): number[] {
  const currentYear = new Date().getFullYear();
  let minYear = currentYear - 100;
  let maxYear = currentYear + 20;

  const minParts = min ? parseIsoDateParts(min) : null;
  const maxParts = max ? parseIsoDateParts(max) : null;

  if (minParts) minYear = Math.max(minYear, minParts.year);
  if (maxParts) maxYear = Math.min(maxYear, maxParts.year);

  if (minYear > maxYear) {
    return [currentYear];
  }

  return Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
}

type DateInputProps = {
  value: string;
  onChange: (isoValue: string) => void;
  min?: string;
  max?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
};

function getInitialViewMonth(value: string) {
  const parts = parseIsoDateParts(value);
  if (parts) {
    return { year: parts.year, month: parts.month };
  }

  const today = parseIsoDateParts(getTodayIsoDate());
  return today ? { year: today.year, month: today.month } : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
}

export function DateInput({
  value,
  onChange,
  min,
  max,
  className,
  placeholder = "DD/MM/YYYY",
  disabled,
  required,
  id,
  name,
}: DateInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayValue, setDisplayValue] = useState(() => isoToDisplayDate(value));
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => getInitialViewMonth(value));

  useEffect(() => {
    setDisplayValue(isoToDisplayDate(value));
    setInvalid(false);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const applyIso = (iso: string) => {
    if (!isIsoDateWithinRange(iso, min, max)) {
      setInvalid(true);
      return false;
    }

    setInvalid(false);
    setDisplayValue(isoToDisplayDate(iso));
    onChange(iso);
    setOpen(false);
    return true;
  };

  const commitValue = (raw: string) => {
    const trimmed = raw.trim();

    if (!trimmed) {
      setInvalid(false);
      setDisplayValue("");
      onChange("");
      return;
    }

    const iso = displayDateToIso(trimmed);
    if (!iso) {
      setInvalid(true);
      return;
    }

    applyIso(iso);
  };

  const openCalendar = () => {
    if (disabled) return;
    setViewMonth(getInitialViewMonth(value));
    setOpen(true);
  };

  const monthDays = useMemo(
    () => getCalendarMonthDays(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month],
  );

  const weekdayLabels = getCalendarWeekdayLabels();
  const todayIso = getTodayIsoDate();
  const yearOptions = useMemo(() => getYearOptions(min, max), [min, max]);

  const shiftMonth = (delta: number) => {
    setViewMonth((current) => {
      const date = new Date(current.year, current.month - 1 + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={displayValue}
          disabled={disabled}
          required={required}
          onChange={(e) => {
            setDisplayValue(e.target.value);
            setInvalid(false);
          }}
          onBlur={(e) => commitValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitValue(displayValue);
            }
          }}
          className={cn(
            "w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pr-10 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50",
            invalid && "border-red-500 focus:ring-red-500",
            className,
          )}
        />
        <button
          type="button"
          onClick={openCalendar}
          disabled={disabled}
          aria-label="Open calendar"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-600 dark:hover:text-slate-200"
        >
          <Calendar className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
              <select
                value={viewMonth.month}
                onChange={(event) =>
                  setViewMonth((current) => ({
                    ...current,
                    month: Number(event.target.value),
                  }))
                }
                aria-label="Select month"
                className="max-w-[9rem] flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
              >
                {MONTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={viewMonth.year}
                onChange={(event) =>
                  setViewMonth((current) => ({
                    ...current,
                    year: Number(event.target.value),
                  }))
                }
                aria-label="Select year"
                className="w-[5.5rem] rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((iso, index) => {
              if (!iso) {
                return <div key={`empty-${index}`} className="h-9" />;
              }

              const parts = parseIsoDateParts(iso);
              const day = parts?.day ?? 0;
              const isSelected = value === iso;
              const isToday = iso === todayIso;
              const isDisabled = !isIsoDateWithinRange(iso, min, max);

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => applyIso(iso)}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-blue-600 text-white"
                      : isToday
                        ? "border border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700",
                    isDisabled && "cursor-not-allowed opacity-30 hover:bg-transparent dark:hover:bg-transparent",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                if (applyIso(todayIso)) {
                  setViewMonth(getInitialViewMonth(todayIso));
                }
              }}
              disabled={!isIsoDateWithinRange(todayIso, min, max)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {invalid && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {min && max
            ? `Enter a valid date between ${isoToDisplayDate(min)} and ${isoToDisplayDate(max)}.`
            : min
              ? `Enter a valid date on or after ${isoToDisplayDate(min)}.`
              : max
                ? `Enter a valid date on or before ${isoToDisplayDate(max)}.`
                : "Enter a valid date as DD/MM/YYYY."}
        </p>
      )}
    </div>
  );
}
