"use client";

import { useEffect, useState } from "react";
import { Save, Eye, EyeOff, AlertCircle } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { PageHeader } from "@/components/ui/page-header";
import { recordFormFieldLabel } from "@/components/ui/record-form-layout";
import { useSchool } from "@/lib/school-context";
import {
  defaultSchoolSystemSettings,
  loadSchoolSystemSettings,
  saveSchoolSystemSettings,
  type AcademicSettings,
  type CommunicationSettings,
  type SchoolInfoSettings,
  type SchoolSystemSettings,
  type SecuritySettings,
} from "@/lib/school-settings";

type SettingsSectionKey = "School Information" | "Academic Settings" | "Communication Settings" | "System Security";

export default function SettingsPage() {
  const { currentSchool, updateSchool } = useSchool();
  const [editingSection, setEditingSection] = useState<SettingsSectionKey | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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

  useEffect(() => {
    if (!currentSchool) return;

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
  }, [currentSchool]);

  const persistSettings = (next: SchoolSystemSettings) => {
    if (!currentSchool) return;
    saveSchoolSystemSettings(currentSchool.id, next);
  };

  const handleSave = (section: SettingsSectionKey) => {
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
      const current = loadSchoolSystemSettings(currentSchool.id);
      persistSettings({ ...current, security });
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setEditingSection(null);
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
          <div>
            <label className={recordFormFieldLabel}>SMTP Server</label>
            <input
              type="text"
              value={communication.smtpServer}
              onChange={(e) => setCommunication((current) => ({ ...current, smtpServer: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>SMTP Port</label>
            <input
              type="number"
              value={communication.smtpPort}
              onChange={(e) => setCommunication((current) => ({ ...current, smtpPort: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Sender Email</label>
            <input
              type="email"
              value={communication.senderEmail}
              onChange={(e) => setCommunication((current) => ({ ...current, senderEmail: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>SMTP Username</label>
            <input
              type="email"
              value={communication.smtpUser}
              onChange={(e) => setCommunication((current) => ({ ...current, smtpUser: e.target.value }))}
              placeholder="Leave blank to use sender email"
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>SMTP Password</label>
            <input
              type="password"
              value={communication.smtpPassword}
              onChange={(e) =>
                setCommunication((current) => ({ ...current, smtpPassword: e.target.value }))
              }
              placeholder="App password or SMTP credential"
              className="input-field"
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>SMS Gateway</label>
            <input type="text" value={communication.smsGateway} readOnly className="input-field bg-slate-50" />
          </div>
          <p className="text-xs leading-relaxed text-slate-500 md:col-span-2">
            Used for fee reminders and announcement emails. For Gmail, use an app password with SMTP
            server <code className="rounded bg-slate-100 px-1">smtp.gmail.com</code> and port{" "}
            <code className="rounded bg-slate-100 px-1">587</code>.
          </p>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={communication.emailNotifications}
              onChange={(e) =>
                setCommunication((current) => ({ ...current, emailNotifications: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-600">Enable email notifications</span>
          </label>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={communication.smsNotifications}
              onChange={(e) =>
                setCommunication((current) => ({ ...current, smsNotifications: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-600">Enable SMS notifications</span>
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={security.passwordMinLength}
                onChange={(e) =>
                  setSecurity((current) => ({ ...current, passwordMinLength: e.target.value }))
                }
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
            <label className={recordFormFieldLabel}>Data Backup Frequency</label>
            <select
              value={security.backupFrequency}
              onChange={(e) =>
                setSecurity((current) => ({ ...current, backupFrequency: e.target.value }))
              }
              className="input-field"
            >
              <option value="Hourly">Hourly</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
            </select>
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
            <p className="font-semibold text-amber-900">SMS Gateway Not Configured</p>
            <p className="mt-1 text-sm text-amber-800">
              Configure SMS to enable parent notifications via text messages.
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            i
          </div>
          <div>
            <p className="font-semibold text-blue-900">Auto Backup Enabled</p>
            <p className="mt-1 text-sm text-blue-800">
              System performs daily backups at 02:00 AM server time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
