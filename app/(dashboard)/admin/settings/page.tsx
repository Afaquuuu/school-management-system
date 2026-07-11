"use client";

import { useEffect, useState } from "react";
import { Save, AlertCircle, Download } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { PageHeader } from "@/components/ui/page-header";
import { recordFormFieldLabel } from "@/components/ui/record-form-layout";
import { useSchool } from "@/lib/school-context";
import { flushPendingStorageWrites } from "@/lib/tenant-storage-cache";
import {
  defaultSchoolSystemSettings,
  DEFAULT_SMTP_SENDER_EMAIL,
  getBrevoCommunicationPreset,
  getGmailCommunicationPreset,
  loadSchoolSystemSettings,
  saveSchoolSystemSettings,
  type AcademicSettings,
  type CommunicationSettings,
  type SchoolInfoSettings,
  type SchoolSystemSettings,
  type SecuritySettings,
} from "@/lib/school-settings";
import {
  createSchoolBackupNow,
  downloadSchoolBackupFile,
  fetchSchoolBackupStatus,
  type SchoolBackupStatusResponse,
} from "@/lib/backup-client";
import { BACKUP_FREQUENCIES } from "@/lib/backup-frequency";
import {
  getLastBackupTimestamp,
  validateSecuritySettingsInput,
} from "@/lib/school-security";
import { formatEmailResultMessage, GMAIL_PERSONAL_BLOCK_WARNING, sendTestEmail } from "@/lib/email-client";
import { formatWhatsAppResultMessage, sendTestWhatsApp, connectWhatsAppSession, disconnectWhatsAppSession, fetchWhatsAppSessionStatus, persistWhatsAppLinkedPhone } from "@/lib/whatsapp-client";
import { isWhatsAppDeliveryConfigured, type WhatsAppSessionStatus } from "@/lib/whatsapp-types";
import { PRIMARY_ADMIN_EMAIL } from "@/lib/system-users";

type SettingsSectionKey = "School Information" | "Academic Settings" | "Communication Settings" | "System Security";

