"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { useTeamSocket } from "@/hooks/useTeamSocket";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

export default function TeamPage({ params }) {
  const { teamId } = use(params);
  const router = useRouter();

  const { user, fetchMe } = useAuthStore();

  const {
    activeTeam,
    loading,
    fetchTeamById,
    clearActiveTeam,
    updateTeam,
    inviteMember,
    updateMemberRole,
    removeMember
  } = useTeamStore();

  const [workspaceForm, setWorkspaceForm] = useState({
    name: "",
    description: "",
    accentColor: "#0f172a"
  });

  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "MEMBER"
  });

  const [goalForm, setGoalForm] = useState({
    title: "",
    description: ""
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    attachment: null
  });

  const [actionItemForm, setActionItemForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "",
    attachment: null
  });

  const [submitting, setSubmitting] = useState("");
  const [error, setError] = useState("");

  const refreshTeam = useCallback(async () => {
    await fetchTeamById(teamId);
  }, [fetchTeamById, teamId]);

  useTeamSocket(teamId, refreshTeam);

  const currentMembership = useMemo(() => {
    return activeTeam?.members?.find(member => member.user.id === user?.id);
  }, [activeTeam, user]);

  const canManageWorkspace =
    currentMembership?.role === "OWNER" || currentMembership?.role === "ADMIN";

  const isOwner = currentMembership?.role === "OWNER";

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

  useEffect(() => {
    if (activeTeam) {
      setWorkspaceForm({
        name: activeTeam.name || "",
        description: activeTeam.description || "",
        accentColor: activeTeam.accentColor || "#0f172a"
      });
    }
  }, [activeTeam]);

  function handleWorkspaceChange(event) {
    setWorkspaceForm({
      ...workspaceForm,
      [event.target.name]: event.target.value
    });
  }

  function handleInviteChange(event) {
    setInviteForm({
      ...inviteForm,
      [event.target.name]: event.target.value
    });
  }

  function handleGoalChange(event) {
    setGoalForm({
      ...goalForm,
      [event.target.name]: event.target.value
    });
  }

  function handleAnnouncementChange(event) {
    const { name, value, files } = event.target;

    setAnnouncementForm({
      ...announcementForm,
      [name]: files ? files[0] : value
    });
  }

  function handleActionItemChange(event) {
    const { name, value, files } = event.target;

    setActionItemForm({
      ...actionItemForm,
      [name]: files ? files[0] : value
    });
  }

  async function handleUpdateWorkspace(event) {
    event.preventDefault();
    setError("");
    setSubmitting("workspace");

    try {
      await updateTeam(teamId, workspaceForm);
      await refreshTeam();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update workspace");
    } finally {
      setSubmitting("");
    }
  }

  async function handleInviteMember(event) {
    event.preventDefault();
    setError("");
    setSubmitting("invite");

    try {
      await inviteMember(teamId, inviteForm);

      setInviteForm({
        email: "",
        role: "MEMBER"
      });

      await refreshTeam();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to invite member");
    } finally {
      setSubmitting("");
    }
  }

  async function handleRoleChange(userId, role) {
    setError("");

    try {
      await updateMemberRole(teamId, userId, role);
      await refreshTeam();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update role");
    }
  }

  async function handleRemoveMember(userId) {
    setError("");

    try {
      await removeMember(teamId, userId);
      await refreshTeam();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to remove member");
    }
  }

  async function handleCreateGoal(event) {
    event.preventDefault();
    setError("");
    setSubmitting("goal");

    try {
      await api.post("/api/goals", {
        teamId,
        title: goalForm.title,
        description: goalForm.description
      });

      setGoalForm({
        title: "",
        description: ""
      });

      await refreshTeam();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create goal");
    } finally {
      setSubmitting("");
    }
  }

  async function handleCreateAnnouncement(event) {
    event.preventDefault();
    setError("");
    setSubmitting("announcement");

    try {
      const formData = new FormData();

      formData.append("teamId", teamId);
      formData.append("title", announcementForm.title);
      formData.append("content", announcementForm.content);

      if (announcementForm.attachment) {
        formData.append("attachment", announcementForm.attachment);
      }

      await api.post("/api/announcements", formData);

      setAnnouncementForm({
        title: "",
        content: "",
        attachment: null
      });

      event.target.reset();
      await refreshTeam();
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to create announcement"
      );
    } finally {
      setSubmitting("");
    }
  }

  async function handleCreateActionItem(event) {
    event.preventDefault();
    setError("");
    setSubmitting("actionItem");

    try {
      const formData = new FormData();

      formData.append("teamId", teamId);
      formData.append("title", actionItemForm.title);
      formData.append("description", actionItemForm.description);

      if (actionItemForm.assigneeId) {
        formData.append("assigneeId", actionItemForm.assigneeId);
      }

      if (actionItemForm.dueDate) {
        formData.append("dueDate", actionItemForm.dueDate);
      }

      if (actionItemForm.attachment) {
        formData.append("attachment", actionItemForm.attachment);
      }

      await api.post("/api/action-items", formData);

      setActionItemForm({
        title: "",
        description: "",
        assigneeId: "",
        dueDate: "",
        attachment: null
      });

      event.target.reset();
      await refreshTeam();
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to create action item"
      );
    } finally {
      setSubmitting("");
    }
  }

  async function handleUpdateActionStatus(itemId, status) {
    setError("");

    try {
      await api.patch(`/api/action-items/${itemId}`, {
        status
      });

      await refreshTeam();
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to update action item"
      );
    }
  }

  if (loading || !activeTeam) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-900">
        <p>Loading workspace...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard" className="text-sm font-medium text-slate-600">
          ← Back to workspaces
        </Link>

        <header className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div
            className="mb-4 h-2 rounded-full"
            style={{
              backgroundColor: activeTeam.accentColor || "#0f172a"
            }}
          />

          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Workspace
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {activeTeam.name}
          </h1>

          <p className="mt-2 text-slate-600">
            {activeTeam.description || "No description"}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Your role: {currentMembership?.role || "Member"}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1">
              {activeTeam.members?.length || 0} members
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1">
              {activeTeam.goals?.length || 0} goals
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1">
              {activeTeam.actionItems?.length || 0} action items
            </span>
          </div>
        </header>

        {error && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <section className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Members</h2>

              <div className="mt-4 space-y-3">
                {activeTeam.members?.map(member => (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-slate-200 p-3"
                  >
                    <p className="font-semibold text-slate-950">
                      {member.user.name}
                    </p>

                    <p className="text-sm text-slate-600">
                      {member.user.email}
                    </p>

                    <p className="mt-1 text-xs font-bold uppercase text-slate-500">
                      {member.role}
                    </p>

                    {isOwner && member.role !== "OWNER" && (
                      <div className="mt-3 flex gap-2">
                        <select
                          value={member.role}
                          onChange={event =>
                            handleRoleChange(member.user.id, event.target.value)
                          }
                          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.user.id)}
                          className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {canManageWorkspace && (
              <form
                onSubmit={handleUpdateWorkspace}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-bold text-slate-950">
                  Workspace Settings
                </h2>

                <div className="mt-4 space-y-3">
                  <Input
                    name="name"
                    placeholder="Workspace name"
                    value={workspaceForm.name}
                    onChange={handleWorkspaceChange}
                    required
                  />

                  <Textarea
                    name="description"
                    placeholder="Workspace description"
                    value={workspaceForm.description}
                    onChange={handleWorkspaceChange}
                    rows={3}
                  />

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Accent colour
                    </label>

                    <input
                      name="accentColor"
                      type="color"
                      value={workspaceForm.accentColor}
                      onChange={handleWorkspaceChange}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white p-1"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting === "workspace"}
                  className="mt-4 w-full"
                >
                  {submitting === "workspace" ? "Saving..." : "Save Workspace"}
                </Button>
              </form>
            )}

            {canManageWorkspace && (
              <form
                onSubmit={handleInviteMember}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-bold text-slate-950">
                  Invite Member
                </h2>

                <div className="mt-4 space-y-3">
                  <Input
                    name="email"
                    type="email"
                    placeholder="Member email"
                    value={inviteForm.email}
                    onChange={handleInviteChange}
                    required
                  />

                  <select
                    name="role"
                    value={inviteForm.role}
                    onChange={handleInviteChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-950"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={submitting === "invite"}
                  className="mt-4 w-full"
                >
                  {submitting === "invite" ? "Inviting..." : "Invite Member"}
                </Button>
              </form>
            )}

            <form
              onSubmit={handleCreateGoal}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-slate-950">Create Goal</h2>

              <div className="mt-4 space-y-3">
                <Input
                  name="title"
                  placeholder="Goal title"
                  value={goalForm.title}
                  onChange={handleGoalChange}
                  required
                />

                <Textarea
                  name="description"
                  placeholder="Goal description"
                  value={goalForm.description}
                  onChange={handleGoalChange}
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting === "goal"}
                className="mt-4 w-full"
              >
                {submitting === "goal" ? "Creating..." : "Add Goal"}
              </Button>
            </form>
          </aside>

          <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-2">
              <form
                onSubmit={handleCreateAnnouncement}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-bold text-slate-950">
                  Create Announcement
                </h2>

                <div className="mt-4 space-y-3">
                  <Input
                    name="title"
                    placeholder="Announcement title"
                    value={announcementForm.title}
                    onChange={handleAnnouncementChange}
                    required
                  />

                  <Textarea
                    name="content"
                    placeholder="Announcement content"
                    value={announcementForm.content}
                    onChange={handleAnnouncementChange}
                    rows={4}
                    required
                  />

                  <input
                    name="attachment"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleAnnouncementChange}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting === "announcement"}
                  className="mt-4 w-full"
                >
                  {submitting === "announcement"
                    ? "Posting..."
                    : "Post Announcement"}
                </Button>
              </form>

              <form
                onSubmit={handleCreateActionItem}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-bold text-slate-950">
                  Create Action Item
                </h2>

                <div className="mt-4 space-y-3">
                  <Input
                    name="title"
                    placeholder="Action item title"
                    value={actionItemForm.title}
                    onChange={handleActionItemChange}
                    required
                  />

                  <Textarea
                    name="description"
                    placeholder="Action item description"
                    value={actionItemForm.description}
                    onChange={handleActionItemChange}
                    rows={3}
                  />

                  <select
                    name="assigneeId"
                    value={actionItemForm.assigneeId}
                    onChange={handleActionItemChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-950"
                  >
                    <option value="">No assignee</option>
                    {activeTeam.members?.map(member => (
                      <option key={member.user.id} value={member.user.id}>
                        {member.user.name}
                      </option>
                    ))}
                  </select>

                  <Input
                    name="dueDate"
                    type="date"
                    value={actionItemForm.dueDate}
                    onChange={handleActionItemChange}
                  />

                  <input
                    name="attachment"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleActionItemChange}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting === "actionItem"}
                  className="mt-4 w-full"
                >
                  {submitting === "actionItem"
                    ? "Creating..."
                    : "Add Action Item"}
                </Button>
              </form>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Goals</h2>

                <div className="mt-4 space-y-3">
                  {activeTeam.goals?.length === 0 ? (
                    <p className="text-sm text-slate-600">No goals yet.</p>
                  ) : (
                    activeTeam.goals?.map(goal => (
                      <div
                        key={goal.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <p className="font-semibold text-slate-950">
                          {goal.title}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {goal.description || "No description"}
                        </p>

                        <p className="mt-2 text-xs font-bold uppercase text-slate-500">
                          {goal.completed ? "Completed" : "In progress"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">
                  Announcements
                </h2>

                <div className="mt-4 space-y-3">
                  {activeTeam.announcements?.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      No announcements yet.
                    </p>
                  ) : (
                    activeTeam.announcements?.map(announcement => (
                      <div
                        key={announcement.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <p className="font-semibold text-slate-950">
                          {announcement.title}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {announcement.content}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Posted by {announcement.author?.name}
                        </p>

                        {announcement.attachmentUrl && (
                          <a
                            href={announcement.attachmentUrl}
                            target="_blank"
                            className="mt-3 inline-block text-sm font-semibold text-slate-950 underline"
                          >
                            View attachment
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">
                  Action Items
                </h2>

                <div className="mt-4 space-y-3">
                  {activeTeam.actionItems?.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      No action items yet.
                    </p>
                  ) : (
                    activeTeam.actionItems?.map(item => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <p className="font-semibold text-slate-950">
                          {item.title}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {item.description || "No description"}
                        </p>

                        <div className="mt-3">
                          <select
                            value={item.status}
                            onChange={event =>
                              handleUpdateActionStatus(
                                item.id,
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-950"
                          >
                            <option value="TODO">TODO</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="DONE">DONE</option>
                          </select>
                        </div>

                        {item.assignee && (
                          <p className="mt-2 text-xs text-slate-500">
                            Assigned to {item.assignee.name}
                          </p>
                        )}

                        {item.dueDate && (
                          <p className="mt-1 text-xs text-slate-500">
                            Due {new Date(item.dueDate).toLocaleDateString()}
                          </p>
                        )}

                        {item.attachmentUrl && (
                          <a
                            href={item.attachmentUrl}
                            target="_blank"
                            className="mt-3 inline-block text-sm font-semibold text-slate-950 underline"
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
        </section>
      </div>
    </main>
  );
}