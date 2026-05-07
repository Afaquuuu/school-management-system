"use client";

import { useState } from "react";
import { Bell, Mail, MessageSquare, Edit, ChevronRight } from "lucide-react";

const alertTypes = [
  {
    id: "1",
    name: "Attendance Alerts",
    description: "Notify parents on 3+ consecutive absences",
    enabled: true,
    channels: ["Email", "SMS"],
  },
  {
    id: "2",
    name: "Performance Alerts",
    description: "Alert on grade average drop > 10% from previous cycle",
    enabled: true,
    channels: ["Email", "Dashboard"],
  },
  {
    id: "3",
    name: "Assignment Alerts",
    description: "Notify on overdue assignments",
    enabled: true,
    channels: ["Email", "SMS", "Dashboard"],
  },
  {
    id: "4",
    name: "Exam Alerts",
    description: "Remind students of upcoming exams",
    enabled: false,
    channels: ["Email", "SMS"],
  },
  {
    id: "5",
    name: "Fee Payment Alerts",
    description: "Alert on overdue invoices",
    enabled: true,
    channels: ["Email"],
  },
];

const notificationChannels = [
  { id: "email", name: "Email", icon: Mail, configured: true, details: "SMTP configured with SendGrid" },
  { id: "sms", name: "SMS", icon: MessageSquare, configured: false, details: "SMS service not configured" },
  { id: "push", name: "Push Notifications", icon: Bell, configured: true, details: "Browser notifications enabled" },
];

const thresholds = [
  { name: "Attendance Threshold", value: "3", unit: "consecutive days", description: "Trigger alert after X consecutive absences" },
  { name: "Grade Average Drop", value: "10", unit: "%", description: "Alert when grade average drops by X percent" },
  { name: "Assignment Due", value: "1", unit: "days before", description: "Reminder X days before deadline" },
  { name: "Fee Overdue", value: "7", unit: "days", description: "Alert X days after due date" },
];

export default function AlertsPage() {
  const [selectedTab, setSelectedTab] = useState<"alerts" | "channels" | "thresholds">("alerts");
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Alerts & Notifications</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Configure alert types, channels, and thresholds</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
        {(["alerts", "channels", "thresholds"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              selectedTab === tab
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Alert Types Tab */}
      {selectedTab === "alerts" && (
        <div className="space-y-4">
          <div className="space-y-3">
            {alertTypes.map((alert) => (
              <div
                key={alert.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-1">{alert.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{alert.description}</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alert.enabled}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      readOnly
                    />
                  </label>
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex gap-2">
                    {alert.channels.map((channel) => (
                      <span
                        key={channel}
                        className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded"
                      >
                        {channel}
                      </span>
                    ))}
                  </div>
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm flex items-center gap-1">
                    Configure
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channels Tab */}
      {selectedTab === "channels" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {notificationChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div
                  key={channel.id}
                  className={`border rounded-lg p-6 ${
                    channel.configured
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                      : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`p-2 rounded-lg ${
                        channel.configured
                          ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                          : "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-50">{channel.name}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {channel.configured ? "✓ Configured" : "⚠ Not configured"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{channel.details}</p>
                  <button className="w-full text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline py-2 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                    {channel.configured ? "Reconfigure" : "Setup"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Thresholds Tab */}
      {selectedTab === "thresholds" && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              ℹ️ Adjust thresholds to control when alerts are triggered. Changes apply immediately.
            </p>
          </div>

          <div className="space-y-3">
            {thresholds.map((threshold) => (
              <div
                key={threshold.name}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-1">{threshold.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{threshold.description}</p>
                  </div>
                  {editingThreshold !== threshold.name && (
                    <button
                      onClick={() => setEditingThreshold(threshold.name)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </button>
                  )}
                </div>

                {editingThreshold === threshold.name ? (
                  <div className="flex gap-2 items-end pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Value</label>
                      <input
                        type="number"
                        defaultValue={threshold.value}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 font-medium pb-2">{threshold.unit}</span>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
                      Save
                    </button>
                    <button
                      onClick={() => setEditingThreshold(null)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-50 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-lg font-bold text-slate-900 dark:text-slate-50">
                    {threshold.value} <span className="text-sm text-slate-600 dark:text-slate-400">{threshold.unit}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
