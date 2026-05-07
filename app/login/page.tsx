"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, LogIn, School, AlertCircle } from "lucide-react";
import { useSchool, getScopedItem } from "@/lib/school-context";

type SystemUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "Student" | "Teacher" | "Parent" | "Admin";
  classDepartment: string;
  status: "Active" | "Inactive" | "On Leave" | "Suspended";
  password: string;
  createdAt: string;
  lastLogin?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { currentSchool, schools } = useSchool();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if no school is selected
  useEffect(() => {
    if (schools.length === 0 || !currentSchool) {
      router.push("/school-auth");
    }
  }, [schools, currentSchool, router]);

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
      // Get users from the current school
      const storedUsers = getScopedItem(currentSchool.id, 'system_users');
      console.log("Stored users found:", !!storedUsers);
      
      if (!storedUsers) {
        setError("No users found. Please contact administrator.");
        setLoading(false);
        return;
      }

      const users: SystemUser[] = JSON.parse(storedUsers);
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
      const updatedUsers = users.map(u => 
        u.id === user.id 
          ? { ...u, lastLogin: new Date().toISOString() }
          : u
      );
      
      // Save updated users back to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${currentSchool.id}_system_users`, JSON.stringify(updatedUsers));
      }

      // Store user session in localStorage
      const userSession = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.toLowerCase(),
        classDepartment: user.classDepartment,
        schoolId: currentSchool.id,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('user_session', JSON.stringify(userSession));
      localStorage.setItem('user_role', user.role.toLowerCase());

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <School className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Redirecting to school selection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* School Info */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <School className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{currentSchool.name}</h1>
          <p className="text-slate-600 dark:text-slate-400">School Management System</p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Welcome Back</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Need help? Contact your school administrator
            </p>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">Demo Credentials:</h3>
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p><strong>Admin:</strong> principal@school.edu / admin123</p>
            <p><strong>Teacher:</strong> a.mensah@school.edu / password123</p>
            <p><strong>Student:</strong> ama@school.edu / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}