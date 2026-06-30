"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSchool } from "@/lib/school-context";
import {
  createInitialAdminUser,
  isValidLoginEmail,
} from "@/lib/system-users";
import { establishUserSession } from "@/lib/teacher-check-in";
import { Building2, ArrowRight, School, CheckCircle, Shield, Eye, EyeOff } from "lucide-react";

export default function SchoolAuthPage() {
  const router = useRouter();
  const { schools, addSchool, setCurrentSchool } = useSchool();
  const [mode, setMode] = useState<"select" | "register">("select");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      alert("Please fill in school name and email");
      return;
    }

    if (!formData.adminName.trim() || !formData.adminEmail.trim() || !formData.adminPassword) {
      alert("Please set up the principal / admin account.");
      return;
    }

    if (!isValidLoginEmail(formData.adminEmail)) {
      alert("Please enter a valid admin login email.");
      return;
    }

    if (formData.adminPassword.length < 6) {
      alert("Admin password must be at least 6 characters.");
      return;
    }

    if (formData.adminPassword !== formData.confirmPassword) {
      alert("Admin passwords do not match.");
      return;
    }

    const newSchool = addSchool({
      name: formData.name,
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
    });

    setCurrentSchool(newSchool);

    const adminUser = createInitialAdminUser(newSchool.id, {
      name: formData.adminName,
      email: formData.adminEmail,
      password: formData.adminPassword,
      phone: formData.phone,
    });

    establishUserSession(adminUser, newSchool.id);
    window.location.href = "/admin";
  };

  const handleSelectSchool = (schoolId: string) => {
    const school = schools.find((s) => s.id === schoolId);
    if (school) {
      setCurrentSchool(school);
      router.push("/login");
    }
  };

  return (
    <div className="auth-shell flex items-center justify-center">
      <div className="grid w-full max-w-6xl grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col justify-center space-y-6 text-center lg:text-left">
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-3 shadow-lg shadow-blue-600/20">
              <School className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="section-label mb-1">Enterprise Platform</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                School Management
              </h1>
            </div>
          </div>

          <p className="text-lg leading-relaxed text-slate-600">
            Complete school operations platform for modern educational institutions.
          </p>

          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            {[
              "Student & Staff Management",
              "Attendance Tracking",
              "Exam & Marks Management",
              "Performance Analytics",
              "Finance Management",
              "Communication Tools",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white/60 px-3 py-2.5"
              >
                <CheckCircle className="h-4 w-4 shrink-0 text-blue-600" />
                <span className="text-sm text-slate-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-card">
          <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setMode("select")}
              className={`flex-1 rounded-md px-4 py-2.5 text-sm font-semibold transition-all ${
                mode === "select"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Select School
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 rounded-md px-4 py-2.5 text-sm font-semibold transition-all ${
                mode === "register"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Register School
            </button>
          </div>

          {mode === "select" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Select your school</h2>
                <p className="mt-1 text-sm text-slate-500">Choose an institution, then sign in</p>
              </div>

              {schools.length === 0 ? (
                <div className="py-10 text-center">
                  <Building2 className="mx-auto mb-4 h-14 w-14 text-slate-300" />
                  <p className="mb-4 text-slate-500">No schools registered yet</p>
                  <button onClick={() => setMode("register")} className="btn-primary">
                    Register Your School
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {schools.map((school) => (
                    <button
                      key={school.id}
                      onClick={() => handleSelectSchool(school.id)}
                      className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm"
                    >
                      <div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">
                          {school.name}
                        </h3>
                        <p className="text-sm text-slate-500">{school.email}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Register your school</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set up your institution and create the first principal / admin login
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  School Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Quaid-e-Azam School System"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  School Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@school.com"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+92 300 000 0000"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="School address"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-700" />
                  <div>
                    <h3 className="text-sm font-bold text-purple-900">Principal / Admin Account</h3>
                    <p className="text-xs text-purple-700">
                      This person will manage the school and issue logins to staff and students.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Admin Name *
                    </label>
                    <input
                      type="text"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      placeholder="e.g., Dr. Ali Khan"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Admin Login Email *
                    </label>
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="principal@gmail.com"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Admin Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.adminPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, adminPassword: e.target.value })
                        }
                        placeholder="At least 6 characters"
                        className="input-field pr-11"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, confirmPassword: e.target.value })
                        }
                        placeholder="Re-enter password"
                        className="input-field pr-11"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-3">
                Create School & Admin Account
              </button>

              <p className="text-center text-xs text-slate-400">
                You will be signed in automatically as the school administrator.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
