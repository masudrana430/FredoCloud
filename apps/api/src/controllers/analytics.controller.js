import prisma from "../config/db.js";

async function getMembership(userId, teamId) {
  return prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId
      }
    }
  });
}

function getStartOfWeek(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day;

  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  return start;
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value).replaceAll('"', '""');

  return `"${stringValue}"`;
}

function toCsv(rows) {
  return rows.map(row => row.map(csvEscape).join(",")).join("\n");
}

export async function getWorkspaceAnalytics(req, res, next) {
  try {
    const { teamId } = req.params;

    const membership = await getMembership(req.user.id, teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    const now = new Date();
    const startOfWeek = getStartOfWeek(now);

    const [
      totalGoals,
      completedGoals,
      inProgressGoals,
      notStartedGoals,
      onHoldGoals,
      totalActionItems,
      completedActionItems,
      completedItemsThisWeek,
      overdueActionItems,
      overdueGoals,
      actionItemsByPriority
    ] = await Promise.all([
      prisma.goal.count({
        where: {
          teamId
        }
      }),

      prisma.goal.count({
        where: {
          teamId,
          status: "COMPLETED"
        }
      }),

      prisma.goal.count({
        where: {
          teamId,
          status: "IN_PROGRESS"
        }
      }),

      prisma.goal.count({
        where: {
          teamId,
          status: "NOT_STARTED"
        }
      }),

      prisma.goal.count({
        where: {
          teamId,
          status: "ON_HOLD"
        }
      }),

      prisma.actionItem.count({
        where: {
          teamId
        }
      }),

      prisma.actionItem.count({
        where: {
          teamId,
          status: "DONE"
        }
      }),

      prisma.actionItem.count({
        where: {
          teamId,
          status: "DONE",
          updatedAt: {
            gte: startOfWeek,
            lte: now
          }
        }
      }),

      prisma.actionItem.count({
        where: {
          teamId,
          status: {
            not: "DONE"
          },
          dueDate: {
            lt: now
          }
        }
      }),

      prisma.goal.count({
        where: {
          teamId,
          status: {
            not: "COMPLETED"
          },
          dueDate: {
            lt: now
          }
        }
      }),

      prisma.actionItem.groupBy({
        by: ["priority"],
        where: {
          teamId
        },
        _count: {
          priority: true
        }
      })
    ]);

    const overdueCount = overdueActionItems + overdueGoals;

    const goalCompletionRate =
      totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100);

    const actionItemCompletionRate =
      totalActionItems === 0
        ? 0
        : Math.round((completedActionItems / totalActionItems) * 100);

    const priorityCounts = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0
    };

    actionItemsByPriority.forEach(item => {
      priorityCounts[item.priority] = item._count.priority;
    });

    res.json({
      stats: {
        totalGoals,
        totalActionItems,
        completedItemsThisWeek,
        overdueCount,
        goalCompletionRate,
        actionItemCompletionRate
      },
      goalStatusChart: [
        {
          name: "Completed",
          value: completedGoals
        },
        {
          name: "In Progress",
          value: inProgressGoals
        },
        {
          name: "Not Started",
          value: notStartedGoals
        },
        {
          name: "On Hold",
          value: onHoldGoals
        }
      ],
      priorityCounts
    });
  } catch (error) {
    next(error);
  }
}

export async function exportWorkspaceCsv(req, res, next) {
  try {
    const { teamId } = req.params;

    const membership = await getMembership(req.user.id, teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    const team = await prisma.team.findUnique({
      where: {
        id: teamId
      },
      include: {
        goals: {
          include: {
            owner: {
              select: {
                name: true,
                email: true
              }
            },
            milestones: true,
            updates: {
              include: {
                author: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        announcements: {
          include: {
            author: {
              select: {
                name: true,
                email: true
              }
            },
            comments: {
              include: {
                author: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            },
            reactions: true
          }
        },
        actionItems: {
          include: {
            assignee: {
              select: {
                name: true,
                email: true
              }
            },
            creator: {
              select: {
                name: true,
                email: true
              }
            },
            goal: {
              select: {
                title: true
              }
            }
          }
        },
        members: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({
        message: "Workspace not found"
      });
    }

    const rows = [];

    rows.push(["Workspace Export"]);
    rows.push(["Name", team.name]);
    rows.push(["Description", team.description || ""]);
    rows.push(["Accent Color", team.accentColor || ""]);
    rows.push([]);

    rows.push(["Members"]);
    rows.push(["Name", "Email", "Role", "Joined At"]);

    team.members.forEach(member => {
      rows.push([
        member.user.name,
        member.user.email,
        member.role,
        member.joinedAt
      ]);
    });

    rows.push([]);
    rows.push(["Goals"]);
    rows.push([
      "Title",
      "Description",
      "Status",
      "Owner",
      "Due Date",
      "Created At"
    ]);

    team.goals.forEach(goal => {
      rows.push([
        goal.title,
        goal.description || "",
        goal.status,
        goal.owner?.email || "",
        goal.dueDate || "",
        goal.createdAt
      ]);
    });

    rows.push([]);
    rows.push(["Milestones"]);
    rows.push([
      "Goal",
      "Title",
      "Description",
      "Progress",
      "Completed",
      "Due Date"
    ]);

    team.goals.forEach(goal => {
      goal.milestones.forEach(milestone => {
        rows.push([
          goal.title,
          milestone.title,
          milestone.description || "",
          `${milestone.progress}%`,
          milestone.completed,
          milestone.dueDate || ""
        ]);
      });
    });

    rows.push([]);
    rows.push(["Goal Progress Updates"]);
    rows.push(["Goal", "Content", "Author", "Created At"]);

    team.goals.forEach(goal => {
      goal.updates.forEach(update => {
        rows.push([
          goal.title,
          update.content,
          update.author?.email || "",
          update.createdAt
        ]);
      });
    });

    rows.push([]);
    rows.push(["Announcements"]);
    rows.push([
      "Title",
      "Content",
      "Pinned",
      "Author",
      "Attachment URL",
      "Created At"
    ]);

    team.announcements.forEach(announcement => {
      rows.push([
        announcement.title,
        announcement.content,
        announcement.isPinned,
        announcement.author?.email || "",
        announcement.attachmentUrl || "",
        announcement.createdAt
      ]);
    });

    rows.push([]);
    rows.push(["Action Items"]);
    rows.push([
      "Title",
      "Description",
      "Status",
      "Priority",
      "Assignee",
      "Parent Goal",
      "Due Date",
      "Attachment URL"
    ]);

    team.actionItems.forEach(item => {
      rows.push([
        item.title,
        item.description || "",
        item.status,
        item.priority,
        item.assignee?.email || "",
        item.goal?.title || "",
        item.dueDate || "",
        item.attachmentUrl || ""
      ]);
    });

    const csv = toCsv(rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${team.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}-export.csv"`
    );

    res.send(csv);
  } catch (error) {
    next(error);
  }
}