export default function SettingsPage() {
  const { currentSchool, updateSchool, isStorageReady } = useSchool();
  const [editingSection, setEditingSection] = useState<SettingsSectionKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [schoolInfo, setSchoolInfo] = useState<SchoolInfoSettings & { name: string; phone: string; email: string }>({
    name: "",
    phone: "",
    email: "",
    schoolCode: "",
    website: "",
  });
  const [academic, setAcademic] = useState<AcademicSettings>(defaultSchoolSystemSettings().academic);
  const [communication, setCommunication] = useState<CommunicationSettings>(
    defaultSchoolSystemSettings().communication,
  );
  const [security, setSecurity] = useState<SecuritySettings>(defaultSchoolSystemSettings().security);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [serverBackupStatus, setServerBackupStatus] = useState<SchoolBackupStatusResponse | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState(PRIMARY_ADMIN_EMAIL);
  const [testWhatsAppTo, setTestWhatsAppTo] = useState("");
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isSendingTestWhatsApp, setIsSendingTestWhatsApp] = useState(false);
  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSessionStatus>({
    status: "disconnected",
  });
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false);

  useEffect(() => {
    if (!currentSchool || !isStorageReady) return;

    const settings = loadSchoolSystemSettings(currentSchool.id);
    setSchoolInfo({
      name: currentSchool.name,
      phone: currentSchool.phone,
      email: currentSchool.email,
      schoolCode: settings.schoolInfo.schoolCode,
      website: settings.schoolInfo.website,
    });
    setAcademic(settings.academic);
    setCommunication(settings.communication);
    setSecurity(settings.security);
    setLastBackupAt(getLastBackupTimestamp(currentSchool.id));
    void fetchSchoolBackupStatus(currentSchool.id)
      .then(setServerBackupStatus)
      .catch(() => setServerBackupStatus(null));
    void fetchWhatsAppSessionStatus(currentSchool.id).then(setWhatsappSession);
  }, [currentSchool, isStorageReady]);

  useEffect(() => {
    if (!currentSchool) return;
    if (
      whatsappSession.status !== "qr" &&
      whatsappSession.status !== "connecting" &&
      whatsappSession.status !== "connected"
    ) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      const snapshot = await fetchWhatsAppSessionStatus(currentSchool.id);
      setWhatsappSession(snapshot);
      if (snapshot.status === "connected" && snapshot.linkedPhone) {
        persistWhatsAppLinkedPhone(currentSchool.id, snapshot.linkedPhone);
        setCommunication((current) => ({
          ...current,
          whatsappLinkedPhone: snapshot.linkedPhone ?? current.whatsappLinkedPhone,
        }));
      }
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [currentSchool, whatsappSession.status]);

  const persistSettings = (next: SchoolSystemSettings) => {
    if (!currentSchool) return;
    saveSchoolSystemSettings(currentSchool.id, next);
  };

  const persistCommunicationFields = (
    updates: Partial<CommunicationSettings>,
  ) => {
    if (!currentSchool) return;

    setCommunication((current) => {
      const nextCommunication = { ...current, ...updates };
      const stored = loadSchoolSystemSettings(currentSchool.id);
      saveSchoolSystemSettings(currentSchool.id, {
        ...stored,
        communication: nextCommunication,
      });
      return nextCommunication;
    });
  };

  const persistCommunicationToggle = (
    updates: Partial<CommunicationSettings>,
  ) => {
    if (!currentSchool) return;

    setCommunication((current) => {
      const nextCommunication = { ...current, ...updates };
      const stored = loadSchoolSystemSettings(currentSchool.id);
      saveSchoolSystemSettings(currentSchool.id, {
        ...stored,
        communication: { ...stored.communication, ...nextCommunication },
      });
      return nextCommunication;
    });
  };

  const handleSave = async (section: SettingsSectionKey) => {
    if (!currentSchool) {
      setError("No school selected. Please sign in to a school account first.");
      return;
    }

    setError("");

    if (section === "School Information") {
      if (!schoolInfo.name.trim()) {
        setError("School name is required.");
        return;
      }

      updateSchool(currentSchool.id, {
        name: schoolInfo.name.trim(),
        phone: schoolInfo.phone.trim(),
        email: schoolInfo.email.trim(),
      });

      const current = loadSchoolSystemSettings(currentSchool.id);
      persistSettings({
        ...current,
        schoolInfo: {
          schoolCode: schoolInfo.schoolCode.trim(),
          website: schoolInfo.website.trim(),
        },
      });
    }

    if (section === "Academic Settings") {
      const current = loadSchoolSystemSettings(currentSchool.id);
      persistSettings({ ...current, academic });
    }

    if (section === "Communication Settings") {
      const current = loadSchoolSystemSettings(currentSchool.id);
      persistSettings({ ...current, communication });
    }

    if (section === "System Security") {
      const validationError = validateSecuritySettingsInput(security);
      if (validationError) {
        setError(validationError);
        return;
      }

      const current = loadSchoolSystemSettings(currentSchool.id);
      persistSettings({ ...current, security });
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setEditingSection(null);
    await flushPendingStorageWrites();
  };

  const handleSendTestEmail = async () => {
    if (!currentSchool) return;

    setIsSendingTestEmail(true);
    setError("");

    try {
      const current = loadSchoolSystemSettings(currentSchool.id);
      saveSchoolSystemSettings(currentSchool.id, { ...current, communication });

      const result = await sendTestEmail({
        schoolId: currentSchool.id,
        schoolName: currentSchool.name,
        to: testEmailTo.trim(),
      });

      if (result.sent > 0 && result.failed.length === 0) {
        const gmailNote =
          communication.emailProvider === "gmail"
            ? `\n\n${GMAIL_PERSONAL_BLOCK_WARNING}`
            : "";
        alert(
          `SMTP accepted the message. Check ${testEmailTo.trim()} (Inbox and Spam).${gmailNote}`,
        );
      } else {
        alert(formatEmailResultMessage(result));
      }
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    if (!currentSchool) return;

    setIsSendingTestWhatsApp(true);
    setError("");

    try {
      const current = loadSchoolSystemSettings(currentSchool.id);
      saveSchoolSystemSettings(currentSchool.id, { ...current, communication });

      const result = await sendTestWhatsApp({
        schoolId: currentSchool.id,
        schoolName: currentSchool.name,
        to: testWhatsAppTo.trim(),
        defaultCountryCode: communication.whatsappDefaultCountryCode,
      });

      alert(formatWhatsAppResultMessage(result));
    } finally {
      setIsSendingTestWhatsApp(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    if (!currentSchool) return;
    setIsConnectingWhatsApp(true);
    setError("");
    try {
      const snapshot = await connectWhatsAppSession(currentSchool.id);
      setWhatsappSession(snapshot);
      if (snapshot.error && snapshot.status !== "qr" && snapshot.status !== "connected") {
        setError(snapshot.error);
      }
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Failed to start WhatsApp connection.",
      );
    } finally {
      setIsConnectingWhatsApp(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!currentSchool) return;
    const snapshot = await disconnectWhatsAppSession(currentSchool.id);
    persistWhatsAppLinkedPhone(currentSchool.id, "");
    setWhatsappSession(snapshot);
    setCommunication((current) => ({
      ...current,
      whatsappLinkedPhone: "",
    }));
  };

  const resetSection = (section: SettingsSectionKey) => {
    if (!currentSchool) return;

    const settings = loadSchoolSystemSettings(currentSchool.id);
    if (section === "School Information") {
      setSchoolInfo({
        name: currentSchool.name,
        phone: currentSchool.phone,
        email: currentSchool.email,
        schoolCode: settings.schoolInfo.schoolCode,
        website: settings.schoolInfo.website,
      });
    }
    if (section === "Academic Settings") setAcademic(settings.academic);
    if (section === "Communication Settings") setCommunication(settings.communication);
    if (section === "System Security") setSecurity(settings.security);
    setEditingSection(null);
  };

  const sections: Array<{
    title: SettingsSectionKey;
    summary: string;
    content: React.ReactNode;
  }> = [
    {
      title: "School Information",
      summary: schoolInfo.name || "Not configured",
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={recordFormFieldLabel}>School Name *</label>
            <input
              type="text"
              value={schoolInfo.name}
              onChange={(e) => setSchoolInfo((current) => ({ ...current, name: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>School Code</label>
            <input
              type="text"
              value={schoolInfo.schoolCode}
              onChange={(e) => setSchoolInfo((current) => ({ ...current, schoolCode: e.target.value }))}
              className="input-field"
              placeholder="e.g. PA-2026"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Phone</label>
            <input
              type="tel"
              value={schoolInfo.phone}
              onChange={(e) => setSchoolInfo((current) => ({ ...current, phone: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Email</label>
            <input
              type="email"
              value={schoolInfo.email}
              onChange={(e) => setSchoolInfo((current) => ({ ...current, email: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Website</label>
            <input
              type="url"
              value={schoolInfo.website}
              onChange={(e) => setSchoolInfo((current) => ({ ...current, website: e.target.value }))}
              className="input-field"
              placeholder="www.yourschool.edu"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Academic Settings",
      summary: `${academic.yearStart} to ${academic.yearEnd}`,
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={recordFormFieldLabel}>Academic Year Start</label>
            <DateInput
              value={academic.yearStart}
              onChange={(value) => setAcademic((current) => ({ ...current, yearStart: value }))}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Academic Year End</label>
            <DateInput
              value={academic.yearEnd}
              onChange={(value) => setAcademic((current) => ({ ...current, yearEnd: value }))}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Grading Scale</label>
            <input
              type="text"
              value={academic.gradingScale}
              onChange={(e) => setAcademic((current) => ({ ...current, gradingScale: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Pass Mark</label>
            <input
              type="number"
              value={academic.passMark}
              onChange={(e) => setAcademic((current) => ({ ...current, passMark: e.target.value }))}
              className="input-field"
            />
          </div>
          <div className="md:col-span-2">
            <label className={recordFormFieldLabel}>Grade Points Calculation</label>
            <select
              value={academic.gradePointsCalculation}
              onChange={(e) =>
                setAcademic((current) => ({ ...current, gradePointsCalculation: e.target.value }))
              }
              className="input-field"
            >
              <option value="Weighted">Weighted</option>
              <option value="Simple Average">Simple Average</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      title: "Communication Settings",
      summary: communication.senderEmail,
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={recordFormFieldLabel}>Email provider</label>
            <select
              value={communication.emailProvider ?? "brevo"}
              onChange={(e) => {
                const provider = e.target.value as CommunicationSettings["emailProvider"];
                if (provider === "brevo") {
                  setCommunication((current) => ({
                    ...getBrevoCommunicationPreset(current.senderEmail || DEFAULT_SMTP_SENDER_EMAIL),
                    smtpUser: current.smtpUser,
                    smtpPassword: current.smtpPassword,
                    whatsappNotifications: current.whatsappNotifications,
                    whatsappDefaultCountryCode: current.whatsappDefaultCountryCode,
                    whatsappLinkedPhone: current.whatsappLinkedPhone,
                  }));
                } else if (provider === "gmail") {
                  setCommunication((current) => ({
                    ...getGmailCommunicationPreset(current.senderEmail || DEFAULT_SMTP_SENDER_EMAIL),
                    smtpPassword: current.smtpPassword,
                    whatsappNotifications: current.whatsappNotifications,
                    whatsappDefaultCountryCode: current.whatsappDefaultCountryCode,
                    whatsappLinkedPhone: current.whatsappLinkedPhone,
                  }));
                } else {
                  setCommunication((current) => ({ ...current, emailProvider: "custom" }));
                }
              }}
              className="input-field"
            >
              <option value="brevo">Brevo (recommended for 2FA & notifications)</option>
              <option value="gmail">Gmail (personal — may block automated mail)</option>
              <option value="custom">Custom SMTP</option>
            </select>
          </div>
          {communication.emailProvider === "gmail" && (
            <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">Personal Gmail blocks automated delivery</p>
              <p className="mt-2 leading-relaxed">
                SMTP login can succeed and mail may appear in{" "}
                <strong>{DEFAULT_SMTP_SENDER_EMAIL}</strong> Sent, but Google often blocks delivery
                with &quot;Message blocked&quot; from{" "}
                <strong>mailer-daemon@googlemail.com</strong>. The app cannot fix this — use Brevo
                and keep <strong>{DEFAULT_SMTP_SENDER_EMAIL}</strong> as your verified sender.
              </p>
              <button
                type="button"
                onClick={() =>
                  setCommunication((current) => ({
                    ...getBrevoCommunicationPreset(
                      current.senderEmail || DEFAULT_SMTP_SENDER_EMAIL,
                    ),
                    smtpPassword: "",
                    whatsappNotifications: current.whatsappNotifications,
                    whatsappDefaultCountryCode: current.whatsappDefaultCountryCode,
                    whatsappLinkedPhone: current.whatsappLinkedPhone,
                  }))
                }
                className="btn-secondary mt-3"
              >
                Switch to Brevo (recommended)
              </button>
            </div>
          )}
          <div>
            <label className={recordFormFieldLabel}>SMTP Server</label>
            <input
              type="text"
              value={communication.smtpServer}
              onChange={(e) =>
                setCommunication((current) => ({
                  ...current,
                  smtpServer: e.target.value,
                  emailProvider: "custom",
                }))
              }
              className="input-field"
              readOnly={communication.emailProvider !== "custom"}
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>SMTP Port</label>
            <input
              type="number"
              value={communication.smtpPort}
              onChange={(e) =>
                setCommunication((current) => ({
                  ...current,
                  smtpPort: e.target.value,
                  emailProvider: "custom",
                }))
              }
              className="input-field"
              readOnly={communication.emailProvider !== "custom"}
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Sender Email</label>
            <input
              type="email"
              value={communication.senderEmail}
              onChange={(e) =>
                setCommunication((current) => {
                  const senderEmail = e.target.value;
                  const syncUser =
                    current.emailProvider === "gmail" || current.emailProvider === "brevo";
                  return {
                    ...current,
                    senderEmail,
                    ...(syncUser && current.emailProvider === "gmail"
                      ? { smtpUser: senderEmail }
                      : {}),
                  };
                })
              }
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>SMTP Username</label>
            <input
              type="email"
              value={communication.smtpUser}
              onChange={(e) => persistCommunicationFields({ smtpUser: e.target.value })}
              placeholder={
                communication.emailProvider === "brevo"
                  ? "Copy from Brevo → SMTP tab (xxx@smtp-brevo.com)"
                  : "Same as sender email"
              }
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>SMTP Password</label>
            <input
              type="password"
              value={communication.smtpPassword}
              onChange={(e) => persistCommunicationFields({ smtpPassword: e.target.value })}
              placeholder={
                communication.emailProvider === "brevo"
                  ? "SMTP key (starts with xsmtpsib-)"
                  : "Gmail app password"
              }
              className="input-field"
            />
          </div>
          <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold text-emerald-950">Free WhatsApp automation</p>
                <p className="mt-1 text-sm text-emerald-900">
                  Link your school&apos;s WhatsApp number once by scanning a QR code. Alerts will
                  then send automatically to guardian phone numbers.
                </p>
                <p className="mt-2 text-xs text-emerald-800">
                  Status:{" "}
                  <strong>
                    {whatsappSession.status === "connected"
                      ? `Connected${whatsappSession.linkedPhone ? ` (+${whatsappSession.linkedPhone})` : ""}`
                      : whatsappSession.status === "qr"
                        ? "Waiting for QR scan"
                        : whatsappSession.status === "connecting"
                          ? "Connecting..."
                          : "Not connected"}
                  </strong>
                </p>
                {whatsappSession.error ? (
                  <p className="mt-2 text-xs text-red-700">{whatsappSession.error}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleConnectWhatsApp}
                  disabled={isConnectingWhatsApp || whatsappSession.status === "connected"}
                  className="btn-secondary"
                >
                  {isConnectingWhatsApp ? "Starting..." : "Connect WhatsApp"}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectWhatsApp}
                  disabled={whatsappSession.status === "disconnected"}
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
            {whatsappSession.qrDataUrl ? (
              <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <img
                  src={whatsappSession.qrDataUrl}
                  alt="WhatsApp QR code"
                  className="h-44 w-44 rounded-lg border border-emerald-200 bg-white p-2"
                />
                <p className="text-sm text-emerald-900">
                  Open WhatsApp on the phone you want to use for school alerts → Linked devices →
                  Link a device → scan this QR code.
                </p>
              </div>
            ) : null}
          </div>
          <div>
            <label className={recordFormFieldLabel}>Default country code</label>
            <input
              type="text"
              value={communication.whatsappDefaultCountryCode}
              onChange={(e) =>
                persistCommunicationFields({
                  whatsappDefaultCountryCode: e.target.value.replace(/\D/g, ""),
                })
              }
              placeholder="92"
              className="input-field"
            />
          </div>
          <p className="text-xs leading-relaxed text-slate-500 md:col-span-2">
            {communication.emailProvider === "gmail" ? (
              <>
                <strong>Gmail setup:</strong> Send from{" "}
                <strong>{DEFAULT_SMTP_SENDER_EMAIL}</strong> (not your admin login). Enable 2-Step
                Verification on that Gmail account → create an App Password → paste it as SMTP
                Password. Sender Email and SMTP Username must match. 2FA codes are delivered to
                your admin inbox ({PRIMARY_ADMIN_EMAIL}). Google may still block automated mail on
                personal accounts.
              </>
            ) : communication.emailProvider === "brevo" ? (
              <>
                <strong>Brevo setup:</strong> Settings → SMTP &amp; API → <strong>SMTP tab</strong>.
                Copy <strong>SMTP login</strong> (looks like <code>123abc@smtp-brevo.com</code>) into
                SMTP Username. Generate an <strong>SMTP key</strong> (starts with{" "}
                <code>xsmtpsib-</code>) — not an API key. Sender Email stays{" "}
                <strong>{DEFAULT_SMTP_SENDER_EMAIL}</strong> (must be verified under Senders).
              </>
            ) : (
              <>Enter your custom SMTP server credentials above.</>
            )}
          </p>
          <p className="text-xs leading-relaxed text-slate-500 md:col-span-2">
            Use a dedicated school WhatsApp number if possible. Keep this app running while alerts
            are active, and add guardian phone numbers on student records (local numbers like
            024… are converted using the country code above).
          </p>
          <div className="md:col-span-2 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className={recordFormFieldLabel}>Send test email to</label>
              <input
                type="email"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                className="input-field"
              />
            </div>
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isSendingTestEmail}
              className="btn-secondary shrink-0"
            >
              {isSendingTestEmail ? "Sending..." : "Send Test Email"}
            </button>
          </div>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={communication.emailNotifications}
              onChange={(e) =>
                persistCommunicationToggle({ emailNotifications: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-600">Enable email notifications</span>
          </label>
          <div className="md:col-span-2 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className={recordFormFieldLabel}>Send test WhatsApp to</label>
              <input
                type="tel"
                value={testWhatsAppTo}
                onChange={(e) => setTestWhatsAppTo(e.target.value)}
                placeholder="03XXXXXXXXX or +923XXXXXXXXX"
                className="input-field"
              />
            </div>
            <button
              type="button"
              onClick={handleSendTestWhatsApp}
              disabled={isSendingTestWhatsApp}
              className="btn-secondary shrink-0"
            >
              {isSendingTestWhatsApp ? "Sending..." : "Send Test WhatsApp"}
            </button>
          </div>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={communication.whatsappNotifications}
              onChange={(e) =>
                persistCommunicationToggle({ whatsappNotifications: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-600">Enable WhatsApp notifications</span>
          </label>
        </div>
      ),
    },
    {
      title: "System Security",
      summary: `${security.sessionTimeoutMinutes} min session timeout`,
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={recordFormFieldLabel}>Session Timeout (minutes)</label>
            <input
              type="number"
              value={security.sessionTimeoutMinutes}
              onChange={(e) =>
                setSecurity((current) => ({ ...current, sessionTimeoutMinutes: e.target.value }))
              }
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Password Min Length</label>
            <input
              type="number"
              min={6}
              max={32}
              value={security.passwordMinLength}
              onChange={(e) =>
                setSecurity((current) => ({ ...current, passwordMinLength: e.target.value }))
              }
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Login Attempt Limit</label>
            <input
              type="number"
              value={security.loginAttemptLimit}
              onChange={(e) =>
                setSecurity((current) => ({ ...current, loginAttemptLimit: e.target.value }))
              }
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>PostgreSQL Backup Schedule</label>
            <select
              value={security.backupFrequency}
              onChange={(e) =>
                setSecurity((current) => ({ ...current, backupFrequency: e.target.value }))
              }
              className="input-field"
            >
              {BACKUP_FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {frequency}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Saves a full PostgreSQL backup for this school on the server. Choose daily, weekly,
              monthly, or yearly.
            </p>
          </div>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={security.require2faForAdmins}
              onChange={(e) =>
                setSecurity((current) => ({ ...current, require2faForAdmins: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-600">Require 2FA for admins</span>
          </label>
          <p className="text-xs leading-relaxed text-slate-500 md:col-span-2">
            Admin 2FA sends a 6-digit verification code by email after the password is entered.
            Configure Brevo SMTP under Communication Settings for reliable delivery.
          </p>
          <div className="md:col-span-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-sm text-slate-600">
              {serverBackupStatus?.statusLabel ??
                "Server backup status will appear here after the first PostgreSQL backup."}
            </div>
            {serverBackupStatus?.nextDueAt ? (
              <p className="text-xs text-slate-500">
                Next scheduled backup: {new Date(serverBackupStatus.nextDueAt).toLocaleString()}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!currentSchool || isCreatingBackup}
                onClick={async () => {
                  if (!currentSchool) return;
                  setIsCreatingBackup(true);
                  setError("");
                  try {
                    const status = await createSchoolBackupNow(currentSchool.id);
                    setServerBackupStatus(status);
                    setLastBackupAt(status.meta.lastAt);
                  } catch (backupError) {
                    setError(
                      backupError instanceof Error
                        ? backupError.message
                        : "Failed to create PostgreSQL backup.",
                    );
                  } finally {
                    setIsCreatingBackup(false);
                  }
                }}
                className="btn-secondary disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {isCreatingBackup ? "Creating Backup..." : "Create Server Backup Now"}
              </button>
              {currentSchool && serverBackupStatus?.meta.lastFile ? (
                <button
                  type="button"
                  onClick={() =>
                    downloadSchoolBackupFile(currentSchool.id, serverBackupStatus.meta.lastFile!)
                  }
                  className="btn-secondary"
                >
                  <Download className="h-4 w-4" />
                  Download Latest Backup
                </button>
              ) : null}
            </div>
            {serverBackupStatus?.files?.length ? (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Saved backups on server
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  {serverBackupStatus.files.slice(0, 5).map((file) => (
                    <li key={file.filename} className="flex items-center justify-between gap-3">
                      <span className="truncate">{file.filename}</span>
                      <button
                        type="button"
                        onClick={() =>
                          currentSchool &&
                          downloadSchoolBackupFile(currentSchool.id, file.filename)
                        }
                        className="text-teal-700 hover:underline"
                      >
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Admin"
        title="System Settings"
        description="Configure global system settings and preferences for your school."
      />

      {saved && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
            ✓
          </div>
          <p className="text-sm font-medium text-emerald-800">Settings saved successfully</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="surface-card overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setEditingSection(editingSection === section.title ? null : section.title)
              }
              className="flex w-full items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 text-left transition hover:bg-slate-100"
            >
              <div>
                <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
                <p className="mt-0.5 text-sm text-slate-500">{section.summary}</p>
              </div>
              <span className="text-lg text-slate-400">{editingSection === section.title ? "−" : "+"}</span>
            </button>

            {editingSection === section.title && (
              <div className="space-y-6 p-6">
                {section.content}

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => resetSection(section.title)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(section.title)}
                    className="btn-primary"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">
              {isWhatsAppDeliveryConfigured(communication)
                ? "WhatsApp Alerts Ready"
                : "WhatsApp Not Linked Yet"}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              {isWhatsAppDeliveryConfigured(communication)
                ? "Automated WhatsApp alerts will send from your linked school number."
                : "Click Connect WhatsApp above and scan the QR code to enable free automated messages."}
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            i
          </div>
          <div>
            <p className="font-semibold text-blue-900">Automatic Backups</p>
            <p className="mt-1 text-sm text-blue-800">
              {serverBackupStatus?.statusLabel ??
                "Configure PostgreSQL backup frequency above."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
