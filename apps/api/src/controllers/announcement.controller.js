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

function canManageAnnouncements(role) {
  return role === "OWNER" || role === "ADMIN";
}

function canModifyAnnouncement(membership, announcement) {
  return (
    membership.role === "OWNER" ||
    membership.role === "ADMIN" ||
    announcement.authorId === membership.userId
  );
}

async function getAnnouncementWithRelations(announcementId) {
  return prisma.announcement.findUnique({
    where: {
      id: announcementId
    },
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
    }
  });
}

export async function createAnnouncement(req, res, next) {
  try {
    const { teamId, title, content, attachmentUrl, isPinned } = req.body;

    if (!teamId || !title || !content) {
      return res.status(400).json({
        message: "Workspace ID, title, and content are required"
      });
    }

    const membership = await getMembership(req.user.id, teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    if (!canManageAnnouncements(membership.role)) {
      return res.status(403).json({
        message: "Only workspace owners and admins can publish announcements"
      });
    }

    let uploadedAttachmentUrl = attachmentUrl || null;

    if (req.file) {
      const result = await uploadBufferToCloudinary(
        req.file.buffer,
        "collaborative-team-hub/announcements"
      );

      uploadedAttachmentUrl = result.secure_url;
    }

    const announcement = await prisma.announcement.create({
      data: {
        teamId,
        title,
        content,
        attachmentUrl: uploadedAttachmentUrl,
        isPinned: isPinned === "true" || isPinned === true,
        authorId: req.user.id
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        comments: true,
        reactions: true
      }
    });

    getIO()
      .to(`team:${teamId}`)
      .emit("announcement:created", announcement);

    res.status(201).json({
      message: "Announcement created successfully",
      announcement
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeamAnnouncements(req, res, next) {
  try {
    const { teamId } = req.params;

    const membership = await getMembership(req.user.id, teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    const announcements = await prisma.announcement.findMany({
      where: {
        teamId
      },
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
    });

    res.json({
      announcements
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAnnouncement(req, res, next) {
  try {
    const { announcementId } = req.params;
    const { title, content, attachmentUrl, isPinned } = req.body;

    const existingAnnouncement = await prisma.announcement.findUnique({
      where: {
        id: announcementId
      }
    });

    if (!existingAnnouncement) {
      return res.status(404).json({
        message: "Announcement not found"
      });
    }

    const membership = await getMembership(
      req.user.id,
      existingAnnouncement.teamId
    );

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    if (!canModifyAnnouncement(membership, existingAnnouncement)) {
      return res.status(403).json({
        message: "You do not have permission to update this announcement"
      });
    }

    let uploadedAttachmentUrl = attachmentUrl;

    if (req.file) {
      const result = await uploadBufferToCloudinary(
        req.file.buffer,
        "collaborative-team-hub/announcements"
      );

      uploadedAttachmentUrl = result.secure_url;
    }

    const announcement = await prisma.announcement.update({
      where: {
        id: announcementId
      },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(uploadedAttachmentUrl !== undefined && {
          attachmentUrl: uploadedAttachmentUrl
        }),
        ...(isPinned !== undefined && {
          isPinned: isPinned === "true" || isPinned === true
        })
      },
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
      }
    });

    getIO()
      .to(`team:${existingAnnouncement.teamId}`)
      .emit("announcement:updated", announcement);

    res.json({
      message: "Announcement updated successfully",
      announcement
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAnnouncement(req, res, next) {
  try {
    const { announcementId } = req.params;

    const existingAnnouncement = await prisma.announcement.findUnique({
      where: {
        id: announcementId
      }
    });

    if (!existingAnnouncement) {
      return res.status(404).json({
        message: "Announcement not found"
      });
    }

    const membership = await getMembership(
      req.user.id,
      existingAnnouncement.teamId
    );

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    if (!canModifyAnnouncement(membership, existingAnnouncement)) {
      return res.status(403).json({
        message: "You do not have permission to delete this announcement"
      });
    }

    await prisma.announcement.delete({
      where: {
        id: announcementId
      }
    });

    getIO()
      .to(`team:${existingAnnouncement.teamId}`)
      .emit("announcement:deleted", {
        id: announcementId
      });

    res.json({
      message: "Announcement deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

export async function createAnnouncementComment(req, res, next) {
  try {
    const { announcementId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        message: "Comment content is required"
      });
    }

    const announcement = await prisma.announcement.findUnique({
      where: {
        id: announcementId
      }
    });

    if (!announcement) {
      return res.status(404).json({
        message: "Announcement not found"
      });
    }

    const membership = await getMembership(req.user.id, announcement.teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        teamId: announcement.teamId,
        authorId: req.user.id,
        announcementId
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
      .to(`team:${announcement.teamId}`)
      .emit("announcement-comment:created", {
        announcementId,
        comment
      });

    res.status(201).json({
      message: "Comment added successfully",
      comment
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAnnouncementComment(req, res, next) {
  try {
    const { announcementId, commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: {
        id: commentId
      }
    });

    if (!comment || comment.announcementId !== announcementId) {
      return res.status(404).json({
        message: "Comment not found"
      });
    }

    const membership = await getMembership(req.user.id, comment.teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    if (
      comment.authorId !== req.user.id &&
      membership.role !== "OWNER" &&
      membership.role !== "ADMIN"
    ) {
      return res.status(403).json({
        message: "You do not have permission to delete this comment"
      });
    }

    await prisma.comment.delete({
      where: {
        id: commentId
      }
    });

    getIO()
      .to(`team:${comment.teamId}`)
      .emit("announcement-comment:deleted", {
        announcementId,
        id: commentId
      });

    res.json({
      message: "Comment deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleAnnouncementReaction(req, res, next) {
  try {
    const { announcementId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        message: "Emoji is required"
      });
    }

    const announcement = await prisma.announcement.findUnique({
      where: {
        id: announcementId
      }
    });

    if (!announcement) {
      return res.status(404).json({
        message: "Announcement not found"
      });
    }

    const membership = await getMembership(req.user.id, announcement.teamId);

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace"
      });
    }

    const existingReaction = await prisma.reaction.findFirst({
      where: {
        announcementId,
        userId: req.user.id,
        emoji
      }
    });

    if (existingReaction) {
      await prisma.reaction.delete({
        where: {
          id: existingReaction.id
        }
      });

      const updatedAnnouncement = await getAnnouncementWithRelations(
        announcementId
      );

      getIO()
        .to(`team:${announcement.teamId}`)
        .emit("announcement-reaction:updated", updatedAnnouncement);

      return res.json({
        message: "Reaction removed successfully",
        announcement: updatedAnnouncement
      });
    }

    await prisma.reaction.create({
      data: {
        emoji,
        teamId: announcement.teamId,
        userId: req.user.id,
        announcementId
      }
    });

    const updatedAnnouncement = await getAnnouncementWithRelations(
      announcementId
    );

    getIO()
      .to(`team:${announcement.teamId}`)
      .emit("announcement-reaction:updated", updatedAnnouncement);

    res.status(201).json({
      message: "Reaction added successfully",
      announcement: updatedAnnouncement
    });
  } catch (error) {
    next(error);
  }
}