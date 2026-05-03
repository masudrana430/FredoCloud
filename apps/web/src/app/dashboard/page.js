"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

import Lottie from "lottie-react";
import loaderAnimation from "@/assets/loader.json";

export default function DashboardPage() {
  const router = useRouter();

  const { user, fetchMe, logout } = useAuthStore();
  const { teams, fetchTeams, createTeam } = useTeamStore();

  const [form, setForm] = useState({
    name: "",
    description: "",
    accentColor: "#0f172a"
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function initialize() {
      const currentUser = await fetchMe();

      if (!currentUser) {
        router.push("/login");
        return;
      }

      await fetchTeams();
      setLoading(false);
    }

    initialize();
  }, [fetchMe, fetchTeams, router]);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  async function handleCreateWorkspace(event) {
    event.preventDefault();
    setError("");
    setCreating(true);

    try {
      await createTeam(form);

      setForm({
        name: "",
        description: "",
        accentColor: "#0f172a"
      });
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

 if (loading) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <div className="h-40 w-40">
          <Lottie animationData={loaderAnimation} loop autoplay />
        </div>

        <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">
          Loading dashboard...
        </p>
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Collaborative Team Hub
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Workspaces
            </h1>

            <p className="mt-1 text-slate-600">
              Welcome back, {user?.name}
            </p>
          </div>

          <Button onClick={handleLogout}>Logout</Button>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <form
            onSubmit={handleCreateWorkspace}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold text-slate-950">
              Create workspace
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Set up a shared space for goals, announcements, and action items.
            </p>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 space-y-4">
              <Input
                name="name"
                placeholder="Workspace name"
                value={form.name}
                onChange={handleChange}
                required
              />

              <Textarea
                name="description"
                placeholder="Workspace description"
                value={form.description}
                onChange={handleChange}
                rows={4}
              />

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Accent colour
                </label>

                <input
                  name="accentColor"
                  type="color"
                  value={form.accentColor}
                  onChange={handleChange}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white p-1"
                />
              </div>
            </div>

            <Button type="submit" disabled={creating} className="mt-5 w-full">
              {creating ? "Creating..." : "Create workspace"}
            </Button>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  My workspaces
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Switch between the workspaces you belong to.
                </p>
              </div>
            </div>

            {teams.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
                No workspaces yet. Create your first workspace.
              </p>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {teams.map(team => (
                  <Link
                    key={team.id}
                    href={`/teams/${team.id}`}
                    className="group block rounded-3xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-950 hover:shadow-md"
                  >
                    <div
                      className="mb-4 h-2 rounded-full"
                      style={{
                        backgroundColor: team.accentColor || "#0f172a"
                      }}
                    />

                    <h3 className="text-lg font-bold text-slate-950 group-hover:underline">
                      {team.name}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {team.description || "No description"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {team.members?.length || 0} members
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {team._count?.goals || 0} goals
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {team._count?.announcements || 0} announcements
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {team._count?.actionItems || 0} action items
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}