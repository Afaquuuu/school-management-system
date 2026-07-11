import { getSchoolDatabaseName } from "@/lib/server/schools";
import {
  isCloudinaryConfigured,
  uploadStudentDocumentFile,
} from "@/lib/server/cloudinary-client";
import { getTenantPrisma } from "@/lib/tenant-prisma";

export type StudentDocumentMigrationResult = {
  uploaded: number;
  cleared: number;
  skipped: number;
  failed: number;
};

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;

  try {
    return {
      mimeType: match[1],
      buffer: Buffer.from(match[2], "base64"),
    };
  } catch {
    return null;
  }
}

export async function migrateLegacyStudentDocumentsIfNeeded(
  schoolId: string,
): Promise<StudentDocumentMigrationResult> {
  const result: StudentDocumentMigrationResult = {
    uploaded: 0,
    cleared: 0,
    skipped: 0,
    failed: 0,
  };

  const databaseName = await getSchoolDatabaseName(schoolId);
  if (!databaseName) return result;

  const tenant = getTenantPrisma(databaseName);
  const rows = await tenant.studentDocumentRecord.findMany({
    where: { dataUrl: { not: null } },
    orderBy: { uploadedAt: "asc" },
  });

  if (rows.length === 0) return result;

  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET before migrating documents.",
    );
  }

  for (const row of rows) {
    if (!row.dataUrl) continue;

    if (row.fileUrl) {
      await tenant.studentDocumentRecord.update({
        where: { id: row.id },
        data: { dataUrl: null },
      });
      result.cleared += 1;
      continue;
    }

    const parsed = parseDataUrl(row.dataUrl);
    if (!parsed || parsed.buffer.length === 0) {
      console.warn(`Skipping document ${row.legacyId}: invalid or empty dataUrl.`);
      result.failed += 1;
      continue;
    }

    try {
      const upload = await uploadStudentDocumentFile(parsed.buffer, {
        schoolId,
        studentId: row.studentLegacyId,
        documentId: row.legacyId,
        fileName: row.fileName,
        mimeType: row.mimeType || parsed.mimeType,
      });

      await tenant.studentDocumentRecord.update({
        where: { id: row.id },
        data: {
          fileUrl: upload.secureUrl,
          cloudinaryPublicId: upload.publicId,
          cloudinaryResourceType: upload.resourceType,
          fileSize: upload.bytes || row.fileSize,
          dataUrl: null,
        },
      });
      result.uploaded += 1;
    } catch (error) {
      result.failed += 1;
      console.error(
        `Failed to migrate document ${row.legacyId} for school ${schoolId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return result;
}
