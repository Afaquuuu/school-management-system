"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AppBrandMark } from "@/components/brand/app-brand-mark";
import { DEMO_REQUEST_LINK, externalEmailLinkProps } from "@/components/landing/demo-request";

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
      <AppBrandMark />

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

      <a
        href={DEMO_REQUEST_LINK}
        {...externalEmailLinkProps}
        className="landing-demo-btn shrink-0"
      >
        Request Demo
      </a>
    </header>
  );
}
