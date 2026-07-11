import { NextResponse } from "next/server";

import {
  deleteStudentDocumentFile,
  isCloudinaryConfigured,
  uploadStudentDocumentFile,
} from "@/lib/server/cloudinary-client";
import {
  appendStudentDocument,
  listStudentDocuments,
  removeStudentDocument,
} from "@/lib/server/student-documents-service";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  stripDocumentBlobForClient,
  type DocumentCategory,
} from "@/lib/student-documents";

export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "pdf"]);

function validateUpload(file: File): string | null {
  const mimeType = file.type || "application/octet-stream";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType) && !ALLOWED_EXTENSIONS.has(extension)) {
    return "Only PNG, JPG, JPEG, and PDF files are allowed.";
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return "File size must be 2 MB or less.";
  }

  return null;
}

export async function POST(request: Request) {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary is not configured on the server." },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const schoolId = formData.get("schoolId")?.toString().trim();
    const studentId = formData.get("studentId")?.toString().trim();
    const category = formData.get("category")?.toString().trim() as DocumentCategory;
    const customLabel = formData.get("customLabel")?.toString().trim() || undefined;
    const file = formData.get("file");

    if (!schoolId || !studentId || !category || !(file instanceof File)) {
      return NextResponse.json(
        { error: "schoolId, studentId, category, and file are required." },
        { status: 400 },
      );
    }

    const validationError = validateUpload(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    const upload = await uploadStudentDocumentFile(buffer, {
      schoolId,
      studentId,
      documentId,
      fileName: file.name,
      mimeType,
    });

    const document = await appendStudentDocument(schoolId, {
      id: documentId,
      studentId,
      category,
      customLabel,
      fileName: file.name,
      mimeType,
      fileSize: upload.bytes || file.size,
      fileUrl: upload.secureUrl,
      cloudinaryPublicId: upload.publicId,
      cloudinaryResourceType: upload.resourceType,
      uploadedAt: new Date().toISOString(),
    });

    return NextResponse.json({ document: stripDocumentBlobForClient(document) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload document." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as {
      schoolId?: string;
      documentId?: string;
    };

    const schoolId = body.schoolId?.trim();
    const documentId = body.documentId?.trim();

    if (!schoolId || !documentId) {
      return NextResponse.json(
        { error: "schoolId and documentId are required." },
        { status: 400 },
      );
    }

    const removed = await removeStudentDocument(schoolId, documentId);
    if (!removed) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    if (removed.cloudinaryPublicId && isCloudinaryConfigured()) {
      await deleteStudentDocumentFile(
        removed.cloudinaryPublicId,
        removed.cloudinaryResourceType ?? "image",
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete document." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const schoolId = url.searchParams.get("schoolId")?.trim();
  const studentId = url.searchParams.get("studentId")?.trim();

  if (!schoolId) {
    return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
  }

  const documents = await listStudentDocuments(schoolId);
  const filtered = studentId
    ? documents.filter((document) => document.studentId === studentId)
    : documents;

  return NextResponse.json({
    documents: filtered.map(stripDocumentBlobForClient),
  });
}
