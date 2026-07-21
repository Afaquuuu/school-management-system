import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";

export function AdminControlBanner({
  selectedView,
  onSelectView,
}: {
  selectedView: "overview" | "actions";
  onSelectView: (view: "overview" | "actions") => void;
}) {
  return (
    <section className="admin-control-banner">
      <div className="admin-control-banner-accent" />
      <div className="admin-control-banner-body">
        <div>
          <p className="admin-control-eyebrow">Administration</p>
          <h1 className="admin-control-title">Admin Control Panel</h1>
          <p className="admin-control-description">
            Complete control center for all school management activities
          </p>
        </div>
        <div className="admin-view-toggle">
          <button
            type="button"
            onClick={() => onSelectView("overview")}
            className={selectedView === "overview" ? "admin-view-toggle-btn-active" : "admin-view-toggle-btn"}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => onSelectView("actions")}
            className={selectedView === "actions" ? "admin-view-toggle-btn-active" : "admin-view-toggle-btn"}
          >
            Quick Actions
          </button>
        </div>
      </div>
    </section>
  );
}

function KpiUsersArt() {
  return (
    <svg viewBox="0 0 120 90" className="admin-kpi-art" aria-hidden>
      <circle cx="38" cy="34" r="14" fill="#93C5FD" />
      <path d="M18 72c0-12 9-20 20-20s20 8 20 20" fill="#BFDBFE" />
      <circle cx="68" cy="30" r="11" fill="#C4B5FD" />
      <path d="M54 68c0-10 7-16 16-16s16 6 16 16" fill="#DDD6FE" />
      <circle cx="92" cy="36" r="9" fill="#60A5FA" />
      <path d="M82 72c0-8 6-14 14-14" stroke="#93C5FD" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function KpiExamsArt() {
  return (
    <svg viewBox="0 0 120 90" className="admin-kpi-art" aria-hidden>
      <circle cx="78" cy="32" r="22" fill="#BFDBFE" stroke="#60A5FA" strokeWidth="3" />
      <path d="M78 20v24M66 32h24" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
      <rect x="22" y="24" width="34" height="44" rx="6" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="2" />
      <path d="M30 38h18M30 48h18M30 58h10" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function KpiInvoicesArt() {
  return (
    <svg viewBox="0 0 120 90" className="admin-kpi-art" aria-hidden>
      <rect x="18" y="28" width="42" height="26" rx="6" fill="#86EFAC" stroke="#22C55E" strokeWidth="2" />
      <text x="28" y="46" fill="#166534" fontSize="14" fontWeight="700">$</text>
      <rect x="58" y="22" width="38" height="48" rx="6" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
      <path d="M66 34h22M66 44h22M66 54h14" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function KpiAttendanceArt() {
  return (
    <svg viewBox="0 0 120 90" className="admin-kpi-art" aria-hidden>
      <rect x="24" y="20" width="52" height="44" rx="6" fill="#FECDD3" stroke="#FB7185" strokeWidth="2" />
      <path d="M24 32h52" stroke="#FB7185" strokeWidth="2" />
      <rect x="34" y="52" width="8" height="14" rx="2" fill="#F43F5E" />
      <rect x="46" y="46" width="8" height="20" rx="2" fill="#FB7185" />
      <rect x="58" y="40" width="8" height="26" rx="2" fill="#FDA4AF" />
      <circle cx="88" cy="58" r="16" fill="#DCFCE7" stroke="#22C55E" strokeWidth="2" />
      <path d="M82 58l4 4 8-8" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ModuleUsersArt() {
  return (
    <svg viewBox="0 0 80 64" className="admin-module-art" aria-hidden>
      <circle cx="28" cy="22" r="10" fill="#818CF8" />
      <circle cx="52" cy="22" r="10" fill="#60A5FA" />
      <path d="M12 54c0-10 8-16 18-16s18 6 18 16" fill="#C7D2FE" />
      <path d="M36 54c0-10 8-16 18-16s18 6 18 16" fill="#BFDBFE" />
    </svg>
  );
}

function ModuleCheckinsArt() {
  return (
    <svg viewBox="0 0 80 64" className="admin-module-art" aria-hidden>
      <circle cx="34" cy="24" r="12" fill="#818CF8" />
      <path d="M16 54c0-10 8-18 18-18s18 8 18 18" fill="#C7D2FE" />
      <circle cx="58" cy="44" r="14" fill="#DCFCE7" stroke="#22C55E" strokeWidth="2" />
      <path d="M52 44l4 4 8-8" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ModuleExamsArt() {
  return (
    <svg viewBox="0 0 80 64" className="admin-module-art" aria-hidden>
      <rect x="10" y="14" width="28" height="36" rx="4" fill="#E0E7FF" stroke="#6366F1" strokeWidth="2" />
      <rect x="18" y="26" width="20" height="4" rx="1" fill="#818CF8" />
      <rect x="18" y="34" width="14" height="4" rx="1" fill="#A5B4FC" />
      <rect x="42" y="30" width="8" height="20" rx="2" fill="#6366F1" />
      <rect x="52" y="22" width="8" height="28" rx="2" fill="#818CF8" />
      <rect x="62" y="34" width="8" height="16" rx="2" fill="#60A5FA" />
    </svg>
  );
}

function ModuleGenericArt({ label }: { label: string }) {
  return (
    <div className="admin-module-art-placeholder" aria-hidden>
      {label.slice(0, 1)}
    </div>
  );
}

const kpiArtMap = {
  users: KpiUsersArt,
  exams: KpiExamsArt,
  invoices: KpiInvoicesArt,
  attendance: KpiAttendanceArt,
} as const;

const moduleArtMap = {
  Users: ModuleUsersArt,
  "Teacher Check-ins": ModuleCheckinsArt,
  Exams: ModuleExamsArt,
} as const;

export type AdminKpiCardData = {
  key: keyof typeof kpiArtMap;
  label: string;
  value: string;
  tone: "mint" | "sky" | "gray" | "coral";
  lines: string[];
  action?: { label: string; href: string };
  button?: { label: string; href: string };
  trend?: string;
};

export function AdminKpiCard({ card }: { card: AdminKpiCardData }) {
  const Art = kpiArtMap[card.key];

  return (
    <article className={`admin-kpi-card admin-kpi-card-${card.tone}`}>
      <div className="admin-kpi-card-content">
        <div className="admin-kpi-card-top">
          <p className="admin-kpi-label">{card.label}</p>
          <div className="admin-kpi-value-row">
            <span className="admin-kpi-value">{card.value}</span>
            {card.trend ? (
              <span className="admin-kpi-trend">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {card.trend}
              </span>
            ) : null}
          </div>
        </div>
        <div className="admin-kpi-lines">
          {card.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        {card.action ? (
          <Link href={card.action.href} className="admin-kpi-link">
            {card.action.label}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
        {card.button ? (
          <Link href={card.button.href} className="admin-kpi-button">
            {card.button.label}
          </Link>
        ) : null}
      </div>
      <Art />
    </article>
  );
}

export function AdminModuleCard({
  title,
  description,
  href,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  badge: string;
}) {
  const Art =
    moduleArtMap[title as keyof typeof moduleArtMap] ??
    (() => <ModuleGenericArt label={title} />);

  return (
    <Link href={href} className="admin-module-card">
      <span className="admin-module-badge">{badge}</span>
      <Art />
      <h3 className="admin-module-title">{title}</h3>
      <p className="admin-module-description">{description}</p>
    </Link>
  );
}

export function AdminSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="admin-section-title">{children}</h2>;
}
