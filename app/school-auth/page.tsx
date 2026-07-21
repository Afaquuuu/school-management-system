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
  BarChart3,
  Building2,
  CalendarCheck,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MessageSquare,
  Search,
  School,
  Shield,
  Users,
  Wallet,
  ClipboardList,
} from "lucide-react";

const featureCards = [
  {
    title: "Student & Staff Management",
    icon: Users,
    iconBg: "bg-blue-100 text-blue-600",
  },
  {
    title: "Attendance Tracking",
    icon: CalendarCheck,
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Exam & Marks Management",
    icon: ClipboardList,
    iconBg: "bg-orange-100 text-orange-600",
  },
  {
    title: "Performance Analytics",
    icon: BarChart3,
    iconBg: "bg-violet-100 text-violet-600",
  },
  {
    title: "Finance Management",
    icon: Wallet,
    iconBg: "bg-amber-100 text-amber-600",
  },
  {
    title: "Communication Tools",
    icon: MessageSquare,
    iconBg: "bg-cyan-100 text-cyan-600",
  },
];

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
  const [hoveredSchoolId, setHoveredSchoolId] = useState<string | null>(null);
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
    const school = schools.find((s) => s.id === schoolId);
    if (school) {
      setCurrentSchool(school);
      router.push("/login");
    }
  };

  return (
    <div className="auth-shell landing-mesh">
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
        <header className="landing-nav mb-8 lg:mb-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/25">
              <School className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              School Management
            </span>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <button type="button" className="inline-flex items-center gap-1 transition hover:text-slate-900">
              Product
              <ChevronDown className="h-4 w-4" />
            </button>
            <button type="button" className="inline-flex items-center gap-1 transition hover:text-slate-900">
              Solutions
              <ChevronDown className="h-4 w-4" />
            </button>
            <a href="#support" className="transition hover:text-slate-900">
              Support
            </a>
            <a href="#pricing" className="transition hover:text-slate-900">
              Pricing
            </a>
          </nav>

          <a href="#access" className="landing-demo-btn shrink-0">
            Request Demo
          </a>
        </header>

        <div className="grid flex-1 items-center gap-10 pb-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <section className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.05]">
                School Management
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-slate-600">
                Complete school operations platform for modern educational institutions.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="landing-feature-card">
                    <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold leading-snug text-slate-800">
                      {feature.title}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="access" className="landing-dashboard-card">
            {showRegisterSchool && mode === "register" ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Register your school</h2>
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
                    placeholder="e.g., Quaid-e-Azam Public School Mardan"
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
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
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="City, region"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-700" />
                    <div>
                      <h3 className="text-sm font-bold text-blue-900">Principal / Admin Account</h3>
                      <p className="text-xs text-blue-700">
                        This person will manage the school and issue logins to staff and students.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      placeholder="Admin name *"
                      className="input-field"
                      required
                    />
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="Admin login email *"
                      className="input-field"
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
                        className="input-field pr-11"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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

                <button type="submit" className="btn-primary w-full py-3">
                  Create School & Admin Account
                </button>

                <button
                  type="button"
                  onClick={() => setMode("select")}
                  className="btn-secondary w-full py-2.5"
                >
                  Back to school selection
                </button>
              </form>
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Access your Institution Dashboard
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Search for your school and continue to sign in
                  </p>
                </div>

                <div className="relative mb-4">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={schoolSearch}
                    onChange={(event) => setSchoolSearch(event.target.value)}
                    placeholder="Search for your school..."
                    className="input-field pl-11"
                  />
                </div>

                {schools.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                    <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                    <p className="mb-2 font-medium text-slate-700">No schools registered yet</p>
                    <p className="text-sm text-slate-500">
                      {showRegisterSchool
                        ? "Unlock administrator access below to register your first school."
                        : "Contact your platform administrator to add a school."}
                    </p>
                    {showRegisterSchool ? (
                      <button
                        type="button"
                        onClick={() => setMode("register")}
                        className="btn-primary mt-4"
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
                  <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
                    {filteredSchools.map((school) => {
                      const isActive = hoveredSchoolId === school.id;
                      return (
                        <button
                          key={school.id}
                          type="button"
                          onClick={() => handleSelectSchool(school.id)}
                          onMouseEnter={() => setHoveredSchoolId(school.id)}
                          onMouseLeave={() => setHoveredSchoolId(null)}
                          className={`landing-school-item ${isActive ? "landing-school-item-active" : ""}`}
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-semibold text-slate-900">{school.name}</h3>
                            {school.address ? (
                              <p className="truncate text-sm text-slate-500">{school.address}</p>
                            ) : null}
                            <p className="truncate text-sm text-blue-600">{school.email}</p>
                          </div>
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
                  <div className="mt-8 border-t border-slate-200 pt-6">
                    <p className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Owner Registration (Platform Admin)
                    </p>
                    <form onSubmit={handleOwnerKeyUnlock} className="space-y-3">
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          value={ownerKeyInput}
                          onChange={(event) => setOwnerKeyInput(event.target.value)}
                          placeholder="Owner registration key"
                          className="input-field px-11"
                          autoComplete="off"
                        />
                      </div>
                      {ownerKeyError ? (
                        <p className="text-sm text-red-600">{ownerKeyError}</p>
                      ) : null}
                      <button
                        type="submit"
                        disabled={isVerifyingOwnerKey || !ownerKeyInput.trim()}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Lock className="h-4 w-4" />
                        {isVerifyingOwnerKey ? "Checking..." : "Unlock Administrator Access"}
                      </button>
                    </form>
                  </div>
                ) : null}

                <div className="mt-6 flex justify-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
