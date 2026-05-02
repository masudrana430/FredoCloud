import prisma from "../config/db.js";
import { getIO } from "../sockets/index.js";

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

async function getGoalWithTeam(goalId) {
  return prisma.goal.findUnique({
    where: {
      id: goalId
    }
  });
}

function isValidGoalStatus(status) {
  return ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"].includes(
    status
  );
}

function normalizeProgress(progress) {
  const numberValue = Number(progress);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return Math.min(100, Math.max(0, numberValue));
}

export async function createGoal(req, res, next) {
  try {
    const { teamId, title, description, ownerId, dueDate, status } = req.body;

    if (!teamId || !title) {
      return res.status(400).json({
        message: "Workspace ID and goal title are required"
      });
    }

    if (status && !isValidGoalStatus(status)) {
      return res.status(400).json({
        message: "Invalid goal status"
      });
    }

    const membership = await getMembership(req.user.id, teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    if (ownerId) {
      const ownerMembership = await getMembership(ownerId, teamId);

      if (!ownerMembership) {
        return res.status(400).json({
          message: "Goal owner must be a workspace member"
        });
      }
    }

    const goal = await prisma.goal.create({
      data: {
        teamId,
        title,
        description,
        ownerId: ownerId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || "NOT_STARTED",
        completed: status === "COMPLETED"
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        milestones: true,
        updates: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    getIO().to(`team:${teamId}`).emit("goal:created", goal);

    res.status(201).json({
      message: "Goal created successfully",
      goal
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeamGoals(req, res, next) {
  try {
    const { teamId } = req.params;

    const membership = await getMembership(req.user.id, teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    const goals = await prisma.goal.findMany({
      where: {
        teamId
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        milestones: {
          orderBy: {
            createdAt: "asc"
          }
        },
        updates: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json({
      goals
    });
  } catch (error) {
    next(error);
  }
}

export async function updateGoal(req, res, next) {
  try {
    const { goalId } = req.params;
    const { title, description, ownerId, dueDate, status } = req.body;

    const existingGoal = await getGoalWithTeam(goalId);

    if (!existingGoal) {
      return res.status(404).json({
        message: "Goal not found"
      });
    }

    const membership = await getMembership(req.user.id, existingGoal.teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    if (status !== undefined && !isValidGoalStatus(status)) {
      return res.status(400).json({
        message: "Invalid goal status"
      });
    }

    if (ownerId) {
      const ownerMembership = await getMembership(ownerId, existingGoal.teamId);

      if (!ownerMembership) {
        return res.status(400).json({
          message: "Goal owner must be a workspace member"
        });
      }
    }

    const goal = await prisma.goal.update({
      where: {
        id: goalId
      },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(ownerId !== undefined && { ownerId: ownerId || null }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null
        }),
        ...(status !== undefined && {
          status,
          completed: status === "COMPLETED"
        })
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        milestones: {
          orderBy: {
            createdAt: "asc"
          }
        },
        updates: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    getIO().to(`team:${existingGoal.teamId}`).emit("goal:updated", goal);

    res.json({
      message: "Goal updated successfully",
      goal
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteGoal(req, res, next) {
  try {
    const { goalId } = req.params;

    const existingGoal = await getGoalWithTeam(goalId);

    if (!existingGoal) {
      return res.status(404).json({
        message: "Goal not found"
      });
    }

    const membership = await getMembership(req.user.id, existingGoal.teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    await prisma.goal.delete({
      where: {
        id: goalId
      }
    });

    getIO().to(`team:${existingGoal.teamId}`).emit("goal:deleted", {
      id: goalId
    });

    res.json({
      message: "Goal deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

export async function createMilestone(req, res, next) {
  try {
    const { goalId } = req.params;
    const { title, description, progress = 0, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({
        message: "Milestone title is required"
      });
    }

    const existingGoal = await getGoalWithTeam(goalId);

    if (!existingGoal) {
      return res.status(404).json({
        message: "Goal not found"
      });
    }

    const membership = await getMembership(req.user.id, existingGoal.teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    const normalizedProgress = normalizeProgress(progress);

    if (normalizedProgress === null) {
      return res.status(400).json({
        message: "Progress must be a number"
      });
    }

    const milestone = await prisma.milestone.create({
      data: {
        goalId,
        title,
        description,
        progress: normalizedProgress,
        dueDate: dueDate ? new Date(dueDate) : null,
        completed: normalizedProgress === 100
      }
    });

    getIO()
      .to(`team:${existingGoal.teamId}`)
      .emit("milestone:created", {
        goalId,
        milestone
      });

    res.status(201).json({
      message: "Milestone created successfully",
      milestone
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMilestone(req, res, next) {
  try {
    const { goalId, milestoneId } = req.params;
    const { title, description, progress, dueDate, completed } = req.body;

    const existingGoal = await getGoalWithTeam(goalId);

    if (!existingGoal) {
      return res.status(404).json({
        message: "Goal not found"
      });
    }

    const membership = await getMembership(req.user.id, existingGoal.teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    const existingMilestone = await prisma.milestone.findUnique({
      where: {
        id: milestoneId
      }
    });

    if (!existingMilestone || existingMilestone.goalId !== goalId) {
      return res.status(404).json({
        message: "Milestone not found"
      });
    }

    let normalizedProgress;

    if (progress !== undefined) {
      normalizedProgress = normalizeProgress(progress);

      if (normalizedProgress === null) {
        return res.status(400).json({
          message: "Progress must be a number"
        });
      }
    }

    const milestone = await prisma.milestone.update({
      where: {
        id: milestoneId
      },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(progress !== undefined && {
          progress: normalizedProgress,
          completed: normalizedProgress === 100
        }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null
        }),
        ...(completed !== undefined && { completed })
      }
    });

    getIO()
      .to(`team:${existingGoal.teamId}`)
      .emit("milestone:updated", {
        goalId,
        milestone
      });

    res.json({
      message: "Milestone updated successfully",
      milestone
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteMilestone(req, res, next) {
  try {
    const { goalId, milestoneId } = req.params;

    const existingGoal = await getGoalWithTeam(goalId);

    if (!existingGoal) {
      return res.status(404).json({
        message: "Goal not found"
      });
    }

    const membership = await getMembership(req.user.id, existingGoal.teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    const existingMilestone = await prisma.milestone.findUnique({
      where: {
        id: milestoneId
      }
    });

    if (!existingMilestone || existingMilestone.goalId !== goalId) {
      return res.status(404).json({
        message: "Milestone not found"
      });
    }

    await prisma.milestone.delete({
      where: {
        id: milestoneId
      }
    });

    getIO()
      .to(`team:${existingGoal.teamId}`)
      .emit("milestone:deleted", {
        goalId,
        id: milestoneId
      });

    res.json({
      message: "Milestone deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

export async function createGoalUpdate(req, res, next) {
  try {
    const { goalId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        message: "Progress update content is required"
      });
    }

    const existingGoal = await getGoalWithTeam(goalId);

    if (!existingGoal) {
      return res.status(404).json({
        message: "Goal not found"
      });
    }

    const membership = await getMembership(req.user.id, existingGoal.teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    const update = await prisma.goalUpdate.create({
      data: {
        goalId,
        authorId: req.user.id,
        content
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    getIO()
      .to(`team:${existingGoal.teamId}`)
      .emit("goal-update:created", {
        goalId,
        update
      });

    res.status(201).json({
      message: "Progress update added successfully",
      update
    });
  } catch (error) {
    next(error);
  }
}