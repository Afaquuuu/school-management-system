"use client";

import { useSchool } from "@/lib/school-context";
import { getSchoolInitials } from "@/components/login/login-background";

export function SchoolBrand() {
  const { currentSchool } = useSchool();

  if (!currentSchool) {
    return null;
  }

  const initials = getSchoolInitials(currentSchool.name);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {currentSchool.logo ? (
        <img
          src={currentSchool.logo}
          alt={`${currentSchool.name} logo`}
          className="sidebar-brand-logo"
        />
      ) : (
        <div className="sidebar-brand-logo sidebar-brand-logo-fallback">
          <span className="text-sm font-bold text-slate-700">{initials}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-bold leading-tight text-white">
          {currentSchool.name}
        </h2>
        <p className="truncate text-[11px] font-medium text-slate-400">{currentSchool.email}</p>
      </div>
    </div>
  );
}
