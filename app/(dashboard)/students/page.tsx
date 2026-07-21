"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  User,
  BookOpen,
  Award,
  X,
  Check,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { formatStudentClassLabel, getClassNameWithoutSection, getNextRollNumberForClassSection, getUniqueClassLabels, getUniqueSchoolClassesByName, findStudentWithRollNumberInClassSection, formatRollNumberConflictMessage, normalizeClassLabel, normalizeSection } from "@/lib/class-labels";
import { exportTableData, slugifyFileName } from "@/lib/export-data";
import { ensureSchoolClassesFromStudents } from "@/lib/school-classes-sync";
import {
  formatImportSummary,
  getCsvValue,
  nextSequentialId,
  parseCsvRecords,
  parseStudentStatus,
  pickCsvFile,
} from "@/lib/import-data";
import { useSchool, getScopedItem, setScopedItem, persistScopedItem, getSchoolClasses, getUniqueClassNames, getUniqueSections, getSectionsForClass } from "@/lib/school-context";
import {
  formatCredentialsText,
  isValidLoginEmail,
  syncStudentsToSystemUsersPersisted,
} from "@/lib/system-users";
import { formatDate, getTodayIsoDate } from "@/lib/date-format";
import { DateInput } from "@/components/ui/date-input";
import { getUserSession } from "@/lib/teacher-check-in";
import {
  RecordFormSection,
  RecordFormShell,
  recordFormFieldInput,
  recordFormFieldInputAccent,
  recordFormFieldLabel,
} from "@/components/ui/record-form-layout";

type StudentStatus = "active" | "inactive" | "graduated" | "transferred";
type Gender = "male" | "female" | "other";

type Student = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  email: string;
  phone: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  class: string;
  section: string;
  rollNumber: string;
  admissionDate: string;
  status: StudentStatus;
  bloodGroup: string;
  photo?: string;
};

function studentMatchesSearch(student: Student, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  const fullName = `${student.firstName} ${student.lastName}`.trim().toLowerCase();
  const haystack = [
    fullName,
    student.studentId,
    student.email,
    student.guardianName,
    student.rollNumber,
    student.phone,
  ]
    .join(" ")
    .toLowerCase();

  if (haystack.includes(query)) return true;

  const words = query.split(/\s+/).filter(Boolean);
  return words.every((word) => haystack.includes(word));
}

const statusConfig: Record<StudentStatus, { color: string; label: string }> = {
  active: { color: "bg-green-100 text-green-700 border-green-200", label: "Active" },
  inactive: { color: "bg-gray-100 text-gray-700 border-gray-200", label: "Inactive" },
  graduated: { color: "bg-blue-100 text-blue-700 border-blue-200", label: "Graduated" },
  transferred: { color: "bg-orange-100 text-orange-700 border-orange-200", label: "Transferred" },
};

