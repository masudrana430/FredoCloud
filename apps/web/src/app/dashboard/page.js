"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

export default function DashboardPage() {
  const router = useRouter();

  const { user, fetchMe, logout } = useAuthStore();
  const { teams, fetchTeams, createTeam } = useTeamStore();

  const [form, setForm] = useState({
    name: "",
    description: ""
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

  async function handleCreateTeam(event) {
    event.preventDefault();
    setError("");
    setCreating(true);

    try {
      await createTeam(form);

      setForm({
        name: "",
        description: ""
      });
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create team");
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
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-gray-600">
              Welcome, {user?.name}
            </p>
          </div>

          <Button onClick={handleLogout}>Logout</Button>
        </header>

        <section className="mt-8 grid gap-6 md:grid-cols-[360px_1fr]">
          <form
            onSubmit={handleCreateTeam}
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold">Create team</h2>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-4 space-y-4">
              <Input
                name="name"
                placeholder="Team name"
                value={form.name}
                onChange={handleChange}
              />

              <Textarea
                name="description"
                placeholder="Team description"
                value={form.description}
                onChange={handleChange}
                rows={4}
              />
            </div>

            <Button type="submit" disabled={creating} className="mt-4 w-full">
              {creating ? "Creating..." : "Create team"}
            </Button>
          </form>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">My teams</h2>

            {teams.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                No teams yet. Create your first team.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {teams.map(team => (
                  <Link
                    key={team.id}
                    href={`/teams/${team.id}`}
                    className="block rounded-xl border border-gray-200 p-4 transition hover:border-black"
                  >
                    <h3 className="font-semibold">{team.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {team.description || "No description"}
                    </p>

                    <div className="mt-3 flex gap-3 text-xs text-gray-500">
                      <span>{team.members?.length || 0} members</span>
                      <span>{team._count?.goals || 0} goals</span>
                      <span>{team._count?.announcements || 0} announcements</span>
                      <span>{team._count?.actionItems || 0} action items</span>
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