"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, School } from "lucide-react";
import { DEMO_REQUEST_MAILTO } from "@/components/landing/demo-request";

const productLinks = [
  { label: "Student & Staff Management", target: "features" },
  { label: "Attendance Tracking", target: "features" },
  { label: "Exam & Marks Management", target: "features" },
  { label: "Performance Analytics", target: "features" },
  { label: "Finance Management", target: "features" },
  { label: "Communication Tools", target: "features" },
];

const solutionLinks = [
  { label: "Primary & Secondary Schools", target: "solutions" },
  { label: "Colleges & Universities", target: "solutions" },
  { label: "Private Academies", target: "solutions" },
  { label: "Multi-campus Institutions", target: "solutions" },
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function LandingNav() {
  const [openMenu, setOpenMenu] = useState<"product" | "solutions" | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleNavClick = (target: string) => {
    setOpenMenu(null);
    scrollToSection(target);
  };

  return (
    <header ref={navRef} className="landing-nav">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md shadow-blue-500/25">
          <School className="h-5 w-5 text-white" />
        </div>
        <span className="landing-brand-title text-[1.35rem] font-bold tracking-tight">
          School Management
        </span>
      </div>

      <nav className="hidden flex-1 items-center justify-center gap-10 md:flex">
        <div className="relative">
          <button
            type="button"
            className="landing-nav-link"
            aria-expanded={openMenu === "product"}
            aria-haspopup="true"
            onClick={() => setOpenMenu((current) => (current === "product" ? null : "product"))}
          >
            Product
            <ChevronDown
              className={`h-4 w-4 transition-transform ${openMenu === "product" ? "rotate-180" : ""}`}
            />
          </button>

          {openMenu === "product" ? (
            <div className="landing-nav-dropdown" role="menu">
              {productLinks.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className="landing-nav-dropdown-item"
                  onClick={() => handleNavClick(item.target)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            className="landing-nav-link"
            aria-expanded={openMenu === "solutions"}
            aria-haspopup="true"
            onClick={() => setOpenMenu((current) => (current === "solutions" ? null : "solutions"))}
          >
            Solutions
            <ChevronDown
              className={`h-4 w-4 transition-transform ${openMenu === "solutions" ? "rotate-180" : ""}`}
            />
          </button>

          {openMenu === "solutions" ? (
            <div className="landing-nav-dropdown" role="menu">
              {solutionLinks.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className="landing-nav-dropdown-item"
                  onClick={() => handleNavClick(item.target)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="landing-nav-link"
          onClick={() => handleNavClick("support")}
        >
          Support
        </button>

        <button
          type="button"
          className="landing-nav-link"
          onClick={() => handleNavClick("pricing")}
        >
          Pricing
        </button>
      </nav>

      <a href={DEMO_REQUEST_MAILTO} className="landing-demo-btn shrink-0">
        Request Demo
      </a>
    </header>
  );
}
