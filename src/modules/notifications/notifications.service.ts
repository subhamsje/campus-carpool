// src/modules/notifications/notifications.service.ts
import { NotificationsRepository } from "./notifications.repository.ts";

export class NotificationsService {
  private repository = new NotificationsRepository();

  async getNotifications(userId: string) {
    return this.repository.getUserNotifications(userId);
  }

  async markAsRead(id: string) {
    return this.repository.markAsRead(id);
  }
}
