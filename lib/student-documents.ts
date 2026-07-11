import { formatStudentClassLabel } from "@/lib/class-labels";
import { getScopedItem, setScopedItem } from "@/lib/school-context";
import { setCachedScopedItemLocalOnly } from "@/lib/tenant-storage-cache";
import {
  formatStudentLinkLabel,
  loadSchoolStudentRecords,
  type SchoolStudentRecord,
} from "@/lib/parent-student-links";
import { loadSystemUsers } from "@/lib/system-users";

export type DocumentCategory =
  | "birth_certificate"
  | "migration_certificate"
  | "domicile_certificate"
  | "cnic_bform"
  | "previous_report_card"
  | "passport_photo"
  | "guardian_cnic"
  | "character_certificate"
  | "other";

export type StudentDocument = {
  id: string;
  studentId: string;
  category: DocumentCategory;
  customLabel?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl?: string;
  cloudinaryPublicId?: string;
  cloudinaryResourceType?: string;
  /** Legacy inline base64 — kept for older uploads before Cloudinary */
  dataUrl?: string;
  uploadedAt: string;
};

export type StudentRecordWithEmail = SchoolStudentRecord & {
  email?: string;
};

export const DOCUMENT_CATEGORIES: {
  value: DocumentCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "birth_certificate",
    label: "Birth Certificate / B-Form",
    description: "NADRA birth certificate or B-Form for the student",
  },
  {
    value: "migration_certificate",
    label: "Migration / School Leaving Certificate",
    description: "Certificate issued when leaving a previous school",
  },
  {
    value: "domicile_certificate",
    label: "Domicile Certificate",
    description: "Provincial domicile certificate for admission",
  },
  {
    value: "cnic_bform",
    label: "CNIC / B-Form (Student)",
    description: "Student CNIC (if 18+) or B-Form copy",
  },
  {
    value: "previous_report_card",
    label: "Previous Report Card / Mark Sheet",
    description: "Result card or mark sheet from the last class attended",
  },
  {
    value: "passport_photo",
    label: "Passport Size Photographs",
    description: "Recent passport-size photos for school records",
  },
  {
    value: "guardian_cnic",
    label: "Guardian CNIC Copy",
    description: "Copy of father, mother, or guardian CNIC",
  },
  {
    value: "character_certificate",
    label: "Character Certificate",
    description: "Character certificate from the previous school",
  },
  {
    value: "other",
    label: "Other Document",
    description: "Any other document required by the institution",
  },
];

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
]);

export const ALLOWED_DOCUMENT_EXTENSIONS = ".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf";

export const MAX_DOCUMENT_SIZE_BYTES = 2 * 1024 * 1024;

export const STUDENT_DOCUMENTS_STORAGE_KEY = "student_documents";

const STORAGE_KEY = STUDENT_DOCUMENTS_STORAGE_KEY;

/** Drop inline base64 when a Cloudinary URL exists — keeps DB/cache payloads small. */
export function stripDocumentBlobForStorage(document: StudentDocument): StudentDocument {
  if (!document.fileUrl || !document.dataUrl) return document;
  const { dataUrl: _removed, ...rest } = document;
  return rest;
}

export function stripDocumentBlobForClient(document: StudentDocument): StudentDocument {
  return stripDocumentBlobForStorage(document);
}

export function stripDocumentBlobsForClient(documents: StudentDocument[]): StudentDocument[] {
  return documents.map(stripDocumentBlobForClient);
}

export function serializeStudentDocumentsForCache(documents: StudentDocument[]): string {
  return JSON.stringify(stripDocumentBlobsForClient(documents));
}

export function getDocumentCategoryLabel(document: Pick<StudentDocument, "category" | "customLabel">): string {
  if (document.category === "other" && document.customLabel?.trim()) {
    return document.customLabel.trim();
  }

  const legacyLabels: Record<string, string> = {
    id_proof: "CNIC / B-Form (Student)",
    medical_certificate: "Other Document",
    caste_certificate: "Other Document",
  };

  return (
    DOCUMENT_CATEGORIES.find((item) => item.value === document.category)?.label ??
    legacyLabels[document.category] ??
    document.category
  );
}

export function loadStudentDocuments(schoolId: string): StudentDocument[] {
  const stored = getScopedItem(schoolId, STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as StudentDocument[];
  } catch {
    return [];
  }
}

export function saveStudentDocuments(schoolId: string, documents: StudentDocument[]): void {
  setScopedItem(schoolId, STORAGE_KEY, serializeStudentDocumentsForCache(documents));
}

