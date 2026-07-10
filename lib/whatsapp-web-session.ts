import path from "node:path";
import fs from "node:fs";
import makeWASocket, {
  DisconnectReason,
  type WASocket,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import { deliverWhatsAppMessages, type WhatsAppMessageDeliveryResult } from "@/lib/whatsapp-send";
export { normalizeWhatsAppPhone } from "@/lib/whatsapp-phone";

export type WhatsAppConnectionStatus =
  | "disconnected"
  | "connecting"
  | "qr"
  | "connected";

export type WhatsAppSessionSnapshot = {
  status: WhatsAppConnectionStatus;
  qrDataUrl?: string;
  linkedPhone?: string;
  error?: string;
};

type ManagedSession = {
  socket?: WASocket;
  snapshot: WhatsAppSessionSnapshot;
  starting?: Promise<void>;
};

const globalForWhatsApp = globalThis as typeof globalThis & {
  __schoolWhatsAppSessions?: Map<string, ManagedSession>;
};

function getSessionMap(): Map<string, ManagedSession> {
  if (!globalForWhatsApp.__schoolWhatsAppSessions) {
    globalForWhatsApp.__schoolWhatsAppSessions = new Map();
  }
  return globalForWhatsApp.__schoolWhatsAppSessions;
}

function getAuthDir(schoolId: string): string {
  return path.join(process.cwd(), ".whatsapp-sessions", schoolId);
}

function ensureSession(schoolId: string): ManagedSession {
  const sessions = getSessionMap();
  const existing = sessions.get(schoolId);
  if (existing) return existing;

  const created: ManagedSession = {
    snapshot: { status: "disconnected" },
  };
  sessions.set(schoolId, created);
  return created;
}

function readLinkedPhoneFromDisk(schoolId: string): string | undefined {
  const credsPath = path.join(getAuthDir(schoolId), "creds.json");
  if (!fs.existsSync(credsPath)) return undefined;

  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, "utf8")) as {
      me?: { id?: string };
    };
    const rawId = creds.me?.id ?? "";
    const phone = rawId.split(":")[0]?.split("@")[0];
    return phone || undefined;
  } catch {
    return undefined;
  }
}

function clearAuthDir(schoolId: string): void {
  const authDir = getAuthDir(schoolId);
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
  }
}

function teardownSocket(session: ManagedSession): void {
  if (!session.socket) return;
  try {
    session.socket.end(undefined);
  } catch {
    // Ignore socket shutdown errors.
  }
  session.socket = undefined;
}

async function startSocket(schoolId: string, freshAuth: boolean): Promise<void> {
  const session = ensureSession(schoolId);
  teardownSocket(session);

  if (freshAuth) {
    clearAuthDir(schoolId);
  }

  session.snapshot = {
    status: "connecting",
    linkedPhone: readLinkedPhoneFromDisk(schoolId),
  };

  const authDir = getAuthDir(schoolId);
  fs.mkdirSync(authDir, { recursive: true });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const socket = makeWASocket({
      auth: state,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 30_000,
      defaultQueryTimeoutMs: 30_000,
    });

    session.socket = socket;
    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        session.snapshot = {
          status: "qr",
          qrDataUrl: await QRCode.toDataURL(qr),
          linkedPhone: readLinkedPhoneFromDisk(schoolId),
        };
        return;
      }

      if (connection === "open") {
        session.snapshot = {
          status: "connected",
          linkedPhone: readLinkedPhoneFromDisk(schoolId),
        };
        return;
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        const restartRequired = statusCode === DisconnectReason.restartRequired;
        const errorMessage =
          lastDisconnect?.error instanceof Error
            ? lastDisconnect.error.message
            : "WhatsApp connection closed.";

        teardownSocket(session);

        if (restartRequired) {
          session.snapshot = { status: "connecting", linkedPhone: readLinkedPhoneFromDisk(schoolId) };
          void startSocket(schoolId, false);
          return;
        }

        if (loggedOut) {
          clearAuthDir(schoolId);
        }

        session.snapshot = {
          status: "disconnected",
          linkedPhone: loggedOut ? undefined : readLinkedPhoneFromDisk(schoolId),
          error: loggedOut
            ? "WhatsApp session logged out. Click Connect WhatsApp and scan a new QR code."
            : errorMessage,
        };
      }
    });
  } catch (error) {
    teardownSocket(session);
    session.snapshot = {
      status: "disconnected",
      error:
        error instanceof Error
          ? error.message
          : "Failed to start WhatsApp connection.",
    };
  }
}

