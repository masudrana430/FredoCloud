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

function canManageWorkspace(role) {
  return role === "OWNER" || role === "ADMIN";
}

function isValidMemberRole(role) {
  return ["ADMIN", "MEMBER"].includes(role);
}

export async function createTeam(req, res, next) {
  try {
    const { name, description, accentColor } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Workspace name is required"
      });
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        accentColor: accentColor || "#0f172a",
        members: {
          create: {
            userId: req.user.id,
            role: "OWNER"
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            goals: true,
            announcements: true,
            actionItems: true
          }
        }
      }
    });

    res.status(201).json({
      message: "Workspace created successfully",
      team
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyTeams(req, res, next) {
  try {
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: req.user.id
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            goals: true,
            announcements: true,
            actionItems: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json({
      teams
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeamById(req, res, next) {
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
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            joinedAt: "asc"
          }
        },
        goals: {
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
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        announcements: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            },
            comments: {
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
                createdAt: "asc"
              }
            },
            reactions: true
          },
          orderBy: [
            {
              isPinned: "desc"
            },
            {
              createdAt: "desc"
            }
          ]
        },
        actionItems: {
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
        }
      }
    });

    if (!team) {
      return res.status(404).json({
        message: "Workspace not found"
      });
    }

    res.json({
      team
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTeam(req, res, next) {
  try {
    const { teamId } = req.params;
    const { name, description, accentColor } = req.body;

    const membership = await getMembership(req.user.id, teamId);

    if (!membership || !canManageWorkspace(membership.role)) {
      return res.status(403).json({
        message: "Only workspace owners and admins can update workspace settings"
      });
    }

    const team = await prisma.team.update({
      where: {
        id: teamId
      },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(accentColor !== undefined && { accentColor })
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            goals: true,
            announcements: true,
            actionItems: true
          }
        }
      }
    });

    res.json({
      message: "Workspace updated successfully",
      team
    });
  } catch (error) {
    next(error);
  }
}

export async function inviteTeamMember(req, res, next) {
  try {
    const { teamId } = req.params;
    const { email, role = "MEMBER" } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Member email is required"
      });
    }

    if (!isValidMemberRole(role)) {
      return res.status(400).json({
        message: "Role must be ADMIN or MEMBER"
      });
    }

    const requesterMembership = await getMembership(req.user.id, teamId);

    if (!requesterMembership || !canManageWorkspace(requesterMembership.role)) {
      return res.status(403).json({
        message: "Only workspace owners and admins can invite members"
      });
    }

    const userToInvite = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (!userToInvite) {
      return res.status(404).json({
        message: "No registered user found with this email"
      });
    }

    const existingMembership = await getMembership(userToInvite.id, teamId);

    if (existingMembership) {
      return res.status(409).json({
        message: "User is already a workspace member"
      });
    }

    const member = await prisma.teamMember.create({
      data: {
        userId: userToInvite.id,
        teamId,
        role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    res.status(201).json({
      message: "Member invited successfully",
      member
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMemberRole(req, res, next) {
  try {
    const { teamId, userId } = req.params;
    const { role } = req.body;

    if (!isValidMemberRole(role)) {
      return res.status(400).json({
        message: "Role must be ADMIN or MEMBER"
      });
    }

    const requesterMembership = await getMembership(req.user.id, teamId);

    if (!requesterMembership || requesterMembership.role !== "OWNER") {
      return res.status(403).json({
        message: "Only workspace owners can change member roles"
      });
    }

    const memberToUpdate = await getMembership(userId, teamId);

    if (!memberToUpdate) {
      return res.status(404).json({
        message: "Workspace member not found"
      });
    }

    if (memberToUpdate.role === "OWNER") {
      return res.status(400).json({
        message: "Workspace owner role cannot be changed"
      });
    }

    const member = await prisma.teamMember.update({
      where: {
        userId_teamId: {
          userId,
          teamId
        }
      },
      data: {
        role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    res.json({
      message: "Member role updated successfully",
      member
    });
  } catch (error) {
    next(error);
  }
}

export async function removeTeamMember(req, res, next) {
  try {
    const { teamId, userId } = req.params;

    const requesterMembership = await getMembership(req.user.id, teamId);

    if (!requesterMembership || !canManageWorkspace(requesterMembership.role)) {
      return res.status(403).json({
        message: "Only workspace owners and admins can remove members"
      });
    }

    const memberToRemove = await getMembership(userId, teamId);

    if (!memberToRemove) {
      return res.status(404).json({
        message: "Workspace member not found"
      });
    }

    if (memberToRemove.role === "OWNER") {
      return res.status(400).json({
        message: "Workspace owner cannot be removed"
      });
    }

    await prisma.teamMember.delete({
      where: {
        userId_teamId: {
          userId,
          teamId
        }
      }
    });

    res.json({
      message: "Member removed successfully"
    });
  } catch (error) {
    next(error);
  }
}