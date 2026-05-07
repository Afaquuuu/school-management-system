"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ChevronDown } from "lucide-react";

type UserSession = {
  id: string;
  name: string;
  email: string;
  role: string;
  classDepartment: string;
  schoolId: string;
  loginTime: string;
};

export function UserSession() {
  const router = useRouter();
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Load user session from localStorage
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('user_session');
      if (session) {
        try {
          setUserSession(JSON.parse(session));
        } catch (error) {
          console.error('Error parsing user session:', error);
        }
      }
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_session');
      localStorage.removeItem('user_role');
    }
    router.push('/login');
  };

  if (!userSession) {
    return (
      <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
        <User className="w-4 h-4 text-slate-500" />
        <span className="text-sm text-slate-600 dark:text-slate-400">Not logged in</span>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'teacher':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200';
      case 'student':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'parent':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 w-full p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full text-white text-sm font-semibold">
          {userSession.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
            {userSession.name}
          </p>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getRoleBadgeColor(userSession.role)}`}>
              {userSession.role}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{userSession.name}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{userSession.email}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500">{userSession.classDepartment}</p>
          </div>
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}