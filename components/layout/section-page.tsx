import type { ReactNode } from "react";

export function SectionPage({
  title,
  description,
  children,
  badge,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  badge?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="surface-card p-6">
        {badge ? <p className="section-label mb-2">{badge}</p> : null}
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle mt-1.5 max-w-2xl">{description}</p>
      </div>
      {children}
    </div>
  );
}
