"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Image as ImageIcon,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { isUserRole, type UserRole } from "@/lib/auth";
import { formatStudentClassLabel } from "@/lib/class-labels";
import { formatDateTime } from "@/lib/date-format";
import {
  filterStudentsForParentLink,
  formatLinkedChildLabel,
  getLinkedStudentsForParentEmail,
  getStudentClassFilterOptions,
  type SchoolStudentRecord,
} from "@/lib/parent-student-links";
import { useSchool } from "@/lib/school-context";
import { getUserSession } from "@/lib/teacher-check-in";
import {
  createStudentDocument,
  deleteStudentDocument,
  DOCUMENT_CATEGORIES,
  findStudentForSession,
  formatDocumentStudentListLabel,
  formatDocumentStudentSecondaryLabel,
  formatFileSize,
  getDocumentCategoryLabel,
  getDocumentsForStudent,
  getMissingDocumentCategories,
  getStudentDocumentStats,
  isImageDocument,
  loadAllDocumentStudents,
  loadStudentDocuments,
  pickDocumentFile,
  readFileAsDataUrl,
  validateDocumentFile,
  type DocumentCategory,
  type StudentDocument,
  type StudentDocumentStats,
  type StudentRecordWithEmail,
} from "@/lib/student-documents";

function getPageCopy(role: UserRole) {
  if (role === "student") {
    return {
      title: "My Documents",
      description:
        "Upload admission documents required by your school. Supported formats: PNG, JPG, JPEG, and PDF (max 2 MB each).",
    };
  }

  if (role === "parent") {
    return {
      title: "Child's Documents",
      description: "Review documents uploaded by your child for school verification.",
    };
  }

  return {
    title: "Verify Student Documents",
    description: "Review documents uploaded by students for admission and record verification.",
  };
}

