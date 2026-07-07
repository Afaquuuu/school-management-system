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
  emailProvider: "gmail" | "brevo" | "custom";
  smtpServer: string;
  smtpPort: string;
  senderEmail: string;
  smtpUser: string;
  smtpPassword: string;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  whatsappDefaultCountryCode: string;
  whatsappLinkedPhone: string;
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

/** Outgoing mail identity — separate from admin login email. */
export const DEFAULT_SMTP_SENDER_EMAIL = "webdev.team002@gmail.com";

const LEGACY_SENDER_EMAILS = ["gulsharaf@gmail.com", "harrycosmetics02@gmail.com"];

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
    emailProvider: "brevo",
    smtpServer: "smtp-relay.brevo.com",
    smtpPort: "587",
    senderEmail: DEFAULT_SMTP_SENDER_EMAIL,
    smtpUser: DEFAULT_SMTP_SENDER_EMAIL,
    smtpPassword: "",
    emailNotifications: true,
    whatsappNotifications: false,
    whatsappDefaultCountryCode: "233",
    whatsappLinkedPhone: "",
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
    communication: normalizeCommunicationSettings({
      ...defaults.communication,
      ...stored.communication,
    }),
    security: { ...defaults.security, ...stored.security },
  };
}

function normalizeCommunicationSettings(
  communication: CommunicationSettings & {
    smsGateway?: string;
    smsNotifications?: boolean;
    whatsappAccessToken?: string;
    whatsappPhoneNumberId?: string;
    whatsappTemplateName?: string;
    whatsappTemplateLanguage?: string;
    whatsappApiVersion?: string;
  },
): CommunicationSettings {
  const sender = communication.senderEmail.trim().toLowerCase();
  const user = communication.smtpUser.trim().toLowerCase();
  let next: CommunicationSettings = {
    ...communication,
    whatsappNotifications:
      communication.whatsappNotifications ?? communication.smsNotifications ?? false,
    whatsappDefaultCountryCode: communication.whatsappDefaultCountryCode?.trim() || "233",
    whatsappLinkedPhone: communication.whatsappLinkedPhone?.trim() ?? "",
  };

  if (!sender || LEGACY_SENDER_EMAILS.some((legacy) => legacy.toLowerCase() === sender)) {
    next.senderEmail = DEFAULT_SMTP_SENDER_EMAIL;
  }

  if (!next.emailProvider) {
    next.emailProvider = next.smtpServer.includes("brevo") ? "brevo" : "gmail";
  }

  if (next.emailProvider === "brevo") {
    next.smtpServer = "smtp-relay.brevo.com";
    next.smtpPort = "587";
    if (
      LEGACY_SENDER_EMAILS.some((legacy) => legacy.toLowerCase() === user) ||
      user === "gulsharaf@gmail.com"
    ) {
      next.smtpUser = "";
    }
  } else if (next.emailProvider === "gmail") {
    next.smtpServer = "smtp.gmail.com";
    next.smtpPort = "587";
    next.smtpUser = next.senderEmail.trim();
  } else if (
    LEGACY_SENDER_EMAILS.some((legacy) => legacy.toLowerCase() === user) ||
    user === "gulsharaf@gmail.com"
  ) {
    next.smtpUser = "";
  }

  return next;
}

export function getBrevoCommunicationPreset(senderEmail: string): CommunicationSettings {
  return {
    emailProvider: "brevo",
    smtpServer: "smtp-relay.brevo.com",
    smtpPort: "587",
    senderEmail: senderEmail.trim(),
    smtpUser: "",
    smtpPassword: "",
    emailNotifications: true,
    whatsappNotifications: false,
    whatsappDefaultCountryCode: "233",
    whatsappLinkedPhone: "",
  };
}

export function getGmailCommunicationPreset(senderEmail: string): CommunicationSettings {
  return {
    emailProvider: "gmail",
    smtpServer: "smtp.gmail.com",
    smtpPort: "587",
    senderEmail: senderEmail.trim(),
    smtpUser: senderEmail.trim(),
    smtpPassword: "",
    emailNotifications: true,
    whatsappNotifications: false,
    whatsappDefaultCountryCode: "233",
    whatsappLinkedPhone: "",
  };
}

export function saveSchoolSystemSettings(
  schoolId: string,
  settings: SchoolSystemSettings,
): void {
  setScopedItem(schoolId, STORAGE_KEY, JSON.stringify(settings));
}

export function migrateCommunicationSettings(schoolId: string): void {
  const settings = loadSchoolSystemSettings(schoolId);
  const stored = parseJson<Partial<SchoolSystemSettings>>(
    getScopedItem(schoolId, STORAGE_KEY),
    {},
  );
  const previousUser = stored.communication?.smtpUser?.trim() ?? "";
  const nextUser = settings.communication.smtpUser.trim();
  const needsProviderMigration =
    !stored.communication?.emailProvider ||
    stored.communication.emailProvider === "gmail";

  if (previousUser !== nextUser || needsProviderMigration) {
    const communication =
      needsProviderMigration && !settings.communication.smtpPassword.trim()
        ? getBrevoCommunicationPreset(
            settings.communication.senderEmail || DEFAULT_SMTP_SENDER_EMAIL,
          )
        : settings.communication;

    saveSchoolSystemSettings(schoolId, { ...settings, communication });
  }
}
