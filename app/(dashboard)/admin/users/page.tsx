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
  credentialRoles,
  formatCredentialsText,
  generateLoginPassword,
  getClassDepartmentLabel,
  isValidLoginEmail,
  loadSystemUsers,
  saveSystemUsers,
  syncStaffToSystemUsers,
  type SystemUser,
  type SystemUserRole,
  type SystemUserStatus,
} from "@/lib/system-users";
import { formatDateTime } from "@/lib/date-format";

const rolesConfig = [
  { label: "Student", description: "Receives login to view own grades and attendance", permissions: 5 },
  { label: "Teacher", description: "Receives login for classes, attendance, and check-in", permissions: 12 },
  { label: "Parent", description: "Receives login to view child's progress and reports", permissions: 4 },
  { label: "Admin", description: "Full system control including credential issuance", permissions: 28 },
];

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
      setUsers(syncStaffToSystemUsers(currentSchool.id));
    }
  }, [currentSchool]);

  const persistUsers = (updatedUsers: SystemUser[]) => {
    if (currentSchool) {
      setUsers(updatedUsers);
      saveSystemUsers(currentSchool.id, updatedUsers);
    }
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

  const resetForm = (role: SystemUserRole = "Teacher") => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role,
      classDepartment: "",
      status: "Active",
      password: generateLoginPassword(),
    });
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

    if (users.some((u) => u.email.toLowerCase() === formData.email!.trim().toLowerCase())) {
      alert("This login email is already issued to another user.");
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

  const handleEditUser = () => {
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

    persistUsers(updatedUsers);
    setShowEditModal(false);
    setSelectedUser(null);
    resetForm();
    showSuccessNotification(`Login details updated for ${formData.name}.`);
  };

  const handleReissuePassword = (user: SystemUser) => {
    const newPassword = generateLoginPassword();
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
              Issue login email and password credentials to teachers, students, and parents.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {credentialRoles.map((role) => (
              <button
                key={role}
                onClick={() => openIssueModal(role)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <KeyRound className="h-4 w-4" />
                Issue {role} Login
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

      <div className="grid gap-4 md:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-emerald-600">Teacher Logins</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{credentialStats.teachers}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-blue-600">Student Logins</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{credentialStats.students}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-purple-600">Parent Logins</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{credentialStats.parents}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Active Accounts</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{credentialStats.active}</p>
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
          <option value="all">All Roles</option>
          <option value="teacher">Teachers</option>
          <option value="student">Students</option>
          <option value="parent">Parents</option>
          <option value="admin">Admins</option>
        </select>
        <button
          onClick={() => openIssueModal("Teacher")}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Issue Login Credentials
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
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
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No login accounts issued yet. Use &quot;Issue Login Credentials&quot; to create one.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                  <td className="px-6 py-4 text-slate-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        user.role === "Student"
                          ? "bg-blue-100 text-blue-800"
                          : user.role === "Teacher"
                            ? "bg-emerald-100 text-emerald-800"
                            : user.role === "Parent"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{user.classDepartment || "—"}</td>
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
              ))
            )}
          </tbody>
        </table>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Issue Login Credentials</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Create the Gmail/login email and password this user will use to sign in.
                </p>
              </div>
              <button onClick={closeIssueModal} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
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
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as SystemUserRole })
                    }
                    className="input-field"
                  >
                    <option value="Teacher">Teacher</option>
                    <option value="Student">Student</option>
                    <option value="Parent">Parent</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

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
                        : formData.role === "Parent"
                          ? "Child name or class"
                          : "Mathematics"
                    }
                    className="input-field"
                  />
                </div>

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
                  <div className="flex gap-2">
                    <input
                      type={showFormPassword ? "text" : "password"}
                      value={formData.password || ""}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Set login password"
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword((v) => !v)}
                      className="rounded-lg border border-slate-300 px-3 hover:bg-slate-50"
                    >
                      {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, password: generateLoginPassword() })
                      }
                      className="rounded-lg border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-6">
              <button
                onClick={closeIssueModal}
                className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueCredentials}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-6">
              <h3 className="text-2xl font-bold text-slate-900">Edit Login Account</h3>
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

            <div className="space-y-4 p-6">
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
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as SystemUserRole })
                    }
                    className="input-field"
                  >
                    <option value="Teacher">Teacher</option>
                    <option value="Student">Student</option>
                    <option value="Parent">Parent</option>
                    <option value="Admin">Admin</option>
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

            <div className="flex justify-end gap-3 border-t border-slate-200 p-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  resetForm();
                }}
                className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                <Save className="h-5 w-5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h3 className="text-2xl font-bold text-slate-900">Login Credentials</h3>
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

            <div className="space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
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
                  <p className="text-sm text-slate-500">Class/Department</p>
                  <p className="font-semibold text-slate-900">
                    {selectedUser.classDepartment || "—"}
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

            <div className="flex justify-end gap-3 border-t border-slate-200 p-6">
              <button
                onClick={() =>
                  copyText("all", formatCredentialsText(selectedUser, currentSchool?.name))
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                <ClipboardCopy className="h-4 w-4" />
                Copy Credentials
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedUser(null);
                }}
                className="btn-primary"
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