export default function StudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddMode = searchParams.get("action") === "add";
  const { currentSchool, isStorageReady } = useSchool();
  const [session, setSession] = useState<ReturnType<typeof getUserSession>>(null);
  const canManageStudents = session?.role === "admin";
  
  // Load manually created classes
  const [availableClasses, setAvailableClasses] = useState<ReturnType<typeof getSchoolClasses>>([]);
  
  // Load students from scoped localStorage when the school is available
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    setSession(getUserSession());
  }, []);

  useEffect(() => {
    if (!currentSchool || !isStorageReady) {
      if (!currentSchool) setStudents([]);
      return;
    }

    try {
      const stored = getScopedItem(currentSchool.id, "school_students");
      setStudents(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error("Error loading students from storage:", error);
      setStudents([]);
    }
  }, [currentSchool, isStorageReady]);
  
  // Load classes on mount and auto-create any missing class/section pairs from enrolled students
  useEffect(() => {
    if (!currentSchool) return;

    if (students.length > 0) {
      ensureSchoolClassesFromStudents(currentSchool.id);
    }

    const classes = getUniqueSchoolClassesByName(getSchoolClasses(currentSchool.id));
    setAvailableClasses(classes);
  }, [currentSchool, students]);
  
  // Get unique class names and sections
  const uniqueClassNames = getUniqueClassNames(availableClasses);
  const uniqueSections = getUniqueSections(availableClasses);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [showViewStudent, setShowViewStudent] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<Student>>({});

  const closeAddForm = () => {
    setFormData({});
    router.push("/students");
  };

  const closeEditForm = () => {
    setShowEditStudent(false);
    setSelectedStudent(null);
    setFormData({});
  };

  const openAddForm = () => {
    router.push("/students?action=add");
  };
  
  // Get sections for selected class in form (must be after formData declaration)
  const availableSectionsForClass = formData.class 
    ? getSectionsForClass(availableClasses, formData.class)
    : uniqueSections;

  const suggestedRollNumber = useMemo(() => {
    if (!formData.class?.trim() || !formData.section?.trim()) return "";
    return getNextRollNumberForClassSection(students, formData.class, formData.section);
  }, [formData.class, formData.section, students]);

  const displayRollNumber = formData.rollNumber?.trim()
    ? formData.rollNumber
    : suggestedRollNumber;

  // Save students to storage/database whenever they change
  const updateStudents = async (newStudents: Student[]) => {
    const previousStudents = students;
    setStudents(newStudents);
    if (typeof window === "undefined" || !currentSchool) {
      return { users: [], newlyIssued: [] as Awaited<ReturnType<typeof syncStudentsToSystemUsersPersisted>>["newlyIssued"] };
    }

    try {
      await persistScopedItem(
        currentSchool.id,
        "school_students",
        JSON.stringify(newStudents),
      );
      return await syncStudentsToSystemUsersPersisted(currentSchool.id);
    } catch (error) {
      setStudents(previousStudents);
      throw error;
    }
  };

  const filteredStudents = useMemo(() => 
    students.filter((student) => {
      const matchesSearch = studentMatchesSearch(student, searchTerm);
      const studentClassOnly = getClassNameWithoutSection(student.class, student.section);
      const matchesClass = filterClass === "all" || studentClassOnly === filterClass;
      const studentSection =
        normalizeSection(student.section) ||
        normalizeSection(
          normalizeClassLabel(student.class).match(/^(Grade\s+\d+)\s*([A-Za-z0-9]+)$/i)?.[2] || "",
        );
      const matchesSection =
        filterSection === "all" || studentSection === normalizeSection(filterSection);
      const matchesStatus = filterStatus === "all" || student.status === filterStatus;
      return matchesSearch && matchesClass && matchesSection && matchesStatus;
    }),
    [students, searchTerm, filterClass, filterSection, filterStatus]
  );

  const handleExportStudents = () => {
    const exported = exportTableData(
      `students-${slugifyFileName(currentSchool?.name ?? "school")}`,
      [
        { header: "Student ID", value: (student) => student.studentId },
        { header: "First Name", value: (student) => student.firstName },
        { header: "Last Name", value: (student) => student.lastName },
        { header: "Class", value: (student) => student.class },
        { header: "Section", value: (student) => student.section },
        { header: "Roll Number", value: (student) => student.rollNumber },
        { header: "Email", value: (student) => student.email },
        { header: "Phone", value: (student) => student.phone },
        { header: "Guardian", value: (student) => student.guardianName },
        { header: "Guardian Phone", value: (student) => student.guardianPhone },
        { header: "Guardian Email", value: (student) => student.guardianEmail },
        { header: "Status", value: (student) => student.status },
        { header: "Admission Date", value: (student) => student.admissionDate },
      ],
      filteredStudents,
    );

    if (!exported) {
      alert("No students to export for the current filters.");
    }
  };

  const handleImportStudents = async () => {
    const content = await pickCsvFile();
    if (!content) return;

    const records = parseCsvRecords(content);
    if (records.length === 0) {
      alert("The selected file is empty or not a valid CSV.");
      return;
    }

    const existingEmails = new Set(students.map((student) => student.email.toLowerCase()));
    const existingStudentIds = new Set(students.map((student) => student.studentId.toLowerCase()));
    const imported: Student[] = [];
    const errors: string[] = [];
    let skippedCount = 0;
    let nextStudentNumber = students.length;

    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      const rowNumber = index + 2;
      const firstName = getCsvValue(record, "First Name", "FirstName");
      const lastName = getCsvValue(record, "Last Name", "LastName");
      const email = getCsvValue(record, "Email").toLowerCase();

      if (!firstName || !lastName) {
        skippedCount += 1;
        errors.push(`Row ${rowNumber}: missing first or last name.`);
        continue;
      }

      const studentId = getCsvValue(record, "Student ID", "StudentID");
      const guardianName = getCsvValue(record, "Guardian", "Guardian Name");
      const guardianPhone = getCsvValue(record, "Guardian Phone", "GuardianPhone");
      const guardianEmail = getCsvValue(record, "Guardian Email", "GuardianEmail").toLowerCase();

      if (!guardianName || !guardianPhone || !guardianEmail) {
        skippedCount += 1;
        errors.push(`Row ${rowNumber}: guardian name, phone, and email are required.`);
        continue;
      }

      if (!isValidLoginEmail(guardianEmail)) {
        skippedCount += 1;
        errors.push(`Row ${rowNumber}: invalid guardian email (${guardianEmail}).`);
        continue;
      }

      if (email && existingEmails.has(email)) {
        skippedCount += 1;
        errors.push(`Row ${rowNumber}: ${email} already exists.`);
        continue;
      }
      if (studentId && existingStudentIds.has(studentId.toLowerCase())) {
        skippedCount += 1;
        errors.push(`Row ${rowNumber}: student ID ${studentId} already exists.`);
        continue;
      }

      const className = getCsvValue(record, "Class");
      const section = getCsvValue(record, "Section");
      const rollNumber = getCsvValue(record, "Roll Number", "RollNumber");
      const rollConflict = findStudentWithRollNumberInClassSection(
        [...students, ...imported],
        { class: className, section, rollNumber },
      );
      if (rollConflict) {
        skippedCount += 1;
        errors.push(
          `Row ${rowNumber}: roll number ${rollNumber} is already used in ${formatStudentClassLabel(className, section)}.`,
        );
        continue;
      }

      nextStudentNumber += 1;
      const newStudent: Student = {
        id: `${Date.now()}-${nextStudentNumber}`,
        studentId:
          studentId ||
          nextSequentialId(
            "STU",
            [...students, ...imported].map((student) => student.studentId),
          ),
        firstName,
        lastName,
        dateOfBirth: "",
        gender: "male",
        email: email || `${firstName}.${lastName}@import.local`.toLowerCase().replace(/\s+/g, ""),
        phone: getCsvValue(record, "Phone"),
        address: "",
        guardianName,
        guardianPhone,
        guardianEmail,
        class: className,
        section,
        rollNumber,
        admissionDate: getCsvValue(record, "Admission Date", "AdmissionDate") || getTodayIsoDate(),
        status: parseStudentStatus(getCsvValue(record, "Status") || "active"),
        bloodGroup: "",
      };

      if (newStudent.email) existingEmails.add(newStudent.email);
      if (newStudent.studentId) existingStudentIds.add(newStudent.studentId.toLowerCase());
      imported.push(newStudent);
    }

    if (imported.length > 0) {
      try {
        await updateStudents([...students, ...imported]);
      } catch (error) {
        alert(
          error instanceof Error
            ? `Failed to import students: ${error.message}`
            : "Failed to import students. Please try again.",
        );
        return;
      }

      let classesCreated: string[] = [];
      if (currentSchool) {
        const syncResult = ensureSchoolClassesFromStudents(currentSchool.id);
        setAvailableClasses(
          getUniqueSchoolClassesByName(getSchoolClasses(currentSchool.id)),
        );
        classesCreated = syncResult.created.map((cls) => cls.name);
      }

      let summary = formatImportSummary(
        { importedCount: imported.length, skippedCount, errors },
        imported.length === 1 ? "student" : "students",
      );
      if (classesCreated.length > 0) {
        summary += `\n\nCreated ${classesCreated.length} class${
          classesCreated.length === 1 ? "" : "es"
        }: ${classesCreated.join(", ")}.`;
      }
      alert(summary);
      return;
    }

    alert(
      formatImportSummary(
        { importedCount: imported.length, skippedCount, errors },
        imported.length === 1 ? "student" : "students",
      ),
    );
  };

  const stats = useMemo(() => ({
    total: students.length,
    active: students.filter(s => s.status === "active").length,
    inactive: students.filter(s => s.status === "inactive").length,
    newThisMonth: students.filter(s => {
      const admissionDate = new Date(s.admissionDate);
      const now = new Date();
      return admissionDate.getMonth() === now.getMonth() && 
             admissionDate.getFullYear() === now.getFullYear();
    }).length,
  }), [students]);

  const classes = useMemo(
    () =>
      getUniqueClassLabels(
        students.map((s) => getClassNameWithoutSection(s.class, s.section)),
      ),
    [students],
  );

  const sections = useMemo(() => {
    const relevantStudents =
      filterClass === "all"
        ? students
        : students.filter(
            (s) => getClassNameWithoutSection(s.class, s.section) === filterClass,
          );
    return Array.from(
      new Set(
        relevantStudents
          .map((s) => {
            const embedded = normalizeClassLabel(s.class).match(
              /^(Grade\s+\d+)\s*([A-Za-z0-9]+)$/i,
            );
            return normalizeSection(s.section || embedded?.[2] || "");
          })
          .filter(Boolean),
      ),
    ).sort();
  }, [students, filterClass]);

  const handleAddStudent = async () => {
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.guardianName?.trim() ||
      !formData.guardianPhone?.trim() ||
      !formData.guardianEmail?.trim()
    ) {
      alert("Please fill in all required fields, including guardian name, phone, and email.");
      return;
    }

    if (!isValidLoginEmail(formData.email)) {
      alert("Please enter a valid student email address.");
      return;
    }

    if (!isValidLoginEmail(formData.guardianEmail)) {
      alert("Please enter a valid guardian email address. Parent login credentials will be sent to this email.");
      return;
    }

    const assignedRollNumber =
      formData.rollNumber?.trim() ||
      getNextRollNumberForClassSection(students, formData.class || "", formData.section || "");

    const rollConflict = findStudentWithRollNumberInClassSection(students, {
      class: formData.class || "",
      section: formData.section || "",
      rollNumber: assignedRollNumber,
    });
    if (rollConflict) {
      alert(
        formatRollNumberConflictMessage(
          assignedRollNumber,
          formData.class || "",
          formData.section || "",
          rollConflict,
        ),
      );
      return;
    }

    const newStudent: Student = {
      id: Date.now().toString(),
      studentId: `STU${String(students.length + 1).padStart(3, '0')}`,
      firstName: formData.firstName,
      lastName: formData.lastName,
      dateOfBirth: formData.dateOfBirth || "",
      gender: formData.gender || "male",
      email: formData.email,
      phone: formData.phone || "",
      address: formData.address || "",
      guardianName: formData.guardianName.trim(),
      guardianPhone: formData.guardianPhone.trim(),
      guardianEmail: formData.guardianEmail.trim().toLowerCase(),
      class: formData.class || "",
      section: formData.section || "",
      rollNumber: assignedRollNumber,
      admissionDate: formData.admissionDate || getTodayIsoDate(),
      status: formData.status || "active",
      bloodGroup: formData.bloodGroup || "",
    };

    let successMessage = "Student added successfully!";
    try {
      const syncResult = await updateStudents([...students, newStudent]);
      if (currentSchool && newStudent.class && newStudent.section) {
        ensureSchoolClassesFromStudents(currentSchool.id);
        setAvailableClasses(
          getUniqueSchoolClassesByName(getSchoolClasses(currentSchool.id)),
        );
      }
      const parentUser = syncResult.newlyIssued.find(
        (user) =>
          user.role === "Parent" &&
          user.email.toLowerCase() === newStudent.guardianEmail.toLowerCase(),
      );
      if (parentUser && currentSchool) {
        successMessage += `\n\nParent login credentials:\n${formatCredentialsText(parentUser, currentSchool.name)}`;
      } else if (currentSchool) {
        successMessage +=
          "\n\nA parent account already exists for this guardian email. The existing password was kept unchanged.";
      }

      setFormData({});
      alert(successMessage);
      router.push("/students");
    } catch (error) {
      alert(
        error instanceof Error
          ? `Failed to save student: ${error.message}`
          : "Failed to save student. Please try again.",
      );
    }
  };

  const handleEditStudent = async () => {
    if (!canManageStudents) {
      alert("Only the principal (admin) can edit student records.");
      return;
    }
    if (
      !selectedStudent ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.guardianName?.trim() ||
      !formData.guardianPhone?.trim() ||
      !formData.guardianEmail?.trim()
    ) {
      alert("Please fill in all required fields, including guardian name, phone, and email.");
      return;
    }

    if (!isValidLoginEmail(formData.email)) {
      alert("Please enter a valid student email address.");
      return;
    }

    if (!isValidLoginEmail(formData.guardianEmail)) {
      alert("Please enter a valid guardian email address.");
      return;
    }

    const updatedStudent = {
      ...selectedStudent,
      ...formData,
      guardianName: formData.guardianName.trim(),
      guardianPhone: formData.guardianPhone.trim(),
      guardianEmail: formData.guardianEmail.trim().toLowerCase(),
    } as Student;
    const rollConflict = findStudentWithRollNumberInClassSection(students, {
      class: updatedStudent.class,
      section: updatedStudent.section,
      rollNumber: updatedStudent.rollNumber,
      excludeId: selectedStudent.id,
    });
    if (rollConflict) {
      alert(
        formatRollNumberConflictMessage(
          updatedStudent.rollNumber,
          updatedStudent.class,
          updatedStudent.section,
          rollConflict,
        ),
      );
      return;
    }

    try {
      await updateStudents(students.map(s => 
        s.id === selectedStudent.id ? updatedStudent : s
      ));

      if (currentSchool) {
        const storedAttendance = getScopedItem(currentSchool.id, "attendance_records");
        if (storedAttendance) {
          try {
            const records = JSON.parse(storedAttendance) as Array<{
              studentId: string;
              studentName: string;
            }>;
            const fullName = `${updatedStudent.firstName} ${updatedStudent.lastName}`.trim();
            const syncedRecords = records.map((record) =>
              record.studentId === updatedStudent.id
                ? { ...record, studentName: fullName }
                : record,
            );
            setScopedItem(
              currentSchool.id,
              "attendance_records",
              JSON.stringify(syncedRecords),
            );
          } catch (error) {
            console.error("Error syncing attendance student names:", error);
          }
        }
      }

      closeEditForm();
      alert("Student updated successfully!");
    } catch (error) {
      alert(
        error instanceof Error
          ? `Failed to update student: ${error.message}`
          : "Failed to update student. Please try again.",
      );
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!canManageStudents) {
      alert("Only the principal (admin) can delete student records.");
      return;
    }
    if (confirm("Are you sure you want to delete this student?")) {
      try {
        await updateStudents(students.filter(s => s.id !== studentId));
        alert("Student deleted successfully!");
      } catch (error) {
        alert(
          error instanceof Error
            ? `Failed to delete student: ${error.message}`
            : "Failed to delete student. Please try again.",
        );
      }
    }
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowViewStudent(true);
  };

  const handleEditClick = (student: Student) => {
    if (!canManageStudents) {
      alert("Only the principal (admin) can edit student records.");
      return;
    }
    setSelectedStudent(student);
    setFormData(student);
    setShowEditStudent(true);
  };

  if (isAddMode) {
    return (
      <RecordFormShell
        accent="blue"
        eyebrow="Students"
        title="Add New Student"
        description="Register a student profile, assign their class, and capture guardian contact details."
        icon={UserPlus}
        onClose={closeAddForm}
        onSubmit={handleAddStudent}
        submitLabel="Save Student"
      >
            <RecordFormSection
              title="Personal Information"
              description="Basic identity and contact details for the student."
              icon={User}
            >
              <div>
                <label className={recordFormFieldLabel}>First Name *</label>
                <input
                  type="text"
                  value={formData.firstName || ""}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Enter first name"
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                />
              </div>

              <div>
                <label className={recordFormFieldLabel}>Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName || ""}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Enter last name"
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                />
              </div>

              <div>
                <label className={recordFormFieldLabel}>Date of Birth</label>
                <DateInput
                  value={formData.dateOfBirth || ""}
                  onChange={(dateOfBirth) => setFormData({ ...formData, dateOfBirth })}
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                />
              </div>

              <div>
                <label className={recordFormFieldLabel}>Gender</label>
                <select
                  value={formData.gender || "male"}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className={recordFormFieldLabel}>Blood Group</label>
                <select
                  value={formData.bloodGroup || ""}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className={recordFormFieldLabel}>Email *</label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@school.edu"
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                />
              </div>

              <div>
                <label className={recordFormFieldLabel}>Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+233 XX XXX XXXX"
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                />
              </div>

              <div className="md:col-span-2">
                <label className={recordFormFieldLabel}>Address</label>
                <textarea
                  rows={2}
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Residential address"
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                />
              </div>
            </RecordFormSection>

            <RecordFormSection
              title="Academic Information"
              description="Class placement and enrollment details."
              icon={BookOpen}
            >
              {availableClasses.length === 0 && (
                <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">No classes available</p>
                      <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                        Create classes in{" "}
                        <a href="/admin/academics" className="font-semibold underline hover:no-underline">
                          Admin → Academics Config
                        </a>{" "}
                        before enrolling students.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className={recordFormFieldLabel}>Class *</label>
                <select
                  value={formData.class || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      class: e.target.value,
                      section: "",
                      rollNumber: "",
                    })
                  }
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                  disabled={availableClasses.length === 0}
                >
                  <option value="">Select class</option>
                  {uniqueClassNames.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={recordFormFieldLabel}>Section *</label>
                <select
                  value={formData.section || ""}
                  onChange={(e) => {
                    const section = e.target.value;
                    const rollNumber =
                      formData.class && section
                        ? getNextRollNumberForClassSection(students, formData.class, section)
                        : "";
                    setFormData({ ...formData, section, rollNumber });
                  }}
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                  disabled={!formData.class || availableClasses.length === 0}
                >
                  <option value="">Select section</option>
                  {availableSectionsForClass.map((section) => (
                    <option key={section} value={section}>
                      Section {section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={recordFormFieldLabel}>Roll Number</label>
                <input
                  type="text"
                  value={displayRollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  placeholder="Select class and section first"
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue} ${
                    suggestedRollNumber ? "font-semibold text-slate-900 dark:text-slate-50" : ""
                  }`}
                />
                {suggestedRollNumber ? (
                  <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                    Roll {suggestedRollNumber} will be assigned for {formData.class} Section {formData.section}.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Choose class and section to see the next roll number.
                  </p>
                )}
              </div>

              <div>
                <label className={recordFormFieldLabel}>Admission Date</label>
                <DateInput
                  value={formData.admissionDate || ""}
                  onChange={(admissionDate) => setFormData({ ...formData, admissionDate })}
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                />
              </div>
            </RecordFormSection>

            <RecordFormSection
              title="Guardian Information"
              description="Required — parent login credentials are issued from the guardian email."
              icon={Users}
            >
              <div>
                <label className={recordFormFieldLabel}>Guardian Name *</label>
                <input
                  type="text"
                  required
                  value={formData.guardianName || ""}
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  placeholder="Full name"
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                />
              </div>

              <div>
                <label className={recordFormFieldLabel}>Guardian Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.guardianPhone || ""}
                  onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                  placeholder="+233 XX XXX XXXX"
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                />
              </div>

              <div className="md:col-span-2">
                <label className={recordFormFieldLabel}>Guardian Email *</label>
                <input
                  type="email"
                  required
                  value={formData.guardianEmail || ""}
                  onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                  placeholder="guardian@email.com"
                  className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                />
              </div>
            </RecordFormSection>
      </RecordFormShell>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 -m-6 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Student Management</h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 ml-14">
                Manage student profiles, enrollments, class assignments, and guardian information
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleImportStudents}
                className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all font-medium text-slate-700 dark:text-slate-200"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={handleExportStudents}
                className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all font-medium text-slate-700 dark:text-slate-200"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={openAddForm}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl transition-all font-medium shadow-lg shadow-blue-500/30"
              >
                <UserPlus className="w-4 h-4" />
                Add Student
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Students</span>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-1">{stats.total}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Enrolled students</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Active Students</span>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-1">{stats.active}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Currently active</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Inactive</span>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-1">{stats.inactive}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Need attention</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">New This Month</span>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-1">{stats.newThisMonth}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Recent admissions</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, student ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={filterClass}
                onChange={(e) => {
                  setFilterClass(e.target.value);
                  setFilterSection("all");
                }}
                className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              >
                <option value="all">All Classes</option>
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              >
                <option value="all">All Sections</option>
                {sections.map(sec => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="graduated">Graduated</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
            {(filterClass !== "all" || filterSection !== "all" || filterStatus !== "all" || searchTerm.trim()) &&
              students.length > 0 &&
              filteredStudents.length < students.length && (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                  Showing {filteredStudents.length} of {students.length} students. Clear filters or search to see all
                  records — a student may already exist under a different class or section.
                </p>
              )}
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Class & Section</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Roll Number</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Guardian</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No students found</h3>
                      <p className="text-slate-600 dark:text-slate-400">Try adjusting your search or filter criteria</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-50">{student.firstName} {student.lastName}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{student.studentId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-lg">
                            {student.class}
                          </span>
                          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-semibold rounded-lg">
                            Sec {student.section}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{student.rollNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-slate-700 dark:text-slate-300">{student.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium text-slate-700 dark:text-slate-300">{student.guardianName}</p>
                          <p className="text-slate-500 dark:text-slate-400">{student.guardianPhone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border-2 ${statusConfig[student.status].color}`}>
                          {statusConfig[student.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewStudent(student)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            title="View details"
                          >
                            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </button>
                          {canManageStudents && (
                            <>
                              <button
                                onClick={() => handleEditClick(student)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student.id)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Student Modal */}
        {showEditStudent && selectedStudent && canManageStudents && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-900">
              <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600" />

              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    <Edit className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Students
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      Edit Student
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                      Update profile, class placement, and guardian contact details.
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Award className="h-3.5 w-3.5" />
                      ID: {selectedStudent.studentId}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeEditForm}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Close edit form"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/70 p-6 dark:bg-slate-950/40">
                <RecordFormSection
                  title="Personal Information"
                  description="Basic identity and contact details for the student."
                  icon={User}
                >
                  <div>
                    <label className={recordFormFieldLabel}>First Name *</label>
                    <input
                      type="text"
                      value={formData.firstName || ""}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Enter first name"
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    />
                  </div>

                  <div>
                    <label className={recordFormFieldLabel}>Last Name *</label>
                    <input
                      type="text"
                      value={formData.lastName || ""}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Enter last name"
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    />
                  </div>

                  <div>
                    <label className={recordFormFieldLabel}>Date of Birth</label>
                    <DateInput
                      value={formData.dateOfBirth || ""}
                      onChange={(dateOfBirth) => setFormData({ ...formData, dateOfBirth })}
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    />
                  </div>

                  <div>
                    <label className={recordFormFieldLabel}>Gender</label>
                    <select
                      value={formData.gender || "male"}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className={recordFormFieldLabel}>Blood Group</label>
                    <select
                      value={formData.bloodGroup || ""}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div>
                    <label className={recordFormFieldLabel}>Email *</label>
                    <input
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="student@school.edu"
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    />
                  </div>

                  <div>
                    <label className={recordFormFieldLabel}>Phone</label>
                    <input
                      type="tel"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+233 XX XXX XXXX"
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={recordFormFieldLabel}>Address</label>
                    <textarea
                      rows={2}
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Residential address"
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    />
                  </div>
                </RecordFormSection>

                <RecordFormSection
                  title="Academic Information"
                  description="Class placement, roll number, and enrollment status."
                  icon={BookOpen}
                >
                  {availableClasses.length === 0 && (
                    <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">No classes available</p>
                          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                            Create classes in Admin → Academics Config before updating class assignments.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={recordFormFieldLabel}>Class *</label>
                    <select
                      value={formData.class || ""}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value, section: "" })}
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                      disabled={availableClasses.length === 0}
                    >
                      <option value="">Select class</option>
                      {uniqueClassNames.map((className) => (
                        <option key={className} value={className}>
                          {className}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={recordFormFieldLabel}>Section *</label>
                    <select
                      value={formData.section || ""}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                      disabled={!formData.class || availableClasses.length === 0}
                    >
                      <option value="">Select section</option>
                      {availableSectionsForClass.map((section) => (
                        <option key={section} value={section}>
                          Section {section}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={recordFormFieldLabel}>Roll Number</label>
                    <input
                      type="text"
                      value={formData.rollNumber || ""}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                      placeholder="Unique within class and section"
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    />
                  </div>

                  <div>
                    <label className={recordFormFieldLabel}>Admission Date</label>
                    <DateInput
                      value={formData.admissionDate || ""}
                      onChange={(admissionDate) => setFormData({ ...formData, admissionDate })}
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    />
                  </div>

                  <div>
                    <label className={recordFormFieldLabel}>Status</label>
                    <select
                      value={formData.status || "active"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="graduated">Graduated</option>
                      <option value="transferred">Transferred</option>
                    </select>
                  </div>
                </RecordFormSection>

                <RecordFormSection
                  title="Guardian Information"
                  description="Required — parent login is linked to the guardian email."
                  icon={Users}
                >
                  <div>
                    <label className={recordFormFieldLabel}>Guardian Name *</label>
                    <input
                      type="text"
                      value={formData.guardianName || ""}
                      onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                      placeholder="Full name"
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    />
                  </div>

                  <div>
                    <label className={recordFormFieldLabel}>Guardian Phone *</label>
                    <input
                      type="tel"
                      value={formData.guardianPhone || ""}
                      onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                      placeholder="+233 XX XXX XXXX"
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={recordFormFieldLabel}>Guardian Email *</label>
                    <input
                      type="email"
                      value={formData.guardianEmail || ""}
                      onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                      placeholder="guardian@email.com"
                      className={`${recordFormFieldInput} ${recordFormFieldInputAccent.blue}`}
                    />
                  </div>
                </RecordFormSection>

                <p className="text-xs text-slate-500 dark:text-slate-400">Fields marked * are required.</p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-end dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={closeEditForm}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditStudent}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
                >
                  Update Student
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Student Modal */}
        {showViewStudent && selectedStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Student Details</h3>
                <button onClick={() => { setShowViewStudent(false); setSelectedStudent(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-6">
                  {/* Student Header */}
                  <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{selectedStudent.firstName} {selectedStudent.lastName}</h4>
                      <p className="text-slate-600 dark:text-slate-400">Student ID: {selectedStudent.studentId}</p>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border-2 mt-2 ${statusConfig[selectedStudent.status].color}`}>
                        {statusConfig[selectedStudent.status].label}
                      </span>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div>
                    <h5 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-3 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Personal Information
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Date of Birth</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{formatDate(selectedStudent.dateOfBirth)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Gender</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50 capitalize">{selectedStudent.gender}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Blood Group</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedStudent.bloodGroup}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedStudent.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedStudent.phone}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Address</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedStudent.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div>
                    <h5 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Academic Information
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Class</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedStudent.class}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Section</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedStudent.section}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Roll Number</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedStudent.rollNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Admission Date</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{formatDate(selectedStudent.admissionDate)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Guardian Information */}
                  <div>
                    <h5 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Guardian Information
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Guardian Name</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedStudent.guardianName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Guardian Phone</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedStudent.guardianPhone}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Guardian Email</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedStudent.guardianEmail}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                {canManageStudents && (
                  <button 
                    onClick={() => { handleEditClick(selectedStudent); setShowViewStudent(false); }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all font-bold shadow-lg shadow-blue-500/30"
                  >
                    Edit Student
                  </button>
                )}
                <button 
                  onClick={() => { setShowViewStudent(false); setSelectedStudent(null); }}
                  className={`${canManageStudents ? "px-6" : "flex-1 px-6"} py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-semibold`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
