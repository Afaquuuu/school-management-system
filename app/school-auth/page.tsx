"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSchool } from "@/lib/school-context";
import {
  createInitialAdminUser,
  isValidLoginEmail,
} from "@/lib/system-users";
import { establishUserSession } from "@/lib/teacher-check-in";
import { flushPendingStorageWrites } from "@/lib/tenant-storage-cache";
import {
  hasOwnerRegistrationAccess,
  verifyOwnerRegistrationKey,
} from "@/lib/school-registration-access";
import { isPublicSchoolRegistrationAllowed } from "@/lib/school-registration-policy";
import {
  FeatureIconAnalytics,
  FeatureIconAttendance,
  FeatureIconCommunication,
  FeatureIconExams,
  FeatureIconFinance,
  FeatureIconStudents,
  LandingConstellation,
} from "@/components/landing/landing-graphics";
import { LandingNav } from "@/components/landing/landing-nav";
import { DEMO_REQUEST_MAILTO } from "@/components/landing/demo-request";
import {
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  Search,
  Shield,
} from "lucide-react";

const featureCards = [
  { title: "Student & Staff Management", Icon: FeatureIconStudents },
  { title: "Attendance Tracking", Icon: FeatureIconAttendance },
  { title: "Exam & Marks Management", Icon: FeatureIconExams },
  { title: "Performance Analytics", Icon: FeatureIconAnalytics },
  { title: "Finance Management", Icon: FeatureIconFinance },
  { title: "Communication Tools", Icon: FeatureIconCommunication },
];

function SchoolLogo({ name, logo }: { name: string; logo?: string }) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt="" className="h-full w-full object-cover" />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 text-xs font-bold uppercase tracking-wide text-blue-700">
      {name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")}
    </div>
  );
}