function DocumentPreviewModal({
  document,
  onClose,
}: {
  document: StudentDocument | null;
  onClose: () => void;
}) {
  if (!document) return null;

  const label = getDocumentCategoryLabel(document);
  const isImage = isImageDocument(document.mimeType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="surface-card flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {document.fileName} · {formatFileSize(document.fileSize)} · Uploaded{" "}
              {formatDateTime(document.uploadedAt)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary h-9 px-3">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-6">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={document.dataUrl}
              alt={label}
              className="mx-auto max-h-[70vh] rounded-xl border border-slate-200 bg-white object-contain shadow-sm"
            />
          ) : (
            <iframe
              title={label}
              src={document.dataUrl}
              className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
            />
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <a href={document.dataUrl} download={document.fileName} className="btn-primary">
            Download {document.fileName}
          </a>
        </div>
      </div>
    </div>
  );
}

function DocumentCard({
  document,
  canManage,
  onView,
  onDelete,
}: {
  document: StudentDocument;
  canManage: boolean;
  onView: (document: StudentDocument) => void;
  onDelete: (documentId: string) => void;
}) {
  const label = getDocumentCategoryLabel(document);
  const isImage = isImageDocument(document.mimeType);

  return (
    <div className="surface-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">{label}</h3>
            <p className="mt-1 truncate text-sm text-slate-500">{document.fileName}</p>
            <p className="mt-2 text-xs text-slate-400">
              {formatFileSize(document.fileSize)} · Uploaded {formatDateTime(document.uploadedAt)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => onView(document)} className="btn-secondary h-10 px-3">
            <Eye className="h-4 w-4" />
            View
          </button>
          {canManage ? (
            <button
              type="button"
              onClick={() => onDelete(document.id)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MissingDocumentsSection({
  missingCategories,
}: {
  missingCategories: typeof DOCUMENT_CATEGORIES;
}) {
  if (missingCategories.length === 0) {
    return (
      <div className="surface-card flex items-start gap-3 p-5 text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">All required documents uploaded</p>
          <p className="mt-1 text-sm text-emerald-700/90">
            This student has submitted every required admission document.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Missing Documents</h2>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          {missingCategories.length} pending
        </span>
      </div>
      <div className="space-y-3">
        {missingCategories.map((category) => (
          <div
            key={category.value}
            className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="font-medium text-amber-950">{category.label}</p>
              <p className="mt-0.5 text-sm text-amber-800/90">{category.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentStatusBadge({ stats }: { stats: StudentDocumentStats }) {
  if (stats.missingRequiredCount === 0) {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Complete
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
      {stats.requiredUploadedCount}/{stats.requiredTotal} uploaded
    </span>
  );
}

export default function MyDocumentsPage() {
  const { currentSchool } = useSchool();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [session, setSession] = useState<ReturnType<typeof getUserSession>>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("birth_certificate");
  const [customLabel, setCustomLabel] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<StudentDocument | null>(null);

  useEffect(() => {
    const roleValue = localStorage.getItem("user_role");
    setUserRole(isUserRole(roleValue) ? roleValue : null);
    setSession(getUserSession());
  }, []);

  const isStudentView = userRole === "student";
  const isParentView = userRole === "parent";
  const isVerifierView = userRole === "admin" || userRole === "teacher";

  const linkedChildren = useMemo(() => {
    if (!isParentView || !currentSchool || !session?.email) return [];
    return getLinkedStudentsForParentEmail(currentSchool.id, session.email);
  }, [isParentView, currentSchool, session?.email]);

  const allStudents = useMemo(() => {
    if (!currentSchool || !isVerifierView) return [];
    return loadAllDocumentStudents(currentSchool.id);
  }, [currentSchool, isVerifierView]);

  const classOptions = useMemo(
    () => getStudentClassFilterOptions(allStudents),
    [allStudents],
  );

  const filteredStudents = useMemo(
    () =>
      filterStudentsForParentLink(allStudents, {
        query: studentSearch,
        classFilter,
      }),
    [allStudents, studentSearch, classFilter],
  );

  const studentStatsMap = useMemo(() => {
    if (!currentSchool || !isVerifierView) return new Map<string, StudentDocumentStats>();

    const allDocs = loadStudentDocuments(currentSchool.id);
    const map = new Map<string, StudentDocumentStats>();

    for (const student of allStudents) {
      const studentDocs = allDocs.filter((document) => document.studentId === student.id);
      map.set(student.id, getStudentDocumentStats(studentDocs));
    }

    return map;
  }, [allStudents, currentSchool, isVerifierView]);

  const selectedVerifierStudent = useMemo(() => {
    if (!isVerifierView || !selectedStudentId) return null;
    return allStudents.find((student) => student.id === selectedStudentId) ?? null;
  }, [allStudents, isVerifierView, selectedStudentId]);

  const currentStudent = useMemo(() => {
    if (!currentSchool || !session) return null;

    if (isStudentView) {
      return findStudentForSession(currentSchool.id, session);
    }

    if (isParentView) {
      const child =
        linkedChildren.find((student) => student.id === selectedStudentId) ?? linkedChildren[0] ?? null;
      return child as StudentRecordWithEmail | null;
    }

    if (isVerifierView) {
      return selectedVerifierStudent;
    }

    return null;
  }, [
    allStudents,
    currentSchool,
    isParentView,
    isStudentView,
    isVerifierView,
    linkedChildren,
    selectedStudentId,
    selectedVerifierStudent,
    session,
  ]);

  useEffect(() => {
    if (isParentView && linkedChildren.length > 0) {
      setSelectedStudentId((current) =>
        linkedChildren.some((child) => child.id === current) ? current : linkedChildren[0].id,
      );
    }
  }, [isParentView, linkedChildren]);

  useEffect(() => {
    if (
      isVerifierView &&
      selectedStudentId &&
      !filteredStudents.some((student) => student.id === selectedStudentId)
    ) {
      setSelectedStudentId("");
    }
  }, [filteredStudents, isVerifierView, selectedStudentId]);

  useEffect(() => {
    if (!currentSchool || !currentStudent) {
      setDocuments([]);
      return;
    }
    setDocuments(getDocumentsForStudent(currentSchool.id, currentStudent.id));
  }, [currentSchool, currentStudent]);

  const missingCategories = useMemo(
    () => getMissingDocumentCategories(documents),
    [documents],
  );

  const pageCopy = userRole ? getPageCopy(userRole) : getPageCopy("student");

  const refreshDocuments = (studentId: string) => {
    if (!currentSchool) return;
    setDocuments(getDocumentsForStudent(currentSchool.id, studentId));
  };

  const handleUpload = async () => {
    if (!currentSchool || !currentStudent || !isStudentView) return;

    setUploadError("");
    setUploadSuccess("");

    if (selectedCategory === "other" && !customLabel.trim()) {
      setUploadError("Please enter a name for the other document.");
      return;
    }

    setIsUploading(true);
    try {
      const file = await pickDocumentFile();
      if (!file) {
        setIsUploading(false);
        return;
      }

      const validationError = validateDocumentFile(file);
      if (validationError) {
        setUploadError(validationError);
        setIsUploading(false);
        return;
      }

      const dataUrl = await readFileAsDataUrl(file);
      createStudentDocument(currentSchool.id, currentStudent.id, {
        category: selectedCategory,
        customLabel: selectedCategory === "other" ? customLabel : undefined,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        dataUrl,
      });

      refreshDocuments(currentStudent.id);
      setUploadSuccess(`${getDocumentCategoryLabel({ category: selectedCategory, customLabel })} uploaded successfully.`);
      setCustomLabel("");
    } catch {
      setUploadError("Could not upload the document. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (documentId: string) => {
    if (!currentSchool || !currentStudent || !isStudentView) return;
    if (!window.confirm("Remove this document? You can upload it again later.")) return;

    deleteStudentDocument(currentSchool.id, documentId);
    refreshDocuments(currentStudent.id);
    setUploadSuccess("Document removed.");
    setUploadError("");
  };

  if (!userRole || (!isStudentView && !isParentView && !isVerifierView)) {
    return (
      <div className="space-y-6">
        <div className="surface-card p-6">
          <h1 className="page-title">Access Restricted</h1>
          <p className="page-subtitle mt-2">
            Document uploads are available to students. Verification is available to parents, teachers, and administrators.
          </p>
        </div>
      </div>
    );
  }

  if (isVerifierView) {
    const pageCopy = getPageCopy(userRole);
    const selectedStats = selectedVerifierStudent
      ? studentStatsMap.get(selectedVerifierStudent.id)
      : null;

    return (
      <div className="space-y-6">
        <PageHeader title={pageCopy.title} description={pageCopy.description} />

        <div className="surface-card p-5">
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Filter by class
              </label>
              <select
                value={classFilter}
                onChange={(event) => {
                  setClassFilter(event.target.value);
                  setSelectedStudentId("");
                }}
                className="input-field"
              >
                <option value="all">All classes ({allStudents.length} students)</option>
                {classOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search students
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={studentSearch}
                  onChange={(event) => {
                    setStudentSearch(event.target.value);
                    setSelectedStudentId("");
                  }}
                  placeholder="First name, full name, class, or student ID"
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Student</span>
              <span>Class / Section</span>
              <span>Documents</span>
              <span className="text-right">Action</span>
            </div>

            {filteredStudents.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No students match your filters.</p>
            ) : (
              filteredStudents.map((student) => {
                const stats = studentStatsMap.get(student.id) ?? getStudentDocumentStats([]);
                const isSelected = student.id === selectedStudentId;
                const classLabel = formatStudentClassLabel(student.class, student.section) || "—";

                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`grid w-full grid-cols-1 gap-3 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] md:items-center md:gap-4 ${
                      isSelected ? "bg-teal-50/80" : "hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {formatDocumentStudentListLabel(student)}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500 md:hidden">
                        {formatDocumentStudentSecondaryLabel(student) || "No class assigned"}
                      </p>
                    </div>
                    <p className="hidden text-sm text-slate-600 md:block">
                      {classLabel || "—"}
                    </p>
                    <div>
                      <DocumentStatusBadge stats={stats} />
                    </div>
                    <div className="flex items-center justify-between gap-2 md:justify-end">
                      <span className="text-sm font-medium text-teal-700">
                        {isSelected ? "Selected" : "View documents"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {!selectedVerifierStudent ? (
          <div className="surface-muted p-6 text-center text-sm text-slate-600">
            Select a student from the list above to review uploaded and missing documents.
          </div>
        ) : (
          <>
            <div className="surface-card p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="section-label mb-1">Selected student</p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {formatDocumentStudentListLabel(selectedVerifierStudent)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDocumentStudentSecondaryLabel(selectedVerifierStudent) ||
                      "No class assigned"}
                  </p>
                </div>
                {selectedStats ? <DocumentStatusBadge stats={selectedStats} /> : null}
              </div>
            </div>

            <div className="surface-muted flex items-start gap-3 p-5 text-slate-700">
              <Eye className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
              <p className="text-sm">
                Verification mode — documents can only be uploaded by the student from their own account.
              </p>
            </div>

            <MissingDocumentsSection missingCategories={missingCategories} />

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Submitted Documents</h2>
                <span className="text-sm text-slate-500">
                  {documents.length} document{documents.length === 1 ? "" : "s"}
                </span>
              </div>

              {documents.length === 0 ? (
                <div className="surface-card p-8 text-center">
                  <FileText className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 font-medium text-slate-700">No documents uploaded yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    This student has not uploaded any documents yet.
                  </p>
                </div>
              ) : (
                documents.map((document) => (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    canManage={false}
                    onView={setPreviewDocument}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </>
        )}

        <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="space-y-6">
        <PageHeader title={pageCopy.title} description={pageCopy.description} />
        <div className="surface-card flex items-start gap-3 p-6 text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Student profile not found</p>
            <p className="mt-1 text-sm text-amber-700/90">
              {isStudentView
                ? "Your student record could not be matched. Contact the school office to link your login to your student profile."
                : isParentView
                  ? "No linked child was found for your parent account."
                  : "Select a student to review their uploaded documents."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const studentName = `${currentStudent.firstName} ${currentStudent.lastName}`.trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageCopy.title}
        description={pageCopy.description}
        meta={
          !isStudentView ? (
            <span>
              Viewing documents for <strong>{studentName}</strong>
              {currentStudent.studentId ? ` · ${currentStudent.studentId}` : ""}
            </span>
          ) : undefined
        }
      />

      {isParentView && linkedChildren.length > 1 ? (
        <div className="surface-card p-5">
          <label className="mb-2 block text-sm font-medium text-slate-700">Select child</label>
          <select
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
            className="input-field max-w-md"
          >
            {linkedChildren.map((child: SchoolStudentRecord) => (
              <option key={child.id} value={child.id}>
                {formatLinkedChildLabel(child)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {isStudentView ? (
        <div className="surface-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Upload Document</h2>
              <p className="text-sm text-slate-500">
                Only students can upload documents. Accepted formats: PNG, JPG, JPEG, PDF.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Document type</label>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value as DocumentCategory)}
                className="input-field"
              >
                {DOCUMENT_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                {DOCUMENT_CATEGORIES.find((category) => category.value === selectedCategory)?.description}
              </p>
            </div>

            {selectedCategory === "other" ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Document name</label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(event) => setCustomLabel(event.target.value)}
                  placeholder="Enter document name"
                  className="input-field"
                />
              </div>
            ) : null}
          </div>

          {uploadError ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          ) : null}

          {uploadSuccess ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          ) : null}

          <div className="mt-5">
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="btn-primary"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? "Uploading..." : "Choose File & Upload"}
            </button>
          </div>
        </div>
      ) : isParentView ? (
        <div className="surface-muted flex items-start gap-3 p-5 text-slate-700">
          <Eye className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
          <p className="text-sm">
            You can review your child&apos;s documents here. Only the student can upload files from their own account.
          </p>
        </div>
      ) : null}

      {(isStudentView || isParentView) ? (
        <MissingDocumentsSection missingCategories={missingCategories} />
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {isStudentView ? "Uploaded Documents" : "Submitted Documents"}
          </h2>
          <span className="text-sm text-slate-500">
            {documents.length} document{documents.length === 1 ? "" : "s"}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="surface-card p-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">No documents uploaded yet</p>
            <p className="mt-1 text-sm text-slate-500">
              {isStudentView
                ? "Upload your admission documents using the form above."
                : "This student has not uploaded any documents yet."}
            </p>
          </div>
        ) : (
          documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              canManage={isStudentView}
              onView={setPreviewDocument}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
    </div>
  );
}
