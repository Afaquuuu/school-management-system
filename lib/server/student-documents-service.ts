import { getTenantStorageItem, setTenantStorageItem } from "@/lib/server/tenant-storage";
import { STUDENT_DOCUMENTS_STORAGE_KEY } from "@/lib/server/misc-domains-relational";
import type { StudentDocument } from "@/lib/student-documents";

export async function listStudentDocuments(schoolId: string): Promise<StudentDocument[]> {
  const raw = await getTenantStorageItem(schoolId, STUDENT_DOCUMENTS_STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as StudentDocument[];
  } catch {
    return [];
  }
}

export async function saveStudentDocuments(
  schoolId: string,
  documents: StudentDocument[],
): Promise<void> {
  await setTenantStorageItem(
    schoolId,
    STUDENT_DOCUMENTS_STORAGE_KEY,
    JSON.stringify(documents),
  );
}

export async function appendStudentDocument(
  schoolId: string,
  document: StudentDocument,
): Promise<StudentDocument> {
  const documents = await listStudentDocuments(schoolId);
  const next = [...documents, document];
  await saveStudentDocuments(schoolId, next);
  return document;
}

export async function removeStudentDocument(
  schoolId: string,
  documentId: string,
): Promise<StudentDocument | null> {
  const documents = await listStudentDocuments(schoolId);
  const target = documents.find((document) => document.id === documentId) ?? null;
  if (!target) return null;

  await saveStudentDocuments(
    schoolId,
    documents.filter((document) => document.id !== documentId),
  );
  return target;
}
