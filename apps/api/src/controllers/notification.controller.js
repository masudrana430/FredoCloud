import prisma from "../config/db.js";

export async function getMyNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            accentColor: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    res.json({
      notifications
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const { notificationId } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found"
      });
    }

    const updatedNotification = await prisma.notification.update({
      where: {
        id: notificationId
      },
      data: {
        read: true
      }
    });

    res.json({
      message: "Notification marked as read",
      notification: updatedNotification
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        read: false
      },
      data: {
        read: true
      }
    });

    res.json({
      message: "All notifications marked as read"
    });
  } catch (error) {
    next(error);
  }
}