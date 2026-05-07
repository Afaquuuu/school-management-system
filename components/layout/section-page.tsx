import type { ReactNode } from "react";

export function SectionPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="max-w-2xl text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </div>
  );
}