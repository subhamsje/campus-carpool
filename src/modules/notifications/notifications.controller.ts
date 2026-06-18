// src/modules/notifications/notifications.controller.ts
import { Request, Response } from "express";
import { NotificationsService } from "./notifications.service.ts";

export class NotificationsController {
  private service = new NotificationsService();

  getNotifications = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const notifications = await this.service.getNotifications(userId);
      res.status(200).json({ success: true, data: notifications });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  markAsRead = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.markAsRead(id);
      res.status(200).json({ success: true, message: "Marked as read" });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}