export function getDocumentsForStudent(schoolId: string, studentId: string): StudentDocument[] {
  return loadStudentDocuments(schoolId)
    .filter((document) => document.studentId === studentId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function loadStudentsWithEmail(schoolId: string): StudentRecordWithEmail[] {
  const stored = getScopedItem(schoolId, "school_students");
  if (!stored) return loadSchoolStudentRecords(schoolId);
  try {
    return JSON.parse(stored) as StudentRecordWithEmail[];
  } catch {
    return loadSchoolStudentRecords(schoolId);
  }
}

function buildStudentProfileFromSession(session: {
  id?: string;
  name?: string;
  email: string;
  classDepartment?: string;
}): StudentRecordWithEmail {
  const sessionName = session.name?.trim() || "Student";
  const nameParts = sessionName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || sessionName;
  const lastName = nameParts.slice(1).join(" ");

  let className = "";
  let section = "";
  if (session.classDepartment) {
    const classMatch = session.classDepartment.match(/^(Grade \d+)\s*([A-Z])$/i);
    if (classMatch) {
      className = classMatch[1];
      section = classMatch[2].toUpperCase();
    }
  }

  const stableId = session.id || session.email;

  return {
    id: stableId,
    studentId: stableId.replace(/^user_student_/, ""),
    firstName,
    lastName,
    email: session.email,
    class: className,
    section,
  };
}

function buildStudentProfileFromSystemUser(user: {
  id: string;
  name: string;
  email: string;
  classDepartment?: string;
}): StudentRecordWithEmail {
  return buildStudentProfileFromSession({
    id: user.id,
    name: user.name,
    email: user.email,
    classDepartment: user.classDepartment,
  });
}

/** Students from admissions records plus login-only student accounts. */
export function loadAllDocumentStudents(schoolId: string): StudentRecordWithEmail[] {
  const enrolledStudents = loadStudentsWithEmail(schoolId);
  const enrolledIds = new Set(enrolledStudents.map((student) => student.id));
  const enrolledEmails = new Set(
    enrolledStudents
      .map((student) => student.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );

  const loginOnlyStudents = loadSystemUsers(schoolId)
    .filter((user) => user.role === "Student")
    .flatMap((user) => {
      if (user.id.startsWith("user_student_")) {
        const linkedId = user.id.replace("user_student_", "");
        if (enrolledIds.has(linkedId)) return [];
      }

      const email = user.email.trim().toLowerCase();
      if (enrolledEmails.has(email)) return [];

      return [buildStudentProfileFromSystemUser(user)];
    });

  return [...enrolledStudents, ...loginOnlyStudents].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
  );
}

export function findStudentForSession(
  schoolId: string,
  session: {
    email: string;
    id?: string;
    name?: string;
    classDepartment?: string;
  } | null,
): StudentRecordWithEmail | null {
  if (!session) return null;

  const students = loadStudentsWithEmail(schoolId);
  const sessionEmail = session.email.trim().toLowerCase();
  const sessionName = session.name?.trim().toLowerCase() ?? "";
  const linkedStudentId = session.id?.startsWith("user_student_")
    ? session.id.replace("user_student_", "")
    : null;

  const matched = students.find(
    (student) =>
      student.email?.trim().toLowerCase() === sessionEmail ||
      student.id === session.id ||
      (linkedStudentId && student.id === linkedStudentId) ||
      (sessionName &&
        `${student.firstName} ${student.lastName}`.trim().toLowerCase() === sessionName) ||
      (sessionName && student.firstName.trim().toLowerCase() === sessionName),
  );

  if (matched) return matched;

  const systemUser = loadSystemUsers(schoolId).find(
    (user) => user.role === "Student" && user.email.trim().toLowerCase() === sessionEmail,
  );

  if (systemUser) {
    if (systemUser.id.startsWith("user_student_")) {
      const studentId = systemUser.id.replace("user_student_", "");
      const syncedStudent = students.find((student) => student.id === studentId);
      if (syncedStudent) return syncedStudent;
    }

    return buildStudentProfileFromSystemUser(systemUser);
  }

  return buildStudentProfileFromSession(session);
}

export function formatStudentOptionLabel(student: StudentRecordWithEmail): string {
  return formatStudentLinkLabel(student);
}

export function validateDocumentFile(file: File): string | null {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedExtensions = new Set(["png", "jpg", "jpeg", "pdf"]);

  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType) && !allowedExtensions.has(extension)) {
    return "Only PNG, JPG, JPEG, and PDF files are allowed.";
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return "File size must be 2 MB or less.";
  }

  return null;
}

