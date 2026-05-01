"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";

export default function TeamPage({ params }) {
  const { teamId } = use(params);
  const router = useRouter();

  const { fetchMe } = useAuthStore();
  const { activeTeam, loading, fetchTeamById, clearActiveTeam } = useTeamStore();

  useEffect(() => {
    async function initialize() {
      const currentUser = await fetchMe();

      if (!currentUser) {
        router.push("/login");
        return;
      }

      await fetchTeamById(teamId);
    }

    initialize();

    return () => {
      clearActiveTeam();
    };
  }, [teamId, fetchMe, fetchTeamById, clearActiveTeam, router]);

  if (loading || !activeTeam) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading team...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm text-gray-600">
          ← Back to dashboard
        </Link>

        <header className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold">{activeTeam.name}</h1>
          <p className="mt-2 text-gray-600">
            {activeTeam.description || "No description"}
          </p>
        </header>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Members</h2>

            <div className="mt-4 space-y-3">
              {activeTeam.members?.map(member => (
                <div
                  key={member.id}
                  className="rounded-xl border border-gray-200 p-3"
                >
                  <p className="font-medium">{member.user.name}</p>
                  <p className="text-sm text-gray-600">{member.user.email}</p>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    {member.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Goals</h2>

            <div className="mt-4 space-y-3">
              {activeTeam.goals?.length === 0 ? (
                <p className="text-sm text-gray-600">No goals yet.</p>
              ) : (
                activeTeam.goals?.map(goal => (
                  <div
                    key={goal.id}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <p className="font-medium">{goal.title}</p>
                    <p className="text-sm text-gray-600">
                      {goal.description || "No description"}
                    </p>
                    <p className="mt-1 text-xs">
                      {goal.completed ? "Completed" : "In progress"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Announcements</h2>

            <div className="mt-4 space-y-3">
              {activeTeam.announcements?.length === 0 ? (
                <p className="text-sm text-gray-600">No announcements yet.</p>
              ) : (
                activeTeam.announcements?.map(announcement => (
                  <div
                    key={announcement.id}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <p className="font-medium">{announcement.title}</p>
                    <p className="text-sm text-gray-600">
                      {announcement.content}
                    </p>
                    {announcement.attachmentUrl && (
                      <a
                        href={announcement.attachmentUrl}
                        target="_blank"
                        className="mt-2 inline-block text-sm font-medium text-black underline"
                      >
                        View attachment
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Action Items</h2>

            <div className="mt-4 space-y-3">
              {activeTeam.actionItems?.length === 0 ? (
                <p className="text-sm text-gray-600">No action items yet.</p>
              ) : (
                activeTeam.actionItems?.map(item => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-600">
                      {item.description || "No description"}
                    </p>
                    <p className="mt-1 text-xs font-medium">{item.status}</p>
                    {item.assignee && (
                      <p className="mt-1 text-xs text-gray-500">
                        Assigned to {item.assignee.name}
                      </p>
                    )}
                    {item.attachmentUrl && (
                      <a
                        href={item.attachmentUrl}
                        target="_blank"
                        className="mt-2 inline-block text-sm font-medium text-black underline"
                      >
                        View attachment
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}