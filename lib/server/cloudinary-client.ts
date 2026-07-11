import { v2 as cloudinary } from "cloudinary";

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  resourceType: string;
  bytes: number;
};

function ensureCloudinaryConfigured(): void {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

export async function uploadStudentDocumentFile(
  fileBuffer: Buffer,
  options: {
    schoolId: string;
    studentId: string;
    documentId: string;
    fileName: string;
    mimeType: string;
  },
): Promise<CloudinaryUploadResult> {
  ensureCloudinaryConfigured();

  const isPdf = options.mimeType === "application/pdf" || options.fileName.toLowerCase().endsWith(".pdf");
  const resourceType = isPdf ? "raw" : "image";
  const folder = `edumanage/${options.schoolId}/students/${options.studentId}`;

  const uploadResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: options.documentId,
        resource_type: resourceType,
        overwrite: true,
        use_filename: false,
        unique_filename: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          bytes: result.bytes,
        });
      },
    );

    stream.end(fileBuffer);
  });

  return uploadResult;
}

export async function deleteStudentDocumentFile(
  publicId: string,
  resourceType: string,
): Promise<void> {
  if (!publicId) return;
  ensureCloudinaryConfigured();

  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType === "image" || resourceType === "raw" ? resourceType : "image",
    invalidate: true,
  });
}
