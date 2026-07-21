"use client";

import { useEffect, type ReactNode } from "react";
import { getSchoolInitials, LoginBackground } from "@/components/login/login-background";

type LoginPageShellProps = {
  schoolName?: string;
  children: ReactNode;
};

export function LoginPageShell({ schoolName, children }: LoginPageShellProps) {
  const displayName = schoolName?.toUpperCase() ?? "School Management";
  const initials = schoolName ? getSchoolInitials(schoolName) : "SM";
  const year = new Date().getFullYear();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <div className="login-shell">
      <LoginBackground />

      <div className="login-page-body">
        <div className="login-page-main">
          <div className="login-page-content">
            <div className="login-brand-icon">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.png" alt="" className="login-brand-icon-image" />
            </div>

            <p className="login-brand-kicker">School Management System</p>
            <h1 className="login-brand-title">{displayName}</h1>

            <div className="login-glass-card">
              <span className="login-watermark login-watermark-tr">{initials}</span>
              <span className="login-watermark login-watermark-br">{initials}</span>
              {children}
            </div>
          </div>
        </div>

        <footer className="login-page-footer">
          <span>
            © {year} {displayName}
          </span>
          <span>Platform v3.2.1</span>
        </footer>
      </div>
    </div>
  );
}
