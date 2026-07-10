import fs from "node:fs";
import path from "node:path";
import { buildWhatsAppText } from "@/lib/whatsapp-service";
import { WHATSAPP_API_CHUNK_SIZE, sleep } from "@/lib/whatsapp-send-utils";
import type {
  WhatsAppDeliveryMessageStatus,
  WhatsAppMessage,
  WhatsAppQueueJobSummary,
} from "@/lib/whatsapp-types";
import { sendWhatsAppTextMessages } from "@/lib/whatsapp-web-session";

export type WhatsAppQueueJobStatus = "queued" | "processing" | "completed" | "failed";

export type WhatsAppQueueStoredMessage = {
  to: string;
  alternates?: string[];
  label?: string;
  text: string;
  status: WhatsAppDeliveryMessageStatus;
  deliveredTo?: string;
  error?: string;
};

export type WhatsAppQueueJob = {
  id: string;
  schoolId: string;
  schoolName: string;
  title: string;
  status: WhatsAppQueueJobStatus;
  defaultCountryCode: string;
  messages: WhatsAppQueueStoredMessage[];
  cursor: number;
  sent: number;
  skipped: number;
  failed: Array<{ to: string; error: string }>;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

const globalForQueue = globalThis as typeof globalThis & {
  __schoolWhatsAppQueueProcessors?: Map<string, Promise<void>>;
  __schoolWhatsAppQueueBootstrapped?: boolean;
};

function getQueueRoot(): string {
  return path.join(process.cwd(), ".whatsapp-queue");
}

function getSchoolQueueDir(schoolId: string): string {
  return path.join(getQueueRoot(), schoolId);
}

function getJobPath(schoolId: string, jobId: string): string {
  return path.join(getSchoolQueueDir(schoolId), `${jobId}.json`);
}

function ensureQueueDir(schoolId: string): void {
  fs.mkdirSync(getSchoolQueueDir(schoolId), { recursive: true });
}

function readJob(schoolId: string, jobId: string): WhatsAppQueueJob | null {
  const filePath = getJobPath(schoolId, jobId);
  if (!fs.existsSync(filePath)) return null;

  try {
    return normalizeStoredJob(JSON.parse(fs.readFileSync(filePath, "utf8")) as WhatsAppQueueJob);
  } catch {
    return null;
  }
}

function normalizeStoredJob(job: WhatsAppQueueJob): WhatsAppQueueJob {
  return {
    ...job,
    messages: job.messages.map((message) => ({
      ...message,
      status: message.status ?? "pending",
    })),
  };
}

function writeJob(job: WhatsAppQueueJob): void {
  ensureQueueDir(job.schoolId);
  fs.writeFileSync(getJobPath(job.schoolId, job.id), JSON.stringify(job, null, 2), "utf8");
}

function listJobFiles(schoolId: string): string[] {
  const dir = getSchoolQueueDir(schoolId);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(dir, file));
}

function summarizeJob(job: WhatsAppQueueJob): WhatsAppQueueJobSummary {
  return {
    id: job.id,
    title: job.title,
    status: job.status,
    total: job.messages.length,
    processed: job.cursor,
    sent: job.sent,
    skipped: job.skipped,
    failedCount: job.failed.length,
    updatedAt: job.updatedAt,
    error: job.error,
    recipients: job.messages.map((message) => ({
      label: message.label?.trim() || message.to,
      to: message.to,
      status: message.status,
      deliveredTo: message.deliveredTo,
      error: message.error,
    })),
  };
}

function getProcessorMap(): Map<string, Promise<void>> {
  if (!globalForQueue.__schoolWhatsAppQueueProcessors) {
    globalForQueue.__schoolWhatsAppQueueProcessors = new Map();
  }
  return globalForQueue.__schoolWhatsAppQueueProcessors;
}

export function bootstrapWhatsAppQueue(): void {
  if (globalForQueue.__schoolWhatsAppQueueBootstrapped) return;
  globalForQueue.__schoolWhatsAppQueueBootstrapped = true;

  const root = getQueueRoot();
  if (!fs.existsSync(root)) return;

  for (const schoolId of fs.readdirSync(root)) {
    const schoolDir = path.join(root, schoolId);
    if (!fs.statSync(schoolDir).isDirectory()) continue;
    void ensureSchoolQueueProcessing(schoolId);
  }
}

function getNextQueuedJob(schoolId: string): WhatsAppQueueJob | null {
  const jobs = listJobFiles(schoolId)
    .map((filePath) => {
      try {
        return normalizeStoredJob(
          JSON.parse(fs.readFileSync(filePath, "utf8")) as WhatsAppQueueJob,
        );
      } catch {
        return null;
      }
    })
    .filter(Boolean) as WhatsAppQueueJob[];

  return (
    jobs
      .filter((job) => job.status === "queued" || job.status === "processing")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0] ?? null
  );
}

