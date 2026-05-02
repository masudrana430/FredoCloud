"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { useTeamSocket } from "@/hooks/useTeamSocket";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

const GOAL_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"];
const ACTION_STATUSES = ["TODO", "IN_PROGRESS", "DONE"];
const ACTION_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const ANNOUNCEMENT_EMOJIS = ["👍", "🎉", "🚀", "❤️", "✅"];
const CHART_COLORS = ["#16a34a", "#2563eb", "#64748b", "#f59e0b"];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api-production-e292.up.railway.app";

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

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    attachment: null,
    isPinned: false
  });

  const [commentForms, setCommentForms] = useState({});

  const [actionItemForm, setActionItemForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    goalId: "",
    priority: "MEDIUM",
    dueDate: "",
    attachment: null
  });

  const [actionView, setActionView] = useState("kanban");

  const [analytics, setAnalytics] = useState(null);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState({
    action: "",
    entity: ""
  });

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [submitting, setSubmitting] = useState("");
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await api.get(`/api/analytics/${teamId}`);
      setAnalytics(res.data);
    } catch {
      setAnalytics(null);
    }
  }, [teamId]);

  const loadAuditLogs = useCallback(
    async (filters = { action: "", entity: "" }) => {
      try {
        const params = new URLSearchParams();

        if (filters.action) {
          params.append("action", filters.action);
        }

        if (filters.entity) {
          params.append("entity", filters.entity);
        }

        const query = params.toString();

        const res = await api.get(
          `/api/audit-logs/${teamId}${query ? `?${query}` : ""}`
        );

        setAuditLogs(res.data.logs);
      } catch {
        setAuditLogs([]);
      }
    },
    [teamId]
  );

  const refreshTeam = useCallback(async () => {
    await fetchTeamById(teamId);
    await loadAnalytics();
    await loadAuditLogs(auditFilter);
  }, [fetchTeamById, teamId, loadAnalytics, loadAuditLogs, auditFilter]);

  const handleSocketNotification = useCallback(notification => {
    setNotifications(previous => [notification, ...previous]);
  }, []);

  const { onlineMembers } = useTeamSocket(
    teamId,
    refreshTeam,
    user,
    handleSocketNotification
  );

  const currentMembership = useMemo(() => {
    return activeTeam?.members?.find(member => member.user.id === user?.id);
  }, [activeTeam, user]);

  const canManageWorkspace =
    currentMembership?.role === "OWNER" || currentMembership?.role === "ADMIN";

  const isOwner = currentMembership?.role === "OWNER";

  const onlineMemberIds = useMemo(() => {
    return new Set(onlineMembers.map(member => member.id));
  }, [onlineMembers]);

  const unreadNotificationCount = notifications.filter(
    notification => !notification.read
  ).length;

  useEffect(() => {
    async function initialize() {
      const currentUser = await fetchMe();

      if (!currentUser) {
        router.push("/login");
        return;
      }

      await fetchTeamById(teamId);
      await loadAnalytics();
      await loadAuditLogs();
    }

    initialize();

    return () => {
      clearActiveTeam();
    };
  }, [
    teamId,
    fetchMe,
    fetchTeamById,
    clearActiveTeam,
    router,
    loadAnalytics,
    loadAuditLogs
  ]);

  useEffect(() => {
    if (!activeTeam) return;

    setWorkspaceForm({
      name: activeTeam.name || "",
      description: activeTeam.description || "",
      accentColor: activeTeam.accentColor || "#0f172a"
    });
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
    setWorkspaceForm(previous => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
  }

  function handleInviteChange(event) {
    setInviteForm(previous => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
  }

  function handleGoalChange(event) {
    setGoalForm(previous => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
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
    setGoalUpdateForms(previous => ({
      ...previous,
      [goalId]: event.target.value
    }));
  }

  function handleAnnouncementChange(event) {
    const { name, value, files, type, checked } = event.target;

    setAnnouncementForm(previous => ({
      ...previous,
      [name]: files ? files[0] : type === "checkbox" ? checked : value
    }));
  }

  function handleCommentChange(announcementId, event) {
    setCommentForms(previous => ({
      ...previous,
      [announcementId]: event.target.value
    }));
  }

  function handleActionItemChange(event) {
    const { name, value, files } = event.target;

    setActionItemForm(previous => ({
      ...previous,
      [name]: files ? files[0] : value
    }));
  }

  function handleAuditFilterChange(event) {
    const nextFilters = {
      ...auditFilter,
      [event.target.name]: event.target.value
    };

    setAuditFilter(nextFilters);
    loadAuditLogs(nextFilters);
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
    return activeTeam?.actionItems?.filter(item => item.status === status) || [];
  }

  function getPriorityBadgeClass(priority) {
    if (priority === "URGENT") return "bg-red-100 text-red-700";
    if (priority === "HIGH") return "bg-orange-100 text-orange-700";
    if (priority === "MEDIUM") return "bg-blue-100 text-blue-700";
    return "bg-slate-100 text-slate-700";
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
      formData.append("content", announcementForm.content);
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

  async function handleCreateActionItem(event) {
    event.preventDefault();
    setError("");
    setSubmitting("actionItem");

    try {
      const formData = new FormData();

      formData.append("teamId", teamId);
      formData.append("title", actionItemForm.title);
      formData.append("description", actionItemForm.description);
      formData.append("priority", actionItemForm.priority);

      if (actionItemForm.assigneeId) {
        formData.append("assigneeId", actionItemForm.assigneeId);
      }

      if (actionItemForm.goalId) {
        formData.append("goalId", actionItemForm.goalId);
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
      setError(
        error.response?.data?.message || "Failed to update notifications"
      );
    }
  }

  async function handleExportCsv() {
    try {
      const response = await api.get(`/api/analytics/${teamId}/export.csv`, {
        responseType: "blob"
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = blobUrl;
      link.setAttribute("download", `${activeTeam.name}-export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to export CSV");
    }
  }

  async function handleExportAuditCsv() {
    try {
      const response = await api.get(`/api/audit-logs/${teamId}/export.csv`, {
        responseType: "blob"
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = blobUrl;
      link.setAttribute("download", `${activeTeam.name}-audit-log.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to export audit log");
    }
  }

  if (loading || !activeTeam) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/10 px-8 py-6 shadow-2xl backdrop-blur">
          <p className="text-sm font-medium text-slate-200">
            Loading workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_35%),linear-gradient(135deg,#f8fafc,#eef2ff)] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="inline-flex rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur transition hover:border-slate-950 hover:text-slate-950"
        >
          ← Back to workspaces
        </Link>

        <header className="mt-6 overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-200/70 backdrop-blur">
          <div
            className="mb-5 h-2 rounded-full"
            style={{
              backgroundColor: activeTeam.accentColor || "#0f172a"
            }}
          />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">
                Workspace Command Center
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                {activeTeam.name}
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                {activeTeam.description || "No description"}
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Role: {currentMembership?.role || "Member"}
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
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="rounded-2xl border border-slate-200 bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
              >
                Notifications
                {unreadNotificationCount > 0 && (
                  <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 z-20 mt-3 w-[min(28rem,90vw)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-950">
                      Notifications
                    </h3>

                    <button
                      type="button"
                      onClick={handleMarkAllNotificationsRead}
                      className="text-xs font-bold text-slate-600 underline"
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`rounded-2xl p-3 text-sm ${
                            notification.read
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
          </div>
        </header>

        {error && (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </p>
        )}

        {analytics && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-200/70 backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    Analytics
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    Completion, overdue work, and workspace delivery health.
                  </p>
                </div>

                <Button type="button" onClick={handleExportCsv}>
                  Export CSV
                </Button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <MetricCard
                  label="Total Goals"
                  value={analytics.stats.totalGoals}
                />
                <MetricCard
                  label="Completed This Week"
                  value={analytics.stats.completedItemsThisWeek}
                />
                <MetricCard
                  label="Overdue"
                  value={analytics.stats.overdueCount}
                  danger
                />
                <MetricCard
                  label="Goal Completion"
                  value={`${analytics.stats.goalCompletionRate}%`}
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-200/70 backdrop-blur">
              <h3 className="text-lg font-black text-slate-950">
                Goal Status
              </h3>

              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.goalStatusChart}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {analytics.goalStatusChart.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-2">
                {analytics.goalStatusChart.map((entry, index) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[index % CHART_COLORS.length]
                        }}
                      />
                      <span className="text-slate-600">{entry.name}</span>
                    </div>

                    <span className="font-bold text-slate-950">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-6">
            <Card title="Members">
              <div className="space-y-3">
                {activeTeam.members?.map(member => (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="font-bold text-slate-950">
                      {member.user.name}
                    </p>

                    <p className="text-sm text-slate-600">
                      {member.user.email}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black uppercase text-slate-500">
                        {member.role}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-black ${
                          onlineMemberIds.has(member.user.id)
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {onlineMemberIds.has(member.user.id)
                          ? "● Online"
                          : "○ Offline"}
                      </span>
                    </div>

                    {isOwner && member.role !== "OWNER" && (
                      <div className="mt-3 flex gap-2">
                        <select
                          value={member.role}
                          onChange={event =>
                            handleRoleChange(member.user.id, event.target.value)
                          }
                          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.user.id)}
                          className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {canManageWorkspace && (
              <Card title="Workspace Settings">
                <form onSubmit={handleUpdateWorkspace} className="space-y-3">
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
                    <label className="text-sm font-bold text-slate-700">
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

                  <Button
                    type="submit"
                    disabled={submitting === "workspace"}
                    className="w-full"
                  >
                    {submitting === "workspace" ? "Saving..." : "Save"}
                  </Button>
                </form>
              </Card>
            )}

            {canManageWorkspace && (
              <Card title="Invite Member">
                <form onSubmit={handleInviteMember} className="space-y-3">
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <Button
                    type="submit"
                    disabled={submitting === "invite"}
                    className="w-full"
                  >
                    {submitting === "invite" ? "Inviting..." : "Invite"}
                  </Button>
                </form>
              </Card>
            )}

            <Card title="Create Goal">
              <form onSubmit={handleCreateGoal} className="space-y-3">
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                >
                  {GOAL_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <Button
                  type="submit"
                  disabled={submitting === "goal"}
                  className="w-full"
                >
                  {submitting === "goal" ? "Creating..." : "Add Goal"}
                </Button>
              </form>
            </Card>
          </aside>

          <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-2">
              {canManageWorkspace ? (
                <Card title="Create Announcement">
                  <form onSubmit={handleCreateAnnouncement} className="space-y-3">
                    <Input
                      name="title"
                      placeholder="Announcement title"
                      value={announcementForm.title}
                      onChange={handleAnnouncementChange}
                      required
                    />

                    <Textarea
                      name="content"
                      placeholder={
                        "Rich text style content\n\n- Update 1\n- Update 2\n\nNext steps..."
                      }
                      value={announcementForm.content}
                      onChange={handleAnnouncementChange}
                      rows={6}
                      required
                    />

                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
                      <input
                        name="isPinned"
                        type="checkbox"
                        checked={announcementForm.isPinned}
                        onChange={handleAnnouncementChange}
                        className="h-4 w-4"
                      />
                      Pin this announcement
                    </label>

                    <input
                      name="attachment"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleAnnouncementChange}
                      className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                    />

                    <Button
                      type="submit"
                      disabled={submitting === "announcement"}
                      className="w-full"
                    >
                      {submitting === "announcement"
                        ? "Posting..."
                        : "Post Announcement"}
                    </Button>
                  </form>
                </Card>
              ) : (
                <Card title="Announcements">
                  <p className="text-sm text-slate-600">
                    Only workspace owners and admins can publish announcements.
                    Members can still comment and react.
                  </p>
                </Card>
              )}

              <Card title="Create Action Item">
                <form onSubmit={handleCreateActionItem} className="space-y-3">
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
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
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                  />

                  <Button
                    type="submit"
                    disabled={submitting === "actionItem"}
                    className="w-full"
                  >
                    {submitting === "actionItem" ? "Creating..." : "Add Item"}
                  </Button>
                </form>
              </Card>
            </section>

            <Card title="Goals & Milestones">
              <div className="space-y-5">
                {activeTeam.goals?.length === 0 ? (
                  <EmptyState text="No goals yet." />
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
                        className="rounded-3xl border border-slate-200 bg-white p-5"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <h3 className="text-lg font-black text-slate-950">
                              {goal.title}
                            </h3>

                            <p className="mt-1 text-sm text-slate-600">
                              {goal.description || "No description"}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                              <Badge>Status: {goal.status || "NOT_STARTED"}</Badge>
                              <Badge>
                                Owner: {goal.owner?.name || "Unassigned"}
                              </Badge>
                              {goal.dueDate && (
                                <Badge>
                                  Due:{" "}
                                  {new Date(goal.dueDate).toLocaleDateString()}
                                </Badge>
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
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900"
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
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900"
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
                          <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-600">
                            <span>Milestone progress</span>
                            <span>{progress}%</span>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-slate-950 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-5 grid gap-5 lg:grid-cols-2">
                          <div>
                            <h4 className="font-black text-slate-950">
                              Milestones
                            </h4>

                            <div className="mt-3 space-y-3">
                              {goal.milestones?.length === 0 ? (
                                <EmptyState text="No milestones yet." />
                              ) : (
                                goal.milestones?.map(milestone => (
                                  <div
                                    key={milestone.id}
                                    className="rounded-2xl border border-slate-200 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="font-bold text-slate-950">
                                          {milestone.title}
                                        </p>

                                        <p className="text-sm text-slate-600">
                                          {milestone.description ||
                                            "No description"}
                                        </p>
                                      </div>

                                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
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
                              <h5 className="text-sm font-black text-slate-950">
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
                            <h4 className="font-black text-slate-950">
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
                                <EmptyState text="No progress updates yet." />
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
            </Card>

            <section className="grid gap-6 xl:grid-cols-2">
              <Card title="Announcements">
                <div className="space-y-4">
                  {activeTeam.announcements?.length === 0 ? (
                    <EmptyState text="No announcements yet." />
                  ) : (
                    activeTeam.announcements?.map(announcement => (
                      <div
                        key={announcement.id}
                        className={`rounded-3xl border p-4 ${
                          announcement.isPinned
                            ? "border-amber-300 bg-amber-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black text-slate-950">
                                {announcement.title}
                              </p>

                              {announcement.isPinned && (
                                <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-black text-amber-900">
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
                              onClick={() =>
                                handleToggleAnnouncementPin(announcement)
                              }
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100"
                            >
                              {announcement.isPinned ? "Unpin" : "Pin"}
                            </button>
                          )}
                        </div>

                        {announcement.attachmentUrl && (
                          <a
                            href={announcement.attachmentUrl}
                            target="_blank"
                            className="mt-3 inline-block text-sm font-black text-slate-950 underline"
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
                                handleAnnouncementReaction(
                                  announcement.id,
                                  emoji
                                )
                              }
                              className={`rounded-full border px-3 py-1 text-sm font-bold transition ${
                                hasUserReacted(announcement, emoji)
                                  ? "border-slate-950 bg-slate-950 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-950"
                              }`}
                            >
                              {emoji}{" "}
                              {getReactionCount(announcement, emoji)}
                            </button>
                          ))}
                        </div>

                        <div className="mt-5 border-t border-slate-200 pt-4">
                          <h4 className="text-sm font-black text-slate-950">
                            Comments
                          </h4>

                          <div className="mt-3 space-y-3">
                            {announcement.comments?.length === 0 ? (
                              <EmptyState text="No comments yet." />
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
                                    {new Date(
                                      comment.createdAt
                                    ).toLocaleString()}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>

                          <form
                            onSubmit={event =>
                              handleCreateAnnouncementComment(
                                event,
                                announcement.id
                              )
                            }
                            className="mt-3 flex gap-2"
                          >
                            <Input
                              placeholder="Comment... mention @email@example.com"
                              value={commentForms[announcement.id] || ""}
                              onChange={event =>
                                handleCommentChange(announcement.id, event)
                              }
                              required
                            />

                            <Button
                              type="submit"
                              disabled={
                                submitting === `comment-${announcement.id}`
                              }
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
              </Card>

              <Card title="Action Items">
                <div className="mb-5 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setActionView("kanban")}
                    className={`rounded-lg px-3 py-2 text-sm font-black ${
                      actionView === "kanban"
                        ? "bg-slate-950 text-white"
                        : "text-slate-600"
                    }`}
                  >
                    Kanban
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionView("list")}
                    className={`rounded-lg px-3 py-2 text-sm font-black ${
                      actionView === "list"
                        ? "bg-slate-950 text-white"
                        : "text-slate-600"
                    }`}
                  >
                    List
                  </button>
                </div>

                {activeTeam.actionItems?.length === 0 ? (
                  <EmptyState text="No action items yet." />
                ) : actionView === "kanban" ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    {ACTION_STATUSES.map(status => (
                      <div
                        key={status}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-sm font-black text-slate-800">
                            {status}
                          </h3>

                          <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-500">
                            {getActionItemsByStatus(status).length}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {getActionItemsByStatus(status).length === 0 ? (
                            <EmptyState text="No items." />
                          ) : (
                            getActionItemsByStatus(status).map(item => (
                              <ActionItemCard
                                key={item.id}
                                item={item}
                                onStatusChange={handleUpdateActionStatus}
                                getPriorityBadgeClass={getPriorityBadgeClass}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeTeam.actionItems?.map(item => (
                      <ActionItemCard
                        key={item.id}
                        item={item}
                        onStatusChange={handleUpdateActionStatus}
                        getPriorityBadgeClass={getPriorityBadgeClass}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </section>

            {canManageWorkspace && (
              <Card title="Audit Log">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">
                    Immutable timeline of workspace changes.
                  </p>

                  <Button type="button" onClick={handleExportAuditCsv}>
                    Export Audit CSV
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    name="action"
                    value={auditFilter.action}
                    onChange={handleAuditFilterChange}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                  >
                    <option value="">All actions</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="INVITE_MEMBER">INVITE_MEMBER</option>
                    <option value="CHANGE_ROLE">CHANGE_ROLE</option>
                    <option value="STATUS_CHANGE">STATUS_CHANGE</option>
                  </select>

                  <select
                    name="entity"
                    value={auditFilter.entity}
                    onChange={handleAuditFilterChange}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                  >
                    <option value="">All entities</option>
                    <option value="Workspace">Workspace</option>
                    <option value="TeamMember">TeamMember</option>
                    <option value="Goal">Goal</option>
                    <option value="Announcement">Announcement</option>
                    <option value="ActionItem">ActionItem</option>
                  </select>
                </div>

                <div className="mt-5 space-y-3">
                  {auditLogs.length === 0 ? (
                    <EmptyState text="No audit logs yet." />
                  ) : (
                    auditLogs.map(log => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                            {log.action}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                            {log.entity}
                          </span>
                        </div>

                        <p className="mt-3 text-sm text-slate-700">
                          {log.actor?.name || "Unknown user"} performed{" "}
                          <strong>{log.action}</strong> on{" "}
                          <strong>{log.entity}</strong>.
                        </p>

                        {log.metadata && (
                          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}

                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-200/70 backdrop-blur">
      <h2 className="mb-4 text-xl font-black text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function MetricCard({ label, value, danger = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p
        className={`mt-2 text-3xl font-black ${
          danger ? "text-red-600" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1">{children}</span>
  );
}

function EmptyState({ text }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
      {text}
    </p>
  );
}

function ActionItemCard({ item, onStatusChange, getPriorityBadgeClass }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-black text-slate-950">{item.title}</p>

        <span
          className={`rounded-full px-2 py-1 text-xs font-black ${getPriorityBadgeClass(
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
        <p className="mt-2 text-xs text-slate-500">Goal: {item.goal.title}</p>
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
          className="mt-2 inline-block text-sm font-black text-slate-950 underline"
        >
          View attachment
        </a>
      )}

      <select
        value={item.status}
        onChange={event => onStatusChange(item.id, event.target.value)}
        className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900"
      >
        {ACTION_STATUSES.map(statusOption => (
          <option key={statusOption} value={statusOption}>
            {statusOption}
          </option>
        ))}
      </select>
    </div>
  );
}