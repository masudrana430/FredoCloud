import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12 text-slate-900">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          FredoCloud Intern Assignment
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
          Collaborative Team Hub
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-slate-600">
          Manage team goals, announcements, and action items in real time with
          secure authentication and team-based collaboration.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
          >
            Register
          </Link>
        </div>
      </section>
    </main>
  );
}