export default function SchoolAuthPage() {
  const router = useRouter();
  const { schools, addSchool, setCurrentSchool } = useSchool();
  const [ownerUnlocked, setOwnerUnlocked] = useState(false);
  const showRegisterSchool =
    isPublicSchoolRegistrationAllowed() || ownerUnlocked || hasOwnerRegistrationAccess();
  const [mode, setMode] = useState<"select" | "register">("select");
  const [ownerKeyInput, setOwnerKeyInput] = useState("");
  const [ownerKeyError, setOwnerKeyError] = useState("");
  const [isVerifyingOwnerKey, setIsVerifyingOwnerKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
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

  useEffect(() => {
    setMode("select");
    setOwnerUnlocked(false);

    const params = new URLSearchParams(window.location.search);
    const ownerKey = params.get("ownerKey")?.trim();
    if (!ownerKey) return;

    void verifyOwnerRegistrationKey(ownerKey).then((ok) => {
      if (ok) {
        setOwnerUnlocked(true);
        setMode("register");
      } else {
        setOwnerKeyError("Invalid owner registration key.");
      }
      window.history.replaceState({}, "", "/school-auth");
    });
  }, []);

  const filteredSchools = useMemo(() => {
    const query = schoolSearch.trim().toLowerCase();
    if (!query) return schools;

    return schools.filter((school) => {
      const haystack = [school.name, school.email, school.address, school.phone]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [schools, schoolSearch]);

  useEffect(() => {
    if (filteredSchools.length === 0) {
      setSelectedSchoolId(null);
      return;
    }

    if (!selectedSchoolId || !filteredSchools.some((school) => school.id === selectedSchoolId)) {
      setSelectedSchoolId(filteredSchools[0].id);
    }
  }, [filteredSchools, selectedSchoolId]);

  const handleOwnerKeyUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setOwnerKeyError("");
    setIsVerifyingOwnerKey(true);

    try {
      const ok = await verifyOwnerRegistrationKey(ownerKeyInput);
      if (!ok) {
        setOwnerKeyError("Invalid owner registration key.");
        return;
      }

      setOwnerUnlocked(true);
      setMode("register");
      setOwnerKeyInput("");
    } finally {
      setIsVerifyingOwnerKey(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
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
    await flushPendingStorageWrites();
    window.location.href = "/admin";
  };

  const handleSelectSchool = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    const school = schools.find((s) => s.id === schoolId);
    if (school) {
      setCurrentSchool(school);
      router.push("/login");
    }
  };

  return (
    <div className="auth-shell">
      <LandingConstellation />

      <div className="relative mx-auto flex min-h-screen max-w-[1240px] flex-col">
        <LandingNav />

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 lg:py-10">
          <section className="relative z-10 space-y-8">
            <div className="space-y-4">
              <h1 className="landing-hero-title">School Management</h1>
              <p className="landing-hero-subtitle">
                Complete school operations platform for modern educational institutions.
              </p>
            </div>

            <div id="features" className="landing-feature-grid scroll-mt-24">
              {featureCards.map((feature) => {
                const Icon = feature.Icon;
                return (
                  <article key={feature.title} className="landing-feature-card">
                    <Icon />
                    <p className="landing-feature-label">{feature.title}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="access" className="landing-dashboard-card">
            {showRegisterSchool && mode === "register" ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <h2 className="landing-dashboard-title">Register your school</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Set up your institution and create the first principal / admin login
                  </p>
                </div>

                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="School name *"
                  className="landing-search-input !pl-4"
                  required
                />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="School email *"
                  className="landing-search-input !pl-4"
                  required
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone"
                    className="landing-search-input !pl-4"
                  />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Address"
                    className="landing-search-input !pl-4"
                  />
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-700" />
                    <h3 className="text-sm font-bold text-blue-900">Principal / Admin Account</h3>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      placeholder="Admin name *"
                      className="landing-search-input !pl-4"
                      required
                    />
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="Admin login email *"
                      className="landing-search-input !pl-4"
                      required
                    />
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.adminPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, adminPassword: e.target.value })
                        }
                        placeholder="Admin password *"
                        className="landing-search-input !pl-4 pr-11"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, confirmPassword: e.target.value })
                        }
                        placeholder="Confirm password *"
                        className="landing-search-input !pl-4 pr-11"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
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

                <button type="submit" className="landing-unlock-btn">
                  Create School & Admin Account
                </button>
                <button
                  type="button"
                  onClick={() => setMode("select")}
                  className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
                >
                  Back to school selection
                </button>
              </form>
            ) : (
              <>
                <h2 className="landing-dashboard-title mb-5">
                  Access your Institution Dashboard
                </h2>

                <div className="relative mb-4">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={schoolSearch}
                    onChange={(event) => setSchoolSearch(event.target.value)}
                    placeholder="Search for your school..."
                    className="landing-search-input"
                  />
                </div>

                {schools.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                    <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                    <p className="mb-2 font-medium text-slate-700">No schools registered yet</p>
                    {showRegisterSchool ? (
                      <button
                        type="button"
                        onClick={() => setMode("register")}
                        className="landing-demo-btn mt-4"
                      >
                        Register Your School
                      </button>
                    ) : null}
                  </div>
                ) : filteredSchools.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
                    No schools match your search.
                  </div>
                ) : (
                  <div className="max-h-[250px] space-y-2 overflow-y-auto pr-1">
                    {filteredSchools.map((school) => {
                      const isActive = selectedSchoolId === school.id;
                      return (
                        <button
                          key={school.id}
                          type="button"
                          onClick={() => handleSelectSchool(school.id)}
                          className={`landing-school-item ${isActive ? "landing-school-item-active" : ""}`}
                        >
                          <div className="landing-school-logo">
                            <SchoolLogo name={school.name} logo={school.logo} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-[15px] font-semibold text-slate-800">
                              {school.name}
                            </h3>
                            {school.address ? (
                              <p className="truncate text-sm text-slate-500">{school.address}</p>
                            ) : null}
                            <p className="truncate text-sm text-blue-600">{school.email}</p>
                          </div>
                          {isActive ? (
                            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}

                {showRegisterSchool && schools.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Register a new school
                  </button>
                ) : null}

                {!isPublicSchoolRegistrationAllowed() && !ownerUnlocked ? (
                  <>
                    <div className="landing-owner-divider">
                      <div className="landing-owner-divider-line" />
                      <span className="landing-owner-divider-text">
                        Owner Registration (Platform Admin)
                      </span>
                      <div className="landing-owner-divider-line" />
                    </div>

                    <form onSubmit={handleOwnerKeyUnlock} className="space-y-3">
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          value={ownerKeyInput}
                          onChange={(event) => setOwnerKeyInput(event.target.value)}
                          placeholder="Owner registration key"
                          className="landing-search-input px-11"
                          autoComplete="off"
                        />
                      </div>
                      {ownerKeyError ? (
                        <p className="text-sm text-red-600">{ownerKeyError}</p>
                      ) : null}
                      <button
                        type="submit"
                        disabled={isVerifyingOwnerKey || !ownerKeyInput.trim()}
                        className="landing-unlock-btn"
                      >
                        <Lock className="h-4 w-4" />
                        {isVerifyingOwnerKey ? "Checking..." : "Unlock Administrator Access"}
                      </button>
                    </form>
                  </>
                ) : null}

                <div className="mt-6 flex justify-center gap-2.5">
                  <span className="landing-dot-active" />
                  <span className="landing-dot" />
                  <span className="landing-dot" />
                </div>
              </>
            )}
          </section>
        </div>

        <section id="solutions" className="landing-info-section scroll-mt-24">
          <h2 className="landing-info-title">Solutions for every institution</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Whether you run a single campus or multiple branches, School Management adapts to
            your workflows for admissions, academics, finance, and communication.
          </p>
          <div className="landing-info-grid">
            <article className="landing-info-card">
              <h3 className="landing-info-card-title">Primary & Secondary Schools</h3>
              <p className="landing-info-card-text">
                Manage classes, attendance, exams, and parent communication in one place.
              </p>
            </article>
            <article className="landing-info-card">
              <h3 className="landing-info-card-title">Colleges & Universities</h3>
              <p className="landing-info-card-text">
                Track departments, staff roles, performance analytics, and student records.
              </p>
            </article>
            <article className="landing-info-card">
              <h3 className="landing-info-card-title">Private Academies</h3>
              <p className="landing-info-card-text">
                Streamline fee collection, announcements, and day-to-day administration.
              </p>
            </article>
            <article className="landing-info-card">
              <h3 className="landing-info-card-title">Multi-campus Institutions</h3>
              <p className="landing-info-card-text">
                Register and operate separate school dashboards from a unified platform.
              </p>
            </article>
          </div>
        </section>

        <section id="pricing" className="landing-info-section mt-8 scroll-mt-24">
          <h2 className="landing-info-title">Simple, transparent pricing</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Choose a plan that fits your institution. All plans include secure cloud hosting,
            regular updates, and onboarding support.
          </p>
          <div className="landing-pricing-grid">
            <article className="landing-pricing-card">
              <h3 className="text-lg font-bold text-slate-800">Starter</h3>
              <p className="mt-2 text-3xl font-bold text-slate-900">Contact us</p>
              <p className="mt-1 text-sm text-slate-500">For small schools getting started</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>Up to 300 students</li>
                <li>Core modules included</li>
                <li>Email support</li>
              </ul>
            </article>
            <article className="landing-pricing-card landing-pricing-card-featured">
              <h3 className="text-lg font-bold text-blue-900">Professional</h3>
              <p className="mt-2 text-3xl font-bold text-blue-900">Contact us</p>
              <p className="mt-1 text-sm text-slate-500">Most popular for growing schools</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>Unlimited students & staff</li>
                <li>All modules + analytics</li>
                <li>Priority support</li>
              </ul>
            </article>
            <article className="landing-pricing-card">
              <h3 className="text-lg font-bold text-slate-800">Enterprise</h3>
              <p className="mt-2 text-3xl font-bold text-slate-900">Custom</p>
              <p className="mt-1 text-sm text-slate-500">For multi-campus organizations</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>Dedicated onboarding</li>
                <li>Custom integrations</li>
                <li>Account manager</li>
              </ul>
            </article>
          </div>
          <a href={DEMO_REQUEST_MAILTO} className="landing-demo-btn mt-6 inline-flex">
            Request Demo
          </a>
        </section>

        <section id="support" className="landing-info-section mb-10 mt-8 scroll-mt-24">
          <h2 className="landing-info-title">Support when you need it</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Our team helps you set up your school, train staff, and resolve issues quickly.
          </p>
          <div className="landing-info-grid">
            <article className="landing-info-card">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="landing-info-card-title">Email Support</h3>
              <p className="landing-info-card-text">support@edumanageplus.org</p>
            </article>
            <article className="landing-info-card">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="landing-info-card-title">Live Chat</h3>
              <p className="landing-info-card-text">Available on weekdays, 9 AM – 6 PM</p>
            </article>
            <article className="landing-info-card">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="landing-info-card-title">Onboarding Help</h3>
              <p className="landing-info-card-text">
                Guided setup for admins, teachers, and finance staff.
              </p>
            </article>
            <article className="landing-info-card">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="landing-info-card-title">Documentation</h3>
              <p className="landing-info-card-text">
                Step-by-step guides for attendance, exams, and reports.
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
