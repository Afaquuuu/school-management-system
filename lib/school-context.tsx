"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { normalizeClassLabel } from "@/lib/class-labels";
import { migrateDummyAdminEmail } from "@/lib/system-users";
import { migrateCommunicationSettings } from "@/lib/school-settings";
import { isClientDatabaseMode } from "@/lib/storage-mode";
import {
  clearCachedSchoolStorage,
  getCachedScopedItem,
  hydrateSchoolStorageFromServer,
  removeCachedScopedItem,
  setCachedScopedItem,
} from "@/lib/tenant-storage-cache";

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
  isLoading: boolean;
  isStorageReady: boolean;
  setCurrentSchool: (school: School) => void;
  addSchool: (school: Omit<School, "id" | "createdAt">) => School;
  updateSchool: (id: string, updates: Partial<School>) => void;
  deleteSchool: (id: string) => void;
  switchSchool: (schoolId: string) => void;
  logout: () => void;
};

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);
const databaseMode = isClientDatabaseMode();

function runSchoolMigrations(schoolId: string): void {
  migrateDummyAdminEmail(schoolId);
  migrateCommunicationSettings(schoolId);
}

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [currentSchool, setCurrentSchoolState] = useState<School | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(databaseMode);
  const [isStorageReady, setIsStorageReady] = useState(!databaseMode);

  useEffect(() => {
    if (!databaseMode) {
      const storedSchools = localStorage.getItem("saas_schools");
      let parsedSchools: School[] = [];

      if (storedSchools) {
        try {
          parsedSchools = JSON.parse(storedSchools) as School[];
          parsedSchools.forEach((school) => runSchoolMigrations(school.id));
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
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/schools");
        if (!response.ok) {
          throw new Error("Failed to load schools from server.");
        }

        const payload = (await response.json()) as { schools?: School[] };
        if (cancelled) return;

        const parsedSchools = payload.schools ?? [];
        parsedSchools.forEach((school) => runSchoolMigrations(school.id));
        setSchools(parsedSchools);

        const currentSchoolId = localStorage.getItem("saas_current_school_id");
        if (currentSchoolId) {
          const school = parsedSchools.find((item) => item.id === currentSchoolId);
          if (school) {
            setCurrentSchoolState(school);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!databaseMode) {
      setIsStorageReady(true);
      return;
    }

    if (!currentSchool) {
      setIsStorageReady(true);
      return;
    }

    let cancelled = false;
    setIsStorageReady(false);

    (async () => {
      try {
        await hydrateSchoolStorageFromServer(currentSchool.id);
        if (!cancelled) {
          runSchoolMigrations(currentSchool.id);
          setIsStorageReady(true);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setIsStorageReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentSchool?.id]);

  const setCurrentSchool = (school: School) => {
    setCurrentSchoolState(school);
    if (typeof window !== "undefined") {
      localStorage.setItem("saas_current_school_id", school.id);
    }
  };

  const addSchool = (schoolData: Omit<School, "id" | "createdAt">): School => {
    if (databaseMode) {
      const optimisticSchool: School = {
        ...schoolData,
        id: `school_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      void fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolData),
      })
        .then(async (response) => {
          if (!response.ok) return;
          const payload = (await response.json()) as { school?: School };
          if (!payload.school) return;

          setSchools((prev) => {
            const withoutOptimistic = prev.filter((item) => item.id !== optimisticSchool.id);
            return [...withoutOptimistic, payload.school!];
          });

          if (currentSchool?.id === optimisticSchool.id) {
            setCurrentSchoolState(payload.school);
          }
        })
        .catch((error) => {
          console.error("Failed to create school on server:", error);
        });

      setSchools((prev) => [...prev, optimisticSchool]);
      return optimisticSchool;
    }

    const newSchool: School = {
      ...schoolData,
      id: `school_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const updatedSchools = [...schools, newSchool];
    setSchools(updatedSchools);
    localStorage.setItem("saas_schools", JSON.stringify(updatedSchools));
    return newSchool;
  };

  const updateSchool = (id: string, updates: Partial<School>) => {
    const updatedSchools = schools.map((school) =>
      school.id === id ? { ...school, ...updates } : school,
    );
    setSchools(updatedSchools);

    if (databaseMode) {
      void fetch("/api/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      }).catch((error) => {
        console.error("Failed to update school on server:", error);
      });
    } else {
      localStorage.setItem("saas_schools", JSON.stringify(updatedSchools));
    }

    if (currentSchool?.id === id) {
      setCurrentSchoolState({ ...currentSchool, ...updates });
    }
  };

  const deleteSchool = (id: string) => {
    const updatedSchools = schools.filter((school) => school.id !== id);
    setSchools(updatedSchools);

    if (databaseMode) {
      clearCachedSchoolStorage(id);
      void fetch(`/api/schools?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
        (error) => {
          console.error("Failed to delete school on server:", error);
        },
      );
      void fetch("/api/tenant-storage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: id, all: true }),
      }).catch((error) => {
        console.error("Failed to delete school storage on server:", error);
      });
    } else {
      localStorage.setItem("saas_schools", JSON.stringify(updatedSchools));

      const keysToRemove: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && key.startsWith(`${id}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }

    if (currentSchool?.id === id) {
      setCurrentSchoolState(null);
      localStorage.removeItem("saas_current_school_id");
    }
  };

  const switchSchool = (schoolId: string) => {
    const school = schools.find((item) => item.id === schoolId);
    if (school) {
      setCurrentSchool(school);
    }
  };

  const logout = () => {
    setCurrentSchoolState(null);
    localStorage.removeItem("saas_current_school_id");
  };

  return (
    <SchoolContext.Provider
      value={{
        currentSchool,
        schools,
        isLoading,
        isStorageReady,
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
    throw new Error("useSchool must be used within a SchoolProvider");
  }
  return context;
}

export function getScopedKey(schoolId: string, key: string): string {
  return `${schoolId}_${key}`;
}

export function getScopedItem(schoolId: string, key: string): string | null {
  if (typeof window === "undefined") return null;

  if (databaseMode) {
    return getCachedScopedItem(schoolId, key);
  }

  return localStorage.getItem(getScopedKey(schoolId, key));
}

export function setScopedItem(schoolId: string, key: string, value: string): void {
  if (typeof window === "undefined") return;

  if (databaseMode) {
    setCachedScopedItem(schoolId, key, value);
    return;
  }

  localStorage.setItem(getScopedKey(schoolId, key), value);
}

export function removeScopedItem(schoolId: string, key: string): void {
  if (typeof window === "undefined") return;

  if (databaseMode) {
    removeCachedScopedItem(schoolId, key);
    return;
  }

  localStorage.removeItem(getScopedKey(schoolId, key));
}

export type SchoolClass = {
  id: string;
  name: string;
  section: string;
  inCharge: string;
  students: number;
  isManual?: boolean;
};

export function getSchoolClasses(schoolId: string): SchoolClass[] {
  const stored = getScopedItem(schoolId, "school_classes");
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error parsing school classes:", error);
    return [];
  }
}

export function getUniqueClassNames(classes: SchoolClass[]): string[] {
  const classNames = classes
    .map((schoolClass) => {
      const parts = normalizeClassLabel(schoolClass.name).split(" ");
      return parts.slice(0, -1).join(" ");
    })
    .filter((name) => name.length > 0);

  return Array.from(new Set(classNames.map((name) => normalizeClassLabel(name)))).sort();
}

export function getUniqueSections(classes: SchoolClass[]): string[] {
  const sections = classes.map((schoolClass) => schoolClass.section).filter((section) => section.length > 0);
  return Array.from(new Set(sections)).sort();
}

export function getSectionsForClass(classes: SchoolClass[], className: string): string[] {
  return classes
    .filter((schoolClass) => {
      const parts = schoolClass.name.trim().split(" ");
      const classNamePart = parts.slice(0, -1).join(" ");
      return classNamePart === className;
    })
    .map((schoolClass) => schoolClass.section)
    .filter((section) => section.length > 0)
    .sort();
}