export function pickDocumentFile(): Promise<File | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ALLOWED_DOCUMENT_EXTENSIONS;
    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
    };
    input.click();
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read file."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export function createStudentDocument(
  schoolId: string,
  studentId: string,
  input: {
    category: DocumentCategory;
    customLabel?: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileUrl?: string;
    cloudinaryPublicId?: string;
    cloudinaryResourceType?: string;
    dataUrl?: string;
  },
): StudentDocument {
  const documents = loadStudentDocuments(schoolId);
  const document: StudentDocument = {
    id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    studentId,
    category: input.category,
    customLabel: input.customLabel?.trim() || undefined,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    fileUrl: input.fileUrl,
    cloudinaryPublicId: input.cloudinaryPublicId,
    cloudinaryResourceType: input.cloudinaryResourceType,
    dataUrl: input.dataUrl,
    uploadedAt: new Date().toISOString(),
  };

  saveStudentDocuments(schoolId, [...documents, document]);
  return document;
}

export async function uploadStudentDocument(
  schoolId: string,
  studentId: string,
  input: {
    category: DocumentCategory;
    customLabel?: string;
    file: File;
  },
): Promise<StudentDocument> {
  const formData = new FormData();
  formData.append("schoolId", schoolId);
  formData.append("studentId", studentId);
  formData.append("category", input.category);
  if (input.customLabel?.trim()) {
    formData.append("customLabel", input.customLabel.trim());
  }
  formData.append("file", input.file);

  const response = await fetch("/api/student-documents", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as {
    document?: StudentDocument;
    error?: string;
  };

  if (!response.ok || !payload.document) {
    throw new Error(payload.error ?? "Could not upload the document.");
  }

  mergeStudentDocumentInLocalCache(schoolId, payload.document);

  return payload.document;
}

export function deleteStudentDocument(schoolId: string, documentId: string): void {
  const documents = loadStudentDocuments(schoolId).filter((document) => document.id !== documentId);
  saveStudentDocuments(schoolId, documents);
}

export async function deleteStudentDocumentRemote(
  schoolId: string,
  documentId: string,
): Promise<void> {
  const response = await fetch("/api/student-documents", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schoolId, documentId }),
  });

  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Could not delete the document.");
  }

  removeStudentDocumentFromLocalCache(schoolId, documentId);
}

function mergeStudentDocumentInLocalCache(schoolId: string, document: StudentDocument): void {
  const documents = loadStudentDocuments(schoolId).filter((item) => item.id !== document.id);
  setCachedScopedItemLocalOnly(
    schoolId,
    STORAGE_KEY,
    serializeStudentDocumentsForCache([...documents, document]),
  );
}

function removeStudentDocumentFromLocalCache(schoolId: string, documentId: string): void {
  const documents = loadStudentDocuments(schoolId).filter((document) => document.id !== documentId);
  setCachedScopedItemLocalOnly(
    schoolId,
    STORAGE_KEY,
    serializeStudentDocumentsForCache(documents),
  );
}

export function getDocumentFileUrl(document: StudentDocument): string {
  return document.fileUrl ?? document.dataUrl ?? "";
}

export function isImageDocument(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const REQUIRED_DOCUMENT_CATEGORIES = DOCUMENT_CATEGORIES.filter(
  (category) => category.value !== "other",
);

export type StudentDocumentStats = {
  uploadedCount: number;
  requiredUploadedCount: number;
  missingRequiredCount: number;
  requiredTotal: number;
};

export function getStudentDocumentStats(documents: StudentDocument[]): StudentDocumentStats {
  const uploadedCategories = new Set(documents.map((document) => document.category));
  const requiredUploadedCount = REQUIRED_DOCUMENT_CATEGORIES.filter((category) =>
    uploadedCategories.has(category.value),
  ).length;

  return {
    uploadedCount: documents.length,
    requiredUploadedCount,
    missingRequiredCount: REQUIRED_DOCUMENT_CATEGORIES.length - requiredUploadedCount,
    requiredTotal: REQUIRED_DOCUMENT_CATEGORIES.length,
  };
}

export function getMissingDocumentCategories(
  documents: StudentDocument[],
): typeof DOCUMENT_CATEGORIES {
  const uploadedCategories = new Set(documents.map((document) => document.category));
  return REQUIRED_DOCUMENT_CATEGORIES.filter(
    (category) => !uploadedCategories.has(category.value),
  );
}

export function formatDocumentStudentListLabel(student: StudentRecordWithEmail): string {
  return `${student.firstName} ${student.lastName}`.trim() || "Student";
}

export function formatDocumentStudentSecondaryLabel(student: StudentRecordWithEmail): string {
  const classLabel = formatStudentClassLabel(student.class, student.section);
  const parts: string[] = [];

  if (classLabel) parts.push(classLabel);
  if (student.studentId && !/^user_/i.test(student.studentId)) {
    parts.push(student.studentId);
  } else if (student.email) {
    parts.push(student.email);
  }

  return parts.join(" · ");
}
