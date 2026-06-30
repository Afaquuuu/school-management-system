"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, LogIn, School, AlertCircle, Shield } from "lucide-react";
import { useSchool } from "@/lib/school-context";
import {
  createInitialAdminUser,
  hasSystemUsers,
  isValidLoginEmail,
  loadSystemUsers,
  saveSystemUsers,
  type SystemUser,
} from "@/lib/system-users";
import { establishUserSession } from "@/lib/teacher-check-in";

export default function LoginPage() {
  const router = useRouter();
  const { currentSchool, schools } = useSchool();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState({
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
  });
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const schoolHasUsers = currentSchool ? hasSystemUsers(currentSchool.id) : false;

  // Redirect if no school is selected
  useEffect(() => {
    if (schools.length === 0 || !currentSchool) {
      router.push("/school-auth");
    }
  }, [schools, currentSchool, router]);

  const handleSetupAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentSchool) return;

    if (!setupData.adminName.trim() || !setupData.adminEmail.trim() || !setupData.adminPassword) {
      setError("Please fill in all admin account fields.");
      return;
    }

    if (!isValidLoginEmail(setupData.adminEmail)) {
      setError("Please enter a valid admin login email.");
      return;
    }

    if (setupData.adminPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (setupData.adminPassword !== setupData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const adminUser = createInitialAdminUser(currentSchool.id, {
      name: setupData.adminName,
      email: setupData.adminEmail,
      password: setupData.adminPassword,
    });

    establishUserSession(adminUser, currentSchool.id);
    window.location.href = "/admin";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    console.log("Login attempt:", { email, password: "***", currentSchool: currentSchool?.name });

    if (!currentSchool) {
      setError("No school selected. Please select a school first.");
      setLoading(false);
      return;
    }

    try {
      const users = loadSystemUsers(currentSchool.id);
      console.log("Total users in school:", users.length);
      
      // Find user by email
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      console.log("User found:", !!user, user ? `Role: ${user.role}, Status: ${user.status}` : "Not found");
      
      if (!user) {
        setError("User not found. Please check your email address.");
        setLoading(false);
        return;
      }

      // Check password
      if (user.password !== password) {
        console.log("Password mismatch");
        setError("Invalid password. Please try again.");
        setLoading(false);
        return;
      }

      // Check if user is active
      if (user.status !== "Active") {
        console.log("User status:", user.status);
        setError(`Account is ${user.status.toLowerCase()}. Please contact administrator.`);
        setLoading(false);
        return;
      }

      console.log("Login successful, redirecting...");

      // Update last login
      const updatedUsers = users.map((u) =>
        u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u,
      );

      saveSystemUsers(currentSchool.id, updatedUsers);
      establishUserSession(user, currentSchool.id);

      console.log("Session stored, redirecting to:", user.role.toLowerCase() === 'admin' ? '/admin' : '/dashboard');

      // Force a page reload to ensure the AuthGuard picks up the new session
      const redirectUrl = user.role.toLowerCase() === 'admin' ? '/admin' : '/dashboard';
      window.location.href = redirectUrl;

    } catch (error) {
      console.error('Login error:', error);
      setError("An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentSchool) {
    return (
      <div className="auth-shell flex items-center justify-center">
        <div className="text-center">
          <School className="mx-auto mb-4 h-16 w-16 text-slate-300" />
          <p className="text-slate-500">Redirecting to school selection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-600/20">
            <School className="h-7 w-7 text-white" />
          </div>
          <p className="section-label mb-2">School Management System</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{currentSchool.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {schoolHasUsers
              ? "Sign in to continue to your dashboard"
              : "Set up the first principal / admin account for this school"}
          </p>
        </div>

        <div className="auth-card">
          {!schoolHasUsers ? (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <Shield className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Create Principal Account</h2>
                <p className="mt-1 text-sm text-slate-500">
                  This school has no login accounts yet. Create the administrator account below.
                </p>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSetupAdmin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Admin Name *</label>
                  <input
                    type="text"
                    value={setupData.adminName}
                    onChange={(e) => setSetupData({ ...setupData, adminName: e.target.value })}
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
                    value={setupData.adminEmail}
                    onChange={(e) => setSetupData({ ...setupData, adminEmail: e.target.value })}
                    placeholder="principal@gmail.com"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Password *</label>
                  <div className="relative">
                    <input
                      type={showSetupPassword ? "text" : "password"}
                      value={setupData.adminPassword}
                      onChange={(e) =>
                        setSetupData({ ...setupData, adminPassword: e.target.value })
                      }
                      placeholder="At least 6 characters"
                      className="input-field pr-11"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword(!showSetupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showSetupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={setupData.confirmPassword}
                    onChange={(e) =>
                      setSetupData({ ...setupData, confirmPassword: e.target.value })
                    }
                    placeholder="Re-enter password"
                    className="input-field"
                    required
                    minLength={6}
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-3">
                  <Shield className="h-4 w-4" />
                  Create Admin & Enter Dashboard
                </button>
              </form>
            </>
          ) : (
            <>
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Enter your credentials to access your account</p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Login Email (Gmail)
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-10 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Need help? Contact your school administrator
          </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}