"use client";

import { Building2 } from "lucide-react";

import { useSchool } from "@/lib/school-context";

export function SchoolBrand() {
  const { currentSchool } = useSchool();

  if (!currentSchool) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {currentSchool.logo ? (
        <img
          src={currentSchool.logo}
          alt={`${currentSchool.name} logo`}
          className="h-11 w-11 shrink-0 rounded-2xl border border-slate-700/50 object-cover shadow-md"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 shadow-md shadow-teal-900/30">
          <Building2 className="h-5 w-5 text-white" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-bold tracking-tight text-white">
          {currentSchool.name}
        </h2>
        <p className="truncate text-xs font-medium text-white/70">{currentSchool.email}</p>
      </div>
    </div>
  );
}
