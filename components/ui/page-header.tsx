import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  badge,
  title,
  description,
  meta,
  actions,
  variant = "default",
  className,
}: {
  badge?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  variant?: "default" | "hero";
  className?: string;
}) {
  return (
    <div
      className={cn(
        variant === "hero"
          ? "overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-lg md:p-8"
          : "surface-card p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          {badge ? (
            <p
              className={cn(
                "section-label mb-2",
                variant === "hero" ? "text-blue-100" : undefined,
              )}
            >
              {badge}
            </p>
          ) : null}
          <h1
            className={cn(
              "page-title",
              variant === "hero" ? "text-white md:text-3xl" : undefined,
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                "page-subtitle mt-1.5 max-w-2xl",
                variant === "hero" ? "text-blue-100" : undefined,
              )}
            >
              {description}
            </p>
          ) : null}
          {meta ? (
            <div
              className={cn(
                "mt-3 text-sm",
                variant === "hero" ? "text-blue-100/90" : "text-slate-500",
              )}
            >
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
