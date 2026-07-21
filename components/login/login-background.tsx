import { School } from "lucide-react";
import { LandingConstellation } from "@/components/landing/landing-graphics";

const ICON_POSITIONS = [
  { top: "8%", left: "6%", size: 18, rotate: -12 },
  { top: "14%", left: "82%", size: 16, rotate: 8 },
  { top: "28%", left: "18%", size: 14, rotate: 15 },
  { top: "34%", left: "90%", size: 20, rotate: -6 },
  { top: "52%", left: "8%", size: 16, rotate: 10 },
  { top: "58%", left: "76%", size: 15, rotate: -14 },
  { top: "72%", left: "22%", size: 17, rotate: 6 },
  { top: "78%", left: "88%", size: 14, rotate: -10 },
  { top: "86%", left: "12%", size: 15, rotate: 12 },
  { top: "18%", left: "48%", size: 13, rotate: -8 },
  { top: "66%", left: "52%", size: 14, rotate: 5 },
];

export function LoginBackground() {
  return (
    <div className="login-background" aria-hidden>
      <LandingConstellation />
      <div className="login-background-glow" />

      {ICON_POSITIONS.map((icon, index) => (
        <School
          key={index}
          className="login-background-icon"
          style={{
            top: icon.top,
            left: icon.left,
            width: icon.size,
            height: icon.size,
            transform: `rotate(${icon.rotate}deg)`,
          }}
        />
      ))}
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
