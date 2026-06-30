import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";

type RecordFormShellProps = {
  accent: "blue" | "purple";
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  children: React.ReactNode;
};

const accentStyles = {
  blue: {
    bar: "from-blue-600 via-blue-500 to-indigo-600",
    icon: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    button: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/30",
  },
  purple: {
    bar: "from-purple-600 via-violet-500 to-indigo-600",
    icon: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    button: "bg-purple-600 hover:bg-purple-700 focus:ring-purple-500/30",
  },
};

export const recordFormFieldLabel =
  "mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400";

export const recordFormFieldInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-white/10 dark:disabled:bg-slate-800";

export const recordFormFieldInputAccent = {
  blue: "focus:border-blue-500 focus:ring-blue-500/20 dark:focus:border-blue-400 dark:focus:ring-blue-400/20",
  purple:
    "focus:border-purple-500 focus:ring-purple-500/20 dark:focus:border-purple-400 dark:focus:ring-purple-400/20",
};

export function RecordFormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function RecordFormShell({
  accent,
  eyebrow,
  title,
  description,
  icon: Icon,
  onClose,
  onSubmit,
  submitLabel,
  children,
}: RecordFormShellProps) {
  const styles = accentStyles[accent];

  return (
    <div className="min-h-screen bg-slate-100/80 dark:bg-slate-950 -m-6 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
          <div className={`h-1.5 bg-gradient-to-r ${styles.bar}`} />

          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
            <div className="flex items-start gap-4">
              <div className={`rounded-xl p-3 ${styles.icon}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {eyebrow}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  {title}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-16rem)] space-y-5 overflow-y-auto bg-slate-50/70 p-6 dark:bg-slate-950/40">
            {children}
            <p className="text-xs text-slate-500 dark:text-slate-400">Fields marked * are required.</p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-end dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-4 ${styles.button}`}
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
