import prisma from "../config/db.js";
import { getIO } from "../sockets/index.js";

export async function createAuditLog({
  teamId,
  actorId,
  action,
  entity,
  entityId,
  metadata = {}
}) {
  const log = await prisma.auditLog.create({
    data: {
      teamId,
      actorId,
      action,
      entity,
      entityId,
      metadata
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      }
    }
  });

  try {
    getIO().to(`team:${teamId}`).emit("audit-log:created", log);
  } catch {
    // Socket may not be initialized in some scripts/tests.
  }

  return log;
}