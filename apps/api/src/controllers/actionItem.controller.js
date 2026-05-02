import prisma from "../config/db.js";
import { getIO } from "../sockets/index.js";
import { uploadBufferToCloudinary } from "../utils/uploadToCloudinary.js";

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

function isValidStatus(status) {
  return ["TODO", "IN_PROGRESS", "DONE"].includes(status);
}

function isValidPriority(priority) {
  return ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority);
}

async function getGoalInTeam(goalId, teamId) {
  if (!goalId) return null;

  return prisma.goal.findFirst({
    where: {
      id: goalId,
      teamId
    }
  });
}

export async function createActionItem(req, res, next) {
  try {
    const {
      teamId,
      title,
      description,
      assigneeId,
      dueDate,
      attachmentUrl,
      priority = "MEDIUM",
      goalId
    } = req.body;

    if (!teamId || !title) {
      return res.status(400).json({
        message: "Workspace ID and action item title are required"
      });
    }

    if (!isValidPriority(priority)) {
      return res.status(400).json({
        message: "Priority must be LOW, MEDIUM, HIGH, or URGENT"
      });
    }

    const membership = await getMembership(req.user.id, teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    if (assigneeId) {
      const assigneeMembership = await getMembership(assigneeId, teamId);

      if (!assigneeMembership) {
        return res.status(400).json({
          message: "Assignee must be a member of this workspace"
        });
      }
    }

    if (goalId) {
      const goal = await getGoalInTeam(goalId, teamId);

      if (!goal) {
        return res.status(400).json({
          message: "Parent goal must belong to this workspace"
        });
      }
    }

    let uploadedAttachmentUrl = attachmentUrl || null;

    if (req.file) {
      const result = await uploadBufferToCloudinary(
        req.file.buffer,
        "collaborative-team-hub/action-items"
      );

      uploadedAttachmentUrl = result.secure_url;
    }

    const actionItem = await prisma.actionItem.create({
      data: {
        teamId,
        title,
        description,
        assigneeId: assigneeId || null,
        creatorId: req.user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        attachmentUrl: uploadedAttachmentUrl,
        priority,
        goalId: goalId || null
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        goal: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    getIO()
      .to(`team:${teamId}`)
      .emit("action-item:created", actionItem);

    res.status(201).json({
      message: "Action item created successfully",
      actionItem
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeamActionItems(req, res, next) {
  try {
    const { teamId } = req.params;

    const membership = await getMembership(req.user.id, teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    const actionItems = await prisma.actionItem.findMany({
      where: {
        teamId
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        goal: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json({
      actionItems
    });
  } catch (error) {
    next(error);
  }
}

export async function updateActionItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const {
      title,
      description,
      status,
      assigneeId,
      dueDate,
      attachmentUrl,
      priority,
      goalId
    } = req.body;

    const existingActionItem = await prisma.actionItem.findUnique({
      where: {
        id: itemId
      }
    });

    if (!existingActionItem) {
      return res.status(404).json({
        message: "Action item not found"
      });
    }

    const membership = await getMembership(
      req.user.id,
      existingActionItem.teamId
    );

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    if (status !== undefined && !isValidStatus(status)) {
      return res.status(400).json({
        message: "Status must be TODO, IN_PROGRESS, or DONE"
      });
    }

    if (priority !== undefined && !isValidPriority(priority)) {
      return res.status(400).json({
        message: "Priority must be LOW, MEDIUM, HIGH, or URGENT"
      });
    }

    if (assigneeId) {
      const assigneeMembership = await getMembership(
        assigneeId,
        existingActionItem.teamId
      );

      if (!assigneeMembership) {
        return res.status(400).json({
          message: "Assignee must be a member of this workspace"
        });
      }
    }

    if (goalId) {
      const goal = await getGoalInTeam(goalId, existingActionItem.teamId);

      if (!goal) {
        return res.status(400).json({
          message: "Parent goal must belong to this workspace"
        });
      }
    }

    let uploadedAttachmentUrl = attachmentUrl;

    if (req.file) {
      const result = await uploadBufferToCloudinary(
        req.file.buffer,
        "collaborative-team-hub/action-items"
      );

      uploadedAttachmentUrl = result.secure_url;
    }

    const actionItem = await prisma.actionItem.update({
      where: {
        id: itemId
      },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(goalId !== undefined && { goalId: goalId || null }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null
        }),
        ...(uploadedAttachmentUrl !== undefined && {
          attachmentUrl: uploadedAttachmentUrl
        })
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        goal: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    getIO()
      .to(`team:${existingActionItem.teamId}`)
      .emit("action-item:updated", actionItem);

    res.json({
      message: "Action item updated successfully",
      actionItem
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteActionItem(req, res, next) {
  try {
    const { itemId } = req.params;

    const existingActionItem = await prisma.actionItem.findUnique({
      where: {
        id: itemId
      }
    });

    if (!existingActionItem) {
      return res.status(404).json({
        message: "Action item not found"
      });
    }

    const membership = await getMembership(
      req.user.id,
      existingActionItem.teamId
    );

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    await prisma.actionItem.delete({
      where: {
        id: itemId
      }
    });

    getIO()
      .to(`team:${existingActionItem.teamId}`)
      .emit("action-item:deleted", {
        id: itemId
      });

    res.json({
      message: "Action item deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}