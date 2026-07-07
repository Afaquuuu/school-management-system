"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  ChevronRight,
  Edit,
  Mail,
  MessageSquare,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";
import { useSchool } from "@/lib/school-context";
import {
  formatAlertDispatchSummary,
  refreshAndDispatchSchoolAlerts,
} from "@/lib/alert-dispatch";
import { getUserSession } from "@/lib/teacher-check-in";
import {
  dismissAlert,
  getAlertTypeDescription,
  getChannelLabel,
  getDefaultAlertSettings,
  getVisibleAlerts,
  loadAlertSettings,
  markAlertRead,
  sanitizeAlertChannels,
  saveAlertSettings,
  type ActiveAlert,
  type AlertChannelId,
  type AlertThreshold,
  type AlertTypeConfig,
  type AlertTypeId,
  type NotificationChannelConfig,
  type SchoolAlertSettings,
} from "@/lib/school-alerts";

const channelIcons = {
  email: Mail,
  whatsapp: MessageSquare,
};

export default function AlertsPage() {
  const { currentSchool } = useSchool();
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"alerts" | "channels" | "thresholds" | "live">(
    "alerts",
  );
  const [settings, setSettings] = useState<SchoolAlertSettings>(getDefaultAlertSettings());
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState("");
  const [configuringAlertId, setConfiguringAlertId] = useState<AlertTypeId | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const session = getUserSession();
  const isAdmin = session?.role === "admin";

  const loadData = useCallback(async () => {
    if (!currentSchool) return;
    const loadedSettings = loadAlertSettings(currentSchool.id);
    setSettings(loadedSettings);
    const { alerts } = await refreshAndDispatchSchoolAlerts(
      currentSchool.id,
      currentSchool.name,
    );
    setActiveAlerts(alerts);
    setLoading(false);
  }, [currentSchool]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const persistSettings = async (nextSettings: SchoolAlertSettings, successText: string) => {
    if (!currentSchool) return;
    saveAlertSettings(currentSchool.id, nextSettings);
    const enriched = loadAlertSettings(currentSchool.id);
    setSettings(enriched);
    const { alerts, dispatch } = await refreshAndDispatchSchoolAlerts(
      currentSchool.id,
      currentSchool.name,
    );
    setActiveAlerts(alerts);
    const dispatchNote =
      dispatch.emailsSent > 0 || dispatch.whatsappSent > 0
        ? ` ${formatAlertDispatchSummary(dispatch)}`
        : "";
    setMessage({ type: "success", text: `${successText}${dispatchNote}` });
  };

  const handleToggleAlert = (alertId: AlertTypeId, enabled: boolean) => {
    const nextSettings: SchoolAlertSettings = {
      ...settings,
      alertTypes: settings.alertTypes.map((alert) =>
        alert.id === alertId ? { ...alert, enabled } : alert,
      ),
    };
    persistSettings(
      nextSettings,
      `${nextSettings.alertTypes.find((a) => a.id === alertId)?.name} ${enabled ? "enabled" : "disabled"}.`,
    );
  };

  const handleSaveAlertConfig = (channels: AlertChannelId[]) => {
    if (!configuringAlertId) return;
    const nextSettings: SchoolAlertSettings = {
      ...settings,
      alertTypes: settings.alertTypes.map((alert) =>
        alert.id === configuringAlertId ? { ...alert, channels } : alert,
      ),
    };
    persistSettings(nextSettings, "Alert channels updated.");
    setConfiguringAlertId(null);
  };

  const handleSaveThreshold = (thresholdId: string) => {
    const value = Number(thresholdDraft);
    if (!Number.isFinite(value) || value < 0) {
      setMessage({ type: "error", text: "Please enter a valid threshold value." });
      return;
    }

    const nextSettings: SchoolAlertSettings = {
      ...settings,
      thresholds: settings.thresholds.map((threshold) =>
        threshold.id === thresholdId ? { ...threshold, value } : threshold,
      ),
    };
    persistSettings(nextSettings, "Threshold saved. Alert rules updated.");
    setEditingThresholdId(null);
  };

  const handleRefreshAlerts = async () => {
    if (!currentSchool) return;
    setRefreshing(true);
    const { alerts, dispatch } = await refreshAndDispatchSchoolAlerts(
      currentSchool.id,
      currentSchool.name,
    );
    setActiveAlerts(alerts);
    setSettings(loadAlertSettings(currentSchool.id));
    setRefreshing(false);
    setMessage({
      type:
        dispatch.errors.length > 0 && dispatch.emailsSent === 0 && dispatch.whatsappSent === 0
          ? "error"
          : "success",
      text: formatAlertDispatchSummary(dispatch),
    });
  };

  const filteredAlertTypes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return settings.alertTypes;
    return settings.alertTypes.filter((alert) => {
      const description = getAlertTypeDescription(alert.id, settings);
      return (
        alert.name.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, settings]);

  const configuringAlert = settings.alertTypes.find((alert) => alert.id === configuringAlertId);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="surface-card p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h1 className="page-title">Admin Access Required</h1>
        <p className="page-subtitle mt-2">
          Only administrators can configure alerts and notification settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="section-label mb-1">Admin</p>
          <h1 className="page-title">Alerts & Notifications</h1>
          <p className="page-subtitle mt-1">
            Configure alert types, channels, and thresholds
          </p>
        </div>
        <button
          onClick={handleRefreshAlerts}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Live Alerts
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-4 border-b border-slate-200 dark:border-slate-700">
        {(
          [
            ["alerts", "Alerts"],
            ["channels", "Channels"],
            ["thresholds", "Thresholds"],
            ["live", `Live Alerts (${activeAlerts.length})`],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`border-b-2 px-4 py-2 font-medium transition-colors ${
              selectedTab === tab
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {selectedTab === "alerts" && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alert types..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
            />
          </div>

          <div className="space-y-3">
            {filteredAlertTypes.map((alert) => (
              <AlertTypeCard
                key={alert.id}
                alert={alert}
                description={getAlertTypeDescription(alert.id, settings)}
                onToggle={(enabled) => handleToggleAlert(alert.id, enabled)}
                onConfigure={() => setConfiguringAlertId(alert.id)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedTab === "channels" && (
        <div className="grid gap-4 md:grid-cols-2">
          {settings.channels.map((channel) => {
            const Icon = channelIcons[channel.id] ?? Bell;
            return (
              <div
                key={channel.id}
                className={`rounded-lg border p-6 ${
                  channel.configured
                    ? "border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                    : "border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20"
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`rounded-lg p-2 ${
                      channel.configured
                        ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                      {channel.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {channel.configured ? "Configured" : "Not configured"}
                    </p>
                  </div>
                </div>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                  {channel.details}
                </p>
                {channel.id === "email" || channel.id === "whatsapp" ? (
                  <Link
                    href="/admin/settings"
                    className="block w-full rounded-lg border border-blue-300 py-2 text-center text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  >
                    Open Communication Settings
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {selectedTab === "thresholds" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/30">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Adjust thresholds to control when alerts are triggered. Changes apply immediately
              and update alert descriptions.
            </p>
          </div>

          <div className="space-y-3">
            {settings.thresholds.map((threshold) => (
              <ThresholdCard
                key={threshold.id}
                threshold={threshold}
                isEditing={editingThresholdId === threshold.id}
                draftValue={thresholdDraft}
                onEdit={() => {
                  setEditingThresholdId(threshold.id);
                  setThresholdDraft(String(threshold.value));
                }}
                onDraftChange={setThresholdDraft}
                onSave={() => handleSaveThreshold(threshold.id)}
                onCancel={() => setEditingThresholdId(null)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedTab === "live" && (
        <div className="space-y-4">
          {activeAlerts.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-700 dark:bg-emerald-900/20">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                    No active alerts
                  </p>
                  <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                    Enabled alert rules were checked against attendance, exams, finance, and
                    assignment data. Nothing requires action right now.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            activeAlerts.map((alert) => (
              <LiveAlertCard
                key={alert.id}
                alert={alert}
                onDismiss={() => {
                  if (!currentSchool) return;
                  dismissAlert(currentSchool.id, alert.id);
                  setActiveAlerts(getVisibleAlerts(currentSchool.id));
                }}
                onMarkRead={() => {
                  if (!currentSchool) return;
                  markAlertRead(currentSchool.id, alert.id);
                  setActiveAlerts(getVisibleAlerts(currentSchool.id));
                }}
              />
            ))
          )}
        </div>
      )}

      {configuringAlert && (
        <ConfigureAlertModal
          alert={configuringAlert}
          description={getAlertTypeDescription(configuringAlert.id, settings)}
          channels={settings.channels}
          onClose={() => setConfiguringAlertId(null)}
          onSave={handleSaveAlertConfig}
        />
      )}
    </div>
  );
}

function AlertTypeCard({
  alert,
  description,
  onToggle,
  onConfigure,
}: {
  alert: AlertTypeConfig;
  description: string;
  onToggle: (enabled: boolean) => void;
  onConfigure: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="mb-1 font-bold text-slate-900 dark:text-slate-50">{alert.name}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={alert.enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          {sanitizeAlertChannels(alert.channels).map((channel) => (
            <span
              key={channel}
              className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-300"
            >
              {getChannelLabel(channel)}
            </span>
          ))}
        </div>
        <button
          onClick={onConfigure}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Configure
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ThresholdCard({
  threshold,
  isEditing,
  draftValue,
  onEdit,
  onDraftChange,
  onSave,
  onCancel,
}: {
  threshold: AlertThreshold;
  isEditing: boolean;
  draftValue: string;
  onEdit: () => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">
            {threshold.name}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{threshold.description}</p>
        </div>
        {!isEditing && (
          <button
            onClick={onEdit}
            className="rounded p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="flex items-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Value
            </label>
            <input
              type="number"
              min={0}
              value={draftValue}
              onChange={(e) => onDraftChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50"
            />
          </div>
          <span className="pb-2 font-medium text-slate-600 dark:text-slate-400">
            {threshold.unit}
          </span>
          <button
            onClick={onSave}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg bg-slate-200 px-4 py-2 font-medium text-slate-900 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-50 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="border-t border-slate-200 pt-3 text-lg font-bold text-slate-900 dark:border-slate-700 dark:text-slate-50">
          {threshold.value}{" "}
          <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
            {threshold.unit}
          </span>
        </div>
      )}
    </div>
  );
}

function LiveAlertCard({
  alert,
  onDismiss,
  onMarkRead,
}: {
  alert: ActiveAlert;
  onDismiss: () => void;
  onMarkRead: () => void;
}) {
  const severityStyles = {
    info: "border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20",
    warning: "border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20",
    critical: "border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20",
  };

  return (
    <div className={`rounded-lg border p-5 ${severityStyles[alert.severity]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900 dark:text-slate-50">{alert.title}</p>
            {!alert.read && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                New
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">{alert.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sanitizeAlertChannels(alert.channels).map((channel) => (
              <span
                key={channel}
                className="rounded bg-white/70 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {getChannelLabel(channel)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {!alert.read && (
            <button
              onClick={onMarkRead}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Mark read
            </button>
          )}
          <button
            onClick={onDismiss}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigureAlertModal({
  alert,
  description,
  channels,
  onClose,
  onSave,
}: {
  alert: AlertTypeConfig;
  description: string;
  channels: NotificationChannelConfig[];
  onClose: () => void;
  onSave: (channels: AlertChannelId[]) => void;
}) {
  const [selectedChannels, setSelectedChannels] = useState<AlertChannelId[]>(
    sanitizeAlertChannels(alert.channels),
  );
  const allChannels: AlertChannelId[] = ["email", "whatsapp"];

  const toggleChannel = (channelId: AlertChannelId) => {
    setSelectedChannels((current) =>
      current.includes(channelId)
        ? current.filter((id) => id !== channelId)
        : [...current, channelId],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{alert.name}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
            Notification channels
          </p>
          {allChannels.map((channelId) => {
            const channel = channels.find((item) => item.id === channelId);
            return (
              <label
                key={channelId}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-600"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-50">
                    {getChannelLabel(channelId)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {channel?.configured ? channel.details : "Channel not configured yet"}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedChannels.includes(channelId)}
                  onChange={() => toggleChannel(channelId)}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(selectedChannels)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
