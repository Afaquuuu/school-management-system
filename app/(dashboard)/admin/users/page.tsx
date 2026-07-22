"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  X,
  Save,
  CheckCircle,
  Mail,
  Phone,
  User,
  Shield,
  KeyRound,
  Copy,
  RefreshCw,
  ClipboardCopy,
} from "lucide-react";
import { useSchool } from "@/lib/school-context";
import {
  buildParentClassDepartment,
  getLinkedStudentsForParent,
  linkStudentsToParentAccount,
  loadSchoolStudentRecords,
  resolveLinkedStudentIds,
  type SchoolStudentRecord,
} from "@/lib/parent-student-links";
import { getPasswordMinLength, validatePasswordPolicy } from "@/lib/school-security";
import { ParentStudentLinker } from "@/components/admin/parent-student-linker";
import {
  credentialRoles,
  formatCredentialsText,
  generateLoginPassword,
  getClassDepartmentLabel,
  isValidLoginEmail,
  loadSystemUsers,
  saveSystemUsersPersisted,
  syncStaffToSystemUsers,
  syncStudentsToSystemUsers,
  syncSystemUserEditsToStaffRecord,
  userRoleFilterOptions,
  assignableSystemRoles,
  type SystemUser,
  type SystemUserRole,
  type SystemUserStatus,
} from "@/lib/system-users";
import { formatDateTime } from "@/lib/date-format";

const rolesConfig = [
  { label: "Student", description: "Receives login to view own grades and attendance", permissions: 5 },
  { label: "Teacher", description: "Receives login for classes, attendance, and check-in", permissions: 12 },
  { label: "Parent", description: "Receives login to view child's progress and reports", permissions: 4 },
  { label: "Accountant", description: "Receives login for invoices, payments, and finance records", permissions: 10 },
  { label: "Librarian", description: "Receives login for library and academic resources", permissions: 8 },
  { label: "Admin", description: "Full system control including credential issuance", permissions: 28 },
];

function getRoleBadgeClass(role: SystemUserRole): string {
  switch (role) {
    case "Student":
      return "bg-blue-100 text-blue-800";
    case "Teacher":
      return "bg-emerald-100 text-emerald-800";
    case "Parent":
      return "bg-purple-100 text-purple-800";
    case "Accountant":
      return "bg-amber-100 text-amber-800";
    case "Librarian":
      return "bg-teal-100 text-teal-800";
    default:
      return "bg-red-100 text-red-800";
  }
}

