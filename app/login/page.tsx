"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight, School, AlertCircle, Shield } from "lucide-react";
import { LoginPageShell } from "@/components/login/login-page-shell";
import { SUPPORT_LINK, externalEmailLinkProps } from "@/components/landing/demo-request";
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
      <LoginPageShell>
        <div className="py-8 text-center">
          <School className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <p className="login-card-subtitle">Redirecting to school selection...</p>
        </div>
      </LoginPageShell>
    );
  }

  if (!isAuthStorageReady) {
    return (
      <LoginPageShell schoolName={currentSchool.name}>
        <div className="py-10 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="login-card-subtitle">Preparing sign in...</p>
        </div>
      </LoginPageShell>
    );
  }

  return (
    <LoginPageShell schoolName={currentSchool.name}>
          {!schoolHasUsers ? (
            <>
              <div className="relative z-10 mb-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Shield className="h-6 w-6" />
                </div>
                <h2 className="login-card-title">Create Principal Account</h2>
                <p className="login-card-subtitle">
                  This school has no login accounts yet. Create the administrator account below.
                </p>
              </div>

              {error ? (
                <div className="login-error-banner relative z-10">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              ) : null}

              <form onSubmit={handleSetupAdmin} className="relative z-10 space-y-4">
                <div>
                  <label className="login-field-label">Admin Name *</label>
                  <input
                    type="text"
                    value={setupData.adminName}
                    onChange={(e) => setSetupData({ ...setupData, adminName: e.target.value })}
                    placeholder="e.g., Dr. Ali Khan"
                    className="login-input !pl-4"
                    required
                  />
                </div>

                <div>
                  <label className="login-field-label">Institutional Email *</label>
                  <div className="login-input-wrap">
                    <Mail className="login-input-icon" />
                    <input
                      type="email"
                      value={setupData.adminEmail}
                      onChange={(e) => setSetupData({ ...setupData, adminEmail: e.target.value })}
                      placeholder="principal@gmail.com"
                      className="login-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="login-field-label">Password *</label>
                  <div className="login-input-wrap">
                    <Lock className="login-input-icon" />
                    <input
                      type={showSetupPassword ? "text" : "password"}
                      value={setupData.adminPassword}
                      onChange={(e) =>
                        setSetupData({ ...setupData, adminPassword: e.target.value })
                      }
                      placeholder={`At least ${passwordMinLength} characters`}
                      className="login-input"
                      required
                      minLength={passwordMinLength}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword(!showSetupPassword)}
                      className="login-toggle-password"
                    >
                      {showSetupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="login-field-label">Confirm Password *</label>
                  <div className="login-input-wrap">
                    <Lock className="login-input-icon" />
                    <input
                      type="password"
                      value={setupData.confirmPassword}
                      onChange={(e) =>
                        setSetupData({ ...setupData, confirmPassword: e.target.value })
                      }
                      placeholder="Re-enter password"
                      className="login-input"
                      required
                      minLength={passwordMinLength}
                    />
                  </div>
                </div>

                <button type="submit" className="login-signin-btn">
                  <Shield className="h-4 w-4" />
                  Create Admin Account
                </button>
              </form>
            </>
          ) : twoFactorStep ? (
            <>
              <div className="relative z-10 mb-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Shield className="h-6 w-6" />
                </div>
                <h2 className="login-card-title">Admin Verification</h2>
                <p className="login-card-subtitle">
                  Enter the 6-digit code sent to{" "}
                  {getPendingAdminTwoFactor()?.user.email ?? "your admin email"}.
                </p>
              </div>

              {twoFactorNotice ? (
                <div className="login-notice-banner relative z-10">{twoFactorNotice}</div>
              ) : null}

              {error ? (
                <div className="login-error-banner relative z-10">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              ) : null}

              <form onSubmit={handleVerifyTwoFactor} className="relative z-10 space-y-4">
                <div>
                  <label className="login-field-label">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code"
                    className="login-input !pl-4 text-center text-lg tracking-[0.35em]"
                    required
                    maxLength={6}
                  />
                </div>

                <button type="submit" disabled={loading} className="login-signin-btn">
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
                  className="w-full text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60"
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
              <div className="relative z-10 mb-6">
                <h2 className="login-card-title">Welcome Back</h2>
                <p className="login-card-subtitle">
                  Sign in to continue to your administrative dashboard
                </p>
              </div>

              {error ? (
                <div className="login-error-banner relative z-10">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              ) : null}

              <form onSubmit={handleLogin} className="relative z-10 space-y-4">
                <div>
                  <label className="login-field-label">Institutional Email</label>
                  <div className="login-input-wrap">
                    <Mail className="login-input-icon" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className="login-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="login-field-label-row">
                    <label className="login-field-label !mb-0">Password</label>
                    <a
                      href={SUPPORT_LINK}
                      {...externalEmailLinkProps}
                      className="login-forgot-link"
                    >
                      Forgot Password?
                    </a>
                  </div>
                  <div className="login-input-wrap">
                    <Lock className="login-input-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="login-input"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="login-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="login-signin-btn">
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      Sign In
                    </>
                  )}
                </button>
              </form>

              <p className="login-card-support relative z-10">
                Contact your school administrator for support.
              </p>
            </>
          )}
    </LoginPageShell>
  );
}