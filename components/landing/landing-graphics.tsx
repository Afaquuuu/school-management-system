export function FeatureIconStudents() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16" aria-hidden>
      <circle cx="40" cy="22" r="8" fill="#93C5FD" />
      <path d="M24 52c0-8 7-14 16-14s16 6 16 14" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
      <circle cx="22" cy="30" r="6" fill="#BFDBFE" />
      <circle cx="58" cy="30" r="6" fill="#BFDBFE" />
      <path d="M14 58c0-6 5-10 12-10M54 48c7 0 12 4 12 10" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function FeatureIconAttendance() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16" aria-hidden>
      <rect x="16" y="18" width="40" height="44" rx="6" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
      <path d="M16 30h40" stroke="#2563EB" strokeWidth="2" />
      <path d="M28 14v8M44 14v8" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
      <circle cx="52" cy="52" r="14" fill="#DCFCE7" stroke="#16A34A" strokeWidth="2" />
      <path d="M46 52l4 4 8-8" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FeatureIconExams() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16" aria-hidden>
      <rect x="18" y="14" width="36" height="48" rx="4" fill="#FFF7ED" stroke="#EA580C" strokeWidth="2" />
      <path d="M26 28h20M26 36h20M26 44h12" stroke="#FB923C" strokeWidth="2" strokeLinecap="round" />
      <circle cx="54" cy="54" r="12" fill="#FEF3C7" stroke="#D97706" strokeWidth="2" />
      <text x="48" y="58" fill="#D97706" fontSize="10" fontWeight="700">A</text>
    </svg>
  );
}

export function FeatureIconAnalytics() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16" aria-hidden>
      <rect x="18" y="42" width="8" height="18" rx="2" fill="#60A5FA" />
      <rect x="32" y="34" width="8" height="26" rx="2" fill="#3B82F6" />
      <rect x="46" y="24" width="8" height="36" rx="2" fill="#2563EB" />
      <path d="M18 28l16-10 14 8 18-14" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M58 12l4 4-4 4" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FeatureIconFinance() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16" aria-hidden>
      <ellipse cx="28" cy="54" rx="14" ry="6" fill="#FDE68A" />
      <ellipse cx="28" cy="48" rx="14" ry="6" fill="#FCD34D" />
      <ellipse cx="28" cy="42" rx="14" ry="6" fill="#FBBF24" />
      <rect x="46" y="28" width="22" height="28" rx="4" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
      <rect x="50" y="34" width="14" height="4" rx="1" fill="#2563EB" />
      <rect x="50" y="42" width="10" height="3" rx="1" fill="#93C5FD" />
      <rect x="50" y="48" width="12" height="3" rx="1" fill="#93C5FD" />
    </svg>
  );
}

export function FeatureIconCommunication() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16" aria-hidden>
      <path d="M16 28c0-6 5-10 12-10h24c7 0 12 4 12 10v12c0 6-5 10-12 10H36l-12 10V50" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
      <path d="M44 34c0-4 3-7 8-7h12c5 0 8 3 8 7v10c0 4-3 7-8 7H56l-8 8V51" fill="#EFF6FF" stroke="#60A5FA" strokeWidth="2" />
    </svg>
  );
}

export function LandingConstellation() {
  return (
    <svg
      className="landing-constellation-svg"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g stroke="rgba(100, 116, 139, 0.14)" strokeWidth="1">
        <line x1="120" y1="80" x2="280" y2="160" />
        <line x1="280" y1="160" x2="420" y2="90" />
        <line x1="420" y1="90" x2="560" y2="180" />
        <line x1="900" y1="60" x2="1040" y2="140" />
        <line x1="1040" y1="140" x2="1180" y2="70" />
        <line x1="1180" y1="70" x2="1320" y2="150" />
        <line x1="200" y1="420" x2="360" y2="500" />
        <line x1="360" y1="500" x2="520" y2="430" />
        <line x1="980" y1="380" x2="1120" y2="460" />
        <line x1="1120" y1="460" x2="1280" y2="390" />
        <line x1="640" y1="700" x2="780" y2="760" />
        <line x1="780" y1="760" x2="920" y2="690" />
      </g>
      {[
        [120, 80], [280, 160], [420, 90], [560, 180], [900, 60], [1040, 140], [1180, 70], [1320, 150],
        [200, 420], [360, 500], [520, 430], [980, 380], [1120, 460], [1280, 390], [640, 700], [780, 760], [920, 690],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="rgba(100, 116, 139, 0.22)" />
      ))}
    </svg>
  );
}
