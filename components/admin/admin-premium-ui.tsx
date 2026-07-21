import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, ChevronRight, TrendingUp } from "lucide-react";

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
  const stroke = "#374151";
  const skin = "#F5D0C5";
  const hair = "#6B7280";
  const blue = "#93C5FD";
  const mint = "#6EE7B7";

  function Person({
    x,
    headY,
    shirt,
    hairPath,
    scale = 1,
  }: {
    x: number;
    headY: number;
    shirt: string;
    hairPath: string;
    scale?: number;
  }) {
    return (
      <g transform={`translate(${x} ${headY}) scale(${scale})`}>
        <path d="M0 18c-10 0-16 6-16 16v2h32v-2c0-10-6-16-16-16z" fill={shirt} stroke={stroke} strokeWidth="1.5" />
        <circle cx="0" cy="0" r="11" fill={skin} stroke={stroke} strokeWidth="1.5" />
        <path d={hairPath} fill={hair} stroke={stroke} strokeWidth="1.2" />
      </g>
    );
  }

  return (
    <svg viewBox="0 0 120 96" className="admin-kpi-art admin-kpi-art-users" aria-hidden>
      <Person
        x={24}
        headY={30}
        shirt={blue}
        scale={0.82}
        hairPath="M-10 -2c0-8 8-12 10-12s10 4 10 12c0 3-2 6-5 7-3-2-6-2-10 0-3-1-5-4-5-7z"
      />
      <Person
        x={48}
        headY={22}
        shirt={blue}
        scale={0.78}
        hairPath="M-9 -1c0-7 7-11 9-11s9 4 9 11c0 2-1 5-4 6-2-2-5-2-8 0-3-1-4-4-4-6z"
      />
      <Person
        x={72}
        headY={28}
        shirt={blue}
        scale={0.82}
        hairPath="M-10 -2c0-8 8-12 10-12s10 4 10 12c0 3-2 6-5 7-3-2-6-2-10 0-3-1-5-4-5-7z"
      />
      <Person
        x={52}
        headY={48}
        shirt={mint}
        scale={1}
        hairPath="M-11 -2c0-9 9-13 11-13s11 4 11 13c0 3-2 6-5 7-3-2-7-2-11 0-3-1-5-4-5-7z"
      />
      <Person
        x={82}
        headY={46}
        shirt={blue}
        scale={0.95}
        hairPath="M-12 -3c0-4 4-8 8-10 4 2 8 6 8 10 0 5-3 9-8 10-1-4-3-7-6-8 3-1 5-4 6-8 2 1 4 4 4 8z"
      />
    </svg>
  );
}

function KpiExamsArt() {
  return (
    <svg viewBox="0 0 64 64" className="admin-kpi-art" aria-hidden>
      <rect x="10" y="14" width="24" height="32" rx="5" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1.75" />
      <path d="M16 24h16M16 32h16M16 40h10" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
      <circle cx="46" cy="24" r="12" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.75" />
      <path d="M46 18v12M40 24h12" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function KpiInvoicesArt() {
  return (
    <svg viewBox="0 0 64 64" className="admin-kpi-art" aria-hidden>
      <rect x="8" y="26" width="26" height="18" rx="4" fill="#BBF7D0" stroke="#22C55E" strokeWidth="1.75" />
      <text x="17" y="39" fill="#166534" fontSize="11" fontWeight="700">
        $
      </text>
      <rect x="30" y="18" width="24" height="34" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.75" />
      <path d="M36 28h18M36 36h18M36 44h12" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function KpiAttendanceArt() {
  return (
    <svg viewBox="0 0 64 64" className="admin-kpi-art" aria-hidden>
      <rect x="12" y="14" width="30" height="26" rx="5" fill="#FFE4E6" stroke="#FDA4AF" strokeWidth="1.75" />
      <path d="M12 22h30" stroke="#FDA4AF" strokeWidth="1.5" />
      <rect x="18" y="30" width="5" height="10" rx="1.5" fill="#FB7185" />
      <rect x="25" y="26" width="5" height="14" rx="1.5" fill="#F43F5E" />
      <rect x="32" y="28" width="5" height="12" rx="1.5" fill="#FDA4AF" />
      <circle cx="48" cy="42" r="10" fill="#DCFCE7" stroke="#22C55E" strokeWidth="1.75" />
      <path d="M44 42l3 3 6-6" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  showTrend?: boolean;
};

export function AdminKpiCard({ card }: { card: AdminKpiCardData }) {
  const Art = kpiArtMap[card.key];
  const isUsersCard = card.key === "users";

  return (
    <article className={`admin-kpi-card admin-kpi-card-${card.tone}${isUsersCard ? " admin-kpi-card-users" : ""}`}>
      <div className="admin-kpi-accent" aria-hidden />
      <div className="admin-kpi-body">
        <div className="admin-kpi-card-content">
          <div className="admin-kpi-card-top">
            <p className="admin-kpi-label">{card.label}</p>
            <div className="admin-kpi-value-row">
              <span className="admin-kpi-value">{card.value}</span>
              {card.showTrend ? (
                isUsersCard ? (
                  <TrendingUp className="admin-kpi-trend-chart" strokeWidth={2.5} aria-hidden />
                ) : (
                  <span className="admin-kpi-trend">
                    <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                )
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
        <div className={`admin-kpi-icon-wrap${isUsersCard ? " admin-kpi-icon-wrap-users" : ""}`}>
          <Art />
        </div>
      </div>
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
      <div className="admin-module-card-top">
        <Art />
        <span className="admin-module-badge">{badge}</span>
      </div>
      <h3 className="admin-module-title">{title}</h3>
      <p className="admin-module-description">{description}</p>
    </Link>
  );
}

export function AdminSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="admin-section-title">{children}</h2>;
}
