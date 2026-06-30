"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  Briefcase,
  Phone,
  User,
  BookOpen,
  X,
  UserCheck,
  Clock,
  GraduationCap,
  Shield,
  DollarSign,
} from "lucide-react";
import { useSchool, getScopedItem, setScopedItem } from "@/lib/school-context";
import { syncStaffToSystemUsers } from "@/lib/system-users";
import { getUserSession } from "@/lib/teacher-check-in";
import { exportTableData, slugifyFileName } from "@/lib/export-data";
import { AlertCircle } from "lucide-react";
import {
  RecordFormSection,
  RecordFormShell,
  recordFormFieldInput,
  recordFormFieldInputAccent,
  recordFormFieldLabel,
} from "@/components/ui/record-form-layout";

type StaffStatus = "active" | "inactive" | "on_leave" | "terminated";
type StaffRole = "teacher" | "admin" | "librarian" | "accountant" | "support";
type Gender = "male" | "female" | "other";

type Staff = {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  email: string;
  phone: string;
  address: string;
  role: StaffRole;
  department: string;
  qualification: string;
  experience: string;
  joiningDate: string;
  salary: string;
  status: StaffStatus;
  emergencyContact: string;
  emergencyPhone: string;
};

const statusConfig: Record<StaffStatus, { color: string; label: string }> = {
  active: { color: "bg-green-100 text-green-700 border-green-200", label: "Active" },
  inactive: { color: "bg-gray-100 text-gray-700 border-gray-200", label: "Inactive" },
  on_leave: { color: "bg-orange-100 text-orange-700 border-orange-200", label: "On Leave" },
  terminated: { color: "bg-red-100 text-red-700 border-red-200", label: "Terminated" },
};

const roleConfig: Record<StaffRole, { color: string; label: string; icon: any }> = {
  teacher: { color: "bg-blue-100 text-blue-700", label: "Teacher", icon: GraduationCap },
  admin: { color: "bg-purple-100 text-purple-700", label: "Admin", icon: Shield },
  librarian: { color: "bg-emerald-100 text-emerald-700", label: "Librarian", icon: BookOpen },
  accountant: { color: "bg-amber-100 text-amber-700", label: "Accountant", icon: DollarSign },
  support: { color: "bg-slate-100 text-slate-700", label: "Support", icon: Users },
};

