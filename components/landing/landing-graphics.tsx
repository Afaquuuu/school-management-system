const ICON = {
  primary: "#2563EB",
  mid: "#3B82F6",
  light: "#60A5FA",
  soft: "#93C5FD",
  fill: "#DBEAFE",
  fillSoft: "#EFF6FF",
  stroke: 2,
  strokeBold: 2.5,
} as const;

export function FeatureIconStudents() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16" aria-hidden>
      <circle cx="40" cy="22" r="8" fill={ICON.soft} stroke={ICON.primary} strokeWidth={ICON.stroke} />
      <path
        d="M24 52c0-8 7-14 16-14s16 6 16 14"
        stroke={ICON.primary}
        strokeWidth={ICON.strokeBold}
        strokeLinecap="round"
      />
      <circle cx="22" cy="30" r="6" fill={ICON.fill} stroke={ICON.mid} strokeWidth={ICON.stroke} />
      <circle cx="58" cy="30" r="6" fill={ICON.fill} stroke={ICON.mid} strokeWidth={ICON.stroke} />
      <path
        d="M14 58c0-6 5-10 12-10M54 48c7 0 12 4 12 10"
        stroke={ICON.light}
        strokeWidth={ICON.stroke}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FeatureIconAttendance() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16" aria-hidden>
      <rect
        x="16"
        y="18"
        width="40"
        height="44"
        rx="6"
        fill={ICON.fillSoft}
        stroke={ICON.primary}
        strokeWidth={ICON.stroke}
      />
      <path d="M16 30h40" stroke={ICON.primary} strokeWidth={ICON.stroke} />
      <path d="M28 14v8M44 14v8" stroke={ICON.primary} strokeWidth={ICON.stroke} strokeLinecap="round" />
      <circle cx="52" cy="52" r="14" fill={ICON.fill} stroke={ICON.mid} strokeWidth={ICON.stroke} />
      <path
        d="M46 52l4 4 8-8"
        stroke={ICON.primary}
        strokeWidth={ICON.strokeBold}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FeatureIconExams() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16" aria-hidden>
      <rect
        x="18"
        y="14"
        width="36"
        height="48"
        rx="4"
        fill={ICON.fillSoft}
        stroke={ICON.primary}
        strokeWidth={ICON.stroke}
      />
      <path d="M26 28h20M26 36h20M26 44h12" stroke={ICON.light} strokeWidth={ICON.stroke} strokeLinecap="round" />
      <circle cx="54" cy="54" r="12" fill={ICON.fill} stroke={ICON.mid} strokeWidth={ICON.stroke} />
      <text x="49" y="58" fill={ICON.primary} fontSize="10" fontWeight="700">
        A
      </text>
    </svg>
  );
}

export function FeatureIconAnalytics() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16" aria-hidden>
      <rect x="18" y="42" width="8" height="18" rx="2" fill={ICON.soft} stroke={ICON.mid} strokeWidth={ICON.stroke} />
      <rect x="32" y="34" width="8" height="26" rx="2" fill={ICON.light} stroke={ICON.mid} strokeWidth={ICON.stroke} />
      <rect x="46" y="24" width="8" height="36" rx="2" fill={ICON.mid} stroke={ICON.primary} strokeWidth={ICON.stroke} />
      <path
        d="M18 28l16-10 14 8 18-14"
        stroke={ICON.primary}
        strokeWidth={ICON.strokeBold}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M58 12l4 4-4 4"
        stroke={ICON.light}
        strokeWidth={ICON.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FeatureIconFinance() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16" aria-hidden>
      <ellipse cx="28" cy="54" rx="14" ry="6" fill={ICON.fill} stroke={ICON.mid} strokeWidth={ICON.stroke} />
      <ellipse cx="28" cy="48" rx="14" ry="6" fill={ICON.soft} stroke={ICON.mid} strokeWidth={ICON.stroke} />
      <ellipse cx="28" cy="42" rx="14" ry="6" fill={ICON.light} stroke={ICON.primary} strokeWidth={ICON.stroke} />
      <rect
        x="46"
        y="28"
        width="22"
        height="28"
        rx="4"
        fill={ICON.fillSoft}
        stroke={ICON.primary}
        strokeWidth={ICON.stroke}
      />
      <rect x="50" y="34" width="14" height="4" rx="1" fill={ICON.primary} />
      <rect x="50" y="42" width="10" height="3" rx="1" fill={ICON.light} />
      <rect x="50" y="48" width="12" height="3" rx="1" fill={ICON.soft} />
    </svg>
  );
}

