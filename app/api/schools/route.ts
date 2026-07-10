import { NextResponse } from "next/server";

import {
  createSchool,
  deleteSchool,
  listSchools,
  updateSchool,
} from "@/lib/server/schools";
import { isServerDatabaseMode } from "@/lib/storage-mode";

export const runtime = "nodejs";

export async function GET() {
  if (!isServerDatabaseMode()) {
    return NextResponse.json(
      { error: "Database mode is disabled. Set USE_DATABASE=true and DATABASE_URL." },
      { status: 503 },
    );
  }

  const schools = await listSchools();
  return NextResponse.json({ schools });
}

export async function POST(request: Request) {
  if (!isServerDatabaseMode()) {
    return NextResponse.json({ error: "Database mode is disabled." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
      logo?: string;
    };

    if (!body.name?.trim() || !body.email?.trim()) {
      return NextResponse.json({ error: "School name and email are required." }, { status: 400 });
    }

    const school = await createSchool({
      id: body.id?.trim(),
      name: body.name.trim(),
      address: body.address?.trim() ?? "",
      phone: body.phone?.trim() ?? "",
      email: body.email.trim(),
      logo: body.logo,
    });

    return NextResponse.json({ school }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create school." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!isServerDatabaseMode()) {
    return NextResponse.json({ error: "Database mode is disabled." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
      logo?: string;
    };

    if (!body.id?.trim()) {
      return NextResponse.json({ error: "School id is required." }, { status: 400 });
    }

    const school = await updateSchool(body.id.trim(), {
      name: body.name,
      address: body.address,
      phone: body.phone,
      email: body.email,
      logo: body.logo,
    });

    if (!school) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    return NextResponse.json({ school });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update school." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isServerDatabaseMode()) {
    return NextResponse.json({ error: "Database mode is disabled." }, { status: 503 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json({ error: "School id is required." }, { status: 400 });
  }

  const deleted = await deleteSchool(id);
  if (!deleted) {
    return NextResponse.json({ error: "School not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