export default function StaffPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentSchool } = useSchool();
  const isAddMode = searchParams.get("action") === "add";
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  // Load staff from scoped localStorage when the school is available
  const [staff, setStaff] = useState<Staff[]>([]);

  useEffect(() => {
    if (!currentSchool) {
      setStaff([]);
      return;
    }

    try {
      const stored = getScopedItem(currentSchool.id, "school_staff");
      setStaff(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error("Error loading staff from localStorage:", error);
      setStaff([]);
    }
  }, [currentSchool]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<Partial<Staff>>({});

  const closeAddForm = () => {
    setFormData({});
    router.push("/staff");
  };

  const openAddForm = () => {
    router.push("/staff?action=add");
  };

  // Save staff to scoped localStorage whenever they change
  const updateStaff = (newStaff: Staff[]) => {
    setStaff(newStaff);
    if (typeof window !== 'undefined' && currentSchool) {
      try {
        setScopedItem(currentSchool.id, 'school_staff', JSON.stringify(newStaff));
        syncStaffToSystemUsers(currentSchool.id);
      } catch (error) {
        console.error('Error saving staff to localStorage:', error);
      }
    }
  };

  const filteredStaff = useMemo(() => 
    staff.filter((member) => {
      const matchesSearch = 
        member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "all" || member.role === filterRole;
      const matchesDepartment = filterDepartment === "all" || member.department === filterDepartment;
      const matchesStatus = filterStatus === "all" || member.status === filterStatus;
      return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
    }),
    [staff, searchTerm, filterRole, filterDepartment, filterStatus]
  );

  const handleExportStaff = () => {
    const exported = exportTableData(
      `staff-${slugifyFileName(currentSchool?.name ?? "school")}`,
      [
        { header: "Staff ID", value: (member) => member.staffId },
        { header: "First Name", value: (member) => member.firstName },
        { header: "Last Name", value: (member) => member.lastName },
        { header: "Role", value: (member) => roleConfig[member.role].label },
        { header: "Department", value: (member) => member.department },
        { header: "Email", value: (member) => member.email },
        { header: "Phone", value: (member) => member.phone },
        { header: "Qualification", value: (member) => member.qualification },
        { header: "Experience", value: (member) => member.experience },
        { header: "Joining Date", value: (member) => member.joiningDate },
        { header: "Status", value: (member) => statusConfig[member.status].label },
      ],
      filteredStaff,
    );

    if (!exported) {
      alert("No staff records to export for the current filters.");
    }
  };

  const stats = useMemo(() => ({
    total: staff.length,
    active: staff.filter(s => s.status === "active").length,
    onLeave: staff.filter(s => s.status === "on_leave").length,
    teachers: staff.filter(s => s.role === "teacher").length,
  }), [staff]);

  const departments = useMemo(() => 
    Array.from(new Set(staff.map(s => s.department))).sort(),
    [staff]
  );

  useEffect(() => {
    const session = getUserSession();
    setIsAdmin(session?.role === "admin");
  }, []);

  const handleAddStaff = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert("Please fill in all required fields");
      return;
    }

    const newStaff: Staff = {
      id: Date.now().toString(),
      staffId: `STF${String(staff.length + 1).padStart(3, '0')}`,
      firstName: formData.firstName,
      lastName: formData.lastName,
      dateOfBirth: formData.dateOfBirth || "",
      gender: formData.gender || "male",
      email: formData.email,
      phone: formData.phone || "",
      address: formData.address || "",
      role: formData.role || "teacher",
      department: formData.department || "",
      qualification: formData.qualification || "",
      experience: formData.experience || "",
      joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
      salary: formData.salary || "",
      status: formData.status || "active",
      emergencyContact: formData.emergencyContact || "",
      emergencyPhone: formData.emergencyPhone || "",
    };

    updateStaff([...staff, newStaff]);
    setFormData({});
    alert("Staff member added successfully!");
    router.push("/staff");
  };

  const handleDeleteStaff = (staffId: string) => {
    if (confirm("Are you sure you want to delete this staff member?")) {
      updateStaff(staff.filter(s => s.id !== staffId));
      alert("Staff member deleted successfully!");
    }
  };

  if (isAdmin === false) {
    return (
      <div className="surface-card p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h1 className="page-title">Admin Access Required</h1>
        <p className="page-subtitle mt-2">
          Staff records can only be managed by administrators.
        </p>
      </div>
    );
  }

  if (isAddMode) {
    return (
      <RecordFormShell
        accent="purple"
        eyebrow="Staff"
        title="Add New Staff Member"
        description="Create a staff profile with contact details, role, and department assignment."
        icon={UserPlus}
        onClose={closeAddForm}
        onSubmit={handleAddStaff}
        submitLabel="Save Staff Member"
      >
        <RecordFormSection
          title="Personal Information"
          description="Identity and contact details for the staff member."
          icon={User}
        >
          <div>
            <label className={recordFormFieldLabel}>First Name *</label>
            <input
              type="text"
              value={formData.firstName || ""}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Enter first name"
              className={`${recordFormFieldInput} ${recordFormFieldInputAccent.purple}`}
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Last Name *</label>
            <input
              type="text"
              value={formData.lastName || ""}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Enter last name"
              className={`${recordFormFieldInput} ${recordFormFieldInputAccent.purple}`}
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Email *</label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="staff@school.edu"
              className={`${recordFormFieldInput} ${recordFormFieldInputAccent.purple}`}
            />
          </div>
          <div>
            <label className={recordFormFieldLabel}>Phone</label>
            <input
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+233 XX XXX XXXX"
              className={`${recordFormFieldInput} ${recordFormFieldInputAccent.purple}`}
            />
          </div>
        </RecordFormSection>

        <RecordFormSection
          title="Role & Department"
          description="Employment role and organizational placement."
          icon={Briefcase}
        >
          <div>
            <label className={recordFormFieldLabel}>Role</label>
            <select
              value={formData.role || "teacher"}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
              className={`${recordFormFieldInput} ${recordFormFieldInputAccent.purple}`}
            >
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
              <option value="librarian">Librarian</option>
              <option value="accountant">Accountant</option>
              <option value="support">Support</option>
            </select>
          </div>
          <div>
            <label className={recordFormFieldLabel}>Department</label>
            <input
              type="text"
              value={formData.department || ""}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g. Mathematics, Administration"
              className={`${recordFormFieldInput} ${recordFormFieldInputAccent.purple}`}
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
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Staff Management</h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 ml-14">
                Manage teacher and staff records, class assignments, access roles, and employment status
              </p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium">
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={handleExportStaff}
                className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-medium"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={openAddForm}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-5 py-2.5 rounded-xl transition-all font-medium shadow-lg shadow-purple-500/30"
              >
                <UserPlus className="w-4 h-4" />
                Add Staff
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Staff</span>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-1">{stats.total}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Employed staff</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Active Staff</span>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-1">{stats.active}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Currently working</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">On Leave</span>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-1">{stats.onLeave}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Temporary absence</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Teachers</span>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:scale-110 transition-transform">
                <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-1">{stats.teachers}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Teaching staff</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, staff ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-medium"
              >
                <option value="all">All Roles</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
                <option value="librarian">Librarian</option>
                <option value="accountant">Accountant</option>
                <option value="support">Support</option>
              </select>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-medium"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-medium"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Staff Member</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Staff ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Experience</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">No staff members found</h3>
                      <p className="text-slate-600 dark:text-slate-400">Try adjusting your search or filter criteria</p>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => {
                    const RoleIcon = roleConfig[member.role].icon;
                    return (
                      <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                              {member.firstName[0]}{member.lastName[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-50">{member.firstName} {member.lastName}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{member.staffId}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${roleConfig[member.role].color} text-sm font-semibold rounded-lg`}>
                            <RoleIcon className="w-3.5 h-3.5" />
                            {roleConfig[member.role].label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{member.department}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700 dark:text-slate-300">{member.experience}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border-2 ${statusConfig[member.status].color}`}>
                            {statusConfig[member.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDeleteStaff(member.id)}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
