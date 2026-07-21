import type { ReactNode } from "react";
import { School } from "lucide-react";
import { getSchoolInitials, LoginBackground } from "@/components/login/login-background";

type LoginPageShellProps = {
  schoolName?: string;
  children: ReactNode;
};

export function LoginPageShell({ schoolName, children }: LoginPageShellProps) {
  const displayName = schoolName?.toUpperCase() ?? "School Management";
  const initials = schoolName ? getSchoolInitials(schoolName) : "SM";
  const year = new Date().getFullYear();

  return (
    <div className="login-shell">
      <LoginBackground />

      <div className="login-page-body">
        <div className="login-page-main">
          <div className="w-full max-w-[430px]">
            <div className="login-brand-icon">
              <School className="h-9 w-9 text-white" strokeWidth={1.8} />
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
