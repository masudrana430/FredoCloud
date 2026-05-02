import prisma from "../config/db.js";
import { hasPermission, PERMISSIONS } from "../utils/rbac.js";

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

function csvEscape(value) {
  if (value === null || value === undefined) return "";

  const stringValue = String(value).replaceAll('"', '""');
  return `"${stringValue}"`;
}

function toCsv(rows) {
  return rows.map(row => row.map(csvEscape).join(",")).join("\n");
}

export async function getAuditLogs(req, res, next) {
  try {
    const { teamId } = req.params;
    const { action, entity } = req.query;

    const membership = await getMembership(req.user.id, teamId);

    if (!membership || !hasPermission(membership.role, PERMISSIONS.AUDIT_VIEW)) {
      return res.status(403).json({
        message: "You do not have permission to view audit logs"
      });
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        teamId,
        ...(action && { action }),
        ...(entity && { entity })
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
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    });

    res.json({
      logs
    });
  } catch (error) {
    next(error);
  }
}

export async function exportAuditLogsCsv(req, res, next) {
  try {
    const { teamId } = req.params;

    const membership = await getMembership(req.user.id, teamId);

    if (!membership || !hasPermission(membership.role, PERMISSIONS.AUDIT_VIEW)) {
      return res.status(403).json({
        message: "You do not have permission to export audit logs"
      });
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        teamId
      },
      include: {
        actor: {
          select: {
            name: true,
            email: true
          }
        },
        team: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const rows = [
      [
        "Timestamp",
        "Workspace",
        "Actor Name",
        "Actor Email",
        "Action",
        "Entity",
        "Entity ID",
        "Metadata"
      ]
    ];

    logs.forEach(log => {
      rows.push([
        log.createdAt,
        log.team.name,
        log.actor?.name || "",
        log.actor?.email || "",
        log.action,
        log.entity,
        log.entityId || "",
        JSON.stringify(log.metadata || {})
      ]);
    });

    const csv = toCsv(rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-log-${teamId}.csv"`
    );

    res.send(csv);
  } catch (error) {
    next(error);
  }
}