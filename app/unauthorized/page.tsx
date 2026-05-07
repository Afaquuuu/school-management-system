import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-20 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Access denied</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">You do not have permission to open this area.</h1>
        <p className="mt-3 max-w-2xl text-slate-600">The middleware is set up to keep sensitive sections out of the wrong hands. Sign in with a permitted role to continue.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white">
          Return home
        </Link>
      </div>
    </main>
  );
}