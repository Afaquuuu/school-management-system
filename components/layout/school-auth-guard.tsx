"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSchool } from '@/lib/school-context';

export function SchoolAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentSchool } = useSchool();

  useEffect(() => {
    if (!currentSchool) {
      router.push('/school-auth');
    }
  }, [currentSchool, router]);

  if (!currentSchool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
