import { cn } from "@/lib/utils";

type AppBrandIconProps = {
  className?: string;
};

export function AppBrandIcon({ className }: AppBrandIconProps) {
  return (
    <div
      className={cn(
        "h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-md shadow-blue-500/20",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/favicon.png" alt="" className="h-full w-full object-cover" />
    </div>
  );
}

type AppBrandMarkProps = {
  title?: string;
  className?: string;
  iconClassName?: string;
  titleClassName?: string;
};

export function AppBrandMark({
  title = "School Management",
  className,
  iconClassName,
  titleClassName,
}: AppBrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <AppBrandIcon className={iconClassName} />
      <span
        className={cn(
          "landing-brand-title text-[1.35rem] font-bold tracking-tight",
          titleClassName,
        )}
      >
        {title}
      </span>
    </div>
  );
}
