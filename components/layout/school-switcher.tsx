"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSchool } from '@/lib/school-context';
import { Building2, ChevronDown, LogOut, Settings, Plus, Check } from 'lucide-react';

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
    // Refresh the page to load new school's data
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    router.push('/school-auth');
  };

  const handleAddSchool = () => {
    router.push('/school-auth');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {currentSchool.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {currentSchool.email}
          </p>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Switch School
              </div>
              <div className="space-y-1">
                {schools.map((school) => (
                  <button
                    key={school.id}
                    onClick={() => handleSwitch(school.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      school.id === currentSchool.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{school.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{school.email}</p>
                    </div>
                    {school.id === currentSchool.id && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 p-2">
              <button
                onClick={handleAddSchool}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Another School</span>
              </button>
              
              <button
                onClick={() => router.push('/admin/settings')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">School Settings</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
