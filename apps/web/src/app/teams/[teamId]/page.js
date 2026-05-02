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

const GOAL_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"];
const ANNOUNCEMENT_EMOJIS = ["👍", "🎉", "🚀", "❤️", "✅"];

const ACTION_STATUSES = ["TODO", "IN_PROGRESS", "DONE"];
const ACTION_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

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
    description: "",
    ownerId: "",
    dueDate: "",
    status: "NOT_STARTED"
  });

  const [milestoneForms, setMilestoneForms] = useState({});
  const [goalUpdateForms, setGoalUpdateForms] = useState({});
  const [commentForms, setCommentForms] = useState({});

  const [actionView, setActionView] = useState("kanban");

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    attachment: null,
    isPinned: false
  });

  const [actionItemForm, setActionItemForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    goalId: "",
    priority: "MEDIUM",
    dueDate: "",
    attachment: null
  });

  const [submitting, setSubmitting] = useState("");
  const [error, setError] = useState("");

  const refreshTeam = useCallback(async () => {
    await fetchTeamById(teamId);
  }, [fetchTeamById, teamId]);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const { onlineMembers } = useTeamSocket(
    teamId,
    refreshTeam,
    user,
    notification => {
      setNotifications(previous => [notification, ...previous]);
    }
  );

  const currentMembership = useMemo(() => {
    return activeTeam?.members?.find(member => member.user.id === user?.id);
  }, [activeTeam, user]);

  const onlineMemberIds = useMemo(() => {
    return new Set(onlineMembers.map(member => member.id));
  }, [onlineMembers]);

  const unreadNotificationCount = notifications.filter(
    notification => !notification.read
  ).length;

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

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await api.get("/api/notifications");
        setNotifications(res.data.notifications);
      } catch {
        setNotifications([]);
      }
    }

    if (user?.id) {
      loadNotifications();
    }
  }, [user]);

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
    const { name, value, files, type, checked } = event.target;

    setAnnouncementForm({
      ...announcementForm,
      [name]: files ? files[0] : type === "checkbox" ? checked : value
    });
  }

  function handleActionItemChange(event) {
    const { name, value, files } = event.target;

    setActionItemForm({
      ...actionItemForm,
      [name]: files ? files[0] : value
    });
  }

  function handleMilestoneChange(goalId, event) {
    const { name, value } = event.target;

    setMilestoneForms(previous => ({
      ...previous,
      [goalId]: {
        title: "",
        description: "",
        progress: 0,
        dueDate: "",
        ...(previous[goalId] || {}),
        [name]: value
      }
    }));
  }

  function handleGoalUpdateChange(goalId, event) {
    const { value } = event.target;

    setGoalUpdateForms(previous => ({
      ...previous,
      [goalId]: value
    }));
  }

  function handleCommentChange(announcementId, event) {
    setCommentForms(previous => ({
      ...previous,
      [announcementId]: event.target.value
    }));
  }

  function getReactionCount(announcement, emoji) {
    return (
      announcement.reactions?.filter(reaction => reaction.emoji === emoji)
        .length || 0
    );
  }

  function hasUserReacted(announcement, emoji) {
    return announcement.reactions?.some(
      reaction => reaction.emoji === emoji && reaction.userId === user?.id
    );
  }


  function getActionItemsByStatus(status) {
    return activeTeam.actionItems?.filter(item => item.status === status) || [];
  }

  function getPriorityBadgeClass(priority) {
    if (priority === "URGENT") return "bg-red-100 text-red-700";
    if (priority === "HIGH") return "bg-orange-100 text-orange-700";
    if (priority === "MEDIUM") return "bg-blue-100 text-blue-700";
    return "bg-slate-100 text-slate-700";
  }



  async function handleToggleAnnouncementPin(announcement) {
    setError("");

    try {
      await api.patch(`/api/announcements/${announcement.id}`, {
        isPinned: !announcement.isPinned
      });

      await refreshTeam();
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to update announcement pin"
      );
    }
  }

  async function handleAnnouncementReaction(announcementId, emoji) {
    setError("");

    try {
      await api.post(`/api/announcements/${announcementId}/reactions`, {
        emoji
      });

      await refreshTeam();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to react");
    }
  }

  async function handleCreateAnnouncementComment(event, announcementId) {
    event.preventDefault();
    setError("");
    setSubmitting(`comment-${announcementId}`);

    try {
      await api.post(`/api/announcements/${announcementId}/comments`, {
        content: commentForms[announcementId]
      });

      setCommentForms(previous => ({
        ...previous,
        [announcementId]: ""
      }));

      await refreshTeam();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to add comment");
    } finally {
      setSubmitting("");
    }
  }



  function getAverageMilestoneProgress(goal) {
    if (!goal.milestones || goal.milestones.length === 0) {
      return goal.status === "COMPLETED" ? 100 : 0;
    }

    const total = goal.milestones.reduce(
      (sum, milestone) => sum + Number(milestone.progress || 0),
      0
    );

    return Math.round(total / goal.milestones.length);
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
        description: goalForm.description,
        ownerId: goalForm.ownerId || null,
        dueDate: goalForm.dueDate || null,
        status: goalForm.status
      });

      setGoalForm({
        title: "",
        description: "",
        ownerId: "",
        dueDate: "",
        status: "NOT_STARTED"
      });

      await refreshTeam();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create goal");
    } finally {
      setSubmitting("");
    }
  }

  async function handleUpdateGoal(goalId, payload) {
    setError("");

    try {
      await api.patch(`/api/goals/${goalId}`, payload);
      await refreshTeam();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update goal");
    }
  }

  async function handleCreateMilestone(event, goalId) {
    event.preventDefault();
    setError("");
    setSubmitting(`milestone-${goalId}`);

    const form = milestoneForms[goalId] || {
      title: "",
      description: "",
      progress: 0,
      dueDate: ""
    };

    try {
      await api.post(`/api/goals/${goalId}/milestones`, {
        title: form.title,
        description: form.description,
        progress: Number(form.progress || 0),
        dueDate: form.dueDate || null
      });

      setMilestoneForms(previous => ({
        ...previous,
        [goalId]: {
          title: "",
          description: "",
          progress: 0,
          dueDate: ""
        }
      }));

      await refreshTeam();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create milestone");
    } finally {
      setSubmitting("");
    }
  }

  async function handleUpdateMilestone(goalId, milestoneId, payload) {
    setError("");

    try {
      await api.patch(`/api/goals/${goalId}/milestones/${milestoneId}`, payload);
      await refreshTeam();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update milestone");
    }
  }

  async function handleCreateGoalUpdate(event, goalId) {
    event.preventDefault();
    setError("");
    setSubmitting(`goal-update-${goalId}`);

    try {
      await api.post(`/api/goals/${goalId}/updates`, {
        content: goalUpdateForms[goalId]
      });

      setGoalUpdateForms(previous => ({
        ...previous,
        [goalId]: ""
      }));

      await refreshTeam();
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to add progress update"
      );
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
      formData.append("isPinned", String(announcementForm.isPinned));

      if (announcementForm.attachment) {
        formData.append("attachment", announcementForm.attachment);
      }

      await api.post("/api/announcements", formData);

      setAnnouncementForm({
        title: "",
        content: "",
        attachment: null,
        isPinned: false
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

      if (actionItemForm.goalId) {
        formData.append("goalId", actionItemForm.goalId);
      }

      formData.append("priority", actionItemForm.priority);

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
        goalId: "",
        priority: "MEDIUM",
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

  async function handleMarkAllNotificationsRead() {
    try {
      await api.patch("/api/notifications/read-all");

      setNotifications(previous =>
        previous.map(notification => ({
          ...notification,
          read: true
        }))
      );
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update notifications");
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

          {/* ADD NOTIFICATION PANEL HERE */}
          <div className="relative mt-5">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Notifications
              {unreadNotificationCount > 0 && (
                <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute z-20 mt-3 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-950">Notifications</h3>

                  <button
                    type="button"
                    onClick={handleMarkAllNotificationsRead}
                    className="text-xs font-semibold text-slate-600 underline"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No notifications yet.
                    </p>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`rounded-xl p-3 text-sm ${notification.read
                          ? "bg-slate-50 text-slate-600"
                          : "bg-blue-50 text-slate-900"
                          }`}
                      >
                        <p>{notification.message}</p>

                        <p className="mt-1 text-xs text-slate-500">
                          {notification.team?.name} ·{" "}
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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

                    <p
                      className={`mt-2 text-xs font-bold ${onlineMemberIds.has(member.user.id)
                          ? "text-emerald-600"
                          : "text-slate-400"
                        }`}
                    >
                      {onlineMemberIds.has(member.user.id) ? "● Online" : "○ Offline"}
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

                <select
                  name="ownerId"
                  value={goalForm.ownerId}
                  onChange={handleGoalChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-950"
                >
                  <option value="">No owner</option>
                  {activeTeam.members?.map(member => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.name}
                    </option>
                  ))}
                </select>

                <Input
                  name="dueDate"
                  type="date"
                  value={goalForm.dueDate}
                  onChange={handleGoalChange}
                />

                <select
                  name="status"
                  value={goalForm.status}
                  onChange={handleGoalChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-950"
                >
                  {GOAL_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
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

                <p className="mt-1 text-sm text-slate-600">
                  Use multiple lines for rich-text-style formatting.
                </p>

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
                    placeholder={"Announcement content\n\nExample:\n- Update 1\n- Update 2\n\nNext steps..."}
                    value={announcementForm.content}
                    onChange={handleAnnouncementChange}
                    rows={6}
                    required
                  />

                  {canManageWorkspace && (
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700">
                      <input
                        name="isPinned"
                        type="checkbox"
                        checked={announcementForm.isPinned}
                        onChange={handleAnnouncementChange}
                        className="h-4 w-4"
                      />
                      Pin this announcement
                    </label>
                  )}

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

                  <select
                    name="goalId"
                    value={actionItemForm.goalId}
                    onChange={handleActionItemChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-950"
                  >
                    <option value="">No parent goal</option>
                    {activeTeam.goals?.map(goal => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </select>

                  <select
                    name="priority"
                    value={actionItemForm.priority}
                    onChange={handleActionItemChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-950"
                  >
                    {ACTION_PRIORITIES.map(priority => (
                      <option key={priority} value={priority}>
                        {priority}
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

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Goals & Milestones
              </h2>

              <div className="mt-5 space-y-5">
                {activeTeam.goals?.length === 0 ? (
                  <p className="text-sm text-slate-600">No goals yet.</p>
                ) : (
                  activeTeam.goals?.map(goal => {
                    const progress = getAverageMilestoneProgress(goal);
                    const milestoneForm = milestoneForms[goal.id] || {
                      title: "",
                      description: "",
                      progress: 0,
                      dueDate: ""
                    };

                    return (
                      <article
                        key={goal.id}
                        className="rounded-3xl border border-slate-200 p-5"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-slate-950">
                              {goal.title}
                            </h3>

                            <p className="mt-1 text-sm text-slate-600">
                              {goal.description || "No description"}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                              <span className="rounded-full bg-slate-100 px-3 py-1">
                                Status: {goal.status || "NOT_STARTED"}
                              </span>

                              <span className="rounded-full bg-slate-100 px-3 py-1">
                                Owner: {goal.owner?.name || "Unassigned"}
                              </span>

                              {goal.dueDate && (
                                <span className="rounded-full bg-slate-100 px-3 py-1">
                                  Due:{" "}
                                  {new Date(goal.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="min-w-[220px] space-y-2">
                            <select
                              value={goal.status || "NOT_STARTED"}
                              onChange={event =>
                                handleUpdateGoal(goal.id, {
                                  status: event.target.value
                                })
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900"
                            >
                              {GOAL_STATUSES.map(status => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>

                            <select
                              value={goal.ownerId || ""}
                              onChange={event =>
                                handleUpdateGoal(goal.id, {
                                  ownerId: event.target.value || null
                                })
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900"
                            >
                              <option value="">No owner</option>
                              {activeTeam.members?.map(member => (
                                <option
                                  key={member.user.id}
                                  value={member.user.id}
                                >
                                  {member.user.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                            <span>Milestone progress</span>
                            <span>{progress}%</span>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-slate-950 transition-all"
                              style={{
                                width: `${progress}%`
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-5 grid gap-5 lg:grid-cols-2">
                          <div>
                            <h4 className="font-semibold text-slate-950">
                              Milestones
                            </h4>

                            <div className="mt-3 space-y-3">
                              {goal.milestones?.length === 0 ? (
                                <p className="text-sm text-slate-600">
                                  No milestones yet.
                                </p>
                              ) : (
                                goal.milestones?.map(milestone => (
                                  <div
                                    key={milestone.id}
                                    className="rounded-2xl border border-slate-200 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="font-semibold text-slate-950">
                                          {milestone.title}
                                        </p>

                                        <p className="text-sm text-slate-600">
                                          {milestone.description ||
                                            "No description"}
                                        </p>

                                        {milestone.dueDate && (
                                          <p className="mt-1 text-xs text-slate-500">
                                            Due{" "}
                                            {new Date(
                                              milestone.dueDate
                                            ).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>

                                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                                        {milestone.progress}%
                                      </span>
                                    </div>

                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={milestone.progress}
                                      onChange={event =>
                                        handleUpdateMilestone(
                                          goal.id,
                                          milestone.id,
                                          {
                                            progress: Number(event.target.value)
                                          }
                                        )
                                      }
                                      className="mt-3 w-full"
                                    />
                                  </div>
                                ))
                              )}
                            </div>

                            <form
                              onSubmit={event =>
                                handleCreateMilestone(event, goal.id)
                              }
                              className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4"
                            >
                              <h5 className="text-sm font-bold text-slate-950">
                                Add milestone
                              </h5>

                              <div className="mt-3 space-y-3">
                                <Input
                                  name="title"
                                  placeholder="Milestone title"
                                  value={milestoneForm.title}
                                  onChange={event =>
                                    handleMilestoneChange(goal.id, event)
                                  }
                                  required
                                />

                                <Textarea
                                  name="description"
                                  placeholder="Milestone description"
                                  value={milestoneForm.description}
                                  onChange={event =>
                                    handleMilestoneChange(goal.id, event)
                                  }
                                  rows={2}
                                />

                                <Input
                                  name="progress"
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="Progress %"
                                  value={milestoneForm.progress}
                                  onChange={event =>
                                    handleMilestoneChange(goal.id, event)
                                  }
                                />

                                <Input
                                  name="dueDate"
                                  type="date"
                                  value={milestoneForm.dueDate}
                                  onChange={event =>
                                    handleMilestoneChange(goal.id, event)
                                  }
                                />
                              </div>

                              <Button
                                type="submit"
                                disabled={submitting === `milestone-${goal.id}`}
                                className="mt-3 w-full"
                              >
                                {submitting === `milestone-${goal.id}`
                                  ? "Adding..."
                                  : "Add Milestone"}
                              </Button>
                            </form>
                          </div>

                          <div>
                            <h4 className="font-semibold text-slate-950">
                              Activity Feed
                            </h4>

                            <form
                              onSubmit={event =>
                                handleCreateGoalUpdate(event, goal.id)
                              }
                              className="mt-3"
                            >
                              <Textarea
                                placeholder="Post a progress update..."
                                value={goalUpdateForms[goal.id] || ""}
                                onChange={event =>
                                  handleGoalUpdateChange(goal.id, event)
                                }
                                rows={3}
                                required
                              />

                              <Button
                                type="submit"
                                disabled={
                                  submitting === `goal-update-${goal.id}`
                                }
                                className="mt-3 w-full"
                              >
                                {submitting === `goal-update-${goal.id}`
                                  ? "Posting..."
                                  : "Post Update"}
                              </Button>
                            </form>

                            <div className="mt-4 space-y-3">
                              {goal.updates?.length === 0 ? (
                                <p className="text-sm text-slate-600">
                                  No progress updates yet.
                                </p>
                              ) : (
                                goal.updates?.map(update => (
                                  <div
                                    key={update.id}
                                    className="rounded-2xl border border-slate-200 p-3"
                                  >
                                    <p className="text-sm text-slate-700">
                                      {update.content}
                                    </p>

                                    <p className="mt-2 text-xs text-slate-500">
                                      {update.author?.name} ·{" "}
                                      {new Date(
                                        update.createdAt
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">
                  Announcements
                </h2>

                <div className="mt-4 space-y-4">
                  {activeTeam.announcements?.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      No announcements yet.
                    </p>
                  ) : (
                    activeTeam.announcements?.map(announcement => (
                      <div
                        key={announcement.id}
                        className={`rounded-2xl border p-4 ${announcement.isPinned
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-200 bg-white"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-950">
                                {announcement.title}
                              </p>

                              {announcement.isPinned && (
                                <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-bold text-amber-900">
                                  Pinned
                                </span>
                              )}
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {announcement.content}
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                              Posted by {announcement.author?.name}
                            </p>
                          </div>

                          {canManageWorkspace && (
                            <button
                              type="button"
                              onClick={() => handleToggleAnnouncementPin(announcement)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              {announcement.isPinned ? "Unpin" : "Pin"}
                            </button>
                          )}
                        </div>

                        {announcement.attachmentUrl && (
                          <a
                            href={announcement.attachmentUrl}
                            target="_blank"
                            className="mt-3 inline-block text-sm font-semibold text-slate-950 underline"
                          >
                            View attachment
                          </a>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {ANNOUNCEMENT_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() =>
                                handleAnnouncementReaction(announcement.id, emoji)
                              }
                              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${hasUserReacted(announcement, emoji)
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-950"
                                }`}
                            >
                              {emoji} {getReactionCount(announcement, emoji)}
                            </button>
                          ))}
                        </div>

                        <div className="mt-5 border-t border-slate-200 pt-4">
                          <h4 className="text-sm font-bold text-slate-950">
                            Comments
                          </h4>

                          <div className="mt-3 space-y-3">
                            {announcement.comments?.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                No comments yet.
                              </p>
                            ) : (
                              announcement.comments?.map(comment => (
                                <div
                                  key={comment.id}
                                  className="rounded-2xl bg-slate-50 p-3"
                                >
                                  <p className="text-sm text-slate-700">
                                    {comment.content}
                                  </p>

                                  <p className="mt-2 text-xs text-slate-500">
                                    {comment.author?.name} ·{" "}
                                    {new Date(comment.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>

                          <form
                            onSubmit={event =>
                              handleCreateAnnouncementComment(event, announcement.id)
                            }
                            className="mt-3 flex gap-2"
                          >
                            <Input
                              placeholder="Write a comment... mention with @email@example.com"
                              value={commentForms[announcement.id] || ""}
                              onChange={event =>
                                handleCommentChange(announcement.id, event)
                              }
                              required
                            />

                            <Button
                              type="submit"
                              disabled={submitting === `comment-${announcement.id}`}
                            >
                              {submitting === `comment-${announcement.id}`
                                ? "Posting..."
                                : "Comment"}
                            </Button>
                          </form>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      Action Items
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      Track work by priority, assignee, parent goal, and status.
                    </p>
                  </div>

                  <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setActionView("kanban")}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${actionView === "kanban"
                        ? "bg-slate-950 text-white"
                        : "text-slate-600"
                        }`}
                    >
                      Kanban
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionView("list")}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${actionView === "list"
                        ? "bg-slate-950 text-white"
                        : "text-slate-600"
                        }`}
                    >
                      List
                    </button>
                  </div>
                </div>

                {activeTeam.actionItems?.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-600">
                    No action items yet.
                  </p>
                ) : actionView === "kanban" ? (
                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {ACTION_STATUSES.map(status => (
                      <div
                        key={status}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-800">
                            {status}
                          </h3>

                          <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500">
                            {getActionItemsByStatus(status).length}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {getActionItemsByStatus(status).length === 0 ? (
                            <p className="text-sm text-slate-500">No items.</p>
                          ) : (
                            getActionItemsByStatus(status).map(item => (
                              <div
                                key={item.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <p className="font-semibold text-slate-950">
                                    {item.title}
                                  </p>

                                  <span
                                    className={`rounded-full px-2 py-1 text-xs font-bold ${getPriorityBadgeClass(
                                      item.priority
                                    )}`}
                                  >
                                    {item.priority || "MEDIUM"}
                                  </span>
                                </div>

                                <p className="mt-1 text-sm text-slate-600">
                                  {item.description || "No description"}
                                </p>

                                {item.goal && (
                                  <p className="mt-2 text-xs text-slate-500">
                                    Goal: {item.goal.title}
                                  </p>
                                )}

                                {item.assignee && (
                                  <p className="mt-1 text-xs text-slate-500">
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
                                    className="mt-2 inline-block text-sm font-semibold text-slate-950 underline"
                                  >
                                    View attachment
                                  </a>
                                )}

                                <select
                                  value={item.status}
                                  onChange={event =>
                                    handleUpdateActionStatus(item.id, event.target.value)
                                  }
                                  className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-950"
                                >
                                  {ACTION_STATUSES.map(statusOption => (
                                    <option key={statusOption} value={statusOption}>
                                      {statusOption}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-6 bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500">
                      <span className="col-span-2">Item</span>
                      <span>Priority</span>
                      <span>Status</span>
                      <span>Assignee</span>
                      <span>Goal</span>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {activeTeam.actionItems?.map(item => (
                        <div
                          key={item.id}
                          className="grid grid-cols-6 items-center gap-3 px-4 py-4 text-sm"
                        >
                          <div className="col-span-2">
                            <p className="font-semibold text-slate-950">
                              {item.title}
                            </p>

                            <p className="text-slate-600">
                              {item.description || "No description"}
                            </p>

                            {item.dueDate && (
                              <p className="mt-1 text-xs text-slate-500">
                                Due {new Date(item.dueDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>

                          <span
                            className={`w-fit rounded-full px-2 py-1 text-xs font-bold ${getPriorityBadgeClass(
                              item.priority
                            )}`}
                          >
                            {item.priority || "MEDIUM"}
                          </span>

                          <select
                            value={item.status}
                            onChange={event =>
                              handleUpdateActionStatus(item.id, event.target.value)
                            }
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900"
                          >
                            {ACTION_STATUSES.map(statusOption => (
                              <option key={statusOption} value={statusOption}>
                                {statusOption}
                              </option>
                            ))}
                          </select>

                          <span className="text-slate-600">
                            {item.assignee?.name || "Unassigned"}
                          </span>

                          <span className="text-slate-600">
                            {item.goal?.title || "No goal"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}