export function FeatureIconCommunication() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16" aria-hidden>
      <path
        d="M16 28c0-6 5-10 12-10h24c7 0 12 4 12 10v12c0 6-5 10-12 10H36l-12 10V50"
        fill={ICON.fill}
        stroke={ICON.primary}
        strokeWidth={ICON.stroke}
      />
      <path
        d="M44 34c0-4 3-7 8-7h12c5 0 8 3 8 7v10c0 4-3 7-8 7H56l-8 8V51"
        fill={ICON.fillSoft}
        stroke={ICON.mid}
        strokeWidth={ICON.stroke}
      />
    </svg>
  );
}

function buildLowPolyMesh(width: number, height: number, cols: number, rows: number): string[] {
  const points: Array<{ x: number; y: number }> = [];

  for (let row = 0; row <= rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      const jitterX = Math.sin(row * 1.7 + col * 0.9) * 18 + Math.cos(col * 1.3) * 10;
      const jitterY = Math.cos(row * 1.2 + col * 1.1) * 16 + Math.sin(row * 0.8) * 12;
      points.push({
        x: (col / cols) * width + jitterX,
        y: (row / rows) * height + jitterY,
      });
    }
  }

  const index = (row: number, col: number) => row * (cols + 1) + col;
  const lines = new Set<string>();

  const addLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const key = [
      Math.round(from.x),
      Math.round(from.y),
      Math.round(to.x),
      Math.round(to.y),
    ]
      .sort((a, b) => a - b)
      .join("-");
    lines.add(`${from.x},${from.y},${to.x},${to.y}:${key}`);
  };

  for (let row = 0; row <= rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      const current = points[index(row, col)];

      if (col < cols) {
        addLine(current, points[index(row, col + 1)]);
      }
      if (row < rows) {
        addLine(current, points[index(row + 1, col)]);
      }
      if (row < rows && col < cols) {
        addLine(current, points[index(row + 1, col + 1)]);
      }
      if (row < rows && col > 0) {
        addLine(current, points[index(row + 1, col - 1)]);
      }
    }
  }

  return Array.from(lines).map((entry) => entry.split(":")[0]);
}

const primaryMeshLines = buildLowPolyMesh(1600, 1000, 28, 18);
const accentMeshLines = buildLowPolyMesh(1600, 1000, 14, 9);

export function LandingCorporateBackground() {
  return (
    <div className="landing-corporate-bg" aria-hidden>
      <div className="landing-corporate-bg-base" />
      <div className="landing-corporate-bg-glow landing-corporate-bg-glow-top" />
      <div className="landing-corporate-bg-glow landing-corporate-bg-glow-bottom" />

      <div className="landing-corporate-shape landing-corporate-shape-rect-1" />
      <div className="landing-corporate-shape landing-corporate-shape-rect-2" />
      <div className="landing-corporate-shape landing-corporate-shape-rect-3" />
      <div className="landing-corporate-shape landing-corporate-shape-circle-1" />
      <div className="landing-corporate-shape landing-corporate-shape-circle-2" />

      <svg
        className="landing-corporate-grid"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="rgba(148, 163, 184, 0.14)" strokeWidth="1">
          <line x1="180" y1="0" x2="180" y2="900" />
          <line x1="720" y1="0" x2="720" y2="900" />
          <line x1="1120" y1="0" x2="1120" y2="900" />
          <line x1="0" y1="180" x2="1440" y2="180" />
          <line x1="0" y1="520" x2="1440" y2="520" />
          <line x1="0" y1="760" x2="1440" y2="760" />
        </g>
        <g stroke="rgba(148, 163, 184, 0.08)" strokeWidth="1">
          <line x1="420" y1="0" x2="420" y2="900" />
          <line x1="980" y1="0" x2="980" y2="900" />
          <line x1="0" y1="340" x2="1440" y2="340" />
        </g>
      </svg>
    </div>
  );
}

export function LandingConstellation() {
  return (
    <div className="landing-mesh-wrap" aria-hidden>
      <svg
        className="landing-constellation-svg landing-constellation-primary"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="rgba(147, 170, 206, 0.34)" strokeWidth="0.9">
          {primaryMeshLines.map((line) => {
            const [x1, y1, x2, y2] = line.split(",").map(Number);
            return <line key={line} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
      </svg>

      <svg
        className="landing-constellation-svg landing-constellation-accent"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="rgba(186, 203, 230, 0.28)" strokeWidth="1.1">
          {accentMeshLines.map((line) => {
            const [x1, y1, x2, y2] = line.split(",").map(Number);
            return <line key={`accent-${line}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
      </svg>
    </div>
  );
}
