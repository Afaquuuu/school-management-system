"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Eye, X, Save, CheckCircle, Mail, Phone, User, Shield } from "lucide-react";
import { useSchool, getScopedItem, setScopedItem } from "@/lib/school-context";

type UserRole = "Student" | "Teacher" | "Parent" | "Admin";
type UserStatus = "Active" | "Inactive" | "On Leave" | "Suspended";

type SystemUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  classDepartment: string;
  status: UserStatus;
  password: string;
  createdAt: string;
  lastLogin?: string;
};

const sampleUsers: SystemUser[] = [
  { id: "1", name: "Ama Johnson", email: "ama@school.edu", phone: "+233 24 123 4567", role: "Student", classDepartment: "Grade 8A", status: "Active", password: "password123", createdAt: "2024-01-15" },
  { id: "2", name: "David Mensah", email: "david@school.edu", phone: "+233 24 234 5678", role: "Student", classDepartment: "Grade 9B", status: "Active", password: "password123", createdAt: "2024-01-16" },
  { id: "3", name: "A. Mensah", email: "a.mensah@school.edu", phone: "+233 24 345 6789", role: "Teacher", classDepartment: "Math", status: "Active", password: "password123", createdAt: "2024-01-10" },
  { id: "4", name: "S. Okafor", email: "s.okafor@school.edu", phone: "+233 24 456 7890", role: "Teacher", classDepartment: "English", status: "On Leave", password: "password123", createdAt: "2024-01-11" },
  { id: "5", name: "Principal Dr. K. Osei", email: "principal@school.edu", phone: "+233 24 567 8901", role: "Admin", classDepartment: "System", status: "Active", password: "admin123", createdAt: "2024-01-01" },
];

const rolesConfig = [
  { label: "Student", description: "Can view grades, attendance, messages", permissions: 5 },
  { label: "Teacher", description: "Can manage classes, attendance, marks", permissions: 12 },
  { label: "Parent", description: "Can view child's progress and reports", permissions: 4 },
  { label: "Admin", description: "Full system control", permissions: 28 },
];

