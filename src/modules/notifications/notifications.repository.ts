// src/modules/notifications/notifications.repository.ts
import { prisma } from "../../config/db.ts";

export class NotificationsRepository {
  async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" }
    });
  }

  async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
  }
}
