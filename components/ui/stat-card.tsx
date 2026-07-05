import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardTone = "default" | "success" | "warning" | "danger" | "info" | "brand";

const toneStyles: Record<
  StatCardTone,
  { icon: string; value: string; label: string }
> = {
  default: {
    icon: "bg-slate-100 text-slate-600",
    value: "text-slate-900",
    label: "text-slate-500",
  },
  success: {
    icon: "bg-emerald-100 text-emerald-600",
    value: "text-emerald-700",
    label: "text-emerald-600",
  },
  warning: {
    icon: "bg-amber-100 text-amber-600",
    value: "text-amber-700",
    label: "text-amber-600",
  },
  danger: {
    icon: "bg-red-100 text-red-600",
    value: "text-red-700",
    label: "text-red-600",
  },
  info: {
    icon: "bg-teal-100 text-teal-700",
    value: "text-teal-800",
    label: "text-teal-700",
  },
  brand: {
    icon: "bg-violet-100 text-violet-600",
    value: "text-violet-700",
    label: "text-violet-600",
  },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: StatCardTone;
  className?: string;
  onClick?: () => void;
}) {
  const styles = toneStyles[tone];
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "surface-card group p-5 text-left transition-all duration-200",
        onClick && "cursor-pointer hover:border-slate-300 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn("stat-label", styles.label)}>{label}</p>
          <p className={cn("stat-value mt-2", styles.value)}>{value}</p>
          {hint ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
              styles.icon,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </Wrapper>
  );
}
