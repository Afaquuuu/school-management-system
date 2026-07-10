"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Clock3, MessageCircle, X, XCircle } from "lucide-react";
import { useSchool } from "@/lib/school-context";
import {
  fetchWhatsAppQueueJobs,
  formatWhatsAppQueueStatus,
} from "@/lib/whatsapp-client";
import type { WhatsAppQueueJobSummary, WhatsAppQueueRecipientStatus } from "@/lib/whatsapp-types";

function RecipientStatusIcon({ status }: { status: WhatsAppQueueRecipientStatus["status"] }) {
  if (status === "sent") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />;
  }
  if (status === "failed") {
    return <XCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />;
  }
  if (status === "skipped") {
    return <XCircle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />;
  }
  return <Clock3 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />;
}

function recipientStatusText(recipient: WhatsAppQueueRecipientStatus): string {
  if (recipient.status === "sent") {
    return recipient.deliveredTo && recipient.deliveredTo !== recipient.to
      ? `Sent to ${recipient.deliveredTo}`
      : "Sent";
  }
  if (recipient.status === "skipped") {
    return recipient.error ?? "Not on WhatsApp";
  }
  if (recipient.status === "failed") {
    return recipient.error ?? "Failed";
  }
  return "Waiting";
}

export function WhatsAppQueueStatus() {
  const { currentSchool } = useSchool();
  const [jobs, setJobs] = useState<WhatsAppQueueJobSummary[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [expandedJobIds, setExpandedJobIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentSchool) return;

    let cancelled = false;

    const refresh = async () => {
      const nextJobs = await fetchWhatsAppQueueJobs(currentSchool.id);
      if (!cancelled) {
        setJobs(nextJobs);
        setExpandedJobIds((current) => {
          const activeIds = nextJobs
            .filter((job) => job.status === "queued" || job.status === "processing")
            .map((job) => job.id);
          return [...new Set([...current, ...activeIds])];
        });
      }
    };

    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [currentSchool]);

  if (!currentSchool) return null;

  const visibleJobs = jobs.filter((job) => {
    if (dismissedIds.includes(job.id)) return false;
    if (job.status === "queued" || job.status === "processing") return true;
    return job.status === "completed" || job.status === "failed";
  });

  if (visibleJobs.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {visibleJobs.slice(0, 3).map((job) => {
        const isActive = job.status === "queued" || job.status === "processing";
        const progress =
          job.total > 0 ? Math.min(100, Math.round((job.processed / job.total) * 100)) : 0;
        const isExpanded = expandedJobIds.includes(job.id);
        const sentCount = job.recipients.filter((recipient) => recipient.status === "sent").length;
        const failedCount = job.recipients.filter(
          (recipient) => recipient.status === "failed" || recipient.status === "skipped",
        ).length;
        const pendingCount = job.recipients.filter((recipient) => recipient.status === "pending").length;

        return (
          <div
            key={job.id}
            className={`rounded-xl border px-4 py-3 text-sm ${
              job.status === "failed"
                ? "border-red-200 bg-red-50 text-red-900"
                : isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <div className="flex items-start gap-3">
              <MessageCircle className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? "animate-pulse" : ""}`} />
              <div className="min-w-0 flex-1">
                <p>{formatWhatsAppQueueStatus(job)}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <span>{sentCount} sent</span>
                  <span>{pendingCount} pending</span>
                  <span>{failedCount} skipped/failed</span>
                </div>
                {isActive ? (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                ) : null}
                {job.recipients.length > 0 ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedJobIds((current) =>
                          current.includes(job.id)
                            ? current.filter((id) => id !== job.id)
                            : [...current, job.id],
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
                    >
                      {isExpanded ? (
                        <>
                          Hide recipient details
                          <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          Show recipient details ({job.recipients.length})
                          <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                    {isExpanded ? (
                      <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-current/10 bg-white/70 p-2 text-xs">
                        {job.recipients.map((recipient, index) => (
                          <li
                            key={`${job.id}-${recipient.label}-${recipient.to}-${index}`}
                            className="flex items-start gap-2 rounded-md px-2 py-1.5 text-slate-700"
                          >
                            <RecipientStatusIcon status={recipient.status} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-800">{recipient.label}</p>
                              <p className="truncate text-slate-500">{recipient.to}</p>
                              <p
                                className={
                                  recipient.status === "sent"
                                    ? "text-emerald-700"
                                    : recipient.status === "pending"
                                      ? "text-slate-500"
                                      : recipient.status === "skipped"
                                        ? "text-amber-700"
                                        : "text-red-700"
                                }
                              >
                                {recipientStatusText(recipient)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {!isActive ? (
                <button
                  type="button"
                  onClick={() => setDismissedIds((current) => [...current, job.id])}
                  className="shrink-0 opacity-70 hover:opacity-100"
                  aria-label="Dismiss WhatsApp queue status"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
