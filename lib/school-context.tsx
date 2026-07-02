"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { normalizeClassLabel } from "@/lib/class-labels";

type School = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  createdAt: string;
};

type SchoolContextType = {
  currentSchool: School | null;
  schools: School[];
  setCurrentSchool: (school: School) => void;
  addSchool: (school: Omit<School, 'id' | 'createdAt'>) => School;
  updateSchool: (id: string, updates: Partial<School>) => void;
  deleteSchool: (id: string) => void;
  switchSchool: (schoolId: string) => void;
  logout: () => void;
};

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [currentSchool, setCurrentSchoolState] = useState<School | null>(null);
  const [schools, setSchools] = useState<School[]>([]);

  // Load schools and current school from localStorage on mount
  useEffect(() => {
    const storedSchools = localStorage.getItem("saas_schools");
    let parsedSchools: School[] = [];

    if (storedSchools) {
      try {
        parsedSchools = JSON.parse(storedSchools) as School[];
        setSchools(parsedSchools);
      } catch {
        parsedSchools = [];
      }
    }

    const currentSchoolId = localStorage.getItem("saas_current_school_id");
    if (currentSchoolId && parsedSchools.length > 0) {
      const school = parsedSchools.find((item) => item.id === currentSchoolId);
      if (school) {
        setCurrentSchoolState(school);
      }
    }
  }, []);

  const setCurrentSchool = (school: School) => {
    setCurrentSchoolState(school);
    if (typeof window !== 'undefined') {
      localStorage.setItem('saas_current_school_id', school.id);
    }
  };

  const addSchool = (schoolData: Omit<School, 'id' | 'createdAt'>): School => {
    const newSchool: School = {
      ...schoolData,
      id: `school_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const updatedSchools = [...schools, newSchool];
    setSchools(updatedSchools);

    if (typeof window !== 'undefined') {
      localStorage.setItem('saas_schools', JSON.stringify(updatedSchools));
    }

    return newSchool;
  };

  const updateSchool = (id: string, updates: Partial<School>) => {
    const updatedSchools = schools.map(s => 
      s.id === id ? { ...s, ...updates } : s
    );
    setSchools(updatedSchools);

    if (typeof window !== 'undefined') {
      localStorage.setItem('saas_schools', JSON.stringify(updatedSchools));
    }

    // Update current school if it's the one being updated
    if (currentSchool?.id === id) {
      setCurrentSchoolState({ ...currentSchool, ...updates });
    }
  };

  const deleteSchool = (id: string) => {
    const updatedSchools = schools.filter(s => s.id !== id);
    setSchools(updatedSchools);

    if (typeof window !== 'undefined') {
      localStorage.setItem('saas_schools', JSON.stringify(updatedSchools));
      
      // Clear all data for this school
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${id}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    // If current school is deleted, clear it
    if (currentSchool?.id === id) {
      setCurrentSchoolState(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('saas_current_school_id');
      }
    }
  };

  const switchSchool = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    if (school) {
      setCurrentSchool(school);
    }
  };

  const logout = () => {
    setCurrentSchoolState(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('saas_current_school_id');
    }
  };

  return (
    <SchoolContext.Provider
      value={{
        currentSchool,
        schools,
        setCurrentSchool,
        addSchool,
        updateSchool,
        deleteSchool,
        switchSchool,
        logout,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
}

// Helper function to get scoped localStorage key
export function getScopedKey(schoolId: string, key: string): string {
  return `${schoolId}_${key}`;
}

// Helper functions for scoped localStorage operations
export function getScopedItem(schoolId: string, key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(getScopedKey(schoolId, key));
}

export function setScopedItem(schoolId: string, key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getScopedKey(schoolId, key), value);
}

export function removeScopedItem(schoolId: string, key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getScopedKey(schoolId, key));
}

// Helper type for classes
export type SchoolClass = {
  id: string;
  name: string;
  section: string;
  inCharge: string;
  students: number;
  isManual?: boolean;
};

// Helper function to load manually created classes
export function getSchoolClasses(schoolId: string): SchoolClass[] {
  const stored = getScopedItem(schoolId, 'school_classes');
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error parsing school classes:', error);
    return [];
  }
}

// Helper function to get unique class names from classes
export function getUniqueClassNames(classes: SchoolClass[]): string[] {
  const classNames = classes.map((c) => {
    const parts = normalizeClassLabel(c.name).split(" ");
    return parts.slice(0, -1).join(" ");
  }).filter((name) => name.length > 0);

  return Array.from(new Set(classNames.map((name) => normalizeClassLabel(name)))).sort();
}

// Helper function to get unique sections from classes
export function getUniqueSections(classes: SchoolClass[]): string[] {
  const sections = classes.map(c => c.section).filter(s => s && s.length > 0);
  return Array.from(new Set(sections)).sort();
}

// Helper function to get sections for a specific class name
export function getSectionsForClass(classes: SchoolClass[], className: string): string[] {
  return classes
    .filter(c => {
      const parts = c.name.trim().split(' ');
      const classNamePart = parts.slice(0, -1).join(' ');
      return classNamePart === className;
    })
    .map(c => c.section)
    .filter(s => s && s.length > 0)
    .sort();
}