export async function connectWhatsAppSession(schoolId: string): Promise<WhatsAppSessionSnapshot> {
  return waitForSessionSnapshot(schoolId, true);
}

async function ensureWhatsAppConnected(schoolId: string): Promise<WhatsAppSessionSnapshot> {
  const session = ensureSession(schoolId);
  if (session.snapshot.status === "connected" && session.socket) {
    return session.snapshot;
  }
  return waitForSessionSnapshot(schoolId, false);
}

async function waitForSessionSnapshot(
  schoolId: string,
  freshAuth: boolean,
): Promise<WhatsAppSessionSnapshot> {
  const session = ensureSession(schoolId);

  if (session.snapshot.status === "connected" && session.socket) {
    return session.snapshot;
  }

  session.starting = startSocket(schoolId, freshAuth).finally(() => {
    session.starting = undefined;
  });

  await session.starting;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (session.snapshot.status === "qr" || session.snapshot.status === "connected") {
      return session.snapshot;
    }
    if (session.snapshot.status === "disconnected" && session.snapshot.error) {
      return session.snapshot;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    ...session.snapshot,
    error: session.snapshot.error ?? "Timed out waiting for WhatsApp QR code. Try again.",
  };
}

export async function getWhatsAppSessionSnapshot(
  schoolId: string,
): Promise<WhatsAppSessionSnapshot> {
  const session = ensureSession(schoolId);
  const linkedPhone = readLinkedPhoneFromDisk(schoolId);

  if (session.snapshot.status === "connected" && session.socket) {
    return { ...session.snapshot, linkedPhone: linkedPhone ?? session.snapshot.linkedPhone };
  }

  if (session.snapshot.status === "qr" && session.snapshot.qrDataUrl) {
    return session.snapshot;
  }

  if (linkedPhone && session.snapshot.status === "disconnected") {
    return {
      status: "disconnected",
      linkedPhone,
      error: "WhatsApp is linked but not connected. Click Connect WhatsApp.",
    };
  }

  return session.snapshot;
}

export async function disconnectWhatsAppSession(schoolId: string): Promise<void> {
  const session = ensureSession(schoolId);

  if (session.socket) {
    await session.socket.logout().catch(() => undefined);
  }

  teardownSocket(session);
  clearAuthDir(schoolId);
  session.snapshot = { status: "disconnected" };
}

export async function sendWhatsAppTextMessages(input: {
  schoolId: string;
  defaultCountryCode?: string;
  messages: Array<{
    to: string;
    text: string;
    alternates?: string[];
    label?: string;
  }>;
}): Promise<{
  sent: number;
  skipped: number;
  failed: Array<{ to: string; error: string }>;
  results: WhatsAppMessageDeliveryResult[];
  error?: string;
}> {
  const session = ensureSession(input.schoolId);

  if (!session.socket || session.snapshot.status !== "connected") {
    await ensureWhatsAppConnected(input.schoolId);
  }

  const active = ensureSession(input.schoolId);
  if (!active.socket || active.snapshot.status !== "connected") {
    return {
      sent: 0,
      skipped: 0,
      failed: [],
      results: [],
      error:
        active.snapshot.status === "qr"
          ? "Scan the WhatsApp QR code in Communication Settings first."
          : active.snapshot.error ?? "WhatsApp is not connected. Link your school WhatsApp account first.",
    };
  }

  const countryCode = input.defaultCountryCode?.replace(/\D/g, "") || "233";
  const delivery = await deliverWhatsAppMessages({
    socket: active.socket,
    messages: input.messages,
    countryCode,
  });

  return {
    sent: delivery.sent,
    skipped: delivery.skipped,
    failed: delivery.failed,
    results: delivery.results,
    error:
      delivery.sent === 0 && delivery.failed.length > 0
        ? delivery.failed[0]?.error ?? "All WhatsApp messages failed to send."
        : undefined,
  };
}