export default function UsersPage() {
  const { currentSchool } = useSchool();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Form state
  const [formData, setFormData] = useState<Partial<SystemUser>>({
    name: "",
    email: "",
    phone: "",
    role: "Student",
    classDepartment: "",
    status: "Active",
    password: "",
  });

  // Load users from localStorage
  useEffect(() => {
    if (currentSchool) {
      const stored = getScopedItem(currentSchool.id, 'system_users');
      if (stored) {
        setUsers(JSON.parse(stored));
      } else {
        // Initialize with sample data
        setUsers(sampleUsers);
        setScopedItem(currentSchool.id, 'system_users', JSON.stringify(sampleUsers));
      }
    }
  }, [currentSchool]);

  // Save users to localStorage
  const saveUsers = (updatedUsers: SystemUser[]) => {
    if (currentSchool) {
      setUsers(updatedUsers);
      setScopedItem(currentSchool.id, 'system_users', JSON.stringify(updatedUsers));
    }
  };

  const showSuccessNotification = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAddUser = () => {
    if (!formData.name || !formData.email || !formData.role) {
      alert("Please fill in all required fields");
      return;
    }

    // Check for duplicate email
    if (users.some(u => u.email.toLowerCase() === formData.email?.toLowerCase())) {
      alert("Email already exists");
      return;
    }

    const newUser: SystemUser = {
      id: `user_${Date.now()}`,
      name: formData.name!,
      email: formData.email!,
      phone: formData.phone || "",
      role: formData.role as UserRole,
      classDepartment: formData.classDepartment || "",
      status: formData.status as UserStatus || "Active",
      password: formData.password || "password123",
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);
    
    setShowAddModal(false);
    resetForm();
    showSuccessNotification(`User ${newUser.name} added successfully!`);
  };

  const handleEditUser = () => {
    if (!selectedUser || !formData.name || !formData.email) {
      alert("Please fill in all required fields");
      return;
    }

    // Check for duplicate email (excluding current user)
    if (users.some(u => u.id !== selectedUser.id && u.email.toLowerCase() === formData.email?.toLowerCase())) {
      alert("Email already exists");
      return;
    }

    const updatedUsers = users.map(u =>
      u.id === selectedUser.id
        ? {
            ...u,
            name: formData.name!,
            email: formData.email!,
            phone: formData.phone || u.phone,
            role: formData.role as UserRole || u.role,
            classDepartment: formData.classDepartment || u.classDepartment,
            status: formData.status as UserStatus || u.status,
            password: formData.password || u.password,
          }
        : u
    );

    saveUsers(updatedUsers);
    setShowEditModal(false);
    setSelectedUser(null);
    resetForm();
    showSuccessNotification(`User ${formData.name} updated successfully!`);
  };

  const handleDeleteUser = (user: SystemUser) => {
    if (confirm(`Delete user ${user.name}?`)) {
      const updatedUsers = users.filter(u => u.id !== user.id);
      saveUsers(updatedUsers);
      showSuccessNotification(`User ${user.name} deleted successfully!`);
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
    setShowViewModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "Student",
      classDepartment: "",
      status: "Active",
      password: "",
    });
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    resetForm();
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedUser(null);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRoleFilter === "all" || user.role.toLowerCase() === selectedRoleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRoleFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">User Management</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Add, edit, and manage users across all roles</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      {/* Success Notification */}
      {showSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-semibold text-green-900 dark:text-green-50">Success</p>
            <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select 
          value={selectedRoleFilter}
          onChange={(e) => setSelectedRoleFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="parent">Parents</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Name</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Email</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Role</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Class/Department</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Status</th>
              <th className="px-6 py-3 text-right font-semibold text-slate-900 dark:text-slate-50">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <td className="px-6 py-4 text-slate-900 dark:text-slate-50 font-medium">{user.name}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.role === "Student"
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                        : user.role === "Teacher"
                        ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
                        : user.role === "Parent"
                        ? "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                        : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.classDepartment}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      user.status === "Active"
                        ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                        : user.status === "On Leave"
                        ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                        : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex gap-2 justify-end">
                    <button 
                      onClick={() => openViewModal(user)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" 
                      title="View"
                    >
                      <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button 
                      onClick={() => openEditModal(user)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" 
                      title="Edit"
                    >
                      <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" 
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Roles Configuration */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">Role Permissions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rolesConfig.map((role) => (
            <div key={role.label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-2">{role.label}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{role.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-500">{role.permissions} permissions</span>
                <button className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-semibold">Configure</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Add New User</h3>
              <button onClick={closeAddModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john@school.edu"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+233 24 123 4567"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <Shield className="w-4 h-4 inline mr-2" />
                    Role *
                  </label>
                  <select
                    value={formData.role || "Student"}
                    onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Parent">Parent</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Class/Department
                  </label>
                  <input
                    type="text"
                    value={formData.classDepartment || ""}
                    onChange={(e) => setFormData({...formData, classDepartment: e.target.value})}
                    placeholder="Grade 8A or Math Dept"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status || "Active"}
                    onChange={(e) => setFormData({...formData, status: e.target.value as UserStatus})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password || ""}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={closeAddModal}
                className="px-6 py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Edit User</h3>
              <button onClick={closeEditModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <Shield className="w-4 h-4 inline mr-2" />
                    Role *
                  </label>
                  <select
                    value={formData.role || "Student"}
                    onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Parent">Parent</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Class/Department
                  </label>
                  <input
                    type="text"
                    value={formData.classDepartment || ""}
                    onChange={(e) => setFormData({...formData, classDepartment: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status || "Active"}
                    onChange={(e) => setFormData({...formData, status: e.target.value as UserStatus})}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={closeEditModal}
                className="px-6 py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">User Details</h3>
              <button onClick={closeViewModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Name</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedUser.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Role</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Class/Department</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedUser.classDepartment}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedUser.status}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Created At</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedUser.createdAt}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Last Login</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedUser.lastLogin || "Never"}</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={closeViewModal}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-50 rounded-xl font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
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