export default function UsersPage() {
  const { currentSchool } = useSchool();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [issuedUser, setIssuedUser] = useState<SystemUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showFormPassword, setShowFormPassword] = useState(true);
  const [showViewPassword, setShowViewPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [schoolStudents, setSchoolStudents] = useState<SchoolStudentRecord[]>([]);
  const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<SystemUser>>({
    name: "",
    email: "",
    phone: "",
    role: "Teacher",
    classDepartment: "",
    status: "Active",
    password: "",
  });

  useEffect(() => {
    if (currentSchool) {
      syncStaffToSystemUsers(currentSchool.id);
      const { users } = syncStudentsToSystemUsers(currentSchool.id);
      setUsers(users);
      setSchoolStudents(loadSchoolStudentRecords(currentSchool.id));
    }
  }, [currentSchool]);

  const persistUsers = async (updatedUsers: SystemUser[]) => {
    if (!currentSchool) return;
    setUsers(updatedUsers);
    await saveSystemUsersPersisted(currentSchool.id, updatedUsers);
  };

  const showSuccessNotification = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      alert("Could not copy to clipboard.");
    }
  };

  const generateCompliantPassword = () => {
    const minLength = currentSchool ? getPasswordMinLength(currentSchool.id) : 8;
    return generateLoginPassword(Math.max(minLength, 10));
  };

  const assertPasswordPolicy = (password: string): boolean => {
    if (!currentSchool) return true;
    const result = validatePasswordPolicy(currentSchool.id, password);
    if (!result.valid) {
      alert(result.error);
      return false;
    }
    return true;
  };

  const resetForm = (role: SystemUserRole = "Teacher") => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role,
      classDepartment: "",
      status: "Active",
      password: generateCompliantPassword(),
    });
    setLinkedStudentIds([]);
    setShowFormPassword(true);
  };

  const openIssueModal = (role: SystemUserRole = "Teacher") => {
    resetForm(role);
    setShowIssueModal(true);
  };

  const closeIssueModal = () => {
    setShowIssueModal(false);
    resetForm();
  };

  const handleIssueCredentials = () => {
    if (!formData.name?.trim() || !formData.email?.trim() || !formData.role) {
      alert("Please fill in name, login email, and role.");
      return;
    }

    if (!isValidLoginEmail(formData.email)) {
      alert("Please enter a valid login email address (e.g. teacher@gmail.com).");
      return;
    }

    if (!formData.password?.trim()) {
      alert("Please set a login password before issuing credentials.");
      return;
    }

    if (!assertPasswordPolicy(formData.password.trim())) {
      return;
    }

    if (formData.role === "Parent" && linkedStudentIds.length === 0) {
      alert("Select at least one student to link to this parent account.");
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === formData.email!.trim().toLowerCase())) {
      alert("This login email is already issued to another user.");
      return;
    }

    if (formData.role === "Parent" && currentSchool) {
      linkStudentsToParentAccount(currentSchool.id, linkedStudentIds, {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone,
      });
      const { users: syncedUsers } = syncStudentsToSystemUsers(currentSchool.id);
      const parentEmail = formData.email.trim().toLowerCase();
      const parentUser = syncedUsers.find(
        (user) => user.role === "Parent" && user.email.toLowerCase() === parentEmail,
      );

      if (!parentUser) {
        alert("Could not create the parent login. Please try again.");
        return;
      }

      const finalizedUsers = syncedUsers.map((user) =>
        user.id === parentUser.id
          ? {
              ...user,
              name: formData.name!.trim(),
              phone: formData.phone || user.phone,
              password: formData.password!.trim(),
            }
          : user,
      );

      persistUsers(finalizedUsers);
      setSchoolStudents(loadSchoolStudentRecords(currentSchool.id));
      setShowIssueModal(false);
      setIssuedUser(finalizedUsers.find((user) => user.id === parentUser.id) ?? parentUser);
      setShowCredentialsModal(true);
      resetForm("Parent");
      showSuccessNotification(`Parent login linked to ${linkedStudentIds.length} student(s).`);
      return;
    }

    const newUser: SystemUser = {
      id: `user_${Date.now()}`,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone || "",
      role: formData.role as SystemUserRole,
      classDepartment: formData.classDepartment || "",
      status: (formData.status as SystemUserStatus) || "Active",
      password: formData.password.trim(),
      createdAt: new Date().toISOString().split("T")[0],
      credentialsIssuedAt: new Date().toISOString(),
    };

    persistUsers([...users, newUser]);
    setShowIssueModal(false);
    setIssuedUser(newUser);
    setShowCredentialsModal(true);
    resetForm(newUser.role);
    showSuccessNotification(`Login credentials issued to ${newUser.name}.`);
  };

  const handleEditUser = async () => {
    if (!selectedUser || !formData.name?.trim() || !formData.email?.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    if (!isValidLoginEmail(formData.email)) {
      alert("Please enter a valid login email address.");
      return;
    }

    if (
      users.some(
        (u) =>
          u.id !== selectedUser.id &&
          u.email.toLowerCase() === formData.email!.trim().toLowerCase(),
      )
    ) {
      alert("This login email is already used by another account.");
      return;
    }

    if (formData.role === "Parent" && linkedStudentIds.length === 0) {
      alert("Select at least one student to link to this parent account.");
      return;
    }

    if (formData.password?.trim() && !assertPasswordPolicy(formData.password.trim())) {
      return;
    }

    if (formData.role === "Parent" && currentSchool) {
      linkStudentsToParentAccount(currentSchool.id, linkedStudentIds, {
        name: formData.name!.trim(),
        email: formData.email!.trim().toLowerCase(),
        phone: formData.phone,
      });
      const { users: syncedUsers } = syncStudentsToSystemUsers(currentSchool.id);
      const parentEmail = formData.email!.trim().toLowerCase();
      const finalizedUsers = syncedUsers.map((user) =>
        user.role === "Parent" && user.email.toLowerCase() === parentEmail
          ? {
              ...user,
              name: formData.name!.trim(),
              phone: formData.phone || user.phone,
              password: formData.password?.trim() || user.password,
            }
          : user.id === selectedUser.id && user.role !== "Parent"
            ? {
                ...user,
                name: formData.name!.trim(),
                email: formData.email!.trim().toLowerCase(),
                phone: formData.phone || user.phone,
                role: (formData.role as SystemUserRole) || user.role,
                classDepartment: formData.classDepartment || user.classDepartment,
                status: (formData.status as SystemUserStatus) || user.status,
                password: formData.password?.trim() || user.password,
              }
            : user,
      );

      try {
        await persistUsers(finalizedUsers);
        const editedUser = finalizedUsers.find((user) => user.id === selectedUser.id);
        if (editedUser) {
          await syncSystemUserEditsToStaffRecord(currentSchool.id, editedUser);
        }
        setSchoolStudents(loadSchoolStudentRecords(currentSchool.id));
        setShowEditModal(false);
        setSelectedUser(null);
        resetForm();
        showSuccessNotification(`Parent account updated and linked to ${linkedStudentIds.length} student(s).`);
      } catch {
        alert("Could not save account changes. Please try again.");
      }
      return;
    }

    const updatedUsers = users.map((u) =>
      u.id === selectedUser.id
        ? {
            ...u,
            name: formData.name!.trim(),
            email: formData.email!.trim().toLowerCase(),
            phone: formData.phone || u.phone,
            role: (formData.role as SystemUserRole) || u.role,
            classDepartment: formData.classDepartment || u.classDepartment,
            status: (formData.status as SystemUserStatus) || u.status,
            password: formData.password?.trim() || u.password,
          }
        : u,
    );

    const editedUser = updatedUsers.find((user) => user.id === selectedUser.id);
    if (!editedUser || !currentSchool) return;

    try {
      await persistUsers(updatedUsers);
      await syncSystemUserEditsToStaffRecord(currentSchool.id, editedUser);
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      showSuccessNotification(`Login details updated for ${formData.name}.`);
    } catch {
      alert("Could not save account changes. Please try again.");
    }
  };

  const handleReissuePassword = (user: SystemUser) => {
    const newPassword = generateCompliantPassword();
    const updatedUsers = users.map((u) =>
      u.id === user.id
        ? {
            ...u,
            password: newPassword,
            credentialsIssuedAt: new Date().toISOString(),
          }
        : u,
    );
    persistUsers(updatedUsers);
    const updated = updatedUsers.find((u) => u.id === user.id) ?? null;
    setIssuedUser(updated);
    setShowCredentialsModal(true);
    showSuccessNotification(`New password issued for ${user.name}.`);
  };

  const handleDeleteUser = (user: SystemUser) => {
    if (confirm(`Revoke login access for ${user.name}? This will delete their account.`)) {
      persistUsers(users.filter((u) => u.id !== user.id));
      showSuccessNotification(`Login access revoked for ${user.name}.`);
    }
  };

  const openEditModal = (user: SystemUser) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      classDepartment: user.classDepartment,
      status: user.status,
      password: user.password,
    });
    if (user.role === "Parent" && currentSchool) {
      setLinkedStudentIds(resolveLinkedStudentIds(currentSchool.id, user));
    } else {
      setLinkedStudentIds([]);
    }
    setShowEditModal(true);
  };

  const openViewModal = (user: SystemUser) => {
    setSelectedUser(user);
    setShowViewPassword(false);
    setShowViewModal(true);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole =
        selectedRoleFilter === "all" ||
        user.role.toLowerCase() === selectedRoleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRoleFilter]);

  const credentialStats = useMemo(
    () => ({
      teachers: users.filter((u) => u.role === "Teacher").length,
      students: users.filter((u) => u.role === "Student").length,
      parents: users.filter((u) => u.role === "Parent").length,
      active: users.filter((u) => u.status === "Active").length,
    }),
    [users],
  );

  return (
    <div className="space-y-8">
      <div className="surface-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-label mb-1">Admin</p>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle mt-1">
              Issue login email and password credentials to teachers, students, parents, accountants, and librarians.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {credentialRoles.map((role) => (
              <button
                key={role}
                onClick={() => openIssueModal(role)}
                className="btn-primary inline-flex items-center justify-center gap-2 px-3 py-2 text-sm sm:px-4 sm:text-base"
              >
                <KeyRound className="h-4 w-4 shrink-0" />
                <span className="truncate">Issue {role} Login</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>How login works:</strong> Create an account here with a Gmail/login email and password.
          Share those credentials with the user. They will sign in on the school login page using that email and password.
        </p>
      </div>

      {showSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className="surface-card p-3 md:p-4">
          <p className="text-[11px] font-semibold uppercase text-emerald-600 md:text-xs">Teacher Logins</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 md:mt-2 md:text-3xl">{credentialStats.teachers}</p>
        </div>
        <div className="surface-card p-3 md:p-4">
          <p className="text-[11px] font-semibold uppercase text-blue-600 md:text-xs">Student Logins</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 md:mt-2 md:text-3xl">{credentialStats.students}</p>
        </div>
        <div className="surface-card p-3 md:p-4">
          <p className="text-[11px] font-semibold uppercase text-purple-600 md:text-xs">Parent Logins</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 md:mt-2 md:text-3xl">{credentialStats.parents}</p>
        </div>
        <div className="surface-card p-3 md:p-4">
          <p className="text-[11px] font-semibold uppercase text-slate-500 md:text-xs">Active Accounts</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 md:mt-2 md:text-3xl">{credentialStats.active}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or login email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={selectedRoleFilter}
          onChange={(e) => setSelectedRoleFilter(e.target.value)}
          className="input-field md:w-48"
        >
          {userRoleFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => openIssueModal("Teacher")}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 md:w-auto md:py-2"
        >
          <Plus className="h-4 w-4" />
          Issue Login Credentials
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:bg-slate-800">
        {filteredUsers.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500 md:px-6">
            No login accounts issued yet. Use &quot;Issue Login Credentials&quot; to create one.
          </div>
        ) : (
          <>
            <div className="md:hidden">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Tap <span className="font-semibold text-slate-700 dark:text-slate-200">Assign / Edit</span> to set role, class, or linked student.
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredUsers.map((user) => {
                const classDepartment =
                  user.role === "Parent" && currentSchool
                    ? buildParentClassDepartment(
                        getLinkedStudentsForParent(currentSchool.id, user),
                      ) ||
                      user.classDepartment ||
                      "—"
                    : user.classDepartment || "—";

                return (
                  <div key={user.id} className="space-y-3 p-4">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900 dark:text-slate-50">
                        {user.name}
                      </p>
                      <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-400">
                        {user.email}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getRoleBadgeClass(user.role)}`}
                      >
                        {user.role}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          user.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.status}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Class / Department</p>
                      <p className="mt-0.5 break-words text-sm text-slate-700 dark:text-slate-300">
                        {classDepartment}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        <Edit className="h-4 w-4 shrink-0" />
                        Assign / Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openViewModal(user)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Eye className="h-4 w-4 shrink-0" />
                        View
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleReissuePassword(user)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                        Reissue Password
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        Revoke Access
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Name</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Login Email</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Role</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Class/Department</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Status</th>
              <th className="px-6 py-3 text-right font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                  <td className="px-6 py-4 text-slate-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(user.role)}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {user.role === "Parent" && currentSchool
                      ? buildParentClassDepartment(
                          getLinkedStudentsForParent(currentSchool.id, user),
                        ) ||
                        user.classDepartment ||
                        "—"
                      : user.classDepartment || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        user.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="flex justify-end gap-1 px-6 py-4">
                    <button
                      onClick={() => openViewModal(user)}
                      className="rounded p-2 hover:bg-slate-100"
                      title="View credentials"
                    >
                      <Eye className="h-4 w-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleReissuePassword(user)}
                      className="rounded p-2 hover:bg-slate-100"
                      title="Reissue password"
                    >
                      <RefreshCw className="h-4 w-4 text-amber-600" />
                    </button>
                    <button
                      onClick={() => openEditModal(user)}
                      className="rounded p-2 hover:bg-slate-100"
                      title="Edit account"
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="rounded p-2 hover:bg-slate-100"
                      title="Revoke access"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
            </div>
          </>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">Account Types</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {rolesConfig.map((role) => (
            <div key={role.label} className="surface-card p-4">
              <h3 className="mb-2 font-bold text-slate-900">{role.label}</h3>
              <p className="mb-3 text-sm text-slate-600">{role.description}</p>
              <span className="text-xs text-slate-500">{role.permissions} permissions</span>
            </div>
          ))}
        </div>
      </div>

      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4">
          <div className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:max-h-[90vh] md:rounded-2xl">
            <div className="sticky top-0 flex shrink-0 items-start justify-between border-b border-slate-200 bg-white p-4 md:p-6">
              <div className="min-w-0 pr-3">
                <h3 className="text-xl font-bold text-slate-900 md:text-2xl">Issue Login Credentials</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Create the Gmail/login email and password this user will use to sign in.
                </p>
              </div>
              <button onClick={closeIssueModal} className="shrink-0 rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-w-0 overflow-y-auto">
            <div className="space-y-4 p-4 md:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    <User className="mr-2 inline h-4 w-4" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    <Mail className="mr-2 inline h-4 w-4" />
                    Login Email (Gmail) *
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@gmail.com"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    <Shield className="mr-2 inline h-4 w-4" />
                    Account Type *
                  </label>
                  <select
                    value={formData.role || "Teacher"}
                    onChange={(e) => {
                      const role = e.target.value as SystemUserRole;
                      setFormData({ ...formData, role });
                      if (role !== "Parent") {
                        setLinkedStudentIds([]);
                      }
                    }}
                    className="input-field"
                  >
                    {assignableSystemRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.role === "Parent" ? (
                  <ParentStudentLinker
                    students={schoolStudents}
                    linkedStudentIds={linkedStudentIds}
                    onLinkedStudentIdsChange={setLinkedStudentIds}
                  />
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      {getClassDepartmentLabel(formData.role as SystemUserRole)}
                    </label>
                    <input
                      type="text"
                      value={formData.classDepartment || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, classDepartment: e.target.value })
                      }
                      placeholder={
                        formData.role === "Student"
                          ? "Grade 7B"
                          : "Mathematics"
                      }
                      className="input-field"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    <Phone className="mr-2 inline h-4 w-4" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+233 24 123 4567"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Status</label>
                  <select
                    value={formData.status || "Active"}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as SystemUserStatus })
                    }
                    className="input-field"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    <KeyRound className="mr-2 inline h-4 w-4" />
                    Login Password *
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type={showFormPassword ? "text" : "password"}
                      value={formData.password || ""}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Set login password"
                      className="input-field flex-1"
                    />
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowFormPassword((v) => !v)}
                      className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50"
                    >
                      {showFormPassword ? <EyeOff className="mx-auto h-4 w-4" /> : <Eye className="mx-auto h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, password: generateCompliantPassword() })
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                    >
                      Generate
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 p-4 md:flex-row md:justify-end md:gap-3 md:p-6">
              <button
                onClick={closeIssueModal}
                className="w-full rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 md:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueCredentials}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 md:w-auto"
              >
                <Save className="h-5 w-5" />
                Issue Credentials
              </button>
            </div>
          </div>
        </div>
      )}

      {showCredentialsModal && issuedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Credentials Issued</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Share these login details with {issuedUser.name}.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setIssuedUser(null);
                }}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-emerald-700">Login Email</p>
                  <p className="font-semibold text-slate-900">{issuedUser.email}</p>
                </div>
                <button
                  onClick={() => copyText("email", issuedUser.email)}
                  className="rounded-lg border border-emerald-200 bg-white p-2 hover:bg-emerald-100"
                >
                  <Copy className="h-4 w-4 text-emerald-700" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-emerald-700">Password</p>
                  <p className="font-semibold text-slate-900">{issuedUser.password}</p>
                </div>
                <button
                  onClick={() => copyText("password", issuedUser.password)}
                  className="rounded-lg border border-emerald-200 bg-white p-2 hover:bg-emerald-100"
                >
                  <Copy className="h-4 w-4 text-emerald-700" />
                </button>
              </div>
              <div>
                <p className="text-xs uppercase text-emerald-700">Role</p>
                <p className="font-semibold text-slate-900">{issuedUser.role}</p>
              </div>
            </div>

            {copiedField && (
              <p className="mt-3 text-sm text-emerald-700">
                {copiedField === "all" ? "All credentials copied." : `${copiedField} copied.`}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() =>
                  copyText("all", formatCredentialsText(issuedUser, currentSchool?.name))
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                <ClipboardCopy className="h-4 w-4" />
                Copy All
              </button>
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setIssuedUser(null);
                }}
                className="btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4">
          <div className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:max-h-[90vh] md:rounded-2xl">
            <div className="sticky top-0 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white p-4 md:p-6">
              <h3 className="text-xl font-bold text-slate-900 md:text-2xl">Assign / Edit Account</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  resetForm();
                }}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-w-0 overflow-y-auto">
            <div className="space-y-4 p-4 md:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Login Email (Gmail) *
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Account Type</label>
                  <select
                    value={formData.role || "Student"}
                    onChange={(e) => {
                      const role = e.target.value as SystemUserRole;
                      setFormData({ ...formData, role });
                      if (role !== "Parent") {
                        setLinkedStudentIds([]);
                      }
                    }}
                    className="input-field"
                  >
                    {assignableSystemRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Status</label>
                  <select
                    value={formData.status || "Active"}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as SystemUserStatus })
                    }
                    className="input-field"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                {formData.role === "Parent" ? (
                  <ParentStudentLinker
                    students={schoolStudents}
                    linkedStudentIds={linkedStudentIds}
                    onLinkedStudentIdsChange={setLinkedStudentIds}
                  />
                ) : (
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      {getClassDepartmentLabel(formData.role as SystemUserRole)}
                    </label>
                    <input
                      type="text"
                      value={formData.classDepartment || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, classDepartment: e.target.value })
                      }
                      placeholder={
                        formData.role === "Student"
                          ? "Grade 7B"
                          : "Mathematics"
                      }
                      className="input-field"
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">Login Password</label>
                  <input
                    type="text"
                    value={formData.password || ""}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 p-4 md:flex-row md:justify-end md:gap-3 md:p-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  resetForm();
                }}
                className="w-full rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 md:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 md:w-auto"
              >
                <Save className="h-5 w-5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4">
          <div className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-4 md:p-6">
              <h3 className="text-xl font-bold text-slate-900 md:text-2xl">Login Credentials</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedUser(null);
                }}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-w-0 overflow-y-auto">
            <div className="space-y-4 p-4 md:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="font-semibold text-slate-900">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Login Email</p>
                  <p className="font-semibold text-slate-900">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Password</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {showViewPassword ? selectedUser.password : "••••••••"}
                    </p>
                    <button
                      onClick={() => setShowViewPassword((v) => !v)}
                      className="rounded p-1 hover:bg-slate-100"
                    >
                      {showViewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Role</p>
                  <p className="font-semibold text-slate-900">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">
                    {selectedUser.role === "Parent" ? "Linked Student / Child" : "Class/Department"}
                  </p>
                  <p className="font-semibold text-slate-900">
                    {selectedUser.role === "Parent" && currentSchool
                      ? buildParentClassDepartment(
                          getLinkedStudentsForParent(currentSchool.id, selectedUser),
                        ) ||
                        selectedUser.classDepartment ||
                        "—"
                      : selectedUser.classDepartment || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Last Login</p>
                  <p className="font-semibold text-slate-900">
                    {selectedUser.lastLogin ? formatDateTime(selectedUser.lastLogin) : "Never"}
                  </p>
                </div>
              </div>
            </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 p-4 md:flex-row md:justify-end md:gap-3 md:p-6">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(selectedUser);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 md:hidden"
              >
                <Edit className="h-4 w-4" />
                Assign / Edit
              </button>
              <button
                onClick={() =>
                  copyText("all", formatCredentialsText(selectedUser, currentSchool?.name))
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 md:w-auto md:py-2"
              >
                <ClipboardCopy className="h-4 w-4" />
                Copy Credentials
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedUser(null);
                }}
                className="btn-primary w-full md:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
