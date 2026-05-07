"use client";

import { useState } from "react";
import { Save, Eye, EyeOff, AlertCircle } from "lucide-react";

const settingsSections = [
  {
    title: "School Information",
    fields: [
      { label: "School Name", value: "Progressive Academy", type: "text" },
      { label: "School Code", value: "PA-2026", type: "text" },
      { label: "Phone", value: "+233 XX XXX XXXX", type: "tel" },
      { label: "Email", value: "info@progressiveacademy.edu", type: "email" },
      { label: "Website", value: "www.progressiveacademy.edu", type: "url" },
    ],
  },
  {
    title: "Academic Settings",
    fields: [
      { label: "Academic Year Start", value: "2026-09-01", type: "date" },
      { label: "Academic Year End", value: "2027-06-30", type: "date" },
      { label: "Grading Scale", value: "A-F", type: "text" },
      { label: "Pass Mark", value: "40", type: "number" },
      { label: "Grade Points Calculation", value: "Weighted", type: "select", options: ["Weighted", "Simple Average"] },
    ],
  },
  {
    title: "Communication Settings",
    fields: [
      { label: "SMTP Server", value: "smtp.gmail.com", type: "text" },
      { label: "SMTP Port", value: "587", type: "number" },
      { label: "Sender Email", value: "noreply@school.edu", type: "email" },
      { label: "SMS Gateway", value: "Not Configured", type: "text", readOnly: true },
      { label: "Enable Email Notifications", value: true, type: "checkbox" },
      { label: "Enable SMS Notifications", value: false, type: "checkbox" },
    ],
  },
  {
    title: "System Security",
    fields: [
      { label: "Session Timeout (minutes)", value: "30", type: "number" },
      { label: "Password Min Length", value: "8", type: "number" },
      { label: "Require 2FA for Admins", value: true, type: "checkbox" },
      { label: "Login Attempt Limit", value: "5", type: "number" },
      { label: "Data Backup Frequency", value: "Daily", type: "select", options: ["Hourly", "Daily", "Weekly"] },
    ],
  },
];

export default function SettingsPage() {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setEditingSection(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">System Settings</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Configure global system settings and preferences</p>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">✓</div>
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">Settings saved successfully</p>
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingsSections.map((section) => (
          <div key={section.title} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            {/* Section Header */}
            <div
              onClick={() => setEditingSection(editingSection === section.title ? null : section.title)}
              className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
            >
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{section.title}</h2>
              <span className="text-slate-600 dark:text-slate-400">
                {editingSection === section.title ? "−" : "+"}
              </span>
            </div>

            {/* Section Content */}
            {editingSection === section.title && (
              <div className="p-6 space-y-4">
                {section.fields.map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">
                      {field.label}
                    </label>

                    {field.type === "checkbox" ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={field.value as boolean}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Enable this setting</span>
                      </label>
                    ) : field.type === "select" && 'options' in field && field.options ? (
                      <select
                        defaultValue={field.value as string}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="relative">
                        <input
                          type={field.type === "password" && !showPassword ? "password" : "text"}
                          defaultValue={field.value as string}
                          readOnly={'readOnly' in field ? field.readOnly : false}
                          className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            ('readOnly' in field && field.readOnly) ? "bg-slate-50 dark:bg-slate-800 cursor-not-allowed" : ""
                          }`}
                        />
                        {field.type === "password" && (
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
                  <button
                    onClick={() => setEditingSection(null)}
                    className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Warnings & Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">SMS Gateway Not Configured</p>
            <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
              Configure SMS to enable parent notifications via text messages.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0 text-xs font-bold">ℹ</div>
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-200">Auto Backup Enabled</p>
            <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
              System performs daily backups at 02:00 AM server time.
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h3 className="font-bold text-red-900 dark:text-red-200 mb-4">⚠️ Danger Zone</h3>
        <div className="space-y-3">
          <button className="w-full text-left p-3 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200 dark:border-red-700">
            <p className="font-semibold text-red-900 dark:text-red-200">Clear All Cache</p>
            <p className="text-sm text-red-800 dark:text-red-300">This will clear all cached data. System may run slower initially.</p>
          </button>
          <button className="w-full text-left p-3 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200 dark:border-red-700">
            <p className="font-semibold text-red-900 dark:text-red-200">Reset to Default Settings</p>
            <p className="text-sm text-red-800 dark:text-red-300">This action cannot be undone. All customizations will be lost.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