function applyDeliveryResults(
  job: WhatsAppQueueJob,
  chunkStart: number,
  results: Array<{
    to: string;
    label?: string;
    status: WhatsAppDeliveryMessageStatus;
    deliveredTo?: string;
    error?: string;
  }>,
): void {
  results.forEach((result, index) => {
    const message = job.messages[chunkStart + index];
    if (!message) return;

    message.status = result.status;
    message.deliveredTo = result.deliveredTo;
    message.error = result.error;
  });
}

function markChunkFailed(job: WhatsAppQueueJob, chunkStart: number, chunkLength: number, error: string): void {
  for (let index = chunkStart; index < chunkStart + chunkLength; index += 1) {
    const message = job.messages[index];
    if (!message || message.status !== "pending") continue;
    message.status = "failed";
    message.error = error;
    job.failed.push({
      to: message.label?.trim() || message.to,
      error,
    });
  }
}

async function processJob(job: WhatsAppQueueJob): Promise<void> {
  job.status = "processing";
  job.updatedAt = new Date().toISOString();
  writeJob(job);

  while (job.cursor < job.messages.length) {
    const chunkStart = job.cursor;
    const chunk = job.messages.slice(chunkStart, chunkStart + WHATSAPP_API_CHUNK_SIZE);
    const result = await sendWhatsAppTextMessages({
      schoolId: job.schoolId,
      defaultCountryCode: job.defaultCountryCode,
      messages: chunk.map((message) => ({
        to: message.to,
        text: message.text,
        alternates: message.alternates,
        label: message.label,
      })),
    });

    if (result.error && result.sent === 0 && result.results.length === 0) {
      markChunkFailed(job, chunkStart, chunk.length, result.error);
      job.status = "failed";
      job.error = result.error;
      job.cursor = job.messages.length;
      job.updatedAt = new Date().toISOString();
      writeJob(job);
      return;
    }

    applyDeliveryResults(job, chunkStart, result.results);
    job.sent += result.sent;
    job.skipped += result.skipped;
    job.failed.push(...result.failed);
    job.cursor = chunkStart + chunk.length;
    job.updatedAt = new Date().toISOString();
    writeJob(job);

    if (job.cursor < job.messages.length) {
      await sleep(2_000);
    }
  }

  job.status = job.sent === 0 && job.failed.length > 0 ? "failed" : "completed";
  job.error =
    job.status === "failed"
      ? job.failed[0]?.error ?? "All WhatsApp messages in this queue job failed."
      : undefined;
  job.updatedAt = new Date().toISOString();
  writeJob(job);
}

async function processSchoolQueue(schoolId: string): Promise<void> {
  while (true) {
    const job = getNextQueuedJob(schoolId);
    if (!job) return;

    try {
      if (job.cursor >= job.messages.length) {
        job.status = "completed";
        job.updatedAt = new Date().toISOString();
        writeJob(job);
        continue;
      }

      await processJob(job);
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : "WhatsApp queue processing failed.";
      job.updatedAt = new Date().toISOString();
      writeJob(job);
    }
  }
}

export function ensureSchoolQueueProcessing(schoolId: string): void {
  bootstrapWhatsAppQueue();

  const processors = getProcessorMap();
  if (processors.has(schoolId)) return;

  const task = processSchoolQueue(schoolId).finally(() => {
    processors.delete(schoolId);
  });
  processors.set(schoolId, task);
}

export function enqueueWhatsAppMessages(input: {
  schoolId: string;
  schoolName: string;
  title: string;
  defaultCountryCode?: string;
  messages: WhatsAppMessage[];
}): WhatsAppQueueJob {
  const storedMessages: WhatsAppQueueStoredMessage[] = input.messages.map((message) => ({
    to: message.to,
    alternates: message.alternates?.filter(Boolean),
    label: message.label?.trim() || undefined,
    text: buildWhatsAppText(message),
    status: "pending",
  }));

  const job: WhatsAppQueueJob = {
    id: `waq_${Date.now()}`,
    schoolId: input.schoolId,
    schoolName: input.schoolName,
    title: input.title,
    status: "queued",
    defaultCountryCode: input.defaultCountryCode?.replace(/\D/g, "") || "233",
    messages: storedMessages,
    cursor: 0,
    sent: 0,
    skipped: 0,
    failed: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  writeJob(job);
  ensureSchoolQueueProcessing(input.schoolId);
  return job;
}

export function getWhatsAppQueueJobs(schoolId: string): WhatsAppQueueJobSummary[] {
  bootstrapWhatsAppQueue();

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  return listJobFiles(schoolId)
    .map((filePath) => {
      try {
        return normalizeStoredJob(
          JSON.parse(fs.readFileSync(filePath, "utf8")) as WhatsAppQueueJob,
        );
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((job) => {
      const updatedAt = Date.parse(job!.updatedAt);
      return (
        job!.status === "queued" ||
        job!.status === "processing" ||
        (Number.isFinite(updatedAt) && updatedAt >= cutoff)
      );
    })
    .map((job) => summarizeJob(job!))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getWhatsAppQueueJob(
  schoolId: string,
  jobId: string,
): WhatsAppQueueJobSummary | null {
  const job = readJob(schoolId, jobId);
  return job ? summarizeJob(job) : null;
}
