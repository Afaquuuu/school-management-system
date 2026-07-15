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
import { establishUserSession, getUserSession } from "@/lib/teacher-check-in";
import { sendAdminVerificationEmail } from "@/lib/email-client";
import {
  clearLoginAttempts,
  createPendingAdminTwoFactor,
  getLoginLockMessage,
  getPasswordMinLength,
  getPendingAdminTwoFactor,
  clearPendingAdminTwoFactor,
  getAdminTwoFactorBlockMessage,
  isAdminTwoFactorRequired,
  recordFailedLogin,
  validatePasswordPolicy,
  verifyPendingAdminTwoFactor,
} from "@/lib/school-security";

export default function LoginPage() {
  const router = useRouter();
  const { currentSchool, schools, isAuthStorageReady } = useSchool();
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
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [twoFactorNotice, setTwoFactorNotice] = useState("");
  const [isResendingCode, setIsResendingCode] = useState(false);
  const schoolHasUsers =
    currentSchool && isAuthStorageReady ? hasSystemUsers(currentSchool.id) : false;
  const passwordMinLength = currentSchool ? getPasswordMinLength(currentSchool.id) : 8;

  // Redirect if no school is selected
  useEffect(() => {
    if (schools.length === 0 || !currentSchool) {
      router.push("/school-auth");
      return;
    }

    const session = getUserSession();
    if (session) {
      router.replace(session.role.toLowerCase() === "admin" ? "/admin" : "/dashboard");
    }
  }, [schools, currentSchool, router]);

  const finishLogin = (user: SystemUser) => {
    if (!currentSchool) return;

    const users = loadSystemUsers(currentSchool.id);
    const updatedUsers = users.map((u) =>
      u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u,
    );

    saveSystemUsers(currentSchool.id, updatedUsers);
    establishUserSession(user, currentSchool.id);

    const redirectUrl = user.role.toLowerCase() === "admin" ? "/admin" : "/dashboard";
    router.replace(redirectUrl);
  };

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

    if (setupData.adminPassword.length < passwordMinLength) {
      setError(`Password must be at least ${passwordMinLength} characters.`);
      return;
    }

    const passwordCheck = validatePasswordPolicy(currentSchool.id, setupData.adminPassword);
    if (!passwordCheck.valid) {
      setError(passwordCheck.error);
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
    router.replace("/admin");
  };

  const beginAdminTwoFactor = async (user: SystemUser) => {
    if (!currentSchool) return false;

    const pending = createPendingAdminTwoFactor({
      schoolId: currentSchool.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        classDepartment: user.classDepartment,
      },
    });

    const emailResult = await sendAdminVerificationEmail({
      schoolId: currentSchool.id,
      schoolName: currentSchool.name,
      adminName: user.name,
      adminEmail: user.email,
      code: pending.code,
    });

    if (emailResult.sent === 0 || emailResult.failed.length > 0) {
      clearPendingAdminTwoFactor();
      setTwoFactorNotice("");
      setError(
        emailResult.error ??
          emailResult.failed[0]?.error ??
          "Could not send the verification email. Use Brevo SMTP in Admin → System Settings → Communication Settings (Gmail blocks automated 2FA emails).",
      );
      return false;
    }

    setError("");
    setTwoFactorNotice(
      `A 6-digit verification code was sent to ${user.email}. Check your Inbox and Spam folders.`,
    );
    setTwoFactorStep(true);
    setVerificationCode("");
    return true;
  };

  const handleResendVerificationCode = async () => {
    const pending = getPendingAdminTwoFactor();
    if (!pending || !currentSchool || pending.schoolId !== currentSchool.id) {
      setError("Verification session expired. Please sign in again.");
      setTwoFactorStep(false);
      return;
    }

    setIsResendingCode(true);
    setError("");

    try {
      const users = loadSystemUsers(currentSchool.id);
      const user = users.find((item) => item.id === pending.user.id);
      if (!user) {
        setError("Admin account not found. Please sign in again.");
        setTwoFactorStep(false);
        return;
      }

      const refreshed = createPendingAdminTwoFactor({
        schoolId: currentSchool.id,
        user: pending.user,
      });

      const emailResult = await sendAdminVerificationEmail({
        schoolId: currentSchool.id,
        schoolName: currentSchool.name,
        adminName: user.name,
        adminEmail: user.email,
        code: refreshed.code,
      });

      if (emailResult.sent === 0 || emailResult.failed.length > 0) {
        setError(
          emailResult.error ??
            emailResult.failed[0]?.error ??
            "Could not resend the verification email.",
        );
        return;
      }

      setTwoFactorNotice(`A new code was sent to ${user.email}. Check Inbox and Spam.`);
      setVerificationCode("");
    } finally {
      setIsResendingCode(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!currentSchool) {
      setError("No school selected. Please select a school first.");
      setLoading(false);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const lockMessage = getLoginLockMessage(currentSchool.id, normalizedEmail);
    if (lockMessage) {
      setError(lockMessage);
      setLoading(false);
      return;
    }

    let redirecting = false;

    try {
      const users = loadSystemUsers(currentSchool.id);
      const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

      if (!user) {
        setError("User not found. Please check your email address.");
        return;
      }

      if (user.password !== password) {
        const failureMessage = recordFailedLogin(currentSchool.id, normalizedEmail);
        setError(failureMessage ?? "Invalid password. Please try again.");
        return;
      }

      if (user.status !== "Active") {
        setError(`Account is ${user.status.toLowerCase()}. Please contact administrator.`);
        return;
      }

      clearLoginAttempts(currentSchool.id, normalizedEmail);

      if (isAdminTwoFactorRequired(currentSchool.id, user.role)) {
        const setupMessage = getAdminTwoFactorBlockMessage(currentSchool.id, user.role);
        if (setupMessage) {
          // Allow sign-in so admins are never locked out if SMTP settings were lost.
          sessionStorage.setItem("admin_email_setup_required", setupMessage);
          finishLogin(user);
          redirecting = true;
          return;
        }

        const started = await beginAdminTwoFactor(user);
        if (started) {
          redirecting = false;
          return;
        }

        clearPendingAdminTwoFactor();
        sessionStorage.setItem(
          "admin_email_setup_required",
          "Could not send the 2FA email. Re-check Brevo SMTP in Admin → Communication Settings, then sign in again.",
        );
        finishLogin(user);
        redirecting = true;
        return;
      }

      finishLogin(user);
      redirecting = true;
    } catch (loginError) {
      console.error("Login error:", loginError);
      setError("An error occurred during login. Please try again.");
    } finally {
      if (!redirecting) {
        setLoading(false);
      }
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const pending = verifyPendingAdminTwoFactor(verificationCode);
      if (!pending || !currentSchool || pending.schoolId !== currentSchool.id) {
        setError("Invalid or expired verification code.");
        return;
      }

      const users = loadSystemUsers(currentSchool.id);
      const user = users.find((item) => item.id === pending.user.id);
      if (!user) {
        setError("Admin account could not be verified. Please sign in again.");
        setTwoFactorStep(false);
        return;
      }

      finishLogin(user);
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

  if (!isAuthStorageReady) {
    return (
      <div className="auth-shell flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-slate-500">Preparing sign in...</p>
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
                      placeholder={`At least ${passwordMinLength} characters`}
                      className="input-field pr-11"
                      required
                      minLength={passwordMinLength}
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
                    minLength={passwordMinLength}
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-3">
                  <Shield className="h-4 w-4" />
                  Create Admin & Enter Dashboard
                </button>
              </form>
            </>
          ) : twoFactorStep ? (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Shield className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Admin verification</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the 6-digit code sent to{" "}
                  {getPendingAdminTwoFactor()?.user.email ?? "your admin email"}.
                </p>
              </div>

              {twoFactorNotice && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                  {twoFactorNotice}
                </div>
              )}

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code"
                    className="input-field text-center text-lg tracking-[0.35em]"
                    required
                    maxLength={6}
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Verify & Sign In
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResendVerificationCode}
                  disabled={isResendingCode}
                  className="w-full text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
                >
                  {isResendingCode ? "Sending..." : "Resend verification code"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearPendingAdminTwoFactor();
                    setTwoFactorStep(false);
                    setVerificationCode("");
                    setTwoFactorNotice("");
                    setError("");
                  }}
                  className="w-full text-sm text-slate-500 hover:text-slate-700"
                >
                  Back to sign in
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