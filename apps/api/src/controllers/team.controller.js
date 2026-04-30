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

function canManageMembers(role) {
  return role === "OWNER" || role === "ADMIN";
}

export async function createTeam(req, res, next) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Team name is required"
      });
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
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
        }
      }
    });

    res.status(201).json({
      message: "Team created successfully",
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
        message: "You are not a member of this team"
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
            }
          },
          orderBy: {
            createdAt: "desc"
          }
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
        message: "Team not found"
      });
    }

    res.json({
      team
    });
  } catch (error) {
    next(error);
  }
}

export async function addTeamMember(req, res, next) {
  try {
    const { teamId } = req.params;
    const { email, role = "MEMBER" } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Member email is required"
      });
    }

    if (!["ADMIN", "MEMBER"].includes(role)) {
      return res.status(400).json({
        message: "Role must be ADMIN or MEMBER"
      });
    }

    const requesterMembership = await getMembership(req.user.id, teamId);

    if (!requesterMembership || !canManageMembers(requesterMembership.role)) {
      return res.status(403).json({
        message: "Only team owners and admins can add members"
      });
    }

    const userToAdd = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (!userToAdd) {
      return res.status(404).json({
        message: "No user found with this email"
      });
    }

    const existingMembership = await getMembership(userToAdd.id, teamId);

    if (existingMembership) {
      return res.status(409).json({
        message: "User is already a team member"
      });
    }

    const member = await prisma.teamMember.create({
      data: {
        userId: userToAdd.id,
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
      message: "Member added successfully",
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

    if (!requesterMembership || !canManageMembers(requesterMembership.role)) {
      return res.status(403).json({
        message: "Only team owners and admins can remove members"
      });
    }

    const memberToRemove = await getMembership(userId, teamId);

    if (!memberToRemove) {
      return res.status(404).json({
        message: "Team member not found"
      });
    }

    if (memberToRemove.role === "OWNER") {
      return res.status(400).json({
        message: "Team owner cannot be removed"
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