import { getScopedItem, setScopedItem } from "@/lib/school-context";

export type SchoolInfoSettings = {
  schoolCode: string;
  website: string;
};

export type AcademicSettings = {
  yearStart: string;
  yearEnd: string;
  gradingScale: string;
  passMark: string;
  gradePointsCalculation: string;
};

export type CommunicationSettings = {
  smtpServer: string;
  smtpPort: string;
  senderEmail: string;
  smtpUser: string;
  smtpPassword: string;
  smsGateway: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
};

export type SecuritySettings = {
  sessionTimeoutMinutes: string;
  passwordMinLength: string;
  require2faForAdmins: boolean;
  loginAttemptLimit: string;
  backupFrequency: string;
};

export type SchoolSystemSettings = {
  schoolInfo: SchoolInfoSettings;
  academic: AcademicSettings;
  communication: CommunicationSettings;
  security: SecuritySettings;
};

const STORAGE_KEY = "school_system_settings";

export const defaultSchoolSystemSettings = (): SchoolSystemSettings => ({
  schoolInfo: {
    schoolCode: "",
    website: "",
  },
  academic: {
    yearStart: "2026-09-01",
    yearEnd: "2027-06-30",
    gradingScale: "A-F",
    passMark: "40",
    gradePointsCalculation: "Weighted",
  },
  communication: {
    smtpServer: "smtp.gmail.com",
    smtpPort: "587",
    senderEmail: "noreply@school.edu",
    smtpUser: "",
    smtpPassword: "",
    smsGateway: "Not Configured",
    emailNotifications: true,
    smsNotifications: false,
  },
  security: {
    sessionTimeoutMinutes: "30",
    passwordMinLength: "8",
    require2faForAdmins: true,
    loginAttemptLimit: "5",
    backupFrequency: "Daily",
  },
});

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function loadSchoolSystemSettings(schoolId: string): SchoolSystemSettings {
  const defaults = defaultSchoolSystemSettings();
  const stored = parseJson<Partial<SchoolSystemSettings>>(
    getScopedItem(schoolId, STORAGE_KEY),
    {},
  );

  return {
    schoolInfo: { ...defaults.schoolInfo, ...stored.schoolInfo },
    academic: { ...defaults.academic, ...stored.academic },
    communication: { ...defaults.communication, ...stored.communication },
    security: { ...defaults.security, ...stored.security },
  };
}

export function saveSchoolSystemSettings(
  schoolId: string,
  settings: SchoolSystemSettings,
): void {
  setScopedItem(schoolId, STORAGE_KEY, JSON.stringify(settings));
}
