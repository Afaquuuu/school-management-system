import Link from "next/link";
import { ArrowRight, CalendarRange, ShieldCheck, Users, Wallet } from "lucide-react";

const highlights = [
  { icon: Users, label: "Student & staff management" },
  { icon: CalendarRange, label: "Timetables and attendance" },
  { icon: Wallet, label: "Fees, invoices, and ledger tracking" },
  { icon: ShieldCheck, label: "RBAC through middleware" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Next.js 14, Prisma, Clerk, React Query, Tailwind
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              School operations built around the reality of a live campus.
            </h1>
            <p className="max-w-2xl text-lg text-slate-600">
              A role-aware foundation for dashboards, attendance alerts, schedules, billing, and communication.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/school-auth"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/school-auth"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700"
            >
              Register Your School
            </Link>
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-2">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <Icon className="h-5 w-5 text-slate-900" />
                  <p className="mt-4 text-sm font-medium text-slate-900">{item.label}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}