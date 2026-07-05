import type { ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";

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
    <div className="page-stack">
      <PageHeader badge={badge} title={title} description={description} />
      {children}
    </div>
  );
}
