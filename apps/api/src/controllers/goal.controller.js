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

export async function createGoal(req, res, next) {
    try {
        const { teamId, title, description } = req.body;

        if (!teamId || !title) {
            return res.status(400).json({
                message: "Team ID and goal title are required"
            });
        }

        const membership = await getMembership(req.user.id, teamId);

        if (!membership) {
            return res.status(403).json({
                message: "You are not a member of this team"
            });
        }

        const goal = await prisma.goal.create({
            data: {
                teamId,
                title,
                description
            }
        });

        getIO().to(`team_${teamId}`).emit("goalCreated", {
            goal
        });

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
                message: "You are not a member of this team"
            });
        }

        const goals = await prisma.goal.findMany({
            where: {
                teamId
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
        const { title, description, completed } = req.body;

        const existingGoal = await prisma.goal.findUnique({
            where: {
                id: goalId
            }
        });

        if (!existingGoal) {
            return res.status(404).json({
                message: "Goal not found"
            });
        }

        const membership = await getMembership(req.user.id, existingGoal.teamId);

        if (!membership) {
            return res.status(403).json({
                message: "You are not a member of this team"
            });
        }

        const goal = await prisma.goal.update({
            where: {
                id: goalId
            },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(completed !== undefined && { completed })
            }
        });

        getIO().to(`team_${existingGoal.teamId}`).emit("goalUpdated", {
            goal
        });

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

        const existingGoal = await prisma.goal.findUnique({
            where: {
                id: goalId
            }
        });

        if (!existingGoal) {
            return res.status(404).json({
                message: "Goal not found"
            });
        }

        const membership = await getMembership(req.user.id, existingGoal.teamId);

        if (!membership) {
            return res.status(403).json({
                message: "You are not a member of this team"
            });
        }

        await prisma.goal.delete({
            where: {
                id: goalId
            }
        });

        getIO().to(`team_${existingGoal.teamId}`).emit("goalDeleted", {
            goalId
        });

        res.json({
            message: "Goal deleted successfully"
        });
    } catch (error) {
        next(error);
    }
}