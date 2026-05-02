// apps/api/src/controllers/team.controller.js

import prisma from "../config/db.js";
import { PERMISSIONS, requirePermission } from "../utils/rbac.js";
import { createAuditLog } from "../utils/auditLog.js";

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

    await createAuditLog({
      teamId: team.id,
      actorId: req.user.id,
      action: "CREATE",
      entity: "Workspace",
      entityId: team.id,
      metadata: {
        name: team.name,
        description: team.description,
        accentColor: team.accentColor
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
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
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

    requirePermission(membership, PERMISSIONS.WORKSPACE_UPDATE);

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

    await createAuditLog({
      teamId,
      actorId: req.user.id,
      action: "UPDATE",
      entity: "Workspace",
      entityId: teamId,
      metadata: {
        name,
        description,
        accentColor
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

    requirePermission(requesterMembership, PERMISSIONS.MEMBER_INVITE);

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

    await prisma.notification.create({
      data: {
        type: "INVITE",
        message: `You were invited to a workspace as ${role}`,
        teamId,
        userId: userToInvite.id
      }
    });

    await createAuditLog({
      teamId,
      actorId: req.user.id,
      action: "INVITE_MEMBER",
      entity: "TeamMember",
      entityId: member.id,
      metadata: {
        invitedEmail: email,
        role
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

    requirePermission(requesterMembership, PERMISSIONS.MEMBER_ROLE_CHANGE);

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

    await createAuditLog({
      teamId,
      actorId: req.user.id,
      action: "CHANGE_ROLE",
      entity: "TeamMember",
      entityId: member.id,
      metadata: {
        userId,
        role
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

    requirePermission(requesterMembership, PERMISSIONS.MEMBER_REMOVE);

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

    if (
      requesterMembership.role === "ADMIN" &&
      memberToRemove.role === "ADMIN"
    ) {
      return res.status(403).json({
        message: "Admins cannot remove other admins"
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

    await createAuditLog({
      teamId,
      actorId: req.user.id,
      action: "DELETE",
      entity: "TeamMember",
      entityId: userId,
      metadata: {
        removedUserId: userId,
        removedRole: memberToRemove.role
      }
    });

    res.json({
      message: "Member removed successfully"
    });
  } catch (error) {
    next(error);
  }
}