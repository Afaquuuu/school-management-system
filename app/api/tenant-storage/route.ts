import { NextResponse } from "next/server";

import {
  getAllTenantStorage,
  getTenantStorageItem,
  removeAllTenantStorage,
  removeTenantStorageItem,
  repairOrphanTenantStorageForSchool,
  setTenantStorageItem,
} from "@/lib/server/tenant-storage";
import { isServerDatabaseMode } from "@/lib/storage-mode";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isServerDatabaseMode()) {
    return NextResponse.json({ error: "Database mode is disabled." }, { status: 503 });
  }

  const url = new URL(request.url);
  const schoolId = url.searchParams.get("schoolId")?.trim();
  const key = url.searchParams.get("key")?.trim();

  if (!schoolId) {
    return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
  }

  if (key) {
    await repairOrphanTenantStorageForSchool(schoolId);
    const value = await getTenantStorageItem(schoolId, key);
    return NextResponse.json({ key, value });
  }

  await repairOrphanTenantStorageForSchool(schoolId);
  const entries = await getAllTenantStorage(schoolId);
  return NextResponse.json({ entries });
}

export async function PUT(request: Request) {
  if (!isServerDatabaseMode()) {
    return NextResponse.json({ error: "Database mode is disabled." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      schoolId?: string;
      key?: string;
      value?: string;
    };

    const schoolId = body.schoolId?.trim();
    const key = body.key?.trim();

    if (!schoolId || !key || typeof body.value !== "string") {
      return NextResponse.json({ error: "schoolId, key, and value are required." }, { status: 400 });
    }

    await setTenantStorageItem(schoolId, key, body.value);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save storage item." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isServerDatabaseMode()) {
    return NextResponse.json({ error: "Database mode is disabled." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      schoolId?: string;
      key?: string;
      all?: boolean;
    };

    const schoolId = body.schoolId?.trim();
    if (!schoolId) {
      return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
    }

    if (body.all) {
      await removeAllTenantStorage(schoolId);
      return NextResponse.json({ ok: true });
    }

    const key = body.key?.trim();
    if (!key) {
      return NextResponse.json({ error: "key is required unless all=true." }, { status: 400 });
    }

    await removeTenantStorageItem(schoolId, key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete storage item." },
      { status: 500 },
    );
  }
}
