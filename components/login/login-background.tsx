export function LoginBackground() {
  return (
    <div className="login-background" aria-hidden>
      <div className="login-background-base" />
      <div className="login-background-campus" />
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
