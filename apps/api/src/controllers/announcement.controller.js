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

function canModifyAnnouncement(membership, announcement) {
    return (
        membership.role === "OWNER" ||
        membership.role === "ADMIN" ||
        announcement.authorId === membership.userId
    );
}

export async function createAnnouncement(req, res, next) {
    try {
        const { teamId, title, content, attachmentUrl } = req.body;

        if (!teamId || !title || !content) {
            return res.status(400).json({
                message: "Team ID, title, and content are required"
            });
        }

        const membership = await getMembership(req.user.id, teamId);

        if (!membership) {
            return res.status(403).json({
                message: "You are not a member of this team"
            });
        }

        const announcement = await prisma.announcement.create({
            data: {
                teamId,
                title,
                content,
                attachmentUrl,
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
                }
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
                message: "You are not a member of this team"
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
                }
            },
            orderBy: {
                createdAt: "desc"
            }
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
        const { title, content, attachmentUrl } = req.body;

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
                message: "You are not a member of this team"
            });
        }

        if (!canModifyAnnouncement(membership, existingAnnouncement)) {
            return res.status(403).json({
                message: "You do not have permission to update this announcement"
            });
        }

        const announcement = await prisma.announcement.update({
            where: {
                id: announcementId
            },
            data: {
                ...(title !== undefined && { title }),
                ...(content !== undefined && { content }),
                ...(attachmentUrl !== undefined && { attachmentUrl })
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
            .to(`team:${existingAnnouncement.teamId}`)
            .emit("announcement:updated", {
                announcement
            });

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
                message: "You are not a member of this team"
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