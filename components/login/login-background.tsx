export function LoginBackground() {
  return (
    <div className="login-background" aria-hidden>
      <div className="login-background-base" />
      <svg className="login-background-campus" viewBox="0 0 520 900" preserveAspectRatio="xMinYMid slice">
        <defs>
          <linearGradient id="login-campus-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#cbd5e1" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#f4f7f9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="520" height="900" fill="url(#login-campus-fade)" />
        <g fill="#94a3b8" fillOpacity="0.16" stroke="#64748b" strokeOpacity="0.12" strokeWidth="1.5">
          <rect x="68" y="430" width="220" height="170" rx="6" />
          <rect x="92" y="390" width="170" height="48" rx="4" />
          <rect x="148" y="120" width="56" height="280" rx="4" />
          <rect x="132" y="88" width="88" height="36" rx="4" />
          <circle cx="176" cy="168" r="28" fill="#cbd5e1" fillOpacity="0.18" stroke="#64748b" strokeOpacity="0.14" />
          <circle cx="176" cy="168" r="18" fill="none" stroke="#64748b" strokeOpacity="0.16" strokeWidth="2" />
          <line x1="176" y1="150" x2="176" y2="162" stroke="#64748b" strokeOpacity="0.18" strokeWidth="2" />
          <line x1="176" y1="168" x2="188" y2="176" stroke="#64748b" strokeOpacity="0.18" strokeWidth="2" />
          <rect x="118" y="470" width="28" height="42" rx="2" />
          <rect x="158" y="470" width="28" height="42" rx="2" />
          <rect x="198" y="470" width="28" height="42" rx="2" />
          <rect x="238" y="470" width="28" height="42" rx="2" />
          <rect x="286" y="470" width="72" height="130" rx="4" />
          <rect x="302" y="410" width="40" height="64" rx="3" />
        </g>
      </svg>
      <div className="login-background-vignette" />
    </div>
  );
}

export function getSchoolInitials(name: string) {
  const ignored = new Set([
    "public",
    "school",
    "high",
    "secondary",
    "primary",
    "college",
    "academy",
    "the",
    "of",
  ]);

  const words = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part && !ignored.has(part.toLowerCase()));

  const firstWord = words[0] ?? name.trim();
  const hyphenParts = firstWord.split("-").filter(Boolean);

  if (hyphenParts.length >= 2) {
    return `${hyphenParts[0][0] ?? ""}${hyphenParts[hyphenParts.length - 1][0] ?? ""}`.toUpperCase();
  }

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return firstWord.slice(0, 2).toUpperCase();
}
