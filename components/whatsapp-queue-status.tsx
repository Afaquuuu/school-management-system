"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useSchool } from "@/lib/school-context";
import {
  fetchWhatsAppQueueJobs,
  formatWhatsAppQueueStatus,
} from "@/lib/whatsapp-client";
import type { WhatsAppQueueJobSummary } from "@/lib/whatsapp-types";

export function WhatsAppQueueStatus() {
  const { currentSchool } = useSchool();
  const [jobs, setJobs] = useState<WhatsAppQueueJobSummary[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentSchool) return;

    let cancelled = false;

    const refresh = async () => {
      const nextJobs = await fetchWhatsAppQueueJobs(currentSchool.id);
      if (!cancelled) setJobs(nextJobs);
    };

    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 4000);

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
                {isActive ? (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
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
