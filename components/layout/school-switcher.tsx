"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSchool } from "@/lib/school-context";
import { Building2, ChevronDown, LogOut, Settings, Plus, Check } from "lucide-react";

export function SchoolSwitcher() {
  const router = useRouter();
  const { currentSchool, schools, switchSchool, logout } = useSchool();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentSchool) {
    return null;
  }

  const handleSwitch = (schoolId: string) => {
    switchSchool(schoolId);
    setIsOpen(false);
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    router.push("/school-auth");
  };

  const handleAddSchool = () => {
    router.push("/school-auth");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-left transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm"
      >
        <div className="rounded-lg bg-blue-600 p-2 shadow-sm">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {currentSchool.name}
          </p>
          <p className="truncate text-xs text-slate-500">{currentSchool.email}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated">
            <div className="p-2">
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Switch School
              </div>
              <div className="space-y-0.5">
                {schools.map((school) => (
                  <button
                    key={school.id}
                    onClick={() => handleSwitch(school.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                      school.id === currentSchool.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium">{school.name}</p>
                      <p className="truncate text-xs text-slate-500">{school.email}</p>
                    </div>
                    {school.id === currentSchool.id && (
                      <Check className="h-4 w-4 shrink-0 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 p-2">
              <button
                onClick={handleAddSchool}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">Add Another School</span>
              </button>

              <button
                onClick={() => router.push("/admin/settings")}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Settings className="h-4 w-4" />
                <span className="text-sm font-medium">School Settings</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
